import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { compileChecked } from '../packages/content-model/src/check-source';
import { checkContentFiles } from '../packages/content-model/src/check-content';
import { readContentFiles } from '../packages/content-model/src/read-content';
import {
  mascotPngPath,
  usedMascotPoses,
} from '../packages/content-model/src/used-poses';
export async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? walk(join(dir, e.name))
          : Promise.resolve([join(dir, e.name)]),
      ),
    )
  ).flat();
}
function git(...args: string[]): string | undefined {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' });
  } catch {
    return undefined;
  }
}
/**
 * Todas las PNG viven en disco; git y el sitio solo llevan las poses que el contenido usa.
 * Una pose usada que git ignora es un error; una versionada que ya nadie usa, un aviso
 * (la app puede dejar de usar una pose al guardar y no debe romper la publicación).
 */
async function checkMascotAssets(root: string) {
  const pngDir = join(root, 'assets', 'mascotas', 'png');
  const used = await usedMascotPoses(root);
  const usedSet = new Set(used);
  const problems: string[] = [];
  const warnings: string[] = [];
  for (const pose of used) {
    try {
      const path = await mascotPngPath(pngDir, pose);
      if (git('check-ignore', '-q', path) !== undefined)
        problems.push(
          `La pose ${pose} se usa pero git la ignora: añade "!content/assets/mascotas/png/${pose}-*.png" a .gitignore.`,
        );
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }
  const tracked = git('ls-files', '-z', '--', 'content/assets/mascotas/png');
  for (const file of (tracked ?? '').split('\0').filter(Boolean)) {
    const pose = Number(/^(\d+)-/.exec(basename(file))?.[1]);
    if (!usedSet.has(pose))
      warnings.push(
        `${file} está versionado pero ninguna diapositiva ni plantilla lo usa: puedes quitarlo de git (git rm --cached) y de la lista de .gitignore.`,
      );
  }
  return { problems, warnings };
}
export { compileChecked };
export async function checkContent() {
  const result = await checkContentFiles(await readContentFiles(resolve('.')));
  const assets = await checkMascotAssets(resolve('content'));
  const problems = [
    ...result.problems.map((p) => `${p.path}: ${p.message}`),
    ...assets.problems,
  ];
  for (const warning of [
    ...result.warnings.map((w) => `${w.path}: ${w.message}`),
    ...assets.warnings,
  ])
    console.warn(`Aviso: ${warning}`);
  if (problems.length)
    throw new Error(
      `content:check encontró ${problems.length} problema(s):\n- ${problems.join('\n- ')}`,
    );
  const { lessons, slides, activities } = result.summary;
  console.log(
    `Contenido válido: ${lessons} clase(s), ${slides} diapositivas, ${activities} actividad(es).`,
  );
}
if (process.argv[1]?.endsWith('content-check.ts')) await checkContent();
