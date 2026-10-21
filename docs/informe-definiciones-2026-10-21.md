# Informe de memorias, definiciones y diseño instruccional

**Profe Piña · Aula — 21 de octubre de 2026**  
**Estado:** análisis y propuestas para revisión del docente. No modifica las reglas vigentes.  
**Base:** carpeta `H:\Generador presentaciones - Codex`, revisión Git `c9e589c` y cambios locales presentes durante la lectura.

## 1. Diagnóstico principal

El proyecto tiene una identidad pedagógica reconocible y una arquitectura que la respalda: propósito antes que composición, contenido separado del motor, guías por clase, práctica individual o guiada, errores anticipados, comprobación y un lenguaje visual semántico. Conviene conservar esa base.

La principal necesidad de reestructuración está en **la autoridad y el estado de las definiciones**. Hoy conviven en los mismos documentos reglas permanentes, decisiones particulares, propuestas, relatos de implementación y pendientes. Algunas reglas están repetidas; otras existen solamente en código; otras se expresan como obligaciones generales, pero el sistema solo las comprueba en ciertos casos.

En diseño instruccional, la brecha más concreta está entre la intención declarada y la evidencia de aprendizaje: **13 de las 16 clases tienen pendientes los apartados Evidencia y Errores esperados**. Esas 13 son borradores; las tres clases con estado `published` sí tienen completos los tres apartados exigidos. La validación distingue correctamente ambos casos, pero permite producir muchas láminas antes de cerrar la planificación pedagógica.

La recomendación es reorganizar en cuatro capas: **principios vigentes → contratos y criterios → decisiones con historial → evidencia de uso**. Primero se debe clarificar y consolidar la documentación; después, ajustar los esquemas y las herramientas que realmente lo requieran. No se justifica rehacer la plataforma completa a partir de este análisis.

## 2. Alcance y límites

Se revisaron la estructura del repositorio principal, los tres `AGENTS.md`, la documentación general y técnica, las definiciones del canal, las plantillas, los manifiestos y la integridad de las 16 guías. Se contrastaron con los esquemas de contenido, validadores, creación de clases, construcción del sitio, persistencia y comunicación de la aplicación. Se leyeron en detalle guías y láminas representativas de Sistemas, Funciones y los videos de Números.

Este informe **no es una corrección matemática exhaustiva de las 253 láminas**, ni una evaluación de aprendizaje con estudiantes, ni un ensayo visual en proyector. No se inspeccionaron los repositorios externos de producción de videos ni las carpetas originales de fuentes curriculares; sus estados se mencionan únicamente como afirmaciones de los documentos locales. Tampoco se revalidaron fechas DEMRE, condiciones de YouTube o fuentes bibliográficas externas: aquí se analiza cómo se registran y gobiernan esas referencias.

Había archivos de código modificados antes de comenzar, y aparecieron cambios adicionales durante la revisión. Los resultados técnicos corresponden a esa carpeta de trabajo en movimiento, no a una versión congelada ni necesariamente al sitio publicado. No se corrigieron esos archivos.

### Inventario obtenido

| Elemento | Cantidad y estado observado |
|---|---|
| Bibliotecas con `curso.yaml` | 6: una de aula y cinco de publicación |
| Entradas planificadas | 163; una entrada planificada no equivale a una clase ya escrita |
| Clases con `clase.yaml` | 16: 5 del curso de aula y 11 en YouTube M1 |
| Formato de las clases existentes | 10 de video y 6 de aula; una de estas últimas es `m1-naturales`, dentro del canal |
| Estado de publicación | 3 publicadas y 13 borradores, según sus manifiestos |
| Láminas registradas | 253, incluidas 7 de repaso; excluida la portada de plantilla |
| Actividades | 17 |
| Referencias curriculares | 4, todas de M1 |
| Galería de mascota | 17 plantillas |
| Guías con los tres apartados mínimos completos | 3 de 16 |
| Guías con «Después de la clase» desarrollado | 0 de 16; no permite concluir si las clases se realizaron o no |

La planificación contiene 5 entradas de aula, 68 de YouTube M1, 35 de Física, 25 de M2, 12 de IA y 18 de estrategia/temporada. El LEEME del canal aún informa 58 para M1.

## 3. Dónde están las memorias y definiciones

No aparece un archivo de memoria central denominado `MEMORY.md` entre los archivos versionados. La memoria efectiva del proyecto está distribuida en los siguientes documentos. Las copias de trabajo bajo `.claude/worktrees` no se trataron como autoridades adicionales ni se auditaron como proyectos independientes.

