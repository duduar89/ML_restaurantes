# Criba de fotos

Coge una carpeta tal y como la manda el cliente y devuelve una hoja de contactos en
HTML con un semáforo y el motivo debajo de cada foto.

```bash
pip install Pillow numpy
python3 criba.py ~/fotos-del-cliente -o criba.html
python3 criba.py ~/fotos --formato 9:16     # si el destino son stories
python3 criba.py ~/fotos --json medidas.json
```

Abre `criba.html` en el navegador. Va solo: las miniaturas están dentro del archivo,
así que se puede mandar por WhatsApp o imprimir a PDF sin que se rompa nada.

## Qué mide

Todo es aritmética sobre los píxeles. No hay ningún modelo detrás, y eso es lo que
lo hace defendible: cualquier descarte se comprueba mirando la foto.

| Señal | Cómo | Qué detecta |
|---|---|---|
| Nitidez | Varianza del laplaciano por baldosas, percentil 90 | Movidas y desenfocadas |
| Exposición | Luma media, píxeles pegados al blanco y al negro | Oscuras y quemadas |
| Color | Relación entre el canal rojo y el azul | Luz de bombilla |
| Resolución | Lado menor | No aguanta una story a pantalla completa |
| Proporción | Recorte perdido al pasar al formato destino | Horizontales que no entran en vertical |
| Repetidas | dHash de 256 bits **y** firma de color 4×4 | Ráfagas del mismo plano |

Tres decisiones que importan:

- **El contraste se estira antes de medir la nitidez.** Sin eso, una foto oscura pero
  perfectamente enfocada sale marcada como movida, porque la penumbra aplana las
  diferencias entre píxeles vecinos. Nitidez y exposición son problemas distintos.
- **El umbral de nitidez es relativo a la propia carpeta**, no fijo. Lo que en el
  carrete de un móvil viejo es normal, en uno bueno es una foto movida. Se compara
  cada foto con la mediana de sus compañeras, que es lo que hace el ojo al pasar el
  carrete. Con menos de cinco fotos se cae a un suelo absoluto.
- **Para considerar dos fotos la misma toma tienen que coincidir en estructura Y en
  color.** Sólo con la huella estructural, el plato con luz de día y el mismo plato
  con luz de bombilla se agrupan como repetidos, cuando en realidad uno vale y el
  otro no.

## Lo que NO hace, a propósito

No elige la foto buena. No sabe si la mesa está sin recoger, si sale gente
reconocible o si se ve la marca de la competencia al fondo. Eso es criterio, y el
argumento de venta es justamente ése: **la máquina tira la basura, la foto buena la
elige ella.** No prometas más de lo que hay.

Los umbrales están todos juntos en el diccionario `UMBRAL`, al principio del script.
