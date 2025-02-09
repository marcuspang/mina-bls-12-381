import { describe, expect, it, test } from "bun:test";
import { Fp2 } from "./fp2";
import { Fp6 } from "./fp6";

describe("fp6", () => {
  test("inverse", () => {
    it("should work", () => {
      const a = new Fp6({
        c0: Fp2.fromBigInt(2n, 2n),
        c1: Fp2.fromBigInt(3n, 5n),
        c2: Fp2.fromBigInt(4n, 6n),
      });

      const b = a.inverse();
      expect(b.inverse().equals(a));
    });
  });
});
