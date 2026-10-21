import { ethers, run } from "hardhat";
import { readFileSync } from "node:fs";
import { assertTestnet } from "./lib/network";
import { isAddress } from "ethers";

async function main(): Promise<void> {
  const { chainId } = await ethers.provider.getNetwork();
  assertTestnet(chainId);
  const file = process.env.BCM_DEPLOYMENT;
  if (!file) throw new Error("BCM_DEPLOYMENT must identify the reviewed deployment manifest");
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  if (
    manifest.chainId !== Number(chainId) ||
    !isAddress(manifest.contractAddress) ||
    !Array.isArray(manifest.recipients) ||
    manifest.recipients.length !== 8 ||
    !manifest.recipients.every(
      (address: unknown) => typeof address === "string" && isAddress(address)
    )
  ) {
    throw new Error("Invalid deployment manifest or chain ID");
  }
  if ((await ethers.provider.getCode(manifest.contractAddress)) === "0x") {
    throw new Error("No contract at the manifest address on the selected network");
  }
  await run("verify:verify", {
    address: manifest.contractAddress,
    constructorArguments: [manifest.recipients],
  });
  console.log(
    "Explorer verification completed; source verification alone does not validate the launch claims"
  );
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
