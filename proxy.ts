import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "./app/auth";

// Tudo exige login, menos a tela de entrada e os arquivos públicos.
const PUBLIC = [/^\/entrar$/, /^\/api\/entrar$/, /^\/(favicon-32|icon-\d+|preforte-logo-2026-128|og)\.png$/, /^\/manifest\.webmanifest$/];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => p.test(pathname))) return NextResponse.next();

  const email = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (email) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Faça login" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/entrar", request.url));
}

export const config = { matcher: ["/((?!assets/|_vinext/).*)"] };
