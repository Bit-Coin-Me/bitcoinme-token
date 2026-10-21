import { readFileSync } from "node:fs";

interface FileCoverage {
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}
const coverage = JSON.parse(readFileSync("coverage.json", "utf8")) as Record<string, FileCoverage>;
const files = Object.entries(coverage).filter(([file]) => /(?:^|\/)contracts\//.test(file));
if (files.length === 0) throw new Error("Missing contract coverage");
for (const [file, data] of files) {
  const counts = [
    ...Object.values(data.s),
    ...Object.values(data.f),
    ...Object.values(data.b).flat(),
  ];
  if (counts.some((count) => count === 0)) throw new Error("Coverage below 100%: " + file);
}
console.log("All contract statements, functions and branches are covered");
