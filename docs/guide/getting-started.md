# Getting Started

## Installation

::: code-group

```bash [npm]
npm install @serafin/schema-builder
```

```bash [pnpm]
pnpm add @serafin/schema-builder
```

```bash [yarn]
yarn add @serafin/schema-builder
```

:::

The package ships both **ESM** and **CommonJS** builds with bundled type declarations, so it works whether your project uses `import` or `require`.

```ts twoslash
import { SB } from "@serafin/schema-builder"
```

```js
// CommonJS
const { SchemaBuilder: SB } = require("@serafin/schema-builder")
```

::: tip Requirements
Schema Builder is a TypeScript-first library. You'll get the most out of it with TypeScript and `strict` mode enabled, which is where the inferred types really pay off.
:::

## Your first schema

Every schema starts from a `SchemaBuilder` factory method. Let's build an object:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const userSchema = SB.objectSchema(
    { title: "User" },
    {
        id: SB.stringSchema({ pattern: "\\w" }),
        firstName: SB.stringSchema(),
        lastName: SB.stringSchema(),
        role: SB.enumSchema(["admin", "user"]),
        email: SB.stringSchema({ format: "email" }),
        tags: SB.arraySchema(SB.stringSchema(), { minItems: 1 }),
        age: [SB.integerSchema(), undefined], // optional property
    },
)
```

::: info Optional properties
Wrapping a builder in a tuple with `undefined` — `[SB.integerSchema(), undefined]` — marks the property as **optional**. It is left out of the schema's `required` list and becomes `age?: number` in the type.
:::

### The JSON Schema

Read the generated JSON Schema from the `.schema` property:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema() })
// ---cut---
const jsonSchema = userSchema.schema
```

```json
{
    "type": "object",
    "additionalProperties": false,
    "title": "User",
    "properties": {
        "id": { "type": "string", "pattern": "\\w" },
        "firstName": { "type": "string" },
        "lastName": { "type": "string" },
        "role": { "type": "string", "enum": ["admin", "user"] },
        "email": { "type": "string", "format": "email" },
        "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "age": { "type": "integer" }
    },
    "required": ["id", "firstName", "lastName", "role", "email", "tags"]
}
```

### The TypeScript type

The matching type is reachable through `typeof <builder>.T`. The `.T` property is a compile-time-only marker — don't read it at runtime; use it with `typeof` to get the type.

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.objectSchema(
    { title: "User" },
    {
        id: SB.stringSchema(),
        role: SB.enumSchema(["admin", "user"]),
        tags: SB.arraySchema(SB.stringSchema()),
        age: [SB.integerSchema(), undefined],
    },
)
// ---cut---
type User = typeof userSchema.T
```

## Validate some data

Each builder can validate values at runtime via Ajv:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema() })
// ---cut---
userSchema.validate({ id: "abc" }) // throws if invalid
```

See [Validation](./validation) for details and configuration.

## Next steps

- [Primitive Schemas](./primitives) — strings, numbers, booleans, null, and nullable variants
- [Object Schemas](./objects) — properties, additional properties, pattern properties
- [Transforming Schemas](./pick-omit) — derive new shapes from existing ones
