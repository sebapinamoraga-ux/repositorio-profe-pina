# Datos, privacidad y trabajo sin conexión

> Estado: vigente · Ámbito: plataforma · Autoridad: el docente. El repositorio y el sitio son públicos; los datos privados del docente nunca van al repositorio.

## Qué es público y qué es privado

| Dato | Dónde vive | ¿Público? | Sin conexión |
|---|---|---|---|
| Clases, láminas, guías, notas del orador, actividades y respuestas | Repositorio (`main`); el sitio solo muestra las clases publicadas | **Sí**, incluidos los borradores, porque el repositorio es público | Se lee la copia empaquetada o la última copia local |
| Planificación (`curso.yaml`) | Repositorio | Sí | Igual que arriba |
| Cursos docentes, sesiones, comentarios, resúmenes de votación | `localStorage` de ese navegador (`profe-pina-aula-v1`, versión 2) | No | Solo en ese dispositivo y navegador |
| Cambios sin guardar | `localStorage` hasta pulsar Guardar | No | Se envían al reconectar |
| Token de GitHub | `localStorage` del dispositivo; nunca en URLs ni registros | No | — |
| Última copia del repositorio | IndexedDB | — | Permite abrir y editar sin red si ya hubo conexión |
| Proyección en vivo (lámina, pasos, votos) | Memoria y `BroadcastChannel`; no se guarda | No | Funciona entre pestañas del mismo navegador, no entre teléfonos |

No proyectar un dato no lo convierte en privado: una guía, una nota del orador o una respuesta de actividad que esté en el repositorio es pública aunque la interfaz no la muestre al estudiante. Las guías y las notas llevan decisiones didácticas generales; las observaciones sobre cursos o estudiantes se quedan en el registro privado.

## Escenarios sin conexión

1. **Nunca se conectó GitHub en el dispositivo:** la app muestra el contenido publicado y es de solo lectura.
2. **Se conectó antes y ahora no hay red:** se puede editar con la última copia local; el guardado queda en espera y se envía al reconectar.
3. **Con red:** la copia está al día con la rama, con borradores.

## Límites actuales

- El acceso docente es un bloqueo local sin credenciales; no es una medida de seguridad.
- La votación funciona entre pestañas de un mismo navegador. No es todavía una votación entre teléfonos de estudiantes.
- Los datos privados no se sincronizan entre dispositivos; eso llega en la Etapa 2 ([roadmap](roadmap.md)).

El detalle de cómo se guarda y se vuelve a leer el contenido está en [arquitectura](architecture.md).
