import { Bool, Struct } from "o1js";
import { BigIntParams, createBigIntClass } from "./lib/bigint";

export const ProvableBigInt = createBigIntClass(BigIntParams["384_6"]);

export const P =
  0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;

export class Fp extends Struct({
  value: ProvableBigInt,
}) {
  static MODULUS = ProvableBigInt.fromBigint(P);

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
      value: ProvableBigInt.fromBigint(x < 0n ? (x % P) + P : x % P),
    });
  }

  static zero(): Fp {
    return new Fp({ value: ProvableBigInt.zero() });
  }

  static one(): Fp {
    return new Fp({ value: Fp.R }); // One in Montgomery form
  }

  add(other: Fp): Fp {
    return new Fp({
      value: Fp.MODULUS.add(this.value, other.value),
    });
  }

  sub(other: Fp): Fp {
    return new Fp({
      value: Fp.MODULUS.sub(this.value, other.value),
    });
  }

  mul(other: Fp): Fp {
    return new Fp({
      value: Fp.MODULUS.mul(this.value, other.value),
    });
  }

  div(other: Fp): Fp {
    const { quotient, remainder } = Fp.MODULUS.div(this.value, other.value);

    const remainderIsZero = ProvableBigInt.equals(
      remainder,
      ProvableBigInt.zero()
    );
    remainderIsZero.assertFalse();

    return new Fp({
      value: quotient,
    });
  }

  square(): Fp {
    return new Fp({
      value: Fp.MODULUS.pow(this.value, ProvableBigInt.fromBigint(2n)),
    });
  }

  pow(exp: bigint): Fp {
    return new Fp({
      value: Fp.MODULUS.pow(this.value, ProvableBigInt.fromBigint(exp)),
    });
  }

  inverse(): Fp {
    this.isZero().assertFalse();
    // Fermat's Little Theorem
    return new Fp({
      value: Fp.MODULUS.pow(this.value, ProvableBigInt.fromBigint(P - 2n)),
    });
  }

  equals(other: Fp): Bool {
    return ProvableBigInt.equals(this.value, other.value);
  }

  mod(order: Fp): Fp {
    return new Fp({
      value: this.value.mod(order.value),
    });
  }

  isZero(): Bool {
    return ProvableBigInt.equals(this.value, ProvableBigInt.zero());
  }

  negate(): Fp {
    return new Fp({
      value: Fp.MODULUS.negate(this.value),
    });
  }

  sqrt(): Fp {
    // For BLS12-381, p ≡ 3 (mod 4), so we can use the simple formula
    // sqrt(a) = a^((p+1)/4) mod p
    const root = ProvableBigInt.fromBigint((P + 1n) / 4n);

    // make sure the square root is correct
    this.assertEquals(this.mul(this));

    return new Fp({
      value: Fp.MODULUS.pow(this.value, root),
    });
  }

  assertEquals(other: Fp) {
    ProvableBigInt.assertEquals(this.value, other.value);
  }
}
