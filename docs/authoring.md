# Autoría de clases

Una clase contiene lesson.yaml y slides/\*.mdx. El manifiesto especifica ID estable, título, asignatura, eje, duración, prerrequisitos, objetivos observables, habilidades, referencias curriculares, estado y orden. La referencia inicial es m1-2027-sistemas; crear otra referencia al cambiar de conocimiento.

El frontmatter de cada MDX tiene id, title, phase, layout, steps y activities. Fases: inicio, activacion, desarrollo, practica, cierre. Layouts: portada, concepto, dos-columnas, resolucion, ejercicio.

Escribe Markdown normal y matemáticas en línea con `$...$`. Para ecuaciones centrales, coloca cada delimitador `$$` en su propia línea y deja una línea vacía después del cierre. Escapa los signos monetarios como `\$2.000`. Cada diapositiva es un archivo, evitando dobles escapes de cadenas TypeScript. Usa etiquetas en español: Definicion, Propiedad, Teorema, EjemploResuelto, PracticaGuiada, ErrorTipico, PracticaIndividual, Cierre y Columnas.

```mdx
<Paso n={1}>
  <Propiedad titulo="Comprobación">$2(4)+3=11$.</Propiedad>
</Paso>
```

`steps` debe coincidir con el máximo paso y la secuencia debe empezar en 1. Un mismo paso puede revelar varios fragmentos. No anidar pasos. No insertar estilos por diapositiva ni JavaScript arbitrario.

Teorema recibe hipotesis y conclusion como texto. Formula recibe tex para notación dinámica. GraficoSistema recibe sumaInicial y sumaEstatica; usa un rango de 3 a 9 y la segunda ecuación x−y=1. El control conserva su estado al salir de la diapositiva y permite restablecerlo.

PreguntaPAES recibe id y paso. Declara el ID también en activities del frontmatter y crea su YAML en content/activities con enunciado, respuesta, solución, habilidades, procedencia y alternativas con explicación. Solo usa fuente oficial cuando exista una referencia verificable. El PDF siempre revela la respuesta y explicación global.

La tipografía base es 31–32 px en el lienzo; no encoger para meter más texto. Separar un desarrollo en varias diapositivas. Cada página debe sostener una idea principal y caber completa sin scroll. Validar toda ecuación y verificar soluciones en el sistema original.

La clase incluida dura 80 minutos: inicio 5, activación 8, concepto 7, modelado 15, práctica guiada 13, comparación 6, contexto 11, práctica individual 10, cierre 5. Las diapositivas 18 y 19 comparten el tiempo de discusión del problema contextual.