| Fuente | Qué define o recuerda | Evaluación y destino recomendado |
|---|---|---|
| [AGENTS.md](../AGENTS.md) | Jerarquía pedagógica, separación de carpetas, privacidad, publicación y verificaciones | Mantener breve como entrada operativa; enlazar reglas completas |
| [contenido/AGENTS.md](../contenido/AGENTS.md) | Flujo guía → aprobación docente → tramos → láminas; convenciones didácticas | Mantener como procedimiento de trabajo; distinguir reglas globales y específicas de aula/video |
| [plataforma/AGENTS.md](../plataforma/AGENTS.md) | Límites de implementación, PDF, validación, edición GitHub e integración con videos | Mantener como instrucciones de desarrollo; enlazar contratos detallados |
| [README.md](../README.md) | Presentación del producto, roles, inicio y comandos | Actualizar alcance: la introducción sigue centrada en un primer hito de una clase |
| [pedagogia.md](pedagogia.md) | Diez principios y su soporte técnico | Buena base normativa; aclarar alcance por formato y grado real de automatización |
| [lenguaje-visual.md](lenguaje-visual.md) | Semántica de bloques, asociaciones, composición, mascota y reglas de revisión | Separar sistema general de las decisiones concretas de Sistemas 2×2 |
| [presencia-mascota.md](presencia-mascota.md) | Niveles, restricciones, catálogo actual y crecimiento | Separar uso vigente de metas futuras de 36, 60 y 72–90 plantillas |
| [contenido/LEEME.md](../contenido/LEEME.md) | Organización del contenido y flujo de autoría | Conservar como índice de entrada |
| [como-escribir-clases.md](../contenido/como-escribir-clases.md) | Formato de archivos, componentes, parámetros, video y operación del editor | Demasiadas funciones en un solo manual; dividir por tareas y catálogo técnico |
| [LEEME del curso](../contenido/cursos/competencia-matematica-3m/LEEME.md) | Público, duración, calendario y continuidad entre clases | Mantener como memoria del curso; ampliar criterios de progresión |
| `guia.md` por clase | Propósito, evidencia, previos, secuencia, errores, decisiones y reflexión posterior | Es el núcleo de memoria pedagógica; completar y hacer explícitos los criterios de logro |
| `clase.yaml` y `curso.yaml` | Contratos ejecutables de clase y planificación | Autoridad de los datos operativos; no reemplazan la justificación pedagógica |
| [LEEME del canal](../contenido/youtube/LEEME.md) | Público, formatos, calendario, producción y pendientes | Actualizar con las decisiones posteriores; separar política editorial de pedagogía |
| [plan-diapositivas-video.md](plan-diapositivas-video.md) | Diagnóstico, propuesta, decisiones del docente, avances y pendientes | Principal foco de mezcla temporal: dividir especificación vigente, historial y trabajo pendiente |
| [curso-2021.md](../contenido/youtube/paes-m1/referencias/curso-2021.md) | Antecedentes de un curso y su contraste curricular | Mantener como referencia histórica, no como regla vigente por omisión |
| [architecture.md](../plataforma/docs/architecture.md) | Paquetes, datos, edición, publicación, rutas, temas y PDF | Buen mapa técnico; separar contratos que necesitan versionado y decisiones históricas |
| [roadmap.md](../plataforma/docs/roadmap.md) | Etapas futuras y límites temporales | Distinguir lo ya disponible localmente de lo pendiente entre dispositivos |
| [deployment.md](../plataforma/docs/deployment.md) | Sitio público, guardado, controles y borradores | Aclarar publicación de guías, fuentes y respuestas; documentar excepción de CI para contenido |
| [provenance.md](../plataforma/docs/provenance.md) | Origen del prototipo, atribución, ilustraciones y currículo | Mantener; añadir localización controlada de evidencias sin incorporar información privada |

Las definiciones también viven en el código: `packages/content-model` determina qué acepta la plataforma; `packages/pedagogical-ui` materializa los bloques; `packages/interactives` aporta figuras y matemática; `styles/tokens.css` y `theme.css` concretan el lenguaje visual; `store/schema.ts` define los datos privados. Si estos contratos divergen de un manual, el sistema ejecutará el código, aunque la intención documentada sea otra.

## 4. Definiciones de plataforma: fortalezas y decisiones pendientes

### 4.1 Separación del contenido y del motor

**Vigente y bien sustentado.** El contenido se organiza por biblioteca y clase, mientras que el motor lo reconoce por la forma de sus rutas y archivos. El mismo `checkContentFiles` se usa desde herramientas locales y antes de guardar desde la app. Esto reduce el riesgo de tener reglas diferentes según la vía de edición.

**Conservar:** identificadores estables, paquetes compartidos independientes de la aplicación, matemática fuera de React y representación estática de interactivos.

**Precisar:** reconocer archivos por su forma no implica aceptar cualquier ubicación. También hay reglas sobre la carpeta de la clase, su identificador y la biblioteca que la planifica. La documentación debe presentar ambas condiciones juntas.

### 4.2 «Curso», «biblioteca», «clase» y «sesión» necesitan un glosario

La carpeta `contenido/cursos` contiene planes públicos y genéricos. El área «Cursos» de la app contiene grupos reales y datos privados. La palabra curso se usa para ambas cosas, aunque los modelos ya las distinguen.

