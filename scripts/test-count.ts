// Writes the current number of passing tests to web/src/generated/test-count.json, for the
// "How it works" page. Run after changing tests: npm run test:count
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = join(mkdtempSync(join(tmpdir(), "meridian-tests-")), "report.json");
try {
  execSync(`npx vitest run --reporter=json --outputFile=${out}`, { stdio: "ignore" });
} catch {
  /* failing tests still write a report; we only count passes */
}
const r = JSON.parse(readFileSync(out, "utf8")) as { numPassedTests: number; numTotalTests: number; testResults: unknown[] };
const body = { passed: r.numPassedTests, total: r.numTotalTests, files: r.testResults.length };
writeFileSync("web/src/generated/test-count.json", JSON.stringify(body, null, 2) + "\n");
console.log(`test-count: ${body.passed} of ${body.total} passing in ${body.files} files`);
