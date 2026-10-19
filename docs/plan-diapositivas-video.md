# Plan: láminas para los videos del canal

> Nota del 19-10-2026: el contenido se reorganizó por curso. `content/planning/yt-m1.yaml` es ahora `contenido/youtube/paes-m1/curso.yaml`, `docs/canal-youtube.md` es `contenido/youtube/LEEME.md`, `docs/visual-language.md` es `docs/lenguaje-visual.md` y `docs/authoring.md` es `contenido/como-escribir-clases.md`.

Propuesta del 15-10-2026. Las decisiones del docente están en §7 y el análisis de duración en §9. **Nada de esto está implementado.** No cambia contenido, planificación ni fechas. `content/planning/yt-m1.yaml` y `docs/canal-youtube.md` tienen cambios en revisión en el checkout principal; este plan no los toca y las listas de §5 son solo propuestas.

Lo que pidió el docente: que las láminas de video se estructuren distinto a las de aula, con más elementos visuales e interactivos; que un tema se detalle cuanto haga falta, sin limitar el número de videos, y que casi cada video sea autocontenido, con referencias a contenidos previos cuando no haya otra opción.

Fuentes revisadas: `AGENTS.md`, README, `docs/architecture.md`, `docs/visual-language.md`, `docs/authoring.md`, `docs/canal-youtube.md` y `content/planning/yt-m1.yaml` de esta plataforma; las clases borrador `m1-naturales` (24 láminas) y `m1-enteros` (19 láminas) frente a `sistemas-2x2`; «Plan de producción - Números.md» y «Estilo de guion y video (referencia 3Blue1Brown).md» de la carpeta del canal; y el README, `AGENTS.md`, `docs/recursos.md`, `src/plataforma/` y `src/motor/tipos.ts` del repositorio `H:\Videos Profe Pina`.

## 0. Diagnóstico: qué hacen hoy las dos clases de ejemplo

**`m1-naturales` es una clase de aula comprimida.** Tiene 24 láminas en 16 minutos (unos 40 s por lámina) y ocho subtemas: sistema decimal, sucesor y antecesor, expresiones usuales, paridad, algoritmo de la división, divisibilidad, primos, MCM y mcd, prioridad de las operaciones y clausura.
- Abre con portada y bloque Objetivo, como en el aula. La guía del canal pide un gancho.
- Casi todas las láminas empiezan con un bloque `Definicion` y después muestran el caso. La guía pide lo contrario: primero el caso concreto y después lo formal.
- No tiene una pregunta central ni un clímax. El cierre es metacognitivo («¿Cómo decides si un problema pide el MCM o el mcd?») y no responde a ninguna tensión inicial.
- Las siete figuras nuevas son buenas, pero estáticas: aparecen enteras en un `Paso`. Por ejemplo, `LineasMultiplos` dibuja de una vez todos los múltiplos, cuando lo valioso para un video es verlos avanzar hasta que coinciden.

**`m1-enteros` ya se acerca al guion de video.** Tiene gancho (el termómetro), pausa («¿cuál es mayor, −3 o −10?»), error con nombre («el menos que se pierde») y un cierre que vuelve al termómetro. Aun así:
- conserva la portada con Objetivo;
- reúne cinco ideas en 12 minutos (conjunto y opuesto; orden y valor absoluto; suma y resta; multiplicación y signos; contextos PAES), y el tramo teórico mete cuatro ideas en 3,5 minutos;
- los bloques `Definicion` siguen dominando, y `ExploradorResta` es un control con deslizadores que en un video no tiene a quién responder.

**El puente hacia los videos es manual.** El repositorio de videos lee de cada clase `lesson.yaml` (tramos, orden), el frontmatter y el cuerpo de las láminas, la galería y los tokens. Con eso genera `estructura.json`: tramos, láminas, pasos, componentes usados y mascota. Lo que se ve en pantalla se **vuelve a escribir a mano** en `guion.ts`. De `packages/interactives` reutiliza solo la matemática de `function-graph.ts`. Las figuras de la plataforma (`RectaEnteros`, `LineasMultiplos`…) no llegan al video. Sus estilos viven en `apps/presenter/src/styles/theme.css`, y el motor de video no puede importarlos.

**Conclusión:** hoy una «clase de video» es una clase de aula más corta. Para lo que pide el docente hacen falta tres cosas: otro molde de clase, figuras que se puedan animar y un puente que lleve esas figuras al video sin reescribirlas.

## 1. Lámina de aula frente a lámina de video

| Aspecto | Aula (hoy) | Video (propuesta) |
|---|---|---|
| **Unidad** | La clase de 80 min, con tramos para el docente | Un video = una pregunta central y una idea (duración en §9) |
| **Estructura** | Portada con Objetivo → activación → desarrollo → práctica → cierre metacognitivo | Gancho → caso concreto → versión simplificada → desarrollo → **clímax** → pausa → utilidad PAES → cierre que responde al gancho |
| **Apertura** | Portada con título y Objetivo (violeta) | Una lámina-gancho: la tensión y un objeto (el termómetro, los buses). Sin portada ni Objetivo en pantalla: el objetivo queda en `lesson.yaml` y en la descripción |
| **Ritmo** | Una idea por lámina; el docente regula el tiempo | Una idea por lámina y **un cambio visible por paso**. Cada paso es un beat de la narración (5–15 s) |
| **Texto en pantalla** | Bloques completos que se leen en voz alta o en silencio | Lo que se dice no se escribe. En pantalla quedan objetos, rótulos, la fórmula clave y como máximo una frase. La narración explica |
| **Definiciones** | Al inicio de la lámina, en azul | Después del caso, como **síntesis** de lo que ya se vio. Una por video como idea central y pocas de apoyo |
| **Revelados** | `Paso` muestra bloques enteros | `Paso` cambia el **estado** de una figura: un salto más, un múltiplo más, un rectángulo que se reordena. El bloque de texto entra al final |
| **Interactivos** | Deslizadores que el docente mueve en vivo | Secuencias de estados declaradas en la lámina. El video las anima; en el aula se avanzan con la flecha |
| **Práctica** | Guiada o individual, con tiempo y modalidad | Predicción (6 s) o pausa (15–20 s) con pista que no da la respuesta |
| **Error típico** | Bloque ocre con la evidencia | Primero se **comete** en pantalla, después se nombra y al final se contrasta (dos estados de la misma figura) |
| **Cierre** | `Cierre` rosa con preguntas y semáforo | Vuelta al gancho con la respuesta. Opcional: una pregunta para comentarios. La pantalla final de YouTube lleva al siguiente video |
| **Mascota** | `Composicion` reserva columna; una por lámina | La pone el motor de video según el momento (predicción, pausa, pista, recuerdo). La lámina no la declara salvo en el gancho, si cumple una función |
| **Título de la lámina** | Visible arriba | Sirve de capítulo y de índice; no ocupa el lienzo |
| **Zona libre** | Todo el lienzo | Franja inferior libre para los subtítulos (≈ 12 % del alto) |
| **PDF** | Una página por lámina, todo revelado | Igual, como representación estática y guion gráfico (ver §4.6) |

