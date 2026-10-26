import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldPublishTimer } from "./timer.ts";

describe("限时刷新", () => {
  it("同一秒内不刷新，跨过整秒或时间到了才刷新", () => {
    assert.equal(shouldPublishTimer(90, 0), false);
    assert.equal(shouldPublishTimer(90, 0.2), false);
    assert.equal(shouldPublishTimer(90.2, 0.1), false);
    assert.equal(shouldPublishTimer(90, 1), true);
    assert.equal(shouldPublishTimer(0.4, 0.5), true);
    assert.equal(shouldPublishTimer(0, 1), false);
    assert.equal(shouldPublishTimer(Number.NaN, 1), false);
    assert.equal(shouldPublishTimer(10, Number.NaN), false);
  });
});
