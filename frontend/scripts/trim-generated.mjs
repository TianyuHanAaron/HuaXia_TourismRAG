import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const generatedRoot = new URL('../src/api/generated/', import.meta.url);

async function trimFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const trimmed = `${content.replace(/\s+$/u, '')}\n`;
  if (trimmed !== content) {
    await writeFile(filePath, trimmed);
  }
}

async function trimGeneratedFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) => {
      const childPath = join(directoryUrl.pathname, entry.name);
      if (entry.isDirectory()) {
        return trimGeneratedFiles(new URL(`${entry.name}/`, directoryUrl));
      }
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        return trimFile(childPath);
      }
      return Promise.resolve();
    }),
  );
}

await trimGeneratedFiles(generatedRoot);
