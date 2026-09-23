#!/usr/bin/env node
/* Genera sea-config.json dentro del stage de empaquetado.
 * Uso: node tools/make-sea-config.cjs <carpeta-stage>
 * El stage debe contener server.cjs, dist/ y build-info.json.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const stage = process.argv[2];
if (!stage || !fs.existsSync(path.join(stage, "server.cjs")) || !fs.existsSync(path.join(stage, "dist", "index.html"))) {
  console.error("Uso: node tools/make-sea-config.cjs <carpeta-stage con server.cjs, dist/ y build-info.json>");
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(stage, dir), { withFileTypes: true })) {
    const rel = dir === "." ? e.name : dir + "/" + e.name;
    if (e.isDirectory()) walk(rel);
    else files.push(rel);
  }
})("dist");

const assets = { "build-info.json": "build-info.json" };
for (const f of files) assets[f] = f;

fs.writeFileSync(
  path.join(stage, "sea-config.json"),
  JSON.stringify(
    {
      main: "server.cjs",
      output: "sea-prep.blob",
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: false,
      assets,
    },
    null,
    2
  )
);
console.log("assets incrustados: " + (files.length + 1));
