import { Provable, ZkProgram } from "o1js";
import { Fp6 } from "./fp6";

export const fp6Program = ZkProgram({
  name: "fp6",
  methods: {
    // add: {
    //   privateInputs: [Fp6, Fp6],
    //   async method(a: Fp6, b: Fp6) {
    //     a.add(b);
    //   },
    // },
    // sub: {
    //   privateInputs: [Fp6, Fp6],
    //   async method(a: Fp6, b: Fp6) {
    //     a.sub(b);
    //   },
    // },
    // mul: {
    //   privateInputs: [Fp6, Fp6],
    //   async method(a: Fp6, b: Fp6) {
    //     a.mul(b);
    //   },
    // },
    // square: {
    //   privateInputs: [Fp6],
    //   async method(a: Fp6) {
    //     a.square();
    //   },
    // },
    // negate: {
    //   privateInputs: [Fp6],
    //   async method(a: Fp6) {
    //     a.negate();
    //   },
    // },
    // frobeniusMap: {
    //   privateInputs: [Fp6],
    //   async method(a: Fp6) {
    //     a.frobeniusMap(1);
    //   },
    // },
    // mulByNonresidue: {
    //   privateInputs: [Fp6],
    //   async method(a: Fp6) {
    //     a.mulByNonresidue();
    //   },
    // },
    inverse: {
      privateInputs: [Fp6],
      async method(a: Fp6) {
        a.inverse();
      },
    },
  },
});

const summary = await fp6Program.analyzeMethods();
for (const [key, value] of Object.entries(summary)) {
  console.log(`${key}: ${value.rows} rows`);
}

console.time("compile");
await fp6Program.compile();
console.timeEnd("compile");
