# Etapas posteriores

## Etapa 2 · Desde enero de 2027

Esta etapa comienza después de diciembre de 2026. Hasta entonces, el hito actual no incorpora cuentas, almacenamiento remoto ni dependencias de Firebase.

### Cursos e historial docente

- Incorporar cursos persistentes con tres campos: nombre, nivel y observaciones.
- Sincronizar los cursos automáticamente entre los dispositivos del docente mediante Firebase.
- Exigir autenticación y restringir el acceso a una única cuenta docente autorizada durante el primer incremento.
- Permitir seleccionar un curso al iniciar una clase sin duplicar el contenido de la lección.
- Registrar por cada sesión el curso, la clase, la fecha, la hora de inicio, la hora de término y una observación posterior del docente.
- Mantener los perfiles y el historial fuera del contenido público, del PDF y del repositorio.

El diseño de datos debe admitir más docentes en el futuro sin abrir el acceso en este hito. La configuración de Firebase, las reglas de seguridad y las credenciales se implementarán y probarán como parte de esta etapa, no antes.

### Participación anónima en clase

Después de establecer cursos e historial, permitir que una pregunta de alternativas abra una sesión de participación y muestre un código QR. Cada estudiante podrá enviar de forma anónima una alternativa desde su dispositivo. La vista del docente mostrará conteos y porcentajes actualizados en tiempo real y asociará el resumen a la sesión de clase.

No se almacenará la identidad del estudiante. Antes de implementar esta función se deberán definir prevención de respuestas duplicadas, cierre y reapertura de votaciones, retención de datos, funcionamiento ante conectividad inestable y reglas de seguridad. El PDF conservará una representación estática y no incluirá controles de participación.

### Aplicación de aprendizaje

Agregar apps/learning con Astro, MDX y React. Adaptar Sistemas a lectura móvil con explicaciones autocontenidas, pistas y práctica. Compartir actividades y modelos, no copiar la secuencia de proyección. El contenido de aprendizaje seguirá siendo de acceso abierto y no requerirá cuenta. Después, construir el mapa de Álgebra y Funciones de M1.

## Etapa 3

Banco de actividades, dificultad, distractores y generación reproducible; más gráficos y simulaciones según las clases. Física tendrá taxonomía científica propia: Observar y plantear preguntas, Planificar y conducir una investigación, Procesar y analizar evidencia, Evaluar y Comunicar. M2 amplía contenidos de M1 sin mezclar niveles.

No se crean carpetas vacías ni servicios para estas etapas. La planificación detallada se definirá después de medir autoría y uso en aula, respetando que la etapa 2 no comience antes de enero de 2027.
