import { Bool, Field, Gadgets, Provable, Struct } from "o1js";

export const P =
  0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;

export type FpFields = [Field, Field, Field, Field, Field, Field];

export class Fp extends Struct({
  // little endian Field
  // least significant limb at index 0
  value: Provable.Array(Field, 6),
}) {
  private static ZERO = new Fp({
    value: [Field(0n), Field(0n), Field(0n), Field(0n), Field(0n), Field(0n)],
  });

  static MODULUS = [
    Field(0xb9fe_ffff_ffff_aaabn),
    Field(0x1eab_fffe_b153_ffffn),
    Field(0x6730_d2a0_f6b0_f624n),
    Field(0x6477_4b84_f385_12bfn),
    Field(0x4b1b_a7b6_434b_acd7n),
    Field(0x1a01_11ea_397f_e69an),
  ];

  // R = 2^384 mod p
  static R = [
    Field(0x7609_0000_0002_fffdn),
    Field(0xebf4_000b_c40c_0002n),
    Field(0x5f48_9857_53c7_58ban),
    Field(0x77ce_5853_7052_5745n),
    Field(0x5c07_1a97_a256_ec6dn),
    Field(0x15f6_5ec3_fa80_e493n),
  ];

  // R2 = 2^(384*2) mod p
  static R2 = [
    Field(0xf4df_1f34_1c34_1746n),
    Field(0x0a76_e6a6_09d1_04f1n),
    Field(0x8de5_476c_4c95_b6d5n),
    Field(0x67eb_88a9_939d_83c0n),
    Field(0x9a79_3e85_b519_952dn),
    Field(0x1198_8fe5_92ca_e3aan),
  ];

  static INV = 0x89f3_fffc_fffc_fffdn; // -p^-1 mod 2^64

  static fromBigInt(num: bigint): Fp {
    // Provable.log("[Fp1] fromBigInt", num);
    if (num < 0n) {
      num = num % P;
      if (num < 0n) num += P;
    } else if (num >= P) {
      num = num % P;
    }

    const mask = 0xffff_ffff_ffff_ffffn;
    const tmp = new Fp({
      value: [
        Field(num & mask),
        Field((num >> 64n) & mask),
        Field((num >> 128n) & mask),
        Field((num >> 192n) & mask),
        Field((num >> 256n) & mask),
        Field((num >> 320n) & mask),
      ],
    });

    return tmp.mul(Fp.fromFields(Fp.R2));
  }

  static fromFields(values: Field[]): Fp {
    // Provable.log("[Fp1] fromFields", values);
    if (values.length !== 6) {
      throw new Error("Invalid number of fields");
    }
    return new Fp({ value: values });
  }

  toFields(): Field[] {
    // Provable.log("[Fp1] toFields");
    return this.value;
  }

  static zero(): Fp {
    // Provable.log("[Fp1] zero");
    return Fp.ZERO;
  }

  static one(): Fp {
    // Provable.log("[Fp1] one");
    return Fp.fromFields(Fp.R);
  }

  /**
   * Converts this field element to a BigInt.
   * The result is in standard (non-Montgomery) form.
   */
  toBigInt(): bigint {
    // Provable.log("[Fp1] toBigInt");
    // Convert from Montgomery form by computing
    // (a.R) / R = a
    const reduced = this.montgomeryReduce(
      this.value[0],
      this.value[1],
      this.value[2],
      this.value[3],
      this.value[4],
      this.value[5],
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0)
    );

    let result = 0n;
    for (let i = 5; i >= 0; i--) {
      result = (result << 64n) + reduced.value[i].toBigInt();
    }
    return result;
  }

  /// Compute a + b + carry, returning the result and the new carry over.
  static adc(a: Field, b: Field, carry: Field): [Field, Field] {
    // Provable.log("[Fp1] adc", a, b, carry);
    Gadgets.rangeCheck64(a);
    Gadgets.rangeCheck64(b);
    Gadgets.rangeCheck64(carry);

    const ret = a.add(b).add(carry);
    Gadgets.rangeCheckN(128, ret);

    const lower = Field(Gadgets.and(ret, Field(0xffff_ffff_ffff_ffffn), 128));
    const upper = Provable.witness(Field, () => ret.toBigInt() >> 64n);

    Gadgets.rangeCheck64(lower);
    Gadgets.rangeCheck64(upper);

    return [lower, upper];
  }

  /// Compute a - (b + borrow), returning the result and the new borrow.
  static sbb(a: Field, b: Field, borrow: Field): [Field, Field] {
    // Provable.log("[Fp1] sbb", a, b, borrow);

    Gadgets.rangeCheck64(a);
    Gadgets.rangeCheck64(b);
    Gadgets.rangeCheck64(borrow);

    const ret = Provable.witness(Field, () => {
      const aBig = a.toBigInt();
      const bBig = b.toBigInt();
      const borrowBig = borrow.toBigInt() >> 63n;

      // wrapping sub
      return (
        (aBig - bBig - borrowBig) & 0xffff_ffff_ffff_ffff_ffff_ffff_ffff_ffffn
      );
    });
    Gadgets.rangeCheckN(128, ret);

    const lower = Field(Gadgets.and(ret, Field(0xffff_ffff_ffff_ffffn), 128));
    const upper = Provable.witness(Field, () => ret.toBigInt() >> 64n);

    Gadgets.rangeCheck64(lower);
    Gadgets.rangeCheck64(upper);

    return [lower, upper];
  }

  /// Compute a + (b * c) + carry, returning the result and the new carry over.
  static mac(a: Field, b: Field, c: Field, carry: Field): [Field, Field] {
    // Provable.log("[Fp1] mac", a, b, c);

    Gadgets.rangeCheck64(a);
    Gadgets.rangeCheck64(b);
    Gadgets.rangeCheck64(c);
    Gadgets.rangeCheck64(carry);

    const ret = Provable.witness(Field, () => {
      const mul = b.toBigInt() * c.toBigInt();
      return a.toBigInt() + mul + carry.toBigInt();
    });
    Gadgets.rangeCheckN(128, ret);

    const lower = Field(Gadgets.and(ret, Field(0xffff_ffff_ffff_ffffn), 128));
    const upper = Provable.witness(Field, () => ret.toBigInt() >> 64n);

    Gadgets.rangeCheck64(lower);
    Gadgets.rangeCheck64(upper);

    return [lower, upper];
  }

  add(other: Fp): Fp {
    // Provable.log("[Fp1] add", other);
    let [d0, d1, d2, d3, d4, d5] = [
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
    ];
    let carry = Field(0);
    [d0, carry] = Fp.adc(this.value[0], other.value[0], Field(0));
    [d1, carry] = Fp.adc(this.value[1], other.value[1], carry);
    [d2, carry] = Fp.adc(this.value[2], other.value[2], carry);
    [d3, carry] = Fp.adc(this.value[3], other.value[3], carry);
    [d4, carry] = Fp.adc(this.value[4], other.value[4], carry);
    [d5] = Fp.adc(this.value[5], other.value[5], carry);

    return Fp.fromFields([d0, d1, d2, d3, d4, d5]).subtractP();
  }

  subtractP(): Fp {
    // Provable.log("[Fp1] subtractP");
    const r = [Field(0), Field(0), Field(0), Field(0), Field(0), Field(0)];
    let borrow = Field(0);

    [r[0], borrow] = Fp.sbb(this.value[0], Fp.MODULUS[0], Field(0));
    [r[1], borrow] = Fp.sbb(this.value[1], Fp.MODULUS[1], borrow);
    [r[2], borrow] = Fp.sbb(this.value[2], Fp.MODULUS[2], borrow);
    [r[3], borrow] = Fp.sbb(this.value[3], Fp.MODULUS[3], borrow);
    [r[4], borrow] = Fp.sbb(this.value[4], Fp.MODULUS[4], borrow);
    [r[5], borrow] = Fp.sbb(this.value[5], Fp.MODULUS[5], borrow);

    return new Fp({
      value: r,
    });
  }

  sub(other: Fp): Fp {
    // Provable.log("[Fp1] sub", other);
    return other.negate().add(this);
  }

  div(other: Fp): Fp {
    // Provable.log("[Fp1] div", other);
    return this.mul(other.inverse());
  }

  mod(other: Fp): Fp {
    // Provable.log("[Fp1] mod", other);

    other.isZero().assertFalse("Cannot divide by zero");

    const inverse = other.inverse();
    const quotient = this.mul(inverse);
    const product = quotient.mul(other);
    return this.sub(product);
  }

  square(): Fp {
    // Provable.log("[Fp1] square");

    const t = [
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
    ];

    let carry = Field(0);
    for (let i = 0; i < 6; i++) {
      [t[i * 2], carry] = Fp.mac(
        t[i * 2],
        this.value[i],
        this.value[i],
        Field(0)
      );
      t[i * 2 + 1] = carry;
    }

    // Then handle cross terms
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        let [lo, hi] = Fp.mac(Field(0), this.value[i], this.value[j], Field(0));
        // Double the cross product since we're computing (a+b)^2
        [lo, hi] = Fp.mac(lo, this.value[i], this.value[j], hi);

        // Add to running sum
        let c = Field(0);
        [t[i + j], c] = Fp.adc(t[i + j], lo, Field(0));
        [t[i + j + 1], c] = Fp.adc(t[i + j + 1], hi, c);

        // Propagate carry
        let k = i + j + 2;
        while (c.equals(Field(0)).equals(Bool(false)) && k < 12) {
          [t[k], c] = Fp.adc(t[k], Field(0), c);
          k += 1;
        }
      }
    }

    return this.montgomeryReduce(
      t[0],
      t[1],
      t[2],
      t[3],
      t[4],
      t[5],
      t[6],
      t[7],
      t[8],
      t[9],
      t[10],
      t[11]
    );
  }

  /**
   * Computes the multiplicative inverse of this field element, if it exists.
   * Returns null if this element is zero.
   */
  inverse(): Fp {
    // Provable.log("[Fp1] inverse");

    // Using Fermat's little theorem, we raise to p-2:
    // a^(p-2) ≡ a^(-1) mod p, if a ≠ 0

    // p - 2 = [
    //   0xb9feffffffffaaa9,
    //   0x1eabfffeb153ffff,
    //   0x6730d2a0f6b0f624,
    //   0x64774b84f38512bf,
    //   0x4b1ba7b6434bacd7,
    //   0x1a0111ea397fe69a
    // ]
    this.isZero().assertFalse("Cannot inverse zero");
    return this.pow(Fp.fromBigInt(P - 2n));
  }

  /**
   * Returns true if this element is zero.
   */
  isZero(): Bool {
    // Provable.log("[Fp1] isZero");

    return this.equals(Fp.zero());
  }

  negate(): Fp {
    // Provable.log("[Fp1] negate");

    const r = [Field(0), Field(0), Field(0), Field(0), Field(0), Field(0)];
    let borrow = Field(0);

    [r[0], borrow] = Fp.sbb(Fp.MODULUS[0], this.value[0], Field(0));
    [r[1], borrow] = Fp.sbb(Fp.MODULUS[1], this.value[1], borrow);
    [r[2], borrow] = Fp.sbb(Fp.MODULUS[2], this.value[2], borrow);
    [r[3], borrow] = Fp.sbb(Fp.MODULUS[3], this.value[3], borrow);
    [r[4], borrow] = Fp.sbb(Fp.MODULUS[4], this.value[4], borrow);
    [r[5], borrow] = Fp.sbb(Fp.MODULUS[5], this.value[5], borrow);

    const isZero = Gadgets.or(
      Gadgets.or(
        Gadgets.or(Gadgets.or(Gadgets.or(r[0], r[1], 64), r[2], 64), r[3], 64),
        r[4],
        64
      ),
      r[5],
      64
    ).equals(Field(0));
    const mask = Provable.if(isZero, Field(0xffffffffffffffffn), Field(0));

    return new Fp({
      value: [
        Gadgets.and(r[0], mask, 64),
        Gadgets.and(r[1], mask, 64),
        Gadgets.and(r[2], mask, 64),
        Gadgets.and(r[3], mask, 64),
        Gadgets.and(r[4], mask, 64),
        Gadgets.and(r[5], mask, 64),
      ],
    });
  }

  montgomeryReduce(
    t0: Field,
    t1: Field,
    t2: Field,
    t3: Field,
    t4: Field,
    t5: Field,
    t6: Field,
    t7: Field,
    t8: Field,
    t9: Field,
    t10: Field,
    t11: Field
  ): Fp {
    // Provable.log(
    //   "[Fp1] montgomeryReduce",
    //   t0,
    //   t1,
    //   t2,
    //   t3,
    //   t4,
    //   t5,
    //   t6,
    //   t7,
    //   t8,
    //   t9,
    //   t10,
    //   t11
    // );

    // First round of reduction
    let [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11] = [
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
    ];
    let carry = Field(0);

    const kValues = Provable.witnessFields(6, () => [
      t0.mul(Fp.INV).toBigInt() % 0xffffffffffffffffn,
      t1.mul(Fp.INV).toBigInt() % 0xffffffffffffffffn,
      t2.mul(Fp.INV).toBigInt() % 0xffffffffffffffffn,
      t3.mul(Fp.INV).toBigInt() % 0xffffffffffffffffn,
      t4.mul(Fp.INV).toBigInt() % 0xffffffffffffffffn,
      t5.mul(Fp.INV).toBigInt() % 0xffffffffffffffffn,
    ]);

    [r0, carry] = Fp.mac(t0, kValues[0], Fp.MODULUS[0], Field(0));
    [r1, carry] = Fp.mac(t1, kValues[0], Fp.MODULUS[1], carry);
    [r2, carry] = Fp.mac(t2, kValues[0], Fp.MODULUS[2], carry);
    [r3, carry] = Fp.mac(t3, kValues[0], Fp.MODULUS[3], carry);
    [r4, carry] = Fp.mac(t4, kValues[0], Fp.MODULUS[4], carry);
    [r5, carry] = Fp.mac(t5, kValues[0], Fp.MODULUS[5], carry);
    [r6, r7] = Fp.adc(t6, Field(0), carry);

    // Second round
    [r1, carry] = Fp.mac(r1, kValues[1], Fp.MODULUS[0], Field(0));
    [r2, carry] = Fp.mac(r2, kValues[1], Fp.MODULUS[1], carry);
    [r3, carry] = Fp.mac(r3, kValues[1], Fp.MODULUS[2], carry);
    [r4, carry] = Fp.mac(r4, kValues[1], Fp.MODULUS[3], carry);
    [r5, carry] = Fp.mac(r5, kValues[1], Fp.MODULUS[4], carry);
    [r6, carry] = Fp.mac(r6, kValues[1], Fp.MODULUS[5], carry);
    [r7, r8] = Fp.adc(t7, r7, carry);

    // Third round
    [r2, carry] = Fp.mac(r2, kValues[2], Fp.MODULUS[0], Field(0));
    [r3, carry] = Fp.mac(r3, kValues[2], Fp.MODULUS[1], carry);
    [r4, carry] = Fp.mac(r4, kValues[2], Fp.MODULUS[2], carry);
    [r5, carry] = Fp.mac(r5, kValues[2], Fp.MODULUS[3], carry);
    [r6, carry] = Fp.mac(r6, kValues[2], Fp.MODULUS[4], carry);
    [r7, carry] = Fp.mac(r7, kValues[2], Fp.MODULUS[5], carry);
    [r8, r9] = Fp.adc(t8, r8, carry);

    // Fourth round
    [r3, carry] = Fp.mac(r3, kValues[3], Fp.MODULUS[0], Field(0));
    [r4, carry] = Fp.mac(r4, kValues[3], Fp.MODULUS[1], carry);
    [r5, carry] = Fp.mac(r5, kValues[3], Fp.MODULUS[2], carry);
    [r6, carry] = Fp.mac(r6, kValues[3], Fp.MODULUS[3], carry);
    [r7, carry] = Fp.mac(r7, kValues[3], Fp.MODULUS[4], carry);
    [r8, carry] = Fp.mac(r8, kValues[3], Fp.MODULUS[5], carry);
    [r9, r10] = Fp.adc(t9, r9, carry);

    // Fifth round
    [r4, carry] = Fp.mac(r4, kValues[4], Fp.MODULUS[0], Field(0));
    [r5, carry] = Fp.mac(r5, kValues[4], Fp.MODULUS[1], carry);
    [r6, carry] = Fp.mac(r6, kValues[4], Fp.MODULUS[2], carry);
    [r7, carry] = Fp.mac(r7, kValues[4], Fp.MODULUS[3], carry);
    [r8, carry] = Fp.mac(r8, kValues[4], Fp.MODULUS[4], carry);
    [r9, carry] = Fp.mac(r9, kValues[4], Fp.MODULUS[5], carry);
    [r10, r11] = Fp.adc(t10, r10, carry);

    // Sixth round
    [r5, carry] = Fp.mac(r5, kValues[5], Fp.MODULUS[0], Field(0));
    [r6, carry] = Fp.mac(r6, kValues[5], Fp.MODULUS[1], carry);
    [r7, carry] = Fp.mac(r7, kValues[5], Fp.MODULUS[2], carry);
    [r8, carry] = Fp.mac(r8, kValues[5], Fp.MODULUS[3], carry);
    [r9, carry] = Fp.mac(r9, kValues[5], Fp.MODULUS[4], carry);
    [r10, carry] = Fp.mac(r10, kValues[5], Fp.MODULUS[5], carry);
    [r11, carry] = Fp.adc(t11, r11, carry);

    return new Fp({
      value: [r6, r7, r8, r9, r10, r11],
    }).subtractP();
  }

  equals(other: Fp): Bool {
    // Provable.log("[Fp1] equals", other);
    return this.value[0]
      .equals(other.value[0])
      .and(
        this.value[1]
          .equals(other.value[1])
          .and(
            this.value[2]
              .equals(other.value[2])
              .and(
                this.value[3]
                  .equals(other.value[3])
                  .and(
                    this.value[4]
                      .equals(other.value[4])
                      .and(this.value[5].equals(other.value[5]))
                  )
              )
          )
      );
  }

  assertEquals(other: Fp, message?: string) {
    // Provable.log("[Fp1] assertEquals");
    this.equals(other).assertTrue(message);
  }

  /**
   * Multiplies two field elements in Montgomery form.
   * Returns a*b in Montgomery form.
   */
  mul(other: Fp): Fp {
    // Provable.log("[Fp1] mul", other);

    const t = [
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
    ];

    // First round
    let carry = Field(0);
    [t[0], carry] = Fp.mac(t[0], this.value[0], other.value[0], Field(0));
    [t[1], carry] = Fp.mac(Field(0), this.value[0], other.value[1], carry);
    [t[2], carry] = Fp.mac(Field(0), this.value[0], other.value[2], carry);
    [t[3], carry] = Fp.mac(Field(0), this.value[0], other.value[3], carry);
    [t[4], carry] = Fp.mac(Field(0), this.value[0], other.value[4], carry);
    [t[5], t[6]] = Fp.mac(Field(0), this.value[0], other.value[5], carry);

    // Second round
    [t[1], carry] = Fp.mac(t[1], this.value[1], other.value[0], Field(0));
    [t[2], carry] = Fp.mac(t[2], this.value[1], other.value[1], carry);
    [t[3], carry] = Fp.mac(t[3], this.value[1], other.value[2], carry);
    [t[4], carry] = Fp.mac(t[4], this.value[1], other.value[3], carry);
    [t[5], carry] = Fp.mac(t[5], this.value[1], other.value[4], carry);
    [t[6], t[7]] = Fp.mac(t[6], this.value[1], other.value[5], carry);

    // Third round
    [t[2], carry] = Fp.mac(t[2], this.value[2], other.value[0], Field(0));
    [t[3], carry] = Fp.mac(t[3], this.value[2], other.value[1], carry);
    [t[4], carry] = Fp.mac(t[4], this.value[2], other.value[2], carry);
    [t[5], carry] = Fp.mac(t[5], this.value[2], other.value[3], carry);
    [t[6], carry] = Fp.mac(t[6], this.value[2], other.value[4], carry);
    [t[7], t[8]] = Fp.mac(t[7], this.value[2], other.value[5], carry);

    // Fourth round
    [t[3], carry] = Fp.mac(t[3], this.value[3], other.value[0], Field(0));
    [t[4], carry] = Fp.mac(t[4], this.value[3], other.value[1], carry);
    [t[5], carry] = Fp.mac(t[5], this.value[3], other.value[2], carry);
    [t[6], carry] = Fp.mac(t[6], this.value[3], other.value[3], carry);
    [t[7], carry] = Fp.mac(t[7], this.value[3], other.value[4], carry);
    [t[8], t[9]] = Fp.mac(t[8], this.value[3], other.value[5], carry);

    // Fifth round
    [t[4], carry] = Fp.mac(t[4], this.value[4], other.value[0], Field(0));
    [t[5], carry] = Fp.mac(t[5], this.value[4], other.value[1], carry);
    [t[6], carry] = Fp.mac(t[6], this.value[4], other.value[2], carry);
    [t[7], carry] = Fp.mac(t[7], this.value[4], other.value[3], carry);
    [t[8], carry] = Fp.mac(t[8], this.value[4], other.value[4], carry);
    [t[9], t[10]] = Fp.mac(t[9], this.value[4], other.value[5], carry);

    // Sixth round
    [t[5], carry] = Fp.mac(t[5], this.value[5], other.value[0], Field(0));
    [t[6], carry] = Fp.mac(t[6], this.value[5], other.value[1], carry);
    [t[7], carry] = Fp.mac(t[7], this.value[5], other.value[2], carry);
    [t[8], carry] = Fp.mac(t[8], this.value[5], other.value[3], carry);
    [t[9], carry] = Fp.mac(t[9], this.value[5], other.value[4], carry);
    [t[10], t[11]] = Fp.mac(t[10], this.value[5], other.value[5], carry);

    return this.montgomeryReduce(
      t[0],
      t[1],
      t[2],
      t[3],
      t[4],
      t[5],
      t[6],
      t[7],
      t[8],
      t[9],
      t[10],
      t[11]
    );
  }

  sqrt(): Fp {
    // Provable.log("[Fp1] sqrt");

    // For BLS12-381, p ≡ 3 (mod 4), so we can use the formula:
    // sqrt(a) = a^((p+1)/4) if a is a square

    // (p+1)/4 = [
    //   0xee7fbfffffffeaab,
    //   0x07aaffffac54ffff,
    //   0xd9cc34a83dac3d89,
    //   0xd91dd2e13ce144af,
    //   0x92c6e9ed90d2eb35,
    //   0x0680447a8e5ff9a6,
    // ]
    // const sqrt = this.powVartime([
    //   Field(0xee7f_bfff_ffff_eaabn),
    //   Field(0x07aa_ffff_ac54_ffffn),
    //   Field(0xd9cc_34a8_3dac_3d89n),
    //   Field(0xd91d_d2e1_3ce1_44afn),
    //   Field(0x92c6_e9ed_90d2_eb35n),
    //   Field(0x0680_447a_8e5f_f9a6n),
    // ]);
    const exp = Fp.fromBigInt((P + 1n) / 4n);
    const root = this.pow(exp);

    root.square().equals(this).assertTrue("Value is not a quadratic residue");

    return root;
  }

  pow(exp: Fp): Fp {
    // Provable.log("[Fp1] pow", exp);

    const result = Provable.witness(Fp, () => {
      const modulus = this.toBigInt();

      const exponent = exp.toBigInt();
      let res = 1n;
      let b = this.toBigInt() % modulus;
      let e = exponent;

      while (e > 0n) {
        if (e & 1n) {
          res = (res * b) % modulus;
        }
        b = (b * b) % modulus;
        e >>= 1n;
      }
      return Fp.fromBigInt(res);
    });

    // TODO: figure out why this is preventing compilation
    // r^e == b
    // const exponentBits = exp.value.flatMap((limb) => limb.toBits());
    // let verifier = Fp.one();
    // let current: Fp = this;

    // for (let i = 0; i < exponentBits.length; i++) {
    //   verifier = Provable.if(exponentBits[i], verifier.mul(current), verifier);
    //   current = current.square();
    // }

    // verifier.assertEquals(result, "Power result is incorrect");
    return result;
  }
}

