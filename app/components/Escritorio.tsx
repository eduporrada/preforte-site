"use client";

/**
 * Escritório em pixel art: cenário desenhado (public/escritorio/fundo.webp) e ficha de bonecos
 * (public/escritorio/sprites.webp — 7 personagens × frente/costas/esquerda/direita × 3 quadros).
 * Cada agente do Paperclip vira um bonequinho. Trabalhando → sentado na mesa da sua sala com o balão
 * da tarefa. Parado → passeia pela copa, lounge, banheiro, recepção. Pausado → cochila no lounge.
 * Só desenha o que /api/escritorio devolve; não gasta crédito.
 */
import { useEffect, useRef, useState } from "react";
import type { AgenteEstado, Atividade, Escritorio as Dados } from "../escritorio-dados";

const W = 1774;
const H = 887;
const CORREDOR_Y = 392;
const CELL_W = 96;
const CELL_H = 140;
const ESCALA = 0.5; // bonecos ~60px no mapa
const PERSONAGENS = ["eduardo", "gerente", "revit", "autocad", "redator", "redatora", "secretaria"] as const;
type Personagem = (typeof PERSONAGENS)[number];
type Dir = "frente" | "costas" | "esquerda" | "direita";
const DIRS: Dir[] = ["frente", "costas", "esquerda", "direita"];

type Px = { x: number; y: number };
type RoomId = "recepcao" | "hall" | "revit" | "autocad" | "reuniao" | "presidencia" | "banheiros" | "copa" | "lounge" | "memoriais" | "gerencia" | "expansao";
type Room = { id: RoomId; x0: number; y0: number; x1: number; y1: number; porta: Px };

// Salas no sistema de coordenadas do desenho (1774×887). A porta fica no lado do corredor.
const SALAS: Room[] = [
  { id: "recepcao", x0: 125, y0: 80, x1: 345, y1: 345, porta: { x: 325, y: 349 } },
  { id: "hall", x0: 345, y0: 80, x1: 535, y1: 345, porta: { x: 445, y: 349 } },
  { id: "revit", x0: 535, y0: 80, x1: 855, y1: 345, porta: { x: 556, y: 349 } },
  { id: "autocad", x0: 855, y0: 80, x1: 1180, y1: 345, porta: { x: 881, y: 349 } },
  { id: "reuniao", x0: 1180, y0: 80, x1: 1450, y1: 345, porta: { x: 1212, y: 349 } },
  { id: "presidencia", x0: 1450, y0: 80, x1: 1762, y1: 345, porta: { x: 1478, y: 349 } },
  { id: "banheiros", x0: 125, y0: 430, x1: 370, y1: 680, porta: { x: 347, y: 437 } },
  { id: "copa", x0: 370, y0: 430, x1: 660, y1: 680, porta: { x: 399, y: 437 } },
  { id: "lounge", x0: 660, y0: 430, x1: 945, y1: 680, porta: { x: 685, y: 437 } },
  { id: "memoriais", x0: 945, y0: 430, x1: 1275, y1: 680, porta: { x: 973, y: 437 } },
  { id: "gerencia", x0: 1275, y0: 430, x1: 1515, y1: 680, porta: { x: 1298, y: 437 } },
  { id: "expansao", x0: 1515, y0: 430, x1: 1762, y1: 680, porta: { x: 1543, y: 437 } },
];
// Portas do desenho (folhas recortadas em portas.webp; o fundo mostra a porta fechada).
const PORTAS: { x: number; y: number; lado: "c" | "b" }[] = [[311, 302, "c"], [542, 302, "c"], [819, 302, "c"], [867, 302, "c"], [1139, 302, "c"], [1198, 302, "c"], [1409, 302, "c"], [1464, 302, "c"], [1704, 302, "c"], [333, 427, "b"], [385, 427, "b"], [626, 427, "b"], [671, 427, "b"], [914, 427, "b"], [959, 427, "b"], [1236, 427, "b"], [1284, 427, "b"], [1480, 427, "b"], [1529, 427, "b"], [1699, 427, "b"]].map(([x, y, lado]) => ({ x: x as number, y: y as number, lado: lado as "c" | "b" }));
const PORTA_W = 28, PORTA_H = 56;

