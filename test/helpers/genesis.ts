import { ethers, network } from "hardhat";
import tokenomics from "../../config/tokenomics.json";

export const allocationAmounts = tokenomics.allocations.map(({ amount }) =>
  ethers.parseUnits(amount, tokenomics.decimals)
);
export const maximumSupply = ethers.parseUnits(tokenomics.maxSupply, tokenomics.decimals);

// Local test recipients contain STOP only. They are not production safes or locks.
export async function genesisFixture() {
  const [deployer, user, spender, outsider] = await ethers.getSigners();
  const receiverFactory = new ethers.ContractFactory([], "0x6001600c60003960016000f300", deployer);
  const recipients: string[] = [];
  for (const allocation of tokenomics.allocations) {
    void allocation;
    const receiver = await receiverFactory.deploy();
    await receiver.waitForDeployment();
    recipients.push(await receiver.getAddress());
  }
  const holders = [];
  for (const address of recipients) {
    await network.provider.send("hardhat_setBalance", [
      address,
      ethers.toQuantity(ethers.parseEther("10")),
    ]);
    holders.push(await ethers.getImpersonatedSigner(address));
  }
  const factory = await ethers.getContractFactory("BitCoinMe");
  const token = await factory.deploy(recipients);
  await token.waitForDeployment();
  return { token, factory, recipients, holders, deployer, user, spender, outsider };
}
