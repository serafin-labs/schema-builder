# Picking & Omitting

Transformation methods are the reason to keep a single source schema: from one definition you derive every related shape. Each method returns a **new** builder — the original is never mutated — and the inferred type follows along.

## pickProperties

Keep only the listed properties:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addString("id").addString("firstName").addBoolean("admin")

const publicSchema = schema.pickProperties(["id", "firstName"])

type Public = typeof publicSchema.T
```

## omitProperties

The complement — drop the listed properties, keep the rest:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const schema = SB.emptySchema().addString("id").addString("firstName").addBoolean("admin")
// ---cut---
const safeSchema = schema.omitProperties(["admin"])

type Safe = typeof safeSchema.T
```

## renameProperty

Change a property's key while keeping its schema untouched:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const schema = SB.emptySchema().addString("prop1").renameProperty("prop1", "prop2")

type T = typeof schema.T
```

## pickAdditionalProperties

`pickProperties` doesn't handle index signatures. When your schema uses `additionalProperties`, use `pickAdditionalProperties` instead — it lets you decide what happens to the index signature:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const schema = SB.emptySchema().addString("prop1").addBoolean("prop2").addAdditionalProperties(SB.stringSchema())
// ---cut---
// 1. pick properties and DROP the index signature
const a = schema.pickAdditionalProperties(["prop1", "prop2"])

// 2. pick properties and KEEP the index signature (empty second array)
const b = schema.pickAdditionalProperties(["prop1"], [])

// 3. pick properties and keep ONLY specific extra keys from the index signature
const c = schema.pickAdditionalProperties(["prop1", "prop2"], ["prop3"])
```

::: tip
See [Object Schemas → Additional properties](./objects#additional-properties) for why index signatures interfere with the other transformation methods.
:::
