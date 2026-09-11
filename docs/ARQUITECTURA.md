# Caudal — Documento de arquitectura y decisiones de producto

**Versión 1.0 · 11 de septiembre de 2026 · Documento de construcción (build spec)**
Este documento es normativo. Cada decisión está tomada: donde había dos opciones, aquí sólo queda una. Las rutas de archivo, las versiones y los hex son exactos y deben respetarse tal cual.

---

## 1. Resumen ejecutivo

Construimos **Caudal**, una PWA móvil en React para controlar gastos personales, 100 % local-first (IndexedDB, funciona sin red, sin cuenta y sin servidor). La entrada mínima es importe + método de pago + concepto, con fecha automática y categoría adivinada: objetivo de alta **en menos de 5 segundos y sin scroll**, con teclado numérico propio porque el nativo de iOS corrompe la coma decimal en español. Los **apartados** (Vida, viajes, proyectos) son un eje propio, ortogonal a la categoría: separan el gasto de un viaje del día a día, con presupuesto y rango de fechas opcionales. Encima va un módulo de análisis con seis gráficas SVG hechas a mano (0 kB de librería) y una marca oscura, tabular y muy vistosa. Sobre el NFC: **una página web no puede, ni podrá, interceptar un pago contactless** — lo que sí se puede es capturar el aviso del banco mediante automatizaciones del sistema (Atajos de iOS / MacroDroid) y, más adelante, leer el extracto real vía open banking con un proxy serverless.

---

## 2. Marca

### 2.1 Nombre y voz

| Campo | Valor |
|---|---|
| Nombre | **Caudal** |
| Slug / dominio / id | `caudal` (sin acentos, sirve para URL, archivos y `manifest.id`) |
| `short_name` | `Caudal` (6 caracteres: Android e iOS truncan a ~12) |
| Tagline | **Tu dinero, en movimiento** |
| Descripción | «Control de gastos personales. Apunta en segundos, separa por apartados y mira a dónde va tu dinero.» |
| Apartados (feature) | **Apartados** en la interfaz. `Cauce`/`Cauces` queda descartado como etiqueta de usuario: es bonito pero no se entiende sin explicación. |

**Por qué Caudal.** La RAE recoge dos acepciones vivas simultáneas: «cantidad de agua que mana o corre» y, en la acepción 4, «hacienda, bienes de cualquier especie, y **más comúnmente dinero**». Una sola palabra española que significa a la vez *flujo* y *dinero* es exactamente lo que es una app de gastos. Dos sílabas, seis letras, sin tilde, pronunciación inequívoca en español, y no existe ninguna app de finanzas conocida con ese nombre. De ahí sale todo el vocabulario del producto: entradas, salidas, apartados por los que fluye.

*Descartados:* Hucha y Nido (semántica de ahorro, no de gasto), Vaivén (tilde → fricción en dominios y handles), Mochila (demasiado codificado a viaje), Rumbo (OTA española existente), Monto (colisión fonética con Monzo/Monarch), Saldo/Gastos (genéricos e irregistrables), Tarro (jerga).

Única fuente de verdad del nombre y del color de marca: **`src/brand/brand.ts`**. Ni el manifiesto ni el logo ni la interfaz escriben un literal de marca fuera de ese archivo.

### 2.2 Logo — «la moneda con caudal»

Un aro (moneda) relleno hasta un nivel por una onda. **El nivel es un dato**: se le pasa `level` (0–1) y muestra la fracción de presupuesto consumida, así que la misma pieza es icono de la app *y* componente de datos dentro de ella. No usamos espiral ni remolino: un remolino de dinero se lee como dinero yéndose por el desagüe. No usamos tres barras ascendentes: es el cliché de gráfico.

Implementación: **`src/brand/Logo.tsx`**. Geometría exacta, `viewBox="0 0 48 48"`:

- Aro: `<circle cx="24" cy="24" r="17" fill="none" stroke="url(#g)" stroke-width="4"/>` → ocupa de x=7 a x=41.
- Onda: `M4 {y}q5-5 10 0t10 0t10 0t10 0V48H4Z`. El comando `t` (cuadrática suave) refleja automáticamente cada punto de control y produce una onda alternante real en una cadena mínima. Abarca x=4→44 (siempre cubre el aro de lado a lado), amplitud ±2,47 px, cuatro crestas.
- Recorte: `<clipPath id="c"><circle cx="24" cy="24" r="17"/></clipPath>` aplicado a la onda.
- Orden de pintado: **primero el caudal, encima el aro**. Al revés el trazo del aro se ve a través del relleno en los costados.
- Degradado: `<linearGradient x1="0" y1="0" x2="1" y2="1">` de `#35e0f5` a `#7b5cff`, `opacity="0.92"` en la onda.

**Mapa nivel → y.** No es regla de tres: en un círculo el mismo escalón de altura tapa más área por el centro. Anclajes (interpolación lineal entre ellos, error < 1 px):

```
0.00→41   0.15→33.9   0.25→30.9   0.50→24.0
0.61→21.0 0.75→17.1   0.90→12.3   1.00→7
```

**Variantes.**
- *Monocroma*: `flat` → sustituye el degradado por `currentColor` (8 líneas).
- *Favicon 32–64 px* (`public/favicon.svg`, `public/favicon-64.png`): plano `#7b5cff`, `stroke-width="5"`, nivel 0,61. Un degradado de dos paradas se emborrona a gris por debajo de 24 px.
- *Icono PWA 512 maskable* (`public/icon-512-maskable.png`): marca al 40 % centrada sobre `#0a0912`; queda dentro de la zona segura del 80 %. **Entrada separada en el manifiesto** — declarar `purpose: "any maskable"` en el icono normal hace que Android lo recorte.
- *apple-touch-icon 180* (`public/apple-touch-icon-180.png`): PNG **opaco**. iOS ignora los maskable y compone la transparencia sobre negro.
- Todos se generan con `npm run icons` → **`scripts/generate-icons.mjs`** (sharp 0.35.4).

**Clamp obligatorio:** mostrar el nivel sólo entre 0,08 y 0,92. Fuera de ese rango las crestas chocan con el aro y la marca deja de leerse como moneda; el número real va en texto al lado.

### 2.3 Paleta

Oscuro primero. **La profundidad se señala con luminancia, no con sombras**: sobre un lienzo casi negro una sombra sólo produce barro gris; lo que da relieve es el escalón de claridad más una línea de 1 px. Todo vive en **`src/styles/tokens.css`**; ningún componente escribe un hex.

**Lienzo (oscuro)**

| Token | Hex | Uso |
|---|---|---|
| `--bg-inset` | `#07060d` | hundido, fondo de campos |
| `--bg` | `#0a0912` | lienzo base |
| `--surface-solid` | `#131221` | tarjetas, filas |
| `--bg-elevated` | `#16142b` | hojas |
| `--surface-2` | `#1c1a2e` | superficie elevada, pista de gráficas |
| `--surface-3` | `#2a2740` | separadores fuertes |
| `--border` | `rgba(244,242,255,.07)` | línea de 1 px |

**Texto (oscuro)** — contraste verificado contra `--bg`:

| Token | Hex | Ratio |
|---|---|---|
| `--text` | `#f4f2ff` | 17,90 |
| `--text-muted` | `#a9a4c7` | 8,32 |
| `--text-faint` | `#8b86ae` | 5,77 (4,95 sobre `#1c1a2e`) |
| `--text-on-brand` | `#0a0912` | 4,54 sobre `#7b5cff` |

**Marca y semánticos (oscuro)**

| Token | Hex | Nota |
|---|---|---|
| `--brand-500` | `#7b5cff` | **sólo relleno**, nunca texto de párrafo |
| `--brand-400` / `--brand-300` | `#9b84ff` | violeta **como texto** (6,73) |
| `--brand-600` | `#5b3ee0` | estado pulsado |
| `--accent-500` | `#35e0f5` | acento de datos (12,38) |
| `--positive` | `#2fd98f` | ingreso (10,79) |
| `--warning` | `#ffb020` | aviso (10,83) |
| `--danger` | `#ff5c7a` | exceso (6,66) |
| `--brand-gradient` | `linear-gradient(135deg,#35e0f5 0%,#7b5cff 100%)` | logo, cifra héroe, FAB |

**Tema claro** (`:root[data-theme='light']`) — los semánticos oscuros **no valen** sobre blanco (el verde da 1,75): van oscurecidos.

| Token | Hex |
|---|---|
| `--bg` | `#faf9ff` |
| `--surface-solid` | `#ffffff` |
| `--surface-2` | `#f2f0fb` |
| `--surface-3` | `#e4e1f2` |
| `--text` | `#14121f` (17,66) |
| `--text-muted` | `#54507a` (7,15) |
| `--brand-500/400/300` | `#5b3ee0` (6,25; blanco encima 6,54) |
| `--text-on-brand` | `#ffffff` |
| `--positive` | `#0a7f4e` (4,82) |
| `--danger` | `#c41f44` (5,53) |
| `--warning` | `#8a5600` (5,88) |
| `--accent-500` | `#06788c` (4,92) |

**Dos fallos reales corregidos y no negociables:** blanco sobre `#7b5cff` da **4,36 y no pasa AA** → la tinta sobre marca es `#0a0912`. Y `#7c77a0` como texto tenue da **4,05 sobre `#1c1a2e`** → se sube a `#8b86ae`.

