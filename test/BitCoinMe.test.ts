import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import tokenomics from "../config/tokenomics.json";
import { allocationAmounts, genesisFixture, maximumSupply } from "./helpers/genesis";

describe("BitCoinMe", function () {
  it("uses the exact NFC name, symbol and decimals", async function () {
    const { token } = await loadFixture(genesisFixture);
    expect(ethers.toUtf8Bytes(await token.name())).to.deep.equal(
      ethers.toUtf8Bytes(tokenomics.name.normalize("NFC"))
    );
    expect(await token.symbol()).to.equal(tokenomics.symbol);
    expect(await token.decimals()).to.equal(tokenomics.decimals);
    expect(await token.MAX_SUPPLY()).to.equal(maximumSupply);
  });

  it("creates the entire supply directly in the final contract recipients", async function () {
    const { token, recipients, deployer } = await loadFixture(genesisFixture);
    expect(await token.totalSupply()).to.equal(maximumSupply);
    expect(await token.balanceOf(deployer.address)).to.equal(0n);
    for (let i = 0; i < recipients.length; i++) {
      expect(await token.balanceOf(recipients[i])).to.equal(allocationAmounts[i]);
      expect(await ethers.provider.getCode(recipients[i])).not.to.equal("0x");
    }
    const receipt = await token.deploymentTransaction()!.wait();
    const transfers = receipt!.logs.map((log) => token.interface.parseLog(log));
    expect(transfers).to.have.lengthOf(recipients.length);
    for (let i = 0; i < recipients.length; i++) {
      expect(transfers[i]!.name).to.equal("Transfer");
      expect(transfers[i]!.args).to.deep.equal([
        ethers.ZeroAddress,
        recipients[i],
        allocationAmounts[i],
      ]);
    }
  });

  for (const index of [0, 7]) {
    it("rejects a zero recipient at index " + index, async function () {
      const { token, factory, recipients } = await loadFixture(genesisFixture);
      const invalid = [...recipients];
      invalid[index] = ethers.ZeroAddress;
      await expect(factory.deploy(invalid))
        .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });
  }

  it("rejects an EOA recipient", async function () {
    const { token, factory, recipients, outsider } = await loadFixture(genesisFixture);
    await expect(factory.deploy([outsider.address, ...recipients.slice(1)]))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
      .withArgs(outsider.address);
  });

  it("rejects duplicate recipients", async function () {
    const { token, factory, recipients } = await loadFixture(genesisFixture);
    const invalid = [...recipients];
    invalid[7] = recipients[2];
    await expect(factory.deploy(invalid))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
      .withArgs(recipients[2]);
  });

  it("rejects the deployer even when the deployer has contract code", async function () {
    const { token, factory, recipients, holders } = await loadFixture(genesisFixture);
    await expect(factory.connect(holders[0]).deploy(recipients))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
      .withArgs(recipients[0]);
  });

  it("rejects its own predicted address as a recipient", async function () {
    const { token, factory, recipients, deployer } = await loadFixture(genesisFixture);
    const self = ethers.getCreateAddress({
      from: deployer.address,
      nonce: await deployer.getNonce(),
    });
    await expect(factory.deploy([self, ...recipients.slice(1)]))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
      .withArgs(self);
  });

  it("transfers the exact amount and emits Transfer", async function () {
    const { token, holders, user, recipients } = await loadFixture(genesisFixture);
    const amount = ethers.parseEther("1000");
    await expect(token.connect(holders[0]).transfer(user.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(recipients[0], user.address, amount);
    expect(await token.balanceOf(user.address)).to.equal(amount);
    expect(await token.balanceOf(recipients[0])).to.equal(allocationAmounts[0] - amount);
    expect(await token.totalSupply()).to.equal(maximumSupply);
  });

  it("supports zero transfers and self transfers", async function () {
    const { token, holders, user, recipients } = await loadFixture(genesisFixture);
    await expect(token.connect(user).transfer(recipients[0], 0n))
      .to.emit(token, "Transfer")
      .withArgs(user.address, recipients[0], 0n);
    await token.connect(holders[0]).transfer(recipients[0], allocationAmounts[0]);
    expect(await token.balanceOf(recipients[0])).to.equal(allocationAmounts[0]);
    expect(await token.totalSupply()).to.equal(maximumSupply);
  });

  it("rejects an insufficient balance and the zero receiver with precise errors", async function () {
    const { token, user, recipients } = await loadFixture(genesisFixture);
    await expect(token.connect(user).transfer(recipients[0], 1n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
      .withArgs(user.address, 0n, 1n);
    await expect(token.connect(user).transfer(ethers.ZeroAddress, 0n))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
      .withArgs(ethers.ZeroAddress);
  });

  it("emits Approval and spends only the approved allowance", async function () {
    const { token, holders, user, spender, recipients } = await loadFixture(genesisFixture);
    await expect(token.connect(holders[0]).approve(spender.address, 100n))
      .to.emit(token, "Approval")
      .withArgs(recipients[0], spender.address, 100n);
    await expect(token.connect(spender).transferFrom(recipients[0], user.address, 40n))
      .to.emit(token, "Transfer")
      .withArgs(recipients[0], user.address, 40n);
    expect(await token.allowance(recipients[0], spender.address)).to.equal(60n);
    expect(await token.balanceOf(user.address)).to.equal(40n);
    await expect(token.connect(spender).transferFrom(recipients[0], user.address, 61n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
      .withArgs(spender.address, 60n, 61n);
  });

  it("allows approval replacement and revocation and rejects a zero spender", async function () {
    const { token, holders, spender, recipients } = await loadFixture(genesisFixture);
    await token.connect(holders[0]).approve(spender.address, 100n);
    await token.connect(holders[0]).approve(spender.address, 1n);
    expect(await token.allowance(recipients[0], spender.address)).to.equal(1n);
    await token.connect(holders[0]).approve(spender.address, 0n);
    expect(await token.allowance(recipients[0], spender.address)).to.equal(0n);
    await expect(token.approve(ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(token, "ERC20InvalidSpender")
      .withArgs(ethers.ZeroAddress);
  });

  it("preserves infinite allowance for transfers and burns", async function () {
    const { token, holders, spender, user, recipients } = await loadFixture(genesisFixture);
    await token.connect(holders[0]).approve(spender.address, ethers.MaxUint256);
    await token.connect(spender).transferFrom(recipients[0], user.address, 100n);
    await token.connect(spender).burnFrom(recipients[0], 100n);
    expect(await token.allowance(recipients[0], spender.address)).to.equal(ethers.MaxUint256);
  });

  it("burns only the caller's balance and reduces supply", async function () {
    const { token, holders, recipients, user } = await loadFixture(genesisFixture);
    await expect(token.connect(holders[0]).burn(100n))
      .to.emit(token, "Transfer")
      .withArgs(recipients[0], ethers.ZeroAddress, 100n);
    expect(await token.totalSupply()).to.equal(maximumSupply - 100n);
    expect(await token.balanceOf(recipients[0])).to.equal(allocationAmounts[0] - 100n);
    await expect(token.connect(user).burn(1n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
      .withArgs(user.address, 0n, 1n);
    await expect(token.connect(user).burn(0n))
      .to.emit(token, "Transfer")
      .withArgs(user.address, ethers.ZeroAddress, 0n);
  });

  it("requires and consumes allowance to burn another holder's tokens", async function () {
    const { token, holders, recipients, spender } = await loadFixture(genesisFixture);
    await expect(token.connect(spender).burnFrom(recipients[0], 1n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
      .withArgs(spender.address, 0n, 1n);
    await token.connect(holders[0]).approve(spender.address, 100n);
    await expect(token.connect(spender).burnFrom(recipients[0], 40n))
      .to.emit(token, "Transfer")
      .withArgs(recipients[0], ethers.ZeroAddress, 40n);
    expect(await token.allowance(recipients[0], spender.address)).to.equal(60n);
    expect(await token.totalSupply()).to.equal(maximumSupply - 40n);
    await expect(token.connect(spender).burnFrom(recipients[0], 61n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
      .withArgs(spender.address, 60n, 61n);
  });

  it("restores allowance when a burn fails for insufficient balance", async function () {
    const { token, user, spender } = await loadFixture(genesisFixture);
    await token.connect(user).approve(spender.address, 100n);
    await expect(token.connect(spender).burnFrom(user.address, 100n))
      .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
      .withArgs(user.address, 0n, 100n);
    expect(await token.allowance(user.address, spender.address)).to.equal(100n);
  });

  it("rejects legacy privileged calls, including after burning", async function () {
    const { token, deployer, holders, user } = await loadFixture(genesisFixture);
    const legacy = new ethers.Interface([
      "function mint(address,uint256)",
      "function addOwner(address)",
      "function removeOwner(address)",
      "function grantRole(bytes32,address)",
      "function revokeRole(bytes32,address)",
      "function renounceRole(bytes32,address)",
    ]);
    await token.connect(holders[0]).burn(100n);
    const calls = [
      legacy.encodeFunctionData("mint", [user.address, 100n]),
      legacy.encodeFunctionData("addOwner", [user.address]),
      legacy.encodeFunctionData("removeOwner", [user.address]),
      ...["grantRole", "revokeRole", "renounceRole"].map((fn) =>
        legacy.encodeFunctionData(fn, [ethers.ZeroHash, user.address])
      ),
    ];
    for (const signer of [deployer, holders[0], user]) {
      for (const data of calls) {
        await expect(signer.sendTransaction({ to: await token.getAddress(), data })).to.be.reverted;
      }
    }
    expect(await token.totalSupply()).to.equal(maximumSupply - 100n);
  });

  it("rejects native deposits, unknown selectors and value on ERC-20 calls", async function () {
    const { token, deployer, user } = await loadFixture(genesisFixture);
    const to = await token.getAddress();
    await expect(deployer.sendTransaction({ to, value: 1n })).to.be.reverted;
    await expect(deployer.sendTransaction({ to, data: "0x12345678" })).to.be.reverted;
    await expect(
      deployer.sendTransaction({
        to,
        value: 1n,
        data: token.interface.encodeFunctionData("transfer", [user.address, 0n]),
      })
    ).to.be.reverted;
  });

  it("preserves balances and non-increasing supply over 1000 seeded operations", async function () {
    this.timeout(120000);
    const { token, holders, user, spender, deployer } = await loadFixture(genesisFixture);
    const actors = [...holders, user, spender];
    const addresses = actors.map((actor) => actor.address);
    const balances = [...allocationAmounts, 0n, 0n];
    let supply = maximumSupply;
    let state = 0x00c0ffee;
    function random(): number {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    }
    for (let i = 0; i < 1000; i++) {
      const from = random() % actors.length;
      const to = random() % actors.length;
      const operator = random() % actors.length;
      const cap =
        balances[from] < ethers.parseEther("1000") ? balances[from] : ethers.parseEther("1000");
      const amount = i % 31 === 0 ? 0n : (BigInt(random()) * cap) / 0xffffffffn;
      const previousSupply = supply;
      switch (i % 5) {
        case 0:
          await token.connect(actors[from]).transfer(addresses[to], amount);
          balances[from] -= amount;
          balances[to] += amount;
          break;
        case 1:
          await token.connect(actors[from]).approve(addresses[operator], amount);
          expect(await token.allowance(addresses[from], addresses[operator])).to.equal(amount);
          break;
        case 2:
          await token.connect(actors[from]).approve(addresses[operator], amount);
          await token
            .connect(actors[operator])
            .transferFrom(addresses[from], addresses[to], amount);
          balances[from] -= amount;
          balances[to] += amount;
          expect(await token.allowance(addresses[from], addresses[operator])).to.equal(0n);
          break;
        case 3:
          await token.connect(actors[from]).burn(amount);
          balances[from] -= amount;
          supply -= amount;
          break;
        case 4:
          await token.connect(actors[from]).approve(addresses[operator], amount);
          await token.connect(actors[operator]).burnFrom(addresses[from], amount);
          balances[from] -= amount;
          supply -= amount;
          expect(await token.allowance(addresses[from], addresses[operator])).to.equal(0n);
          break;
      }
      const actualSupply = await token.totalSupply();
      expect(actualSupply).to.equal(supply);
      expect(actualSupply).to.be.at.most(previousSupply);
      const actualBalances = await Promise.all(
        addresses.map((address) => token.balanceOf(address))
      );
      expect(actualBalances).to.deep.equal(balances);
      expect(actualBalances.reduce((sum, balance) => sum + balance, 0n)).to.equal(actualSupply);
      expect(await token.balanceOf(deployer.address)).to.equal(0n);
    }
    expect(supply).to.be.lessThan(maximumSupply);
  });
});
