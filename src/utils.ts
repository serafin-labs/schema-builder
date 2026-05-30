import { JSONSchema } from "./JsonSchema.js"

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
