# Recursos de Profe Piña

La colección completa (originales vectoriales `eps/`, `pdf/`, `.ai`, `.eps` y las 112 poses PNG `NN-descripcion.png`, unos 600 MB) vive solo en el disco local del autor. Git versiona únicamente los PNG de las poses que la galería o alguna diapositiva usan, y el sitio publicado solo incluye esas mismas.

`apps/presenter/content-plugin.ts` descubre las poses usadas leyendo `content/galleries/mascot-presence.json` y los `pose={N}` de las diapositivas, así que no hay una lista de imports que mantener.

## Usar una pose nueva

1. Autorízala para su nivel en `mascotPosesByPresence` (`packages/content-model/src/index.ts`) si aún no lo está.
2. Úsala en una diapositiva o plantilla.
3. Añade `!content/assets/mascotas/png/N-*.png` a `.gitignore` y versiona el PNG.

`content:check` falla con el mensaje exacto si falta un paso: pose sin PNG, pose usada pero ignorada por git, o PNG versionado que ya nada usa.

Pendiente: registrar en `docs/provenance.md` el origen y la licencia de estas ilustraciones antes de publicar la clase.
