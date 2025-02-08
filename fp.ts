import { Bool, Field, Gadgets, Provable, Struct } from "o1js";

export const P =
  0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;

export type FpFields = [Field, Field, Field, Field, Field, Field];

export class Fp extends Struct({
  // little endian Field
  value: [Field, Field, Field, Field, Field, Field],
}) {
  static MODULUS = [
    Field(0xb9fe_ffff_ffff_aaabn),
    Field(0x1eab_fffe_b153_ffffn),
    Field(0x6730_d2a0_f6b0_f624n),
    Field(0x6477_4b84_f385_12bfn),
    Field(0x4b1b_a7b6_434b_acd7n),
    Field(0x1a01_11ea_397f_e69an),
  ];

  // R = 2^384 mod p
  static R = Fp.fromFields([
    Field(0x7609_0000_0002_fffdn),
    Field(0xebf4_000b_c40c_0002n),
    Field(0x5f48_9857_53c7_58ban),
    Field(0x77ce_5853_7052_5745n),
    Field(0x5c07_1a97_a256_ec6dn),
    Field(0x15f6_5ec3_fa80_e493n),
  ]);

  // R2 = 2^(384*2) mod p
  static R2 = Fp.fromFields([
    Field(0xf4df_1f34_1c34_1746n),
    Field(0x0a76_e6a6_09d1_04f1n),
    Field(0x8de5_476c_4c95_b6d5n),
    Field(0x67eb_88a9_939d_83c0n),
    Field(0x9a79_3e85_b519_952dn),
    Field(0x1198_8fe5_92ca_e3aan),
  ]);

  static INV = 0x89f3_fffc_fffc_fffdn; // -p^-1 mod 2^64

  static fromBigInt(num: bigint): Fp {
    if (num >= P) {
      throw new Error("Input must be less than field modulus");
    }

    const mask = (1n << 64n) - 1n;
    const limbs: Field[] = [];
    let temp = num;

    // Extract 6 limbs (for 384 bits total)
    for (let i = 0; i < 6; i++) {
      limbs.push(Field(temp & mask));
      temp = temp >> 64n;
    }

    const result = new Fp({
      value: [limbs[0], limbs[1], limbs[2], limbs[3], limbs[4], limbs[5]],
    });

    // Convert to Montgomery form by multiplying by R2
    return result.mul(Fp.R2);
  }

  static fromFields(values: Field[]): Fp {
    Field(values.length).assertEquals(6);

    return new Fp({
      value: values,
    });
  }

  toFields(): Field[] {
    return this.value;
  }

  static zero(): Fp {
    return new Fp({
      value: [Field(0n), Field(0n), Field(0n), Field(0n), Field(0n), Field(0n)],
    });
  }

  static one(): Fp {
    return Fp.R; // One in Montgomery form
  }

  /**
   * Converts this field element to a BigInt.
   * The result is in standard (non-Montgomery) form.
   */
  toBigInt(): bigint {
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

    // Combine limbs into a single BigInt
    let result = 0n;
    for (let i = 5; i >= 0; i--) {
      result = (result << 64n) + reduced.value[i].toBigInt();
    }

    return result;
  }

  /// Compute a + b + carry, returning the result and the new carry over.
  static adc(a: Field, b: Field, carry: Field): [Field, Field] {
    Gadgets.rangeCheck64(a);
    Gadgets.rangeCheck64(b);
    Gadgets.rangeCheck64(carry);

    const ret = a.add(b).add(carry);

    Gadgets.rangeCheckN(128, ret);

    const upper = Provable.witness(Field, () => {
      return ret.toBigInt() >> 64n;
    });

    return [
      Field(Gadgets.and(ret, Field((1n << 64n) - 1n), 128)), // lower 64 bits
      upper, // upper bits as carry
    ];
  }

  /// Compute a - (b + borrow), returning the result and the new borrow.
  static sbb(a: Field, b: Field, borrow: Field): [Field, Field] {
    Gadgets.rangeCheck64(a);
    Gadgets.rangeCheck64(b);
    Gadgets.rangeCheck64(borrow);

    const ret = Provable.witness(Field, () => {
      const aBig = a.toBigInt();
      const bBig = b.toBigInt();
      const borrowBig = borrow.toBigInt();

      // wrapping sub
      return (aBig - bBig - borrowBig) & ((1n << 64n) - 1n);
    });

    Gadgets.rangeCheck64(ret);

    const newBorrow = Provable.if(
      a.lessThan(b.add(borrow)),
      Field(1),
      Field(0)
    );
    return [ret, newBorrow];
  }

  /// Compute a + (b * c) + carry, returning the result and the new carry over.
  static mac(a: Field, b: Field, c: Field, carry: Field): [Field, Field] {
    Gadgets.rangeCheck64(a);
    Gadgets.rangeCheck64(b);
    Gadgets.rangeCheck64(c);
    Gadgets.rangeCheck64(carry);

    const ret = Provable.witness(Field, () => {
      const mul = b.toBigInt() * c.toBigInt();
      return a.toBigInt() + mul + carry.toBigInt();
    });

    Gadgets.rangeCheckN(128, ret);

    const upper = Provable.witness(Field, () => {
      return ret.toBigInt() >> 64n;
    });

    return [Field(Gadgets.and(ret, Field((1n << 64n) - 1n), 128)), upper];
  }

  add(other: Fp): Fp {
    let [d0, d1, d2, d3, d4, d5] = [
      Field(0n),
      Field(0n),
      Field(0n),
      Field(0n),
      Field(0n),
      Field(0n),
    ];
    let carry = Field(0n);
    [d0, carry] = Fp.adc(this.value[0], other.value[0], Field(0n));
    [d1, carry] = Fp.adc(this.value[1], other.value[1], carry);
    [d2, carry] = Fp.adc(this.value[2], other.value[2], carry);
    [d3, carry] = Fp.adc(this.value[3], other.value[3], carry);
    [d4, carry] = Fp.adc(this.value[4], other.value[4], carry);
    [d5] = Fp.adc(this.value[5], other.value[5], carry);

    return Fp.fromFields([d0, d1, d2, d3, d4, d5]).subtractP();
  }

  subtractP(): Fp {
    let [r0, r1, r2, r3, r4, r5] = [
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
    ];
    let borrow = Field(0);

    [r0, borrow] = Fp.sbb(this.value[0], Fp.MODULUS[0], Field(0));
    [r1, borrow] = Fp.sbb(this.value[1], Fp.MODULUS[1], borrow);
    [r2, borrow] = Fp.sbb(this.value[2], Fp.MODULUS[2], borrow);
    [r3, borrow] = Fp.sbb(this.value[3], Fp.MODULUS[3], borrow);
    [r4, borrow] = Fp.sbb(this.value[4], Fp.MODULUS[4], borrow);
    [r5, borrow] = Fp.sbb(this.value[5], Fp.MODULUS[5], borrow);

    return new Fp({
      value: [r0, r1, r2, r3, r4, r5],
    });
  }

  sub(other: Fp): Fp {
    return other.negate().add(this);
  }

  div(other: Fp): Fp {
    return this.mul(other.inverse());
  }

  mod(other: Fp): Fp {
    other.isZero().assertFalse();

    const inverse = other.inverse();
    const quotient = this.mul(inverse);
    const product = quotient.mul(other);
    return this.sub(product);
  }

  square(): Fp {
    let t = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n].map(Field);

    // First handle diagonal terms
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
    this.isZero().assertFalse();

    // const inv = this.powVartime([
    //   Field(0xb9fe_ffff_ffff_aaa9n),
    //   Field(0x1eab_fffe_b153_ffffn),
    //   Field(0x6730_d2a0_f6b0_f624n),
    //   Field(0x6477_4b84_f385_12bfn),
    //   Field(0x4b1b_a7b6_434b_acd7n),
    //   Field(0x1a01_11ea_397f_e69an),
    // ]);
    const inv = this.pow(Fp.fromBigInt(P - 2n));

    return inv;
  }

  /**
   * Returns true if this element is zero.
   */
  isZero(): Bool {
    return this.equals(Fp.zero());
  }

  negate(): Fp {
    let [r0, r1, r2, r3, r4, r5] = [
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
    ];
    let borrow = Field(0);

    [r0, borrow] = Fp.sbb(Fp.MODULUS[0], this.value[0], Field(0));
    [r1, borrow] = Fp.sbb(Fp.MODULUS[1], this.value[1], borrow);
    [r2, borrow] = Fp.sbb(Fp.MODULUS[2], this.value[2], borrow);
    [r3, borrow] = Fp.sbb(Fp.MODULUS[3], this.value[3], borrow);
    [r4, borrow] = Fp.sbb(Fp.MODULUS[4], this.value[4], borrow);
    [r5, borrow] = Fp.sbb(Fp.MODULUS[5], this.value[5], borrow);

    const isZero = Gadgets.or(
      Gadgets.or(
        Gadgets.or(Gadgets.or(Gadgets.or(r0, r1, 64), r2, 64), r3, 64),
        r4,
        64
      ),
      r5,
      64
    ).equals(Field(0));
    const mask = Provable.if(isZero, Field(0xffffffffffffffffn), Field(0n));

    return new Fp({
      value: [
        Gadgets.and(r0, mask, 64),
        Gadgets.and(r1, mask, 64),
        Gadgets.and(r2, mask, 64),
        Gadgets.and(r3, mask, 64),
        Gadgets.and(r4, mask, 64),
        Gadgets.and(r5, mask, 64),
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
    let k = Provable.witness(Field, () => {
      const result = t0.mul(Fp.INV);
      return result.toBigInt() % 0xffff_ffff_ffff_ffffn;
    });
    k = Gadgets.and(k, Field((1n << 64n) - 1n), 64);
    [r0, carry] = Fp.mac(t0, k, Fp.MODULUS[0], Field(0));
    [r1, carry] = Fp.mac(t1, k, Fp.MODULUS[1], carry);
    [r2, carry] = Fp.mac(t2, k, Fp.MODULUS[2], carry);
    [r3, carry] = Fp.mac(t3, k, Fp.MODULUS[3], carry);
    [r4, carry] = Fp.mac(t4, k, Fp.MODULUS[4], carry);
    [r5, carry] = Fp.mac(t5, k, Fp.MODULUS[5], carry);
    [r6, r7] = Fp.adc(t6, Field(0), carry);

    // Second round
    k = Provable.witness(Field, () => {
      const result = r1.mul(Fp.INV);
      return result.toBigInt() % 0xffff_ffff_ffff_ffffn;
    });
    [r1, carry] = Fp.mac(r1, k, Fp.MODULUS[0], Field(0));
    [r2, carry] = Fp.mac(r2, k, Fp.MODULUS[1], carry);
    [r3, carry] = Fp.mac(r3, k, Fp.MODULUS[2], carry);
    [r4, carry] = Fp.mac(r4, k, Fp.MODULUS[3], carry);
    [r5, carry] = Fp.mac(r5, k, Fp.MODULUS[4], carry);
    [r6, carry] = Fp.mac(r6, k, Fp.MODULUS[5], carry);
    [r7, r8] = Fp.adc(t7, r7, carry);

    // Third round
    k = Provable.witness(Field, () => {
      const result = r2.mul(Fp.INV);
      return result.toBigInt() % 0xffff_ffff_ffff_ffffn;
    });
    [r2, carry] = Fp.mac(r2, k, Fp.MODULUS[0], Field(0));
    [r3, carry] = Fp.mac(r3, k, Fp.MODULUS[1], carry);
    [r4, carry] = Fp.mac(r4, k, Fp.MODULUS[2], carry);
    [r5, carry] = Fp.mac(r5, k, Fp.MODULUS[3], carry);
    [r6, carry] = Fp.mac(r6, k, Fp.MODULUS[4], carry);
    [r7, carry] = Fp.mac(r7, k, Fp.MODULUS[5], carry);
    [r8, r9] = Fp.adc(t8, r8, carry);

    // Fourth round
    k = Provable.witness(Field, () => {
      const result = r3.mul(Fp.INV);
      return result.toBigInt() % 0xffff_ffff_ffff_ffffn;
    });
    [r3, carry] = Fp.mac(r3, k, Fp.MODULUS[0], Field(0));
    [r4, carry] = Fp.mac(r4, k, Fp.MODULUS[1], carry);
    [r5, carry] = Fp.mac(r5, k, Fp.MODULUS[2], carry);
    [r6, carry] = Fp.mac(r6, k, Fp.MODULUS[3], carry);
    [r7, carry] = Fp.mac(r7, k, Fp.MODULUS[4], carry);
    [r8, carry] = Fp.mac(r8, k, Fp.MODULUS[5], carry);
    [r9, r10] = Fp.adc(t9, r9, carry);

    // Fifth round
    k = Provable.witness(Field, () => {
      const result = r4.mul(Fp.INV);
      return result.toBigInt() % 0xffff_ffff_ffff_ffffn;
    });
    [r4, carry] = Fp.mac(r4, k, Fp.MODULUS[0], Field(0));
    [r5, carry] = Fp.mac(r5, k, Fp.MODULUS[1], carry);
    [r6, carry] = Fp.mac(r6, k, Fp.MODULUS[2], carry);
    [r7, carry] = Fp.mac(r7, k, Fp.MODULUS[3], carry);
    [r8, carry] = Fp.mac(r8, k, Fp.MODULUS[4], carry);
    [r9, carry] = Fp.mac(r9, k, Fp.MODULUS[5], carry);
    [r10, r11] = Fp.adc(t10, r10, carry);

    // Sixth round
    k = Provable.witness(Field, () => {
      const result = r5.mul(Fp.INV);
      return result.toBigInt() % 0xffff_ffff_ffff_ffffn;
    });
    [r5, carry] = Fp.mac(r5, k, Fp.MODULUS[0], Field(0));
    [r6, carry] = Fp.mac(r6, k, Fp.MODULUS[1], carry);
    [r7, carry] = Fp.mac(r7, k, Fp.MODULUS[2], carry);
    [r8, carry] = Fp.mac(r8, k, Fp.MODULUS[3], carry);
    [r9, carry] = Fp.mac(r9, k, Fp.MODULUS[4], carry);
    [r10, carry] = Fp.mac(r10, k, Fp.MODULUS[5], carry);
    [r11, carry] = Fp.adc(t11, r11, carry);

    return new Fp({
      value: [r6, r7, r8, r9, r10, r11],
    }).subtractP();
  }

  equals(other: Fp): Bool {
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

  assertEquals(other: Fp) {
    this.equals(other).assertTrue();
  }

  /**
   * Multiplies two field elements in Montgomery form.
   * Returns a*b in Montgomery form.
   */
  mul(rhs: Fp): Fp {
    let t = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n].map(Field);

    // First round
    let carry = Field(0);
    [t[0], carry] = Fp.mac(t[0], this.value[0], rhs.value[0], Field(0));
    [t[1], carry] = Fp.mac(Field(0), this.value[0], rhs.value[1], carry);
    [t[2], carry] = Fp.mac(Field(0), this.value[0], rhs.value[2], carry);
    [t[3], carry] = Fp.mac(Field(0), this.value[0], rhs.value[3], carry);
    [t[4], carry] = Fp.mac(Field(0), this.value[0], rhs.value[4], carry);
    [t[5], t[6]] = Fp.mac(Field(0), this.value[0], rhs.value[5], carry);

    // Second round
    [t[1], carry] = Fp.mac(t[1], this.value[1], rhs.value[0], Field(0));
    [t[2], carry] = Fp.mac(t[2], this.value[1], rhs.value[1], carry);
    [t[3], carry] = Fp.mac(t[3], this.value[1], rhs.value[2], carry);
    [t[4], carry] = Fp.mac(t[4], this.value[1], rhs.value[3], carry);
    [t[5], carry] = Fp.mac(t[5], this.value[1], rhs.value[4], carry);
    [t[6], t[7]] = Fp.mac(t[6], this.value[1], rhs.value[5], carry);

    // Third round
    [t[2], carry] = Fp.mac(t[2], this.value[2], rhs.value[0], Field(0));
    [t[3], carry] = Fp.mac(t[3], this.value[2], rhs.value[1], carry);
    [t[4], carry] = Fp.mac(t[4], this.value[2], rhs.value[2], carry);
    [t[5], carry] = Fp.mac(t[5], this.value[2], rhs.value[3], carry);
    [t[6], carry] = Fp.mac(t[6], this.value[2], rhs.value[4], carry);
    [t[7], t[8]] = Fp.mac(t[7], this.value[2], rhs.value[5], carry);

    // Fourth round
    [t[3], carry] = Fp.mac(t[3], this.value[3], rhs.value[0], Field(0));
    [t[4], carry] = Fp.mac(t[4], this.value[3], rhs.value[1], carry);
    [t[5], carry] = Fp.mac(t[5], this.value[3], rhs.value[2], carry);
    [t[6], carry] = Fp.mac(t[6], this.value[3], rhs.value[3], carry);
    [t[7], carry] = Fp.mac(t[7], this.value[3], rhs.value[4], carry);
    [t[8], t[9]] = Fp.mac(t[8], this.value[3], rhs.value[5], carry);

    // Fifth round
    [t[4], carry] = Fp.mac(t[4], this.value[4], rhs.value[0], Field(0));
    [t[5], carry] = Fp.mac(t[5], this.value[4], rhs.value[1], carry);
    [t[6], carry] = Fp.mac(t[6], this.value[4], rhs.value[2], carry);
    [t[7], carry] = Fp.mac(t[7], this.value[4], rhs.value[3], carry);
    [t[8], carry] = Fp.mac(t[8], this.value[4], rhs.value[4], carry);
    [t[9], t[10]] = Fp.mac(t[9], this.value[4], rhs.value[5], carry);

    // Sixth round
    [t[5], carry] = Fp.mac(t[5], this.value[5], rhs.value[0], Field(0));
    [t[6], carry] = Fp.mac(t[6], this.value[5], rhs.value[1], carry);
    [t[7], carry] = Fp.mac(t[7], this.value[5], rhs.value[2], carry);
    [t[8], carry] = Fp.mac(t[8], this.value[5], rhs.value[3], carry);
    [t[9], carry] = Fp.mac(t[9], this.value[5], rhs.value[4], carry);
    [t[10], t[11]] = Fp.mac(t[10], this.value[5], rhs.value[5], carry);

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
    const sqrt = this.pow(Fp.fromBigInt((P + 1n) / 4n));
    sqrt.square().assertEquals(this);
    return sqrt;
  }

  private powVartime(by: Field[]): Fp {
    let res = Fp.one();

    for (let i = by.length - 1; i >= 0; i--) {
      const limb = by[i];
      Gadgets.rangeCheck64(limb);
      for (let j = 63; j >= 0; j--) {
        res = res.square();

        const rightShiftedLimb = Provable.witness(Field, () => {
          return limb.toBigInt() >> BigInt(j);
        });
        if (
          Gadgets.and(rightShiftedLimb, Field(1), 64)
            .equals(Field(1))
            .equals(Bool(true))
        ) {
          res = res.mul(this);
        }
      }
    }

    return res;
  }

  pow(exp: Fp): Fp {
    return this.powVartime(exp.value);
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
//       result.push(value & ((1n << 64n) - 1n));
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
//         Field((1n << 64n) - 1n),
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
//       result.push(value & ((1n << 64n) - 1n));
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
//       result.push(value & ((1n << 64n) - 1n));
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
//       Field((1n << 64n) - 1n),
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