### Momentos del guion como dato

Hoy `phase` tiene cinco valores pensados para el aula. Para video se propone un campo propio, `momento`, en el frontmatter de cada lámina:

| `momento` | Qué es | Bloques que suele usar |
|---|---|---|
| `gancho` | Tensión genuina con un objeto concreto | Figura + una pregunta; sin Objetivo |
| `caso` | El caso concreto del primer minuto | Figura, rótulos |
| `simplificada` | La versión reducida antes del caso real | Figura con menos elementos |
| `desarrollo` | La construcción de la idea | Figura que cambia de estado; fórmula; Definicion al final |
| `recuerda` | Prerrequisito recordado en ≤ 30 s (§2) | `Recuerda` |
| `climax` | El momento en que se combinan las dos piezas | Dos representaciones a la vez |
| `prediccion` / `pausa` | Momento de trabajo del estudiante | PracticaIndividual, con pista opcional |
| `error` | Error con nombre | ErrorTipico con dos estados |
| `utilidad` | Para qué sirve en la PAES (nunca en la primera lámina) | Escenario propio, sin preguntas reales |
| `cierre` | Respuesta al gancho | Comprobacion o figura del gancho resuelta |

Los nombres coinciden a propósito con `momento: 'prediccion' | 'pausa' | 'recuerda'` del motor de video. Así, el guion hereda el momento de la lámina en vez de declararlo de nuevo.

## 2. Qué significa «autocontenido»

**Definición operativa:** quien llega a un video desde la búsqueda, sin haber visto otro, lo entiende entero con tres cosas:
1. lo que el video enseña;
2. lo que el video **recuerda** en pantalla (≤ 30 s por cada prerrequisito);
3. una base declarada como supuesta (por ejemplo, «sumar, restar, multiplicar y dividir naturales»).

Nada más.

**Prueba del recién llegado** (se hace al escribir el guion): se recorre cada concepto, símbolo y contexto que aparece en pantalla o en la voz y se marca como *enseñado*, *recordado* o *base*. Si algo no cae en ninguna, el video no es autocontenido.

**Reglas propuestas:**
- **Recuerdos breves y pocos.** Como máximo dos bloques `Recuerda` por video, cada uno de ≤ 30 s. Si hacen falta más, el video está demasiado lejos en la cadena o es demasiado grande: se divide o se reordena la ruta.
- **Referenciar no es requerir.** Se dice «si quieres ver de dónde sale, está en el video de primos» (tarjeta y descripción). Nunca se dice «ve primero el video anterior». Tampoco se usa «como vimos en el video anterior» como única explicación.
- **Cada video presenta su propio contexto.** Si los buses del MCM vuelven en otro video, se presentan de nuevo en una frase.
- **El cierre responde a su propio gancho,** no al del video siguiente. El adelanto del siguiente va al final, después de la respuesta, y es opcional.
- **Errores con nombre estables.** «El menos que se pierde» se llama igual en todos los videos donde aparece. Si otro video lo usa, lo vuelve a mostrar en 10 s.

**Cómo se declaran los prerrequisitos.** Hoy `prerequisites` es texto libre. Se propone agregar en `lesson.yaml` una lista estructurada:

```yaml
previos:
  - clase: m1-primos
    idea: Todo natural mayor que 1 se descompone en primos de una sola forma.
  - base: Multiplicar y dividir naturales.
```

En la lámina:

```mdx
<Recuerda clase="m1-primos">
$72=2^3\cdot 3^2$: cada natural se escribe como producto de primos de una sola forma.
</Recuerda>
```

`Recuerda` es un **marco**: lleva un borde, la etiqueta «Recuerda» y el nombre del video de origen, sin fondo propio. Su contenido conserva el color de su función: una definición recordada sigue azul y un procedimiento sigue piedra. Así se cumple `docs/canal-youtube.md` («recuerda… azul») sin usar el azul como caja decorativa. El motor de video lo convierte en un beat `momento: 'recuerda'` y en una tarjeta de YouTube hacia ese video.

**Criterio de tamaño para dividir un tema:**
1. **Una pregunta, un clímax.** Si el gancho no cabe en una pregunta, o si hay dos momentos en que «se combinan las piezas», son dos videos.
2. **Una idea nueva central,** con a lo sumo dos de apoyo. Tres definiciones nuevas en un video señalan que hay que dividirlo.
3. **Duración: meta de 8 min, sin obligarla (decisión 2).** Se diseña para 7–10 min de contenido sin relleno. Una idea de 5–7 min se publica así si unirla con su vecina rompería la regla de un clímax; con menos de 5, se une o se vuelve un Short. Si pasa de 12, se divide. Las compilaciones por bloque aportan las horas y los anuncios a mitad de video.
4. **Cada error típico PAES tiene dónde vivir.** Si un error frecuente no tiene espacio para cometerse, nombrarse y contrastarse, falta un video.
5. **De 8 a 16 láminas por video conceptual,** con 2 a 6 pasos cada una. Más de 18 láminas indica que hay que dividir.

La regla del canal dice que el video largo monetizable dura **8 minutos o más** (`canal-youtube.md`, principio 4). Dividir en videos autocontenidos empuja algunos temas por debajo de ese umbral. Es una decisión del docente (§7, pregunta 2); el análisis está en §9.

## 3. Elementos visuales e interactivos

### 3.1 Lo que existe y sirve

| Figura | Sirve para video | Qué le falta |
|---|---|---|
| `RectaEnteros` | Saltos, opuestos, distancias al cero | Que cada salto, opuesto o distancia aparezca en su paso (hoy todo entra junto) |
| `ExploradorResta` | Las dos lecturas de a − b | Una **secuencia** de valores (a, b) por paso, en vez de deslizadores |
| `ValorPosicional` | Billetes y monedas por posición | Agrupar 10 de una posición en 1 de la siguiente, como estado |
| `GruposPuntos` | Algoritmo de la división | Llenar las cajas una a una; el resto queda al final |
| `RectangulosDivisores` | Divisores como lados | Mostrar los rectángulos uno por paso; el primo con un solo rectángulo |
| `CribaPrimos` | Criba de Eratóstenes | Tachar múltiplos de 2, 3, 5 y 7 por pasos (hoy solo muestra el resultado) |
| `ArbolFactores` | Descomposición | Crecer nivel por nivel |
| `LineasMultiplos` | MCM como coincidencia | Avanzar los múltiplos hasta coincidir; destacar la primera coincidencia |
| `BarrasDivision` | mcd como trozo común | Probar trozos que fallan antes del que sirve |
| `GraficoFuncion`, `GraficoComparacion`, `ExploradorCuadratica` | Álgebra y funciones | `GraficoFuncion` ya tiene `pasoReferencia`: es el precedente que conviene generalizar |
| `DiagramaSagital`, `RectaIntervalos`, `MaquinaFuncion` | Funciones e inecuaciones | Flechas e intervalos por paso |

