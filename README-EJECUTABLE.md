# Noditos — cómo generar el ejecutable (.exe)

## Para vos (generar el .exe)

1. Abrí la carpeta del proyecto.
2. Doble clic en **`build-exe.bat`** (Windows). Hace todo solo:
   instala dependencias → compila la app → empaqueta **`release\Noditos.exe`**.
   - En macOS/Linux: `./build-exe.sh` (o `PKG_PLATFORM=macos-arm64 ./build-exe.sh`).
3. Si el script no consigue la lista de binarios, te da los pasos manuales
   (elegir una versión en <https://github.com/yao-pkg/pkg-fetch/releases> y
   ejecutar `build-exe.bat X.Y.Z`).

### ¿Por qué se empaqueta desde una carpeta temporal?
pkg incrusta `dist/` usando patrones (globs) que **se rompen si la ruta del
proyecto tiene espacios o paréntesis** (por ejemplo `FreeplaneCasi-main (5)`).
El script copia `dist/`, `server.cjs` y `pkg.json` a `%TEMP%\noditos-exe-stage`
y empaqueta desde ahí, así tu carpeta puede llamarse como quieras.

## Para el usuario final

1. Recibe **`Noditos.exe`** (un solo archivo, ~60 MB). No necesita instalar nada.
2. Doble clic → aparece una ventana de consola **por un segundo y se cierra
   sola**: el servidor sigue corriendo **en segundo plano, sin ventana**, y la
   app se abre automáticamente en su navegador en `http://127.0.0.1:4173`.
3. Si vuelve a hacer doble clic mientras Noditos ya está activo, no se duplica:
   simplemente se abre otra pestaña con la app.
4. **Para cerrar el programa**: botón **"Detener"** (dentro de la app o en la
   biblioteca). Alternativa: Administrador de tareas → finalizar `Noditos.exe`.
5. Toda la actividad queda registrada en `Noditos-servidor.log`, en la misma
   carpeta donde esté el `.exe`.
6. Para depurar con consola visible: `Noditos.exe --foreground` desde una terminal.

## Preguntas frecuentes

**¿Hay que enviar la carpeta completa?**
No. El `.exe` lleva todo incrustado (servidor + app). Podés moverlo a cualquier
carpeta (incluso junto al `build-exe.bat`) y enviar **solo el archivo**.

**La ventana aparece un segundo y se cierra sola. ¿Está fallando?**
No: es el comportamiento normal (segundo plano). Si el navegador *no* se abre:
- **Windows Smart App Control o el antivirus** pudo bloquear el `.exe` (no está
  firmado): clic derecho → *Propiedades* → marcar **"Desbloquear"**, o agregar
  una exclusión en el antivirus.
- Revisá `Noditos-servidor.log` junto al `.exe`; ahí queda registrado el error.

**Al instalar aparecen avisos `npm warn deprecated...`, ¿es un problema?**
No. Son avisos de dependencias transitivas del empaquetador; no afectan la
compilación ni se incluyen en el `.exe`. El de `esbuild` (npm 11 bloquea su
script de instalación) ya lo resuelve el script con `npm rebuild esbuild`.

**¿Dónde viven los mapas del usuario?**
En el navegador de cada usuario (localStorage). Para compartir trabajo entre
PCs se usa Exportar/Importar (el `.json` conserva absolutamente todo).

**El .exe solo funciona en Windows de 64 bits.**
Es el destino por defecto. Para otros sistemas usá `build-exe.sh` con
`PKG_PLATFORM=macos-arm64`, `PKG_PLATFORM=linux-x64`, etc.
