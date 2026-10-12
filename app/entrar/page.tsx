export const dynamic = "force-dynamic";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const mensagem = erro === "bloqueado" ? "Muitas tentativas. Aguarde 15 minutos." : erro ? "E-mail ou senha incorretos." : "";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form method="post" action="/api/entrar" style={{ width: "100%", maxWidth: 360, display: "grid", gap: 12 }}>
        <img src="/preforte-logo-2026-128.png" alt="Preforte" width={64} height={64} />
        <h1 style={{ fontSize: 22, margin: 0 }}>Preforte</h1>
        <label style={{ display: "grid", gap: 4 }}>E-mail
          <input name="email" type="email" autoComplete="username" required style={{ padding: 10, fontSize: 16 }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>Senha
          <input name="senha" type="password" autoComplete="current-password" required style={{ padding: 10, fontSize: 16 }} />
        </label>
        {mensagem && <p role="alert" style={{ color: "#b42318", margin: 0 }}>{mensagem}</p>}
        <button type="submit" style={{ padding: 12, fontSize: 16, cursor: "pointer" }}>Entrar</button>
      </form>
    </main>
  );
}
