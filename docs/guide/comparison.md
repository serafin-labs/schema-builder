# Schema Builder vs Zod

If you have used [Zod](https://zod.dev), Schema Builder will feel familiar: both let you describe a shape once and
get a TypeScript type from it. But they optimize for different things, and the difference matters when you pick one.

**Zod is validator-first.** Its source of truth is a Zod schema — a runtime object with its own API. JSON Schema
is an _export target_ you reach for when you need to talk to something else (OpenAPI, a form library, an LLM tool
definition).

**Schema Builder is JSON-Schema-first.** The source of truth _is_ a JSON Schema document
([2020-12](https://json-schema.org/), with OpenAPI 3.1 extensions). `SchemaBuilder` is a thin, immutable wrapper
that builds and **transforms** that document while inferring the matching TypeScript type. The JSON Schema is never
a lossy export — it is the thing you are editing, available at any point through `.schema`.

That makes the two libraries answer different questions:

- Reach for **Zod** when the schema lives inside one TypeScript app and validation ergonomics are what you care
  about.
- Reach for **Schema Builder** when **JSON Schema is the contract** — OpenAPI specs, MCP tool definitions, schemas
  shared across services or languages — and you need to _derive_ many related shapes from one definition without
  drift.

## At a glance

| Topic                     | Zod                                                          | Schema Builder                                                                       |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Source of truth           | A Zod schema object                                         | A **JSON Schema** document (`.schema`)                                               |
| JSON Schema               | Export via `z.toJSONSchema` (can be lossy / approximate)    | **Is** the model — 1:1, always available, round-trips                                |
| TypeScript type           | `z.infer<typeof s>`                                          | `typeof s.T`                                                                          |
| Spec coverage             | Zod's own feature set                                       | JSON Schema 2020-12 keywords + OpenAPI 3.1 (`discriminator`, `externalDocs`, …)      |
| Validation                | Built-in, Zod's own engine                                  | [Ajv](https://ajv.js.org) (`.validate`), compiled & cached                           |
| Immutability              | Methods return new schemas                                  | Every transformation returns a **new builder**                                       |
| Extract object shape      | `.shape`                                                    | [`.objectProperties()`](./object-properties) (also traverses `allOf`/`anyOf`/`oneOf`)  |
| Compose object shapes     | `.extend()`, `.merge()`, `...A.shape`                       | `...a.objectProperties()`, `mergeProperties`, `intersectProperties`, `addProperties`   |
| Derive related shapes     | `.pick` / `.omit` / `.partial`                              | `pickProperties` / `omitProperties` / `toOptionals` / `toNullable` / `renameProperty`|
| Transform existing keys   | limited                                                     | `transformProperties`, `transformPropertiesToArray`, `unwrapArrayProperties`         |
| Combinators               | `z.union`, `z.intersection`, `z.discriminatedUnion`         | `oneOf`, `anyOf`, `allOf`, `not`, `oneOfDiscriminated`, `ifThenElse`                  |
| Parsing / coercion        | First-class (`.parse`, `.coerce`, `.transform` of values)   | Not a goal — Schema Builder shapes _schemas_, not runtime values                     |
| Codegen                   | —                                                           | `toTypescript()` emits equivalent `SchemaBuilder` source (experimental)              |

## The transformation angle

The reason Schema Builder leans so hard on transformation methods is that it is built to feed
**[`@serafin/pipeline`](https://github.com/serafin-labs/serafin)** and the wider Serafin framework, where a single
resource definition fans out into many schemas — a create body, a patch body, query parameters, a public
projection, a response envelope. Each of those is a JSON Schema derived from the same source:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const user = SB.objectSchema(
    { title: "User" },
    {
        id: SB.stringSchema(),
        firstName: SB.stringSchema(),
        email: SB.stringSchema({ format: "email" }),
        createdAt: SB.stringSchema({ format: "date-time" }),
    },
)

// A create body: everything the client may send, none of the server-owned fields.
const createUser = user.omitProperties(["id", "createdAt"])

// A patch body: the create fields, all optional.
const patchUser = createUser.toOptionals()

// Each is a real JSON Schema and a real TypeScript type, kept in lockstep with `user`.
type CreateUser = typeof createUser.T
type PatchUser = typeof patchUser.T
```

In Zod you _can_ do much of this, but the artifact you carry around is a Zod schema. In Schema Builder the artifact
is a JSON Schema, which is exactly what an OpenAPI document, an MCP connector, or another service wants to consume.

## What Schema Builder is not

- It is **not a parser**. It does not coerce, strip, or transform _values_ at runtime — that is what validation
  (`.validate`) and downstream code are for. It transforms _schemas_.
- It is **not trying to out-feature Zod's developer experience** for in-app validation. If you never emit JSON
  Schema, Zod is likely the more convenient tool.
