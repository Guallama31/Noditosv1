# Plan minucioso para preparar y publicar Noditos

**Fecha:** 26 de septiembre de 2026  
**Basado en:** [`AUDITORIA-PUBLICACION.md`](AUDITORIA-PUBLICACION.md)  
**Objetivo:** pasar del estado actual a una beta controlada y luego a una versión estable publicable, con riesgos jurídicos, técnicos y operativos conocidos y aceptados.

> Este plan propone una secuencia técnica y de producto. Los documentos legales finales y la aplicabilidad por país deben validarse con asesoramiento jurídico.

---

# 1. Recomendación estratégica

No conviene intentar publicar inmediatamente la versión actual agregando solamente una política de privacidad. El problema principal no es documental: algunas promesas y flujos actuales no coinciden con una publicación segura, especialmente el manejo de claves y contexto de IA, las conexiones externas, las acciones automáticas de IA y el ejecutable sin firma.

La ruta recomendada es:

1. **Congelar el alcance de la primera versión pública.**
2. **Mantener Noditos local-first y sin cuentas propias.**
3. **Preparar primero una beta privada/controlada.**
4. **Mover las llamadas de IA del navegador al servidor local.**
5. **No persistir claves en la primera beta segura.** Guardarlas sólo en memoria hasta cerrar Noditos.
6. **Enviar a IA únicamente el contexto elegido por el usuario**, no el mapa entero implícitamente.
7. **Exigir preview y confirmación para cambios sugeridos por IA.**
8. **Autoalojar las fuentes y reducir conexiones externas.**
9. **Firmar el ejecutable antes de una versión estable pública.**
10. **Agregar proceso de soporte, vulnerabilidades, actualizaciones y releases verificables.**

## Alcance recomendado para la primera versión estable

- Windows 10/11 x64.
- Descarga directa desde GitHub Releases o sitio oficial HTTPS.
- Aplicación gratuita o beta gratuita inicialmente.
- Sin cuentas, nube propia, colaboración en tiempo real ni telemetría.
- Mapas almacenados en el navegador local.
- Backup/exportación responsabilidad compartida, con recordatorios dentro de la app.
- Ollama local y proveedores cloud opcionales mediante BYOK.
- Claves cloud sólo en memoria en la primera versión estable; persistencia segura puede incorporarse después.
- Público general adulto. No promocionarla inicialmente para menores, escuelas, salud, finanzas, recursos humanos ni decisiones de alto impacto.
- Un conjunto reducido de proveedores cloud oficialmente soportados al comienzo, idealmente Gemini, OpenAI, Anthropic y Ollama. Los demás pueden quedar como experimentales o retirarse hasta probar términos, CORS, modelos y soporte.

Reducir proveedores disminuye pruebas, políticas, destinos de red, cambios de API y superficie contractual. Se pueden reincorporar con una checklist uniforme.

---

# 2. Decisiones de dirección que deben tomarse primero

Estas decisiones forman la **Puerta 0**. Ningún texto legal ni arquitectura definitiva debe cerrarse antes de responderlas.

## D-01 · Identidad del editor

Definir:

- persona física o sociedad que distribuye Noditos;
- nombre legal y nombre comercial;
- país y domicilio legal;
- email de soporte;
- email/canal privado de seguridad;
- titular del copyright y de la marca.

**Recomendación:** usar un dominio propio y correos como `soporte@...` y `seguridad@...`; no depender a largo plazo de una cuenta personal.

## D-02 · Licencia y modelo de negocio

Elegir una de estas rutas:

### Ruta A — Propietaria, recomendada para la primera beta si aún no está decidido

- Código visible pero sin permiso general de reutilización.
- `package.json`: `"license": "UNLICENSED"`.
- EULA/licencia de uso para usuarios finales.
- Aviso claro en README para evitar que “repositorio público” se interprete como open source.

### Ruta B — Open source

- Elegir MIT, Apache-2.0, GPL u otra licencia después de evaluar objetivos comerciales.
- Confirmar derechos de todos los contribuyentes y assets.
- Definir si se aceptan contribuciones y bajo qué reglas.

**No elegir una licencia sólo por ser popular.** Apache-2.0 aporta licencia expresa de patentes; GPL exige reciprocidad; MIT es permisiva pero no cubre todos los objetivos posibles.

Definir también si el producto será gratuito, pago único, suscripción, donación o freemium. Esto afecta términos, impuestos, garantías y soporte.

## D-03 · Mercados y usuarios

