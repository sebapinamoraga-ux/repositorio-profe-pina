import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import { parse } from 'yaml';
import {
  lessonSchema,
  activitySchema,
  slideSchema,
} from '../../packages/content-model/src/index.ts';
import { parseFrontmatter } from '../../packages/content-model/src/frontmatter.ts';
import {
  mascotPngPath,
  usedMascotPoses,
} from '../../packages/content-model/src/used-poses.ts';

async function files(root: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(root, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? files(join(root, entry.name))
          : Promise.resolve([join(root, entry.name)]),
      ),
    )
  ).flat();
}
/** El catálogo se genera en build: los MDX de borradores nunca entran en el bundle público. */
export function contentPlugin(): Plugin {
  let production = false;
  const virtual = 'virtual:aula-catalog';
  const virtualMascots = 'virtual:aula-mascots';
  return {
    name: 'aula-content-catalog',
    configResolved(config) {
      production = config.command === 'build';
    },
    resolveId(id) {
      if (id === virtual || id === virtualMascots) return '\0' + id;
    },
    configureServer(server) {
      server.watcher.add(resolve('content'));
      server.watcher.on('all', (_event, file) => {
        if (!normalizePath(file).includes('/content/')) return;
        for (const name of [virtual, virtualMascots]) {
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
      const imports: string[] = [];
      const lessons: string[] = [];
      const activities: Record<string, unknown> = {};
      const usedActivities = new Set<string>();
      let counter = 0;
      for (const path of (await files(resolve('content/lessons'))).sort()) {
        if (!path.endsWith('lesson.yaml')) continue;
        this.addWatchFile(path);
        const lesson = lessonSchema.parse(parse(await readFile(path, 'utf8')));
        if (
          production &&
          lesson.status === 'draft' &&
          process.env.AULA_INCLUDE_DRAFTS !== '1'
        )
          continue;
        const slides: string[] = [];
        for (const file of lesson.slides) {
          const source = normalizePath(resolve(path, '..', 'slides', file));
          const metadata = slideSchema.parse(
            parseFrontmatter(await readFile(source, 'utf8')),
          );
          for (const activityId of metadata.activities)
            usedActivities.add(activityId);
          const name = `slide${counter++}`;
          imports.push(`import * as ${name} from ${JSON.stringify(source)};`);
          slides.push(`{...${name}.frontmatter,Content:${name}.default}`);
        }
        lessons.push(
          `{meta:${JSON.stringify(lesson)},slides:[${slides.join(',')}]}`,
        );
      }
      for (const path of await files(resolve('content/activities'))) {
        if (!path.endsWith('.yaml')) continue;
        this.addWatchFile(path);
        const activity = activitySchema.parse(
          parse(await readFile(path, 'utf8')),
        );
        if (!production || usedActivities.has(activity.id))
          activities[activity.id] = activity;
      }
      return `${imports.join('\n')}\nexport const rawCatalog=[${lessons.join(',')}];\nexport const rawActivities=${JSON.stringify(activities)};`;
    },
  };
}
