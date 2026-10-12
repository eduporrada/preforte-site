import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isAgentRequest, readSessionToken } from "./app/auth";

// Tudo exige login, menos a tela de entrada e os arquivos públicos.
const PUBLIC = [/^\/entrar$/, /^\/api\/entrar$/, /^\/(favicon-32|icon-\d+|preforte-logo-2026-128|og)\.png$/, /^\/manifest\.webmanifest$/];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => p.test(pathname))) return NextResponse.next();

  // Agentes do Paperclip: só as APIs, nunca restaurar backup nem trocar a conexão do OneDrive.
  if (pathname.startsWith("/api/") && isAgentRequest(request.headers.get("authorization"))) {
    if (pathname.startsWith("/api/restaurar") || pathname === "/api/onedrive" || pathname.startsWith("/api/pc/") || pathname === "/api/paperclip") {
      return NextResponse.json({ error: "Não permitido para agentes" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const email = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (email) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Faça login" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/entrar", request.url));
}

export const config = { matcher: ["/((?!assets/|_vinext/).*)"] };
