import { expect } from "chai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generatedTokenomics } from "../scripts/generate-tokenomics";

describe("Tokenomics source of truth", function () {
  it("matches the generated Solidity constants exactly", function () {
    expect(readFileSync(resolve(__dirname, "../contracts/Tokenomics.sol"), "utf8")).to.equal(
      generatedTokenomics()
    );
  });
});
