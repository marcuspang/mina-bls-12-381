import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { Field, Provable } from "o1js";
import { Fp, P } from "./fp";

const NUM_RUNS = Number(process.env.RUNS_COUNT || 10); // reduce to 1 to shorten test time
fc.configureGlobal({ numRuns: NUM_RUNS, endOnFailure: true });
const FC_BIGINT = fc.bigInt(1n, P - 1n);

describe("bls12-381 Fp", () => {
  it("equality", () => {
    fc.assert(
      fc.property(FC_BIGINT, (num) => {
        const a = Fp.fromBigInt(num);
        const b = Fp.fromBigInt(num);
        expect(a.equals(b).toBoolean()).toBe(true);
        expect(b.equals(a).toBoolean()).toBe(true);
      })
    );
  });
  it("non-equality", () => {
    fc.assert(
      fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
        const a = Fp.fromBigInt(num1);
        const b = Fp.fromBigInt(num2);
        expect(a.equals(b).toBoolean()).toBe(num1 === num2);
        expect(b.equals(a).toBoolean()).toBe(num1 === num2);
      })
    );
  });
  describe("add/subtract", () => {
    it("commutativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          expect(a.add(b).equals(b.add(a)).toBoolean()).toBe(true);
        })
      );
    });
    it("associativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);
          expect(a.add(b.add(c)).equals(a.add(b).add(c)).toBoolean()).toBe(
            true
          );
        })
      );
    });
    it("x+0=x", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.add(Fp.zero()).equals(a).toBoolean()).toBe(true);
        })
      );
    });
    it("x-0=x", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.sub(Fp.zero()).equals(a).toBoolean()).toBe(true);
          expect(a.sub(a).equals(Fp.zero()).toBoolean()).toBe(true);
        })
      );
    });
    it("negate equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num1) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num1);
          expect(a.sub(Fp.zero()).equals(a.negate()).toBoolean()).toBe(true);
          expect(a.sub(a).equals(Fp.zero()).toBoolean()).toBe(true);
          expect(a.sub(b).equals(a.add(b.negate())).toBoolean()).toBe(true);
          expect(a.sub(b).equals(a.add(b.negate())).toBoolean()).toBe(true);
        })
      );
    });
    it("negate", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.negate().equals(Fp.zero().sub(a)).toBoolean()).toBe(true);
          expect(
            a
              .negate()
              .equals(a.mul(Fp.fromBigInt(-1n)))
              .toBoolean()
          ).toBe(true);
        })
      );
    });
  });
  describe("multiply", () => {
    it("correctness", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          expect(a.mul(b).toBigInt()).toEqual((num1 * num2) % P);
        })
      );
    });
    it("commutativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          expect(a.mul(b).equals(b.mul(a)).toBoolean()).toBe(true);
        })
      );
    });
    it("associativity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);

          console.log(a.toBigInt(), b.toBigInt(), c.toBigInt());

          console.log(1, a.mul(b).toBigInt());
          console.log(2, a.mul(b.mul(c)).toBigInt());

          console.log(3, a.mul(b).toBigInt());
          console.log(4, a.mul(b).mul(c).toBigInt());

          expect(a.mul(b.mul(c)).equals(a.mul(b).mul(c)).toBoolean()).toBe(
            true
          );
        })
      );
    });
    it("distributivity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);
          expect(
            a
              .mul(b.add(c))
              .equals(b.mul(a).add(c.mul(a)))
              .toBoolean()
          ).toBe(true);
        })
      );
    });
    it("add equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.mul(Fp.zero()).equals(Fp.zero()).toBoolean()).toBe(true);
          expect(a.mul(Fp.zero()).equals(Fp.zero()).toBoolean()).toBe(true);
          expect(a.mul(Fp.one()).equals(a).toBoolean()).toBe(true);
          expect(a.mul(Fp.one()).equals(a).toBoolean()).toBe(true);
          expect(a.mul(Fp.fromBigInt(2n)).equals(a.add(a)).toBoolean()).toBe(
            true
          );
          expect(
            a.mul(Fp.fromBigInt(3n)).equals(a.add(a).add(a)).toBoolean()
          ).toBe(true);
          expect(
            a.mul(Fp.fromBigInt(4n)).equals(a.add(a).add(a).add(a)).toBoolean()
          ).toBe(true);
        })
      );
    });
    it("square equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.mul(a).equals(a.square()).toBoolean()).toBe(true);
        })
      );
    });
    it("pow equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.pow(Fp.fromBigInt(0n)).equals(Fp.one()).toBoolean()).toBe(
            true
          );
          expect(a.pow(Fp.fromBigInt(1n)).equals(a).toBoolean()).toBe(true);
          expect(a.pow(Fp.fromBigInt(2n)).equals(a.mul(a)).toBoolean()).toBe(
            true
          );
          expect(
            a.pow(Fp.fromBigInt(3n)).equals(a.mul(a).mul(a)).toBoolean()
          ).toBe(true);
        })
      );
    });
    it("sqrt", () => {
      let sqr1 = Fp.fromBigInt(300855555557n).sqrt();
      expect(sqr1 && sqr1.value.toString()).toEqual(
        "364533921369419647282142659217537440628656909375169620464770009670699095647614890229414882377952296797827799113624"
      );
      expect(Fp.fromBigInt(72057594037927816n).sqrt()).toBeUndefined();
    });
  });
  describe("div", () => {
    it("division by one equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(a.div(Fp.one()).equals(a).toBoolean()).toBe(true);
          expect(a.div(a).equals(Fp.one()).toBoolean()).toBe(true);
        })
      );
    });
    it("division by zero equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, (num) => {
          const a = Fp.fromBigInt(num);
          expect(Fp.zero().div(a).equals(Fp.zero()).toBoolean()).toBe(true);
        })
      );
    });
    it("division distributivity", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, FC_BIGINT, (num1, num2, num3) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          const c = Fp.fromBigInt(num3);

          console.log(a.toBigInt(), b.toBigInt(), c.toBigInt());

          Provable.log(1, a.add(b).toBigInt());
          Provable.log(2, a.add(b).div(c).toBigInt());

          Provable.log(3, a.div(c).toBigInt());
          Provable.log(4, a.div(c).add(b.div(c)).toBigInt());
          expect(
            a
              .add(b)
              .div(c)
              .equals(a.div(c).add(b.div(c)))
              .toBoolean()
          ).toBe(true);
        })
      );
    });
    it("division and multiplication equality", () => {
      fc.assert(
        fc.property(FC_BIGINT, FC_BIGINT, (num1, num2) => {
          const a = Fp.fromBigInt(num1);
          const b = Fp.fromBigInt(num2);
          expect(a.div(b).equals(a.mul(b.inverse())).toBoolean()).toBe(true);
        })
      );
    });
  });
});

