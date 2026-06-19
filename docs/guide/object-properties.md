# Composing with `objectProperties`

`objectProperties` extracts the properties of an
object schema as a **property-definition map** — exactly the shape `objectSchema` and `addProperties` expect.
That makes it the building block for composing schemas by spreading:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const address = SB.objectSchema(
    {},
    {
        street: SB.stringSchema(),
        city: SB.stringSchema(),
        zip: [SB.stringSchema(), undefined], // optional
    },
)

const contact = SB.objectSchema({}, { email: SB.stringSchema({ format: "email" }) })

// Compose a new schema from both, plus an extra property:
const customer = SB.objectSchema(
    { title: "Customer" },
    {
        ...address.objectProperties,
        ...contact.objectProperties,
        id: SB.stringSchema(),
    },
)

type Customer = typeof customer.T
```

The inferred type round-trips precisely: required properties stay required, optional ones (`zip`) stay optional.
The same map shape works with [`addProperties`](./objects) on an existing builder.

## What it returns

Each entry is:

- a **`SchemaBuilder`** when the property is required, or
- a **`[SchemaBuilder, undefined]`** tuple when it is optional — the same optional marker `objectSchema` uses.

Every returned builder owns a **deep copy** of its subschema, so mutating the result never affects the source
schema:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const base = SB.objectSchema({}, { name: SB.stringSchema() })

// Pull one property out, adapt it, and recompose:
const renamed = SB.objectSchema(
    {},
    {
        fullName: base.objectProperties.name, // a SchemaBuilder<string>
    },
)
```

## Traversing `allOf` / `anyOf` / `oneOf`

A JSON Schema can describe its object shape through composition keywords rather than a flat `properties` map.
`objectProperties` flattens those into a single map. A schema's own `properties` **and** its `allOf`/`anyOf`/`oneOf`
branches all constrain the same value, so they are combined like this:

- **`allOf`** (and the schema's own properties) all apply at once. A property contributed by several of them
  becomes an `allOf` of the contributions, and it is **required** when any contribution requires it.
- **`anyOf` / `oneOf`** are alternatives. A property contributed by several branches becomes an `anyOf`/`oneOf` of
  the contributions, and it is **required** only when _every_ branch requires it.

For example, a property that is a `string` in one `oneOf` branch and a `number` in another collapses to
`string | number`, reusing the `oneOf`:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const shape = SB.oneOf(
    SB.objectSchema({}, { kind: SB.constSchema("a"), value: SB.stringSchema() }),
    SB.objectSchema({}, { kind: SB.constSchema("b"), value: SB.numberSchema() }),
)

const value = shape.objectProperties.value
// value.schema === { oneOf: [{ type: "string" }, { type: "number" }] }
```

Here the inferred type collapses the union too: `value` is `SchemaBuilder<string | number>` and `kind` is
`SchemaBuilder<"a" | "b">` — a single merged map, not a union of two different maps.

Identical contributions are de-duplicated rather than wrapped (the same `string` in two branches stays a single
`string`, not a `oneOf` of two identical schemas).

::: tip Optionality across union branches
A property declared in **every** branch keeps its required/optional status. A property declared in only **some**
branches is treated as **optional** — both at runtime (it returns the `[SchemaBuilder, undefined]` tuple) and in
the inferred type. That is the correct reading: a value matching a branch that omits the property need not carry
it, so the merged map cannot guarantee it.
:::

## Safe on any schema

`objectProperties` is meaningful on an object schema or a schema composed with `allOf`/`anyOf`/`oneOf`. On anything
else — a `stringSchema()`, an `arraySchema()`, a number — it simply returns an **empty map** (`{}`), both at runtime
and at the type level. That makes it safe to spread unconditionally, without first checking the schema's kind:

```ts twoslash
import { SB, SchemaBuilder } from "@serafin/schema-builder"
// ---cut---
function withId(s: SchemaBuilder<any>) {
    // If `s` is not an object schema, its objectProperties spread contributes nothing.
    return SB.objectSchema({}, { ...s.objectProperties, id: SB.stringSchema() })
}
```
