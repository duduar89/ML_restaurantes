# Dossier de automatización para gestoría — análisis de viabilidad

> 8 de septiembre de 2026. **Documento de investigación, no de encargo.** Sale de leer el
> dossier entero, auditar el código de CIFRA fichero a fichero y contrastar 14 frentes
> técnicos y regulatorios contra fuente oficial española.
>
> Orden de lectura: §0 qué está verificado y qué no —importa, porque el proxy de red bloqueó
> parte de las fuentes—, §1 el hallazgo que cambia el dossier, §2 si se puede construir con
> lo de CIFRA, §3 si se puede probar sin nada habilitado, §4 el nivel de seguridad, §5 el
> catálogo completo ordenado con sus nombres, §6 con qué hay que conectarse, §7 el roadmap,
> §8 el mercado y el precio —que es lo que decide si esto es un negocio—, y §9 el registro de
> qué se verificó y qué se cayó.

---

## 0. Cómo se ha hecho esto, y qué NO está verificado

**30 agentes de investigación en dos pasadas, 772 llamadas de herramienta, sobre 14 frentes**,
más doce afirmaciones críticas sometidas a un verificador adversarial cuyo encargo era
**refutarlas**, no confirmarlas. Resultado de esa verificación: **3 confirmadas, 6 matizadas,
3 refutadas**. Está en §9, y merece leerse: una de las refutaciones habría costado construir un
robot de navegador que no hacía ninguna falta.

En la primera pasada, seis de los catorce frentes se quedaron sin acceso a la web a mitad de
sesión —presupuesto de búsqueda agotado y el proxy devolviendo 403 a boe.es,
agenciatributaria.es, seg-social.es y aepd.es—. Se relanzaron con presupuesto acotado y ya
tienen fuentes.

Y hay una cosa que hay que decir antes de nada: **casi ninguna cita literal de norma de este
documento ha sido leída en su fuente primaria.** Los agentes trabajaron sobre extractos de
buscador de páginas oficiales, no sobre los PDF. Los números de artículo, las cuantías de
sanción y las redacciones exactas llevan su nivel de confianza, y hay una lista de documentos
que **alguien tiene que abrir a mano** antes de escribir una línea de código o una propuesta
comercial: está en §6.4.

Esto no invalida el análisis —las conclusiones estructurales son sólidas y coinciden entre
agentes independientes— pero un documento jurídico-técnico que se entrega a una gestoría no se
sostiene con "lo dice un resumen de buscador".

---

## 1. El hallazgo: el dossier propone la arquitectura equivocada, y hay una correcta

El módulo 1.1 dice, literalmente, que el sistema usará *"el certificado digital del despacho
(o apoderamientos)"* para consultar los buzones de sus clientes. Ese paréntesis se lee como
si fueran dos formas de hacer lo mismo. **No lo son: una es la buena y la otra no se puede
vender por escrito.**

**Custodiar los certificados de los clientes está mal por cuatro sitios a la vez:**

1. La Secretaría de Estado para el Avance Digital emitió en mayo de 2019 una nota declarando
   que la cesión de la posesión y la revelación de las claves de un certificado a un tercero
   **no es conforme con la legislación vigente**, y remite expresamente a los apoderamientos
   digitales como alternativa.
   [Nota sobre delegación de firma](https://avance.digital.gob.es/es-es/Servicios/FirmaElectronica/Documents/Nota%20delegaci%C3%B3n%20de%20firma.pdf)
2. Las condiciones de la FNMT hacen al **titular** responsable de toda operación hecha con su
   certificado, y le imponen el deber de no divulgar las claves. O sea que si la gestoría usa
   el certificado del cliente y algo sale mal, **el que responde ante la Administración es el
   cliente**, no la gestoría. Es el peor reparto posible y una fuente segura de litigios.
   [FNMT, custodia de certificados](https://www.sede.fnmt.gob.es/preguntas-frecuentes/problemas-y-dudas/-/asset_publisher/fVZppcBHj0oa/content/1714-recomendaciones-sobre-la-custodia-de-los-certificados)
3. Tras **eIDAS 2** (Reglamento UE 2024/1183, en vigor desde el 20-may-2024), la gestión de
   firma remota por cuenta del firmante es un **servicio cualificado** reservado a prestadores
   cualificados. Montar un almacén propio de claves de clientes y firmar con ellas es, en
   potencia, prestar un servicio de confianza sin autorización.
4. Un almacén con los certificados de N clientes no es un fichero de datos personales
   corriente: es **la capacidad de firmar y contratar en nombre de N empresas**. Una brecha
   ahí es notificable en 72 horas y se lleva por delante a la gestoría y a Brainstormers como
   encargado del tratamiento.

**La vía correcta existe, la documenta la propia AEAT, y es mejor también técnicamente.**
Son tres piezas:

| Pieza | Para qué | Quién es el titular |
|---|---|---|
| **Sello electrónico de entidad** (tipos @firma 4 y 8) | Actuación automatizada, máquina a máquina, sin persona delante | La gestoría |
| **Colaboración social** (art. 92 LGT, arts. 79-81 RD 1065/2007) | Presentar declaraciones de terceros | La gestoría, vía convenio de su colegio |
| **Apoderamiento GENERALNOT** | Recibir notificaciones de un cliente | Lo otorga cada cliente |

La AEAT dice expresamente que el colaborador social puede usar certificado de **Sello de
Entidad**, *"solo para comunicaciones máquina a máquina"*, y que cuando un servicio admite
sello, **la definición del servicio web tiene un endpoint específico para actuaciones
automatizadas**.
[Presentación por colaboradores sociales](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/colaboracion-social-ayuda-tecnica/presentacion-declaraciones-colaboradores-sociales_.html)

**Cero certificados de cliente custodiados. Un solo sello de la gestoría. Y un apoderamiento
por cliente, que el cliente puede revocar cuando quiera desde la sede.**

Y hay un matiz que conecta módulos y que casi todas las gestorías dan por resuelto sin
estarlo: **ser colaborador social NO habilita para recibir notificaciones.** La colaboración
social se limita a presentar. Para leer el buzón de un cliente hace falta apoderamiento, y el
GENERALNOT además **exige confirmación del apoderado** para surtir efecto.
[Acceso a DEHú mediante apoderamiento](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/notificaciones-electronicas-ayuda-tecnica/acceso-dehu-mediante-apoderamiento.html)

> **Consecuencia comercial, y es la buena:** esto se puede dar la vuelta y usarlo como
> argumento de venta. *"Nosotros no le pedimos su certificado digital, porque no es legal y
> porque le deja a usted respondiendo de lo que hagamos nosotros. Trabajamos con
> apoderamiento electrónico, que usted revoca cuando quiera."* Es diferenciación real,
> verificable, y alineada con el criterio de la Administración.

### El coste oculto que aparece con la vía correcta

El modelo de apoderamiento es el bueno, pero **traslada el cuello de botella de lo técnico a
lo humano**: hay que conseguir que 300 clientes entren en la sede con su Cl@ve y otorguen
GENERALNOT, y luego confirmarlo desde el lado de la gestoría. Y los apoderamientos caducan,
se revocan, y el cliente puede darse de baja sin avisar.

**Un buzón que deja de ser accesible no da error: parece "no hay notificaciones nuevas".**
Ese es el fallo silencioso que hunde el producto, y es exactamente el tipo de trampa que la
skill `cifra-honestidad` obliga a mirar: *un cero silencioso es peor que un error.*

De ahí sale el módulo cero del proyecto, que no está en el dossier y que es el que hace
funcionar todo lo demás: **el gestor de apoderamientos y habilitaciones**. Ver §5.

---

## 2. ¿Se puede construir con lo que sabemos de IA y con lo que hacemos en CIFRA?

**Sí, pero no todo, y no con la misma infraestructura.** El reparto real, auditado contra el
código del portal:

### 2.1. Lo que ya está construido y se traslada casi tal cual

| Pieza del dossier | Qué existe hoy en CIFRA | Dónde |
|---|---|---|
| **2.1 Extracción de facturas** | Pipeline completo en producción: ingesta por correo (cron cada 5 min) y por WhatsApp, visión con Claude, extracción de líneas, normalización determinista de unidades, matching por alias con `sha256(cliente+proveedor+descripción normalizada)`, cola de revisión y coste en dólares por llamada | `agente-gastos`: `cron-email.js`, `cron-lineas.js`, `services/lineas.js`, `services/unidades.js`, `services/matchingProductos.js` |
| **3.1 Captura por WhatsApp** | En producción. Twilio por API REST directa, sin SDK, sin reintentos por diseño. La distinción plantilla / texto libre en la ventana de 24 h ya está resuelta | `services/whatsapp.js` |
| **4.2 Portal de variaciones laborales** | **Medio construido, y desde el otro lado del mostrador**: CIFRA ya recibe las nóminas de una gestoría por correo, las coteja con alias de nombres, y gestiona ausencias, bajas, horas y cuadrantes. Con órdenes en lenguaje natural | `services/personal/` (49 ficheros): `nominas.js`, `ausencias.js`, `agenteOrdenes.js` |
| **4.1 Auditoría preventiva** | El patrón exacto: semáforo de plausibilidad tras el escaneo, umbrales, detección de desviaciones, y la disciplina de callar antes que estimar | `services/desviaciones.js`, skill `cifra-honestidad` |
| Portal de cliente con enlace propio | Informes públicos por token, sin login | `routes/compartido.js` |
| Coste de IA medido por llamada | Se calcula y se guarda en dólares. Es lo que permite fijar precio por documento en vez de a ojo | patrón `_meta` en `services/carta.js` |

El caso del **2.1** merece decirse con precisión, porque es la ventaja competitiva real de
Brainstormers en este dossier: extraer NIF, base imponible, cuotas de IVA y retenciones de un
PDF es **funcionalmente lo mismo** que CIFRA hace hoy en producción con facturas de
hostelería. No es un desarrollo desde cero, es un reempaquetado.

Y el **4.2** es todavía mejor negocio: la investigación confirma que la vía real por la que
un cliente manda sus variaciones de nómina al despacho hoy es **un Excel por correo**. No
toca el software del despacho, no necesita API de nadie, no puede corromper nada, y CIFRA ya
tiene las tres piezas (formularios, consolidación, exportación).

### 2.2. Lo que NO se traslada, y es lo que decide el proyecto

**El hosting.** Esto aparece en cuatro investigaciones independientes y es el hallazgo de
arquitectura más caro del dossier:

- **La firma y la custodia no pueden vivir en cPanel compartido.** Sistema de ficheros
  compartido, sin HSM, sin aislamiento, sin control de procesos, y sin JVM para AutoFirma.
- **Java tampoco.** AutoFirma, SILTRA, el programa D2 del Colegio de Registradores y Legalia
  son aplicaciones de escritorio. En Passenger sobre LucusHost no hay JVM ni procesos largos.
  Y si en algún flujo acabara haciendo falta un navegador automatizado, tampoco: Chromium
  necesita binarios, librerías del sistema y memoria sostenida que un compartido no da.
- **Y hay una tercera pata que el dossier no ve:** meter asientos en a3 o leer los datos de
  a3NOM exige **código corriendo dentro de la LAN del despacho** (unidad de red mapeada,
  ficheros `.DAT` bloqueados por el programa, certificado en el almacén de Windows). Eso es un
  **agente local Windows**, no un SaaS.

O sea que la arquitectura real no es "otro CIFRA": es **híbrida**, con tres piezas separadas.

**El cifrado casero.** `services/tpv/cripto.js` (AES-256-GCM con clave maestra en `.env`) es
correcto para una API-key de TPV y **no vale aquí**. Un certificado que firma en nombre de
otro es un modelo de amenaza distinto por completo.

**Trabajar sobre `main` sin ramas.** En CIFRA está justificado y bien argumentado. Aquí no:
un despliegue que rompe la presentación del 303 el día 18 de abril no se arregla con un
`git revert`.

### 2.3. Lo que el dossier promete y no existe como está escrito

Tres correcciones de fondo. Las tres las detectaría un informático competente de la gestoría
en la primera reunión, así que hay que corregirlas **antes** de enseñar el documento.

**a) "Servicios web FDI/AFI de la TGSS" — no existen.**
`AFI` y `FDI` no son servicios web: son **diseños de registro de ficheros**. El canal oficial
para transmitirlos es **SILTRA**, una aplicación de escritorio **Java para Windows**, o la web
de RED Online. No he encontrado ninguna documentación oficial de servicios web de Afiliación
o Cotización de la TGSS abiertos a autorizados RED. Generar un fichero AFI correcto desde Node
es perfectamente viable; **el problema no es construirlo, es transmitirlo.**

Y hay un detalle que remata la promesa de "en un clic, en tiempo real": **las remesas de
afiliación se procesan en tres tandas al día** —07:00, 15:00 y 20:00—, así que el tiempo real
programático no existe por ese canal. La otra vía, "Afiliación Online", es la web de RED.

Además, el dossier menciona el **certificado SILCON**, que **dejó de emitirse en 2016** por no
cumplir eIDAS. Si eso llega a la mesa de una gestoría laboral, se nota que quien lo escribió
no conoce el terreno.

Y "obtener el TA.2 en tiempo real" tampoco es correcto: el TA.2/S es un **formulario de
solicitud**; lo que se obtiene por RED es la **resolución del trámite**. Que además, desde el
1-jun-2025, se genera de forma **automatizada con sello electrónico de la TGSS**
([BOE-A-2025-8102](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-8102)) — o sea que el
"alta con comprobante inmediato" **sí es creíble**, solo que hay que contarlo bien.

**b) "Presentar por lotes los modelos 303, 111, 190 y 130" — esto el dossier lo tiene bien,
y por poco lo damos por malo.**

