#!/usr/bin/env python3
"""
Genera `formulario-suelto.html` a partir de `index.html`.

`index.html` es la versión publicada como página web: el botón de enviar manda las
respuestas directamente a Eduardo. `formulario-suelto.html` es la misma página pero
como archivo independiente, para mandarla por correo o por WhatsApp: ahí no hay a
dónde enviar, así que el botón copia las respuestas y ofrece abrir WhatsApp con el
texto ya escrito.

Escribe dos copias idénticas, para que no puedan descuadrarse:

    formulario-suelto.html   para mandar adjunta por WhatsApp o correo
    web/index.html           para subir a tu dominio

    python3 construir-suelto.py
    python3 construir-suelto.py --telefono 34600112233
"""

import argparse
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(AQUI, "index.html")
# Se escriben las dos a la vez, siempre, para que no puedan descuadrarse:
# una para mandar adjunta y otra lista para subir a un dominio.
DESTINOS = [
    os.path.join(AQUI, "formulario-suelto.html"),   # para mandar por WhatsApp o correo
    os.path.join(AQUI, "web", "index.html"),        # para subir a tu dominio
]

# El servicio de artefactos envuelve la página y aplica un reset mínimo. En un
# archivo suelto no hay nadie que lo haga, así que va aquí.
CABECERA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<style>
  html{color-scheme:light dark}
  body{margin:0;font-family:system-ui,sans-serif;font-size:14px}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
"""
PIE = "\n</body>\n</html>\n"


def main():
    p = argparse.ArgumentParser(description="Genera la versión suelta del formulario.")
    p.add_argument("--telefono", default="",
                   help="Tu WhatsApp con prefijo y sin signos, p.ej. 34600112233. "
                        "Si lo pones, el botón abre el chat contigo directamente; "
                        "si no, abre el selector de contacto de WhatsApp.")
    p.add_argument("-o", "--salida", default=None,
                   help="Escribe sólo en esta ruta en vez de en las dos de siempre.")
    args = p.parse_args()

    telefono = "".join(c for c in args.telefono if c.isdigit())
    if args.telefono and not telefono:
        sys.exit(f"El teléfono '{args.telefono}' no tiene ningún dígito.")

    with open(ORIGEN, encoding="utf-8") as f:
        html = f.read()

    # El <title> y las hojas de estilo van en el <head>; el resto, en el <body>.
    corte = html.index("</style>") + len("</style>")
    cabeza, cuerpo = html[:corte], html[corte:]

    # --- el envío cambia por completo ---
    ini = cuerpo.index("async function enviar() {")
    fin = cuerpo.index('$("#enviar").addEventListener("click", enviar);')
    cuerpo = cuerpo[:ini] + '''function enviar() {
  const pendientes = obligatoriasPendientes();
  if (pendientes.length) {
    const f = $("#faltan");
    f.hidden = false;
    f.textContent = "Te faltan " + pendientes.length + " respuesta" + (pendientes.length > 1 ? "s" : "") +
      ". Puedes mandarlo igual, pero cuantas más, mejor te ayudo.";
    document.getElementById("p-" + pendientes[0].id).scrollIntoView({ block: "center" });
    if (!enviar._insistido) { enviar._insistido = true; return; }
  }
  rutaCopia("");
}

// ── Tu WhatsApp, con prefijo de país y sin espacios ni signos: "34600112233".
// Déjalo vacío y se abrirá el selector de contactos en vez del chat contigo.
const TELEFONO = "__TELEFONO__";

function porWhatsapp() {
  const texto = comoTexto();
  const destino = TELEFONO
    ? "https://wa.me/" + TELEFONO + "?text=" + encodeURIComponent(texto)
    : "https://api.whatsapp.com/send?text=" + encodeURIComponent(texto);
  window.open(destino, "_blank");
  $("#volcado").hidden = false;
  $("#volcado").textContent = texto;
  mostrarEstado("Se te ha abierto WhatsApp con las respuestas escritas. Si no se ha abierto o " +
    "se ha cortado el texto, lo tienes entero aquí abajo para copiarlo a mano.", "aviso-fallo");
}

''' + cuerpo[fin:]

    cuerpo = cuerpo.replace(
        '$("#enviar").addEventListener("click", enviar);\n$("#copiar").addEventListener("click", () => rutaCopia(""));',
        '$("#enviar").addEventListener("click", porWhatsapp);\n$("#copiar").addEventListener("click", () => rutaCopia(""));'
    )

    # --- textos de los botones y del cierre ---
    cambios = [
        ('<button class="btn" id="enviar">Enviar mis respuestas</button>',
         '<button class="btn" id="enviar">Mandármelas por WhatsApp</button>'),
        ('<button class="btn sec" id="copiar">Copiar respuestas para WhatsApp</button>',
         '<button class="btn sec" id="copiar">Copiar las respuestas</button>'),
        ('btn.textContent = "Enviar mis respuestas";',
         'btn.textContent = "Mandármelas por WhatsApp";'),
    ]
    for viejo, nuevo in cambios:
        cuerpo = cuerpo.replace(viejo, nuevo)

    # El aviso de privacidad de la versión publicada habla de "enviar"; aquí no se
    # envía nada a ningún sitio y conviene decirlo, que además tranquiliza.
    cuerpo = cuerpo.replace(
        "Mientras lo rellenas se guarda en este móvil, así que puedes cerrarlo y volver.",
        "Esta página no manda nada a ningún sitio por su cuenta: se guarda en tu móvil "
        "mientras la rellenas, y sólo sale de ahí cuando tú le das al botón."
    )

    cuerpo = cuerpo.replace("__TELEFONO__", telefono)
    salida = CABECERA + cabeza + "\n</head>\n<body>\n" + cuerpo + PIE

    preguntas = len(re.findall(r'\bid:"', salida))
    if preguntas != 20:
        sys.exit(f"Esperaba 20 preguntas y he encontrado {preguntas}. Revisa index.html.")

    for ruta in ([args.salida] if args.salida else DESTINOS):
        os.makedirs(os.path.dirname(os.path.abspath(ruta)) or ".", exist_ok=True)
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(salida)
        print(ruta)

    destino_wa = f"va directo a {telefono}" if telefono else "abre el selector de contactos de WhatsApp"
    print(f"{len(salida):,} bytes · {preguntas} preguntas · el botón {destino_wa}")


if __name__ == "__main__":
    main()