### 3.2 Comportamiento en video: estados animables

**Principio:** una figura de video es una función pura `estado = f(parámetros, paso)`. El paso puede ser fraccionario entre dos pasos (`progreso`, entre 0 y 1).
- En el **aula**, el estado avanza con la flecha.
- En el **PDF**, se dibuja el último paso.
- En el **video**, Remotion interpola entre el paso n y el n + 1 al ritmo del beat.

Así se conservan las reglas actuales: matemática pura fuera de React, representación estática determinista y parámetros iniciales.

**Cómo se declara.** Cada elemento de la figura recibe, de forma opcional, el paso en que aparece. Por ejemplo:

```mdx
<RectaEnteros min={-5} max={10} desde={5} saltos={[-5, -3]} pasosSaltos={[1, 2]} … />
<LineasMultiplos numeros={[12, 18, 24]} hasta={72} avance="paso" … />
```

`ExploradorResta` pasa a aceptar `secuencia={[[5, 8], [4, -3]]}`: un par (a, b) por paso, con el último como valor del PDF. Los deslizadores siguen disponibles en el repaso del estudiante.

**Regla para los pasos de video:** un paso = un cambio que se nombra en una frase. Si un paso necesita dos frases para explicarse, se divide en dos.

### 3.3 Figuras nuevas que convendrían en Números

Se listan por video de §5. Cada una con su ficha en `interactive-params.ts`, su geometría en un módulo puro con pruebas y estados por paso:

- **`Termometro`**: vertical, con escala de enteros y un descenso por paso. La transformación termómetro → recta horizontal es continua y va en Manim (§3.4).
- **`ReflejoCero`**: un número y su opuesto como reflejo en el cero (enteros, valor absoluto).
- **`TablaSignos`**: la tabla 3, 2, 1, 0, −1… × (−2), que muestra el patrón que obliga a «menos por menos es más».
- **`BarraFraccion`**: una barra dividida en partes, con equivalencias (partir cada parte en k) y «fracción de lo que queda».
- **`RectaFracciones`**: fracciones y decimales como puntos, incluido el error 1/3 + 1/2 = 2/5 cayendo antes de 1/2.
- **`Cuadricula100`**: porcentaje como casillas coloreadas; comparar dos grupos reescalados a 100.
- **`BarraFactor`**: precio que se estira por ×1,2 y se encoge por ×0,8.
- **`CadenaFactores`**: potencia como factores que se juntan o se cancelan.
- **`CuadradoRaiz`**: lado ↔ área; √72 como 2 cuadrados de lado 6.

### 3.4 Conexión con Remotion y Manim

**Remotion (repositorio de videos).** Se propone que el video **use las figuras de la plataforma** en lugar de redibujarlas a mano:
1. **Estilos de las figuras dentro de `packages/interactives`.** Hoy están en `apps/presenter/src/styles/theme.css`. Las figuras pasarían a usar solo variables de `tokens.css`, que el video ya lee. Es un cambio de la plataforma, útil también para el aula.
2. **`useSlide` con `progreso`.** El contexto de lámina ya expone `step` y `print`. El video proveería `step` y un `progreso` calculado desde el cuadro de Remotion.
3. **El adaptador amplía `estructura.json`** con `formato`, `momento` de cada lámina, `previos`, los `Recuerda` y las figuras con sus props y pasos.
4. **`guion.ts` deja de reescribir lo que hay en pantalla** para las láminas de video. Cada beat apunta a un paso de la lámina y agrega la voz, la cámara, los viajes y las pausas. `guion:check` ya comprueba el orden de láminas y pasos; se le agrega que cada paso de una lámina de video tenga al menos un beat.

**Manim** sigue solo para transformaciones continuas que una secuencia de estados no expresa bien: el termómetro que se acuesta y se vuelve recta, el cuadrado de área 72 que se reorganiza, la curva 2ˣ por √2. En la lámina se declaran con un componente nuevo:

```mdx
<Animacion id="termometro-a-recta" descripcion="El termómetro se acuesta y se vuelve la recta de los enteros.">
  <RectaEnteros … />
</Animacion>
```

En la plataforma y en el PDF, `Animacion` muestra su contenido (el estado final). En el video, `guion:check` exige una escena de Manim con ese `id`. La plataforma guarda solo la descripción, no el video, como ya exige la separación de proyectos.

**Repaso del estudiante como compañía interactiva.** Los deslizadores (`ExploradorResta`, `ExploradorCuadratica`) son el «interactivo» que el estudiante puede tocar. Una lámina de `repaso` de cada clase de video podría enlazarse desde la descripción («explora tú mismo»). Depende de la decisión pendiente sobre la entrada pública.

## 4. Cambios de modelo y de motor

Las reglas nuevas van en `packages/content-model`, para que rijan igual en content:check y en la app.

### 4.1 Formato de la clase

En `lesson.yaml`, un campo nuevo `formato: aula | video`, con `aula` por omisión. Las clases actuales no cambian.
- El tipo de video sale del identificador, que ya es convención: con `-practica-` es de práctica; si no, conceptual.
- content:check **avisa** si una biblioteca con `calendario: publicacion` planifica una clase `aula`. Un aviso y no un error, porque `yt-canal` puede tener otras necesidades.
- «Copiar a otra biblioteca» no cambia el formato. Convertir una clase de aula en video es una acción explícita que no reescribe láminas.

Se prefiere el campo en la clase y no en la biblioteca, porque las reglas se aplican por clase y el adaptador de video lee la clase.

### 4.2 Campos nuevos

| Dónde | Campo | Reglas |
|---|---|---|
| `lesson.yaml` | `formato` | `aula` \| `video` |
| `lesson.yaml` | `previos` | `clase` existente en la misma biblioteca y anterior en su orden, con `idea` obligatoria; o `base` como texto |
| `lesson.yaml` | `gancho` | La pregunta central en una frase; obligatoria en video conceptual |
| `lesson.yaml` | `tramos` | En video, los minutos aceptan decimales y la suma da la duración estimada; cada tramo es un capítulo de YouTube |
| Frontmatter | `momento` | Solo en video; va después de `phase` en la forma canónica de `toMdx` |
| MDX | `Recuerda`, `Animacion` | Fichas en el catálogo de componentes; `Recuerda.clase` debe estar en `previos` |
| Figuras | `pasos…` por elemento, `secuencia` | Fichas en `interactive-params.ts` |

`phase` se mantiene en video, porque la app y los filtros de la galería lo usan, y se deriva de `momento`: gancho y caso → `inicio`; recuerda → `activacion`; desarrollo, simplificada, clímax y error → `desarrollo`; predicción, pausa y utilidad → `practica`; cierre → `cierre`.

