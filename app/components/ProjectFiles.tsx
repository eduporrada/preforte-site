"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIAS } from "../categorias";

type Item = { nome: string; caminho: string; pasta: boolean; tamanho: number; modificado: string };

function tamanho(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}

/** Arquivos do projeto no OneDrive: lista, abre, envia e cria subpastas. */
export function ProjectFiles({ projectId }: { projectId: string }) {
  const [raiz, setRaiz] = useState("");
  const [sub, setSub] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "desconectado" | "erro">("carregando");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [trocando, setTrocando] = useState(false);
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

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    setEnviando(true);
    const form = new FormData();
    for (const f of Array.from(files)) form.append("arquivo", f);
    const r = await fetch(`/api/onedrive/arquivos?${query}`, { method: "POST", body: form });
    setEnviando(false);
    setMensagem(r.ok ? `${files.length} arquivo(s) enviado(s) para o OneDrive.` : "Falha ao enviar.");
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

  return (
    <div className="project-files" style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, opacity: 0.8, wordBreak: "break-word" }}>
        OneDrive › EDUARDO › {raiz.split("/").join(" › ")}{sub ? ` › ${sub.split("/").join(" › ")}` : ""}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
      {mensagem && <p style={{ margin: 0, fontSize: 13 }}>{mensagem}</p>}
      {estado === "carregando" && <p className="empty-copy">Abrindo pasta…</p>}
      {estado === "erro" && <p className="empty-copy">{mensagem}</p>}
      {estado === "ok" && !itens.length && <p className="empty-copy">Pasta vazia.</p>}
      {estado === "ok" && itens.map((i) => (
        <div key={i.caminho} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(127,127,127,.2)" }}>
          {i.pasta ? (
            <button type="button" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", color: "inherit" }} onClick={() => setSub(sub ? `${sub}/${i.nome}` : i.nome)}>📁 {i.nome}</button>
          ) : (
            <a href={`/api/onedrive/arquivos?baixar=${encodeURIComponent(i.caminho)}`} target="_blank" rel="noreferrer">📄 {i.nome}</a>
          )}
          <small style={{ whiteSpace: "nowrap", opacity: 0.7 }}>{i.pasta ? "" : tamanho(i.tamanho)}</small>
        </div>
      ))}
    </div>
  );
}
