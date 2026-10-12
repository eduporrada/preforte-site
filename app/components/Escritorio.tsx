"use client";

/**
 * Escritório em pixel art: cada agente do Paperclip é um bonequinho.
 * Trabalhando → sentado na mesa da sua sala, com o balão da tarefa.
 * Parado → passeia pela copa, lounge ou banheiro. Pausado → cochila no lounge.
 * Só desenha o que a API /api/escritorio devolve; não gasta crédito.
 */
import { useEffect, useRef, useState } from "react";
import type { AgenteEstado, Atividade, Escritorio as Dados, Sala } from "../escritorio-dados";

const T = 16; // tamanho do tile em px lógicos
const COLS = 48;
const ROWS = 28;
const W = COLS * T;
const H = ROWS * T;

type Piso = "madeira" | "azulejo" | "carpete" | "carpete2" | "banheiro" | "madeira-escura";
type Room = { id: Sala | "recepcao" | "copa" | "lounge" | "banheiros"; nome: string; x: number; y: number; w: number; h: number; piso: Piso; porta: { x: number; y: number }; lado: "baixo" | "cima" };

// Salas em tiles (x, y, largura, altura) — porta no lado do corredor (y 13–14).
const SALAS: Room[] = [
  { id: "recepcao", nome: "Recepção", x: 2, y: 3, w: 10, h: 9, piso: "madeira", porta: { x: 7, y: 12 }, lado: "baixo" },
  { id: "copa", nome: "Copa", x: 13, y: 3, w: 10, h: 9, piso: "azulejo", porta: { x: 18, y: 12 }, lado: "baixo" },
  { id: "presidencia", nome: "Presidência", x: 24, y: 3, w: 10, h: 9, piso: "madeira-escura", porta: { x: 29, y: 12 }, lado: "baixo" },
  { id: "gerencia", nome: "Gerência", x: 35, y: 3, w: 11, h: 9, piso: "carpete", porta: { x: 40, y: 12 }, lado: "baixo" },
  { id: "banheiros", nome: "Banheiros", x: 2, y: 16, w: 7, h: 9, piso: "banheiro", porta: { x: 5, y: 15 }, lado: "cima" },
  { id: "lounge", nome: "Lounge", x: 10, y: 16, w: 10, h: 9, piso: "madeira", porta: { x: 15, y: 15 }, lado: "cima" },
  { id: "desenhistas", nome: "Desenhistas", x: 21, y: 16, w: 9, h: 9, piso: "carpete2", porta: { x: 25, y: 15 }, lado: "cima" },
  { id: "redacao", nome: "Redação", x: 31, y: 16, w: 7, h: 9, piso: "carpete", porta: { x: 34, y: 15 }, lado: "cima" },
  { id: "analise", nome: "Análise", x: 39, y: 16, w: 7, h: 9, piso: "carpete2", porta: { x: 42, y: 15 }, lado: "cima" },
];

type Px = { x: number; y: number };
const px = (tx: number, ty: number): Px => ({ x: tx * T + T / 2, y: ty * T + T / 2 });

// Mesas (onde os agentes sentam) por sala — tile da cadeira; o monitor fica acima.
const MESAS: Record<string, Px[]> = {
  presidencia: [px(29, 7)],
  gerencia: [px(38, 7), px(42, 7)],
  desenhistas: [px(23, 19), px(27, 19), px(23, 22), px(27, 22)],
  redacao: [px(34, 19), px(34, 22)],
  analise: [px(42, 19), px(42, 22)],
  geral: [px(5, 7), px(9, 7)],
};
// Lugares de descanso.
const DESCANSO: { sala: string; p: Px; falas: string[] }[] = [
  { sala: "copa", p: px(15, 7), falas: ["☕", "🍪", "🥤"] },
  { sala: "copa", p: px(19, 7), falas: ["☕", "🍞", "💬"] },
  { sala: "copa", p: px(17, 9), falas: ["☕", "🍌"] },
  { sala: "lounge", p: px(12, 19), falas: ["📺", "💬", "🎮"] },
  { sala: "lounge", p: px(14, 19), falas: ["🎮", "😌"] },
  { sala: "lounge", p: px(17, 22), falas: ["🏓", "💬"] },
  { sala: "banheiros", p: px(4, 21), falas: ["🚻", "🪞"] },
  { sala: "banheiros", p: px(7, 21), falas: ["🚻"] },
  { sala: "recepcao", p: px(9, 9), falas: ["📰", "💬"] },
];
const SOFA = px(12, 22);

