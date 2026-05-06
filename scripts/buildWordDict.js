import fs from "fs";
import words from "word-list-json";

console.log("Building full English dictionary...");

const cleaned = words
  .map((w) => w.toLowerCase().trim())
  .filter((w) => w.length >= 4 && w.length <= 12)
  .filter((w) => /^[a-z]+$/.test(w));

const unique = [...new Set(cleaned)];

const output = `export const WORD_SET = new Set(${JSON.stringify(unique)});\n`;

fs.writeFileSync("lib/worddict.ts", output);

console.log("Built dictionary:", unique.length);