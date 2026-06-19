# allOf / anyOf / oneOf / not

`SchemaBuilder` exposes static combinators that mirror the JSON Schema keywords of the same name. They take other builders and produce a composed schema.

```ts twoslash
import { SB } from "@serafin/schema-builder"

const a = SB.objectSchema({}, { a: SB.stringSchema() })
const b = SB.objectSchema({}, { b: SB.numberSchema() })

const all = SB.allOf(a, b) // must satisfy both
const any = SB.anyOf(a, b) // satisfies at least one
const one = SB.oneOf(a, b) // satisfies exactly one
const negated = SB.not(a) // must NOT satisfy a
```

The inferred types follow JSON Schema semantics:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const a = SB.objectSchema({}, { a: SB.stringSchema() })
const b = SB.objectSchema({}, { b: SB.numberSchema() })
// ---cut---
const all = SB.allOf(a, b)
type All = typeof all.T

const one = SB.oneOf(a, b)
type One = typeof one.T
```

- **`allOf`** → intersection (`A & B`)
- **`anyOf`** / **`oneOf`** → union (`A | B`)
- **`not`** → `any` (the negation can't be expressed as a concrete TypeScript type)

::: warning Combinators limit further transformations
A builder created from `allOf` / `anyOf` / `oneOf` / `not` no longer has a plain `properties` map at its root. Most property-level transformation methods (`pickProperties`, `mergeProperties`, …) expect `properties` and will throw on such a schema. Compose your object shapes first, then combine.
:::

## Discriminated unions

For the very common "tagged union of objects" case, prefer [`oneOfDiscriminated`](./enums-unions#discriminated-unions) — it stamps each variant with a discriminant `const` and emits a JSON Schema `discriminator`, giving you a TypeScript discriminated union you can narrow on.

## See also

- [Conditionals & Dependencies](./conditionals) — `ifThenElse`, `addDependentRequired`, `addDependentSchemas`
- [Multi-type values](./enums-unions#multi-type-values) — `typesSchema`, the lightweight alternative when branches are just primitives
