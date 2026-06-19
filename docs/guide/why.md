# Why Schema Builder?

JSON Schema is the foundation of OpenAPI and a great way to describe and validate data. It is powerful — but it is also **verbose**, and on its own it tells TypeScript nothing.

In a typical project you end up maintaining the same shape twice:

- a **JSON Schema** for runtime validation, and
- a **TypeScript type / interface** for compile-time safety.

And usually not just once. A single resource often needs several related shapes — one for the create body, one for the patch body, one for query parameters, one for the response… Each of those is another schema _and_ another type to keep in sync by hand. They drift, and the drift is exactly where bugs hide.

## The idea

`@serafin/schema-builder` lets you describe a shape **once** and get both artifacts from it:

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

// 1. A JSON Schema, available at runtime:
const jsonSchema = taskSchema.schema

// 2. A TypeScript type, inferred at compile time:
type Task = typeof taskSchema.T
```

Because both come from the same builder, they can never disagree. And every transformation method (`pickProperties`, `toOptionals`, `mergeProperties`, …) returns a **new builder** that updates the schema and the inferred type together — so deriving all those related shapes stays a one-liner.

## JSON Schema is the model, not an export

A key design choice: the thing you build _is_ a JSON Schema document. `SchemaBuilder` maps **1:1** onto JSON Schema 2020-12 (plus the OpenAPI 3.1 extensions like `discriminator`), and the underlying document is always one property access away:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const taskSchema = SB.objectSchema({ title: "Task" }, { name: SB.stringSchema() })
// ---cut---
const jsonSchema = taskSchema.schema // a plain JSON Schema object — feed it to OpenAPI, Ajv, an MCP tool, …
```

There is no lossy "convert to JSON Schema" step, because there is nothing to convert. This is the main difference from validator-first libraries, where the schema is a library-specific object and JSON Schema is an export target

## Built for transformation

The second design choice follows from the first: Schema Builder is less about _declaring_ one schema and more about **transforming** one definition into the family of related schemas a real API needs — create bodies, patch bodies, query params, public projections, responses. That is exactly what powers [`@serafin/pipeline`](https://github.com/serafin-labs/serafin) and the Serafin framework. Methods like `pickProperties`, `omitProperties`, `toOptionals`, `mergeProperties`, `transformProperties` and [`objectProperties`](./object-properties) exist so each derived shape stays a one-liner that can never drift from its source.

## When to use it

- You already validate with JSON Schema / Ajv and are tired of hand-writing matching interfaces.
- You build OpenAPI specs and want the schema to be the source of truth.
- You define **MCP (Model Context Protocol) connectors** — tools declare their `inputSchema` (and optional `outputSchema`) as JSON Schema, so you can build the schema with `SchemaBuilder` and reuse `typeof builder.T` to type the handler that receives the validated arguments. See the [MCP connectors example](./mcp).
- You need many variations of a shape (create / patch / query / response) without copy-paste drift.

## What's next

Head to [Getting Started](./getting-started) to install the library and build your first schema.

> `schema-builder` is a component of the **Serafin** framework. Learn more at [github.com/serafin-labs/serafin](https://github.com/serafin-labs/serafin).
