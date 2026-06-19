# Arrays & Tuples

## Arrays

`arraySchema(items, keywords?, nullable?)` wraps any builder into a homogeneous array:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const tags = SB.arraySchema(SB.stringSchema(), { minItems: 1, uniqueItems: true })

type Tags = typeof tags.T
```

The item builder can be anything — including an object schema, giving you arrays of structured values:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const points = SB.arraySchema(SB.objectSchema({}, { x: SB.numberSchema(), y: SB.numberSchema() }))

type Points = typeof points.T
```

As a property, use `addArray`:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const schema = SB.emptySchema().addArray("scores", SB.numberSchema(), { maxItems: 5 })
```

## Tuples

`tupleSchema(items, keywords?, nullable?)` describes a fixed, positionally-typed sequence. It emits `prefixItems` and a `minItems` equal to the prefix length, and is **closed** by default (`items: false`):

```ts twoslash
import { SB } from "@serafin/schema-builder"

const coordinate = SB.tupleSchema([
    SB.numberSchema(), // latitude
    SB.numberSchema(), // longitude
])

type Coordinate = typeof coordinate.T
```

### Rest elements

Pass `rest` in the keywords to allow additional trailing items of a given type. The inferred type becomes a TypeScript tuple with a rest element `[T1, T2, ...R[]]`:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const row = SB.tupleSchema(
    [SB.stringSchema()], // a label...
    { rest: SB.numberSchema() }, // ...followed by any number of numbers
)

type Row = typeof row.T
```

As a property, use `addTuple` with the same arguments.

### Closing the open end

For schemas that use `unevaluatedItems` (for example combined with `allOf`), `setUnevaluatedItems` lets you restrict items not evaluated by any subschema. Pass a builder, `true`/`false`, or `null` to remove the keyword. It's validation-only and preserves the TypeScript type.
