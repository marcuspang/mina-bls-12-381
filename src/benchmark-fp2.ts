import { ZkProgram } from "o1js";
import { Fp2 } from "./fp2";

export const fp2Program = ZkProgram({
  name: "fp2",
  methods: {
    add: {
      privateInputs: [Fp2, Fp2],
      async method(a: Fp2, b: Fp2) {
        a.add(b);
      },
    },
    sub: {
      privateInputs: [Fp2, Fp2],
      async method(a: Fp2, b: Fp2) {
        a.sub(b);
      },
    },
    mul: {
      privateInputs: [Fp2, Fp2],
      async method(a: Fp2, b: Fp2) {
        a.mul(b);
      },
    },
    square: {
      privateInputs: [Fp2],
      async method(a: Fp2) {
        a.square();
      },
    },
    negate: {
      privateInputs: [Fp2],
      async method(a: Fp2) {
        a.negate();
      },
    },
    frobeniusMap: {
      privateInputs: [Fp2],
      async method(a: Fp2) {
        a.frobeniusMap(1);
      },
    },
  },
});

const summary = await fp2Program.analyzeMethods();
for (const [key, value] of Object.entries(summary)) {
  console.log(`${key}: ${value.rows} rows`);
}

console.time("compile");
await fp2Program.compile();
console.timeEnd("compile");
