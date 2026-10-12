import { lerConfig } from "../../../paperclip";

export const dynamic = "force-dynamic";

/**
 * Ponte do site para o Paperclip (só o dono, com a chave aprovada em /paperclip).
 * /api/pc/empresa/...  → /api/companies/<id da empresa>/...
 * /api/pc/issues/...   → /api/issues/...  (idem agents, approvals, routines, projects)
 * Apagar não é permitido por aqui.
 */
const PERMITIDOS = /^(empresa(\/.*)?|issues\/[^/]+(\/(comments|read|approvals))?|agents\/[^/]+\/(pause|resume|heartbeat\/invoke)|agents\/[^/]+|approvals\/[^/]+(\/(approve|reject|comments))?|routines\/[^/]+(\/(run|runs))?|projects\/[^/]+)$/;

async function repassar(request: Request, ctx: { params: Promise<{ caminho: string[] }> }) {
  const cfg = lerConfig();
  if (!cfg) return Response.json({ error: "Site ainda não conectado ao Paperclip. Abra /paperclip." }, { status: 409 });
  const { caminho } = await ctx.params;
  const rel = caminho.map(encodeURIComponent).join("/");
  if (!PERMITIDOS.test(caminho.join("/"))) return Response.json({ error: "Ação não permitida pelo site." }, { status: 403 });
  const destino = rel.startsWith("empresa") ? `/api/companies/${cfg.companyId}${rel.slice(7)}` : `/api/${rel}`;
  const url = new URL(request.url);
  const init: RequestInit = {
    method: request.method,
    headers: { Authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(15000),
  };
  if (request.method !== "GET") init.body = (await request.text()) || "{}";
  const r = await fetch(`${cfg.url}${destino}${url.search}`, init).catch((e: Error) => new Response(JSON.stringify({ error: e.message }), { status: 502 }));
  const corpo = await r.text();
  return new Response(corpo, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
}

export { repassar as GET, repassar as POST, repassar as PATCH };
