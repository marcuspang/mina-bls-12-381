import { Provable, Struct } from "o1js";
import { Fp2 } from "./fp2";

const FP6_FROBENIUS_COEFFICIENTS_1 = [
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

const FP6_FROBENIUS_COEFFICIENTS_2 = [
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
    const v0 = this.c0.mul(other.c0);
    const v1 = this.c1.mul(other.c1);
    const v2 = this.c2.mul(other.c2);

    return new Fp6({
      c0: v0.add(
        this.c1
          .add(this.c2)
          .mul(other.c1.add(other.c2))
          .sub(v1)
          .sub(v2)
          .mulByNonresidue()
      ),
      c1: this.c0
        .add(this.c1)
        .mul(other.c0.add(other.c1))
        .sub(v0)
        .sub(v1)
        .add(v2.mulByNonresidue()),
      c2: this.c0
        .add(this.c2)
        .mul(other.c0.add(other.c2))
        .sub(v0)
        .add(v1)
        .sub(v2),
    });
  }

  square(): Fp6 {
    Provable.log("[Fp6] square", this);
    const v0 = this.c0.square();
    const v1 = this.c1.mul(this.c2).add(this.c1.mul(this.c2));
    const v2 = this.c2.square();
    const c0 = v0.add(v1.mulByNonresidue());
    const c1 = this.c0.add(this.c1).square().sub(v0).sub(v1);
    const c2 = this.c0.add(this.c2).square().sub(v0).sub(v2).add(v1);

    return new Fp6({ c0, c1, c2 });
  }

  negate(): Fp6 {
    Provable.log("[Fp6] negate", this);
    return new Fp6({
      c0: this.c0.negate(),
      c1: this.c1.negate(),
      c2: this.c2.negate(),
    });
  }

  frobeniusMap(power: number): Fp6 {
    Provable.log("[Fp6] frobeniusMap", this, power);
    return new Fp6({
      c0: this.c0.frobeniusMap(power),
      c1: this.c1
        .frobeniusMap(power)
        .mul(FP6_FROBENIUS_COEFFICIENTS_1[power % 6]),
      c2: this.c2
        .frobeniusMap(power)
        .mul(FP6_FROBENIUS_COEFFICIENTS_2[power % 6]),
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
    const c0 = this.c0.square().sub(this.c1.mul(this.c2).mulByNonresidue());
    const c1 = this.c2.square().mulByNonresidue().sub(this.c0.mul(this.c1));
    const c2 = this.c1.square().sub(this.c0.mul(this.c2));
    const t = this.c0
      .mul(c0)
      .add(this.c1.mul(c1))
      .add(this.c2.mul(c2))
      .inverse();

    return new Fp6({
      c0: c0.mul(t),
      c1: c1.mul(t),
      c2: c2.mul(t),
    });
  }
}