describe.skip("zkcrypto/fp", () => {
  it("equality", () => {
    const a = Fp.fromFields([
      Field(1),
      Field(2),
      Field(3),
      Field(4),
      Field(5),
      Field(6),
    ]);
    const b = Fp.fromFields([
      Field(1),
      Field(2),
      Field(3),
      Field(4),
      Field(5),
      Field(6),
    ]);
    expect(a.equals(b).toBoolean()).toBe(true);

    // Test inequality cases
    const testCases = [
      [7, 2, 3, 4, 5, 6],
      [1, 7, 3, 4, 5, 6],
      [1, 2, 7, 4, 5, 6],
      [1, 2, 3, 7, 5, 6],
      [1, 2, 3, 4, 7, 6],
      [1, 2, 3, 4, 5, 7],
    ];

    testCases.forEach((values) => {
      const c = Fp.fromFields(values.map((v) => Field(v)));
      expect(a.equals(c).toBoolean()).toBe(false);
    });
  });

  it("squaring", () => {
    const a = Fp.fromFields([
      Field(0xd215d2768e83191bn),
      Field(0x5085d80f8fb28261n),
      Field(0xce9a032ddf393a56n),
      Field(0x3e9c4fff2ca0c4bbn),
      Field(0x6436b6f7f4d95dfbn),
      Field(0x10606628ad4a4d90n),
    ]);
    const b = Fp.fromFields([
      Field(0x33d9c42a3cb3e235n),
      Field(0xdad11a094c4cd455n),
      Field(0xa2f144bd729aaeban),
      Field(0xd4150932be9ffeacn),
      Field(0xe27bc7c47d44ee50n),
      Field(0x14b6a78d3ec7a560n),
    ]);

    expect(a.square().equals(b).toBoolean()).toBe(true);
  });

  it("multiplication", () => {
    const a = Fp.fromFields([
      Field(0x0397a3832017_0cd4n),
      Field(0x734c1b2c9e76_1d30n),
      Field(0x5ed255ad9a48_beb5n),
      Field(0x095a3c6b22a7_fcfcn),
      Field(0x2294ce75d4e2_6a27n),
      Field(0x13338bd87001_1ebbn),
    ]);
    const b = Fp.fromFields([
      Field(0xb9c3c7c5b119_6af7n),
      Field(0x2580e2086ce3_35c1n),
      Field(0xf49aed3d8a57_ef42n),
      Field(0x41f281e49846_e878n),
      Field(0xe0762346c384_52cen),
      Field(0x0652e89326e5_7dc0n),
    ]);
    const c = Fp.fromFields([
      Field(0xf96ef3d711ab_5355n),
      Field(0xe8d459ea00f1_48ddn),
      Field(0x53f7354a5f00_fa78n),
      Field(0x9e34a4f3125c_5f83n),
      Field(0x3fbe0c47ca74_c19en),
      Field(0x01b06a8bbd4a_dfe4n),
    ]);

    expect(a.mul(b).equals(c).toBoolean()).toBe(true);
  });

  it("addition", () => {
    const a = Fp.fromFields([
      Field(0x5360bb5978678032n),
      Field(0x7dd275ae799e128en),
      Field(0x5c5b5071ce4f4dcfn),
      Field(0xcdb21f93078dbb3en),
      Field(0xc32365c5e73f474an),
      Field(0x115a2a5489babe5bn),
    ]);
    const b = Fp.fromFields([
      Field(0x9fd287733d23dda0n),
      Field(0xb16bf2af738b3554n),
      Field(0x3e57a75bd3cc6d1dn),
      Field(0x900bc0bd627fd6d6n),
      Field(0xd319a080efb245fen),
      Field(0x15fdcaa4e4bb2091n),
    ]);
    const c = Fp.fromFields([
      Field(0x393442ccb58bb327n),
      Field(0x1092685f3bd547e3n),
      Field(0x3382252cab6ac4c9n),
      Field(0xf94694cb76887f55n),
      Field(0x4b215e9093a5e071n),
      Field(0x0d56e30f34f5f853n),
    ]);

    expect(a.add(b).equals(c).toBoolean()).toBe(true);
  });

  it("subtraction", () => {
    const a = Fp.fromFields([
      Field(0x5360bb5978678032n),
      Field(0x7dd275ae799e128en),
      Field(0x5c5b5071ce4f4dcfn),
      Field(0xcdb21f93078dbb3en),
      Field(0xc32365c5e73f474an),
      Field(0x115a2a5489babe5bn),
    ]);
    const b = Fp.fromFields([
      Field(0x9fd287733d23dda0n),
      Field(0xb16bf2af738b3554n),
      Field(0x3e57a75bd3cc6d1dn),
      Field(0x900bc0bd627fd6d6n),
      Field(0xd319a080efb245fen),
      Field(0x15fdcaa4e4bb2091n),
    ]);
    const c = Fp.fromFields([
      Field(0x6d8d33e63b434d3dn),
      Field(0xeb1282fdb766dd39n),
      Field(0x85347bb6f133d6d5n),
      Field(0xa21daa5a9892f727n),
      Field(0x3b256cfb3ad8ae23n),
      Field(0x155d7199de7f8464n),
    ]);

    expect(a.sub(b).equals(c).toBoolean()).toBe(true);
  });

  it("negation", () => {
    const a = Fp.fromFields([
      Field(0x5360bb5978678032n),
      Field(0x7dd275ae799e128en),
      Field(0x5c5b5071ce4f4dcfn),
      Field(0xcdb21f93078dbb3en),
      Field(0xc32365c5e73f474an),
      Field(0x115a2a5489babe5bn),
    ]);
    const b = Fp.fromFields([
      Field(0x669e44a687982a79n),
      Field(0xa0d98a5037b5ed71n),
      Field(0x0ad5822f2861a854n),
      Field(0x96c52bf1ebf75781n),
      Field(0x87f841f05c0c658cn),
      Field(0x08a6e795afc5283en),
    ]);

    expect(a.negate().equals(b).toBoolean()).toBe(true);
  });

  it("inversion", () => {
    const a = Fp.fromFields([
      Field(0x43b4_3a50_78ac_2076n),
      Field(0x1ce0_7630_46f8_962bn),
      Field(0x724a_5276_486d_735cn),
      Field(0x6f05_c2a6_282d_48fdn),
      Field(0x2095_bd5b_b4ca_9331n),
      Field(0x03b3_5b38_94b0_f7dan),
    ]);
    const b = Fp.fromFields([
      Field(0x69ec_d704_0952_148fn),
      Field(0x985c_cc20_2219_0f55n),
      Field(0xe19b_ba36_a9ad_2f41n),
      Field(0x19bb_16c9_5219_dbd8n),
      Field(0x14dc_acfd_fb47_8693n),
      Field(0x115f_f58a_fff9_a8e1n),
    ]);

    console.log(a.toBigInt(), a.toFields());
    console.log(b.toBigInt(), b.toFields());
    console.log(a.inverse().toBigInt(), a.inverse().toFields());
    console.log(b.inverse().toBigInt(), b.inverse().toFields());

    expect(a.inverse().equals(b).toBoolean()).toBe(true);
    expect(Fp.zero().inverse()).toThrow();
  });

  it("sqrt", () => {
    // a = 4
    const a = Fp.fromFields([
      Field(0xaa27_0000_000c_fff3n),
      Field(0x53cc_0032_fc34_000an),
      Field(0x478f_e97a_6b0a_807fn),
      Field(0xb1d3_7ebe_e6ba_24d7n),
      Field(0x8ec9_733b_bf78_ab2fn),
      Field(0x09d6_4551_3d83_de7en),
    ]);

    // 2
    const expected = Fp.fromFields([
      Field(0x3213_0000_0006_554fn),
      Field(0xb93c_0018_d6c4_0005n),
      Field(0x5760_5e0d_b0dd_bb51n),
      Field(0x8b25_6521_ed1f_9bcbn),
      Field(0x6cf2_8d79_0162_2c03n),
      Field(0x11eb_ab9d_bb81_e28cn),
    ]);

    expect(a.sqrt().negate().equals(expected).toBoolean()).toBe(true);
  });
});