### 4.3 Reglas de content:check solo para video

Primero como **avisos** durante el piloto; después del piloto, las que se confirmen pasan a errores.

1. La primera lámina tiene `momento: gancho` y la última `momento: cierre`. No hay portada con Objetivo.
2. Un video conceptual tiene exactamente un `climax` y al menos una `pausa` o `prediccion`. Un video de práctica tiene una `pausa` por pregunta.
3. `utilidad` no va en las dos primeras láminas.
4. **Densidad:** como máximo ~25 palabras de prosa visibles al mismo tiempo, sin contar fórmulas, rótulos de figuras ni títulos. El umbral se calibra en el piloto.
5. Como máximo un bloque `Definicion` por lámina, y nunca en la lámina gancho.
6. Una lámina de `desarrollo` o `climax` tiene una figura, un interactivo, una `Animacion` o una fórmula central. Una lámina de solo texto genera un aviso.
7. Como máximo dos `Recuerda` por video, y cada uno nombra una clase de `previos`.
8. Las láminas se mantienen entre 8 y 18 en un video conceptual (aviso fuera del rango).
9. Mascota: como máximo una, solo en `gancho` o `cierre`. El resto lo decide el motor de video.
10. Siguen vigentes todas las reglas actuales: ecuaciones verificadas, un `Paso` sin anidar, `steps` igual al máximo paso, tipografía de 31–32 px y división antes de achicar.

### 4.4 Plantillas y diseños

Layouts nuevos, válidos solo en video:
- **`escena`**: la figura ocupa el lienzo, el título no se muestra y la franja de subtítulos queda libre.
- **`gancho`**: una pregunta grande y un objeto.
- **`pausa`**: la pregunta, el espacio reservado para la respuesta y el lugar de la cuenta regresiva (que dibuja el video).

En la galería, una categoría «Video», con plantillas por momento: gancho, recuerda, clímax con dos paneles, error en dos estados y cierre que vuelve al gancho. Se validan como las demás plantillas descargables.

### 4.5 Vista previa en la app

La pestaña Láminas de una clase de video podría mostrar la franja de subtítulos reservada y el `momento` de cada lámina. El índice (M) podría mostrar la secuencia de momentos para comprobar de un vistazo gancho → … → cierre. No se agrega reproducción de video, por la separación de proyectos.

### 4.6 PDF

**Recomendación:** la regla de una página por lámina, todo revelado y sin sombras **sigue aplicando**.
- Es la representación estática que garantiza que cada estado final existe y cabe.
- Sirve como guion gráfico para revisar un video antes de grabar.

Lo que cambia es su uso. Mientras no se decida el «material de apoyo» (`canal-youtube.md` §6), el PDF de una clase de video no se enlaza en la descripción. Un PDF de láminas escuetas no es buen material de estudio; si se quiere uno, conviene una ficha resumen aparte, que es otra decisión.

### 4.7 Repositorio de videos

Los cambios del repositorio de videos se hacen allá, con sus propias reglas:
- `estructura.json` con los datos nuevos (§3.4);
- figuras de la plataforma renderizadas con `progreso`;
- `Recuerda` → beat `recuerda` y tarjeta;
- `Animacion` → escena de Manim obligatoria;
- `momento` de la lámina como valor por omisión del beat;
- `guion:check`: cada paso de una lámina de video tiene un beat.

`docs/recursos.md` de allá documenta el uso.

### 4.8 Lo que no cambia

- Las clases de aula y sus reglas.
- La autoría en español, los IDs estables y el lenguaje visual con sus seis familias.
- Los tonos de asociación como solo fondo.
- Una mascota por lámina.
- Sin dependencias nuevas ni backend.
- El video solo lee la plataforma.

## 5. Consecuencias para la planificación: eje Números

**Propuesta sin tocar `yt-m1.yaml`.** Hoy el eje tiene 11 clases (`m1-naturales` sin fecha y 10 con fecha). Con un video por pregunta central quedaría en **unos 25**. Se conservan los identificadores que ya existen cuando su idea central sigue siendo la misma. Los marcados como *nuevo* no tienen todavía `lesson.yaml`.

