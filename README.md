# Noditos

Programa para organizar ideas con mapas mentales, biblioteca local e importación/exportación jerárquica.

## Funciones principales

- Mapas con nodos de idea, título, texto e imagen.
- Biblioteca local con autoguardado.
- Papelera de mapas y restauración.
- Historial local de versiones por mapa.
- Backups completos de la biblioteca en JSON.
- Importación/exportación: Freeplane/Freemind `.mm`, JSON, OPML, Markdown, texto y Word `.docx`.
- Búsqueda y reemplazo con `Ctrl+F` en textos, notas, etiquetas, tipos de nodo y fechas.
- Metadatos de tareas: etiquetas, estado, prioridad, fechas, responsable, progreso, categoría, riesgo y revisión.
- Imágenes optimizadas antes de guardarse, arrastrar/soltar, pegado desde portapapeles e imágenes por URL.
- Enlaces compartibles con el mapa embebido para mapas livianos.
- Ayudante IA opcional con claves guardables localmente o solo por sesión.

## Ejecutable para usuarios finales

Ver **[README-EJECUTABLE.md](README-EJECUTABLE.md)**: `release/Noditos.exe` ya viene compilado en el repo — doble clic y la app se abre en el navegador.

## Desarrollo

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev -- --host 0.0.0.0
```
