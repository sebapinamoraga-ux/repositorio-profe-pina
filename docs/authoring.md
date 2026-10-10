# Autoría de clases

Una clase contiene lesson.yaml y slides/\*.mdx. El manifiesto especifica ID estable, título, asignatura, eje, duración, prerrequisitos, objetivos observables, habilidades, referencias curriculares, estado y orden. La referencia inicial es m1-2027-sistemas; crear otra referencia al cambiar de conocimiento.

El frontmatter de cada MDX tiene id, title, phase, layout, steps y activities, en ese orden, con el título entre comillas simples; el `id` coincide con el nombre del archivo. content:check exige esa forma para que la app y el código escriban lo mismo. Fases: inicio, activacion, desarrollo, practica, cierre. Layouts: portada, concepto, dos-columnas, resolucion, ejercicio.

La portada conserva el título principal y presenta directamente un bloque **Objetivo de clase**. No añade subtítulo descriptivo, duración ni una ruta temática del tipo “Ecuaciones → Sistemas → Modelamiento”; esos datos pertenecen al plan de la clase, no al lienzo proyectado.

Escribe Markdown normal y matemáticas en línea con `$...$`. Para ecuaciones centrales, coloca cada delimitador `$$` en su propia línea y deja una línea vacía después del cierre. Escapa los signos monetarios como `\$2.000`. Cada diapositiva es un archivo, evitando dobles escapes de cadenas TypeScript. Usa etiquetas en español: Definicion, Propiedad, Teorema, EjemploResuelto, PracticaGuiada, ErrorTipico, PracticaIndividual, Cierre y Columnas.

```mdx
<Paso n={1}>
  <Comprobacion titulo="Comprobación">$2(4)+3=11$.</Comprobacion>
</Paso>
```

`steps` debe coincidir con el máximo paso y la secuencia debe empezar en 1. Un mismo paso puede revelar varios fragmentos. No anidar pasos. No insertar estilos por diapositiva ni JavaScript arbitrario.

Para conectar visualmente un mismo referente, usa `tono={1}`, `tono={2}`, `tono={3}` o `tono={4}` en `Etiqueta`, `Tarjeta` y `Asociacion`. Conserva la correspondencia durante toda la secuencia y no uses el tono para indicar acierto, error o función del bloque.

```mdx
<Etiquetas>
  <Etiqueta tono={1}>$x$: precio del sándwich</Etiqueta>
</Etiquetas>
<Tarjeta titulo="2 sándwiches" tono={1}>
  $2x$
</Tarjeta>
<Asociacion tono={1}>$x=1.200$</Asociacion>
```

En una ecuación central, la única extensión HTML autorizada de KaTeX es `\htmlClass{asoc-N}{...}`, con `N` entre 1 y 4. La clase solo añade el fondo reservado: `\htmlClass{asoc-1}{2x}`. No se permiten otras clases, enlaces ni estilos HTML dentro de una fórmula.

La integración preferida es `Composicion plantilla="pedagogica-modelado"`, que reserva espacio para contenido y mascota. `MascotaProfePina` queda para composiciones existentes con espacio verificado. Cada diapositiva admite como máximo una. Declara siempre una descripción alternativa que explique su función, no solo su apariencia.

```mdx
<MascotaProfePina
  pose={68}
  nivel="pedagogica"
  ubicacion="grafico"
  alt="Profe Piña usa una lupa para destacar la intersección de las rectas."
/>
```

Los niveles y poses autorizados son: marca (45), pedagógica (01–20, 68 y 76) y sutil (43, 46, 47, 48, 79 y 81). Consulta [Presencia de la mascota](mascot-presence.md) antes de elegir nivel y ubicación.

Teorema recibe hipotesis y conclusion como texto. Formula recibe tex para notación dinámica. GraficoSistema recibe sumaInicial y sumaEstatica; usa un rango de 3 a 9 y la segunda ecuación x−y=1. El control conserva su estado al salir de la diapositiva y permite restablecerlo.

PreguntaPAES recibe id y paso. Declara el ID también en activities del frontmatter y crea su YAML en content/activities con enunciado, respuesta, solución, habilidades, procedencia y alternativas con explicación. Solo usa fuente oficial cuando exista una referencia verificable. El PDF siempre revela la respuesta y explicación global.

Si la pregunta se resuelve con un sistema 2×2, declara en el YAML `model.equations` (dos ecuaciones `[a, b, c]` de ax + by = c, en las unidades del enunciado) y el `pair: [x, y]` de cada alternativa. `content:check` resuelve el sistema y exige que la alternativa correcta sea su solución única y que ningún distractor la cumpla; también que las alternativas no repitan pares, que su texto muestre los valores del par, que la solución escrita mencione la solución real y que la respuesta comience con la letra correcta. Con `model`, todas las alternativas deben llevar `pair`, y un `pair` sin `model` se rechaza.

