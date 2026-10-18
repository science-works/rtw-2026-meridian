// Vitest reporter: after every full run, writes the number of passing tests to
// web/src/generated/test-count.json, so "/how-it-works" always shows the real count.
import { writeFileSync } from "node:fs";
import type { Reporter, TestModule } from "vitest/node";

export default class TestCountReporter implements Reporter {
  onTestRunEnd(modules: ReadonlyArray<TestModule>) {
    let passed = 0;
    let total = 0;
    for (const m of modules)
      for (const t of m.children.allTests()) {
        total++;
        if (t.result().state === "passed") passed++;
      }
    // Only a full run updates the count (a filtered run would under-count).
    if (modules.length < 20) return;
    writeFileSync("web/src/generated/test-count.json", JSON.stringify({ passed, total, files: modules.length }, null, 2) + "\n");
  }
}
