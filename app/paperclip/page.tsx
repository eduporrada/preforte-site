import { PaperclipConnect } from "../components/PaperclipConnect";
import { lerConfig } from "../paperclip";

export const dynamic = "force-dynamic";

export default function PaperclipPage() {
  const cfg = lerConfig();
  return (
    <main className="page-simple">
      <a className="back-link" href="/">← Voltar ao site</a>
      <h1>Paperclip</h1>
      <p className="muted">Ligação do site com o escritório dos agentes. O site só lê o que os agentes fazem; não gasta crédito.</p>
      <PaperclipConnect conectado={Boolean(cfg)} url={cfg?.url ?? process.env.PAPERCLIP_URL ?? "https://paperclip-ty7p.srv2056211.hstgr.cloud"} empresa={cfg?.companyName ?? ""} />
    </main>
  );
}
