# Generating SchemaBuilder code

`toTypescript()` is the reverse of [`fromJsonSchema`](./from-json-schema): instead of turning a JSON Schema into a builder, it emits the **TypeScript source code** that would reconstruct the current schema with `SchemaBuilder` calls.

This is handy when you have a schema (often imported from an OpenAPI document or written as a literal) and want to move it into concise, maintainable builder code — keeping the schema _and_ its inferred type from then on.

::: info Experimental
`toTypescript` may not handle every case and its design is subject to change.
:::

## Return value

`toTypescript()` returns a `[variableName, code]` tuple:

- `variableName` — a suggested identifier derived from the schema's `title` (lower-cased, suffixed with `Schema`), or `"schema"` when there is no title.
- `code` — the generated source, expressed as `SB.*` calls.

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
// ---cut---
const [variableName, code] = taskSchema.toTypescript()
```

For the `Task` schema above, `toTypescript()` returns:

```ts
// variableName
"taskSchema"

// code
'SB.objectSchema({"title":"Task"}, {"name": SB.stringSchema(), "progress": SB.numberSchema(), "isCompleted": [SB.booleanSchema(), undefined]})'
```

::: tip The generated code uses an `SB` alias
The emitted source refers to the builder as `SB`, so paste it into a module that imports `SchemaBuilder` under that name:

```ts
import { SB } from "@serafin/schema-builder"

const taskSchema = SB.objectSchema({ title: "Task" }, { name: SB.stringSchema(), progress: SB.numberSchema(), isCompleted: [SB.booleanSchema(), undefined] })
```

:::

## Customizing the output

`toTypescript(customizeOutput?)` accepts an optional callback that receives the generated string for each (sub)schema along with its builder, letting you rewrite or wrap the output — for example to reference a shared schema by name instead of inlining it:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const taskSchema = SB.objectSchema({ title: "Task" }, { name: SB.stringSchema() })
// ---cut---
const [, code] = taskSchema.toTypescript((output, schema) => {
    // Return `output` unchanged to keep the default, or return your own string.
    return output
})
```
