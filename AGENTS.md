# Profe Piña · Aula

Lo más importante es el objetivo pedagógico de cada clase; el diseño y la plataforma existen para servirlo ([docs/pedagogia.md](docs/pedagogia.md)).

El repositorio tiene tres partes:

- `contenido/`: las clases, ordenadas por curso y por clase, cada una con su guía pedagógica. Para crear o mejorar clases, seguir [contenido/AGENTS.md](contenido/AGENTS.md).
- `plataforma/`: el motor de láminas y la app docente. Para cambiar código, seguir [plataforma/AGENTS.md](plataforma/AGENTS.md).
- `docs/`: lo que rige a ambos: [principios pedagógicos](docs/pedagogia.md), [lenguaje visual](docs/lenguaje-visual.md) y [presencia de Profe Piña](docs/presencia-mascota.md).

Reglas comunes:

- Español neutro, sin voseo. Las decisiones pedagógicas son del docente.
- Datos privados (cursos, estudiantes, sesiones, comentarios, votaciones) nunca van al repositorio.
- No publicar borradores ni afirmar revisión docente o ensayo en proyector que no hayan ocurrido.
- Antes de entregar, desde `plataforma/`: content:check, typecheck, lint, test, build y test:e2e; revisar láminas y PDF si cambió la composición.
