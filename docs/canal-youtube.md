# Canal de YouTube PAES

Planificación macro (14-10-2026) de un canal autoinstruccional para 3.º y 4.º medio y egresados que preparan la PAES de M1, M2 y Ciencias, mención Física. Las clases del canal viven en sus propias bibliotecas (`content/planning/yt-*.yaml`); los videos se producen en el repositorio aparte de videos, que solo lee la plataforma.

La PAES Regular de 2026 llega en unas 7 semanas: este ciclo es un **piloto** y el lanzamiento fuerte es en **marzo de 2027**. Las fechas y la estructura de las pruebas (número de preguntas, módulo común de Ciencias, calendario) se verifican con DEMRE cada año; aquí son aproximadas.

## 1. Principios

1. **Separar lo durable de lo de temporada.** Los videos de contenido no nombran año, admisión ni fechas; la fecha va solo en los de temporada (calendario, ensayos, resultados). Así una clase sirve 3 a 5 ciclos.
2. **Cada video sabe a qué ítem del temario responde.** Si DEMRE publica un temario nuevo, la diferencia indica qué videos rehacer, cuáles quedan y cuáles se despublican. Nada se rehace por si acaso.
3. **Autoinstruccional de verdad:** objetivo al inicio, pausas para resolver (`momento: 'pausa'`), predicción, pista, comprobación y cierre con «recuerda». Consignas en singular, sin trabajo en parejas.
4. **Un video largo es la unidad monetizable** (≥ 8 min para anuncios a mitad del video; idealmente de 10 a 18). Los Shorts sirven para descubrimiento y son derivados baratos del largo.
5. **Producir por lotes y publicar a un ritmo constante**, con unas 6 semanas de videos ya listos antes de cada temporada.

## 2. Bibliotecas en la plataforma

Las cuatro bibliotecas ya existen en `content/planning/`. El título es genérico y la unidad corresponde a un eje del temario. `date` es la fecha de publicación prevista.

| Archivo | Título público | Unidades (macro) |
|---|---|---|
| `yt-m1.yaml` | PAES Matemática M1 | Números · Álgebra y funciones · Geometría · Probabilidad y estadística |
| `yt-m2.yaml` | PAES Matemática M2 | Números (reales, logaritmos) · Álgebra y funciones (avanzado) · Geometría · Probabilidad y estadística (avanzado) |
| `yt-fisica.yaml` | PAES Ciencias: Física | Ondas · Mecánica · Energía · Electricidad y magnetismo · Tierra y universo · Habilidades científicas |
| `yt-canal.yaml` | Canal: estrategia y temporada | Estrategia de prueba · Ensayos y pruebas liberadas · Temporada (calendario, puntajes, postulación) · Puente a la U |

- **Reutilización:** las clases de `m1-2027` que coinciden con el temario se pasan a `yt-m1` con «Copiar a otra biblioteca» y se adaptan al formato autoinstruccional (sin votación, con pausas). La primera candidata es `funcion-lineal-afin-2-cuadratica-1`, que ya tiene video.
- **Cambio de temario:** al cambiar el temario se crea la biblioteca siguiente copiando solo lo afectado. Los IDs de las clases que no cambian se mantienen.
- **Temario como currículo:** un `content/curriculum/paes-m1.yaml` (y equivalentes) con los ítems de DEMRE. Cada clase del canal declara sus ítems.
- **Punto abierto:** la «Clase de hoy» mira todas las bibliotecas, así que una fecha de publicación del canal aparecería ahí como si fuera una clase. Hay que decidir si eso sirve como recordatorio o si conviene que las bibliotecas del canal no participen.

## 3. Ciclo anual y cadencia

El año PAES se repite. El canal publica según la fase del estudiante, no según el currículo escolar.

| Período | Qué busca el estudiante | Qué publica el canal | Ritmo |
|---|---|---|---|
| **Ene** | Resultados, ponderaciones, postulación | Temporada: cómo leer el puntaje y postular. Puente a la U (precálculo, física universitaria inicial) | 1 largo/sem + Shorts. **Lote de producción** |
| **Feb** | Descanso; los egresados planifican | «Plan para egresados», diagnóstico, rutas. Producción | 1 largo/sem |
| **Mar–Abr** | Empezar desde cero; nuevo temario DEMRE | Arranque: bases de M1 (números, álgebra) y Física (ondas, mecánica). Revisión del temario → mantenimiento | **2 a 3 largos/sem** + 3 a 4 Shorts |
| **May–Jun** | PAES de Invierno; modelos oficiales | Mini temporada de invierno: repaso intensivo y ensayo en vivo. Continúa el núcleo de M1/Física | 2 a 3 largos/sem + 1 directo |
| **Jul–Ago** | Inscripción; vacaciones de invierno = más horas | M1 avanzado (funciones, geometría), arranque de M2 y Física (energía, electricidad). Maratones en vacaciones | 2 a 3 largos/sem |
| **Sep** | Fiestas Patrias; se acaba el tiempo | Probabilidad y estadística, Física (Tierra y universo). Primeras compilaciones | 2 largos/sem |
| **Oct–Nov** | Repaso intensivo; **CPM más alto del año (Q4)** | Ensayos en vivo, «los 10 errores de M1», compilaciones por eje (videos largos de muy bajo costo), estrategia de prueba | 2 largos + 1 a 2 directos/sem |
| **Dic** | Rinden la PAES; después, la prueba liberada | Último repaso, «qué llevar», y luego la resolución de la prueba liberada (pico de búsquedas) | Variable |

