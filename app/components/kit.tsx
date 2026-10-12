"use client";

import { useState } from "react";
import { CATEGORIAS, categoriaDoTipo } from "../categorias";

/* ---------- Cores por pasta/categoria ---------- */
export const COR_PASTA: Record<string, string> = {
  BOMBEIROS: "#c97465",
  DESDOBRO: "#c7a35f",
  LOTEAMENTO: "#b8905f",
  TOPOGRAFIA: "#7fae89",
  LAUDOS: "#7c9fc0",
  "CAIXA FINANCIAMENTO": "#6fa9a4",
  "REDUÇÃO DO INSS": "#a58cc2",
  "ESTRUTURA METÁLICAS": "#9aa2ad",
  SUVISA: "#c08ba3",
  ORÇAMENTO: "#c6b462",
  CONSTRUÇÕES: "#9c9ea8",
};

export function corDoTipo(tipo: string) {
  return COR_PASTA[categoriaDoTipo(tipo).pasta] ?? "#9c9ea8";
}

/* ---------- Ícones (SVG simples, 24x24, stroke) ---------- */
const P = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
export const ICONE_PASTA: Record<string, React.ReactNode> = {
  BOMBEIROS: P("M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3 .5 1.5 1.5 2 2 2 0-3-1-5 1-7zM5 21h14"),
  DESDOBRO: P("M4 4h16v16H4zM12 4v16M4 12h16"),
  LOTEAMENTO: P("M3 10l9-6 9 6v10H3zM9 20v-6h6v6"),
  TOPOGRAFIA: P("M3 17l6-9 4 6 3-4 5 7zM3 21h18"),
  LAUDOS: P("M6 3h9l4 4v14H6zM9 12h6M9 16h6M15 3v4h4"),
  "CAIXA FINANCIAMENTO": P("M3 10l9-7 9 7v11H3zM9 21v-7h6v7"),
  "REDUÇÃO DO INSS": P("M4 6h16v12H4zM8 12h8M12 9v6"),
  "ESTRUTURA METÁLICAS": P("M4 20V6l8-3 8 3v14M4 12h16M8 20V9M16 20V9"),
  SUVISA: P("M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4"),
  ORÇAMENTO: P("M5 3h14v18l-2-1-2 1-2-1-2 1-2-1-2 1zM9 8h6M9 12h6M9 16h4"),
  CONSTRUÇÕES: P("M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 11h2M13 11h2"),
};

/* ---------- Ícones por tipo de arquivo ---------- */
type FileKind = { label: string; color: string; icon?: React.ReactNode };
const KINDS: Record<string, FileKind> = {
  rvt: { label: "RVT", color: "#2f7ff0" },
  rfa: { label: "RFA", color: "#2f7ff0" },
  dwg: { label: "DWG", color: "#e8503a" },
  dxf: { label: "DXF", color: "#e8503a" },
  dwf: { label: "DWF", color: "#e8503a" },
  bak: { label: "BAK", color: "#6d6d78" },
  pdf: { label: "PDF", color: "#ff5a4f", icon: P("M6 3h9l4 4v14H6zM15 3v4h4M9 17v-5h2a1.5 1.5 0 0 1 0 3H9") },
  doc: { label: "DOC", color: "#3b82f6" },
  docx: { label: "DOC", color: "#3b82f6" },
  xls: { label: "XLS", color: "#22c55e" },
  xlsx: { label: "XLS", color: "#22c55e" },
  csv: { label: "CSV", color: "#22c55e" },
  ppt: { label: "PPT", color: "#f97316" },
  pptx: { label: "PPT", color: "#f97316" },
  jpg: { label: "IMG", color: "#f472b6", icon: P("M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M16 9h.01") },
  jpeg: { label: "IMG", color: "#f472b6", icon: P("M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M16 9h.01") },
  png: { label: "IMG", color: "#f472b6", icon: P("M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M16 9h.01") },
  heic: { label: "IMG", color: "#f472b6", icon: P("M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M16 9h.01") },
  tif: { label: "TIF", color: "#f472b6" },
  tiff: { label: "TIF", color: "#f472b6" },
  gltf: { label: "3D", color: "#4ad07a", icon: P("M12 2l8 4.5v9L12 20l-8-4.5v-9zM12 11l8-4.5M12 11v9M12 11L4 6.5") },
  glb: { label: "3D", color: "#4ad07a", icon: P("M12 2l8 4.5v9L12 20l-8-4.5v-9zM12 11l8-4.5M12 11v9M12 11L4 6.5") },
  obj: { label: "3D", color: "#4ad07a" },
  psx: { label: "PSX", color: "#22c1c3" },
  kmz: { label: "KMZ", color: "#38bdf8" },
  kml: { label: "KML", color: "#38bdf8" },
  zip: { label: "ZIP", color: "#a3a3ad" },
  rar: { label: "RAR", color: "#a3a3ad" },
  txt: { label: "TXT", color: "#a3a3ad" },
  md: { label: "MD", color: "#a3a3ad" },
  ctb: { label: "CTB", color: "#6d6d78" },
  skp: { label: "SKP", color: "#ef4444" },
  ai: { label: "AI", color: "#f59e0b" },
  psd: { label: "PSD", color: "#2563eb" },
  mp4: { label: "MP4", color: "#c084fc" },
  pfx: { label: "PFX", color: "#ff5a4f" },
};

