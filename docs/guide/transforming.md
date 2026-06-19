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
