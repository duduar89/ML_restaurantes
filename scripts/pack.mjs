/**
 * Empaqueta dist/ en un único archivo listo para subir a cPanel.
 *
 * El gestor de archivos de cPanel sube archivos sueltos, no carpetas, y dist/
 * tiene varias subcarpetas: subirlas a mano es tedioso y fácil de hacer mal.
 * Con un solo archivo se sube una vez y se extrae allí.
 *
 * Se usa tar y no zip porque tar viene de serie en macOS, en Linux y en
 * Windows 10 en adelante; zip no está en Windows sin instalar nada. cPanel
 * extrae .tar.gz igual de bien.
 *
 * Uso: npm run pack
 */
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const OUT = resolve(ROOT, 'caudal.tar.gz')

if (!existsSync(DIST)) {
  console.error('No hay carpeta dist/. Ejecuta antes: npm run build')
  process.exit(1)
}

if (!existsSync(resolve(DIST, '.htaccess'))) {
  console.error('Falta dist/.htaccess — sin él, las rutas internas darán 404 en Apache.')
  process.exit(1)
}

// -C dist y "." empaquetan el CONTENIDO de dist, no la carpeta: al extraer en
// public_html los archivos quedan donde tienen que estar y no dentro de una
// carpeta dist/ de más.
const result = spawnSync('tar', ['-czf', OUT, '-C', DIST, '.'], { stdio: 'inherit' })

if (result.error || result.status !== 0) {
  console.error('No se ha podido crear el paquete. ¿Está `tar` disponible?')
  process.exit(1)
}

const size = statSync(OUT).size
console.log(`\ncaudal.tar.gz — ${(size / 1024).toFixed(0)} KB`)
console.log('Súbelo a public_html en el Administrador de archivos de cPanel y usa "Extract".')
