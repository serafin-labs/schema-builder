// Pre-publish smoke test: verifies the published package can be consumed through its
// `exports` map in BOTH module systems. It self-references the package by name so it
// goes through the exact conditional resolution (`require` -> CJS, `import` -> ESM) that
// real consumers hit, then checks a known export is present and functional at runtime.
//
// Run against the built `lib/` output (after `npm run build`), not the source.
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const PKG = "@serafin/schema-builder"
const require = createRequire(import.meta.url)

/** Instantiate a SchemaBuilder and run validation, exercising the ajv/ajv-formats interop. */
function assertUsable(label, mod) {
    assert.equal(typeof mod.SchemaBuilder, "function", `${label}: SchemaBuilder export is missing`)
    const schema = mod.SchemaBuilder.emptySchema().addString("email", { format: "email" })
    schema.validate({ email: "a@b.com" })
    assert.throws(() => schema.validate({ email: "not-an-email" }), `${label}: format validation did not reject bad input`)
}

// CJS condition
const cjsPath = require.resolve(PKG)
assert.match(cjsPath, /[/\\]lib[/\\]cjs[/\\]/, `require() resolved to unexpected path: ${cjsPath}`)
assertUsable("cjs (require)", require(PKG))
console.log(`✓ cjs  require("${PKG}") -> ${cjsPath}`)

// ESM condition
const esmMod = await import(PKG)
const esmPath = fileURLToPath(import.meta.resolve(PKG))
assert.match(esmPath, /[/\\]lib[/\\]esm[/\\]/, `import() resolved to unexpected path: ${esmPath}`)
assertUsable("esm (import)", esmMod)
console.log(`✓ esm  import("${PKG}")  -> ${esmPath}`)

console.log("\nBoth builds import and run correctly.")
