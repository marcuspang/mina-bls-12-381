import { type Bool, Provable, Struct } from "o1js";
import { Fp } from "./fp";

export class Fp2 extends Struct({
  c0: Fp,
  c1: Fp,
}) {
  private static readonly FROBENIUS_COEFFICIENTS = [
    // x^(p^0) = x^1 = x
    [1n, 0n],
    // x^(p^1) = x^p = conjugate(x)
    [
      1n,
      0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn,
    ],
  ];

  static fromBigInt(x: bigint, y: bigint): Fp2 {
    Provable.log("[Fp2] fromBigInt", x, y);
    return new Fp2({ c0: Fp.fromBigInt(x), c1: Fp.fromBigInt(y) });
  }

  static zero(): Fp2 {
    Provable.log("[Fp2] zero");
    return new Fp2({ c0: Fp.zero(), c1: Fp.zero() });
  }

  static one(): Fp2 {
    Provable.log("[Fp2] one");
    return new Fp2({ c0: Fp.one(), c1: Fp.zero() });
  }

  isZero(): Bool {
    Provable.log("[Fp2] isZero");
    return Provable.equal(Fp2, this, Fp2.zero());
  }

  add(other: Fp2): Fp2 {
    Provable.log("[Fp2] add", other);
    return new Fp2({
      c0: this.c0.add(other.c0),
      c1: this.c1.add(other.c1),
    });
  }

  sub(other: Fp2): Fp2 {
    Provable.log("[Fp2] sub", other);
    return new Fp2({
      c0: this.c0.sub(other.c0),
      c1: this.c1.sub(other.c1),
    });
  }

  mul(other: Fp2): Fp2 {
    Provable.log("[Fp2] mul", other);
    // karatsuba
    const t1 = this.c0.mul(other.c0); // c0 * o0
    const t2 = this.c1.mul(other.c1); // c1 * o1
    return new Fp2({
      c0: t1.sub(t2), // t1 - t2
      c1: this.c0.add(this.c1).mul(other.c0.add(other.c1)).sub(t1.add(t2)), // (c0 + c1)(o0 + o1) - (t1 + t2)
    });
  }

  div(other: Fp2): Fp2 {
    Provable.log("[Fp2] div", other);
    return this.mul(other.inverse());
    // other.c0.isZero().and(other.c1.isZero()).assertFalse();

    // // (a + bi)(c - di)/((c + di)(c - di))
    // // = (ac + bd + (bc - ad)i)/(c² + d²)
    // const norm = other.c0.square().add(other.c1.square());
    // const normInv = norm.inverse();

    // const ac = this.c0.mul(other.c0);
    // const bd = this.c1.mul(other.c1);
    // const bc = this.c1.mul(other.c0);
    // const ad = this.c0.mul(other.c1);

    // return new Fp2({
    //   c0: ac.add(bd).mul(normInv),
    //   c1: bc.sub(ad).mul(normInv),
    // });
  }

  // (a + bi)² = (a² - b²) + (2ab)i
  square(): Fp2 {
    Provable.log("[Fp2] square");
    const a = this.c0;
    const b = this.c1;
    const ab = a.mul(b);

    return new Fp2({
      c0: a.add(b).mul(a.sub(b)), // (a+b)(a-b)
      c1: ab.add(ab), // 2ab
    });
  }

  negate(): Fp2 {
    Provable.log("[Fp2] negate");
    return new Fp2({
      c0: this.c0.negate(),
      c1: this.c1.negate(),
    });
  }

  conjugate(): Fp2 {
    Provable.log("[Fp2] conjugate");
    return new Fp2({
      c0: this.c0,
      c1: this.c1.negate(),
    });
  }

  // TODO: change param type
  frobeniusMap(power: number): Fp2 {
    Provable.log("[Fp2] frobeniusMap", power);
    const coefficient = Fp2.FROBENIUS_COEFFICIENTS[power % 2];

    // For Fp2, Frobenius is just conjugation raised to power
    if (power % 2 === 0) {
      return this;
    }
    return new Fp2({
      c0: this.c0,
      c1: this.c1.mul(Fp.fromBigInt(coefficient[1])),
    });
  }

  inverse(): Fp2 {
    Provable.log("[Fp2] inverse");
    // (a + bi)^(-1) = (a - bi)/(a² + b²)
    const factor = this.c0.square().add(this.c1.square()).inverse();
    return new Fp2({
      c0: this.c0.mul(factor),
      c1: this.c1.negate().mul(factor),
    });
  }

  mulByNonresidue(): Fp2 {
    Provable.log("[Fp2] mulByNonresidue");
    // For BLS12-381, multiply by (1 + i)
    // (a + bi)(1 + i) = (a - b) + (a + b)i
    return new Fp2({
      c0: this.c0.sub(this.c1),
      c1: this.c0.add(this.c1),
    });
  }

  static equals(a: Fp2, b: Fp2): Bool {
    Provable.log("[Fp2] equals", a, b);
    return Provable.equal(Fp2, a, b);
  }
}
