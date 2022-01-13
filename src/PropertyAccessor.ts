import { KeysOfType, StringKeys } from "./TransformationTypes"

/**
 * Get a deep property corresponding to the path
 */
function get(path: (string | number)[], data: any) {
    return path.reduce((data, pathElement) => (data && pathElement in data ? data[pathElement] : undefined), data)
}

/**
 * Set a deep property and ensure that any object/array along the path is copied or initialized
 */
function set(path: (string | number)[], data: any, value: any) {
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
export interface PropertyAccessor<D, V> {
    <K extends StringKeys<V>>(k: V extends any[] ? number : V extends object ? K : never): PropertyAccessor<
        D,
        V extends any[] ? V[number] : V extends object ? V[K] : never
    >
    get(data: D): V
    set(data: D, value: V): D
    path: (string | number)[]
}

/**
 * Resolver the represent the path from D to V to create a PropertyAccessor from it
 */
export type PropertyAccessorResolver<D, V> = KeysOfType<D, V> | ((pa: PropertyAccessor<D, D>) => PropertyAccessor<D, V>)

/**
 * Create a property accessor D -> D
 */
export function createPropertyAccessor<D>() {
    function buildPropertyAccess<V>(path: (string | number)[]): PropertyAccessor<D, V> {
        function propertyAccess<K extends StringKeys<V>>(property: V extends any[] ? number : V extends object ? K : never) {
            return buildPropertyAccess<V extends any[] ? V[number] : V extends object ? V[K] : never>([...path, property])
        }
        propertyAccess.get = (data: D) => get(path, data) as V
        propertyAccess.set = (data: D, value: V) => set(path, data, value) as D
        propertyAccess.path = path
        return propertyAccess
    }
    return buildPropertyAccess<D>([])
}

/**
 * Run the given PropertyAccessorResolver to transform it into a PropertyAccessor D -> V
 */
export function resolvePropertyAccessor<D, V>(propertyResolver: PropertyAccessorResolver<D, V>) {
    const pa = createPropertyAccessor<D>()
    if (typeof propertyResolver === "string") {
        return pa(propertyResolver as any) as PropertyAccessor<D, V>
    }
    return propertyResolver(pa)
}
