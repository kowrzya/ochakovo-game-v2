// Удаляет «живые» тестовые заявки и прохождения (всё, что не помечено как демо).
// npm run clear:test         — удалить тестовые данные, демо оставить
// npm run clear:test -- --all — удалить вообще всё (и демо тоже)
import { db } from './db.js';

const all = process.argv.includes('--all');
const where = all ? '' : 'WHERE is_demo = 0';
const apps = db.prepare(`DELETE FROM applications ${where}`).run().changes;
const events = db.prepare(`DELETE FROM events ${where}`).run().changes;
console.log(`✓ Удалено заявок: ${apps}, событий: ${events}${all ? ' (включая демо)' : ' (демо-данные оставлены)'}`);
