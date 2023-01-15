// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();

  const loyaltyMinterAddress = "0x644cb5eCE52EDb30DEBAF180fA113E05480F7B9F";

  const GenArtERC721V4 = await ethers.getContractFactory("GenArtERC721V4");

  const GenArtPaymentSplitterV5 = await ethers.getContractFactory(
    "GenArtPaymentSplitterV5"
  );

  const paymentSplitter = await GenArtPaymentSplitterV5.deploy();
  console.log(
    "yarn hardhat verify --network goerli",
    [paymentSplitter.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await paymentSplitter.deployed();

  await paymentSplitter.initialize(
    owner.address,
    [owner.address],
    [owner.address],
    [1000],
    [1000]
  );
  const erc721 = await GenArtERC721V4.deploy();

  console.log(
    "yarn hardhat verify --network goerli",
    [erc721.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await erc721.deployed();

  await erc721.initialize(
    "Test Collection",
    "TST",
    "uri",
    "0",
    "50000",
    owner.address,
    owner.address,
    loyaltyMinterAddress,
    paymentSplitter.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
