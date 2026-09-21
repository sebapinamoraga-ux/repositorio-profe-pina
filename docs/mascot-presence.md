# Presencia de Profe Piña

La mascota tiene tres niveles de presencia. **Sutil** ambienta y acompaña; **pedagógica** dirige la atención o apoya una decisión; **marca** forma parte de la identidad principal de la composición. El contenido y la secuencia didáctica siempre conservan la mayor jerarquía.

La galería inicial contiene 18 plantillas: siete sutiles, ocho pedagógicas y tres de marca. Cubre portada, transición, cierre, activación, definición, repaso, práctica individual, ticket de salida, hito, metacognición, consigna, concepto clave, comprobación, comparación, modelado, error, gráfico y pista.

## Plan de crecimiento

1. **Base operativa — 18 plantillas.** Validar los tres niveles en los momentos esenciales de una clase y documentar su uso en MDX.
2. **Cobertura curricular — 36 plantillas.** Añadir variaciones para ecuaciones, geometría, datos, mecánica, electricidad y laboratorio; incluir composiciones para contenido breve y denso.
3. **Biblioteca consolidada — 60 plantillas.** Cubrir diez arquetipos docentes con dos variantes por nivel: inicio, activación, explicación, representación, modelado, práctica guiada, práctica individual, error, evaluación y cierre.
4. **Galería madura — 72 a 90 plantillas.** Incorporar alternativas de orientación, densidad, interacción y accesibilidad sin multiplicar patrones que cumplan la misma función.

Cada incorporación debe resolver una necesidad docente distinta. No se crea una variante solo por cambiar la pose o el color.

## Criterios

- Una sola mascota por diapositiva.
- La mascota no cubre fórmulas, ejes, datos, alternativas, instrucciones ni controles.
- Su descripción alternativa explica la función que cumple.
- El color nunca es la única señal; títulos, etiquetas y formas mantienen el significado.
- En PDF se conserva la misma composición estática, con todos los pasos revelados.
- Si la mascota entrega una pista, esa ayuda debe aparecer en el momento pedagógico correspondiente y no revelar la respuesta completa.

## Incorporación operativa · versión 2

La galería filtra por nivel y momento; ofrece un archivo MDX por plantilla. El contenido de ejemplo y su función semántica viven en content/galleries/mascot-presence.json. El archivo descargado utiliza los mismos bloques y Composicion que las clases. content:check compila las 18 plantillas y rechaza referencias inexistentes y duplicación de mascotas.

La previsualización de galería es esquemática; el archivo incorpora contenido editable, no una captura. Adapta los textos, conserva el ID de plantilla y revisa la diapositiva con todos sus pasos revelados. Las plantillas de práctica no muestran resultados anticipados. El filtro puede no tener coincidencias; se puede cambiar sin perder acceso a los controles.

El color corresponde a la función del bloque, no al nivel ni a la pose: solo la definición formal es azul. Consulta [Lenguaje visual](visual-language.md) para las composiciones de modelación, métodos, operación vertical, práctica y comparación.
