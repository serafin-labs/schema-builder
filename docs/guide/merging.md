# Merging & Overwriting

These methods combine two object schemas. They differ in how they treat properties that exist in **both** schemas.

| Method                | Common property becomes…         | TS operator |
| --------------------- | -------------------------------- | ----------- |
| `mergeProperties`     | a union of both types            | `\|`        |
| `overwriteProperties` | the **incoming** type (replaces) | replace     |
| `intersectProperties` | the intersection of both         | `&`         |

## mergeProperties

Properties present in both schemas are combined with `anyOf` (a union in TypeScript):

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema2 = SB.emptySchema().addArray("prop2", SB.stringSchema()).addNumber("prop3")

const schema = SB.emptySchema().addString("prop1").addBoolean("prop2").mergeProperties(schema2)

type T = typeof schema.T
```

## overwriteProperties

Properties present in both schemas take the **new** type, discarding the old one:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema2 = SB.emptySchema().addArray("prop2", SB.stringSchema()).addNumber("prop3")

const schema = SB.emptySchema().addString("prop1").addBoolean("prop2").overwriteProperties(schema2)

type T = typeof schema.T
```

## intersectProperties

Combine the two property sets, intersecting any overlap:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const a = SB.emptySchema().addString("id").addNumber("shared")
const b = SB.emptySchema().addBoolean("flag")
// ---cut---
const schema = a.intersectProperties(b)

type T = typeof schema.T
```
