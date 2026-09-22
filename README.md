# Profe Piña · Aula

Motor de proyección 16:9 con MDX y una clase de Sistemas 2×2 de 80 minutos. El primer hito prioriza reducción, práctica guiada y errores frecuentes.

[Repositorio](https://github.com/sebapinamoraga-ux/repositorio-profe-pina) · [Sitio público](https://sebapinamoraga-ux.github.io/repositorio-profe-pina/). La clase y su PDF aparecen allí solo cuando su estado es `published`.

## Inicio

Requiere Node **24.15.0**, npm y Git. Desde esta carpeta:

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173. Flecha derecha/espacio revelan pasos y avanzan; izquierda retrocede. M abre el índice y F alterna pantalla completa. Los botones funcionan con pantalla táctil. Las alternativas no revelan respuestas al seleccionarlas.

El índice incluye una galería de 17 plantillas descargables y filtrables por momento de clase para incorporar la mascota con presencia sutil, pedagógica o de marca. Las reglas de autoría y el plan de crecimiento están en [Presencia de Profe Piña](docs/mascot-presence.md).

## Comprobar y exportar

```sh
npm run content:check
npm run typecheck
npm run lint
npm run test
npx playwright install chromium
npm run build
npm run test:e2e
npm run export:pdf -- --lesson sistemas-2x2
```

El PDF aparece en `output/pdf/sistemas-2x2.pdf`: 25 diapositivas, pasos y respuestas visibles, sin notas. El comando inicia una vista previa en el puerto 4173 y la cierra al terminar. Descarga el PDF antes de la clase para usarlo sin conexión. El PDF se genera también para clases en borrador, pero solo se publica en el sitio el de las clases con `status: published` (ver [Publicación](docs/deployment.md)).

Consulta también el [lenguaje visual común](docs/visual-language.md), que rige las clases y la galería.

## Crear una clase

```sh
npm run lesson:new -- --id mi-nueva-clase
```

Se crea un borrador en `content/lessons/m1/algebra`. Edita el manifiesto y las diapositivas, comprueba el contenido y cambia `status` a `published` cuando esté listo. Consulta [Autoría](docs/authoring.md), [Arquitectura](docs/architecture.md) y [Publicación](docs/deployment.md).

El repositorio conserva el ZIP de origen en `archive/`. El motor nuevo reemplaza su parser manual; las demos originales no se publican.

## Fuera del primer hito

El sitio Astro, el mapa anual y el banco ampliado están definidos en [Roadmap](docs/roadmap.md). La revisión del docente y el ensayo con su proyector siguen siendo pasos humanos antes de usarlo en aula.
