/**
 * Login próprio do Preforte (substitui o "entrar com ChatGPT").
 *
 * Variáveis de ambiente:
 *   PREFORTE_EMAIL        e-mail de acesso
 *   PREFORTE_NOME         nome exibido (opcional)
 *   PREFORTE_SENHA_HASH   hash da senha, gerado com `node scripts/gerar-senha.mjs`
 *   PREFORTE_SEGREDO      texto aleatório longo que assina o cookie de sessão
 */
export const SESSION_COOKIE = "preforte_sessao";
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64url");
}

async function hmac(data: string) {
  const secret = process.env.PREFORTE_SEGREDO;
  if (!secret || secret.length < 32) throw new Error("PREFORTE_SEGREDO ausente ou curto (mínimo 32 caracteres)");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

/** Cria o valor do cookie: email|expira|assinatura */
export async function createSessionToken(email: string) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${Buffer.from(email).toString("base64url")}.${expires}`;
  return `${payload}.${await hmac(payload)}`;
}

/** Devolve o e-mail se o cookie for válido e não tiver expirado. */
export async function readSessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailPart, expires, signature] = parts;
  const expected = await hmac(`${emailPart}.${expires}`);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0 || Number(expires) < Date.now()) return null;
  const email = Buffer.from(emailPart, "base64url").toString();
  return email === process.env.PREFORTE_EMAIL ? email : null;
}

export function readCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/**
 * Chave dos agentes do Paperclip (variável PREFORTE_CHAVE_AGENTES).
 * Enviada como "Authorization: Bearer <chave>". Não abre páginas, só /api.
 */
export function isAgentRequest(header: string | null | undefined) {
  const key = process.env.PREFORTE_CHAVE_AGENTES ?? "";
  if (key.length < 32 || !header?.startsWith("Bearer ")) return false;
  const given = header.slice(7).trim();
  if (given.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