| Concepto recomendado | Significado | Autoridad actual |
|---|---|---|
| Biblioteca curricular/editorial | Organización pública de unidades y clases | `curso.yaml` |
| Clase o lección | Recurso reutilizable con propósito, secuencia y láminas | `clase.yaml` + `guia.md` |
| Curso docente | Grupo real al que se enseña | Almacenamiento privado del navegador |
| Sesión | Ocasión concreta de uso de una clase con un curso | Datos privados de sesión |
| Lámina | Unidad de composición y revelado | Archivo MDX |
| Actividad | Tarea, respuesta, solución y retroalimentación | YAML de actividad |
| Repaso | Recursos adicionales para lectura o exploración del estudiante | Lista `repaso` y sus MDX |

No es necesario renombrar carpetas para resolverlo. Primero basta con acordar los términos y usarlos de forma consistente en manuales e interfaz.

### 4.3 Estados editoriales y publicación

Actualmente coexisten `draft/published` en la clase y `lista/en-preparacion/por-preparar` en la planificación. Representan cosas distintas, pero falta una explicación breve de sus combinaciones. Por ejemplo, «lista» no acredita publicación, y «published» no prueba que se haya hecho un ensayo real en proyector.

**Propuesta:** mantener separados preparación pedagógica, disponibilidad pública y revisión humana. Definir qué evidencia justifica cada transición. Empezar con una tabla documental y un registro de revisión; agregar campos solo si ayudan al flujo real.

La decisión docente sigue siendo la autoridad. Completar una lista de verificación o pasar pruebas automáticas no debe fabricar una aprobación.

### 4.4 Contenido público y memoria privada

La separación implementada es clara: contenido en GitHub; cursos, sesiones, comentarios y resúmenes de votación en almacenamiento local. La arquitectura indica correctamente que el acceso docente es un bloqueo local y no una frontera de seguridad.

Hay un matiz decisivo: **no proyectar un dato no lo convierte en privado**. El constructor del sitio incluye el texto de las guías y de las láminas de clases publicadas en `buildFiles`. Las respuestas también forman parte del sitio. Los cambios locales en curso añaden `notas` al frontmatter como notas del orador; si se guardan ahí, pertenecen al contenido público aunque la interfaz no las muestre al estudiante.

**Definición propuesta:** la guía y las notas de autoría versionadas contienen decisiones didácticas generales. Observaciones identificables, comentarios sobre estudiantes y registros de una sesión permanecen en la memoria privada. No se constató una filtración de datos personales; se identifica una frontera que debe quedar explícita antes de ampliar las notas.

Fuentes: `apps/presenter/content-plugin.ts`, `src/store/schema.ts`, `src/content/storage.ts` y el campo local `notas` de `content-model/src/index.ts`.

### 4.5 Capacidades actuales frente a promesas futuras

La proyección y la votación usan `BroadcastChannel`. Sirven para pestañas del mismo navegador; no constituyen todavía una votación distribuida entre teléfonos de estudiantes. La propia vista del estudiante lo advierte. El README resume una «respuesta anónima» sin expresar inmediatamente ese límite.

El roadmap habla de incorporar cursos e historial, pero sus modelos y persistencia local ya existen. Lo pendiente allí es principalmente sincronización entre dispositivos, autenticación y participación remota.

También conviene distinguir **no haber conectado GitHub** de **perder la red después de disponer de una copia local**: el manual dice «sin conexión ... no permite editar», mientras `ContentProvider` permite editar cuando tiene un snapshot, incluido el almacenado en caché. Documentar escenarios concretos evita promesas ambiguas sobre trabajo sin conexión.

### 4.6 Cobertura del modelo curricular

El esquema de clase admite solo `m1`, `m2` y `fisica`. La planificación incluye también IA y estrategia/temporada. Es posible planificarlas como entradas, pero crear su contenido requerirá decidir cómo representar su disciplina y su relación curricular.

Además, toda clase exige al menos una referencia curricular. Esto encaja con M1, pero no necesariamente con una pieza sobre uso de IA o estrategia de estudio. No conviene asignarle una referencia matemática solo para satisfacer el formulario.

Las plantillas también arrastran valores del primer caso: `contenido/comun/plantillas/clase.yaml` propone M1 y sistemas 2×2; la creación desde la app usa M1 y una referencia disponible cuando no hay clase base. Son valores iniciales que deben revisarse, no una alineación curricular acreditada.

**Decidir antes de ampliar:** distinguir área, tipo de recurso y referencia curricular; permitir recursos no curriculares con justificación explícita, sin diluir las exigencias de los recursos que sí enseñan contenidos PAES.

## 5. Diseño instruccional: qué está definido y qué falta

### 5.1 Lo que conviene conservar

La secuencia propósito → evidencia → conocimientos previos → tramos → láminas es adecuada para organizar el trabajo y ya está expresada en las instrucciones. El curso de Funciones conserva un contexto de bicicletas entre clases y decisiones de notación; Sistemas relaciona modelación, resolución, comprobación e interpretación. Las guías con evidencia completa enlazan a láminas y actividades concretas, lo que permite revisar su coherencia.

