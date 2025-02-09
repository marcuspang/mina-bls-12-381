# BLS12-381 in o1js

Goal: prove $$e(Public Key, Hash(message)) == e(G1, Signature)$$

Approach:

1. Create Fp, Fp2, Fp6, Fp12, G1, G2, Gt classes
2. Implement Miller Loop
3. Implement Final Exponentiation
4. Prove $$e(G2, G1^m) == e(Public Key, Hash(message))$$ in program

## Inspirations

- <https://github.com/kroma-network/bls12-381>
- <https://github.com/paulmillr/noble-bls12-381>
- <https://github.com/boray/o1js-bigint>

## Details

`Fp` - prime field of modulus `0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab`

`Fp2`, `Fp6`, `Fp12` - extension fields of `Fp` by irreducible polynomials

`G1` - elliptic curve group over `E(Fp)`

`G2` - elliptic curve group over `E'(Fp2)`

`Gt` - target group for pairing

## Problems

1. Most code beyond Fp6 is over constraints, steps to modularize the logic is still in progress. See `src/fp6-program.ts` for an example of the inverse program split up into 3 smaller ones
2. Need to do more rigorous checks in pairing implementation, currently it is loosely based off of `noble-bls12-381`, which is archived
3. Most of the code is not optimized

### Aggregation

Simply prove $$e(Public Key Aggregated, Hash(message)) == e(G1, Signature Aggregated)$$ where $$Public Key Aggregated = \sum_{i=1}^{n} Public Key i$$ (G1 points) and $$Signature Aggregated = \sum_{i=1}^{n} Signature i$$ (G2 points)

## TODOs

- [ ] compile all primitive programs with benchmark programs to make sure they are not over constraints
- [ ] compile signature program with benchmark program to make sure it is not over constraints
- [ ] get all unit tests working with fast-check (mainly for `Fp`)
- [ ] add examples for batch verification
- [ ] frontend to try generating client side proofs
