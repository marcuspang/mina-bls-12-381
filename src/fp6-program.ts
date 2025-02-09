import { Field, Gadgets, Provable, SelfProof, ZkProgram } from "o1js";
import { Fp2 } from "./fp2";
import { Fp2BaseProgram } from "./fp2-program";
import {
  FP6_FROBENIUS_COEFFICIENTS_1,
  FP6_FROBENIUS_COEFFICIENTS_2,
  Fp6,
} from "./fp6";

// export const Fp6BaseProgram = ZkProgram({
//   name: "fp6-base",
//   publicOutput: Fp6,
//   methods: {
//     add: {
//       privateInputs: [Fp6, Fp6],
//       async method(a: Fp6, b: Fp6) {
//         const c0 = (await Fp2BaseProgram.add(a.c0, b.c0)).proof.publicOutput;
//         const c1 = (await Fp2BaseProgram.add(a.c1, b.c1)).proof.publicOutput;
//         const c2 = (await Fp2BaseProgram.add(a.c2, b.c2)).proof.publicOutput;
//         return {
//           publicOutput: new Fp6({ c0, c1, c2 }),
//         };
//       },
//     },
//     sub: {
//       privateInputs: [Fp6, Fp6],
//       async method(a: Fp6, b: Fp6) {
//         const c0 = (await Fp2BaseProgram.sub(a.c0, b.c0)).proof.publicOutput;
//         const c1 = (await Fp2BaseProgram.sub(a.c1, b.c1)).proof.publicOutput;
//         const c2 = (await Fp2BaseProgram.sub(a.c2, b.c2)).proof.publicOutput;
//         return {
//           publicOutput: new Fp6({ c0, c1, c2 }),
//         };
//       },
//     },
//   },
// });

// export const Fp6MulProgram = ZkProgram({
//   name: "fp6-mul",
//   publicOutput: Fp6,
//   methods: {
//     mul: {
//       privateInputs: [Fp6, Fp6],
//       async method(a: Fp6, b: Fp6) {
//         const t0 = (await Fp2BaseProgram.mul(a.c0, b.c0)).proof.publicOutput;
//         const t1 = (await Fp2BaseProgram.mul(a.c1, b.c1)).proof.publicOutput;
//         const t2 = (await Fp2BaseProgram.mul(a.c2, b.c2)).proof.publicOutput;

//         const sum1 = (await Fp2BaseProgram.add(a.c1, a.c2)).proof.publicOutput;
//         const sum2 = (await Fp2BaseProgram.add(b.c1, b.c2)).proof.publicOutput;
//         const prod = (await Fp2BaseProgram.mul(sum1, sum2)).proof.publicOutput;
//         const diff = (
//           await Fp2BaseProgram.sub(
//             prod,
//             (
//               await Fp2BaseProgram.add(t1, t2)
//             ).proof.publicOutput
//           )
//         ).proof.publicOutput;
//         const c0 = (
//           await Fp2BaseProgram.add(
//             t0,
//             (
//               await Fp2BaseProgram.mulByNonresidue(diff)
//             ).proof.publicOutput
//           )
//         ).proof.publicOutput;

//         const sum3 = (await Fp2BaseProgram.add(a.c0, a.c1)).proof.publicOutput;
//         const sum4 = (await Fp2BaseProgram.add(b.c0, b.c1)).proof.publicOutput;
//         const prod2 = (await Fp2BaseProgram.mul(sum3, sum4)).proof.publicOutput;
//         const sum5 = (await Fp2BaseProgram.add(t0, t1)).proof.publicOutput;
//         const diff2 = (await Fp2BaseProgram.sub(prod2, sum5)).proof
//           .publicOutput;
//         const c1 = (
//           await Fp2BaseProgram.add(
//             diff2,
//             (
//               await Fp2BaseProgram.mulByNonresidue(t2)
//             ).proof.publicOutput
//           )
//         ).proof.publicOutput;

