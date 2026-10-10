const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/productVariationSelection.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exportsObject })
const { selectMatchingVariation: select, purchaseOptions, selectionForVariation, effectiveVariationStock: stock } = exportsObject
const options = [{ name: 'Colour', options: ['Red','Blue'], variation: true }, { name: 'Model', options: ['Pro','Mini'], variation: true }, { name: 'Material', options: ['Silicone'], variation: false }]
const rows = [{ id: 1, attributes: { Colour: 'Red', Model: '' } }, { id: 2, attributes: { Colour: 'Red', Model: 'Pro' } }, { id: 3, attributes: { Colour: 'Blue' } }]
assert.equal(purchaseOptions(options).length, 2)
assert.equal(select(rows, options, { Colour: 'Red', Model: 'Pro' }).id, 2)
assert.equal(select(rows, options, { Colour: 'Red', Model: 'Mini' }).id, 1)
assert.equal(select(rows, options, { Colour: 'Blue', Model: 'Mini' }).id, 3)
assert.equal(select(rows, options, { Colour: 'Red' }), null)
assert.equal(select(rows, options, { Colour: 'Purple', Model: 'Pro' }), null)
assert.equal(select([...rows,{ id: 9, attributes: rows[1].attributes }], options, { Colour: 'Red', Model: 'Pro' }), null)
assert.equal(selectionForVariation(rows[0], options, { Model: 'Mini' }).Model, 'Mini')
assert.equal(selectionForVariation(rows[0], options, {}).Model, 'Pro')
const parent = { stockQuantity: 2, stockStatus: 'instock', stockLabel: 'Only 2 left', stockTone: 'warning' }
const row = { stockManagedByParent: true, stockQuantity: null, canAddToCart: true }
assert.equal(stock(parent,row).stockQuantity, 2)
assert.equal(stock({ ...parent, stockQuantity: 0 },row).canAddToCart, false)
assert.equal(stock({ ...parent, stockQuantity: null },row).stockQuantity, null)
assert.equal(stock({ ...parent, stockQuantity: -3, stockStatus: 'onbackorder' },row).canAddToCart, true)
assert.equal(stock(parent,{ ...row, stockManagedByParent: false, stockQuantity: 7 }).stockQuantity, 7)
assert.equal(stock(parent,{ ...row, canAddToCart: false }).canAddToCart, false)
console.log('Wildcard specificity, ambiguous selection, non-variation details and inherited stock passed.')