La sección Decisiones tiene ejemplos útiles: en Cuadrática 2 explica por qué se amplió el repaso, se separaron definiciones y se trasladó una pregunta al repaso. Esa justificación debe conservarse incluso si cambia la secuencia.

### 5.2 La guía existe, pero no siempre gobierna la producción

Las 13 guías incompletas ya acompañan clases con láminas. Cuadrática 2, por ejemplo, tiene 32 láminas de clase, 5 de repaso, una secuencia detallada y numerosas decisiones; Evidencia y Errores esperados siguen vacíos. Los diez videos nuevos también mantienen ambos apartados pendientes.

Esto no demuestra que sus autores no hayan pensado en evaluación o errores: las actividades pueden contenerlos. Sí demuestra que esa intención no quedó consolidada en el lugar que el proyecto declara como autoridad pedagógica.

**Cambio de proceso sugerido:** antes de ampliar las láminas de un borrador, dejar una primera versión de evidencia y errores. No exigir un documento perfecto ni bloquear técnicamente toda exploración; sí hacer visible que la planificación está incompleta y revisarla con el docente en el momento previsto por `contenido/AGENTS.md`.

### 5.3 Falta un criterio explícito de logro

«Evidencia» suele describir dónde se trabaja una idea. Todavía falta expresar de manera sistemática qué respuesta o desempeño se considera suficiente y qué intervención sigue si no aparece.

Una selección correcta puede venir de descarte o azar; el semáforo registra percepción, no demuestra por sí mismo dominio matemático. Ambos son útiles, pero tienen funciones distintas.

**Propuesta para incorporar en la guía, sin cambiar aún el esquema:**

| Objetivo | Evidencia observable | Criterio de logro | Error que distingue | Acción posterior |
|---|---|---|---|---|
| Modelar el problema de entradas con un sistema | Define variables con unidades y escribe las dos ecuaciones | Representa correctamente cantidad total y recaudación | Intercambiar el significado de las variables | Volver a la tabla de cantidades y precios |
| Resolver y comprobar | Obtiene el par y lo sustituye en ambas ecuaciones | Las dos igualdades y la interpretación contextual son coherentes | Comprobar solo una condición | Contrastar un par que cumple una ecuación y falla en la otra |

Este ejemplo deriva de Sistemas 2×2 y es una propuesta para revisión; no fija un umbral de aprobación ni reemplaza la decisión del docente.

### 5.4 Separar principios, preferencias y condiciones de contexto

«Propósito antes que diseño» es un principio general. «Nunca en parejas ni en grupo» es una política docente específica y deliberada. «80 minutos» es una condición del curso de aula. «8–18 láminas» es un umbral experimental para videos conceptuales. «31–32 px» es una referencia del lienzo.

Actualmente pueden leerse como obligaciones de igual naturaleza. Conviene etiquetarlas por alcance: global, aula, video conceptual, video de práctica, curso particular o clase particular. No se propone cambiar la preferencia por práctica individual/guiada; se propone evitar que una preferencia contextual se interprete como una ley pedagógica universal.

### 5.5 Resolver la tensión entre contexto y formalización

Los principios promueven partir de una situación que haga necesaria la idea. Las reglas de contenido exigen expresiones genéricas al definir por primera vez. En Cuadrática 2 se registra «propiedad general primero y ejemplos después»; los videos piden caso concreto antes de la definición.

No es necesario elegir una regla y eliminar la otra. Una redacción compatible sería: **la secuencia puede abrir con un caso motivador; cuando se presenta una definición o propiedad como general, se explicita su dominio y se separa del ejemplo que la ilustra**. Así se evita generalizar accidentalmente el caso y se conserva la motivación.

### 5.6 Precisar el dominio de las definiciones matemáticas

La muestra revisada revela tres puntos que conviene incluir en una futura revisión de definiciones:

| Archivo y formulación | Precisión necesaria | Redacción o decisión propuesta |
|---|---|---|
| `m1-division-resto/laminas/algoritmo.mdx`: divisor `d ≠ 0` y resto `0 ≤ r < d` | Esa condición sobre el resto requiere divisor positivo; la unicidad depende de trabajar con enteros | En el contexto de naturales: «Para enteros D ≥ 0 y d > 0 existen únicos enteros q ≥ 0 y r tales que D = dq + r y 0 ≤ r < d» |
| `funcion-cuadratica-2/laminas/repaso-eje.mdx`: «Toda parábola ... recta vertical» | Es correcto para gráficas de funciones cuadráticas `y = ax² + bx + c`; no para cualquier parábola geométrica | «El gráfico de toda función cuadrática tiene un eje de simetría vertical» |
| `m1-fracciones/laminas/fraccion.mdx`: `a/b`, `b ≠ 0`, como repartir a en b partes | La interpretación de reparto necesita precisar las cantidades y partes positivas; no cubre sin explicación denominadores negativos | Separar el modelo inicial de reparto de la definición algebraica y declarar el dominio trabajado |

