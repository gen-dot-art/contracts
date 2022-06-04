const { expect } = require("chai");
const BigNumber = require("bignumber.js");
const fs = require("fs");
BigNumber.config({ EXPONENTIAL_AT: 9999 });
const { expectError } = require("../helpers");
const { expectEvent } = require("@openzeppelin/test-helpers");
const URI_1 = "https://localhost:8080/premium/";
const URI_2 = "https://localhost:8080/gold/";
const COLLECTION_URI = "https://localhost:8080/metadata/";
const COLLECTION_ID = "20000";
const STANDARD_SUPPLY = 1;
const GOLD_SUPPLY = 1;
const SCALE = new BigNumber(10).pow(18);
const NAME = "TEST";
const SYMBOL = "SYMB";
// const SCRIPT = fs.readFileSync("./tmp/terroir.html", { encoding: "utf-8" });
const SCRIPT = "test script"
const priceStandard = new BigNumber(0.1).times(SCALE);
const priceGold = new BigNumber(0.5).times(SCALE);
const MINT_PRICE = new BigNumber(0.2).times(SCALE);
const COLLECTION_SIZE = 3;
let artist;
let owner;
let user1;
let user2;
let user3;
let user4;
let stakingFundsAddress;
const zeroAddress = "0x0000000000000000000000000000000000000000";
let genartERC721Contract;
let genartPaymentSplitter;
let genartInterface;
let genartMembership;
let genartToken;

let payeesMint;
let sharesMint;
let payeesRoyalty;
let sharesRoyalty;

const GenArtERC721Contract = artifacts.require("GenArtERC721Script");
const GenArtMembership = artifacts.require("GenArt");
const GenArtInterface = artifacts.require("GenArtInterfaceV3");
const GenArtPaymentSplitter = artifacts.require("GenArtPaymentSplitterV2");
const GenArtToken = artifacts.require("GenArtGovToken");