Este punto merece contarse como pasó, porque es el mejor argumento a favor de verificar en vez
de fiarse. El primer análisis concluyó que las autoliquidaciones (303, 111, 130) **no** tienen
servicio web y que había que automatizar un navegador. **El verificador adversarial lo refutó**,
y menos mal: habría llevado a construir un robot de navegador innecesario, con su VPS, su
fragilidad y su coste de mantenimiento.

Lo correcto es que **hay dos canales oficiales máquina a máquina, y entre los dos cubren todo
lo que promete el dossier**:

- **Presentación Directa.** El programa envía el fichero con el diseño de registro
  directamente al servidor de la AEAT con certificado, firma, y recibe el justificante. **Sin
  navegador.** La lista de modelos que soporta incluye autoliquidaciones: 111, 115, 117, 123,
  130, 131, 200, 202, 210, 216, 222, **303**, 309, 322, 353, 390, entre otros — más el 036 y
  el 100.
- **TGVI Online**, para declaraciones informativas (190, 347, 349, 180, 193…): SOAP 1.1
  document/literal sobre HTTPS con certificado de cliente, con validación inmediata y
  **presentación parcial de los registros correctos**. Eso último es oro para una gestoría:
  presentar el 190 de 300 trabajadores aunque cuatro tengan mal el NIF, y reprocesar solo esos
  cuatro.

Ambos están documentados en **"Especificaciones de Servicios Comunes Declaraciones AEAT" v2.9,
actualizada el 1-jul-2026** por el Departamento de Informática Tributaria, que define
*Presentación Directa*, *Validación e Impresión* y *Consulta de Declaraciones Presentadas*.
Existe además documentación específica de presentación de autoliquidaciones por servicio web
(`Autoliq-SW-v1-5.pdf`) y un WSDL publicado para el modelo 303.

Sigue habiendo una tarea de día uno: **descargar el PDF v2.9 y comprobar la lista exacta de
modelos**, porque la versión de julio de 2026 amplió la lista y puede haber una posterior. Pero
la conclusión cambia de fondo: **el módulo 1.2 es un desarrollo limpio contra un servicio
oficial, no un ejercicio de automatización de navegador.**

**c) "Genera el asiento directamente para A3 / Sage" — el muro no es el formato, es el plan contable.**
a3ASESOR no tiene API REST pública. La vía real de importar asientos es un fichero plano
ASCII de ancho fijo, `SUENLACE.DAT`, que se importa por *Utilidades → Importación-Exportación
→ Enlace contable*. Y hay un detalle que desmonta cualquier presupuesto cerrado: **cuatro
implementaciones reales independientes en GitHub discrepan en la longitud de registro —254,
256 y 512 caracteres—**. El diseño es específico de versión y de producto, no es un estándar
público, y **hay que sacarlo de la instalación del cliente**.

Pero el muro de verdad es otro, y lo escribió un equipo que lo midió y acabó descartando la
vía del asiento: **la subcuenta la numera cada despacho a su manera.** Que el `43000012` sea
"Reformas García" lo decide el despacho, no la IA. La IA extrae NIF, bases, cuotas y
retenciones con altísima fiabilidad —eso Eduardo ya lo tiene—, pero **elegir la subcuenta
correcta exige importar el plan contable del despacho y mantener un mapeo cliente→subcuenta.**

Hay dos salidas buenas a esto, y las dos convierten un problema en producto:

- **Entregar el libro registro en formato AEAT en vez del asiento.** Cualquier despacho sabe
  leerlo y **no depende del plan contable de nadie**. Es el entregable de menor riesgo.
- **Monetizar el mapeo.** Si la subcuenta es el muro para todos, es también el foso: una
  herramienta que importe el plan del despacho, proponga subcuentas con IA, aprenda de las
  correcciones y enseñe un semáforo de qué está listo. **Es exactamente el mismo patrón que el
  mapeo artículo↔receta del TPV de CIFRA**, incluida la trampa: ordenar por volumen, porque
  mapear las 60 subcuentas que mueven el 88 % del trabajo es una tarde, y mapear 429 es un
  proyecto.

> Y una pregunta de treinta segundos que puede cambiar medio proyecto: **¿la gestoría tiene
> IntegraLOOP / BILOOP?** Es una API REST comercial de terceros sobre a3, con OpenAPI,
> `SUBSCRIPTION_KEY` y token de 2 h. Si la tienen, los módulos 2.1, 4.1 y 4.2 pasan de
> ficheros planos e ingeniería inversa a terreno donde Eduardo ya es rápido.

### 2.4. Veredicto de viabilidad, módulo a módulo

| # | Módulo | ¿Viable? | Qué lo condiciona |
|---|---|---|---|
| 2.1 | Extracción de facturas | **Sí, alto** | 70 % ya construido. El muro es el plan contable, no la IA |
| 3.1 | Captura por WhatsApp | **Sí, alto** | Construido. Solo verificación de negocio y plantillas |
| 4.2 | Variaciones laborales | **Sí, alto** | Medio construido. Salida = Excel por correo, sin integración |
| 4.1 | Auditoría preventiva | **Sí, alto** | Las reglas deterministas son días de trabajo, no meses |
| 3.2 | Asistente legal RAG | **Sí, con recortes** | BOE resuelto; DGT frágil; jurisprudencia **cerrada** sin pagar |
| 1.1 | Motor de notificaciones | **Sí, replanteado** | Vía LEMA + apoderamientos. Alta como Gran Destinatario por delante |
| 2.2 | Conciliación bancaria | **Sí, por otra vía** | PSD2 exige agregador de pago. **La Norma 43 lo resuelve gratis** |
| 1.2 | Presentación de modelos | **Sí, alto** | Presentación Directa cubre 303, 111, 130 y más. Falta el sello y la colaboración social |
| 1.3 | Altas en Seguridad Social | **No como está escrito** | No hay servicio web. SILTRA es Windows de escritorio |

---

## 3. ¿Se puede hacer test sin el portal de Hacienda o la Seguridad Social habilitado?

Esta es la pregunta mejor contestada de todo el análisis, y la respuesta **cambia según el
organismo**. Resumen primero, detalle después:

| Organismo | ¿Hay entorno de pruebas? | ¿Se puede probar sin ser titular de nada? |
|---|---|---|
| **AEAT** (modelos, Veri\*factu, SII) | **Sí, abierto y gratis** | **Sí.** Basta un certificado propio de Brainstormers |
| **Delt@** (accidentes) | **Sí, público** | **Sí.** Sin permisos previos |
| **SEPE** (Contrat@) | Sí | Solo empresas ya autorizadas |
| **DEHú** (notificaciones) | Sí, "Servicios Estables" | **No.** Solo tras el alta como Gran Destinatario |
| **TGSS** (Sistema RED) | Solo un simulador local | **No.** Hace falta autorización RED |
| **Agregadores PSD2** | Sí, sandbox gratis | **Sí.** Salt Edge, Plaid, Enable Banking |
| **a3ASESOR / Sage** | **No existe** | Con Odoo + un addon abierto, en parte |

### 3.1. AEAT: sí, y es la mejor noticia técnica del análisis

