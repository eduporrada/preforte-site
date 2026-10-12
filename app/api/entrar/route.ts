import { scryptSync, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken } from "../../auth";

// Limite simples contra tentativa de adivinhar senha: 5 erros por IP a cada 15 minutos.
const failures = new Map<string, number[]>();
const WINDOW = 15 * 60 * 1000;

function senhaConfere(senha: string) {
  const [algo, salt, hash] = (process.env.PREFORTE_SENHA_HASH ?? "").split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(senha, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (failures.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= 5) {
    return Response.redirect(new URL("/entrar?erro=bloqueado", request.url), 303);
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const ok = email === (process.env.PREFORTE_EMAIL ?? "").toLowerCase() && senhaConfere(senha);

  if (!ok) {
    failures.set(ip, [...recent, now]);
    return Response.redirect(new URL("/entrar?erro=1", request.url), 303);
  }

  failures.delete(ip);
  const token = await createSessionToken(process.env.PREFORTE_EMAIL!);
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
      "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`,
    },
  });
}
