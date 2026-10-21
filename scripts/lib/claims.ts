import { Contract, Interface, isAddress, Provider } from "ethers";
import tokenomics from "../../config/tokenomics.json";
import { parseUnits } from "ethers";
import { assertAllowedAbi } from "./token-policy";

export interface DeploymentManifest {
  chainId: number;
  contractAddress: string;
  deployer: string;
  transactionHash: string;
  recipients: string[];
}
export interface Claim {
  id: number;
  verified: boolean;
  detail: string;
}
interface Artifact {
  abi: Parameters<typeof assertAllowedAbi>[0];
  bytecode: string;
  deployedBytecode: string;
}

/** Read-only evidence for the token; economic claims remain unverified until OD-2 is implemented. */
export async function verifyTokenClaims(
  provider: Provider,
  artifact: Artifact,
  manifest: DeploymentManifest
): Promise<{ blockNumber: number; fullyVerified: boolean; claims: Claim[] }> {
  assertAllowedAbi(artifact.abi);
  const network = await provider.getNetwork();
  if (!Number.isSafeInteger(manifest.chainId) || BigInt(manifest.chainId) !== network.chainId) {
    throw new Error("Manifest chain ID differs from provider");
  }
  if (
    !isAddress(manifest.contractAddress) ||
    !isAddress(manifest.deployer) ||
    !/^0x[0-9a-fA-F]{64}$/.test(manifest.transactionHash) ||
    !Array.isArray(manifest.recipients) ||
    manifest.recipients.length !== tokenomics.allocations.length ||
    !manifest.recipients.every((address) => typeof address === "string" && isAddress(address))
  ) {
    throw new Error("Invalid deployment manifest");
  }
  const blockNumber = await provider.getBlockNumber();
  const code = await provider.getCode(manifest.contractAddress, blockNumber);
  if (code === "0x" || code.toLowerCase() !== artifact.deployedBytecode.toLowerCase()) {
    throw new Error("Runtime bytecode differs from the reviewed local build");
  }
  const tx = await provider.getTransaction(manifest.transactionHash);
  const receipt = await provider.getTransactionReceipt(manifest.transactionHash);
  if (
    !tx ||
    !receipt ||
    receipt.status !== 1 ||
    tx.to !== null ||
    receipt.contractAddress?.toLowerCase() !== manifest.contractAddress.toLowerCase() ||
    tx.from.toLowerCase() !== manifest.deployer.toLowerCase()
  ) {
    throw new Error("Deployment transaction does not match manifest");
  }
  const iface = new Interface(artifact.abi);
  const expectedData = artifact.bytecode + iface.encodeDeploy([manifest.recipients]).slice(2);
  if (tx.data.toLowerCase() !== expectedData.toLowerCase())
    throw new Error("Genesis constructor arguments differ");
  const token = new Contract(manifest.contractAddress, artifact.abi, provider);
  const maxSupply = parseUnits(tokenomics.maxSupply, tokenomics.decimals);
  const [name, symbol, decimals, cap, supply] = await Promise.all([
    token.name({ blockTag: blockNumber }),
    token.symbol({ blockTag: blockNumber }),
    token.decimals({ blockTag: blockNumber }),
    token.MAX_SUPPLY({ blockTag: blockNumber }),
    token.totalSupply({ blockTag: blockNumber }),
  ]);
  if (
    name !== tokenomics.name ||
    symbol !== tokenomics.symbol ||
    decimals !== BigInt(tokenomics.decimals) ||
    cap !== maxSupply ||
    supply > maxSupply
  )
    throw new Error("Token metadata or supply mismatch");
  const logs = receipt.logs
    .filter((log) => log.address.toLowerCase() === manifest.contractAddress.toLowerCase())
    .map((log) => iface.parseLog(log));
  if (logs.length !== manifest.recipients.length) throw new Error("Unexpected genesis events");
  for (let i = 0; i < logs.length; i++) {
    const event = logs[i];
    const receiver = manifest.recipients[i].toLowerCase();
    if (
      !event ||
      event.name !== "Transfer" ||
      BigInt(event.args[0]) !== 0n ||
      event.args[1].toLowerCase() !== receiver ||
      receiver === manifest.deployer.toLowerCase() ||
      event.args[2] !== parseUnits(tokenomics.allocations[i].amount, tokenomics.decimals)
    ) {
      throw new Error("Genesis distribution differs from tokenomics");
    }
  }
  const claims: Claim[] = [
    {
      id: 1,
      verified: true,
      detail: "Runtime matches the local fixed-genesis token; supply is within its cap",
    },
    {
      id: 2,
      verified: true,
      detail:
        "Runtime matches the local token without administrative or transfer-control functions",
    },
    {
      id: 3,
      verified: true,
      detail: "Direct creation and exact runtime match; no proxy entry point",
    },
    {
      id: 4,
      verified: true,
      detail:
        "Creation transaction and all genesis recipients and amounts match; deployer receives zero",
    },
    {
      id: 5,
      verified: false,
      detail: "Immutable lock schedule pending OD-2 implementation and verification",
    },
    {
      id: 6,
      verified: false,
      detail: "Safe signer, threshold and module verification pending approved policy",
    },
    {
      id: 7,
      verified: false,
      detail: "Liquidity and LP burn/lock proof verification not yet implemented",
    },
  ];
  return { blockNumber, fullyVerified: claims.every((claim) => claim.verified), claims };
}