const PALETAS = [
  ["#f2c9a0", "#3a2a1e", "#4f7cff"], ["#e6b48c", "#1a1a1a", "#ff6b6b"], ["#f7d3b1", "#8b4513", "#36c48c"], ["#d9a577", "#000000", "#f5b63b"],
  ["#f1c7a3", "#c8a24a", "#c084fc"], ["#c68a5a", "#2b1b12", "#22c1c3"], ["#f3cfae", "#5c3c23", "#f472b6"], ["#e9b790", "#7a1f1f", "#94a3b8"],
];
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

type Bonequinho = {
  dados: AgenteEstado;
  pos: Px;
  alvo: Px;
  rota: Px[];
  salaAtual: string;
  andando: boolean;
  dir: 0 | 1 | 2 | 3; // baixo, esquerda, direita, cima
  frame: number;
  proximaDecisao: number;
  fala: string;
  falaAte: number;
  cores: string[];
  sentado: boolean;
};

function salaDe(p: Px): Room | null {
  const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  return SALAS.find((s) => tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h) ?? null;
}
function rotaPara(de: Px, para: Px): Px[] {
  const a = salaDe(de), b = salaDe(para);
  const corredorY = 14 * T;
  const pts: Px[] = [];
  if (a && a !== b) {
    pts.push(px(a.porta.x, a.porta.y));
    pts.push({ x: a.porta.x * T + T / 2, y: corredorY });
  } else if (!a) {
    pts.push({ x: de.x, y: corredorY });
  }
  if (b && a !== b) {
    pts.push({ x: b.porta.x * T + T / 2, y: corredorY });
    pts.push(px(b.porta.x, b.porta.y));
  }
  pts.push(para);
  return pts;
}

/* ---------- desenho ---------- */
function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string) {
  c.fillStyle = cor;
  c.fillRect(x, y, w, h);
}

function desenharCenario(c: CanvasRenderingContext2D, t: number) {
  // grama
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) rect(c, x * T, y * T, T, T, (x + y) % 2 ? "#3d7a3b" : "#428343");
  // caminho e rua
  rect(c, 0, 25.5 * T, W, 2.5 * T, "#2b2b30");
  for (let x = 0; x < COLS; x += 3) rect(c, x * T, 26.6 * T, 1.6 * T, 3, "#d9c15a");
  rect(c, 23 * T, 25 * T, 2 * T, T, "#b9a27a");
  // árvores
  const arvores = [[0.5, 0.5], [3, 1], [9, 0.5], [20, 1], [30, 0.5], [44, 1], [46.5, 0.5], [0.5, 13], [46.8, 13.3], [14, 0.6], [38, 0.4]];
  for (const [ax, ay] of arvores) {
    const x = ax * T, y = ay * T;
    rect(c, x + 6, y + 14, 4, 6, "#5a3a1e");
    rect(c, x + 1, y + 4, 14, 11, "#2f6b2e");
    rect(c, x + 3, y + 1, 10, 6, "#3f8a3c");
    rect(c, x + 5, y, 6, 3, "#4f9f49");
  }
  // prédio: contorno
  rect(c, 1.5 * T, 2.5 * T, 45.5 * T, 23 * T, "#4b4640");
  // corredor
  for (let y = 12.9; y < 15.1; y += 1) for (let x = 2; x < 46; x++) rect(c, x * T, y * T, T, T, (x + Math.floor(y)) % 2 ? "#9d9890" : "#a8a39a");
  rect(c, 2 * T, 12.8 * T, 44 * T, 4, "#6e6961");
  rect(c, 2 * T, 15.2 * T, 44 * T, 4, "#6e6961");
  // salas
  for (const s of SALAS) {
    const X = s.x * T, Y = s.y * T, Wd = s.w * T, Ht = s.h * T;
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const par = (x + y) % 2 === 0;
        const cor =
          s.piso === "madeira" ? (y % 2 ? "#8d6a4a" : "#946f4e") :
          s.piso === "madeira-escura" ? (y % 2 ? "#5e4332" : "#664a37") :
          s.piso === "azulejo" ? (par ? "#cfd6d9" : "#c1c9cd") :
          s.piso === "banheiro" ? (par ? "#e3eaee" : "#d2dbe0") :
          s.piso === "carpete" ? (par ? "#55607a" : "#5a6684") : (par ? "#4f6b6a" : "#547372");
        rect(c, X + x * T, Y + y * T, T, T, cor);
      }
    // paredes
    rect(c, X - 4, Y - 10, Wd + 8, 10, "#d8d2c4");
    rect(c, X - 4, Y - 12, Wd + 8, 2, "#4b4640");
    rect(c, X - 4, Y, 4, Ht, "#bfb8a9");
    rect(c, X + Wd, Y, 4, Ht, "#bfb8a9");
    rect(c, X - 4, Y + Ht, Wd + 8, 4, "#bfb8a9");
    // porta
    const dx = s.porta.x * T, dy = s.lado === "baixo" ? Y + Ht : Y - 12;
    rect(c, dx - 2, dy, T + 4, s.lado === "baixo" ? 4 : 12, "#7a5230");
    // placa
    c.font = "bold 9px monospace";
    c.fillStyle = "#101014";
    const tw = c.measureText(s.nome).width + 8;
    const lx = X + Wd / 2 - tw / 2, ly = Y - 22;
    rect(c, lx, ly, tw, 11, "#101014");
    c.fillStyle = "#f3f3f5";
    c.fillText(s.nome, lx + 4, ly + 9);
    mobiliar(c, s, t);
  }
}

