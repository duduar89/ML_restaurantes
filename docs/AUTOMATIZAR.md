# Que los pagos con tarjeta se apunten solos (Android)

Esto es para no tener que teclear nada cuando pagas con el móvil o con la
tarjeta. El efectivo seguirá siendo a mano: de eso no avisa nadie.

## Lo que hace falta entender antes de empezar

Caudal **no ve el pago**. Nada que no sea el chip seguro del teléfono lo ve.
Lo que sí existe es el **aviso que te manda el banco** un segundo después, y eso
sí lo puede leer una automatización del propio móvil.

Así que la cadena es esta:

```
Acercas el móvil  →  el banco te manda un aviso  →  MacroDroid lo lee
                  →  abre Caudal con el texto    →  Caudal apunta el gasto
```

Si tu banco no te avisa de los pagos, no hay nada que automatizar: actívalo
primero en su app (suele estar en *Ajustes › Notificaciones › Compras con
tarjeta*). Y si un mes se te escapa algo, el extracto en **Norma 43** desde
Ajustes lo cubre todo, incluido lo que no avisó.

---

## 1. Instala Caudal antes que nada

Abre `https://caudal.brainstormersagency.es` en **Chrome** y añádela a la
pantalla de inicio (menú de los tres puntos › *Instalar aplicación*).

Hazlo antes de montar la macro, y hazlo en Chrome. La automatización abre una
dirección web, y esa dirección tiene que caer en el mismo sitio donde viven tus
datos. Instalada desde Chrome, la app y el navegador comparten almacenamiento:
da igual dónde se abra el enlace, el gasto acaba en la misma base. Si la
instalas desde otro navegador y la macro abre Chrome, tendrías dos Caudales
distintos sin nada dentro el uno del otro.

## 2. Instala MacroDroid

Está en Google Play. La versión gratuita permite cinco macros; aquí sólo hace
falta una.

Al crear la macro te pedirá **acceso a las notificaciones**. Es obligatorio: sin
ese permiso no puede leer el aviso del banco. Ese permiso le deja ver *todas*
las notificaciones del teléfono, así que merece la pena saber lo que se
concede — y por eso el paso siguiente limita la macro a una sola aplicación.

## 3. La macro, paso a paso

**Macros › + (abajo a la derecha)**

### Disparador

1. **Añadir disparador** → *Dispositivo/Aplicaciones* → **Notificación** →
   **Notificación recibida**.
2. En *Aplicaciones*, marca **sólo la app de tu banco**. Si pagas con Google
   Wallet, marca también **Cartera/Wallet**.

   No marques «todas»: no hay razón para que la macro vea los mensajes de nadie
   más, y además cualquier notificación con un número acabaría apuntada como
   gasto.
3. Deja el filtro de texto vacío de momento. En el paso 5 verás si hace falta.

### Acción

1. **Añadir acción** → *Aplicaciones* → **Abrir sitio web**.
2. Escribe esta dirección:

   ```
   https://caudal.brainstormersagency.es/add?texto=
   ```

3. Sin salir del cuadro de texto, pulsa el botón de **texto mágico** (el que
   pone `{ }` o *Insertar variable*, arriba a la derecha) y elige
   **`notification_text`**. Debe quedarte así:

   ```
   https://caudal.brainstormersagency.es/add?texto=[notification_text]
   ```

**`texto=` va al final de la dirección, y esto no es un detalle de estilo.** El
aviso puede traer dentro un `&` —«compra en H&M»— y eso parte una dirección web
en dos. Caudal lee este parámetro hasta el final de la línea justamente para que
eso no rompa nada, pero sólo puede hacerlo si es el último.

### Nombre

Ponle *Apuntar gasto de tarjeta* y guarda.

## 4. Pruébala sin que apunte nada todavía

Paga algo pequeño, o espera al siguiente cargo.

Al llegar el aviso, Caudal se abrirá enseñándote lo que ha entendido: importe,
comercio y día, con un botón de **Guardar**. Todavía no guarda nada solo —
así compruebas durante unos días que lee bien los avisos de *tu* banco antes de
darle permiso para apuntar sin preguntar.

Si dice **«No he podido leer el importe»**, no borres nada: mira el aviso
original en la barra de notificaciones y mándame el texto literal. Con eso ajusto
el reconocimiento; es exactamente así como se corrigieron los fallos que ya
lleva arreglados.

## 5. Cuando te fíes, que apunte solo

Vuelve a la acción de la macro y añade `auto=1` **delante** del texto:

```
https://caudal.brainstormersagency.es/add?auto=1&texto=[notification_text]
```

A partir de ahí el gasto queda apuntado en cuanto llega el aviso, con una
vibración corta como acuse. Sigue abriéndose la app un momento: Android no
permite que una web haga nada en segundo plano.

---

## Cosas que Caudal ya resuelve sola

- **Un cargo que llega dos veces** (el banco reenvía, o tocas la notificación
  otra vez) no se duplica: te avisa de que ya lo tienes.
- **Un pago rechazado o caducado** no crea ningún gasto. Es preferible echarlo
  en falta que encontrarse un gasto que nunca existió.
- **Una devolución, un Bizum recibido o una nómina** se apuntan como ingreso,
  con su signo, no como gasto.
- **Un pago programado** —un aviso de algo que todavía no ha ocurrido— se
  ignora hasta que ocurra de verdad.

## Si quieres afinar más

Estos parámetros se pueden añadir a la dirección, antes de `texto=`:

| Parámetro | Para qué | Ejemplo |
|---|---|---|
| `metodo=` | Forzar el método de pago | `metodo=tarjeta` |
| `apartado=` | Mandarlo a un apartado concreto | `apartado=Viaje` |
| `tipo=ingreso` | Forzarlo como ingreso | `tipo=ingreso` |

Por ejemplo, una segunda macro que dispare sólo con las notificaciones de la app
del hotel durante un viaje y las mande directas a ese apartado:

```
https://caudal.brainstormersagency.es/add?auto=1&apartado=Japón&texto=[notification_text]
```

## Compartir un aviso a mano

Sin macro ninguna: en cualquier aviso o mensaje, mantén pulsado el texto →
**Compartir** → **Caudal**. Llega igual, con vista previa antes de guardar.

---

## En iPhone

Es más limitado y conviene saberlo antes: **Atajos › Automatización** tiene un
disparador de **Cartera**, pero sólo salta con los pagos de Apple Pay hechos en
tienda. Los pagos con la tarjeta física y las compras por internet no lo
disparan.

La acción tiene que ser **Abrir URL**, no «Obtener contenido de la URL». La
segunda sale a internet a pedir la página y el resultado no llega nunca a la
app; es el error más habitual al montarlo.

Para lo que no cubre, el extracto en Norma 43 desde Ajustes.
