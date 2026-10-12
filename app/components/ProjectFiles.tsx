"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIAS } from "../categorias";
import { FileIcon } from "./kit";

type Item = { nome: string; caminho: string; pasta: boolean; tamanho: number; modificado: string };

function tamanho(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}
function quando(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Arquivos do projeto no OneDrive: lista, abre, envia (inclusive arrastando) e cria subpastas. */
export function ProjectFiles({ projectId }: { projectId: string }) {
  const [raiz, setRaiz] = useState("");
  const [sub, setSub] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "desconectado" | "erro">("carregando");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const query = `projeto=${encodeURIComponent(projectId)}${sub ? `&sub=${encodeURIComponent(sub)}` : ""}`;

  const carregar = useCallback(async () => {
    setEstado("carregando");
    const r = await fetch(`/api/onedrive/arquivos?${query}`);
    const d = await r.json().catch(() => ({}));
    if (r.status === 409) return setEstado("desconectado");
    if (!r.ok) {
      setMensagem(d.error ?? "Erro ao abrir a pasta");
      return setEstado("erro");
    }
    setItens(d.itens);
    if (!sub) setRaiz(d.caminho);
    setEstado("ok");
  }, [query, sub]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar(files: FileList | File[] | null) {
    const lista = files ? Array.from(files) : [];
    if (!lista.length) return;
    setEnviando(true);
    const form = new FormData();
    for (const f of lista) form.append("arquivo", f);
    const r = await fetch(`/api/onedrive/arquivos?${query}`, { method: "POST", body: form });
    setEnviando(false);
    setMensagem(r.ok ? `${lista.length} arquivo(s) enviado(s) para o OneDrive.` : "Falha ao enviar.");
    if (input.current) input.current.value = "";
    void carregar();
  }

  async function novaPasta() {
    const nome = window.prompt("Nome da nova pasta:");
    if (!nome?.trim()) return;
    const form = new FormData();
    form.append("novaPasta", nome.trim());
    await fetch(`/api/onedrive/arquivos?${query}`, { method: "POST", body: form });
    void carregar();
  }

  async function trocarPasta(caminho: string) {
    const r = await fetch(`/api/onedrive/arquivos?projeto=${encodeURIComponent(projectId)}&definir=${encodeURIComponent(caminho)}`, { method: "POST" });
    setTrocando(false);
    setSub("");
    setMensagem(r.ok ? "Pasta do projeto alterada." : "Não consegui trocar a pasta.");
    void carregar();
  }

  if (estado === "desconectado") {
    return <p className="empty-copy">OneDrive não conectado. <a href="/onedrive">Conectar agora</a></p>;
  }

  const partes = [...raiz.split("/").filter(Boolean), ...sub.split("/").filter(Boolean)];
  const nRaiz = raiz.split("/").filter(Boolean).length;

  return (
    <div
      className="project-files"
      style={{ display: "grid", gap: 10 }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void enviar(e.dataTransfer.files); }}
    >
      <div className="files-crumbs">
        <span>OneDrive</span>›<span>EDUARDO</span>
        {partes.map((p, i) => (
          <span key={i} style={{ display: "contents" }}>
            ›
            {i === partes.length - 1 ? (
              <b>{p}</b>
            ) : (
              <button type="button" onClick={() => setSub(partes.slice(nRaiz, i + 1).join("/"))}>{p}</button>
            )}
          </span>
        ))}
      </div>
      <div className="files-toolbar">
        {sub && <button className="ghost-button" type="button" onClick={() => setSub(sub.split("/").slice(0, -1).join("/"))}>← Voltar</button>}
        <button className="primary-button" type="button" disabled={enviando} onClick={() => input.current?.click()}>{enviando ? "Enviando…" : "Anexar arquivos"}</button>
        <button className="secondary-button" type="button" onClick={novaPasta}>Nova pasta</button>
        <button className="ghost-button" type="button" onClick={() => setTrocando((v) => !v)}>Trocar pasta</button>
        <input ref={input} type="file" multiple hidden onChange={(e) => void enviar(e.target.files)} />
      </div>
      {trocando && (
        <form
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void trocarPasta(`${f.get("cat")}/${String(f.get("nome") ?? "").trim()}`);
          }}
        >
          <select name="cat" defaultValue={raiz.split("/")[0]}>{CATEGORIAS.map((c) => <option key={c.pasta} value={c.pasta}>{c.pasta}</option>)}</select>
          <input name="nome" required defaultValue={raiz.split("/").slice(1).join("/")} placeholder="Nome da pasta do cliente" />
          <button className="secondary-button" type="submit">Usar esta pasta</button>
        </form>
      )}
      {mensagem && <p style={{ margin: 0, fontSize: 13, color: "var(--apple-secondary-label)" }}>{mensagem}</p>}
      {estado === "carregando" && <p className="empty-copy">Abrindo pasta…</p>}
      {estado === "erro" && <p className="empty-copy">{mensagem}</p>}
      {estado === "ok" && (
        <div className="files-list">
          {itens.map((i) =>
            i.pasta ? (
              <button key={i.caminho} type="button" className="file-row" onClick={() => setSub(sub ? `${sub}/${i.nome}` : i.nome)}>
                <FileIcon nome={i.nome} pasta />
                <span className="file-name">{i.nome}</span>
                <span className="file-meta">pasta</span>
              </button>
            ) : (
              <a key={i.caminho} className="file-row" href={`/api/onedrive/arquivos?baixar=${encodeURIComponent(i.caminho)}`} target="_blank" rel="noreferrer">
                <FileIcon nome={i.nome} />
                <span className="file-name">{i.nome}</span>
                <span className="file-meta">{tamanho(i.tamanho)} · {quando(i.modificado)}</span>
              </a>
            ),
          )}
          <div className={`files-drop ${over ? "over" : ""}`}>{itens.length ? "Arraste arquivos aqui para enviar ao OneDrive" : "Pasta vazia. Arraste arquivos aqui ou clique em Anexar."}</div>
        </div>
      )}
    </div>
  );
}
