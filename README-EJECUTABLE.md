# Noditos — ejecutable de un solo archivo (.exe)

## Para el usuario final

1. Recibe **`release/Noditos.exe`** (un solo archivo, ~88 MB). No necesita instalar nada.
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
7. La **versión** del build aparece en el banner de la consola, en el log
   (`Iniciando Noditos v…`) y en `http://127.0.0.1:4173/__noditos/ping`.

### Windows muestra "Windows protegió tu PC"

El ejecutable no está firmado digitalmente (firmar cuesta un certificado
anual). La primera vez que se baja de internet, Windows puede mostrar ese
aviso: clic en **"Más información" → "Ejecutar de todas formas"**. Si el
antivirus lo elimina, agregar una exclusión. No es un error del programa.

## Cómo se genera (ya no hace falta compilar nada en tu PC)

**El `Noditos.exe` ya viene incluido en el repositorio** (`release/Noditos.exe`),
listo para descargar y usar. Se regenera solo cuando cambia la app.

Si algún día querés regenerarlo vos:

- **Windows**: doble clic en **`build-exe.bat`**.
- **macOS/Linux**: `./build-exe.sh` (por defecto genera el .exe de Windows).

A diferencia del generador anterior (pkg), **no descarga nada de GitHub
releases**: usa **Node SEA**, el mecanismo oficial de Node.js para ejecutables
de un solo archivo. El binario oficial de Node para Windows se baja del
**registro npm** (paquete `node-win-x64`, publicado por el propio proyecto
Node.js) y queda en caché (`%LOCALAPPDATA%\noditos-sea` en Windows). Todo lo
que necesita es npm, así que funciona en cualquier PC con internet normal.

Qué hace el generador:

1. `npm ci` + compila la web (`vite build` → `dist/`).
2. Genera `build-info.json` (versión, fecha, commit) — queda **incrustado** en
   el exe y visible en el log/consola.
3. Descarga el Node base desde npm (si no está en caché).
4. Empaqueta `server.cjs` + `dist/` + `build-info.json` como assets del
   ejecutable (`node:sea` + `postject`).
5. Quita la firma Authenticode vieja del `node.exe` base (si no, quedaría
    inválida) e inyecta el blob.
6. Verifica: cabecera PE, tamaño, fuse de SEA, assets con hash del `dist/`
   actual (prueba automática de frescura) y marca del build.

El ejecutable pesa ~88 MB porque incluye el `node.exe` oficial completo (el
generador anterior usaba uno recortado de ~58 MB, pero que dependía de
descargas externas que dejaron de funcionar).

## Desarrollo

- `node server.cjs` corre el servidor en modo desarrollo leyendo `dist/` del
  disco (compilar antes con `npx vite build`).
- `./build-exe.sh linux` genera un **gemelo de Linux** (`release/Noditos-linux`)
  útil para probar el ejecutable de punta a punta sin Windows.

## Preguntas frecuentes

**¿Hay que enviar la carpeta completa?**
No. El `.exe` lleva todo incrustado (servidor + app + versión). Se puede
enviar/mover solo ese archivo.

**La ventana aparece un segundo y se cierra sola. ¿Está fallando?**
No: es el comportamiento normal (segundo plano). Si el navegador *no* se abre,
revisá `Noditos-servidor.log` junto al `.exe`; ahí queda registrado cualquier
error.

**¿Dónde viven los mapas del usuario?**
En el navegador de cada usuario (localStorage). Para compartir trabajo entre
PCs se usa Exportar/Importar (el `.json` conserva absolutamente todo).

**El .exe solo funciona en Windows de 64 bits.**
Sí. Para otros sistemas se puede correr con Node: `npx vite build && node
server.cjs`, o generar un binario nativo adaptando `build-exe.sh`.
