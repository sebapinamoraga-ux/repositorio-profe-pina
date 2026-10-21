# Clases de video

Una clase con `formato: video` en clase.yaml es el guion gráfico de un video del canal (plan en [plan-diapositivas-video.md](../../docs/plan-diapositivas-video.md)). Lleva además `gancho` (la pregunta central en una frase) y `previos`: cada uno es `clase` + `idea` (otra clase que el video recuerda) o `base` (lo que se supone sabido). Los tramos son los capítulos de YouTube y sus minutos aceptan decimales.

Cada lámina declara su `momento` en el frontmatter, después de `phase`: `gancho`, `caso`, `simplificada`, `desarrollo`, `recuerda`, `climax`, `prediccion`, `pausa`, `error`, `utilidad` o `cierre`. El momento decide la fase (el editor la ajusta sola). El diseño `escena` achica el título y deja libre la franja inferior para los subtítulos.

`Recuerda clase="m1-primos" titulo="Números primos"` enmarca, sin fondo propio, lo que se recuerda de otra clase; su contenido conserva el color de su función. La clase debe estar en `previos`.

Durante el piloto, content:check y la pestaña Revisión dan **avisos** (no bloquean) cuando un video no empieza con gancho o no termina con cierre, no tiene exactamente un clímax o ninguna pausa o predicción, tiene menos de 8 o más de 18 láminas, más de 25 palabras de prosa en una lámina (sin fórmulas ni rótulos), más de una definición en una lámina, una lámina de desarrollo o clímax sin figura ni fórmula central, una mascota fuera del gancho o el cierre, más de dos `Recuerda`, o una clase previa que no va antes en la biblioteca. También avisan cuando una biblioteca de publicación planifica una clase de aula. Los umbrales se calibran con el piloto `m1-mcm-mcd`.
