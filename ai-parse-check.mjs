import { parseQA, parseSuggestionList, parseOutline, parseIndexList, parseIndexGroups } from './src/lib/ai.ts';

const cases = [
  ['suggestions-json', () => parseSuggestionList(`\`\`\`json
["Idea A","Idea B","Idea C"]
\`\`\``)],
  ['suggestions-plain', () => parseSuggestionList(`Ideas:
- Idea A
- Idea B
- Idea C`)],
  ['qa-json', () => parseQA(`\`\`\`json
[{"q":"¿Qué es esto?","a":"Es una idea"},{"q":"¿Qué sigue?","a":"Validar"}]
\`\`\``)],
  ['qa-plain', () => parseQA(`Pregunta: ¿Qué es esto?
Respuesta: Es una idea
Pregunta: ¿Qué sigue?
Respuesta: Validar`)],
  ['outline-json', () => parseOutline(`\`\`\`json
[{"level":0,"text":"Objetivo"},{"level":1,"text":"Atraer usuarios"}]
\`\`\``)],
  ['outline-plain', () => parseOutline(`- Objetivo
  - Atraer usuarios
  - Medir ROI`)],
  ['order', () => parseIndexList('[2,0,1]', 3)],
  ['groups', () => parseIndexGroups('[[0,2],[3,4]]', 5)],
];

let failed = 0;
for (const [name, fn] of cases) {
  try {
    const value = fn();
    console.log(name + ': OK ' + JSON.stringify(value));
  } catch (error) {
    failed += 1;
    console.log(name + ': ERROR ' + error.message);
  }
}

if (failed > 0) process.exit(1);
