# API Reference

The library's public surface is the `SchemaBuilder<T>` class. `T` is the inferred TypeScript type of the data the schema describes.

```ts twoslash
import { SchemaBuilder } from "@serafin/schema-builder"
```

Every builder exposes two key members:

| Member | Description |
| --- | --- |
| `.schema` | The underlying JSON Schema object (read at runtime). |
| `.T` | A compile-time-only marker. Use `typeof builder.T` to reference the inferred type — never read it at runtime. |

Builders are **immutable**: every factory and transformation method returns a *new* `SchemaBuilder`. This is what makes deriving related schemas safe.

## How the reference is organized

- **[Factory methods](./factories)** — static methods that *create* a builder (`stringSchema`, `objectSchema`, `oneOf`, …).
- **[Instance methods](./instance-methods)** — methods you call *on* a builder to add properties, transform, combine, and validate.

::: tip Source is the source of truth
This library is TypeScript-first: every method carries doc comments and precise types, so your editor's IntelliSense is an excellent companion to these pages. When in doubt, hover the method in your IDE.
:::

## Common conventions

- **Nullable** — factories for primitives, arrays, enums, tuples and multi-types accept a trailing `nullable` boolean. When `true`, `"null"` is added to the schema `type` and the inferred type becomes a union with `null`.
- **Optional properties** — in `objectSchema`/`addProperties` maps, wrap a builder in a tuple with `undefined` (`[SchemaBuilder.stringSchema(), undefined]`) to make it optional. The `add*` shortcuts take a `required` boolean argument instead.
- **Keyword bags** — the first argument of most factories is a typed subset of JSON Schema keywords valid for that type (e.g. `minLength` for strings, `minimum` for numbers).