const FC_INT = fc.bigInt(0n, 2n ** 64n - 1n);

describe("adc", () => {
  it("should add two fields and return the result and carry", () => {
    fc.assert(
      fc.property(FC_INT, FC_INT, FC_INT, (num1, num2, num3) => {
        fc.pre(num1 + num2 + num3 < 2n ** 64n);

        const upper = Field(num1);
        const lower = Field(num2);
        const carry = Field(num3);

        const result = Fp.adc(upper, lower, carry);
        const actualSum = num1 + num2 + num3;

        expect(result[0]).toEqual(Field(actualSum & (2n ** 64n - 1n)));
        expect(result[1]).toEqual(Field((actualSum >> 64n) & (2n ** 64n - 1n)));
      })
    );
  });
});

describe("sbb", () => {
  it("should subtract two fields and return the result and borrow", () => {
    fc.assert(
      fc.property(FC_INT, FC_INT, FC_INT, (num1, num2, num3) => {
        fc.pre(num1 > num2 + num3);

        const upper = Field(num1);
        const lower = Field(num2);
        const borrow = Field(num3);

        const result = Fp.sbb(upper, lower, borrow);
        const actualDifference = num1 - num2 - num3;

        expect(result[0]).toEqual(Field(actualDifference & (2n ** 64n - 1n)));
        expect(result[1]).toEqual(
          Field((actualDifference >> 64n) & (2n ** 64n - 1n))
        );
      })
    );
  });
});

describe("mac", () => {
  it("should multiply two fields and add a carry", () => {
    fc.assert(
      fc.property(FC_INT, FC_INT, FC_INT, FC_INT, (num1, num2, num3, num4) => {
        fc.pre(num1 * num2 + num3 + num4 < 2n ** 128n);

        const a = Field(num1);
        const b = Field(num2);
        const c = Field(num3);
        const d = Field(num4);

        const result = Fp.mac(a, b, c, d);
        const actualResult = num1 + num2 * num3 + num4;

        expect(result[0]).toEqual(Field(actualResult & (2n ** 64n - 1n)));
        expect(result[1]).toEqual(
          Field((actualResult >> 64n) & (2n ** 64n - 1n))
        );
      })
    );
  });
});
