# Componentes y actividades

Catálogo de las figuras, los interactivos y las preguntas que una lámina puede usar. Los parámetros obligatorios, sus rangos y las etiquetas del formulario del editor están en `plataforma/packages/content-model/src/interactive-params.ts`; si este catálogo y esa ficha difieren, vale la ficha.

## Bloques con datos propios

Teorema recibe hipotesis y conclusion como texto. Formula recibe tex para notación dinámica. GraficoSistema recibe sumaInicial y sumaEstatica; usa un rango de 3 a 9 y la segunda ecuación x−y=1. El control conserva su estado al salir de la diapositiva y permite restablecerlo.

## Preguntas PAES y actividades

PreguntaPAES recibe id y paso. Declara el ID también en activities del frontmatter y crea su YAML en `actividades/` de la clase (o en `comun/actividades/` si la usan varias clases) con enunciado, respuesta, solución, habilidades, procedencia y alternativas con explicación. Solo usa fuente oficial cuando exista una referencia verificable. El PDF siempre revela la respuesta y explicación global.

Si la pregunta se resuelve con un sistema 2×2, declara en el YAML `model.equations` (dos ecuaciones `[a, b, c]` de ax + by = c, en las unidades del enunciado) y el `pair: [x, y]` de cada alternativa. `content:check` resuelve el sistema y exige que la alternativa correcta sea su solución única y que ningún distractor la cumpla; también que las alternativas no repitan pares, que su texto muestre los valores del par, que la solución escrita mencione la solución real y que la respuesta comience con la letra correcta. Con `model`, todas las alternativas deben llevar `pair`, y un `pair` sin `model` se rechaza.

## Gráficos de rectas y funciones

`GraficoRectas` representa dos ecuaciones generales a partir de sus coeficientes, con una ventana del primer cuadrante y una descripción accesible. Es estático y distingue la segunda recta con trazo discontinuo para hacer visible la coincidencia. Los sistemas específicos se declaran exclusivamente en el contenido.

`GraficoFuncion` dibuja una sola curva estática en una ventana con los cuatro cuadrantes. Recibe `tipo` (`afin` con `m` y `n`; `cuadratica` con `a`, `b` y `c`; `circunferencia` con `h`, `k` y `r`), los límites `xMin`, `xMax`, `yMin` e `yMax`, una `etiqueta` y una `descripcion`. Opcionalmente, `paso` (grilla, 1 por defecto), `puntosX` (marca y rotula los puntos de la tabla) y `rectaVertical` (recta discontinua y sus cortes; `etiquetaRecta` cambia su rótulo, por ejemplo «eje de simetría: x = 0») y `rectasHorizontales` (rectas discontinuas en esas alturas, para comparar imágenes; `pasoHorizontales` las muestra desde ese paso). La circunferencia usa la misma escala en ambos ejes; las funciones ocupan todo el lienzo. Para funciones afines también acepta `pasoY` (grilla vertical propia), `ejeX` y `ejeY` (nombres de los ejes), `marcarCorteY` (punto (0, n) rotulado) y `pendienteEn` (triángulo +1 en x, +m en y desde ese valor). La matemática vive en `plataforma/packages/interactives/src/function-graph.ts` y content:check exige los coeficientes del tipo elegido.

`GraficoComparacion` dibuja dos funciones afines en un mismo plano (`m1`, `n1`, `m2`, `n2`, ventana, `pasoX`, `pasoY`, `ejeX`, `ejeY`, `etiqueta1`, `etiqueta2`, `descripcion`). Marca su intersección, que es la solución del sistema, con guías hacia los ejes; con `resaltarMenor` pinta sobre el eje x el tramo en que cada función toma el menor valor. `marcarInterseccion={false}` oculta el punto y `rotularInterseccion={false}` lo muestra sin sus coordenadas, para estimarlo antes de resolver el sistema.

`ExploradorCuadratica` es interactivo: dibuja $y=ax^2+bx+c$ con controles para `a` y `c`; `b` queda fijo salvo con `variarB`, que agrega su control (entonces `b` es el valor inicial, `bEstatico` el del PDF y `bMin`, `bMax` y `bPaso` su rango). `marcarVertice` marca y rotula el vértice. Recibe `id` (clave de estado), `b`, `aInicial` (distinto de 0), `cInicial`, `aEstatico` y `cEstatico` (los valores del PDF), la ventana y `descripcion`; opcionalmente `aMin`, `aMax`, `aPaso`, `cMin`, `cMax`, `cPaso`, `paso` y `pasoY`. La curva inicial queda discontinua como referencia cuando cambian los parámetros, el corte $(0; c)$ se marca y «Restablecer» vuelve a los valores iniciales. Con `a = 0` dibuja la recta y lo advierte en la leyenda.

`MaquinaFuncion` muestra una función como máquina: `entrada`, `regla` y `salida` (textos breves) y `descripcion`.

