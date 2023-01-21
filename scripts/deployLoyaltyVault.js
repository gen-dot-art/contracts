// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const genartMembershipAddress = "0x8E0414D4714fA11DC7c6F6ff80f19B2b555FcD06";

  const tokenAddress = "0xcEe4b255A5C4644F5052f728200903A729d75084";

  const loyaltyMinterAddress = "0x51403ce83cDD0E3a13558459779E39a6ceea6e99";

  const GenArtLoyaltyVault = await ethers.getContractFactory(
    "GenArtLoyaltyVault"
  );
  const GenArtMinterLoyalty = await ethers.getContractFactory(
    "GenArtMinterLoyalty"
  );
  const vault = await GenArtLoyaltyVault.deploy(
    genartMembershipAddress,
    tokenAddress
  );

  console.log(
    "yarn hardhat verify --network goerli",
    [vault.address]
      .concat([genartMembershipAddress, tokenAddress].map((a) => `"${a}"`))
      .join(" ")
  );
  await vault.deployed();

  // init

  const minter = GenArtMinterLoyalty.attach(loyaltyMinterAddress);
  await minter.setGenartVault(vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
