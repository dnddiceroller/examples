# examples

From the team behind [dnddiceroller.com](https://dnddiceroller.com) · [more from us](https://github.com/dnddiceroller)

Small, runnable, deliberately simplified. Each one shows an idea from [roll-verification-spec](https://github.com/dnddiceroller/roll-verification-spec) in a single file you can read in five minutes. None of it is production code.

Node 20 or later. No dependencies.

| File | What it shows |
| --- | --- |
| `verify-receipt.mjs` | Check a receipt's hash against the public beacon, yourself |
| `derive-roll.mjs` | How beacon output plus a secret key becomes fair die faces (toy key) |

## verify-receipt.mjs

Give it a NIST pulse (chain 2) or a drand round, plus the hash from your receipt. It fetches the record from the beacon itself and tells you whether they match. Exit code 0 is a match, 1 a mismatch, 2 means it could not check.

```sh
node verify-receipt.mjs nist  <pulse> <hash>
node verify-receipt.mjs drand <round> <hash> [chain-hash]
node verify-receipt.mjs '<certificate URL>'
```

Real run against NIST pulse 1966282, 2 Oct 2026:

```
$ H=CA3A91D8E43B4B9B659BF5C8E327B3CAEE8570CA964DA0708BCCDB6E0910C8427DD18772EA0283A7523B2704C259C6DD0BB914BFA299C0B9E75561018B924BEA
$ node verify-receipt.mjs nist 1966282 $H
NIST chain 2 pulse 1966282
  issued     2026-10-02T01:28:00.000Z
  record     https://beacon.nist.gov/beacon/2.0/chain/2/pulse/1966282
  claimed    ca3a91d8e43b4b9b659bf5c8e327b3caee8570ca964da0708bccdb6e0910c8427dd18772ea0283a7523b2704c259c6dd0bb914bfa299c0b9e75561018b924bea
  published  ca3a91d8e43b4b9b659bf5c8e327b3caee8570ca964da0708bccdb6e0910c8427dd18772ea0283a7523b2704c259c6dd0bb914bfa299c0b9e75561018b924bea
MATCH: the hash is the one the beacon published for this record.
```

Change the last hex digit and it fails:

```
$ node verify-receipt.mjs nist 1966282 CA3A91D8...8B924BE0
NIST chain 2 pulse 1966282
  issued     2026-10-02T01:28:00.000Z
  record     https://beacon.nist.gov/beacon/2.0/chain/2/pulse/1966282
  claimed    ca3a91d8e43b4b9b659bf5c8e327b3caee8570ca964da0708bccdb6e0910c8427dd18772ea0283a7523b2704c259c6dd0bb914bfa299c0b9e75561018b924be0
  published  ca3a91d8e43b4b9b659bf5c8e327b3caee8570ca964da0708bccdb6e0910c8427dd18772ea0283a7523b2704c259c6dd0bb914bfa299c0b9e75561018b924bea
MISMATCH: the beacon published a different value for this record.
```

drand works the same way. With no chain hash given it uses drand's default chain:

```
$ node verify-receipt.mjs drand 6515784 2f08f9b59c1fbb4974362ae265577eca8068fb03f2f0be90934fd919572e2d59
drand round 6515784
  record     https://api.drand.sh/8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce/public/6515784
  claimed    2f08f9b59c1fbb4974362ae265577eca8068fb03f2f0be90934fd919572e2d59
  published  2f08f9b59c1fbb4974362ae265577eca8068fb03f2f0be90934fd919572e2d59
MATCH: the hash is the one the beacon published for this record.
```

Or paste a whole certificate link from your roll log. The script reads `src`, `chain`, `pulse` and `hash` from it.

What it does not do: check NIST's or drand's signatures on the record. It trusts the HTTPS connection to the beacon. Both beacons publish everything needed to check signatures too, if you want to go further.

## derive-roll.mjs

A toy. It uses the key `demo-key-not-production`, which is public and fake, so its numbers will never match a roll on the site. It shows two ideas:

1. **Counter expansion.** `HMAC-SHA256(key, "chain:pulse:hash:account:nonce:counter")` gives 32 bytes. Need more dice? Bump the counter. With a secret key, someone holding only the public pulse cannot compute the output, so cannot predict your roll.
2. **Rejection sampling.** `x % 6` on a random 32-bit number very slightly favours low faces, because 2^32 is not a multiple of 6. Throwing away any value at or above the largest multiple of 6 removes the bias completely.

```
$ node derive-roll.mjs 2 1966282 $H --dice 4d6 --nonce 1
toy derivation  key="demo-key-not-production" (public, fake)
  input   2:1966282:ca3a91d8e43b4b9b...:demo:1:<counter>
  blocks  1 HMAC-SHA256 block(s), 0 word(s) rejected
  4d6    2, 1, 6, 2  (total 11)

$ node derive-roll.mjs 2 1966282 $H --dice 4d6 --nonce 2
toy derivation  key="demo-key-not-production" (public, fake)
  input   2:1966282:ca3a91d8e43b4b9b...:demo:2:<counter>
  blocks  1 HMAC-SHA256 block(s), 0 word(s) rejected
  4d6    3, 1, 6, 1  (total 11)
```

Same pulse, new nonce, new dice. Same inputs always give the same dice.

## Licence

MIT. Copyright Iron Code Studios.
