# Profe Piña · Aula

Lo más importante es el objetivo pedagógico de cada clase; el diseño y la plataforma existen para servirlo ([docs/pedagogia.md](docs/pedagogia.md)). Los términos (biblioteca, clase, curso, sesión, lámina…) están en el [glosario](docs/glosario.md).

## Qué leer según la tarea

| Tarea | Leer |
|---|---|
| Crear o mejorar una clase | [contenido/AGENTS.md](contenido/AGENTS.md) |
| Cambiar código | [plataforma/AGENTS.md](plataforma/AGENTS.md) |
| Elegir bloques, colores o mascota | [lenguaje visual](docs/lenguaje-visual.md) y [presencia de Profe Piña](docs/presencia-mascota.md) |
| Saber qué se decidió y qué sigue abierto | [decisiones](docs/decisiones.md) |

## Reglas comunes

- Español neutro, sin voseo. Se escribe «el docente»; las decisiones pedagógicas son suyas.
- Datos privados (cursos, estudiantes, sesiones, comentarios, votaciones) nunca van al repositorio, que es público. Tampoco en las guías ni en las notas del orador.
- No publicar borradores ni afirmar revisión docente o ensayo en proyector que no hayan ocurrido.
- Cada regla vive en un solo documento; los demás la enlazan.
- Las preferencias estables del docente se escriben en el repositorio, no solo en la memoria de una herramienta. Las decisiones con fecha van en [decisiones](docs/decisiones.md) o en la sección Decisiones de la guía de la clase.

## Antes de entregar

- Cambio de código: desde `plataforma/`, content:check, typecheck, lint, test, build y test:e2e; revisar láminas y PDF si cambió la composición.
- Cambio solo de contenido: content:check, y revisar láminas y PDF si cambió la composición (CI valida build y PDF).
- Cambio solo de documentos: revisar que los enlaces y las rutas existan.
- Informar por separado lo comprobado automáticamente y lo que falta de revisión docente o ensayo en proyector.
