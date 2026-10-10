import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import { stringify } from 'yaml';
import {
  ACTIVITIES_DIR,
  GALLERY_PATH,
  PLANNING_DIR,
  parseContentFiles,
} from '../../packages/content-model/src/content-files.ts';
import { readContentFiles } from '../../packages/content-model/src/read-content.ts';
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
      server.watcher.add(resolve('content'));
      server.watcher.on('all', (_event, file) => {
        if (!normalizePath(file).includes('/content/')) return;
        for (const name of names) {
          const mod = server.moduleGraph.getModuleById('\0' + name);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      });
    },
    async load(id) {
      if (id === '\0' + virtualMascots) {
        const poses = await usedMascotPoses(resolve('content'));
        const dir = resolve('content/assets/mascotas/png');
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
      const all = await readContentFiles(resolve('.'));
      for (const path of all.keys()) this.addWatchFile(resolve(path));
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
      for (const [path, text] of all) {
        if (path === GALLERY_PATH || path.startsWith('content/lessons/')) continue;
        if (path.startsWith(`${ACTIVITIES_DIR}/`)) {
          const activity = Object.entries(bundle.activityPaths).find(
            ([, p]) => p === path,
          )?.[0];
          if (!includeDrafts() && (!activity || !used.has(activity))) continue;
        }
        if (path.startsWith(`${PLANNING_DIR}/`) && !includeDrafts()) {
          // En el sitio público la planificación solo nombra clases publicadas.
          const planning = bundle.planningPath === path ? bundle.planning : null;
          if (!planning) continue;
          files[path] = stringify({
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
        for (const slide of [...lesson.slides, ...lesson.repaso]) {
          files[slide.path] = slide.text;
          const name = `slide${counter++}`;
          imports.push(
            `import ${name} from ${JSON.stringify(normalizePath(resolve(slide.path)))};`,
          );
          compiled.push(`${JSON.stringify(slide.path)}:${name}`);
        }
      }
      return `${imports.join('\n')}\nexport const buildFiles=${JSON.stringify(files)};\nexport const compiledSlides={${compiled.join(',')}};`;
    },
  };
}
