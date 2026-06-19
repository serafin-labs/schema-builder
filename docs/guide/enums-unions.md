# Enums, Consts & Unions

## Enums

`enumSchema(values, keywords?, nullable?)` produces a JSON Schema `enum`. Pass values **`as const`** (or a literal array) to get a narrow literal union back:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const role = SB.enumSchema(["admin", "user", "guest"])

type Role = typeof role.T
```

Enums aren't limited to strings — numbers, booleans and `null` work too, and the resulting `type` is computed from the values:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const level = SB.enumSchema([1, 2, 3])

type Level = typeof level.T
```

As a property: `addEnum(name, values, keywords?, required?, nullable?)`.

## Const

`constSchema(value)` pins a schema to a single literal value — useful for discriminants and narrowing:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const kind = SB.constSchema("circle")

type Kind = typeof kind.T
```

## Multi-type values

When a value is simply "one of several primitive types", `typesSchema(types, keywords?, nullable?)` is the lightweight choice. It emits a single JSON Schema `type` array and infers the union directly:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const id = SB.typesSchema(["number", "string"])

type Id = typeof id.T
```

```json
{ "type": ["number", "string"] }
```

The `type` tags share a single keyword bag, and JSON Schema applies each keyword only to the instances it's relevant for (`minLength` is ignored for numbers, `minimum` for strings, …). Only primitive types (`string`, `number`, `integer`, `boolean`, `null`) are accepted.

As a property: `addTypes(name, types, keywords?, required?, nullable?)`.

::: tip typesSchema vs. anyOf/oneOf
Use `typesSchema` for the simple case. Reach for [`anyOf`/`oneOf`](./combinators) when each branch needs its **own disjoint constraints** — e.g. _a string of length ≥ 3_ **or** _a number ≥ 0_ — which a shared keyword bag can't express.
:::

## Discriminated unions

For tagged unions of object shapes, `oneOfDiscriminated(propertyName, variants)` builds a `oneOf` where each variant is stamped with a `const` discriminator, and adds a JSON Schema `discriminator`. The inferred type is a proper discriminated union:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const shape = SB.oneOfDiscriminated("kind", {
    circle: SB.objectSchema({}, { radius: SB.numberSchema() }),
    rectangle: SB.objectSchema(
        {},
        {
            width: SB.numberSchema(),
            height: SB.numberSchema(),
        },
    ),
})

type Shape = typeof shape.T
```

Each variant gains a required `kind` property set to its key (`{ kind: "circle" } & { radius: number }`, etc.), so TypeScript can narrow on `kind`.
