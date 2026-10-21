# Trabajar el contenido de las clases

> Ámbito: clases de aula y de video. Los principios están en [docs/pedagogia.md](../docs/pedagogia.md); aquí solo lo propio del oficio de crear y mejorar clases.

Aquí se crean y mejoran clases. El objetivo pedagógico manda sobre el diseño y el código: cada cambio tiene que servir al Propósito y a la Evidencia de la clase.

## Antes de tocar una clase

Leer, en este orden:

1. [docs/pedagogia.md](../docs/pedagogia.md): los principios.
2. El `LEEME.md` del curso: público, hilo de contexto y decisiones del curso.
3. La `guia.md` de la clase y su `clase.yaml` (objetivos y tramos).
4. Para escribir láminas: [clase y guía](autoria/clase-y-guia.md), [láminas](autoria/laminas.md) y [docs/lenguaje-visual.md](../docs/lenguaje-visual.md). El [catálogo de componentes](autoria/componentes.md) solo cuando haga falta una figura o una pregunta; el índice está en [como-escribir-clases.md](como-escribir-clases.md).

## Crear una clase

1. Desde `plataforma/`: `npm run lesson:new -- --id <id> --curso <biblioteca>` (o «Preparar» desde la app). Crea la carpeta dentro del curso con `clase.yaml`, `guia.md` y una portada.
2. Escribir primero la guía: Propósito, Evidencia, Punto de partida y Errores esperados. La Evidencia dice en qué lámina o actividad se ve el logro, qué respuesta cuenta como logro y qué error lo distingue de un logro aparente. Proponerla al docente antes de escribir las láminas.
3. Repartir los tramos y recién entonces escribir las láminas, tramo por tramo.
4. Planificar la clase en el `curso.yaml` de su carpeta (unidad y fecha). El tema y la fecha de cada clase de aula salen del calendario académico del docente.
5. En un video (`formato: video`), la guía registra además el gancho, la tensión central, el clímax y los previos; no repite los objetivos ni los tramos del manifiesto.

## Mejorar una clase

- Revisar que el cambio siga sirviendo al Propósito y a la Evidencia; si los cambia, actualizar la guía.
- Anotar en Decisiones de la guía: fecha · decisión · motivo.
- Conservar los IDs de clases, láminas y actividades (los usan enlaces, comentarios y videos).
- Se prefiere el desarrollo detallado (más láminas y pasos) mientras quepa en el tiempo de la clase. Si lo excede, proponer de dónde sale el tiempo: primero la extensión, que pasa al repaso del estudiante; nunca la práctica individual ni el cierre.
- Si el docente pide «detallar» sin decir dónde, confirmar qué lámina antes de cambiar.

## Reglas propias del contenido

- Al definir algo por primera vez, usar expresiones genéricas con su dominio; los casos particulares van después, como ejemplos («Ejemplo: $a=1$, $b=c=0$»), para que una propiedad del ejemplo no parezca general.
- Ecuaciones verificadas en ambos miembros y soluciones comprobadas en el problema original.
- Una actividad nueva va en `actividades/` de su clase, o en `comun/actividades/` si la usan varias.
- La guía y las notas del orador son públicas: no llevan datos de cursos ni de estudiantes.
- No cambiar `status` a `published` sin que lo decida el docente. No afirmar revisión docente ni ensayo en proyector que no hayan ocurrido.

Rigen también, y se leen en su documento: práctica individual o guiada ([principio 4](../docs/pedagogia.md)), una idea por lámina y tipografía ([principio 3](../docs/pedagogia.md)), colores y bloques ([lenguaje visual](../docs/lenguaje-visual.md)) y la mascota ([presencia](../docs/presencia-mascota.md)).

## Comprobar

Desde `plataforma/`: `npm run content:check` después de cada cambio. Para lo demás, la [lista de verificación](../AGENTS.md#antes-de-entregar); tras cambiar la composición, revisar las láminas en la app (estado inicial y revelado) y el PDF (`npm run export:pdf -- --lesson <id>`). Si el cambio toca también la plataforma, seguir [plataforma/AGENTS.md](../plataforma/AGENTS.md).
