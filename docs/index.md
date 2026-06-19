---
layout: home

hero:
    name: Schema Builder
    text: One source for your schema and your type
    tagline: Programmatically build a JSON Schema and its matching TypeScript type at the same time — no duplication, no drift.
    image:
        src: /logo-full.jpg
        alt: Serafin Schema Builder
    actions:
        - theme: brand
          text: Get Started
          link: /guide/getting-started
        - theme: alt
          text: Why Schema Builder?
          link: /guide/why
        - theme: alt
          text: View on GitHub
          link: https://github.com/serafin-labs/schema-builder

features:
    - icon: 🧬
      title: Schema + type, together
      details: Every builder carries a JSON Schema (`.schema`) and a fully inferred TypeScript type (`typeof builder.T`). Change one, the other follows.
    - icon: 🧱
      title: Composable by design
      details: Pick, omit, merge, overwrite and transform properties to derive new schemas (patch bodies, query params…) from a single definition.
    - icon: ✅
      title: Validation built in
      details: Validate data with Ajv (JSON Schema 2020-12 by default). Validation functions are compiled and cached automatically.
    - icon: 📦
      title: Tiny surface, ESM + CJS
      details: Ships dual ESM/CJS builds with full type declarations. Built on ajv, ajv-formats and lodash.
---

## A quick taste

Hover over any identifier in the example below — the type you see is inferred **directly** from the schema you wrote.

```ts twoslash
import { SB } from "@serafin/schema-builder"

const userSchema = SB.objectSchema(
    { title: "User" },
    {
        id: SB.stringSchema({ pattern: "\\w" }),
        firstName: SB.stringSchema(),
        role: SB.enumSchema(["admin", "user"]),
        email: SB.stringSchema({ format: "email" }),
        tags: SB.arraySchema(SB.stringSchema(), { minItems: 1 }),
        age: [SB.integerSchema(), undefined], // optional
    },
)

// The TypeScript type, inferred from the schema:
type User = typeof userSchema.T
```

Derive a patch schema — and its type — from the one above, without repeating yourself:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.objectSchema(
    { title: "User" },
    {
        id: SB.stringSchema(),
        firstName: SB.stringSchema(),
        email: SB.stringSchema({ format: "email" }),
        age: [SB.integerSchema(), undefined],
    },
)
// ---cut---
const userPatchSchema = userSchema.pickProperties(["firstName", "email", "age"]).toOptionals()

type UserPatch = typeof userPatchSchema.T

// And validate against it at runtime:
userPatchSchema.validate({ firstName: "John", age: 42 })
```
