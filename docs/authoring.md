# Autoría de clases

Una clase contiene lesson.yaml y slides/\*.mdx. El manifiesto especifica ID estable, título, asignatura, eje, duración, prerrequisitos, objetivos observables, habilidades, referencias curriculares, estado y orden. La referencia inicial es m1-2027-sistemas; crear otra referencia al cambiar de conocimiento.

El frontmatter de cada MDX tiene id, title, phase, layout, steps y activities. Fases: inicio, activacion, desarrollo, practica, cierre. Layouts: portada, concepto, dos-columnas, resolucion, ejercicio.

La portada conserva el título principal y presenta directamente un bloque **Objetivo de clase**. No añade subtítulo descriptivo, duración ni una ruta temática del tipo “Ecuaciones → Sistemas → Modelamiento”; esos datos pertenecen al plan de la clase, no al lienzo proyectado.

Escribe Markdown normal y matemáticas en línea con `$...$`. Para ecuaciones centrales, coloca cada delimitador `$$` en su propia línea y deja una línea vacía después del cierre. Escapa los signos monetarios como `\$2.000`. Cada diapositiva es un archivo, evitando dobles escapes de cadenas TypeScript. Usa etiquetas en español: Definicion, Propiedad, Teorema, EjemploResuelto, PracticaGuiada, ErrorTipico, PracticaIndividual, Cierre y Columnas.

```mdx
<Paso n={1}>
  <Comprobacion titulo="Comprobación">$2(4)+3=11$.</Comprobacion>
</Paso>
```

`steps` debe coincidir con el máximo paso y la secuencia debe empezar en 1. Un mismo paso puede revelar varios fragmentos. No anidar pasos. No insertar estilos por diapositiva ni JavaScript arbitrario.

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

La lámina `modelar` queda como registro para consulta: se pasa sin revisarla durante la clase. En el ticket, dar seis minutos de trabajo antes de mostrar las alternativas; dedicar cuatro minutos a contrastar, resolver y discutir el error. La actividad es de elaboración propia, no una pregunta oficial PAES.

`GraficoRectas` representa dos ecuaciones generales a partir de sus coeficientes, con una ventana del primer cuadrante y una descripción accesible. Es estático y distingue la segunda recta con trazo discontinuo para hacer visible la coincidencia. Los sistemas específicos se declaran exclusivamente en el contenido.

## Diseño compartido

Aplica el [lenguaje visual](visual-language.md) antes de elegir bloques. Usa Objetivo para el propósito de clase; Definicion solo para definiciones formales. Las reglas son comunes a todas las plantillas.

La galería permite filtrar por nivel y momento y descargar una diapositiva MDX válida. Guarda el archivo en slides, adapta su contenido y añade el nombre a lesson.yaml. También puedes crear un borrador con una plantilla: `npm run lesson:new -- --id nueva-clase --plantilla pedagogica-modelado`. Las ayudas son ejemplos editables, no contenido curricular listo para publicar.