Resolver:

- países desde los que se distribuye y países objetivo;
- consumidores o empresas;
- edad mínima;
- educación/menores sí o no;
- sectores regulados permitidos/prohibidos.

**Recomendación inicial:** público general adulto, productividad personal, sin usos de decisión automatizada de alto impacto.

## D-04 · Canal de distribución

Elegir:

1. GitHub Releases;
2. sitio oficial;
3. Microsoft Store;
4. combinación.

**Recomendación:** GitHub Releases + página oficial simple. Evaluar Microsoft Store después de estabilizar firma, empaquetado, privacidad y soporte.

## D-05 · Nivel de soporte

Definir:

- sistemas Windows soportados;
- periodo mínimo de actualizaciones de seguridad;
- frecuencia prevista de releases;
- plazo objetivo para responder vulnerabilidades;
- política de fin de vida.

**Recomendación inicial:** soportar la última versión estable y la anterior durante al menos 12 meses desde cada release mayor; reevaluar el periodo según obligaciones del mercado. Si se comercializa en la UE, revisar específicamente el periodo de soporte exigible por CRA y consumo.

## Entregable de Puerta 0

Documento de una página `DECISIONES-PRODUCTO.md`, aprobado por las personas responsables, con respuestas a D-01 a D-05. No debe contener secretos.

---

# 3. Arquitectura objetivo para la versión publicable

## 3.1 Estado actual simplificado

```text
UI en navegador
 ├─ localStorage: mapas, historial y claves
 ├─ Google Fonts
 ├─ imágenes remotas
 └─ fetch directo a APIs de IA con la clave

Servidor local Node
 ├─ sirve archivos estáticos
 ├─ ping
 └─ detiene el proceso
```

## 3.2 Arquitectura recomendada

```text
UI en navegador
 ├─ localStorage: mapas e historial
 ├─ fuentes autoalojadas
 ├─ token de sesión del servidor local
 └─ /__noditos/ai/* sin recibir ni volver a mostrar la clave

Servidor local Node, sólo 127.0.0.1
 ├─ sirve archivos con CSP y cabeceras
 ├─ valida Host, Origin, Content-Type, método, tamaño y token
 ├─ mantiene claves cloud sólo en memoria
 ├─ proxy explícito a proveedores permitidos
 ├─ no registra prompts, respuestas ni claves
 ├─ límites de tiempo y tamaño
 └─ borrado de claves al detenerse

Proveedores externos
 └─ reciben únicamente prompt + contexto aprobado por el usuario
```

## 3.3 Decisión sobre persistencia de claves

### Primera versión segura: memoria solamente

Ventajas:

- implementación sencilla;
- la clave no queda en `localStorage`;
- menor riesgo y explicación más honesta;
- no requiere integración nativa compleja en SEA.

Desventaja: debe ingresarse en cada inicio de Noditos.

### Versión posterior: almacén seguro del sistema

Investigar por separado:

- Windows Credential Manager;
- DPAPI vinculada al usuario;
- compatibilidad con Node SEA y módulos nativos;
- migración y borrado;
- firma del código que accede al almacén;
- comportamiento portable del EXE.

No implementar “cifrado” con una clave fija incluida en el mismo JavaScript. Eso sólo ofusca.

## 3.4 Protección del servidor local

Cada endpoint sensible debe aplicar:

- host permitido: `127.0.0.1:<puerto>` y, si se usa, `localhost:<puerto>` de forma consistente;
- `Origin` exactamente igual al origen servido;
- token aleatorio por proceso en cabecera personalizada, no query string;
- `POST` con `application/json`;
- body máximo;
- timeout y abort de upstream;
- respuesta máxima;
- proveedor/modelo contra allowlist;
- sin CORS para orígenes externos;
- mensajes de error saneados;
- rate limit local para errores/bucles accidentales;
- logs sin query, body, Authorization ni claves.

El token no protege frente a XSS del mismo origen; la CSP, la eliminación de scripts remotos y la validación de entradas siguen siendo necesarias.

---

# 4. Plan de trabajo por fases

Las estimaciones son de esfuerzo orientativo en **días-persona**, no compromisos de calendario. Deben ajustarse después de prototipos y revisión legal.

## Fase 0 — Definición y control de alcance

**Objetivo:** evitar construir soluciones incompatibles con el modelo legal/comercial.

### Tareas

