import { isAgentRequest } from "../../../auth";
import {
  bloqueadoParaAgente, baixar, conectado, criarPasta, criarPastaDoProjeto, enviar, limparCaminho, listar, nomeSeguro, pastaDoProjeto, definirPastaDoProjeto,
} from "../../../onedrive";
import { env } from "../../../../db/env";

/**
 * Arquivos do OneDrive (pasta EDUARDO).
 *   GET  ?projeto=<id>            lista a pasta do projeto (cria se ainda não existir)
 *   GET  ?caminho=<pasta>         lista uma pasta qualquer
 *   GET  ?baixar=<arquivo>        baixa um arquivo
 *   POST ?projeto=<id> | ?caminho=<pasta>   envia arquivos (campo "arquivo", vários) ou cria subpasta (campo "novaPasta")
 */
async function resolver(request: Request, url: URL) {
  const agente = isAgentRequest(request.headers.get("authorization"));
  const projeto = url.searchParams.get("projeto");
  let caminho = url.searchParams.get("caminho") ?? url.searchParams.get("baixar") ?? "";
  if (projeto) {
    let pasta = await pastaDoProjeto(projeto);
    if (!pasta) {
      const p = await (env.DB as unknown as { prepare(s: string): { bind(...v: unknown[]): { first(): Promise<Record<string, unknown> | null> } } })
        .prepare("SELECT id, name, client, type FROM projects WHERE id = ?").bind(projeto).first();
      if (!p) throw new Error("Projeto não encontrado");
      pasta = await criarPastaDoProjeto({ id: String(p.id), name: String(p.name), client: String(p.client), type: String(p.type) });
    }
    caminho = [pasta, url.searchParams.get("sub") ?? ""].filter(Boolean).join("/");
  }
  caminho = limparCaminho(caminho);
  if (agente && bloqueadoParaAgente(caminho)) throw Object.assign(new Error("Pasta bloqueada para agentes"), { status: 403 });
  return caminho;
}

function erro(e: unknown) {
  const status = (e as { status?: number }).status ?? 500;
  return Response.json({ error: (e as Error).message }, { status });
}

export async function GET(request: Request) {
  if (!conectado()) return Response.json({ error: "OneDrive não conectado", conectado: false }, { status: 409 });
  const url = new URL(request.url);
  try {
    const caminho = await resolver(request, url);
    if (url.searchParams.has("baixar")) {
      const p = baixar(caminho);
      const nome = caminho.split("/").pop() ?? "arquivo";
      const stream = new ReadableStream({
        start(c) {
          p.stdout.on("data", (d: Buffer) => c.enqueue(new Uint8Array(d)));
          p.on("close", (code) => (code === 0 ? c.close() : c.error(new Error("Falha ao baixar"))));
        },
        cancel() { p.kill(); },
      });
      return new Response(stream, { headers: { "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nome)}`, "Content-Type": tipo(nome) } });
    }
    const itens = await listar(caminho);
    return Response.json({ caminho, itens, conectado: true });
  } catch (e) {
    return erro(e);
  }
}

export async function POST(request: Request) {
  if (!conectado()) return Response.json({ error: "OneDrive não conectado" }, { status: 409 });
  const url = new URL(request.url);
  try {
    // Trocar a pasta do projeto: ?projeto=<id>&definir=<caminho>
    const definir = url.searchParams.get("definir");
    const projeto = url.searchParams.get("projeto");
    if (projeto && definir !== null) {
      const alvo = limparCaminho(definir);
      if (isAgentRequest(request.headers.get("authorization")) && bloqueadoParaAgente(alvo)) throw Object.assign(new Error("Pasta bloqueada para agentes"), { status: 403 });
      await criarPasta(alvo);
      await definirPastaDoProjeto(projeto, alvo);
      return Response.json({ caminho: alvo });
    }
    const caminho = await resolver(request, url);
    const form = await request.formData();
    const nova = String(form.get("novaPasta") ?? "").trim();
    if (nova) {
      await criarPasta(`${caminho}/${nomeSeguro(nova)}`);
      return Response.json({ ok: true });
    }
    const enviados: string[] = [];
    for (const f of form.getAll("arquivo")) {
      if (!(f instanceof File)) continue;
      const nome = nomeSeguro(f.name);
      await enviar(`${caminho}/${nome}`, Buffer.from(await f.arrayBuffer()));
      enviados.push(nome);
    }
    return Response.json({ enviados, caminho });
  } catch (e) {
    return erro(e);
  }
}

function tipo(nome: string) {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  const m: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", txt: "text/plain; charset=utf-8", dxf: "application/dxf" };
  return m[ext] ?? "application/octet-stream";
}
