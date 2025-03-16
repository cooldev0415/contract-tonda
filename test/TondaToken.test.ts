import { expect } from "chai";
import { ethers } from "hardhat";
import { TondaToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TondaToken", function () {
  let token: TondaToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  const initialSupply = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const TondaToken = await ethers.getContractFactory("TondaToken");
    token = await TondaToken.deploy(initialSupply);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("50");
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);

      await token.connect(addr1).transfer(addr2.address, amount);
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  describe("Minting", function () {
    it("Should allow minting by minter role", async function () {
      const amount = ethers.parseEther("100");
      await token.mint(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should fail if non-minter tries to mint", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        token.connect(addr1).mint(addr2.address, amount)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    it("Should allow burning tokens", async function () {
      const amount = ethers.parseEther("100");
      await token.transfer(addr1.address, amount);
      await token.connect(addr1).burn(amount);
      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });
  });

  describe("Pausing", function () {
    it("Should pause and unpause token transfers", async function () {
      await token.pause();
      const amount = ethers.parseEther("100");
      await expect(
        token.transfer(addr1.address, amount)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");

      await token.unpause();
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should fail if non-pauser tries to pause", async function () {
      await expect(
        token.connect(addr1).pause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });
}); 