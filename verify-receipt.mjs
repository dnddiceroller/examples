#!/usr/bin/env node
// verify-receipt: does this hash belong to this public beacon record?
//
//   node verify-receipt.mjs nist  <pulse> <hash>
//   node verify-receipt.mjs drand <round> <hash> [chain-hash]
//   node verify-receipt.mjs '<certificate URL>'
//
// Fetches the record straight from the beacon and compares. Exit code:
// 0 match, 1 mismatch, 2 could not check (bad input or beacon unreachable).
//
// A simplified example. It compares the hash with the beacon's published
// value; it does not verify NIST's or drand's signatures on the record.

const NIST = 'https://beacon.nist.gov/beacon/2.0';
const DRAND = 'https://api.drand.sh';
// drand's default ("League of Entropy mainnet") chain, as listed at https://api.drand.sh/chains
const DRAND_DEFAULT_CHAIN = '8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce';

function usage(msg) {
  if (msg) console.error(msg + '\n');
  console.error(`usage:
  node verify-receipt.mjs nist  <pulse> <hash>
  node verify-receipt.mjs drand <round> <hash> [chain-hash]
  node verify-receipt.mjs '<certificate URL>'`);
  process.exit(2);
}

function fromArgs(argv) {
  if (argv.length === 1 && /^https?:\/\//.test(argv[0])) {
    const q = new URL(argv[0]).searchParams;
    const src = (q.get('src') || 'nist-beacon').toLowerCase();
    return {
      source: src === 'drand' ? 'drand' : 'nist',
      chain: q.get('chain') || '',
      pulse: q.get('pulse') || '',
      hash: q.get('hash') || '',
    };
  }
  const [source, pulse, hash, chain] = argv;
  if (source === 'nist') return { source, pulse, hash, chain: '2' };
  if (source === 'drand') return { source, pulse, hash, chain: chain || DRAND_DEFAULT_CHAIN };
  usage(source ? `unknown source "${source}"` : '');
}

const r = fromArgs(process.argv.slice(2));
const clean = (h) => String(h || '').replace(/[^0-9a-f]/gi, '').toLowerCase();
const claimed = clean(r.hash);
if (!/^\d+$/.test(r.pulse || '')) usage('pulse / round must be a number');
if (!claimed) usage('hash is missing');
if (!r.chain) usage('chain is missing');

const recordUrl = r.source === 'drand'
  ? `${DRAND}/${encodeURIComponent(r.chain)}/public/${r.pulse}`
  : `${NIST}/chain/${encodeURIComponent(r.chain)}/pulse/${r.pulse}`;

let record;
try {
  const res = await fetch(recordUrl, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  record = await res.json();
} catch (e) {
  console.error(`could not reach the beacon: ${e.message}\n  ${recordUrl}`);
  process.exit(2);
}

let published, when = null;
if (r.source === 'drand') {
  published = clean(record.randomness);
} else {
  const p = record.pulse || record;
  published = clean(p.outputValue);
  when = p.timeStamp || null;
}

const match = published === claimed;
const label = r.source === 'drand' ? `drand round ${r.pulse}` : `NIST chain ${r.chain} pulse ${r.pulse}`;

console.log(label);
if (when) console.log(`  issued     ${when}`);
console.log(`  record     ${recordUrl}`);
console.log(`  claimed    ${claimed}`);
console.log(`  published  ${published}`);
console.log(match
  ? 'MATCH: the hash is the one the beacon published for this record.'
  : 'MISMATCH: the beacon published a different value for this record.');
process.exit(match ? 0 : 1);