- [ ] Resolver D-01 a D-05.
- [ ] Nombrar responsable de producto, técnico, legal y seguridad; una persona puede cubrir varios roles, pero las responsabilidades deben ser explícitas.
- [ ] Crear inventario de contribuidores y procedencia de assets.
- [ ] Definir funciones que entran y no entran en v1.
- [ ] Congelar incorporación de proveedores IA y dependencias hasta limpiar el inventario.
- [ ] Definir clasificación de severidad y release gates.

### Entregables

- `DECISIONES-PRODUCTO.md`.
- Alcance de v1 y lista de exclusiones.
- Titularidad confirmada.
- Backlog priorizado.

### Esfuerzo orientativo

1–3 días internos + tiempo de decisión/consulta legal.

### Criterio de salida

No quedan campos “por definir” sobre editor, licencia, mercado, audiencia, canal y soporte.

---

## Fase 1 — Correcciones inmediatas de alto riesgo

**Objetivo:** crear una base apta para una beta interna, todavía no pública.

### Epic 1.1 · Claims y documentación insegura

- [ ] Eliminar recomendación de exclusión de antivirus.
- [ ] No presentar saltarse SmartScreen como solución normal.
- [ ] Cambiar “Ollama 100% privado” por una descripción condicional y comprobable.
- [ ] Cambiar afirmaciones absolutas como “conserva absolutamente todo”.
- [ ] Añadir advertencia de backup y almacenamiento por perfil del navegador.
- [ ] Documentar todas las conexiones externas actuales.

**Aceptación:** README y UI no prometen seguridad/privacidad absoluta ni aconsejan desactivar controles.

### Epic 1.2 · Dependencias

- [ ] Confirmar con análisis de bundle qué dependencias se incluyen.
- [ ] Eliminar dependencias directas no usadas.
- [ ] Reinstalar con `npm ci` y verificar lockfile.
- [ ] Sustituir `npx --yes postject` por el ejecutable bloqueado del proyecto.
- [ ] Revisar scripts de instalación de dependencias.

**Aceptación:** cada dependencia directa tiene uso, dueño, licencia, versión y justificación.

### Epic 1.3 · Límites de importación

Definir valores iniciales y probarlos. Propuesta:

- archivo de texto/JSON/XML: 10 MB;
- DOCX comprimido: 25 MB;
- XML principal descomprimido: 50 MB;
- máximo de entradas ZIP: 1.000;
- máximo total descomprimido: 100 MB;
- máximo de nodos importados: 10.000;
- máximo de profundidad: 100;
- máximo de caracteres por nodo/nota;
- rechazo temprano y mensaje comprensible.

Los valores deben validarse con mapas reales y memoria de equipos modestos.

- [ ] Centralizar límites.
- [ ] Validar antes de leer y después de descomprimir.
- [ ] Evitar bloqueo de UI con Worker si el procesamiento resulta costoso.
- [ ] Añadir fixtures hostiles y pruebas.

**Aceptación:** archivos fuera de límite se rechazan sin congelar ni cerrar Noditos.

### Epic 1.4 · Share links

- [ ] Mostrar advertencia de que Base64 no cifra.
- [ ] Indicar datos incluidos y tamaño.
- [ ] Confirmar antes de copiar.
- [ ] Aplicar límite de longitud/nodos al importar.
- [ ] Eliminar el hash de la barra inmediatamente después de importarlo, como ya intenta la app, y probar historial/errores.

**Aceptación:** el usuario entiende que cualquiera con el enlace puede leer el mapa.

### Esfuerzo orientativo de Fase 1

3–6 días-persona.

### Puerta 1

Apta para beta **interna**, sin datos sensibles y sin claves reales de producción.

---

## Fase 2 — Rediseño de IA y privacidad por diseño

**Objetivo:** resolver el mayor riesgo técnico y de privacidad.

### Epic 2.1 · Proxy local de IA

- [ ] Diseñar contrato común para proveedores: listar modelos, probar conexión, chat.
- [ ] Mover `askAi()` y `fetchProviderModels()` al servidor local.
- [ ] Mantener adaptadores de proveedor en servidor, no en bundle web.
- [ ] Endpoint para configurar clave en memoria.
- [ ] Endpoint para conocer sólo estado: configurado/no configurado y últimos 4 caracteres opcionales.
- [ ] Endpoint para borrar una o todas las claves.
- [ ] Limpiar claves al terminar proceso.
- [ ] Token de sesión en cabecera y validación estricta de origen.
- [ ] Timeout, tamaño, abort y manejo de errores.
- [ ] Probar que logs y errores nunca contienen claves ni prompts.

