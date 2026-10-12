// Uso: node scripts/gerar-senha.mjs "minha senha"
// Mostra o valor para colocar em PREFORTE_SENHA_HASH.
import { randomBytes, scryptSync } from "node:crypto";
const senha = process.argv[2];
if (!senha || senha.length < 10) {
  console.error("Use uma senha com pelo menos 10 caracteres.");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(senha, salt, 64);
console.log(`scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`);