**Hues por apartado** (`spaceGradients`, índice 0–7, todos ≥ 4,5 sobre `--bg`): `#7b5cff` · `#35e0f5` · `#2fd98f` · `#ffb020` · `#ff8a5c` · `#ff5cc8` · `#b8e62f` · `#5c8cff`.

**Malla del héroe** (sólo en la cabecera de Hoy, en ningún otro sitio):
```css
background:
  radial-gradient(60% 80% at 15% 0%, rgba(123,92,255,.28), transparent 60%),
  radial-gradient(50% 70% at 90% 10%, rgba(53,224,245,.20), transparent 65%),
  var(--bg);
```

### 2.4 Tipografía

**Space Grotesk** (display, pesos 500/700) + **Inter** (cuerpo y cifras, 400–800), vía Google Fonts con `preconnect`, declarado en `index.html`, y cacheadas por Workbox (`CacheFirst`, 1 año) para que el modo avión rinda igual.

Regla dura: **Space Grotesk sólo de 22 px para arriba.** Sus cifras no son fiablemente tabulares y sus formas anchas destrozan la densidad en texto pequeño.

La clase `.num` se aplica a **toda** cifra de dinero, fecha, porcentaje y eje:

```css
.num{
  font-family:Inter,system-ui,sans-serif;
  font-variant-numeric:tabular-nums slashed-zero;
  font-feature-settings:"tnum" 1,"zero" 1;
  letter-spacing:-.01em;
  font-variant-ligatures:none;
}
```
Sin `tnum` los importes bailan al animarse y las columnas no alinean.

| Token | Fuente / peso | Tamaño · interlínea · tracking | Uso |
|---|---|---|---|
| `--text-display` | Space Grotesk 700 | 3.25rem · 1.0 · −0.03em | cifra héroe |
| `--text-3xl` | Space Grotesk 700 | 2.25rem · 1.15 · −0.02em | títulos de pantalla |
| `--text-xl` | Space Grotesk 500 | 1.375rem · 1.25 · −0.01em | secciones, nombre de apartado |
| `--text-base` | Inter 400 | 1rem · 1.5 | cuerpo |
| `--text-sm` | Inter 400 | .875rem · 1.4 | comercio, fecha, categoría |
| `--text-xs` | Inter 500 | .75rem · 1.35 · +0.02em | chips, pestañas, ejes |

Campos de texto a **17 px mínimo** (no 16): iOS mide el tamaño *computado* tras transformaciones y hace zoom por debajo de 16. No se arregla con `maximum-scale=1` — eso rompe el pinch-zoom y es un fallo de accesibilidad.

Formato de moneda: `Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',useGrouping:'always'})`, instanciado **una sola vez a nivel de módulo** en `src/lib/money.ts`. `useGrouping:'always'` es obligatorio porque es-ES omite el separador de miles a 4 dígitos (`1234,50 €`) pero lo pone a 5 (`12.345,67 €`), y una columna que cambia de formato a mitad de lista es un bug visual. Ojo: el espacio antes del € es **U+00A0**, no U+0020 — rompe comparaciones ingenuas en tests y CSV.

### 2.5 Tokens de diseño

**Radios:** `--r-xs 8` (chips) · `--r-sm 12` (inputs) · `--r-md 16` (filas, tarjetas) · `--r-lg 22` (paneles, apartados) · `--r-xl 28` (hojas, héroe) · `--r-full 9999`. Anidar bien: radio interior = radio exterior − padding.

**Espaciado**, base 4: `4 8 12 16 20 24 32 40 48`. Margen de pantalla 20 px; padding de tarjeta 16 (20 en héroe); fila de lista 14 px vertical → 48 px de alto (por encima del mínimo táctil de 44); separación de sección 32.

**Elevación:**
```css
--shadow-sm: none;
--shadow-md: 0 8px 24px -8px rgba(0,0,0,.55), inset 0 1px 0 0 rgba(255,255,255,.05);
--shadow-lg: 0 20px 48px -12px rgba(0,0,0,.7), inset 0 1px 0 0 rgba(255,255,255,.07);
--shadow-brand: 0 8px 32px -8px rgba(123,92,255,.45);   /* sólo el FAB */
```
El brillo interior de 1 px arriba es lo que realmente vende profundidad en oscuro.

**Cristal (`backdrop-filter`): exactamente dos superficies** — barra inferior y cabecera pegajosa. Nunca en tarjetas: cada capa de cristal fuerza una capa de composición y sobre una lista de 500 filas tira frames en Android medio. Siempre con `@supports not (backdrop-filter: blur(1px))` → fondo opaco.

**Movimiento:** `--ease-out: cubic-bezier(.2,.8,.25,1)`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)`; `--dur-fast 120ms`, `--dur 220ms`, `--dur-slow 420ms`. Se gasta animación en **tres cosas**: la cifra que cuenta al cargar, el nivel del logo al cambiar el presupuesto, y el muelle de la hoja de alta. Todo lo demás es instantáneo. Bloque global de `prefers-reduced-motion: reduce` en `src/styles/base.css`.

**Barra inferior:** `--tabbar-h: 68px`, `padding-bottom: calc(12px + env(safe-area-inset-bottom,0px))`. Nunca el `env()` a pelo: devuelve 0 en Safari con barra y hay builds de iOS donde devuelve 0 también en standalone.

**Seis reglas que separan premium de amateur** (escribirlas en el PR template):
1. Profundidad = luminancia, no sombra.
2. Un solo elemento violeta por pantalla. Los acentos saturados viven en datos y glifos, nunca como relleno de botón.
3. Bandas, no fundidos. Única excepción: la malla del héroe.
4. Una sola cifra domina. Las demás, tabulares y calladas.
5. La animación explica algo o no existe.
6. Cifras tabulares siempre, sin excepciones.

---

## 3. Arquitectura técnica

### 3.1 Stack exacto

Node **≥ 22.12.0** (Vite 8 declara `engines ^20.19.0 || >=22.12.0`; 22.0–22.11 falla). El entorno actual corre 22.22.2. `.nvmrc` = `22.12.0`, mismo valor en CI.

```jsonc
// dependencies
"react":              "^19.3.0",
"react-dom":          "^19.3.0",
"react-router":       "^7.18.3",   // paquete `react-router`, NO react-router-dom
"dexie":              "^4.4.6",
"dexie-react-hooks":  "^4.4.0",

