"use client";

import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock3, Copy, Search, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import type { Project } from "../OfficeApp";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function ReceivablesPage({
  projects,
  onOpenProject,
  onRegisterPayment,
}: {
  projects: Project[];
  onOpenProject: (id: string) => void;
  onRegisterPayment: (projectId: string, amount: number) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState<Project | null>(null);
  const [amount, setAmount] = useState("");
  const pending = useMemo(() =>
    projects
      .filter((project) => project.paidValue < project.price)
      .filter((project) => [project.name, project.client].join(" ").toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
      .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")),
  [projects, query]);
  const total = pending.reduce((sum, project) => sum + project.price - project.paidValue, 0);
  const overdue = pending.filter((project) => project.dueDate && new Date(`${project.dueDate}T23:59:59`) < new Date());
  const finished = pending.filter((project) => project.status === "done");

  return (
    <div className="content-wrap receivables-page">
      <div className="receivable-kpis">
        <div><span className="bento-icon blue"><WalletCards size={19} /></span><p>Saldo em aberto</p><strong>{money(total)}</strong><small>{pending.length} contas</small></div>
        <div><span className="bento-icon red"><AlertTriangle size={19} /></span><p>Vencido</p><strong>{money(overdue.reduce((sum, project) => sum + project.price - project.paidValue, 0))}</strong><small>{overdue.length} cobranças</small></div>
        <div><span className="bento-icon orange"><Clock3 size={19} /></span><p>Concluído sem quitação</p><strong>{money(finished.reduce((sum, project) => sum + project.price - project.paidValue, 0))}</strong><small>{finished.length} projetos</small></div>
      </div>
      <section className="receivable-table-card">
        <div className="section-head receivable-head">
          <div><span className="section-kicker">Central de cobrança</span><h2>Recebimentos pendentes</h2></div>
          <div className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou projeto" /></div>
        </div>
        <div className="premium-table">
          <div className="premium-table-row table-header"><span>Cliente e projeto</span><span>Situação</span><span>Contratado</span><span>Recebido</span><span>Pendente</span><span>Ações</span></div>
          {pending.map((project) => {
            const isLate = Boolean(project.dueDate && new Date(`${project.dueDate}T23:59:59`) < new Date());
            const ratio = project.price ? Math.round((project.paidValue / project.price) * 100) : 0;
            return (
              <div className="premium-table-row" key={project.id}>
                <button className="project-cell" type="button" onClick={() => onOpenProject(project.id)}>
                  <span className={`project-table-icon ${isLate ? "late" : ""}`}>{project.name.slice(0, 1)}</span>
                  <span><strong>{project.client || "Cliente não informado"}</strong><small>{project.name}</small></span>
                </button>
                <span data-label="Situação"><b className={`status-badge ${isLate ? "danger" : project.status === "done" ? "warning" : "info"}`}>{isLate ? "Vencido" : project.status === "done" ? "Concluído" : "Em andamento"}</b></span>
                <span data-label="Contratado">{money(project.price)}</span>
                <span data-label="Recebido"><strong>{money(project.paidValue)}</strong><small>{ratio}% recebido</small></span>
                <span data-label="Pendente" className="pending-value">{money(project.price - project.paidValue)}</span>
                <span className="row-actions">
                  <button className="collection-copy-button" type="button" title="Copiar cobrança" onClick={() => navigator.clipboard?.writeText(`Olá! O saldo pendente do projeto ${project.name} é ${money(project.price - project.paidValue)}.`)}><Copy size={15} /><span>Copiar</span></button>
                  <button className="register-button" type="button" onClick={() => { setPaying(project); setAmount(String((project.price - project.paidValue) / 100)); }}><CircleDollarSign size={15} /><span>Registrar pagamento</span></button>
                </span>
              </div>
            );
          })}
        </div>
        {!pending.length && <div className="premium-empty full-empty"><CheckCircle2 size={28} /><strong>Nenhum recebimento pendente</strong><span>Todos os projetos estão quitados.</span></div>}
      </section>
      {paying && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaying(null); }}>
          <form className="modal compact-modal" onSubmit={async (event) => {
            event.preventDefault();
            await onRegisterPayment(paying.id, Math.round(Number(amount.replace(",", ".")) * 100));
            setPaying(null);
          }}>
            <div className="modal-head"><div><span className="section-kicker">Recebimento</span><h2>{paying.name}</h2></div><button type="button" onClick={() => setPaying(null)}>×</button></div>
            <label className="field"><span>Valor recebido</span><div className="money-input"><b>R$</b><input autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /></div></label>
            <p className="modal-hint">Saldo atual: {money(paying.price - paying.paidValue)}</p>
            <button className="primary-button modal-submit" type="submit">Confirmar recebimento</button>
          </form>
        </div>
      )}
    </div>
  );
}
