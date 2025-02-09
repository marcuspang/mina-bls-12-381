import { type Bool, Field, Gadgets, Provable, Struct } from "o1js";
import { Fp2 } from "./fp2";

export const FP6_FROBENIUS_COEFFICIENTS_1 = [
  Fp2.fromBigInt(0x1n, 0x0n),
  Fp2.fromBigInt(
    0x0n,
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn
  ),
  Fp2.fromBigInt(
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen,
    0x0n
  ),
  Fp2.fromBigInt(0x0n, 0x1n),
  Fp2.fromBigInt(
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn,
    0x0n
  ),
  Fp2.fromBigInt(
    0x0n,
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen
  ),
];

export const FP6_FROBENIUS_COEFFICIENTS_2 = [
  Fp2.fromBigInt(0x1n, 0x0n),
  Fp2.fromBigInt(
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaadn,
    0x0n
  ),
  Fp2.fromBigInt(
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn,
    0x0n
  ),
  Fp2.fromBigInt(
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaan,
    0x0n
  ),
  Fp2.fromBigInt(
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen,
    0x0n
  ),
  Fp2.fromBigInt(
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffeffffn,
    0x0n
  ),
];

// Fp6 = Fp2[v]/(v³ - ξ) where ξ = u + 1
export class Fp6 extends Struct({
  c0: Fp2, // a + bv + cv^2
  c1: Fp2,
  c2: Fp2,
}) {
  static zero(): Fp6 {
    Provable.log("[Fp6] zero");
    return new Fp6({
      c0: Fp2.zero(),
      c1: Fp2.zero(),
      c2: Fp2.zero(),
    });
  }

  static one(): Fp6 {
    Provable.log("[Fp6] one");
    return new Fp6({
      c0: Fp2.one(),
      c1: Fp2.zero(),
      c2: Fp2.zero(),
    });
  }

  equals(other: Fp6): Bool {
    Provable.log("[Fp6] equals", this, other);
    return Fp2.equals(this.c0, other.c0)
      .and(Fp2.equals(this.c1, other.c1))
      .and(Fp2.equals(this.c2, other.c2));
  }

  add(other: Fp6): Fp6 {
    Provable.log("[Fp6] add", this, other);
    return new Fp6({
      c0: this.c0.add(other.c0),
      c1: this.c1.add(other.c1),
      c2: this.c2.add(other.c2),
    });
  }

  sub(other: Fp6): Fp6 {
    Provable.log("[Fp6] sub", this, other);
    return new Fp6({
      c0: this.c0.sub(other.c0),
      c1: this.c1.sub(other.c1),
      c2: this.c2.sub(other.c2),
    });
  }

  mul(other: Fp6): Fp6 {
    Provable.log("[Fp6] mul", this, other);
    const { c0, c1, c2 } = this;
    const { c0: r0, c1: r1, c2: r2 } = other;

    // v0 = a0·b0
    const t0 = c0.mul(r0);
    // v1 = a1·b1
    const t1 = c1.mul(r1);
    // v2 = a2·b2
    const t2 = c2.mul(r2);

    return new Fp6({
      c0: t0.add(c1.add(c2).mul(r1.add(r2)).sub(t1).sub(t2).mulByNonresidue()),
      c1: c0.add(c1).mul(r0.add(r1)).sub(t0).sub(t1).add(t2.mulByNonresidue()),
      c2: c0.add(c2).mul(r0.add(r2)).sub(t0).add(t1).sub(t2),
    });
  }

  square(): Fp6 {
    Provable.log("[Fp6] square", this);
    const s0 = this.c0.square();
    const ab = this.c0.mul(this.c1);
    const s1 = ab.add(ab); // 2ab
    const s2 = this.c0.sub(this.c1).add(this.c2).square(); // (a-b+c)²
    const bc = this.c1.mul(this.c2);
    const s3 = bc.add(bc); // 2bc
    const s4 = this.c2.square();

    return new Fp6({
      c0: s3.mulByNonresidue().add(s0), // 2bc·ξ + a²
      c1: s4.mulByNonresidue().add(s1), // c²·ξ + 2ab
      c2: s1.add(s2).add(s3).sub(s0).sub(s4), // 2ab + (a-b+c)² + 2bc - a² - c²
    });
  }

  negate(): Fp6 {
    Provable.log("[Fp6] negate", this);
    return new Fp6({
      c0: this.c0.negate(),
      c1: this.c1.negate(),
      c2: this.c2.negate(),
    });
  }

  frobeniusMap(power: Field): Fp6 {
    Provable.log("[Fp6] frobeniusMap", this, power);
    const remainderIsOne = Gadgets.and(power, Field(1), 64).equals(Field(1));
    const remainderIsTwo = Gadgets.and(power, Field(2), 64).equals(Field(2));
    const remainderIsThree = Gadgets.and(power, Field(3), 64).equals(Field(3));
    const remainderIsFour = Gadgets.and(power, Field(4), 64).equals(Field(4));
    const remainderIsFive = Gadgets.and(power, Field(5), 64).equals(Field(5));

    const coefficient = Provable.switch(
      [
        remainderIsOne,
        remainderIsTwo,
        remainderIsThree,
        remainderIsFour,
        remainderIsFive,
      ],
      Provable.Array(Fp2, 2),
      [
        [FP6_FROBENIUS_COEFFICIENTS_1[0], FP6_FROBENIUS_COEFFICIENTS_2[0]],
        [FP6_FROBENIUS_COEFFICIENTS_1[1], FP6_FROBENIUS_COEFFICIENTS_2[1]],
        [FP6_FROBENIUS_COEFFICIENTS_1[2], FP6_FROBENIUS_COEFFICIENTS_2[2]],
        [FP6_FROBENIUS_COEFFICIENTS_1[3], FP6_FROBENIUS_COEFFICIENTS_2[3]],
        [FP6_FROBENIUS_COEFFICIENTS_1[4], FP6_FROBENIUS_COEFFICIENTS_2[4]],
      ]
    );
    return new Fp6({
      c0: this.c0.frobeniusMap(power),
      c1: this.c1.frobeniusMap(power).mul(coefficient[0]),
      c2: this.c2.frobeniusMap(power).mul(coefficient[1]),
    });
  }

  // Multiply by quadratic nonresidue v
  mulByNonresidue(): Fp6 {
    Provable.log("[Fp6] mulByNonresidue", this);
    // For BLS12-381, the quadratic non-residue is ξ = u + 1
    // where u is the quadratic non-residue in Fp2
    // This is equivalent to multiplying by (u + 1)
    return new Fp6({
      c0: this.c2.mulByNonresidue(), // c2 * ξ
      c1: this.c0, // c0
      c2: this.c1, // c1
    });
  }

  inverse(): Fp6 {
    Provable.log("[Fp6] inverse", this);
    const { c0, c1, c2 } = this;
    // t0 = c0² - (c2 * c1 * ξ)
    const t0 = c0.square().sub(c2.mul(c1).mulByNonresidue());
    // t1 = (c2² * ξ) - (c0 * c1)
    const t1 = c2.square().mulByNonresidue().sub(c0.mul(c1));
    // t2 = c1² - (c0 * c2)
    const t2 = c1.square().sub(c0.mul(c2));

    // Calculate determinant: c2 * t1 + c1 * t2 first, then multiply by ξ and add c0 * t0
    const temp = c2.mul(t1).add(c1.mul(t2));
    const determinant = temp.mulByNonresidue().add(c0.mul(t0));
    const invDet = determinant.inverse();
    return new Fp6({
      c0: t0.mul(invDet),
      c1: t1.mul(invDet),
      c2: t2.mul(invDet),
    });
  }
}
