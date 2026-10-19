# Reglas de la plataforma

El motor de láminas y la app docente. Existen para el objetivo pedagógico ([docs/pedagogia.md](../docs/pedagogia.md)): una decisión técnica que lo debilite no se toma.

- Leer el README de la raíz y [docs/architecture.md](docs/architecture.md) antes de cambiar la estructura. Los comandos se ejecutan en esta carpeta.
- TypeScript estricto; no any, ts-ignore, eval ni conversiones que oculten errores.
- El contenido vive en `contenido/`; el motor no contiene ejercicios específicos. El motor reconoce el contenido por su forma (content-files.ts), no por carpetas fijas.
- Conservar IDs estables, autoría española y ecuaciones verificadas en ambos miembros.
- Paquetes compartidos no importan aplicaciones. Matemática pura fuera de React.
- Interactivos con parámetros iniciales, reinicio y representación estática determinista; cada interactivo nuevo necesita su ficha en interactive-params.ts.
- PDF: exactamente una página por diapositiva, todo revelado, sin notas ni controles.
- PDF sin sombras ni desenfoques (box-shadow, text-shadow, filter blur/drop-shadow): Chrome los rasteriza y los visores antiguos (iPad) los muestran mal. @media print los anula y export:pdf falla si aparecen; separar con bordes y fondos.
- Evitar recortes y scroll dentro del lienzo. Dividir contenido antes de reducir tipografía.
- Ejecutar content:check, typecheck, lint, test, build y test:e2e antes de entregar.
- Revisar visualmente diapositivas y PDF después de cambios de composición.
- No publicar borradores: dist solo contiene clases published (dist:check lo verifica) y el PDF de borradores se compila en output/pdf-site. Conservar archive y atribución del prototipo.
- No introducir dependencias o backend sin una necesidad del hito.
- El contenido se edita también desde la app, que guarda en `main` con la API de GitHub. Lo que escribe la app debe pasar `checkContentFiles` (el mismo código que content:check); las reglas nuevas de contenido van en packages/content-model para que rijan en ambos lados.
- Datos privados del docente (cursos, sesiones, comentarios, votaciones) nunca van al repositorio.
- No manejar tokens de GitHub: el docente los crea y pega en Ajustes. Las pruebas usan el GitHub falso de packages/content-repo.
- La planificación de cada biblioteca vive en su `curso.yaml`; el frontmatter de las láminas usa la forma canónica de `toMdx`.
- No afirmar ensayo en proyector ni revisión docente si no se han realizado.
- Aplicar [docs/lenguaje-visual.md](../docs/lenguaje-visual.md) a toda clase y plantilla; reservar los tonos de asociación para referentes locales (solo fondo, correspondencia estable).
- Preferir Composicion con un ID de la galería para reservar espacio a la mascota; mantener una por lámina y validar las plantillas descargables.
- El repositorio de videos (`H:\Videos Profe Pina`) lee esta plataforma por su adaptador `src/plataforma/`: al cambiar rutas o el modelo de contenido, revisarlo.