| # | id | Estado | Gancho (pregunta) | Idea central / clímax | Recuerda |
|---|---|---|---|---|---|
| 1 | `m1-consecutivos-paridad` | nuevo (de `m1-naturales`) | ¿La suma de tres consecutivos siempre es múltiplo de 3? | n + (n+1) + (n+2) = 3(n+1); par e impar como 2k y 2k+1 | base |
| 2 | `m1-division-resto` | nuevo (de `m1-naturales`) | 23 alfajores en cajas de 5: ¿cuántas cajas y cuántos sobran? | D = d·q + r con 0 ≤ r < d; el resto decide la paridad y la divisibilidad | — |
| 3 | `m1-divisores-multiplos` | nuevo (de `m1-naturales`) | ¿De cuántas formas se arma un rectángulo con 12 cuadrados? | Divisores como lados; reglas de divisibilidad del 2, 3, 5, 9 y 10 | 2 |
| 4 | `m1-primos` | nuevo (de `m1-naturales`) | ¿Qué números solo se pueden armar como una fila? | Criba; descomposición única con el árbol de factores | 3 |
| 5 | `m1-mcm-mcd` | nuevo (de `m1-naturales`) | Tres buses salen juntos a las 8:00: ¿cuándo vuelven a coincidir? | El MCM y el mcd se leen en la misma descomposición; coincidir o repartir | 4 |
| 6 | `m1-enteros` | se conserva, acotado | 5 °C y baja 8: ¿qué marca el termómetro? | La recta sigue a la izquierda; orden frente a distancia al cero (−7 < −2 aunque 7 > 2) | base |
| 7 | `m1-enteros-suma-resta` | nuevo (de `m1-enteros`) | ¿Por qué 4 − (−3) da 7? | Restar es sumar el opuesto: el mismo movimiento en la recta | 6 |
| 8 | `m1-enteros-signos` | nuevo (de `m1-enteros`) | ¿Por qué menos por menos es más? | Patrón de la tabla y opuesto del opuesto; error «el menos que se pierde» | 6 |
| 9 | `m1-practica-naturales-enteros` | nuevo | — | 6–8 preguntas propias de los videos 1–8 | por pregunta |
| 10 | `m1-fracciones` | nuevo (de `m1-racionales`) | 3 pizzas entre 4: ¿cuánto le toca a cada uno? | La fracción como reparto y como punto de la recta; equivalencia | 6 |
| 11 | `m1-racionales` | se conserva, acotado | ¿Qué es más: 3/4 o 5/7? | Tres formas de comparar y por qué coinciden | 10 |
| 12 | `m1-sumar-fracciones` | nuevo (de `m1-racionales`) | ¿1/3 + 1/2 = 2/5? | Denominador común; 2/5 < 1/2, así que no puede ser la suma | 10 |
| 13 | `m1-fraccion-de-fraccion` | nuevo (de `m1-racionales`) | Recorres 1/3 de la ruta y luego la mitad de lo que falta: ¿qué queda? | Multiplicar como «fracción de»; dividir como multiplicar por el inverso | 10 |
| 14 | `m1-decimales` | nuevo (de `m1-racionales`) | ¿1,25 min es 1 min 25 s? | Decimal finito ↔ fracción; comparar tiempos | 10 |
| 15 | `m1-practica-racionales` | renombra `m1-practica-enteros-racionales` | — | 6–8 preguntas de los videos 10–14 | por pregunta |
| 16 | `m1-porcentaje` | se conserva | 18 de 24 o 27 de 40: ¿quién lo hizo mejor? | Porcentaje como fracción de 100; la vara común | 11 |
| 17 | `m1-porcentaje-calculos` | nuevo (de `m1-porcentaje`) | 30 es el 20 % de… ¿más o menos que 30? | parte : total = p : 100 leída en tres direcciones | 16 |
| 18 | `m1-porcentaje-tablas` | nuevo | ¿20 % de quiénes? | Porcentaje de un subtotal; puntos porcentuales; error «el total equivocado» | 16 |
| 19 | `m1-porcentaje-variaciones` | se conserva | Sube 20 %, baja 20 %… ¿vuelves al inicio? | Factor multiplicador; 1,2 · 0,8 = 0,96 | 16 |
| 20 | `m1-practica-porcentaje` | se conserva | — | 6–8 preguntas de los videos 16–19 | por pregunta |
| 21 | `m1-potencias` | se conserva, acotado | Doblar un papel 42 veces | Potencia como factores; propiedades contando factores | 2 |
| 22 | `m1-exponente-cero-negativo` | nuevo (de `m1-potencias`) | ¿Por qué 2⁰ = 1 y no 0? | La tabla que divide por 2; a⁰ = 1 sale del cociente | 21 |
| 23 | `m1-comparar-potencias` | nuevo (de `m1-potencias`) | ¿Qué es mayor: 2³⁰ o 3²⁰? | Los casos de a tres; potencias de 10 | 21 |
| 24 | `m1-raices` | se conserva, acotado | Un terreno cuadrado de 72 m²: ¿cuánto mide su lado? | La raíz deshace la potencia; índice par e impar; √72 = 6√2 | 21, 4 |
| 25 | `m1-raices-errores` | nuevo (de `m1-raices`) | ¿√9 + √16 = √25? | Repartir la raíz sobre la suma; raíces semejantes; ordenar raíces | 24 |
| 26 | `m1-exponente-racional` | se conserva | ¿Qué significa elevar a 1/2? | Potencia y raíz son la misma operación | 21, 24 |
| 27 | `m1-practica-potencias-raices` | se conserva | — | 6–8 preguntas de los videos 21–26 | por pregunta |

**Notas:**
- **Prioridad de las operaciones y lenguaje algebraico** (sucesor, doble, «excede en») ya tienen su video en Álgebra: `m1-evaluar-expresiones` y `m1-traducir-expresiones`, que se publican antes. Se proponen como `Recuerda` y no como videos de Números. El valor posicional y los naturales frente a los cardinales quedan como Shorts, o como 30 s del video 2.
- **Prácticas por bloque** (cuatro en vez de tres), para que ninguna práctica junte más de cinco o seis videos conceptuales. Cada pregunta enlaza en su capítulo el video conceptual que la respalda.
- **`m1-naturales` y `m1-enteros` actuales** son la fuente de los videos 1–8: sus láminas y figuras se reparten. `m1-naturales` es borrador, sin fecha ni publicación, así que retirarlo no rompe enlaces. Ver §7.
- **Calendario.** 27 videos a dos por semana son unas 13–14 semanas solo para Números, contra las 5 de hoy (2 de marzo a 2 de abril de 2027). Habría que correr el resto de M1, publicar más seguido o producir antes. Este plan no propone fechas. La capacidad real se mide con el piloto (`canal-youtube.md` §6).
- **Desfase detectado.** «Plan de producción - Números.md» fecha `m1-enteros` el 10-11-2026, pero `yt-m1.yaml` de esta rama lo fecha el 2 de marzo de 2027, con Expresiones algebraicas desde noviembre. Puede corresponder a los cambios en revisión del checkout principal; no se corrige aquí.

## 6. Piloto: `m1-mcm-mcd`

**Por qué este:**
- Usa tres figuras que ya existen (`LineasMultiplos`, `ArbolFactores`, `BarrasDivision`), así que el esfuerzo va al enfoque y no a dibujar.
- Tiene un gancho concreto (los buses), un clímax claro (el MCM y el mcd salen de la misma descomposición) y un error con nombre (confundir cuándo es MCM y cuándo mcd).
- Necesita un `Recuerda` (la descomposición en primos), así que prueba la autocontención.
- Su versión actual (láminas 14–19 de `m1-naturales`) sirve de línea base para comparar.

**Guion gráfico tentativo (≈ 12 láminas, 7–9 min):**

| # | momento | Lámina | Qué cambia por paso |
|---|---|---|---|
| 1 | gancho | Tres buses salen juntos a las 8:00 | Los tres buses salen; la pregunta «¿cuándo vuelven a coincidir?» |
| 2 | prediccion | ¿Antes o después de las 9:00? | Pausa breve de predicción |
| 3 | simplificada | Dos buses: cada 4 y cada 6 min | `LineasMultiplos` avanza múltiplo por múltiplo hasta el 12 |
| 4 | caso | Los tres buses | Avanza hasta el 72; la primera coincidencia se destaca |
| 5 | desarrollo | Contar no escala | Con 12, 18 y 24 cuesta; ¿hay un atajo? |
| 6 | recuerda | Descomposición en primos | `Recuerda clase="m1-primos"`: `ArbolFactores` de 12, 18 y 24 crece nivel por nivel |
| 7 | desarrollo | El MCM toma lo que necesita cada uno | Los factores se alinean; el MCM toma cada primo con su mayor exponente |
| 8 | desarrollo | Repartir: cintas de 12, 18 y 24 cm | `BarrasDivision` prueba trozos de 4 (falla) y de 6 (sirve) |
| 9 | climax | Las dos lecturas del mismo árbol | MCM con el mayor exponente y mcd con el menor: dos lecturas de la misma descomposición |
| 10 | error | «¿MCM o mcd?» | Se elige mal, el resultado no tiene sentido y se contrasta: coincidir frente a repartir |
| 11 | pausa | Dos luces cada 8 y 12 s | Pausa de 15 s con pista; respuesta con `LineasMultiplos` |
| 12 | cierre | Vuelta a los buses | 72 min: 9:12; comprobación 72 = 12·6 = 18·4 = 24·3 |

