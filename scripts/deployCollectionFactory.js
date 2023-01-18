// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();

  const curatedAddress = "0xd7F83BdE98FdC46AcD1036592F004b07874EDB1d";
  const implementationAddress = "0xd2baebC0d616C64Ff870dE3Bb345238cb93a26Bb";

  const GenArtCollectionFactory = await ethers.getContractFactory(
    "GenArtCollectionFactory"
  );

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

  const GenArtCurated = await ethers.getContractFactory("GenArtCurated");
  const curated = GenArtCurated.attach(curatedAddress);
  await curated.setCollectionFactory(collectionFactory.address);
  await collectionFactory.addErc721Implementation(0, implementationAddress);
  await collectionFactory.setAdminAccess(curatedAddress, true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
