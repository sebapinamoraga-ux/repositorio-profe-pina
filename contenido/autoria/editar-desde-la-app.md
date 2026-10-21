# Editar desde la app

Manual para el docente. Todo lo que describen estos manuales de autoría también se edita desde la app (rol Docente), en cualquier dispositivo, y queda guardado en el repositorio. La primera vez en cada dispositivo, conecta la app en **Ajustes**:

1. En GitHub abre *Settings → Developer settings → Fine-grained personal access tokens → Generate new token*.
2. Ponle un nombre (por ejemplo «Aula · tablet») y una fecha de vencimiento.
3. En *Repository access* elige *Only select repositories* y marca solo este repositorio.
4. En *Repository permissions* da **Contents: Read and write**. Opcional: **Actions: Read-only**, para ver en la app si la publicación terminó.
5. Copia el token y pégalo en Ajustes. Si pierdes el dispositivo, revócalo en GitHub.

Sin conexión la app muestra el contenido publicado y no permite editar.

- **Clases**: arriba, la clase actual según las fechas de la planificación (la de hoy; si no hay, la próxima; sin fechas por delante, la última abierta) y, debajo, unidades, orden y clases planificadas (el `curso.yaml` de cada carpeta de curso); preparar una clase desde la estructura base o desde otra clase; duplicar y eliminar. La marca «Lista / En preparación» también se guarda en la planificación; «Por preparar» significa que la clase aún no tiene clase.yaml. Las clases del repositorio que la planificación no ubica aparecen en «Sin unidad». Cada clase planificada puede llevar `date: AAAA-MM-DD`, el día en que se hace según el calendario (⋯ → «Editar título, objetivo y fecha»); content:check exige fechas reales y una sola clase por día. Una biblioteca con `calendario: publicacion` (el canal de YouTube; Organizar → «Fechas de publicación») guarda fechas de publicación: no deciden la clase del día. Fuera del año en curso, la fecha corta lleva el año.
- **Datos de la clase** (Clases → ⋯, o en el encabezado de la clase): título, asignatura, eje, duración, objetivos, conocimientos previos, habilidades, referencias curriculares, tramos y estado. Pasar a «Publicada» pide confirmación: al guardar, la clase aparece en el sitio público.
- **Láminas y Repaso** (pestañas de la clase): láminas (título, momento, diseño, pasos, identificador, orden), el texto de cada bloque y los parámetros de interactivos, preguntas PAES y mascota como formulario. El MDX completo queda en «MDX de la lámina» para lo que el formulario no cubre.
- **Revisión** (pestaña de la clase): lo que content:check encontró en la clase y su repaso, y los comentarios para mejorarla, cada uno con un enlace a su lámina.
- **Actividades y PAES**: el banco completo (la pestaña Actividades de cada clase muestra solo las suyas, con enlaces a sus láminas): enunciado, alternativas con la correcta y sus explicaciones, respuesta, solución, habilidades, fuente y el sistema 2×2 que comprueba las alternativas. Cada actividad se comprueba antes de aplicarse.

Cada cambio queda pendiente en ese navegador (la barra superior los cuenta) hasta pulsar **Guardar en el repositorio**. Guardar revisa todo con las reglas de content:check —si algo falla, no se guarda y se indica qué— y crea un único commit en `main`. GitHub Actions vuelve a verificar y publica en unos minutos; si la verificación falla, el sitio sigue con la versión anterior y la barra lo avisa. Si otro dispositivo cambió los mismos archivos, la app muestra las diferencias y pregunta qué versión conservar. Sin red, el guardado espera y se envía al reconectar. «Copia ZIP» descarga la carpeta de la clase (clase.yaml, guia.md, laminas/ y sus actividades) como respaldo; no hace falta para publicar.