//         const sum6 = (await Fp2BaseProgram.add(a.c0, a.c2)).proof.publicOutput;
//         const sum7 = (await Fp2BaseProgram.add(b.c0, b.c2)).proof.publicOutput;
//         const prod3 = (await Fp2BaseProgram.mul(sum6, sum7)).proof.publicOutput;
//         const diff3 = (await Fp2BaseProgram.sub(prod3, sum5)).proof
//           .publicOutput;
//         const c2 = (await Fp2BaseProgram.add(diff3, t1)).proof.publicOutput;

//         return {
//           publicOutput: new Fp6({ c0, c1, c2 }),
//         };
//       },
//     },
//   },
// });

// export const Fp6SquareProgram = ZkProgram({
//   name: "fp6-square",
//   publicOutput: Fp6,
//   methods: {
//     square: {
//       privateInputs: [Fp6],
//       async method(a: Fp6) {
//         const s0 = (await Fp2BaseProgram.square(a.c0)).proof.publicOutput;
//         const ab = (await Fp2BaseProgram.mul(a.c0, a.c1)).proof.publicOutput;
//         const s1 = (await Fp2BaseProgram.add(ab, ab)).proof.publicOutput; // 2ab

//         const temp = (await Fp2BaseProgram.sub(a.c0, a.c1)).proof.publicOutput;
//         const s2 = (
//           await Fp2BaseProgram.square(
//             (
//               await Fp2BaseProgram.add(temp, a.c2)
//             ).proof.publicOutput
//           )
//         ).proof.publicOutput; // (a-b+c)²

//         const bc = (await Fp2BaseProgram.mul(a.c1, a.c2)).proof.publicOutput;
//         const s3 = (await Fp2BaseProgram.add(bc, bc)).proof.publicOutput; // 2bc
//         const s4 = (await Fp2BaseProgram.square(a.c2)).proof.publicOutput;

//         const c0 = (
//           await Fp2BaseProgram.add(
//             (
//               await Fp2BaseProgram.mulByNonresidue(s3)
//             ).proof.publicOutput,
//             s0
//           )
//         ).proof.publicOutput;

//         const c1 = (
//           await Fp2BaseProgram.add(
//             (
//               await Fp2BaseProgram.mulByNonresidue(s4)
//             ).proof.publicOutput,
//             s1
//           )
//         ).proof.publicOutput;

//         const temp2 = (await Fp2BaseProgram.add(s1, s2)).proof.publicOutput;
//         const temp3 = (await Fp2BaseProgram.add(temp2, s3)).proof.publicOutput;
//         const temp4 = (await Fp2BaseProgram.sub(temp3, s0)).proof.publicOutput;
//         const c2 = (await Fp2BaseProgram.sub(temp4, s4)).proof.publicOutput;

//         return {
//           publicOutput: new Fp6({ c0, c1, c2 }),
//         };
//       },
//     },
//   },
// });

// export const Fp6UnaryProgram = ZkProgram({
//   name: "fp6-unary",
//   publicOutput: Fp6,
//   methods: {
// negate: {
//   privateInputs: [Fp6],
//   async method(a: Fp6) {
//     const c0 = (await Fp2BaseProgram.negate(a.c0)).proof.publicOutput;
//     const c1 = (await Fp2BaseProgram.negate(a.c1)).proof.publicOutput;
//     const c2 = (await Fp2BaseProgram.negate(a.c2)).proof.publicOutput;
//     return {
//       publicOutput: new Fp6({ c0, c1, c2 }),
//     };
//   },
// },

// mulByNonresidue: {
//   privateInputs: [Fp6],
//   async method(a: Fp6) {
//     const c0 = (await Fp2BaseProgram.mulByNonresidue(a.c2)).proof
//       .publicOutput;
//     const c1 = a.c0;
//     const c2 = a.c1;
//     return {
//       publicOutput: new Fp6({ c0, c1, c2 }),
//     };
//   },
// },

