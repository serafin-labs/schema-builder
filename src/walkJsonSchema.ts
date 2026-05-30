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
    | "dependencies"
    | "items"
    | "additionalItems"
    | "contains"
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
 *   `propertyNames`, `dependencies` (schema-form entries only)
 * - applicators on arrays: `items` (single or tuple form), `additionalItems`, `contains`
 * - conditionals: `if`, `then`, `else`
 * - composition: `oneOf`, `allOf`, `anyOf`, `not`
 *
 * Boolean subschemas (allowed by JSON Schema draft-07+), `null`, primitives, and the
 * `string[]` form of `dependencies` are accepted as input but produce no callback.
 *
 * The callback is invoked on the root schema first, then on each nested schema in a
 * pre-order traversal. Each entry of a `properties` / `patternProperties` /
 * `dependencies` map is visited individually — the container map itself is never
 * passed to `action`.
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
    schema: JSONSchema | JSONSchema[],
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
            walk(schema.properties[property] as JSONSchema, action, "properties")
        }
    }
    if (schema.patternProperties) {
        for (const pattern in schema.patternProperties) {
            walk(schema.patternProperties[pattern] as JSONSchema, action, "patternProperties")
        }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties !== "boolean") {
        walk(schema.additionalProperties, action, "additionalProperties")
    }
    if (schema.propertyNames && typeof schema.propertyNames !== "boolean") {
        walk(schema.propertyNames, action, "propertyNames")
    }
    if (schema.dependencies) {
        for (const key in schema.dependencies) {
            const dep = schema.dependencies[key]
            if (dep && !Array.isArray(dep) && typeof dep !== "boolean") {
                walk(dep, action, "dependencies")
            }
        }
    }

    if (schema.items) {
        walk(schema.items as JSONSchema | JSONSchema[], action, "items")
    }
    if (schema.additionalItems && typeof schema.additionalItems !== "boolean") {
        walk(schema.additionalItems, action, "additionalItems")
    }
    if (schema.contains && typeof schema.contains !== "boolean") {
        walk(schema.contains, action, "contains")
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
        schema.oneOf.forEach((s) => walk(s as JSONSchema, action, "oneOf"))
    }
    if (schema.allOf) {
        schema.allOf.forEach((s) => walk(s as JSONSchema, action, "allOf"))
    }
    if (schema.anyOf) {
        schema.anyOf.forEach((s) => walk(s as JSONSchema, action, "anyOf"))
    }
    if (schema.not && typeof schema.not !== "boolean") {
        walk(schema.not, action, "not")
    }
}