// /**
//  * Right shifts a large field element by the specified number of bits.
//  * Handles fields larger than 64 bits by breaking them into limbs.
//  *
//  * @param field The field element to shift
//  * @param bits Number of bits to shift right
//  * @param totalBits Total number of bits to consider for the field (must be multiple of 64)
//  * @returns The right-shifted field value
//  */
// function rightShiftLarge(field: Field, bits: number, totalBits: number): Field {
//   if (totalBits % 64 !== 0) {
//     throw new Error("Total bits must be a multiple of 64");
//   }
//   if (bits < 0 || bits >= totalBits) {
//     throw new Error("Shift amount must be between 0 and totalBits");
//   }

//   const numLimbs = totalBits / 64;
//   const limbs = Provable.witnessFields(numLimbs, () => {
//     let value = field.toBigInt();
//     const result: bigint[] = [];
//     for (let i = 0; i < numLimbs; i++) {
//       result.push(value & 0xffff_ffff_ffff_ffffn);
//       value = value >> 64n;
//     }
//     return result;
//   });

//   limbs.forEach((limb) => {
//     Gadgets.rangeCheck64(limb);
//   });

//   let reconstructed = limbs[0];
//   for (let i = 1; i < limbs.length; i++) {
//     reconstructed = reconstructed.add(limbs[i].mul(1n << BigInt(i * 64)));
//   }
//   reconstructed.assertEquals(field);

