import { Bool, type Field, Provable, Struct } from "o1js";
import { Fp } from "./fp";
import { Fp2 } from "./fp2";

// G2Point representation (coordinates in Fp2)
export class G2Point extends Struct({
  x: Fp2,
  y: Fp2,
  isInfinity: Bool,
}) {
  // BLS12-381 curve parameters for G2: y² = x³ + 4(1+i)
  static readonly B = new Fp2({
    c0: Fp.fromBigInt(4n),
    c1: Fp.fromBigInt(4n),
  });

  static ZERO = new G2Point({
    x: Fp2.zero(),
    y: Fp2.zero(),
    isInfinity: Bool(true),
  });

  static BASE = new G2Point({
    x: new Fp2({
      c0: Fp.fromBigInt(
        0x024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8n
      ),
      c1: Fp.fromBigInt(
        0x13e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7en
      ),
    }),
    y: new Fp2({
      c0: Fp.fromBigInt(
        0x0ce5d527727d6e118cc9cdc6da2e351aadfd9baa8cbdd3a76d429a695160d12c923ac9cc3baca289e193548608b82801n
      ),
      c1: Fp.fromBigInt(
        0x0606c4a02ea734cc32acd2b02bc28b99cb3e287e85a763af267492ab572e99ab3f370d275cec1da1aaa9075ff05f79ben
      ),
    }),
    isInfinity: Bool(false),
  });

  // Check if point is on curve: y² = x³ + 4(1+i)
  static isOnCurve(p: G2Point): Bool {
    Provable.log("[G2Point] isOnCurve", p);
    return Provable.if(
      p.isInfinity,
      Bool(false),
      Provable.equal(Fp2, p.y.square(), p.x.mul(p.x).mul(p.x).add(G2Point.B))
    );
  }

  toFields(): Field[] {
    Provable.log("[G2Point] toFields", this);
    // TODO: to avoid type error
    return this.x.c0.toFields();
  }

  isZero(): Bool {
    Provable.log("[G2Point] isZero", this);
    return this.isInfinity;
  }

  negate(): G2Point {
    Provable.log("[G2Point] negate", this);
    return Provable.if(
      this.isZero(),
      this,
      new G2Point({
        x: this.x,
        y: this.y.negate(),
        isInfinity: Bool(false),
      })
    );
  }

  add(other: G2Point): G2Point {
    Provable.log("[G2Point] add", this, other);
    // Handle special cases
    if (this.isZero().equals(Bool(true))) return other;
    if (other.isZero().equals(Bool(true))) return this;

    // Check if points are negatives of each other
    if (
      Fp2.equals(this.x, other.x)
        .and(Fp2.equals(this.y, other.y.negate()))
        .equals(Bool(true))
    ) {
      return G2Point.ZERO;
    }

    // Point addition formulas for P ≠ Q
    if (Fp2.equals(this.x, other.x).equals(Bool(false))) {
      const slope = other.y.sub(this.y).div(other.x.sub(this.x));
      const x3 = slope.square().sub(this.x).sub(other.x);
      const y3 = slope.mul(this.x.sub(x3)).sub(this.y);
      return new G2Point({
        x: x3,
        y: y3,
        isInfinity: Bool(false),
      });
    }

    // Point doubling formula (P = Q)
    if (this.equals(other).equals(Bool(true))) {
      if (this.y.isZero().equals(Bool(true))) return G2Point.ZERO;

      const three = Fp2.fromBigInt(3n, 0n);
      const two = Fp2.fromBigInt(2n, 0n);

      const slope = this.x.square().mul(three).div(this.y.mul(two));
      const x3 = slope.square().sub(this.x.mul(two));
      const y3 = slope.mul(this.x.sub(x3)).sub(this.y);
      return new G2Point({
        x: x3,
        y: y3,
        isInfinity: Bool(false),
      });
    }

    return G2Point.ZERO;
  }

  equals(other: G2Point): Bool {
    Provable.log("[G2Point] equals", this, other);
    if (this.isZero() && other.isZero()) return Bool(true);
    return Fp2.equals(this.x, other.x).and(Fp2.equals(this.y, other.y));
  }

  multiply(scalar: Fp): G2Point {
    Provable.log("[G2Point] multiply", scalar);
    let result = G2Point.ZERO;
    let current: G2Point = this;
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
}
