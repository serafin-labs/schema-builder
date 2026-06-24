# Transforming Properties

These methods change the _type_ of selected properties in place, adding alternatives via JSON Schema's `oneOf` (a TypeScript `|`).

## transformProperties

Add an alternative type to existing properties. After the transform, each listed property accepts **either** its original type or the new one:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addArray("prop1", SB.stringSchema()).addBoolean("prop2").transformProperties(SB.stringSchema(), ["prop1"])

type T = typeof schema.T
```

If you omit the property list, the transformation applies to **all** properties.

## transformPropertiesToArray

Allow selected properties to also be an **array** of their current type. Properties that are already arrays are left untouched:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addString("prop1").addBoolean("prop2").transformPropertiesToArray(["prop1"])

type T = typeof schema.T
```

This is handy for APIs that accept either a single value or a list (`?tag=a` vs `?tag=a&tag=b`).

## unwrapArrayProperties

The inverse: for array properties, also allow the array's **element** type. Non-array properties are left untouched:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addArray("prop1", SB.stringSchema()).addBoolean("prop2").unwrapArrayProperties(["prop1"])

type T = typeof schema.T
```

### Replacing instead of adding an alternative

By default `transformProperties`, `transformPropertiesToArray` and `unwrapArrayProperties` keep the original type as an alternative (`oneOf`). Pass `{ keepOriginal: false }` as the last argument to **replace** the type instead — the result type narrows accordingly:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const replaced = SB.emptySchema().addString("prop1").transformProperties(SB.numberSchema(), ["prop1"], { keepOriginal: false })

type T = typeof replaced.T
```

## renameProperties

Rename several properties at once with a `{ oldName: "newName" }` map. Keys not in the map are left untouched, and `required` is kept in sync:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addString("firstName").addInteger("age").renameProperties({ firstName: "first_name" })

type T = typeof schema.T
```

## prefixProperties / suffixProperties

Prefix or suffix property names — all of them, or a subset. The original casing of the key is kept:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addString("id").addBoolean("active").suffixProperties("Flag", ["active"])

type T = typeof schema.T
```

When prefixing, pass `{ capitalize: true }` to upper-case the first character of the original key so the result stays camelCase (`user` + `id` → `userId`):

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addString("id").addString("name").prefixProperties("user", undefined, { capitalize: true })

type T = typeof schema.T
```

## toCamelCaseKeys / toSnakeCaseKeys

Convert every property name between conventions, in both the JSON Schema and the inferred type. Handy at an API boundary that stores `snake_case` but exposes `camelCase`:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const stored = SB.emptySchema().addString("first_name").addBoolean("is_active")
const exposed = stored.toCamelCaseKeys()

type T = typeof exposed.T
```

`toCamelCaseKeys` also understands `kebab-case`. `toSnakeCaseKeys` is the inverse.

## expandEnumToProperties

Generate one property per value of an existing enum property. The enum is read but left in place, and the generated properties are added at the top level:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema()
    .addEnum("state", ["pending", "approved", "canceled"])
    .expandEnumToProperties("state", SB.stringSchema({ format: "date-time" }), { suffix: "Date" })

type T = typeof schema.T
```

With a `prefix` the value is capitalized to keep a camelCase boundary (`is` + `pending` → `isPending`); with only a `suffix` it is kept as-is (`pending` + `Date` → `pendingDate`). Pass `{ required: false }` to make the generated properties optional.

To expand an enum nested inside a sub-object, pass a property-accessor resolver instead of a name. The resolver infers the nested enum's type, so the generated property names and the result type stay precise:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.objectSchema({}, { meta: SB.objectSchema({}, { state: SB.enumSchema(["on", "off"]) }) }).expandEnumToProperties(
    (pa) => pa.meta.state,
    SB.stringSchema(),
    { suffix: "At" },
)

type T = typeof schema.T
```

## pickByType / omitByType

Keep or drop properties by their JSON Schema `type`:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addString("id").addInteger("age").addBoolean("active").pickByType("string")

type T = typeof schema.T
```

`integer` maps to `number` at the TypeScript level (TypeScript has no integer type), so `pickByType("number")` keeps both `number` and `integer` properties.

## propertyNamesEnum / propertyNamesArray

Reflect an object's property names into a schema — the substrate for generating `sort` / field-selection parameters from a resource:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const user = SB.emptySchema().addString("firstName").addString("email").addInteger("age")

const sortField = user.propertyNamesEnum() // "firstName" | "email" | "age"
const fields = user.propertyNamesArray() // ("firstName" | "email" | "age")[]

type SortField = typeof sortField.T
```

## omitReadOnlyProperties / omitWriteOnlyProperties

Drop properties flagged `readOnly` / `writeOnly` from the emitted schema — for example to derive a "create body" (no server-managed `id`) or a response projection (no `writeOnly` `password`):

```ts twoslash
import { SB } from "@serafin/schema-builder"

const resource = SB.emptySchema().addString("id", { readOnly: true }).addString("name").addString("password", { writeOnly: true })

const createBody = resource.omitReadOnlyProperties() // drops `id`
const response = resource.omitWriteOnlyProperties() // drops `password`
```

::: warning Runtime-only
These methods shape the **emitted JSON Schema** only. The inferred TypeScript type is returned unchanged, because `readOnly` / `writeOnly` are not represented in the type. Use them when the artifact you ship is the schema (an API contract, an MCP tool definition); pair with `omitProperties` if you also need the type to change.
:::

## describeProperties / setPropertiesAttributes

Set metadata on many properties in one call — keeping the schema, the type and the documentation in sync. `describeProperties` is a focused helper for `description`s, with `set` (default), `append` and `prepend` modes:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema().addString("id").addInteger("age").describeProperties({ id: "The unique identifier", age: "Age in years" })
```

`setPropertiesAttributes` is the general form, merging any common keywords (`description`, `default`, `examples`, …) per property. Pass `{ deep: true }` to either method to also descend into nested objects and `oneOf` / `anyOf` / `allOf` branches, applying to every matching property name found. Both return the type unchanged.
