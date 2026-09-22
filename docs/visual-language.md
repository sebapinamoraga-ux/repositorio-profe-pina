# Lenguaje visual de todas las clases

Decisión acordada el 21-09-2026, aplicada a Sistemas 2×2 y obligatoria para nuevas clases y plantillas de la galería. El diseño se elige por la función docente; la pose y el color no sustituyen esa decisión.

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
- **Comparación como registro:** dos paneles simétricos, pasos equivalentes alineados y resultado compartido. Puede pasarse sin explicación oral; el documento mantiene el desarrollo.
- **Cierre:** preguntar por el aprendizaje y por la experiencia con la presentación; no confundir reflexión con definición.

`Paneles columnas={2|3}` organiza tarjetas; `Tarjeta` acepta `titulo`, una `etiqueta` opcional y un `tono` de asociación entre 1 y 4. `Etiquetas` conserva referencias breves y `Etiqueta` permite asociarlas. `Asociacion` aplica el mismo fondo a una expresión breve en el texto. Se usan los mismos componentes en clases y archivos descargados de la galería.

## Mascota dentro de la composición

Preferir `Composicion plantilla="identificador"` con una plantilla del catálogo. El componente reserva una columna lateral; para comparación, gráfico y síntesis reserva una franja inferior. La mascota nunca se superpone a fórmulas, ejes o instrucciones. `nota` es opcional y debe explicar una acción pertinente, sin dar la respuesta durante la práctica.

Una mascota como máximo por lámina, incluida la incorporada mediante Composicion. No añadir otra MascotaProfePina dentro de esa composición. Mantener diapositivas sin mascota cuando eso dé más espacio al contenido. La integración usa el identificador estable de la galería y hereda pose, nivel y descripción accesible.

## Decisiones concretas de Sistemas 2×2

Se mantienen 25 láminas y 80 minutos. Las láminas 03 y 04 siguen separadas: la primera traduce la compra y la segunda contrasta dos pares posibles; comparten las etiquetas de variables y unidades. Se retira la pregunta sobre 2x. La 06 se titula «Dos ecuaciones, dos incógnitas» y contiene la definición formal «Sistema de ecuaciones lineales de 2x2» en azul. La 07 presenta reducción, sustitución e igualación como definiciones formales de los métodos, también azules. Las 10, 12, 14 y 16 aplican los patrones anteriores. La portada conserva título y objetivo en violeta suave.

Plantillas incorporadas: pedagogica-punto-clave (03), pedagogica-modelado (10 y 12), pedagogica-pista (14), pedagogica-comprobacion (15), pedagogica-comparacion (16), sutil-practica (21) y sutil-metacognicion (25). La portada conserva su presencia de marca. El uso se decide por su función, no por intentar mostrar todas las poses.

## Validación antes de entregar

Conservar los IDs, contenido en content y ecuaciones verificadas. Ejecutar content:check, typecheck, lint, test, build y test:e2e. Revisar estados inicial y revelado, miniaturas de galería, plantillas descargadas y PDF. Una página por diapositiva; sin controles, notas, recortes ni scroll interno. Dividir antes de reducir la tipografía. No publicar borradores ni afirmar revisión docente o ensayo en proyector.
