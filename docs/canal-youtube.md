# Canal de YouTube PAES

Planificación del canal autoinstruccional Profe Piña para 3.º y 4.º medio y egresados que preparan la PAES de M1, M2 y Ciencias, mención Física, más el bloque «Uso de IA como estudiante». Versión del 14-10-2026.

**Fuente de verdad:** las bibliotecas `content/planning/yt-*.yaml` mandan en el orden, las unidades y las fechas tentativas de publicación. Llevan `calendario: publicacion`: sus fechas no aparecen como «Clase de hoy» de los cursos y, con la biblioteca abierta, la tarjeta de Clases muestra la «Próxima publicación». La carpeta del canal (`H:\Canal Profe Piña`) guarda la producción: guiones, animaciones, estado y metadatos. Su `Calendario editorial.md` remite a estas bibliotecas y solo lleva el estado de cada video. Los videos no se guardan en la plataforma.

La PAES Regular de 2026 es el 30 de noviembre y el 1 y 2 de diciembre. Este ciclo es un **piloto** y el lanzamiento fuerte es en **marzo de 2027**. Las fechas y la estructura de las pruebas se verifican con DEMRE cada año.

## 1. Principios

1. **Separar lo durable de lo de temporada.** Los videos de contenido no nombran año, admisión ni fechas, así que una clase sirve de 3 a 5 ciclos. La fecha va solo en los videos de temporada y en los ensayos, cuyo identificador lleva el año (`canal-puntajes-2027`).
2. **Cada video sabe a qué parte del temario responde.** La unidad de la biblioteca es el eje de DEMRE y la clase es una unidad temática o una parte de ella. Si cambia el temario, la diferencia dice qué rehacer, qué queda y qué se despublica.
3. **Formato híbrido** (§5). Un video conceptual, en el estilo del canal, explica la idea. Un video de práctica autoinstruccional, por unidad temática, la ejercita.
4. **El video largo es la unidad monetizable.** Dura 8 minutos o más, para admitir anuncios a mitad del video. Los Shorts sirven para el descubrimiento y son derivados baratos de los largos.
5. **Producir por lotes.** Enero y febrero son de producción. Conviene tener unas 6 semanas de videos listos antes de marzo.

## 2. Bibliotecas

| Archivo | Título público | Unidades | Clases | Día de publicación |
|---|---|---|---|---|
| `yt-m1.yaml` | PAES Matemática M1 | Números · Álgebra y funciones · Geometría · Probabilidad y estadística | 58 | Martes y viernes, en el orden de los ejes (piloto: cada dos semanas) |
| `yt-fisica.yaml` | PAES Ciencias: Física | Ondas · Mecánica · Electricidad · Energía y Tierra · Habilidades científicas | 35 | Jueves |
| `yt-m2.yaml` | PAES Matemática M2 | Los cuatro ejes, solo lo que M2 agrega a M1 | 25 | Sábados, ciclo 2028 |
| `yt-ia.yaml` | Uso de IA como estudiante | Aprender con IA · Estudiar para la PAES con IA · Integridad y cuidado · Proyectos con IA | 12 | Cada 2 o 3 semanas |
| `yt-canal.yaml` | Canal: estrategia y temporada | Estrategia de prueba · Ensayos · Temporada · Puente a la universidad | 18 | Según el hito |

- **Temario de referencia:** son los temarios regulares de la Admisión 2027 publicados por DEMRE. M1 tiene 65 preguntas (60 cuentan para el puntaje) y dura 2 h 20 min. M2 tiene 55 preguntas (50 cuentan), incluye suficiencia de datos y dura 2 h 20 min. Ciencias tiene 80 preguntas (75 cuentan) y dura 2 h 40 min: 54 son del módulo común, con los tres ejes, y 26 del módulo electivo. Las áreas de Física son Ondas, Mecánica (incluye sistema solar y universo), Energía–Tierra y Electricidad; las habilidades científicas son transversales. Las copias de los temarios están en las carpetas «Temarios oficiales» del canal.
- **El canal cubre solo Física.** Las 36 preguntas de Biología y Química del módulo común quedan fuera; hay que decirlo en la descripción de los videos de Física.
- **Identificadores:** las clases llevan el prefijo `m1-`, `m2-`, `fis-`, `ia-` o `canal-`, y las de práctica, el segmento `-practica-`. Una clase del curso que se reutilice se copia con «Copiar a otra biblioteca», nunca se mueve.
- **Cambio de temario:** se copia la biblioteca a una nueva solo con lo afectado, y las clases que no cambian conservan su identificador.

## 3. Ciclo anual y cadencia

