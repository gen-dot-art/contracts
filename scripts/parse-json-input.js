const fs = require("fs");
const build = require("../artifacts/build-info/4b6ed7adae5c6103c79db9bd067b78e0.json");

fs.writeFileSync(
  "./tmp/contract-json-input.json",
  JSON.stringify(build.input, undefined, 2)
);
