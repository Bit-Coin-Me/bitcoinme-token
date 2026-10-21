import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import tokenomics from "../config/tokenomics.json";

export function generatedTokenomics(): string {
  if (
    tokenomics.supplyModel !== "A" ||
    tokenomics.decimals !== 18 ||
    tokenomics.name !== tokenomics.name.normalize("NFC")
  ) {
    throw new Error("Invalid tokenomics metadata");
  }
  const scale = 10n ** BigInt(tokenomics.decimals);
  const amounts = tokenomics.allocations.map(({ amount }) => {
    if (!/^[1-9][0-9]*$/.test(amount)) throw new Error("Allocation must be a positive integer");
    return BigInt(amount) * scale;
  });
  const expectedIds = [
    "founder",
    "team1",
    "team2",
    "team3",
    "team4",
    "community",
    "liquidity",
    "treasury",
  ];
  if (
    JSON.stringify(tokenomics.allocations.map(({ id }) => id)) !== JSON.stringify(expectedIds) ||
    amounts.reduce((sum, amount) => sum + amount, 0n) !== BigInt(tokenomics.maxSupply) * scale ||
    BigInt(tokenomics.initiallyAvailable) + BigInt(tokenomics.initiallyLocked) !==
      BigInt(tokenomics.maxSupply)
  ) {
    throw new Error("Allocation totals or ordering do not match tokenomics");
  }
  return `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Generated from config/tokenomics.json. Run pnpm generate:tokenomics; do not edit.
/**
 * @title Tokenomics
 * @author Bit-Coin-Me contributors
 * @notice Fixed genesis constants generated from the reviewed tokenomics configuration.
 */
library Tokenomics {
    string internal constant NAME = unicode${JSON.stringify(tokenomics.name)};
    string internal constant SYMBOL = ${JSON.stringify(tokenomics.symbol)};
    uint256 internal constant MAX_SUPPLY = ${BigInt(tokenomics.maxSupply) * scale};

    function allocations() internal pure returns (uint256[8] memory) {
        return [
${amounts
  .map((amount, index) => `            ${index === 0 ? `uint256(${amount})` : amount}`)
  .join(",\n")}
        ];
    }
}
`;
}

if (require.main === module) {
  const file = resolve(__dirname, "../contracts/Tokenomics.sol");
  const expected = generatedTokenomics();
  if (process.argv.includes("--check")) {
    if (readFileSync(file, "utf8") !== expected) {
      throw new Error(
        "Tokenomics.sol differs from config/tokenomics.json; review the change before regenerating"
      );
    }
    console.log("Tokenomics source matches config/tokenomics.json");
  } else {
    writeFileSync(file, expected);
    console.log("Generated contracts/Tokenomics.sol");
  }
}