//   const limbOffset = Math.floor(bits / 64);
//   const bitOffset = bits % 64;

//   let result = Field(0);
//   for (let i = limbOffset; i < numLimbs; i++) {
//     const shiftedLimb = Gadgets.rightShift64(limbs[i], bitOffset);
//     result = result.add(shiftedLimb.mul(1n << BigInt((i - limbOffset) * 64)));

//     if (bitOffset > 0 && i < numLimbs - 1) {
//       const overlapBits = andLarge(
//         leftShiftLarge(limbs[i + 1], 64 - bitOffset, 384),
//         Field0xffff_ffff_ffff_ffffn,
//         384
//       );
//       result = result.add(overlapBits.mul(1n << BigInt((i - limbOffset) * 64)));
//     }
//   }

//   return result;
// }

// /**
//  * Performs a bitwise AND operation on large field elements.
//  * Handles fields larger than 64 bits by breaking them into smaller chunks.
//  *
//  * @param a First field element
//  * @param b Second field element or mask
//  * @param totalBits Total number of bits to consider (must be multiple of 64)
//  * @returns The result of a & b
//  */
// function andLarge(a: Field, b: Field, totalBits: number): Field {
//   if (totalBits % 64 !== 0) {
//     throw new Error("Total bits must be a multiple of 64, got " + totalBits);
//   }

