# Láminas

## Frontmatter

El frontmatter de cada MDX tiene id, title, phase, momento (solo en clases de video), layout, steps y activities, en ese orden, y al final `notas` si la lámina tiene notas del orador (texto entre comillas dobles; solo para el docente, no se proyectan ni salen en el PDF), con el título entre comillas simples; el `id` coincide con el nombre del archivo. content:check exige esa forma para que la app y el código escriban lo mismo. Fases: inicio, activacion, desarrollo, practica, cierre. Layouts: portada, concepto, dos-columnas, resolucion, ejercicio y, para video, escena.

### Notas del orador

`notas` es un campo opcional, al final del frontmatter, con texto entre comillas dobles. Orienta al docente mientras presenta: aparece en el panel del presentador, no se proyecta y no sale en el PDF. Las notas son **públicas**: están en el repositorio y en el sitio de las clases publicadas aunque la interfaz no las muestre al estudiante. No llevan datos de cursos, estudiantes ni observaciones identificables.

## Portada

La portada conserva el título principal y presenta directamente un bloque **Objetivo de clase**. No añade subtítulo descriptivo, duración ni una ruta temática del tipo “Ecuaciones → Sistemas → Modelamiento”; esos datos pertenecen al plan de la clase, no al lienzo proyectado.

## Escritura y pasos

Escribe Markdown normal y matemáticas en línea con `$...$`. Para ecuaciones centrales, coloca cada delimitador `$$` en su propia línea y deja una línea vacía después del cierre. Escapa los signos monetarios como `\$2.000`. Cada diapositiva es un archivo, evitando dobles escapes de cadenas TypeScript. Usa etiquetas en español: Definicion, Propiedad, Teorema, EjemploResuelto, PracticaGuiada, ErrorTipico, PracticaIndividual, Cierre y Columnas.

```mdx
<Paso n={1}>
  <Comprobacion titulo="Comprobación">$2(4)+3=11$.</Comprobacion>
</Paso>
```

`steps` debe coincidir con el máximo paso y la secuencia debe empezar en 1. Un mismo paso puede revelar varios fragmentos. No anidar pasos. No insertar estilos por diapositiva ni JavaScript arbitrario.

## Lectura de expresiones

Para leer expresiones con el curso, usa `TablaLectura` (tres encabezados separados por `|`) con una `FilaLectura` por expresión: `nombre`, `rasgo` (por ejemplo, el tipo de función) y el `paso` en que aparece el rasgo. Dentro de la expresión, `Senal` muestra en su `paso` una ficha piedra cuya muesca apunta al término que envuelve, encima (`posicion="arriba"`), debajo (`posicion="abajo"`) o a la derecha (por defecto). Con `numero`, la ficha se conecta con un `ItemLeyenda` de una `Leyenda`, que recuerda qué significa cada término en el contexto; `ItemLeyenda` acepta su propio `paso`. Para señalar un término, divide la fórmula y usa `{}` para conservar el espaciado:

```mdx
<TablaLectura encabezados="Plan|Expresión|Tipo">
<FilaLectura nombre="Base" rasgo="afín" paso={1}>
<Asociacion tono={2}>$B(x)={}$<Senal paso={2} numero={1} texto="pendiente" posicion="arriba">$300$</Senal>$x+1.500$</Asociacion>
</FilaLectura>
</TablaLectura>

<Paso n={2}>
<Leyenda>
<ItemLeyenda numero={1}>$300$: **pendiente** (\$300 por km, cargo dependiente)</ItemLeyenda>
</Leyenda>
</Paso>
```

Si dos fichas de una misma expresión se superponen, ubica una encima y otra debajo.

## Semáforo

Para la autoevaluación del cierre, `Semaforo` muestra un semáforo con el significado escrito de cada luz: `<Semaforo rojo="Necesito repasarlo con ayuda." amarillo="Lo entendí, pero me quedan dudas." verde="Lo entendí y podría explicárselo a alguien." />`. Va dentro de un bloque `Cierre`.

## Tonos de asociación

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

## Mascota en la lámina

La integración preferida es `Composicion plantilla="pedagogica-modelado"`, que reserva espacio para contenido y mascota. `MascotaProfePina` queda para composiciones existentes con espacio verificado. Cada diapositiva admite como máximo una. Declara siempre una descripción alternativa que explique su función, no solo su apariencia.

```mdx
<MascotaProfePina
  pose={68}
  nivel="pedagogica"
  ubicacion="grafico"
  alt="Profe Piña usa una lupa para destacar la intersección de las rectas."
/>
```

Los niveles y las poses autorizadas están en [Presencia de Profe Piña](../../docs/presencia-mascota.md). La mascota solo puede usar poses cuya imagen esté en el repositorio (las de la galería); para usar una pose nueva, ver [Recursos de Profe Piña](../comun/mascotas/README.md).

## Diseño compartido

Aplica el [lenguaje visual](../../docs/lenguaje-visual.md) antes de elegir bloques. Usa Objetivo para el propósito de clase; Definicion solo para definiciones formales. Las reglas son comunes a todas las plantillas.

La galería permite filtrar por nivel y momento, agregar la plantilla al final de la clase activa (desde la app) o descargar una diapositiva MDX válida. Si la descargas, guarda el archivo en `laminas/`, adapta su contenido y añade el nombre a clase.yaml. También puedes crear un borrador con una plantilla, desde `plataforma/`: `npm run lesson:new -- --id nueva-clase --curso m1-2027 --plantilla pedagogica-modelado`. Las ayudas son ejemplos editables, no contenido curricular listo para publicar.
