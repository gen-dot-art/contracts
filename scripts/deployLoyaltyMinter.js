// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");

async function main() {
  const genartMembershipAddress = "0x8E0414D4714fA11DC7c6F6ff80f19B2b555FcD06";
  const genartInterfaceV4 = "0x44897375074ccd9d99f6c08e61adeab4a3910723";
  const genartVault = "0xD01c19cEa0Ae6A677FfaDb73d33CF4614aCba2EB";
  const genartCurated = "0xd7F83BdE98FdC46AcD1036592F004b07874EDB1d";

  const GenArtMinterLoyalty = await ethers.getContractFactory(
    "GenArtMinterLoyalty"
  );

  const minterLoyalty = await GenArtMinterLoyalty.deploy(
    genartInterfaceV4,
    genartCurated,
    genartVault
  );

  console.log(
    "yarn hardhat verify --network goerli",
    [minterLoyalty.address]
      .concat(
        [genartInterfaceV4, genartCurated, genartVault].map((a) => `"${a}"`)
      )
      .join(" ")
  );
  await minterLoyalty.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
