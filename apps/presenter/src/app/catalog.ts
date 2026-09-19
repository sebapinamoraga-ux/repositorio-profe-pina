import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';
import {
  lessonSchema,
  slideSchema,
  activitySchema,
  type Lesson,
  type Slide,
  type Activity,
} from '@aula/content-model';
import { rawCatalog, rawActivities } from 'virtual:aula-catalog';
export interface LoadedLesson {
  meta: Lesson;
  slides: (Slide & { Content: ComponentType<{ components: MDXComponents }> })[];
}
export const catalog: LoadedLesson[] = rawCatalog.map((lesson) => ({
  meta: lessonSchema.parse(lesson.meta),
  slides: lesson.slides.map((slide) => ({
    ...slideSchema.parse(slide),
    Content: slide.Content,
  })),
}));
export const activities: Record<string, Activity> = Object.fromEntries(
  Object.entries(rawActivities).map(([id, item]) => [
    id,
    activitySchema.parse(item),
  ]),
);
