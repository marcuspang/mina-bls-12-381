import { Field, Provable, ZkProgram } from "o1js";
import { Fp } from "./fp";

export const fpProgram = ZkProgram({
  name: "fp",
  methods: {
    add: {
      privateInputs: [Fp, Fp],
      async method(a: Fp, b: Fp) {
        a.add(b);
      },
    },
    sub: {
      privateInputs: [Fp, Fp],
      async method(a: Fp, b: Fp) {
        a.sub(b);
      },
    },
    mul: {
      privateInputs: [Fp, Fp],
      async method(a: Fp, b: Fp) {
        a.mul(b);
      },
    },
    square: {
      privateInputs: [Fp],
      async method(a: Fp) {
        a.square();
      },
    },
    pow: {
      privateInputs: [Fp, Fp],
      async method(a: Fp, b: Fp) {
        a.pow(b);
      },
    },
    div: {
      privateInputs: [Fp, Fp],
      async method(a: Fp, b: Fp) {
        a.div(b);
      },
    },
    mod: {
      privateInputs: [Fp, Fp],
      async method(a: Fp, b: Fp) {
        a.mod(b);
      },
    },
    sqrt: {
      privateInputs: [Fp],
      async method(a: Fp) {
        a.sqrt();
      },
    },
    negate: {
      privateInputs: [Fp],
      async method(a: Fp) {
        a.negate();
      },
    },
    inverse: {
      privateInputs: [Fp],
      async method(a: Fp) {
        a.inverse();
      },
    },
  },
});

const summary = await fpProgram.analyzeMethods();
for (const [key, value] of Object.entries(summary)) {
  console.log(`${key}: ${value.rows} rows`);
}

console.time("compile");
await fpProgram.compile();
console.timeEnd("compile");
