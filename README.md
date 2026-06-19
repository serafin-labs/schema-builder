<p align="center"><img src="./docs/public/logo.png" width="300"/></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@serafin/schema-builder"><img src="https://img.shields.io/npm/v/@serafin/schema-builder.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@serafin/schema-builder.svg" alt="license"></a>
</p>

Serafin Schema Builder is a TypeScript library that lets you build a **JSON Schema and its matching TypeScript type at the same time** — from a single definition. No more keeping a schema and an interface in sync by hand.

## Installation

```sh
npm i @serafin/schema-builder
```

## A quick example

```typescript
import { SchemaBuilder } from "@serafin/schema-builder"

const userSchema = SchemaBuilder.objectSchema(
    { title: "User" },
    {
        id: SchemaBuilder.stringSchema({ pattern: "\\w" }),
        firstName: SchemaBuilder.stringSchema(),
        role: SchemaBuilder.enumSchema(["admin", "user"]),
        email: SchemaBuilder.stringSchema({ format: "email" }),
        age: [SchemaBuilder.integerSchema(), undefined], // optional
    },
)

// A JSON Schema, available at runtime:
userSchema.schema

// The matching TypeScript type, inferred at compile time:
type User = typeof userSchema.T

// Validate data against the schema (uses Ajv):
userSchema.validate({ id: "abc", firstName: "John", role: "admin", email: "john@example.com" })
```

From that single source you can derive every related shape without repeating yourself — a patch body, query params, a public projection, and more:

```typescript
const userPatchSchema = userSchema.pickProperties(["firstName", "email", "age"]).toOptionals()

type UserPatch = typeof userPatchSchema.T
```

## Documentation

📚 **Full documentation, with interactive type-aware examples, is available at [serafin-labs.github.io/schema-builder](https://serafin-labs.github.io/schema-builder/).**

It covers building schemas (primitives, objects, arrays, tuples, enums, unions), transforming them (pick/omit, optionals, merging, combinators), validation, and the complete API reference.

## What's next?

`schema-builder` is a component of the **Serafin** framework. Learn more at [github.com/serafin-labs/serafin](https://github.com/serafin-labs/serafin).

## License

[MIT](./LICENSE)
