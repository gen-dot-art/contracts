// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");

async function main() {
  const pool = {
    address: "0x95aC0E84F5d1a651e01366DAC7e5DdCAe0A8830F",
  };
  const genartInterface = {
    address: "0xf09473B9e7D00F505f467B344f3907a948E38Da0",
  };

  const GenArtFlashMinter = await ethers.getContractFactory(
    "GenArtFlashMinter"
  );
  const GenArtMinter = await ethers.getContractFactory("GenArtMinter");
  const GenArtWhitelistMinter = await ethers.getContractFactory(
    "GenArtWhitelistMinter"
  );
  const GenArtMintAllocator = await ethers.getContractFactory(
    "GenArtMintAllocator"
  );

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
  console.log(
    "yarn hardhat verify --network mainnet",
    [paymentSplitter.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await paymentSplitter.deployed();
  const paymentSplitterFactory = await GenArtPaymentSplitterFactory.deploy(
    paymentSplitter.address
  );

  console.log(
    "yarn hardhat verify --network mainnet",
    [paymentSplitterFactory.address]
      .concat([paymentSplitter.address].map((a) => `"${a}"`))
      .join(" ")
  );
  await paymentSplitterFactory.deployed();
  const collectionFactoryArgs = ["https://api.gen.art/public/attributes/"];
  const collectionFactory = await GenArtCollectionFactory.deploy(
    ...collectionFactoryArgs
  );

  console.log(
    "yarn hardhat verify --network mainnet",
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
    "yarn hardhat verify --network mainnet",
    [curated.address].concat(curatedArgs.map((a) => `"${a}"`)).join(" ")
  );
  await curated.deployed();

  const minterArgs = [genartInterface.address, curated.address];
  const flashMinterArgs = [
    genartInterface.address,
    curated.address,
    pool.address,
    pool.address,
  ];
  const whitelistMinterArgs = [
    genartInterface.address,
    curated.address,
    pool.address,
  ];
  const mintAlloc = await GenArtMintAllocator.deploy(genartInterface.address);
  const minter = await GenArtMinter.deploy(...minterArgs);
  const flashMinter = await GenArtFlashMinter.deploy(...flashMinterArgs);
  const whitelistMinter = await GenArtWhitelistMinter.deploy(
    ...whitelistMinterArgs
  );
  console.log(
    "yarn hardhat verify --network mainnet",
    [minter.address].concat(minterArgs.map((a) => `"${a}"`)).join(" ")
  );
  await minter.deployed();
  console.log(
    "yarn hardhat verify --network mainnet",
    [flashMinter.address].concat(flashMinterArgs.map((a) => `"${a}"`)).join(" ")
  );
  await flashMinter.deployed();
  console.log(
    "yarn hardhat verify --network mainnet",
    [whitelistMinter.address]
      .concat(whitelistMinterArgs.map((a) => `"${a}"`))
      .join(" ")
  );
  await whitelistMinter.deployed();
  console.log(
    "yarn hardhat verify --network mainnet",
    [mintAlloc.address]
      .concat([genartInterface.address].map((a) => `"${a}"`))
      .join(" ")
  );
  await mintAlloc.deployed();
  const implementation = await GenArtERC721V4.deploy();
  console.log(
    "yarn hardhat verify --network mainnet",
    [implementation.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await implementation.deployed();

  // init

  await paymentSplitterFactory.setAdminAccess(curated.address, true);
  await collectionFactory.setAdminAccess(curated.address, true);
  await collectionFactory.addErc721Implementation(0, implementation.address);
  await collectionFactory.addMinter(0, minter.address);
  await mintAlloc.setAdminAccess(flashMinter.address, true);
  await mintAlloc.setAdminAccess(whitelistMinter.address, true);
  await mintAlloc.setAdminAccess(minter.address, true);
  await minter.setAdminAccess(curated.address, true);
  await flashMinter.setAdminAccess(curated.address, true);
  await whitelistMinter.setAdminAccess(curated.address, true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
