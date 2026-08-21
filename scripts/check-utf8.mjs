import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDirectory = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const checkedExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.jsx', '.json', '.md', '.mjs',
  '.scss', '.sql', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const mojibakePattern = /[\u00c3\u00c4\u00c5\u00c2]|\u00e2(?:\u20ac|\u0153|\u02dc)|\u00f0\u0178|\u00ef\u00b8|\ufffd/u;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
const failures = [];

async function inspectDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (absolutePath.endsWith(path.join('supabase', '.temp'))) continue;
      await inspectDirectory(absolutePath);
      continue;
    }

    if (!entry.isFile() || !checkedExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    const relativePath = path.relative(rootDirectory, absolutePath);
    const bytes = await readFile(absolutePath);
    let content;

    try {
      content = utf8Decoder.decode(bytes);
    } catch {
      failures.push(`${relativePath}: geçerli UTF-8 değil`);
      continue;
    }

    const lines = content.split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (mojibakePattern.test(line)) {
        failures.push(`${relativePath}:${index + 1}: olası bozuk karakter dizisi`);
      }
    });
  }
}

await inspectDirectory(rootDirectory);

if (failures.length > 0) {
  console.error('UTF-8 kontrolü başarısız:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('UTF-8 kontrolü başarılı.');