No se modificaron las láminas. Son hallazgos de una muestra, no un dictamen sobre el resto del contenido. Una ficha de concepto podría registrar nombre, dominio, definición, ejemplo, contraejemplo, notación y errores frecuentes.

### 5.7 Tiempo, amplitud y práctica

Los tramos hacen visible la duración total, pero sumar 80 minutos no acredita que la clase sea realizable. Cuadrática 2 combina repaso, factorización, fórmula general, discriminante, vértice, forma canónica y optimización; Función afín 1 declara cinco objetivos amplios.

Es una **señal para revisar prioridades**, no evidencia suficiente de sobrecarga. Conviene que cada guía distinga objetivo esencial, extensión y contenido de consulta, y estime tiempo de explicación, intento y retroalimentación. El ensayo docente determinará qué conservar en proyección y qué trasladar al repaso.

### 5.8 Memoria posterior a la clase

Las 16 guías tienen «Después de la clase» pendiente. No hay, en ese espacio, un ciclo documentado de observación → ajuste → nueva versión.

Propuesta: registrar allí solo aprendizajes generales de diseño —«la comparación necesitó más tiempo», «la consigna se interpretó de dos maneras»— y el cambio decidido. Los detalles del curso o de estudiantes deben permanecer en el registro privado. No completar retrospectivamente esta sección con observaciones inventadas.

## 6. Lenguaje visual y experiencia de aprendizaje

### 6.1 Un sistema semántico valioso

Las familias funcionales están definidas con claridad: azul para definición formal, violeta para objetivo, piedra para procedimiento/ejemplo, ocre para práctica/error, verde para comprobación y rosa para reflexión. Las asociaciones locales se reservan a fondos y deben mantener su correspondencia. Títulos y etiquetas acompañan el color.

La recomendación es conservar esa semántica y separar tres niveles: función pedagógica del bloque, distribución en la lámina y presencia de la mascota. Una pose o un fondo no debe decidir qué operación intelectual se pide al estudiante.

### 6.2 Documentación general mezclada con una clase concreta

`lenguaje-visual.md` incluye la conservación de 25 láminas, la separación de las láminas 03 y 04, la retirada de una pregunta sobre 2x y una lista de plantillas empleadas en Sistemas. Es memoria útil, pero pertenece a la guía o al historial de esa clase. Mantenerla en la norma general aumenta la posibilidad de aplicarla indebidamente a otra secuencia.

En `como-escribir-clases.md` también aparecen instrucciones específicas del ticket de Sistemas junto a la referencia general de componentes. Conviene moverlas al contexto de esa clase y conservar enlaces como ejemplos de uso.

### 6.3 Separar criterios visuales de comprobaciones automáticas

«Una idea por lámina», «sin sobrecarga» y «mascota pertinente» requieren juicio. El sistema puede verificar cantidad de mascotas, referencias, parámetros y algunos límites; no puede decidir automáticamente si una idea quedó clara.

Los 31–32 px deben explicarse como base del texto de enseñanza en el lienzo de referencia, no como tamaño mínimo de cada elemento de interfaz o rótulo. La revisión debe observar fórmulas, gráficos, alternativas, contraste y estados inicial/final, además de la tipografía base.

### 6.4 PDF final y PDF por pasos

La regla «exactamente una página por diapositiva» convive con la exportación `--pasos`, que deliberadamente crea una página por estado. Es una excepción implementada y documentada en el README y `PrintDeck.tsx`, pero no expresada en las reglas generales de igual forma.

Definir dos productos: **PDF final**, una página por lámina con todo revelado; **PDF por pasos**, una página por estado para seguir el desarrollo. En ambos: sin controles ni notas, con el contenido que corresponda a ese producto. El PDF de un video es además un guion gráfico; su utilidad como material autónomo de estudio requiere una decisión diferente.

## 7. El canal y los videos: principal foco de actualización documental

El plan de videos comienza diciendo «Nada de esto está implementado», pero luego contiene apartados «Hecho en la plataforma», avances del repositorio de videos y una tabla de decisiones del docente. El código confirma que existen `formato`, `gancho`, `previos`, `momento`, `escena`, `Recuerda`, análisis de figuras y reglas de video.

Dentro del mismo documento también se afirma que los estilos aún están en `theme.css` y después se registra su traslado a `figuras.css`. Aparece pendiente la aprobación del piloto y luego se consigna que el docente lo aprobó. Esto puede ser una secuencia histórica legítima, pero su presentación no permite distinguir con rapidez qué pendiente quedó cerrado. No se afirma aquí que esa aprobación no haya ocurrido ni se certifica que haya ocurrido: hay que precisar objeto, fecha y alcance de la revisión registrada.

### Contrastes que conviene resolver