export function FileIcon({ nome, pasta }: { nome: string; pasta?: boolean }) {
  if (pasta) {
    return (
      <span className="file-icon" style={{ "--file-color": "#c7a35f" } as React.CSSProperties}>
        {P("M3 7h6l2 2h10v10H3z")}
      </span>
    );
  }
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  const k = KINDS[ext] ?? { label: ext.slice(0, 4).toUpperCase() || "ARQ", color: "#9c9ea8" };
  return (
    <span className="file-icon" style={{ "--file-color": k.color } as React.CSSProperties} title={ext.toUpperCase()}>
      {k.icon ?? k.label}
    </span>
  );
}

/* ---------- Seletor de tipo de serviço (chips) ---------- */
const SUGESTOES = [
  "Projeto de Arquitetura",
  "Projeto Estrutural",
  "Projeto Elétrico",
  "Projeto Hidrossanitário",
  "Projeto de Bombeiro",
  "Desmembramento",
  "Remembramento",
  "Retificação de área",
  "Regularização",
  "Levantamento",
  "Topografia",
  "Laudo",
  "Gestão de obra",
  "Loteamento",
  "Avaliação Caixa",
];

export function ServiceTypePicker({ value, onChange, existentes }: { value: string; onChange: (v: string) => void; existentes: string[] }) {
  const [custom, setCustom] = useState("");
  const escolhidos = value.split(",").map((t) => t.trim()).filter(Boolean);
  const opcoes = Array.from(new Set([...SUGESTOES, ...existentes.flatMap((t) => t.split(",")).map((t) => t.trim()).filter(Boolean)]));
  const extras = escolhidos.filter((t) => !opcoes.includes(t));
  function alternar(t: string) {
    const prox = escolhidos.includes(t) ? escolhidos.filter((x) => x !== t) : [...escolhidos, t];
    onChange(prox.join(", "));
  }
  return (
    <div>
      <div className="chip-picker" role="listbox" aria-multiselectable="true" aria-label="Tipo de serviço">
        {[...opcoes, ...extras].map((t) => (
          <button
            key={t}
            type="button"
            role="option"
            aria-selected={escolhidos.includes(t)}
            className={`chip ${escolhidos.includes(t) ? "active" : ""}`}
            style={{ "--chip-color": corDoTipo(t) } as React.CSSProperties}
            onClick={() => alternar(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="chip-custom">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Outro tipo… (Enter para adicionar)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) {
              e.preventDefault();
              alternar(custom.trim());
              setCustom("");
            }
          }}
        />
      </div>
    </div>
  );
}

/* ---------- Seletor de pasta do OneDrive ---------- */
export function FolderPicker({ value, tipo, cliente, onChange }: { value: string; tipo: string; cliente: string; onChange: (v: string) => void }) {
  const sugerida = tipo ? categoriaDoTipo(tipo).pasta : "";
  const efetiva = value || sugerida || "CONSTRUÇÕES";
  return (
    <div>
      <div className="folder-picker" role="listbox" aria-label="Pasta no OneDrive">
        {CATEGORIAS.map((c) => (
          <button
            key={c.pasta}
            type="button"
            role="option"
            aria-selected={efetiva === c.pasta}
            className={`folder-option ${efetiva === c.pasta ? "active" : ""} ${sugerida === c.pasta ? "suggested" : ""}`}
            style={{ "--chip-color": COR_PASTA[c.pasta] ?? "#9c9ea8" } as React.CSSProperties}
            onClick={() => onChange(c.pasta === sugerida ? "" : c.pasta)}
          >
            {ICONE_PASTA[c.pasta]}
            <span>
              <strong>{c.pasta}</strong>
              <small>{c.rotulo}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="folder-path">
        OneDrive › EDUARDO › <b>{efetiva}</b> › <b>{cliente.trim() || "Nome do cliente"}</b>
        {!value && sugerida ? <span style={{ opacity: 0.7 }}> · sugerida pelo tipo de serviço</span> : null}
      </div>
    </div>
  );
}
