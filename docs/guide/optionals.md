# Optionals & Nullables

Two independent axes describe "absence" in a schema:

- **Optional** — the **key** may be missing (`age?: number`). Controlled by JSON Schema `required`.
- **Nullable** — the **value** may be `null` (`age: number | null`). Controlled by the `type` array.

## toOptionals

Make every property optional at once — perfect for a PATCH body derived from a create schema:

```ts twoslash
import { SB } from "@serafin/schema-builder"

const userSchema = SB.objectSchema(
    { title: "User" },
    {
        firstName: SB.stringSchema(),
        lastName: SB.stringSchema(),
        email: SB.stringSchema({ format: "email" }),
    },
)

const userPatchSchema = userSchema.toOptionals()

type UserPatch = typeof userPatchSchema.T
```

Combine it with [`pickProperties`](./pick-omit) to make a partial of just a subset:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const userSchema = SB.objectSchema(
    {},
    {
        firstName: SB.stringSchema(),
        email: SB.stringSchema(),
        age: [SB.integerSchema(), undefined],
    },
)
// ---cut---
const patch = userSchema.pickProperties(["firstName", "email", "age"]).toOptionals()

type Patch = typeof patch.T
```

## toDeepOptionals

Like `toOptionals`, but recurses into nested object properties, making the whole tree optional:

```ts twoslash
import { SB } from "@serafin/schema-builder"
// ---cut---
const schema = SB.objectSchema(
    {},
    {
        profile: SB.objectSchema(
            {},
            {
                name: SB.stringSchema(),
                bio: SB.stringSchema(),
            },
        ),
    },
)

const deep = schema.toDeepOptionals()

type Deep = typeof deep.T
```

## setOptionalProperties / setRequiredProperties

Flip the optionality of specific properties only. `setOptionalProperties` makes the listed keys optional; `setRequiredProperties` makes them required.

```ts twoslash
import { SB } from "@serafin/schema-builder"
const schema = SB.objectSchema(
    {},
    {
        id: SB.stringSchema(),
        nickname: SB.stringSchema(),
    },
)
// ---cut---
const s = schema.setOptionalProperties(["nickname"])

type T = typeof s.T
```

## toNullable

Make the value of every **optional** property nullable (adds `"null"` to each optional property's `type` / `enum`). Required properties are left untouched:

```ts twoslash
import { SB } from "@serafin/schema-builder"
const schema = SB.objectSchema(
    {},
    {
        firstName: [SB.stringSchema(), undefined],
        age: [SB.integerSchema(), undefined],
    },
)
// ---cut---
const nullable = schema.toNullable()

type T = typeof nullable.T
```

For a single value, prefer the `nullable` flag on the factory itself (`SB.stringSchema({}, true)`) — see [Primitive Schemas → Nullable variants](./primitives#nullable-variants).
