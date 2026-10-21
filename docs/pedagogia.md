# Principios pedagógicos

> Estado: vigente · Ámbito: global (aula y video) · Autoridad: el docente.

Lo que toda clase sirve y lo que toda decisión de la plataforma debe proteger. El [lenguaje visual](lenguaje-visual.md) y la [presencia de Profe Piña](presencia-mascota.md) existen para esto: si una decisión de diseño o de código choca con un principio, gana el principio. Las cifras (80 minutos, 31–32 px, 8–18 láminas) son condiciones de un formato o de un curso, no principios; se indican donde corresponden.

## Principios

1. **Primero el propósito.** Una clase declara qué debe poder hacer el estudiante al salir (objetivos observables en `clase.yaml`, Propósito en `guia.md`) y dónde se ve que lo logró (Evidencia). La Evidencia nombra la lámina o actividad, la respuesta que cuenta como logro y el error que la distingue de un logro aparente. Una lámina que no sirve al Propósito ni a la Evidencia sobra o pasa al repaso del estudiante.
2. **De la situación a la idea.** Se parte de un contexto o una pregunta que hace necesaria la idea (las dos compras de Sistemas 2×2, el arriendo de bicicletas de Funciones) y se mantiene ese hilo a lo largo de la clase y entre clases. Cuando se presenta una definición o propiedad como general, se enuncia con su dominio y se separa del ejemplo que la ilustra («Ejemplo: …»), para que una propiedad del ejemplo no parezca general.
3. **Una idea por lámina.** Si no cabe, se divide la lámina, no se achica la letra (referencia en el lienzo de aula: 31–32 px para el texto de enseñanza). Los pasos revelan de a poco para pensar antes de ver.
4. **Práctica individual o guiada.** Es una política del docente: nunca en parejas ni en grupo. La consigna va en singular. El título de una práctica individual lleva modalidad y tiempo («Individual · 4 minutos»); el de una guiada, solo «Guiada». Hay tiempo para intentar antes de mostrar alternativas o solución.
5. **Los errores se anticipan.** Cada clase nombra los errores esperados y los trabaja de forma explícita: un bloque de error típico o distractores con su explicación.
6. **Se comprueba.** Toda ecuación se verifica en ambos miembros y toda solución en el problema original; comprobar una sola condición no basta.
7. **Se cierra con reflexión.** El cierre pregunta cómo se va cada estudiante y qué aprendió. El semáforo es una forma de hacerlo (mide percepción, no dominio; no basta como única evidencia).
8. **El tiempo es parte del diseño.** Los tramos suman la duración de la clase; una lámina de consulta dura 0 minutos; lo que no cabe va al repaso del estudiante. Se prefiere el desarrollo detallado (más láminas y pasos) mientras quepa; si excede el tiempo, sale primero la extensión y nunca la práctica individual ni el cierre.
9. **Notación y colores estables.** Una misma letra o un mismo tono de asociación nombran lo mismo durante toda la secuencia (por ejemplo, $m$ y $n$ en la función afín para no chocar con $ax^2+bx+c$).
10. **Honestidad.** Una actividad es de elaboración propia salvo que tenga fuente oficial verificable. No se afirma revisión docente ni ensayo en proyector que no hayan ocurrido. El repositorio es público: ni las guías ni las notas del orador llevan datos de cursos ni de estudiantes.
11. **Accesible.** El color nunca es la única señal: títulos, etiquetas e iconos comunican la función de cada bloque. Los gráficos, figuras y la mascota llevan una descripción alternativa que explica lo que muestran o la función que cumplen. El estudiante puede elegir entre temas claro, oscuro y de alto contraste.

## Cómo se comprueba cada principio

*Automático* bloquea el guardado o la publicación; *aviso* informa sin bloquear; *revisión* depende del docente.

| Principio | Qué comprueba la plataforma | Qué queda en revisión |
|---|---|---|
| 1 Propósito y evidencia | Automático: una clase publicada necesita Propósito, Evidencia y Errores esperados (solo que existan). Aviso en borradores | Que la Evidencia sea observable y cubra cada objetivo |
| 2 Situación e idea | — | Todo |
| 3 Una idea por lámina | Automático: PDF con una página por lámina, sin scroll ni recortes | Que la lámina tenga una sola idea |
| 4 Práctica individual | — (bloques `PracticaGuiada` y `PracticaIndividual`; `PreguntaPAES` con `mostrarRespuesta={false}`) | Modalidad, tiempo y consigna en singular |
| 5 Errores | Automático: cada alternativa PAES lleva su explicación | Que `ErrorTipico` aparezca donde la guía lo promete |
| 6 Se comprueba | Automático: sistemas 2×2 de las actividades con solución única | Todo lo demás |
| 7 Reflexión | — (`Cierre`, `Semaforo`) | Que exista y pregunte lo que corresponde |
| 8 Tiempo | Automático: tramos contiguos que suman `duration`, si la clase declara tramos | Que la clase sea realizable en ese tiempo |
| 9 Notación y colores | Automático: tonos de asociación 1–4, una mascota por lámina | Correspondencia estable entre láminas |
| 10 Honestidad | Automático: `dist:check` impide publicar borradores | Toda afirmación de revisión o ensayo |
| 11 Accesible | Automático: `descripcion` obligatoria en gráficos e interactivos y `alt` en la mascota | Que la descripción sea útil; contraste y lectura sin color |

Las reglas de escritura de clases están en [Cómo escribir clases](../contenido/como-escribir-clases.md).
