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
  // const loyaltyMinterAddress = "0x51403ce83cDD0E3a13558459779E39a6ceea6e99";
  const genartMembershipAddress = "0x8E0414D4714fA11DC7c6F6ff80f19B2b555FcD06";
  const loyaltyVaultAddress = "0x6FA6379f1cea89F38A9113fCB718Ad20eDa391e6";
  const genartInterfaceAddress = "0x44897375074cCd9d99f6C08e61ADEAB4a3910723";

  // const implementation = {
  //   address: "0x8279028D79A23c80f94E8A4f7f9Bc413B56795F8",
  // };

  // const collectionFactory = {
  //   address: "0x3123eD3bE566e6Bd4fd0afE03DD1AAaa89Bb620D",
  // };
  // const paymentSplitterFactory = {
  //   address: "0xBAD88137b0ecF3f6D8F5e5E07bd33F8D43069dc4",
  // };
  // const minter = {
  //   address: "0x06Fe3D713F6b365eaf23425a5975DF85c5D09aE1",
  // };
  // const curated = {
  //   address: "0xf339050A6f0aD275cb9F1Bc164fF7A6eCF7AcF8F",
  // };

  // const priceStandard = BigNumber.from(1).mul(BigNumber.from(10).pow(12));
  // const priceGold = BigNumber.from(5).mul(BigNumber.from(10).pow(12));
  // const [owner] = await ethers.getSigners();

  const GenArtInterface = await ethers.getContractFactory("GenArtInterfaceV4");
  const GenArtStorage = await ethers.getContractFactory("GenArtStorage");
  const GenArtMinterFlash = await ethers.getContractFactory(
    "GenArtMinterFlash"
  );
  const GenArtMinter = await ethers.getContractFactory("GenArtMinter");
  const GenArtWhitelistMinter = await ethers.getContractFactory(
    "GenArtWhitelistMinter"
  );
  const GenArtMintAllocator = await ethers.getContractFactory(
    "GenArtMintAllocator"
  );

  const GenArtLoyaltyVault = await ethers.getContractFactory(
    "GenArtLoyaltyVault"
  );

  const GenArtERC721V4 = await ethers.getContractFactory("GenArtERC721V4");
  const GenArtPaymentSplitterFactory = await ethers.getContractFactory(
    "GenArtPaymentSplitterFactory"
  );
  const GenArtPaymentSplitter = await ethers.getContractFactory(
    "GenArtPaymentSplitterV5"
  );
  const GenArtCollectionFactory = await ethers.getContractFactory(
    "GenArtCollectionFactory"
  );
  const GenArtCurated = await ethers.getContractFactory("GenArtCurated");
  const GenArtMinterLoyalty = await ethers.getContractFactory(
    "GenArtMinterLoyalty"
  );

  // const membershipArgs = [
  //   "GEN.ART Membership",
  //   "GENART",
  //   "https://test-api.gen.art/public/membership/standard/",
  //   "https://test-api.gen.art/public/membership/gold/",
  //   5000,
  // ];
  // const genartMembership = GenArt.attach(genartMembershipAddress);
  // const genartMembership = await GenArt.deploy(...membershipArgs);
  // await genartMembership.deployed();
  // console.log(
  //   "yarn hardhat verify --network goerli",
  //   [genartMembership.address]
  //     .concat(membershipArgs.map((a) => `"${a}"`))
  //     .join(" ")
  // );
  // const genartInterface = await GenArtInterface.deploy(genartMembershipAddress);
  // await genartInterface.deployed();
  // console.log(
  //   "yarn hardhat verify --network goerli",
  //   [genartInterface.address]
  //     .concat([genartMembershipAddress].map((a) => `"${a}"`))
  //     .join(" ")
  // );
  const genartInterface = await GenArtInterface.attach(genartInterfaceAddress);
  const vault = GenArtLoyaltyVault.attach(loyaltyVaultAddress);

  const storage = await GenArtStorage.deploy();
  console.log(
    "yarn hardhat verify --network goerli",
    [storage.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await storage.deployed();

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
    storage.address,
  ];
  const curated = await GenArtCurated.deploy(...curatedArgs);
  console.log(
    "yarn hardhat verify --network goerli",
    [curated.address].concat(curatedArgs.map((a) => `"${a}"`)).join(" ")
  );
  await curated.deployed();

  // const minterArgs = [genartInterface.address, curated.address];
  // const minter = await GenArtMinter.deploy(...minterArgs);
  // console.log(
  //   "yarn hardhat verify --network goerli",
  //   [minter.address].concat(minterArgs.map((a) => `"${a}"`)).join(" ")
  // );
  // await minter.deployed();

  const flashMinterArgs = [
    genartInterface.address,
    curated.address,
    pool.address,
    pool.address,
  ];
  const flashMinter = await GenArtMinterFlash.deploy(...flashMinterArgs);
  console.log(
    "yarn hardhat verify --network goerli",
    [flashMinter.address].concat(flashMinterArgs.map((a) => `"${a}"`)).join(" ")
  );
  await flashMinter.deployed();

  // const whitelistMinterArgs = [
  //   genartInterface.address,
  //   curated.address,
  //   pool.address,
  // ];
  // const whitelistMinter = await GenArtWhitelistMinter.deploy(
  //   ...whitelistMinterArgs
  // );
  // console.log(
  //   "yarn hardhat verify --network goerli",
  //   [whitelistMinter.address]
  //     .concat(whitelistMinterArgs.map((a) => `"${a}"`))
  //     .join(" ")
  // );
  // await whitelistMinter.deployed();

  const minterLoyalty = await GenArtMinterLoyalty.deploy(
    genartInterface.address,
    curated.address,
    vault.address
  );
  console.log(
    "yarn hardhat verify --network goerli",
    [minterLoyalty.address]
      .concat(
        [genartInterface.address, curated.address, vault.address].map(
          (a) => `"${a}"`
        )
      )
      .join(" ")
  );
  await minterLoyalty.deployed();

  const mintAlloc = await GenArtMintAllocator.deploy(genartInterface.address);
  console.log(
    "yarn hardhat verify --network goerli",
    [mintAlloc.address]
      .concat([genartInterface.address].map((a) => `"${a}"`))
      .join(" ")
  );
  await mintAlloc.deployed();

  const implementation = await GenArtERC721V4.deploy();
  console.log(
    "yarn hardhat verify --network goerli",
    [implementation.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await implementation.deployed();

  // const mintAlloc = GenArtMintAllocator.attach(mintAllocAddress);
  // const minterLoyalty = GenArtMinterLoyalty.attach(loyaltyMinterAddress);

  // init
  await collectionFactory.addErc721Implementation(0, implementation.address);
  await collectionFactory.setAdminAccess(curated.address, true);
  await curated.addMinter(0, minterLoyalty.address);
  // await curated.addMinter(0, minter.address);
  await storage.setAdminAccess(curated.address, true);
  // await mintAlloc.setAdminAccess(minter.address, true);
  await mintAlloc.setAdminAccess(flashMinter.address, true);
  await mintAlloc.setAdminAccess(minterLoyalty.address, true);
  await paymentSplitterFactory.setAdminAccess(curated.address, true);
  // await minter.setAdminAccess(curated.address, true);
  await flashMinter.setAdminAccess(curated.address, true);
  await minterLoyalty.setAdminAccess(curated.address, true);
  await vault.setAdminAccess(minterLoyalty.address, true);
  // await whitelistMinter.setAdminAccess(curated.address, true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
