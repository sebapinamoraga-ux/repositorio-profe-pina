# Principios pedagógicos

Lo que toda clase sirve y lo que toda decisión de la plataforma debe proteger. El [lenguaje visual](lenguaje-visual.md) y la [presencia de Profe Piña](presencia-mascota.md) existen para esto: si una decisión de diseño o de código choca con un principio, gana el principio.

## Principios

1. **Primero el propósito.** Una clase declara qué debe poder hacer el estudiante al salir (objetivos observables en `clase.yaml`, Propósito en `guia.md`) y dónde se ve que lo logró (Evidencia). Una lámina que no sirve a ninguno de los dos sobra o pasa al repaso del estudiante.
2. **De la situación a la idea.** Se parte de un contexto o una pregunta que hace necesaria la idea (las dos compras de Sistemas 2×2, el arriendo de bicicletas de Funciones) y se mantiene ese hilo a lo largo de la clase y entre clases.
3. **Una idea por lámina.** La tipografía base es de 31–32 px en el lienzo; si no cabe, se divide la lámina, no se achica la letra. Los pasos revelan de a poco para pensar antes de ver.
4. **Práctica individual o guiada.** Nunca en parejas ni en grupo. La consigna va en singular, con modalidad y tiempo en el título («Individual · 4 minutos»), y hay tiempo para intentar antes de mostrar alternativas o solución.
5. **Los errores se anticipan.** Cada clase nombra los errores esperados y los trabaja de forma explícita: un bloque de error típico o distractores con su explicación.
6. **Se comprueba.** Toda ecuación se verifica en ambos miembros y toda solución en el problema original; comprobar una sola condición no basta.
7. **Se cierra con reflexión.** El cierre pregunta cómo se va cada estudiante (semáforo, preguntas de cierre), además de qué aprendió.
8. **El tiempo es parte del diseño.** Los tramos suman la duración de la clase; una lámina de consulta dura 0 minutos; lo que no cabe va al repaso del estudiante en el celular.
9. **Notación y colores estables.** Una misma letra o un mismo tono de asociación nombran lo mismo durante toda la secuencia (por ejemplo, $m$ y $n$ en la función afín para no chocar con $ax^2+bx+c$).
10. **Honestidad.** Una actividad es de elaboración propia salvo que tenga fuente oficial verificable. No se afirma revisión docente ni ensayo en proyector que no hayan ocurrido. La guía no lleva datos de cursos ni de estudiantes.

## Cómo los sostiene la plataforma

| Principio | Dónde se ve o se exige |
|---|---|
| Propósito y evidencia | `guia.md` de cada clase; content:check no deja publicar sin Propósito, Evidencia y Errores esperados. Se edita en la pestaña Resumen. |
| Una idea por lámina | Lienzo 16:9 sin scroll ni recortes; el PDF tiene exactamente una página por lámina. |
| Práctica individual y tiempo para intentar | Bloques `PracticaGuiada` y `PracticaIndividual`; `PreguntaPAES` con `mostrarRespuesta={false}` deja la respuesta para una lámina posterior. |
| Errores esperados | `ErrorTipico` (familia ocre); cada alternativa PAES lleva su explicación. |
| Se comprueba | content:check resuelve los sistemas 2×2 de las actividades y exige que la alternativa correcta sea la única solución. |
| Tiempo | `tramos` en `clase.yaml`: contiguos y con minutos que suman `duration` (content:check). |
| Notación y colores | Tonos de asociación solo como fondo y con correspondencia estable ([lenguaje visual](lenguaje-visual.md)). |
| Reflexión | `Cierre` y `Semaforo`. |

Las reglas de escritura de clases están en [Cómo escribir clases](../contenido/como-escribir-clases.md).
