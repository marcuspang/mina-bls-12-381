import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { P, Fp } from "./fp";

const NUM_RUNS = Number(process.env.RUNS_COUNT || 10); // reduce to 1 to shorten test time
fc.configureGlobal({ numRuns: NUM_RUNS });
const FC_BIGINT = fc.bigInt(1n, P - 1n);

describe("bls12-381 Fp", () => {
  it("equality", () => {
    fc.assert(
      fc.property(FC_BIGINT, (num) => {
        const a = Fp.fromBigInt(num);
        const b = Fp.fromBigInt(num);
        expect(a.equals(b).toBoolean()).toBe(true);
        expect(b.equals(a).toBoolean()).toBe(true);
      })
    );
  });
  it("non-equality", () => {
    fc.assert(
      fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
        const a = Fp.fromBigInt(num1);
        const b = Fp.fromBigInt(num2);
        expect(a.equals(b).toBoolean()).toBe(num1 === num2);
        expect(b.equals(a).toBoolean()).toBe(num1 === num2);
      })
    );
  });
  describe("add/subtract", () => {
    it("commutativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          expect(a.add(b).equals(b.add(a)).toBoolean()).toBe(true);
        })
      );
    });
    it("associativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);
          expect(a.add(b.add(c)).equals(a.add(b).add(c)).toBoolean()).toBe(
            true
          );
        })
      );
    });
    it("x+0=x", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.add(Fp.zero()).equals(a).toBoolean()).toBe(true);
        })
      );
    });
    it("x-0=x", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.sub(Fp.zero()).equals(a).toBoolean()).toBe(true);
          expect(a.sub(a).equals(Fp.zero()).toBoolean()).toBe(true);
        })
      );
    });
    it("negate equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num1) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num1);
          expect(a.sub(Fp.zero()).equals(a.negate()).toBoolean()).toBe(true);
          expect(a.sub(a).equals(Fp.zero()).toBoolean()).toBe(true);
          expect(a.sub(b).equals(a.add(b.negate())).toBoolean()).toBe(true);
          expect(a.sub(b).equals(a.add(b.negate())).toBoolean()).toBe(true);
        })
      );
    });
    it("negate", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.negate().equals(Fp.zero().sub(a)).toBoolean()).toBe(true);
          expect(
            a
              .negate()
              .equals(a.mul(Fp.fromBigInt(-1n)))
              .toBoolean()
          ).toBe(true);
        })
      );
    });
  });
  describe("multiply", () => {
    it("commutativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          expect(a.mul(b).equals(b.mul(a)).toBoolean()).toBe(true);
        })
      );
    });
    it("associativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);
          expect(a.mul(b.mul(c)).equals(a.mul(b).mul(c)).toBoolean()).toBe(
            true
          );
        })
      );
    });
    it("distributivity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);
          expect(
            a
              .mul(b.add(c))
              .equals(b.mul(a).add(c.mul(a)))
              .toBoolean()
          ).toBe(true);
        })
      );
    });
    it("add equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.mul(Fp.zero()).equals(Fp.zero()).toBoolean()).toBe(true);
          expect(a.mul(Fp.zero()).equals(Fp.zero()).toBoolean()).toBe(true);
          expect(a.mul(Fp.one()).equals(a).toBoolean()).toBe(true);
          expect(a.mul(Fp.one()).equals(a).toBoolean()).toBe(true);
          expect(a.mul(Fp.fromBigInt(2n)).equals(a.add(a)).toBoolean()).toBe(
            true
          );
          expect(
            a.mul(Fp.fromBigInt(3n)).equals(a.add(a).add(a)).toBoolean()
          ).toBe(true);
          expect(
            a.mul(Fp.fromBigInt(4n)).equals(a.add(a).add(a).add(a)).toBoolean()
          ).toBe(true);
        })
      );
    });
    it("square equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.mul(a).equals(a.square()).toBoolean()).toBe(true);
        })
      );
    });
    it("pow equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.pow(0n).equals(Fp.one()).toBoolean()).toBe(true);
          expect(a.pow(1n).equals(a).toBoolean()).toBe(true);
          expect(a.pow(2n).equals(a.mul(a)).toBoolean()).toBe(true);
          expect(a.pow(3n).equals(a.mul(a).mul(a)).toBoolean()).toBe(true);
        })
      );
    });
    it("sqrt", () => {
      let sqr1 = Fp.fromBigInt(300855555557n).sqrt();
      expect(sqr1 && sqr1.value.toString()).toEqual(
        "364533921369419647282142659217537440628656909375169620464770009670699095647614890229414882377952296797827799113624"
      );
      expect(Fp.fromBigInt(72057594037927816n).sqrt()).toBeUndefined();
    });
  });
  describe("div", () => {
    it("division by one equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.div(Fp.one()).equals(a).toBoolean()).toBe(true);
          expect(a.div(a).equals(Fp.one()).toBoolean()).toBe(true);
        })
      );
    });
    it("division by zero equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(Fp.zero().div(a).equals(Fp.zero()).toBoolean()).toBe(true);
        })
      );
    });
    it("division distributivity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);
          expect(
            a.add(b).div(c).equals(a.div(c).add(b.div(c))).toBoolean()
          ).toBe(true);
        })
      );
    });
    it("division and multiplication equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          expect(a.div(b).equals(a.mul(b.inverse())).toBoolean()).toBe(
            true
          );
        })
      );
    });
  });
});
