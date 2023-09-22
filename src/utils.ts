import { JSONSchema } from "./JsonSchema.js"

/**
 * Like a forEach but deeply on each JsonSchema it founds
 */
export function throughJsonSchema(schema: JSONSchema | JSONSchema[], action: (schema: JSONSchema) => void) {
    if (Array.isArray(schema)) {
        schema.forEach((s) => {
            throughJsonSchema(s, action)
        })
    } else {
        const type = typeof schema
        if (schema == null || type != "object") {
            return
        }
        action(schema)
        if (schema.properties) {
            for (let property in schema.properties) {
                throughJsonSchema(schema.properties[property] as JSONSchema, action)
            }
        }
        if (schema.oneOf) {
            schema.oneOf.forEach((s) => throughJsonSchema(s as JSONSchema[], action))
        }
        if (schema.allOf) {
            schema.allOf.forEach((s) => throughJsonSchema(s as JSONSchema[], action))
        }
        if (schema.anyOf) {
            schema.anyOf.forEach((s) => throughJsonSchema(s as JSONSchema[], action))
        }
        if (schema.items) {
            throughJsonSchema(schema.items as JSONSchema, action)
        }
        if (schema.not) {
            throughJsonSchema(schema.not as JSONSchema, action)
        }
        if (schema.additionalProperties && typeof schema.additionalProperties !== "boolean") {
            throughJsonSchema(schema.additionalProperties, action)
        }
    }
    return schema
}

/**
 * Utility method to deep clone JSON objects
 */
export function cloneJSON<T>(o: T): T {
    if (typeof o !== "object" || o === null) {
        return o
    }
    if (Array.isArray(o)) {
        return (o as any).map(cloneJSON)
    }
    const r = {} as T
    for (const key in o) {
        r[key] = cloneJSON(o[key])
    }
    return r
}

/**
 * Helper to set required field properly
 */
export function setRequired(schema: JSONSchema, required: string[]) {
    if (!required || required.length === 0) {
        delete schema.required
    } else {
        schema.required = required
    }
}
