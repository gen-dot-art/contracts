var minify = require("html-minifier").minify;
const fs = require("fs");
const htmlFile = process.argv[2];
const SCRIPT = fs.readFileSync(htmlFile, { encoding: "utf-8" });

var result = minify(SCRIPT, {
  removeAttributeQuotes: true,
  minifyJS: true,
  minifyCSS: true,
  removeComments: true,
});

fs.writeFileSync(htmlFile.replace(".html", "_minified.html"), result, {
  encoding: "utf-8",
});