//   const CHUNK_BITS = 64;
//   const numChunks = Math.ceil(totalBits / CHUNK_BITS);

//   const aChunks = Provable.witnessFields(numChunks, () => {
//     let value = a.toBigInt();
//     const result: bigint[] = [];
//     for (let i = 0; i < numChunks; i++) {
//       const chunkBits = Math.min(CHUNK_BITS, totalBits - i * CHUNK_BITS);
//       const mask = (1n << BigInt(chunkBits)) - 1n;
//       result.push(value & mask);
//       value = value >> BigInt(chunkBits);
//     }
//     return result;
//   });

//   const bChunks = Provable.witnessFields(numChunks, () => {
//     let value = b.toBigInt();
//     const result: bigint[] = [];
//     for (let i = 0; i < numChunks; i++) {
//       const chunkBits = Math.min(CHUNK_BITS, totalBits - i * CHUNK_BITS);
//       const mask = (1n << BigInt(chunkBits)) - 1n;
//       result.push(value & mask);
//       value = value >> BigInt(chunkBits);
//     }
//     return result;
//   });

//   let reconstructedA = aChunks[0];
//   let reconstructedB = bChunks[0];
//   for (let i = 1; i < numChunks; i++) {
//     reconstructedA = reconstructedA.add(
//       aChunks[i].mul(1n << BigInt(i * CHUNK_BITS))
//     );
//     reconstructedB = reconstructedB.add(
//       bChunks[i].mul(1n << BigInt(i * CHUNK_BITS))
//     );
//   }
//   reconstructedA.assertEquals(a);
//   reconstructedB.assertEquals(b);

