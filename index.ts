import { ZkProgram, Bool } from "o1js";
import { BLS12_381_Signature } from "./bls12_381";
import { G1Point } from "./g1";
import { G2Point } from "./g2";

export const blsVerify = ZkProgram({
  name: "bls-verify",
  publicInput: G1Point, // message point
  publicOutput: Bool, // verification result

  methods: {
    verifyBLS: {
      privateInputs: [BLS12_381_Signature, G2Point],

      method(
        message: G1Point,
        signature: BLS12_381_Signature,
        publicKey: G2Point
      ) {
        return Promise.resolve({
          publicOutput: BLS12_381_Signature.verify(
            publicKey,
            message,
            signature
          ),
        });
      },
    },
  },
});
