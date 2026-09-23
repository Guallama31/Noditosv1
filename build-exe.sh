#!/usr/bin/env bash
# NODITOS - Generador del ejecutable con Node SEA (Single Executable Application).
#
#   ./build-exe.sh          -> release/Noditos.exe      (Windows x64)
#   ./build-exe.sh linux    -> release/Noditos-linux    (gemelo Linux, para pruebas)
#
# A diferencia del generador anterior (pkg), NO descarga nada de GitHub
# releases: el binario oficial de Node.js para la plataforma destino se baja
# del registro npm (paquetes node-win-x64 / node-linux-x64 publicados por el
# propio proyecto Node.js) y se queda en caché. La app (dist/ + server.cjs +
# build-info.json) se incrusta como "assets" del ejecutable con la API
# oficial node:sea y postject.
#
# Requisitos: Node.js >= 20.12 (para node:sea), npm y (en Linux) curl/tar.
set -euo pipefail
cd "$(dirname "$0")"
PROJ="$(pwd)"

NODE_VERSION="${NODE_VERSION:-22.23.2}"
TARGET_PLATFORM="${1:-win}"          # win | linux
CACHE="${SEA_CACHE:-$HOME/.cache/noditos-sea}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/noditos-sea-stage.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

# Paquete npm con el Node de la plataforma que corre este script (genera el blob).
case "$(uname -s)/$(uname -m)" in
  Linux/x86_64)  HOST_PKG=node-linux-x64 ;;
  Linux/aarch64) HOST_PKG=node-linux-arm64 ;;
  Darwin/arm64)  HOST_PKG=node-darwin-arm64 ;;
  Darwin/*)      HOST_PKG=node-darwin-x64 ;;
  *) echo "[ERROR] Plataforma host no soportada: $(uname -s) $(uname -m)"; exit 1 ;;
esac

# Paquete npm con el Node base del ejecutable final.
case "$TARGET_PLATFORM" in
  win)   BASE_PKG=node-win-x64;   BASE_BIN=bin/node.exe; OUT=release/Noditos.exe; MAGIC=MZ ;;
  linux) BASE_PKG=node-linux-x64; BASE_BIN=bin/node;     OUT=release/Noditos-linux; MAGIC=ELF ;;
  *) echo "[ERROR] Destino no soportado: $TARGET_PLATFORM (usá 'win' o 'linux')"; exit 1 ;;
esac

echo ""
echo "  =========================================="
echo "    NODITOS - Generador de ejecutable (SEA)"
echo "    Destino: $TARGET_PLATFORM · Node $NODE_VERSION"
echo "  =========================================="
echo ""

echo "  [1/6] Instalando dependencias del proyecto (si hace falta)..."
[ -d node_modules/postject ] || npm ci --no-audit --no-fund

echo "  [2/6] Compilando la aplicación web (dist/)..."
npx vite build

echo "  [3/6] Generando build-info.json (versión y fecha quedan incrustadas)..."
VERSION="$(node -p "require('./package.json').version || '0.0.0'")"
BUILT_AT="$(date +%Y-%m-%d)"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'sin-git')"
cat > "$STAGE/build-info.json" <<EOF
{
  "version": "$VERSION",
  "builtAt": "$BUILT_AT",
  "commit": "$COMMIT"
}
EOF
echo "        Noditos v$VERSION · build $BUILT_AT · commit $COMMIT"

echo "  [4/6] Obteniendo Node $NODE_VERSION desde npm (caché: $CACHE)..."
mkdir -p "$CACHE"
fetch_node_pkg() {
  local pkg="$1"
  if [ -e "$CACHE/$pkg/$BASE_BIN" ] || [ -e "$CACHE/$pkg/bin/node" ] || [ -e "$CACHE/$pkg/bin/node.exe" ]; then
    echo "        $pkg ya está en caché"
    return
  fi
  echo "        descargando $pkg@$NODE_VERSION..."
  local tmp
  tmp="$(mktemp -d "$CACHE/xxxx.XXXXXX")"
  ( cd "$tmp" && npm pack "$pkg@$NODE_VERSION" --silent >/dev/null 2>&1 \
    && tar xzf "$pkg-$NODE_VERSION.tgz" \
    && rm -f "$pkg-$NODE_VERSION.tgz" \
    && mv package "../$pkg" )
  rm -rf "$tmp"
}
fetch_node_pkg "$HOST_PKG"
fetch_node_pkg "$BASE_PKG"

HOST_NODE="$CACHE/$HOST_PKG/bin/node"
if [ ! -x "$HOST_NODE" ]; then
  # En Windows el "host node" también es node.exe (cuando el host ES Windows).
  HOST_NODE="$CACHE/$HOST_PKG/bin/node.exe"
fi

echo "  [5/6] Preparando el paquete y generando el blob SEA..."
cp server.cjs "$STAGE/"
cp -R dist "$STAGE/dist"

# sea-config.json: la app entera como assets con claves "dist/..." (como las
# lee server.cjs) + build-info.json. Sin snapshot ni code cache: el blob queda
# independiente de la plataforma (se genera en el host y sirve para cualquier
# destino con la misma versión de Node).
"$HOST_NODE" "$PROJ/tools/make-sea-config.cjs" "$STAGE"

( cd "$STAGE" && "$HOST_NODE" --experimental-sea-config sea-config.json )

mkdir -p release
cp "$CACHE/$BASE_PKG/$BASE_BIN" "$OUT"
if [ "$TARGET_PLATFORM" = linux ]; then chmod +x "$OUT"; fi

if [ "$TARGET_PLATFORM" = win ]; then
  # node.exe llega firmado por Node.js; tras inyectar el blob la firma quedaría
  # inválida (peor que no tenerla). Se quita limpiamente: equivale a
  # "signtool remove /s", hecho desde acá sin Windows.
  node "$PROJ/tools/pe-signature.cjs" "$OUT" --strip
fi

echo "  [6/6] Inyectando el blob en el ejecutable (postject)..."
npx --yes postject@1.0.0-alpha.6 "$OUT" NODE_SEA_BLOB "$STAGE/sea-prep.blob" \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite

echo ""
echo "  Verificando..."
# 1) Cabecera del binario (MZ para Windows, ELF para Linux).
HEADER="$(head -c 2 "$OUT")"
if [ "$TARGET_PLATFORM" = win ]; then
  [ "$HEADER" = "MZ" ] || { echo "  [ERROR] El archivo no es un ejecutable Windows (cabecera MZ)."; exit 1; }
else
  [ "$(head -c 4 "$OUT" | od -An -tx1 | tr -d ' \n')" = "7f454c46" ] || { echo "  [ERROR] El archivo no es un ejecutable Linux (ELF)."; exit 1; }
fi
# 2) Tamaño: el node.exe base ronda los 87 MB; menos de 40 MB es señal de base recortada.
SIZE="$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")"
if [ "$SIZE" -lt 40000000 ]; then echo "  [ERROR] Ejecutable sospechosamente chico: $SIZE bytes."; exit 1; fi
# 3) El fuse de SEA y la marca del build deben estar dentro del binario.
grep -aq "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2" "$OUT" || { echo "  [ERROR] No se encuentra el fuse de SEA."; exit 1; }
grep -aq "$COMMIT" "$OUT" || { echo "  [ERROR] build-info.json no quedó incrustado (falta commit $COMMIT)."; exit 1; }
if [ "$TARGET_PLATFORM" = win ]; then
  node "$PROJ/tools/pe-signature.cjs" "$OUT" | grep -q "(sin firma Authenticode)" \
    || { echo "  [ERROR] El ejecutable quedó con la firma vieja sin limpiar."; exit 1; }
fi
# 4) Los assets con hash de ESTE dist deben estar dentro (prueba de frescura).
grep -oE 'assets/[A-Za-z0-9._-]+' dist/index.html | sort -u | while read -r asset; do
  grep -aq "$asset" "$OUT" || { echo "  [ERROR] El ejecutable no contiene '$asset'."; exit 1; }
  echo "        OK: $asset"
done

echo ""
echo "  =========================================="
echo "    LISTO! $OUT"
echo "    Tamaño: $SIZE bytes"
echo "    SHA256: $(sha256sum "$OUT" | cut -d' ' -f1)"
echo "  =========================================="
echo ""
