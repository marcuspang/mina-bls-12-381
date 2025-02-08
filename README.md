# BLS12-381 in o1js

Prove $$e(Public Key, Hash(message)) == e(G1, Signature)$$

## Details

Fp - prime field of modulus 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab

Fp2, Fp6, Fp12 - extension fields of Fp by irreducible polynomials

G1 - elliptic curve group over E(Fp)

G2 - elliptic curve group over E'(Fp2)

Gt - target group for pairing

## Aggregation

Prove $$e(Public Key Aggregated, Hash(message)) == e(G1, Signature Aggregated)$$ where $$Public Key Aggregated = \sum_{i=1}^{n} Public Key i$$ (G1 points) and $$Signature Aggregated = \sum_{i=1}^{n} Signature i$$ (G2 points)
