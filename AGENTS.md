# Reglas del proyecto

Objetivo actual: motor docente y clase M1 Sistemas 2×2, 80 minutos, énfasis en reducción.

- Leer README y docs/architecture.md antes de cambiar la estructura.
- TypeScript estricto; no any, ts-ignore, eval ni conversiones que oculten errores.
- El contenido vive en content; el motor no debe contener ejercicios específicos.
- Conservar IDs estables, autoría española y ecuaciones verificadas en ambos miembros.
- Paquetes compartidos no importan aplicaciones. Matemática pura fuera de React.
- Interactivos con parámetros iniciales, reinicio y representación estática determinista.
- PDF: exactamente una página por diapositiva, todo revelado, sin notas ni controles.
- Evitar recortes y scroll dentro del lienzo. Dividir contenido antes de reducir tipografía.
- Ejecutar content:check, typecheck, lint, test, build y test:e2e antes de entregar.
- Revisar visualmente diapositivas y PDF después de cambios de composición.
- No publicar borradores: dist solo contiene clases published (dist:check lo verifica) y el PDF de borradores se compila en output/pdf-site. Conservar archive y atribución del prototipo.
- No introducir dependencias o backend sin una necesidad del hito.
- No afirmar ensayo en proyector ni revisión docente si no se han realizado.

- Aplicar docs/visual-language.md a toda clase y plantilla: definiciones formales azules, objetivos violetas, procedimientos piedra, práctica y errores ocres, comprobaciones verdes y reflexión rosa.
- Reservar los tonos de asociación para referentes locales: solo fondo, correspondencia estable y sin cambiar tipografía, borde ni subrayado.
- Preferir Composicion con un ID de la galería para reservar espacio a la mascota; mantener una por lámina y validar las plantillas descargables.
