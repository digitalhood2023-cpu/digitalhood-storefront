import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const manifest = JSON.parse(await readFile(new URL('../config/product-template.json', import.meta.url),'utf8'))
assert.equal(manifest.version,'digitalhood-v1')
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex')
  assert.equal(actual,expected,'Shared template drift: '+file+'. Update the versioned template in all three apps together.')
}
console.log('DigitalHood shared product template v1 parity passed.')
