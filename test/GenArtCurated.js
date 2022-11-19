const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { web3, ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const ONE_GWEI = 1_000_000_000;

const priceStandard = BigNumber.from(1).mul(BigNumber.from(10).pow(17));
const priceGold = BigNumber.from(5).mul(BigNumber.from(10).pow(17));
describe("GenArtCurated", async function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, artistAccount, pool, other2] =
      await ethers.getSigners();

    const GenArt = await ethers.getContractFactory("GenArt");

    const GenArtInterface = await ethers.getContractFactory(
      "GenArtInterfaceV3"
    );

    const GenArtFlashMinter = await ethers.getContractFactory(
      "GenArtFlashMinter"
    );
    const GenArtMinter = await ethers.getContractFactory("GenArtMinter");
    const GenArtWhitelistMinter = await ethers.getContractFactory(
      "GenArtWhitelistMinter"
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
    const GenArtMintAllocator = await ethers.getContractFactory(
      "GenArtMintAllocator"
    );
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
    const mintAlloc = await GenArtMintAllocator.deploy(genartInterface.address);
    const curated = await GenArtCurated.deploy(
      collectionFactory.address,
      paymentSplitterFactory.address
    );

    const minter = await GenArtMinter.deploy(
      genartInterface.address,
      curated.address
    );
    const whitelistMinter = await GenArtWhitelistMinter.deploy(
      genartInterface.address,
      curated.address,
      pool.address
    );
    const flashMinter = await GenArtFlashMinter.deploy(
      genartInterface.address,
      curated.address,
      pool.address,
      pool.address
    );
    const implementation = await GenArtERC721V4.deploy();

    await collectionFactory.addErc721Implementation(0, implementation.address);
    await collectionFactory.addMinter(0, minter.address);
    await collectionFactory.setAdminAccess(curated.address, true);
    await mintAlloc.setAdminAccess(minter.address, true);
    await mintAlloc.setAdminAccess(flashMinter.address, true);
    await paymentSplitterFactory.setAdminAccess(curated.address, true);
    await minter.setAdminAccess(curated.address, true);
    await flashMinter.setAdminAccess(curated.address, true);
    await whitelistMinter.setAdminAccess(curated.address, true);

    await genartMembership.setPaused(false);
    await genartMembership.mint(owner.address, {
      value: priceStandard,
    });
    await genartMembership.mintMany(other2.address, "3", {
      value: priceStandard.mul(3),
    });
    await genartMembership.mint(pool.address, {
      value: priceStandard,
    });
    await genartMembership.mintGold(owner.address, {
      value: priceGold,
    });
    await genartMembership.mintGold(other2.address, {
      value: priceGold,
    });

    return {
      curated,
      factory: collectionFactory,
      whitelistMinter,
      paymentSplitter,
      implementation,
      minter,
      mintAlloc,
      flashMinter,
      owner,
      artistAccount,
      otherAccount,
      pool,
      other2,
    };
  }

  async function createCollection(
    curated,
    factory,
    minter,
    mintAlloc,
    artistAccount,
    maxSupply = 100,
    index = 0
  ) {
    const name = "Coll";
    const symbol = "SYM";
    const erc721Index = 0;
    const pricingMode = 0;
    const tx = await curated.createCollection(
      artistAccount.address,
      name,
      symbol,
      "test",
      true,
      maxSupply,
      erc721Index,
      pricingMode
    );
    const artist = await curated.getArtist(artistAccount.address);
    const info = await curated.getCollectionInfo(artist.collections[index]);
    const startTime = (await time.latest()) + 60 * 60 * 10;
    try {
      await minter
        .connect(artistAccount)
        .setPricing(
          info.collection.contractAddress,
          startTime,
          ONE_GWEI,
          mintAlloc.address,
          [1, 2, 0]
        );
    } catch (err) {
      console.log(err);
      throw err;
    }

    await expect(tx).to.emit(factory, "Created");

    return { info, startTime, artist };
  }
  async function init() {
    const deployment = await deploy();
    const {
      curated,
      owner,
      minter,
      artistAccount,
      factory,
      mintAlloc,
      flashMinter,
      otherAccount,
      whitelistMinter,
    } = deployment;
    await curated.createArtist(
      artistAccount.address,
      [owner.address, artistAccount.address],
      [owner.address, artistAccount.address],
      [500, 500],
      [500, 500]
    );
    const { info, startTime, artist } = await createCollection(
      curated,
      factory,
      minter,
      mintAlloc,
      artistAccount,
      100
    );
    await flashMinter.setPricing(
      info.collection.contractAddress,
      startTime,
      ONE_GWEI,
      mintAlloc.address
    );
    await whitelistMinter.setPricing(
      info.collection.contractAddress,
      startTime,
      ONE_GWEI,
      [otherAccount.address]
    );
    await time.increaseTo(startTime + 1000);
    const GenArtErc721 = await ethers.getContractFactory("GenArtERC721V4");
    const collection = await GenArtErc721.attach(
      info.collection.contractAddress
    );

    await collection.setMinter(flashMinter.address, true, false);
    await collection.setMinter(whitelistMinter.address, true, false);
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
    it("should fail calling initializer on collection", async () => {
      const { collection, owner } = await init();

      const fail = collection.initialize(
        "name",
        "symb",
        "scrpit",
        1,
        1,
        owner.address,
        owner.address,
        owner.address,
        owner.address
      );

      await expect(fail).to.revertedWith(
        "Initializable: contract is already initialized"
      );
    });
    it("should update script", async () => {
      const { curated, artistAccount, collection, otherAccount, artist } =
        await init();

      await curated
        .connect(artistAccount)
        .updateScript(collection.address, "artist");
      const info = await curated.getCollectionInfo(artist.collections[0]);
      expect(info.collection.script).to.equal("artist");
      await curated.updateScript(collection.address, "admin");
      const fail = curated
        .connect(otherAccount)
        .updateScript(collection.address, "fail");
      const info2 = await curated.getCollectionInfo(artist.collections[0]);
      expect(info2.collection.script).to.equal("admin");
      await expect(fail).to.revertedWith("not allowed");
    });
    it("should only allow minter", async () => {
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
    it("should mint many", async () => {
      const { minter, info, collection, other2 } = await init();

      // console.log("a", artist);
      const mint = await minter
        .connect(other2)
        .mintOne(info.collection.contractAddress, "2", {
          value: ONE_GWEI,
        });

      await minter.connect(other2).mint(info.collection.contractAddress, "4", {
        value: BigNumber.from(ONE_GWEI).mul(4),
      });

      const mintOneFail = minter
        .connect(other2)
        .mintOne(info.collection.contractAddress, "3", {
          value: ONE_GWEI,
        });

      const mintManyFail = minter
        .connect(other2)
        .mint(info.collection.contractAddress, "1", {
          value: BigNumber.from(ONE_GWEI).mul(1),
        });

      await expect(mintOneFail).to.revertedWith("no mints available");
      await expect(mintManyFail).to.revertedWith("no mints available");

      await expect(mint).to.emit(collection, "Mint");

      // console.log("name", await collection.name());
    });
    it("should mint using flash loan", async () => {
      const { flashMinter, info, collection, pool } = await init();

      // console.log("a", artist);

      const fee = 200;

      await flashMinter.setMembershipLendingFee(fee);

      const poolBalanceOld = await web3.eth.getBalance(pool.address);
      const price = ONE_GWEI * (1 + fee / 1000);
      const mint = await flashMinter.mintOne(
        info.collection.contractAddress,
        "0",
        {
          value: price,
        }
      );
      await flashMinter.withdraw();

      await expect(mint).to.emit(collection, "Mint");
      const mintFail = flashMinter.mint(info.collection.contractAddress, {
        value: BigNumber.from(ONE_GWEI),
      });

      const poolBalanceNew = await web3.eth.getBalance(pool.address);
      const expectedBalance = BigNumber.from(poolBalanceOld)
        .add(price - ONE_GWEI)
        .toString();

      expect(poolBalanceNew).to.equal(expectedBalance);
      expect(mintFail).to.revertedWith("no memberships available");
    });
    it("should mint using whitelist", async () => {
      const { whitelistMinter, info, collection, pool, otherAccount } =
        await init();

      // console.log("a", artist);

      const fee = 200;

      await whitelistMinter.setWhitelistFee(fee);

      const poolBalanceOld = await web3.eth.getBalance(pool.address);
      const price = ONE_GWEI * (1 + fee / 1000);
      const mint = await whitelistMinter
        .connect(otherAccount)
        .mintOne(info.collection.contractAddress, "0", {
          value: price,
        });
      await whitelistMinter.withdraw();

      await expect(mint).to.emit(collection, "Mint");
      const mintFail = whitelistMinter
        .connect(otherAccount)
        .mint(info.collection.contractAddress, {
          value: price,
        });

      const poolBalanceNew = await web3.eth.getBalance(pool.address);
      const expectedBalance = BigNumber.from(poolBalanceOld)
        .add(price - ONE_GWEI)
        .toString();

      expect(poolBalanceNew).to.equal(expectedBalance);
      expect(mintFail).to.revertedWith("no mints available");
    });
    it("should fail on mint sell out", async () => {
      const { minter, other2, factory, mintAlloc, curated, artistAccount } =
        await init();
      const { info, startTime } = await createCollection(
        curated,
        factory,
        minter,
        mintAlloc,
        artistAccount,
        3,
        1
      );
      await time.increaseTo(startTime + 1000);

      await minter.connect(other2).mint(info.collection.contractAddress, "3", {
        value: BigNumber.from(ONE_GWEI).mul(3),
      });

      const mintOneFail = minter
        .connect(other2)
        .mintOne(info.collection.contractAddress, "3", {
          value: ONE_GWEI,
        });

      const mintManyFail = minter
        .connect(other2)
        .mint(info.collection.contractAddress, "1", {
          value: BigNumber.from(ONE_GWEI).mul(1),
        });

      await expect(mintOneFail).to.revertedWith("no mints available");
      await expect(mintManyFail).to.revertedWith("no mints available");

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
    it("should split payment eth", async () => {
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
    it("should split payment token", async () => {
      const { artist, otherAccount, artistAccount, owner } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV4"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        artist.paymentSplitter
      );
      const tokens = "100000000";
      const GenArtGovToken = await ethers.getContractFactory("GenArtGovToken");
      const token = await GenArtGovToken.deploy(otherAccount.address);
      await token
        .connect(otherAccount)
        .transfer(paymentSplitter.address, tokens);

      await paymentSplitter.releaseTokens(token.address);

      const balanceArtist = await token.balanceOf(artistAccount.address);

      const balanceOwner = await token.balanceOf(owner.address);

      expect(balanceOwner).equals(BigNumber.from(tokens).div(2));
      expect(balanceOwner).equals(balanceArtist);
    });
    it("should fail calling initializer on payment splitter", async () => {
      const { artist, otherAccount, owner } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV4"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        artist.paymentSplitter
      );
      const fail = paymentSplitter.initialize(
        otherAccount.address,
        [owner.address],
        [owner.address],
        [1000],
        [1000]
      );

      await expect(fail).to.revertedWith(
        "Initializable: contract is already initialized"
      );
    });
    it("should fail if no funds available for account", async () => {
      const { artist, otherAccount } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV4"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        artist.paymentSplitter
      );
      const fail = paymentSplitter
        .connect(otherAccount)
        .release(otherAccount.address);

      await expect(fail).to.revertedWith("no funds to release");
    });
    it("should fail if unauthorized account updates payee", async () => {
      const { artist, otherAccount } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV4"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        artist.paymentSplitter
      );
      const fail = paymentSplitter
        .connect(otherAccount)
        .updatePayee(0, 1, otherAccount.address);
      const fail2 = paymentSplitter
        .connect(otherAccount)
        .updatePayee(1, 1, otherAccount.address);

      await expect(fail).to.revertedWith("sender is not current payee");
      await expect(fail2).to.revertedWith("sender is not current payee");
    });
    it("should update payee", async () => {
      const { artist, otherAccount, artistAccount } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV4"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        artist.paymentSplitter
      );
      await paymentSplitter
        .connect(artistAccount)
        .updatePayee(0, 1, otherAccount.address);

      const artistBalanceOld = await web3.eth.getBalance(otherAccount.address);

      await paymentSplitter.splitPayment({ value: ONE_GWEI });

      await paymentSplitter
        .connect(artistAccount)
        .release(otherAccount.address);

      const artistBalanceNew = await web3.eth.getBalance(otherAccount.address);
      expect(artistBalanceNew.toString()).to.equal(
        BigNumber.from(artistBalanceOld).add(ONE_GWEI / 2)
      );
    });
  });
});
