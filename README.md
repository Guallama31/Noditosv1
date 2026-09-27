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
- Imágenes optimizadas antes de guardarse, arrastrar/soltar, pegado desde portapapeles e imágenes por URL. Las imágenes remotas pueden contactar al servidor externo y dejar de estar disponibles.
- Enlaces portables con el mapa codificado dentro de la URL para mapas livianos. **No están cifrados:** cualquiera con el enlace puede leer el mapa.
- Ayudante IA opcional. Al usar un proveedor cloud, el contenido seleccionado se envía a ese tercero y puede generar costes o respuestas incorrectas.

## Estado de publicación

Noditos está en preparación para una **beta** y todavía no debe considerarse una versión estable para público general. Consultá:

- [Decisiones de producto](DECISIONES-PRODUCTO.md)
- [Backlog de publicación](BACKLOG-PUBLICACION.md)
- [Auditoría de publicación](AUDITORIA-PUBLICACION.md)
- [Plan de publicación](PLAN-PUBLICACION.md)
- [Aviso de privacidad de beta](PRIVACIDAD-BETA.md)
- [Condiciones de beta](TERMINOS-BETA.md)
- [Política de seguridad](SECURITY.md)
- [Avisos de terceros](THIRD_PARTY_NOTICES.md)

La licencia definitiva, la identidad pública del editor, la firma Authenticode y el compromiso de soporte aún están pendientes. Mientras tanto el proyecto se declara `UNLICENSED`: que el repositorio sea público no concede permiso general para reutilizar o redistribuir el código.

## Datos y backups

Los mapas viven en el `localStorage` del perfil de navegador que abre Noditos. Pueden perderse si se eliminan los datos del navegador, se cambia de perfil o se daña el almacenamiento. Exportá backups regularmente y comprobá que puedan restaurarse. Las funciones de IA, Google Fonts y las imágenes por URL pueden generar conexiones externas; se está trabajando para reducirlas y hacerlas explícitas.

## Ejecutable para pruebas

Ver **[README-EJECUTABLE.md](README-EJECUTABLE.md)**. El archivo actual es una build de prueba sin firma digital; no es todavía el canal de una versión estable.

## Desarrollo

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev -- --host 0.0.0.0
```
