# Arquitectura y decisiones

Aplicación Vite/React en apps/presenter; contratos Zod en packages/content-model; componentes pedagógicos en packages/pedagogical-ui; SVG y matemática pura en packages/interactives. npm workspaces resuelve imports entre paquetes sin publicar a npm.

La fuente de verdad es lesson.yaml y su lista explícita de archivos MDX. Vite compila MDX durante build usando remark y KaTeX. No hay intérprete de MDX en producción ni backend. El catálogo excluye borradores en producción.

Context + reducer conserva pasos y valores por diapositiva durante una sesión. La URL contiene clase y slide; recargar restaura ubicación, no respuestas. El modo pdf crea un contexto de impresión para cada diapositiva, revela todo y reemplaza interacción por parámetros estáticos. Componentes compartidos no dependen de Vite ni de la aplicación.

SVG representa la intersección; solveLinearSystem y satisfiesLinearEquation (un único módulo, packages/interactives/src/linear-system.ts) prueban los casos algebraicos y también verifican las actividades en content:check. Una tolerancia de 1e-10 evita dividir por determinantes numéricamente nulos. No se pretende un solucionador simbólico general.

El lienzo 1600×900 mantiene proporción y usa estilos centralizados. Toda revelación reserva espacio para evitar saltos. Los autores deben comprobar tanto el estado oculto como el final. El menú no se imprime. El tema claro se conserva en PDF.

Cada dependencia queda fijada en package-lock.json; usar npm ci en integración continua. Mantener Node 24.15.0 como referencia reproducible. Documentar las actualizaciones de versiones y volver a ejecutar los recorridos críticos.

La gramática visual está documentada en docs/visual-language.md. Los componentes compartidos reciben el catálogo de plantillas por SlideContext, sin importar la aplicación. Composicion reserva espacio a la mascota en el flujo; el catálogo de content es la fuente de sus poses, funciones y ejemplos MDX descargables. content:check compila tanto clases como plantillas.
