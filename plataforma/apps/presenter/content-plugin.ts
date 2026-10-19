import { normalizePath, type Plugin } from 'vite';
import { stringify } from 'yaml';
import {
  CONTENT_ROOT,
  GALLERY_PATH,
  isActivityPath,
  isLessonPath,
  isPlanningPath,
  parseContentFiles,
} from '../../packages/content-model/src/content-files.ts';
import { MASCOT_PNG_DIR } from '../../packages/content-model/src/poses.ts';
import {
  readContentFiles,
  repoPath,
} from '../../packages/content-model/src/read-content.ts';
import {
  mascotPngPath,
  usedMascotPoses,
} from '../../packages/content-model/src/used-poses.ts';

/**
 * El contenido se empaqueta en build: los archivos de texto (para leerlos igual que desde
 * GitHub) y cada lámina precompilada. Los borradores nunca entran en el bundle público.
 */
export function contentPlugin(): Plugin {
  let production = false;
  const includeDrafts = () =>
    !production || process.env.AULA_INCLUDE_DRAFTS === '1';
  const virtual = 'virtual:aula-catalog';
  const virtualMascots = 'virtual:aula-mascots';
  const names = [virtual, virtualMascots];
  return {
    name: 'aula-content-catalog',
    configResolved(config) {
      production = config.command === 'build';
    },
    resolveId(id) {
      if (names.includes(id)) return '\0' + id;
    },
    configureServer(server) {
      server.watcher.add(repoPath(CONTENT_ROOT));
      server.watcher.on('all', (_event, file) => {
        if (!normalizePath(file).includes(`/${CONTENT_ROOT}/`)) return;
        for (const name of names) {
          const mod = server.moduleGraph.getModuleById('\0' + name);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      });
    },
    async load(id) {
      if (id === '\0' + virtualMascots) {
        const poses = await usedMascotPoses();
        const dir = repoPath(MASCOT_PNG_DIR);
        const paths = await Promise.all(
          poses.map((pose) => mascotPngPath(dir, pose)),
        );
        const imports = paths.map(
          (path, i) =>
            `import pose${poses[i]} from ${JSON.stringify(normalizePath(path) + '?url')};`,
        );
        const entries = poses.map((pose) => `${pose}:pose${pose}`);
        return `${imports.join('\n')}\nexport const mascotFiles={${entries.join(',')}};`;
      }
      if (id !== '\0' + virtual) return;
      const all = await readContentFiles();
      for (const path of all.keys()) this.addWatchFile(repoPath(path));
      const bundle = parseContentFiles(all);
      const lessons = bundle.lessons.filter(
        (lesson) => includeDrafts() || lesson.meta.status !== 'draft',
      );
      const included = new Set(lessons.map((lesson) => lesson.meta.id));
      const used = new Set(
        lessons.flatMap((l) =>
          [...l.slides, ...l.repaso].flatMap((s) => s.slide.activities),
        ),
      );
      const files: Record<string, string> = {};
      // Los archivos de cada clase (clase.yaml, guía y láminas) se agregan abajo, solo si entra.
      const lessonDirs = bundle.lessons.map((lesson) => `${lesson.dir}/`);
      for (const [path, text] of all) {
        if (path === GALLERY_PATH) continue;
        if (isActivityPath(path)) {
          const activity = Object.entries(bundle.activityPaths).find(
            ([, p]) => p === path,
          )?.[0];
          if (!includeDrafts() && (!activity || !used.has(activity))) continue;
          files[path] = text;
          continue;
        }
        if (
          isLessonPath(path) ||
          lessonDirs.some((dir) => path.startsWith(dir))
        )
          continue;
        if (isPlanningPath(path) && !includeDrafts()) {
          // En el sitio público la planificación solo nombra clases publicadas.
          const planning = bundle.plannings.find(
            (item) => item.path === path,
          )?.planning;
          if (!planning) continue;
          files[path] = stringify({
            ...(planning.id ? { id: planning.id } : {}),
            ...(planning.title ? { title: planning.title } : {}),
            units: planning.units
              .map((unit) => ({
                ...unit,
                lessons: unit.lessons.filter((l) => included.has(l.id)),
              }))
              .filter((unit) => unit.lessons.length),
          });
          continue;
        }
        files[path] = text;
      }
      const imports: string[] = [];
      const compiled: string[] = [];
      let counter = 0;
      for (const lesson of lessons) {
        files[lesson.path] = lesson.text;
        if (lesson.guide) files[lesson.guide.path] = lesson.guide.text;
        for (const slide of [...lesson.slides, ...lesson.repaso]) {
          files[slide.path] = slide.text;
          const name = `slide${counter++}`;
          imports.push(
            `import ${name} from ${JSON.stringify(normalizePath(repoPath(slide.path)))};`,
          );
          compiled.push(`${JSON.stringify(slide.path)}:${name}`);
        }
      }
      return `${imports.join('\n')}\nexport const buildFiles=${JSON.stringify(files)};\nexport const compiledSlides={${compiled.join(',')}};`;
    },
  };
}
