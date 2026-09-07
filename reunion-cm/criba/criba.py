#!/usr/bin/env python3
"""
Criba de fotos para hostelería.

Coge la carpeta tal y como te la manda el cliente y devuelve una hoja de
contactos en HTML con un semáforo y el motivo debajo de cada foto:

    verde  — se puede usar tal cual
    ámbar  — sirve, pero hay que tocarla (recortar, aclarar, corregir el color)
    rojo   — no hay por dónde cogerla

Todo lo que hay aquí es aritmética sobre los píxeles: nitidez, exposición,
dominante de color, resolución, proporción y casi-duplicadas. No hay ningún
modelo detrás y no se inventa nada, así que el motivo de cada descarte se
puede enseñar y discutir. Lo que NO hace, a propósito, es decidir cuál es la
foto buena: eso es criterio y no se automatiza.

Uso:
    python3 criba.py CARPETA [-o criba.html] [--formato 4:5] [--json datos.json]

Sólo necesita Pillow y numpy.
"""

import argparse
import base64
import io
import json
import math
import os
import sys
from collections import defaultdict

try:
    import numpy as np
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Faltan dependencias. Instálalas con:  pip install Pillow numpy")

Image.MAX_IMAGE_PIXELS = None
EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".bmp"}

# ---------------------------------------------------------------- umbrales
# Pensados para fotos de móvil en un local. Se tocan aquí y en ningún otro sitio.
UMBRAL = {
    # La nitidez NO tiene umbral fijo: depende del móvil, de la luz y de la
    # escena. Se compara cada foto con la mediana de su propia carpeta, que es
    # justo lo que hace un ojo humano al pasar el carrete.
    "nitidez_roja_rel": 0.12,   # por debajo del 12% de la mediana: movida
    "nitidez_ambar_rel": 0.32,  # por debajo del 32%: justa
    "nitidez_suelo": 30.0,      # suelo absoluto, para carpetas enteras borrosas
    "oscura": 55.0,            # luma media 0-255
    "muy_oscura": 32.0,
    "quemada_pct": 12.0,       # % de píxeles pegados al blanco
    "sombras_pct": 45.0,       # % de píxeles pegados al negro
    "dominante": 1.55,         # ratio rojo/azul: luz de bombilla
    "dominante_fuerte": 1.95,
    "lado_minimo": 1080,       # por debajo no da para una story a pantalla completa
    "lado_minimo_rojo": 720,
    "sin_contraste": 24.0,     # desviación típica de la luma: foto plana
    "hamming_duplicada": 26,   # bits distintos (de 256) para considerarlas la misma toma
    "color_duplicada": 14.0,   # diferencia media de color (0-255) admitida entre repetidas
}


