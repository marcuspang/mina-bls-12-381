import { Provable, Struct, type Bool } from "o1js";
import { Fp } from "./fp";

export class Fp2 extends Struct({
  real: Fp,
  imaginary: Fp,
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
    return new Fp2({ real: Fp.fromBigInt(x), imaginary: Fp.fromBigInt(y) });
  }

  static zero(): Fp2 {
    return new Fp2({ real: Fp.zero(), imaginary: Fp.zero() });
  }

  static one(): Fp2 {
    return new Fp2({ real: Fp.one(), imaginary: Fp.zero() });
  }

  isZero(): Bool {
    return Provable.equal(Fp2, this, Fp2.zero());
  }

  add(other: Fp2): Fp2 {
    return new Fp2({
      real: this.real.add(other.real),
      imaginary: this.imaginary.add(other.imaginary),
    });
  }

  sub(other: Fp2): Fp2 {
    return new Fp2({
      real: this.real.sub(other.real),
      imaginary: this.imaginary.sub(other.imaginary),
    });
  }

  mul(other: Fp2): Fp2 {
    const ac = this.real.mul(other.real);
    const bd = this.imaginary.mul(other.imaginary);
    const ad = this.real.mul(other.imaginary);
    const bc = this.imaginary.mul(other.real);

    return new Fp2({
      real: ac.sub(bd),
      imaginary: ad.add(bc),
    });
  }

  div(other: Fp2): Fp2 {
    other.real.isZero().and(other.imaginary.isZero()).assertFalse();

    // (a + bi)(c - di)/((c + di)(c - di))
    // = (ac + bd + (bc - ad)i)/(c² + d²)
    const norm = other.real.square().add(other.imaginary.square());
    const normInv = norm.inverse();

    const ac = this.real.mul(other.real);
    const bd = this.imaginary.mul(other.imaginary);
    const bc = this.imaginary.mul(other.real);
    const ad = this.real.mul(other.imaginary);

    return new Fp2({
      real: ac.add(bd).mul(normInv),
      imaginary: bc.sub(ad).mul(normInv),
    });
  }

  // (a + bi)² = (a² - b²) + (2ab)i
  square(): Fp2 {
    const a2 = this.real.square();
    const b2 = this.imaginary.square();
    const ab = this.real.mul(this.imaginary);

    return new Fp2({
      real: a2.sub(b2),
      imaginary: ab.add(ab),
    });
  }

  negate(): Fp2 {
    return new Fp2({
      real: this.real.negate(),
      imaginary: this.imaginary.negate(),
    });
  }

  conjugate(): Fp2 {
    return new Fp2({
      real: this.real,
      imaginary: this.imaginary.negate(),
    });
  }

  frobeniusMap(power: number): Fp2 {
    const coefficient = Fp2.FROBENIUS_COEFFICIENTS[power % 2];

    // For Fp2, Frobenius is just conjugation raised to power
    if (power % 2 === 0) {
      return this;
    } else {
      // Conjugate and multiply by coefficient
      return new Fp2({
        real: this.real,
        imaginary: this.imaginary.negate(),
      }).mul(Fp2.fromBigInt(coefficient[0], coefficient[1]));
    }
  }

  inverse(): Fp2 {
    // 1/(a + bi) = (a - bi)/(a² + b²)
    const norm = this.real.square().add(this.imaginary.square());
    const normInv = norm.inverse();

    return new Fp2({
      real: this.real.mul(normInv),
      imaginary: this.imaginary.negate().mul(normInv),
    });
  }

  mulByNonresidue(): Fp2 {
    // For BLS12-381, multiply by (1 + i)
    // (a + bi)(1 + i) = (a - b) + (a + b)i
    return new Fp2({
      real: this.real.sub(this.imaginary),
      imaginary: this.real.add(this.imaginary),
    });
  }

  static equals(a: Fp2, b: Fp2): Bool {
    return Provable.equal(Fp2, a, b);
  }
}
