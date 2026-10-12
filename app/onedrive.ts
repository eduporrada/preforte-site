/**
 * OneDrive do escritório, acessado pelo rclone instalado no container do site.
 * A configuração (com o acesso autorizado pelo dono) fica em /dados/rclone.conf.
 * Tudo acontece dentro da pasta EDUARDO do OneDrive.
 */
import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { env } from "../db/env";

const DATA_DIR = resolve(process.env.PREFORTE_DATA_DIR ?? "dados");
const CONF = join(DATA_DIR, "rclone.conf");
export const RAIZ = "EDUARDO";
const REMOTO = "onedrive";

// Pastas que os agentes nunca podem ler nem alterar.
export const BLOQUEADAS_AGENTES = ["CERTIFICADOS", "DOCUMENTOS EDUARDO"];

import { CATEGORIAS, categoriaDoTipo } from "./categorias";
export { CATEGORIAS, categoriaDoTipo };

export function nomeSeguro(nome: string) {
  return nome.replace(/[\\/:*?"<>|#%]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "") || "Sem nome";
}

/** Caminho relativo à pasta EDUARDO, sem barras soltas nem "..". */
export function limparCaminho(caminho: string) {
  const partes = caminho.split(/[\\/]+/).map((p) => p.trim()).filter(Boolean);
  if (partes.some((p) => p === ".." || p === ".")) throw new Error("Caminho inválido");
  return partes.join("/");
}

export function bloqueadoParaAgente(caminho: string) {
  const primeira = limparCaminho(caminho).split("/")[0]?.toUpperCase() ?? "";
  return BLOQUEADAS_AGENTES.includes(primeira);
}

export function conectado() {
  return existsSync(CONF) && readFileSync(CONF, "utf8").includes(`[${REMOTO}]`);
}

function alvo(caminho: string) {
  const rel = limparCaminho(caminho);
  return `${REMOTO}:${RAIZ}${rel ? "/" + rel : ""}`;
}

function rclone(args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((ok, falha) => {
    const p = spawn("rclone", ["--config", CONF, ...args]);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => err.push(d));
    p.on("error", falha);
    p.on("close", (code) => (code === 0 ? ok(Buffer.concat(out)) : falha(new Error(Buffer.concat(err).toString() || `rclone saiu com ${code}`))));
    if (input) p.stdin.end(input);
    else p.stdin.end();
  });
}

/**
 * Recebe o texto que o `rclone authorize "onedrive"` mostrou no PC do dono
 * (um JSON com access_token e refresh_token) e grava a configuração.
 */
export async function conectar(textoToken: string) {
  const inicio = textoToken.indexOf("{");
  const fim = textoToken.lastIndexOf("}");
  if (inicio < 0 || fim < inicio) throw new Error("Não encontrei o código. Copie tudo entre ---> e <---End paste.");
  const token = JSON.parse(textoToken.slice(inicio, fim + 1)) as { access_token?: string };
  if (!token.access_token) throw new Error("O código colado não tem access_token.");
  const r = await fetch("https://graph.microsoft.com/v1.0/me/drive", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!r.ok) throw new Error(`A Microsoft recusou o acesso (${r.status}). Gere o código de novo.`);
  const drive = (await r.json()) as { id: string; driveType: string; owner?: { user?: { displayName?: string } } };
  writeFileSync(
    CONF,
    `[${REMOTO}]\ntype = onedrive\ntoken = ${JSON.stringify(token)}\ndrive_id = ${drive.id}\ndrive_type = ${drive.driveType}\n`,
    { mode: 0o600 },
  );
  await rclone(["lsf", "--max-depth", "1", "--dirs-only", alvo("")]);
  return drive.owner?.user?.displayName ?? "OneDrive";
}

export function desconectar() {
  if (existsSync(CONF)) writeFileSync(CONF, "");
}

export type Item = { nome: string; caminho: string; pasta: boolean; tamanho: number; modificado: string };

export async function listar(caminho: string): Promise<Item[]> {
  const rel = limparCaminho(caminho);
  const raw = await rclone(["lsjson", "--no-mimetype", alvo(rel)]);
  const itens = JSON.parse(raw.toString() || "[]") as { Name: string; Size: number; ModTime: string; IsDir: boolean }[];
  return itens
    .map((i) => ({ nome: i.Name, caminho: rel ? `${rel}/${i.Name}` : i.Name, pasta: i.IsDir, tamanho: i.IsDir ? 0 : i.Size, modificado: i.ModTime }))
    .sort((a, b) => Number(b.pasta) - Number(a.pasta) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function criarPasta(caminho: string) {
  await rclone(["mkdir", alvo(caminho)]);
}

export async function enviar(caminho: string, dados: Buffer) {
  await rclone(["rcat", alvo(caminho)], dados);
}

export function baixar(caminho: string) {
  return spawn("rclone", ["--config", CONF, "cat", alvo(caminho)]);
}

export function existe(caminho: string): Promise<boolean> {
  return new Promise((ok) => {
    execFile("rclone", ["--config", CONF, "lsf", "--max-depth", "1", alvo(caminho)], (e) => ok(!e));
  });
}

// ---------- Pasta de cada projeto ----------

/** Subpastas por disciplina dentro de CONSTRUÇÕES/<Cliente>. */
export function disciplinas(tipo: string) {
  const t = tipo.toLowerCase();
  const out: string[] = [];
  if (t.includes("arquitet")) out.push("ARQUITETURA");
  if (t.includes("estrutur")) out.push("ESTRUTURAL");
  if (t.includes("elétric") || t.includes("eletric")) out.push("ELÉTRICO");
  if (t.includes("hidro") || t.includes("sanit")) out.push("HIDROSSANITÁRIO");
  if (t.includes("levantamento")) out.push("LEVANTAMENTO");
  if (t.includes("obra") || t.includes("reforma")) out.push("OBRA");
  return out;
}

type Meta = { prepare(sql: string): { bind(...v: unknown[]): { first(): Promise<Record<string, unknown> | null>; run(): Promise<unknown> } } };
const meta = () => env.DB as unknown as Meta;

export async function pastaDoProjeto(projectId: string): Promise<string | null> {
  const row = await meta().prepare("SELECT value FROM app_meta WHERE key = ?").bind(`pasta:${projectId}`).first();
  return row ? String(row.value) : null;
}

export async function definirPastaDoProjeto(projectId: string, caminho: string) {
  await meta().prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").bind(`pasta:${projectId}`, limparCaminho(caminho)).run();
}

/**
 * Cria (ou reaproveita) a pasta do cliente dentro da pasta do serviço.
 * Ex.: tipo "Projeto Elétrico", cliente "Regis" → CONSTRUÇÕES/Regis
 */
export async function criarPastaDoProjeto(p: { id: string; name: string; client: string; type: string; pasta?: string }) {
  if (!conectado()) return null;
  const cat = p.pasta && CATEGORIAS.some((c) => c.pasta === p.pasta) ? p.pasta : categoriaDoTipo(p.type).pasta;
  const nome = nomeSeguro(p.client || p.name);
  const existentes = await listar(cat).catch(() => [] as Item[]);
  const igual = existentes.find((i) => i.pasta && i.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0);
  const caminho = `${cat}/${igual?.nome ?? nome}`;
  if (!igual) await criarPasta(caminho);
  if (cat === "CONSTRUÇÕES") {
    for (const sub of disciplinas(p.type)) await criarPasta(`${caminho}/${sub}`);
  }
  await definirPastaDoProjeto(p.id, caminho);
  return caminho;
}