| Tema | Documentación coexistente | Acción recomendada |
|---|---|---|
| Origen de los conceptuales | LEEME: producción conceptual con Manim; decisión posterior: ambos formatos parten de la plataforma, con Remotion y Manim según necesidad | Llevar la decisión vigente al manual y conservar la anterior como antecedente |
| Duración | LEEME: largo de al menos 8 min; plan: meta no obligatoria, sin relleno y con compilaciones | Precisar la política pedagógica vigente; revisar por separado las condiciones externas de monetización |
| Revisión del piloto | Pendiente en un apartado y aprobado en otro | Registrar qué se aprobó: enfoque, láminas, MP4 sin voz o versión final |
| Número de clases M1 | LEEME: 58; planificación: 68 | Obtener el inventario del YAML o fechar expresamente los conteos narrativos |
| `m1-naturales` | Retiro decidido pero diferido; sigue como borrador de aula | Mantenerlo identificado como material legado pendiente de replanificación; no retirarlo desde esta auditoría |
| Rutas | Nota de migración al inicio, múltiples `content/lessons`, `lesson.yaml` y `yt-m1.yaml` en el cuerpo | Usar rutas actuales en la especificación vigente y conservar las antiguas solo en historia |
| Reutilización anual | El canal propone conservar IDs de clases no cambiadas; la arquitectura liga una clase a una biblioteca y copia con ID nuevo | Definir si una nueva edición comparte recursos o los copia, y cómo se registra su procedencia |

### Reglas de video que aún no equivalen a una evaluación pedagógica

Las comprobaciones son avisos durante el piloto, lo que está documentado y es razonable como decisión experimental. Sin embargo:

- El carácter de práctica se deduce de `-practica-` en el ID. Una decisión semántica depende de un nombre que debe permanecer estable. A futuro conviene un campo explícito, manteniendo compatibilidad.
- El límite de 25 palabras cuenta el texto del árbol de la lámina; no reconstruye cada estado visible ni incluye necesariamente textos de atributos o de actividades referenciadas. Es una aproximación, no una medida exacta de densidad simultánea.
- El plan pide una pausa por pregunta en videos de práctica. `videoLessonWarnings` no verifica de forma general esa correspondencia; la muestra de práctica sí marca sus preguntas como pausa.
- La existencia de una fórmula o figura satisface parte de la regla visual, pero no prueba que esa figura explique el concepto.
- Los previos pueden resolverse contra entradas planificadas, no necesariamente contra material terminado y publicado. «Planificado antes» y «disponible para aprender antes» deben distinguirse.

Fuentes: `content-model/src/video-rules.ts`, la planificación M1 y los manifiestos de los videos.

## 8. Qué comprueba realmente la plataforma

| Definición | Comprobación observada | Límite que debe declararse |
|---|---|---|
| Propósito, evidencia y errores | Apartados presentes y no vacíos en guías publicadas | No evalúa calidad, observabilidad ni alineación con objetivos |
| Objetivos y habilidades | Listas obligatorias en el esquema | Texto libre; no existe una rúbrica semántica de calidad |
| Referencia curricular | El identificador debe existir | No comprueba por sí sola si el contenido corresponde al objetivo curricular |
| Tiempo | Tramos contiguos, cobertura y suma si se declaran | `tramos` es opcional; si falta, `verifyLessonPlan` no produce problema |
| Matemática de actividades | Coherencia de alternativa y solución de sistemas 2×2 cuando hay `model` | No es un verificador algebraico general para todas las fórmulas y ejercicios |
| Fuente oficial | Campos de procedencia y referencia | Una cadena de texto no prueba autenticidad ni vigencia de la fuente |
| MDX y composición | Componentes y parámetros permitidos, pasos, IDs y referencias | No acredita claridad didáctica ni legibilidad real en aula |
| Video | Avisos de estructura, densidad aproximada, figuras, mascota y previos | No acredita ritmo de narración, pausa efectiva ni comprensión |
| Publicación | Se excluyen borradores del build; hay verificación adicional de distribución | El estado editorial requiere decisión humana; pasar el build no equivale a aprobación |

La documentación debería decir **«verificado automáticamente»**, **«aviso»** o **«revisión docente»** junto a cada regla relevante. Eso evitaría interpretar «contenido válido» como «clase pedagógicamente validada».

## 9. Reestructuración propuesta

### 9.1 Jerarquía de autoridad

1. **Principios pedagógicos y política de datos:** compromisos que rigen todo el producto.
2. **Especificaciones vigentes por ámbito:** aula, video, lenguaje visual y contratos de plataforma.
3. **Decisiones del curso y de cada clase:** adaptaciones concretas justificadas.
4. **Manuales operativos:** cómo crear, editar, revisar y publicar respetando lo anterior.
5. **Historial, propuestas y roadmap:** explican el origen o el futuro; no se leen como estado actual.

Si aparece una contradicción, no debe resolverse simplemente suponiendo que el archivo más nuevo prevalece: puede tratarse de una propuesta. La ficha del documento debe indicar su estado, ámbito y la decisión que sustituye.

### 9.2 Organización sugerida

Esta estructura es una propuesta; no se crearon ni movieron sus carpetas.