La utilidad PAES (los contextos de coincidir y repartir) entra en la voz entre las láminas 10 y 11. Si alarga demasiado, va en una lámina propia.

**Pasos del piloto:**
1. **Modelo mínimo en `content-model`:** `formato`, `momento`, `previos` y `Recuerda`, con sus pruebas y las reglas de §4.3 solo como avisos.
2. **Figuras con estados:** `pasos…` o `avance="paso"` en `LineasMultiplos`, `ArbolFactores` y `BarrasDivision`, con pruebas de la geometría pura. Sus estilos pasan a usar solo tokens.
3. **La clase `m1-mcm-mcd` como borrador** en `yt-m1`, sin fecha, sin tocar `m1-naturales`. El docente la revisa en la app.
4. **En el repositorio de videos:** el adaptador lee los campos nuevos; una escena que renderice una figura de la plataforma con `progreso`; `guion.ts` con beats por paso; `npm run revision` y render.
5. **Verificación:** las comprobaciones de `AGENTS.md` de ambos repositorios; revisión visual de láminas y PDF.

**Criterios para generalizar** (se miden; ninguno se da por cumplido sin hacerlo):
- La prueba del recién llegado pasa con un solo `Recuerda`.
- Ninguna lámina supera el umbral de densidad sin una razón que el docente acepte.
- Cada paso tiene un beat de ≤ 16 s.
- La duración queda entre 6 y 10 min.
- El guion cumple el checklist de la guía 3Blue1Brown.
- El tiempo de producción del piloto queda registrado: es el dato que decide el calendario de §5.
- El docente ve el MP4 completo de corrido y decide si el enfoque se generaliza. Hasta entonces no hay revisión docente ni ensayo que afirmar.

### Estado del piloto (15-10-2026)

**Hecho en la plataforma** (pasos 1 a 3):
- `content-model`: `formato`, `gancho` y `previos` en lesson.yaml; `momento` en el frontmatter (va después de `phase` en la forma canónica); el diseño `escena`; el bloque `Recuerda`; las reglas de §4.3 como avisos en `video-rules.ts`, con pruebas. Se ven en content:check y en la pestaña Revisión de la clase.
- Editor: el selector «Momento del video» (solo en clases de video) ajusta la fase; `escena` aparece entre los diseños; `Recuerda` y los pasos nuevos de las figuras se editan como los demás bloques y parámetros.
- Figuras con estados por paso: `LineasMultiplos` (`pasosNumeros`, `pasoComunes`), `ArbolFactores` (`pasoArbol`, `pasoEscritura`) y `BarrasDivision` (`intentos`, `pasosIntentos`, `pasoTrozo`; el resto de un intento queda en ocre). La elección del trozo vigente es una función pura con pruebas.
- La clase `m1-mcm-mcd` (12 láminas, borrador) con el guion gráfico de la tabla anterior, sin avisos propios salvo uno esperado: `m1-primos`, que recuerda, todavía no está planificada.
- `m1-mcm-mcd` quedó en `yt-m1.yaml` como una línea sin fecha después de `m1-naturales`, porque las pruebas exigen que toda clase esté planificada. Es el único cambio en la planificación.

**Diferencias con lo propuesto:** solo se creó el diseño `escena` (no `gancho` ni `pausa`), porque bastó para las 12 láminas. Los estilos de las figuras siguen en `theme.css`, y `progreso` en `useSlide` todavía no existe: los dos se hacen junto con el paso 4, cuando el video necesite renderizar las figuras.

El umbral de 25 palabras se cumplió en las 12 láminas con poco ajuste (una lámina tenía 29).

**Hecho en el repositorio de videos** (paso 4, rama `piloto-mcm-mcd` de `H:\Videos Profe Pina`):
- La plataforma ofrece `slideFigures` (las figuras de una lámina con sus atributos literales) y los estilos de las figuras pasaron a `packages/interactives/src/figuras.css`, que importan el presentador y el video.
- `estructura.json` trae `formato`, `gancho`, `previos` y, por lámina, `momento` y `figuras`.
- El guion usa `tipo: 'figura'` (la figura de la lámina, dibujada con el mismo componente, con un beat por paso) y `tipo: 'recuerda'`. `guion:check` comprueba las figuras y que las láminas de pausa o predicción tengan su beat.
- En vez de `progreso` en `useSlide`, cada cambio de estado es un fundido entre el estado anterior y el nuevo: no hizo falta tocar las figuras.
- Guion de `m1-mcm-mcd`: 12 escenas, unos **6 min 11 s** con la voz estimada (2,4 palabras por segundo), por debajo de la meta de 8 minutos. Con la decisión 2 se publica así; la duración real depende de la voz grabada.

**Pendiente:** que el docente vea el MP4 completo y decida si el enfoque se generaliza (criterios de arriba). Mientras la rama de la plataforma no esté en `main`, el video necesita `PLATAFORMA_DIR` apuntando a la carpeta de esa rama.

### Los primeros 10 videos (15-10-2026)

El docente aprobó el piloto y pidió las láminas de los primeros 10 videos de §5 antes de hacer ajustes. Están como borradores `formato: video` en `content/lessons/m1/numeros`, planificados sin fecha en `yt-m1.yaml` en el orden de §5, y pasan content:check sin avisos propios:

| # | Clase | Láminas | Figuras y momentos |
|---|---|---|---|
| 1 | `m1-consecutivos-paridad` | 11 | Recta con saltos +1 en el Recuerda; clímax «tres veces el del medio» |
| 2 | `m1-division-resto` | 10 | Puntos en cajas, valor posicional; clímax «el resto decide» |
| 3 | `m1-divisores-multiplos` | 11 | Rectángulos de 12; clímax «por qué funciona la regla del 3» |
| 4 | `m1-primos` | 11 | Criba por pasos (2, 3, 5), árbol de factores; clímax «descomposición única» |
| 5 | `m1-mcm-mcd` | 12 | El piloto |
| 6 | `m1-enteros` | 10 | Rehecha desde cero: termómetro, opuestos y distancias por paso; clímax «orden y distancia no son lo mismo» |
| 7 | `m1-enteros-suma-resta` | 10 | Saltos en la recta; clímax «el mismo salto» |
| 8 | `m1-enteros-signos` | 10 | Suma repetida y tabla; clímax «multiplicar por −1 da el opuesto» |
| 9 | `m1-practica-naturales-enteros` | 10 | Siete preguntas propias (`nat-ent-*` en content/activities) y un paso con error que se resuelve al final |
| 10 | `m1-fracciones` | 11 | `BarraFraccion` nueva: reparto, punto en la recta y equivalencia |

Las figuras sumaron estados por paso (`CribaPrimos`, `RectaEnteros`) y una figura nueva (`BarraFraccion`). La regla de `previos` ahora compara fechas cuando las dos clases las tienen, porque las unidades del canal no se publican en el orden del archivo.