La tipografía base es 31–32 px en el lienzo; no encoger para meter más texto. Separar un desarrollo en varias diapositivas. Cada página debe sostener una idea principal y caber completa sin scroll. Validar toda ecuación y verificar soluciones en el sistema original.

La clase incluida dura 80 minutos y conserva el título, el objetivo y el ejemplo de las compras. La distribución docente del tiempo (no se proyecta) vive en `tramos` de lesson.yaml: cada tramo tiene `label`, `from` y `to` (nombres de archivo sin `.mdx`) y `minutes`. Los tramos son contiguos, cubren todas las diapositivas en orden y sus minutos suman `duration`; content:check lo verifica. Un tramo de 0 minutos marca una lámina de consulta.

La lista opcional `repaso` de lesson.yaml nombra láminas solo para el repaso del estudiante: en el celular siguen a las de la clase bajo «Para seguir explorando», pero no se proyectan, no salen en el PDF ni cuentan en los tramos. Viven en la misma carpeta slides/, se validan con las mismas reglas y sus identificadores no pueden repetir los de la clase. Sirven para exploraciones y preguntas que no caben en los 80 minutos. En el editor docente aparecen en la sección «Repaso del estudiante», bajo las láminas de la clase (numeradas R1, R2…): ahí se editan, se agregan desde la galería, se reordenan y se quitan. Esos cambios solo reescriben sus .mdx y la lista `repaso` (que desaparece si queda vacía); no tocan `slides` ni `tramos`.

La lámina `modelar` queda como registro para consulta: se pasa sin revisarla durante la clase. En el ticket, dar seis minutos de trabajo antes de mostrar las alternativas; dedicar cuatro minutos a contrastar, resolver y discutir el error. La actividad es de elaboración propia, no una pregunta oficial PAES.

`GraficoRectas` representa dos ecuaciones generales a partir de sus coeficientes, con una ventana del primer cuadrante y una descripción accesible. Es estático y distingue la segunda recta con trazo discontinuo para hacer visible la coincidencia. Los sistemas específicos se declaran exclusivamente en el contenido.

`GraficoFuncion` dibuja una sola curva estática en una ventana con los cuatro cuadrantes. Recibe `tipo` (`afin` con `m` y `n`; `cuadratica` con `a`, `b` y `c`; `circunferencia` con `h`, `k` y `r`), los límites `xMin`, `xMax`, `yMin` e `yMax`, una `etiqueta` y una `descripcion`. Opcionalmente, `paso` (grilla, 1 por defecto), `puntosX` (marca y rotula los puntos de la tabla) y `rectaVertical` (recta discontinua y sus cortes). La circunferencia usa la misma escala en ambos ejes; las funciones ocupan todo el lienzo. Para funciones afines también acepta `pasoY` (grilla vertical propia), `ejeX` y `ejeY` (nombres de los ejes), `marcarCorteY` (punto (0, n) rotulado) y `pendienteEn` (triángulo +1 en x, +m en y desde ese valor). La matemática vive en `packages/interactives/src/function-graph.ts` y content:check exige los coeficientes del tipo elegido.

`GraficoComparacion` dibuja dos funciones afines en un mismo plano (`m1`, `n1`, `m2`, `n2`, ventana, `pasoX`, `pasoY`, `ejeX`, `ejeY`, `etiqueta1`, `etiqueta2`, `descripcion`). Marca su intersección, que es la solución del sistema, con guías hacia los ejes; con `resaltarMenor` pinta sobre el eje x el tramo en que cada función toma el menor valor. `marcarInterseccion={false}` oculta el punto y `rotularInterseccion={false}` lo muestra sin sus coordenadas, para estimarlo antes de resolver el sistema.

`ExploradorCuadratica` es interactivo: dibuja $y=ax^2+bx+c$ con controles para `a` y `c`; `b` queda fijo salvo con `variarB`, que agrega su control (entonces `b` es el valor inicial, `bEstatico` el del PDF y `bMin`, `bMax` y `bPaso` su rango). `marcarVertice` marca y rotula el vértice. Recibe `id` (clave de estado), `b`, `aInicial` (distinto de 0), `cInicial`, `aEstatico` y `cEstatico` (los valores del PDF), la ventana y `descripcion`; opcionalmente `aMin`, `aMax`, `aPaso`, `cMin`, `cMax`, `cPaso`, `paso` y `pasoY`. La curva inicial queda discontinua como referencia cuando cambian los parámetros, el corte $(0; c)$ se marca y «Restablecer» vuelve a los valores iniciales. Con `a = 0` dibuja la recta y lo advierte en la leyenda.

`MaquinaFuncion` muestra una función como máquina: `entrada`, `regla` y `salida` (textos breves) y `descripcion`.

