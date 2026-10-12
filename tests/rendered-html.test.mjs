import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build emits the Preforte worker, logo and social preview", async () => {
  await Promise.all([
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/manifest.webmanifest", import.meta.url)),
    access(new URL("../public/icon-180.png", import.meta.url)),
    access(new URL("../public/icon-192.png", import.meta.url)),
    access(new URL("../public/icon-512.png", import.meta.url)),
    access(new URL("../public/preforte-logo-2026-128.png", import.meta.url)),
    access(new URL("../public/favicon-32.png", import.meta.url)),
  ]);
});

test("keeps the product source free from starter preview code", async () => {
  const [page, layout, manifest, packageJson, app, overview, receivables, timeReport, constructionApi, photoApi, photoAssetApi] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/OfficeApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/OverviewDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ReceivablesPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TimeReportPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/construction/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/construction/diary-photos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/construction/diary-photos/[id]/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<OfficeApp/);
  assert.match(layout, /Preforte — Gestão de Engenharia/);
  assert.match(layout, /manifest\.webmanifest/);
  assert.doesNotMatch(layout, /precifica/i);
  assert.doesNotMatch(manifest, /precifica/i);
  assert.match(app, /Gestão de obra/);
  assert.doesNotMatch(
    app,
    /Preço de projetos|Precificação|Calculadora inteligente|Simular novo preço|Histórico de preços/,
  );
  assert.match(app, /Imprimir \/ salvar PDF/);
  assert.match(app, /Adicionar outra etapa/);
  assert.match(app, /Arquivo automático/);
  assert.match(app, /30 dias depois/);
  assert.match(app, /Tarefas e subtarefas/);
  assert.match(app, /Projetos ordenados por prioridade/);
  assert.match(app, /Cor da etapa/);
  assert.match(app, /Atualizado automaticamente/);
  assert.match(app, /Concluída · clique para reabrir/);
  assert.match(app, /Orçamento de custo/);
  assert.match(app, /Abrir câmera/);
  assert.match(app, /Escolher da galeria/);
  assert.match(app, /diaryPhotos/);
  assert.match(app, /\/api\/construction\/diary-photos/);
  assert.doesNotMatch(app, /Uma tabela única para materiais, mão de obra, equipamentos e serviços/);
  assert.match(app, /preforte-logo-2026-128\.png/);
  assert.doesNotMatch(app, /Pesquisar no Kanban|Ordenar por prazo/);
  assert.match(overview, /Projetos realizados/);
  assert.match(overview, /Entradas mensais/);
  assert.match(timeReport, /Tempo por projeto/);
  assert.match(timeReport, /Contagem iniciada no cadastro/);
  assert.doesNotMatch(timeReport, /Dias acumulados/);
  assert.doesNotMatch(app, /ClientesPage|label: "Clientes"/);
  assert.match(receivables, /Central de cobrança/);
  assert.match(constructionApi, /diaryPhotos/);
  assert.match(constructionApi, /diaryId/);
  assert.match(photoApi, /MAX_PHOTOS_PER_REQUEST = 6/);
  assert.match(photoApi, /MAX_PHOTO_BYTES = 8 \* 1024 \* 1024/);
  assert.match(photoAssetApi, /X-Content-Type-Options/);
  assert.doesNotMatch(
    `${page}\n${layout}\n${packageJson}`,
    /codex-preview|_sites-preview|react-loading-skeleton|Starter Project/,
  );
});
