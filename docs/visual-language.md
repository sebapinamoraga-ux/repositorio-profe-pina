# Lenguaje visual de todas las clases

Decisión acordada el 21-09-2026, revisada el mismo día para asignar un color a cada momento pedagógico y reservar cinco colores de asociación. Se aplica a Sistemas 2×2 y es obligatoria para nuevas clases y plantillas de la galería. El diseño se elige por la función docente; la pose y el color no sustituyen esa decisión.

## Color por momento pedagógico

Cada momento tiene un color propio, un ícono y una etiqueta. Un bloque de momento lleva fondo tenue y barra lateral gruesa.

| Momento | Componente | Color |
| :--- | :--- | :--- |
| Propósito y reflexión | Objetivo, Cierre | Violeta. Objetivo de clase, pregunta central y «Antes de irnos». |
| Datos y procedimiento | Tarjeta, Propiedad, EjemploResuelto, Etiquetas | Gris azulado. Enunciados, unidades, pasos y relaciones sin definición ni resultado. |
| Definición formal | Definicion | Azul. Uso exclusivo para una definición matemática explícita, incluidos los métodos y los casos de solución. |
| Verificación | Comprobacion | Verde. Su título por defecto es «Verifiquemos». |
| Práctica y error | PracticaGuiada, PracticaIndividual, ErrorTipico | Ocre. Consigna, condiciones de trabajo y evidencia del fallo. |
| Ticket de salida | Ticket, PreguntaPAES | Rosa. Enunciado, alternativas y resolución del ticket. La respuesta correcta sigue en verde y el error, en ocre. |
| Registro para consulta | Registro | Arena con borde punteado. Material que se muestra para «sacar una foto» o compartir, no para revisar en detalle. |

Los encabezados e iconos comunican la función aun sin distinguir el color. Un resultado intermedio no es una comprobación. No usar Definicion como caja decorativa, para incógnitas, objetivos, consignas o conclusiones. El azul de rectas, navegación o texto no representa un bloque de definición.

## Colores de asociación

Cinco colores reservados enlazan cajas o términos que representan lo mismo en distintos lugares de una lámina. No sustituyen al color del momento y solo se usan donde asociar aporta comprensión.

| Tono | Color | Significado en Sistemas 2×2 |
| :--- | :--- | :--- |
| 1 | Turquesa | Primera incógnita (x) |
| 2 | Ámbar | Segunda incógnita (y) |
| 3 | Azul marino | Condición 1: primera compra o ecuación |
| 4 | Ladrillo | Condición 2: segunda compra o ecuación |
| 5 | Lavanda | Solución o resultado |

Reglas:

1. Solo enlazan partes que representan lo mismo; el color no decora.
2. El mismo tono significa lo mismo en toda la clase. Otra clase puede declarar otros significados, pero debe mantenerlos de principio a fin.
3. Nunca reemplazan al color del momento: la caja sigue perteneciendo a su momento, salvo las cajas de datos que se enlazan.
4. Siempre hay texto redundante («x», «y», «Compra 1», «Ecuación 2»); el color refuerza, no es el único portador del significado.
5. Máximo cinco por lámina, uno por concepto.

Los colores se eligieron para distinguirse entre sí y de los colores de momento también con daltonismo rojo-verde y azul-amarillo (distancia perceptual ΔE mínima de 33 entre los cinco en las cuatro visiones simuladas). El azul marino es el más cercano al azul de definición (ΔE 22,8); por eso las asociaciones usan fondo blanco y borde grueso completo, mientras los momentos usan fondo tenue y barra lateral.

### Cómo se escriben

- **Cajas:** `<Tarjeta titulo="2 sándwiches" tono={1}>` y `<Etiqueta tono={2}>` dibujan borde grueso del color y fondo blanco.
- **Texto:** `<Asociado tono={4}>Ecuación 2</Asociado>` subraya el fragmento con el color.
- **Fórmulas:** `\htmlClass{asoc-3}{2x+3y=5.100}` subraya el fragmento dentro de KaTeX. Solo se admite `\htmlClass` con `asoc-1` a `asoc-5`; cualquier otro comando de confianza (`\href`, `\htmlStyle`, otras clases) hace fallar `content:check`.
- **Gráficos:** la recta 1 usa el tono 3, la recta 2 el tono 4 y la intersección el tono 5.

## Patrones de composición reutilizables

