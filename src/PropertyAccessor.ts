import { SchemaBuilder } from "./SchemaBuilder"

export type PropertyAccessorPath = (string | number)[]

/**
 * Get a deep property corresponding to the path
 * If any element of the path is missing (-> falsy), this function will return `undefined`
 */
function getWithPath(path: PropertyAccessorPath, data: any) {
    return path.reduce((data, pathElement) => (data && pathElement in data ? data[pathElement] : undefined), data)
}

/**
 * Set a deep property and ensure that any object/array along the path is copied or initialized
 */
function setWithPath(path: PropertyAccessorPath, data: any, value: any) {
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
 * It contains a path to a property in `D` with a `get` function to retrieve its value and a `schema` corresponding to the targeted property
 */
export interface ReadOnlyPropertyAccessor<D, V, PATH extends PropertyAccessorPath = PropertyAccessorPath> {
    /**
     * Get the value targeted by the property accessor on the given data object
     * @param data data object to retrieve the property from
     */
    get(data: D): V
    /**
     * Array of path elements to locate the property
     */
    path: PATH
    /**
     * Schema corresponding to the targeted property
     */
    schema: SchemaBuilder<V>
}

/**
 * Interface of a property accessor
 * It contains a path to a property in `D` with a `get` function to retrieve its value, a `set` function to modify it and a `schema` corresponding to the targeted property
 */
export interface PropertyAccessor<D, V, PATH extends PropertyAccessorPath = PropertyAccessorPath> extends ReadOnlyPropertyAccessor<D, V, PATH> {
    set(data: D, value: V): D
}

/**
 * Interface of a property accessor builder function
 * It can be used to describe a path to a property while ensuring type checking
 * @example ```ts
 * // callable syntax
 * pa("anArray")(0)("aString")
 * // or proxy syntax
 * pa.anArray[0].aString
 * ```
 */
export type PropertyAccessorBuilder<D, V, PATH extends PropertyAccessorPath> = PropertyAccessor<D, V, PATH> & {
    /**
     * Describe the next element in the path to access the property using callable syntax.
     * @example ```ts
     * // callable syntax
     * pa("anArray")(0)("aString")
     * ```
     * When accessing an element of a tuple type (ex: `[string, number]`), you should always use the proxy syntax instead to have a more precise type.
     */
    <K extends keyof V & (string | number)>(k: V extends any[] ? number : K): PropertyAccessorBuilder<
        D,
        V extends any[] ? V[number] : V[K],
        [...PATH, V extends any[] ? number : K]
    >
    /**
     * You can call a final `transform` function to transform the value before getting or setting it
     * @example ```ts
     * pa("aNumber").transform(n => `${n}`, s => Number(s))
     * ```
     * When a transform is used the schema corresponding to the path will always be `undefined`
     * @param getValueMapping Function that transform the property targeted by the current path into T
     * @param setValueMapping Function that transform a given T into the type targeted by the current path
     */
    transform<T>(getValueMapping: (value: V) => T, setValueMapping?: (value: T, target: V) => V): PropertyAccessor<D, T, PATH>
    /**
     * Narrow down the type of the current path in case it is a union type.
     * If provided, the narrowSchema function should get or create a schema corresponding to the expected narrowed type or transform it from the current schema.
     * @example ```ts
     * type S = {s: string}
     * type N = {n: number}
     * type M = {o: S | N}
     * pa.o.narrow<S>().s
     * ```
     * @param typeFilter filter type function that should narrow the type and return the value
     */
    narrow<X extends V>(schemaTransform?: (s: SchemaBuilder<V>) => SchemaBuilder<X>): PropertyAccessorBuilder<D, X, PATH>
} & {
    /**
     * Describe the next element in the path to access the property using the proxy syntax.
     * @example ```ts
     * // proxy syntax
     * pa.anArray[0].aString
     * ```
     */
    [P in keyof V & (string | number)]: PropertyAccessorBuilder<D, V[P], [...PATH, P]>
}

/**
 * Resolver that represent the path from D to V to create a PropertyAccessor from it
 */
export type PropertyAccessorResolver<D, V, PATH extends PropertyAccessorPath = PropertyAccessorPath> = (
    pa: PropertyAccessorBuilder<D, D, []>,
) => PropertyAccessor<D, V, PATH>

/**
 * Resolver the represent the path from D to V to create a PropertyAccessor from it
 */
export type ReadOnlyPropertyAccessorResolver<D, V, PATH extends PropertyAccessorPath = PropertyAccessorPath> = (
    pa: PropertyAccessorBuilder<D, D, []>,
) => ReadOnlyPropertyAccessor<D, V, PATH>

export const propertyAccessorReservedProperties = ["get", "set", "path", "schema", "narrow", "transform"]

/**
 * Create a property accessor builder of D
 * It can be used with the callable or proxy syntax
 * @example ```ts
 * type M = {a: {b: string}}
 * const pa = createPropertyAccessor<M>()("a")("b")
 * // or
 * const pa = createPropertyAccessor<M>().a.b
 * ```
 */
export function createPropertyAccessor<D>(s?: SchemaBuilder<D>) {
    function getSubschema(property: string | number, s?: SchemaBuilder<any>) {
        return s ? (s.isArraySchema || typeof property === "number" ? s.getItemsSubschema() : s.getSubschema(property)) : undefined
    }
    function buildPropertyAccess<V, PATH extends PropertyAccessorPath>(path: PATH, s?: SchemaBuilder<V>): PropertyAccessorBuilder<D, V, PATH> {
        function propertyAccessor<K extends keyof V & (string | number)>(property: K) {
            return buildPropertyAccess<V[K], [...PATH, K]>([...path, property], getSubschema(property, s))
        }
        propertyAccessor.get = (data: D) => getWithPath(path, data) as V
        propertyAccessor.set = (data: D, value: V) => setWithPath(path, data, value) as D
        propertyAccessor.path = path
        propertyAccessor.schema = s
        propertyAccessor.transform = <T>(getValueMapping: (value: V) => T, setValueMapping?: (value: T, target: V) => V) => {
            const pa: PropertyAccessorBuilder<D, T, PATH> = buildPropertyAccess(path)
            pa.get = (data: D) => getValueMapping(getWithPath(path, data) as V)
            pa.set = (data: D, value: T) => {
                if (!setValueMapping) {
                    throw new Error(`'setValueMapping' is not defined for property accessor '${path.join(".")}'`)
                }
                return setWithPath(path, data, setValueMapping(value, getWithPath(path, data) as V)) as D
            }
            return pa
        }
        propertyAccessor.narrow = <T extends V>(schemaTransform?: (s: SchemaBuilder<V>) => SchemaBuilder<T>) => {
            if (s && !schemaTransform) {
                throw new Error(`'schemaTransform' is mandatory when narrowing a property accessor with a schema`)
            }
            const newSchema = s && schemaTransform ? schemaTransform(s) : undefined
            const pa: PropertyAccessorBuilder<D, T, PATH> = buildPropertyAccess(path, newSchema)
            return pa
        }
        const propertyAccessorBuilder = new Proxy(propertyAccessor, {
            get: (target, property: string, receiver) => {
                if (propertyAccessorReservedProperties.includes(property) && property in target) {
                    return Reflect.get(target, property, receiver)
                }
                const propertyAsNumber = +property
                const propertyPath = isNaN(propertyAsNumber) ? property : propertyAsNumber
                return buildPropertyAccess<any, any>([...path, propertyPath], getSubschema(propertyPath, s))
            },
        }) as any as PropertyAccessorBuilder<D, V, PATH>
        return propertyAccessorBuilder
    }
    return buildPropertyAccess<D, []>([], s)
}
