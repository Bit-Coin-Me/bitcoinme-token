import { ethers, ignition } from "hardhat";
import { assertTestnet, deploymentNetwork } from "./lib/network";
import { assertLaunchPlanReady } from "./lib/launch-plan";

async function main(): Promise<void> {
  const { chainId } = await ethers.provider.getNetwork();
  assertTestnet(chainId);
  assertLaunchPlanReady();

  // Ignition is the only deployment engine. Launch remains blocked pending OD-2.
  const { default: module } = await import("../ignition/modules/BitCoinMe");
  const { token } = await ignition.deploy(module);
  console.log(
    JSON.stringify(
      {
        ...deploymentNetwork(chainId),
        contractAddress: await token.getAddress(),
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
