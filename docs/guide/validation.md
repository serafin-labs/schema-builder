# Validation

Every builder can validate data at runtime using [Ajv](https://ajv.js.org/). Because the schema and the type come from the same source, the value you pass to `validate` is already type-checked against the inferred type — and validated against the JSON Schema at runtime.

## validate

`validate(value)` throws a detailed error if the value is invalid, and returns nothing if it's valid:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const userSchema = SB.objectSchema(
    { title: "User" },
    {
        firstName: SB.stringSchema(),
        email: SB.stringSchema({ format: "email" }),
        age: [SB.integerSchema({ minimum: 0 }), undefined],
    },
)

userSchema.validate({ firstName: "John", email: "john@example.com", age: 42 })

// @errors: 2345
userSchema.validate({ firstName: "John" })
```

Notice the argument is typed: TypeScript catches a missing required `email` _before_ you even run the code, and Ajv catches value-level problems (bad format, out-of-range integer) at runtime.

## Default configuration

Validation uses Ajv with JSON Schema 2020-12 by default and the following options:

```ts
new Ajv({
    coerceTypes: false,
    removeAdditional: false,
    strict: false,
    allErrors: true,
})
```

`ajv-formats` is registered, so formats like `email`, `date-time`, `uri`, etc. are available out of the box.

## Per-schema configuration

`configureValidation(options)` returns a **new** builder that validates with merged Ajv options:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.objectSchema({}, { firstName: SB.stringSchema() })
// ---cut---
const coercing = userSchema.configureValidation({ coerceTypes: true, removeAdditional: true })
```

## Global configuration

To change the defaults for every builder, call the static `setGlobalValidationConfig` once at startup:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
SB.setGlobalValidationConfig({ coerceTypes: true })
```

Per-schema config from `configureValidation` is merged on top of the global config.

## Compilation & caching

Ajv compiles each schema into a validation function. Schema Builder compiles **lazily on first `validate`** and caches the function, so repeated validations are fast. You can force compilation ahead of time:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.objectSchema({}, { firstName: SB.stringSchema() })
// ---cut---
userSchema.cacheValidationFunction() // compile now, e.g. during app warm-up
```

The cache is automatically invalidated when the global validation config version changes.
