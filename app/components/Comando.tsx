"use client";

/**
 * Comando dos agentes: o Paperclip dentro do site, em português.
 * Tarefas, agentes, aprovações, rotinas, projetos e atividade.
 * Tudo passa por /api/pc (ponte no servidor com a chave aprovada pelo dono).
 */
import { useCallback, useEffect, useMemo, useState } from "react";

type Agente = { id: string; name: string; title: string | null; role: string; status: string; reportsTo: string | null; lastHeartbeatAt: string | null };
type Tarefa = { id: string; identifier: string; title: string; description?: string | null; status: string; priority: string; assigneeAgentId: string | null; projectId: string | null; updatedAt: string; createdAt: string; executionRunId: string | null };
type Comentario = { id: string; body: string; createdAt: string; authorAgentId?: string | null; authorUserId?: string | null; authorType?: string };
type Aprovacao = { id: string; type?: string; status: string; title?: string | null; summary?: string | null; payload?: Record<string, unknown>; requestedByAgentId?: string | null; createdAt: string };
type Rotina = { id: string; title?: string; name?: string; description?: string | null; status?: string; assigneeAgentId?: string | null; lastRunAt?: string | null };
type Projeto = { id: string; name: string; description: string | null; status: string; targetDate: string | null };
type Atividade = { id: string; actorType: string; agentId: string | null; action: string; entityType: string; entityId: string | null; createdAt: string };

const STATUS: { id: string; nome: string }[] = [
  { id: "backlog", nome: "Fila" },
  { id: "todo", nome: "A fazer" },
  { id: "in_progress", nome: "Em andamento" },
  { id: "in_review", nome: "Em revisão" },
  { id: "blocked", nome: "Bloqueada" },
  { id: "done", nome: "Concluída" },
  { id: "cancelled", nome: "Cancelada" },
];
const PRIORIDADE: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" };
const ESTADO_AGENTE: Record<string, string> = { idle: "Disponível", running: "Trabalhando", busy: "Trabalhando", paused: "Pausado", error: "Com erro", pending_approval: "Aguardando aprovação", terminated: "Desligado" };
const nomeStatus = (s: string) => STATUS.find((x) => x.id === s)?.nome ?? s;
const quando = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

async function pc<T>(caminho: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch(`/api/pc/${caminho}`, { method: init?.method ?? "GET", headers: { "content-type": "application/json" }, body: init?.body !== undefined ? JSON.stringify(init.body) : undefined });
  const texto = await r.text();
  let d: unknown = null;
  try { d = texto ? JSON.parse(texto) : null; } catch { d = null; }
  if (!r.ok) throw new Error((d as { error?: string } | null)?.error ?? `Erro ${r.status}`);
  return d as T;
}

type Aba = "tarefas" | "agentes" | "aprovacoes" | "rotinas" | "projetos" | "atividade";