**Aceptación de seguridad:** buscar claves de prueba en DevTools storage, bundle, logs y respuestas; no deben aparecer salvo temporalmente en el campo antes de enviarlas al servidor local.

### Epic 2.2 · Minimización de contexto

Crear selector visible:

- sin contexto;
- nodo seleccionado;
- rama seleccionada;
- mapa completo.

**Recomendación por defecto:** nodo/rama, según herramienta. Nunca mapa completo implícito.

- [ ] Preview resumido de qué se enviará.
- [ ] Contador de nodos/caracteres.
- [ ] Excluir notas, responsables, fechas e imágenes por defecto.
- [ ] Toggle separado para notas/metadatos.
- [ ] Redacción manual antes de enviar.
- [ ] Recordar preferencia no sensible, no contenido.

**Aceptación:** cada request puede trazarse en tests a una decisión visible del usuario.

### Epic 2.3 · Consentimiento contextual

Antes del primer envío por proveedor y cuando cambien condiciones:

- proveedor y modelo;
- contenido incluido;
- posible coste;
- enlace a privacidad/términos;
- aviso sobre datos personales y secretos;
- limitaciones de IA;
- confirmación del usuario.

No usar una casilla genérica para justificar todo tratamiento futuro. La información debe permanecer accesible en ajustes.

### Epic 2.4 · Acciones de IA seguras

Cambiar flujo:

```text
Respuesta IA → validación de esquema → simulación → diff visible
→ usuario acepta/rechaza cada grupo → transacción → undo/historial
```

- [ ] Separar chat informativo de modo agente.
- [ ] El chat normal no debe ejecutar JSON accidental.
- [ ] Allowlist de acciones por herramienta.
- [ ] Límite de acciones y nodos afectados.
- [ ] Bloquear borrado de raíz, ciclos y referencias inexistentes.
- [ ] Confirmación reforzada para borrar/mover múltiples nodos.
- [ ] Aplicación transaccional: todo o nada.
- [ ] Snapshot previo automático.
- [ ] Marcar contenido del mapa como datos no confiables dentro del prompt.
- [ ] Tests de prompt injection en nodos, notas, archivos importados y respuestas.

**Aceptación:** ninguna respuesta remota modifica el mapa sin preview y acción humana inequívoca.

### Epic 2.5 · Proveedores soportados

Crear ficha por proveedor:

- endpoint y región;
- tipo de autenticación;
- modelos permitidos;
- políticas de datos y entrenamiento según tipo de cuenta;
- retención/configuración disponible;
- coste/cuotas;
- términos para uso cliente/BYOK;
- CORS ya irrelevante tras proxy, pero probar API;
- límites y errores;
- fecha de última revisión.

Retirar o marcar experimental cualquier proveedor sin ficha completa.

### Esfuerzo orientativo de Fase 2

8–15 días-persona, según cantidad de proveedores y profundidad del modo agente.

### Puerta 2

Apta para beta externa controlada con IA, después de revisión de privacidad y pruebas de seguridad del proxy.

---

## Fase 3 — Recursos externos, servidor y hardening

**Objetivo:** limitar el impacto de XSS, conexiones no esperadas y ataques al servicio local.

### Epic 3.1 · Autoalojar tipografías

- [ ] Elegir sólo pesos/familias realmente necesarias para la UI.
- [ ] Descargar desde fuente oficial.
- [ ] Guardar archivos WOFF2 y licencias correspondientes.
- [ ] Para las 50 fuentes opcionales, decidir entre paquete adicional, conjunto reducido o descarga explícita con aviso.
- [ ] Eliminar `fonts.googleapis.com`/`fonts.gstatic.com` del arranque.
- [ ] Probar funcionamiento offline.

**Recomendación:** reducir la biblioteca inicial de fuentes a un conjunto curado y autoalojado. Cincuenta familias elevan peso y mantenimiento de licencias.

### Epic 3.2 · Imágenes remotas

Elegir explícitamente una estrategia:

1. **Más privada:** eliminar imagen por URL en v1; sólo archivos locales incrustados.
2. **Equilibrada:** mantener URL con advertencia, HTTPS y `Referrer-Policy: no-referrer`.
3. **Proxy local:** no recomendado sin implementar defensa SSRF, límites, tipos MIME, DNS rebinding y redes privadas.

**Recomendación para v1:** archivos locales + URL como función experimental con advertencia.

### Epic 3.3 · CSP y cabeceras

Después de mover IA al proxy y autoalojar fuentes:

- [ ] CSP por cabecera, no sólo meta.
- [ ] `default-src 'self'`.
- [ ] `script-src 'self'` sin `unsafe-eval`.
- [ ] `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`.
- [ ] `connect-src 'self'`.
- [ ] `font-src 'self'`.
- [ ] `img-src 'self' data: blob:` y `https:` sólo si se mantienen URLs.
- [ ] estrategia segura de `style-src`; eliminar inline styles si impiden política estricta o usar hashes/nonces donde corresponda.
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy: no-referrer`.
- [ ] `Permissions-Policy` mínima.
- [ ] `Cache-Control: no-store` para HTML/token y endpoints sensibles.

No desplegar CSP sin modo Report-Only/pruebas, porque puede romper funciones dinámicas.

### Epic 3.4 · Servidor local

- [ ] Validación Host/Origin.
- [ ] Métodos explícitos y `405`.
- [ ] Límite de URL y body.
- [ ] timeouts del servidor.
- [ ] cabeceras uniformes incluso en errores.
- [ ] no fallback SPA para rutas con extensión o endpoints desconocidos.
- [ ] evitar detección falsa de otra app mediante ping autenticado o respuesta más específica.
- [ ] pruebas de traversal doblemente codificado, separadores Windows, NUL y rutas anómalas.
- [ ] revisar token de apagado y moverlo a cabecera.

### Esfuerzo orientativo de Fase 3

5–9 días-persona.

### Puerta 3

Aplicación sin conexiones al abrir, salvo las explícitamente habilitadas; hardening validado mediante tests de integración.

---

## Fase 4 — Licencias, privacidad y documentos de usuario

**Objetivo:** convertir decisiones y arquitectura definitiva en documentos correctos.

Esta fase puede comenzar en paralelo, pero los textos finales se cierran después de Fases 2 y 3 para describir el comportamiento real.

### Epic 4.1 · Licencia propia

- [ ] `LICENSE` o `EULA.md` según D-02.
- [ ] copyright en README/app.
- [ ] metadatos reales de `package.json`.
- [ ] política de contribuciones si aplica.
- [ ] confirmación de derechos de assets/contribuciones.

### Epic 4.2 · Terceros y SBOM

- [ ] Generar SBOM CycloneDX o SPDX en CI.
- [ ] Identificar sólo componentes realmente distribuidos.
- [ ] Agregar Node.js y sus notices.
- [ ] Agregar paquetes JavaScript incluidos en bundle.
- [ ] Agregar fuentes/íconos/assets.
- [ ] Resolver licencias duales.
- [ ] Crear `THIRD_PARTY_NOTICES.md` y mostrarlo en “Acerca de”.

### Epic 4.3 · Política de Privacidad

Borrador basado en inventario real y revisado jurídicamente. Debe distinguir:

- tratamiento exclusivamente local;
- contactos externos automáticos;
- contactos iniciados por usuario;
- rol de Noditos frente al proveedor IA;
- datos que el editor nunca recibe;
- datos que sí podría recibir por soporte, sitio o actualización;
- conservación y borrado;
- derechos y contacto.

### Epic 4.4 · Términos/EULA

- licencia de usuario final;
- alcance y sistemas soportados;
- contenido del usuario;
- IA, costes y terceros;
- usos prohibidos;
- backups y pérdida;
- actualizaciones/soporte;
- garantías y responsabilidad sin anular derechos obligatorios;
- terminación y contacto.

### Epic 4.5 · Transparencia dentro de la app

Pantalla “Acerca de y privacidad” con:

- editor/contacto;
- versión/build;
- ubicación de datos;
- privacidad;
- términos/licencia;
- terceros;
- seguridad;
- exportar backup;
- borrar datos/configuración;
- comprobar actualizaciones;
- periodo de soporte.

### Esfuerzo orientativo de Fase 4

3–6 días técnicos + revisión jurídica externa.

### Puerta 4

Un revisor puede comparar cada afirmación documental con una prueba o ruta de código y no encuentra contradicciones.

---

## Fase 5 — Accesibilidad y calidad del producto

**Objetivo:** evitar publicar una herramienta visual imposible de usar para parte del público.

### Auditoría

- [ ] Navegación completa sólo con teclado.
- [ ] NVDA en Windows.
- [ ] Zoom 200%/400% y resoluciones pequeñas.
- [ ] contraste de texto, iconos, bordes y foco.
- [ ] reducción de movimiento.
- [ ] orden y restauración de foco en modales.
- [ ] nombres accesibles de botones de icono.
- [ ] anuncios de toasts/errores/estado.
- [ ] alternativa a drag-and-drop.
- [ ] operación del lienzo, nodos e inspector sin mouse.
- [ ] idioma y títulos.

### Automatización

- [ ] axe sobre pantallas principales.
- [ ] reglas de lint accesible.
- [ ] tests de tabulación/modales.
- [ ] checklist manual por release mayor.

### Entregables

- declaración de accesibilidad;
- limitaciones conocidas;
- canal para reportar barreras;
- evidencia de WCAG 2.2 AA por criterio aplicable.

### Esfuerzo orientativo

5–12 días-persona; el lienzo puede requerir rediseño significativo.

### Puerta 5

No hay bloqueantes WCAG A/AA conocidos en los flujos principales o están documentados con plan y justificación revisada.

---

## Fase 6 — Cadena de suministro, firma y releases

**Objetivo:** que un usuario pueda verificar quién produjo el EXE y de qué código proviene.

### Epic 6.1 · CI obligatoria

En cada pull request:

- [ ] `npm ci`.
- [ ] typecheck.
- [ ] tests unitarios/integración.
- [ ] build.
- [ ] `npm audit`/Dependabot.
- [ ] secret scanning/push protection.
- [ ] análisis estático.
- [ ] revisión de licencias.
- [ ] dependency review.
- [ ] tests de servidor/seguridad.

En releases:

- [ ] build limpio desde tag protegido.
- [ ] SBOM.
- [ ] checksum.
- [ ] firma.
- [ ] attestation de procedencia.
- [ ] notas de versión.

### Epic 6.2 · Runtime Node

- [ ] Confirmar versión LTS soportada.
- [ ] Verificar paquete/binario contra checksum oficial independiente.
- [ ] Conservar licencia/notices.
- [ ] Documentar actualización de Node ante CVEs.
- [ ] No usar caché sin volver a verificar hash.

### Epic 6.3 · Authenticode

Pipeline:

```text
build web → preparar SEA → copiar Node → quitar firma inválida del Node base
→ inyectar assets → verificar frescura/estructura → firmar Noditos.exe
→ timestamp → verificar firma → hash → publicar
```

- [ ] Certificado a nombre del editor.
- [ ] Clave en HSM/servicio seguro, nunca en repositorio.
- [ ] Timestamp RFC 3161.
- [ ] Verificación automática del subject, cadena, timestamp y hash.
- [ ] Procedimiento de revocación/rotación.

### Epic 6.4 · Releases

- [ ] SemVer y changelog.
- [ ] Tag firmado/protegido.
- [ ] GitHub Release inmutable si está disponible.
- [ ] EXE, SHA-256, SBOM, notices y firma.
- [ ] Página de descarga que explique cómo verificar.
- [ ] No reemplazar silenciosamente archivos de una versión.

### Esfuerzo orientativo

4–8 días-persona, excluyendo adquisición/verificación del certificado.

### Puerta 6

Un equipo limpio puede descargar una release, verificar firma/hash/attestation y asociarla al commit/tag correcto.

---

## Fase 7 — Seguridad operativa y actualizaciones

**Objetivo:** poder responder después de publicar.

### Epic 7.1 · Política de seguridad

`SECURITY.md` con:

- versiones soportadas;
- reporte privado;
- datos requeridos y qué no enviar públicamente;
- tiempo de acuse;
- proceso de triage;
- divulgación coordinada;
- safe harbor razonable;
- idioma de contacto.

Habilitar private vulnerability reporting en GitHub.

### Epic 7.2 · Actualizaciones

Primera implementación recomendada:

- comprobación manual “Buscar actualización”;
- consulta HTTPS a manifiesto firmado o GitHub Releases;
- mostrar versión, cambios, hash y enlace oficial;
- no descargar/ejecutar automáticamente al principio;
- sin identificadores persistentes ni telemetría.

Después puede evaluarse auto-update firmado.

### Epic 7.3 · Incidentes

Playbook para:

- clave/certificado comprometido;
- dependencia vulnerable;
- EXE falso o release alterada;
- fuga de datos por proveedor;
- vulnerabilidad explotada;
- retirada de release;
- comunicación a usuarios/autoridades;
- CRA/otros reportes si aplican.

### Epic 7.4 · Mantenimiento

- revisión semanal de alertas críticas;
- revisión mensual de dependencias;
- SLA propuesto: crítica 72 h para triage y mitigación prioritaria; alta 7–14 días según exposición;
- ejercicio semestral de restauración/build/revocación;
- revisión legal anual y ante cambios de datos/proveedores/mercados.

### Esfuerzo orientativo

3–6 días iniciales + operación continua.

### Puerta 7

Existe una persona responsable y un procedimiento probado para recibir, corregir, publicar y comunicar una vulnerabilidad.

---

# 5. Estrategia de pruebas

## 5.1 Unitarias

- límites y saneamiento;
- validación de acciones IA;
- selección/minimización de contexto;
- migraciones de configuración;
- generación/parsing de formatos;
- URLs y hosts permitidos.

## 5.2 Integración del servidor

- métodos y cabeceras;
- Host/Origin/token;
- body grande/malformado;
- traversal y encoding;
- timeout upstream;
- proveedor inválido;
- errores sin secretos;
- apagado y limpieza de memoria;
- dos instancias/puertos ocupados.

## 5.3 Adversariales

- ZIP bomb y muchas entradas;
- XML/JSON profundamente anidado;
- share hash enorme;
- imágenes corruptas;
- nodos con instrucciones de prompt injection;
- respuesta IA con acciones no permitidas;
- acciones cíclicas/masivas;
- proveedor que devuelve HTML, megabytes o JSON incompleto;
- XSS persistente a través de importaciones y nombres/metadatos.

## 5.4 Privacidad

Con proxy de red durante pruebas:

- abrir app sin interacción: cero conexiones externas esperadas;
- usar fuente local: cero Google requests;
- IA: sólo host del proveedor elegido;
- confirmar que contenido no seleccionado no sale;
- confirmar que claves no aparecen en storage/log/URL/historial/respuestas;
- borrar configuración: estado y memoria eliminados.

## 5.5 Release

- Windows soportados y usuario sin privilegios admin;
- SmartScreen/firma;
- antivirus reputado;
- ruta con espacios/Unicode/sólo lectura;
- múltiples perfiles de navegador;
- backup/restauración entre versión anterior y nueva;
- instalación/ejecución offline;
- cierre limpio y procesos huérfanos;
- verificación de hash/SBOM/attestation.

---

# 6. Backlog sugerido en orden estricto

## Bloque A — Esta semana de trabajo técnico

1. Crear `DECISIONES-PRODUCTO.md` con responsables y supuestos.
2. Corregir claims y README inseguro.
3. Eliminar dependencias sin uso.
4. Poner límites a importaciones/share hash.
5. Añadir tests de archivos hostiles.
6. Crear prototipo del proxy local de un solo proveedor.

## Bloque B — Camino crítico

7. Generalizar proxy y quitar claves de Web Storage.
8. Selector/preview de contexto IA.
9. Preview transaccional de acciones IA.
10. Autoalojar fuentes.
11. CSP, cabeceras y hardening de servidor.
12. Tests de integración/privacidad.

## Bloque C — Publicación

13. Licencia propia y metadatos.
14. Política de Privacidad y Términos revisados.
15. Third-party notices y SBOM.
16. Pantalla Acerca de/Privacidad/Borrar datos.
17. `SECURITY.md` y private reporting.
18. CI y pipeline de release.
19. Authenticode y attestations.
20. Auditoría de accesibilidad y seguridad.

## Bloque D — Operación

21. Canal de actualización manual firmado.
22. Release candidate con beta externa.
23. Corregir hallazgos de beta.
24. Publicar v1 estable sólo al superar todas las puertas.

---

# 7. Plan de beta

## Beta interna

**Participantes:** equipo y personas de confianza.  
**Datos:** ficticios/no sensibles.  
**Objetivo:** estabilidad, importaciones, backups, proxy y flujos de IA.

Debe existir al menos:

- límites de archivos;
- claves no persistentes;
- logs saneados;
- disclaimer de beta;
- backup probado;
- reporte de errores.

## Beta externa cerrada

**Participantes:** grupo pequeño invitado.  
**Objetivo:** compatibilidad real, comprensión de privacidad, accesibilidad y soporte.

Requisitos previos:

- privacidad/términos beta;
- consentimiento IA;
- ejecutable firmado idealmente, o distribución excepcional claramente identificada y limitada;
- canal de seguridad;
- versión y checksums;
- encuesta sin telemetría obligatoria;
- procedimiento para retirar una build.

## Release candidate

- feature freeze;
- traducciones/textos congelados;
- auditoría jurídica final;
- auditoría de seguridad;
- WCAG;
- SBOM/licencias;
- firma y procedencia;
- simulacro de incidente/update;
- restauración desde backup de versión anterior.

---

# 8. Gates de “no publicar”

La versión estable no debe publicarse si se cumple cualquiera:

- [ ] editor o licencia sin definir;
- [ ] Política de Privacidad/Términos no corresponden al comportamiento real;
- [ ] claves cloud en `localStorage` por defecto;
- [ ] mapa completo enviado sin elección explícita;
- [ ] IA modifica/borrar nodos sin preview y confirmación;
- [ ] EXE sin firma de editor;
- [ ] falta SBOM/notices de componentes distribuidos;
- [ ] vulnerabilidad crítica/alta explotable conocida sin mitigar;
- [ ] falta canal privado de seguridad;
- [ ] no existe backup/restauración probado;
- [ ] la app conecta con terceros al abrir sin informarlo/necesitarlo;
- [ ] falla verificación de release, tests o firma;
- [ ] claims absolutos o instrucciones para desactivar protecciones siguen publicados.

---

# 9. Métricas de preparación

No medir sólo “cantidad de tareas cerradas”. Usar:

| Área | Métrica de salida |
|---|---|
| Claves | 0 secretos persistentes en Web Storage; 0 apariciones en logs/URLs |
| Privacidad | 100% de destinos externos inventariados y explicados |
| IA | 100% de requests con alcance visible; 100% de mutaciones confirmadas |
| Dependencias | 100% de directas justificadas/licenciadas; 0 críticas/altas conocidas |
| Importación | corpus adversarial rechazado dentro de límites de memoria/tiempo |
| Release | firma válida + hash + SBOM + attestation asociados al tag |
| Seguridad | canal privado y playbook probado |
| Accesibilidad | flujos principales WCAG 2.2 AA evaluados |
| Recuperación | backup anterior restaurado correctamente en release candidate |
| Documentos | todas las afirmaciones trazables a comportamiento probado |

---

# 10. Estimación global y forma de ejecución

## Esfuerzo técnico orientativo

| Fase | Esfuerzo |
|---|---:|
| 0. Definiciones | 1–3 días |
| 1. Riesgos inmediatos | 3–6 días |
| 2. IA y privacidad | 8–15 días |
| 3. Hardening/recursos | 5–9 días |
| 4. Documentos/licencias técnicos | 3–6 días + legal |
| 5. Accesibilidad | 5–12 días |
| 6. Firma/CI/releases | 4–8 días |
| 7. Operación/updates | 3–6 días |
| **Total técnico aproximado** | **32–65 días-persona** |

No incluye esperas por certificado, revisión jurídica, rediseños extensos de accesibilidad ni hallazgos de auditoría externa.

## Ejecución recomendada

Trabajar en paquetes pequeños y revisables:

1. una issue por hallazgo/entregable;
2. una rama/PR por epic manejable;
3. criterio de aceptación dentro de la issue;
4. tests en el mismo PR;
5. actualización del inventario de datos/licencias cuando cambie arquitectura;
6. demo y revisión de seguridad para endpoints/IA;
7. no mezclar rediseño visual general con hardening.

## Paralelización posible

Después de Puerta 0:

- **Carril técnico A:** proxy IA y acciones seguras.
- **Carril técnico B:** límites, servidor, CSP, fuentes y tests.
- **Carril legal/producto:** licencia, inventario de datos, borradores y claims.
- **Carril release:** CI, SBOM y firma.
- **Carril UX:** Acerca de, consentimiento, contexto y accesibilidad.

Los textos legales finales dependen de A/B; la release estable depende de todos.

---

# 11. Próximo paso concreto

La primera iteración debería producir, en este orden:

1. **Decisiones del producto respondidas.**
2. **Backlog en GitHub** derivado de los epics de este documento.
3. **PR 1:** claims/README, metadatos provisionales y limpieza de dependencias.
4. **PR 2:** límites de importación + pruebas adversariales.
5. **PR 3:** proxy local para un proveedor, clave sólo en memoria y pruebas.
6. Revisión del prototipo antes de migrar todos los proveedores.

La decisión técnica más importante es validar primero el proxy local con un proveedor. Si funciona correctamente dentro del ejecutable SEA, el resto del plan de privacidad y CSP se simplifica. Si no funciona, se debe elegir entre IA exclusivamente local con Ollama para v1 o una aplicación/backend distinto; no conviene volver a `localStorage` como solución permanente.