// inverse: {
//   privateInputs: [Fp6],
//   async method(a: Fp6) {
//     // t0 = c0² - (c2 * c1 * ξ)
//     const c2c1 = (await Fp2BaseProgram.mul(a.c2, a.c1)).proof.publicOutput;
//     const t0 = (
//       await Fp2BaseProgram.sub(
//         (
//           await Fp2BaseProgram.square(a.c0)
//         ).proof.publicOutput,
//         (
//           await Fp2BaseProgram.mulByNonresidue(c2c1)
//         ).proof.publicOutput
//       )
//     ).proof.publicOutput;

//     // t1 = (c2² * ξ) - (c0 * c1)
//     const c2squared = (await Fp2BaseProgram.square(a.c2)).proof
//       .publicOutput;
//     const c0c1 = (await Fp2BaseProgram.mul(a.c0, a.c1)).proof.publicOutput;
//     const t1 = (
//       await Fp2BaseProgram.sub(
//         (
//           await Fp2BaseProgram.mulByNonresidue(c2squared)
//         ).proof.publicOutput,
//         c0c1
//       )
//     ).proof.publicOutput;

//     // t2 = c1² - (c0 * c2)
//     const c0c2 = (await Fp2BaseProgram.mul(a.c0, a.c2)).proof.publicOutput;
//     const t2 = (
//       await Fp2BaseProgram.sub(
//         (
//           await Fp2BaseProgram.square(a.c1)
//         ).proof.publicOutput,
//         c0c2
//       )
//     ).proof.publicOutput;

//     // Calculate determinant
//     const temp1 = (await Fp2BaseProgram.mul(a.c2, t1)).proof.publicOutput;
//     const temp2 = (await Fp2BaseProgram.mul(a.c1, t2)).proof.publicOutput;
//     const temp3 = (await Fp2BaseProgram.add(temp1, temp2)).proof
//       .publicOutput;
//     const temp4 = (await Fp2BaseProgram.mulByNonresidue(temp3)).proof
//       .publicOutput;
//     const temp5 = (await Fp2BaseProgram.mul(a.c0, t0)).proof.publicOutput;
//     const determinant = (await Fp2BaseProgram.add(temp4, temp5)).proof
//       .publicOutput;

//     const invDet = (await Fp2BaseProgram.inverse(determinant)).proof
//       .publicOutput;

//     return {
//       publicOutput: new Fp6({
//         c0: (await Fp2BaseProgram.mul(t0, invDet)).proof.publicOutput,
//         c1: (await Fp2BaseProgram.mul(t1, invDet)).proof.publicOutput,
//         c2: (await Fp2BaseProgram.mul(t2, invDet)).proof.publicOutput,
//       }),
//     };
//   },
// },

// frobeniusMap: {
//   privateInputs: [Fp6, Field],
//   async method(a: Fp6, power: Field) {
//     const c0 = (await Fp2BaseProgram.frobeniusMap(a.c0, power)).proof
//       .publicOutput;

//     const c1frob = (await Fp2BaseProgram.frobeniusMap(a.c1, power)).proof
//       .publicOutput;

//     const remainderIsOne = Gadgets.and(power, Field(1), 64).equals(
//       Field(1)
//     );
//     const remainderIsTwo = Gadgets.and(power, Field(2), 64).equals(
//       Field(2)
//     );
//     const remainderIsThree = Gadgets.and(power, Field(3), 64).equals(
//       Field(3)
//     );
//     const remainderIsFour = Gadgets.and(power, Field(4), 64).equals(
//       Field(4)
//     );
//     const remainderIsFive = Gadgets.and(power, Field(5), 64).equals(
//       Field(5)
//     );

