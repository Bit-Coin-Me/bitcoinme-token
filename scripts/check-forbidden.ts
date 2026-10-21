import { artifacts } from "hardhat";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertAllowedAbi, assertTokenAst } from "./lib/token-policy";
import { generatedTokenomics } from "./generate-tokenomics";

async function main(): Promise<void> {
  const artifact = await artifacts.readArtifact("BitCoinMe");
  const build = await artifacts.getBuildInfo("contracts/BitCoinMe.sol:BitCoinMe");
  if (!build || build.solcVersion !== "0.8.28")
    throw new Error("Missing build with pinned compiler");
  for (const file of ["contracts/BitCoinMe.sol", "contracts/Tokenomics.sol"]) {
    if (build.input.sources[file]?.content !== readFileSync(resolve(file), "utf8")) {
      throw new Error("Build does not match current source: " + file);
    }
  }
  if (readFileSync("contracts/Tokenomics.sol", "utf8") !== generatedTokenomics())
    throw new Error("Tokenomics drift");
  assertAllowedAbi(artifact.abi);
  assertTokenAst(build.output.sources["contracts/BitCoinMe.sol"].ast);
  console.log("ABI, inheritance, constructor-only mint and generated allocations verified");
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