`DiagramaSagital` dibuja dos conjuntos (`entradas`, `salidas`, `tituloEntradas`, `tituloSalidas`) unidos por `flechas` escritas como `'3 → 9'`, con hasta seis elementos por conjunto. Las entradas sin imagen o con más de una se destacan en ocre junto con sus flechas, y las salidas que nadie alcanza quedan atenuadas: así se ven a la vez el dominio, el recorrido y por qué una relación no es función. content:check exige todos sus atributos y el componente rechaza flechas hacia elementos que no existen.

`RectaIntervalos` representa uno o dos intervalos en una recta numérica (`min`, `max`, `paso`, `intervalos`, `etiquetas`, `descripcion`). Los intervalos se escriben en notación escolar con punto y coma entre extremos para no confundirlos con la coma decimal: `intervalos={['[0; 7,5[', ']7,5; +∞[']}`. `tonos` elige el color de cada intervalo (1 o 2) para mantener la correspondencia con otros gráficos. Un extremo cerrado se dibuja con círculo lleno, uno abierto con círculo vacío y el infinito con flecha; un extremo infinito cerrado se rechaza.

## Editar desde la app

Todo lo que se describe arriba también se edita desde la app (rol Docente), en cualquier dispositivo, y queda guardado en el repositorio. La primera vez en cada dispositivo, conecta la app en **Conexión**:

1. En GitHub abre *Settings → Developer settings → Fine-grained personal access tokens → Generate new token*.
2. Ponle un nombre (por ejemplo «Aula · tablet») y una fecha de vencimiento.
3. En *Repository access* elige *Only select repositories* y marca solo este repositorio.
4. En *Repository permissions* da **Contents: Read and write**. Opcional: **Actions: Read-only**, para ver en la app si la publicación terminó.
5. Copia el token y pégalo en Conexión. Si pierdes el dispositivo, revócalo en GitHub.

Sin conexión la app muestra el contenido publicado y no permite editar.

- **Biblioteca**: unidades, orden y clases planificadas (`content/planning/*.yaml`); preparar una clase desde la estructura base o desde otra clase; duplicar y eliminar. La marca «Lista / En preparación» también se guarda en la planificación; «Por preparar» significa que la clase aún no tiene lesson.yaml. Las clases del repositorio que la planificación no ubica aparecen en «Sin unidad».
- **Datos de la clase** (Biblioteca → ⋯, o desde el editor): título, asignatura, eje, duración, objetivos, conocimientos previos, habilidades, referencias curriculares, tramos y estado. Pasar a «Publicada» pide confirmación: al guardar, la clase aparece en el sitio público.
- **Editor**: láminas (título, momento, diseño, pasos, identificador, orden), el texto de cada bloque y los parámetros de interactivos, preguntas PAES y mascota como formulario. El MDX completo queda en «MDX de la lámina» para lo que el formulario no cubre.
- **Actividades y PAES**: enunciado, alternativas con la correcta y sus explicaciones, respuesta, solución, habilidades, fuente y el sistema 2×2 que comprueba las alternativas. Cada actividad se comprueba antes de aplicarse.

Cada cambio queda pendiente en ese navegador (la barra superior los cuenta) hasta pulsar **Guardar en el repositorio**. Guardar revisa todo con las reglas de content:check —si algo falla, no se guarda y se indica qué— y crea un único commit en `main`. GitHub Actions vuelve a verificar y publica en unos minutos; si la verificación falla, el sitio sigue con la versión anterior y la barra lo avisa. Si otro dispositivo cambió los mismos archivos, la app muestra las diferencias y pregunta qué versión conservar. Sin red, el guardado espera y se envía al reconectar. «Copia ZIP» descarga lesson.yaml y slides/*.mdx como respaldo; no hace falta para publicar.

La mascota solo puede usar poses cuya imagen esté en el repositorio (las de la galería). Para usar una pose nueva, agrega su PNG y su línea `!` en `.gitignore` desde el código.

Un interactivo nuevo necesita, además del componente, su ficha en `packages/content-model/src/interactive-params.ts` (parámetros, tipo y obligatorios): el formulario del editor y content:check la usan, así que lo que el formulario permite siempre compila.

## Diseño compartido

Aplica el [lenguaje visual](visual-language.md) antes de elegir bloques. Usa Objetivo para el propósito de clase; Definicion solo para definiciones formales. Las reglas son comunes a todas las plantillas.

La galería permite filtrar por nivel y momento, agregar la plantilla al final de la clase activa (desde la app) o descargar una diapositiva MDX válida. Si la descargas, guarda el archivo en slides, adapta su contenido y añade el nombre a lesson.yaml. También puedes crear un borrador con una plantilla: `npm run lesson:new -- --id nueva-clase --plantilla pedagogica-modelado`. Las ayudas son ejemplos editables, no contenido curricular listo para publicar.
