import { subtask } from "hardhat/config";
import {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  TASK_COMPILE_SOLIDITY_RUN_SOLCJS,
} from "hardhat/builtin-tasks/task-names";

const solc = require("solc") as {
  version(): string;
  compile(input: string): string;
};

// Use the same pinned compiler on musl and in CI, without a remote download.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }) => {
  const longVersion = solc.version();
  if (solcVersion !== "0.8.28" || !longVersion.startsWith("0.8.28+commit.7893614a.")) {
    throw new Error("The pinned Solidity 0.8.28 compiler is required");
  }
  return {
    compilerPath: require.resolve("solc/soljson.js"),
    isSolcJs: true,
    version: solcVersion,
    longVersion,
  };
});

// Avoid truncated subprocess output on the local musl/Node environment.
subtask(TASK_COMPILE_SOLIDITY_RUN_SOLCJS).setAction(async ({ input, solcJsPath }) => {
  if (solcJsPath !== require.resolve("solc/soljson.js")) {
    throw new Error("Unexpected Solidity compiler path");
  }
  return JSON.parse(solc.compile(JSON.stringify(input)));
});