//   const resultChunks: Field[] = [];
//   for (let i = 0; i < numChunks; i++) {
//     const chunkBits = Math.min(CHUNK_BITS, totalBits - i * CHUNK_BITS);
//     resultChunks.push(Gadgets.and(aChunks[i], bChunks[i], chunkBits));
//   }

//   let result = resultChunks[0];
//   for (let i = 1; i < numChunks; i++) {
//     result = result.add(resultChunks[i].mul(1n << BigInt(i * CHUNK_BITS)));
//   }

//   return result;
// }

// /**
//  * Performs a bitwise AND operation with range checking on large field elements.
//  * This version includes explicit range checks on input chunks.
//  *
//  * @param a First field element
//  * @param b Second field element or mask
//  * @param totalBits Total number of bits to consider (must be multiple of 64)
//  * @returns The result of a & b
//  */
// function andLargeWithRangeCheck(a: Field, b: Field, totalBits: number): Field {
//   if (totalBits % 64 !== 0) {
//     throw new Error("Total bits must be a multiple of 64");
//   }

//   const CHUNK_BITS = 240;
//   const numChunks = Math.ceil(totalBits / CHUNK_BITS);

//   // Split fields into chunks with range checking
//   const aChunks = Provable.witnessFields(numChunks, () => {
//     let value = a.toBigInt();
//     const result: bigint[] = [];
//     for (let i = 0; i < numChunks; i++) {
//       const chunkBits = Math.min(CHUNK_BITS, totalBits - i * CHUNK_BITS);
//       const mask = (1n << BigInt(chunkBits)) - 1n;
//       result.push(value & mask);
//       value = value >> BigInt(chunkBits);
//     }
//     return result;
//   });

