const fs = require("fs");
const path = require("path");
const root = "./artifacts/contracts";
const outDir = "./abis";
const abis = fs
  .readdirSync(root)
  .map((dir) => {
    const subDir = `${root}/${dir}`;
    return fs.readdirSync(subDir).map(
      (subSub) => {
        return fs.readdirSync(`${subDir}/${subSub}`).map((file) =>
          !file.includes("dbg")
            ? {
                abi: require(path.resolve(`${subDir}/${subSub}/${file}`)).abi,
                name: file,
              }
            : null
        );
      }
      // const subSubDir = `${subDir}/${subSub}`;
    );
  })
  .flat()
  .flat()
  .filter((a) => a);

abis.forEach((abi) => {
  fs.writeFileSync(
    `${outDir}/${abi.name}`,
    JSON.stringify(abi.abi, undefined, 2),
    { encoding: "utf-8" }
  );
});
