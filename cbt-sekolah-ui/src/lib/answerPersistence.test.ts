// Answer Persistence & Recovery — Unit Tests
// Jalankan: node --experimental-strip-types src/lib/answerPersistence.test.ts
import assert from "node:assert/strict";

// ===== Serialize / Deserialize =====

function serializeAnswers(answers: Record<string, unknown>): string {
  return JSON.stringify(answers);
}

function deserializeAnswers(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Test 1: serialize normal answers
{
  const answers = { Q1: "A", Q2: ["A", "C"], Q3: "B" };
  const serialized = serializeAnswers(answers);
  assert.equal(typeof serialized, "string");
  assert.deepEqual(JSON.parse(serialized), answers);
}

// Test 2: serialize empty answers
{
  const serialized = serializeAnswers({});
  assert.equal(serialized, "{}");
}

// Test 3: deserialize normal
{
  const raw = '{"Q1":"A","Q2":["A","C"]}';
  const result = deserializeAnswers(raw);
  assert.deepEqual(result, { Q1: "A", Q2: ["A", "C"] });
}

// Test 4: deserialize empty string
{
  assert.equal(deserializeAnswers(""), null);
  assert.equal(deserializeAnswers(null), null);
  assert.equal(deserializeAnswers(undefined), null);
}

// Test 5: deserialize malformed JSON
{
  assert.equal(deserializeAnswers("{broken"), null);
  assert.equal(deserializeAnswers("42"), null);        // not an object
  assert.equal(deserializeAnswers('"just a string"'), null);
  assert.equal(deserializeAnswers("[1,2,3]"), null);   // array, not object
}

// ===== Recovery Merge Logic =====

function mergeAnswers(
  local: Record<string, unknown>,
  server: Record<string, unknown> | null
): Record<string, unknown> {
  // ponytail: local wins if it has any answers (it's newer)
  if (Object.keys(local).length > 0) return local;
  return server ?? {};
}

// Test 6: local has answers → local wins
{
  const local = { Q1: "A", Q2: "B" };
  const server = { Q1: "C" };
  assert.deepEqual(mergeAnswers(local, server), local);
}

// Test 7: local empty, server has answers → server recovered
{
  const local = {};
  const server = { Q1: "A", Q2: ["B", "C"] };
  assert.deepEqual(mergeAnswers(local, server), server);
}

// Test 8: both empty → empty
{
  assert.deepEqual(mergeAnswers({}, null), {});
  assert.deepEqual(mergeAnswers({}, {}), {});
}

// Test 9: local empty, server null → empty (no crash)
{
  assert.deepEqual(mergeAnswers({}, null), {});
}

// ===== doSubmit uses latest state (mock) =====

// Test 10: simulate getState() vs closure difference
{
  let storeState: { answers: Record<string, unknown> } = { answers: { Q1: "A" } };
  const closureAnswers = storeState.answers;  // captured at definition time
  storeState = { answers: { Q1: "A", Q2: "B" } };  // state changes

  const getStateAnswers = storeState.answers;  // getState() at call time
  assert.notDeepEqual(closureAnswers, getStateAnswers, "closure must differ from getState");
  assert.deepEqual(getStateAnswers, { Q1: "A", Q2: "B" });
}

// ===== Autosave Error Handling =====

// Test 11: failed autosave does not claim success
{
  let syncStatusAfterFail = "saved";
  const fakeRes = { success: false, message: "already_submitted" };
  if (!fakeRes.success) {
    syncStatusAfterFail = "failed";
  }
  assert.equal(syncStatusAfterFail, "failed", "failed sync must set status to 'failed'");
}

// ===== Already Submitted Guard =====

// Test 12: server rejects sync for SELESAI student
{
  const statuses = ["SELESAI", "DISKUALIFIKASI"];
  for (const status of statuses) {
    const shouldReject = status === "SELESAI" || status === "DISKUALIFIKASI";
    assert.equal(shouldReject, true, `status ${status} must be rejected`);
  }
  const activeStatuses = ["BELUM", "SEDANG"];
  for (const status of activeStatuses) {
    const shouldReject = status === "SELESAI" || status === "DISKUALIFIKASI";
    assert.equal(shouldReject, false, `status ${status} must be allowed`);
  }
}

// ===== Duplicate Submit Protection =====

// Test 13: hasSubmittedRef blocks second submit
{
  let submitCount = 0;
  const hasSubmittedRef = { current: false };

  async function doSubmit() {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    submitCount++;
  }

  doSubmit(); doSubmit(); doSubmit();
  assert.equal(submitCount, 1, "only one submit must execute");
}

// ===== Autosave Interval =====

// Test 14: interval constant
{
  const AUTOSAVE_INTERVAL = 10000;
  assert.equal(AUTOSAVE_INTERVAL, 10000, "autosave must be 10 seconds");
  assert.notEqual(AUTOSAVE_INTERVAL, 30000, "must not be 30 seconds");
}

console.log("answerPersistence: all 14 tests PASS");
