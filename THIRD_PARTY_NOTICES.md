# Componentes y avisos de terceros

Este inventario acompaña la beta y debe regenerarse desde el artefacto de cada release. El SBOM CycloneDX generado por npm es la fuente legible por máquina; este archivo no sustituye los textos completos de licencia.

## Runtime distribuido

- **Node.js 22.23.2** — licencia MIT y componentes de terceros incluidos por Node.js. La release debe acompañar el `LICENSE` oficial correspondiente a esa versión: https://github.com/nodejs/node/blob/v22.23.2/LICENSE

## Dependencias de ejecución directas

Las versiones exactas están fijadas en `package-lock.json`.

- `react` — MIT.
- `react-dom` — MIT.
- `lucide-react` — ISC.
- `docx` — MIT.
- `jszip` — MIT o GPL-3.0-or-later; Noditos usa la opción MIT.

Sus dependencias transitivas y licencias figuran en el SBOM de release.

## Tipografías

- **Bricolage Grotesque** — SIL Open Font License 1.1. Texto: `src/assets/fonts/licenses/Bricolage-Grotesque-OFL.txt`.
- **Instrument Sans** — SIL Open Font License 1.1. Texto: `src/assets/fonts/licenses/Instrument-Sans-OFL.txt`.

Fuentes obtenidas del repositorio oficial Google Fonts. No se modificaron sus nombres reservados.

## Iconos y servicios

Los iconos de interfaz provienen de Lucide. Los nombres Gemini, Google, OpenAI, Anthropic y otros pertenecen a sus respectivos titulares; su mención identifica compatibilidad y no implica afiliación.

## Obligación de release

Antes de publicar una versión se debe:

1. generar el SBOM desde el lockfile/build limpio;
2. revisar componentes realmente distribuidos;
3. incluir licencias/NOTICE exigidos;
4. conservar este documento, los OFL y la licencia de Node junto al artefacto;
5. bloquear la release si aparece una licencia no aprobada o sin identificar.
