# Subir el formulario a tu dominio

## Por qué no lo he subido yo

No puedo, y no es por no querer:

- En el contenedor donde trabajo **no hay cliente SSH** — ni `ssh`, ni `scp`, ni
  `sftp`, ni `rsync`.
- **La salida por el puerto 22 está cerrada.** Todo el tráfico sale por un proxy
  HTTPS, así que no hay forma de abrir una conexión a tu servidor.
- Y aunque lo hubiera: haría falta tu clave privada o tu contraseña del servidor.
  **Eso no me lo mandes nunca**, ni a mí ni a ninguna herramienta. Una clave que
  pasa por un chat es una clave que hay que rotar.

Lo que sí está hecho es dejarlo listo para que subirlo te lleve dos minutos.

---

## Paso 1 · Pon tu número de WhatsApp

Sin esto, el botón abre el selector de contactos de WhatsApp y ella tiene que
buscarte. Con esto, se abre tu chat directamente.

```bash
python3 construir-suelto.py --telefono 34600112233
```

Con prefijo de país y sin espacios, guiones ni el signo `+`. Se regeneran las dos
copias a la vez.

Si prefieres no tocar la terminal: abre `web/index.html` con cualquier editor de
texto, busca `const TELEFONO = "";` (está sobre la línea 790, con un comentario
justo encima) y pon tu número entre las comillas. Es lo mismo.

---

## Paso 2 · Sube la carpeta `web/`

Dentro hay un solo archivo, `index.html`, y lleva todo dentro. No hay imágenes que
subir ni carpetas que respetar.

Elige el caso que sea el tuyo:

### A · Tienes un hosting con panel (cPanel, Plesk, Hostinger, Webempresa…)

1. Entra al panel y abre el **Administrador de archivos**.
2. Métete en `public_html` (en algunos paneles se llama `htdocs` o `www`).
3. Crea una carpeta y llámala `formulario`.
4. Sube ahí dentro el archivo `index.html`.

Y ya está: queda en **`https://tudominio.com/formulario/`**.

### B · Tienes FTP y nada más

Con FileZilla o similar, misma idea: conectas, te metes en `public_html`, creas la
carpeta `formulario` y arrastras `index.html` dentro.

### C · Tienes un servidor con SSH

**Este comando lo ejecutas tú, en tu ordenador, no yo.** Desde la carpeta
`reunion-cm/formulario`:

```bash
scp web/index.html usuario@tudominio.com:/var/www/tudominio.com/formulario/
```

Si la carpeta de destino no existe todavía:

```bash
ssh usuario@tudominio.com 'mkdir -p /var/www/tudominio.com/formulario'
```

La ruta real depende de cómo tengas montado el servidor (`/var/www/html/…`,
`/home/usuario/public_html/…`, `/usr/share/nginx/html/…`). Si no la sabes, mírala
en la configuración de nginx o de Apache: es la línea `root`.

### D · Tu dominio es un WordPress

No metas el archivo dentro de la carpeta del tema, que se borra al actualizar.
Súbelo por FTP a `public_html/formulario/`, fuera de `wp-content`. WordPress no lo
toca y la dirección funciona igual.

---

## Paso 3 · Compruébalo antes de mandárselo

Abre **`https://tudominio.com/formulario/`** desde tu móvil, contesta dos
preguntas y dale al botón. Si se te abre WhatsApp con el texto escrito, está bien.

---

## Dos cosas que conviene saber

**Que sea `https://`, no `http://`.** El botón de «Copiar las respuestas» usa el
portapapeles del navegador, y los navegadores sólo lo permiten en páginas seguras.
En `http://` sin más, ese botón no copia: en su lugar la página le enseña el texto
para que lo seleccione a mano. Funciona, pero es peor. Casi todos los hostings dan
certificado gratis con un clic; si el tuyo ya lo tiene, no tienes que hacer nada.

**La página no guarda nada en tu servidor.** Es un archivo estático: no hay base de
datos ni nada que se escriba. Las respuestas se quedan en el móvil de ella mientras
lo rellena y te llegan por WhatsApp cuando le da al botón. Eso significa que
ponerlo en tu dominio es cero riesgo, pero también que **si ella no le da al botón,
tú no te enteras de nada**. Si quieres saber quién lo ha abierto y quién no, usa el
enlace publicado en vez de esto.

---

## Cuál de las tres versiones usar

| | Cuándo |
|---|---|
| **El enlace publicado** | Por defecto. Las respuestas te llegan ordenadas y sabes si lo ha rellenado. |
| **Tu dominio** | Cuando quieres que se vea tu marca y no un enlace de otro sitio. Queda más profesional delante de un cliente. |
| **El archivo adjunto** | El comodín de emergencia, si te dice «no me abre». |

Las tres son exactamente las mismas veinte preguntas.