**Videos renderizados (15-10-2026).** Los diez están en `H:\Videos Profe Pina\out` (rama `piloto-mcm-mcd`), sin voz. El motor dibuja ahora las nueve figuras que usan, y los estilos de la recta numérica pasaron también a `figuras.css`. Duración con la voz estimada (2,4 palabras por segundo):

| Video | Duración |
|---|---|
| 1 `m1-consecutivos-paridad` | 4:11 |
| 2 `m1-division-resto` | 3:37 |
| 3 `m1-divisores-multiplos` | 3:45 |
| 4 `m1-primos` | 4:00 |
| 5 `m1-mcm-mcd` | 6:11 |
| 6 `m1-enteros` | 4:04 |
| 7 `m1-enteros-suma-resta` | 3:22 |
| 8 `m1-enteros-signos` | 3:41 |
| 9 `m1-practica-naturales-enteros` | 6:08 |
| 10 `m1-fracciones` | 3:34 |

**Hallazgo para la revisión:** con una idea por video y una narración que acompaña lo que está en pantalla, los videos conceptuales quedan en 3½ a 4 minutos, bajo el mínimo de 5 de la decisión 2 («si da menos de 5, se une con su vecino o se vuelve un Short»). La voz real suele ser más lenta que la estimada, pero no alcanza para llegar a 8. Las salidas posibles se deciden al revisar: unir videos vecinos (por ejemplo, 2 y 3, o 7 y 8), ampliar la narración con un segundo ejemplo o un caso PAES, o aceptar videos cortos con compilaciones por bloque.

**Pendiente:** `m1-naturales` sigue planificada como clase de aula hasta la replanificación; los videos 1–9 la reemplazan. Ya tiene gancho y cierre y probaría `RectaEnteros` con estados y una `Animacion` de Manim (termómetro → recta).

## 7. Decisiones del docente (15-10-2026)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Dónde viven las láminas de video? | **En la plataforma**, como clases con `formato: video`. Se editan desde la app, pasan por content:check, comparten figuras con el aula y alimentan el video sin reescribirse. La narración sigue en el repositorio de videos. |
| 2 | ¿Se mantiene el mínimo de 8 minutos? | **Opción A de §9.3: meta de 8 minutos, sin obligarla, con compilaciones por bloque.** Ningún video se rellena para llegar a 8. |
| 3 | ¿Los videos conceptuales también parten de la plataforma? | **Sí.** Ambos tipos parten de una clase de video de la plataforma (guion gráfico y figuras), con Remotion para la composición y Manim solo para transformaciones continuas. La tabla de formatos de `canal-youtube.md` §4 se actualiza cuando se cierre la revisión en curso de ese archivo. |
| 4 | ¿Cuántos videos en Números y con qué calendario? | **La lista de §5 como dirección, sin fechas.** El calendario se decide con la capacidad medida en el piloto. |
| 5 | ¿Qué pasa con `m1-naturales` y `m1-enteros`? | Delegada; ver abajo. |
| 6 | ¿Quién pone la mascota en video? | **El motor de video, según el momento.** La lámina solo la declara en el gancho o el cierre, si cumple una función. |
| 7 | ¿Cómo se ve un `Recuerda`? | **Un marco** con etiqueta y nombre del video de origen, sin fondo propio. El contenido conserva su color funcional. |
| 8 | ¿Prioridad de las operaciones y lenguaje algebraico se quedan en Álgebra? | **Sí, con la condición de que quede ordenado y planificado** acorde a ese cambio; ver abajo. |
| 9 | ¿Se publica el PDF de una clase de video? | **Se genera siempre como guion gráfico**, pero no se enlaza hasta decidir el material de apoyo. |
| 10 | ¿Interactivos para el estudiante desde la descripción? | **Sí, más adelante.** No es prioridad. |

**Decisión 5 (delegada).** Se empieza desde cero en el formato de video:
- `m1-enteros` **conserva su id** como el primer video de enteros (video 6 de §5), acotado a conjunto, orden y valor absoluto. Sus láminas se rehacen desde cero y las actuales quedan como referencia en el historial de git. Se reutilizan `RectaEnteros` y `ExploradorResta`, ampliadas con estados por paso.
- `m1-naturales` **se retira**. Sus ideas pasan a los videos 1–5 de §5, que se escriben desde cero con las figuras de `FigurasNaturales.tsx`. La carpeta y su entrada en `yt-m1.yaml` se quitan en el paso de replanificación (§8, paso 4), no antes, para no tocar la planificación mientras sigue en revisión. Como es borrador sin fecha ni publicación, retirarla no rompe enlaces.
- El sistema decimal y los naturales frente a los cardinales, que hoy solo están en `m1-naturales`, quedan como 30 s dentro de `m1-division-resto` (video 2) o como Short. No se pierden.
- El piloto `m1-mcm-mcd` se escribe desde cero, sin copiar láminas de `m1-naturales`.

**Condición de la decisión 8.** Para que Números pueda recordar en vez de enseñar, Álgebra tiene que cubrirlo antes y con lo que Números necesita:

| Lo que Números recuerda | Video de Álgebra que lo enseña | Fecha en `yt-m1` (esta rama) | Qué hay que asegurar en su guion |
|---|---|---|---|
| Prioridad de las operaciones | `m1-evaluar-expresiones` | 2026-11-10 | Ya es su tema central; nombrar la regla igual que en Números |
| Sucesor, antecesor, doble, «excede en» | `m1-traducir-expresiones` | 2026-12-15 | El glosario del plan de producción ya incluye «el doble de» y «el sucesor de». Falta agregar antecesor, **consecutivos** (n, n + 1, n + 2) y «excede en», que usa el video 1 de Números |

Ambos se publican antes que Números (marzo de 2027), así que el orden sirve. Si la revisión en curso de `yt-m1.yaml` mueve esas fechas, hay que comprobar que sigan antes de los videos que los recuerdan. Se propone que la regla de `previos` de §4.2 lo compruebe sola: que la clase recordada tenga una fecha anterior, además de un lugar anterior en el orden.

## 8. Orden de trabajo

1. Piloto `m1-mcm-mcd` (§6): plataforma primero, luego el repositorio de videos.
2. Revisión del MP4 por el docente y ajuste de umbrales, incluida la duración real frente a la meta de 8 minutos.
3. Convertir avisos en errores, documentar en `docs/authoring.md` y `docs/visual-language.md` y actualizar `canal-youtube.md` §4, incluida la duración (decisión 2) y las compilaciones por bloque.
4. Rehacer la planificación de Números en `yt-m1.yaml` con lo aprobado: retirar `m1-naturales`, completar el guion de `m1-traducir-expresiones` y agregar las compilaciones por bloque (por ejemplo, «Números enteros» con los videos 6–8). Se hace cuando se cierre la revisión en curso de la planificación.
5. Interactivos para el estudiante desde la descripción (decisión 10), cuando se decida la entrada pública.

