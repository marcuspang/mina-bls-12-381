# BLS12-381 in o1js

Prove $$e(Public Key, Hash(message)) == e(G1, Signature)$$

## Aggregation

Prove $$e(Public Key Aggregated, Hash(message)) == e(G1, Signature Aggregated)$$ where $$Public Key Aggregated = \sum_{i=1}^{n} Public Key i$$ (G1 points) and $$Signature Aggregated = \sum_{i=1}^{n} Signature i$$ (G2 points)
