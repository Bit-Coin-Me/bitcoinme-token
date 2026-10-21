import { expect } from "chai";
import { artifacts } from "hardhat";

describe("Token security surface", function () {
  it("exposes exactly the permitted ERC-20 and burn functions", async function () {
    const { abi } = await artifacts.readArtifact("BitCoinMe");
    const signatures = abi
      .filter((entry) => entry.type === "function")
      .map(
        (entry) =>
          `${entry.name}(${entry.inputs.map((input: { type: string }) => input.type).join(",")})`
      )
      .sort();
    expect(signatures).to.deep.equal(
      [
        "MAX_SUPPLY()",
        "allowance(address,address)",
        "approve(address,uint256)",
        "balanceOf(address)",
        "burn(uint256)",
        "burnFrom(address,uint256)",
        "decimals()",
        "name()",
        "symbol()",
        "totalSupply()",
        "transfer(address,uint256)",
        "transferFrom(address,address,uint256)",
      ].sort()
    );
  });

  it("exposes only Transfer and Approval events", async function () {
    const { abi } = await artifacts.readArtifact("BitCoinMe");
    expect(
      abi
        .filter((entry) => entry.type === "event")
        .map((entry) => entry.name)
        .sort()
    ).to.deep.equal(["Approval", "Transfer"]);
  });

  it("has no payable entry point, receive or fallback", async function () {
    const { abi } = await artifacts.readArtifact("BitCoinMe");
    expect(
      abi.filter(
        (entry) =>
          entry.stateMutability === "payable" ||
          entry.type === "receive" ||
          entry.type === "fallback"
      )
    ).to.deep.equal([]);
  });
});