// Mesas: posição dos pés do boneco sentado (de costas, olhando a mesa). Acima da mesa fica o "monitor"/prancheta que acende.
const MESAS: Record<string, Px[]> = {
  revit: [{ x: 632, y: 238 }, { x: 775, y: 238 }, { x: 632, y: 322 }, { x: 775, y: 322 }],
  autocad: [{ x: 950, y: 238 }, { x: 1090, y: 238 }, { x: 950, y: 322 }, { x: 1090, y: 322 }],
  memoriais: [{ x: 1030, y: 582 }, { x: 1145, y: 582 }, { x: 1030, y: 652 }, { x: 1145, y: 652 }],
  gerencia: [{ x: 1400, y: 552 }],
  presidencia: [{ x: 1595, y: 228 }],
  reuniao: [{ x: 1270, y: 298 }, { x: 1310, y: 298 }, { x: 1360, y: 298 }],
  expansao: [{ x: 1630, y: 637 }],
  recepcao: [{ x: 240, y: 232 }],
};
// Lugares de descanso, com o que o boneco "diz".
const DESCANSO: { p: Px; dir: Dir; falas: string[]; acao: string }[] = [
  { p: { x: 455, y: 632 }, dir: "costas", falas: ["☕", "🍪"], acao: "tomando um café na copa" },
  { p: { x: 495, y: 632 }, dir: "costas", falas: ["☕", "🥤"], acao: "lanchando na copa" },
  { p: { x: 535, y: 632 }, dir: "costas", falas: ["🍞", "💬"], acao: "conversando na copa" },
  { p: { x: 560, y: 520 }, dir: "costas", falas: ["☕"], acao: "fazendo um café" },
  { p: { x: 790, y: 575 }, dir: "frente", falas: ["😌", "📺"], acao: "descansando no lounge" },
  { p: { x: 700, y: 625 }, dir: "direita", falas: ["💬"], acao: "batendo papo no lounge" },
  { p: { x: 880, y: 625 }, dir: "esquerda", falas: ["📖"], acao: "lendo no lounge" },
  { p: { x: 345, y: 540 }, dir: "costas", falas: ["🚻"], acao: "no banheiro" },
  { p: { x: 345, y: 590 }, dir: "costas", falas: ["🪞"], acao: "no banheiro" },
  { p: { x: 760, y: 520 }, dir: "frente", falas: ["📺"], acao: "vendo TV no lounge" },
  { p: { x: 830, y: 520 }, dir: "frente", falas: ["😌"], acao: "descansando no lounge" },
];
const SOFA: Px = { x: 790, y: 575 };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** Sala e personagem de cada agente, pelo nome/papel que vem do Paperclip. */
function salaEPersonagem(a: AgenteEstado): { sala: RoomId; personagem: Personagem } {
  const t = `${a.nome} ${a.titulo} ${a.papel}`.toLowerCase();
  if (a.sala === "presidencia" || t.includes("gerente") || t.includes("president") || t.includes("ceo")) return { sala: "gerencia", personagem: "gerente" };
  if (t.includes("ppci") || t.includes("incêndio") || t.includes("incendio") || t.includes("parcelamento") || t.includes("autocad")) return { sala: "autocad", personagem: "autocad" };
  if (a.sala === "desenhistas" || t.includes("desenh") || t.includes("revit") || t.includes("projetista")) return { sala: "revit", personagem: "revit" };
  if (a.sala === "redacao" || t.includes("redator")) return { sala: "memoriais", personagem: hash(a.id) % 2 ? "redator" : "redatora" };
  if (a.sala === "analise" || t.includes("analista") || t.includes("revisor")) return { sala: "reuniao", personagem: hash(a.id) % 2 ? "redatora" : "redator" };
  return { sala: "expansao", personagem: "secretaria" };
}

type Boneco = {
  dados: AgenteEstado;
  personagem: Personagem;
  salaTrabalho: RoomId;
  mesa: Px;
  pos: Px;
  alvo: Px;
  rota: Px[];
  dir: Dir;
  dirParado: Dir;
  andando: boolean;
  proximaDecisao: number;
  fala: string;
  falaAte: number;
  acao: string;
};
type Evento = { quando: number; agente: string; texto: string };
const portasAbertura = new Map<string, number>();

