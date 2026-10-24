// Мини-загрузчик .env: строки вида КЛЮЧ=значение из файла .env в корне проекта.
// Файл .env не попадает в git (см. .gitignore) — пароли не утекут на GitHub.
import { existsSync, readFileSync } from 'node:fs';

const file = new URL('../.env', import.meta.url);
if (existsSync(file)) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
