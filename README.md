# Profe Piña · Aula

Motor de proyección 16:9 con MDX y una clase de Sistemas 2×2 de 80 minutos. El primer hito prioriza reducción, práctica guiada y errores frecuentes.

[Repositorio](https://github.com/sebapinamoraga-ux/repositorio-profe-pina) · [Presentación web](https://sebapinamoraga-ux.github.io/repositorio-profe-pina/) · [PDF con respuestas](https://sebapinamoraga-ux.github.io/repositorio-profe-pina/pdf/sistemas-2x2.pdf)

## Inicio

Requiere Node **24.15.0**, npm y Git. Desde esta carpeta:

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173. Flecha derecha/espacio revelan pasos y avanzan; izquierda retrocede. M abre el índice y F alterna pantalla completa. Los botones funcionan con pantalla táctil. Las alternativas no revelan respuestas al seleccionarlas.

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

El PDF aparece en `output/pdf/sistemas-2x2.pdf`: 20 diapositivas, pasos y respuestas visibles, sin notas. El comando inicia una vista previa en el puerto 4173 y la cierra al terminar. Descarga el PDF antes de la clase para usarlo sin conexión.

## Crear una clase

```sh
npm run lesson:new -- --id mi-nueva-clase
```

Se crea un borrador en `content/lessons/m1/algebra`. Edita el manifiesto y las diapositivas, comprueba el contenido y cambia `status` a `published` cuando esté listo. Consulta [Autoría](docs/authoring.md), [Arquitectura](docs/architecture.md) y [Publicación](docs/deployment.md).

El repositorio conserva el ZIP de origen en `archive/`. El motor nuevo reemplaza su parser manual; las demos originales no se publican.

## Fuera del primer hito

El sitio Astro, el mapa anual y el banco ampliado están definidos en [Roadmap](docs/roadmap.md). La revisión del docente y el ensayo con su proyector siguen siendo pasos humanos antes de usarlo en aula.
