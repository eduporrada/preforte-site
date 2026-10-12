#!/usr/bin/env bash
# Instala ou atualiza o site da Preforte no VPS, ao lado do Paperclip.
# Uso: curl -fsSL https://raw.githubusercontent.com/eduporrada/preforte-site/main/instalar.sh | bash
set -euo pipefail
DOMINIO="${DOMINIO:-preforte.srv2056211.hstgr.cloud}"
EMAIL="${PREFORTE_EMAIL:-eduporradas@gmail.com}"
DIR=/opt/preforte-site
DADOS=/opt/preforte-dados

echo "== Baixando o código"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone https://github.com/eduporrada/preforte-site "$DIR"; fi
mkdir -p "$DADOS"

echo "== Procurando o Traefik (o mesmo que dá HTTPS ao Paperclip)"
TRAEFIK=$(docker ps --format '{{.Names}} {{.Image}}' | awk '$2 ~ /traefik/ {print $1; exit}')
if [ -z "$TRAEFIK" ]; then echo "ERRO: não achei o Traefik. Me mande a saída de: docker ps"; exit 1; fi
REDE=$(docker inspect "$TRAEFIK" -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
PAPER=$(docker ps --format '{{.Names}}' | grep -m1 paperclip || true)
RESOLVER=$( (docker inspect "$PAPER" -f '{{json .Config.Labels}}' 2>/dev/null || echo '{}') | grep -o '"traefik[^"]*certresolver":"[^"]*"' | head -1 | sed 's/.*":"//;s/"$//')
RESOLVER="${RESOLVER:-letsencrypt}"
ENTRY=$( (docker inspect "$PAPER" -f '{{json .Config.Labels}}' 2>/dev/null || echo '{}') | grep -o '"traefik[^"]*entrypoints":"[^"]*"' | head -1 | sed 's/.*":"//;s/"$//')
ENTRY="${ENTRY:-websecure}"
echo "   Traefik: $TRAEFIK · rede: $REDE · certificado: $RESOLVER · entrada: $ENTRY"

if [ ! -f "$DIR/.env" ]; then
  echo "== Crie a senha do site (mínimo 10 caracteres; não aparece enquanto digita)"
  while true; do
    read -rsp "Senha: " S1 </dev/tty; echo
    read -rsp "Repita: " S2 </dev/tty; echo
    [ "$S1" = "$S2" ] && [ ${#S1} -ge 10 ] && break
    echo "As senhas não conferem ou têm menos de 10 caracteres. Tente de novo."
  done
  HASH=$(docker run --rm -e S="$S1" node:22-slim node -e 'const c=require("crypto");const s=c.randomBytes(16);console.log("scrypt:"+s.toString("base64url")+":"+c.scryptSync(process.env.S,s,64).toString("base64url"))')
  unset S1 S2
  umask 077
  cat > "$DIR/.env" <<EOF
PREFORTE_EMAIL=$EMAIL
PREFORTE_NOME=Eduardo
PREFORTE_SENHA_HASH=$HASH
PREFORTE_SEGREDO=$(openssl rand -hex 32)
EOF
fi

if [ "$REDE" = "host" ]; then REDE_SERVICO=""; REDE_FIM=""; REDE_LABEL="";
else REDE_SERVICO="    networks: [proxy]"; REDE_FIM=$'networks:\n  proxy:\n    external: true\n    name: '"$REDE"; REDE_LABEL="      - traefik.docker.network=$REDE"; fi
cat > "$DIR/docker-compose.yml" <<EOF
services:
  site:
    build: .
    restart: unless-stopped
    env_file: .env
    volumes:
      - $DADOS:/dados
$REDE_SERVICO
    labels:
      - traefik.enable=true
$REDE_LABEL
      - traefik.http.routers.preforte.rule=Host(\`$DOMINIO\`)
      - traefik.http.routers.preforte.tls=true
      - traefik.http.routers.preforte.tls.certresolver=$RESOLVER
      - traefik.http.services.preforte.loadbalancer.server.port=3000
$REDE_FIM
EOF

echo "== Construindo e ligando o site (leva alguns minutos)"
cd "$DIR" && docker compose up -d --build
echo
echo "PRONTO. Abra https://$DOMINIO (o certificado pode levar 1 minuto)."
echo "Primeira vez: depois de entrar, abra https://$DOMINIO/restaurar e envie o ZIP do backup."