//   const bChunks = Provable.witnessFields(numChunks, () => {
//     let value = b.toBigInt();
//     const result: bigint[] = [];
//     for (let i = 0; i < numChunks; i++) {
//       const chunkBits = Math.min(CHUNK_BITS, totalBits - i * CHUNK_BITS);
//       const mask = (1n << BigInt(chunkBits)) - 1n;
//       result.push(value & mask);
//       value = value >> BigInt(chunkBits);
//     }
//     return result;
//   });

//   // Range check each chunk
//   for (let i = 0; i < numChunks; i++) {
//     const chunkBits = Math.min(CHUNK_BITS, totalBits - i * CHUNK_BITS);
//     const maxValue = (1n << BigInt(chunkBits)) - 1n;

//     // Ensure chunks are within valid range
//     Provable.witness(Bool, () => {
//       const aValue = aChunks[i].toBigInt();
//       const bValue = bChunks[i].toBigInt();
//       return aValue <= maxValue && bValue <= maxValue;
//     }).assertTrue();
//   }

//   let reconstructedA = aChunks[0];
//   let reconstructedB = bChunks[0];
//   for (let i = 1; i < numChunks; i++) {
//     reconstructedA = reconstructedA.add(
//       aChunks[i].mul(1n << BigInt(i * CHUNK_BITS))
//     );
//     reconstructedB = reconstructedB.add(
//       bChunks[i].mul(1n << BigInt(i * CHUNK_BITS))
//     );
//   }
//   reconstructedA.assertEquals(a);
//   reconstructedB.assertEquals(b);

