import { expect } from "chai";
import { ethers } from "hardhat";
import { BitCoinMe } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BitCoinMe Token", function () {
  let bcm: BitCoinMe;
  let owner1: SignerWithAddress;
  let owner2: SignerWithAddress;
  let owner3: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("6666666666");
  const MAX_SUPPLY = ethers.parseEther("8888888888");

  beforeEach(async function () {
    [owner1, owner2, owner3, user1, user2] = await ethers.getSigners();

    const BitCoinMe = await ethers.getContractFactory("BitCoinMe");
    bcm = await BitCoinMe.deploy([owner1.address, owner2.address]);
    await bcm.waitForDeployment();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe("Déploiement", function () {
    it("Devrait définir le nom et le symbole corrects", async function () {
      expect(await bcm.name()).to.equal("BitCoinMe!");
      expect(await bcm.symbol()).to.equal("BCM");
    });

    it("Devrait avoir 18 décimales", async function () {
      expect(await bcm.decimals()).to.equal(18);
    });

    it("Devrait minter l'initial supply au déployeur", async function () {
      expect(await bcm.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await bcm.balanceOf(owner1.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Devrait définir le max supply correct", async function () {
      expect(await bcm.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("Devrait assigner les rôles aux propriétaires initiaux", async function () {
      expect(await bcm.isOwner(owner1.address)).to.be.true;
      expect(await bcm.isOwner(owner2.address)).to.be.true;

      const minterRole = await bcm.MINTER_ROLE();
      expect(await bcm.hasRole(minterRole, owner1.address)).to.be.true;
      expect(await bcm.hasRole(minterRole, owner2.address)).to.be.true;
    });

    // v2 — le déployeur reçoit ses rôles même s'il n'est pas dans initialOwners
    it("Devrait assigner les rôles au déployeur même absent de initialOwners", async function () {
      const BitCoinMe = await ethers.getContractFactory("BitCoinMe");
      // owner2 déploie, et ne liste que owner3 comme initialOwner
      const bcm2 = await BitCoinMe.connect(owner2).deploy([owner3.address]);
      await bcm2.waitForDeployment();

      // Le déployeur (owner2) doit quand même avoir ses rôles
      expect(await bcm2.isOwner(owner2.address)).to.be.true;
      const minterRole = await bcm2.MINTER_ROLE();
      expect(await bcm2.hasRole(minterRole, owner2.address)).to.be.true;

      // Et owner3 aussi
      expect(await bcm2.isOwner(owner3.address)).to.be.true;

      // L'initial supply va bien au déployeur
      expect(await bcm2.balanceOf(owner2.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Devrait rejeter le déploiement sans propriétaires", async function () {
      const BitCoinMe = await ethers.getContractFactory("BitCoinMe");
      await expect(BitCoinMe.deploy([])).to.be.revertedWith(
        "Au moins un proprietaire requis"
      );
    });

    it("Devrait rejeter le déploiement avec adresse zero", async function () {
      const BitCoinMe = await ethers.getContractFactory("BitCoinMe");
      await expect(
        BitCoinMe.deploy([owner1.address, ethers.ZeroAddress])
      ).to.be.revertedWith("Adresse proprietaire invalide");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe("Minting", function () {
    it("Devrait permettre au propriétaire de minter des tokens", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(bcm.connect(owner1).mint(user1.address, mintAmount))
        .to.emit(bcm, "TokensMinted")
        .withArgs(user1.address, mintAmount, owner1.address);

      expect(await bcm.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Devrait permettre à plusieurs propriétaires de minter", async function () {
      const mintAmount = ethers.parseEther("1000");

      await bcm.connect(owner1).mint(user1.address, mintAmount);
      await bcm.connect(owner2).mint(user2.address, mintAmount);

      expect(await bcm.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await bcm.balanceOf(user2.address)).to.equal(mintAmount);
    });

    it("Devrait rejeter le mint d'un non-propriétaire", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        bcm.connect(user1).mint(user2.address, mintAmount)
      ).to.be.reverted;
    });

    it("Devrait rejeter le mint vers l'adresse zero", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        bcm.connect(owner1).mint(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWith("Mint vers adresse zero");
    });

    it("Devrait rejeter le mint au-delà du max supply", async function () {
      const remainingSupply = await bcm.remainingMintableSupply();
      const excessAmount = remainingSupply + ethers.parseEther("1");

      await expect(
        bcm.connect(owner1).mint(user1.address, excessAmount)
      ).to.be.revertedWith("Depassement du supply maximum");
    });

    it("Devrait calculer correctement le supply mintable restant", async function () {
      const mintAmount = ethers.parseEther("1000000");
      await bcm.connect(owner1).mint(user1.address, mintAmount);

      const expected = MAX_SUPPLY - INITIAL_SUPPLY - mintAmount;
      expect(await bcm.remainingMintableSupply()).to.equal(expected);
    });

    it("Devrait permettre de minter exactement jusqu'au max supply", async function () {
      const remainingSupply = await bcm.remainingMintableSupply();

      await bcm.connect(owner1).mint(user1.address, remainingSupply);

      expect(await bcm.totalSupply()).to.equal(MAX_SUPPLY);
      expect(await bcm.remainingMintableSupply()).to.equal(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe("Burn", function () {
    it("Devrait permettre à un détenteur de brûler ses propres tokens", async function () {
      const burnAmount = ethers.parseEther("1000");

      await expect(bcm.connect(owner1).burn(burnAmount))
        .to.emit(bcm, "TokensBurned")
        .withArgs(owner1.address, burnAmount);

      expect(await bcm.balanceOf(owner1.address)).to.equal(
        INITIAL_SUPPLY - burnAmount
      );
    });

    it("Devrait réduire le totalSupply après un burn", async function () {
      const burnAmount = ethers.parseEther("1000");

      await bcm.connect(owner1).burn(burnAmount);

      expect(await bcm.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("Devrait libérer de la place sous le MAX_SUPPLY après un burn", async function () {
      const burnAmount = ethers.parseEther("1000");
      await bcm.connect(owner1).burn(burnAmount);

      // On peut maintenant minter ce qui avait été brûlé
      await expect(
        bcm.connect(owner1).mint(user1.address, burnAmount)
      ).to.not.be.reverted;

      expect(await bcm.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Devrait rejeter le burn si le solde est insuffisant", async function () {
      const tooMuch = INITIAL_SUPPLY + ethers.parseEther("1");

      await expect(bcm.connect(owner1).burn(tooMuch)).to.be.reverted;
    });

    it("Devrait permettre à n'importe quel détenteur de brûler ses tokens", async function () {
      // Transférer des tokens à user1 d'abord
      const amount = ethers.parseEther("500");
      await bcm.connect(owner1).transfer(user1.address, amount);

      await expect(bcm.connect(user1).burn(amount))
        .to.emit(bcm, "TokensBurned")
        .withArgs(user1.address, amount);

      expect(await bcm.balanceOf(user1.address)).to.equal(0n);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe("Gestion des propriétaires", function () {
    it("Devrait permettre d'ajouter un nouveau propriétaire", async function () {
      await expect(bcm.connect(owner1).addOwner(owner3.address))
        .to.emit(bcm, "OwnerAdded")
        .withArgs(owner3.address, owner1.address);

      expect(await bcm.isOwner(owner3.address)).to.be.true;

      const minterRole = await bcm.MINTER_ROLE();
      expect(await bcm.hasRole(minterRole, owner3.address)).to.be.true;
    });

    it("Devrait permettre au nouveau propriétaire de minter", async function () {
      await bcm.connect(owner1).addOwner(owner3.address);

      const mintAmount = ethers.parseEther("1000");
      await expect(bcm.connect(owner3).mint(user1.address, mintAmount)).to.not
        .be.reverted;
    });

    it("Devrait rejeter l'ajout d'un propriétaire par un non-propriétaire", async function () {
      await expect(bcm.connect(user1).addOwner(owner3.address)).to.be.reverted;
    });

    it("Devrait rejeter l'ajout de l'adresse zero comme propriétaire", async function () {
      await expect(
        bcm.connect(owner1).addOwner(ethers.ZeroAddress)
      ).to.be.revertedWith("Adresse proprietaire invalide");
    });

    it("Devrait permettre de retirer un propriétaire (quand il en reste d'autres)", async function () {
      await expect(bcm.connect(owner1).removeOwner(owner2.address))
        .to.emit(bcm, "OwnerRemoved")
        .withArgs(owner2.address, owner1.address);

      expect(await bcm.isOwner(owner2.address)).to.be.false;

      const minterRole = await bcm.MINTER_ROLE();
      expect(await bcm.hasRole(minterRole, owner2.address)).to.be.false;
    });

    it("Devrait empêcher un propriétaire retiré de minter", async function () {
      await bcm.connect(owner1).removeOwner(owner2.address);

      const mintAmount = ethers.parseEther("1000");
      await expect(
        bcm.connect(owner2).mint(user1.address, mintAmount)
      ).to.be.reverted;
    });

    it("Devrait rejeter le retrait d'un propriétaire par un non-propriétaire", async function () {
      await expect(
        bcm.connect(user1).removeOwner(owner2.address)
      ).to.be.reverted;
    });

    // v2 — protection du dernier admin
    it("Devrait rejeter le retrait du dernier administrateur", async function () {
      // owner1 retire owner2, il ne reste plus qu'owner1
      await bcm.connect(owner1).removeOwner(owner2.address);

      // Tenter de se retirer soi-même alors qu'on est le dernier admin
      await expect(
        bcm.connect(owner1).removeOwner(owner1.address)
      ).to.be.revertedWith("Impossible de retirer le dernier administrateur");

      // owner1 doit toujours être admin
      expect(await bcm.isOwner(owner1.address)).to.be.true;
    });

    // v2 — auto-retrait autorisé seulement s'il reste au moins un autre admin
    it("Devrait permettre à un propriétaire de se retirer lui-même s'il en reste d'autres", async function () {
      // owner2 se retire de lui-même (owner1 reste)
      await bcm.connect(owner2).removeOwner(owner2.address);
      expect(await bcm.isOwner(owner2.address)).to.be.false;

      // owner1 est toujours là
      expect(await bcm.isOwner(owner1.address)).to.be.true;
    });

    it("Devrait permettre de re-ajouter un propriétaire après l'avoir retiré", async function () {
      await bcm.connect(owner1).removeOwner(owner2.address);
      expect(await bcm.isOwner(owner2.address)).to.be.false;

      await bcm.connect(owner1).addOwner(owner2.address);
      expect(await bcm.isOwner(owner2.address)).to.be.true;

      const minterRole = await bcm.MINTER_ROLE();
      expect(await bcm.hasRole(minterRole, owner2.address)).to.be.true;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe("Transferts ERC20", function () {
    it("Devrait permettre les transferts de tokens", async function () {
      const transferAmount = ethers.parseEther("1000");

      await bcm.connect(owner1).transfer(user1.address, transferAmount);

      expect(await bcm.balanceOf(user1.address)).to.equal(transferAmount);
    });

    it("Devrait permettre les transferts avec allowance", async function () {
      const amount = ethers.parseEther("1000");

      await bcm.connect(owner1).approve(user1.address, amount);
      await bcm
        .connect(user1)
        .transferFrom(owner1.address, user2.address, amount);

      expect(await bcm.balanceOf(user2.address)).to.equal(amount);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe("Transparence", function () {
    it("Devrait émettre des events pour tous les mints", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(bcm.connect(owner1).mint(user1.address, mintAmount))
        .to.emit(bcm, "TokensMinted")
        .withArgs(user1.address, mintAmount, owner1.address);
    });

    it("Devrait émettre des events pour tous les burns", async function () {
      const burnAmount = ethers.parseEther("1000");

      await expect(bcm.connect(owner1).burn(burnAmount))
        .to.emit(bcm, "TokensBurned")
        .withArgs(owner1.address, burnAmount);
    });

    it("Devrait émettre des events pour l'ajout de propriétaires", async function () {
      await expect(bcm.connect(owner1).addOwner(owner3.address))
        .to.emit(bcm, "OwnerAdded")
        .withArgs(owner3.address, owner1.address);
    });

    it("Devrait émettre des events pour le retrait de propriétaires", async function () {
      await expect(bcm.connect(owner1).removeOwner(owner2.address))
        .to.emit(bcm, "OwnerRemoved")
        .withArgs(owner2.address, owner1.address);
    });

    it("Devrait permettre de vérifier les rôles publiquement", async function () {
      const isOwner = await bcm.isOwner(owner1.address);
      const minterRole = await bcm.MINTER_ROLE();
      const hasMinterRole = await bcm.hasRole(minterRole, owner1.address);

      expect(isOwner).to.be.true;
      expect(hasMinterRole).to.be.true;
    });
  });
});
