/** Require BSC testnet before obtaining a signer or submitting a transaction. */
export function assertTestnet(chainId: bigint): void {
  if (chainId !== 97n) {
    throw new Error(`BSC testnet (97) required; received chain ID ${chainId}`);
  }
}

/** Build network metadata only after validating the provider's actual chain ID. */
export function deploymentNetwork(chainId: bigint): { chainId: number; network: string } {
  assertTestnet(chainId);
  return { chainId: Number(chainId), network: "bscTestnet" };
}