//   // Perform AND operation on each chunk
//   const resultChunks: Field[] = [];
//   for (let i = 0; i < numChunks; i++) {
//     const chunkBits = Math.min(CHUNK_BITS, totalBits - i * CHUNK_BITS);
//     resultChunks.push(Gadgets.and(aChunks[i], bChunks[i], chunkBits));
//   }

//   // Combine chunks into final result
//   let result = resultChunks[0];
//   for (let i = 1; i < numChunks; i++) {
//     result = result.add(resultChunks[i].mul(1n << BigInt(i * CHUNK_BITS)));
//   }

//   return result;
// }
// /**
//  * Left shifts a large field element by the specified number of bits.
//  * Handles fields larger than 64 bits by breaking them into limbs.
//  *
//  * @param field The field element to shift
//  * @param bits Number of bits to shift left
//  * @param totalBits Total number of bits to consider for the field (must be multiple of 64)
//  * @returns The left-shifted field value
//  */
// function leftShiftLarge(field: Field, bits: number, totalBits: number): Field {
//   // Validate inputs
//   if (totalBits % 64 !== 0) {
//     throw new Error("Total bits must be a multiple of 64");
//   }
//   if (bits < 0 || bits >= totalBits) {
//     throw new Error("Shift amount must be between 0 and totalBits");
//   }

//   // Calculate number of 64-bit limbs needed
//   const numLimbs = totalBits / 64;

//   // Split field into 64-bit limbs
//   const limbs = Provable.witnessFields(numLimbs, () => {
//     let value = field.toBigInt();
//     const result: bigint[] = [];
//     for (let i = 0; i < numLimbs; i++) {
//       result.push(value & 0xffff_ffff_ffff_ffffn);
//       value = value >> 64n;
//     }
//     return result;
//   });

