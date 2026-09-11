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
   pone `{ }` o *Insertar variable*, arriba a la derecha) y elige el que
   corresponde al **texto/cuerpo de la notificación**. Debe quedarte así:

   ```
   https://caudal.brainstormersagency.es/add?texto={notification}
   ```

**`texto=` va al final de la dirección, y esto no es un detalle de estilo.** El
aviso puede traer dentro un `&` —«compra en H&M»— y eso parte una dirección web
en dos. Caudal lee este parámetro hasta el final de la línea justamente para que
eso no rompa nada, pero sólo puede hacerlo si es el último.

### Nombre

Ponle *Apuntar gasto de tarjeta* y guarda.

### Activa la codificación si la acción la ofrece

En las opciones avanzadas de «Abrir sitio web» hay una casilla del tipo
**«URL encode parameters»**. Márcala. MacroDroid pega el texto en crudo si no
está marcada, y entonces una **almohadilla** en el nombre del comercio
—`MERCADONA #4471`— trunca la dirección: el navegador trata todo lo que va
detrás de `#` como ancla y no llega nunca a la app. El `&` y el `%` Caudal ya
los aguanta; la almohadilla no hay forma de arreglarla desde este lado.

## 4. Pruébala sin gastar dinero

No hace falta pagar nada para probar la macro entera. El disparador de
notificación es genérico: funciona con cualquier app.

1. **Duplica la macro** (menú de la macro › *Duplicar*). Trabaja sobre la copia
   y deja la buena intacta.
2. En la copia, cambia el filtro de aplicación del disparador a **Telegram** o
   **Gmail** en lugar de tu banco.
3. Mándate un mensaje con el texto de un aviso real de tu banco, por ejemplo:
   `Compra de 12,34 EUR en MERCADONA`.
4. Debe abrirse Caudal con 12,34 € y «MERCADONA».
5. Borra la copia.

> **WhatsApp no sirve** para esto: agrupa las notificaciones y MacroDroid acaba
> leyendo «3 mensajes nuevos» en vez del texto. Telegram o Gmail, mejor.
>
> El **botón de probar** del editor tampoco vale por sí solo: en esa ejecución
> el texto mágico no tiene valor real y llega literalmente `{notification}`.

## 5. Los primeros días, que pregunte antes de apuntar

Al llegar el aviso, Caudal se abrirá enseñándote lo que ha entendido: importe,
comercio y día, con un botón de **Guardar**. Todavía no guarda nada solo —
así compruebas durante unos días que lee bien los avisos de *tu* banco antes de
darle permiso para apuntar sin preguntar.

Si dice **«No he podido leer el importe»**, no borres nada: el texto queda
guardado en *Ajustes › Últimos avisos recibidos*. Mándamelo y ajusto el
reconocimiento; es exactamente así como se corrigieron los fallos que ya lleva
arreglados.

## 6. Cuando te fíes, que apunte solo

Vuelve a la acción de la macro y añade `auto=1` **delante** del texto:

```
https://caudal.brainstormersagency.es/add?auto=1&texto={notification}
```

A partir de ahí el gasto queda apuntado en cuanto llega el aviso, con una
vibración corta como acuse. Sigue abriéndose la app un momento: Android no
permite que una web haga nada en segundo plano.

---

## Cómo saber que funciona de verdad

La cadena tiene cinco eslabones y cada uno falla de una forma distinta.
Compruébalos **en este orden**: primero los que más probablemente fallen y más
barato es descartar.

### Eslabón 1 — ¿te avisa tu banco de cada compra?

Es el que más falla y no depende de Caudal en absoluto. Varios bancos españoles
**no avisan de todo por defecto**:

- **CaixaBank** sólo avisa de compras de más de 500 €. Un café no genera aviso.
- **Santander** e **ING** permiten fijar un importe mínimo: por debajo, silencio.
- **Bizum recibido** lo avisa la app del banco, no Wallet, y falla a menudo.

**Cómo comprobarlo:** paga algo pequeño y mira si llega la notificación. Si no
llega, entra en los avisos de tu banco y quita el mínimo. Sin este eslabón no
hay nada que automatizar, y ninguna macro lo arregla.

Si pagas con **Google Wallet**, Wallet manda además su propio aviso, pero
cuidado con dos cosas: llega **unos minutos después**, no al instante, y Google
avisa de que el nombre del comercio no siempre lo comparte la tienda. Se activa
en Wallet › tu foto › Ajustes › notificaciones de compra.

### Eslabón 2 — ¿ve MacroDroid ese aviso, y qué texto exacto trae?

Monta una **macro espía** de dos minutos, que es la mejor inversión de todo
esto:

- Disparador: **Notificación recibida**, tu banco, contenido «cualquiera».
- Acción: **Registrar evento** (*Log Event*) con este contenido:

  ```
  {not_app_package} | {not_title} | {notification}
  ```

