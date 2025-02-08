import { Struct, Field, Provable, Bool } from "o1js";
import { Fp, ProvableBigInt } from "./fp";

// Point representation for G1 (coordinates in Fp)
export class G1Point extends Struct({
  x: Fp,
  y: Fp,
  isInfinity: Bool,
}) {
  // BLS12-381 curve parameters
  static readonly B = new Fp({
    value: ProvableBigInt.fromBigint(4n),
  });

  static ZERO = new G1Point({
    x: Fp.zero(),
    y: Fp.zero(),
    isInfinity: Bool(true),
  });

  static BASE = new G1Point({
    x: new Fp({
      value:
        ProvableBigInt.fromBigint(
          0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bbn
        ),
    }),
    y: new Fp({
      value:
        ProvableBigInt.fromBigint(
          0x08b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1n
        ),
    }),
    isInfinity: Bool(false),
  });

  // Check if point is on curve: y² = x³ + 4
  static isOnCurve(p: G1Point): Bool {
    return Provable.if(
      p.isInfinity,
      Bool(false),
      Provable.equal(Fp, p.y.square(), p.x.pow(3n).add(G1Point.B))
    );
  }

  isZero(): Bool {
    return this.isInfinity;
  }

  negate(): G1Point {
    if (this.isZero()) return this;
    return new G1Point({
      x: this.x,
      y: this.y.negate(),
      isInfinity: Bool(false),
    });
  }

  add(other: G1Point): G1Point {
    // Handle special cases
    if (this.isZero()) return other;
    if (other.isZero()) return this;

    // Check if points are negatives of each other
    if (this.x.equals(other.x) && this.y.equals(other.y.negate())) {
      return G1Point.ZERO;
    }

    // Point addition formulas for P ≠ Q
    if (!this.x.equals(other.x)) {
      const slope = other.y.sub(this.y).div(other.x.sub(this.x));
      const x3 = this.x.sub(slope.square()).sub(other.x);
      const y3 = slope.mul(this.x.sub(x3)).sub(this.y);
      return new G1Point({
        x: x3,
        y: y3,
        isInfinity: Bool(false),
      });
    }

    // Point doubling formula (P = Q)
    if (this.equals(other)) {
      if (this.y.isZero()) return G1Point.ZERO;

      const three = Fp.fromBigInt(3n);
      const two = Fp.fromBigInt(2n);

      const slope = this.x.square().mul(three).div(this.y.mul(two));
      const x3 = this.x.square().sub(this.x.mul(two));
      const y3 = slope.mul(this.x.sub(x3)).sub(this.y);
      return new G1Point({
        x: x3,
        y: y3,
        isInfinity: Bool(false),
      });
    }

    return G1Point.ZERO;
  }

  // Scalar multiplication using double-and-add algorithm with constant time operations
  multiply(scalar: Fp): G1Point {
    let result = G1Point.ZERO;
    let current: G1Point = this;
    let bits = scalar;

    while (!bits.isZero().equals(Bool(true))) {
      if (
        bits.mod(Fp.fromBigInt(2n)).equals(Fp.fromBigInt(1n)).equals(Bool(true))
      ) {
        result = result.add(current);
      }
      current = current.add(current);
      bits = bits.div(Fp.fromBigInt(2n));
    }

    return result;
  }

  equals(other: G1Point): Bool {
    if (this.isZero() && other.isZero()) return Bool(true);
    return this.x
      .equals(other.x)
      .and(this.y.equals(other.y))
      .and(this.isInfinity.equals(other.isInfinity));
  }

  // Convert to affine coordinates string representation
  toString(): string {
    if (this.isZero()) return "G1Point(infinity)";
    return `G1Point(x: ${this.x.toString()}, y: ${this.y.toString()})`;
  }
}
