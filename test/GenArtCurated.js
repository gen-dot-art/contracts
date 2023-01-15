const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { web3, ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { changeTokenBalances } = require("../helpers");

const ONE_GWEI = 1000;

const priceStandard = BigNumber.from(1).mul(BigNumber.from(10).pow(17));
const priceGold = BigNumber.from(5).mul(BigNumber.from(10).pow(17));
describe("GenArtCurated", async function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, artistAccount, pool, other2, user3] =
      await ethers.getSigners();

    const GenArt = await ethers.getContractFactory("GenArt");

    const GenArtInterface = await ethers.getContractFactory(
      "GenArtInterfaceV4"
    );

    const GenArtFlashMinter = await ethers.getContractFactory(
      "GenArtFlashMinter"
    );
    const GenArtMinter = await ethers.getContractFactory("GenArtMinter");
    const GenArtMinterLoyalty = await ethers.getContractFactory(
      "GenArtMinterLoyalty"
    );
    const GenArtWhitelistMinter = await ethers.getContractFactory(
      "GenArtWhitelistMinter"
    );
    // const EclipseProxy = await ethers.getContractFactory('EclipseProxy');
    const GenArtERC721V4 = await ethers.getContractFactory("GenArtERC721V4");
    const GenArtStorage = await ethers.getContractFactory("GenArtStorage");
    const GenArtPaymentSplitterFactory = await ethers.getContractFactory(
      "GenArtPaymentSplitterFactory"
    );
    const GenArtPaymentSplitter = await ethers.getContractFactory(
      "GenArtPaymentSplitterV5"
    );
    const GenArtPaymentSplitterV5 = await ethers.getContractFactory(
      "GenArtPaymentSplitterV5"
    );
    const GenArtCollectionFactory = await ethers.getContractFactory(
      "GenArtCollectionFactory"
    );
    const GenArtCurated = await ethers.getContractFactory("GenArtCurated");
    const GenArtMintAllocator = await ethers.getContractFactory(
      "GenArtMintAllocator"
    );
    const paymentSplitter = await GenArtPaymentSplitter.deploy();
    const paymentSplitterV5 = await GenArtPaymentSplitterV5.deploy();
    const paymentSplitterFactory = await GenArtPaymentSplitterFactory.deploy(
      paymentSplitterV5.address
    );
    const collectionFactory = await GenArtCollectionFactory.deploy("uri://");
    const genartMembership = await GenArt.deploy(
      "NAME",
      "SYMBOL",
      "URI_1",
      "URI_2",
      10
    );

    const GenArtLoyaltyVault = await ethers.getContractFactory(
      "GenArtLoyaltyVault"
    );

    const GenArtGovToken = await ethers.getContractFactory("GenArtGovToken");
    const token = await GenArtGovToken.deploy(owner.address);
    const storage = await GenArtStorage.deploy();
    const genartInterface = await GenArtInterface.deploy(
      genartMembership.address
    );
    const vault = await GenArtLoyaltyVault.deploy(
      genartMembership.address,
      token.address,
      genartInterface.address
    );
    await genartInterface.setLoyaltyVault(vault.address);

    const mintAlloc = await GenArtMintAllocator.deploy(genartInterface.address);
    const curated = await GenArtCurated.deploy(
      collectionFactory.address,
      paymentSplitterFactory.address,
      storage.address
    );
    const minterLoyalty = await GenArtMinterLoyalty.deploy(
      genartInterface.address,
      curated.address,
      vault.address
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
    await collectionFactory.setAdminAccess(curated.address, true);
    await curated.addMinter(0, minter.address);
    await curated.addMinter(1, minterLoyalty.address);
    await storage.setAdminAccess(curated.address, true);
    await mintAlloc.setAdminAccess(minter.address, true);
    await mintAlloc.setAdminAccess(flashMinter.address, true);
    await mintAlloc.setAdminAccess(minterLoyalty.address, true);
    await paymentSplitterFactory.setAdminAccess(curated.address, true);
    await minter.setAdminAccess(curated.address, true);
    await flashMinter.setAdminAccess(curated.address, true);
    await whitelistMinter.setAdminAccess(curated.address, true);
    await minterLoyalty.setAdminAccess(curated.address, true);
    await vault.setAdminAccess(minterLoyalty.address, true);

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
    await genartMembership.mint(user3.address, {
      value: priceStandard,
    });
    await genartMembership.mintGold(owner.address, {
      value: priceGold,
    });
    await genartMembership.mintGold(other2.address, {
      value: priceGold,
    });

    await token.transfer(
      other2.address,
      BigNumber.from(10).pow(18).mul(10_000)
    );
    await token.transfer(user3.address, BigNumber.from(10).pow(18).mul(10_000));

    return {
      curated,
      factory: collectionFactory,
      minterLoyalty,
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
      vault,
      storage,
      token,
      genartMembership,
      genartInterface,
      user3,
    };
  }

  async function createCollection(
    curated,
    store,
    factory,
    mintAllocContract,
    owner,
    artistAccount,
    maxSupply = 100,
    index = 0,
    minterIndex = 0
  ) {
    const name = "Coll";
    const symbol = "SYM";
    const erc721Index = 0;
    const pricingMode = minterIndex;
    const paymentSplitterIndex = 0;
    const startTime = (await time.latest()) + 60 * 60 * 10;

    const pricingData = ethers.utils.defaultAbiCoder.encode(
      [
        {
          components: [
            {
              internalType: "uint256",
              name: "startTime",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "price",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "mintAllocContract",
              type: "address",
            },
            {
              internalType: "uint8[3]",
              name: "mintAlloc",
              type: "uint8[3]",
            },
          ],
          name: "params",
          type: "tuple",
        },
      ],
      [
        {
          artist: artistAccount.address,
          startTime,
          price: ONE_GWEI,
          mintAllocContract: mintAllocContract.address,
          mintAlloc: [1, 1, 0],
        },
      ]
    );

    const calldata = curated.interface.encodeFunctionData("createCollection", [
      {
        artist: artistAccount.address,
        name: name,
        symbol: symbol,
        script: "test",
        collectionType: 0,
        maxSupply: maxSupply,
        erc721Index: erc721Index,
        pricingMode: pricingMode,
        pricingData: pricingData,
        paymentSplitterIndex,
        payeesMint: [owner.address, artistAccount.address],
        payeesRoyalties: [owner.address, artistAccount.address],
        sharesMint: [500, 500],
        sharesRoyalties: [500, 500],
      },
    ]);
    const tx = await owner.sendTransaction({
      to: curated.address,
      data: calldata,
    });
    const artist = await store.getArtist(artistAccount.address);
    const info = await curated.getCollectionInfo(artist.collections[index]);

    await expect(tx).to.emit(factory, "Created");

    return { info, startTime, artist };
  }
  async function init() {
    const deployment = await deploy();
    const {
      curated,
      owner,
      artistAccount,
      factory,
      mintAlloc,
      flashMinter,
      otherAccount,
      whitelistMinter,
      storage,
    } = deployment;

    const { info, startTime, artist } = await createCollection(
      curated,
      storage,
      factory,
      mintAlloc,
      owner,
      artistAccount,
      100
    );
    await flashMinter["setPricing(address,uint256,uint256,address)"](
      info.collection.contractAddress,
      startTime,
      ONE_GWEI,
      mintAlloc.address
    );
    await whitelistMinter[
      "setPricing(address,uint256,uint256,address,address[])"
    ](info.collection.contractAddress, startTime, ONE_GWEI, mintAlloc.address, [
      otherAccount.address,
    ]);
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
      const {
        curated,
        artistAccount,
        collection,
        otherAccount,
        artist,
        storage,
      } = await init();

      await storage
        .connect(artistAccount)
        .updateScript(collection.address, "artist");
      const info = await curated.getCollectionInfo(artist.collections[0]);
      expect(info.collection.script).to.equal("artist");
      await storage.updateScript(collection.address, "admin");
      const fail = storage
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
      const {
        minter,
        owner,
        storage,
        other2,
        factory,
        mintAlloc,
        curated,
        artistAccount,
      } = await init();
      const { info, startTime } = await createCollection(
        curated,
        storage,
        factory,
        mintAlloc,
        owner,
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
      const { otherAccount, artistAccount, owner, info } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV5"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        info.collection.paymentSplitter
      );
      await paymentSplitter.setAdminAccess(otherAccount.address, true);
      await paymentSplitter
        .connect(otherAccount)
        .splitPayment(ONE_GWEI, { value: ONE_GWEI });
      const artistRelease = await paymentSplitter
        .connect(otherAccount)
        .release(artistAccount.address);
      const ownerRelease = await paymentSplitter
        .connect(otherAccount)
        .release(owner.address);

      await expect(ownerRelease).to.changeEtherBalance(owner, ONE_GWEI / 2);
      await expect(artistRelease).to.changeEtherBalance(
        artistAccount,
        ONE_GWEI / 2
      );
    });
    it("should split payment token", async () => {
      const { info, otherAccount, artistAccount, owner } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV5"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        info.collection.paymentSplitter
      );

      const GenArtGovToken = await ethers.getContractFactory("GenArtGovToken");
      const token = await GenArtGovToken.deploy(otherAccount.address);
      await token
        .connect(otherAccount)
        .transfer(paymentSplitter.address, ONE_GWEI);

      const release = () => paymentSplitter.releaseTokens(token.address);

      await changeTokenBalances(
        release,
        token,
        [artistAccount, owner],
        [ONE_GWEI / 2, ONE_GWEI / 2]
      );
    });
    it("should fail calling initializer on payment splitter", async () => {
      const { info, otherAccount, owner } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV5"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        info.collection.paymentSplitter
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
      const { info, otherAccount } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV5"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        info.collection.paymentSplitter
      );
      const fail = paymentSplitter
        .connect(otherAccount)
        .release(otherAccount.address);

      await expect(fail).to.revertedWith("no funds to release");
    });
    it("should fail if unauthorized account updates payee", async () => {
      const { info, otherAccount } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV5"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        info.collection.paymentSplitter
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
      const { info, otherAccount, artistAccount } = await init();

      const GenArtPaymentSplitter = await ethers.getContractFactory(
        "GenArtPaymentSplitterV5"
      );
      const paymentSplitter = await GenArtPaymentSplitter.attach(
        info.collection.paymentSplitter
      );
      await paymentSplitter
        .connect(artistAccount)
        .updatePayee(0, 1, otherAccount.address);

      await paymentSplitter.splitPayment(ONE_GWEI, { value: ONE_GWEI });

      const release = await paymentSplitter
        .connect(artistAccount)
        .release(otherAccount.address);

      await expect(release).to.changeEtherBalance(otherAccount, ONE_GWEI / 2);
    });
  });
  describe("Loyalty", async () => {
    it("should receive loyalty refund and lock assets", async () => {
      const {
        other2,
        factory,
        mintAlloc,
        curated,
        artistAccount,
        token,
        vault,
        genartMembership,
        minterLoyalty,
        user3,
        storage,
        owner,
      } = await init();
      const tokenBalance = await token.balanceOf(other2.address);
      const tokenBalance2 = await token.balanceOf(user3.address);
      const membershipsUser1 = await genartMembership.getTokensByOwner(
        other2.address
      );
      const membershipsUser2 = await genartMembership.getTokensByOwner(
        user3.address
      );
      const stakingMembershipsUser1 = membershipsUser1
        .filter((m) => m.toNumber() <= 10)
        .map((m) => m.toString());
      stakingMembershipsUser1.pop();
      await token.connect(other2).approve(vault.address, tokenBalance);
      await genartMembership
        .connect(other2)
        .setApprovalForAll(vault.address, true);
      await token.connect(user3).approve(vault.address, tokenBalance2);
      await genartMembership
        .connect(user3)
        .setApprovalForAll(vault.address, true);

      await vault
        .connect(other2)
        .deposit(stakingMembershipsUser1, tokenBalance);
      await vault.connect(user3).deposit(membershipsUser2, tokenBalance2);
      const { info, startTime } = await createCollection(
        curated,
        storage,
        factory,
        mintAlloc,
        owner,
        artistAccount,
        4,
        1,
        1
      );
      await time.increaseTo(startTime + 1000);

      const tx = await minterLoyalty
        .connect(other2)
        .mint(info.collection.contractAddress, "3", {
          value: BigNumber.from(ONE_GWEI).mul(3),
        });

      await expect(tx).to.changeEtherBalances(
        [other2, minterLoyalty],
        [
          -BigNumber.from(ONE_GWEI).add(
            BigNumber.from(ONE_GWEI).mul(2).mul(875).div(1000)
          ),
          BigNumber.from(ONE_GWEI).mul(1).mul(125).div(1000),
        ]
      );

      const withdrawPart = vault
        .connect(other2)
        .withdrawPartial(0, [stakingMembershipsUser1[0]]);
      const withdraw = vault.connect(other2).withdraw();
      await expect(withdrawPart).to.revertedWith("assets locked");
      await expect(withdraw).to.revertedWith("assets locked");

      await time.increaseTo(startTime + 1000 + 60 * 60 * 24 * 5);
      const tx2 = await minterLoyalty
        .connect(user3)
        .mintOne(info.collection.contractAddress, membershipsUser2[0], {
          value: BigNumber.from(ONE_GWEI).mul(1),
        });
      await expect(tx2).to.changeEtherBalances(
        [user3, minterLoyalty],
        [
          -BigNumber.from(ONE_GWEI),
          BigNumber.from(ONE_GWEI).mul(1).mul(125).div(1000),
        ]
      );
      await vault
        .connect(other2)
        .withdrawPartial(0, [stakingMembershipsUser1[0]]);
      await vault.connect(other2).withdraw();
    });
    it("should distribute funds and fail on delayed", async () => {
      const { minterLoyalty, owner, vault } = await init();
      await owner.sendTransaction({
        value: ONE_GWEI,
        to: minterLoyalty.address,
      });
      const tx = await minterLoyalty.distributeLoyalties();
      await expect(tx).to.changeEtherBalances(
        [vault],
        [BigNumber.from(ONE_GWEI)]
      );

      await owner.sendTransaction({
        value: ONE_GWEI,
        to: minterLoyalty.address,
      });
      const fail = minterLoyalty.distributeLoyalties();
      await expect(fail).to.revertedWith("distribution delayed");
      await mine(260 * 24 * 14);
      await minterLoyalty.distributeLoyalties();
    });
  });
});