Paga algo y mira **Registro del sistema** (menú principal de MacroDroid), con el
nivel puesto en **Detallado**. Ahí verás el texto literal que manda tu banco.

Eso te sirve para dos cosas: confirmar que MacroDroid recibe el aviso, y tener
el texto exacto para probar el resto **sin gastar más dinero**.

> Si el registro sale vacío, el problema es de permisos: mira más abajo.

### Eslabón 3 — ¿se monta bien la dirección?

Con el texto del paso anterior, escríbelo a mano detrás de `texto=` y abre la
dirección en el navegador del móvil. Si Caudal apunta el importe correcto, el
reconocimiento funciona.

**El fallo silencioso de este paso:** si el texto mágico está mal escrito,
MacroDroid **no da error**: deja el texto literal dentro de la dirección. Verás
llegar a Caudal un aviso cuyo texto es, literalmente, `{notification}`. Por eso
el nombre exacto importa.

### Eslabón 4 — ¿abre Caudal, y el Caudal que tiene tus datos?

Aquí está el fallo más traicionero de todos: **acabar con dos Caudales**, cada
uno con su base de datos vacía, sin que nada lo avise.

Pasa si la dirección no coincide **exactamente** con la que usaste al instalar:

- `caudal.brainstormersagency.es` y `www.caudal.brainstormersagency.es` son
  sitios distintos para el navegador, con almacenes distintos.
- `http://` y `https://` también.
- Si instalaste desde Chrome pero el enlace lo abre Samsung Internet, son dos
  apps distintas y no comparten nada.

**Cómo comprobarlo:** después de una prueba, abre Caudal **desde el icono de la
pantalla de inicio**, no desde el navegador. Si el gasto está ahí, todo va al
mismo sitio. Si no está pero sí lo viste apuntarse, tienes dos almacenes.

Instalada desde Chrome, la app y las pestañas de Chrome comparten
almacenamiento: es el mismo origen y el mismo almacén. Por eso conviene instalar
desde Chrome y que Chrome sea el navegador por defecto.

> Android puede abrir el enlace en Chrome en lugar de en la app instalada. No
> pasa nada —los datos son los mismos— pero si prefieres que abra la app:
> Ajustes › Aplicaciones › Caudal › **Abrir de forma predeterminada** › activar
> *Abrir enlaces compatibles*.

### Eslabón 5 — ¿lo entendió Caudal?

Esto ya lo dice la propia app. **Ajustes › Últimos avisos recibidos**: los
últimos veinte, con lo que llegó y qué se hizo con cada uno.

| Lo que pone | Qué significa |
|---|---|
| **Apuntado** | Perfecto. |
| **Esperando confirmación** | Entendido; falta que pulses Guardar (no pusiste `auto=1`). |
| **Ya estaba** | Llegó dos veces, o ya lo tenías. No se ha duplicado. |
| **Descartado a propósito** | Un pago rechazado o programado. Correcto. |
| **No se pudo leer** | Esto es un fallo. El texto está ahí: mándamelo. |

Y si la lista sale **vacía** después de una compra, el fallo está antes: vuelve
al eslabón 1.

Esta pantalla es la respuesta corta a «¿cómo sé que funciona?». Míralas los
primeros días. Si todo pone *Apuntado*, la cadena entera funciona.

---

## Si la macro no dispara

Casi siempre es Android matando MacroDroid para ahorrar batería, no la macro.

1. **Acceso a notificaciones**: Ajustes › Aplicaciones › Acceso especial ›
   *Acceso a notificaciones* (en Android puro: Ajustes › Notificaciones ›
   *Notificaciones del dispositivo y de las aplicaciones*).

   Conviene saber lo que se concede: ese permiso es de todo o nada. MacroDroid
   pasa a **ver todas** las notificaciones del móvil; el filtro por app que
   pusiste lo aplica MacroDroid después, no el sistema.

2. **Batería**: Ajustes › Aplicaciones › MacroDroid › Batería › **Sin
   restricciones**. Sin esto la macro va bien un rato y luego deja de disparar
   sin motivo aparente.

3. **Según el fabricante**, hace falta algo más:
   - **Xiaomi**: Seguridad › Permisos › *Inicio automático*, y bloquear
     MacroDroid en la pantalla de recientes.
   - **Samsung**: sacarla de *Apps en suspensión* y *suspensión profunda*.
   - **Huawei**: marcarla como *app protegida* y poner *Inicio de aplicaciones*
     en manual.
   - **OnePlus**: desactivar la *optimización profunda*.

4. **Si instalaste MacroDroid fuera de Google Play**, Android 13+ bloquea el
   acceso a notificaciones con un aviso de «ajuste restringido»: Ajustes ›
   Aplicaciones › MacroDroid › (tres puntos) › *Permitir ajustes restringidos*.

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
https://caudal.brainstormersagency.es/add?auto=1&apartado=Japón&texto={notification}
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
