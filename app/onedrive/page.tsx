import { conectado } from "../onedrive";

export const dynamic = "force-dynamic";

export default async function OneDrivePage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const ligado = conectado();
  const box = { padding: 12, borderRadius: 8, margin: 0 } as const;
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px", display: "grid", gap: 16, lineHeight: 1.5 }}>
      <a href="/">← Voltar ao site</a>
      <h1 style={{ margin: 0 }}>OneDrive</h1>
      {ok && <p style={{ ...box, background: "#e7f6ec" }}>Conectado: {ok}. Os projetos novos já criam a pasta no OneDrive.</p>}
      {erro && <p style={{ ...box, background: "#fdecea" }}>Não deu certo: {erro}</p>}
      <p style={{ ...box, background: ligado ? "#e7f6ec" : "#fff4e5" }}>{ligado ? "Situação: conectado à pasta EDUARDO." : "Situação: ainda não conectado."}</p>
      <h2 style={{ margin: "8px 0 0" }}>{ligado ? "Conectar de novo" : "Como conectar"} (uma vez só)</h2>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
        <li>No seu PC, abra o <b>PowerShell</b> (menu Iniciar → digite PowerShell).</li>
        <li>Cole e aperte Enter: <code style={{ display: "block", background: "#f2f2f2", padding: 8, marginTop: 4 }}>winget install Rclone.Rclone</code> Depois feche e abra o PowerShell de novo.</li>
        <li>Cole e aperte Enter: <code style={{ display: "block", background: "#f2f2f2", padding: 8, marginTop: 4 }}>rclone authorize &quot;onedrive&quot;</code> O navegador abre: entre com <b>preforteone@hotmail.com</b> e clique em <b>Sim/Aceitar</b>.</li>
        <li>Volte ao PowerShell. Copie tudo o que aparece entre <code>Paste the following into your remote machine ---&gt;</code> e <code>&lt;---End paste</code> e cole abaixo.</li>
      </ol>
      <form method="post" action="/api/onedrive" style={{ display: "grid", gap: 8 }}>
        <textarea name="codigo" required rows={5} placeholder='{"access_token":"...","refresh_token":"..."}' style={{ fontFamily: "monospace", padding: 8 }} />
        <button type="submit" style={{ padding: 12, fontSize: 16, cursor: "pointer" }}>Conectar OneDrive</button>
      </form>
      <p style={{ color: "#666", margin: 0 }}>Esse código dá acesso ao seu OneDrive: cole só aqui, nunca mande para ninguém.</p>
    </main>
  );
}