`DiagramaSagital` dibuja dos conjuntos (`entradas`, `salidas`, `tituloEntradas`, `tituloSalidas`) unidos por `flechas` escritas como `'3 → 9'`, con hasta seis elementos por conjunto. Las entradas sin imagen o con más de una se destacan en ocre junto con sus flechas, y las salidas que nadie alcanza quedan atenuadas: así se ven a la vez el dominio, el recorrido y por qué una relación no es función. content:check exige todos sus atributos y el componente rechaza flechas hacia elementos que no existen.

## Rectas numéricas

`RectaIntervalos` representa uno o dos intervalos en una recta numérica (`min`, `max`, `paso`, `intervalos`, `etiquetas`, `descripcion`). Los intervalos se escriben en notación escolar con punto y coma entre extremos para no confundirlos con la coma decimal: `intervalos={['[0; 7,5[', ']7,5; +∞[']}`. `tonos` elige el color de cada intervalo (1 o 2) para mantener la correspondencia con otros gráficos. Un extremo cerrado se dibuja con círculo lleno, uno abierto con círculo vacío y el infinito con flecha; un extremo infinito cerrado se rechaza.

`RectaEnteros` dibuja una recta de enteros entre `min` y `max` (enteros; con más de 24 unidades rotula cada 5). Marca `puntos` con su rótulo opcional (`rotulos`), dibuja `saltos` sucesivos desde `desde` como arcos con flecha, acota la distancia al cero de cada valor de `distancias` (con su rótulo |a|) y une cada valor de `opuestos` con su opuesto. Positivos en azul y negativos en ocre, siempre. Un valor fuera de la recta se rechaza. `ExploradorResta` dibuja la resta a − b como el salto −b desde a, con sus dos lecturas (a − b y a + (−b)); tiene controles para a y b, «Restablecer» y valores impresos (`aEstatico`, `bEstatico`).

## Figuras de los números naturales

Los números van en el contenido y se validan; tres de ellas cambian de estado por paso (ver más abajo): `ValorPosicional` (`numero`) muestra cada cifra como billetes o monedas de su posición; `GruposPuntos` (`total`, `grupo`) agrupa puntos y deja el resto en ocre, con la igualdad D = d · q + r; `RectangulosDivisores` (`n`) dibuja todos los rectángulos de n cuadrados, cuyos lados son los divisores; `CribaPrimos` (`max`, `columnas`, `marcar`) destaca los primos hasta `max` y marca en ocre los números de `marcar`; `ArbolFactores` (`n`) separa en cada nivel el menor primo; `LineasMultiplos` (`numeros`, `hasta`, `rotulos`) une con una guía los múltiplos comunes, y `BarrasDivision` (`longitudes`, `trozo`, `unidad`) corta cada barra en trozos iguales y rechaza un trozo que no divida a todas.

Estados por paso de esas figuras (opcionales; el PDF muestra siempre el último estado): en `LineasMultiplos`, `pasosNumeros` da el paso en que aparece cada recta (uno por número) y `pasoComunes` el paso en que se destacan los múltiplos comunes; en `ArbolFactores`, `pasoArbol` hace crecer las ramas y `pasoEscritura` muestra n con potencias; en `BarrasDivision`, `intentos` son trozos que se prueban antes del final, cada uno en su paso (`pasosIntentos`), y pueden no dividir a todas: lo que sobra queda en ocre. Con intentos, `pasoTrozo` (el paso del trozo final) es obligatorio, y los pasos deben crecer.

`CribaPrimos` también admite la criba de Eratóstenes: `criba` son los primos cuyos múltiplos se tachan (sin tachar el primo), cada uno en su paso (`pasosCriba`), y `pasoPrimos` es el paso en que se destacan los primos. `RectaEnteros` acepta `pasosSaltos`, `pasosDistancias` y `pasosOpuestos` (un paso por elemento); un salto que aún no aparece tampoco marca su punto de llegada.

## Fracciones

`BarraFraccion` muestra una fracción como partes de barras iguales: `barras` (1 por defecto, hasta 6), `partes`, `tomadas` (en azul; con `porBarra`, esa cantidad en cada barra, como un reparto), `subdividir` (parte cada parte en k, para una fracción equivalente) y `recta` (con una sola barra, el punto en la recta de 0 a 1). Sus pasos son `pasoTomadas`, `pasoSubdividir` y `pasoRecta`. La lógica está en `packages/interactives/src/fractions.ts`.

## Agregar un interactivo nuevo

Un interactivo nuevo necesita, además del componente, su ficha en `plataforma/packages/content-model/src/interactive-params.ts` (parámetros, tipo y obligatorios): el formulario del editor y content:check la usan, así que lo que el formulario permite siempre compila. Debe tener parámetros iniciales, reinicio y una representación estática determinista para el PDF ([reglas de la plataforma](../../plataforma/AGENTS.md)).
