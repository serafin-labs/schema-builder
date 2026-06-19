# From a literal JSON Schema

Sometimes you already have a JSON Schema — hand-written, or imported from an OpenAPI document — and you want a `SchemaBuilder` (and its TypeScript type) from it. `SB.fromJsonSchema` does exactly that, **deducing the type from the schema itself**.

The schema must be provided as a **literal** with `as const`, so TypeScript can read its structure:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const schemaBuilder = SB.fromJsonSchema({
    type: "object",
    properties: {
        aString: { type: "string", description: "this is a test" },
        aBoolean: { type: "boolean" },
        anInteger: { type: "integer", minimum: 0 },
        aSubObject: {
            type: "object",
            properties: {
                aSubProperty: { type: "number", maximum: 100 },
            },
        },
        anArray: {
            type: "array",
            items: { type: "string", enum: ["a", "b", "c"] },
        },
    },
    required: ["aBoolean", "anArray"],
    additionalProperties: false,
} as const)

type T = typeof schemaBuilder.T
```

The resulting builder behaves like any other: you can read `.schema`, call `.validate(...)`, and (where the schema is a plain object) apply transformation methods.

::: warning Don't forget `as const`
Without `as const`, TypeScript widens `"string"` to `string`, `["a","b","c"]` to `string[]`, and so on — and the type deduction can't work. The `as const` assertion is what makes the literal precise enough to read.
:::

The reverse direction also exists — see [Generating SchemaBuilder code](./generating-code) to emit builder source from an existing schema.
