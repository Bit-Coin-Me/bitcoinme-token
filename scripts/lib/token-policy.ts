type AbiEntry = {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: { type: string }[];
};
type AstNode = { nodeType?: string; name?: string; kind?: string; [key: string]: unknown };

export const allowedFunctions = [
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
].sort();

export function assertAllowedAbi(abi: AbiEntry[]): void {
  const actual = abi
    .filter((item) => item.type === "function")
    .map((item) => item.name + "(" + item.inputs!.map((input) => input.type).join(",") + ")")
    .sort();
  if (JSON.stringify(actual) !== JSON.stringify(allowedFunctions))
    throw new Error("Forbidden or missing ABI function");
  const events = abi
    .filter((item) => item.type === "event")
    .map((item) => item.name)
    .sort();
  if (JSON.stringify(events) !== JSON.stringify(["Approval", "Transfer"]))
    throw new Error("Forbidden ABI event");
  if (
    abi.some(
      (item) =>
        item.type === "receive" || item.type === "fallback" || item.stateMutability === "payable"
    )
  ) {
    throw new Error("Native currency entry point is forbidden");
  }
  const errors = abi
    .filter((item) => item.type === "error")
    .map((item) => item.name)
    .sort();
  if (
    JSON.stringify(errors) !==
    JSON.stringify([
      "ERC20InsufficientAllowance",
      "ERC20InsufficientBalance",
      "ERC20InvalidApprover",
      "ERC20InvalidReceiver",
      "ERC20InvalidSender",
      "ERC20InvalidSpender",
    ])
  )
    throw new Error("Unexpected custom error");
}

export function assertTokenAst(ast: unknown): void {
  let constructorMints = 0;
  let tokenFound = false;
  function visit(value: unknown, inConstructor = false): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, inConstructor));
      return;
    }
    const node = value as AstNode;
    const forbiddenNames =
      /Ownable|AccessControl|Pausable|Proxy|upgrade|blacklist|blocklist|tax|fee|maxTx|maxWallet|MINTER_ROLE/i;
    if (typeof node.name === "string" && forbiddenNames.test(node.name)) {
      throw new Error("Forbidden identifier: " + node.name);
    }
    if (node.nodeType === "ContractDefinition" && node.name === "BitCoinMe") {
      tokenFound = true;
      const bases = (node.baseContracts as { baseName: { name: string } }[]).map(
        (base) => base.baseName.name
      );
      if (JSON.stringify(bases) !== JSON.stringify(["ERC20", "ERC20Burnable"]))
        throw new Error("Forbidden inheritance");
    }
    if (node.nodeType === "FunctionDefinition") {
      if (node.kind !== "constructor")
        throw new Error("Token must not override ERC-20 logic or add functions");
      inConstructor = true;
    }
    if (node.nodeType === "InlineAssembly" || node.nodeType === "ModifierDefinition")
      throw new Error("Forbidden token logic");
    if (node.nodeType === "FunctionCall") {
      const expression = node.expression as { name?: string; memberName?: string };
      const name = expression.name || expression.memberName || "";
      if (name === "_mint") {
        if (!inConstructor) throw new Error("Mint outside constructor");
        constructorMints++;
      }
      if (
        ["mint", "delegatecall", "selfdestruct", "callcode", "call", "staticcall"].includes(name)
      ) {
        throw new Error("Forbidden call: " + name);
      }
    }
    if (node.nodeType === "MemberAccess" && (node.expression as AstNode)?.name === "tx")
      throw new Error("Forbidden tx access");
    Object.values(node).forEach((child) => visit(child, inConstructor));
  }
  visit(ast);
  if (!tokenFound || constructorMints !== 1)
    throw new Error("Exactly one constructor mint expression is required");
}
