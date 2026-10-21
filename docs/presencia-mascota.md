# Presencia de Profe Piña

> Estado: vigente · Ámbito: clases de aula y de video, y galería de plantillas · Autoridad: el docente. Es la fuente única de las reglas de uso de la mascota.

La mascota tiene tres niveles de presencia. **Sutil** ambienta y acompaña; **pedagógica** dirige la atención o apoya una decisión; **marca** forma parte de la identidad principal de la composición. El contenido y la secuencia didáctica siempre conservan la mayor jerarquía.

## Reglas de uso

- Una sola mascota por diapositiva, incluida la que incorpora `Composicion`; no añadir otra `MascotaProfePina` dentro de esa composición. Mantener láminas sin mascota cuando eso dé más espacio al contenido.
- Preferir `Composicion plantilla="identificador"` con una plantilla de la galería. `MascotaProfePina` directa queda para composiciones existentes con espacio verificado.
- La mascota no cubre fórmulas, ejes, datos, alternativas, instrucciones ni controles.
- Su descripción alternativa (`alt`) explica la función que cumple, no solo su apariencia.
- Los niveles y poses autorizados están en `mascotPosesByPresence` (`plataforma/packages/content-model/src/index.ts`); `content:check` rechaza una pose no autorizada para su nivel o sin imagen versionada.
- El color nunca es la única señal; títulos, etiquetas y formas mantienen el significado. El color corresponde a la función del bloque, no al nivel ni a la pose ([Lenguaje visual](lenguaje-visual.md)).
- Si la mascota entrega una pista, aparece en el momento pedagógico correspondiente y no revela la respuesta completa. Las plantillas de práctica no muestran resultados anticipados.
- En PDF se conserva la misma composición estática, con todos los pasos revelados.
- En las clases de video, la mascota va solo en el gancho y el cierre (`content:check` avisa).
- Cada incorporación al catálogo resuelve una necesidad docente distinta. No se crea una variante solo por cambiar la pose o el color.

## Galería y plantillas

El catálogo y el contenido de ejemplo de cada plantilla, con su función semántica, viven en `contenido/comun/galeria/plantillas-mascota.json`. Hoy tiene 17 plantillas: seis sutiles, ocho pedagógicas y tres de marca; cubre portada, transición, cierre, activación, definición, repaso, práctica individual, hito, metacognición, consigna, concepto clave, comprobación, comparación, modelado, error, gráfico y pista.

La galería filtra por nivel y momento y ofrece un archivo MDX por plantilla. El archivo descargado usa los mismos bloques y `Composicion` que las clases. `content:check` compila las plantillas y rechaza referencias inexistentes y duplicación de mascotas.

La previsualización de la galería es esquemática; el archivo incorpora contenido editable, no una captura. Adapta los textos, conserva el ID de plantilla y revisa la diapositiva con todos sus pasos revelados. El filtro puede no tener coincidencias; se puede cambiar sin perder acceso a los controles.

Para usar una pose nueva (imagen versionada, autorización por nivel), ver [Recursos de Profe Piña](../contenido/comun/mascotas/README.md). Para las composiciones de modelación, métodos, operación vertical, práctica y comparación, ver [Lenguaje visual](lenguaje-visual.md).

## Metas de crecimiento

Son metas orientativas, no obligaciones. Prima la necesidad de enseñanza observada sobre la cifra del catálogo.

1. **Base operativa — 17 plantillas.** Validar los tres niveles en los momentos esenciales de una clase y documentar su uso en MDX.
2. **Cobertura curricular — 36 plantillas.** Añadir variaciones para ecuaciones, geometría, datos, mecánica, electricidad y laboratorio; incluir composiciones para contenido breve y denso.
3. **Biblioteca consolidada — 60 plantillas.** Cubrir diez arquetipos docentes con dos variantes por nivel: inicio, activación, explicación, representación, modelado, práctica guiada, práctica individual, error, evaluación y cierre.
4. **Galería madura — 72 a 90 plantillas.** Incorporar alternativas de orientación, densidad, interacción y accesibilidad sin multiplicar patrones que cumplan la misma función.
