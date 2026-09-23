#!/usr/bin/env node
/* Inspecciona (y opcionalmente limpia) la firma Authenticode de un PE.
 * Uso:
 *   node pe-signature.js <archivo.exe>            -> informa estado
 *   node pe-signature.js <archivo.exe> --strip    -> quita la firma (trunca + zeroes)
 */
"use strict";
const fs = require("fs");
const file = process.argv[2];
const strip = process.argv.includes("--strip");
const buf = fs.readFileSync(file);

if (buf.readUInt16LE(0) !== 0x5a4d) throw new Error("No es un PE (falta MZ)");
const peOff = buf.readUInt32LE(0x3c);
if (buf.readUInt32LE(peOff) !== 0x00004550) throw new Error("Falta firma PE");
const coff = peOff + 4;
const numSections = buf.readUInt16LE(coff + 2);
const optSize = buf.readUInt16LE(coff + 16);
const opt = coff + 20;
const magic = buf.readUInt16LE(opt);
if (magic !== 0x20b) throw new Error("No es PE32+ (magic " + magic.toString(16) + ")");
const ddOff = opt + 112; // DataDirectory en PE32+
const secDirOff = ddOff + 4 * 8; // índice 4 = Security (Certificate Table)
let secVA = buf.readUInt32LE(secDirOff);
let secSize = buf.readUInt32LE(secDirOff + 4);

console.log(`archivo:        ${file}`);
console.log(`tamaño:         ${buf.length}`);
console.log(`secciones:      ${numSections}`);
console.log(`security dir:   VA=0x${secVA.toString(16)} size=${secSize}`);
if (secVA === 0 || secSize === 0) {
  console.log("firma:          (sin firma Authenticode)");
  process.exit(0);
}
console.log(`firma:          PRESENTE (blob al final: ${secSize} bytes desde offset ${secVA})`);
console.log(`bytes tras blob: ${buf.length - (secVA + secSize)}`);

if (strip) {
  const out = Buffer.from(buf); // copia editable
  // 1) Truncar el blob de firma (es lo último del archivo).
  const truncated = out.subarray(0, secVA);
  // 2) Poner en cero la entrada del directorio Security.
  truncated.writeUInt32LE(0, secDirOff);
  truncated.writeUInt32LE(0, secDirOff + 4);
  // El CheckSum del optional header queda desactualizado; Windows lo recalcula
  // al cargar si difiere — no es bloqueante, pero lo ponemos en 0 por prolijidad.
  truncated.writeUInt32LE(0, opt + 64);
  fs.writeFileSync(file, truncated);
  console.log(`STRIP OK:       ${file} ahora sin firma, ${truncated.length} bytes`);
}
