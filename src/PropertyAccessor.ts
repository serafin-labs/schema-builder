import { SchemaBuilder } from "."
import { SimpleObject } from "./TransformationTypes"

/**
 * Get a deep property corresponding to the path
 */
function get(path: (string | number)[], data: any) {
    return path.reduce((data, pathElement) => (data && pathElement in data ? data[pathElement] : undefined), data)
}

/**
 * Set a deep property and ensure that any object/array along the path is copied or initialized
 */
function set(path: (string | number)[], data: SimpleObject, value: any) {
    data = { ...data }
    let current: any = data
    for (let i = 0; i < path.length; ++i) {
        const key = path[i]
        if (i === path.length - 1) {
            current[key] = value
        } else {
            current[key] = current[key] ? (Array.isArray(current[key]) ? [...current[key]] : { ...current[key] }) : typeof path[i + 1] === "string" ? {} : []
            current = current[key]
        }
    }
    return data
}

/**
 * Interface of a property accessor function
 * It simplifies getting and setting deeply nested properties while maintaining type checking
 */
export interface PropertyAccessor<D extends SimpleObject, V> {
    <K extends Exclude<keyof V, symbol>>(k: V extends any[] ? number : V extends SimpleObject ? K : never): PropertyAccessor<
        D,
        V extends any[] ? V[number] : V extends SimpleObject ? V[K] : never
    >
    get(data: D): V
    set(data: D, value: V): D
    path: (string | number)[]
}

/**
 * Create a property accessor based on a schema
 * @param schema The initial object schema to start the property accessor from
 */
export function createPropertyAccessor<D extends SimpleObject>(schema?: SchemaBuilder<D>) {
    function buildPropertyAccess<V>(path: (string | number)[]): PropertyAccessor<D, V> {
        function propertyAccess<K extends Exclude<keyof V, symbol>>(property: V extends any[] ? number : V extends SimpleObject ? K : never) {
            return buildPropertyAccess<V extends any[] ? V[number] : V extends SimpleObject ? V[K] : never>([...path, property])
        }
        propertyAccess.get = (data: D) => get(path, data) as V
        propertyAccess.set = (data: D, value: V) => set(path, data, value) as D
        propertyAccess.path = path
        return propertyAccess
    }
    return buildPropertyAccess<D>([])
}
