const { expect } = require("chai");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 9999 });
const { expectError } = require("../helpers");
const { expectEvent } = require("@openzeppelin/test-helpers");
const SCALE = new BigNumber(10).pow(18);
const MINT_PRICE = new BigNumber(0.2).times(SCALE);
let artist;
let owner;
let user1;
let user2;
let collectionAddress;
let stakingFundsAddress;
// const zeroAddress = "0x0000000000000000000000000000000000000000";
let genartERC721Contract;
let genartPaymentSplitter;

let payeesMint;
let sharesMint;
let payeesRoyalty;
let sharesRoyalty;

const GenArtPaymentSplitter = artifacts.require("GenArtPaymentSplitter");

contract("GenArtPaymentSplitter", function (accounts) {
  before(async () => {
    const [_owner, _user1, _user2, _user3, _user4, _user5] = accounts;
    owner = _owner;
    user1 = _user1;
    user2 = _user2;
    collectionAddress = _user3;
    artist = _user4;
    stakingFundsAddress = _user5;

    payeesMint = [owner, artist, stakingFundsAddress];
    sharesMint = [175, 700, 125];
    payeesRoyalty = [owner, artist];
    sharesRoyalty = [250, 500];

    genartPaymentSplitter = await GenArtPaymentSplitter.new({
      from: owner,
    });

    await genartPaymentSplitter.addCollectionPayment(
      collectionAddress,
      payeesMint,
      sharesMint,
      { from: owner }
    );
    await genartPaymentSplitter.addCollectionPaymentRoyalty(
      collectionAddress,
      payeesRoyalty,
      sharesRoyalty,
      { from: owner }
    );
  });

  it("Should release funds from payment splitter", async () => {
    const sold = 5;
    const balanceOwnerOld = await web3.eth.getBalance(owner);
    const balanceArtistOld = await web3.eth.getBalance(artist);

    await genartPaymentSplitter.splitPayment(collectionAddress, {
      from: collectionAddress,
      value: MINT_PRICE.times(sold),
    });

    await genartPaymentSplitter.release(owner, {
      from: user1,
    });
    await genartPaymentSplitter.release(artist, {
      from: user1,
    });

    const balanceOwnerNew = await web3.eth.getBalance(owner);
    const balanceArtistNew = await web3.eth.getBalance(artist);
    const ownerShare = MINT_PRICE.times(sold).times(sharesMint[0] / 1000);
    const artistShare = MINT_PRICE.times(sold).times(sharesMint[1] / 1000);
    expect(balanceOwnerNew.toString()).equals(
      ownerShare.plus(balanceOwnerOld).minus(0).toString()
    );
    expect(balanceArtistNew.toString()).equals(
      artistShare.plus(balanceArtistOld).minus(0).toString()
    );
  });

  it("Should fail if no funds available for account", async () => {
    const tx = () =>
      genartPaymentSplitter.release(user1, {
        from: user1,
      });
    await expectError(tx, "no funds to release", "release funds broken");
  });

  it("Should split royalties", async () => {
    const royaltyValue = MINT_PRICE;

    await genartPaymentSplitter.splitPaymentRoyalty(collectionAddress, {
      from: owner,
      value: royaltyValue,
    });

    const balanceArtist = await genartPaymentSplitter.getBalanceForAccount(
      artist
    );
    const balanceOwner = await genartPaymentSplitter.getBalanceForAccount(
      owner
    );
    const ownerShare = royaltyValue.times(sharesRoyalty[0]).div(750);
    const artistShare = royaltyValue.times(sharesRoyalty[1]).div(750);
    expect(Math.floor(ownerShare.toNumber())).equals(
      Number(balanceOwner.toString())
    );
    expect(Math.floor(artistShare.toNumber())).equals(
      Number(balanceArtist.toString())
    );

    // release payment to accounts
    const balanceOwnerOld = await web3.eth.getBalance(owner);
    const balanceArtistOld = await web3.eth.getBalance(artist);

    await genartPaymentSplitter.release(owner, {
      from: user1,
    });
    await genartPaymentSplitter.release(artist, {
      from: user1,
    });

    const balanceOwnerNew = await web3.eth.getBalance(owner);
    const balanceArtistNew = await web3.eth.getBalance(artist);

    expect(Math.floor(ownerShare.plus(balanceOwnerOld).toNumber())).equals(
      Number(balanceOwnerNew.toString())
    );
    expect(Math.floor(artistShare.plus(balanceArtistOld).toNumber())).equals(
      Number(balanceArtistNew.toString())
    );
  });

  it("Should fail unauthorized account updates payee", async () => {
    const tx = () =>
      genartPaymentSplitter.updatePayee(collectionAddress, 0, 1, user1, {
        from: user1,
      });
    await expectError(tx, "sender is not current payee", "update payee broken");
  });

  it("Should update payee", async () => {
    await genartPaymentSplitter.updatePayee(collectionAddress, 0, 1, user1, {
      from: artist,
    });
  });
});
