# Instance methods

Methods called on a `SchemaBuilder` instance. All transformation methods are **immutable** — they return a new builder.

## Adding properties

| Method | Description |
| --- | --- |
| `addProperty(name, builder, required?)` | Add one property with any builder. |
| `addOrReplaceProperty(name, builder, required?)` | Add, or replace if it already exists. |
| `addProperties(map)` | Add several properties (same map syntax as `objectSchema`). |
| `addString` / `addNumber` / `addInteger` / `addBoolean` | Typed shortcuts: `(name, keywords?, required?, nullable?)`. |
| `addEnum(name, values, keywords?, required?, nullable?)` | Add an enum property. |
| `addArray(name, items, keywords?, required?, nullable?)` | Add an array property. |
| `addTuple(name, items, keywords?, required?, nullable?)` | Add a tuple property. |
| `addTypes(name, types, keywords?, required?, nullable?)` | Add a multi-type property. |
| `addAdditionalProperties(builder?)` | Set `additionalProperties` + index signature. Apply **last**. |
| `addPatternProperty(prefix, suffix, builder?)` | Add `patternProperties` matching `^prefix.*suffix$`. |

See [Object Schemas](../guide/objects).

## Selecting properties

| Method | Description |
| --- | --- |
| `pickProperties(keys)` | Keep only the listed properties. |
| `omitProperties(keys)` | Drop the listed properties. |
| `pickAdditionalProperties(keys, extraKeys?)` | `pick` that's aware of index signatures. |
| `pickByType(type)` / `omitByType(type)` | Keep / drop properties by JSON Schema `type` (`integer` counts as `number`). |
| `omitReadOnlyProperties()` / `omitWriteOnlyProperties()` | Drop `readOnly` / `writeOnly` properties from the **emitted schema** (type unchanged — see [Transforming](../guide/transforming)). |
| `renameProperty(from, to)` | Rename a key, keeping its schema. |
| `renameProperties(map)` | Rename several keys via a `{ old: "new" }` map. |
| `prefixProperties(prefix, keys?, { capitalize? })` / `suffixProperties(suffix, keys?)` | Prefix / suffix property names (all, or a subset). `capitalize` upper-cases the original key's first char (`user` + `id` → `userId`). |
| `toCamelCaseKeys()` / `toSnakeCaseKeys()` | Convert all property names between `camelCase` and `snake_case` / `kebab-case`. |
| `propertyNamesEnum()` / `propertyNamesArray()` | Reflect property names into an `enum` / array schema. |
| `getSubschema(name)` | Extract a property as its own builder. |
| `getItemsSubschema()` | Extract the item schema of an array (non-tuple `items` only). |
| `objectProperties()` | Extract all properties as an `objectSchema`-style map for spreading. Traverses `allOf`/`anyOf`/`oneOf`. |

See [Picking & Omitting](../guide/pick-omit) and [Composing with objectProperties](../guide/object-properties).

## Optionality & nullability

| Method | Description |
| --- | --- |
| `toOptionals()` | Make all properties optional. |
| `toDeepOptionals()` | Make all properties optional, recursively. |
| `setOptionalProperties(keys)` | Make the listed properties optional. |
| `setRequiredProperties(keys)` | Make the listed properties required. |
| `toNullable()` | Make every property's value nullable. |

See [Optionals & Nullables](../guide/optionals).

## Combining & transforming

| Method | Common-property behavior |
| --- | --- |
| `mergeProperties(other)` | union (`\|`) |
| `overwriteProperties(other)` | replace with incoming |
| `intersectProperties(other)` | intersection (`&`) |
| `transformProperties(builder, keys?, { keepOriginal? })` | add an alternative type (`oneOf`), or replace it with `{ keepOriginal: false }` |
| `transformPropertiesToArray(keys?, arrayKeywords?, { keepOriginal? })` | also allow (or replace with) an array of the type |
| `unwrapArrayProperties(keys?, { keepOriginal? })` | also allow (or replace with) the element type |
| `expandEnumToProperties(enumProp \| pa => pa.path, valueBuilder, { prefix?, suffix?, required? })` | one generated property per enum value; pass a resolver to expand a nested enum with inferred typing |

See [Merging & Overwriting](../guide/merging) and [Transforming Properties](../guide/transforming).

## Enum & discriminated-union transforms

