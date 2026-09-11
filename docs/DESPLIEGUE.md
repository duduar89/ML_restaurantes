# Poner Caudal en marcha en tu hosting

Caudal es una web estática: archivos sueltos que el servidor entrega tal cual.
No necesita base de datos, ni Node en el servidor, ni nada que mantener. Tus
gastos viven en tu móvil, no en el hosting.

Eso significa que en cPanel es de las cosas más fáciles de publicar. Pero hay
**un requisito que no es opcional**: tiene que ir por HTTPS. Sin certificado, el
navegador no registra el service worker, y sin él no hay modo sin conexión ni se
puede instalar en la pantalla de inicio. Por eso el SSL va antes que la subida.

---

## 1. Activa el SSL primero

En cPanel: **Seguridad › SSL/TLS Status** → selecciona el dominio (o
subdominio) → **Run AutoSSL**.

Espera a que aparezca el candado verde. Suele tardar entre un minuto y unas
horas si el dominio es nuevo. Comprueba que `https://tudominio.com` abre sin
avisos antes de seguir.

> Si vas a usar un subdominio tipo `gastos.tudominio.com`, créalo antes en
> **Dominios › Subdominios** y lánzale AutoSSL a él.

## 2. Compila la app en tu ordenador

Necesitas [Node.js](https://nodejs.org) 22.12 o superior. Se instala una vez.

```bash
npm install     # sólo la primera vez
npm run pack
```

Eso genera **`caudal.tar.gz`** en la carpeta del proyecto. Dentro va todo lo que
el servidor necesita, incluido el `.htaccess` con la configuración de Apache.

## 3. Súbelo

En cPanel: **Archivos › Administrador de archivos**.

1. Entra en la carpeta donde vive el dominio. Normalmente **`public_html`**; si
   es un subdominio, será `public_html/gastos` o similar (cPanel te lo dice al
   crearlo).
2. Si hay una página de bienvenida de serie (`index.html`, `default.html`),
   bórrala.
3. **Cargar** → sube `caudal.tar.gz`.
4. Vuelve al administrador, clic derecho sobre el archivo → **Extract**.
5. Borra `caudal.tar.gz`, que ya no hace falta.

Debe quedarte así, con los archivos **directamente** en la carpeta, no dentro de
otra carpeta:

```
public_html/
  .htaccess
  index.html
  manifest.webmanifest
  sw.js
  assets/
  fonts/
  icon-192.png  …
```

> **Si no ves `.htaccess`**, el administrador está ocultando los archivos que
> empiezan por punto: **Configuración** (arriba a la derecha) → marca *Show
> Hidden Files*. Sin ese archivo la app cargará, pero al abrir un enlace directo
> dará 404.

### Alternativa por FTP

Si prefieres FTP (FileZilla y las credenciales de **Archivos › Cuentas FTP**),
arrastra **el contenido** de `dist/` a `public_html/`. Asegúrate de que el
cliente FTP muestre los archivos ocultos, o se dejará el `.htaccess`.

## 4. Fuerza HTTPS

Ahora que el certificado funciona, edita `public_html/.htaccess` (clic derecho →
**Edit**) y **descomenta el bloque 5** quitando las almohadillas:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} !=on
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

Así quien entre por `http://` acaba en `https://` y la app funciona siempre.

## 5. Compruébalo

Abre `https://tudominio.com` **en el móvil** y repasa:

- [ ] Se ve la pantalla de inicio con el icono de la vasija.
- [ ] Al escribir la dirección con una ruta detrás —`https://tudominio.com/apartados`—
      carga la pantalla de apartados y **no** un error 404.
- [ ] `https://tudominio.com/add?importe=1,50&concepto=Prueba` abre la pantalla
      de confirmación con 1,50 €. Este es el enlace que usan los atajos del
      móvil: si funciona, la automatización de la tarjeta funcionará.
- [ ] Puedes añadirla a la pantalla de inicio (en iPhone: Compartir → *Añadir a
      pantalla de inicio*; en Android suele salir un aviso solo).
- [ ] Abierta ya instalada, pon el móvil en modo avión y ábrela: tiene que
      seguir funcionando.

**Instálala de verdad, no la dejes en una pestaña.** iOS borra los datos de los
sitios que sólo viven en una pestaña tras unos días sin usarlos. Instalada se
libra de esa limpieza. Y aun así, guarda copia de vez en cuando desde Ajustes.

---

## Que se suba solo (recomendado)

Lo de arriba lo haces una vez para verlo funcionando. Después no tiene sentido
repetirlo a mano: hay un flujo que compila y sube por FTPS en cada cambio, y ya
viene en el repositorio (`.github/workflows/deploy-cpanel.yml`).

**Configuración, una sola vez:**

1. **Crea una cuenta FTP dedicada.** cPanel › *Archivos › Cuentas FTP* → nueva
   cuenta, y en *Directorio* pon la carpeta del sitio (`public_html`).

   No uses la cuenta principal de cPanel. Si algún día ese secreto se filtrase,
   con una cuenta limitada quien lo tuviera solo podría tocar esa carpeta; con
   la principal, tendría el hosting entero.

