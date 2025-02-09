import { ZkProgram } from "o1js";
import { Fp12 } from "./fp12";

export const fp12Program = ZkProgram({
  name: "fp12",
  methods: {
    add: {
      privateInputs: [Fp12, Fp12],
      async method(a: Fp12, b: Fp12) {
        a.add(b);
      },
    },
    // mul: {
    //   privateInputs: [Fp12, Fp12],
    //   async method(a: Fp12, b: Fp12) {
    //     a.mul(b);
    //   },
    // },
    // square: {
    //   privateInputs: [Fp12],
    //   async method(a: Fp12) {
    //     a.square();
    //   },
    // },
    frobeniusMap: {
      privateInputs: [Fp12],
      async method(a: Fp12) {
        a.frobeniusMap(1);
      },
    },
    // inverse: {
    //   privateInputs: [Fp12],
    //   async method(a: Fp12) {
    //     a.inverse();
    //   },
    // },
  },
});

const summary = await fp12Program.analyzeMethods();
for (const [key, value] of Object.entries(summary)) {
  console.log(`${key}: ${value.rows} rows`);
}

console.time("compile");
await fp12Program.compile();
console.timeEnd("compile");