contract("GenArtERC721Script", function (accounts) {
  before(async () => {
    const [_owner, _user1, _user2, _user3, _user4, _user5, _user6] = accounts;
    owner = _owner;
    user1 = _user1;
    user2 = _user2;
    user3 = _user3;
    user4 = _user6;
    artist = _user4;
    stakingFundsAddress = _user5;

    payeesMint = [owner, artist, stakingFundsAddress];
    sharesMint = [175, 700, 125];
    payeesRoyalty = [owner, artist];
    sharesRoyalty = [500, 500];

    genartMembership = await GenArtMembership.new(
      NAME,
      SYMBOL,
      URI_1,
      URI_2,
      10,
      {
        from: owner,
      }
    );
    await genartMembership.setPaused(false, {
      from: owner,
    });
    await genartMembership.mint(user1, {
      from: user1,
      value: priceStandard,
    });
    await genartMembership.mintGold(user1, {
      from: user1,
      value: priceGold,
    });
    await genartMembership.mint(user2, {
      from: user2,
      value: priceStandard,
    });
    await genartMembership.mintGold(user2, {
      from: user2,
      value: priceGold,
    });
    await genartMembership.mintGold(user2, {
      from: user2,
      value: priceGold,
    });
    await genartMembership.mintGold(user2, {
      from: user2,
      value: priceGold,
    });
    await genartMembership.mint(user3, {
      from: user3,
      value: priceStandard,
    });
    await genartMembership.mintGold(user3, {
      from: user3,
      value: priceGold,
    });

    genartInterface = await GenArtInterface.new(genartMembership.address, {
      from: owner,
    });

    genartToken = await GenArtToken.new(owner, {
      from: owner,
    });

    genartPaymentSplitter = await GenArtPaymentSplitter.new(
      genartToken.address,
      {
        from: owner,
      }
    );

    genartERC721Contract = await GenArtERC721Contract.new(
      NAME,
      SYMBOL,
      COLLECTION_URI,
      SCRIPT,
      COLLECTION_ID,
      STANDARD_SUPPLY,
      GOLD_SUPPLY,
      MINT_PRICE.toString(),
      COLLECTION_SIZE,
      [
        genartInterface.address,
        genartPaymentSplitter.address,
        genartToken.address,
      ]
    );

    await genartPaymentSplitter.addCollectionPayment(
      genartERC721Contract.address,
      payeesMint,
      sharesMint,
      { from: owner }
    );
    await genartPaymentSplitter.addCollectionPaymentRoyalty(
      genartERC721Contract.address,
      payeesRoyalty,
      sharesRoyalty,
      { from: owner }
    );
  });

  it("Should fail on paused mint and unpause", async () => {
    const tx = () => genartERC721Contract.mint(user1, 1);
    await expectError(tx, "minting is paused", "pausing mint is broken");
    await genartERC721Contract.setPaused(false, { from: owner });
  });
  it("Should mint owner reserved", async () => {
    const tx1 = await genartERC721Contract.mintReserved({ from: owner });
    expectEvent(tx1, "Mint", {
      to: owner,
      membershipId: "0",
      collectionId: "20000",
      tokenId: "2000000001",
    });
    const tx = () => genartERC721Contract.mintReserved({ from: owner });
    await expectError(tx, "already minted", "minting reserved is broken");
  });
  it("Should fail if not GEN.ART member", async () => {
    const tx = () =>
      genartERC721Contract.mint(user4, "1", {
        from: user4,
        value: MINT_PRICE,
      });
    const tx2 = () =>
      genartERC721Contract.mintOne(user4, "1", {
        from: user4,
        value: MINT_PRICE.times(2),
      });
    await expectError(tx, "no mints", "minting access broken");
    await expectError(tx2, "not membership owner", "minting access broken");
  });
  it("Should mint for standard GEN.ART member and split funds", async () => {
    const tx = await genartERC721Contract.mintOne(user1, "1", {
      from: user1,
      value: MINT_PRICE,
    });
    expectEvent(tx, "Mint", {
      to: user1,
      membershipId: "1",
      collectionId: "20000",
      tokenId: "2000000002",
    });
    const balanceArtist = await genartPaymentSplitter.getBalanceForAccount(
      artist
    );
    const balanceOwner = await genartPaymentSplitter.getBalanceForAccount(
      owner
    );
    const balanceStaking = await genartPaymentSplitter.getBalanceForAccount(
      stakingFundsAddress
    );
    expect(balanceOwner.toString()).equals(
      MINT_PRICE.times(sharesMint[0] / 1000).toString()
    );
    expect(balanceArtist.toString()).equals(
      MINT_PRICE.times(sharesMint[1] / 1000).toString()
    );
    expect(balanceStaking.toString()).equals(
      MINT_PRICE.times(sharesMint[2] / 1000).toString()
    );
  });
  it("Should fail on double mint", async () => {
    const tx = () =>
      genartERC721Contract.mintOne(user1, "1", {
        value: MINT_PRICE,
        from: user1,
      });
    await expectError(tx, "no mints available", "minting access broken");
  });
  it("Should fail if underpriced", async () => {
    const tx = () =>
      genartERC721Contract.mint(user3, "1", {
        from: user3,
        value: MINT_PRICE.minus(1e13),
      });
    const tx2 = () =>
      genartERC721Contract.mint(user2, "2", {
        from: user2,
        value: MINT_PRICE.times(2).minus(1e16),
      });
    await expectError(tx, "transaction underpriced", "minting pricing broken");
    await expectError(tx2, "transaction underpriced", "minting pricing broken");
  });
  it("Should mint for GEN.ART gold member", async () => {
    const tx = await genartERC721Contract.mintOne(user1, "11", {
      from: user1,
      value: MINT_PRICE,
    });
    expectEvent(tx, "Mint", {
      to: user1,
      membershipId: "11",
      collectionId: "20000",
      tokenId: "2000000003",
    });
    // await expectError(tx, "no mints available", "minting access broken");
  });

  it("Should fail on sell out", async () => {
    const tx = () =>
      genartERC721Contract.mintOne(user2, "14", {
        value: MINT_PRICE,
        from: user2,
      });
    await expectError(tx, "no mints available", "minting access broken");
  });

  it("Should get correct tokenUri", async () => {
    const tokens = await genartERC721Contract.getTokensByOwner(user1);
    const url = await genartERC721Contract.tokenURI.call(tokens[0]);
    expect(url.toString()).equals(`${COLLECTION_URI}${tokens[0]}`);
  });

  it("Should set new tokenUri", async () => {
    const tokens = await genartERC721Contract.getTokensByOwner(user1);

    await genartERC721Contract.setBaseURI("test-uri/", {
      from: owner,
    });
    const url = await genartERC721Contract.tokenURI.call(tokens[0]);
    expect(url.toString()).equals(`${"test-uri/"}${tokens[0]}`);
  });

  it("Should get total supply", async () => {
    const supply = await genartERC721Contract.totalSupply.call();
    expect(supply.toString()).equals(String(COLLECTION_SIZE));
  });

  it("Should get tokens of owner", async () => {
    const supply = await genartERC721Contract.getTokensByOwner.call(user1);
    expect(supply.length.toString()).equals(`2`);
  });

  it("Should release WETH", async () => {
    await genartToken.transfer(
      genartERC721Contract.address,
      MINT_PRICE.toString()
    );
    const balance = await genartToken.balanceOf(genartERC721Contract.address);
    expect(balance.toString()).equals(MINT_PRICE.toString());
    await genartERC721Contract.releaseWETHRoyalties();
    const balanceNew = await genartToken.balanceOf(
      genartERC721Contract.address
    );
    expect(balanceNew.toString()).equals("0");
  });
});
