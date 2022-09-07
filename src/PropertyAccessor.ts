import { KeysOfType } from "./TransformationTypes"

/**
 * Get a deep property corresponding to the path
 * If any element of the path is missing (-> falsy), this function will return `undefined`
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
 * Interface of a read only property accessor
 * It contains a path to a property in `D` with a `get` function to retrieve its value
 */
export interface ReadOnlyPropertyAccessor<D, V> {
    get(data: D): V
    path: (string | number)[]
}

/**
 * Interface of a property accessor
 * It contains a path to a property in `D` with a `get` function to retrieve its value and a `set` function to modify it
 */
export interface PropertyAccessor<D, V> extends ReadOnlyPropertyAccessor<D, V> {
    set(data: D, value: V): D
}

/**
 * Interface of a property accessor builder function
 * It can be used to describe a path to a property while ensuring type checking
 * @example ```ts
 * pa("anArray")(0)("aString")
 * ```
 * You can call a final `transform` function to transform the value before getting or setting it
 * @example ```ts
 * pa("aNumber").transform(n => `${n}`, s => Number(s))
 * ```
 */
export type PropertyAccessorBuilder<D, V> = PropertyAccessor<D, V> & {
    <K extends keyof V & (string | number)>(k: V extends any[] ? number : K): PropertyAccessorBuilder<D, V extends any[] ? V[number] : V[K]>
    transform<T>(getValueMapping: (value: V) => T, setValueMapping?: (value: T, target: V) => V): PropertyAccessor<D, T>
} & {
    [P in keyof V & (string | number)]: PropertyAccessorBuilder<D, V[P]>
}

/**
 * Resolver that represent the path from D to V to create a PropertyAccessor from it
 */
export type PropertyAccessorResolver<D, V> = KeysOfType<D, V> | ((pa: PropertyAccessorBuilder<D, D>) => PropertyAccessor<D, V>)

/**
 * Resolver the represent the path from D to V to create a PropertyAccessor from it
 */
export type ReadOnlyPropertyAccessorResolver<D, V> = KeysOfType<D, V> | ((pa: PropertyAccessorBuilder<D, D>) => ReadOnlyPropertyAccessor<D, V>)

export const propertyAccessorReservedProperties = ["get", "set", "path", "transform"]

/**
 * Create a property accessor builder of D
 * It can be used with the function syntax or as a proxy of the target object
 * @example ```ts
 * type M = {a: {b: string}}
 * const pa = createPropertyAccessor<M>()("a")("b")
 * // or
 * const pa = createPropertyAccessor<M>().a.b
 * ```
 */
export function createPropertyAccessor<D>() {
    function buildPropertyAccess<V>(path: (string | number)[]): PropertyAccessorBuilder<D, V> {
        function propertyAccessor<K extends keyof V & (string | number)>(property: K) {
            return buildPropertyAccess<V[K]>([...path, property])
        }
        propertyAccessor.get = (data: D) => get(path, data) as V
        propertyAccessor.set = (data: D, value: V) => set(path, data, value) as D
        propertyAccessor.path = path
        propertyAccessor.transform = <T>(getValueMapping: (value: V) => T, setValueMapping?: (value: T, target: V) => V) => {
            const pa: PropertyAccessorBuilder<D, T> = buildPropertyAccess(path)
            pa.get = (data: D) => getValueMapping(get(path, data) as V)
            pa.set = (data: D, value: T) => {
                if (!setValueMapping) {
                    throw new Error(`'setValueMapping' is not defined for property accessor '${path.join(".")}'`)
                }
                return set(path, data, setValueMapping(value, get(path, data) as V)) as D
            }
            return pa
        }
        const propertyAccessorBuilder = new Proxy(propertyAccessor, {
            get: (target, property: string, receiver) => {
                if (propertyAccessorReservedProperties.includes(property) && property in target) {
                    return Reflect.get(target, property, receiver)
                }
                const propertyAsNumber = +property
                return buildPropertyAccess<any>([...path, isNaN(propertyAsNumber) ? property : propertyAsNumber])
            },
        }) as any as PropertyAccessorBuilder<D, V>
        return propertyAccessorBuilder
    }
    return buildPropertyAccess<D>([])
}

/**
 * Run the given ReadOnlyPropertyAccessorResolver to transform it into a ReadOnlyPropertyAccessor D -> V
 */
export function resolveReadOnlyPropertyAccessor<D, V>(propertyResolver: ReadOnlyPropertyAccessorResolver<D, V>) {
    const pa = createPropertyAccessor<D>()
    if (typeof propertyResolver === "string") {
        return pa(propertyResolver as any) as any as ReadOnlyPropertyAccessor<D, V>
    }
    return propertyResolver(pa)
}
/**
 * Run the given PropertyAccessorResolver to transform it into a PropertyAccessor D -> V
 */
export function resolvePropertyAccessor<D, V>(propertyResolver: PropertyAccessorResolver<D, V>) {
    const pa = createPropertyAccessor<D>()
    if (typeof propertyResolver === "string") {
        return pa(propertyResolver as any) as any as PropertyAccessor<D, V>
    }
    return propertyResolver(pa)
}