function salaDe(p: Px): Room | null {
  return SALAS.find((s) => p.x >= s.x0 && p.x < s.x1 && p.y >= s.y0 && p.y < s.y1) ?? null;
}
function rotaPara(de: Px, para: Px): Px[] {
  const a = salaDe(de), b = salaDe(para);
  const pts: Px[] = [];
  if (a && a !== b) { pts.push({ ...a.porta }); pts.push({ x: a.porta.x, y: CORREDOR_Y }); }
  else if (!a && b) pts.push({ x: de.x, y: CORREDOR_Y });
  if (b && a !== b) { pts.push({ x: b.porta.x, y: CORREDOR_Y }); pts.push({ ...b.porta }); }
  pts.push(para);
  return pts;
}

function desenharBoneco(c: CanvasRenderingContext2D, sheet: HTMLImageElement, b: Boneco, t: number) {
  const linha = PERSONAGENS.indexOf(b.personagem);
  const grupo = DIRS.indexOf(b.andando ? b.dir : b.dirParado);
  const seq = [0, 1, 0, 2];
  const quadro = b.andando ? seq[Math.floor(t / 150) % 4] : 0;
  const sx = (grupo * 3 + quadro) * CELL_W, sy = linha * CELL_H;
  const dw = CELL_W * ESCALA, dh = CELL_H * ESCALA;
  const x = Math.round(b.pos.x - dw / 2), y = Math.round(b.pos.y - dh + 4);
  c.fillStyle = "rgba(0,0,0,.28)";
  c.beginPath(); c.ellipse(b.pos.x, b.pos.y + 1, 14, 5, 0, 0, Math.PI * 2); c.fill();
  c.drawImage(sheet, sx, sy, CELL_W, CELL_H, x, y, dw, dh);
  // etiqueta com o nome
  c.font = "bold 12px Inter, system-ui, sans-serif";
  const nome = b.dados.nome.length > 18 ? b.dados.nome.slice(0, 17) + "…" : b.dados.nome;
  const tw = c.measureText(nome).width + 12;
  const lx = Math.round(b.pos.x - tw / 2), ly = Math.round(b.pos.y + 6);
  c.fillStyle = "rgba(10,10,14,.82)";
  c.beginPath(); c.roundRect(lx, ly, tw, 17, 5); c.fill();
  const cor = b.dados.estado === "trabalhando" ? "#7fb58f" : b.dados.estado === "esperando_voce" ? "#d2b06a" : b.dados.estado === "pausado" ? "#9aa2ad" : "#c9cbd2";
  c.fillStyle = cor; c.beginPath(); c.arc(lx + 8, ly + 8.5, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#f3f3f5"; c.fillText(nome, lx + 14, ly + 12.5);
}

function desenharPortas(c: CanvasRenderingContext2D, img: HTMLImageElement, bonecos: Iterable<Boneco>, dt: number) {
  const lista = Array.from(bonecos);
  PORTAS.forEach((d, i) => {
    const cx = d.x + PORTA_W / 2, cy = d.lado === "c" ? d.y + 47 : d.y + 10;
    const perto = lista.some((b) => Math.abs(b.pos.x - cx) < 34 && Math.abs(b.pos.y - cy) < 50);
    const atual = portasAbertura.get(String(i)) ?? 0;
    const novo = atual + ((perto ? 1 : 0) - atual) * Math.min(1, dt * (perto ? 10 : 3.5));
    portasAbertura.set(String(i), novo);
    if (novo < 0.03 || !img.complete || !img.naturalWidth) return;
    const h = PORTA_H * novo;
    const dy = d.lado === "c" ? d.y + PORTA_H - h : d.y;
    c.drawImage(img, i * PORTA_W, d.lado === "c" ? PORTA_H - h : 0, PORTA_W, h, d.x, dy, PORTA_W, h);
  });
}
function desenharLuzMesa(c: CanvasRenderingContext2D, b: Boneco, t: number) {
  if (b.andando || (b.dados.estado !== "trabalhando" && b.dados.estado !== "esperando_voce")) return;
  if (Math.hypot(b.pos.x - b.mesa.x, b.pos.y - b.mesa.y) > 4) return;
  const pulso = 0.18 + 0.06 * Math.sin(t / 420);
  const g = c.createRadialGradient(b.mesa.x, b.mesa.y - 52, 4, b.mesa.x, b.mesa.y - 52, 52);
  g.addColorStop(0, `rgba(255,244,200,${pulso + 0.12})`); g.addColorStop(1, "rgba(255,244,200,0)");
  c.fillStyle = g; c.fillRect(b.mesa.x - 56, b.mesa.y - 108, 112, 80);
}
function desenharPensamento(c: CanvasRenderingContext2D, b: Boneco, t: number) {
  const fase = (t + hash(b.dados.id) % 5000) % 14000;
  if (b.dados.estado !== "trabalhando" || b.andando || fase > 3200) return false;
  const x = b.pos.x + 22, y = b.pos.y - CELL_H * ESCALA - 14;
  c.fillStyle = "rgba(255,255,255,.95)";
  c.beginPath(); c.arc(x - 12, y + 16, 3, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x - 6, y + 10, 5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x + 12, y - 2, 24, 14, 0, 0, Math.PI * 2); c.fill();
  const n = 1 + Math.floor((fase / 400) % 3);
  c.fillStyle = "#44464d"; c.font = "bold 14px Inter, system-ui, sans-serif"; c.fillText(".".repeat(n), x + 2, y + 4);
  return true;
}

function desenharBalao(c: CanvasRenderingContext2D, b: Boneco, t: number) {
  if (b.andando) return;
  if (desenharPensamento(c, b, t)) return;
  if (!b.fala || t > b.falaAte) return;
  const emoji = [...b.fala].length <= 2;
  c.font = emoji ? "20px system-ui, sans-serif" : "13px Inter, system-ui, sans-serif";
  const texto = emoji ? b.fala : b.fala.length > 34 ? b.fala.slice(0, 33) + "…" : b.fala;
  const tw = c.measureText(texto).width + 16, th = emoji ? 30 : 24;
  const bx = Math.round(Math.max(4, Math.min(W - tw - 4, b.pos.x - tw / 2))), by = Math.round(b.pos.y - CELL_H * ESCALA - th - 2);
  c.fillStyle = "rgba(255,253,246,.97)";
  c.beginPath(); c.roundRect(bx, by, tw, th, 8); c.fill();
  c.beginPath(); c.moveTo(b.pos.x - 5, by + th); c.lineTo(b.pos.x + 5, by + th); c.lineTo(b.pos.x, by + th + 6); c.closePath(); c.fill();
  c.fillStyle = b.dados.estado === "esperando_voce" ? "#a15c00" : "#15151a";
  c.fillText(texto, bx + 8, by + (emoji ? 22 : 16.5));
}

export function Escritorio({ compacto = false }: { compacto?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bonecos = useRef<Map<string, Boneco>>(new Map());
  const [dados, setDados] = useState<Dados | null>(null);
  const [hover, setHover] = useState<Boneco | null>(null);
  const [pronto, setPronto] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const eventosRef = useRef<Evento[]>([]);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      const d = (await fetch("/api/escritorio").then((r) => r.json()).catch(() => null)) as Dados | null;
      if (!vivo || !d) return;
      setDados(d);
      const vistos = new Set<string>();
      const porSala: Record<string, number> = {};
      d.agentes.forEach((a, i) => {
        vistos.add(a.id);
        const { sala, personagem } = salaEPersonagem(a);
        const idx = (porSala[sala] = (porSala[sala] ?? 0) + 1) - 1;
        const mesas = MESAS[sala] ?? MESAS.expansao;
        const mesa = mesas[idx % mesas.length];
        let b = bonecos.current.get(a.id);
        if (!b) {
          const inicio = { x: 560 + ((i * 97) % 700), y: 760 };
          b = { dados: a, personagem, salaTrabalho: sala, mesa, pos: inicio, alvo: inicio, rota: [], dir: "frente", dirParado: "frente", andando: false, proximaDecisao: 0, fala: "", falaAte: 0, acao: "chegando ao escritório" };
          bonecos.current.set(a.id, b);
        }
        const mudou = b.dados.estado !== a.estado || b.dados.tarefa?.id !== a.tarefa?.id;
        b.dados = a; b.mesa = mesa; b.salaTrabalho = sala; b.personagem = personagem;
        if (mudou) b.proximaDecisao = 0;
      });
      for (const id of Array.from(bonecos.current.keys())) if (!vistos.has(id) && id !== "dono") bonecos.current.delete(id);
      if (!bonecos.current.has("dono")) {
        const mesa = MESAS.presidencia[0];
        bonecos.current.set("dono", { dados: { id: "dono", nome: "Eduardo", papel: "dono", titulo: "Engenheiro responsável", sala: "presidencia", estado: "trabalhando", tarefa: null, ultimaAtividade: null }, personagem: "eduardo", salaTrabalho: "presidencia", mesa, pos: { ...mesa }, alvo: { ...mesa }, rota: [], dir: "costas", dirParado: "costas", andando: false, proximaDecisao: Number.MAX_SAFE_INTEGER, fala: "", falaAte: 0, acao: "na presidência" });
      }
    }
    void carregar();
    const t = window.setInterval(carregar, 15000);
    return () => { vivo = false; window.clearInterval(t); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d")!;
    const fundo = new Image(); fundo.src = "/escritorio/fundo.webp?v=3";
    const sheet = new Image(); sheet.src = "/escritorio/sprites.webp?v=2";
    const portasImg = new Image(); portasImg.src = "/escritorio/portas.webp";
    let carregados = 0;
    const ok = () => { carregados++; if (carregados === 2) setPronto(true); };
    fundo.onload = ok; sheet.onload = ok;
    let raf = 0, ultimo = performance.now();
    const VEL = 95; // px do desenho por segundo

    function registrar(b: Boneco, texto: string) {
      if (b.acao === texto) return;
      b.acao = texto;
      eventosRef.current = [{ quando: Date.now(), agente: b.dados.nome, texto }, ...eventosRef.current].slice(0, 12);
      setEventos(eventosRef.current);
    }
    function decidir(b: Boneco, agora: number) {
      const a = b.dados;
      if (a.estado === "trabalhando" || a.estado === "esperando_voce") {
        if (b.alvo.x !== b.mesa.x || b.alvo.y !== b.mesa.y) { b.alvo = b.mesa; b.rota = rotaPara(b.pos, b.mesa); }
        b.dirParado = "costas";
        registrar(b, a.estado === "esperando_voce" ? `aguarda sua aprovação${a.tarefa ? ` em ${a.tarefa.identificador}` : ""}` : `trabalhando${a.tarefa ? ` em ${a.tarefa.identificador} — ${a.tarefa.titulo}` : ""}`);
        b.fala = a.estado === "esperando_voce" ? "✋ Precisa de você" : a.tarefa ? `${a.tarefa.identificador}: ${a.tarefa.titulo}` : "Trabalhando…";
        b.falaAte = agora + 30000; b.proximaDecisao = agora + 10000 + Math.random() * 5000;
        return;
      }
      if (a.estado === "pausado") {
        if (b.alvo !== SOFA) { b.alvo = SOFA; b.rota = rotaPara(b.pos, SOFA); }
        b.dirParado = "frente"; b.fala = "💤"; b.falaAte = agora + 30000; b.proximaDecisao = agora + 12000;
        registrar(b, "pausado, cochilando no lounge");
        return;
      }
      const ocupados = new Set(Array.from(bonecos.current.values()).filter((o) => o !== b).map((o) => `${o.alvo.x},${o.alvo.y}`));
      const livres = DESCANSO.filter((l) => !ocupados.has(`${l.p.x},${l.p.y}`));
      const lugar = (livres.length ? livres : DESCANSO)[Math.floor(Math.random() * (livres.length ? livres.length : DESCANSO.length))];
      b.alvo = lugar.p; b.rota = rotaPara(b.pos, lugar.p); b.dirParado = lugar.dir;
      registrar(b, lugar.acao);
      b.fala = lugar.falas[Math.floor(Math.random() * lugar.falas.length)]; b.falaAte = agora + 25000;
      b.proximaDecisao = agora + 20000 + Math.random() * 30000;
    }

    function passo(agora: number) {
      const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      for (const b of bonecos.current.values()) {
        if (agora >= b.proximaDecisao) decidir(b, agora);
        if (b.rota.length) {
          const p = b.rota[0];
          const dx = p.x - b.pos.x, dy = p.y - b.pos.y, d = Math.hypot(dx, dy);
          if (d < 2) { b.pos = { ...p }; b.rota.shift(); if (!b.rota.length) b.andando = false; }
          else { const s = Math.min(d, VEL * dt); b.pos = { x: b.pos.x + (dx / d) * s, y: b.pos.y + (dy / d) * s }; b.andando = true; b.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "esquerda" : "direita") : dy < 0 ? "costas" : "frente"; }
        }
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = canvas.clientWidth, ch = Math.round(cw * (H / W));
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); canvas.style.height = `${ch}px`; }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = true;
      c.scale((cw / W) * dpr, (cw / W) * dpr);
      c.fillStyle = "#2f5f33"; c.fillRect(0, 0, W, H);
      if (fundo.complete && fundo.naturalWidth) c.drawImage(fundo, 0, 0, W, H);
      const ordenados = Array.from(bonecos.current.values()).sort((a, b) => a.pos.y - b.pos.y);
      for (const b of ordenados) desenharLuzMesa(c, b, agora);
      desenharPortas(c, portasImg, ordenados, dt);
      if (sheet.complete && sheet.naturalWidth) {
        for (const b of ordenados) desenharBoneco(c, sheet, b, agora);
        for (const b of ordenados) desenharBalao(c, b, agora);
      }
      raf = requestAnimationFrame(passo);
    }
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  function aoMover(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    let achado: Boneco | null = null;
    for (const b of bonecos.current.values()) if (Math.abs(b.pos.x - x) < 24 && y > b.pos.y - 62 && y < b.pos.y + 22) achado = b;
    setHover(achado);
  }

  const trabalhando = dados?.agentes.filter((a) => a.estado === "trabalhando").length ?? 0;
  const esperando = dados?.agentes.filter((a) => a.estado === "esperando_voce").length ?? 0;

  return (
    <section className={`escritorio ${compacto ? "escritorio-compacto" : ""}`}>
      <header className="escritorio-topo">
        <div>
          <span className="eyebrow">Escritório dos agentes</span>
          <h2>{dados?.empresa || "Preforte Engenharia"} {dados?.demo && <span className="tag pending">Demonstração</span>}</h2>
        </div>
        <div className="escritorio-contadores">
          <span><b>{dados?.agentes.length ?? 0}</b> agentes</span>
          <span className="ok"><b>{trabalhando}</b> trabalhando</span>
          <span className={esperando ? "warn" : ""}><b>{esperando}</b> precisa de você</span>
          {dados?.demo && <a className="secondary-button" href="/paperclip">Conectar ao Paperclip</a>}
        </div>
      </header>
      <div className="escritorio-mapa">
        {!pronto && <div className="escritorio-carregando">Abrindo o escritório…</div>}
        <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} onMouseMove={aoMover} onMouseLeave={() => setHover(null)} />
        {hover && (
          <div className="escritorio-dica" style={{ left: `${(hover.pos.x / W) * 100}%`, top: `${(hover.pos.y / H) * 100}%` }}>
            <strong>{hover.dados.nome}</strong>
            <span>{hover.dados.titulo || hover.dados.papel}</span>
            <em>{hover.dados.estado === "trabalhando" ? "Trabalhando" : hover.dados.estado === "esperando_voce" ? "Precisa de você" : hover.dados.estado === "pausado" ? "Pausado" : "Disponível"}</em>
            <small>Agora: {hover.acao}</small>
            {hover.dados.tarefa && <small>{hover.dados.tarefa.identificador} · {hover.dados.tarefa.titulo}</small>}
          </div>
        )}
      </div>
      {!compacto && (
        <div className="escritorio-feed">
          <h3>Agora no escritório</h3>
          {!eventos.length && <p className="empty-copy">Os agentes estão chegando…</p>}
          {eventos.map((e, i) => (
            <div className="escritorio-linha" key={`e${i}`}>
              <time>{new Date(e.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
              <b>{e.agente}</b>
              <span>{e.texto}</span>
            </div>
          ))}
          <h3 style={{ marginTop: 16 }}>Registro do Paperclip</h3>
          {!dados?.atividades.length && <p className="empty-copy">Nenhuma atividade ainda.</p>}
          {dados?.atividades.map((a: Atividade, i) => (
            <div className="escritorio-linha" key={i}>
              <time>{new Date(a.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
              <b>{a.agente}</b>
              <span>{a.texto}</span>
              {a.tarefa && <small>{a.tarefa}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
