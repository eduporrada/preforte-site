// Compartilhado entre o navegador e o servidor (sem dependências de Node).
// Tipo de serviço → pasta do OneDrive. A primeira regra que bater vale.
export const CATEGORIAS: { pasta: string; rotulo: string; palavras: string[] }[] = [
  { pasta: "BOMBEIROS", rotulo: "Bombeiros / PPCI", palavras: ["bombeiro", "ppci", "incêndio", "incendio", "cercon", "cbm"] },
  { pasta: "DESDOBRO", rotulo: "Desmembramento, remembramento, retificação", palavras: ["desmembr", "remembr", "retifica", "desdobr", "unifica"] },
  { pasta: "LOTEAMENTO", rotulo: "Loteamento e condomínios", palavras: ["loteamento", "lotear", "condomín", "condomin"] },
  { pasta: "TOPOGRAFIA", rotulo: "Topografia, ortomosaico e drone (Agisoft)", palavras: ["topograf", "ortomosaico", "drone", "agisoft", "aerofoto", "georreferenc", "planialtim"] },
  { pasta: "LAUDOS", rotulo: "Laudos", palavras: ["laudo", "vistoria", "perícia", "pericia"] },
  { pasta: "CAIXA FINANCIAMENTO", rotulo: "Avaliação Caixa", palavras: ["avaliação caixa", "avaliacao caixa", "avalia bens", "avaliação de imóvel"] },
  { pasta: "REDUÇÃO DO INSS", rotulo: "Redução do INSS", palavras: ["inss"] },
  { pasta: "ESTRUTURA METÁLICAS", rotulo: "Estrutura metálica", palavras: ["metálica", "metalica"] },
  { pasta: "SUVISA", rotulo: "Vigilância sanitária", palavras: ["suvisa", "sanitária", "vigilância"] },
  { pasta: "ORÇAMENTO", rotulo: "Orçamento", palavras: ["orçamento", "orcamento"] },
  { pasta: "CONSTRUÇÕES", rotulo: "Construções (arquitetura, estrutural, elétrico, hidro, levantamento, obra)", palavras: [] },
];

export function categoriaDoTipo(tipo: string) {
  const t = tipo.toLowerCase();
  return CATEGORIAS.find((c) => c.palavras.some((p) => t.includes(p))) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

