import { expect } from "chai";
import { artifacts } from "hardhat";
import { readFileSync } from "node:fs";
import { assertAllowedAbi, assertTokenAst } from "../scripts/lib/token-policy";

describe("Security checker regressions", function () {
  it("rejects inherited role entry points, payable methods and additional events", async function () {
    const { abi } = await artifacts.readArtifact("BitCoinMe");
    expect(() => assertAllowedAbi(abi)).not.to.throw();
    expect(() =>
      assertAllowedAbi([
        ...abi,
        { type: "function", name: "grantRole", inputs: [{ type: "bytes32" }, { type: "address" }] },
      ])
    ).to.throw("Forbidden or missing ABI function");
    expect(() => assertAllowedAbi([...abi, { type: "event", name: "OwnerAdded" }])).to.throw(
      "Forbidden ABI event"
    );
    expect(() =>
      assertAllowedAbi([...abi, { type: "receive", stateMutability: "payable" }])
    ).to.throw("Native currency entry point");
    expect(() => assertAllowedAbi(abi.filter((item) => item.name !== "burnFrom"))).to.throw(
      "Forbidden or missing ABI function"
    );
  });

  it("rejects transfer hooks, assembly and mints outside the constructor", async function () {
    const build = await artifacts.getBuildInfo("contracts/BitCoinMe.sol:BitCoinMe");
    // Inspect published source, including when coverage has instrumented the build artifacts.
    const input = structuredClone(build!.input);
    for (const file of Object.keys(input.sources)) {
      if (file.startsWith("contracts/")) input.sources[file].content = readFileSync(file, "utf8");
    }
    input.settings.outputSelection = { "*": { "": ["ast"] } };
    const output = JSON.parse(require("solc").compile(JSON.stringify(input)));
    expect(
      (output.errors || []).filter((error: { severity: string }) => error.severity === "error")
    ).to.deep.equal([]);
    const ast = output.sources["contracts/BitCoinMe.sol"].ast;
    expect(() => assertTokenAst(ast)).not.to.throw();
    for (const added of [
      { nodeType: "FunctionDefinition", kind: "function", name: "_update" },
      { nodeType: "InlineAssembly" },
      { nodeType: "FunctionCall", expression: { name: "_mint" } },
    ]) {
      const modified = structuredClone(ast) as { nodes: unknown[] };
      modified.nodes.push(added);
      expect(() => assertTokenAst(modified)).to.throw();
    }
  });
});
