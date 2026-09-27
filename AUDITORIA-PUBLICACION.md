# Auditoría de preparación para publicar Noditos

**Fecha de revisión:** 26 de septiembre de 2026  
**Versión revisada:** commit `f2f6c0f1741ba1abc89957ee2caa2f5ac35401aa`  
**Canal evaluado:** repositorio público + descarga directa de `release/Noditos.exe` para Windows x64.

> **Alcance y límite:** revisión técnica y documental de preparación para publicación; no sustituye asesoramiento jurídico. La obligación exacta depende del país del editor y de los países, público, modelo de negocio y canal de distribución. Antes de vender o distribuir en la UE, EE. UU. u otros mercados, una persona abogada debe adaptar los textos y confirmar la clasificación regulatoria.

## Resumen ejecutivo

**Estado recomendado: no publicar todavía como producto para público general.** La aplicación funciona y su base técnica pasa las pruebas existentes, pero faltan piezas esenciales de confianza, privacidad, licenciamiento, seguridad de distribución y soporte.

### Bloqueantes antes de publicar

1. **Definir al editor y la licencia.** El repositorio es público, pero no tiene `LICENSE`, titular de derechos ni campo `license` en `package.json`. Esto no lo convierte en software libre: por defecto quedan reservados los derechos y terceros no saben qué pueden hacer.
2. **Publicar Política de Privacidad y Términos/EULA**, accesibles antes de usar IA y desde la app. Deben identificar al responsable/editor y explicar almacenamiento local, Google Fonts, imágenes remotas, proveedores de IA, transferencias internacionales, conservación, derechos y contacto.
3. **Rediseñar la protección de claves de IA.** Hoy se guardan por defecto en `localStorage` y se usan directamente desde JavaScript. Es un secreto recuperable por cualquier XSS o código que ejecute en el mismo origen. OpenAI desaconseja expresamente desplegar claves en navegadores.
4. **Aviso previo a cada uso de IA.** La app envía al proveedor seleccionado no sólo el mensaje: añade la estructura del mapa, hasta 150 nodos. La interfaz actual sólo explica dónde se guarda la clave; no informa claramente qué contenido sale del equipo, a quién, para qué, con qué coste o bajo qué condiciones.
5. **Firmar y publicar el ejecutable mediante un proceso verificable.** `Noditos.exe` no tiene firma Authenticode. El README recomienda “Ejecutar de todas formas” y hasta crear una exclusión de antivirus; eso no es aceptable como postura de seguridad para una publicación general.
6. **Agregar controles de navegador y de entrada:** CSP/cabeceras, límites de archivos y ZIP descomprimidos, confirmación de acciones destructivas originadas por IA y protección frente a prompt injection.
7. **Crear un proceso de seguridad y actualizaciones:** `SECURITY.md`, reporte privado, versiones soportadas, plazo de soporte, CI, auditoría de dependencias, hashes/firmas, notas de versión y canal de actualización/aviso.
8. **Incluir avisos de terceros.** El EXE integra Node.js y código de paquetes npm, y usa tipografías de Google Fonts. Faltan inventario/SBOM, textos de licencia y atribuciones aplicables.

---

## Lo que ya está bien

- El servidor escucha únicamente en `127.0.0.1`, no en toda la red.
- La detención del servidor exige `POST` y un token aleatorio.
- El acceso a archivos aplica comprobaciones contra `..` y NUL.
- Los enlaces externos abiertos desde React usan `noopener,noreferrer`.
- No encontré claves privadas o tokens reales mediante búsqueda de patrones en los archivos versionados.
- No hay analítica, publicidad, cuentas ni cookies en el código revisado.
- Los mapas se guardan localmente y existen backup/exportación y papelera.
- La IA es opcional y se identifica visualmente como “Ayudante IA”.
- El 26-09-2026, `npm audit` informó **0 vulnerabilidades conocidas** en 256 dependencias contabilizadas.
- `npm run typecheck`, 22 pruebas y `npm run build` finalizaron correctamente.
- El ejecutable revisado tiene SHA-256 `b9ab97d995f3ded325313e932ec41e03641ad33e1f04221dc304ad31cc7a20a7`.

