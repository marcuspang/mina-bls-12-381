import { ZkProgram, Bool } from "o1js";
import { BLS12_381_Signature } from "./bls12_381";
import { G1Point } from "./g1";
import { G2Point } from "./g2";
import { Mina } from "o1js";

export const blsVerify = ZkProgram({
  name: "bls-verify",
  publicInput: G1Point, // message point
  publicOutput: Bool, // verification result

  methods: {
    verifyBLS: {
      privateInputs: [BLS12_381_Signature, G2Point],

      async method(
        message: G1Point,
        signature: BLS12_381_Signature,
        publicKey: G2Point
      ) {
        return {
          publicOutput: BLS12_381_Signature.verify(
            publicKey,
            message,
            signature
          ),
        };
      },
    },
  },
});

// Compile the program
console.log("Compiling BLS verification program...");
const { verificationKey } = await blsVerify.compile();

const messagePoint = G1Point.ZERO;
const signature = new BLS12_381_Signature({
  R: G1Point.ZERO,
  S: G1Point.ZERO,
});
const publicKey = G2Point.ZERO;

// Create the proof
console.log("Creating proof...");
const proof = await blsVerify.verifyBLS(messagePoint, signature, publicKey);

// Verify the proof
console.log("Verifying proof...");
const isValid = await blsVerify.verify(proof.proof);

console.log("Verification result:", isValid);
