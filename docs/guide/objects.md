# Object Schemas

Objects are where Schema Builder shines: you describe properties once and get both the JSON Schema and the inferred interface.

## objectSchema

`objectSchema(schemaKeywords, properties)` takes object-level keywords (like `title`) and a map of property builders:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const taskSchema = SB.objectSchema(
    { title: "Task" },
    {
        name: SB.stringSchema(),
        progress: SB.numberSchema(),
        isCompleted: [SB.booleanSchema(), undefined],
    },
)

type Task = typeof taskSchema.T
```

By default `additionalProperties` is set to `false`, so the schema rejects unknown keys.

### Optional properties

To make a property optional, provide it as a **tuple containing the builder and `undefined`**. It is dropped from `required` and becomes optional in the type:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const schema = SB.objectSchema(
    { title: "Profile" },
    {
        handle: SB.stringSchema(), // required
        bio: [SB.stringSchema(), undefined], // optional
    },
)

type Profile = typeof schema.T
```

## Starting empty and adding properties

When you'd rather build incrementally, start from `emptySchema()` and chain `add*` methods. Each returns a **new** builder with the property folded into the type:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schema = SB.emptySchema({ title: "Widget" })
    .addString("id")
    .addNumber("price")
    .addBoolean("inStock", {}, false) // not required
    .addEnum("size", ["s", "m", "l"])
    .addArray("tags", SB.stringSchema())

type Widget = typeof schema.T
```

The typed shortcuts mirror the primitive factories: `addString`, `addNumber`, `addInteger`, `addBoolean`, `addEnum`, `addArray`, `addTuple`, `addTypes`. Their signature is `(name, schemaKeywords?, required?, nullable?)`. For anything else, use the generic `addProperty(name, builder, required?)`:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const schema = SB.emptySchema().addProperty("meta", SB.anySchema(), false)
```

Use `addProperties` to add several at once with the same map syntax as `objectSchema`.

## Additional properties

`addAdditionalProperties` sets `additionalProperties` and adds a matching index signature to the type:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
// Allow any extra keys
const loose = SB.emptySchema().addString("id").addAdditionalProperties()

// Constrain extra keys to a schema (string index signature)
const dictionary = SB.emptySchema().addAdditionalProperties(SB.numberSchema())

type Dict = typeof dictionary.T
```

::: warning Index signatures fight type operations
Once a schema uses `additionalProperties`, most transformation methods stop working because index signatures and TypeScript type operations don't compose well. Apply `addAdditionalProperties` **last**, after every pick/omit/merge step. (`pickAdditionalProperties`, covered in [Picking & Omitting](./pick-omit), is the exception that's aware of index signatures.)
:::

## Pattern properties

`addPatternProperty(prefix, suffix, schema?)` constrains keys matching a pattern and reflects them in the type as a template-literal key:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const schema = SB.emptySchema().addPatternProperty("data-", "", SB.stringSchema())
```

This produces `patternProperties` with the regular expression `^data-.*$`.

## Reading sub-schemas

Given an object builder, you can pull a single property back out as its own builder with `getSubschema`:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.emptySchema().addString("email")
// ---cut---
const emailSchema = userSchema.getSubschema("email")

type Email = typeof emailSchema.T
```
