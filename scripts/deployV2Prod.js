// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const pool = {
    address: "0xAe42C3fc600B70f08f0Bdd53D7b26EDfD2e21548",
  };
  const loyaltyVaultAddress = "0xB8a5465BFC06fc8C82385dCFf949673D7b068D1a";
  const genartInterfaceAddress = "0x6bB38a82E3479f474d2985805B49B04881d8203c";
  const collectionUri = "https://api.gen.art/public/attributes/";

  const GenArtInterface = await ethers.getContractFactory("GenArtInterfaceV4");
  const GenArtStorage = await ethers.getContractFactory("GenArtStorage");
  const GenArtMinterFlash = await ethers.getContractFactory(
    "GenArtMinterFlash"
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

  const collectionFactoryArgs = [collectionUri];
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

  // init
  await collectionFactory.addErc721Implementation(0, implementation.address);
  await collectionFactory.setAdminAccess(curated.address, true);
  await curated.addMinter(0, minterLoyalty.address);
  await storage.setAdminAccess(curated.address, true);
  await mintAlloc.setAdminAccess(flashMinter.address, true);
  await mintAlloc.setAdminAccess(minterLoyalty.address, true);
  await paymentSplitterFactory.setAdminAccess(curated.address, true);
  await flashMinter.setAdminAccess(curated.address, true);
  await minterLoyalty.setAdminAccess(curated.address, true);
  await vault.setAdminAccess(minterLoyalty.address, true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
