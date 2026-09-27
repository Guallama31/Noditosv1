# Decisiones de producto para la publicación de Noditos

**Estado:** aprobado para avanzar con la beta; contiene bloqueos explícitos para la versión estable.  
**Fecha:** 26 de septiembre de 2026

## Decisiones adoptadas

| Área | Decisión | Estado |
|---|---|---|
| Editor | Persona física | Falta nombre legal, país y contactos públicos |
| Licencia | Aún no decidida | `UNLICENSED` provisional; bloquea versión estable |
| Modelo inicial | Gratuito | Confirmado para la beta |
| Audiencia | Personas adultas, alcance global | Confirmado |
| Uso previsto | Productividad personal y mapas mentales | Confirmado |
| Usos excluidos | Menores como audiencia objetivo; decisiones médicas, jurídicas, financieras, laborales u otras de alto impacto | Confirmado para v1 |
| Primer proveedor del proxy | Gemini | Confirmado |
| Distribución | GitHub Releases | Confirmado |
| Firma | Sin certificado Authenticode disponible todavía | Bloquea versión estable pública |
| Soporte | Beta sin SLA declarado | Debe definirse antes de versión estable |
| Telemetría | Ninguna por defecto | Decisión recomendada para v1 |
| Cuentas/nube propia | No incluidas en v1 | Decisión recomendada para v1 |

## Identidad pendiente del editor

Antes de publicar documentos legales finales se deben completar:

- **Nombre legal:** pendiente.
- **País y domicilio legal:** pendiente.
- **Email de soporte:** pendiente.
- **Canal privado/email de seguridad:** pendiente.
- **Nombre comercial y dominio, si existen:** pendiente.
- **Titular del copyright y de la marca:** pendiente.

No deben reemplazarse estos campos con datos inventados.

## Licencia provisional

Mientras no se elija una licencia definitiva:

- el paquete declara `UNLICENSED`;
- el repositorio público no debe presentarse como open source;
- no se concede autorización general de copia, modificación o redistribución;
- la versión estable queda bloqueada;
- debe verificarse la titularidad de contribuciones, diseños, imágenes, textos y marca.

## Alcance de la beta

- Windows x64.
- Distribución limitada mediante GitHub Releases.
- Aplicación local-first, sin cuentas ni sincronización propia.
- Mapas e historial en el almacenamiento del perfil del navegador.
- IA opcional.
- Gemini será el primer proveedor migrado al proxy local.
- Las claves no deben persistirse en Web Storage en la arquitectura objetivo.
- No se permite presentar la beta como adecuada para información sensible o decisiones de alto impacto.
- Los participantes deben realizar backups y conocer que la beta puede contener errores.

## Condiciones para decidir la versión estable

La versión estable no puede publicarse hasta resolver:

1. identidad y contacto del editor;
2. licencia definitiva/EULA;
3. periodo de soporte y Windows soportados;
4. certificado Authenticode;
5. Política de Privacidad y Términos revisados;
6. criterios técnicos y legales de `PLAN-PUBLICACION.md`.

## Registro de cambios

Toda modificación de estas decisiones debe indicar fecha, responsable, motivo e impacto sobre privacidad, términos, arquitectura y releases.
