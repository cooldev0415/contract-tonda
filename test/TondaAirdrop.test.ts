import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

describe("TondaAirdrop", function () {
  let token: any;
  let airdrop: any;
  let owner: SignerWithAddress;
  let verifier: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  const airdropAmount = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, verifier, user1, user2] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("TondaToken");
    token = await Token.deploy(ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // Deploy airdrop
    const Airdrop = await ethers.getContractFactory("TondaAirdrop");
    airdrop = await Airdrop.deploy(await token.getAddress(), airdropAmount);
    await airdrop.waitForDeployment();

    // Grant verifier role
    await airdrop.grantRole(await airdrop.VERIFIER_ROLE(), verifier.address);

    // Transfer tokens to airdrop contract
    await token.transfer(await airdrop.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Setup", function () {
    it("Should set the correct token and airdrop amount", async function () {
      expect(await airdrop.token()).to.equal(await token.getAddress());
      expect(await airdrop.airdropAmount()).to.equal(airdropAmount);
    });

    it("Should set the correct roles", async function () {
      expect(await airdrop.hasRole(await airdrop.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await airdrop.hasRole(await airdrop.VERIFIER_ROLE(), verifier.address)).to.be.true;
    });
  });

  describe("Registration", function () {
    beforeEach(async function () {
      const futureTime = await time.latest() + 86400 * 2; // 2 days from now
      await airdrop.scheduleAirdrop(futureTime);
    });

    it("Should allow users to register", async function () {
      await airdrop.connect(user1).register();
      expect(await airdrop.isRegistered(user1.address)).to.be.true;
      expect(await airdrop.totalRegistered()).to.equal(1);
    });

    it("Should not allow double registration", async function () {
      await airdrop.connect(user1).register();
      await expect(airdrop.connect(user1).register())
        .to.be.revertedWithCustomError(airdrop, "AlreadyRegistered");
    });
  });

  describe("Verification", function () {
    beforeEach(async function () {
      const futureTime = await time.latest() + 86400 * 2;
      await airdrop.scheduleAirdrop(futureTime);
      await airdrop.connect(user1).register();
    });

    it("Should allow verifier to verify users", async function () {
      await airdrop.connect(verifier).verifyUser(user1.address);
      expect(await airdrop.isVerified(user1.address)).to.be.true;
      expect(await airdrop.totalVerified()).to.equal(1);
    });

    it("Should not allow non-verifiers to verify users", async function () {
      await expect(airdrop.connect(user2).verifyUser(user1.address))
        .to.be.revertedWithCustomError(airdrop, "AccessControlUnauthorizedAccount");
    });

    it("Should handle batch verification", async function () {
      await airdrop.connect(user2).register();
      await airdrop.connect(verifier).batchVerifyUsers([user1.address, user2.address]);
      expect(await airdrop.isVerified(user1.address)).to.be.true;
      expect(await airdrop.isVerified(user2.address)).to.be.true;
      expect(await airdrop.totalVerified()).to.equal(2);
    });
  });

  describe("Claiming", function () {
    beforeEach(async function () {
      const futureTime = await time.latest() + 86400 * 2;
      await airdrop.scheduleAirdrop(futureTime);
      await airdrop.connect(user1).register();
      await airdrop.connect(verifier).verifyUser(user1.address);
    });

    it("Should not allow claiming before start time", async function () {
      await expect(airdrop.connect(user1).claim())
        .to.be.revertedWithCustomError(airdrop, "AirdropNotStarted");
    });

    it("Should allow claiming after start time", async function () {
      await time.increase(86400 * 3); // 3 days
      await airdrop.connect(user1).claim();
      expect(await token.balanceOf(user1.address)).to.equal(airdropAmount);
      expect(await airdrop.hasClaimed(user1.address)).to.be.true;
      expect(await airdrop.totalClaimed()).to.equal(1);
    });

    it("Should not allow double claiming", async function () {
      await time.increase(86400 * 3);
      await airdrop.connect(user1).claim();
      await expect(airdrop.connect(user1).claim())
        .to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
    });
  });
}); 