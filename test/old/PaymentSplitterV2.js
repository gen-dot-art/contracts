const { expect } = require("chai");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 9999 });
const { expectError } = require("../../helpers");
const { expectEvent } = require("@openzeppelin/test-helpers");
const SCALE = new BigNumber(10).pow(18);
const MINT_PRICE = new BigNumber(1).times(SCALE);
let artist;
let owner;
let user1;
let user2;
let collectionAddress;
let stakingFundsAddress;
// const zeroAddress = "0x0000000000000000000000000000000000000000";
let genartPaymentSplitter;

let payeesMint;
let sharesMint;
let payeesRoyalty;
let sharesRoyalty;

const GenArtPaymentSplitter = artifacts.require("GenArtPaymentSplitterV2");
const GenArtToken = artifacts.require("GenArtGovToken");

contract("GenArtPaymentSplitterV2", function (accounts) {
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

    genartToken = await GenArtToken.new(owner, {
      from: owner,
    });
    genartPaymentSplitter = await GenArtPaymentSplitter.new(
      genartToken.address,
      {
        from: owner,
      }
    );

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

    const ownerShare = MINT_PRICE.times(sold).times(sharesMint[0] / 1000);
    const artistShare = MINT_PRICE.times(sold).times(sharesMint[1] / 1000);

    const tx = await genartPaymentSplitter.splitPayment(collectionAddress, {
      from: collectionAddress,
      value: MINT_PRICE.times(sold),
    });

    expectEvent(tx, "IncomingPayment", {
      collection: collectionAddress,
      paymentType: "0",
      amount: ownerShare.toString(),
      payee: owner,
    });
    expectEvent(tx, "IncomingPayment", {
      collection: collectionAddress,
      paymentType: "0",
      amount: artistShare.toString(),
      payee: artist,
    });

    await genartPaymentSplitter.release(owner, {
      from: user1,
    });
    await genartPaymentSplitter.release(artist, {
      from: user1,
    });

    const balanceOwnerNew = await web3.eth.getBalance(owner);
    const balanceArtistNew = await web3.eth.getBalance(artist);

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

  it("Should fail unauthorized account updates payee", async () => {
    const tx = () =>
      genartPaymentSplitter.updatePayee(collectionAddress, 0, 1, user1, {
        from: user1,
      });
    await expectError(tx, "sender is not current payee", "update payee broken");
  });

  it("Should update payee", async () => {
    await genartPaymentSplitter.splitPaymentRoyalty(collectionAddress, {
      from: owner,
      value: MINT_PRICE,
    });
    await genartPaymentSplitter.updatePayee(collectionAddress, 1, 1, user1, {
      from: artist,
    });
    artist = user1;
  });

  it("Should split royalties", async () => {
    const royaltyValue = MINT_PRICE;
    const ownerShare = royaltyValue.times(2).times(sharesRoyalty[0]).div(750);
    const artistShare = royaltyValue.times(sharesRoyalty[1]).div(750);

    const tx = await genartPaymentSplitter.splitPaymentRoyalty(
      collectionAddress,
      {
        from: owner,
        value: MINT_PRICE,
      }
    );

    expectEvent(tx, "IncomingPayment", {
      collection: collectionAddress,
      paymentType: "1",
      payee: owner,
    });
    expectEvent(tx, "IncomingPayment", {
      collection: collectionAddress,
      paymentType: "1",
      payee: artist,
    });

    const balanceArtist = await genartPaymentSplitter.getBalanceForAccount(
      artist
    );
    const balanceOwner = await genartPaymentSplitter.getBalanceForAccount(
      owner
    );

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
      from: user2,
    });
    await genartPaymentSplitter.release(artist, {
      from: user2,
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

  it("Should split WETH royalties", async () => {
    const royaltyValue = MINT_PRICE;
    const ownerShare = royaltyValue.times(sharesRoyalty[0]).div(750);
    const artistShare = royaltyValue.times(sharesRoyalty[1]).div(750);
    await genartToken.transfer(genartPaymentSplitter.address, royaltyValue);
    // await genartToken.approve(genartPaymentSplitter.address, royaltyValue, {
    //   from: collectionAddress,
    // });
    await genartPaymentSplitter.splitPaymentRoyaltyWETH(
      collectionAddress,
      royaltyValue,
      {
        from: owner,
      }
    );

    // expectEvent(tx, "IncomingPayment", {
    //   collection: collectionAddress,
    //   paymentType: "1",
    //   payee: owner,
    // });
    // expectEvent(tx, "IncomingPayment", {
    //   collection: collectionAddress,
    //   paymentType: "1",
    //   payee: artist,
    // });

    // const balanceOwner = await genartPaymentSplitter.getBalanceForAccount(
    //   owner
    // );

    // expect(Math.floor(ownerShare.toNumber())).equals(
    //   Number(balanceOwner.toString())
    // );

    const balanceOwnerOld = await genartToken.balanceOf.call(owner);
    await genartPaymentSplitter.release(owner, {
      from: user2,
    });
    await genartPaymentSplitter.release(artist, {
      from: user2,
    });
    const balanceArtist = await genartToken.balanceOf.call(artist);
    const balanceOwner = await genartToken.balanceOf.call(owner);

    expect(Math.floor(artistShare.toNumber())).equals(
      Number(balanceArtist.toString())
    );
    expect(Math.floor(ownerShare.plus(balanceOwnerOld).toNumber())).equals(
      Number(balanceOwner.toString())
    );

    // // release payment to accounts
    // const balanceOwnerOld = await web3.eth.getBalance(owner);
    // const balanceArtistOld = await web3.eth.getBalance(artist);

    // const balanceOwnerNew = await web3.eth.getBalance(owner);
    // const balanceArtistNew = await web3.eth.getBalance(artist);

    // expect(Math.floor(ownerShare.plus(balanceOwnerOld).toNumber())).equals(
    //   Number(balanceOwnerNew.toString())
    // );
    // expect(Math.floor(artistShare.plus(balanceArtistOld).toNumber())).equals(
    //   Number(balanceArtistNew.toString())
    // );
  });

  it("Should do emergency withdraw", async () => {
    await genartPaymentSplitter.splitPaymentRoyalty(collectionAddress, {
      from: owner,
      value: MINT_PRICE.times(5),
    });
    const contractBalance = await web3.eth.getBalance(
      genartPaymentSplitter.address
    );
    const gasPrice = new BigNumber(10).pow(11).times(43);
    const balanceOwnerOld = await web3.eth.getBalance(owner);
    const tx = await genartPaymentSplitter.emergencyWithdraw({
      gasPrice,
      from: owner,
    });
    const gas = new BigNumber(tx.receipt.gasUsed).times(gasPrice);

    const balanceOwnerNew = await web3.eth.getBalance(owner);
    expect(balanceOwnerNew.toString()).to.equal(
      new BigNumber(balanceOwnerOld).plus(contractBalance).minus(gas).toString()
    );
  });
});