//   // Range check each limb
//   limbs.forEach((limb) => {
//     Gadgets.rangeCheck64(limb);
//   });

//   // Verify limbs make up the original field
//   let reconstructed = limbs[0];
//   for (let i = 1; i < limbs.length; i++) {
//     reconstructed = reconstructed.add(limbs[i].mul(1n << BigInt(i * 64)));
//   }
//   reconstructed.assertEquals(field);

//   // Calculate limb and bit offsets for the shift
//   const limbOffset = Math.floor(bits / 64);
//   const bitOffset = bits % 64;

//   // Perform the shift
//   let result = Field(0);

//   // Handle each limb
//   for (let i = 0; i < numLimbs - limbOffset; i++) {
//     // Add the non-overlapping part
//     const shiftedValue = limbs[i].mul(1n << BigInt(bitOffset));
//     const shiftedLimb = Gadgets.rightShift64(shiftedValue, bitOffset);
//     result = result.add(shiftedLimb.mul(1n << BigInt((i + limbOffset) * 64)));

//     // Handle overflow bits to next limb if needed
//     if (bitOffset > 0 && i < numLimbs - limbOffset - 1) {
//       const overflowBits = Gadgets.and(
//         Gadgets.rightShift64(limbs[i], 64 - bitOffset),
//         Field((1n << BigInt(bitOffset)) - 1n),
//         64
//       );
//       result = result.add(
//         overflowBits.mul(1n << BigInt((i + limbOffset + 1) * 64))
//       );
//     }
//   }

//   return result;
// }

// /**
//  * Left shifts a large field element with additional range checking.
//  * This version includes explicit range checks and overflow prevention.
//  *
//  * @param field The field element to shift
//  * @param bits Number of bits to shift left
//  * @param totalBits Total number of bits to consider for the field (must be multiple of 64)
//  * @returns The left-shifted field value
//  */
// function leftShiftLargeWithRangeCheck(
//   field: Field,
//   bits: number,
//   totalBits: number
// ): Field {
//   // Validate inputs
//   if (totalBits % 64 !== 0) {
//     throw new Error("Total bits must be a multiple of 64");
//   }
//   if (bits < 0 || bits >= totalBits) {
//     throw new Error("Shift amount must be between 0 and totalBits");
//   }

//   const numLimbs = totalBits / 64;

//   // Split field into limbs with range checking
//   const limbs = Provable.witnessFields(numLimbs, () => {
//     let value = field.toBigInt();
//     const result: bigint[] = [];
//     for (let i = 0; i < numLimbs; i++) {
//       result.push(value & 0xffff_ffff_ffff_ffffn);
//       value = value >> 64n;
//     }
//     return result;
//   });

//   // Perform range checks on each limb
//   limbs.forEach((limb, index) => {
//     Gadgets.rangeCheck64(limb);

//     // For the highest limbs that will be shifted out, ensure they are zero
//     // to prevent overflow
//     if (index >= numLimbs - Math.floor(bits / 64) - 1) {
//       const remainingBits = totalBits - bits;
//       if (index * 64 >= remainingBits) {
//         limb.assertEquals(Field(0));
//       } else {
//         const maxValue =
//           (1n << BigInt(Math.min(64, remainingBits - index * 64))) - 1n;
//         Provable.witness(Bool, () => {
//           return limb.toBigInt() <= maxValue;
//         }).assertTrue();
//       }
//     }
//   });

//   // Verify reconstruction
//   let reconstructed = limbs[0];
//   for (let i = 1; i < limbs.length; i++) {
//     reconstructed = reconstructed.add(limbs[i].mul(1n << BigInt(i * 64)));
//   }
//   reconstructed.assertEquals(field);

//   // Calculate shift parameters
//   const limbOffset = Math.floor(bits / 64);
//   const bitOffset = bits % 64;

//   // Perform the shift with overflow checking
//   let result = Field(0);

//   for (let i = 0; i < numLimbs - limbOffset; i++) {
//     // Shift the current limb
//     const shiftedValue = limbs[i].mul(1n << BigInt(bitOffset));
//     const shiftedLimb = andLargeWithRangeCheck(
//       shiftedValue,
//       Field0xffff_ffff_ffff_ffffn,
//       384
//     );
//     result = result.add(shiftedLimb.mul(1n << BigInt((i + limbOffset) * 64)));

//     // Handle overflow bits
//     if (bitOffset > 0 && i < numLimbs - limbOffset - 1) {
//       const overflowBits = andLargeWithRangeCheck(
//         rightShiftLarge(limbs[i], 64 - bitOffset, 384),
//         Field((1n << BigInt(bitOffset)) - 1n),
//         384
//       );
//       result = result.add(
//         overflowBits.mul(1n << BigInt((i + limbOffset + 1) * 64))
//       );
//     }
//   }

//   return result;
// }
