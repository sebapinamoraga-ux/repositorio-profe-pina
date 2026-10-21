# Reglas de la plataforma

> Ámbito: código del motor de láminas y de la app docente.

El motor de láminas y la app docente existen para el objetivo pedagógico ([docs/pedagogia.md](../docs/pedagogia.md)): una decisión técnica que lo debilite no se toma.

## Antes de cambiar

- Leer el README de la raíz y [docs/architecture.md](docs/architecture.md) antes de cambiar la estructura. Los comandos se ejecutan en esta carpeta.
- Verificar con la [lista de la raíz](../AGENTS.md#antes-de-entregar). Si una regla pedagógica pasa a comprobarse de forma automática, actualizar la tabla «Cómo se comprueba cada principio» de [pedagogia.md](../docs/pedagogia.md).

## Código

- TypeScript estricto; no any, ts-ignore, eval ni conversiones que oculten errores.
- Paquetes compartidos no importan aplicaciones. Matemática pura fuera de React.
- Interactivos con parámetros iniciales, reinicio y representación estática determinista; cada interactivo nuevo necesita su ficha en interactive-params.ts.
- No introducir dependencias o backend sin una necesidad del hito.
- Conservar IDs estables, autoría española y ecuaciones verificadas en ambos miembros.

## Contenido y modelo

- El contenido vive en `contenido/`; el motor no contiene ejercicios específicos. El motor reconoce el contenido por su forma (content-files.ts), no por carpetas fijas, y además exige que cada clase esté en la carpeta del curso que la planifica y se llame como su identificador.
- El contenido se edita también desde la app, que guarda en `main` con la API de GitHub. Lo que escribe la app debe pasar `checkContentFiles` (el mismo código que content:check); las reglas nuevas de contenido van en packages/content-model para que rijan en ambos lados.
- La planificación de cada biblioteca vive en su `curso.yaml`; el frontmatter de las láminas usa la forma canónica de `toMdx`.
- Al cambiar el modelo de contenido (materias, tramos, campos del frontmatter), probar también el editor y el adaptador del repositorio de videos (`H:\Videos Profe Pina`, `src/plataforma/`); al cambiar rutas, revisar ese adaptador.
- Las notas del orador son contenido público: no se proyectan ni se imprimen.

## PDF

- **PDF final:** exactamente una página por diapositiva, todo revelado, sin notas ni controles.
- **PDF por pasos** (`--pasos`): una página por paso de cada diapositiva, tal como se proyecta; la última queda completa. También sin notas ni controles.
- Sin sombras ni desenfoques (box-shadow, text-shadow, filter blur/drop-shadow): Chrome los rasteriza y los visores antiguos (iPad) los muestran mal. @media print los anula y export:pdf falla si aparecen; separar con bordes y fondos.

## Publicación y datos

- No publicar borradores: dist solo contiene clases published (dist:check lo verifica) y el PDF de borradores se compila en output/pdf-site. Conservar archive y atribución del prototipo.
- Datos privados del docente (cursos, sesiones, comentarios, votaciones) nunca van al repositorio ([datos y privacidad](docs/datos-y-privacidad.md)).
- No manejar tokens de GitHub: el docente los crea y pega en Ajustes. Las pruebas usan el GitHub falso de packages/content-repo.

## Diseño

Aplicar [lenguaje visual](../docs/lenguaje-visual.md) y [presencia de Profe Piña](../docs/presencia-mascota.md) a toda clase y plantilla; el principio 3 de [pedagogía](../docs/pedagogia.md) rige los recortes, el scroll y la tipografía. Revisar visualmente diapositivas y PDF después de cambios de composición.
