// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const pool = {
    address: "0x8939a7106957dD14bf3D3aCc9151b96E4bD81bC6",
  };
  const genartInterface = {
    address: "0x9b7615F47Ec9f68017Dd5e15D390C1ad51b849Aa",
  };
  const genartMembershipAddress = "0x8E0414D4714fA11DC7c6F6ff80f19B2b555FcD06";

  const priceStandard = BigNumber.from(1).mul(BigNumber.from(10).pow(12));
  const priceGold = BigNumber.from(5).mul(BigNumber.from(10).pow(12));
  const [owner] = await ethers.getSigners();

  const GenArt = await ethers.getContractFactory("GenArtMembershipTest");

  const GenArtInterface = await ethers.getContractFactory("GenArtInterfaceV3");

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

  const membershipArgs = [
    "GEN.ART Membership",
    "GENART",
    "https://test-api.gen.art/public/membership/standard/",
    "https://test-api.gen.art/public/membership/gold/",
    5000,
  ];
  // const genartMembership = GenArt.attach(genartMembershipAddress);
  // const genartMembership = await GenArt.deploy(...membershipArgs);
  // await genartMembership.deployed();
  // console.log(
  //   "yarn hardhat verify --network goerli",
  //   [genartMembership.address]
  //     .concat(membershipArgs.map((a) => `"${a}"`))
  //     .join(" ")
  // );
  // const genartInterface = await GenArtInterface.deploy(
  //   genartMembership.address
  // );
  // await genartInterface.deployed();
  // console.log(
  //   "yarn hardhat verify --network goerli",
  //   [genartInterface.address]
  //     .concat([genartMembership.address].map((a) => `"${a}"`))
  //     .join(" ")
  // );
  const paymentSplitter = await GenArtPaymentSplitter.deploy();
  console.log(
    "yarn hardhat verify --network goerli",
    [paymentSplitter.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await paymentSplitter.deployed();
  const paymentSplitterFactory = await GenArtPaymentSplitterFactory.deploy(
    paymentSplitter.address
  );

  console.log(
    "yarn hardhat verify --network goerli",
    [paymentSplitterFactory.address]
      .concat([paymentSplitter.address].map((a) => `"${a}"`))
      .join(" ")
  );
  await paymentSplitterFactory.deployed();
  const collectionFactoryArgs = ["https://test-api.gen.art/public/attributes/"];
  const collectionFactory = await GenArtCollectionFactory.deploy(
    ...collectionFactoryArgs
  );

  console.log(
    "yarn hardhat verify --network goerli",
    [collectionFactory.address]
      .concat(collectionFactoryArgs.map((a) => `"${a}"`))
      .join(" ")
  );
  await collectionFactory.deployed();
  const curatedArgs = [
    collectionFactory.address,
    paymentSplitterFactory.address,
  ];
  const curated = await GenArtCurated.deploy(...curatedArgs);
  console.log(
    "yarn hardhat verify --network goerli",
    [curated.address].concat(curatedArgs.map((a) => `"${a}"`)).join(" ")
  );
  await curated.deployed();
  const minterArgs = [genartInterface.address, curated.address, pool.address];
  const minter = await GenArtFlashMinter.deploy(...minterArgs);
  console.log(
    "yarn hardhat verify --network goerli",
    [minter.address].concat(minterArgs.map((a) => `"${a}"`)).join(" ")
  );
  await minter.deployed();
  const implementation = await GenArtERC721V4.deploy();
  console.log(
    "yarn hardhat verify --network goerli",
    [implementation.address].concat([].map((a) => `"${a}"`).join(" "))
  );
  // await implementation.deployed();

  // init
  // await collectionFactory.addErc721Implementation(0, implementation.address);
  // await collectionFactory.addMinter(0, minter.address);
  // await collectionFactory.setAdminAccess(curated.address, true);
  // await paymentSplitterFactory.setAdminAccess(curated.address, true);
  // await minter.setAdminAccess(curated.address, true);

  // await genartMembership.setPaused(false);
  // await genartMembership.mintMany(owner.address, 20, {
  //   value: priceStandard,
  // });
  // await genartMembership.mintGold(owner.address, {
  //   value: priceGold,
  // });
  // await genartMembership.mintGold(owner.address, {
  //   value: priceGold,
  // });
  // await genartMembership.mintGold(owner.address, {
  //   value: priceGold,
  // });
  // await genartMembership.mintMany(pool.address, 10, {
  //   value: priceStandard,
  // });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
