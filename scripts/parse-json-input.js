const fs = require("fs");
const build = require("../artifacts/build-info/735b18be4425de69da65a44265ddc760.json");

fs.writeFileSync(
  "./tmp/contract-json-input.json",
  JSON.stringify(build.input, undefined, 2)
);