function mesa(c: CanvasRenderingContext2D, p: Px, ligado: boolean, t: number) {
  const x = p.x - 10, y = p.y - 26;
  rect(c, x, y + 8, 20, 10, "#6b4a2b");
  rect(c, x, y + 8, 20, 2, "#8a6238");
  rect(c, x + 5, y, 10, 8, "#1b1d22");
  rect(c, x + 6, y + 1, 8, 6, ligado ? (Math.floor(t / 400) % 2 ? "#5fb0ff" : "#4f9cf0") : "#2a2e36");
  rect(c, x + 9, y + 8, 2, 1, "#3a3d44");
  // cadeira
  rect(c, p.x - 5, p.y - 2, 10, 9, "#2a2d33");
  rect(c, p.x - 5, p.y - 5, 10, 3, "#3a3e46");
}
function planta(c: CanvasRenderingContext2D, x: number, y: number) {
  rect(c, x + 3, y + 8, 6, 6, "#8b4a2b");
  rect(c, x, y + 1, 12, 8, "#2f8a3e");
  rect(c, x + 3, y - 2, 6, 5, "#45a853");
}
function mobiliar(c: CanvasRenderingContext2D, s: Room, t: number) {
  const X = s.x * T, Y = s.y * T;
  if (s.id === "recepcao") {
    rect(c, X + 8, Y + 8, 60, 22, "#6b4a2b"); rect(c, X + 8, Y + 8, 60, 3, "#8a6238");
    rect(c, X + 14, Y - 6, 44, 10, "#1b1d22"); c.font = "bold 7px monospace"; c.fillStyle = "#ff5a4f"; c.fillText("PREFORTE", X + 18, Y + 2);
    rect(c, X + 100, Y + 20, 40, 14, "#2d6cdf"); rect(c, X + 100, Y + 34, 40, 6, "#1f4ea8");
    planta(c, X + 140, Y + 96); planta(c, X + 10, Y + 110);
  }
  if (s.id === "copa") {
    rect(c, X + 6, Y + 6, 50, 14, "#cfcfd4"); rect(c, X + 6, Y + 6, 50, 3, "#8e8e96"); // bancada
    rect(c, X + 60, Y + 2, 16, 26, "#e9e9ee"); rect(c, X + 62, Y + 4, 12, 10, "#d4d4da"); // geladeira
    rect(c, X + 120, Y + 6, 26, 14, "#2a2d33"); rect(c, X + 124, Y + 9, 18, 8, "#3b7bd4"); // máquina de café
    rect(c, X + 30, Y + 56, 100, 24, "#a67c52"); rect(c, X + 30, Y + 56, 100, 3, "#c49a68"); // mesa grande
    for (let i = 0; i < 4; i++) { rect(c, X + 34 + i * 26, Y + 46, 10, 8, "#2a2d33"); rect(c, X + 34 + i * 26, Y + 84, 10, 8, "#2a2d33"); }
    planta(c, X + 140, Y + 110);
  }
  if (s.id === "presidencia") {
    mesa(c, MESAS.presidencia[0], true, t);
    rect(c, X + 8, Y + 4, 30, 40, "#5a3a1e"); for (let i = 0; i < 4; i++) rect(c, X + 10, Y + 8 + i * 9, 26, 5, ["#c0392b", "#2980b9", "#27ae60", "#f1c40f"][i]); // estante
    rect(c, X + 110, Y + 90, 40, 30, "#7a2e2e"); rect(c, X + 110, Y + 90, 40, 6, "#9a3e3e"); // tapete/sofá
    planta(c, X + 140, Y + 10);
  }
  if (s.id === "gerencia") {
    MESAS.gerencia.forEach((m) => mesa(c, m, true, t));
    rect(c, X + 10, Y + 100, 60, 28, "#f3f3f5"); rect(c, X + 10, Y + 100, 60, 2, "#a0a0a8"); // quadro branco
    for (let i = 0; i < 5; i++) rect(c, X + 14 + i * 11, Y + 106 + (i % 2) * 6, 8, 8, ["#ff5a4f", "#f5b63b", "#4ad07a", "#8b7cff", "#38bdf8"][i]);
    planta(c, X + 150, Y + 110);
  }
  if (s.id === "banheiros") {
    for (let i = 0; i < 3; i++) { rect(c, X + 8 + i * 34, Y + 6, 26, 30, "#b8c4cc"); rect(c, X + 16 + i * 34, Y + 14, 10, 12, "#f8fafc"); }
    rect(c, X + 8, Y + 110, 90, 12, "#dfe6ea"); for (let i = 0; i < 3; i++) rect(c, X + 14 + i * 30, Y + 112, 14, 8, "#cbd5e1");
    rect(c, X + 8, Y + 96, 90, 12, "#9fd3ff");
  }
  if (s.id === "lounge") {
    rect(c, X + 6, Y + 96, 50, 20, "#b03a3a"); rect(c, X + 6, Y + 90, 50, 8, "#c84a4a"); // sofá
    rect(c, X + 70, Y + 6, 36, 22, "#1b1d22"); rect(c, X + 74, Y + 9, 28, 14, Math.floor(t / 700) % 2 ? "#6bb3ff" : "#4a86d6"); // TV
    rect(c, X + 100, Y + 80, 44, 26, "#2e6b4f"); rect(c, X + 121, Y + 80, 2, 26, "#f3f3f5"); // mesa de pingue-pongue
    rect(c, X + 10, Y + 40, 30, 36, "#5a3a1e"); for (let i = 0; i < 3; i++) rect(c, X + 12, Y + 44 + i * 10, 26, 6, ["#8b7cff", "#38bdf8", "#f5b63b"][i]); // estante
    planta(c, X + 140, Y + 8);
  }
  if (s.id === "desenhistas") { MESAS.desenhistas.forEach((m) => mesa(c, m, true, t)); rect(c, X + 100, Y + 8, 40, 26, "#f3f3f5"); rect(c, X + 104, Y + 12, 32, 18, "#dbe3ea"); rect(c, X + 108, Y + 16, 22, 2, "#4b5563"); rect(c, X + 108, Y + 22, 14, 2, "#4b5563"); planta(c, X + 6, Y + 120); }
  if (s.id === "redacao") { MESAS.redacao.forEach((m) => mesa(c, m, true, t)); rect(c, X + 6, Y + 8, 26, 34, "#5a3a1e"); for (let i = 0; i < 3; i++) rect(c, X + 8, Y + 12 + i * 10, 22, 6, ["#c0392b", "#2980b9", "#27ae60"][i]); planta(c, X + 90, Y + 120); }
  if (s.id === "analise") { MESAS.analise.forEach((m) => mesa(c, m, true, t)); rect(c, X + 6, Y + 8, 30, 28, "#f3f3f5"); for (let i = 0; i < 4; i++) rect(c, X + 10, Y + 12 + i * 6, 22 - i * 4, 3, "#4b5563"); planta(c, X + 90, Y + 120); }
}

