import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ||= value;
  }
}

function databasePath() {
  const url = process.env.DATABASE_URL || "file:./dev.db";

  if (!url.startsWith("file:")) {
    throw new Error("DATABASE_URL precisa usar SQLite no formato file:./dev.db para o MVP local.");
  }

  const filePath = url.slice("file:".length);
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), "prisma", filePath);
}

loadEnv();

const migrationPath = path.join(process.cwd(), "prisma", "migrations", "0001_init", "migration.sql");
const dbPath = databasePath();

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
const migration = fs.readFileSync(migrationPath, "utf8");

db.exec("PRAGMA foreign_keys = ON;");
db.exec(migration);
db.close();

console.log(`SQLite pronto em ${dbPath}`);
