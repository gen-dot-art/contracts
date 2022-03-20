const { expect } = require("chai");

async function expectError(tx, error, msg = "Unexpected Error") {
  try {
    await tx();
  } catch (err) {
    expect(err.toString().includes(error)).equal(true, err);
    return;
  }
  throw new Error(msg);
}

module.exports = {
  expectError,
};
