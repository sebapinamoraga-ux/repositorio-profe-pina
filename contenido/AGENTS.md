# Trabajar el contenido de las clases

Aquí se crean y mejoran clases. El objetivo pedagógico manda sobre el diseño y el código: cada cambio tiene que servir al Propósito y a la Evidencia de la clase.

## Antes de tocar una clase

Leer, en este orden:

1. [docs/pedagogia.md](../docs/pedagogia.md): los principios.
2. El `LEEME.md` del curso: público, hilo de contexto y decisiones del curso.
3. La `guia.md` de la clase y su `clase.yaml` (objetivos y tramos).
4. Para escribir láminas: [como-escribir-clases.md](como-escribir-clases.md) y [docs/lenguaje-visual.md](../docs/lenguaje-visual.md).

## Crear una clase

1. Desde `plataforma/`: `npm run lesson:new -- --id <id> --curso <biblioteca>` (o «Preparar» desde la app). Crea la carpeta dentro del curso con `clase.yaml`, `guia.md` y una portada.
2. Escribir primero la guía: Propósito, Evidencia, Punto de partida y Errores esperados. Proponerla al docente antes de escribir las láminas.
3. Repartir los tramos y recién entonces escribir las láminas, tramo por tramo.
4. Planificar la clase en el `curso.yaml` de su carpeta (unidad y fecha). El tema y la fecha de cada clase de aula salen del calendario académico del docente.

## Mejorar una clase

- Revisar que el cambio siga sirviendo al Propósito y a la Evidencia; si los cambia, actualizar la guía.
- Anotar en Decisiones de la guía: fecha · decisión · motivo.
- Conservar los IDs de clases, láminas y actividades (los usan enlaces, comentarios y videos).

## Reglas

- Práctica solo individual o guiada; consignas en singular, con modalidad y tiempo en el título.
- Al definir algo por primera vez, usar expresiones genéricas; los casos particulares van después, como ejemplos («Ejemplo: $a=1$, $b=c=0$»), para que una propiedad del ejemplo no parezca general.
- Español neutro, sin voseo.
- Ecuaciones verificadas en ambos miembros y soluciones comprobadas en el problema original.
- Definiciones formales azules, objetivos violetas, procedimientos piedra, práctica y errores ocres, comprobaciones verdes y reflexión rosa. Los tonos de asociación solo como fondo y con correspondencia estable.
- Una mascota por lámina como máximo; preferir `Composicion` con una plantilla de la galería.
- Dividir una lámina antes de reducir la tipografía; nada de recortes ni scroll dentro del lienzo.
- Una actividad nueva va en `actividades/` de su clase, o en `comun/actividades/` si la usan varias.
- La guía no lleva datos de cursos ni de estudiantes.
- No cambiar `status` a `published` sin que lo decida el docente. No afirmar revisión docente ni ensayo en proyector que no hayan ocurrido.

## Comprobar

Desde `plataforma/`:

- `npm run content:check` después de cada cambio.
- Tras cambiar la composición de láminas: revisarlas en la app (estado inicial y revelado) y el PDF (`npm run export:pdf -- --lesson <id>`).
- Si el cambio toca también la plataforma, seguir [plataforma/AGENTS.md](../plataforma/AGENTS.md).