Estos puntos no reemplazan una prueba de penetración ni prueban ausencia de vulnerabilidades.

---

# Hallazgos detallados

## P0 — Legal, privacidad y confianza

### L-01 · No existe licencia del producto ni identificación del titular — **Bloqueante**

**Evidencia**

- No hay `LICENSE`, `COPYING` ni aviso de copyright.
- GitHub informa `licenseInfo: null`.
- `package.json` se llama todavía `sandbox-workspace`, figura como privado y no declara `author`, `description`, `repository`, `homepage`, `bugs` ni `license`.
- Tampoco hay razón social/nombre del editor, domicilio o contacto de soporte.

**Riesgo**

- El público puede ver el código pero no tiene permiso claro para copiarlo, modificarlo o redistribuirlo.
- Tampoco queda claro quién garantiza derechos sobre código, imágenes de `design/`, marca y documentación.
- No hay base contractual clara para distribuir el binario.

**Acción**

1. Decidir si será **propietario** o **open source**.
2. Si es propietario: `license: "UNLICENSED"`, un `LICENSE`/EULA que diga qué uso se permite y avisos de copyright.
3. Si es abierto: elegir licencia con asesoramiento y verificar que todos los contribuidores pueden otorgarla; declarar el identificador SPDX.
4. Corregir metadatos de `package.json` y añadir titular/año.

GitHub aclara que, sin licencia, se aplica copyright por defecto y nadie recibe permiso para reproducir, distribuir o crear derivados. npm recomienda declarar una expresión SPDX o `UNLICENSED` y acompañar una licencia personalizada con archivo propio.

### L-02 · Faltan Política de Privacidad y aviso “just in time” — **Bloqueante**

**Datos/operaciones observados**

| Operación | Ubicación/destino | Situación actual |
|---|---|---|
| Mapas, notas, metadatos, imágenes incrustadas, papelera e historial | `localStorage` del navegador | Se menciona parcialmente en README, no en aviso legal dentro de la app |
| Claves API | `localStorage` por defecto o `sessionStorage` | Se informa el medio, no los riesgos ni todo el tratamiento |
| Contenido del mapa y prompts | Proveedor de IA elegido | No hay aviso previo suficientemente específico |
| IP, URL, User-Agent y Referer | Google Fonts | No se informa; ocurre al abrir la app y al elegir fuentes |
| IP/Referer y solicitud de imagen | Servidor de cada imagen remota | No se informa |
| Backup/enlace compartible | Archivo o URL controlada por el usuario | No se advierte claramente que contiene el contenido legible del mapa |
| Log local | `Noditos-servidor.log` junto al EXE | README lo indica; falta política de conservación/borrado |

**Especialmente importante:** `AiAssistant.tsx` construye `systemBase()` con `mapToCompactText(api.root)`. Por ello, las llamadas de chat y herramientas incluyen la estructura actual del mapa (hasta 150 nodos visibles), aunque el usuario haya escrito sólo una pregunta breve. Las notas no se incluyen en la ruta general, pero algunas funciones crean contexto adicional. El dato va directamente desde el navegador a Google, OpenAI, Anthropic, Groq, Mistral, OpenRouter, DeepSeek, xAI, Together, Perplexity, Fireworks o Cerebras, según la elección.

**Acción**

- Política accesible desde biblioteca, ajustes de IA y distribución/web.
- Aviso corto **antes de activar/probar** el proveedor: qué se enviará, proveedor/modelo, posible país/transferencia, costes, conservación según ese tercero y enlace a su política.
- Control para elegir alcance: “sólo selección / rama / mapa completo”; por defecto, mínimo necesario.
- No enviar el mapa al consultar la lista de modelos si no hace falta.
- Distinguir claramente procesamiento local con Ollama de un `ollamaUrl` remoto.
- Documentar cómo borrar mapas, historial, papelera, configuración, claves y log.
- Preparar registro interno de tratamientos y contratos/condiciones de terceros si el editor determina fines y medios.

Una política compatible con GDPR/UK GDPR suele necesitar: identidad y contacto del responsable, fines, base jurídica, categorías, destinatarios, transferencias, conservación, derechos, revocación cuando corresponda, reclamación y decisiones automatizadas. La aplicabilidad concreta debe evaluarse según territorio y rol.

