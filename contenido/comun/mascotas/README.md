# Recursos de Profe Piña

La colección completa (originales vectoriales `eps/`, `pdf/`, `.ai`, `.eps` y las 112 poses PNG `NN-descripcion.png`, unos 600 MB) vive solo en el disco local del autor. Git versiona únicamente los PNG de las poses que la galería o alguna diapositiva usan, y el sitio publicado solo incluye esas mismas.

`content:check` descubre las poses usadas leyendo `contenido/comun/galeria/plantillas-mascota.json` y los `pose={N}` de las diapositivas, así que no hay una lista de imports que mantener.

## Usar una pose nueva

1. Autorízala para su nivel en `mascotPosesByPresence` (`plataforma/packages/content-model/src/index.ts`) si aún no lo está.
2. Úsala en una diapositiva o plantilla.
3. Añade `!contenido/comun/mascotas/png/N-*.png` a `.gitignore` y versiona el PNG (carpeta `contenido/comun/mascotas/png/`).

`content:check` falla con el mensaje exacto si falta un paso: pose sin PNG, pose usada pero ignorada por git, o PNG versionado que ya nada usa.

Las reglas de uso de la mascota están en [Presencia de Profe Piña](../../../docs/presencia-mascota.md).

Licencia: uso sin fines de lucro y comercial, según el autor. El proveedor, el comprobante y la posible atribución se registran en `plataforma/docs/provenance.md`.
