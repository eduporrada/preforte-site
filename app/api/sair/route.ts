import { SESSION_COOKIE } from "../../auth";

export async function POST() {
  return new Response(null, {
    status: 303,
    headers: { Location: "/entrar", "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` },
  });
}
