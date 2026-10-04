import { createContext, useContext } from 'react';
import type { Activity } from '@aula/content-model';
import { buildBundle } from '../content/build';

/** Clases y actividades empaquetadas con el sitio: lo que ve el estudiante. */
export const catalog = buildBundle.lessons;
export const activities: Record<string, Activity> = buildBundle.activities;

/**
 * Actividades con que se dibujan las láminas. Por defecto las del build; la parte docente
 * entrega las del contenido efectivo (con borradores y cambios sin guardar).
 */
export const ActivitiesContext = createContext<Record<string, Activity>>(activities);
export const useActivities = () => useContext(ActivitiesContext);
