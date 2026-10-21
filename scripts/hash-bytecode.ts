import { artifacts, ethers } from "hardhat";

async function main(): Promise<void> {
  const artifact = await artifacts.readArtifact("BitCoinMe");
  console.log(
    JSON.stringify(
      {
        contract: artifact.sourceName + ":" + artifact.contractName,
        creationKeccak256: ethers.keccak256(artifact.bytecode),
        runtimeKeccak256: ethers.keccak256(artifact.deployedBytecode),
      },
      null,
      2
    )
  );
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