//     const coefficient = Provable.switch(
//       [
//         remainderIsOne,
//         remainderIsTwo,
//         remainderIsThree,
//         remainderIsFour,
//         remainderIsFive,
//       ],
//       Provable.Array(Fp2, 2),
//       [
//         [FP6_FROBENIUS_COEFFICIENTS_1[0], FP6_FROBENIUS_COEFFICIENTS_2[0]],
//         [FP6_FROBENIUS_COEFFICIENTS_1[1], FP6_FROBENIUS_COEFFICIENTS_2[1]],
//         [FP6_FROBENIUS_COEFFICIENTS_1[2], FP6_FROBENIUS_COEFFICIENTS_2[2]],
//         [FP6_FROBENIUS_COEFFICIENTS_1[3], FP6_FROBENIUS_COEFFICIENTS_2[3]],
//         [FP6_FROBENIUS_COEFFICIENTS_1[4], FP6_FROBENIUS_COEFFICIENTS_2[4]],
//       ]
//     );

//     const c1 = (await Fp2BaseProgram.mul(c1frob, coefficient[0])).proof
//       .publicOutput;

//     const c2frob = (await Fp2BaseProgram.frobeniusMap(a.c2, power)).proof
//       .publicOutput;
//     const c2 = (await Fp2BaseProgram.mul(c2frob, coefficient[1])).proof
//       .publicOutput;

//     return {
//       publicOutput: new Fp6({ c0, c1, c2 }),
//     };
//   },
// },
//   },
// });

export const Fp6InverseProgram = ZkProgram({
  name: "fp6-inverse",
  publicOutput: Fp6,
  methods: {
    // Step 1: Calculate t0, t1, t2
    inverse_step1: {
      privateInputs: [Fp6],
      async method(a: Fp6) {
        // t0 = c0² - (c2 * c1 * ξ)
        const c2c1 = a.c2.mul(a.c1);
        const t0 = a.c0.square().sub(c2c1.mulByNonresidue());

        // t1 = (c2² * ξ) - (c0 * c1)
        const c2squared = a.c2.square();
        const c0c1 = a.c0.mul(a.c1);
        const t1 = c2squared.mulByNonresidue().sub(c0c1);

        // t2 = c1² - (c0 * c2)
        const c0c2 = a.c0.mul(a.c2);
        const t2 = a.c1.square().sub(c0c2);

        return {
          publicOutput: new Fp6({ c0: t0, c1: t1, c2: t2 }),
        };
      },
    },

    // Step 2: determinant
    inverse_step2: {
      privateInputs: [Fp6, SelfProof<void, Fp6>],
      async method(a: Fp6, step1Proof: SelfProof<void, Fp6>) {
        step1Proof.verify();
        const t = step1Proof.publicOutput;

        const temp1 = a.c2.mul(t.c1);
        const temp2 = a.c1.mul(t.c2);
        const temp3 = temp1.add(temp2);
        const temp4 = temp3.mulByNonresidue();
        const temp5 = a.c0.mul(t.c0);
        const determinant = temp4.add(temp5);

        return {
          publicOutput: new Fp6({
            c0: determinant,
            c1: t.c1,
            c2: t.c2,
          }),
        };
      },
    },

    // Step 3: inverse determinant
    inverse_step3: {
      privateInputs: [Fp6, SelfProof<void, Fp6>, SelfProof<void, Fp6>],
      async method(
        a: Fp6,
        step1Proof: SelfProof<void, Fp6>,
        step2Proof: SelfProof<void, Fp6>
      ) {
        step1Proof.verify();
        step2Proof.verify();

        const t = step1Proof.publicOutput;
        const determinant = step2Proof.publicOutput.c0;
        const invDet = determinant.inverse();

        return {
          publicOutput: new Fp6({
            c0: t.c0.mul(invDet),
            c1: t.c1.mul(invDet),
            c2: t.c2.mul(invDet),
          }),
        };
      },
    },
  },
});

for await (const program of [Fp6InverseProgram]) {
  const summary = await program.analyzeMethods();
  for (const [key, value] of Object.entries(summary)) {
    console.log(`${key}: ${value.rows} rows`);
  }

  console.time("compile");
  await program.compile();
  console.timeEnd("compile");
}