- **Modelación:** etiquetas persistentes de variables y unidades, enunciado, correspondencia cantidad × precio y ecuación. Cada incógnita conserva su tono en la etiqueta, la tarjeta y la ecuación. Si continúa en otra lámina, repetir etiquetas y ecuación para conservar el hilo.
- **Métodos:** tres definiciones azules con nombre, verbo de acción y esquema breve. Señalar el énfasis sin presentar los otros métodos como incorrectos.
- **Reducción:** ecuaciones verticales alineadas, signo de suma y línea de resultado; mostrar qué términos se cancelan antes de despejar. Los totales de cada ecuación conservan su tono. No comprimir todo en una línea de texto.
- **Sustitución:** recorrido numerado Despejar → Reemplazar → Resolver. La expresión despejada conserva el tono de su incógnita al reemplazarse, y cada paso nombra su ecuación con el tono correspondiente.
- **Práctica:** sistema o pregunta a un lado y recorrido a otro. Mostrar modalidad y tiempo. No anticipar la solución en la mascota ni en la consigna.
- **Registro:** dos paneles simétricos en arena, pasos equivalentes alineados y resultado compartido. Puede pasarse sin explicación oral; el documento mantiene el desarrollo.
- **Casos de solución:** bloque azul que nombra el caso (secantes, coincidentes, paralelas), ecuaciones y rectas con sus tonos y la solución en el tono 5.
- **Cierre:** preguntar por el aprendizaje y por la experiencia con la presentación; no confundir reflexión con definición.

`Paneles columnas={2|3}` organiza tarjetas o bloques sin márgenes extra entre ellos; `Tarjeta` acepta `titulo`, una `etiqueta` opcional y un `tono`. `Etiquetas` conserva referencias breves. Se usan los mismos componentes en clases y archivos descargados de la galería.

## Mascota dentro de la composición

Preferir `Composicion plantilla="identificador"` con una plantilla del catálogo. El componente reserva una columna lateral; para comparación, gráfico y síntesis reserva una franja inferior. La mascota nunca se superpone a fórmulas, ejes o instrucciones. `nota` es opcional y debe explicar una acción pertinente, sin dar la respuesta durante la práctica.

Una mascota como máximo por lámina, incluida la incorporada mediante Composicion. No añadir otra MascotaProfePina dentro de esa composición. Mantener diapositivas sin mascota cuando eso dé más espacio al contenido. La integración usa el identificador estable de la galería y hereda pose, nivel y descripción accesible.

## Decisiones concretas de Sistemas 2×2

Se mantienen 25 láminas y 80 minutos. Las láminas 03 y 04 siguen separadas: la primera traduce la compra y la segunda contrasta dos pares posibles; comparten las etiquetas de variables y unidades. Se retira la pregunta sobre 2x. La 06 conserva la definición formal azul. La 07 presenta los tres métodos como definiciones. La 08 nombra «Verifiquemos» al bloque verde, igual que la 11 y la 15. La 16 es un registro para consulta. Las 18 a 20 nombran el caso de solución en un bloque azul. Las 21 a 24 forman el ticket de salida en rosa. La portada conserva título y objetivo, en violeta.

Plantillas incorporadas: pedagogica-punto-clave (03), pedagogica-modelado (10 y 12), pedagogica-pista (14), pedagogica-comprobacion (15), pedagogica-comparacion (16), sutil-practica (21) y sutil-metacognicion (25). La portada conserva su presencia de marca. El uso se decide por su función, no por intentar mostrar todas las poses.

## Plantillas de la galería

El campo `uso` de cada plantilla determina el color de su bloque: `objetivo` y `cierre` (violeta), `procedimiento` (gris azulado), `definicion` (azul), `comprobacion` (verde), `practica` y `error` (ocre), `ticket` (rosa) y `registro` (arena). Añadir una plantilla nueva exige elegir el `uso` que corresponda a su función, no el que haga más vistosa la lámina.

## Validación antes de entregar

Conservar los IDs, contenido en content y ecuaciones verificadas. Ejecutar content:check, typecheck, lint, test, build y test:e2e. Revisar estados inicial y revelado, miniaturas de galería, plantillas descargadas y PDF. Una página por diapositiva; sin controles, notas, recortes ni scroll interno. Dividir antes de reducir la tipografía. No publicar borradores ni afirmar revisión docente o ensayo en proyector.