**Volumen por ciclo (supuesto: una persona produce, 2 a 3 largos por semana en temporada):** unos 80 a 100 videos largos al año más 150 Shorts. Esto alcanza para cubrir M1 completo y Física en el año 1, y para completar M2 en el año 2. La cadencia se ajusta según la capacidad real de producción (ver §7).

## 4. Hoja de ruta plurianual

- **Piloto (oct–dic 2026):** cerrar el flujo (voz real, miniatura, descripción, capítulos) con 3 a 5 videos de M1 de alta demanda: el video ya hecho adaptado y temas frecuentes de la prueba. Agregar una pieza de estrategia para el último mes y la resolución de la prueba liberada de diciembre. Objetivo: medir retención y tiempo de producción real, no monetizar todavía.
- **Año 1 (ciclo 2027, admisión 2028):** M1 completo (unas 45 a 55 clases), Física con la base de 1.º y 2.º medio (unas 25), estrategia y temporada. Para monetizar, el canal necesita entrar al Programa de Socios (umbral de suscriptores y horas de reproducción); conviene apuntar a lograrlo en la temporada de octubre y noviembre.
- **Año 2 (ciclo 2028):** M2 completo (unas 25 a 30 clases), Física del electivo y avanzada, segunda capa de práctica PAES para M1. Los videos del año 1 se reciclan: compilaciones, Shorts nuevos y miniaturas renovadas.
- **Año 3 en adelante:** mantenimiento según el temario, renovación de los videos de bajo rendimiento y nuevos formatos (§6). Se considera ampliar a Química y Biología solo si el canal lo justifica, porque la prueba de Ciencias tiene un módulo común que el canal no cubre por ahora.

## 5. Formatos (indicios de lo micro)

| Formato | Duración | Rol | Vida útil |
|---|---|---|---|
| **Clase** (desde una clase de la biblioteca) | 10–18 min | Núcleo, búsqueda orgánica, anuncios | Mientras el temario siga vigente |
| **Práctica PAES** (de 6 a 10 preguntas tipo, con pausa) | 8–15 min | Retención y lista de reproducción después de la clase | Igual |
| **Shorts** (9:16, uno por tramo de la clase; ya está pendiente en el repo de videos) | 30–90 s | Descubrimiento y suscripciones | Igual |
| **Compilación por eje** (montaje de clases ya hechas) | 40–90 min | Horas de reproducción en Q4 a costo casi nulo | Igual |
| **Directo / ensayo** | 60–140 min | Comunidad, Super Chat, pico de fin de año | De temporada |
| **Temporada** (calendario, puntajes, postulación) | 6–12 min | Pico de búsquedas anual | 1 ciclo (se rehace cada año) |

Estructura sugerida de un video de clase, alineada con `docs/visual-language.md`:

1. Objetivo (violeta)
2. Idea o definición (azul)
3. Procedimiento (piedra)
4. Pausa con práctica (ocre)
5. Comprobación (verde)
6. Pregunta tipo PAES con alternativas
7. «Recuerda»
8. Pantalla final hacia el siguiente video de la ruta

Los capítulos de YouTube coinciden con los tramos (el mapa de capítulos ya existe).

## 6. Contenido no curricular (desde ya)

- **Estrategia de prueba:** gestión del tiempo, cuándo omitir (verificar la regla vigente sobre respuestas incorrectas), cómo descartar alternativas y leer los datos que sobran.
- **Bases sin calculadora:** fracciones, porcentajes, potencias y cálculo mental. Tienen mucha búsqueda y son durables.
- **Diagnóstico y rutas:** «¿Por dónde empiezo?», un video de diagnóstico con rutas por nivel y planes de 12 y 24 semanas para egresados.
- **Pruebas liberadas y modelos DEMRE:** resolución completa, en video y en directo.
- **Puntajes y postulación:** escala, percentil, ponderaciones y qué carreras piden M2 o Ciencias. Es contenido de temporada, se verifica cada año y no es asesoría.
- **Hábitos y bienestar:** rutina semanal, estudio espaciado y ansiedad ante la prueba (tono informativo, sin reemplazar apoyo profesional).
- **Puente a la U (enero a marzo):** precálculo y física de primer año, para no perder audiencia después de la PAES.
- **Física cotidiana y curiosidades:** Shorts con experimentos caseros y «la física detrás de…». Sirven para atraer audiencia fuera de temporada.
- **Comunidad:** «Resuelvo tu ejercicio» con preguntas de los comentarios, encuestas y errores frecuentes del mes.
- **Orientación ligera:** qué carreras usan Física o M2 y para qué sirve cada prueba.

## 7. Dependencias y decisiones abiertas

- **Voz real:** es el bloqueo principal, porque no hay TTS en español instalado y un video sin voz difícilmente retiene. Hay que definir si se graba la voz o se usa TTS externo.
- **Capacidad real de producción por semana:** hoy, un video de unos 12 min se arma en días. Antes de fijar la cadencia hay que medir el tiempo de producción con el piloto.
- **Ciencias:** el canal cubre solo Física. Hay que decidir si eso basta o si más adelante se buscan colaboraciones para Química y Biología.
- **Enlaces a la plataforma:** falta decidir si el material de apoyo (PDF de láminas, repaso) se enlaza desde la descripción, lo que depende de la decisión pendiente sobre la «entrada pública».
- **La «Clase de hoy» y las fechas del canal** (§2).

## 8. Próximo paso

El detalle micro queda para una segunda vuelta: lista de clases por unidad con fechas de publicación, guion tipo de un video, plantilla de miniatura y descripción, y el currículo `content/curriculum/paes-*.yaml` con los ítems del temario vigente de DEMRE.
