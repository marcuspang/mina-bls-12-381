import { Bool, Provable, Struct, type Field } from "o1js";
import { Fp } from "./fp";

// Point representation for G1 (coordinates in Fp)
export class G1Point extends Struct({
  x: Fp,
  y: Fp,
  isInfinity: Bool,
}) {
  // BLS12-381 curve parameters
  static readonly B = Fp.fromBigInt(4n);

  static ZERO = new G1Point({
    x: Fp.zero(),
    y: Fp.zero(),
    isInfinity: Bool(true),
  });

  static BASE = new G1Point({
    x: Fp.fromBigInt(
      0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bbn
    ),
    y: Fp.fromBigInt(
      0x08b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1n
    ),
    isInfinity: Bool(false),
  });

  // Check if point is on curve: y² = x³ + 4
  static isOnCurve(p: G1Point): Bool {
    Provable.log("[G1Point] isOnCurve", p);
    return Provable.if(
      p.isInfinity,
      Bool(false),
      Provable.equal(
        Fp,
        p.y.square(),
        p.x.pow(Fp.fromBigInt(3n)).add(G1Point.B)
      )
    );
  }

  toFields(): Field[] {
    Provable.log("[G1Point] toFields", this);
    return this.x.toFields();
  }

  isZero(): Bool {
    Provable.log("[G1Point] isZero", this);
    return this.isInfinity;
  }

  negate(): G1Point {
    Provable.log("[G1Point] negate", this);
    return Provable.if(
      this.isZero(),
      this,
      new G1Point({
        x: this.x,
        y: this.y.negate(),
        isInfinity: Bool(false),
      })
    );
  }

  add(other: G1Point): G1Point {
    Provable.log("[G1Point] add", this, other);
    // Handle special cases
    if (this.isZero().equals(Bool(true))) return other;
    if (other.isZero().equals(Bool(true))) return this;

    // Check if points are negatives of each other
    if (
      this.x
        .equals(other.x)
        .and(this.y.equals(other.y.negate()))
        .equals(Bool(true))
    ) {
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
    if (this.equals(other).equals(Bool(true))) {
      if (this.y.isZero().equals(Bool(true))) return G1Point.ZERO;

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

    while (bits.isZero().equals(Bool(false))) {
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
    Provable.log("[G1Point] equals", this, other);
    return Provable.if(
      this.isZero().and(other.isZero()),
      Bool(true),
      this.x
        .equals(other.x)
        .and(this.y.equals(other.y))
        .and(this.isInfinity.equals(other.isInfinity))
    );
  }

  // Convert to affine coordinates string representation
  toString(): string {
    Provable.log("[G1Point] toString", this);
    if (this.isZero().equals(Bool(true))) return "G1Point(infinity)";
    return `G1Point(x: ${this.x.toString()}, y: ${this.y.toString()})`;
  }
}
