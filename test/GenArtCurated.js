const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { web3, ethers } = require("hardhat");
const { BN } = require("@openzeppelin/test-helpers");
const { BigNumber } = require("ethers");

const ONE_GWEI = 1_000_000_000;
const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const priceStandard = BigNumber.from(1).mul(BigNumber.from(10).pow(17));
const priceGold = BigNumber.from(5).mul(BigNumber.from(10).pow(17));
describe("GenArtCurated", async function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, artistAccount, pool] =
      await ethers.getSigners();

    const GenArt = await ethers.getContractFactory("GenArt");

    const GenArtInterface = await ethers.getContractFactory(
      "GenArtInterfaceV3"
    );

    const GenArtFlashMinter = await ethers.getContractFactory(
      "GenArtFlashMinter"
    );
    // const EclipseProxy = await ethers.getContractFactory('EclipseProxy');
    const GenArtERC721V4 = await ethers.getContractFactory("GenArtERC721V4");
    const GenArtPaymentSplitterFactory = await ethers.getContractFactory(
      "GenArtPaymentSplitterFactory"
    );
    const GenArtPaymentSplitter = await ethers.getContractFactory(
      "GenArtPaymentSplitterV4"
    );
    const GenArtCollectionFactory = await ethers.getContractFactory(
      "GenArtCollectionFactory"
    );
    const GenArtCurated = await ethers.getContractFactory("GenArtCurated");
    const paymentSplitter = await GenArtPaymentSplitter.deploy();
    const paymentSplitterFactory = await GenArtPaymentSplitterFactory.deploy(
      paymentSplitter.address
    );
    const collectionFactory = await GenArtCollectionFactory.deploy("uri://");
    const genartMembership = await GenArt.deploy(
      "NAME",
      "SYMBOL",
      "URI_1",
      "URI_2",
      10
    );

    const genartInterface = await GenArtInterface.deploy(
      genartMembership.address
    );
    const curated = await GenArtCurated.deploy(
      collectionFactory.address,
      paymentSplitterFactory.address
    );

    const minter = await GenArtFlashMinter.deploy(
      genartInterface.address,
      curated.address,
      pool.address
    );
    const implementation = await GenArtERC721V4.deploy();

    await collectionFactory.addErc721Implementation(0, implementation.address);
    await collectionFactory.addMinter(0, minter.address);
    await collectionFactory.setAdminAccess(curated.address, true);
    await paymentSplitterFactory.setAdminAccess(curated.address, true);
    await minter.setAdminAccess(curated.address, true);

    await genartMembership.setPaused(false);
    await genartMembership.mint(owner.address, {
      value: priceStandard,
    });
    await genartMembership.mint(pool.address, {
      value: priceStandard,
    });
    await genartMembership.mintGold(owner.address, {
      value: priceGold,
    });

    return {
      curated,
      factory: collectionFactory,
      paymentSplitter,
      implementation,
      minter,
      owner,
      artistAccount,
      otherAccount,
      pool,
    };
  }

  async function init() {
    const name = "Coll";
    const symbol = "SYM";
    const maxSupply = 100;
    const erc721Index = 0;
    const pricingMode = 0;
    const deployment = await deploy();
    const { curated, owner, minter, artistAccount, factory } = deployment;
    await curated.createArtist(
      artistAccount.address,
      [owner.address, artistAccount.address],
      [owner.address, artistAccount.address],
      [500, 500],
      [500, 500]
    );
    const tx = await curated.createCollection(
      artistAccount.address,
      name,
      symbol,
      "",
      maxSupply,
      erc721Index,
      pricingMode
    );
    const artist = await curated.getArtist(artistAccount.address);
    const info = await curated.getCollectionInfo(artist.collections[0]);
    const startTime = (await time.latest()) + 60 * 60 * 10;
    await minter
      .connect(artistAccount)
      .setPricing(
        info.collection.contractAddress,
        startTime,
        ONE_GWEI,
        [1, 2, 0]
      );
    await time.increaseTo(startTime + 1000);
    await expect(tx).to.emit(factory, "Created");
    const GenArtErc721 = await ethers.getContractFactory("GenArtERC721V4");
    const collection = await GenArtErc721.attach(
      info.collection.contractAddress
    );
    return Object.assign(deployment, { artist, info, collection });
  }
  describe("Deployment", async () => {
    it("should deploy", async () => {
      await deploy();
    });
  });
  describe("Collection", async () => {
    it("should create artist and collection", async () => {
      await init();
    });
    it("should allow only minter", async () => {
      const { collection, owner } = await init();

      const shouldFailMint = collection.mint(owner.address, "1");
      await expect(shouldFailMint).to.revertedWith("only minter allowed");
    });
    it("should mint reserved", async () => {
      const { collection } = await init();

      const mint = await collection.mintReserved();
      await expect(mint).to.emit(collection, "Mint");
    });
    it("should mint one", async () => {
      const { minter, info, collection } = await init();

      // console.log("a", artist);

      const mint = await minter.mintOne(info.collection.contractAddress, "1", {
        value: ONE_GWEI,
      });

      await expect(mint).to.emit(collection, "Mint");

      const mintGold = await minter.mintOne(
        info.collection.contractAddress,
        "11",
        {
          value: ONE_GWEI,
        }
      );
      await expect(mintGold).to.emit(collection, "Mint");

      // console.log("name", await collection.name());
    });
    it("should mint using flash loan", async () => {
      const { minter, info, collection, pool } = await init();

      // console.log("a", artist);

      const poolBalanceOld = await web3.eth.getBalance(pool.address);
      const mint = await minter.mintFlash(info.collection.contractAddress, {
        value: ONE_GWEI * 1.2,
      });

      await expect(mint).to.emit(collection, "Mint");
      const mintFail = minter.mintFlash(info.collection.contractAddress, {
        value: BigNumber.from(ONE_GWEI).mul(120).div(100),
      });

      const poolBalanceNew = await web3.eth.getBalance(pool.address);
      const expectedBalance = BigNumber.from(poolBalanceOld)
        .add(ONE_GWEI * 1.2 - ONE_GWEI)
        .toString();

      expect(poolBalanceNew).to.equal(expectedBalance);
      expect(mintFail).to.revertedWith("no memberships available");
      // console.log("name", await collection.name());
    });
    it("should mint many", async () => {
      const { minter, info, collection } = await init();

      // console.log("a", artist);

      const mint = await minter.mint(info.collection.contractAddress, "2", {
        value: ONE_GWEI * 2,
      });

      await expect(mint).to.emit(collection, "Mint");

      // console.log("name", await collection.name());
    });
    it("should fail on mint without membership", async () => {
      const { info, artistAccount, minter } = await init();

      const shouldFailMint = minter
        .connect(artistAccount)
        .mintOne(info.collection.contractAddress, "11", {
          value: ONE_GWEI,
        });
      const shouldFailMint2 = minter
        .connect(artistAccount)
        .mintOne(info.collection.contractAddress, "0", {
          value: ONE_GWEI,
        });

      await expect(shouldFailMint).to.revertedWith(
        "sender must be owner of membership"
      );
      await expect(shouldFailMint2).to.revertedWith(
        "owner query for nonexistent token"
      );
    });
    it("should fail on mint wrong amount", async () => {
      const { info, minter, collection } = await init();

      const shouldFailMint = minter.mint(
        info.collection.contractAddress,
        "11",
        {
          value: 1000,
        }
      );
      const shouldFailMint2 = minter.mint(
        info.collection.contractAddress,
        "2",
        {
          value: ONE_GWEI,
        }
      );

      const mintGold = minter.mintOne(info.collection.contractAddress, "11", {
        value: ONE_GWEI,
      });

      await expect(shouldFailMint).to.revertedWith("wrong amount sent");
      await expect(shouldFailMint2).to.revertedWith("wrong amount sent");
      await expect(mintGold).to.emit(collection, "Mint");
    });
  });
  describe("PaymentSplitter", async () => {
    it("should split payment", async () => {
      const { artist, otherAccount, artistAccount, owner } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV4"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        artist.paymentSplitter
      );
      await paymentSplitter.setAdminAccess(otherAccount.address, true);
      const ownerBalanceOld = await web3.eth.getBalance(owner.address);
      const artistBalanceOld = await web3.eth.getBalance(artistAccount.address);
      await paymentSplitter
        .connect(otherAccount)
        .splitPayment({ value: ONE_GWEI });
      await paymentSplitter
        .connect(otherAccount)
        .release(artistAccount.address);
      await paymentSplitter.connect(otherAccount).release(owner.address);
      const artistBalanceNew = await web3.eth.getBalance(artistAccount.address);
      const ownerBalanceNew = await web3.eth.getBalance(owner.address);
      expect(artistBalanceNew.toString()).to.equal(
        BigNumber.from(artistBalanceOld).add(ONE_GWEI / 2)
      );
      expect(ownerBalanceNew.toString()).to.equal(
        BigNumber.from(ownerBalanceOld).add(ONE_GWEI / 2)
      );
    });
  });
});