### L-03 · Faltan Términos de uso/EULA y disclaimers — **Bloqueante comercial**

No existe aceptación ni texto que cubra:

- licencia de uso del binario;
- requisitos y sistemas soportados;
- titularidad del contenido del usuario;
- responsabilidad del usuario por tener derechos sobre textos, imágenes y datos que importe o comparta;
- uso aceptable y restricciones;
- servicios de terceros y sus términos;
- cargos de API, cuotas y claves aportadas por el usuario;
- disponibilidad, cambios, fin de soporte y actualizaciones;
- exportación/backups y riesgo de pérdida local;
- propiedad intelectual y marcas;
- limitación de garantías/responsabilidad **sin excluir derechos irrenunciables del consumidor**;
- ley/foro sólo cuando sea válido;
- contacto, reclamaciones, reembolsos si se cobra.

**Disclaimers mínimos, visibles y en lenguaje claro**

- La IA puede producir información falsa, sesgada, incompleta o inapropiada; el usuario debe revisar antes de aplicar/publicar.
- No es asesoramiento jurídico, médico, financiero ni profesional.
- Las respuestas y acciones de IA no deben usarse para decisiones de alto impacto.
- Los proveedores pueden cobrar y tratar entradas/salidas bajo sus propias condiciones.
- Los datos son locales pero pueden perderse al borrar datos del navegador, cambiar de perfil o fallar el almacenamiento; hacer backups.
- Los enlaces compartibles y backups contienen el mapa; cualquiera con acceso puede leerlo.
- Las imágenes por URL dependen de terceros y pueden dejar de funcionar, cambiar o registrar la visita.

Un simple “AS IS” no elimina garantías legales aplicables. Para consumidores de la UE, el contenido/servicio digital puede estar sujeto a requisitos de conformidad, seguridad, actualizaciones y remedios incluso cuando la contraprestación sean datos personales.

### L-04 · Avisos de software y fuentes de terceros ausentes — **Alta**

El build integra Node.js completo y JavaScript compilado de dependencias. El lockfile contiene licencias MIT, ISC, Apache-2.0, BSD-3-Clause, 0BSD, MPL-2.0, BlueOak-1.0.0, CC-BY-4.0 y expresiones duales. No todas terminan necesariamente en el artefacto final, por lo que hay que generar el inventario **del binario/build**, no copiar ciegamente todo `node_modules`.

**Acción**

- Crear `THIRD_PARTY_NOTICES.md` con componente, versión, copyright, licencia y texto/URL exigido.
- Incluir las licencias que acompañan al binario oficial de Node.js y sus componentes integrados.
- Elegir y documentar la opción MIT para JSZip (`MIT OR GPL-3.0-or-later`) si ésa es la decisión.
- Verificar las licencias específicas de las 50 familias tipográficas; si se autoalojan, distribuir los textos OFL/Apache correspondientes.
- Generar SBOM SPDX o CycloneDX en cada release y conservarlo junto al artefacto.
- Añadir sección “Código y licencias de terceros” en la app.

### L-05 · IA: transparencia parcial y clasificación regulatoria por confirmar — **Alta**

“Ayudante IA” y los nombres de proveedores hacen obvio que se interactúa con IA; esto ayuda a cumplir la transparencia básica. Aun así faltan:

- capacidades y límites;
- advertencia de errores y revisión humana;
- qué datos se envían;
- identificación del proveedor/editor responsable;
- política frente a usos prohibidos o de alto riesgo;
- procedimiento de incidentes y reclamos;
- etiquetado/orientación para contenido que el usuario publique como información de interés público, si aplica.

El Reglamento de IA de la UE se aplica en general desde el 2-08-2026. El artículo 50 exige informar, de forma clara y accesible, cuando una persona interactúa con IA salvo que sea obvio. Hay que determinar jurídicamente si Noditos actúa como proveedor, desplegador o simple integrador y si cambia de categoría al comercializarse o utilizarse en un contexto regulado.

### L-06 · No hay revisión de marca, derechos de assets ni política de copyright — **Media**