## 9. Duración: monetización, pedagogía y planificación

### 9.1 Cómo funciona YouTube, con los datos verificados

- **Anuncios a mitad de video (mid-roll).** Solo se pueden poner en videos de **8 minutos o más**. Ese umbral existe desde 2020 (antes era de 10). YouTube los ubica solo en pausas naturales, o el creador los marca a mano. Un video de 7:59 solo admite anuncios antes y después.
- **No hay anuncios hasta entrar al Programa de Socios (YPP).** Hoy se exigen 1.000 suscriptores y 4.000 horas de visualización públicas en 12 meses, o 10 millones de vistas de Shorts en 90 días. **Desde el 1 de febrero de 2027, los canales nuevos necesitan 8.000 horas en 365 días o 20 millones de vistas de Shorts en 90 días**, además de los 1.000 suscriptores (página oficial «Changes to the YouTube Partner Program»). Los canales que ya están en el programa no se ven afectados. El nivel inicial (500 suscriptores y 3.000 horas o 3 millones de vistas de Shorts), que da acceso a funciones como las membresías pero no a anuncios, no cambia.
- **Consecuencia para este canal.** El piloto parte en noviembre de 2026, y es muy improbable reunir 4.000 horas antes del 31 de enero de 2027. En la práctica, el canal tendrá que llegar a **8.000 horas**. Hasta entonces **ningún video genera ingresos por anuncios, dure lo que dure**. Durante el primer año, lo que importa no es cuántos anuncios caben en un video, sino **cuántas horas de visualización y suscriptores reúne el canal**.
- **Las horas de Shorts no suman a esas horas.** Según las reglas vigentes, cuentan las horas de videos largos y los Shorts tienen su propio camino, por vistas. Conviene confirmarlo en YouTube Studio cuando el canal esté creado.
- **El algoritmo no premia la duración en sí.** Recomienda lo que la gente mira y la deja satisfecha: retención (qué porcentaje del video se ve), clics en la miniatura y si después sigue mirando el canal. Un video de 6 minutos visto al 70 % le va mejor que uno de 12 visto al 30 %.
- **La búsqueda premia la precisión.** Un estudiante busca «por qué menos por menos es más», no «números enteros, clase completa». Cada video autocontenido con una pregunta en el título es una puerta de entrada más desde la búsqueda.
- **Capítulos.** YouTube los muestra con al menos tres marcas de tiempo desde 0:00. Sirven en cualquier duración y son clave en las prácticas y las compilaciones.
- **Ingresos después de entrar al programa.** Con anuncios a mitad de video, una vista vale más. Cuánto más depende del público, del país y de la retención: no tengo una cifra confiable, y las que circulan en guías no son oficiales. Lo seguro es que **un anuncio a mitad de video mal ubicado baja la retención**, y la retención es la que trae vistas.

### 9.2 Las duraciones posibles

| Duración | YouTube | Pedagogía | Planificación |
|---|---|---|---|
| **≤ 3 min (Short)** | Descubrimiento; camino propio al programa (20 M de vistas desde 2027, difícil para un canal educativo de nicho); no suma horas | Sirve para un error con nombre o un dato; no para construir una idea con gancho y clímax | Barato si se recorta de un video largo; ya está previsto como derivado |
| **4–7 min** | Sin anuncios a mitad de video; buena retención; muchas puertas de entrada desde la búsqueda; pocas horas por vista | Lo más cercano a lo que mantiene la atención: en un estudio de 6,9 millones de sesiones de edX (Guo, Kim y Rubin, 2014), el interés caía con fuerza pasados unos 6 minutos. Una idea por video. Pero el marco de un video autocontenido (gancho, recuerdo, pausa, cierre ≈ 2 min) ocupa un tercio del tiempo | Más videos para el mismo temario (unos 27 en Números) y más costo fijo por video: miniatura, título, descripción, capítulos, subida y render |
| **8–10 min** | Habilita 1 o 2 anuncios a mitad de video; más horas por vista; la retención sigue siendo alcanzable | Cabe una idea con su marco completo, que ocupa un quinto. El riesgo es **rellenar** para llegar a 8, que se nota y baja la retención | Unos 20–24 videos en Números; es lo que suponía el plan del canal |
| **11–15 min** | Varios anuncios a mitad de video; más horas por vista; retención más difícil | Suele traer dos ideas y dos clímax, lo que contradice la regla de un video por pregunta. Es razonable para las **prácticas**, donde cada pregunta es un capítulo | Menos videos, pero cada uno más caro de revisar y de corregir |
| **20–40 min (compilación)** | Varios anuncios; muchas horas por vista; búsquedas tipo «enteros completo» en época de repaso | El estudiante elige la parte por capítulos; sirve para repasar, no para aprender por primera vez | Casi gratis: es un montaje de videos ya publicados. Ya está previsto en `canal-youtube.md` §4 |

**La idea central:** la duración de cada video no tiene que resolver a la vez la pedagogía y la monetización. Los videos conceptuales cortos y autocontenidos sirven al aprendizaje y a la búsqueda. Las **compilaciones por bloque** (por ejemplo, «Números enteros» con los videos 6–8, ≈ 25 min) juntan horas de visualización y llevan anuncios a mitad de video sin rellenar ningún video.

### 9.3 Opciones y recomendación

- **A. Meta de 8 minutos, sin obligarla (elegida por el docente).** Cada video se diseña con una idea y su marco completo, y llega a 7–10 min en forma natural. Si una idea da 5–7 min y unirla con su vecina rompería la regla de un clímax, se publica así. Las compilaciones por bloque aportan las horas y los anuncios a mitad de video. Números quedaría en unos 24–27 videos.
- **B. Mínimo estricto de 8 minutos.** Todos los videos admiten anuncios a mitad de video cuando el canal entre al programa. Obliga a juntar ideas (Números bajaría a unos 18–20 videos, con dos clímax en varios) o a alargar. Pierde parte del criterio «una pregunta, un video».
- **C. Libre entre 4 y 10 minutos.** Lo más fiel a la pedagogía y a la búsqueda. Más videos y más costo fijo, y la mayoría no admitiría anuncios a mitad de video.

Con cualquiera de las tres, el piloto `m1-mcm-mcd` mide dos cosas que hoy son estimaciones: cuánto dura de verdad un video autocontenido de una idea y cuántas horas de producción cuesta.

**Fuentes:** [YouTube Help: Changes to the YouTube Partner Program](https://support.google.com/youtube/answer/12843009?hl=en) · [Tubefilter: umbral de 10 a 8 minutos (2020)](https://www.tubefilter.com/2020/07/07/youtube-lowering-minimum-video-length-mid-roll-ads/) · [Guo, Kim y Rubin (2014), How video production affects student engagement](https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf).