// devDependencies
"vite":               "^8.3.0",
"@vitejs/plugin-react":"^6.1.1",   // peer vite ^8 EXACTO; Oxc, ya no Babel
"vite-plugin-pwa":    "^1.3.0",
"workbox-build":      "^7.4.1",    // peer NO opcional
"workbox-window":     "^7.4.1",    // sin él no resuelve virtual:pwa-register/react
"typescript":         "^7.0.2",
"vitest":             "^5.0.0",    // la 5 es la que peera vite ^8
"@types/react":       "^19.3.0",
"@types/react-dom":   "^19.3.0",
"@types/node":        "^22.20.2",
"sharp":              "^0.35.4",   // generación de iconos
"playwright":         "^1.63.0"    // capturas del manifiesto
```

**Dependencias de runtime totales: cinco.** Cero librería de gráficas, cero librería de animación, cero librería de fechas, cero librería de dinero, cero framework CSS. Justificación en §6 y §4.

`build` = `tsc --noEmit && vite build`: Vite/Oxc transpila, `tsc` sólo verifica tipos. TS 7.0 es el compilador nativo en Go (~10× más rápido); su hueco conocido —no hay API programática estable hasta 7.1— no nos afecta porque aquí `tsc` es una invocación de CLI.

**Router:** react-router 7.18.3 en **modo declarativo** (`<BrowserRouter>` + `<Routes>`). Ni modo framework (añade un build con forma de SSR que no queremos) ni modo data (los loaders no pintan nada cuando todo el dato es IndexedDB local). Nada de router de hash propio: se pierden restauración de scroll, layouts anidados y corrección del botón atrás.

### 3.2 Estructura de carpetas

```
/
├── index.html                      metas de iOS, fuentes, anti-flash de tema
├── vite.config.ts                  base, alias @, VitePWA (manifiesto + workbox)
├── tsconfig.json                   strict, paths @/* → src/*
├── scripts/generate-icons.mjs      sharp: 192/512/512-maskable/180/64/favicon
├── public/                         iconos + screenshots/{inicio,apartados,analisis}.png
└── src/
    ├── main.tsx                    siembra → render; registra persistencia
    ├── app/
    │   ├── App.tsx                 rutas + TabBar + AddSheet + UpdatePrompt
    │   ├── App.css
    │   └── store.tsx               contexto de catálogos (spaces/methods/categories/settings)
    ├── brand/ brand.ts · Logo.tsx
    ├── styles/ tokens.css · base.css · forms.css
    ├── db/
    │   ├── types.ts                Syncable, Space, PaymentMethod, Category, Expense, Settings
    │   ├── db.ts                   Dexie('caudal-db') v1 + now()
    │   ├── repo.ts                 ÚNICA puerta de acceso a datos
    │   └── seed.ts                 catálogos iniciales + apartado "Vida"
    ├── lib/
    │   ├── money.ts  dates.ts  analytics.ts  id.ts  keypad.ts  storage.ts
    │   └── __tests__/{money,dates,analytics}.test.ts
    ├── hooks/ useExpenses.ts · useHaptics.ts
    ├── components/
    │   ├── TabBar · Sheet · Keypad · Chips · ExpenseList · Toast
    │   ├── MonthSwitcher · UpdatePrompt
    │   └── charts/ ChartFrame · Bars · TrendLines · Donut · RankList
    │                · CalendarHeat · Sparkline · ProgressBar · charts.css
    └── features/
        ├── home/      HomeScreen
        ├── add/       AddSheet · guessCategory.ts
        ├── spaces/    SpacesScreen · SpaceScreen · SpaceCard · SpaceSheet
        ├── stats/     StatsScreen
        ├── settings/  SettingsScreen · ImportSection · AutomationGuide
        │              · backup.ts · useInstall.ts
        ├── capture/   DeepLinkCapture · parseCapture.ts  (/add y /compartir)
        └── import/    norma43.ts                          (extracto bancario)
```

Alias único: `@` → `./src`, definido en `vite.config.ts` y en `tsconfig.json`.

### 3.3 Capa de datos

**Dexie 4.4.6 sobre IndexedDB.** No localStorage (5 MiB, síncrono, igual de desalojable: no compra durabilidad y sí jank en el hilo principal) y no `idb` a pelo (sin migraciones, sin reactividad, sin versión desde mayo de 2025). Dexie cuesta 29,5 kB gzip y trae las tres cosas que de otro modo escribiríamos mal: versionado declarativo con `upgrade()`, `liveQuery` para que cada total se recalcule solo, y un camino de sincronización futuro que no obliga a reescribir consultas.

**Regla arquitectónica dura: ningún componente importa `db`.** Todo el acceso pasa por `src/db/repo.ts`, que devuelve objetos de dominio. Esa regla es lo que hace el motor sustituible; sin ella, «somos agnósticos al backend» es una frase.

`liveQuery` **no** reemite en cada escritura. Dexie construye claves de observación `idb://caudal-db/<tabla>/<índice>` con rangos, y sólo re-ejecuta si los rangos de la mutación solapan con los observados. Consecuencia práctica: **las consultas de mes tienen que ser un rango indexado** (`where('[deletedAt+day]').between(...)`). Si alguien escribe `db.expenses.toArray()` y filtra el mes en JS, observa toda la tabla y cualquier alta en cualquier mes invalida todas las gráficas. Ese es el footgun real, no la identidad del array.

**Durabilidad.** `navigator.storage.persist()` se llama **después de la primera escritura real** (máxima señal de interacción), no al cargar: `src/lib/storage.ts`. Safari y Chromium lo resuelven por heurística sin preguntar. Pero el mecanismo de verdad en iOS es **instalar en la pantalla de inicio**: la purga de WebKit a los 7 días de uso de Safari sin interacción no se aplica a las web apps instaladas, que llevan su propio contador. Y ni con eso se salta la copia: `navigator.storage.estimate()` sólo existe desde iOS 17 (`persist()` desde 15.2), así que se detectan por separado.

### 3.4 Service worker y PWA

`registerType: 'prompt'`, `strategies: 'generateSW'`. **Nunca `autoUpdate`**: fuerza `skipWaiting`+`clientsClaim` y recarga la pestaña al desplegar — en una app de formularios eso es perder el importe a medio teclear. Además migrar de `autoUpdate` a `prompt` en producción deja instalaciones rotas. Se elige `prompt` el día uno y no se toca.

- `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`. Por defecto Workbox sólo coge css/js/html: sin png/svg la app dice «lista sin conexión» y luego aparece sin iconos. Fallo silencioso que sólo se ve en modo avión.
- `navigateFallback: \`${base}index.html\``, `cleanupOutdatedCaches: true`, `clientsClaim:false`, `skipWaiting:false`.
- `manifest.id = \`${base}?app=caudal\`` **explícito**: si algún día cambia `start_url`, el navegador actualiza la app instalada en vez de instalar una segunda. Sin `id`, `id` = `start_url` y cualquier cambio de ruta huerfaniza la instalación.
- `display_override: ['standalone','minimal-ui']`. `window-controls-overlay` es sólo de escritorio: aquí no pinta nada.
- Tres capturas `form_factor:'narrow'` a 1080×1920, misma proporción, con `label`. Chrome Android ignora las `wide` desde la 109 y descarta en silencio las que violen las restricciones (320–3840 px, dimensión máxima ≤ 2,3× la mínima) — verificar en DevTools → Application → Manifest.
- Actualización: `useRegisterSW` de `virtual:pwa-register/react` en `src/components/UpdatePrompt.tsx`. Copy: «Nueva versión disponible» / **Actualizar** / *Ahora no*, y «La app ya funciona sin conexión» en `offlineReady`. El sondeo periódico va **guardado**: comprobar `navigator.onLine` y hacer un `fetch` de la URL del SW con `cache:'no-store'` antes de llamar a `update()`. El snippet ingenuo se rompe justo en el caso común de una app offline-first.

### 3.5 Hosting

**Cloudflare Workers con Static Assets.** No Cloudflare Pages: la propia documentación de Cloudflare muestra hoy en cada página de Pages el aviso «*Are you sure you want to use Pages? Start new projects with Workers*». Workers Static Assets da lo mismo que hacía atractivo a Pages —peticiones de assets estáticos gratis e ilimitadas, sin facturación por egreso, HTTPS automático, red de 330+ ciudades— y es donde va todo el desarrollo nuevo. Única pega nueva: el dominio propio debe tener sus nameservers en Cloudflare.

Correcciones a la creencia habitual, importantes para no planificar mal:
- **Netlify ya no da 100 GB.** Desde el 4-sep-2025 toda cuenta nueva es de créditos: Free = 300 créditos/mes y el ancho de banda cuesta 20 créditos/GB → **~15 GB**, y esos mismos créditos los consumen cómputo, peticiones y despliegues. Los 100 GB son sólo para cuentas anteriores a esa fecha.
- **GitHub Pages no admite cabeceras HTTP ni reglas de reescritura.** Nada. Eso implica: enrutado profundo sólo con el truco de `404.html` (que devuelve un 404 real) o hash router; imposible fijar COOP/COEP, CSP, `Cache-Control` o `Service-Worker-Allowed`; e imposible corregir un MIME de manifiesto equivocado. Además, publicar desde un repo **privado** exige GitHub Pro — justo lo contrario de lo que quiere una app de finanzas personales.

Si aun así se despliega en GitHub Pages, es obligatorio: `BASE_PATH=/caudal/`, `.nojekyll` vacío en la raíz publicada y copiar `dist/index.html` a `dist/404.html`. `vite.config.ts` ya lee `BASE_PATH` y propaga el prefijo a `base`, `scope`, `start_url`, `navigateFallback` y `share_target.action`.

Verificación final tras desplegar: `curl -I` sobre `manifest.webmanifest` y comprobar que el `Content-Type` es JSON.

---

## 4. Modelo de datos

Archivo normativo: **`src/db/types.ts`**. Base de datos: `caudal-db`, versión 1.

### 4.1 Base común

```ts
interface Syncable {
  id: string          // UUIDv7 (src/lib/id.ts)
  createdAt: number   // epoch ms — instante, UTC
  updatedAt: number   // epoch ms — last-write-wins para una sync futura
  deletedAt: number   // 0 = vivo. Borrado lógico SIEMPRE.
}
```

Tres decisiones que no se revisan:

- **UUIDv7, nunca autoincremento.** Es ordenable por tiempo (doble como índice de creación) y no colisiona entre dispositivos. Con clave autoincremental, la primera sincronización es una migración con pérdida.
- **Borrado lógico.** Un borrado duro es invisible para cualquier protocolo de sincronización y resucita filas. Matiz: los tombstones se conservan **hasta que todas las réplicas los hayan visto**, no eternamente; hoy, con un solo dispositivo y sin sync, el riesgo es cero y la columna es seguro barato.
- **`deletedAt === 0` en vez de `null`/`undefined`.** Dexie no indexa `undefined`; un 0 explícito mantiene el índice compuesto `[deletedAt+day]` utilizable, que es el índice que sostiene toda la app.

### 4.2 Entidades

**Expense**
| Campo | Tipo | Notas |
|---|---|---|
| `spaceId` | `string` | pertenece a **exactamente un** apartado |
| `amountCents` | `Cents` (`number`) | **siempre positivo** |
| `kind` | `'expense' \| 'income'` | el signo vive aquí, no en el importe |
| `concept` | `string` | texto libre |
| `methodId` | `string` | → PaymentMethod |
| `categoryId` | `string` | → Category (adivinada del concepto) |
| `day` | `DayKey` `'YYYY-MM-DD'` | **fecha civil local**, automática |
| `note` | `string` | |
| `source` | `'manual' \| 'automation' \| 'share' \| 'import'` | ver §7 |
| `externalId` | `string \| null` | huella del apunte bancario, para no duplicar |

**Dinero = céntimos enteros en un `number` plano.** `Number.MAX_SAFE_INTEGER` son 9,0 × 10¹³ €: margen infinito para un presupuesto personal. Los enteros indexan nativamente en IndexedDB (un objeto `Decimal`/`Dinero` no: habría que guardarlo como string y perder las consultas por rango), serializan a JSON sin pérdida y suman sin error. `0.1 + 0.2 === 0.30000000000000004`; un presupuesto que deriva céntimos es un presupuesto roto. Se redondea **una sola vez**, en el borde de entrada (`parseAmount`). Ni decimal.js ni dinero.js: resuelven una precisión arbitraria que con una sola moneda de dos decimales no tenemos. `splitEvenly()` en `money.ts` reparte el resto de forma determinista para las divisiones.

**Dos campos de fecha, deliberadamente.** `day` es una **fecha civil**: no tiene zona horaria. Un café en Madrid (UTC+2) a las 00:30 del día 5 tiene marca UTC 22:30 del día 4, así que cualquier `toISOString().slice(0,10)` lo archiva en el día y, en frontera de mes, en el presupuesto equivocados. La cadena `'YYYY-MM-DD'` ordena lexicográficamente, es indexable y es a la vez la clave de agrupación mensual. `createdAt` sí es un instante y va en epoch ms UTC. Nombres inequívocos: `day` vs `createdAt`, nunca «timestamp», y sólo el repositorio los construye.

**Nada de Temporal.** Según BCD 8.1.1, Safari iOS es `false` — no ha llegado al iPhone. En iOS todo navegador es WebKit, así que el soporte efectivo en el dispositivo primario es cero, y el polyfill pesa cientos de kB. Con `DayKey` como string ni siquiera hace falta date-fns: `src/lib/dates.ts` resuelve todo con slicing y `Intl.DateTimeFormat('es-ES')`.

**Space**
`name`, `emoji`, `colorIndex` (0–7), `kind: 'life' | 'trip' | 'project'`, `budgetCents` (0 = sin presupuesto), `startDay: DayKey | null`, `endDay: DayKey | null`, `isDefault: 0|1`, `archived: 0|1`, `sortOrder: number`.

Modelo: **un gasto pertenece a exactamente un apartado**. «Vida» es un apartado del sistema, siempre existe, es el `isDefault`, no se borra y no lleva fechas. Los viajes y proyectos llevan presupuesto y rango opcionales, lo que desbloquea anillo de presupuesto, días restantes y ritmo diario frente a la asignación diaria. Descartado: etiquetas / pertenencia múltiple, porque vuelve ambiguo todo total y hace que las sumas cuenten doble. Descartado: sobres tipo YNAB, que exigen un ritual mensual de asignación — altura equivocada para «importe + método + concepto».

**Autoselección de apartado:** si hoy cae dentro del rango de **exactamente un** apartado no-Vida, ése es el destino y la píldora de la hoja se muestra rellena; si hay cero o dos o más activos, el destino es Vida y la píldora va en contorno. Siempre visible, siempre a un toque del conmutador.

**PaymentMethod** — `name`, `kind: 'cash'|'card'|'transfer'|'bizum'|'other'`, `emoji`, `isDefault`, `archived`, `sortOrder`. Siembra: Tarjeta 💳 (por defecto), Efectivo 💵, Bizum 📲, Transferencia 🏦.

**Category** — `name`, `emoji`, `colorIndex`, `archived`, `sortOrder`. Siembra: Súper 🛒, Restaurantes 🍽️, Transporte 🚇, Casa 🏠, Ocio 🎬, Compras 🛍️, Salud 💊, Suscripciones 📺, Viaje ✈️, Otros ✨.

**Budget** no es una tabla. Es un campo: `Space.budgetCents` (+ rango) para viajes y proyectos, y `Settings.monthlyBudgetCents` para el día a día. Una entidad aparte obligaría a resolver a mano solapes y periodos sin aportar nada.

**Settings** — fila única `id:'settings'`: `monthlyBudgetCents`, `activeSpaceId`, `lastMethodId`, `onboardedAt`, `lastBackupAt`.

### 4.3 Índices de Dexie (v1, textual)

```ts
this.version(1).stores({
  expenses:   'id, day, spaceId, methodId, categoryId, createdAt, deletedAt, externalId, ' +
              '[spaceId+day], [deletedAt+day], [deletedAt+spaceId]',
  spaces:     'id, sortOrder, archived, isDefault, deletedAt',
  methods:    'id, sortOrder, archived, isDefault, kind, deletedAt',
  categories: 'id, sortOrder, archived, deletedAt',
  settings:   'id',
})
```

Los tres compuestos cubren las tres consultas reales: gastos de un apartado en un rango (`[spaceId+day]`), gastos vivos de un mes (`[deletedAt+day]`) y gastos vivos de un apartado (`[deletedAt+spaceId]`). Ninguna pantalla recorre la tabla entera.

**Migraciones:** el modelo de Dexie es aditivo. Se declara una `version(n)` nueva con **sólo** las tablas que cambian y su `upgrade()`; las funciones de upgrade se conservan mientras existan clientes antiguos. Esta es la zona de mayor riesgo de pérdida de datos de toda la app: ningún cambio de esquema entra sin su test de migración.

### 4.4 Copia de seguridad

`src/features/settings/backup.ts`. `BACKUP_SCHEMA_VERSION = 1`. Formato: `{ schemaVersion, exportedAt, tables: {...} }` incluyendo **ids, `updatedAt` y tombstones `deletedAt`** — si la restauración descarta los borrados lógicos, una sync futura resucita gastos borrados.

«Sin pérdida» hay que **construirlo y probarlo**, no se deduce de usar JSON: IndexedDB persiste con structured clone (preserva `Date`, `Map`, `BigInt`, `Blob`), y `JSON.stringify` no. Como aquí el dominio es sólo `number`/`string`/`boolean`, el round-trip es seguro **por diseño**, y hay un test que siembra → exporta → borra → importa → compara en profundidad. Cualquier campo nuevo que no sea primitivo obliga a definir su codificación explícita.

**Entrega del archivo:** cadena de tres escalones, en este orden.
1. `navigator.canShare?.({files:[f]})` → `navigator.share({files})`. **El `File` se construye ANTES de cualquier `await`**: iOS exige que `share()` se invoque de forma síncrona dentro del gesto.
2. `<a download>` con blob URL.
3. Textarea seleccionable con botón de copiar.

El escalón 3 no es paranoia: `<a download>` está documentado como roto **dentro de PWA instaladas en iOS**, que es exactamente el modo en que va a correr el usuario — un botón de copia que pasa las pruebas en una pestaña de Safari y falla en la app real. La File System Access API queda descartada de plano: `showSaveFilePicker`/`showOpenFilePicker` son `false` en Safari, iOS Safari **y** Firefox. OPFS tampoco es destino de copia: vive en el mismo origen, bajo la misma cuota, y muere con el mismo evento de desalojo.

**Restaurar:** `<input type="file" accept="application/json,.json">`, que funciona en todas partes incluida la PWA instalada en iOS.

**CSV es informe, nunca restauración**, y el botón lo dice. La razón correcta no es «el CSV no puede llevar ids» —claro que puede, son columnas— sino que un archivo plano no expresa varias tablas relacionadas y que Excel destroza ids largos, fechas y precisión en el round-trip. Incluimos igualmente la columna `id`, que es lo único que permite reconciliar una hoja editada contra la app.

Sobre el «CSV para Excel español», dos problemas **independientes**:
- *Codificación:* BOM UTF-8 al principio del Blob. Arregla los acentos en Excel para Windows; en Excel para Mac puede seguir fallando y la vía real es Datos → Obtener datos → Desde texto/CSV con origen 65001.
- *Delimitador:* Excel lo toma del **separador de listas de Windows**, no del idioma de la interfaz y no del contenido. Una web no puede leer ese ajuste — `navigator.language` da BCP-47 y nada más. Por tanto **no** deducimos `;` del idioma: `toCsv()` acepta el delimitador y Ajustes expone un selector («Separador: `,` / `;`», «Decimal: `.` / `,`») con valor inicial derivado de `navigator.language` pero **sobreescribible**, y se recuerda. Acoplamiento obligatorio: `;` sólo es correcto junto con decimales de coma.

**Aviso de copia:** `Settings.lastBackupAt`. Si han pasado más de 14 días *o* se han añadido más de 50 gastos desde la última exportación, banner no descartable-para-siempre con exportación a un toque. Todo lo demás en este documento reduce la *probabilidad* de perder datos; esto es lo único que acota el *daño* cuando ocurra igualmente.

---

## 5. IA y pantallas

### 5.1 Navegación

Barra inferior fija con **4 pestañas + FAB central elevado**. El FAB no es una pestaña: no navega, abre una hoja.

```
[ Hoy ]  [ Apartados ]  ( + )  [ Análisis ]  [ Ajustes ]
```

La base es empírica: el estudio de campo de Hoober (1.300+ usuarios) da 49 % de agarre a una mano y ~75 % de toques con el pulgar, con la franja inferior central como única zona de alcance cómodo y las esquinas superiores como zona inalcanzable. Por eso la acción que más se repite jamás va en una cabecera.

Reglas de shell, todas en `src/styles/base.css`: `height:100dvh` (nunca `100vh` — en iOS resuelve al viewport grande y la interfaz se desborda bajo la barra de URL), `touch-action: manipulation` global (mata el doble-toque-zoom y el retardo de 300 ms), `overscroll-behavior-y: contain` en los scrollers, y `viewport-fit=cover` con `env(safe-area-inset-*)` — los dos van juntos o `env()` devuelve 0.

**Rutas** (`src/app/App.tsx`):

| Ruta | Pantalla |
|---|---|
| `/` | Hoy — `src/features/home/HomeScreen.tsx` |
| `/apartados` | Lista de apartados |
| `/apartados/:spaceId` | Detalle de apartado |
| `/analisis` | Gráficas y comparativas |
| `/ajustes` | Ajustes |
| `/add` | Entrada de automatizaciones (Atajos / MacroDroid) |
| `/compartir` | Destino de `share_target` (Android) |
| `*` | Hoy |

Se descarta una pestaña `/historial` separada: el historial vive dentro de Hoy con el `MonthSwitcher`, que es donde el usuario ya está mirando. Cinco pestañas más FAB es una de más para un pulgar.

**Hojas** (`src/components/Sheet.tsx`): alta/edición de gasto, conmutador de apartado, alta/edición de apartado. Base `<dialog>` + `showModal()`: da capa superior, atrapado de foco, fondo inerte y Esc gratis, sin dependencia de focus-trap. **Cada hoja empuja una entrada de historial**, de modo que el botón atrás de Android y el gesto de borde de iOS la cierran en vez de salir de la app — los usuarios lo intentan de inmediato. Y como una PWA instalada en iOS no tiene botón atrás y el gesto de borde es inconsistente, **toda hoja lleva además un cierre visible ✕**, no sólo la de alta.

### 5.2 Pantalla por pantalla

**Hoy (`/`).** Cabecera con la píldora del apartado activo (toque → conmutador) sobre la malla del héroe. Cifra dominante: «restante» si el apartado activo tiene presupuesto, «gastado» si no — y **la unidad se rotula junto a la cifra**, porque el mismo número grande significando dos cosas distintas según el apartado es un fallo de lectura, no un ahorro de espacio. Debajo: `MonthSwitcher`, totales del mes, y la lista de gastos agrupada por día con cabecera pegajosa que lleva el total del día. Cada fila lleva exactamente cuatro elementos: glifo de categoría (24 px en círculo de 36 px teñido al 14 %), concepto, fecha + categoría en tenue, e importe `.num` alineado a la derecha. **Se colorea un solo lado**: el ingreso lleva `+` y `--positive`; el gasto se queda en `--text`. Colorear ambos convierte la lista en un árbol de Navidad.

**Apartados (`/apartados`).** Vida fijado arriba; luego los activos con barra de presupuesto y «quedan N días»; luego «Archivados» plegado. Pie: «+ Nuevo apartado». Archivar y **desarchivar** son ambos accesibles desde aquí.

**Detalle de apartado (`/apartados/:spaceId`).** Anillo de presupuesto, rango de fechas, total, ritmo real frente a asignación diaria, lista completa del apartado, acciones editar/archivar.

**Análisis (`/analisis`).** Ver §6.

**Ajustes (`/ajustes`).** Métodos de pago (reordenables), presupuesto mensual, tema, exportar/importar copia, exportar CSV con su selector de separador, estado de almacenamiento (`persist()` + `estimate()`, detectados por separado), guía de automatización (`AutomationGuide.tsx`), importación de extracto (`ImportSection.tsx`) e instalación.

**La fila de instalación es de plataforma ramificada**, no un botón (`src/features/settings/useInstall.ts`):
- Chromium con `beforeinstallprompt` capturado → botón real que llama a `prompt()`.
- iOS → panel ilustrado «Toca Compartir y luego Añadir a pantalla de inicio». `beforeinstallprompt` **no existe en Safari** y sigue sin existir; MDN lo marca como no estándar y fuera de Baseline, y la petición formal en los foros de Apple (nov-2025) sigue sin respuesta. La API sucesora (`navigator.install`) es sólo Chromium, con la posición de estándares de WebKit abierta.
- Si `matchMedia('(display-mode: standalone)').matches` o `navigator.standalone === true` → la fila se oculta.

**Accesibilidad de gestos, obligatoria (WCAG 2.2 SC 2.5.7, nivel AA).** Deslizar para revelar acciones es un movimiento de arrastre y necesita alternativa de un solo puntero. Por tanto: **cada fila de gasto lleva un botón «…» visible** con Repetir · Mover a… · Borrar, y el deslizamiento es un atajo adicional, nunca la única vía. Igual en Ajustes: reordenar métodos por arrastre lleva además botones subir/bajar. Y la pulsación larga no puede ser la única entrada de nada: en iOS Safari no dispara `contextmenu` desde iOS 13, suprimir el menú del sistema exige `-webkit-touch-callout:none` (propiedad no estándar, sólo WebKit) y hay reportes sin respuesta de que en iOS 26.1 ya ni eso funciona.

### 5.3 El flujo de alta en menos de 5 segundos

Hoja `src/features/add/AddSheet.tsx`. Orden de arriba abajo, **lo más tocado más abajo**:

```
[ apartado ▾ ]        [ Hoy ]        [ ✕ ]
                        12,50
        (56px, Space Grotesk 700, alineado a la derecha, en vivo)
   concepto  [ ☕ Café ] [ 🛒 Súper ] [ ⛽ Gasolina ]   ← chips recientes
   [ 💳 Tarjeta ] [ 💵 Efectivo ] [ 📲 Bizum ]          ← último usado preseleccionado
   [ 🛒 ] [ 🍽️ ] [ 🚇 ] …                              ← categoría (adivinada)
   ┌───┬───┬───┐
   │ 1 │ 2 │ 3 │
   │ 4 │ 5 │ 6 │
   │ 7 │ 8 │ 9 │
   │ , │ 0 │ ⌫ │
   └───┴───┴───┘
   [        GUARDAR        ]
```

Ruta típica: FAB → 3 teclas → GUARDAR = **5 toques, cero scroll, cero teclado del sistema.**

**Teclado numérico propio (`src/components/Keypad.tsx`), no nativo.** No es estética. Cuatro razones que se acumulan:
1. **Corrección en es-ES.** Safari en iOS 26.2+ tiene una regresión confirmada por un ingeniero de Apple (FB22063448) por la que `input[type=number]` inserta `.` en vez de `,` en locales de coma decimal; y por separado, los teclados de esos locales emiten una coma que el campo rechaza en silencio. Con teclado propio el separador lo decidimos nosotros.
2. **iOS nunca abre el teclado desde `autofocus`** ni desde un `.focus()` asíncrono: sólo dentro de un manejador de clic. Con nativo, o pierdes un toque o montas un hack frágil.
3. Sin zoom al enfocar, sin suelo de 16 px sobre una cifra de 56 px, sin `visualViewport` moviéndote la interfaz.
4. Aparece instantáneo y no desplaza nada.

Las teclas responden en `onPointerDown`, no en `onClick`: reaccionan al tocar, sin esperar a levantar el dedo.

**Semántica del importe: entrada normal de izquierda a derecha con tecla de coma, máximo 2 decimales.** No acumulador de céntimos. El patrón bancario (tecleas 5 → muestra 0,05) cuesta 3 toques para un café de 3 € y 4 para 12,50; la entrada normal cuesta 1 y 4. El gasto cotidiano está dominado por importes pequeños y redondos, así que la entrada normal gana justo donde se decide el objetivo de 5 s. Si no se pulsó coma, se añade `,00` al guardar. `parseAmount()` acepta **coma y punto** como separador y normaliza antes de parsear; nunca `parseFloat` sobre una cadena formateada.

**Accesibilidad del importe:** se renderiza como control real enfocable (`<input type="text" inputmode="none" readonly>` con `aria-live` sobre el valor formateado) para que los lectores de pantalla lo anuncien; en `(pointer: fine)` se quita `inputmode="none"` y se acepta teclado físico con ambos separadores.

**Concepto:** texto libre opcional con teclado nativo (17 px, `enterkeyhint="done"`, `autocomplete="off"`, `autocorrect="off"`), precedido de una fila de chips con los ~8 conceptos recientes del apartado ordenados por recencia×frecuencia. Tocar un chip rellena concepto y categoría de una vez. **No lleva `autofocus`.** Y como en iOS el teclado virtual **se superpone** al viewport de layout en vez de redimensionarlo —`interactive-widget` sigue sin implementarse en WebKit (bug 259770), y sigue siendo área de investigación en Interop 2026— al enfocar el concepto hay que reposicionar con `visualViewport.resize/scroll` para que el teclado del sistema no tape GUARDAR.

**Método de pago:** chips, último usado preseleccionado, **por apartado** y no global (`suggestMethodForSpace()`): en un viaje domina el efectivo, en Vida la tarjeta. Nunca un `<select>`, que cuesta 2–3 toques e invoca un selector nativo.

**Categoría:** adivinada del concepto (`src/features/add/guessCategory.ts`) y editable. Hacerla obligatoria añade una decisión taxonómica por gasto, que es la razón clásica de abandono de las apps de gastos. El apartado se autoselecciona. **Dos taxonomías obligatorias por entrada = app abandonada.**

**Fecha:** automática. El botón «Hoy» de la cabecera existe sólo para retrodatar, y es un chip de baja jerarquía — no un campo.

**Escritura optimista:** se escribe en Dexie y se cierra la hoja de inmediato; la fila entra en la lista antes de cualquier otra cosa. El tiempo percibido acaba en el toque. Detrás, toast de deshacer de 4 s con «Mover a Vida», que es la mitigación de que la autoselección de apartado archive por error la compra del súper de casa dentro del viaje a Japón.

**Háptica** (`src/hooks/useHaptics.ts`): `navigator.vibrate` y punto, tras comprobar su existencia. Eso significa Android/Chromium; en iOS **no hay nada** y la interacción no depende de ello en ningún punto. Se descarta explícitamente el truco del `<input type="checkbox" switch>` invisible: WebKit exige un clic *trusted* para el tick háptico, lo que ya mata cualquier `.click()`; el interruptor invisible sigue en el árbol de accesibilidad y VoiceOver anunciaría el botón GUARDAR de una app de dinero como «interruptor, desactivado» cambiando de estado en cada toque; y todo el mecanismo es un efecto secundario no soportado que Apple puede cerrar en cualquier punto de versión. No vale la pena en el botón principal de una app financiera.

---

## 6. Módulos de analítica

### 6.1 Librería: ninguna

**Gráficas SVG propias, cero dependencias.** Recharts 3.10.1, medido en este mismo toolchain (Vite 8 + rolldown, minify oxc, React externalizado, gzip -9): **122,0 kB gzip** para un solo gráfico de barras, y 140,0 kB importando todos los tipos. Es decir, un gráfico ya cuesta el 87 % de la librería: el tree-shaking no compra nada, porque Recharts 3 arrastra `@reduxjs/toolkit`, `react-redux`, `immer`, `reselect`, `es-toolkit` y `victory-vendor`. 122 kB gzip es aproximadamente React + ReactDOM + Router juntos, en una app cuya propuesta de valor es abrirse al instante.

Alternativas medidas y descartadas: visx 30,4 kB (la mejor de las librerías, pero da primitivas, así que escribes igual el tooltip y el táctil), Chart.js + react-chartjs-2 65,4 kB (canvas: invisible para lectores de pantalla), uPlot 24,2 kB (canvas, no-React, sin donut), Nivo 115,9 kB, Observable Plot 143,7 kB, ECharts tree-shaken 209,9 kB.

Y tampoco `d3-shape`: el donut se dibuja con `stroke-dasharray` sobre círculos concéntricos (`src/components/charts/Donut.tsx`), que son diez líneas de SVG para lo que aquí es una regla de tres. **Coste total de la capa de gráficas: 0 kB.** Lo único que hace falta es un `ChartFrame` compartido (viewBox, padding, ejes, manejador táctil) y marcas compuestas dentro, de modo que el trabajo se paga una vez y no por gráfica.

`src/lib/analytics.ts` es la capa de selectores puros, con tests. La UI no calcula.

### 6.2 Gráficas, por orden de prioridad

| # | Gráfica | Componente | Dato |
|---|---|---|---|
| 1 | Barras verticales, últimos 6 meses | `Bars.tsx` | `byMonth()` + `lastMonths(6)` |
| 2 | Ritmo del mes: acumulado actual vs anterior, alineado por día | `TrendLines.tsx` | `alignedCumulative(cumulativeSeries(dailySeries(...)))` |
| 3 | «En qué se te va»: donut ≤ 5 porciones + ranking horizontal completo | `Donut.tsx` + `RankList.tsx` | `ranked(groupBy(categoryId), …, limit)` |
| 4 | Presupuesto: barra lineal con marca de ritmo esperado | `ProgressBar.tsx` | `budgetStatus()` |
| 5 | «Qué días gastas»: mapa de calor **del mes** | `CalendarHeat.tsx` | `dailySeries()` |
| 6 | Minigráficas por categoría dentro de la fila | `Sparkline.tsx` | `dailySeries()` filtrada |

Además, sin gráfica propia: «Cómo pagas» y «Por apartado» como `RankList`.

Las barras horizontales ganan al donut para el ranking de categorías en 360 px porque la etiqueta va sobre la barra y se lee a tamaño completo, mientras que las porciones del donut necesitan líneas guía o una leyenda que empuja el gráfico bajo el pliegue. La comparativa acumulada vs mes anterior es la gráfica de más valor de la app: responde «¿voy peor de lo normal?», que una barra de un solo mes no puede responder.

**Prohibido en pantalla pequeña:** donut con más de 5 porciones (`ranked()` ya pliega la cola en «Otros»), doble eje Y, cualquier 3D, apiladas de más de 4 series, leyendas con scroll horizontal y etiquetas de eje rotadas. En vez de rotar, se adelgazan los ticks (cada 5 días, iniciales de mes) y se mantienen horizontales. El mapa de calor es **sólo mensual**: una rejilla 7×5 en 360 px da celdas de ~42 px, usables; una vista anual da ~7 px, por debajo del mínimo táctil y del de legibilidad.

### 6.3 Métricas

Ya implementadas en `analytics.ts`: `totalSpent`, `totalIncome`, `groupBy`, `countBy`, `dailySeries` (relleno de ceros, continua), `cumulativeSeries`, `byMonth`, `ranked` (con `limit` → «Otros»), `dailyAverage`, `projectMonthEnd`, `budgetStatus` (ratio, estado ok/warn/over, `perDayLeftCents`), `biggest`, `monthOverMonth`, `rollingAverage`, `alignedCumulative`, `burnRate`, `projectionIsMeaningful`.

Tres precauciones que forman parte de la especificación:
- `projectMonthEnd()` extrapola linealmente desde el día 1: un alquiler de 400 € el día 1 proyecta ~12.000 € de mes. La proyección **se oculta** hasta `MIN_DAYS_FOR_PROJECTION = 6` (`projectionIsMeaningful()`). La matemática es correcta; la UX no lo sería.
- `rollingAverage()` consume la salida **rellena de ceros** de `dailySeries()`, nunca `Expense[]` en bruto: promediar sobre gastos crudos se salta los días sin gasto e infla la media.
- `alignedCumulative()` compara **por índice de día** (1..n) y trunca a la serie más corta. Unir por `DayKey` rompe en silencio entre meses de 31, 30 y 28 días.

### 6.4 Rendimiento

- **Sin Web Worker para agregar.** 50–200 gastos/mes son 600–2.400 filas/año; las agregaciones son pasadas O(n) sobre enteros: muy por debajo de un frame de 16,7 ms. Un worker añadiría clonado estructurado, asincronía y un estado de carga para no ahorrar nada. Punto de control: si una consulta de mes devolviera >20.000 filas, se reabre. El worker se reserva para el sitio donde sí hace falta: el deduplicado del extracto bancario, que es O(n·m) sobre todo el histórico.
- **SVG con `viewBox`, sin `ResizeObserver`.** Esto elimina el bucle medir→renderizar→medir que crea el `ResponsiveContainer` de Recharts (que literalmente hace `new ResizeObserver(...)` → `setContainerSize`). Precisión importante: **no es «gratis en el compositor»** — sólo `transform`, `opacity`, `filter` y `backdrop-filter` se mutan en el hilo de composición en Blink; un cambio de ancho es layout y el navegador re-dispone, repinta y re-rasteriza en el hilo principal. Lo que ahorramos es **todo el trabajo de React**, que es lo que costaba frames. Y como `preserveAspectRatio` por defecto (`xMidYMid meet`) deja bandas al cambiar la proporción y `none` deforma, fijamos `aspect-ratio` en CSS al contenedor del gráfico.
- **El texto no escala con el viewBox.** No existe un `non-scaling-text`. Por tanto: `vector-effect="non-scaling-stroke"` en líneas y ejes, y **las etiquetas de eje y valor se renderizan como HTML posicionado sobre el SVG** — lo que además las hace seleccionables y accesibles.
- **`touch-action: pan-y`** en el envoltorio del gráfico (en un div o en el `<svg>` raíz; en hijos SVG no se respeta de forma fiable). Sin esto, el barrido horizontal y el scroll vertical se pelean y uno se come al otro. Manejar `pointercancel`: el navegador puede reclamar el gesto como scroll a mitad de barrido.
- **Memoización:** `useMemo` sobre el array de `liveQuery`, pero lo que de verdad importa es que la consulta sea un rango indexado por mes/apartado (§3.3).
- **Accesibilidad:** cada gráfica es `<svg role="img">` con `aria-label` generado que resume la conclusión, más una `<table>` visualmente oculta con las mismas filas `Bucket[]`. Es el patrón más fiable, no necesita soporte de ninguna librería y da los valores exactos en vez de una aproximación. Esta es la ventaja decisiva del SVG sobre las librerías de canvas, cuya propia documentación admite que un canvas es opaco para lectores de pantalla.

---

## 7. NFC / tarjeta: LA VERDAD

### 7.1 El veredicto, sin rodeos

**Una página web no puede interceptar un pago contactless. Nunca. Ni con NFC, ni con permisos, ni con una PWA instalada.** Tres hechos independientes, cada uno suficiente por sí solo:

1. **Web NFC no lee tarjetas bancarias.** La especificación se limita a mensajes NDEF sobre etiquetas pasivas; ISO-DEP, NFC-A/B/F y la emulación de tarjeta (HCE) están **explícitamente fuera de alcance**. Tarjetas EMV, abonos de transporte y pasaportes no se pueden leer ni emular. Y aunque se pudiera, `NDEFReader` sólo existe en Chrome/Edge/Opera/Samsung para Android: no existe en iOS, ni en Firefox, ni en ningún escritorio.

2. **Al pagar con la tarjeta física, el teléfono no interviene en absoluto.** No hay software en el dispositivo que observe ese pago, así que no hay API —web o nativa— que pueda capturarlo. La única evidencia de que ocurrió es el aviso del banco o el propio extracto.

3. **Ni siquiera con Apple Pay / Google Pay puede una app ajena observar el pago.** El toque lo ejecuta el elemento seguro o el HCE bajo control del sistema operativo. La apertura del NFC en la UE por la DMA concede el derecho a **ser** una app de pagos (con entidad establecida en el EEE, cumplimiento PCI DSS y EMVCo), no a mirar los pagos ajenos.

Descartados también, y por qué: **Apple FinanceKit** es EE. UU. + Reino Unido, sólo app nativa, y con entitlement reservado a apps de la categoría Finanzas de la App Store — España no está, y una PWA tampoco. **Google Wallet API** emite pases, no expone transacciones. **BBVA API_Market** pasa por el hub TPP de Redsys y exige credenciales de TPP registrado con certificado eIDAS. Ningún banco español ofrece en 2026 un token personal de sólo lectura estilo Monzo.

### 7.2 Corrección arquitectónica importante

El enlace profundo `/add?...` es un destino de **navegación (GET)**, no un endpoint HTTP. Un POST HTTPS lanzado por Atajos de iOS o por MacroDroid sale por la pila de red de **esas apps** y nunca toca la PWA. Un service worker no puede capturarlo: el algoritmo *Handle Fetch* se entra desde Fetch con el *client* de la petición, es decir, sólo para peticiones originadas en páginas bajo su ámbito en ese navegador; una petición de otra app no tiene cliente. El único mecanismo web diseñado para recibir un POST entrante es `share_target`, y no existe en Safari ni en iOS (`version_added: false`, bug de WebKit 194593) y además exige un gesto manual de compartir.

**Consecuencia:** todo lo que suene a «que el móvil mande el gasto a la app automáticamente» se implementa como **navegación GET a `/add?amount=…&concept=…`** (fase 1), o requiere **un servidor de verdad** (fase 2). Aquí no hay una tercera vía.

### 7.3 Las tres fases

#### Fase 1 — Hoy, sin backend (implementada)

Cuatro caminos de captura rápida, todos a la misma ruta:

- **Enlace profundo `/add`** — `src/features/capture/DeepLinkCapture.tsx` + `parseCapture.ts`. Acepta `amount`, `concept`/`merchant`, `method`, `space`, `date`, `src`. Es el objetivo al que apuntan todas las automatizaciones.
- **`share_target` (GET) en `/compartir`** — declarado en el manifiesto. Permite compartir el aviso del banco o un SMS desde la bandeja de notificaciones hacia Caudal. **Sólo Chromium/Android.** Se usa GET a propósito: aceptar imágenes exigiría POST multipart y un manejador de fetch propio en el SW, complejidad que aquí no compensa.
- **Atajo de iOS sobre el disparador Cartera/Transacción** — guía en `src/features/settings/AutomationGuide.tsx`. Con «Ejecutar inmediatamente» y «Abrir URL» hacia `/add?...`.
- **Importador Norma 43** — `src/features/import/norma43.ts`. Es el único formato que **todos** los bancos españoles (BBVA, Santander, CaixaBank, Sabadell, Bankinter) exportan igual: un parser de ancho fijo, ~200 líneas, cubre todos a la vez. Muy preferible al CSV, que varía por banco en orden de columnas, formato de fecha, separador decimal y convención de signo, y cambia sin avisar.

**Expectativas honestas sobre el atajo de iOS**, porque el usuario va a probarlo:
- Dispara **sólo con Apple Pay desde el iPhone o el reloj, en tienda física**. Una tarjeta de plástico no produce nada. Las compras online, las suscripciones, los recibos domiciliados, las transferencias y Bizum tampoco. Eso es una fracción grande del gasto real.
- Hay fallos documentados en los foros de Apple: cuando el emisor retrasa el aviso a Cartera, el disparador expira en vez de esperar (FB14035016, FB16379100; regresión entre iOS 17 y 18).
- Que el atajo reciba **el importe y el comercio como variables** es lo menos verificado de todo el asunto: la plataforma de Apple no expone ninguna API de lectura de transacciones (PassKit no tiene ni un símbolo de transacción/historial; cualquier integración más profunda con Cartera exige un entitlement concedido sólo a emisores). **Se trata como no probado**: el atajo debe preguntar el importe si la variable no viene.

En Android, la alternativa es MacroDroid con el disparador «Notificación recibida» filtrado por la app del banco → regex → abrir la URL. Advertencias: requiere el permiso de escucha de notificaciones (en Android 13+ pasa por el flujo de ajustes restringidos), hay que eximir la app de la optimización de batería (Doze, y sobre todo Samsung/Xiaomi, lo matan, y el ajuste a veces se revierte tras actualizar), el nivel gratuito limita el número de macros, y **si el banco cambia la redacción del aviso la regex deja de casar en silencio** y sólo se nota a fin de mes.

#### Fase 2 — Con un proxy serverless

Un Cloudflare Worker pequeño con un endpoint de ingesta (`POST /ingest`), almacenamiento cifrado y un cron. Esto es lo que permite que las automatizaciones **empujen** datos de verdad en vez de tener que abrir la app. Requisitos mínimos: ruta no adivinable **más HMAC sobre el payload** (una automatización sólo puede llevar un secreto estático), claves de idempotencia, y un camino de sincronización de vuelta a IndexedDB. Ese backend —no las macros— es el trabajo real de la fase.

#### Fase 3 — Open banking real

**Enable Banking**, nivel gratuito «Restricted Production», es el camino. GoCardless Bank Account Data (ex-Nordigen) cerró los registros nuevos en julio de 2025 y su documentación antigua ya migró: seguir un tutorial de Nordigen es la semana perdida más común en este terreno.

Marco legal correcto, que no es el que se suele contar: en Restricted Production **tú eres el titular de las cuentas**, no un «socio operando bajo su licencia». Por eso no necesitas autorización AISP ni certificado eIDAS/QWAC propios. Y por eso mismo el montaje se cae en el momento en que la app lee las cuentas de otra persona (una pareja, una unidad familiar — escenario perfectamente realista en una app de finanzas personales): eso ya es un servicio de información de cuentas regulado y exige nivel de pago con otra relación legal, o autorización propia.

**Lo que NO es, y hay que decirlo antes de construirlo:**
- **No es «totalmente automático».** Bajo el art. 10a de las RTS de SCA la SCA periódica se suprime **hasta 180 días**; pasado eso el usuario tiene que volver a autenticarse físicamente en su banco. Y los ASPSP españoles recortan habitualmente el `valid_until` solicitado a ~90 días. Traducción: **re-consentimiento manual por banco cada ~3 meses, para siempre**, y el vencimiento es silencioso (deja de traer filas, no da error), así que la app tiene que vigilar `valid_until` y avisar antes.
- **El histórico es corto.** El histórico completo suele estar disponible sólo en una ventana breve tras la autorización (a menudo ~1 hora); después la mayoría de ASPSP devuelven ~90 días. La primera sincronización tiene que ser generosa, y **el importador Norma 43 se queda en el producto para siempre** como vía de archivo y relleno.
- **Las tarjetas de crédito no están garantizadas.** Los derechos PSD2 aplican a cuentas de pago accesibles en línea; las cuentas de tarjeta de crédito las exponen los bancos españoles de forma inconsistente. El gasto de débito llega como movimientos de la cuenta corriente; la cobertura automática de crédito hay que **verificarla por tarjeta concreta** en sandbox antes de prometerla.
- **La clave privada JWT RS256 no puede vivir en el bundle de Vite.** Publicarla es publicar el acceso bancario. El open banking es estructuralmente imposible desde un cliente puro: el proxy de la fase 2 es un requisito, no una comodidad.
- **El nivel gratuito es política comercial, no un derecho.** Nordigen es el precedente, no la excepción. La capa de importación se diseña para sobrevivir a perderlo.

### 7.4 Lo que puedes tener esta semana

Por orden, y esto es la recomendación concreta:

1. **Apuntar efectivo y tarjeta a mano en < 5 s.** Ya está construido y es el 95 % del valor. Nada de lo demás lo sustituye.
2. **Importar el Norma 43 del banco una vez al mes** desde Ajustes → Importar. Cubre BBVA, Santander, CaixaBank, Sabadell y Bankinter con un solo parser, sin cuentas, sin servidor y sin caducidad de consentimiento. **Este es el mejor retorno por hora de trabajo de toda la sección 7.**
3. **Android:** macro de MacroDroid sobre el aviso del banco → abrir `/add?amount=…&concept=…`. Media hora de configuración, sin código.
4. **iPhone:** atajo con el disparador Cartera → «Abrir URL» a `/add?...`, entendiendo que sólo cubre Apple Pay en tienda y que puede fallar. Trátalo como experimento y verifica en el dispositivo si el importe llega como variable; el respaldo enviado es capturar desde el menú Compartir.

Deduplicación desde el día uno (`repo.findByExternalId` y `repo.findLikelyDuplicate`): cada fila lleva su `source` y su `externalId`. Los movimientos Norma 43 no traen identificador estable, así que se sintetiza uno determinista (hash de fecha + importe + concepto + saldo resultante) y se hace único en Dexie; si no, reimportar un rango solapado duplica todo. El emparejamiento admite mismo signo, importe igual (con tolerancia por divisa), fecha en ventana de ±3–5 días —porque la automatización llega en **autorización** y el extracto en **liquidación**, y difieren en propinas, preautorizaciones de gasolina y cambio de divisa— y comercio normalizado. **Nunca se fusiona en silencio con coincidencia difusa**: cola de revisión de «posible duplicado», fusión automática sólo con identificador determinista, y la categoría y la nota del usuario **siempre ganan** — son justamente el dato que el banco no puede dar y la razón de que la entrada manual exista.

---

## 8. Roadmap por fases

### v1 — lo que se construye ahora *(estado: construido)*

Shell PWA completo (manifiesto, SW en modo `prompt`, iconos, capturas, metas de iOS, tema anti-flash). Modelo de datos Dexie v1 con UUIDv7, borrado lógico y los tres índices compuestos. Hoja de alta con teclado propio, chips de método/concepto/categoría, categoría adivinada, escritura optimista y toast de deshacer. Apartados con presupuesto, rango, autoselección, archivado y desarchivado. Pantalla Hoy con conmutador de mes e historial agrupado por día. Módulo de análisis con las seis gráficas SVG. Ajustes con copia de seguridad JSON versionada + cadena Share/download/textarea, restauración, export CSV con selector de separador, estado de almacenamiento, guía de automatización, importador Norma 43, captura por enlace profundo y `share_target`. Tema claro y oscuro con todos los pares verificados contra WCAG AA. Tests unitarios de `money`, `dates`, `analytics`, `norma43` y `parseCapture`.

**Definición de terminado de v1** (además de lo anterior): `tsc --noEmit` limpio; `vitest run` verde; el test de round-trip de copia de seguridad en verde; auditoría de instalabilidad de Lighthouse en verde; comprobación manual en modo avión de que los iconos y las fuentes están precacheados; comprobación en iPhone real de que el teclado del sistema no tapa GUARDAR al enfocar el concepto; y el `Content-Type` del manifiesto verificado con `curl -I` en producción.

### v2 — siguiente

1. **Botón «…» visible en cada fila** con Repetir · Mover a… · Borrar (cierra la deuda de WCAG 2.2 SC 2.5.7) y botones subir/bajar en los métodos de pago.
2. **Repetición rápida**: mini-hoja con los 4 gastos más recientes/frecuentes, alcanzable por pulsación larga del FAB **y** por un toque visible; registra un gasto idéntico con la fecha de hoy.
3. **Calculadora en el teclado** (+ − =), que es como resuelven Ivy Wallet y Bluecoins los repartos en efectivo. Coste casi nulo, elimina una clase entera de cambios de app.
4. **Proxy serverless de ingesta** (Cloudflare Worker + HMAC + idempotencia) para que las automatizaciones empujen sin abrir la app.
5. **Gastos recurrentes** (suscripciones, alquiler) con generación al abrir la app — sin depender de despertar el service worker, que es imposible en iOS.
6. **Vista de búsqueda y filtros** en el historial (apartado, método, rango de fechas).

### v3 — más adelante

1. **Open banking con Enable Banking** en Restricted Production, con banner de reconexión por vencimiento de consentimiento y cola de revisión de duplicados. Ver §7.3 para lo que no va a resolver.
2. **Sincronización multidispositivo.** El esquema ya está preparado (UUIDv7, `updatedAt`, tombstones, repositorio aislado). El destino designado es `dexie-cloud-addon`, porque se añade como addon al mismo constructor de Dexie en vez de portar consultas. Cobertura del riesgo de proveedor: con `updatedAt` + borrado lógico, un last-write-wins contra cualquier endpoint JSON es un fin de semana de trabajo, porque un solo usuario con varios dispositivos no tiene un problema real de conflictos.
3. **Notificaciones push** de presupuesto («te quedan 3 días y el 40 %»). Requieren iOS 16.4+ **e instalación en pantalla de inicio**: `PushManager` no existe en una pestaña de Safari.
4. **Adjuntar foto del ticket** — requiere decidir la codificación explícita en la copia de seguridad (§4.4) antes de tocar el esquema.
5. **Multi-divisa** para viajes fuera del euro. Es el momento de traer `dinero.js` 2.x, y **sólo en la capa de presentación/reparto**, nunca en la de persistencia.

---

## 9. Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación (vinculante) |
|---|---|---|---|
| 1 | **Pérdida de datos por desalojo de WebKit.** Una PWA no instalada pierde IndexedDB, Cache API y el registro del SW tras 7 días de uso de Safari sin interacción. | Catastrófico | Instalar en pantalla de inicio es **requisito de corrección**, no adorno: las web apps instaladas llevan su propio contador. Más `navigator.storage.persist()` tras la primera escritura, más aviso de copia a los 14 días / 50 gastos, más export a un toque. Si la app corre sin instalar, banner persistente. |
| 2 | **`<a download>` roto en PWA instaladas en iOS.** El botón de copia pasa las pruebas en pestaña de Safari y falla en la app real. | Alto | Cadena obligatoria `canShare({files})` → `<a download>` → textarea copiable. Construir el `File` **antes** de cualquier `await`. Probar la exportación **en la app instalada**, no en la pestaña. |
| 3 | **Migración de esquema con pérdida.** Es la zona de mayor riesgo de toda la app. | Catastrófico | Versionado aditivo de Dexie con `upgrade()`; conservar todas las funciones de upgrade; ningún cambio de esquema entra sin test de migración; importador capaz de leer todas las `schemaVersion` enviadas. |
| 4 | **Reimportar un extracto duplica todo.** Norma 43 no trae identificador estable. | Alto | `externalId` sintetizado (hash fecha+importe+concepto+saldo) y único en Dexie. Cola de revisión para coincidencias difusas; fusión automática sólo con id determinista; categoría y nota del usuario intocables. |
| 5 | **La autoselección de apartado archiva mal el gasto** (el súper de casa cae en el viaje). | Medio | Píldora de apartado siempre visible en la hoja, toast de deshacer con «Mover a Vida» y «Mover a…» en la fila. Las tres, no una. |
| 6 | **La regex de la notificación del banco deja de casar** tras un cambio de redacción. | Medio | Registrar en la macro todo aviso del banco que **no** case, para que el fallo sea visible; nunca tratar la automatización como libro mayor: es captura de mejor esfuerzo, el extracto es la verdad. |
| 7 | **El disparador de Cartera de iOS no entrega el importe** o expira. | Medio | El atajo pregunta el importe si la variable no llega. Documentado en `AutomationGuide.tsx` como experimento, con la captura por Compartir como vía enviada. |
| 8 | **`env(safe-area-inset-bottom)` devuelve 0 en standalone** en algunos builds de iOS y la barra queda bajo el indicador. | Medio | `padding-bottom: calc(12px + env(...))` siempre; nunca el `env()` a pelo. |
| 9 | **El teclado del sistema tapa GUARDAR** al enfocar el concepto: WebKit no implementa `interactive-widget`. | Medio | Reposicionado con `visualViewport` (`resize`+`scroll`). Comprobación obligatoria en iPhone real antes de cerrar v1. |
| 10 | **Gestos sin alternativa** = incumplimiento de WCAG 2.2 SC 2.5.7 y funciones inalcanzables con VoiceOver. | Medio-alto | Botón «…» visible en cada fila y subir/bajar en los métodos: v2 punto 1, no negociable. Ninguna función depende sólo de pulsación larga o de deslizar. |
| 11 | **Vite 8 + plugin-react 6 están acoplados** (peer `^8.0.0` exacto) y el shim de esbuild de Rolldown ha lanzado «Not implemented» con algún plugin. | Bajo | Versiones fijadas en `package.json`; escotilla documentada: bajar a Vite 7.3.6 + plugin-react 5.x **en bloque**. Ningún tutorial anterior a mediados de 2026 sirve: la opción `react({babel:{...}})` ya no existe. |
| 12 | **`liveQuery` invalidando de más** si alguien filtra el mes en JS. | Bajo-medio | Regla de revisión: toda consulta de lista es un rango indexado (`[deletedAt+day]` / `[spaceId+day]`). Ningún componente importa `db`. |
| 13 | **El separador de CSV para Excel es inadivinable** desde el navegador. | Bajo | Selector explícito en Ajustes con valor inicial derivado de `navigator.language` y memorizado; BOM UTF-8 siempre; `;` acoplado a decimales de coma. |
| 14 | **Enable Banking retira el nivel gratuito** o el consentimiento caduca en silencio. | Medio | Nordigen es el precedente. La app vigila `valid_until` y avisa antes; el importador Norma 43 permanece para siempre como vía independiente; la capa de importación sobrevive a perder el proveedor. |
| 15 | **Cristal (`backdrop-filter`) tirando frames** sobre listas largas en Android medio. | Bajo | Sólo dos superficies con cristal; `@supports` con fondo opaco; probar la barra inferior sobre una lista de 500 filas y, si tartamudea, opaco en Android. |
| 16 | **OKLCH no existe en Safari < 16.4**, relevante en una PWA de pantalla de inicio. | Bajo | Los tokens se escriben en **hex**, que son los valores verificados de contraste. Nada de la interfaz depende de `oklch()`. |

---

### Anexo: reglas que no se saltan

1. Ningún componente importa `db`. Todo pasa por `src/db/repo.ts`.
2. Ningún componente escribe un hex. Todo el color sale de `src/styles/tokens.css`.
3. El dinero es `Cents` entero en todo el dominio; se formatea sólo en el borde de la UI.
4. `day` es fecha civil `'YYYY-MM-DD'`; `createdAt` es epoch ms. Nunca se deriva uno del otro por UTC.
5. `registerType` es `'prompt'`. Para siempre.
6. Toda cifra lleva `.num` (cifras tabulares).
7. Un solo elemento violeta por pantalla; los acentos saturados viven en los datos.
8. Ninguna función depende únicamente de un gesto.
9. Toda consulta de lista es un rango indexado.
10. Cada cambio de esquema entra con su test de migración.