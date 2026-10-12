import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionToken } from "./auth";

export type ChatGPTUser = { displayName: string; email: string; fullName: string | null };

/** Usuário logado no Preforte (nome mantido para não mexer no resto do código). */
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const store = await cookies();
  const email = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!email) return null;
  const fullName = process.env.PREFORTE_NOME ?? null;
  return { displayName: fullName ?? email, email, fullName };
}
