import { expect } from "chai";
import { assertTestnet, deploymentNetwork } from "../scripts/lib/network";

describe("Deployment network safety", function () {
  it("accepts only the BSC testnet chain ID", function () {
    expect(() => assertTestnet(97n)).not.to.throw();
    for (const chainId of [56n, 1n, 31337n, 0n]) {
      expect(() => assertTestnet(chainId)).to.throw("BSC testnet (97) required");
    }
  });

  it("refuses mainnet even when a confirmation variable is present", function () {
    const original = process.env.CONFIRM_MAINNET;
    try {
      process.env.CONFIRM_MAINNET = "yes";
      expect(() => assertTestnet(56n)).to.throw("BSC testnet (97) required");
    } finally {
      if (original === undefined) delete process.env.CONFIRM_MAINNET;
      else process.env.CONFIRM_MAINNET = original;
    }
  });

  it("derives deployment metadata from the validated network", function () {
    expect(deploymentNetwork(97n)).to.deep.equal({ chainId: 97, network: "bscTestnet" });
    expect(() => deploymentNetwork(56n)).to.throw("BSC testnet (97) required");
  });
});
