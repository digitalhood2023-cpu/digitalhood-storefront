import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const budgets = JSON.parse(fs.readFileSync('config/performance-budgets.json', 'utf8'))
const assetDirectory = 'dist/assets'
if (!fs.existsSync(assetDirectory)) throw new Error('Performance budget validation requires a completed production build.')

const files = fs.readdirSync(assetDirectory).map((name) => ({
  name,
  path: path.join(assetDirectory, name),
})).filter((file) => fs.statSync(file.path).isFile())

function summarize(extension) {
  const matching = files.filter((file) => file.name.endsWith(extension)).map((file) => {
    const data = fs.readFileSync(file.path)
    return { name: file.name, bytes: data.length, gzipBytes: zlib.gzipSync(data, { level: 9 }).length }
  })
  return {
    files: matching,
    totalBytes: matching.reduce((sum, file) => sum + file.bytes, 0),
    totalGzipBytes: matching.reduce((sum, file) => sum + file.gzipBytes, 0),
    largest: matching.sort((left, right) => right.bytes - left.bytes)[0] || { name: null, bytes: 0, gzipBytes: 0 },
  }
}

const javascript = summarize('.js')
const css = summarize('.css')
const failures = []
const check = (actual, budget, label) => {
  if (actual > budget) failures.push(`${label}: ${actual} > ${budget}`)
}
check(javascript.totalBytes, budgets.javascriptTotalBytes, 'JavaScript total')
check(javascript.totalGzipBytes, budgets.javascriptTotalGzipBytes, 'JavaScript gzip total')
check(javascript.largest.bytes, budgets.javascriptLargestChunkBytes, `Largest JavaScript chunk (${javascript.largest.name})`)
check(javascript.largest.gzipBytes, budgets.javascriptLargestChunkGzipBytes, `Largest JavaScript gzip chunk (${javascript.largest.name})`)
check(css.totalBytes, budgets.cssTotalBytes, 'CSS total')
check(css.totalGzipBytes, budgets.cssTotalGzipBytes, 'CSS gzip total')

if (failures.length) throw new Error(`Performance budgets exceeded:\n${failures.join('\n')}`)
console.log(JSON.stringify({
  success: true,
  javascript: { totalBytes: javascript.totalBytes, totalGzipBytes: javascript.totalGzipBytes, largest: javascript.largest },
  css: { totalBytes: css.totalBytes, totalGzipBytes: css.totalGzipBytes },
}))
