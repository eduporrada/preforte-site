/**
 * Ligação do site com o Paperclip (orquestrador dos agentes).
 * A chave (board API key) é criada pelo próprio Paperclip no fluxo de aprovação,
 * nunca passa por chat, e fica em /dados/paperclip.json.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DATA_DIR = resolve(process.env.PREFORTE_DATA_DIR ?? "dados");
const ARQ = join(DATA_DIR, "paperclip.json");

export type Config = { url: string; token: string; companyId: string; companyName?: string; conectadoEm: string };
type Pendente = { url: string; id: string; segredo: string; token: string; aprovarEm: string; expira: string };

let pendente: Pendente | null = null;

export function lerConfig(): Config | null {
  try {
    if (!existsSync(ARQ)) return null;
    const c = JSON.parse(readFileSync(ARQ, "utf8")) as Config;
    return c.token && c.url && c.companyId ? c : null;
  } catch {
    return null;
  }
}

export function desconectar() {
  if (existsSync(ARQ)) writeFileSync(ARQ, "{}", { mode: 0o600 });
}

function normalizarUrl(url: string) {
  const u = new URL(url.trim());
  if (!/^https?:$/.test(u.protocol)) throw new Error("Endereço inválido");
  return u.origin;
}

/** Passo 1: pede ao Paperclip um desafio de autorização e devolve o link para o dono aprovar. */
export async function iniciarConexao(urlPaperclip: string) {
  const url = normalizarUrl(urlPaperclip);
  const r = await fetch(`${url}/api/cli-auth/challenges`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ command: "site preforte: ler atividade dos agentes", clientName: "Site Preforte", requestedAccess: "board" }),
  });
  if (!r.ok) throw new Error(`Paperclip respondeu ${r.status}. Confira o endereço.`);
  const d = (await r.json()) as { id: string; token: string; boardApiToken: string; approvalPath: string; approvalUrl: string | null; expiresAt: string };
  pendente = { url, id: d.id, segredo: d.token, token: d.boardApiToken, aprovarEm: d.approvalUrl ?? `${url}${d.approvalPath}`, expira: d.expiresAt };
  return { aprovarEm: pendente.aprovarEm, expira: pendente.expira };
}

/** Passo 2: consulta se o dono já aprovou; quando sim, valida a chave e grava. */
export async function verificarConexao(): Promise<{ estado: "nenhum" | "pendente" | "aprovado" | "expirado" | "cancelado"; aprovarEm?: string; empresa?: string }> {
  if (!pendente) return { estado: "nenhum" };
  const p = pendente;
  const r = await fetch(`${p.url}/api/cli-auth/challenges/${p.id}?token=${encodeURIComponent(p.segredo)}`);
  if (!r.ok) {
    pendente = null;
    return { estado: "expirado" };
  }
  const d = (await r.json()) as { status: "pending" | "approved" | "expired" | "cancelled" };
  if (d.status === "pending") return { estado: "pendente", aprovarEm: p.aprovarEm };
  if (d.status !== "approved") {
    pendente = null;
    return { estado: d.status === "cancelled" ? "cancelado" : "expirado" };
  }
  const me = await api<{ companyIds?: string[]; companies?: { id: string; name: string }[] }>(p.url, p.token, "/api/cli-auth/me");
  let companyId = me.companies?.[0]?.id ?? me.companyIds?.[0] ?? "";
  let companyName = me.companies?.[0]?.name ?? "";
  if (!companyId) {
    const cs = await api<{ id: string; name: string }[]>(p.url, p.token, "/api/companies");
    companyId = cs[0]?.id ?? "";
    companyName = cs[0]?.name ?? "";
  }
  if (!companyName && companyId) {
    const c = await api<{ name?: string }>(p.url, p.token, `/api/companies/${companyId}`).catch(() => ({ name: "" }));
    companyName = c.name ?? "";
  }
  if (!companyId) throw new Error("A chave foi aprovada, mas não encontrei nenhuma empresa no Paperclip.");
  const cfg: Config = { url: p.url, token: p.token, companyId, companyName, conectadoEm: new Date().toISOString() };
  writeFileSync(ARQ, JSON.stringify(cfg), { mode: 0o600 });
  pendente = null;
  return { estado: "aprovado", empresa: companyName };
}

export async function api<T>(url: string, token: string, path: string): Promise<T> {
  const r = await fetch(`${url}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return (await r.json()) as T;
}