- Confirmar disponibilidad/registro de “Noditos”, dominios y logotipo en mercados objetivo.
- Documentar autoría/licencia de PNG de `design/`, plantillas, iconos, textos y contribuciones.
- Evitar sugerir afiliación con Google, OpenAI, Anthropic u otros; usar marcas sólo de forma nominativa y conforme a sus guías.
- Añadir mecanismo de contacto para reclamaciones de copyright si se aloja contenido o una comunidad en el futuro.

---

## P0/P1 — Seguridad técnica

### S-01 · Claves API persistentes en almacenamiento del navegador — **Bloqueante**

`defaultAiConfig()` define `saveApiKey: true`; `saveAiConfig()` guarda claves completas en `localStorage`. El texto “Las claves nunca se imprimen en logs” puede dar una seguridad excesiva: siguen visibles para JavaScript del origen, DevTools, perfiles/copias del navegador y malware local. Una sola XSS o dependencia comprometida puede extraer mapas y claves.

**Acción preferida para el EXE**

1. Hacer que el servidor local sea proxy de IA.
2. Guardar secretos en Windows Credential Manager/DPAPI, no en Web Storage.
3. Mantenerlos en memoria por defecto; persistencia sólo mediante consentimiento explícito.
4. Nunca devolver la clave al frontend una vez guardada; mostrar únicamente sufijo.
5. Añadir rotación, eliminación verificable e instrucciones de revocación.
6. Aplicar privilegios/cuotas mínimas cuando el proveedor lo permita.

Si se mantiene BYOK en navegador, explicitar que no es almacenamiento seguro y desactivar “recordar” por defecto. OpenAI indica que las claves no deben desplegarse en navegadores y que las solicitudes deben pasar por backend.

### S-02 · No hay Content Security Policy ni cabeceras defensivas — **Alta**

`server.cjs` sólo devuelve `Content-Type`/`Content-Length`; no configura CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`/`X-Frame-Options`, `Permissions-Policy`, ni políticas de caché. Esto aumenta el impacto de una inyección porque el origen contiene mapas y claves.

**Acción**

- Autoalojar fuentes para poder usar una CSP reducida.
- Definir al menos `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'` y allowlists explícitas para `connect-src`, `img-src`, `font-src`, `style-src`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` mínima y `Cache-Control: no-store` para HTML que contiene el token de detención.
- Validar `Host`/`Origin` en endpoints locales y fijar límites/métodos.
- Probar cada proveedor: una CSP con 12 destinos tiene coste de mantenimiento y debe generarse desde una lista central.

### S-03 · Acciones de IA ejecutadas sin confirmación robusta — **Alta**

El mapa completo se inserta en el prompt y la respuesta del modelo se parsea como acciones. `executeMapActions()` puede borrar, mover, renombrar o modificar nodos. Contenido importado o pegado dentro del mapa puede actuar como prompt injection indirecta; el modelo también puede equivocarse.

**Acción**

- Tratar el mapa como datos no confiables, delimitados, no como instrucciones.
- Mostrar un diff/preview y pedir confirmación antes de toda mutación; exigir confirmación reforzada para borrar/mover en masa.
- Limitar cantidad de acciones/nodos y validar esquema, existencia, ciclos y alcance seleccionado.
- Conservar undo e historial, pero no usarlos como única barrera.
- Probar prompt injection, respuestas truncadas y JSON adversarial.

### S-04 · Importaciones sin límites de tamaño ni expansión — **Alta**

Los `.docx` se cargan con JSZip y se extraen a texto sin comprobar tamaño de archivo, número de entradas, tamaño descomprimido o ratio de compresión. JSON/XML/texto también se leen completos. Un archivo enorme o ZIP bomb puede bloquear o agotar memoria.

**Acción**

- Límite de tamaño antes de `file.text()`/`JSZip.loadAsync`.
- Límite acumulado y por entrada descomprimida, número de entradas, profundidad/nodos, longitud de strings e imágenes.
- Rechazar XML con `DOCTYPE`/entidades aunque `DOMParser` del navegador normalmente no resuelva entidades externas.
- Procesar en Worker cuando sea posible y permitir cancelar.
- Añadir casos adversariales a tests.

