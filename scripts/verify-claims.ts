import { readFileSync } from "node:fs";
import { JsonRpcProvider } from "ethers";
import { verifyTokenClaims } from "./lib/claims";

async function main(): Promise<void> {
  const file = process.env.BCM_DEPLOYMENT;
  const rpc = process.env.BCM_READ_RPC_URL;
  if (!file || !rpc)
    throw new Error("Set BCM_DEPLOYMENT and BCM_READ_RPC_URL for read-only verification");
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  const artifact = JSON.parse(
    readFileSync("artifacts/contracts/BitCoinMe.sol/BitCoinMe.json", "utf8")
  );
  const provider = new JsonRpcProvider(rpc);
  try {
    const report = await verifyTokenClaims(provider, artifact, manifest);
    console.log(JSON.stringify(report, null, 2));
    if (!report.fullyVerified) process.exitCode = 1;
  } finally {
    provider.destroy();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
