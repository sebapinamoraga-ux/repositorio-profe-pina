# Profe Piña · Aula

Plataforma para preparar, proyectar y repasar clases: un motor de láminas 16:9 con MDX, una app docente que edita el contenido y lo guarda en este repositorio, y una vista de repaso para el estudiante. El contenido actual son las clases de aula de Competencia Matemática 3.° medio (PAES M1) y las clases de video del canal, en piloto.

[Repositorio](https://github.com/sebapinamoraga-ux/repositorio-profe-pina) · [Sitio público](https://sebapinamoraga-ux.github.io/repositorio-profe-pina/). La clase y su PDF aparecen allí solo cuando su estado es `published`.

## Organización

- [`contenido/`](contenido/LEEME.md): las clases, por curso y por clase. Cada clase tiene su guía pedagógica (`guia.md`), su manifiesto (`clase.yaml`), sus láminas y sus actividades.
- [`plataforma/`](plataforma/AGENTS.md): el motor de láminas y la app docente.
- [`docs/`](docs/pedagogia.md): lo que rige a ambos: principios pedagógicos, lenguaje visual y presencia de Profe Piña. También el [glosario](docs/glosario.md) y las [decisiones](docs/decisiones.md).
- Datos públicos y privados, y trabajo sin conexión: [Datos y privacidad](plataforma/docs/datos-y-privacidad.md).

## Inicio

Requiere Node **24.15.0**, npm y Git. Los comandos se ejecutan en `plataforma/`:

```sh
cd plataforma
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173 y elegir un rol:

- **Estudiante**: repaso en el celular, sin cuenta, con temas claro, oscuro y alto contraste, y respuesta anónima a la votación de la clase (por ahora entre pestañas del mismo navegador, no entre teléfonos).
- **Docente**: un menú de cuatro entradas. **Clases** muestra la clase del día según las fechas de la planificación (o la próxima) y la planificación por unidades; cada clase tiene su espacio con pestañas (Resumen, Láminas, Repaso, Actividades, Revisión y PDF) y desde ahí se proyecta. **Recursos** reúne el banco de actividades PAES y las plantillas de la mascota; **Cursos**, los cursos y el historial; **Ajustes**, la conexión con GitHub y el acceso local. La sesión en curso queda visible en una barra en todas las pantallas. Las clases, actividades y la planificación se editan aquí y se guardan en este repositorio desde cualquier dispositivo conectado (ver [Editar desde la app](contenido/autoria/editar-desde-la-app.md)). Cursos, sesiones y comentarios quedan en el navegador. El acceso es un bloqueo local, sin cuenta.
- **Control remoto**: avanza la proyección abierta en otra pestaña o ventana del mismo navegador.

En el presentador, flecha derecha/espacio revelan pasos y avanzan; izquierda retrocede. M abre el índice, F alterna pantalla completa, N anota un comentario de mejora y R muestra el ritmo de la clase. Los botones funcionan con pantalla táctil. Las alternativas no revelan respuestas al seleccionarlas.

El índice incluye una galería de plantillas descargables y filtrables por momento de clase para incorporar la mascota con presencia sutil, pedagógica o de marca. Las reglas de autoría y el plan de crecimiento están en [Presencia de Profe Piña](docs/presencia-mascota.md).

## Comprobar y exportar

Desde `plataforma/`:

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

El **PDF final** aparece en `plataforma/output/pdf/sistemas-2x2.pdf`: una página por diapositiva, pasos y respuestas visibles, sin notas. `npm run export:pdf -- --published` exporta todas las clases publicadas (lo usa CI). Con `--pasos` se crea además el **PDF por pasos**, `output/pdf/<clase>-pasos.pdf`, con una página por paso de cada diapositiva tal como se proyecta (la última de cada una queda completa); en la pestaña PDF de la clase, «Con pasos» imprime esa misma versión. El comando inicia una vista previa en el puerto 4173 y la cierra al terminar. Descarga el PDF antes de la clase para usarlo sin conexión. El PDF se genera también para clases en borrador, pero solo se publica en el sitio el de las clases con `status: published` (ver [Publicación](plataforma/docs/deployment.md)).

Consulta también los [principios pedagógicos](docs/pedagogia.md) y el [lenguaje visual común](docs/lenguaje-visual.md), que rigen las clases y la galería.

## Crear una clase

```sh
npm run lesson:new -- --id mi-nueva-clase --curso m1-2027
```

Se crea un borrador en la carpeta del curso (`contenido/cursos/competencia-matematica-3m/clases/mi-nueva-clase`) con `clase.yaml`, `guia.md` y una portada. Completa primero la guía, luego los tramos y las láminas; comprueba el contenido y cambia `status` a `published` cuando esté lista. También puedes crear y preparar clases desde Clases, en la app. Consulta [Cómo trabajar el contenido](contenido/LEEME.md), [Cómo escribir clases](contenido/como-escribir-clases.md), [Arquitectura](plataforma/docs/architecture.md) y [Publicación](plataforma/docs/deployment.md).

El repositorio conserva el ZIP de origen en `plataforma/archive/`. El motor nuevo reemplaza su parser manual; las demos originales no se publican.

## Siguientes etapas

La sincronización de datos privados, la votación entre dispositivos, el sitio Astro, el mapa anual y el banco ampliado están definidos en [Roadmap](plataforma/docs/roadmap.md). La revisión del docente y el ensayo con su proyector siguen siendo pasos humanos antes de usarlo en aula.