export function Comando() {
  const [aba, setAba] = useState<Aba>("tarefas");
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [atividade, setAtividade] = useState<Atividade[]>([]);
  const [aberta, setAberta] = useState<Tarefa | null>(null);
  const [nova, setNova] = useState(false);
  const [aviso, setAviso] = useState("");
  const [filtroAgente, setFiltroAgente] = useState("");

  const nomeAgente = useCallback((id: string | null | undefined) => agentes.find((a) => a.id === id)?.name ?? (id ? "Agente" : "Ninguém"), [agentes]);

  const carregar = useCallback(async () => {
    const st = await fetch("/api/paperclip").then((r) => r.json()).catch(() => null);
    if (!st?.conectado) { setConectado(false); return; }
    setConectado(true);
    const [ag, ts, ap, ro, pj, at] = await Promise.all([
      pc<Agente[]>("empresa/agents").catch(() => []),
      pc<Tarefa[]>("empresa/issues?limit=300").catch(() => []),
      pc<Aprovacao[]>("empresa/approvals?status=pending").catch(() => []),
      pc<Rotina[]>("empresa/routines").catch(() => []),
      pc<Projeto[]>("empresa/projects").catch(() => []),
      pc<Atividade[]>("empresa/activity?limit=60").catch(() => []),
    ]);
    const lista = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
    setAgentes(lista<Agente>(ag).filter((a) => a.status !== "terminated"));
    setTarefas(lista<Tarefa>(ts));
    setAprovacoes(lista<Aprovacao>(ap));
    setRotinas(lista<Rotina>(ro));
    setProjetos(lista<Projeto>(pj));
    setAtividade(lista<Atividade>(at));
  }, []);

  useEffect(() => {
    void carregar();
    const t = window.setInterval(carregar, 20000);
    return () => window.clearInterval(t);
  }, [carregar]);

  function avisar(t: string) {
    setAviso(t);
    window.setTimeout(() => setAviso(""), 3500);
  }

  async function acao(f: () => Promise<unknown>, ok: string) {
    try {
      await f();
      avisar(ok);
      await carregar();
    } catch (e) {
      avisar((e as Error).message);
    }
  }

  const visiveis = useMemo(() => tarefas.filter((t) => !filtroAgente || t.assigneeAgentId === filtroAgente), [tarefas, filtroAgente]);

  if (conectado === false) {
    return (
      <div className="content-wrap"><div className="cmd-vazio">
        <h2>O site ainda não está ligado ao Paperclip</h2>
        <p>Ligue uma vez e passe a comandar os agentes por aqui: criar tarefas, aprovar, pausar e acompanhar.</p>
        <a className="primary-button" href="/paperclip">Conectar ao Paperclip</a>
      </div></div>
    );
  }

  const abas: { id: Aba; nome: string; n?: number }[] = [
    { id: "tarefas", nome: "Tarefas", n: tarefas.filter((t) => !["done", "cancelled"].includes(t.status)).length },
    { id: "agentes", nome: "Agentes", n: agentes.length },
    { id: "aprovacoes", nome: "Aprovações", n: aprovacoes.length },
    { id: "rotinas", nome: "Rotinas", n: rotinas.length },
    { id: "projetos", nome: "Projetos", n: projetos.length },
    { id: "atividade", nome: "Atividade" },
  ];

  return (
    <div className="content-wrap cmd">
      <div className="cmd-topo">
        <nav className="cmd-abas" aria-label="Seções do Paperclip">
          {abas.map((a) => (
            <button key={a.id} type="button" className={aba === a.id ? "ativa" : ""} onClick={() => setAba(a.id)}>
              {a.nome}{a.n ? <span>{a.n}</span> : null}
            </button>
          ))}
        </nav>
        <div className="cmd-acoes">
          {aba === "tarefas" && (
            <>
              <select value={filtroAgente} onChange={(e) => setFiltroAgente(e.target.value)} aria-label="Filtrar por agente">
                <option value="">Todos os agentes</option>
                {agentes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button className="primary-button" type="button" onClick={() => setNova(true)}>Nova tarefa</button>
            </>
          )}
          <button className="ghost-button" type="button" onClick={() => void carregar()}>Atualizar</button>
        </div>
      </div>
      {aviso && <div className="cmd-aviso" role="status">{aviso}</div>}
      {conectado === null && <p className="empty-copy">Carregando o Paperclip…</p>}

      {aba === "tarefas" && conectado && (
        <div className="cmd-quadro">
          {STATUS.filter((s) => s.id !== "cancelled").map((s) => {
            const lista = visiveis.filter((t) => t.status === s.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            return (
              <section className="cmd-coluna" key={s.id}>
                <header><span className={`cmd-ponto st-${s.id}`} />{s.nome}<em>{lista.length}</em></header>
                {lista.slice(0, s.id === "done" ? 12 : 100).map((t) => (
                  <button key={t.id} type="button" className="cmd-tarefa" onClick={() => setAberta(t)}>
                    <small>{t.identifier}{t.executionRunId ? " · trabalhando agora" : ""}</small>
                    <strong>{t.title}</strong>
                    <span>{nomeAgente(t.assigneeAgentId)}{t.priority && t.priority !== "medium" ? ` · ${PRIORIDADE[t.priority] ?? t.priority}` : ""}</span>
                  </button>
                ))}
                {!lista.length && <p className="cmd-nada">Nada aqui.</p>}
              </section>
            );
          })}
        </div>
      )}

      {aba === "agentes" && (
        <div className="cmd-lista">
          {agentes.map((a) => {
            const atual = tarefas.find((t) => t.assigneeAgentId === a.id && t.status === "in_progress");
            const pausado = a.status === "paused";
            return (
              <div className="cmd-linha" key={a.id}>
                <div className="cmd-linha-info">
                  <strong>{a.name}</strong>
                  <span>{a.title || a.role}</span>
                </div>
                <div className="cmd-linha-meio">
                  <span className={`cmd-estado e-${a.status}`}>{ESTADO_AGENTE[a.status] ?? a.status}</span>
                  <small>{atual ? `${atual.identifier} · ${atual.title}` : `Último turno: ${quando(a.lastHeartbeatAt)}`}</small>
                </div>
                <div className="cmd-linha-acoes">
                  <button className="ghost-button" type="button" onClick={() => acao(() => pc(`agents/${a.id}/heartbeat/invoke`, { method: "POST", body: {} }), `${a.name} foi chamado para trabalhar.`)} disabled={pausado}>Chamar agora</button>
                  {pausado ? (
                    <button className="secondary-button" type="button" onClick={() => acao(() => pc(`agents/${a.id}/resume`, { method: "POST", body: {} }), `${a.name} voltou a trabalhar.`)}>Retomar</button>
                  ) : (
                    <button className="ghost-button" type="button" onClick={() => acao(() => pc(`agents/${a.id}/pause`, { method: "POST", body: {} }), `${a.name} foi pausado.`)}>Pausar</button>
                  )}
                </div>
              </div>
            );
          })}
          {!agentes.length && conectado && <p className="empty-copy">Nenhum agente encontrado.</p>}
          <p className="cmd-nota">“Chamar agora” acorda o agente para olhar as tarefas dele. Cada chamada consome a assinatura, então use só quando precisar.</p>
        </div>
      )}

      {aba === "aprovacoes" && (
        <div className="cmd-lista">
          {aprovacoes.map((p) => <AprovacaoLinha key={p.id} p={p} quem={nomeAgente(p.requestedByAgentId)} onDecidir={(tipo, nota) => acao(() => pc(`approvals/${p.id}/${tipo}`, { method: "POST", body: { decisionNote: nota || null } }), tipo === "approve" ? "Aprovado." : "Recusado.")} />)}
          {!aprovacoes.length && <p className="empty-copy">Nenhum pedido esperando você.</p>}
        </div>
      )}

      {aba === "rotinas" && (
        <div className="cmd-lista">
          {rotinas.map((r) => (
            <div className="cmd-linha" key={r.id}>
              <div className="cmd-linha-info"><strong>{r.title || r.name || "Rotina"}</strong><span>{r.description || "Sem descrição"}</span></div>
              <div className="cmd-linha-meio"><span className="cmd-estado">{r.status === "paused" ? "Pausada" : "Ativa"}</span><small>Responsável: {nomeAgente(r.assigneeAgentId)}</small></div>
              <div className="cmd-linha-acoes"><button className="ghost-button" type="button" onClick={() => acao(() => pc(`routines/${r.id}/run`, { method: "POST", body: {} }), "Rotina disparada.")}>Rodar agora</button></div>
            </div>
          ))}
          {!rotinas.length && <p className="empty-copy">Nenhuma rotina. Por decisão sua, os agentes só trabalham quando recebem tarefa.</p>}
        </div>
      )}

      {aba === "projetos" && (
        <div className="cmd-lista">
          {projetos.map((p) => {
            const doProjeto = tarefas.filter((t) => t.projectId === p.id);
            const abertas = doProjeto.filter((t) => !["done", "cancelled"].includes(t.status)).length;
            return (
              <div className="cmd-linha" key={p.id}>
                <div className="cmd-linha-info"><strong>{p.name}</strong><span>{p.description || "Sem descrição"}</span></div>
                <div className="cmd-linha-meio"><span className="cmd-estado">{p.status === "in_progress" ? "Em andamento" : p.status === "completed" ? "Concluído" : p.status}</span><small>{abertas} abertas de {doProjeto.length} tarefas</small></div>
                <div className="cmd-linha-acoes"><button className="ghost-button" type="button" onClick={() => { setAba("tarefas"); }}>Ver tarefas</button></div>
              </div>
            );
          })}
          {!projetos.length && <p className="empty-copy">Nenhum projeto no Paperclip.</p>}
        </div>
      )}

      {aba === "atividade" && (
        <div className="cmd-lista">
          {atividade.map((a) => {
            const t = a.entityType === "issue" ? tarefas.find((x) => x.id === a.entityId) : null;
            return (
              <div className="cmd-registro" key={a.id}>
                <time>{quando(a.createdAt)}</time>
                <b>{a.actorType === "user" ? "Você" : a.agentId ? nomeAgente(a.agentId) : "Sistema"}</b>
                <span>{traduzirAcao(a.action)}</span>
                {t && <button type="button" className="cmd-link" onClick={() => setAberta(t)}>{t.identifier} · {t.title}</button>}
              </div>
            );
          })}
        </div>
      )}

      {aberta && <TarefaPainel tarefa={aberta} agentes={agentes} nomeAgente={nomeAgente} onFechar={() => setAberta(null)} onMudou={async (msg) => { avisar(msg); await carregar(); }} />}
      {nova && <NovaTarefa agentes={agentes} projetos={projetos} onFechar={() => setNova(false)} onCriada={async (t) => { setNova(false); avisar(`Tarefa ${t.identifier} criada.`); await carregar(); }} />}
    </div>
  );
}

function traduzirAcao(a: string) {
  const m: Record<string, string> = {
    "issue.created": "criou uma tarefa", "issue.updated": "atualizou uma tarefa", "issue.comment_added": "comentou numa tarefa", "issue.read_marked": "leu uma tarefa",
    "issue.assigned": "repassou uma tarefa", "approval.requested": "pediu aprovação", "approval.approved": "aprovou", "approval.rejected": "recusou",
    "heartbeat.started": "começou um turno", "heartbeat.finished": "terminou um turno", "heartbeat.failed": "teve erro no turno",
    "environment.lease_acquired": "começou a trabalhar", "environment.lease_released": "parou de trabalhar", "agent.created": "contratou um agente",
    "agent.paused": "pausou um agente", "agent.resumed": "retomou um agente", "routine.run": "rodou uma rotina", "project.created": "criou um projeto",
    "board_api_key.created": "criou uma chave de acesso",
  };
  return m[a] ?? a.replace(/[._]/g, " ");
}

function AprovacaoLinha({ p, quem, onDecidir }: { p: Aprovacao; quem: string; onDecidir: (t: "approve" | "reject", nota: string) => void }) {
  const [nota, setNota] = useState("");
  const titulo = p.title || (p.payload?.title as string) || (p.type ? p.type.replace(/_/g, " ") : "Pedido de aprovação");
  const resumo = p.summary || (p.payload?.summary as string) || (p.payload?.reason as string) || "";
  return (
    <div className="cmd-aprovacao">
      <div><strong>{titulo}</strong><span>{quem} · {quando(p.createdAt)}</span>{resumo && <p>{resumo}</p>}</div>
      <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observação (opcional)" />
      <div className="cmd-linha-acoes">
        <button className="ghost-button" type="button" onClick={() => onDecidir("reject", nota)}>Recusar</button>
        <button className="primary-button" type="button" onClick={() => onDecidir("approve", nota)}>Aprovar</button>
      </div>
    </div>
  );
}

function TarefaPainel({ tarefa, agentes, nomeAgente, onFechar, onMudou }: { tarefa: Tarefa; agentes: Agente[]; nomeAgente: (id: string | null) => string; onFechar: () => void; onMudou: (msg: string) => Promise<void> }) {
  const [detalhe, setDetalhe] = useState<Tarefa>(tarefa);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    const [d, c] = await Promise.all([pc<Tarefa>(`issues/${tarefa.id}`).catch(() => tarefa), pc<Comentario[] | { comments: Comentario[] }>(`issues/${tarefa.id}/comments`).catch(() => [])]);
    if (d && typeof d === "object" && "id" in d) setDetalhe(d);
    setComentarios(Array.isArray(c) ? c : Array.isArray((c as { comments?: Comentario[] })?.comments) ? (c as { comments: Comentario[] }).comments : []);
  }, [tarefa]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function mudar(campos: Record<string, unknown>, msg: string) {
    setErro("");
    try {
      await pc(`issues/${tarefa.id}`, { method: "PATCH", body: campos });
      await carregar();
      await onMudou(msg);
    } catch (e) { setErro((e as Error).message); }
  }
  async function comentar() {
    if (!texto.trim()) return;
    setErro("");
    try {
      await pc(`issues/${tarefa.id}/comments`, { method: "POST", body: { body: texto.trim() } });
      setTexto("");
      await carregar();
      await onMudou("Comentário enviado.");
    } catch (e) { setErro((e as Error).message); }
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onFechar}>
      <aside className="drawer cmd-painel" role="dialog" aria-modal="true" aria-label={detalhe.title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><span className="drawer-type">{detalhe.identifier}</span><h2>{detalhe.title}</h2><p>{nomeStatus(detalhe.status)} · {nomeAgente(detalhe.assigneeAgentId)}</p></div>
          <button className="close-button" type="button" onClick={onFechar} aria-label="Fechar">×</button>
        </div>
        <div className="cmd-painel-corpo">
          <div className="cmd-campos">
            <label><span>Situação</span><select value={detalhe.status} onChange={(e) => mudar({ status: e.target.value }, `Tarefa movida para ${nomeStatus(e.target.value)}.`)}>{STATUS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
            <label><span>Responsável</span><select value={detalhe.assigneeAgentId ?? ""} onChange={(e) => mudar({ assigneeAgentId: e.target.value || null }, "Responsável alterado.")}><option value="">Ninguém</option>{agentes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label><span>Prioridade</span><select value={detalhe.priority} onChange={(e) => mudar({ priority: e.target.value }, "Prioridade alterada.")}>{Object.entries(PRIORIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          {erro && <div className="cmd-aviso erro">{erro}</div>}
          <h3 className="section-title">Descrição</h3>
          <div className="cmd-descricao">{detalhe.description || "Sem descrição."}</div>
          <h3 className="section-title">Conversa</h3>
          <div className="cmd-conversa">
            {comentarios.map((c) => (
              <div key={c.id} className={`cmd-msg ${c.authorAgentId ? "agente" : "voce"}`}>
                <small>{c.authorAgentId ? nomeAgente(c.authorAgentId) : "Você"} · {quando(c.createdAt)}</small>
                <p>{c.body}</p>
              </div>
            ))}
            {!comentarios.length && <p className="empty-copy">Ninguém comentou ainda.</p>}
          </div>
          <div className="cmd-responder">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Escreva para o agente: uma orientação, uma correção, uma resposta…" />
            <button className="primary-button" type="button" onClick={comentar} disabled={!texto.trim()}>Enviar</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function NovaTarefa({ agentes, projetos, onFechar, onCriada }: { agentes: Agente[]; projetos: Projeto[]; onFechar: () => void; onCriada: (t: Tarefa) => void }) {
  const gerente = agentes.find((a) => !a.reportsTo) ?? agentes[0];
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [agente, setAgente] = useState(gerente?.id ?? "");
  const [prioridade, setPrioridade] = useState("medium");
  const [projeto, setProjeto] = useState(projetos[0]?.id ?? "");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const t = await pc<Tarefa>("empresa/issues", { method: "POST", body: { title: titulo.trim(), description: descricao.trim() || undefined, assigneeAgentId: agente || null, priority: prioridade, status: "todo", projectId: projeto || undefined } });
      onCriada(t);
    } catch (e2) { setErro((e2 as Error).message); setEnviando(false); }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onFechar}>
      <form className="modal compact-modal" onSubmit={criar} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><h2>Nova tarefa</h2><p>O agente escolhido recebe a tarefa e começa no próximo turno.</p></div><button className="close-button" type="button" onClick={onFechar} aria-label="Fechar">×</button></div>
        <div className="form-grid">
          <div className="field full"><label htmlFor="nt-titulo">O que precisa ser feito</label><input id="nt-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus placeholder="Ex.: Memorial descritivo do desmembramento — Carlos Silva" /></div>
          <div className="field full"><label htmlFor="nt-desc">Detalhes</label><textarea id="nt-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} placeholder="Pasta no OneDrive, prazo, o que entregar, o que não fazer…" /></div>
          <div className="field"><label htmlFor="nt-agente">Para quem</label><select id="nt-agente" value={agente} onChange={(e) => setAgente(e.target.value)}><option value="">Ninguém (fica na fila)</option>{agentes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="field"><label htmlFor="nt-prio">Prioridade</label><select id="nt-prio" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>{Object.entries(PRIORIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          {projetos.length > 0 && <div className="field full"><label htmlFor="nt-proj">Projeto no Paperclip</label><select id="nt-proj" value={projeto} onChange={(e) => setProjeto(e.target.value)}>{projetos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
        </div>
        {erro && <div className="cmd-aviso erro">{erro}</div>}
        <div className="form-actions"><button className="ghost-button" type="button" onClick={onFechar}>Cancelar</button><button className="primary-button" type="submit" disabled={enviando || !titulo.trim()}>{enviando ? "Criando…" : "Criar tarefa"}</button></div>
      </form>
    </div>
  );
}
