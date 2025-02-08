import { Bool, Field, Provable, Struct, Unconstrained } from "o1js";
import { createBigIntClass, BigIntParams } from "./lib/bigint";

export const ProvableBigInt = createBigIntClass(BigIntParams["384_6"]);

// BLS12-381 prime modulus
export const FIELD_MODULUS =
  0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;

export class Fp extends Struct({
  value: ProvableBigInt,
}) {
  static MODULUS = ProvableBigInt.fromBigint(FIELD_MODULUS);

  // R = 2^384 mod p
  static R =
    ProvableBigInt.fromBigint(
      0x15f65ec3fa80e4937ce585370525745c071a97a256ec6d760900000002fffdebf4000bc40c00025f489857537c58ban
    );

  // R2 = 2^(384*2) mod p
  static R2 =
    ProvableBigInt.fromBigint(
      0x11988fe592cae3aa9a793e85b519952d67eb88a9939d83c08de5476c4c95b6d50a76e6a609d104f1f4df1f341c341746n
    );

  static fromBigInt(x: bigint): Fp {
    return new Fp({
      value: ProvableBigInt.fromBigint(x % FIELD_MODULUS),
    });
  }

  static fromLimbs(limbs: bigint[]): Fp {
    if (limbs.length !== 6) {
      throw new Error("Expected 6 limbs");
    }
    // Combine limbs into single value (little-endian)
    let value = 0n;
    for (let i = 5; i >= 0; i--) {
      value = (value << 64n) | limbs[i];
    }
    return new Fp({
      value: new ProvableBigInt({
        fields: limbs.map((l) => Field.from(l)),
        value: Unconstrained.from(value),
      }),
    });
  }

  toRawLimbs(): bigint[] {
    // @ts-ignore
    return this.value.toFields().map((f) => f.value[1][1]);
  }

  toBigInt(): bigint {
    return this.value.value.get();
  }

  static add(a: Fp, b: Fp): Fp {
    return new Fp({
      value: Fp.MODULUS.add(a.value, b.value),
    });
  }

  static sub(a: Fp, b: Fp): Fp {
    return new Fp({
      value: Fp.MODULUS.sub(a.value, b.value),
    });
  }

  static mul(a: Fp, b: Fp): Fp {
    return new Fp({
      value: Fp.MODULUS.mul(a.value, b.value),
    });
  }

  square(): Fp {
    return Fp.mul(this, this);
  }

  // Multiplicative inverse using Fermat's Little Theorem
  inverse(): Fp {
    return new Fp({
      value: Fp.MODULUS.pow(
        this.value,
        ProvableBigInt.fromBigint(FIELD_MODULUS - 2n)
      ),
    });
  }

  equals(other: Fp): Bool {
    return ProvableBigInt.equals(this.value, other.value);
  }

  isZero(): Bool {
    return ProvableBigInt.equals(this.value, ProvableBigInt.zero());
  }

  static zero(): Fp {
    return new Fp({ value: ProvableBigInt.zero() });
  }

  static one(): Fp {
    return new Fp({ value: Fp.R }); // One in Montgomery form
  }

  negate(): Fp {
    return new Fp({
      value: Fp.MODULUS.negate(this.value),
    });
  }

  isSquare(): Bool {
    // Euler's criterion: a^((p-1)/2) ≡ 1 (mod p) if a is a quadratic residue
    const exp = ProvableBigInt.fromBigint((FIELD_MODULUS - 1n) / 2n);
    const result = Fp.MODULUS.pow(this.value, exp);
    return ProvableBigInt.equals(result, ProvableBigInt.one());
  }

  sqrt(): Fp {
    // For BLS12-381, p ≡ 3 (mod 4), so we can use the simple formula
    // sqrt(a) = a^((p+1)/4) mod p
    const exp = ProvableBigInt.fromBigint((FIELD_MODULUS + 1n) / 4n);
    return new Fp({
      value: Fp.MODULUS.pow(this.value, exp),
    });
  }
}
