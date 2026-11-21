// Velvet Shadow's hand-in program (Node 22, standard library only). The game itself is
// the static bundle in game/ — plain files a desktop browser opens offline — and this
// program is how it is entered: it copies game/ and screenshots/ from beside this file
// into the output directory and writes dossier.json there with buildDossier from the
// vendored make.fun library, so the dossier is exactly the one the gate rebuilds and
// compares.
//
// Run it locally the way the grader does, with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game first with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy one of the entry's folders into the output, creating the output as needed. */
function handIn(folder) {
  const from = join(repoRoot, folder);
  if (!existsSync(from)) return;
  mkdirSync(join(outputDir, folder), { recursive: true });
  cpSync(from, join(outputDir, folder), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
handIn('game');
handIn('screenshots');

// The caps buildDossier enforces are the gate's own: at most 4 screenshots of 256 KiB,
// at most 993 game files and 48 MiB of them, no game path over 1,000 bytes, and the
// dossier's source text held to 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
