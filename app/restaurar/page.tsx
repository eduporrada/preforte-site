export const dynamic = "force-dynamic";

const MSG: Record<string, string> = {
  "ja-tem-dados": "O site já tem projetos seus. A restauração só funciona antes de você cadastrar algo, para não apagar nada.",
  "sem-arquivo": "Escolha o arquivo ZIP.",
  "zip-invalido": "Esse arquivo não é um ZIP válido.",
  "sem-banco": "Não achei dados/preforte.sqlite dentro do ZIP.",
  falhou: "A restauração falhou. Nada foi alterado.",
};

export default async function Restaurar({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const msg = r?.startsWith("ok-") ? `Pronto: ${r.slice(3)} registros restaurados.` : r ? MSG[r] ?? r : "";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form method="post" action="/api/restaurar" encType="multipart/form-data" style={{ width: "100%", maxWidth: 420, display: "grid", gap: 12 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Restaurar backup</h1>
        <p style={{ margin: 0 }}>Escolha o arquivo <b>Preforte-exportacao-….zip</b> exportado do site antigo.</p>
        <input name="arquivo" type="file" accept=".zip" required />
        {msg && <p role="status" style={{ margin: 0 }}>{msg}</p>}
        <button type="submit" style={{ padding: 12, fontSize: 16, cursor: "pointer" }}>Restaurar</button>
        <a href="/">Voltar ao site</a>
      </form>
    </main>
  );
}
