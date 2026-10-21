import { expect } from "chai";
import { artifacts, ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { genesisFixture } from "./helpers/genesis";
import { verifyTokenClaims, DeploymentManifest } from "../scripts/lib/claims";

async function claimsFixture() {
  const deployed = await genesisFixture();
  const artifact = await artifacts.readArtifact("BitCoinMe");
  const manifest: DeploymentManifest = {
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contractAddress: await deployed.token.getAddress(),
    deployer: deployed.deployer.address,
    transactionHash: deployed.token.deploymentTransaction()!.hash,
    recipients: deployed.recipients,
  };
  return { ...deployed, artifact, manifest };
}

async function expectRejected(promise: Promise<unknown>, message: string) {
  let thrown: unknown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  expect(thrown).to.be.instanceOf(Error);
  expect((thrown as Error).message).to.contain(message);
}

describe("Read-only launch evidence", function () {
  it("verifies token evidence while refusing an overall pass without economic proofs", async function () {
    const { artifact, manifest } = await loadFixture(claimsFixture);
    const report = await verifyTokenClaims(ethers.provider, artifact, manifest);
    expect(report.claims.filter((claim) => claim.verified).map((claim) => claim.id)).to.deep.equal([
      1, 2, 3, 4,
    ]);
    expect(report.claims.filter((claim) => !claim.verified).map((claim) => claim.id)).to.deep.equal(
      [5, 6, 7]
    );
    expect(report.fullyVerified).to.equal(false);
  });

  it("rejects a forged chain ID without sending any transaction", async function () {
    const { artifact, manifest } = await loadFixture(claimsFixture);
    await expectRejected(
      verifyTokenClaims(ethers.provider, artifact, { ...manifest, chainId: 56 }),
      "chain ID differs"
    );
  });

  it("rejects an address whose bytecode is different", async function () {
    const { artifact, manifest, recipients } = await loadFixture(claimsFixture);
    await expectRejected(
      verifyTokenClaims(ethers.provider, artifact, { ...manifest, contractAddress: recipients[0] }),
      "Runtime bytecode differs"
    );
  });

  it("rejects reordered genesis recipients", async function () {
    const { artifact, manifest } = await loadFixture(claimsFixture);
    await expectRejected(
      verifyTokenClaims(ethers.provider, artifact, {
        ...manifest,
        recipients: [...manifest.recipients].reverse(),
      }),
      "constructor arguments differ"
    );
  });

  it("rejects a forged deployer and a nonexistent transaction", async function () {
    const { artifact, manifest, outsider } = await loadFixture(claimsFixture);
    await expectRejected(
      verifyTokenClaims(ethers.provider, artifact, { ...manifest, deployer: outsider.address }),
      "does not match"
    );
    await expectRejected(
      verifyTokenClaims(ethers.provider, artifact, {
        ...manifest,
        transactionHash: ethers.ZeroHash,
      }),
      "does not match"
    );
  });
});
