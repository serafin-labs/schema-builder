# Factory methods

Static methods on `SchemaBuilder` that create a new builder.

## Primitives & literals

| Method | Produces | Type |
| --- | --- | --- |
| `stringSchema(keywords?, nullable?)` | `{ type: "string" }` | `string` |
| `numberSchema(keywords?, nullable?)` | `{ type: "number" }` | `number` |
| `integerSchema(keywords?, nullable?)` | `{ type: "integer" }` | `number` |
| `booleanSchema(keywords?, nullable?)` | `{ type: "boolean" }` | `boolean` |
| `nullSchema(keywords?)` | `{ type: "null" }` | `null` |
| `anySchema(keywords?)` | `{}` | `any` |
| `neverSchema(keywords?)` | `{ type: [] }` | `never` |
| `enumSchema(values, keywords?, nullable?)` | `{ enum: [...] }` | literal union |
| `constSchema(value, keywords?)` | `{ const: value }` | literal |
| `typesSchema(types, keywords?, nullable?)` | `{ type: [...] }` | primitive union |

See [Primitive Schemas](../guide/primitives) and [Enums, Consts & Unions](../guide/enums-unions).

## Containers

| Method | Produces | Type |
| --- | --- | --- |
| `objectSchema(keywords, properties)` | object schema | inferred interface |
| `emptySchema(keywords?, nullable?)` | empty object schema | `{}` |
| `arraySchema(items, keywords?, nullable?)` | `{ type: "array", items }` | `U[]` |
| `tupleSchema(items, keywords?, nullable?)` | `{ prefixItems, ... }` | tuple `[...]` |

`tupleSchema` accepts a `rest` builder in its keywords to allow trailing items (`[T1, ...R[]]`). See [Object Schemas](../guide/objects) and [Arrays & Tuples](../guide/arrays).

## Combinators

| Method | Produces | Type |
| --- | --- | --- |
| `allOf(...builders)` | `{ allOf: [...] }` | intersection `A & B` |
| `anyOf(...builders)` | `{ anyOf: [...] }` | union `A \| B` |
| `oneOf(...builders)` | `{ oneOf: [...] }` | union `A \| B` |
| `not(builder)` | `{ not: ... }` | `any` |
| `oneOfDiscriminated(prop, variants)` | `{ oneOf, discriminator }` | discriminated union |
| `ifThenElse(if, then, else)` | `{ if, then, else }` | `Then \| Else` |

See [Combinators](../guide/combinators) and [Conditionals & Dependencies](../guide/conditionals).

## Interop & config

| Method | Description |
| --- | --- |
| `fromJsonSchema(schema as const, validationConfig?)` | Build from a literal JSON Schema, deducing the type. See [From a literal JSON Schema](../guide/from-json-schema). |
| `setGlobalValidationConfig(options)` | Set default Ajv options for all builders. See [Validation](../guide/validation#global-configuration). |
