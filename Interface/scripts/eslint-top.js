// scripts/eslint-top.js (CommonJS compatible)
const { ESLint } = require("eslint");
const path = require("path");

const args = process.argv.slice(2);
const top = Number(args[0]) || 3;

(async () => {
  const eslint = new ESLint({});

  const results = await eslint.lintFiles(["src/**/*.{js,jsx,ts,tsx,mjs}"]);

  const counter = {};

  for (const r of results) {
    for (const m of r.messages) {
      if (!m.ruleId) continue;
      counter[m.ruleId] = (counter[m.ruleId] || 0) + 1;
    }
  }

  const sorted = Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);

  console.log(`Top ${top} ESLint error types:`);
  console.log("────────────────────────────\n");

  for (const [rule, count] of sorted) {
    console.log(`${count} × ${rule}`);
  }
})();
