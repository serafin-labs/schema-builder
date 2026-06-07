import { JSONSchema } from "./JsonSchema.js"

/**
 * The name of the JSON Schema keyword under which a nested schema was found.
 * Passed as the second argument of the `walkJsonSchema` callback.
 *
 * `undefined` is used for the root schema (and for each top-level entry when an
 * array of schemas is passed in) since they have no enclosing keyword.
 */
export type JsonSchemaKeyword =
    | "properties"
    | "patternProperties"
    | "additionalProperties"
    | "propertyNames"
    | "dependentSchemas"
    | "items"
    | "prefixItems"
    | "contains"
    | "unevaluatedItems"
    | "unevaluatedProperties"
    | "contentSchema"
    | "$defs"
    | "if"
    | "then"
    | "else"
    | "oneOf"
    | "allOf"
    | "anyOf"
    | "not"

/**
 * Recursively walk a JSON schema (or array of schemas) and invoke `action` on every
 * nested schema object that is encountered.
 *
 * The traversal descends into every JSON Schema keyword whose value is itself a
 * schema or a collection of schemas:
 *
 * - applicators on objects: `properties`, `patternProperties`, `additionalProperties`,
 *   `propertyNames`, `dependentSchemas`, `unevaluatedProperties`
 * - applicators on arrays: `items`, `prefixItems`, `contains`, `unevaluatedItems`
 * - conditionals: `if`, `then`, `else`
 * - composition: `oneOf`, `allOf`, `anyOf`, `not`
 * - reuse: `$defs`
 * - content: `contentSchema`
 *
 * Boolean subschemas, `null` and primitives are accepted as input but produce no
 * callback.
 *
 * The callback is invoked on the root schema first, then on each nested schema in a
 * pre-order traversal. Each entry of a `properties` / `patternProperties` /
 * `dependentSchemas` / `$defs` map is visited individually — the container map
 * itself is never passed to `action`.
 *
 * The callback receives the keyword name under which the current schema was found
 * as its second argument (`undefined` for the root schema, or for each entry when an
 * array of schemas is passed in at the top level). This lets the callback adapt its
 * behavior based on the schema's structural role.
 *
 * @param schema - The JSON schema (or array of schemas) to walk. `null`, primitives
 *                 and `boolean` subschemas are accepted but produce no callback.
 * @param action - Callback invoked once per visited schema object. Receives the schema
 *                 and the name of the keyword under which it was nested (`undefined`
 *                 for the root).
 * @returns The original `schema` reference, unchanged, for convenience when chaining.
 *
 * @example
 * ```ts
 * // Collect every `$ref` along with the keyword it appeared under:
 * const refs: { ref: string; keyword: string | undefined }[] = []
 * walkJsonSchema(schema, (s, keyword) => {
 *     if (s.$ref) refs.push({ ref: s.$ref, keyword })
 * })
 * ```
 */
export function walkJsonSchema(
    schema: JSONSchema | JSONSchema[],
    action: (schema: JSONSchema, keyword?: JsonSchemaKeyword) => void,
): JSONSchema | JSONSchema[] {
    walk(schema, action, undefined)
    return schema
}

function walk(
    schema: JSONSchema | JSONSchema[] | boolean,
    action: (schema: JSONSchema, keyword?: JsonSchemaKeyword) => void,
    keyword: JsonSchemaKeyword | undefined,
): void {
    if (Array.isArray(schema)) {
        schema.forEach((s) => {
            walk(s, action, keyword)
        })
        return
    }
    if (schema == null || typeof schema !== "object") {
        return
    }
    action(schema, keyword)

    if (schema.properties) {
        for (const property in schema.properties) {
            walk(schema.properties[property], action, "properties")
        }
    }
    if (schema.patternProperties) {
        for (const pattern in schema.patternProperties) {
            walk(schema.patternProperties[pattern], action, "patternProperties")
        }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties !== "boolean") {
        walk(schema.additionalProperties, action, "additionalProperties")
    }
    if (schema.unevaluatedProperties && typeof schema.unevaluatedProperties !== "boolean") {
        walk(schema.unevaluatedProperties, action, "unevaluatedProperties")
    }
    if (schema.propertyNames && typeof schema.propertyNames !== "boolean") {
        walk(schema.propertyNames, action, "propertyNames")
    }
    if (schema.dependentSchemas) {
        for (const key in schema.dependentSchemas) {
            walk(schema.dependentSchemas[key], action, "dependentSchemas")
        }
    }

    if (schema.prefixItems) {
        schema.prefixItems.forEach((s) => walk(s, action, "prefixItems"))
    }
    if (schema.items && typeof schema.items !== "boolean") {
        walk(schema.items, action, "items")
    }
    if (schema.unevaluatedItems && typeof schema.unevaluatedItems !== "boolean") {
        walk(schema.unevaluatedItems, action, "unevaluatedItems")
    }
    if (schema.contains && typeof schema.contains !== "boolean") {
        walk(schema.contains, action, "contains")
    }

    if (schema.contentSchema && typeof schema.contentSchema !== "boolean") {
        walk(schema.contentSchema, action, "contentSchema")
    }

    if (schema.$defs) {
        for (const key in schema.$defs) {
            walk(schema.$defs[key], action, "$defs")
        }
    }

    if (schema.if && typeof schema.if !== "boolean") {
        walk(schema.if, action, "if")
    }
    if (schema.then && typeof schema.then !== "boolean") {
        walk(schema.then, action, "then")
    }
    if (schema.else && typeof schema.else !== "boolean") {
        walk(schema.else, action, "else")
    }

    if (schema.oneOf) {
        schema.oneOf.forEach((s) => walk(s, action, "oneOf"))
    }
    if (schema.allOf) {
        schema.allOf.forEach((s) => walk(s, action, "allOf"))
    }
    if (schema.anyOf) {
        schema.anyOf.forEach((s) => walk(s, action, "anyOf"))
    }
    if (schema.not && typeof schema.not !== "boolean") {
        walk(schema.not, action, "not")
    }
}
