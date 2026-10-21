# Glosario

> Estado: vigente · Ámbito: global · Autoridad: el docente. Cuando un documento use una de estas palabras, vale este significado.

## Dónde vive el contenido

| Término | Significado |
|---|---|
| **Biblioteca** | Carpeta con un `curso.yaml`: unidades, orden y fechas de sus clases. Puede ser un curso de aula (`cursos/…`) o una lista del canal (`youtube/…`). Una clase figura en una sola biblioteca |
| **Curso** | Dos cosas distintas. *Curso (biblioteca de aula)*: `contenido/cursos/<curso>/`, público y genérico. *Curso docente*: un grupo real de estudiantes; es privado, vive en el navegador y se ve en el área Cursos de la app |
| **Clase** | Unidad de trabajo: carpeta con `clase.yaml`, `guia.md`, láminas y actividades. De **aula** (por ejemplo, 80 minutos) o de **video** (`formato: video`, un video del canal) |
| **Sesión** | Ocasión concreta en que se usó una clase con un curso docente. Es privada |
| **Lámina** | Un archivo MDX con una idea. En documentos y en la interfaz se escribe «lámina»; «diapositiva» queda en nombres de código (`slides`, `PrintDeck`) y en el PDF |
| **Paso** | Revelación dentro de una lámina (`Paso n={…}`) |
| **Actividad** | Pregunta con enunciado, respuesta, solución y alternativas con explicación (YAML). `PreguntaPAES` es el bloque que la muestra |
| **Guía** | `guia.md`: la intención pedagógica de la clase |
| **Plantilla** | *De mascota*: composición de la galería. *De clase*: punto de partida de `lesson:new` (`comun/plantillas`) |

## Cómo se organiza el tiempo y el recorrido

| Término | Significado |
|---|---|
| **Tramo** | Bloque contiguo de minutos de una clase (`tramos` en `clase.yaml`). En un video, un capítulo de YouTube |
| **Fase** | Etapa de una lámina: inicio, activación, desarrollo, práctica o cierre |
| **Momento** | En un video, la función de una lámina (gancho, caso, clímax, pausa, cierre…); decide su fase. En la galería de la mascota, el filtro de la plantilla según el momento de la clase |
| **Eje** | Parte del temario DEMRE (Números, Álgebra y funciones, Geometría, Probabilidad y estadística) |
| **Unidad** | Agrupación de clases dentro de una biblioteca. En el canal coincide con el eje |
| **Repaso del estudiante** | Láminas solo para el celular (`repaso`): no se proyectan, no salen en el PDF ni cuentan en los tramos. No es un tramo de repaso dentro de la clase |

## Cómo se aprende y se comprueba

| Término | Significado |
|---|---|
| **Propósito** | Qué debe poder hacer el estudiante al salir de la clase |
| **Evidencia** | Dónde se ve que lo logró, qué respuesta cuenta como logro y qué error lo distingue de un logro aparente |
| **Errores esperados** | Los errores que se anticipan y la lámina que los trabaja |
| **Ticket** | Pregunta tipo PAES al final de la clase, de resolución individual y con tiempo para intentar antes de ver las alternativas |
| **Pausa** | Momento para que el estudiante intente antes de ver la solución |
| **Semáforo** | Autoevaluación rojo, amarillo y verde del cierre. Mide percepción, no dominio |

## Estados y apariencia

| Término | Significado |
|---|---|
| **`draft` / `published`** | Disponibilidad pública de la clase en el sitio y el PDF. La decisión es del docente |
| **`lista` / `en-preparacion` / `por-preparar`** | Marca de preparación en la planificación (`curso.yaml`) |
| **Familia funcional** | Color de un bloque según su función: azul definición, violeta objetivo, piedra procedimiento, ocre práctica y error, verde comprobación, rosa reflexión |
| **Tono de asociación** | Uno de cuatro fondos que conectan un mismo referente dentro de una secuencia, sin cambiar la función del bloque |
| **Nivel de presencia** | De la mascota: sutil, pedagógica o marca |

## Personas

**El docente** es quien dicta las clases y decide lo pedagógico. Se escribe en masculino: «el docente».
