# Reunión con la community manager

Material para la reunión: un formulario de diagnóstico que se le manda antes, una
chuleta para la propia reunión, y la criba de fotos que se enseña como demo.

## Qué hay aquí

| Carpeta | Qué es | Para quién |
|---|---|---|
| `guia/` | Qué es cada cosa y qué hacer con ella, explicado sin jerga. | Empieza por aquí |
| `formulario/` | La página que ella rellena. Dos versiones: enlace publicado y archivo suelto. | Ella |
| `playbook/` | Guion, frases literales, cómo grabar, qué demo enseñar. | Sólo Eduardo |
| `criba/` | La criba mecánica de fotos. Es la segunda demo y el entregable del jueves. | Herramienta |
| `investigacion/` | Los borradores en bruto y la crítica adversarial. | Referencia |

## Enlaces publicados

- **Guía** (empieza por aquí): <https://claude.ai/code/artifact/e7d881cc-08e2-4df9-bc32-a804337f61cc>
- **Formulario** (esto es lo que se le manda): <https://claude.ai/code/artifact/750d0d95-1359-4fd9-abed-ceba9d6bc280>
- **Chuleta de la reunión** (uso interno): <https://claude.ai/code/artifact/8a014d20-a158-4a02-ba47-203107ff96be>

El formulario tiene además una versión como **archivo suelto**,
`formulario/formulario-suelto.html`, para mandarla adjunta si el enlace le da
problemas: mismas preguntas, pero al terminar abre WhatsApp con las respuestas ya
escritas en vez de enviarlas. Se regenera desde `index.html` con
`python3 formulario/construir-suelto.py`, para que las dos no se separen nunca.

> El formulario nace **privado**. Para que ella pueda abrirlo hay que compartirlo
> desde el menú de compartir de la propia página. Y conviene abrirlo antes desde
> el móvil en incógnito y darle a «Enviar» con dos respuestas puestas, para saber
> por qué vía van a llegar: envío directo o «copia y pégamelo por WhatsApp».

## Advertencia sobre los datos

Ningún precio ni límite de plan de ninguna herramienta (Canva, Metricool,
transcriptores) está verificado: el proxy bloqueaba las páginas oficiales durante
la investigación. **Regla: no se dice ninguna cifra de precio en voz alta.**
Lo que aparezca en `investigacion/` es borrador sin depurar, no material para usar
tal cual.

## Qué se corrigió antes de publicar

La primera versión pasó por una crítica adversarial y salieron cosas serias:

- La pregunta más importante del formulario (las tres tareas que más tiempo comen)
  estaba como casillas sin tope: se podían marcar las doce. Ahora es un ranking de
  tres por toque, que además guarda el orden.
- «¿Cómo cobras?» estaba planificada para el minuto 22 de la reunión, pero cambia
  el encuadre entero: si cobra por horas, ahorrarle tiempo es quitarle ingresos.
  Se movió al formulario para saberlo la noche antes.
- El playbook mandaba decir en voz alta que conectar Canva a una hoja «requiere el
  plan de empresa», y se contradecía a sí mismo tres páginas después. Se sustituyó
  por una distinción que sí es cierta: subir una hoja y que genere las piezas no es
  lo mismo que quedar conectado y actualizarse solo.
- El playbook mandaba decir que en los planes de pago no se usan los datos para
  entrenar. Eso no es cierto como regla general, y ella se lo habría repetido a sus
  clientes. Se sustituyó por un compromiso verificable.
- El compromiso de cierre («mándame la carpeta y el jueves te devuelvo la criba»)
  no tenía tope ni herramienta detrás. Ahora tiene las dos: hasta 200 fotos, y la
  criba está en `criba/`.