| Method | Description |
| --- | --- |
| `pickEnumValues(values)` | Narrow an enum schema to the listed values. |
| `omitEnumValues(values)` | Drop the listed values from an enum schema. |
| `mapEnumValues(map)` | Remap enum values via a `{ old: new }` map. |
| `narrowDiscriminated(prop, tag)` | Extract one branch of a discriminated `oneOf` as its own builder. |

See [Enums, Consts & Unions](../guide/enums-unions).

## Dependencies & unevaluated

| Method | Description |
| --- | --- |
| `addDependentRequired(prop, requiredKeys)` | Require keys when `prop` is present (validation-only). |
| `addDependentSchemas(prop, builder)` | Apply an extra schema when `prop` is present (validation-only). |
| `setIfThenElse({ if, then?, else? } \| null)` | Attach an `if`/`then`/`else` constraint (validation-only; no type narrowing). Pass `null` to clear. |
| `setUnevaluatedProperties(builder \| boolean \| null)` | Constrain unevaluated object properties. |
| `setUnevaluatedItems(builder \| boolean \| null)` | Constrain unevaluated array items. |

See [Conditionals & Dependencies](../guide/conditionals).

For type-level narrowing, use the static `SchemaBuilder.ifThenElse(...)` factory instead.

## Setting attributes & constraints

These methods are **immutable** and return a new builder. The keyword setters are type-guarded — they only compile on a schema of the matching kind (and throw at runtime if misused). Constraints are shallow-merged onto the existing schema.

| Method | Applies to | Description |
| --- | --- | --- |
| `setSchemaAttributes(attrs)` | any | Set general metadata: `title`, `description`, `default`, `examples`, `readOnly`, `writeOnly`, `deprecated`, `$id`. `default` is typed as `T` and `examples` as `T[]`. |
| `setPropertiesAttributes(map, { deep? })` | object | Merge common keywords into many properties at once. `deep` descends into nested objects and `oneOf`/`anyOf`/`allOf`. |
| `describeProperties(map, { mode?, separator?, deep? })` | object | Set / `append` / `prepend` `description` on many properties at once. |
| `setStringConstraints(constraints)` | string | Set `minLength`, `maxLength`, `pattern`, `format`. |
| `setNumberConstraints(constraints)` | number / integer | Set `multipleOf`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`. |
| `setArrayConstraints(constraints)` | array / tuple | Set `minItems`, `maxItems`, `uniqueItems`. |
| `setContains(builder \| null, { minContains?, maxContains? })` | array | Require at least `minContains` (default `1`) and at most `maxContains` items to match `builder`. Pass `null` to clear. Type is preserved. |
| `setObjectConstraints(constraints)` | object | Set `minProperties`, `maxProperties`. |
| `setPropertyNames(builder \| null)` | object | Constrain property names with a string schema (validation-only). Pass `null` to clear. |
| `setContent({ mediaType?, encoding?, schema? } \| null)` | string | Set the `contentMediaType` / `contentEncoding` / `contentSchema` group (validation-only). Pass `null` to clear all three. |
| `setId($id \| null)` | any | Set the `$id` identifier. Pass `null` to remove it. |

## Inspecting a schema

Read-only getters and helpers describing the current schema. The list getters return `null` when the schema is not a plain object schema (e.g. it uses `oneOf`/`allOf`/`anyOf`/`not`).

| Member | Description |
| --- | --- |
| `schema` | The underlying JSON Schema object. |
| `hasType(type)` | `true` if the schema's `type` includes the given JSON Schema type name. |
| `isObjectSchema` | `true` if the schema represents an object. |
| `isArraySchema` | `true` if the schema represents an array. |
| `isSimpleObjectSchema` | `true` if it's an object with `additionalProperties: false` and no combination keywords. |
| `hasAdditionalProperties` | `true` if the object can have additional properties. |
| `hasSchemasCombinationKeywords` | `true` if the schema uses `oneOf`, `allOf`, `anyOf` or `not`. |
| `properties` | Names of the object's properties, or `null`. |
| `requiredProperties` | Names of the required properties, or `null`. |
| `optionalProperties` | Names of the optional properties, or `null`. |

## Validation & output

| Method | Description |
| --- | --- |
| `validate(value)` | Validate with Ajv; throws on failure. |
| `configureValidation(options)` | New builder with merged Ajv options. |
| `cacheValidationFunction()` | Pre-compile the validation function. |
| `getPropertyAccessor()` | Typed accessor helper for property paths. |
| `toTypescript(customize?)` | *Experimental:* emit equivalent `SchemaBuilder` source. |

See [Validation](../guide/validation).