### S-05 · Enlaces compartibles no son privados ni cifrados — **Alta de privacidad**

`createShareUrl()` serializa el título y árbol en JSON y sólo lo codifica con Base64URL en el fragmento. No existe cifrado, autenticación, caducidad ni revocación. Aunque el fragmento normalmente no se envía al servidor HTTP, sí queda en historial, portapapeles, chats, capturas, extensiones y cualquier receptor.

**Acción**

- Renombrar a “enlace portable” o advertir “cualquiera con el enlace puede leer y copiar el mapa”.
- Confirmación antes de copiar y resumen de lo incluido.
- Para confidencialidad real: cifrado cliente con clave separada o un servicio con acceso/caducidad/revocación, revisado criptográficamente.
- Limitar tamaño y validar estructura/profundidad al importar hash.

### S-06 · Fuentes e imágenes remotas amplían la superficie y contradicen una expectativa “local” — **Media/Alta**

La app contacta Google Fonts al arrancar y al escoger fuentes. Las imágenes por URL contactan hosts arbitrarios y pueden rastrear IP/Referer, cambiar contenido o desaparecer. La frase de producto debería evitar “100% offline/privado” salvo en un modo que realmente bloquee toda salida.

**Acción**

- Autoalojar fuentes utilizadas y sus licencias.
- `Referrer-Policy: no-referrer`.
- Para imágenes: descarga/proxy seguro o advertencia y opción de incrustar; bloquear credenciales en URL, localhost/red privada si algún día el fetch pasa al servidor, y protocolos distintos de HTTPS en publicación web.
- Panel “Conexiones externas” y modo sin red verificable.

### S-07 · Ejecutable no firmado; instrucciones inseguras al usuario — **Bloqueante de distribución**

El directorio PE de certificados del EXE está vacío. El proceso de build elimina deliberadamente la firma del `node.exe` base antes de inyectar el SEA; eso es técnicamente necesario porque esa firma ya no sería válida, pero el artefacto final debe firmarse de nuevo con la identidad del editor.

**Acción**

- Certificado Authenticode de editor verificado y timestamp RFC 3161 después de inyectar/verificar el SEA.
- CI controlado, secretos de firma protegidos/HSM, hash SHA-256 publicado y verificación de firma automatizada.
- No aconsejar exclusiones de antivirus. Ofrecer reporte a Microsoft sólo ante falso positivo confirmado.
- Distribuir en GitHub Releases u otro canal HTTPS estable, no sólo versionar un EXE de 88 MB dentro de Git.
- Firmar también manifiesto de checksums; idealmente generar attestations de procedencia.

### S-08 · Cadena de suministro y dependencias — **Media**

`npm audit` está limpio hoy, pero:

- no existe CI ni Dependabot visible;
- Recharts 2.x muestra aviso de rama sin mantenimiento;
- hay dependencias directas sin uso encontrado en `src/`: `@dnd-kit/*`, `@supabase/supabase-js`, `canvas-confetti`, `date-fns`, `framer-motion` y `recharts`;
- el build usa `npx --yes postject@...`; aunque fija versión, conviene ejecutar el binario instalado y bloqueado por `package-lock`;
- el binario base se obtiene desde npm y no se ve verificación contra un checksum independiente de Node.

**Acción**

- Eliminar dependencias no usadas.
- CI en cada PR: `npm ci`, typecheck, tests, build, audit, análisis estático, detección de secretos y revisión de licencias.
- Dependabot/renovación, dependency review y push protection.
- Verificar integridad del runtime descargado contra hashes firmados/publicados por Node.js.
- Build reproducible o, como mínimo, attestation enlazada a commit/workflow.
- SBOM y escaneo por release; política de parcheo con SLA.

### S-09 · Sin canal de vulnerabilidades, soporte ni actualización — **Alta**

No hay `SECURITY.md`, versiones soportadas, contacto privado, política de divulgación, changelog, releases ni mecanismo de actualización/aviso. El endpoint de versión no resuelve cómo llega un parche al usuario.

**Acción**