2. **Guarda las credenciales en GitHub.** En el repositorio: *Settings › Secrets
   and variables › Actions*.

   En la pestaña **Secrets**:

   | Nombre | Valor |
   |---|---|
   | `FTP_HOST` | `ftp.tudominio.com` (cPanel te lo dice al crear la cuenta) |
   | `FTP_USER` | el usuario completo, normalmente `usuario@tudominio.com` |
   | `FTP_PASSWORD` | la contraseña de esa cuenta |

   En la pestaña **Variables**:

   | Nombre | Valor |
   |---|---|
   | `CPANEL_DEPLOY` | `true` |

   Esa última es el interruptor: sin ella el flujo se salta solo, para que no
   falle en rojo si algún día dejas de usar cPanel.

3. Ya está. A partir de aquí, cada cambio en `main` compila, pasa las pruebas y
   sube. Si algo falla, **no sube nada**: las pruebas van antes.

**Con un subdominio no hay que configurar nada más.** La cuenta FTP queda
enjaulada en su carpeta, así que al conectarse `/` ya es el sitio, y como la app
vive en la raíz de su propio host, `BASE_PATH` se queda en `/`.

**Sólo si lo pones en una subcarpeta** de un dominio que ya existe hacen falta
dos variables más: `REMOTE_DIR` con `/public_html/gastos` y `BASE_PATH` con
`/gastos/`.

**Si la subida falla con un error de certificado**, tu hosting sirve FTPS con un
certificado que no valida. Añade la variable `FTP_VERIFY_CERT` con valor `false`
y volverá a funcionar. Ten en cuenta lo que eso significa: la conexión sigue
cifrada, pero deja de comprobarse que el servidor al otro lado es quien dice
ser. Antes de bajar esa guardia, prueba a poner en `FTP_HOST` el nombre real del
servidor que aparece en cPanel, que suele tener certificado válido.

---

## Publicar una versión nueva

```bash
git pull
npm install
npm run pack
```

Sube y extrae igual que antes, sobrescribiendo. No hace falta borrar nada: los
archivos de `assets/` llevan un hash en el nombre, así que los nuevos conviven
con los viejos sin pisarse.

Quien ya tenga la app abierta verá un aviso de **«Nueva versión disponible»** con
un botón para actualizar. No se recarga sola a propósito: si lo hiciera mientras
estás tecleando un importe, lo perderías.

## Si lo pones en una subcarpeta

Para publicarlo en `tudominio.com/gastos/` en vez de en la raíz, compila
diciéndole dónde va a vivir:

```bash
BASE_PATH=/gastos/ npm run pack
```

En Windows (PowerShell):

```powershell
$env:BASE_PATH="/gastos/"; npm run pack
```

Es imprescindible: de ese prefijo dependen las rutas de los archivos, el alcance
del service worker y la dirección de instalación. Sin él, la app instalada no
encuentra nada.

---

## Si algo va mal

**Sale un 404 al abrir cualquier ruta que no sea la raíz**
Falta el `.htaccess` o el hosting no tiene `mod_rewrite`. Comprueba que el
archivo está ahí (activando *Show Hidden Files*). Si está y sigue fallando,
pregunta a tu hosting si `AllowOverride` permite reescrituras en tu cuenta.

**La app carga pero no se puede instalar**
Casi siempre es el SSL. Compruébalo en el móvil: la dirección tiene que ir por
`https://` y sin avisos. También puede ser que Apache esté entregando el
`manifest.webmanifest` como texto plano; el bloque 2 del `.htaccess` lo
arregla, así que confirma que el archivo está subido entero.

**Sigo viendo la versión antigua después de actualizar**
Toca **Actualizar** en el aviso que sale dentro de la app. Si no aparece, cierra
la app del todo y vuelve a abrirla. Si aun así persiste, comprueba que el bloque
3 del `.htaccess` está presente: es el que impide que el navegador se quede con
una copia vieja de `sw.js`.

**Se ven cuadrados en vez de letras**
No se subió la carpeta `fonts/`. Vuelve a extraer el paquete completo.

---

## ¿Y si no quieres usar cPanel?

El repositorio trae un flujo que publica solo en GitHub Pages: gratis, con
HTTPS incluido y sin subir nada a mano ni configurar credenciales. Es la vía
más rápida para verlo funcionando hoy mismo, y son dos pasos:

1. **Settings › Pages › Source: GitHub Actions**
2. **Settings › Secrets and variables › Actions › Variables** → añade
   `PAGES_DEPLOY` con valor `true`

Quedará en `https://duduar89.github.io/ML_restaurantes/`. El `BASE_PATH` lo pone
el propio flujo, no tienes que tocar nada.

Cloudflare Pages y Netlify funcionan igual de bien y también conectan con el
repositorio: se compila solo en cada cambio. Con cPanel tienes control total y
tu propio dominio; con estos te ahorras el paso manual. Las tres opciones sirven
para lo mismo.