| Período | Qué busca el estudiante | Qué hay en las bibliotecas |
|---|---|---|
| **Nov 2026–Feb 2027 (piloto)** | Última semana, resultados, postulación | M1: Números en orden (enteros, racionales y porcentaje cada dos semanas; potencias, raíces y exponente racional seguidos en febrero). IA: tres videos. Canal: la última semana, puntajes, postulación, puente a la U y el plan para egresados |
| **Mar–Abr** | Empezar desde cero | M1: práctica de potencias y raíces, Expresiones algebraicas (con la mini serie de productos notables), Proporcionalidad y Ecuaciones e inecuaciones. Física: Ondas. Canal: cómo es la PAES, por dónde empezar y cálculo sin calculadora |
| **May–Jun** | PAES de invierno | M1: sistemas, funciones y el inicio de Geometría (Pitágoras, áreas y cuerpos). Física: Mecánica. Canal: gestión del tiempo, ensayo en vivo de invierno e inscripción |
| **Jul–Ago** | Vacaciones de invierno; inscripción | M1: transformaciones isométricas, semejanza y Probabilidad y estadística (M1 termina el 17 de agosto). Física: universo y Electricidad. Canal: descartar alternativas y suficiencia de datos |
| **Sep–Oct** | Repaso | Física: Energía–Tierra y Habilidades (Física termina el 28 de octubre). Ensayos en vivo de M1 y Física. Fuera de las bibliotecas: compilaciones por eje y Shorts |
| **Nov** | Mayor pago por anuncio; la prueba | Ensayo en vivo de M2 y la última semana de 2027 |
| **Ene–Feb 2028** | Resultados | Se rehacen los videos de temporada y se produce M2 |
| **Mar–Ago 2028** | Segundo ciclo | M2 los sábados, del 4 de marzo al 19 de agosto. M1 y Física se reciclan |

**Carga en temporada:** entre marzo y agosto de 2027 hay unos 3 a 3,5 videos largos por semana (M1 2, Física 1 e IA o canal ocasionales). Está por encima del supuesto de 2 a 3 por semana. Las fechas son tentativas: si el piloto muestra menos capacidad, se espacia M1 a un video por semana y M1 termina hacia noviembre. Los videos de práctica son los más baratos, porque salen de una clase de la plataforma con el flujo del repositorio de videos.

## 4. Formatos

| Formato | Producción | Duración | Rol |
|---|---|---|---|
| **Conceptual** (las clases sin `-practica-`) | Manim, según la guía de estilo del canal | 8–10 min | Explicar la idea; búsqueda orgánica; anuncios |
| **Práctica** (las clases `-practica-`) | Clase de la plataforma convertida a video (Remotion + Manim) | 10–15 min | Ejercitar con pausas; retención; lista de reproducción |
| **Shorts** | Un tramo de cualquiera de los dos | 30–90 s | Descubrimiento |
| **Compilación por eje** | Montaje de videos ya publicados | 40–90 min | Horas de reproducción en el último trimestre |
| **Directo / ensayo** | En vivo, con preguntas propias | 60–140 min | Comunidad y temporada |
| **Temporada** | Conceptual corto | 6–12 min | Pico de búsquedas anual; se rehace cada año |

### Guion tipo del video conceptual

Sigue la guía de estilo del canal (`0.2 Recursos y marca del canal/Estilo de guion y video (referencia 3Blue1Brown).md`):

1. **Gancho:** una tensión genuina, no el anuncio del tema ni la promesa de puntaje.
2. **Caso concreto** en el primer minuto.
3. **Versión simplificada** antes del caso real.
4. **Clímax**, con nombre: el momento en que se combinan dos ideas.
5. **Al menos una pausa** para que el estudiante piense.
6. **Utilidad PAES** en el desarrollo o el cierre.
7. **Cierre** que responde al gancho.

Las preguntas PAES reales son solo inspiración interna: no se muestran con alternativas ni se citan.

### Guion tipo del video de práctica

Sigue el lenguaje visual de la plataforma (`docs/visual-language.md`):

1. **Objetivo** (violeta) y un «recuerda» de 30 s con lo esencial de los videos conceptuales de la unidad (azul).
2. **De 6 a 8 preguntas tipo PAES propias**, de dificultad creciente. Cada una tiene predicción, pausa de 15 s (20 s con pista), resolución en piedra, comprobación en verde y, cuando aplica, el error típico en ocre.
3. **Cierre de reflexión** (rosa) y pantalla final hacia el siguiente video de la ruta.

Las consignas van en singular. Los capítulos de YouTube coinciden con las preguntas.

### Miniatura y descripción (pendiente de diseño)

**Miniatura.** Lleva:
- Profe Piña en una pose de la galería.
- De 3 a 4 palabras del gancho.
- Un objeto matemático o físico que lea a tamaño pequeño.
- Una etiqueta de color por biblioteca (M1, M2, Física, IA).
- En las prácticas, «Práctica» y el nombre de la unidad.

**Descripción.** Incluye:
- Una línea del gancho.
- El eje y la unidad temática del temario DEMRE.
- Los capítulos.
- El video anterior y el siguiente de la ruta, y la lista de reproducción de la unidad.
- En Física, el aviso de cobertura del módulo común.

## 5. Contenido no curricular

Ya está en las bibliotecas `yt-ia` y `yt-canal`. Quedan como ideas sin fecha:
- La resolución de pruebas liberadas DEMRE. Choca con la regla de no citar preguntas reales: hay que decidirlo.
- Hábitos y bienestar ante la prueba.
- Física cotidiana en Shorts.
- «Resuelvo tu ejercicio», con preguntas de los comentarios.
- Orientación ligera sobre qué carreras piden M2 o Ciencias.

## 6. Decisiones abiertas

- **Voz real:** no hay voz sintética en español instalada.
- **Capacidad real por semana:** se mide con el piloto y define si M1 sigue en dos videos por semana.
- **Material de apoyo:** falta decidir si el PDF de láminas o el repaso se enlazan desde la descripción, lo que depende de la entrada pública.
- **Química y Biología:** si se cubren más adelante.
- **Plantilla de miniatura, logo e intro/outro:** siguen pendientes en el plan de producción del canal.