- `SECURITY.md`: versiones, cómo reportar en privado, tiempos de acuse/triage y safe harbor.
- Habilitar private vulnerability reporting y funciones de seguridad de GitHub.
- Definir periodo de soporte y EOL; canal firmado de comprobación de versión sin telemetría o página de releases consultable.
- Playbook de incidente, revocación de artefactos, CVE cuando proceda y notificación a usuarios.
- Si se comercializa en la UE, preparar cumplimiento del Cyber Resilience Act. Sus obligaciones de reporte de vulnerabilidades explotadas/incidentes graves comenzaron el **11-09-2026** y el régimen general se aplica desde el **11-12-2027**, sujeto a alcance y excepciones. Requiere, entre otras cosas, evaluación de riesgo, gestión de vulnerabilidades, SBOM, actualizaciones, documentación, declaración de conformidad y periodo de soporte.

### S-10 · Pruebas insuficientes para el riesgo — **Media**

Las 22 pruebas actuales cubren principalmente utilidades. Faltan tests del servidor y seguridad: traversal codificado, cabeceras, Host/Origin, métodos, token, CSP, archivos hostiles, ZIP bombs, prompt injection, acciones IA, almacenamiento y migraciones. No consta auditoría manual, DAST ni revisión independiente.

---

## P1/P2 — Publicación, producto y accesibilidad

### P-01 · Falta información de producto y soporte — **Alta**

Añadir pantalla “Acerca de” y documentación con:

- editor y contacto;
- versión, fecha de build y canal;
- licencia/EULA, privacidad, terceros y seguridad;
- sistemas soportados (hoy sólo Windows x64), navegadores y requisitos de red;
- ubicación de datos y log;
- procedimiento de backup/restauración y desinstalación/borrado;
- coste de proveedores IA y dependencia de cuentas externas;
- periodo de soporte/EOL y cómo actualizar;
- matriz de formatos soportados y limitaciones conocidas.

Cambiar nombre/versionado de `sandbox-workspace@1.0.0` por la identidad real del producto y alinear versión del paquete, build, UI y releases.

### P-02 · Accesibilidad sin evaluación — **Alta si se ofrece ampliamente o en mercados regulados**

Hay muchos controles de sólo icono o con texto visual pequeño; el lienzo y drag-and-drop requieren una auditoría real de teclado/lector de pantalla. No existe declaración de accesibilidad.

**Acción**

- Objetivo WCAG 2.2 AA: nombres accesibles, estructura/landmarks, foco visible y no oculto, orden, teclado completo, alternativa a arrastrar, contraste, zoom/reflow, mensajes anunciados, reducción de movimiento y modales con focus trap/restauración.
- Tests automatizados (axe) + teclado + NVDA/JAWS en Windows.
- Publicar declaración de accesibilidad y canal para pedir adaptaciones/reportar barreras.

W3C recomienda usar WCAG 2.2; toda función debe estar disponible por teclado y no debe crear trampas de foco.

### P-03 · Privacidad de menores y contenido sensible sin decisión — **Condicional**

Definir edad mínima y público objetivo. Si se dirige a menores o escuelas, cambian consentimiento, transparencia, contratos educativos, moderación y evaluación de riesgos. Hasta decidirlo, evitar marketing “para niños/escuelas” y no promover ingreso de datos sensibles o de terceros en IA.

### P-04 · No hay telemetría: no añadir banner innecesario, sí documentar almacenamiento — **Nota**

El código revisado no usa cookies ni analítica. No hace falta añadir un banner genérico sólo por apariencia. `localStorage` cumple funciones pedidas por el usuario, pero hay que describir qué guarda y cómo borrarlo. Si se añade analítica, crash reporting o marketing, reevaluar consentimiento ePrivacy/GDPR antes de cargarlo; rechazar debe ser tan sencillo como aceptar.

### P-05 · Claims que deben corregirse — **Alta**

