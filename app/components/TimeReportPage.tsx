"use client";

import { CalendarCheck2, Gauge } from "lucide-react";
import type { Project } from "../OfficeApp";

const dayInMilliseconds = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const calendarDay = (value: string | Date) => {
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDate = (value: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : dateFormatter.format(date);
};

const formatDays = (value: number) => {
  const rounded = Math.max(0, Math.round(value));
  return `${rounded.toLocaleString("pt-BR")} ${rounded === 1 ? "dia" : "dias"}`;
};

export function TimeReportPage({ projects }: { projects: Project[] }) {
  const today = calendarDay(new Date()) ?? 0;
  const ranked = projects
    .flatMap((project) => {
      const startSource = project.createdAt || project.startDate;
      if (!startSource) return [];
      const start = calendarDay(startSource);
      if (start === null) return [];
      const completed = Boolean(project.completedAt) || project.status === "done";
      const end = project.completedAt ? (calendarDay(project.completedAt) ?? today) : today;
      const duration = end < start ? 0 : Math.floor((end - start) / dayInMilliseconds) + 1;
      return [{
        project,
        completed,
        duration,
        startLabel: formatDate(startSource),
        endLabel: project.completedAt ? formatDate(project.completedAt) : "Hoje",
      }];
    })
    .sort((a, b) => b.duration - a.duration || a.project.name.localeCompare(b.project.name, "pt-BR"));
  const accumulatedDays = ranked.reduce((sum, row) => sum + row.duration, 0);
  const averageDuration = ranked.length ? Math.round(accumulatedDays / ranked.length) : 0;
  const situations = [
    { label: "Em andamento", rows: ranked.filter((row) => !row.completed) },
    { label: "Concluídos", rows: ranked.filter((row) => row.completed) },
  ].map((situation) => ({
    ...situation,
    total: situation.rows.reduce((sum, row) => sum + row.duration, 0),
    average: situation.rows.length
      ? Math.round(situation.rows.reduce((sum, row) => sum + row.duration, 0) / situation.rows.length)
      : 0,
  }));

  return (
    <div className="content-wrap time-page">
      <section className="time-kpis">
        <article aria-label={`${ranked.length} projetos acompanhados`}><CalendarCheck2 aria-hidden="true" size={20} /><span>Projetos acompanhados</span><strong>{ranked.length}</strong><small>Contagem iniciada no cadastro</small></article>
        <article aria-label={`Média de duração de ${formatDays(averageDuration)}`}><Gauge aria-hidden="true" size={20} /><span>Média de duração</span><strong>{formatDays(averageDuration)}</strong><small>Entre os projetos acompanhados</small></article>
      </section>
      <div className="time-grid">
        <section className="time-panel">
          <header><div><span>Projetos</span><h2>Tempo por projeto</h2></div><small>{ranked.length} acompanhados</small></header>
          <div className="time-ranking" role="list" aria-label="Ranking de duração dos projetos">
            {ranked.map(({ project, completed, duration, startLabel, endLabel }) => (
              <div key={project.id} role="listitem">
                <span><strong>{project.name}</strong><small>{completed ? "Concluído" : "Em andamento"} · {startLabel} até {endLabel}</small></span>
                <em aria-label={`Duração de ${formatDays(duration)}`}>{formatDays(duration)}</em>
              </div>
            ))}
            {!ranked.length && <p className="empty-copy">Crie um projeto para iniciar automaticamente o acompanhamento da duração.</p>}
          </div>
        </section>
        <section className="time-panel task-time-table">
          <header><div><span>Situação</span><h2>Resumo por situação</h2></div></header>
          <div role="list" aria-label="Resumo da duração por situação">
            {situations.map((situation) => (
              <div className="task-time-row" key={situation.label} role="listitem">
                <span><strong>{situation.label}</strong><small>{situation.rows.length} {situation.rows.length === 1 ? "projeto" : "projetos"} · {formatDays(situation.total)} acumulados</small></span>
                <span><small>Média</small><b>{formatDays(situation.average)}</b></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
