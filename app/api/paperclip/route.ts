import { desconectar, iniciarConexao, lerConfig, verificarConexao } from "../../paperclip";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = lerConfig();
  const v = await verificarConexao().catch((e: Error) => ({ estado: "erro" as const, erro: e.message }));
  return Response.json({ conectado: Boolean(cfg), url: cfg?.url ?? "", empresa: cfg?.companyName ?? "", desde: cfg?.conectadoEm ?? null, pendente: v });
}

// Inicia a autorização: devolve o link que o dono abre no Paperclip para aprovar.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const url = (body.url ?? process.env.PAPERCLIP_URL ?? "").trim();
  if (!url) return Response.json({ error: "Informe o endereço do Paperclip." }, { status: 400 });
  try {
    const r = await iniciarConexao(url);
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE() {
  desconectar();
  return Response.json({ ok: true });
}
