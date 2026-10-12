import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { env } from "../../../db/env";
import { ensureDatabase } from "../../../db/runtime";

// Restaura o backup exportado do site antigo (o ZIP "Preforte-exportacao").
// Só funciona enquanto o site tem apenas os projetos de exemplo, para nunca sobrescrever dados reais.
// Os dados de exemplo são apagados e substituídos pelo backup.
export async function POST(request: Request) {
  await ensureDatabase();
  const raw = env.DB as unknown as { prepare(sql: string): { first(): Promise<Record<string, unknown> | null> } };
  const existing = await raw.prepare("SELECT count(*) AS n FROM projects WHERE id NOT LIKE 'p-%'").first().catch(() => ({ n: 0 }));
  if (Number(existing?.n ?? 0) > 0) return back("ja-tem-dados");

  const form = await request.formData();
  const file = form.get("arquivo");
  if (!(file instanceof File)) return back("sem-arquivo");

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return back("zip-invalido");
  }
  const find = (suffix: string) => Object.keys(files).find((k) => k.endsWith(suffix));
  const dbKey = find("dados/preforte.sqlite");
  if (!dbKey) return back("sem-banco");

  const dir = mkdtempSync(join(tmpdir(), "restaurar-"));
  const tmp = join(dir, "backup.sqlite");
  writeFileSync(tmp, files[dbKey]);
  const src = new DatabaseSync(tmp, { readOnly: true });
  const live = (env.DB as unknown as { db: DatabaseSync }).db;
  let total = 0;
  try {
    const tables = src.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\'").all() as { name: string }[];
    live.exec("BEGIN");
    for (const { name } of tables) {
      const liveCols = new Set((live.prepare(`PRAGMA table_info("${name}")`).all() as { name: string }[]).map((c) => c.name));
      if (!liveCols.size) continue;
      live.exec(`DELETE FROM "${name}"`);
      const rows = src.prepare(`SELECT * FROM "${name}"`).all() as Record<string, unknown>[];
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => liveCols.has(c));
        live.prepare(`INSERT OR REPLACE INTO "${name}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
          .run(...cols.map((c) => row[c] as never));
        total++;
      }
    }
    live.exec("COMMIT");
  } catch (e) {
    live.exec("ROLLBACK");
    console.error(e);
    return back("falhou");
  } finally {
    src.close();
    rmSync(dir, { recursive: true, force: true });
  }

  const manKey = find("midia/manifesto.json");
  if (manKey) {
    const manifest = JSON.parse(new TextDecoder().decode(files[manKey])) as { object_key: string; content_type: string; arquivo: string }[];
    for (const m of manifest) {
      const k = find(m.arquivo);
      if (k) await env.MEDIA.put(m.object_key, files[k], { httpMetadata: { contentType: m.content_type } });
    }
  }
  return back(`ok-${total}`);
}

function back(code: string) {
  return new Response(null, { status: 303, headers: { Location: `/restaurar?r=${code}` } });
}
