import assert from "node:assert/strict";
import { calculateExamDeadline, remainingExamSeconds } from "./examTimer.ts";

const start = "2026-09-09T10:00:00.000Z";
const startMs = Date.parse(start);
const deadline = calculateExamDeadline(start, 90);

assert.equal(deadline, startMs + 90 * 60_000);
assert.equal(remainingExamSeconds(deadline, startMs), 90 * 60);
assert.equal(remainingExamSeconds(deadline, startMs + 5 * 60_000), 85 * 60);
assert.equal(remainingExamSeconds(deadline, startMs + 10 * 60_000), 80 * 60);
assert.equal(remainingExamSeconds(deadline, deadline - 500), 1);
assert.equal(remainingExamSeconds(deadline, deadline), 0);
assert.equal(remainingExamSeconds(deadline, deadline + 60_000), 0);

// Refresh/background/sessionStorage tampering cannot extend an absolute deadline.
assert.equal(remainingExamSeconds(deadline, startMs + 2 * 60 * 60_000), 0);
assert.equal(calculateExamDeadline("invalid", 90), null);
assert.equal(calculateExamDeadline(start, Number.NaN), null);

console.log("examTimer: absolute deadline and recovery PASS");
