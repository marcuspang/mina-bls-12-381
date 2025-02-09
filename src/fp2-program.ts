import { Field, ZkProgram } from "o1js";
import { Fp2 } from "./fp2";

export const Fp2BaseProgram = ZkProgram({
  name: "fp2-base",
  publicOutput: Fp2,
  methods: {
    add: {
      privateInputs: [Fp2, Fp2],
      async method(a: Fp2, b: Fp2) {
        return {
          publicOutput: a.add(b),
        };
      },
    },
    sub: {
      privateInputs: [Fp2, Fp2],
      async method(a: Fp2, b: Fp2) {
        return {
          publicOutput: a.sub(b),
        };
      },
    },
    mul: {
      privateInputs: [Fp2, Fp2],
      async method(a: Fp2, b: Fp2) {
        return {
          publicOutput: a.mul(b),
        };
      },
    },
    square: {
      privateInputs: [Fp2],
      async method(a: Fp2) {
        return {
          publicOutput: a.square(),
        };
      },
    },
    mulByNonresidue: {
      privateInputs: [Fp2],
      async method(a: Fp2) {
        return {
          publicOutput: a.mulByNonresidue(),
        };
      },
    },
    negate: {
      privateInputs: [Fp2],
      async method(a: Fp2) {
        return {
          publicOutput: a.negate(),
        };
      },
    },
    inverse: {
      privateInputs: [Fp2],
      async method(a: Fp2) {
        return {
          publicOutput: a.inverse(),
        };
      },
    },
    frobeniusMap: {
      privateInputs: [Fp2, Field],
      async method(a: Fp2, power: Field) {
        return {
          publicOutput: a.frobeniusMap(power),
        };
      },
    },
  },
});
