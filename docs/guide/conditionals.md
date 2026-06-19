# Conditionals & Dependencies

JSON Schema can express conditional validation. Schema Builder surfaces the most common forms.

## ifThenElse

`SB.ifThenElse(if, then, else)` builds a schema using JSON Schema's `if`/`then`/`else`: a value must satisfy `then` when it matches `if`, and `else` otherwise. The resulting type is `Then | Else`:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const ifPaid = SB.objectSchema({}, { plan: SB.constSchema("paid") })
const thenSchema = SB.objectSchema({}, { card: SB.stringSchema() })
const elseSchema = SB.objectSchema({}, { trialEndsAt: SB.stringSchema() })

const schema = SB.ifThenElse(ifPaid, thenSchema, elseSchema)

type T = typeof schema.T
```

::: info
TypeScript can't reason about JSON Schema validation outcomes, so the union may include alternatives that are unreachable at runtime (for example when `if` and `then` describe disjoint shapes). The runtime validation, however, is exact.
:::

## addDependentRequired

When one property is present, require others. Validation-only — the TypeScript type is preserved:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.objectSchema(
    {},
    {
        creditCard: [SB.stringSchema(), undefined],
        billingAddress: [SB.stringSchema(), undefined],
    },
).addDependentRequired("creditCard", ["billingAddress"])
```

Now a value with `creditCard` but no `billingAddress` fails validation.

## addDependentSchemas

When a property is present, the object must also validate against an additional schema. Also validation-only:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const extra = SB.objectSchema({}, { cvv: SB.stringSchema() })

const schema = SB.objectSchema(
    {},
    {
        creditCard: [SB.stringSchema(), undefined],
    },
).addDependentSchemas("creditCard", extra)
```

## unevaluatedProperties

When combining schemas (e.g. via `allOf`), `setUnevaluatedProperties` restricts properties not evaluated by any subschema. Accepts a builder, `true`/`false`, or `null` to remove the keyword. Validation-only and preserves the type. (The array counterpart is `setUnevaluatedItems` — see [Arrays & Tuples](./arrays#closing-the-open-end).)
