import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN = ['src', 'tests', 'tools', 'public', 'docs', 'agent', 'scripts'];
const ROOT_FILES = ['README.md', 'index.html', 'vite.config.ts'];
const CODE = /\.(ts|tsx|mjs|js|css|html|md|py|ps1|sh)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dev-dist', 'coverage', '.git']);
const MAX = 500;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (CODE.test(name)) out.push(full);
  }
  return out;
}

const files = [
  ...SCAN.flatMap((dir) => {
    try {
      return walk(join(ROOT, dir));
    } catch {
      return [];
    }
  }),
  ...ROOT_FILES.map((name) => join(ROOT, name)).filter((file) => {
    try {
      return statSync(file).isFile();
    } catch {
      return false;
    }
  }),
];

const rows = files
  .map((file) => {
    const lines = readFileSync(file, 'utf8').replace(/\n$/, '').split('\n').length;
    return { file: relative(ROOT, file), lines };
  })
  .sort((a, b) => b.lines - a.lines);

const over = rows.filter((r) => r.lines > MAX);
console.log(`file size check: ${rows.length} files (GothwadTech hard max ${MAX} lines)`);
for (const r of over) {
  console.error(`  FAIL  ${String(r.lines).padStart(5)}  ${r.file} — over ${MAX}-line limit`);
}

if (over.length > 0) {
  process.exit(1);
}
console.log('ok: all files satisfy <= 500 lines');
