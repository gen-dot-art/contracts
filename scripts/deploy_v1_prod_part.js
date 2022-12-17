// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const pool = {
    address: "0x95aC0E84F5d1a651e01366DAC7e5DdCAe0A8830F",
  };
  const genartInterface = {
    address: "0xf09473B9e7D00F505f467B344f3907a948E38Da0",
  };
  const mintAlloc = {
    address: "0x9e2fA2e9E2C76e56736a6B21Ca94389846EA2553",
  };
  const minter = {
    address: "0x268dA94c29EdD4E6E82825dA94617dAE2eB6FD47",
  };
  const flashMinter = {
    address: "0x3B34341A6fbbee1422B88e888af58D958B41c888",
  };
  const collectionFactory = {
    address: "0x6DBE1a1d329f4e2cFb060e942eb11a332420Fc0e",
  };
  // const paymentSplitterFactory = {
  //   address: "0xBAD88137b0ecF3f6D8F5e5E07bd33F8D43069dc4",
  // };
  const curated = {
    address: "0x846bbE8EcAb2B55d75c15dcD7a3A943365a85Cf7",
  };
  const implementation = {
    address: "0xe96B0eC0244aD144468902eA1daeb6297ed5b708",
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

  const [owner] = await ethers.getSigners();

  const paymentSplitter = await GenArtPaymentSplitter.deploy({
    gasPrice: BigNumber.from(10).pow(9).mul(25),
  });
  console.log(
    "yarn hardhat verify --network mainnet",
    [paymentSplitter.address].concat([].map((a) => `"${a}"`)).join(" ")
  );
  await paymentSplitter.deployed();
  const paymentSplitterFactory = await GenArtPaymentSplitterFactory.deploy(
    paymentSplitter.address,
    { gasPrice: BigNumber.from(10).pow(9).mul(25) }
  );

  console.log(
    "yarn hardhat verify --network mainnet",
    [paymentSplitterFactory.address]
      .concat([paymentSplitter.address].map((a) => `"${a}"`))
      .join(" ")
  );
  await paymentSplitterFactory.deployed();
  // const collectionFactoryArgs = ["https://api.gen.art/public/attributes/"];
  // const collectionFactory = await GenArtCollectionFactory.deploy(
  //   ...collectionFactoryArgs
  // );

  // console.log(
  //   "yarn hardhat verify --network mainnet",
  //   [collectionFactory.address]
  //     .concat(collectionFactoryArgs.map((a) => `"${a}"`))
  //     .join(" ")
  // );
  // await collectionFactory.deployed();
  // const curatedArgs = [
  //   collectionFactory.address,
  //   paymentSplitterFactory.address,
  // ];
  // const curated = await GenArtCurated.deploy(...curatedArgs);
  // console.log(
  //   "yarn hardhat verify --network mainnet",
  //   [curated.address].concat(curatedArgs.map((a) => `"${a}"`)).join(" ")
  // );
  // await curated.deployed();

  // const minterArgs = [genartInterface.address, curated.address];
  // const flashMinterArgs = [
  //   genartInterface.address,
  //   curated.address,
  //   pool.address,
  //   pool.address,
  // ];
  // const whitelistMinterArgs = [
  //   genartInterface.address,
  //   curated.address,
  //   pool.address,
  // ];
  // const mintAlloc = await GenArtMintAllocator.deploy(genartInterface.address);
  // console.log(
  //   "yarn hardhat verify --network mainnet",
  //   [mintAlloc.address]
  //     .concat([genartInterface.address].map((a) => `"${a}"`))
  //     .join(" ")
  // );
  // await mintAlloc.deployed();
  // const minter = await GenArtMinter.deploy(...minterArgs);
  // console.log(
  //   "yarn hardhat verify --network mainnet",
  //   [minter.address].concat(minterArgs.map((a) => `"${a}"`)).join(" ")
  // );
  // await minter.deployed();
  // const flashMinter = await GenArtFlashMinter.deploy(...flashMinterArgs);

  // console.log(
  //   "yarn hardhat verify --network mainnet",
  //   [flashMinter.address].concat(flashMinterArgs.map((a) => `"${a}"`)).join(" ")
  // );
  // await flashMinter.deployed();

  // const whitelistMinter = await GenArtWhitelistMinter.deploy(
  //   ...whitelistMinterArgs
  // );
  // console.log(
  //   "yarn hardhat verify --network mainnet",
  //   [whitelistMinter.address]
  //     .concat(whitelistMinterArgs.map((a) => `"${a}"`))
  //     .join(" ")
  // );
  // await whitelistMinter.deployed();
  // const implementation = await GenArtERC721V4.deploy({
  //   nonce: 16,
  //   gasPrice: BigNumber.from(10).pow(9).mul(20),
  // });
  // console.log(
  //   "yarn hardhat verify --network mainnet",
  //   [implementation.address].concat([].map((a) => `"${a}"`)).join(" ")
  // );
  // await implementation.deployed();

  // init

  await paymentSplitterFactory.setAdminAccess(curated.address, true, {
    gasPrice: BigNumber.from(10).pow(9).mul(25),
  });
  // await collectionFactory.setAdminAccess(curated.address, true);
  // await collectionFactory.addErc721Implementation(0, implementation.address);
  // await collectionFactory.addMinter(0, minter.address);

  // const paymentSplitterFactoryContract =
  //   await GenArtPaymentSplitterFactory.attach(paymentSplitterFactory.address);
  // const flashMinterContract = await GenArtFlashMinter.attach(
  //   flashMinter.address
  // );
  // const mintAllocContract = await GenArtMintAllocator.attach(mintAlloc.address);
  // const collectionFactoryContract = await GenArtCollectionFactory.attach(
  //   collectionFactory.address
  // );
  // const minterContract = await GenArtCollectionFactory.attach(minter.address);
  // await paymentSplitterFactoryContract.setAdminAccess(curated.address, true, {
  //   gasPrice: BigNumber.from(10).pow(9).mul(50),
  //   nonce: 17,
  // });

  // await collectionFactoryContract.setAdminAccess(curated.address, true, {
  //   gasPrice: BigNumber.from(10).pow(9).mul(50),
  // });
  // await collectionFactoryContract.addErc721Implementation(
  //   0,
  //   implementation.address,
  //   { gasPrice: BigNumber.from(10).pow(9).mul(50) }
  // );
  // await collectionFactoryContract.addMinter(0, minter.address, {
  //   gasPrice: BigNumber.from(10).pow(9).mul(50),
  // });

  // await mintAllocContract.setAdminAccess(flashMinterContract.address, true, {
  //   gasPrice: BigNumber.from(10).pow(9).mul(50),
  // });
  // await mintAllocContract.setAdminAccess(minter.address, true, {
  //   gasPrice: BigNumber.from(10).pow(9).mul(50),
  // });
  // await minterContract.setAdminAccess(curated.address, true, {
  //   gasPrice: BigNumber.from(10).pow(9).mul(50),
  // });
  // await flashMinterContract.setAdminAccess(curated.address, true, {
  //   gasPrice: BigNumber.from(10).pow(9).mul(50),
  // });
  // await mintAlloc.setAdminAccess(whitelistMinter.address, true);
  // await whitelistMinter.setAdminAccess(curated.address, true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