- **“Ollama · 100% privado”** sólo sería cierto con servidor local, modelo local y sin otras conexiones; el campo admite cualquier URL y Google Fonts sigue contactando Internet.
- **“Las claves nunca se imprimen en logs”** es demasiado estrecho: no equivale a almacenamiento seguro y algunos proveedores, como Gemini, reciben la clave en query string de la solicitud.
- El consejo de agregar una **exclusión de antivirus** debe eliminarse.
- “Conserva absolutamente todo” en backups debería validarse por esquema/versiones y matizarse; promesas absolutas elevan riesgo contractual.
- “No necesita instalar nada” puede mantenerse como descripción técnica, acompañada de Windows x64, navegador, puerto local y conexiones externas opcionales/obligatorias para fuentes.

---

# Contenido mínimo de los documentos pendientes

## Política de Privacidad

1. Responsable/editor y contacto; DPO/representante si aplica.
2. Alcance y fecha/versión.
3. Tabla por dato: mapas, imágenes, metadatos, claves, prompts/contexto, logs y datos técnicos.
4. Finalidad y base jurídica por operación.
5. Diferencia entre datos sólo locales y datos enviados fuera del equipo.
6. Destinatarios por proveedor y enlace a políticas/condiciones vigentes.
7. Transferencias internacionales y salvaguardas cuando correspondan.
8. Conservación/borrado y consecuencias de borrar almacenamiento del navegador.
9. Seguridad y limitaciones realistas.
10. Derechos y cómo ejercerlos; autoridad de control aplicable.
11. Menores.
12. Cambios y fecha de vigencia.

## Términos/EULA

1. Identidad del editor y aceptación.
2. Licencia de uso y restricciones.
3. Requisitos/sistemas y conectividad.
4. Contenido del usuario y permisos necesarios.
5. IA y terceros: BYOK, costes, disponibilidad, políticas y revisión humana.
6. Uso aceptable; prohibición de usos ilícitos o de alto impacto no autorizados.
7. Backups, enlaces y pérdida de datos.
8. Actualizaciones, soporte y EOL.
9. Propiedad intelectual y feedback.
10. Garantías, responsabilidad y fuerza mayor, respetando ley imperativa.
11. Terminación, ley, resolución de disputas y consumidor.
12. Contacto y cambios.

## Aviso de IA dentro de la interfaz

Texto orientativo, sujeto a revisión legal:

> **Antes de enviar:** Noditos enviará al proveedor seleccionado tu mensaje y el contexto que elijas del mapa. El proveedor procesará esos datos bajo sus propias condiciones y puede conservarlos según tu cuenta/configuración. No envíes secretos ni datos personales de terceros sin autorización. La IA puede equivocarse. Revisá las propuestas antes de aplicarlas. Tu proveedor puede cobrarte por el uso de su API.

Debe incluir selector de alcance, proveedor/modelo, enlace a privacidad, acción “Enviar” y, para mutaciones, preview/confirmación posterior.

## Avisos de terceros

- Lista exacta de componentes del artefacto y versiones.
- Copyright y licencia de cada uno.
- Textos completos/NOTICE cuando la licencia lo exija.
- Node.js y componentes que incorpora.
- Tipografías y licencias por familia.
- Fecha/SBOM correspondiente a la misma release.

---

# Plan de remediación recomendado

## Fase 1 — Antes de cualquier release pública

- [ ] Identificar entidad/persona editora, país, mercados, precio y audiencia.
- [ ] Elegir licencia y añadir `LICENSE`; corregir `package.json`.
- [ ] Política de Privacidad + Términos/EULA + avisos de IA revisados jurídicamente.
- [ ] Autoalojar fuentes y documentar conexiones externas.
- [ ] Cambiar claves a memoria/almacén seguro; “recordar” desactivado por defecto.
- [ ] Consentimiento de alcance y preview de acciones IA.
- [ ] CSP/cabeceras y límites de importación/share hash.
- [ ] Firmar Authenticode y publicar checksum desde canal oficial.
- [ ] `THIRD_PARTY_NOTICES`, SBOM y verificación de licencias.
- [ ] `SECURITY.md`, soporte, versiones soportadas y EOL.
- [ ] Eliminar del README instrucciones de saltarse SmartScreen/antivirus.
- [ ] Auditoría básica WCAG y corrección de bloqueantes.

## Fase 2 — Release candidate