# ------------------------------------------------------------- utilidades
def luma(rgb):
    """Luminancia perceptual (Rec. 601) en 0-255."""
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def nitidez(gris):
    """
    Varianza del laplaciano, por baldosas y quedándonos con el percentil 90.

    Dos correcciones que importan:

    - Se estira el contraste antes de medir. Sin esto, una foto oscura pero
      perfectamente enfocada puntúa como movida, porque la penumbra aplana las
      diferencias entre píxeles vecinos. Nitidez y exposición son problemas
      distintos y hay que medirlos por separado.
    - Se mide por baldosas y se coge el percentil 90, no la media. Medir la
      imagen entera penaliza a las fotos de plato buenas, que llevan el fondo
      desenfocado a propósito. Lo que interesa es si HAY algo enfocado en alguna
      parte, no si lo está todo.
    """
    lo, hi = np.percentile(gris, (2, 98))
    gris = np.clip((gris - lo) * (255.0 / max(hi - lo, 1.0)), 0, 255)
    lap = (
        -4.0 * gris[1:-1, 1:-1]
        + gris[:-2, 1:-1] + gris[2:, 1:-1]
        + gris[1:-1, :-2] + gris[1:-1, 2:]
    )
    alto, ancho = lap.shape
    paso_y, paso_x = max(1, alto // 6), max(1, ancho // 6)
    valores = [
        float(lap[y:y + paso_y, x:x + paso_x].var())
        for y in range(0, alto - paso_y + 1, paso_y)
        for x in range(0, ancho - paso_x + 1, paso_x)
    ]
    return float(np.percentile(valores, 90)) if valores else float(lap.var())


def huella(img):
    """
    dHash de 256 bits (rejilla 17x16): compara cada píxel con el de su derecha.

    64 bits se queda corto en una carpeta de restaurante, donde media carpeta
    son platos redondos sobre una mesa y el encuadre se repite sin que las fotos
    sean la misma.
    """
    g = np.asarray(ImageOps.grayscale(img).resize((17, 16), Image.BILINEAR), dtype=np.int16)
    bits = (g[:, 1:] > g[:, :-1]).flatten()
    valor = 0
    for b in bits:
        valor = (valor << 1) | int(b)
    return valor


def firma_color(img):
    """Color medio en una rejilla 4x4. La huella ignora el color; esto no."""
    chico = img.resize((4, 4), Image.BILINEAR)
    return np.asarray(chico, dtype=np.float32).reshape(-1)


def distancia(a, b):
    return bin(a ^ b).count("1")


def misma_foto(a, b):
    """
    Dos fotos son la misma toma si coinciden en estructura Y en color.

    Exigir las dos cosas es lo que evita el error caro: agrupar la foto del
    plato con luz de día y la del mismo plato con luz de bombilla como si fueran
    repetidas, cuando en realidad una vale y la otra no.
    """
    if distancia(a["huella"], b["huella"]) > UMBRAL["hamming_duplicada"]:
        return False
    return float(np.abs(a["color"] - b["color"]).mean()) <= UMBRAL["color_duplicada"]


def recorte_perdido(ancho, alto, destino):
    """Qué fracción de la imagen se pierde al encajarla en la proporción destino."""
    actual, quiero = ancho / alto, destino
    if abs(actual - quiero) < 0.01:
        return 0.0
    if actual > quiero:                      # sobra por los lados
        return 1.0 - (alto * quiero) / ancho
    return 1.0 - (ancho / quiero) / alto     # sobra por arriba y abajo


# ------------------------------------------------------------- análisis
def medir(ruta, destino):
    img = Image.open(ruta)
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    img = img.convert("RGB")
    ancho, alto = img.size

    hue = huella(img)
    color = firma_color(img)

    # Todo lo demás se mide sobre una versión llevada SIEMPRE a 1024 px de lado
    # largo, ampliando si hace falta. Si sólo se redujera, una foto de 600 px
    # conservaría más detalle por píxel que una de 4000 y saldría más nítida que
    # ella, que es justo lo contrario de la verdad.
    escala = 1024 / max(ancho, alto)
    chico = img.resize((max(1, round(ancho * escala)), max(1, round(alto * escala))), Image.BILINEAR)
    rgb = np.asarray(chico, dtype=np.float32)
    gris = luma(rgb)

    media = float(gris.mean())
    contraste = float(gris.std())
    quemada = float((gris > 250).mean() * 100)
    sombras = float((gris < 12).mean() * 100)
    nit = nitidez(gris)

    canales = rgb.reshape(-1, 3).mean(axis=0) + 1e-6
    calidez = float(canales[0] / canales[2])

    perdida = recorte_perdido(ancho, alto, destino)

    m = {
        "ruta": ruta,
        "nombre": os.path.basename(ruta),
        "ancho": ancho, "alto": alto,
        "mpx": round(ancho * alto / 1e6, 1),
        "nitidez": round(nit, 1),
        "luz": round(media, 1),
        "contraste": round(contraste, 1),
        "quemada": round(quemada, 1),
        "sombras": round(sombras, 1),
        "calidez": round(calidez, 2),
        "recorte": round(perdida * 100),
        "perdida": perdida,
        "huella": hue,
        "color": color,
        "horizontal": ancho > alto,
    }

    # miniatura embebida, para que el HTML viaje solo
    mini = img.copy()
    mini.thumbnail((420, 420), Image.LANCZOS)
    buf = io.BytesIO()
    mini.save(buf, "JPEG", quality=72, optimize=True)
    m["thumb"] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    return m


def clasificar(fotos):
    """
    Reparte el semáforo. Se hace con la carpeta entera delante, no foto a foto,
    porque el criterio de nitidez es comparativo: lo que en un carrete de móvil
    viejo es normal, en uno bueno es una foto movida.
    """
    nitideces = sorted(f["nitidez"] for f in fotos)
    mediana = nitideces[len(nitideces) // 2] if nitideces else 0.0
    # Con menos de 5 fotos la mediana no dice nada; se cae al suelo absoluto.
    fiable = len(fotos) >= 5 and mediana > 0
    corte_rojo = max(UMBRAL["nitidez_suelo"], mediana * UMBRAL["nitidez_roja_rel"]) if fiable else UMBRAL["nitidez_suelo"]
    corte_ambar = mediana * UMBRAL["nitidez_ambar_rel"] if fiable else UMBRAL["nitidez_suelo"] * 2.5

    for m in fotos:
        rojos, ambares = [], []
        lado = min(m["ancho"], m["alto"])

        if m["nitidez"] < corte_rojo:
            rojos.append("movida o desenfocada")
        elif m["nitidez"] < corte_ambar:
            ambares.append("justa de nitidez comparada con el resto")

        if m["luz"] < UMBRAL["muy_oscura"]:
            rojos.append("demasiado oscura")
        elif m["luz"] < UMBRAL["oscura"]:
            ambares.append("oscura, hay que aclararla")

        if m["quemada"] > UMBRAL["quemada_pct"]:
            rojos.append(f"quemada, {m['quemada']:.0f}% del blanco perdido")
        elif m["quemada"] > UMBRAL["quemada_pct"] / 2:
            ambares.append("hay zonas quemadas")

        if m["sombras"] > UMBRAL["sombras_pct"]:
            ambares.append("casi la mitad son sombras sin información")

        if m["calidez"] > UMBRAL["dominante_fuerte"]:
            rojos.append("dominante naranja fuerte (luz de bombilla)")
        elif m["calidez"] > UMBRAL["dominante"]:
            ambares.append("tira a amarilla, hay que corregir el blanco")

        if lado < UMBRAL["lado_minimo_rojo"]:
            rojos.append(f"resolución corta ({m['ancho']}x{m['alto']})")
        elif lado < UMBRAL["lado_minimo"]:
            ambares.append(f"se queda corta para una story ({m['ancho']}x{m['alto']})")

        # Desenfocar aplana y quemar aplana: si ya se ha señalado eso, repetirlo
        # como "sin contraste" es contar dos veces el mismo problema.
        if m["contraste"] < UMBRAL["sin_contraste"] and not rojos and not ambares:
            ambares.append("plana, sin contraste")

        if m["perdida"] > 0.42:
            ambares.append(f"es horizontal: al pasarla a vertical pierdes el {m['recorte']}%")
        elif m["perdida"] > 0.25:
            ambares.append(f"al recortarla pierdes el {m['recorte']}%")

        m["rojos"], m["ambares"] = rojos, ambares
        m["semaforo"] = "rojo" if rojos else ("ambar" if ambares else "verde")

    return mediana


def agrupar_duplicadas(fotos):
    """Une en grupos las fotos cuya huella se parece. Marca todas menos la mejor."""
    grupos, asignado = [], {}
    for i, a in enumerate(fotos):
        if i in asignado:
            continue
        grupo = [i]
        asignado[i] = len(grupos)
        for j in range(i + 1, len(fotos)):
            if j in asignado:
                continue
            if misma_foto(a, fotos[j]):
                grupo.append(j)
                asignado[j] = len(grupos)
        grupos.append(grupo)

    for n, grupo in enumerate(grupos, 1):
        if len(grupo) < 2:
            continue
        mejor = max(grupo, key=lambda k: fotos[k]["nitidez"])
        for k in grupo:
            fotos[k]["grupo"] = n
            fotos[k]["hermanas"] = len(grupo)
            if k != mejor:
                fotos[k]["ambares"].append(f"casi igual que otras {len(grupo) - 1} del grupo {n}")
                if fotos[k]["semaforo"] == "verde":
                    fotos[k]["semaforo"] = "ambar"
            else:
                fotos[k]["mejor_del_grupo"] = True
    return sum(1 for g in grupos if len(g) > 1)


# ------------------------------------------------------------- salida
def render(fotos, carpeta, destino_txt, n_grupos):
    orden = {"verde": 0, "ambar": 1, "rojo": 2}
    fotos.sort(key=lambda f: (orden[f["semaforo"]], -f["nitidez"]))
    cuenta = defaultdict(int)
    for f in fotos:
        cuenta[f["semaforo"]] += 1
    total = len(fotos)

    def tarjeta(f):
        motivos = f["rojos"] + f["ambares"]
        lis = "".join(f"<li>{m}</li>" for m in motivos)
        etiqueta = {"verde": "vale", "ambar": "hay que tocarla", "rojo": "no vale"}[f["semaforo"]]
        grupo = ""
        if f.get("hermanas"):
            marca = " · la mejor" if f.get("mejor_del_grupo") else ""
            grupo = f'<span class="grupo">grupo {f["grupo"]}{marca}</span>'
        return f"""<figure class="foto {f['semaforo']}">
  <div class="marco"><img src="{f['thumb']}" alt="{f['nombre']}" loading="lazy"></div>
  <figcaption>
    <div class="fila"><span class="chapa">{etiqueta}</span>{grupo}</div>
    <p class="nombre" title="{f['nombre']}">{f['nombre']}</p>
    {'<ul class="motivos">' + lis + '</ul>' if lis else '<p class="limpia">Nítida, bien expuesta y entra en vertical.</p>'}
    <p class="datos">{f['ancho']}×{f['alto']} · {f['mpx']} Mpx · nitidez {f['nitidez']:.0f} · luz {f['luz']:.0f}</p>
  </figcaption>
</figure>"""

    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Criba de fotos — {os.path.basename(os.path.abspath(carpeta))}</title>
<style>
:root{{
  --paper:#F1F4F0;--surface:#fff;--ink:#17211C;--ink-2:#3F5349;--ink-3:#77897E;
  --line:#D2DBD4;--verde:#1F6B57;--ambar:#9A6B14;--rojo:#A33429;
  --f:Karla,system-ui,-apple-system,"Segoe UI",sans-serif;
  --m:"DM Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}}
@media (prefers-color-scheme:dark){{:root{{
  --paper:#0F1512;--surface:#18211C;--ink:#E6EDE8;--ink-2:#AFC1B6;--ink-3:#7F9488;
  --line:#2B3931;--verde:#63C0A2;--ambar:#E9BB5E;--rojo:#E08A7E;
}}}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--f);
  font-size:15px;line-height:1.5;padding:28px 20px 60px}}
.envoltura{{max-width:1180px;margin:0 auto}}
h1{{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}}
.sub{{color:var(--ink-3);font-family:var(--m);font-size:12px;letter-spacing:.03em}}
.marcador{{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 8px}}
.marcador b{{display:flex;align-items:baseline;gap:7px;background:var(--surface);
  border:1px solid var(--line);border-radius:7px;padding:9px 13px;font-weight:400}}
.marcador i{{font-style:normal;font-family:var(--m);font-size:18px;font-variant-numeric:tabular-nums}}
.marcador .v i{{color:var(--verde)}} .marcador .a i{{color:var(--ambar)}} .marcador .r i{{color:var(--rojo)}}
.nota{{color:var(--ink-2);max-width:66ch;margin:14px 0 26px;font-size:14px}}
.rejilla{{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:16px}}
.foto{{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:10px;
  overflow:hidden;display:flex;flex-direction:column;border-top-width:3px}}
.foto.verde{{border-top-color:var(--verde)}}
.foto.ambar{{border-top-color:var(--ambar)}}
.foto.rojo{{border-top-color:var(--rojo)}}
.marco{{aspect-ratio:4/5;background:#0002;overflow:hidden}}
.marco img{{width:100%;height:100%;object-fit:cover;display:block}}
.foto.rojo .marco img{{opacity:.5}}
figcaption{{padding:11px 12px 13px;display:flex;flex-direction:column;gap:6px}}
.fila{{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 8px}}
.chapa{{font-family:var(--m);font-size:10px;letter-spacing:.08em;text-transform:uppercase}}
.verde .chapa{{color:var(--verde)}} .ambar .chapa{{color:var(--ambar)}} .rojo .chapa{{color:var(--rojo)}}
.grupo{{font-family:var(--m);font-size:10px;color:var(--ink-3)}}
.nombre{{margin:0;font-size:12.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.motivos{{margin:0;padding-left:16px;font-size:13px;color:var(--ink)}}
.motivos li{{margin-bottom:2px}}
.limpia{{margin:0;font-size:13px;color:var(--ink-3)}}
.datos{{margin:2px 0 0;font-family:var(--m);font-size:10.5px;color:var(--ink-3);
  font-variant-numeric:tabular-nums}}
.pie{{margin-top:34px;padding-top:16px;border-top:1px solid var(--line);
  color:var(--ink-3);font-size:13px;max-width:66ch}}
@media print{{body{{background:#fff}} .foto{{break-inside:avoid}}}}
</style></head><body><div class="envoltura">

<h1>Criba de fotos</h1>
<p class="sub">{os.path.abspath(carpeta)} · {total} fotos · recorte objetivo {destino_txt}</p>

<div class="marcador">
  <b class="v"><i>{cuenta['verde']}</i> se pueden usar</b>
  <b class="a"><i>{cuenta['ambar']}</i> hay que tocarlas</b>
  <b class="r"><i>{cuenta['rojo']}</i> no valen</b>
  <b><i>{n_grupos}</i> grupos de casi iguales</b>
</div>

<p class="nota">Debajo de cada foto está el motivo, medido sobre los píxeles: nitidez,
exposición, dominante de color, resolución y proporción. No hay ningún modelo
detrás, así que cualquier descarte se puede comprobar mirando la foto.
<b>La máquina tira la basura; la foto buena la eliges tú.</b></p>

<div class="rejilla">
{chr(10).join(tarjeta(f) for f in fotos)}
</div>

<p class="pie">Las agrupadas como «casi iguales» son ráfagas del mismo plano: se
marca la más nítida y las demás quedan en ámbar, pero ninguna se descarta sola.
Las de resolución corta se pueden seguir usando en el feed; lo que no aguantan es
una story a pantalla completa.</p>

</div></body></html>"""


def main():
    p = argparse.ArgumentParser(description="Criba mecánica de una carpeta de fotos.")
    p.add_argument("carpeta")
    p.add_argument("-o", "--salida", default="criba.html")
    p.add_argument("--formato", default="4:5", help="proporción destino, p.ej. 4:5 o 9:16")
    p.add_argument("--json", help="volcar también las medidas en bruto")
    a = p.parse_args()

    try:
        an, al = (float(x) for x in a.formato.split(":"))
        destino = an / al
    except ValueError:
        sys.exit(f"Formato no válido: {a.formato}. Usa algo como 4:5 o 9:16.")

    if not os.path.isdir(a.carpeta):
        sys.exit(f"No existe la carpeta: {a.carpeta}")

    rutas = sorted(
        os.path.join(r, n)
        for r, _, ns in os.walk(a.carpeta)
        for n in ns
        if os.path.splitext(n)[1].lower() in EXTENSIONES
    )
    if not rutas:
        sys.exit(f"No he encontrado fotos en {a.carpeta}")

    fotos, fallos = [], []
    for i, ruta in enumerate(rutas, 1):
        print(f"\r  {i}/{len(rutas)}  {os.path.basename(ruta)[:44]:<44}", end="", file=sys.stderr)
        try:
            fotos.append(medir(ruta, destino))
        except Exception as e:
            fallos.append((ruta, str(e)))
    print(file=sys.stderr)

    mediana = clasificar(fotos)
    n_grupos = agrupar_duplicadas(fotos)

    with open(a.salida, "w", encoding="utf-8") as f:
        f.write(render(fotos, a.carpeta, a.formato, n_grupos))

    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump([{k: v for k, v in x.items() if k not in ("thumb", "color", "perdida")} for x in fotos],
                      f, ensure_ascii=False, indent=1)

    c = defaultdict(int)
    for x in fotos:
        c[x["semaforo"]] += 1
    print(f"\n{len(fotos)} fotos · {c['verde']} verdes · {c['ambar']} ámbar · "
          f"{c['rojo']} rojas · {n_grupos} grupos de casi iguales")
    if fallos:
        print(f"{len(fallos)} no se han podido abrir:", file=sys.stderr)
        for r, e in fallos[:5]:
            print(f"  {os.path.basename(r)}: {e}", file=sys.stderr)
    print(f"→ {os.path.abspath(a.salida)}")


if __name__ == "__main__":
    main()
