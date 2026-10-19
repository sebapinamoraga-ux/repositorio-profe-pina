# Contenido de las clases

Todo lo que se enseña vive aquí, ordenado como se trabaja: por curso y por clase. El código de la plataforma está aparte, en `plataforma/`.

```
contenido/
├─ cursos/<curso>/            un curso: competencia-matematica-3m…
│   ├─ curso.yaml             unidades, orden y fechas (la «biblioteca» de la app)
│   ├─ LEEME.md               para qué es el curso, su público y sus decisiones
│   └─ clases/<clase>/        una carpeta por clase, con el nombre de su id
│       ├─ guia.md            propósito, evidencia, errores esperados, decisiones…
│       ├─ clase.yaml         título, objetivos, tramos, estado y orden de las láminas
│       ├─ laminas/*.mdx      una lámina por archivo
│       └─ actividades/*.yaml preguntas que solo usa esta clase
├─ youtube/<lista>/           las listas del canal, con la misma forma que un curso
├─ comun/
│   ├─ actividades/           preguntas que usan varias clases
│   ├─ curriculo/             referencias del temario DEMRE
│   ├─ galeria/               plantillas de Profe Piña
│   ├─ mascotas/              imágenes de Profe Piña
│   └─ plantillas/            punto de partida de una clase nueva
├─ como-escribir-clases.md    reglas de clase.yaml, láminas, bloques e interactivos
└─ AGENTS.md                  cómo trabajar con Claude sobre el contenido
```

## Cómo se trabaja una clase

1. **La guía primero.** En `guia.md`, o en la pestaña Resumen de la app, escribe el Propósito, la Evidencia y los Errores esperados. Es lo que las láminas deben servir ([principios pedagógicos](../docs/pedagogia.md)).
2. **Los tramos.** En `clase.yaml`, reparte los minutos de la clase entre sus momentos.
3. **Las láminas.** Una idea por lámina, con los bloques del [lenguaje visual](../docs/lenguaje-visual.md).
4. **Comprobar.** Desde `plataforma/`, `npm run content:check` revisa el contenido con las mismas reglas que la app al guardar. Revisa las láminas y el PDF antes de publicar.
5. **Publicar.** Cambia `status` a `published` en `clase.yaml` (o en Datos de la clase) cuando la clase esté lista.

Se puede editar aquí, en la carpeta, o desde la app en cualquier dispositivo: las dos formas escriben los mismos archivos. Los datos de los cursos reales (estudiantes, sesiones, comentarios, votaciones) nunca se guardan aquí.
