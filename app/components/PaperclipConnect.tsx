"use client";

import { useEffect, useState } from "react";

type Pendente = { estado: "nenhum" | "pendente" | "aprovado" | "expirado" | "cancelado" | "erro"; aprovarEm?: string; empresa?: string; erro?: string };

export function PaperclipConnect({ conectado, url, empresa }: { conectado: boolean; url: string; empresa: string }) {
  const [endereco, setEndereco] = useState(url);
  const [ligado, setLigado] = useState(conectado);
  const [nomeEmpresa, setNomeEmpresa] = useState(empresa);
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState("");
  const [aguardando, setAguardando] = useState(false);

  useEffect(() => {
    if (!aguardando) return;
    const t = window.setInterval(async () => {
      const r = await fetch("/api/paperclip").then((r) => r.json()).catch(() => null);
      const p: Pendente | undefined = r?.pendente;
      if (!p) return;
      if (p.estado === "aprovado") {
        setAguardando(false);
        setLigado(true);
        setNomeEmpresa(p.empresa ?? "");
        setMsg(`Conectado a ${p.empresa ?? "Paperclip"}. O escritório já mostra os agentes de verdade.`);
      } else if (p.estado === "expirado" || p.estado === "cancelado" || p.estado === "erro") {
        setAguardando(false);
        setMsg(p.estado === "erro" ? `Erro: ${p.erro}` : "A autorização expirou ou foi cancelada. Clique em Conectar de novo.");
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, [aguardando]);

  async function conectar() {
    setMsg("");
    const r = await fetch("/api/paperclip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: endereco }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error ?? "Falhou.");
    setLink(d.aprovarEm);
    setAguardando(true);
    window.open(d.aprovarEm, "_blank", "noopener");
  }

  async function desconectar() {
    await fetch("/api/paperclip", { method: "DELETE" });
    setLigado(false);
    setMsg("Desconectado. O escritório volta ao modo demonstração.");
  }

  return (
    <div className="stack">
      <div className={`notice ${ligado ? "notice-ok" : "notice-warn"}`}>
        {ligado ? `Situação: conectado${nomeEmpresa ? ` a ${nomeEmpresa}` : ""}.` : "Situação: ainda não conectado. O escritório está em modo demonstração."}
      </div>
      {msg && <div className="notice">{msg}</div>}
      <label className="field">
        <span>Endereço do Paperclip</span>
        <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="https://..." />
      </label>
      <div className="row">
        <button className="primary-button" type="button" onClick={conectar} disabled={aguardando}>{aguardando ? "Aguardando sua aprovação…" : ligado ? "Conectar de novo" : "Conectar"}</button>
        {ligado && <button className="ghost-button" type="button" onClick={desconectar}>Desconectar</button>}
      </div>
      {aguardando && (
        <div className="notice">
          Abri o Paperclip numa aba nova. Entre com a sua conta e clique em <b>Approve</b>. Se a aba não abriu, <a href={link} target="_blank" rel="noreferrer">clique aqui</a>.
        </div>
      )}
      <ol className="muted small">
        <li>Clique em <b>Conectar</b>. O Paperclip abre pedindo para aprovar o acesso do site.</li>
        <li>Aprove. A chave vai do Paperclip direto para o site: ela nunca aparece na tela nem passa por ninguém.</li>
        <li>Pronto. O escritório na página inicial passa a mostrar os agentes de verdade.</li>
      </ol>
    </div>
  );
}
