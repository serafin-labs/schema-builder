# Primitive Schemas

Primitive factory methods are the building blocks you compose into objects and arrays. Each returns a `SchemaBuilder` whose inferred type matches the JSON Schema it produces.

## String, number, integer, boolean

```ts twoslash
import { SB } from "@serafin/schema-builder"

const name = SB.stringSchema()
const score = SB.numberSchema()
const count = SB.integerSchema()
const active = SB.booleanSchema()

type Name = typeof name.T
```

Each factory accepts the JSON Schema keywords relevant to that type as its first argument:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
SB.stringSchema({ format: "email", minLength: 3, maxLength: 254 })
SB.numberSchema({ minimum: 0, maximum: 100 })
SB.integerSchema({ minimum: 0, multipleOf: 2 })
SB.stringSchema({ pattern: "^[a-z]+$", description: "lowercase only" })
```

The keyword set is type-checked per primitive — passing `minLength` to `numberSchema` is a compile error, so you can't accidentally attach an irrelevant constraint.

## Nullable variants

Every primitive (and `arraySchema`, `enumSchema`, `tupleSchema`, `typesSchema`) takes an optional **`nullable`** flag as its last argument. When `true`, `"null"` is added to the JSON Schema `type` and the inferred TypeScript type becomes a union with `null`:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const nickname = SB.stringSchema({}, true)

type Nickname = typeof nickname.T
```

```json
{ "type": ["string", "null"] }
```

::: tip Nullable vs. optional
`nullable` is about the **value** (`string | null`). Optional is about the **key** (`age?: number`). They're independent: a property can be required-but-nullable, optional-but-non-null, or both. See [Optionals & Nullables](./optionals).
:::

## null, any, never

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const nothing = SB.nullSchema() // SB<null>
const whatever = SB.anySchema() // SB<any>
const impossible = SB.neverSchema() // SB<never>
```

- **`nullSchema`** — `{ "type": "null" }`.
- **`anySchema`** — an empty schema that accepts any value; handy as a placeholder or for `additionalProperties`.
- **`neverSchema`** — `{ "type": [] }`, which nothing can satisfy. Useful to narrow a union to an impossible branch.

## Multi-type primitives

When a value may be one of several primitive types, reach for [`typesSchema`](./enums-unions#multi-type-values) rather than `anyOf` — it emits a single `type` array and infers the union directly.

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const id = SB.typesSchema(["number", "string"])

type Id = typeof id.T
```
