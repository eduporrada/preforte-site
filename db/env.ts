/**
 * Substitui o `env` da Cloudflare quando o site roda na VPS.
 *
 * - DB: banco SQLite em arquivo, com a mesma interface do Cloudflare D1
 *   (prepare/bind/first/all/run/raw/batch), para as rotas não precisarem mudar.
 * - MEDIA: armazenamento de arquivos em pasta local, com a mesma interface do R2.
 *   Na fase do OneDrive, esta pasta passa a ser a pasta sincronizada.
 *
 * Variáveis:
 *   PREFORTE_DATA_DIR  pasta dos dados (padrão: ./dados)
 */
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const DATA_DIR = resolve(process.env.PREFORTE_DATA_DIR ?? "dados");
const DB_FILE = join(DATA_DIR, "preforte.sqlite");
const MEDIA_DIR = join(DATA_DIR, "midia");

type Row = Record<string, unknown>;
type D1Result<T = Row> = {
  results: T[];
  success: true;
  meta: { changes: number; last_row_id: number; duration: number };
};

function toValue(v: unknown): SQLInputValue {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v as SQLInputValue;
}

function normalize(row: unknown): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row as Row)) out[k] = typeof v === "bigint" ? Number(v) : v;
  return out;
}

class Statement {
  constructor(private db: DatabaseSync, readonly sql: string, private params: SQLInputValue[] = []) {}

  bind(...values: unknown[]) {
    return new Statement(this.db, this.sql, values.map(toValue));
  }

  private stmt() {
    return this.db.prepare(this.sql);
  }

  private isReader() {
    return /^\s*(select|with|pragma)\b/i.test(this.sql) || /\breturning\b/i.test(this.sql);
  }

  execute(): D1Result {
    const start = Date.now();
    if (this.isReader()) {
      const results = this.stmt().all(...this.params).map(normalize);
      return { results, success: true, meta: { changes: 0, last_row_id: 0, duration: Date.now() - start } };
    }
    const info = this.stmt().run(...this.params);
    return {
      results: [],
      success: true,
      meta: {
        changes: Number(info.changes),
        last_row_id: Number(info.lastInsertRowid),
        duration: Date.now() - start,
      },
    };
  }

  async all<T = Row>() {
    return this.execute() as D1Result<T>;
  }

  async run<T = Row>() {
    return this.execute() as D1Result<T>;
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.stmt().get(...this.params);
    if (!row) return null;
    const r = normalize(row);
    return (column ? r[column] : r) as T;
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const stmt = this.stmt();
    stmt.setReturnArrays?.(true);
    return stmt.all(...this.params) as T[];
  }
}

class Database {
  readonly db: DatabaseSync;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  }

  prepare(sql: string) {
    return new Statement(this.db, sql);
  }

  async batch(statements: Statement[]) {
    this.db.exec("BEGIN");
    try {
      const results = statements.map((s) => s.execute());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}

type PutOptions = { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> };

class FolderBucket {
  constructor(private root: string) {}

  private path(key: string) {
    const full = resolve(this.root, key);
    if (!full.startsWith(resolve(this.root) + sep)) throw new Error("Chave de arquivo inválida");
    return full;
  }

  async put(key: string, value: ArrayBuffer | Uint8Array, options?: PutOptions) {
    const file = this.path(key);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value));
    writeFileSync(file + ".meta.json", JSON.stringify({ contentType: options?.httpMetadata?.contentType ?? "application/octet-stream" }));
    return { key };
  }

  async get(key: string) {
    const file = this.path(key);
    if (!existsSync(file)) return null;
    const data = readFileSync(file);
    let contentType = "application/octet-stream";
    try {
      contentType = JSON.parse(readFileSync(file + ".meta.json", "utf8")).contentType ?? contentType;
    } catch {}
    return {
      body: new Blob([data]).stream(),
      size: statSync(file).size,
      httpMetadata: { contentType },
    };
  }

  async delete(key: string) {
    const file = this.path(key);
    rmSync(file, { force: true });
    rmSync(file + ".meta.json", { force: true });
  }
}

const globalStore = globalThis as unknown as { __preforteEnv?: { DB: Database; MEDIA: FolderBucket } };

export const env =
  globalStore.__preforteEnv ??
  (globalStore.__preforteEnv = { DB: new Database(DB_FILE), MEDIA: new FolderBucket(MEDIA_DIR) });
