import { JSONSchema } from "./JsonSchema.js"

/**
 * Shallow-clone `root` and shallow-clone selected container keys in one step.
 *
 * Use this to produce a new schema object that can be safely mutated in place at the
 * top level *and* inside the named container keys — without deep-cloning untouched
 * subtrees. Unlisted keys keep their original references; listed keys whose value is
 * missing fall back to the provided default container (typically `{}` or `[]`).
 *
 * @example
 * ```ts
 * const next = cloneRoot(this.schemaObject, { properties: {}, required: [] })
 * next.properties[name] = subschema
 * next.required.push(name)
 * ```
 */
export function cloneRoot<T extends object>(root: T, defaults: Partial<T> = {}): T {
    const copy: any = Array.isArray(root) ? [...root] : { ...root }
    for (const key in defaults) {
        const k = key as keyof T
        const existing = copy[k]
        copy[k] = existing == null ? defaults[k] : Array.isArray(existing) ? [...existing] : { ...existing }
    }
    return copy
}

/**
 * Utility method to deep clone JSON objects.
 * Only own enumerable keys are copied — prototype-chain properties are ignored.
 * `Date`, `RegExp`, `Map`, `Set` etc. are not preserved (treated as plain objects).
 */
export function cloneJSON<T>(o: T): T {
    if (typeof o !== "object" || o === null) {
        return o
    }
    if (Array.isArray(o)) {
        return (o as any).map(cloneJSON)
    }
    const r = {} as T
    for (const key of Object.keys(o) as (keyof T)[]) {
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
