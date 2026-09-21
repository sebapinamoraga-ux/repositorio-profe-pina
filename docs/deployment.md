# Publicación en GitHub Pages

La aplicación es pública, incluidos los datos con respuestas. No contiene claves ni datos de estudiantes.

1. Autenticar GitHub CLI (`gh auth login`) o conectar el repositorio desde GitHub Desktop.
2. Crear un repositorio para este proyecto, configurar origin y subir la rama main.
3. En Settings → Pages, seleccionar GitHub Actions como fuente.
4. El workflow valida, prueba, construye y exporta PDF antes de publicar. El PDF de una clase publicada se copia dentro del sitio en pdf/sistemas-2x2.pdf y también se conserva como artifact.

## Borradores

Solo las clases con `status: published` entran en el sitio y en el PDF público. `npm run build` deja fuera los borradores y `npm run dist:check` falla si el sitio contiene alguno. `export:pdf` compila los borradores en una carpeta aparte (output/pdf-site), sin tocar dist, para poder revisar el PDF antes de publicar. `npm run publish:pdf` copia a dist/pdf únicamente los PDF de clases publicadas. Mientras ninguna clase esté publicada, el sitio muestra «No hay clases publicadas» y el PDF de revisión solo queda como artifact del workflow.

Cambiar `status` a `published` es una decisión del docente tras su revisión y el ensayo en proyector.

BASE_PATH es /nombre-del-repositorio/ para Pages de proyecto; / para un repositorio usuario.github.io. La navegación utiliza fragmentos y no requiere reglas de reescritura. Para volver a una versión previa, ejecutar el workflow sobre una revisión válida o revertir el cambio y publicar nuevamente.

El despliegue requiere credenciales activas y permisos del repositorio. Una compilación local correcta no prueba una publicación remota.
