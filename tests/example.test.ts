/**
 * Example test to verify testing setup
 */

import { describe, it, expect } from "vitest";

describe("Testing Setup", () => {
  it("should run basic tests", () => {
    expect(true).toBe(true);
  });

  it("should have access to vitest globals", () => {
    expect(expect).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
  });

  it("should perform basic assertions", () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
