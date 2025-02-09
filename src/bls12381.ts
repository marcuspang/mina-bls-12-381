import { Bool, Provable, Struct, ZkProgram } from "o1js";
import { Fp } from "./fp";
import { Fp2 } from "./fp2";
import { Fp6 } from "./fp6";
import { Fp12 } from "./fp12";
import { G1Point } from "./g1";
import { G2Point } from "./g2";

const BLS_X = -0xd201000000010000n;
const BLS_X_BITS = BLS_X.toString(2).slice(1); // Remove sign

export class BLS12381_Signature extends Struct({
  R: G1Point,
  S: G1Point,
}) {
  static verify(
    publicKey: G2Point,
    message: G1Point,
    signature: BLS12381_Signature
  ): Bool {
    // Point validation checks
    Provable.log("R", signature.R);
    G1Point.isOnCurve(signature.R);
    Provable.log("S", signature.S);
    G1Point.isOnCurve(signature.S);
    Provable.log("publicKey", publicKey);
    G2Point.isOnCurve(publicKey);
    Provable.log("message", message);
    G1Point.isOnCurve(message);

    // Verify e(P, H(m)) == e(G, S)
    // This is equivalent to checking e(P, H(m)) * e(G, -S) == 1
    // e(P, H(m)) * e(G, -S) = e(P, H(m)) * e(-G, S) = e(P, H(m) + [-1]S) == 1

    // Calculate H(m) + [-1]S
    const negS = signature.S.negate();
    const sum = message.add(negS);

    const f = BLS12381_Signature.millerLoop(publicKey, sum);
    const exp = BLS12381_Signature.finalExponentiation(f);
    return Fp12.equals(exp, Fp12.one());
  }

  static sign(privateKey: Fp, message: G1Point): BLS12381_Signature {
    // Calculate R = H(m)
    const R = message;

    // Calculate S = privateKey * R
    const S = message.multiply(privateKey);

    return new BLS12381_Signature({
      R: R,
      S: S,
    });
  }

  private static millerLoop(P: G2Point, Q: G1Point): Fp12 {
    let f = Fp12.one();
    let R = P;

    for (let i = 0; i < BLS_X_BITS.length; i++) {
      f = f.square();
      f = f.mul(BLS12381_Signature.lineEval(R, R, Q));
      R = R.add(R);

      if (BLS_X_BITS[i] === "1") {
        f = f.mul(BLS12381_Signature.lineEval(R, P, Q));
        R = R.add(P);
      }
    }

    return f;
  }

  private static lineEval(R: G2Point, P: G2Point, Q: G1Point): Fp12 {
    if (R.isInfinity.equals(Bool(true))) return Fp12.one();
    if (P.isInfinity.equals(Bool(true))) return Fp12.one();

    let slope: Fp2;
    if (R.equals(P).equals(Bool(true))) {
      // Point doubling case
      const three = Fp2.fromBigInt(3n, 0n);
      const two = Fp2.fromBigInt(2n, 0n);
      slope = R.x.square().mul(three).div(R.y.mul(two));
    } else {
      // Point addition case
      slope = P.y.sub(R.y).div(P.x.sub(R.x));
    }

    // Line equation: (Y - sX - (R.y - sR.x))
    const a = slope;
    const b = new Fp2({ c0: Q.y, c1: Fp.zero() });
    const c = R.y.sub(slope.mul(R.x));

    return new Fp12({
      c0: Fp6.zero(),
      c1: new Fp6({
        c0: a,
        c1: b,
        c2: c,
      }),
    });
  }

  private static finalExponentiation(f: Fp12): Fp12 {
    const t0 = f.conjugate();
    const t1 = f.inverse();
    const t2 = t0.mul(t1);
    const t3 = t2.frobeniusMap(2);
    const t4 = t3.mul(t2);
    return t4;
  }
}