function desenharBonequinho(c: CanvasRenderingContext2D, b: Bonequinho, t: number) {
  const [pele, cabelo, roupa] = b.cores;
  const x = Math.round(b.pos.x) - 6, y = Math.round(b.pos.y) - 18;
  const passo = b.andando ? Math.floor(t / 140) % 2 : 0;
  // sombra
  rect(c, x + 2, y + 17, 8, 2, "rgba(0,0,0,.35)");
  // pernas
  rect(c, x + 3, y + 14, 2, 4 - passo, "#2b2f3a"); rect(c, x + 7, y + 14, 2, 4 - (1 - passo), "#2b2f3a");
  // corpo
  rect(c, x + 2, y + 8, 8, 6, roupa);
  rect(c, x + 1, y + 9, 1, 4, pele); rect(c, x + 10, y + 9, 1, 4, pele);
  // cabeça
  rect(c, x + 2, y + 2, 8, 6, pele);
  rect(c, x + 2, y, 8, 3, cabelo); rect(c, x + 1, y + 1, 1, 3, cabelo); rect(c, x + 10, y + 1, 1, 3, cabelo);
  if (b.dir !== 3) { // olhos
    const ox = b.dir === 1 ? -1 : b.dir === 2 ? 1 : 0;
    rect(c, x + 4 + ox, y + 4, 1, 1, "#111"); rect(c, x + 7 + ox, y + 4, 1, 1, "#111");
  }
  // nome
  c.font = "bold 7px monospace";
  const nome = b.dados.nome.length > 14 ? b.dados.nome.slice(0, 13) + "…" : b.dados.nome;
  const tw = c.measureText(nome).width + 6;
  rect(c, Math.round(b.pos.x - tw / 2), y + 20, tw, 9, "rgba(10,10,14,.85)");
  c.fillStyle = b.dados.estado === "esperando_voce" ? "#f5b63b" : "#f3f3f5";
  c.fillText(nome, Math.round(b.pos.x - tw / 2) + 3, y + 27);
  // estado
  const cor = b.dados.estado === "trabalhando" ? "#4ad07a" : b.dados.estado === "esperando_voce" ? "#f5b63b" : b.dados.estado === "pausado" ? "#94a3b8" : "#8b7cff";
  rect(c, x + 11, y, 3, 3, cor);
}

