# Lenguaje visual de todas las clases

> Estado: vigente desde el 21-09-2026 · Ámbito: clases de aula y de video, y plantillas de la galería (obligatorio para las nuevas) · Autoridad: el docente.

El diseño se elige por la función docente; la pose y el color no sustituyen esa decisión. Esta norma no enumera láminas de ninguna clase: las decisiones de una clase están en su guía.

## Significado de los bloques

| Función                              | Componente                          | Apariencia                                                                                                                            |
| :----------------------------------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| Definición formal                    | Definicion, Teorema                 | Azul: uso exclusivo para una definición o enunciado matemático formal. Las definiciones de métodos también pertenecen a esta familia. |
| Objetivo                             | Objetivo                            | Violeta suave; orienta el aprendizaje esperado sin confundirse con una definición.                                                    |
| Procedimiento, relación, ejemplo     | Tarjeta, Propiedad, EjemploResuelto | Piedra cálida y jerarquía de pasos.                                                                                                   |
| Práctica y ayuda                     | PracticaGuiada, PracticaIndividual  | Ocre; consigna y condiciones de trabajo.                                                                                              |
| Error                                | ErrorTipico                         | Ocre, etiqueta de error y evidencia del fallo.                                                                                        |
| Verificación o resultado contrastado | Comprobacion                        | Verde suave, con evidencia algebraica o comparación explícita.                                                                        |
| Reflexión                            | Cierre                              | Rosa suave; preguntas breves y espacio para responder.                                                                                |

Los encabezados e iconos comunican la función aun sin distinguir el color. Un resultado intermedio no es una comprobación. No usar Definicion como caja decorativa, para incógnitas, objetivos, consignas o conclusiones. El azul de rectas, navegación o texto no representa un bloque de definición. Los seis fondos funcionales son suaves; el color organiza, pero nunca sustituye el nombre del bloque.

## Asociaciones pedagógicas locales

La paleta de asociaciones conecta un mismo referente dentro de una secuencia sin alterar la función del bloque. Usa cuatro fondos reservados: agua `#dcf2f0`, durazno `#f9e8d9`, lila `#eae8f5` y rosa grisáceo `#f2e8ec`. La correspondencia es local a cada secuencia y debe mantenerse estable entre sus láminas; por ejemplo, si `x` representa sándwiches con el tono 1, ese tono acompaña a `x`, a «2 sándwiches» y al término `2x`.

La asociación se expresa solo mediante el fondo. No cambia tipografía, color de texto, borde ni subrayado. No comunica corrección, error ni tipo de bloque, y no reemplaza los colores funcionales de la tabla anterior. Como regla de legibilidad, mostrar como máximo tres tonos de asociación en una misma lámina; el cuarto queda disponible cuando el contenido realmente lo requiera.

## Patrones de composición reutilizables

- **Modelación:** etiquetas persistentes de variables y unidades, enunciado, correspondencia cantidad × precio y ecuación. Si continúa en otra lámina, repetir etiquetas y ecuación para conservar el hilo.
- **Métodos:** tres tarjetas con nombre, verbo de acción y esquema breve. Señalar el énfasis sin presentar los otros métodos como incorrectos.
- **Reducción:** ecuaciones verticales alineadas, signo de suma y línea de resultado; mostrar qué términos se cancelan antes de despejar. No comprimir todo en una línea de texto.
- **Sustitución:** recorrido numerado Despejar → Reemplazar → Resolver. Relacionar visualmente la expresión despejada con su posición en la otra ecuación.
- **Práctica:** sistema o pregunta a un lado y recorrido a otro. Mostrar modalidad y tiempo. No anticipar la solución en la mascota ni en la consigna.
- **Lectura de expresiones:** tabla con nombre, expresión y un rasgo que se revela por fila; fichas piedra numeradas cuya muesca apunta al término, y una leyenda que recuerda su significado en contexto. Las fichas y la leyenda usan la familia piedra, no los tonos de asociación.
- **Comparación como registro:** dos paneles simétricos, pasos equivalentes alineados y resultado compartido. Puede pasarse sin explicación oral; el documento mantiene el desarrollo.
- **Cierre:** preguntar por el aprendizaje y por la experiencia con la presentación; no confundir reflexión con definición.

`Paneles columnas={2|3}` organiza tarjetas; `Tarjeta` acepta `titulo`, una `etiqueta` opcional y un `tono` de asociación entre 1 y 4. `Etiquetas` conserva referencias breves y `Etiqueta` permite asociarlas. `Asociacion` aplica el mismo fondo a una expresión breve en el texto. Se usan los mismos componentes en clases y archivos descargados de la galería.

## Mascota dentro de la composición

Preferir `Composicion plantilla="identificador"` con una plantilla del catálogo: reserva una columna lateral (o una franja inferior en comparación, gráfico y síntesis) para que la mascota nunca se superponga a fórmulas, ejes o instrucciones. Las reglas de uso (una por lámina, niveles, poses, descripción alternativa) están en [Presencia de Profe Piña](presencia-mascota.md).

## Revisión visual antes de entregar

Además de la [lista de verificación](../AGENTS.md#antes-de-entregar): revisar cada lámina en su estado inicial y con todos los pasos revelados, las miniaturas de la galería, las plantillas descargadas y el PDF (una página por diapositiva, sin controles, notas, recortes ni scroll interno). Dividir antes de reducir la tipografía.

## Qué comprueba el código y qué no

`content:check` verifica los tonos de asociación (1–4), la mascota única y los pasos. No verifica que el bloque corresponda a su función (por ejemplo, `Definicion` como caja decorativa) ni que la lámina quede clara: eso es revisión visual.
