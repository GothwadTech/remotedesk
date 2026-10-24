import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

const SCAN_DIRS = ['src', 'agent', 'scripts', 'docs', 'public', '.github', 'tools'];
const SCAN_FILES = ['README.md', 'index.html', 'tests/protocol-and-auth.test.ts'];

const DEVANAGARI_RE = /[\u0900-\u097F]/;

// Common Romanized Hindi / Hinglish words that must never appear in UI, code comments, scripts, or docs
const HINGLISH_WORDS = [
  'aap',
  'aapka',
  'aapke',
  'aapki',
  'abhi',
  'agar',
  'andar',
  'apna',
  'apne',
  'apni',
  'aur',
  'banao',
  'bilkul',
  'bina',
  'chahiye',
  'chalao',
  'chalega',
  'dekho',
  'dono',
  'dost',
  'dusra',
  'dusre',
  'ekdam',
  'ghar',
  'hai',
  'hain',
  'hoga',
  'hogi',
  'hota',
  'hoti',
  'isliye',
  'jab',
  'jaisa',
  'jaise',
  'kaha',
  'kaise',
  'karega',
  'karein',
  'karna',
  'karne',
  'karo',
  'karta',
  'karte',
  'kisi',
  'koi',
  'kuch',
  'kya',
  'kyunki',
  'lekin',
  'liye',
  'matlab',
  'mein',
  'mera',
  'mere',
  'nahi',
  'nahin',
  'pehle',
  'phir',
  'poora',
  'pura',
  'rakho',
  'rahega',
  'sabhi',
  'sakta',
  'sakte',
  'samay',
  'saath',
  'seedha',
  'sirf',
  'tum',
  'tumhara',
  'uske',
  'uska',
  'uskee',
  'wala',
  'wale',
  'wali',
  'wapas',
  'yahan',
  'yeh',
  'zaroor',
  'zarurat',
];

const HINGLISH_RE = new RegExp(`\\b(${HINGLISH_WORDS.join('|')})\\b`, 'i');

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx|js|mjs|css|html|json|md|py|ps1|sh|yml|yaml)$/i.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Pure English Repository & UI Hygiene', () => {
  it('contains zero Devanagari characters or Hinglish words across UI, scripts, agent, and docs', () => {
    const files: string[] = [];
    for (const d of SCAN_DIRS) {
      files.push(...collectFiles(join(ROOT, d)));
    }
    for (const f of SCAN_FILES) {
      files.push(join(ROOT, f));
    }

    const violations: string[] = [];

    for (const filePath of files) {
      const rel = relative(ROOT, filePath);
      const lines = readFileSync(filePath, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        if (DEVANAGARI_RE.test(line)) {
          violations.push(`${rel}:${idx + 1} [Devanagari] ${line.trim()}`);
        } else {
          const m = line.match(HINGLISH_RE);
          if (m) {
            violations.push(`${rel}:${idx + 1} [Hinglish "${m[1]}"] ${line.trim()}`);
          }
        }
      });
    }

    assert.equal(
      violations.length,
      0,
      `Found non-English / Hinglish strings:\n${violations.slice(0, 40).join('\n')}`,
    );
  });
});
