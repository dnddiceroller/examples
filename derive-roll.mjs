#!/usr/bin/env node
// derive-roll: a toy showing how public beacon output plus a secret key can
// become fair die faces.
//
//   node derive-roll.mjs <chain> <pulse> <hash> [--dice 4d6] [--account demo] [--nonce 1]
//
// THIS IS NOT THE PRODUCTION DERIVATION. It uses a fake key that everyone can
// read, so its numbers will never match a roll on dnddiceroller.com. It exists
// to show two ideas:
//
//  1. Counter expansion. HMAC-SHA256(key, "chain:pulse:hash:account:nonce:counter")
//     gives 32 bytes; bump the counter for more. With a secret key, nobody
//     holding only the public pulse can compute the output.
//  2. Rejection sampling. `x % 6` on a random 32-bit number very slightly
//     favours low faces, because 2^32 is not a multiple of 6. Throwing away
//     values at or above the largest multiple of 6 removes the bias completely.

import { createHmac } from 'node:crypto';

const DEMO_KEY = 'demo-key-not-production';

function args(argv) {
  const out = { dice: '4d6', account: 'demo', nonce: '1', pos: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dice') out.dice = argv[++i];
    else if (a === '--account') out.account = argv[++i];
    else if (a === '--nonce') out.nonce = argv[++i];
    else out.pos.push(a);
  }
  return out;
}

const o = args(process.argv.slice(2));
const [chain, pulse, hash] = o.pos;
const m = String(o.dice).match(/^(\d*)d(\d+)$/i);
if (!chain || !pulse || !hash || !m) {
  console.error('usage: node derive-roll.mjs <chain> <pulse> <hash> [--dice 4d6] [--account demo] [--nonce 1]');
  process.exit(2);
}
const count = m[1] === '' ? 1 : Number(m[1]);
const sides = Number(m[2]);
if (count < 1 || sides < 2 || sides > 2 ** 32) {
  console.error('dice must be NdX with N >= 1 and 2 <= X <= 2^32');
  process.exit(2);
}

// A stream of 32-bit words from HMAC blocks, one block per counter value.
function* words() {
  for (let counter = 0; ; counter++) {
    const msg = `${chain}:${pulse}:${hash.toLowerCase()}:${o.account}:${o.nonce}:${counter}`;
    const block = createHmac('sha256', DEMO_KEY).update(msg).digest();
    for (let i = 0; i < block.length; i += 4) yield { word: block.readUInt32BE(i), counter };
  }
}

// Accept only words below the largest multiple of `sides` that fits in 2^32.
const limit = Math.floor(2 ** 32 / sides) * sides;
const stream = words();
const faces = [];
let rejected = 0, lastCounter = 0;
while (faces.length < count) {
  const { word, counter } = stream.next().value;
  lastCounter = counter;
  if (word >= limit) { rejected++; continue; }
  faces.push((word % sides) + 1);
}

console.log(`toy derivation  key="${DEMO_KEY}" (public, fake)`);
console.log(`  input   ${chain}:${pulse}:${hash.toLowerCase().slice(0, 16)}...:${o.account}:${o.nonce}:<counter>`);
console.log(`  blocks  ${lastCounter + 1} HMAC-SHA256 block(s), ${rejected} word(s) rejected`);
console.log(`  ${o.dice}    ${faces.join(', ')}  (total ${faces.reduce((a, b) => a + b, 0)})`);
