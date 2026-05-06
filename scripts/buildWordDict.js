import fs from "fs";

console.log("Building dictionary from words_alpha.txt...");

const raw = fs
  .readFileSync("public/words_alpha.txt", "utf8")
  .split("\n");

const cleaned = raw
  .map((w) => w.toLowerCase().trim())
  .filter((w) => w.length >= 4 && w.length <= 12)
  .filter((w) => /^[a-z]+$/.test(w));

const unique = [...new Set(cleaned)];

const output =
  `export const WORD_SET = new Set(${JSON.stringify(unique)});\n`;

fs.writeFileSync("lib/worddict.ts", output);

console.log("Built dictionary:", unique.length);