- [ ] CI con tests, SAST, secret scan, dependency review, licencias y SBOM.
- [ ] Tests adversariales de archivos, prompt injection y servidor local.
- [ ] Build/attestation reproducible y releases inmutables.
- [ ] Instalación/desinstalación y borrado probados en Windows soportados.
- [ ] Prueba de restauración de backup entre versiones.
- [ ] Matriz de proveedores IA/CORS, términos, privacidad, costes y regiones.
- [ ] Revisión legal por jurisdicción y evaluación CRA/AI Act/GDPR/consumo.
- [ ] Prueba independiente o revisión de seguridad antes del lanzamiento.

## Fase 3 — Operación

- [ ] Monitor mensual de vulnerabilidades y SLA de parcheo.
- [ ] Canal de avisos de seguridad y actualización firmado.
- [ ] Inventario por release, changelog y política de retención.
- [ ] Proceso de incidentes, retirada de artefacto y notificación.
- [ ] Revisión anual y cada vez que cambie proveedor, dato, finalidad o mercado.

---

# Decisiones que el equipo debe responder

No se pueden finalizar los textos legales sin estas respuestas:

1. ¿Quién publica: persona física o sociedad? Nombre legal, país, domicilio y email.
2. ¿Será gratis, donación, pago único, suscripción o intercambio por datos?
3. ¿En qué países se ofrecerá y desde dónde opera el editor?
4. ¿Público general, empresas, educación o menores?
5. ¿Código abierto o propietario? ¿Quiénes contribuyeron y cedieron derechos?
6. ¿Se distribuirá por web, GitHub Releases, Microsoft Store u otro canal?
7. ¿Qué periodo de soporte y sistemas Windows se garantizan?
8. ¿Se mantendrá BYOK o habrá backend/cuentas del editor?
9. ¿Qué proveedores IA seguirán soportados y qué datos se permitirá enviar?
10. ¿Habrá analítica, crash reporting, actualizaciones automáticas o soporte remoto?

---

# Fuentes principales consultadas

Fuentes oficiales o primarias consultadas al 26-09-2026:

- [GitHub Docs — Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [npm Docs — `package.json`, campo `license`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
- [npm Docs — generación de SBOM](https://docs.npmjs.com/cli/v9/commands/npm-sbom/)
- [GitHub Docs — seguridad mínima y `SECURITY.md`](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories)
- [GitHub Docs — seguridad de cadena de suministro y attestations](https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/supply-chain-security/supply-chain-security)
- [OWASP ASVS](https://owasp.org/projects/asvs)
- [OWASP — HTML5 Security Cheat Sheet / Local Storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OpenAI — Best Practices for API Key Safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [GDPR, texto consolidado — artículo 13 y demás obligaciones](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02016R0679-20160504)
- [ICO — contenido de un aviso de privacidad](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/)
- [Reglamento de IA (UE) 2024/1689 consolidado — artículo 50](https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng)
- [Resumen oficial de la UE — reglas de IA y fechas](https://eur-lex.europa.eu/EN/legal-content/summary/rules-for-trustworthy-artificial-intelligence-in-the-eu.html)
- [Cyber Resilience Act (UE) 2024/2847](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng)
- [Resumen oficial del CRA y fechas de aplicación](https://eur-lex.europa.eu/legal-content/EN/LSU/?uri=OJ%3AL_202402847)
- [Directiva (UE) 2019/770 — contenido y servicios digitales](https://eur-lex.europa.eu/eli/dir/2019/770/oj/eng)
- [Google Fonts FAQ — licencias y datos recibidos](https://developers.google.com/fonts/faq)
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [CISA — Minimum Elements for an SBOM](https://www.cisa.gov/sites/default/files/2025-08/2025_CISA_SBOM_Minimum_Elements.pdf)

---

## Conclusión

Noditos tiene una base funcional y una ventaja de privacidad por su almacenamiento local, pero la opción de IA, los recursos remotos y la distribución de un EXE sin firma hacen que no sea correcto presentarlo simplemente como “local/privado”. La prioridad no es añadir un banner genérico: es **explicar y minimizar las salidas de datos, proteger las claves, controlar las acciones de IA, definir derechos/licencias, firmar el artefacto y establecer soporte de seguridad**.
