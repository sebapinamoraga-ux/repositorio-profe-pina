# Clase y guía

Una clase es una carpeta `clases/<id>/` dentro de la carpeta de su curso (por ejemplo `cursos/competencia-matematica-3m/clases/sistemas-2x2/`) con `clase.yaml`, `guia.md`, `laminas/*.mdx` y, si las tiene, `actividades/*.yaml` propias. La carpeta se llama como el `id` de la clase. Antes de escribir láminas, completa la guía (ver [Guía pedagógica](#guía-pedagógica)). El manifiesto (`clase.yaml`) especifica ID estable, título, asignatura, eje, duración, prerrequisitos, objetivos observables, habilidades, referencias curriculares, estado y orden. La referencia inicial es m1-2027-sistemas; crear otra referencia al cambiar de conocimiento.

## Guía pedagógica

`guia.md` dice para qué existe la clase; las láminas la sirven. Tiene siete apartados `##`, en este orden: **Propósito** (qué debe poder hacer el estudiante al salir), **Evidencia** (en qué lámina o actividad se ve que lo logró, qué respuesta cuenta como logro y qué error lo distingue de un logro aparente), **Punto de partida** (previos y cómo se activan), **Secuencia** (por qué este orden, un párrafo por tramo), **Errores esperados** (y en qué lámina se abordan), **Decisiones** (fecha · decisión · motivo) y **Después de la clase** (qué ajustar, sin datos de cursos ni estudiantes). Un apartado sin escribir dice `_Por completar._`.

Una clase publicada no pasa content:check sin Propósito, Evidencia y Errores esperados; en un borrador es un aviso. La guía se edita también en la pestaña Resumen de la clase. Al cambiar láminas, revisa que sigan sirviendo al Propósito y a la Evidencia, y anota en Decisiones lo que cambió y por qué.

En un video (`formato: video`), la guía registra además el gancho, la tensión central, el clímax y los previos; no repite los objetivos ni los tramos del manifiesto (ver [Clases de video](video.md)).

## Tramos y repaso

La distribución docente del tiempo (no se proyecta) vive en `tramos` de clase.yaml: cada tramo tiene `label`, `from` y `to` (nombres de archivo sin `.mdx`) y `minutes`. Los tramos son contiguos, cubren todas las diapositivas en orden y sus minutos suman `duration`; content:check lo verifica. Un tramo de 0 minutos marca una lámina de consulta.

La lista opcional `repaso` de clase.yaml nombra láminas solo para el repaso del estudiante: en el celular siguen a las de la clase bajo «Para seguir explorando», pero no se proyectan, no salen en el PDF ni cuentan en los tramos. Viven en la misma carpeta `laminas/`, se validan con las mismas reglas y sus identificadores no pueden repetir los de la clase. Sirven para exploraciones y preguntas que no caben en la duración de la clase. En el editor docente aparecen en la sección «Repaso del estudiante», bajo las láminas de la clase (numeradas R1, R2…): ahí se editan, se agregan desde la galería, se reordenan y se quitan. Esos cambios solo reescriben sus .mdx y la lista `repaso` (que desaparece si queda vacía); no tocan `slides` ni `tramos`.
