const fs = require("fs");
const pkg = require("../package.json");

const version = pkg.version;

const content = `export const APP_VERSION = "${version}";\n`;

fs.writeFileSync("./src/version.js", content, "utf8");

console.log("Updated version.js to", version);
