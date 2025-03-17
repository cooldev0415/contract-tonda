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
  let pointManager: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  const tokenPerPoint = ethers.parseEther("1"); // 1 token per point

  beforeEach(async function () {
    [owner, verifier, pointManager, user1, user2] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("TondaToken");
    token = await Token.deploy(ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // Deploy airdrop
    const Airdrop = await ethers.getContractFactory("TondaAirdrop");
    airdrop = await Airdrop.deploy(await token.getAddress(), tokenPerPoint);
    await airdrop.waitForDeployment();

    // Grant roles
    await airdrop.grantRole(await airdrop.VERIFIER_ROLE(), verifier.address);
    await airdrop.grantRole(await airdrop.POINT_MANAGER_ROLE(), pointManager.address);

    // Transfer tokens to airdrop contract
    await token.transfer(await airdrop.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Setup", function () {
    it("Should set the correct token and token per point", async function () {
      expect(await airdrop.token()).to.equal(await token.getAddress());
      expect(await airdrop.tokenPerPoint()).to.equal(tokenPerPoint);
    });

    it("Should set the correct roles", async function () {
      expect(await airdrop.hasRole(await airdrop.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await airdrop.hasRole(await airdrop.VERIFIER_ROLE(), verifier.address)).to.be.true;
      expect(await airdrop.hasRole(await airdrop.POINT_MANAGER_ROLE(), pointManager.address)).to.be.true;
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

  describe("Points Assignment", function () {
    beforeEach(async function () {
      const futureTime = await time.latest() + 86400 * 2;
      await airdrop.scheduleAirdrop(futureTime);
      await airdrop.connect(user1).register();
      await airdrop.connect(user2).register();
      await airdrop.connect(verifier).batchVerifyUsers([user1.address, user2.address]);
    });

    it("Should allow point manager to assign points", async function () {
      await airdrop.connect(pointManager).assignPoints(user1.address, 100);
      expect(await airdrop.userPoints(user1.address)).to.equal(100);
      expect(await airdrop.totalPoints()).to.equal(100);
    });

    it("Should update points correctly", async function () {
      await airdrop.connect(pointManager).assignPoints(user1.address, 100);
      await airdrop.connect(pointManager).assignPoints(user1.address, 150);
      expect(await airdrop.userPoints(user1.address)).to.equal(150);
      expect(await airdrop.totalPoints()).to.equal(150);
    });

    it("Should handle batch point assignment", async function () {
      await airdrop.connect(pointManager).batchAssignPoints(
        [user1.address, user2.address],
        [100, 200]
      );
      expect(await airdrop.userPoints(user1.address)).to.equal(100);
      expect(await airdrop.userPoints(user2.address)).to.equal(200);
      expect(await airdrop.totalPoints()).to.equal(300);
    });

    it("Should not allow non-point managers to assign points", async function () {
      await expect(airdrop.connect(user1).assignPoints(user1.address, 100))
        .to.be.revertedWithCustomError(airdrop, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Token Per Point", function () {
    it("Should allow admin to update token per point", async function () {
      const newTokenPerPoint = ethers.parseEther("2");
      await airdrop.updateTokenPerPoint(newTokenPerPoint);
      expect(await airdrop.tokenPerPoint()).to.equal(newTokenPerPoint);
    });

    it("Should not allow non-admin to update token per point", async function () {
      await expect(airdrop.connect(user1).updateTokenPerPoint(ethers.parseEther("2")))
        .to.be.revertedWithCustomError(airdrop, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Claiming", function () {
    beforeEach(async function () {
      const futureTime = await time.latest() + 86400 * 2;
      await airdrop.scheduleAirdrop(futureTime);
      await airdrop.connect(user1).register();
      await airdrop.connect(verifier).verifyUser(user1.address);
      await airdrop.connect(pointManager).assignPoints(user1.address, 100);
    });

    it("Should not allow claiming before start time", async function () {
      await expect(airdrop.connect(user1).claim())
        .to.be.revertedWithCustomError(airdrop, "AirdropNotStarted");
    });

    it("Should not allow claiming without points", async function () {
      await airdrop.connect(user2).register();
      await airdrop.connect(verifier).verifyUser(user2.address);
      await time.increase(86400 * 3); // 3 days
      
      await expect(airdrop.connect(user2).claim())
        .to.be.revertedWithCustomError(airdrop, "NoPointsAssigned");
    });

    it("Should allow claiming after start time based on points", async function () {
      await time.increase(86400 * 3); // 3 days
      await airdrop.connect(user1).claim();
      
      // User should receive 100 points * 1 token per point = 100 tokens
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
      expect(await airdrop.hasClaimed(user1.address)).to.be.true;
      expect(await airdrop.totalClaimed()).to.equal(1);
    });

    it("Should not allow double claiming", async function () {
      await time.increase(86400 * 3);
      await airdrop.connect(user1).claim();
      await expect(airdrop.connect(user1).claim())
        .to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
    });

    it("Should calculate claim amount correctly", async function () {
      expect(await airdrop.getClaimAmount(user1.address)).to.equal(ethers.parseEther("100"));
      
      // Update token per point
      await airdrop.updateTokenPerPoint(ethers.parseEther("2"));
      expect(await airdrop.getClaimAmount(user1.address)).to.equal(ethers.parseEther("200"));
    });
  });
}); 