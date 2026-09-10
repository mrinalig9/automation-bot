import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./index";

describe("withRetry", () => {

  it("returns the result when the operation succeeds on the first try", async () => {
    // An operation that always succeeds
    const operation = vi.fn(async () => "success");

    const result = await withRetry(operation, "test-success");

    expect(result).toBe("success");        // it returned the value
    expect(operation).toHaveBeenCalledTimes(1);  // it only ran once (no retries needed)
  });

  it("retries and eventually succeeds after some failures", async () => {
    let attempts = 0;
    // Fails the first 2 times, succeeds on the 3rd
    const operation = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error("temporary failure");
      }
      return "success";
    });

    const result = await withRetry(operation, "test-eventual-success");

    expect(result).toBe("success");        // it eventually succeeded
    expect(operation).toHaveBeenCalledTimes(3);  // it took 3 attempts
  });

  it("throws after exhausting all attempts", async () => {
    // An operation that always fails
    const operation = vi.fn(async () => {
      throw new Error("permanent failure");
    });

    // Expect the whole thing to reject/throw
    await expect(
      withRetry(operation, "test-exhaustion", 3)
    ).rejects.toThrow("Failed after 3 attempts");

    expect(operation).toHaveBeenCalledTimes(3);  // it tried exactly 3 times
  });

});