```text
docs/
  indice-definiciones.md        Mapa de autoridad y lectura por tarea
  pedagogia.md                 Principios generales vigentes
  lenguaje-visual.md            Semántica y criterios generales
  presencia-mascota.md          Política actual de uso
  glosario.md                   Biblioteca, curso, clase, sesión, evidencia...
  decisiones/                  Decisiones transversales con estado e historial
  propuestas/                  Ideas aún no adoptadas

contenido/
  como-escribir-clases.md       Entrada breve al flujo de autoría
  autoría/                     Aula, video y evaluación; nombre a acordar
  cursos/<curso>/LEEME.md       Marco y progresión del curso
  .../clases/<id>/guia.md       Diseño, justificación y mejoras de esa clase

plataforma/docs/
  architecture.md              Mapa de módulos y responsabilidades
  contratos-contenido.md        Entidades, compatibilidad y validación
  datos-y-privacidad.md         Datos públicos, privados y modos sin red
  deployment.md                Estados, publicación y recuperación
  roadmap.md                   Solo trabajo futuro, con criterios de entrada
```

No conviene duplicar en un manual todos los parámetros que ya define `interactive-params.ts`. La referencia técnica podría generarse o comprobarse a partir de ese catálogo. Tampoco conviene fragmentar cada regla en un archivo mínimo: la unidad debe ser una tarea o una decisión que pueda entenderse completa.

### 9.3 Ficha mínima para documentos normativos

| Campo | Para qué sirve |
|---|---|
| Estado | Vigente, propuesta, sustituido o referencia histórica |
| Ámbito | Global, aula, video, plataforma, curso o clase |
| Responsable de decisión | Docente para pedagogía; responsable técnico para implementación dentro de esas decisiones |
| Fecha de decisión y última revisión | Distinguir cuándo se decidió de cuándo se editó el texto |
| Sustituye / sustituido por | Evitar dos autoridades simultáneas |
| Implementación asociada | Archivos o funciones que concretan la decisión |
| Verificación | Automática, aviso o revisión humana |

### 9.4 Registro de decisiones

Una entrada debería responder: **qué se decidió, por qué, qué alternativas se descartaron, dónde aplica, qué cambia y cómo se comprobará**. Debe conservar el historial sin obligar al lector a reconstruir cronologías dentro de una especificación.

La aprobación debe indicar su objeto. «Se aprobó el piloto» es menos útil que «se aprobó usar el formato para redactar diez borradores; la revisión del MP4 final sigue pendiente», si ese fue efectivamente el alcance. El registro debe basarse en evidencia existente o confirmación del docente, nunca completarse por inferencia.

## 10. Agenda de decisiones para el docente

| Prioridad | Decisión | Recomendación de este informe |
|---|---|---|
| Alta | ¿Qué documento manda cuando el plan histórico difiere del manual? | Publicar una especificación vigente breve y dejar el plan como historial |
| Alta | ¿Qué debe estar resuelto antes de producir muchas láminas? | Propósito, primera evidencia, criterio de logro y errores anticipados |
| Alta | ¿Cómo se acredita la revisión? | Separar revisión pedagógica, técnica y ensayo de proyección; registrar solo hechos |
| Alta | ¿Qué memoria puede ser pública? | Intención y decisiones generales en guías; observaciones identificables fuera del repositorio |
| Alta | ¿Qué significa evidencia suficiente? | Desempeño observable vinculado a cada objetivo esencial, con criterio de logro |
| Alta | ¿Qué alcance tienen las definiciones matemáticas? | Exigir dominio, condiciones y separación entre definición y ejemplo |
| Media | ¿Son universales las reglas de aula? | Mantener la práctica individual/guiada como política explícita y delimitar reglas por formato |
| Media | ¿Cómo se representan IA y estrategia? | Definir recursos no curriculares antes de crear contenido que fuerce referencias M1 |
| Media | ¿Qué duración gobierna los videos? | Consolidar la decisión registrada de no rellenar y distinguir estimación de duración real |
| Media | ¿Cómo reutilizar entre bibliotecas y años? | Elegir copia con procedencia o referencia compartida; hoy el sistema favorece la copia |
| Media | ¿Qué debe bloquear la publicación? | Estructura y mínimos acordados; mantener heurísticas de video como avisos hasta revisar el piloto |
| Baja | ¿Cuántas plantillas de mascota hacen falta? | Priorizar necesidades de enseñanza observadas sobre metas numéricas de catálogo |

## 11. Orden sugerido para ejecutar la reestructuración

**Primera pasada: autoridad documental.** Crear el índice y el glosario; clasificar documentos; extraer del plan de videos el estado vigente; actualizar README, manual del canal y roadmap; mover decisiones particulares de Sistemas a su guía. Conservar enlaces y antecedentes.

**Segunda pasada: diseño instruccional.** Completar Evidencia y Errores esperados de los borradores prioritarios; añadir criterios de logro; revisar las definiciones matemáticas señaladas y después ampliar esa revisión a otras clases; distinguir esencial, extensión y repaso.

**Tercera pasada: contratos y herramientas.** Decidir si los tramos serán obligatorios al publicar, si el tipo de video requiere un campo y cómo representar áreas no curriculares. Revisar plantillas para que no atribuyan por defecto un currículo incorrecto. Todo cambio de modelo debe comprobar compatibilidad con el editor y el adaptador externo de videos.