Existe el **Portal de Pruebas Externas** de preproducción, en
[preportal.aeat.es](https://preportal.aeat.es/). Es **gratuito** y lo que se presenta ahí se
guarda en una base de datos de pruebas **sin ninguna trascendencia tributaria**: no genera
deuda, no genera obligación, no es una presentación real.

- **Se accede solo con certificado electrónico**; sin él devuelve 403. **Sirve el certificado
  de representante de persona jurídica de Brainstormers: 14 € + IVA, dos años, exportable a
  `.pfx`.** No hace falta ser la gestoría, ni tener un solo cliente, ni estar dado de alta
  como colaborador social.
- **Están publicados los modelos que pide el dossier**: 303 y 353 (IVA), 111/115/117/123
  (retenciones) e informativas incluido el 190. **El 130 no aparece listado** — hay que
  verificarlo entrando con certificado antes de comprometerlo por contrato.
- Tres hosts espejo: `prewww1.aeat.es` (equivale a www1), `prewww2.aeat.es`, y
  **`prewww10.aeat.es`, que es específicamente el de servicios web con certificado de sello de
  entidad** — o sea, justo el canal de la actuación automatizada.
- **Veri\*factu tiene su entorno abierto desde el 25-sep-2024**, con `SistemaFacturacion.wsdl`
  publicado. El SII tiene el suyo, con manual propio.

**Y hay una segunda vía de prueba que además es producto vendible:** los servicios de
**validación que no presentan**. La AEAT advierte expresamente que *"la validación no implica
la presentación"*. Eso permite validar el fichero real de un cliente real contra la AEAT y
enseñarle los errores **antes** de presentar. Eso no es un banco de pruebas: es una
funcionalidad —"auditoría previa a la presentación"— que se puede cobrar.

> **El límite que hay que escribir en la arquitectura, no descubrirlo:** la AEAT dice que
> preproducción es **solo para pruebas puntuales, en ningún caso para pruebas masivas ni para
> validaciones integradas en procesos de despliegue**, y que ante uso abusivo puede bloquear
> el acceso. O sea: **no se puede montar CI contra preproducción.** Los tests de regresión van
> contra mocks locales, y el entorno real se reserva para validación puntual de integración.
> Construir ese mock es trabajo del día uno, no una tarea de después.

### 3.2. Seguridad Social: no, y este es el módulo que hay que replantear

- **No existe sandbox de la TGSS abierto a quien no sea autorizado RED.** No lo he encontrado,
  y lo digo así: no encontrado, no "no existe" — no se pudo navegar `seg-social.es`
  directamente. La forma real de salir de dudas es **abrir un caso en CASIA preguntándolo**, y
  eso solo lo puede hacer la propia gestoría.
- **SILTRA Prácticas sí existe, pero no es lo que parece, y además no es abierto.** Permite
  enviar ficheros y leer respuestas sin que nada llegue de verdad a la Seguridad Social — pero
  **exige autorización RED previa**. No es un sandbox al que se dé de alta un desarrollador:
  es un modo de prácticas para quien ya está autorizado. Sirve para comprobar que nuestros
  ficheros son sintácticamente correctos y para formar a gente; **no para validar el ciclo
  completo contra un entorno de integración**, como sí ofrecen la AEAT y la DEHú.
- **La autorización RED se pide con el modelo FR.101 y tiene un plazo de resolución de hasta
  tres meses, con silencio negativo.** Si la gestoría ya la tiene —lo normal en una gestoría
  laboral en activo— no es un problema. Si no la tiene, **es un bloqueo de meses**. Es la
  pregunta número uno de la primera reunión.
- **Delt@ sí tiene entorno de pruebas público** en
  [pruebasdelta.mites.gob.es](https://pruebasdelta.mites.gob.es/), sin permisos previos. Es el
  único sitio de este ámbito donde se puede trastear hoy mismo, y sirve para **calibrar cuánto
  cuesta de verdad la firma en navegador** antes de comprometer nada.

### 3.3. DEHú: sí hay entorno, pero el alta va por delante

La vía oficial se llama **LEMA** y está reservada a la figura de **Gran Destinatario**, que
—y esta es la respuesta a la pregunta clave— **sí está abierta a un tercero privado**. Los
requisitos son cuatro: ser persona jurídica, recibir un volumen relevante de notificaciones
(pueden ser de varios NIF), acreditar capacidad técnica, y superar unas pruebas.

El entorno se llama **"Servicios Estables"** y **no es autoservicio**: forma parte del propio
procedimiento de alta. Se manda el formulario firmado con la declaración responsable y los
datos del certificado, se espera la aceptación **en pruebas**, se ejecutan allí las pruebas
que verifican que el software funciona, y solo después se pide el paso a producción.

**Consecuencia de calendario: hay una homologación de facto por delante.** El alta como Gran
Destinatario es el **primer hito** del proyecto, no un trámite del final. Hasta que no esté
aceptada no se puede escribir una línea validable contra el servicio real.

Y para operar desatendido: **DEHú admite certificados de sello (tipos @firma 4 y 8)**, que es
lo que permite que el cron corra sin nadie delante y sin custodiar el certificado de nadie.

### 3.4. Lo demás

- **PSD2**: sandbox gratuito en Salt Edge, Plaid y Enable Banking. **Se puede montar el
  pipeline completo —descarga de movimientos, normalización, casación contra facturas,
  sugerencia con IA— sin licencia, sin certificado eIDAS y sin gastar un euro.** Es lo primero
  que hay que hacer de ese módulo.
- **a3ASESOR**: no hay sandbox de ningún tipo. Pero el addon abierto `tl_suenlace_import` de
  Tecniloop (LGPL-3, para Odoo 19) **es un parser independiente del formato de a3**: se genera
  un `SUENLACE.DAT` y se comprueba que otro parser lo entiende. No demuestra que a3 lo acepte,
  pero **detecta el grueso de los errores de formato antes de pisar el despacho**. Y su código
  es, de facto, la mejor documentación pública que existe del formato.
- **BOE**: API REST pública, sin autenticación ni clave, con la legislación consolidada
  completa (~12.200 normas). Se puede empezar hoy mismo con `curl`.
- **BDNS** (Base de Datos Nacional de Subvenciones, IGAE): **API REST pública en JSON, sin
  autenticación documentada**, con convocatorias desde 2014. Es la única fuente pública que se
  puede consumir directamente desde el cPanel actual, sin certificado ni máquina Windows.
- **Catastro**: servicios web libres y gratuitos (`OVCCallejero`, `OVCCoordenadas`) con WSDL
  publicado, consultables sin certificado.

### 3.5. La respuesta corta

**Sí, se puede desarrollar y probar casi todo el proyecto sin que la gestoría tenga nada
habilitado, con dos excepciones y por 14 euros.**

Las dos excepciones son la **Seguridad Social** —hace falta autorización RED real, incluso
para el modo de prácticas— y la **DEHú**, donde el alta como Gran Destinatario incluye pasar
por su entorno de pruebas y se puede iniciar desde el día uno.
Todo lo demás —AEAT, Veri\*factu, SII, bancos, BOE, ficheros contables— se prueba con un
certificado de representante de Brainstormers y cuentas de sandbox gratuitas.

Eso significa que **se puede llegar a la primera reunión con la gestoría con cosas
funcionando**, en vez de con un dossier. Y eso cambia la conversación entera.

---

## 4. Nivel de seguridad: dónde estamos y qué hay que implementar

### 4.1. El diagnóstico, sin adornos

**Hoy el stack de CIFRA no puede sostener este proyecto, y el punto más débil es concreto:**
la clave maestra AES-256-GCM vive en un `.env` dentro de un cPanel compartido.

En hosting compartido no hay frontera de confianza real: el proceso corre sin root, sin
systemd, sin disco cifrado bajo control propio; **la clave maestra reside en el mismo sistema
de ficheros que los datos que cifra**, está en los backups del proveedor, y cualquiera con
acceso al panel —soporte del hosting incluido— puede leerla sin dejar traza que Eduardo pueda
auditar.

Para CIFRA, con datos de costes de restaurantes propios, eso es asumible. **Para nóminas y
contabilidad de miles de terceros, es muy difícil de defender en un expediente del art. 32
del RGPD después de una brecha.** Y ese es exactamente el escenario donde los importes dejan
de ser simbólicos.

### 4.2. Lo que hay en juego, con cifras reales

| Supuesto | Sanción AEPD | Por qué importa aquí |
|---|---|---|
| Gestoría que comparte documentación de un cliente sin consentimiento | **4.000 €** | El riesgo de papeleo es de miles, no de millones |
| Ceder datos de salud de un empleado sin consentimiento | **50.000 €** | Las nóminas llevan bajas médicas |
| Exponer un reconocimiento médico a un tercero **al escanear e incorporar documentación al sistema de gestión** | **40.000 €** | Es literalmente el pipeline que se quiere automatizar |
| Encargado que subcontrata sin autorización del responsable | **15.000 €** | Es el eslabón que Brainstormers no controla |

**El módulo de nóminas es el de mayor exposición sancionadora de todo el dossier**, y por una
razón que hay que mirar de frente: en un pipeline de clasificación automática, **adjuntar el
parte de baja del trabajador A al expediente de B no es un fallo hipotético, es
estadísticamente inevitable**. Y ese es justo el supuesto de los 40.000 €.

### 4.3. La cadena de responsabilidad, que es lo que casi nadie tiene bien

Son **tres niveles**, y hay que firmarlos antes de la primera línea en producción:

```
empresa cliente  →  gestoría  →  Brainstormers  →  Anthropic / Twilio / hosting
 (responsable)     (encargada)   (subencargada)      (sub-subencargados)
```

- La gestoría es **encargada** cuando lleva nóminas o contabilidad de sus clientes, y
  **responsable** solo de los datos de sus propios clientes y empleados. Es la doble posición
  simultánea, y es el error estructural más común en despachos.
- La subcontratación **exige autorización previa del responsable** (arts. 28.2 y 28.4 RGPD).
  Si Brainstormers añade un proveedor sin avisar, incumple Brainstormers.
- Hace falta **una página pública y versionada de subencargados** con notificación de cambios y
  plazo de oposición.

Y con Anthropic hay tres acciones concretas: **aceptar formalmente el DPA con la cuenta de
Brainstormers** —no operar con cuenta personal—, **activar Zero Data Retention antes de enviar
una sola nómina**, y declarar la transferencia internacional amparada en cláusulas tipo.

### 4.4. La EIPD no es opcional

La AEPD exige evaluación de impacto cuando concurren **dos o más** criterios de su lista del
art. 35.4. Aquí concurren cuatro o cinco: datos de categoría especial (salud y afiliación
sindical en nóminas), gran escala, tratamiento sistemático de personas en desequilibrio
contractual, y uso de tecnología innovadora.

**Hay que presupuestarla como entregable del proyecto, hecha antes de arrancar, no después.**
La hace la gestoría, pero Brainstormers aporta toda la descripción técnica. Retrasarla al
despliegue es un agravante directo si hay inspección.

### 4.5. Dos respuestas que ahorran dinero

**El ENS no hace falta.** El RD 311/2022 alcanza a un privado cuando **presta servicios a una
entidad pública para el ejercicio de sus potestades administrativas**. Presentar modelos como
colaborador social o apoderado es actuar **por cuenta del contribuyente**: la AEAT no es
cliente de Brainstormers, no hay contrato público. Solo haría falta si algún día se vende a una
administración, y entonces sería categoría **Media**. Eso ahorra entre **12.000 y 30.000 € de
adecuación más 3.000-8.000 € de auditoría** que el dossier podría haber dado por necesarios.

**NIS2 tampoco.** Sigue sin transponerse en España a septiembre de 2026 y, por tamaño, no
alcanza ni a la gestoría ni a Brainstormers. Conviene vigilar la publicación de la ley.

**Lo que sí conviene, cuando haya clientes:** **ISO 27001**. Es la que más peso tiene en
negociaciones privadas y la que menos cuesta explicar. **15.000-35.000 € el primer año y 5-9
meses.** No hace falta para el piloto, pero **hay que diseñar hoy para poder certificarse
mañana sin rehacer nada**.

### 4.6. Reglamento de IA: qué está vigente hoy

El calendario **cambió en julio de 2026**: el ómnibus digital retrasó las obligaciones de alto
riesgo del Anexo III a **diciembre de 2027** y las del Anexo I a **agosto de 2028**.

Hoy, septiembre de 2026, están vigentes tres cosas:

1. **Las prohibiciones del art. 5.** No afectan.
2. **La alfabetización en IA del art. 4**, vigente desde febrero de 2025 y supervisable desde
   agosto de 2026. **Obliga a Brainstormers como proveedor y a la gestoría como usuaria.**
3. **La transparencia del art. 50**, exigible desde el **2 de agosto de 2026**. Afecta
   directamente a El Sobre y a La Consulta: hay que decir que se está hablando con una IA, en
   la primera interacción. **Es un mensaje de bienvenida en Twilio: barato de hacer, caro de
   olvidar.**

**Ni el extractor contable ni el asistente fiscal son de alto riesgo.** El Anexo III no incluye
contabilidad ni asesoramiento fiscal, y la salida alimenta una revisión humana. Eso permite
lanzarlos sin sistema de gestión de calidad ni marcado CE — **con una condición que hay que
escribir en el contrato: revisión humana obligatoria**. El punto a vigilar es El Parte del Mes
si algún día puntúa o decide sobre personas.

> Y la obligación del art. 4 se puede convertir en producto: **casi ningún despacho pequeño ha
> hecho su plan de alfabetización en IA**. Material versionado, dos o cuatro horas, registro de
> asistencia y certificado. Coste marginal cero una vez hecho el primero.

### 4.7. El nivel de seguridad alto, concretado

No es una lista de buenas intenciones: es lo que hay que construir, con su decisión tomada.

**1. Salir del hosting compartido. Es lo primero y no es caro.**
La migración cuesta **decenas de euros al mes, no cientos** (LucusHost VPS desde ~10 €/mes;
IONOS desde 5 €). El argumento de "seguimos en compartido porque es barato" no se sostiene
frente a un riesgo de negocio total. **Dos tiempos:** salir del compartido en semanas con un
VPS, y decidir el destino definitivo cuando haya clientes.

Cuando llegue ese momento, los que tienen **ENS Nivel Alto certificado** y se pueden enseñar en
una propuesta: **Arsys** (extendió ENS Alto a todo su portfolio cloud en abril de 2026),
**Stackscale** (Grupo Aire, datacenters en Madrid, sin precios públicos), **AWS eu-south-2**
(Aragón, ENS High en 166 servicios) y **Azure Spain Central**. Hetzner, OVH y Scaleway son
baratos y válidos bajo RGPD, pero **no aportan ENS** — Scaleway solo publica un mapeo de
controles, no una certificación.

> Trampa que hay que evitar decir mal: **que Arsys o AWS tengan ENS Alto no certifica la
> aplicación de Eduardo.** Certifica la infraestructura. Decirlo de otra forma en una propuesta
> es exactamente el tipo de afirmación que se cae en la primera pregunta.

**2. No custodiar certificados. Ni los de clientes, ni idealmente ninguno.**
Ya está argumentado en §1. La vía técnica más limpia la da **Uanataca** (grupo Namirial,
prestador cualificado): certificados **emitidos en la nube sobre HSM cualificado**, con API
REST, de forma que **Eduardo nunca toca un PKCS#12** y el problema de custodia desaparece de
raíz. Alternativas: Redtrust (sin tarifa pública, con volumen mínimo que puede dejar fuera a un
piloto) e Ivnosys/Signaturit.

**Un HSM propio está descartado**: AWS CloudHSM ronda los **1.168 $/mes** por instancia y
normalmente hacen falta dos. Si hace falta HSM certificado, viene dentro del servicio del
prestador cualificado.

**3. Gestión de claves de verdad, por menos de 10 €/mes.**
**AWS KMS cuesta 1 $/mes por clave** más 0,03 $ por cada 10.000 peticiones. Eso permite **una
clave por gestoría** —aislamiento criptográfico por inquilino— con coste trivial hasta decenas
de clientes. Y abre una función que vende sola: **destrucción criptográfica**. Al terminar un
contrato se borra la clave y los datos quedan irrecuperables. Resuelve de golpe la tensión
entre el derecho de supresión y el registro inalterable.

**HashiCorp Vault no, en la fase 1.** Cambió de licencia en 2023 y operarlo (unseal, rotación,
alta disponibilidad) es una carga que a este tamaño no se paga.

**4. Base de datos: seguir en MariaDB, y este es el argumento.**
**MariaDB tiene cifrado en reposo nativo desde la 10.1**, con una sobrecarga del 3-5 %:
ficheros InnoDB y Aria, logs undo/redo, binlogs y tablas temporales. **PostgreSQL no lleva TDE
en el core.** O sea que migrar a Postgres por seguridad sería ir hacia atrás. Solo tendría
sentido si se necesitara `pgvector`, y **la v1 de La Consulta no lo necesita**: con las citas
nativas de la API de Claude sobre un corpus acotado se cumple el requisito de citar la fuente
sin embeddings, sin base vectorial y sin un proveedor más en la cadena de subencargados.

**Aislamiento: una base de datos por gestoría**, con `tenant_id` solo dentro de cada una. No un
esquema por cliente final. El contratante es la gestoría —decenas, no miles—, y así el backup,
la restauración, la portabilidad y el borrado se hacen sin tocar a los demás. **Esto se decide
en el primer commit**: cambiarlo después obliga a reescribir todas las consultas.

**5. Registro de auditoría inalterable, en tres capas.**
Sin esto no se puede demostrar quién usó qué certificado, cuándo y para qué — que es
exactamente lo que la gestoría necesita para defenderse.

- **Append-only en base de datos**: usuario con `INSERT` y `SELECT`, sin `UPDATE` ni `DELETE`.
- **Hash encadenado**: `hash = SHA-256(id ‖ ts ‖ tenant ‖ actor ‖ acción ‖ recurso ‖ payload_hash ‖ prev_hash)`.
- **Anclaje diario a WORM externo**: **S3 Object Lock en modo Compliance**, donde ni el root de
  la cuenta puede borrar ni sobrescribir antes de que expire la retención.

Encima de eso, **sellado de tiempo cualificado** del hash raíz: convierte los logs en prueba
oponible a terceros. Es barato y ningún competidor pequeño lo tiene.

**6. Docker Compose sí. Kubernetes no.**
Compose aporta tres cosas concretas: reproducibilidad (se acabó el "funciona en el cPanel"),
secretos distintos por servicio, y despliegue atómico con rollback. Con API, worker de colas,
MariaDB, Redis y el servicio de firma basta. **Kubernetes a este tamaño es sobreingeniería**, y
el riesgo de no entregar es tan real como el de seguridad.

**7. El servicio de firma, aislado del resto.**
Un único componente, con API interna mínima, que sea **lo único que toca material
criptográfico**, con sus propios logs y su propio despliegue. Reduce drásticamente el alcance de
una auditoría futura: se certifica esa pieza, no el sistema entero.

**8. Lo aburrido, que es lo que preguntan los auditores.**
Bastión con VPN y segundo factor obligatorio para todo acceso administrativo, incluido el del
despacho. Gestión automatizada de vulnerabilidades de dependencias en el CI. **Anonimización
automática de producción hacia preproducción**, que además es lo que permite desarrollar con IA
sin exponer datos de terceros. Y monitorización de caducidad de todo: certificados,
apoderamientos, autorizaciones — que es El Llavero.

**9. Y la barrera que no es técnica.**
**Confirmación humana previa a cualquier envío a una sede.** Presentar una autoliquidación de
forma totalmente desatendida convierte un fallo de software en una infracción tributaria del
cliente final, con recargos. Esto no se negocia por comodidad de producto.

### 4.8. El riesgo que no aparece en ninguna lista

**Dependencia de un único operador humano.** Sin Eduardo no hay quien opere el sistema. En un
servicio que presenta modelos con plazo legal, una indisponibilidad de días tiene consecuencias
para el cliente final. Es un riesgo de negocio, no de arquitectura, y hay que decidirlo antes
de firmar un contrato con SLA.

---

## 5. Qué más se puede hacer, y en qué orden va todo junto

De la investigación salieron **145 ideas** que el dossier no contempla. Aquí están las que
sobreviven al filtro de `cifra-producto`: *si no puedes decir quién lo vende ya y a cuánto, no
es una propuesta, es un deseo.* Y van mezcladas con las nueve del dossier, porque ordenarlas
por separado sería mentir sobre las prioridades.

**Cada una lleva nombre**, y el criterio del nombre es el de CIFRA: castellano llano, artículo
determinado, y **dice qué hace para quien lo usa, no qué tecnología lleva dentro**. "Motor
Centralizado de Notificaciones (NEO)" es exactamente lo contrario de eso.

### Bloque 0 — Antes que nada. Semanas, no meses

| # | Nombre | Qué es | ¿Dossier? | Esfuerzo |
|---|---|---|---|---|
| **1** | **El Llavero** | Inventario vivo de qué habilita qué: certificados con su caducidad, convenio de colaboración social, autorización RED, y **apoderamiento por cliente** con su estado (otorgado, pendiente de confirmar, caduca en N días, revocado). Avisa a 90/30/7 días | **No** | Bajo |
| **2** | **El Repaso** | Auditoría preventiva **sin IA**: saltos de numeración, duplicados exactos, descuadres base/cuota, asientos descuadrados, NIF con dígito de control incorrecto. Reglas deterministas | Sí (4.1) | Bajo |
| **3** | **El Parte del Mes** | Los clientes meten bajas, horas extra, vacaciones y bonus en un formulario. Sale un Excel listo para el software de nóminas del despacho | Sí (4.2) | Bajo |
| **4** | **El Calendario** | Calendario fiscal y laboral **por cliente**, generado de sus obligaciones reales, con avisos escalonados por WhatsApp | No | Bajo |

**Por qué El Llavero es el número uno y no está en el dossier.** Porque es la pieza de la que
dependen 1.1, 1.2 y 1.3, y porque el fallo que hunde este producto no es un error: es el
silencio. Un apoderamiento caducado hace que un buzón deje de leerse **sin dar error**. El
Llavero es lo que convierte el modelo legal correcto en algo operativamente viable.

**Por qué El Repaso va antes que todo lo vistoso.** Son reglas deterministas, se implementan
en días, **no se equivocan nunca**, no tocan ninguna sede, no necesitan permiso de nadie, y
producen un informe que impresiona en la primera reunión. Es el equivalente exacto de lo que
en CIFRA fue el semáforo de plausibilidad.

**Por qué El Parte del Mes es el primer producto facturable.** La investigación lo confirmó
contra proyectos reales: la vía por la que hoy un cliente manda sus variaciones de nómina es
**un Excel por correo**. No toca el software del despacho, no necesita API, **no puede
corromper nada**, y CIFRA ya tiene las tres piezas construidas.

### Bloque 1 — El motor. Meses

| # | Nombre | Qué es | ¿Dossier? | Esfuerzo |
|---|---|---|---|---|
| **5** | **El Lector** | Extracción de facturas y tickets con IA: NIF, base, cuotas de IVA, retenciones. **70 % ya construido en CIFRA** | Sí (2.1) | Medio |
| **6** | **El Plano** | Importa el plan contable del despacho, propone subcuenta con IA, aprende de las correcciones, y enseña un semáforo de cobertura ordenado **por volumen** | **No** | Medio |
| **7** | **El Sobre** | Captura de tickets por WhatsApp. Construido en CIFRA | Sí (3.1) | Bajo |
| **8** | **Lo Que Falta** | Sabe qué documentación no ha llegado —cruzando movimientos bancarios contra facturas recibidas— y **persigue al cliente por WhatsApp hasta que llega** | **No** | Bajo |
| **9** | **El Cartero** | Vigilancia diaria de la DEHú, clasificación del PDF con IA, **extracción del plazo** y alta de la tarea con fecha límite y responsable | Sí (1.1) | Alto |
| **10** | **El Cuadre** | Conciliación bancaria. **Primero por fichero Norma 43**, que no necesita licencia ni agregador; PSD2 después y solo si compensa | Sí (2.2) | Medio |

**El Plano no está en el dossier y es el que decide si El Lector sirve para algo.** La IA
extrae los importes con altísima fiabilidad; lo que no puede adivinar es que el `43000012` de
este despacho sea "Reformas García". Y la trampa se conoce, porque CIFRA ya la pisó con el
mapeo artículo↔receta del TPV: **hay que ordenar por volumen**. Mapear las subcuentas que
mueven el 88 % del trabajo es una tarde; mapearlas todas es un proyecto que nadie termina.

**Lo Que Falta puede ser el módulo más vendible de la lista, y es de los baratos.** El dolor
número uno de un despacho no es procesar la factura: es **conseguirla**. Y esto se apoya
entero en cosas que ya existen.

**El Cartero es el único módulo con retorno expresable en euros exactos**: no se vende "lectura
de la DEHú", que es un commodity de 15 €/mes con cinco competidores; se vende **el seguro
contra el recargo**. La pregunta de venta es cuántos plazos perdió el despacho el año pasado y
cuánto costaron.

**El Cuadre, corregido:** el dossier propone PSD2 y esa es la vía cara. La opción gratuita
histórica (Nordigen / GoCardless Bank Account Data) **está cerrada a nuevas altas desde julio
de 2025**, y el suelo realista de producción está en **150-500 £/mes**. La **Norma 43** hace lo
mismo sin licencia, sin agregador, sin consentimiento SCA y sin coste por conexión — que es,
además, como lo resuelven hoy las gestorías españolas. PSD2 es una mejora de comodidad, no el
camino.

### Bloque 2 — Lo que abre la puerta grande

| # | Nombre | Qué es | ¿Dossier? | Esfuerzo |
|---|---|---|---|---|
| **11** | **El Censo** | Audita la cartera del despacho y dice **quién cumple Veri\*factu y quién no**. Genera una lista de trabajo facturable sin fabricar ningún software de facturación | **No** | Bajo |
| **12** | **El Sello** | Microservicio de firma XAdES aislado. Es lo único que toca material criptográfico | **No** | Alto |
| **13** | **La Ventanilla** | Presentación de modelos por **Presentación Directa** y **TGVI Online**, sin navegador. Con confirmación humana antes de cada envío | Sí (1.2) | Medio-alto |
| **14** | **La Consulta** | Asistente legal y fiscal. **Primero solo para los empleados del despacho**, nunca para el cliente final | Sí (3.2) | Medio |
| **15** | **El Boletín** | Cada mañana, las novedades del BOE que afectan a este despacho, con su cita | **No** | Muy bajo |

**El Censo es el caballo de Troya, y sale de la mayor ausencia del dossier.** Veri\*factu
obliga desde el **1-ene-2027** a los sujetos del Impuesto sobre Sociedades y desde el
**1-jul-2027** al resto, tras la prórroga del **Real Decreto-ley 15/2025** (BOE de 3-dic-2025).
Y por debajo hay algo más grande: la **factura electrónica B2B ya tiene reglamento** —**Real
Decreto 238/2026, de 25 de marzo**, en vigor desde el 20 de abril de 2026— que obliga a todas
las empresas y autónomos a emitir y recibir factura en **formato estructurado**: un PDF deja de
ser una factura electrónica. En dos o tres años las facturas de los clientes de la gestoría
dejarán de llegar en PDF y llegarán en XML.

> Corrección para `docs/00-MODULOS.md` de CIFRA: ahí está escrito que el Real Decreto de
> factura electrónica *"sigue sin publicarse en el BOE"*. **Ya está publicado.** Lo que sigue
> pendiente es la Orden Ministerial que fija los plazos, que a agosto de 2026 no había salido.
> El calendario de 12 y 24 meses cuenta desde esa Orden, no desde el reglamento.

**Y aquí va el aviso serio, porque es la línea que separa un buen negocio de un problema.**
Fabricar un sistema de facturación (un SIF) es otra cosa que auditar quién cumple:

- **La AEAT no homologa ni certifica software.** El cumplimiento se acredita con una
  **declaración responsable del fabricante**, por versión. No hay auditoría externa ni sello.
- Eso quita la barrera de entrada **y traslada toda la responsabilidad a quien firma**.
  El art. 201 bis LGT prevé hasta **150.000 € por ejercicio y tipo de sistema** para el
  fabricante, más **1.000 € por cada sistema comercializado** sin la declaración exigible.
  Con 300 despliegues, un defecto de conformidad escala solo.
- **El plazo del fabricante no se prorrogó.** Venció el 29-jul-2025. Un SIF que nazca hoy
  tiene que nacer conforme al 100 %.

**El Censo esquiva todo eso**: no fabrica nada, audita. Y produce trabajo facturable para el
despacho desde el primer día. Fabricar el SIF —llamémoslo **El Talonario**— es una decisión
posterior y **solo de Eduardo**, porque es él quien firmaría la declaración responsable.

### Bloque 3 — Lo laboral, que es donde el dossier deja más dinero sobre la mesa

| # | Nombre | Qué es | ¿Dossier? | Esfuerzo |
|---|---|---|---|---|
| **16** | **El Rescate** | Comprueba sistemáticamente las **bonificaciones de cotización no aplicadas** en los boletines. Produce devoluciones reales, en euros | **No** | Medio |
| **17** | **El Tramo** | Optimizador de la cotización de autónomos por ingresos reales: mejor tramo, cuándo cambiarlo, anticipo de la regularización anual | **No** | Bajo |
| **18** | **El Aviso** | Vigilancia automática de bajas médicas de toda la cartera vía **fichero FIE / servicio FIER**. Desde el RD 1060/2022 el trabajador ya no entrega el parte: lo comunica el INSS | **No** | Medio |
| **19** | **El Convenio** | Extrae con IA tablas salariales, pluses y jornada del texto del convenio, y avisa de las revisiones | **No** | Alto |
| **20** | **El Alta** | Alta de trabajador en un clic | Sí (1.3) | **Alto y replanteado** |

**El Rescate y El Tramo son las dos llamadas comerciales infalibles del año**, y ninguna está
en el dossier. Una produce dinero devuelto —visible, en euros, atribuible al software— y la
otra abre una conversación de dinero con cada autónomo varias veces al año.

**El Convenio es la traslación más directa de lo que CIFRA ya hace escaneando cartas de
restaurante**: coger un documento en prosa y sacar una tabla estructurada. La diferencia es que
aquí el documento son 80 páginas de convenio provincial y el error se paga en una inspección.
Va marcado como esfuerzo alto por eso, no por la extracción.

**El Alta va el último de este bloque a propósito**, y no por falta de valor: por lo dicho en
§2.3. Requiere Windows y SILTRA, o RPA sobre RED Online, y en ambos casos hay que decirle a la
gestoría exactamente lo que va a haber por debajo.

### Bloque 4 — Lo que se construye cuando lo de arriba está firme

| # | Nombre | Qué es | ¿Dossier? |
|---|---|---|---|
| **21** | **El Expediente** | Prevención de blanqueo para el propio despacho como sujeto obligado: titular real, cribado de listas, scoring, expediente a diez años | No |
| **22** | **La Ayuda** | Radar de subvenciones por CNAE, provincia y tamaño sobre la **API pública de la BDNS** —sin autenticación, consumible desde el cPanel actual—. Es dinero encontrado, y justifica subir la minuta | No |
| **23** | **El Simulador** | Módulos vs. estimación directa, autónomo vs. sociedad, reparto óptimo de sueldo y dividendo. Informes que el cliente percibe como asesoría, no como trámite | No |
| **24** | **El Vigía** | Vigilancia del BORME sobre la cartera: nombramientos, ceses, cambios de objeto o domicilio | No |
| **25** | **La Minuta** | Rentabilidad por cliente y por empleado del propio despacho, y detección de clientes en riesgo de fuga | No |
| **26** | **El Crédito** | Aviso de crédito de formación FUNDAE sin consumir antes del cierre del año, y control del plazo de 2 días para comunicar cada grupo | No |
| **27** | **El Titular** | Control de vencimientos societarios: declaración anual al **Registro Central de Titularidades Reales** (operativo desde el 19-sep-2023), cuentas anuales, libros | No |
| **28** | **Las Cuentas** | Genera el XBRL y el fichero de importación del programa **D2** desde el balance, y redacta la memoria abreviada con IA. El depósito sigue siendo manual | No |

### Lo que NO hay que construir

Tan importante como la lista de arriba:

- **Un SIF de facturación (El Talonario), salvo decisión expresa.** Ver arriba: la declaración
  responsable es responsabilidad personal del fabricante, y el mercado ya tiene a Sage, a3,
  Holded, Cegid, B2Brouter y Edicom vendiéndolo desde hace dos años. **Y la AEAT regala una
  aplicación gratuita** en su sede, sin límite de facturas.
- **Un motor de notificaciones aislado.** Wolters Kluwer (Portal NEOS), Ivnosys (IvNeos),
  ZeroComa (EdasNEO), Cegid Microdata y Addalia ya lo venden, **varios operando ya por LEMA**.
  Que ZeroComa esté ahí demuestra a la vez que es factible y que no diferencia por sí solo. El
  valor está en lo que va encima: clasificación, plazo, tarea y aviso.
- **Software de nóminas o de contabilidad propio.** Se integra, no se compite. Es el mismo
  razonamiento que llevó a CIFRA a no hacer un TPV.
- **Custodia de certificados de clientes.** No es que sea difícil: es que es la vía equivocada.
  Ver §1.
- **Jurisprudencia gratis.** CENDOJ tiene CAPTCHA **como control de acceso deliberado** y sus
  condiciones prohíben la descarga masiva. Ahí no hay atajo técnico: o se paga una base
  comercial, o se acota el alcance por escrito y se dice.
- **Un asistente legal RAG generalista.** Wolters Kluwer lanzó **a3innuva Nómina Expert AI** en
  junio de 2026: el asistente vive dentro del software donde está el dato del despacho, y
  competir de frente contra eso es competir en desventaja. La Consulta solo tiene sentido
  **hacia dentro** —copiloto de los empleados sobre los expedientes del propio despacho— y
  sobre el corpus que el sistema ya tenga: las notificaciones descargadas, los modelos
  presentados, la contabilidad. Ahí sí hay algo que el vertical no puede hacer.
- **Un registro de jornada vendido como obligación.** El real decreto que lo haría digital,
  inmutable y accesible en remoto por la Inspección **seguía en tramitación en 2026, sin fecha
  en el BOE**. Se puede construir el módulo, pero no se puede prometer que sea obligatorio a
  fecha X. Es la misma trampa que en CIFRA con el control horario.

---

## 6. Con qué hay que conectarse y qué hace falta

Esto es, como decías, lo más importante: no es una lista de APIs, es **una lista de puertas, y
cada una tiene su portero**. Ordenadas por cuándo hay que empezar el trámite, no por
importancia.

### 6.1. Lo que hay que pedir el primer día porque tarda

| Qué | A quién | Plazo | Bloquea |
|---|---|---|---|
| **Autorización RED** (modelo FR.101) | TGSS, Dirección Provincial | **Hasta 3 meses**, silencio negativo | El Alta, El Rescate, El Aviso |
| **Alta como Gran Destinatario de DEHú** | SGAD (Transformación Digital) | Desconocido. Incluye pruebas | El Cartero |
| **Sello electrónico cualificado** | FNMT, Camerfirma o Uanataca | Semanas | Toda la actuación desatendida |
| **Convenio de colaboración social** | Colegio profesional + AEAT | Meses **si no lo tienen ya** | La Ventanilla |

> Nota sobre la base legal, porque el verificador la matizó: el **art. 92 LGT** y la **Orden
> HAC/1398/2003** (en su redacción tras la Orden HFP/534/2022 y la Orden HAC/86/2025) están
> confirmados. La cita de los **arts. 79-81 del RD 1065/2007** que aparece en varios sitios
> **no se ha podido confirmar**: hay que verificar el articulado exacto en el texto consolidado
> del BOE antes de usarlo en documentación que se entregue a un cliente.

**Las cuatro preguntas de la primera reunión**, y las cuatro son de sí o no:

1. **¿Sois autorizado RED?** ¿Y cuántos usuarios secundarios tenéis? (Casi seguro que sí.)
2. **¿Estáis adheridos a un convenio de colaboración social, y de qué tipo?** El tipo
   determina qué modelos podéis presentar por terceros, y por tanto qué se puede automatizar.
3. **¿Tenéis IntegraLOOP / BILOOP?** Treinta segundos, y puede cambiar medio proyecto.
4. **¿Qué versión exacta de a3 (o Sage, o ContaPlus) tenéis instalada?** Sin eso **no se puede
   presupuestar** el módulo contable: el `SUENLACE.DAT` no es un estándar.

### 6.2. Lo que se compra o se contrata

| Qué | Para qué | Coste conocido |
|---|---|---|
| **Certificado de representante de persona jurídica FNMT** (Brainstormers) | Desbloquear preproducción de la AEAT **hoy** | **14 € + IVA**, 2 años |
| **VPS o servidor con datos en la UE** | La firma, los certificados y los workers con navegador. **Fuera del cPanel compartido** | Desde ~10 €/mes. Ver §4.7 |
| **Agregador PSD2** (Salt Edge, Tink, Enable Banking) | Solo si El Cuadre pasa de Norma 43 a PSD2 | Sandbox gratis; producción **150-500 £/mes** |
| **Base jurídica comercial** (Aranzadi, vLex, Tirant, Iberley) | La única salida legal para jurisprudencia | Sin precio público. Pedir tres presupuestos |
| **Custodia de certificados** (Redtrust, Ivnosys, Uanataca) | Solo si se decide no montar el sello propio | **Sin tarifa pública** y con volumen mínimo |
| **WhatsApp Business** | El Sobre, Lo Que Falta, El Calendario | Ya está montado en CIFRA vía Twilio |

> **Sobre Redtrust, y es importante porque el dossier lo da por hecho:** su gracia es que la
> clave nunca sale del contenedor. Pero para operar **en sedes electrónicas** usa una
> **extensión de navegador**, o sea con persona delante, y su API DSS sirve para **firmar
> documentos**, no para hacer de cliente TLS contra una sede. Es decir: **es posible que no
> resuelva el caso de uso del cron nocturno**, que es justo el del Cartero. Hay que verificarlo
> antes de contratar nada, y por eso el diseño recomendado es el sello propio aislado.

### 6.3. Con qué se conecta técnicamente, y por qué canal

| Sistema | Canal real | Autenticación | ¿Sandbox? |
|---|---|---|---|
| **AEAT informativas** (190, 347, 349) | SOAP 1.1 document/literal + **TGVI Online** | Certificado cliente en TLS | **Sí, gratis** |
| **AEAT autoliquidaciones** (303, 111, 130, 200…) | **Presentación Directa**: envío del fichero al servidor, sin navegador | Certificado, con firma | **Sí, gratis** |
| **AEAT Veri\*factu / SII** | SOAP sobre **mTLS**, WSDL publicado | Certificado, **incluido sello** (`prewww10`) | **Sí, gratis** |
| **DEHú** | SOAP con **WS-Security** (BinarySecurityToken) | Sello @firma tipo 4 u 8 | Sí, tras alta |
| **TGSS afiliación** | **Fichero AFI vía SILTRA** (Windows) o RED Online. Remesas en 3 tandas diarias | Certificado de persona física | Solo prácticas, y con autorización RED |
| **TGSS notificaciones** | **Servicio web** de consulta y firma | Certificado admitido | No consta |
| **SEPE Contrat@ / Certific@2** | **XML con XSD público** | Autorización previa | Sí, si ya autorizado |
| **Bancos** | **Fichero Norma 43** o API del agregador | Ninguna / la del agregador | Sí |
| **a3ASESOR** | Fichero `SUENLACE.DAT` (ASCII, **cp1252**, CRLF) | Ninguna. Importación manual | No |
| **a3NOM v5** | Ficheros `.DAT` en unidad de red | Acceso a la LAN | No |
| **BOE** | **API REST pública**, sin clave | Ninguna | No hace falta |
| **TEAC (DYCTEA)** | Scraping, sin CAPTCHA | Ninguna | No hace falta |
| **BDNS** (subvenciones) | **API REST pública en JSON** | Ninguna | No hace falta |
| **Catastro** | Servicios web con WSDL publicado | Ninguna | No hace falta |

Dos avisos técnicos que ahorran semanas:

- **La API del BOE tiene trampas concretas.** El endpoint `/texto` **solo** acepta
  `Accept: application/xml`; con JSON devuelve 400. Y `limit=-1` no devuelve todo: topa en
  10.000 y hay que paginar.
- **`SUENLACE.DAT` va en cp1252 con CRLF, no en UTF-8.** Una eñe mal codificada **descuadra la
  línea en bytes** y el fichero entero deja de valer, sin error visible.

### 6.4. Lo que alguien tiene que leer a mano antes de escribir código

Esta lista no es opcional y sale de §0. Ninguno de estos documentos se ha podido abrir:

1. **"Especificaciones de Servicios Comunes Declaraciones AEAT" v2.9** (1-jul-2026). Decide el
   alcance entero de La Ventanilla. **Es la primera tarea del proyecto.**
2. **Nota de la Secretaría de Estado para el Avance Digital** sobre delegación de firma y cesión
   de certificados (mayo 2019).
3. **Condiciones de uso de la FNMT**: persona física y representante de persona jurídica.
4. **Política de Firma Electrónica y de Certificados de la AGE**, para sacar el identificador,
   la URL y el hash de la política vigente. Sin eso no se construye una firma XAdES-EPES válida.
5. **Orden HAC/1177/2024**, si se llega a considerar El Talonario.
6. La **lista oficial de organismos adheridos a DEHú**, para acotar por escrito qué cubre El
   Cartero y qué no.

### 6.5. Las tres incógnitas que no se resuelven leyendo

Y que hay que resolver antes de cerrar presupuesto:

1. **¿Los servicios web de DEHú permiten consultar en nombre de un poderdante** (un NIF
   distinto al del certificado), o solo el buzón propio del titular? Si es lo segundo, **El
   Cartero no es automatizable por API** y hay que replantearlo entero.
2. **¿La autenticación de los servicios de presentación de la AEAT es mTLS?** Si lo es, la
   clave privada tiene que estar disponible para el stack TLS del proceso, y una solución de
   custodia "donde la clave nunca sale" solo sirve si expone un PKCS#11 usable. **Esto decide
   si se contrata Redtrust o se monta el sello propio.**
3. **¿Existe algún entorno de prácticas de la TGSS negociable caso a caso?** Se pregunta
   abriendo un caso en **CASIA**, y solo lo puede hacer la gestoría.

---

## 7. Roadmap para hacerlo íntegramente con Claude

Parte de cómo se trabaja hoy en CIFRA —Eduardo no programa, Claude Code escribe, prueba y
despliega— y de una diferencia que hay que asumir desde el principio:

> En CIFRA, un número mal calculado es un consejo que se sigue. **Aquí, un asiento mal
> imputado o un modelo mal presentado es un recargo con el nombre de un colegiado detrás.**
> La regla de `cifra-honestidad` no se relaja: se endurece.

### Fase 0 — Los catorce euros. Semana 1

Lo único que hay antes de esto es una decisión. Lo que hay después es código funcionando.

- Comprar el **certificado de representante de persona jurídica** de Brainstormers (14 € + IVA).
- Darlo de alta en **preproducción de la AEAT** y hacer la prueba de vida: un script que
  autentica contra `prewww1.aeat.es` y recibe respuesta. **Es el hito que convierte el dossier
  en proyecto.**
- **Descargar y leer el PDF v2.9.** Hasta que no esté leído, La Ventanilla no se presupuesta.
- **Iniciar el alta como Gran Destinatario de DEHú.** Va por delante de todo porque tiene
  pruebas de por medio y plazo desconocido.
- Suscribirse a la lista `dehu-grandes-destinatarios`: es donde se avisan las roturas de
  compatibilidad con semanas de antelación.
- Preguntar a la gestoría las **cuatro preguntas de §6.1**.

**Lo que puede hacer Claude solo:** todo salvo comprar el certificado y firmar los formularios.

### Fase 1 — Lo que no toca a nadie. Semanas 2-6

Tres módulos que **no necesitan certificado, ni permiso, ni integración con nadie**, y que
producen una demo que se puede enseñar.

- **El Repaso** sobre datos reales del despacho, en modo solo lectura.
- **El Calendario** por cliente.
- **El Boletín** diario del BOE. Es lo que más rápido convence, y se construye en días.

**La puerta de esta fase:** que El Repaso encuentre, en la contabilidad real del despacho, al
menos un error que el despacho reconozca como error. Si no lo encuentra, el motor está mal o
los umbrales están mal — **y no se pasa de fase**. Es la misma regla que en CIFRA: *nada se
escribe hasta que un caso conocido cuadra.*

### Fase 2 — El primer producto facturable. Semanas 6-12

- **El Parte del Mes**, con salida a Excel. Sin tocar el software del despacho.
- **El Llavero**, con los apoderamientos y certificados que ya existan.
- **El onboarding asistido de apoderamientos**: el asistente que guía al cliente final con su
  Cl@ve, por WhatsApp y web. Es el cuello de botella humano del proyecto entero, y **se ataca
  antes de necesitarlo**, no cuando El Cartero esté listo y no haya poderes.

Al final de esta fase hay algo por lo que se puede cobrar una cuota.

### Fase 3 — El motor. Meses 3-6

- **El Lector**, portando el pipeline de `agente-gastos` y cambiando el destino: de producto de
  hostelería a **cuenta del PGC + tipo de IVA + retención**.
- **El Plano**, con el semáforo de cobertura ordenado por volumen.
- **El Sobre** y **Lo Que Falta**.
- **El Cuadre**, por Norma 43.

**La puerta:** un trimestre entero de un cliente real, contabilizado por El Lector y por una
persona, **y que cuadren los dos**. Sin eso no se escribe nada en la contabilidad de nadie.

### Fase 4 — La infraestructura. En paralelo desde el mes 4

Esta fase no produce nada visible y es la que sostiene todo lo demás.

- **VPS con datos en la UE**, fuera del cPanel compartido.
- **El Sello**: microservicio de firma aislado, lo único que toca material criptográfico, con
  sus propios logs y su propio despliegue. Reduce el alcance de cualquier auditoría futura a
  esa pieza.
- **El mock de la AEAT**, porque preproducción no admite CI. Sin él no hay tests de regresión.
- **El agente local Windows** (El Enlace), si la integración con a3 lo exige.

### Fase 5 — Las sedes. Meses 6-12

- **El Cartero**, en cuanto el alta de Gran Destinatario esté aceptada.
- **La Ventanilla**, **empezando por el 190 y las informativas**, que sí tienen servicio web, y
  usando la validación-que-no-presenta como producto intermedio.
- **El Censo** de Veri\*factu, que es la palanca comercial del año.

### Fase 6 — Lo laboral. Meses 9-15

El Rescate, El Tramo, El Aviso, El Convenio y, al final y con las cartas boca arriba, El Alta.

---

### Cómo se trabaja con Claude en este proyecto

**El modo por defecto sigue siendo PASO A PASO**, pero con dos cambios respecto a CIFRA:

- **Aquí sí hay ramas.** Una por módulo, y `main` solo recibe lo que ha pasado su puerta. El
  argumento de CIFRA para trabajar sobre `main` —módulos acoplados, varias sesiones en el mismo
  árbol— no aplica a un producto que se despliega contra la Administración.
- **AGENTES para investigar, nunca para escribir.** Este documento es exactamente el caso de
  uso: pregunta abierta, varias respuestas plausibles, no toca producción. Escribir el código
  de una firma XAdES entre varios agentes es la forma de tener cuatro implementaciones y
  ninguna que funcione.

**Las cinco paradas del LOOP**, ampliadas para este proyecto: credenciales nuevas,
`npm install`, desplegar, escribir en producción, decisiones que solo puede tomar Eduardo, y
**cualquier borrado** — más dos nuevas:

- **Cualquier envío a una sede que no sea preproducción.**
- **Cualquier escritura en la contabilidad o en las nóminas de un cliente de la gestoría.**

**Skills que hay que escribir** (el mismo patrón que las diez de CIFRA):

| Skill | Para qué |
|---|---|
| `gestoria-honestidad` | La hermana de `cifra-honestidad`, con las trampas de este dominio: el cero silencioso de un apoderamiento caducado, el IVA en un solo lado, la cuenta contable inventada, la normativa derogada presentada como vigente |
| `gestoria-firma` | Todo lo de XAdES-EPES en un sitio: política de la AGE, identificador, hash, y los errores conocidos. Es donde se va el tiempo si no está escrito |
| `gestoria-aeat` | Cómo se prueba contra preproducción sin ganarse un bloqueo, y qué está permitido |
| `gestoria-formatos` | `SUENLACE.DAT`, AFI, N43, XSD del SEPE: longitudes, codificaciones y trampas, con los casos verificados |

**Y una regla que vale por todas, tomada de CIFRA y que aquí es literal:** *las reglas de
negocio nunca se inventan.* Si falta un dato fiscal o laboral, **se pregunta**. En CIFRA eso
produjo un food cost del 6 % porque nadie había escrito qué cuesta una txuleta. Aquí produciría
un modelo presentado mal.

---

## 8. El mercado, el precio y la competencia

Esta sección no estaba en tus ocho preguntas, pero es la que decide si el proyecto es un
negocio o un ejercicio técnico. Y trae el dato más incómodo de todo el análisis.

### 8.1. "Te traigo IA" ya no vende

**El 70,5 % de los despachos profesionales españoles usa IA a diario en 2026**, frente a
alrededor del 42 % el año anterior (Barómetro de la Asesoría 2026 de Wolters Kluwer, quinta
edición, junio de 2026). Y los cuatro verticales grandes ya la han metido dentro del producto:
**Wolters Kluwer lanzó a3innuva Nómina Expert AI en junio de 2026** y **Zucchetti empuja Altai
pAIroll** como "primer operador IA de nómina".

La consecuencia es directa: **la objeción del gestor va a ser "ya tengo IA en a3"**. El discurso
no puede ser la tecnología; tiene que ser tareas concretas de punta a punta y ahorro medible.

Y hay un ángulo mejor que el ahorro. El mismo barómetro dice que **el 69 % de las asesorías
aumentó su cartera en 2025** y el sector **factura más y gana menos**: más clientes y más
normativa sin poder subir precios al mismo ritmo. **El despacho no compra IA por moda, compra
margen.** El retorno hay que expresarlo en *clientes adicionales por asesor sin contratar a
nadie*, no en documentos procesados.

### 8.2. El dato que puede tumbar el modelo de negocio

Según un comparador sectorial, en despachos de **1 a 3 empleados** cerca del **29 % gasta entre
1 y 250 € AL AÑO** en software y otro **27 % entre 250 y 500 €/año**; en despachos de 4 a 19
empleados el tramo dominante (49 %) es **250-500 €/año**.

Si eso es cierto, **un producto de 200-500 €/mes por despacho supera el presupuesto anual
completo de software de la mayor parte del mercado objetivo.** Y 200-500 €/mes es exactamente
lo que anuncian los blogs de "copiloto IA para asesorías", junto con implantaciones de
6.000-15.000 €.

> **Este dato es el que más urge verificar de todo el documento**, y no se puede verificar
> leyendo: se pregunta. Es una conversación de diez minutos con dos o tres gestorías. Fijar
> precio sin eso es fijarlo a ciegas.

Contexto que ayuda a calibrar: **el 77 % de las asesorías españolas tiene menos de diez
empleados.** El cliente tipo es un despacho de tres a ocho personas **sin departamento de
informática y sin capacidad de integrar nada**. Eso descarta un producto que exija proyecto de
implantación y obliga a llave en mano.

### 8.3. Qué se paga hoy, con cifras

| Concepto | Precio | Fuente |
|---|---|---|
| Gestoría a un autónomo | **80-130 €/mes** | Portales sectoriales españoles |
| Gestoría a una SL | **180-500 €/mes** | Ídem |
| Software horizontal de pyme (Anfix, Quipu, Billin, Holded) | **6-30 €/mes** | Comparadores españoles |
| Extracción de facturas, por documento (Klippa) | **desde 0,28 €/factura** | Klippa |
| Ídem, horquilla real de mercado | **0,03 € (alto volumen) a 0,45 €** | Dext, BillBjorn, comparadores |
| Rossum, plan de entrada | **18.000 $/año** | Rossum |
| TaxDome, gestión de despacho | **800-1.200 $/usuario/año** | Comparadores |
| Silverfin, **por expediente de cliente/año** | **~60-100 £** según volumen | Comparadores |

Dos conclusiones de aquí:

**No inventes la unidad "euro por asiento".** No existe como precio publicado en España. La
unidad real de facturación del sector es la **cuota mensual por cliente**, y en digitalización
se cuenta **por página**, no por factura.

**El modelo replicable es el de Silverfin: cobrar por cliente-expediente gestionado.** Alinea el
precio con lo que la gestoría cobra a *su* cliente, y esa es la única forma de que las cuentas
salgan. Si la gestoría cobra 100 €/mes por un autónomo con ~40 documentos, el software no puede
llevarse más de 10-20 € de esos 100. A 40 documentos, eso son **0,25-0,50 € por documento**:
justo la horquilla alta del mercado, así que el producto tiene que hacer bastante más que
extraer.

**Y una buena noticia:** ninguno de los cuatro verticales grandes publica precio de lista. **En
un mercado sin precios públicos, entrar con precio transparente y publicado es en sí mismo un
diferenciador.**

### 8.4. Dónde está ocupado y dónde no

| Módulo del dossier | Competencia real | Veredicto |
|---|---|---|
| Extracción de facturas | **Dijit.app, Quantum Economics, Vertebra Gestión, Novantin** en España; Dext, Klippa, Rossum fuera | **El más saturado y el de menor margen.** La barrera de entrada no es la IA: son los conectores probados a a3, Sage, NCS y Contasol |
| Notificaciones DEHú | **EdasNEO (ZeroComa), IvNeos (Ivnosys), MSNotifica, Portal NEOS, Aurea (Normadat), Findiur** — varios ya homologados como Gran Destinatario | Mercado con incumbentes técnicos. **Descargar la notificación no diferencia**; clasificar, extraer el plazo y crear la tarea, sí |
| Altas en Seguridad Social | **Advisorsy** ya comercializa un robot para el Sistema RED | Competencia directa, y encima el marco cambió con la Resolución TGSS de 9-abr-2025 |
| Asistente legal RAG | **a3innuva Nómina Expert AI** (WK, junio 2026) | **Llega tarde y en desventaja**: el incumbente tiene el asistente dentro del software donde vive el dato del despacho |
| Conciliación bancaria | **a3asesor Bank** hace exactamente esto | Si la gestoría ya usa a3, se le está vendiendo lo que ya tiene |

**El hueco defendible no está en ningún módulo suelto: está en el pegamento.** DEHú multicliente
con clasificación y plazos, presentación de modelos con trazabilidad, y **la captura por
WhatsApp del cliente final** — que es exactamente el activo que CIFRA ya tiene funcionando y
que ninguno de los verticales tiene.

Y hay una amenaza que conviene nombrar porque cambia el discurso de venta: **Declarando (desde
14,99 €/mes) y TaxDown no son proveedores potenciales, son gestorías digitales que compiten
contra el cliente de Eduardo por el cliente final.** Eso se puede usar: *automatízate o te come
el que ya lo ha hecho*.

### 8.5. Urgente y con fecha: WhatsApp cambia de precio el 1 de octubre de 2026

Dentro de tres semanas. Y **afecta a CIFRA hoy, no solo a este proyecto**.

Hasta el 30 de septiembre, los **mensajes de servicio** —el texto libre dentro de la ventana de
24 h— son gratis. **A partir del 1 de octubre se cobran**, igual que las plantillas de utilidad
enviadas dentro de esa ventana. Habrá **1.000 mensajes de servicio gratis al mes por número**, y
a partir de ahí, tarifa de utilidad del país.

Tarifas para España en 2026: **marketing 0,0509 €, utilidad 0,0166 €, servicio 0,0166 €**. Los
mensajes entrantes del cliente **Meta no los cobra**.

**Twilio sí cobra los entrantes**: 0,005 $ por mensaje, de entrada y de salida, encima de la
tarifa de Meta. En un caso de uso dominado por la entrada de documentos —que es exactamente el
de El Sobre— **ese recargo prácticamente duplica la factura**. Las cuentas para 100 clientes con
20 documentos al mes: unos 17 € de Meta y unos 18 € de recargo Twilio. A ese volumen no compensa
migrar a la Cloud API; **sí compensa abstraer el proveedor detrás de una interfaz**, para poder
cambiar sin reescribir.

> Y dos avisos de código, uno de ellos para CIFRA: **el modelo de precios pasó a ser por mensaje
> el 1 de julio de 2025**, no por conversación de 24 h. Cualquier lógica que asuma "conversación
> abierta = coste fijo con mensajes ilimitados dentro" lleva más de un año obsoleta. Conviene
> mirar `services/whatsapp.js` con eso en la mano.
>
> El segundo: **el cupo de 1.000 mensajes gratis es por número de teléfono**. Eso da un
> incentivo de arquitectura real a repartir el tráfico entre varios números — uno para captura
> de documentos, otro para el asistente — que además simplifica el enrutado.

### 8.6. WhatsApp y RGPD: la línea es clara y hay sanciones

- **2.500 € + 2.500 €** a una asesoría por usar WhatsApp personal para tratar datos de clientes
  (arts. 6.1 y 32 RGPD), calificado como negligencia grave.
- **3.000 €** por difundir un parte de baja —con nombre y estado de salud— por WhatsApp.

**Regla de diseño no negociable: los partes de baja, las nóminas y la documentación fiscal no
salen por WhatsApp.** WhatsApp es el timbre, no el buzón. El patrón correcto es **aviso por
WhatsApp con enlace caducable a un portal propio**, que además resuelve a la vez el RGPD, la
evidencia de entrega y el coste por mensaje.

Y esto no prohíbe WhatsApp: **prohíbe WhatsApp sin control.** Que es, de paso, el mejor
argumento comercial del módulo — la gestoría que hoy usa el móvil personal del gestor **ya está
en infracción**.

### 8.7. Dos cosas más del canal que ahorran disgustos

- **La ingesta IMAP con usuario y contraseña ya no funciona contra Microsoft 365 ni Gmail:**
  ambos exigen OAuth 2.0. Mientras el buzón de ingesta viva en el cPanel con dominio propio,
  el cron de CIFRA sigue funcionando; el día que un cliente quiera que se lea su buzón
  corporativo, hay que implementar OAuth.
- **Correo transaccional fuera del hosting compartido.** El volumen de una gestoría (unos 1.000
  correos/mes) **cabe entero en el plan gratuito de Resend o de Brevo**. Amazon SES a 0,10 $ por
  cada 1.000 es el suelo si crece.

---

## 9. Qué se verificó, qué se cayó y qué sigue sin confirmar

Todo lo importante de este documento pasó por un verificador adversarial, con el encargo
explícito de **intentar refutar** cada afirmación, no de confirmarla. De doce afirmaciones
críticas: **3 confirmadas, 6 matizadas, 3 refutadas**.

### Refutadas — tres cosas que habrían salido mal

| Se creía | Es falso porque |
|---|---|
| Las autoliquidaciones no tienen servicio web y hay que automatizar un navegador | **Presentación Directa** cubre 303, 111, 130, 200 y treinta modelos más, sin navegador. Era la afirmación más peligrosa: habría llevado a construir un robot innecesario, con su VPS y su fragilidad |
| El reglamento de la factura electrónica B2B sigue sin aprobarse | **Está aprobado**: RD 238/2026, BOE de 31-mar-2026, en vigor desde el 20-abr-2026. Lo que falta es la Orden Ministerial |
| El API de la DEHú está reservado a administraciones públicas | **LEMA está abierto a personas jurídicas privadas** con volumen de notificaciones. Sin esto, todo el módulo 1.1 se reducía a scraping y quedaba muerto |

### Confirmadas

- **Existe** el documento "Especificaciones de Servicios Comunes Declaraciones AEAT" v2.9, con
  las tres interfaces citadas.
- **Veri\*factu**: 1-ene-2027 sociedades, 1-jul-2027 el resto, por el RDL 15/2025. Y el plazo del
  **fabricante no se prorrogó**: venció el 29-jul-2025. **No aplica en País Vasco (TicketBAI) ni
  en Navarra (NaTicket)**, que van por su cuenta.
- **Los certificados de la FNMT son personales e intransferibles.** Matiz importante: la
  consecuencia no es la nulidad del trámite, sino **la responsabilidad plena del titular**, la
  posible revocación del certificado y la pérdida del control exclusivo que exige eIDAS.

### Matizadas — lo que hay que decir con más cuidado

- **Preproducción de la AEAT**: existe y es gratis, pero con certificado obligatorio,
  **disponibilidad variable por ejercicio** (el 303 en 2025 y 2026, el 190 en 2022-2025) y
  prohibición expresa de pruebas masivas.
- **Colaboración social**: base legal confirmada en el art. 92 LGT y la Orden HAC/1398/2003
  (con las modificaciones de la Orden HFP/534/2022 y la **Orden HAC/86/2025**). **La cita de los
  arts. 79-81 del RD 1065/2007 no se ha podido confirmar.**
- **Servicios web de afiliación de la TGSS**: **no consta ninguno público**. Lo que sí hay es la
  especificación pública del **mensaje AFI** (versión enero 2024), transmitida por SILTRA o RED
  Online, en **remesas de tres tandas diarias**.
- **Apoderamiento frente a colaboración social**: correcto en el ámbito tributario, pero **no
  cubre la Seguridad Social**, donde la vía es la autorización RED, no el REA.
- **Productos de custodia**: **Nubasit no está confirmado**; **Ivnosys está integrada en
  Signaturit** y su producto es **IvSign**, con firma remota sobre QSCD y documentación de API
  pública. **Ninguno publica precios.**

### Lo que sigue sin confirmar y hay que cerrar a mano

1. Si los servicios web de la DEHú permiten consultar **en nombre de un poderdante**. Decide el
   módulo entero.
2. Si la autenticación de los servicios de presentación de la AEAT es **mTLS**. Decide si se
   contrata custodia o se monta el sello propio.
3. El **gasto real en software** de un despacho pequeño. Decide el precio.
4. El **texto literal del aviso legal** de las sedes de la AEAT y de la Seguridad Social sobre
   acceso automatizado. Nadie ha podido leerlo en esta investigación.
5. La versión exacta de **a3 (o Sage, o ContaPlus)** del despacho. Decide el módulo contable.

---

## 10. Lo que solo puedes decidir tú

Ocho decisiones. Ninguna es técnica.

**1. ¿Este proyecto es de CIFRA o es otra empresa?** CIFRA está posicionada como *consultoría
de costes para hostelería con herramientas propias, no un SaaS*, y eso está escrito como
decisión cerrada. Esto es un SaaS vertical para otro sector. O se abre el posicionamiento, o
nace con otro nombre y otra sociedad. **No es una cuestión de marca: cambia el contrato, el
seguro de responsabilidad civil y a quién demandan si algo sale mal.**

**2. ¿Fabricamos un SIF de Veri\*factu, o solo auditamos quién cumple?** El Censo produce
trabajo facturable sin asumir riesgo. El Talonario obliga a firmar una **declaración
responsable por versión**, con hasta 150.000 € por ejercicio y tipo de sistema, más 1.000 € por
cada sistema comercializado sin ella. **La firma tuya, no de la gestoría.**

**3. ¿Cuánto vale esto al mes?** Y antes: **¿es cierto que un despacho pequeño gasta 250-500 €
al AÑO en software?** Si lo es, el producto tiene que costar decenas de euros al mes, no
cientos, y eso cambia el alcance de todo lo de arriba. **Son dos llamadas de teléfono.**

**4. ¿Quién es el cliente: la gestoría, o los clientes de la gestoría?** El modelo de reventa
—la gestoría paga una cuota y revende El Sobre y el portal a sus clientes con su marca—
convierte un coste en un ingreso para el despacho, que es la única forma de que una
microempresa apruebe un gasto nuevo. Pero es otro producto y otro contrato.

**5. ¿Se sale del hosting compartido solo para esto, o se lleva CIFRA también?** Si hay que
levantar un VPS de todas formas, quizá tenga sentido consolidar. Hoy el cPanel compartido es la
restricción que más decisiones de arquitectura está condicionando, y **la clave maestra de
CIFRA en un `.env` compartido es un problema aunque este proyecto no se haga**.

**6. ¿Se asume un servicio con plazo legal siendo una sola persona?** Un modelo presentado
tarde tiene consecuencias económicas para el cliente final. Sin Eduardo no hay quien opere el
sistema. Eso hay que resolverlo antes de firmar un SLA, no después.

**7. ¿Se empieza por lo laboral o por lo fiscal?** Lo laboral (El Parte del Mes, El Rescate, El
Tramo) es donde CIFRA ya tiene medio módulo construido y donde el dossier deja más dinero sobre
la mesa. Lo fiscal (La Ventanilla, El Cartero) es lo que más impresiona y lo que más tarda en
desbloquearse por trámites. **Se pueden solapar, pero el primer euro sale de uno de los dos.**

**8. ¿Se acepta el proyecto entero o se acepta un trozo?** La respuesta honesta a tu pregunta
de viabilidad es: **el dossier completo es viable, pero no en la forma en que está escrito y no
sobre la infraestructura actual.** Reescrito alrededor del sello y los apoderamientos, y con la
infraestructura fuera del compartido, sale. Tal cual está, hay tres módulos que prometen cosas
que no existen y uno que propone una arquitectura que no se puede vender por escrito.
