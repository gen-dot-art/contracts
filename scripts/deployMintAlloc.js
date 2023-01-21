// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const genartInterfaceAddress = "0x44897375074cCd9d99f6C08e61ADEAB4a3910723";
  const flashMinterAddress = "0xfbd15971133288a10A9Fb48E1af72a0e953B9949";
  const loyaltyMinterAddress = "0x51403ce83cDD0E3a13558459779E39a6ceea6e99";

  const GenArtMinterFlash = await ethers.getContractFactory(
    "GenArtMinterFlash"
  );
  const GenArtMinterLoyalty = await ethers.getContractFactory(
    "GenArtMinterLoyalty"
  );
  const GenArtMintAllocator = await ethers.getContractFactory(
    "GenArtMintAllocator"
  );

  const flashMinter = GenArtMinterFlash.attach(flashMinterAddress);
  const minterLoyalty = GenArtMinterLoyalty.attach(loyaltyMinterAddress);

  const mintAlloc = await GenArtMintAllocator.deploy(genartInterfaceAddress);
  console.log(
    "yarn hardhat verify --network goerli",
    [mintAlloc.address]
      .concat([genartInterfaceAddress].map((a) => `"${a}"`))
      .join(" ")
  );
  await mintAlloc.deployed();

  // init
  await mintAlloc.setAdminAccess(flashMinter.address, true);
  await mintAlloc.setAdminAccess(minterLoyalty.address, true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