function desenharBalao(c: CanvasRenderingContext2D, b: Bonequinho, t: number) {
  if (!b.fala || t > b.falaAte) return;
  c.font = "8px system-ui, sans-serif";
  const texto = b.fala;
  const tw = Math.min(150, c.measureText(texto).width + 10);
  const bx = Math.round(Math.max(2, Math.min(W - tw - 2, b.pos.x - tw / 2))), by = Math.round(b.pos.y - 34);
  const emoji = texto.length <= 2;
  rect(c, bx, by, emoji ? 18 : tw, 13, "#fffdf6"); rect(c, bx + 1, by + 13, 3, 2, "#fffdf6");
  c.fillStyle = "#101014";
  c.fillText(texto.length > 30 ? texto.slice(0, 29) + "…" : texto, bx + 4, by + 10);
}

/* ---------- componente ---------- */
export function Escritorio({ compacto = false }: { compacto?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bonecos = useRef<Map<string, Bonequinho>>(new Map());
  const dadosRef = useRef<Dados | null>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [hover, setHover] = useState<Bonequinho | null>(null);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      const d = (await fetch("/api/escritorio").then((r) => r.json()).catch(() => null)) as Dados | null;
      if (!vivo || !d) return;
      dadosRef.current = d;
      setDados(d);
      const vistos = new Set<string>();
      let i = 0;
      const porSala: Record<string, number> = {};
      for (const a of d.agentes) {
        vistos.add(a.id);
        const idx = (porSala[a.sala] = (porSala[a.sala] ?? 0) + 1) - 1;
        const mesas = MESAS[a.sala] ?? MESAS.geral;
        const mesaDele = mesas[idx % mesas.length];
        let b = bonecos.current.get(a.id);
        if (!b) {
          const h = hash(a.id + a.nome);
          const inicio = { x: (20 + (i * 1.3) % 8) * T, y: 25 * T + 4 };
          b = { dados: a, pos: inicio, alvo: inicio, rota: [], salaAtual: "", andando: false, dir: 0, frame: 0, proximaDecisao: 0, fala: "", falaAte: 0, cores: PALETAS[h % PALETAS.length], sentado: false };
          bonecos.current.set(a.id, b);
        }
        const mudou = b.dados.estado !== a.estado || b.dados.tarefa?.id !== a.tarefa?.id;
        b.dados = a;
        (b as Bonequinho & { mesa: Px }).mesa = mesaDele;
        if (mudou || b.proximaDecisao === 0) b.proximaDecisao = 0; // força nova decisão
        i++;
      }
      for (const id of Array.from(bonecos.current.keys())) if (!vistos.has(id)) bonecos.current.delete(id);
    }
    void carregar();
    const t = window.setInterval(carregar, 15000);
    return () => { vivo = false; window.clearInterval(t); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d")!;
    let raf = 0;
    let ultimo = performance.now();
    const VEL = 46; // px/s

    function decidir(b: Bonequinho & { mesa?: Px }, agora: number) {
      const a = b.dados;
      if (a.estado === "trabalhando" || a.estado === "esperando_voce") {
        const alvo = b.mesa ?? MESAS.geral[0];
        if (b.alvo.x !== alvo.x || b.alvo.y !== alvo.y) { b.alvo = alvo; b.rota = rotaPara(b.pos, alvo); }
        b.fala = a.estado === "esperando_voce" ? "✋ Precisa de você" : a.tarefa ? `${a.tarefa.identificador}: ${a.tarefa.titulo}` : "Trabalhando…";
        b.falaAte = agora + 20000;
        b.proximaDecisao = agora + 9000 + Math.random() * 4000;
        return;
      }
      if (a.estado === "pausado") {
        if (b.alvo !== SOFA) { b.alvo = SOFA; b.rota = rotaPara(b.pos, SOFA); }
        b.fala = "💤"; b.falaAte = agora + 4000; b.proximaDecisao = agora + 9000;
        return;
      }
      // parado: passear
      const lugar = DESCANSO[Math.floor(Math.random() * DESCANSO.length)];
      b.alvo = lugar.p; b.rota = rotaPara(b.pos, lugar.p);
      b.fala = lugar.falas[Math.floor(Math.random() * lugar.falas.length)]; b.falaAte = agora + 20000;
      b.proximaDecisao = agora + 18000 + Math.random() * 30000;
    }

    function passo(agora: number) {
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;
      for (const b of bonecos.current.values()) {
        if (agora >= b.proximaDecisao) decidir(b, agora);
        if (b.rota.length) {
          const p = b.rota[0];
          const dx = p.x - b.pos.x, dy = p.y - b.pos.y;
          const d = Math.hypot(dx, dy);
          if (d < 1.5) { b.pos = { ...p }; b.rota.shift(); if (!b.rota.length) { b.andando = false; b.dir = b.dados.estado === "trabalhando" || b.dados.estado === "esperando_voce" ? 3 : 0; } }
          else { const s = Math.min(d, VEL * dt); b.pos = { x: b.pos.x + (dx / d) * s, y: b.pos.y + (dy / d) * s }; b.andando = true; b.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0; }
        }
      }
      // desenhar
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth, ch = Math.round(cw * (H / W));
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); canvas.style.height = `${ch}px`; }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = false;
      c.scale((cw / W) * dpr, (cw / W) * dpr);
      desenharCenario(c, agora);
      const ordenados = Array.from(bonecos.current.values()).sort((a, b) => a.pos.y - b.pos.y);
      for (const b of ordenados) desenharBonequinho(c, b, agora);
      for (const b of ordenados) desenharBalao(c, b, agora);
      raf = requestAnimationFrame(passo);
    }
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  function aoMover(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    let achado: Bonequinho | null = null;
    for (const b of bonecos.current.values()) if (Math.abs(b.pos.x - x) < 9 && y > b.pos.y - 20 && y < b.pos.y + 10) achado = b;
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
        <canvas ref={canvasRef} style={{ width: "100%", display: "block", imageRendering: "pixelated" }} onMouseMove={aoMover} onMouseLeave={() => setHover(null)} />
        {hover && (
          <div className="escritorio-dica" style={{ left: `${(hover.pos.x / W) * 100}%`, top: `${(hover.pos.y / H) * 100}%` }}>
            <strong>{hover.dados.nome}</strong>
            <span>{hover.dados.titulo || hover.dados.papel}</span>
            <em>{hover.dados.estado === "trabalhando" ? "Trabalhando" : hover.dados.estado === "esperando_voce" ? "Precisa de você" : hover.dados.estado === "pausado" ? "Pausado" : "Disponível"}</em>
            {hover.dados.tarefa && <small>{hover.dados.tarefa.identificador} · {hover.dados.tarefa.titulo}</small>}
          </div>
        )}
      </div>
      {!compacto && (
        <div className="escritorio-feed">
          <h3>Atividade</h3>
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
