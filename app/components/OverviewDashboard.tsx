"use client";

import { ArrowUpRight, CalendarCheck2, CircleDollarSign, Gauge, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { Project } from "../OfficeApp";

const SUMMARY_CARD_IDS = ["month", "year", "revenue", "receivables"] as const;
const SUMMARY_ORDER_STORAGE_KEY = "preforte.overview.summary-order.v1";

type SummaryCardId = (typeof SUMMARY_CARD_IDS)[number];

type SummaryDragState = {
  id: SummaryCardId;
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
};

type SummaryDragStyle = CSSProperties & {
  "--summary-drag-x"?: string;
  "--summary-drag-y"?: string;
};

const SUMMARY_CARD_LABELS: Record<SummaryCardId, string> = {
  month: "Projetos no mês",
  year: "Projetos no ano",
  revenue: "Faturado no mês",
  receivables: "Valor a receber",
};

const isStoredSummaryOrder = (value: unknown): value is SummaryCardId[] =>
  Array.isArray(value)
  && value.length === SUMMARY_CARD_IDS.length
  && new Set(value).size === SUMMARY_CARD_IDS.length
  && value.every((id) => SUMMARY_CARD_IDS.includes(id as SummaryCardId));

const moneyFormatters = [false, true].map((compact) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", notation: compact ? "compact" : "standard",
  maximumFractionDigits: compact ? 1 : 2,
}));
const money = (cents: number, compact = false) => moneyFormatters[Number(compact)].format(cents / 100);

