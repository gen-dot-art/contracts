const { expect } = require("chai");
const { BigNumber } = require("ethers");

async function expectError(tx, error, msg = "Unexpected Error") {
  try {
    await tx();
  } catch (err) {
    expect(err.toString().includes(error)).equal(true, err);
    return;
  }
  throw new Error(msg);
}

const changeTokenBalances = async (call, token, accounts, balances) => {
  const balancesBefore = await Promise.all(
    accounts.map((account) => token.balanceOf(account.address))
  );
  await call();
  await Promise.all(
    accounts.map(async (account, i) => {
      const after = await token.balanceOf(account.address);
      expect(BigNumber.from(after).sub(balancesBefore[i]).toString()).equals(
        BigNumber.from(balances[i]).toString()
      );
    })
  );
};

module.exports = {
  expectError,
  changeTokenBalances,
};
