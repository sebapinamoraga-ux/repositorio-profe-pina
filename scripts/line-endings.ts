import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const write = process.argv.includes('--write');
const listArguments = [
  'ls-files',
  '--eol',
  '--cached',
  '--others',
  '--exclude-standard',
];
const output = execFileSync('git', listArguments, {
  encoding: 'utf8',
});
const invalidLines = output
  .split('\n')
  .filter((line) => /(?:i|w)\/(?:crlf|mixed)/.test(line));

if (write) {
  for (const line of invalidLines) {
    const separator = line.indexOf('\t');
    if (separator < 0) continue;
    const path = line.slice(separator + 1);
    const content = readFileSync(path, 'utf8');
    writeFileSync(path, content.replace(/\r\n?/g, '\n'), 'utf8');
  }
}

const remaining = write
  ? execFileSync('git', listArguments, { encoding: 'utf8' })
      .split('\n')
      .filter((line) => /(?:i|w)\/(?:crlf|mixed)/.test(line))
  : invalidLines;

if (remaining.length > 0) {
  console.error('Se encontraron archivos rastreados fuera de la política LF:');
  for (const line of remaining) console.error(`- ${line}`);
  console.error('Corrige con: npm run line-endings:fix');
  process.exitCode = 1;
} else {
  console.log('Finales de línea válidos: todos los archivos de texto usan LF.');
}