export function OverviewDashboard({
  projects,
  onNavigate,
}: {
  projects: Project[];
  onOpenProject: (id: string) => void;
  onNavigate: (page: string) => void;
  onNewProject: () => void;
}) {
  const [insightOffset, setInsightOffset] = useState(0);
  const [summaryOrder, setSummaryOrder] = useState<SummaryCardId[]>([...SUMMARY_CARD_IDS]);
  const summaryOrderRef = useRef<SummaryCardId[]>([...SUMMARY_CARD_IDS]);
  const [summaryDrag, setSummaryDrag] = useState<SummaryDragState | null>(null);
  const summaryDragRef = useRef<SummaryDragState | null>(null);
  const [summaryDropTarget, setSummaryDropTarget] = useState<SummaryCardId | null>(null);
  const [summaryAnnouncement, setSummaryAnnouncement] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setInsightOffset(Math.floor(Math.random() * 6)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const storedOrder = JSON.parse(window.localStorage.getItem(SUMMARY_ORDER_STORAGE_KEY) || "null");
      if (isStoredSummaryOrder(storedOrder)) {
        timer = window.setTimeout(() => {
          summaryOrderRef.current = storedOrder;
          setSummaryOrder(storedOrder);
        }, 0);
      }
    } catch {
      // Mantém a ordem padrão quando o armazenamento local estiver indisponível ou inválido.
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const completedThisMonth = projects.filter((project) => {
    const source = project.completedAt || (project.status === "done" ? project.dueDate : "");
    if (!source) return false;
    const date = new Date(`${source}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const completedThisYear = projects.filter((project) => {
    const source = project.completedAt || (project.status === "done" ? project.dueDate : "");
    return source && new Date(`${source}T12:00:00`).getFullYear() === year;
  });
  const receivedThisMonth = projects
    .flatMap((project) => project.payments)
    .filter((payment) => {
      const date = new Date(`${payment.paidAt}T12:00:00`);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalOpen = projects.reduce(
    (sum, project) => sum + Math.max(0, project.price - project.paidValue),
    0,
  );
  const totalContracted = projects.reduce((sum, project) => sum + project.price, 0);
  const totalReceived = projects.reduce((sum, project) => sum + project.paidValue, 0);
  const averageTicket = projects.length ? totalContracted / projects.length : 0;
  const collectionRate = totalContracted ? Math.round((totalReceived / totalContracted) * 100) : 0;
  const topService = useMemo(() => {
    const totals = new Map<string, number>();
    projects.forEach((project) => totals.set(project.type, (totals.get(project.type) || 0) + project.price));
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Sem histórico";
  }, [projects]);
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce((sum, project) => {
          if (!project.tasks.length) return sum + (project.status === "done" ? 100 : 0);
          return sum + (project.tasks.filter((task) => task.done).length / project.tasks.length) * 100;
        }, 0) / projects.length,
      )
    : 0;

  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - (5 - index), 1);
    const keyYear = date.getFullYear();
    const keyMonth = date.getMonth();
    const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
    const completed = projects.filter((project) => {
      const source = project.completedAt || (project.status === "done" ? project.dueDate : "");
      if (!source) return false;
      const itemDate = new Date(`${source}T12:00:00`);
      return itemDate.getFullYear() === keyYear && itemDate.getMonth() === keyMonth;
    }).length;
    const received = projects.flatMap((project) => project.payments)
      .filter((payment) => {
        const itemDate = new Date(`${payment.paidAt}T12:00:00`);
        return itemDate.getFullYear() === keyYear && itemDate.getMonth() === keyMonth;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
    return { label, completed, received };
  });
  const maxProjects = Math.max(...monthly.map((item) => item.completed), 1);
  const maxRevenue = Math.max(...monthly.map((item) => item.received), 1);

  const insightPool = [
    { label: "Ticket médio", value: money(averageTicket), note: "Por projeto no histórico", icon: CircleDollarSign },
    { label: "Taxa de recebimento", value: `${collectionRate}%`, note: "Do valor contratado", icon: Gauge },
    { label: "Serviço de maior receita", value: topService, note: "Líder no histórico", icon: TrendingUp },
    { label: "Progresso médio", value: `${averageProgress}%`, note: "Entre todos os projetos", icon: CalendarCheck2 },
    { label: "Projetos ativos", value: String(projects.filter((project) => project.status !== "done").length), note: "Em produção agora", icon: ArrowUpRight },
    { label: "Concluídos sem quitação", value: String(projects.filter((project) => project.status === "done" && project.paidValue < project.price).length), note: "Acompanhar recebimento", icon: CircleDollarSign },
  ];
  const insights = Array.from({ length: 3 }, (_, index) => insightPool[(insightOffset + index) % insightPool.length]);

  const persistSummaryOrder = (nextOrder: SummaryCardId[]) => {
    summaryOrderRef.current = nextOrder;
    setSummaryOrder(nextOrder);
    try {
      window.localStorage.setItem(SUMMARY_ORDER_STORAGE_KEY, JSON.stringify(nextOrder));
    } catch {
      // A personalização continua funcionando durante a sessão quando o storage não estiver disponível.
    }
  };

  const moveSummaryCard = (id: SummaryCardId, targetId: SummaryCardId) => {
    if (id === targetId) return;
    const currentOrder = summaryOrderRef.current;
    const fromIndex = currentOrder.indexOf(id);
    const targetIndex = currentOrder.indexOf(targetId);
    if (fromIndex < 0 || targetIndex < 0) return;

    const nextOrder = [...currentOrder];
    const [movedCard] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(targetIndex, 0, movedCard);
    persistSummaryOrder(nextOrder);
    setSummaryAnnouncement(
      `${SUMMARY_CARD_LABELS[id]} movido para a posição ${nextOrder.indexOf(id) + 1} de ${nextOrder.length}.`,
    );
  };

  const findSummaryDropTarget = (
    clientX: number,
    clientY: number,
    sourceId: SummaryCardId,
  ): SummaryCardId | null => {
    const directTarget = document.elementsFromPoint(clientX, clientY)
      .map((element) => element.closest<HTMLElement>("[data-summary-card-id]"))
      .find((element) => element?.dataset.summaryCardId !== sourceId);
    const directId = directTarget?.dataset.summaryCardId as SummaryCardId | undefined;
    if (directId && SUMMARY_CARD_IDS.includes(directId)) return directId;

    let nearestId: SummaryCardId | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    document.querySelectorAll<HTMLElement>("[data-summary-card-id]").forEach((element) => {
      const candidateId = element.dataset.summaryCardId as SummaryCardId | undefined;
      if (!candidateId || candidateId === sourceId || !SUMMARY_CARD_IDS.includes(candidateId)) return;
      const rect = element.getBoundingClientRect();
      const distance = ((rect.left + rect.width / 2) - clientX) ** 2
        + ((rect.top + rect.height / 2) - clientY) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = candidateId;
      }
    });
    return nearestId;
  };

  const handleSummaryPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    id: SummaryCardId,
  ) => {
    const target = event.target as HTMLElement;
    if (
      !event.isPrimary
      || (event.pointerType === "mouse" && event.button !== 0)
      || target.closest("a, button, input, select, textarea, [data-summary-card-action]")
    ) return;

    const nextDrag: SummaryDragState = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      active: false,
    };
    summaryDragRef.current = nextDrag;
    setSummaryDrag(nextDrag);
    setSummaryDropTarget(null);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSummaryPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const currentDrag = summaryDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    const distance = Math.hypot(
      event.clientX - currentDrag.startX,
      event.clientY - currentDrag.startY,
    );
    const nextDrag = {
      ...currentDrag,
      currentX: event.clientX,
      currentY: event.clientY,
      active: currentDrag.active || distance >= 6,
    };
    summaryDragRef.current = nextDrag;
    setSummaryDrag(nextDrag);
    if (nextDrag.active) {
      event.preventDefault();
      setSummaryDropTarget(findSummaryDropTarget(event.clientX, event.clientY, nextDrag.id));
    }
  };

  const finishSummaryPointerDrag = (
    event: ReactPointerEvent<HTMLElement>,
    cancelled = false,
  ) => {
    const currentDrag = summaryDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    if (!cancelled && currentDrag.active) {
      const targetId = findSummaryDropTarget(event.clientX, event.clientY, currentDrag.id);
      if (targetId) moveSummaryCard(currentDrag.id, targetId);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    summaryDragRef.current = null;
    setSummaryDrag(null);
    setSummaryDropTarget(null);
  };

  const handleSummaryKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    id: SummaryCardId,
  ) => {
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp"
      ? -1
      : event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : 0;
    if (!direction) return;

    const currentOrder = summaryOrderRef.current;
    const currentIndex = currentOrder.indexOf(id);
    const targetIndex = Math.max(0, Math.min(currentOrder.length - 1, currentIndex + direction));
    if (currentIndex === targetIndex) return;
    event.preventDefault();
    moveSummaryCard(id, currentOrder[targetIndex]);
  };

  const summaryCardStyle = (id: SummaryCardId): SummaryDragStyle => {
    const isDragging = summaryDrag?.id === id && summaryDrag.active;
    const isPressed = summaryDrag?.id === id;
    const isDropTarget = summaryDropTarget === id && summaryDrag?.id !== id;
    return {
      position: "relative",
      zIndex: isDragging ? 20 : isDropTarget ? 2 : 1,
      cursor: isPressed ? "grabbing" : "grab",
      touchAction: "none",
      userSelect: "none",
      outline: isDropTarget ? "2px dashed #E5322D" : undefined,
      outlineOffset: isDropTarget ? "4px" : undefined,
      "--summary-drag-x": isDragging ? `${summaryDrag.currentX - summaryDrag.startX}px` : "0px",
      "--summary-drag-y": isDragging ? `${summaryDrag.currentY - summaryDrag.startY}px` : "0px",
    };
  };

  const renderSummaryCardContent = (id: SummaryCardId) => {
    switch (id) {
      case "month":
        return (
          <>
            <div className="summary-card-head"><span>Projetos no mês</span><CalendarCheck2 size={18} /></div>
            <strong>{completedThisMonth.length}</strong>
            <small>Concluídos no mês atual</small>
          </>
        );
      case "year":
        return (
          <>
            <div className="summary-card-head"><span>Projetos no ano</span><TrendingUp size={18} /></div>
            <strong>{completedThisYear.length}</strong>
            <small>Entregas realizadas em {year}</small>
          </>
        );
      case "revenue":
        return (
          <>
            <div className="summary-card-head"><span>Faturado no mês</span><CircleDollarSign size={18} /></div>
            <strong>{money(receivedThisMonth)}</strong>
            <small>Valores efetivamente recebidos</small>
          </>
        );
      case "receivables":
        return (
          <>
            <div className="summary-card-head"><span>Valor a receber</span><ArrowUpRight size={18} /></div>
            <strong>{money(totalOpen)}</strong>
            <small
              data-summary-card-action
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("receivables")}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onNavigate("receivables");
                }
              }}
            >
              Abrir contas a receber →
            </small>
          </>
        );
    }
  };

  return (
    <div className="home-page">
      <style>{`
        @keyframes summary-card-wobble {
          0%, 100% { transform: translate3d(var(--summary-drag-x), var(--summary-drag-y), 0) rotate(-1.1deg); }
          50% { transform: translate3d(var(--summary-drag-x), var(--summary-drag-y), 0) rotate(1.1deg); }
        }
        .summary-card--dragging {
          animation: summary-card-wobble 280ms ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .summary-card--dragging {
            animation: none;
            transform: translate3d(var(--summary-drag-x), var(--summary-drag-y), 0);
          }
        }
      `}</style>
      <p
        id="summary-reorder-instructions"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Arraste os cartões com o mouse ou toque. Pelo teclado, use as setas para mudar a posição.
      </p>
      <p
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {summaryAnnouncement}
      </p>
      <section
        className="home-summary-grid"
        role="list"
        aria-label="Resumo personalizável"
        aria-describedby="summary-reorder-instructions"
      >
        {summaryOrder.map((id, index) => {
          const isDragging = summaryDrag?.id === id && summaryDrag.active;
          return (
            <article
              key={id}
              role="listitem"
              tabIndex={0}
              aria-label={`${SUMMARY_CARD_LABELS[id]}. Posição ${index + 1} de ${summaryOrder.length}.`}
              aria-roledescription="cartão reordenável"
              className={`summary-card-reorderable${isDragging ? " summary-card--dragging" : ""}`}
              data-summary-card-id={id}
              data-dragging={isDragging ? "true" : "false"}
              style={summaryCardStyle(id)}
              onPointerDown={(event) => handleSummaryPointerDown(event, id)}
              onPointerMove={handleSummaryPointerMove}
              onPointerUp={(event) => finishSummaryPointerDrag(event)}
              onPointerCancel={(event) => finishSummaryPointerDrag(event, true)}
              onKeyDown={(event) => handleSummaryKeyDown(event, id)}
            >
              {renderSummaryCardContent(id)}
            </article>
          );
        })}
      </section>

      <section className="home-charts-grid">
        <article className="home-chart-card">
          <header><div><span>Produtividade</span><h2>Projetos realizados</h2></div><small>Últimos 6 meses</small></header>
          <div className="project-bars">
            {monthly.map((item) => (
              <div key={item.label} title={`${item.completed} projeto(s)`}>
                <span className="project-bar-track"><i style={{ height: `${Math.max(6, (item.completed / maxProjects) * 100)}%` }} /></span>
                <b>{item.completed}</b>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="home-chart-card">
          <header><div><span>Receita</span><h2>Entradas mensais</h2></div><small>Últimos 6 meses</small></header>
          <div className="revenue-spark">
            {monthly.map((item, index) => (
              <div key={item.label}>
                <span style={{ height: `${Math.max(5, (item.received / maxRevenue) * 100)}%` }} className={index === monthly.length - 1 ? "current" : ""} />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
          <strong className="chart-total">{money(monthly.reduce((sum, item) => sum + item.received, 0))}</strong>
          <p>Total recebido no período</p>
        </article>
      </section>

      <section className="insight-strip">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <article key={insight.label}>
              <Icon size={20} strokeWidth={1.8} />
              <div><span>{insight.label}</span><strong>{insight.value}</strong><small>{insight.note}</small></div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
