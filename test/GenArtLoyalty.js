const {
  mine,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { web3, ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { changeTokenBalances } = require("../helpers");

const ONE_GWEI = 1_000_000_000;

const priceStandard = BigNumber.from(1).mul(BigNumber.from(10).pow(17));
const priceGold = BigNumber.from(5).mul(BigNumber.from(10).pow(17));

describe("GenArtLoyalty", async function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    const load = async () => {
      // Contracts are deployed using the first signer/account by default
      const [owner, user1, user2, user3] = await ethers.getSigners();

      const GenArt = await ethers.getContractFactory("GenArt");
      const GenArtLoyaltyVault = await ethers.getContractFactory(
        "GenArtLoyaltyVault"
      );

      const GenArtInterface = await ethers.getContractFactory(
        "GenArtInterfaceV4"
      );

      const GenArtGovToken = await ethers.getContractFactory("GenArtGovToken");

      const membership = await GenArt.deploy(
        "NAME",
        "SYMBOL",
        "URI_1",
        "URI_2",
        10
      );
      const token = await GenArtGovToken.deploy(owner.address);
      const iface = await GenArtInterface.deploy(membership.address);
      const vault = await GenArtLoyaltyVault.deploy(
        membership.address,
        token.address,
        iface.address
      );

      await membership.setPaused(false);
      await iface.setLoyaltyVault(vault.address);
      await membership.mint(owner.address, {
        value: priceStandard,
      });
      await membership.mintMany(user1.address, "5", {
        value: priceStandard.mul(5),
      });
      await membership.mintGold(user1.address, {
        value: priceGold,
      });

      await membership.mintMany(user2.address, "2", {
        value: priceStandard.mul(2),
      });
      await membership.mintGold(user2.address, {
        value: priceGold,
      });
      await membership.mintGold(user3.address, {
        value: priceGold,
      });

      await token.transfer(
        user1.address,
        BigNumber.from(10).pow(18).mul(10_000)
      );
      await token.transfer(
        user2.address,
        BigNumber.from(10).pow(18).mul(30_000)
      );
      await token.transfer(user3.address, BigNumber.from(10).pow(18).mul(30));

      const stake = async (user, onlyGold = false) => {
        const tokenBalance = await token.balanceOf(user.address);
        const membershipsUser1 = await membership.getTokensByOwner(
          user.address
        );
        const stakingMembershipsUser1 = membershipsUser1
          .filter((m) => (!onlyGold ? m.toNumber() <= 10 : m.toNumber() > 10))
          .map((m) => m.toString());
        await token.connect(user).approve(vault.address, tokenBalance);
        await membership.connect(user).setApprovalForAll(vault.address, true);

        await vault
          .connect(user)
          .deposit(stakingMembershipsUser1, tokenBalance);
      };

      return {
        owner,
        user1,
        user2,
        user3,
        token,
        iface,
        vault,
        membership,
        stake,
      };
    };
    return loadFixture(load);
  }

  describe("Deployment", async () => {
    it("should deploy", async () => {
      await deploy();
    });
  });
  describe("Collection", async () => {
    it("Deposit user1 5 Standard memberships", async () => {
      const { membership, user1, vault, token } = await deploy();
      const tokenBalance = await token.balanceOf(user1.address);
      const membershipsUser1 = await membership.getTokensByOwner(user1.address);
      const stakingMembershipsUser1 = membershipsUser1
        .filter((m) => m.toNumber() <= 10)
        .map((m) => m.toString());
      await token.connect(user1).approve(vault.address, tokenBalance);
      await membership.connect(user1).setApprovalForAll(vault.address, true);

      const deposit = () =>
        vault.connect(user1).deposit(stakingMembershipsUser1, tokenBalance);
      // expect(deposit).to.changeTokenBalance(token.address, vault, tokenBalance);
      await changeTokenBalances(
        deposit,
        token,
        [user1, vault],
        [BigNumber.from(tokenBalance).mul(-1), tokenBalance]
      );
      const contractMemberships = await membership.getTokensByOwner(
        vault.address
      );

      expect(contractMemberships.length).eqls(stakingMembershipsUser1.length);
    });
    it("Deposit user2 1 Gold membership", async () => {
      const { membership, user2, vault, token } = await deploy();
      const tokenBalance = await token.balanceOf(user2.address);
      const membershipsUser2 = await membership.getTokensByOwner(user2.address);
      const stakingMembershipsUser2 = membershipsUser2
        .filter((m) => m.toNumber() > 10)
        .map((m) => m.toString());
      await token.connect(user2).approve(vault.address, tokenBalance);
      await membership.connect(user2).setApprovalForAll(vault.address, true);

      const deposit = () =>
        vault.connect(user2).deposit(stakingMembershipsUser2, tokenBalance);
      await changeTokenBalances(
        deposit,
        token,
        [user2, vault],
        [BigNumber.from(tokenBalance).mul(-1), tokenBalance]
      );
      const contractMemberships = await membership.getTokensByOwner(
        vault.address
      );

      const totalMembershipShares = await vault.totalMembershipShares();
      const totalTokenShares = await vault.totalTokenShares();
      const expectedTotalMemberships = contractMemberships.reduce(
        (acc, curr) => {
          return acc.add(
            BigNumber.from(curr.toNumber() > 10 ? 5 : 1).mul(
              BigNumber.from(10).pow(18)
            )
          );
        },
        BigNumber.from("0")
      );

      expect(totalMembershipShares.toString()).equal(
        expectedTotalMemberships.toString()
      );
      expect(tokenBalance.toString()).equal(totalTokenShares.toString());
      expect(contractMemberships.length).equal(stakingMembershipsUser2.length);
    });
    it("Fail if no memberships", async () => {
      const { membership, user1, vault, token } = await deploy();
      const tokenBalance = await token.balanceOf(user1.address);

      await token.connect(user1).approve(vault.address, tokenBalance);
      await membership.connect(user1).setApprovalForAll(vault.address, true);

      const fail = vault.connect(user1).deposit([], tokenBalance);

      await expect(fail).to.revertedWith("not enough memberships");
    });
    it("Fail if token amount too small", async () => {
      const { membership, user1, vault, token } = await deploy();
      const tokenBalance = await token.balanceOf(user1.address);
      const membershipsUser1 = await membership.getTokensByOwner(user1.address);
      const stakingMembershipsUser1 = membershipsUser1
        .filter((m) => m.toNumber() <= 50)
        .map((m) => m.toString());
      await token.connect(user1).approve(vault.address, tokenBalance);
      await token.connect(user1).approve(vault.address, tokenBalance);
      await membership.connect(user1).setApprovalForAll(vault.address, true);

      const fail = vault
        .connect(user1)
        .deposit(stakingMembershipsUser1, BigNumber.from(10).pow(18).mul(3999));

      await expect(fail).to.revertedWith("not enough tokens");
    });
    it("Withdraw memberships and tokens", async () => {
      const { membership, user1, vault, token } = await deploy();
      const tokenBalance = await token.balanceOf(user1.address);
      const membershipsUser1 = await membership.getTokensByOwner(user1.address);
      const stakingMembershipsUser1 = membershipsUser1
        .filter((m) => m.toNumber() <= 50)
        .map((m) => m.toString());
      await token.connect(user1).approve(vault.address, tokenBalance);
      await membership.connect(user1).setApprovalForAll(vault.address, true);

      await vault.connect(user1).deposit(stakingMembershipsUser1, tokenBalance);

      const membershipsStaked = await vault.getMembershipsOf(user1.address);
      const actualOwner = await vault.membershipOwners(
        membershipsStaked[0].toString()
      );
      expect(actualOwner).equals(user1.address);
      await vault.updateRewards(1, {
        value: ONE_GWEI,
      });
      const withdraw = () => vault.connect(user1).withdraw();
      await changeTokenBalances(
        withdraw,
        token,
        [vault, user1],
        [BigNumber.from(tokenBalance).mul(-1), tokenBalance]
      );
      const memberships = await membership.getTokensByOwner(user1.address);
      const membershipsStakedAfter = await vault.getMembershipsOf(
        user1.address
      );
      const hasInvalidMemberships = membershipsStakedAfter.some((id) =>
        memberships.find((_id) => _id.toString() === id.toString())
      );
      if (hasInvalidMemberships) {
        throw new Error("Invalid memberships found in userInfo object");
      }

      const contractMemberships = await membership.getTokensByOwner(
        vault.address
      );
      const totalMembershipShares = await vault.totalMembershipShares();
      const totalTokenShares = await vault.totalTokenShares();
      const expectedTotalMemberships = contractMemberships.reduce(
        (acc, curr) => {
          return acc.add(
            BigNumber.from(curr.toNumber() > 10 ? 5 : 1).mul(
              BigNumber.from(10).pow(18)
            )
          );
        },
        BigNumber.from("0")
      );

      expect(totalMembershipShares.toString()).equal(
        expectedTotalMemberships.toString()
      );
      expect(totalTokenShares.toString()).equals("0");
      expect(memberships.length).equals(membershipsUser1.length);
      expect(membershipsStakedAfter.length).equals(0);
      const actualOwnerAfter = await vault.membershipOwners(
        membershipsStaked[0].toString()
      );
      expect(actualOwnerAfter).equals(ZERO_ADDRESS);
    });
    it("Withdraw part of memberships and tokens", async () => {
      const { membership, user1, vault, token } = await deploy();
      const tokenBalance = await token.balanceOf(user1.address);
      const membershipsUser1 = await membership.getTokensByOwner(user1.address);
      const stakingMembershipsUser1 = membershipsUser1
        .filter((m) => m.toNumber() <= 50)
        .map((m) => m.toString());
      await token.connect(user1).approve(vault.address, tokenBalance);
      await membership.connect(user1).setApprovalForAll(vault.address, true);

      const deposit = () =>
        vault.connect(user1).deposit(stakingMembershipsUser1, tokenBalance);
      // expect(deposit).to.changeTokenBalance(token.address, vault, tokenBalance);
      await changeTokenBalances(
        deposit,
        token,
        [user1, vault],
        [BigNumber.from(tokenBalance).mul(-1), tokenBalance]
      );
      await vault.updateRewards(1, {
        value: ONE_GWEI,
      });
      const membershipsStaked = await vault.getMembershipsOf(user1.address);

      const actualOwner = await vault.membershipOwners(
        membershipsStaked[0].toString()
      );
      expect(actualOwner).equals(user1.address);
      const withdrawBalance = BigNumber.from(tokenBalance).div(10);

      const membershipsToWithdraw = stakingMembershipsUser1.slice(0, 2);
      const withdraw = await vault
        .connect(user1)
        .withdrawPartial("0", membershipsToWithdraw);
      expect(withdraw).to.changeEtherBalance(user1, ONE_GWEI);
      const withdraw2 = () =>
        vault.connect(user1).withdrawPartial(withdrawBalance, []);
      await changeTokenBalances(
        withdraw2,
        token,
        [vault, user1],
        [BigNumber.from(withdrawBalance).mul(-1), withdrawBalance]
      );
      const memberships = await membership.getTokensByOwner(user1.address);

      const membershipsStakedAfter = await vault.getMembershipsOf(
        user1.address
      );
      const hasInvalidMemberships = membershipsStakedAfter.some((id) =>
        memberships.find((_id) => _id.toString() === id.toString())
      );
      if (hasInvalidMemberships) {
        throw new Error("Invalid memberships found in userInfo object");
      }
      const contractMemberships = await membership.getTokensByOwner(
        vault.address
      );
      const totalMembershipShares = await vault.totalMembershipShares();
      const totalTokenShares = await vault.totalTokenShares();
      const expectedTotalMemberships = contractMemberships.reduce(
        (acc, curr) => {
          return acc.add(
            BigNumber.from(curr.toNumber() > 10 ? 5 : 1).mul(
              BigNumber.from(10).pow(18)
            )
          );
        },
        BigNumber.from("0")
      );

      expect(totalMembershipShares.toString()).equal(
        expectedTotalMemberships.toString()
      );
      expect(totalTokenShares.toString()).equals(
        tokenBalance.sub(withdrawBalance).toString()
      );
      expect(memberships.length).equals(membershipsToWithdraw.length);
      expect(membershipsStakedAfter.length).equals(
        membershipsUser1.length - membershipsToWithdraw.length
      );
      const actualOwnerAfter = await vault.membershipOwners(
        membershipsStaked[0].toString()
      );
      expect(actualOwnerAfter).equals(ZERO_ADDRESS);
    });
    it("Throw partial withdraw if membership not owned by user", async () => {
      const { membership, user1, vault, token, user2 } = await deploy();
      const tokenBalance = await token.balanceOf(user1.address);
      const membershipsUser1 = await membership.getTokensByOwner(user1.address);
      const membershipsUser2 = await membership.getTokensByOwner(user2.address);
      const stakingMembershipsUser1 = membershipsUser1
        .filter((m) => m.toNumber() <= 50)
        .map((m) => m.toString());
      await token.connect(user1).approve(vault.address, tokenBalance);
      await membership.connect(user1).setApprovalForAll(vault.address, true);

      await vault.connect(user1).deposit(stakingMembershipsUser1, tokenBalance);

      const fail = vault
        .connect(user1)
        .withdrawPartial(0, [membershipsUser2[0]]);

      await expect(fail).to.revertedWith("value not found in array");
    });
    it("Throw if partial withdraw exceeds min amount", async () => {
      const { membership, user1, vault, token } = await deploy();
      const tokenBalance = await token.balanceOf(user1.address);
      const membershipsUser1 = await membership.getTokensByOwner(user1.address);
      const stakingMembershipsUser1 = membershipsUser1
        .filter((m) => m.toNumber() <= 50)
        .map((m) => m.toString());
      await token.connect(user1).approve(vault.address, tokenBalance);
      await membership.connect(user1).setApprovalForAll(vault.address, true);

      await vault.connect(user1).deposit(stakingMembershipsUser1, tokenBalance);

      const fail1 = vault
        .connect(user1)
        .withdrawPartial(tokenBalance, [stakingMembershipsUser1[0]]);
      const fail2 = vault
        .connect(user1)
        .withdrawPartial(0, stakingMembershipsUser1);

      await expect(fail1).to.revertedWith(
        "remaining tokens less then minimumTokenAmount"
      );
      await expect(fail2).to.revertedWith(
        "remaining memberships less then minimumMembershipAmount"
      );
    });
    it("Distribute funds", async () => {
      const { vault } = await deploy();
      await vault.updateRewards(10, {
        value: ONE_GWEI,
      });
      const balance = await web3.eth.getBalance(vault.address);
      expect(balance.toString()).equals(ONE_GWEI.toString());
    });
    it("Harvest", async () => {
      const { vault, user1, user2, stake } = await deploy();
      await stake(user1);
      await stake(user2, true);
      await vault.updateRewards(10, {
        value: ONE_GWEI,
      });
      mine(10);

      const tx = await vault.connect(user1).harvest();
      const tx2 = await vault.connect(user2).withdraw();

      const share = ((10_000 / (10_000 + 30_000)) * 2 + 5 / (5 + 5)) / 3;
      const share2 = ((30_000 / (10_000 + 30_000)) * 2 + 5 / (5 + 5)) / 3;

      const value = Math.floor(ONE_GWEI * share);
      const value2 = Math.floor(ONE_GWEI * share2);
      // const user1Shares = await vault.getUserShares(user1.address);

      // const totalTokens = (await vault.totalTokenShares()).div(
      //   BigNumber.from(10).pow(18)
      // );
      // const totalMemberships = BigNumber.from(
      //   await vault.totalMembershipShares()
      // ).div(BigNumber.from(10).pow(18));

      // console.log("user1", user1Shares);
      // console.log("user2", await vault.getUserShares(user2.address));
      // console.log("totalTokenShares", totalTokens);
      // console.log("totalMembershipShares", totalMemberships);

      await expect(tx).to.changeEtherBalances([vault, user1], [-value, value]);
      await expect(tx2).to.changeEtherBalances(
        [vault, user2],
        [-value2, value2]
      );
    });
  });
});
