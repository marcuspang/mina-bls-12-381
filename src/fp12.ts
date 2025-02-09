import { type Bool, Provable, Struct } from "o1js";
import { Fp2 } from "./fp2";
import { Fp6 } from "./fp6";

const FP12_FROBENIUS_COEFFICIENTS = [
  Fp2.fromBigInt(0x1n, 0x0n),
  Fp2.fromBigInt(
    0x1904d3bf02bb0667c231beb4202c0d1f0fd603fd3cbd5f4f7b2443d784bab9c4f67ea53d63e7813d8d0775ed92235fb8n,
    0x00fc3e2b36c4e03288e9e902231f9fb854a14787b6c7b36fec0c8ec971f63c5f282d5ac14d6c7ec22cf78a126ddc4af3n
  ),
  Fp2.fromBigInt(
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffeffffn,
    0x0n
  ),
  Fp2.fromBigInt(
    0x135203e60180a68ee2e9c448d77a2cd91c3dedd930b1cf60ef396489f61eb45e304466cf3e67fa0af1ee7b04121bdea2n,
    0x06af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09n
  ),
  Fp2.fromBigInt(
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen,
    0x0n
  ),
  Fp2.fromBigInt(
    0x144e4211384586c16bd3ad4afa99cc9170df3560e77982d0db45f3536814f0bd5871c1908bd478cd1ee605167ff82995n,
    0x05b2cfd9013a5fd8df47fa6b48b1e045f39816240c0b8fee8beadf4d8e9c0566c63a3e6e257f87329b18fae980078116n
  ),
  Fp2.fromBigInt(
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaan,
    0x0n
  ),
  Fp2.fromBigInt(
    0x00fc3e2b36c4e03288e9e902231f9fb854a14787b6c7b36fec0c8ec971f63c5f282d5ac14d6c7ec22cf78a126ddc4af3n,
    0x1904d3bf02bb0667c231beb4202c0d1f0fd603fd3cbd5f4f7b2443d784bab9c4f67ea53d63e7813d8d0775ed92235fb8n
  ),
  Fp2.fromBigInt(
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn,
    0x0n
  ),
  Fp2.fromBigInt(
    0x06af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09n,
    0x135203e60180a68ee2e9c448d77a2cd91c3dedd930b1cf60ef396489f61eb45e304466cf3e67fa0af1ee7b04121bdea2n
  ),
  Fp2.fromBigInt(
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaadn,
    0x0n
  ),
  Fp2.fromBigInt(
    0x05b2cfd9013a5fd8df47fa6b48b1e045f39816240c0b8fee8beadf4d8e9c0566c63a3e6e257f87329b18fae980078116n,
    0x144e4211384586c16bd3ad4afa99cc9170df3560e77982d0db45f3536814f0bd5871c1908bd478cd1ee605167ff82995n
  ),
];

// The pairing result lives in Fp12, built as a tower:
// Fp2 = Fp[u]/(u^2 + 1)
// Fp6 = Fp2[v]/(v^3 - (u + 1))
// Fp12 = Fp6[w]/(w^2 - v)
export class Fp12 extends Struct({
  c0: Fp6,
  c1: Fp6,
}) {
  static zero(): Fp12 {
    Provable.log("[Fp12] zero");
    return new Fp12({
      c0: Fp6.zero(),
      c1: Fp6.zero(),
    });
  }

  static one(): Fp12 {
    Provable.log("[Fp12] one");
    return new Fp12({
      c0: Fp6.one(),
      c1: Fp6.zero(),
    });
  }

  static equals(a: Fp12, b: Fp12): Bool {
    Provable.log("[Fp12] equals", a, b);
    return Provable.equal(Fp12, a, b);
  }

  add(other: Fp12): Fp12 {
    Provable.log("[Fp12] add", this, other);
    return new Fp12({
      c0: this.c0.add(other.c0),
      c1: this.c1.add(other.c1),
    });
  }

  mul(other: Fp12): Fp12 {
    Provable.log("[Fp12] mul", this, other);
    const v0 = this.c0.mul(other.c0);
    const v1 = this.c1.mul(other.c1);
    return new Fp12({
      c0: v1.mulByNonresidue().add(v0),
      c1: this.c0.add(this.c1).mul(other.c0.add(other.c1)).sub(v0).sub(v1),
    });
  }

  square(): Fp12 {
    Provable.log("[Fp12] square", this);
    const { c0, c1 } = this;
    // (a + bi)² = (a + b)(a - b) + 2abi
    return new Fp12({
      c0: c1.mulByNonresidue().add(c0).mul(c0.sub(c1.mulByNonresidue())),
      c1: c0.add(c0).mul(c1),
    });
  }

  conjugate(): Fp12 {
    Provable.log("[Fp12] conjugate", this);
    return new Fp12({
      c0: this.c0,
      c1: this.c1.negate(),
    });
  }

  frobeniusMap(power: number): Fp12 {
    Provable.log("[Fp12] frobeniusMap", this, power);
    const r0 = this.c0.frobeniusMap(power);
    const { c0, c1, c2 } = this.c1.frobeniusMap(power);

    const coeff = FP12_FROBENIUS_COEFFICIENTS[power % 12];
    return new Fp12({
      c0: r0,
      c1: new Fp6({
        c0: c0.mul(coeff),
        c1: c1.mul(coeff),
        c2: c2.mul(coeff),
      }),
    });
  }

  finalExponentiation(): Fp12 {
    Provable.log("[Fp12] finalExponentiation", this);
    // (p^12 - 1)/r = (p^12 - 1)/Φ_12(p) ⋅ Φ_12(p)/r
    const t0 = this.conjugate();
    const t1 = this.inverse();
    const t2 = t0.mul(t1);
    const t3 = t2.frobeniusMap(2);
    const t4 = t3.mul(t2);
    // Now t4 = this^((p^6 - 1)(p^2 + 1))
    return t4;
  }

  inverse(): Fp12 {
    Provable.log("[Fp12] inverse", this);
    const t0 = this.c0.square();
    const t1 = this.c1.square();
    const t2 = t0.sub(t1);
    const t3 = t2.inverse();
    return new Fp12({
      c0: this.c0.mul(t3),
      c1: this.c1.mul(t3).negate(),
    });
  }
}