**Cuarta pasada: memoria de uso.** Tras clases o pilotos reales, registrar ajustes generales, duración observada y decisiones. Usar esos datos para cambiar umbrales y calendario, en lugar de consolidar límites experimentales como verdades permanentes.

**Criterios de cierre propuestos:** cada regla vigente tiene una autoridad identificable; cada propuesta está marcada como tal; cada objetivo esencial tiene evidencia y criterio; los términos públicos/privados son inequívocos; los manuales describen las capacidades presentes; las verificaciones y revisiones humanas se reportan por separado.

## 12. Verificación técnica de esta revisión

Se ejecutaron los seis comandos exigidos por las instrucciones del repositorio desde `plataforma/`. Algunos intentos iniciales no pudieron iniciar procesos por una restricción del entorno (`EPERM`) y se reintentaron con permiso de ejecución ampliado. Los resultados finales y sus límites se registran a continuación.

| Comprobación | Resultado observado |
|---|---|
| `content:check` | Correcta: 16 clases, 253 láminas y 17 actividades. 14 avisos: 13 por guías incompletas y uno por `m1-naturales` como aula en biblioteca de publicación |
| `typecheck` | Falló por cadenas sin cerrar en `apps/presenter/src/store/mdx.test.ts`, líneas 23–27, dentro de los cambios locales en curso |
| `lint` | Falló por el mismo error de sintaxis en ese archivo |
| `test` | 233 pruebas aprobadas en 29 archivos; un archivo adicional no pudo transformarse por ese error. La suite global no pasó |
| `build` | Correcta, con los avisos de contenido y advertencias de empaquetado |
| `test:e2e` | 52 pruebas aprobadas y 12 fallidas. Hay esperas de sincronización, discrepancias de interacción y un rechazo de conexión al servidor local. Requieren reproducción en una carpeta estable antes de atribuir causas definitivas |

Los registros quedaron en `plataforma/output/auditoria-definiciones/`. Para los comandos reintentados, la evidencia final está en los archivos terminados en `-reintento.log`. No se hicieron guardados en GitHub ni publicación remota como parte de esta revisión. Las pruebas de conexión usan el repositorio simulado previsto por el proyecto.

Estos resultados impiden declarar que todas las verificaciones pasan. El build exitoso no contradice el fallo de tipado: son verificaciones distintas. Los fallos se reportan como hallazgos del estado local observado; su reparación queda fuera de la reestructuración documental solicitada.

No se cambiaron composiciones ni contenido de clases; por ello no se generó ni se revisó un PDF nuevo. Las pruebas automáticas de interfaz no sustituyen una inspección completa de todas las láminas ni un ensayo en proyector.

## 13. Fuentes de código para profundizar

| Fuente | Pregunta que permite resolver |
|---|---|
| [content-model/src/index.ts](../plataforma/packages/content-model/src/index.ts) | ¿Qué entidades, estados y campos acepta hoy el sistema? |
| [guide.ts](../plataforma/packages/content-model/src/guide.ts) | ¿Qué apartados tiene una guía y cuáles son obligatorios? |
| [check-content.ts](../plataforma/packages/content-model/src/check-content.ts) | ¿Qué bloquea el guardado/publicación y qué solo avisa? |
| [verify-plan.ts](../plataforma/packages/content-model/src/verify-plan.ts) | ¿Cómo se comprueba la duración? |
| [verify-model.ts](../plataforma/packages/content-model/src/verify-model.ts) | ¿Hasta dónde llega la validación matemática de actividades? |
| [video-rules.ts](../plataforma/packages/content-model/src/video-rules.ts) | ¿Qué reglas de video se ejecutan realmente? |
| [interactive-params.ts](../plataforma/packages/content-model/src/interactive-params.ts) | ¿Cuál es el contrato compartido de interactivos y editor? |
| [content-plugin.ts](../plataforma/apps/presenter/content-plugin.ts) | ¿Qué información entra en el sitio público? |
| [ContentProvider.tsx](../plataforma/apps/presenter/src/content/ContentProvider.tsx) | ¿Qué cambia entre contenido empaquetado, caché y conexión GitHub? |
| [store/schema.ts](../plataforma/apps/presenter/src/store/schema.ts) | ¿Qué se considera dato privado y cómo se versiona? |
| [AulaProvider.tsx](../plataforma/apps/presenter/src/store/AulaProvider.tsx) | ¿Cómo se comparte el estado de proyección? |
| [PrintDeck.tsx](../plataforma/apps/presenter/src/slides/PrintDeck.tsx) | ¿Cómo difieren la impresión final y por pasos? |
| [deploy.yml](../.github/workflows/deploy.yml) | ¿Qué verificaciones ejecuta la publicación automática? |

Este documento queda como diagnóstico para decidir cambios. Las propuestas no sustituyen las instrucciones vigentes hasta que el docente adopte la reestructuración correspondiente.
