import { mascotTemplateMdx } from './index.ts';
import {
  parseContentFiles,
  type ContentBundle,
  type ContentFiles,
  type ContentProblem,
} from './content-files.ts';
import { checkSourceLines, compileChecked } from './check-source.ts';
import { splitSource, toMdx } from './frontmatter.ts';
import { validateMdxTree } from './validate-mdx.ts';
import { verifyActivity } from './verify-model.ts';
import { verifyLessonPlan } from './verify-plan.ts';
import { MASCOT_PNG_DIR, poseOfPng, usedPosesFromSources } from './poses.ts';

export interface CheckOptions {
  /**
   * Rutas versionadas del repositorio. Si se indican, cada pose usada debe tener su PNG
   * versionado (en el navegador no hay .gitignore: la lista sale del árbol de git).
   */
  trackedPaths?: ReadonlySet<string>;
  /** Qué láminas compilar; el navegador solo compila las que cambiaron. Por defecto, todas. */
  shouldCompile?: (path: string) => boolean;
}

export interface CheckResult {
  bundle: ContentBundle;
  problems: ContentProblem[];
  /** No bloquean la publicación. */
  warnings: ContentProblem[];
  summary: { lessons: number; slides: number; activities: number };
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Las reglas de content:check sobre un mapa de archivos. La misma función corre en Node
 * (`npm run content:check`) y en el navegador antes de guardar en el repositorio.
 */
export async function checkContentFiles(
  files: ContentFiles,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const bundle = parseContentFiles(files);
  const problems: ContentProblem[] = [...bundle.problems];
  const warnings: ContentProblem[] = [];
  const add = (path: string, text: string) => problems.push({ path, message: text });
  const compile = options.shouldCompile ?? (() => true);
  const gallery = bundle.gallery;
  const templateIds = new Set(gallery?.templates.map((t) => t.id) ?? []);
  if (!gallery) add('content/galleries/mascot-presence.json', 'Falta la galería de plantillas.');
  else
    for (const template of gallery.templates) {
      const path = `content/galleries/mascot-presence.json#${template.id}`;
      if (!compile(path)) continue;
      try {
        const source = mascotTemplateMdx(template);
        const { slide } = splitSource(source);
        await compileChecked(source, (tree) => validateMdxTree(tree, slide, templateIds));
      } catch (error) {
        add(path, message(error));
      }
    }

  for (const [id, activity] of Object.entries(bundle.activities)) {
    const found = verifyActivity(activity);
    if (found.length)
      add(bundle.activityPaths[id] ?? id, found.join(' '));
  }
  const curriculum = new Set(bundle.curriculum.map((item) => item.id));
  const ids = new Set<string>();
  let slides = 0;
  for (const lesson of bundle.lessons) {
    const { meta, path } = lesson;
    for (const problem of verifyLessonPlan(meta)) add(path, problem);
    if (ids.has(meta.id)) add(path, `Identificador de clase duplicado: ${meta.id}`);
    ids.add(meta.id);
    if (new Set(meta.slides).size !== meta.slides.length)
      add(path, 'Archivo de diapositiva repetido.');
    for (const ref of meta.curriculum)
      if (!curriculum.has(ref)) add(path, `Referencia curricular desconocida: ${ref}`);
    const slideIds = new Set<string>();
    for (const file of lesson.slides) {
      const { slide, text } = file;
      try {
        if (`${slide.id}.mdx` !== file.file)
          throw new Error(
            `El identificador ${slide.id} no coincide con el nombre del archivo ${file.file}.`,
          );
        if (toMdx({ ...slide, body: file.body }) !== text)
          throw new Error(
            'El frontmatter no tiene la forma canónica (id, title entre comillas simples, phase, layout, steps, activities).',
          );
        checkSourceLines(text);
        if (slideIds.has(slide.id)) throw new Error(`ID duplicado ${slide.id}`);
        slideIds.add(slide.id);
        for (const ref of slide.activities)
          if (!bundle.activities[ref]) throw new Error(`Actividad desconocida ${ref}`);
        if (compile(file.path))
          await compileChecked(text, (tree) => validateMdxTree(tree, slide, templateIds));
        slides++;
      } catch (error) {
        add(file.path, message(error));
      }
    }
  }

  if (bundle.planning) {
    const path = bundle.planningPath ?? 'content/planning';
    const known = new Set(bundle.lessons.map((lesson) => lesson.meta.id));
    for (const unit of bundle.planning.units)
      for (const planned of unit.lessons)
        if (!known.has(planned.id) && !planned.title)
          add(path, `La clase planificada ${planned.id} no tiene lesson.yaml ni título.`);
  }

  if (options.trackedPaths && gallery) {
    const pngs = new Map<number, string[]>();
    for (const tracked of options.trackedPaths) {
      if (!tracked.startsWith(`${MASCOT_PNG_DIR}/`)) continue;
      const pose = poseOfPng(tracked);
      if (pose !== null) pngs.set(pose, [...(pngs.get(pose) ?? []), tracked]);
    }
    const mdx = [...files].filter(([p]) => p.endsWith('.mdx')).map(([, text]) => text);
    const used = usedPosesFromSources(gallery, mdx);
    for (const pose of used)
      if ((pngs.get(pose) ?? []).length !== 1)
        add(
          MASCOT_PNG_DIR,
          `La pose ${pose} no está disponible en el repositorio: usa una pose de la galería o pide que se agregue su imagen.`,
        );
    const usedSet = new Set(used);
    for (const [pose, paths] of pngs)
      if (!usedSet.has(pose))
        for (const png of paths)
          warnings.push({
            path: png,
            message: 'Imagen versionada que ninguna lámina ni plantilla usa.',
          });
  }

  return {
    bundle,
    problems,
    warnings,
    summary: {
      lessons: ids.size,
      slides,
      activities: Object.keys(bundle.activities).length,
    },
  };
}
