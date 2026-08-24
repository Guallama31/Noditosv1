#!/usr/bin/env bash
# NODITOS - Generador de ejecutable desde macOS / Linux.
# Por defecto genera el .exe para Windows (compilación cruzada).
# Para otros destinos: PKG_PLATFORM=macos-arm64 ./build-exe.sh
set -e
cd "$(dirname "$0")"
PROJ="$(pwd)"

PKG_PLATFORM="${PKG_PLATFORM:-win}"
STAGE="${TMPDIR:-/tmp}/noditos-exe-stage"

echo ""
echo "  =========================================="
echo "    NODITOS - Generador de ejecutable"
echo "    Plataforma destino: $PKG_PLATFORM"
echo "  =========================================="
echo ""

echo "  [1/4] Instalando dependencias del proyecto..."
npm install
npm rebuild esbuild >/dev/null 2>&1 || true

echo "  [2/4] Compilando la aplicación web (dist/)..."
npx vite build

echo "  [3/4] Preparando carpeta de empaquetado limpia..."
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R dist "$STAGE/dist"
cp server.cjs pkg.json "$STAGE/"
echo "        Lista en: $STAGE"
echo ""

echo "  [4/4] Empaquetando el ejecutable..."

if [ -n "${1:-}" ]; then
  echo "        Usando la versión de Node indicada: $1"
  TRY_VERSIONS="$1"
else
  echo "        Consultando a GitHub los binarios disponibles..."
  PKG_TAG="$(node -p "try{const v=require('$PROJ/node_modules/@yao-pkg/pkg-fetch/package.json').version.split('.');'v'+v[0]+'.'+v[1]}catch(e){'v3.6'}")"
  ASSETS_URL="$(curl -fsSL -H 'User-Agent: noditos-build-script' \
    "https://api.github.com/repos/yao-pkg/pkg-fetch/releases/tags/$PKG_TAG" 2>/dev/null \
    | node -p "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).assets_url+'?per_page=100')}catch(e){}})" \
    2>/dev/null || true)"
  TRY_VERSIONS=""
  if [ -n "$ASSETS_URL" ]; then
    TRY_VERSIONS="$(curl -fsSL -H 'User-Agent: noditos-build-script' "$ASSETS_URL" 2>/dev/null \
      | node -e "
          let d='';
          process.stdin.on('data',c=>d+=c).on('end',()=>{
            try{
              const assets=JSON.parse(d);
              const re=new RegExp('^node-v(\\\\d+\\\\.\\\\d+\\\\.\\\\d+)-$PKG_PLATFORM-x64\$');
              const vs=assets
                .map(a=>{const m=a.name.match(re);return m?m[1]:null})
                .filter(Boolean)
                .sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
              console.log(vs.join(' '));
            }catch(e){}
          });" 2>/dev/null || true)"
  fi
fi

if [ -z "$TRY_VERSIONS" ]; then
  echo "        Sin acceso a la lista oficial; probando versiones conocidas..."
  TRY_VERSIONS="20.20.1 20.20.0 20.19.4 18.20.8"
else
  echo "        Versiones a probar: $TRY_VERSIONS"
fi
echo ""

SUCCESS=""
cd "$STAGE"
for V in $TRY_VERSIONS; do
  echo "   Probando con el binario node${V}-${PKG_PLATFORM}-x64..."
  if node "$PROJ/node_modules/@yao-pkg/pkg/lib-es5/bin.js" server.cjs \
       --targets "node${V}-${PKG_PLATFORM}-x64" \
       --config pkg.json --output "$PROJ/release/Noditos"; then
    SUCCESS="$V"
    break
  fi
done
cd "$PROJ"
rm -rf "$STAGE"

if [ -z "$SUCCESS" ]; then
  echo ""
  echo "  [ERROR] Ningún binario base funcionó."
  echo "  Solución manual: buscá un asset node-vX.Y.Z-${PKG_PLATFORM}-x64 en"
  echo "  https://github.com/yao-pkg/pkg-fetch/releases y ejecutá ./build-exe.sh X.Y.Z"
  exit 1
fi

echo ""
echo "  =========================================="
echo "    LISTO! Empaquetado con Node $SUCCESS"
echo "    Ejecutable creado en: release/Noditos"
echo "  =========================================="
echo ""
