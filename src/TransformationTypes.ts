import { SchemaBuilder } from "./SchemaBuilder.js"

/**
 * Shortcut for Record<string, unknown> that is commonly used with schemas
 */
export type SimpleObject = Record<string, unknown>

/**
 * T & U but where overlapping properties use the type from U only.
 */
export type Overwrite<T, U> = Omit<T, Extract<keyof T, keyof U>> & U

/**
 * Like `T & U`, but where there are overlapping properties use the
 * type from T[P] | U[P].
 */
export type Merge<T, U> = Omit<T, Extract<keyof T, keyof U>> & Omit<U, Extract<keyof U, keyof T>> & { [P in keyof (T | U)]: T[P] | U[P] }

/**
 * Type modifier that makes all properties optionals deeply
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends Array<infer U>
        ? Array<DeepPartial<U>>
        : T[P] extends ReadonlyArray<infer U>
          ? ReadonlyArray<DeepPartial<U>>
          : T[P] extends object
            ? { [P2 in keyof DeepPartial<T[P]>]: DeepPartial<T[P]>[P2] }
            : T[P]
}

/**
 * Make all properties of T required.
 */
export type Required<T> = {
    [P in keyof T]-?: T[P]
}

/**
 * T with properties K optionals
 */
export type PartialProperties<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>

/**
 * T with properties K required
 */
export type RequiredProperties<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>

/**
 * T with property K renamed to K2. Optional is detected with conditional type.
 * Note : {} extends {K?: any} is true whereas {} extends {K: any} is false
 */
export type Rename<T, K extends keyof T, K2 extends keyof any> = {} extends Pick<T, K> ? RenameOptional<T, K, K2> : RenameRequired<T, K, K2>

/**
 * T with property K renamed to K2 with required modifier
 */
export type RenameRequired<T, K extends keyof T, K2 extends keyof any> = Omit<T, K> & { [P in K2]: T[K] }

/**
 * T with property K renamed to K2 and optional modifier
 */
export type RenameOptional<T, K extends keyof T, K2 extends keyof any> = Omit<T, K> & { [P in K2]?: T[K] }

/**
 * T with properties K Transformed to U | T[K]
 */
export type TransformProperties<T, K extends keyof T, U> = Omit<T, K> & { [P in K]: T[P] | U }

/**
 * T with properties K Transformed to T[P] | T[P][] only if T[P] is not already an Array
 */
export type TransformPropertiesToArray<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] extends any[] ? T[P] : T[P] | NonNullable<T[P]>[] }

/**
 * T with properties K Transformed to A | T[P] only if T[P] is A[]
 */
export type UnwrapArrayProperties<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] extends Array<infer A> ? A | T[P] : T[P] }

/**
 * Combine T with properties K of type U
 */
export type Combine<T, U, K extends keyof any, R extends boolean, N extends boolean> = R extends true
    ? N extends true
        ? T & { [P in K]: U | null }
        : T & { [P in K]: U }
    : N extends true
      ? T & { [P in K]?: U | null }
      : T & { [P in K]?: U }

/**
 * Make all optional properties of T nullable.
 */
export type Nullable<T> = {
    [P in keyof T]: undefined extends T[P] ? T[P] | null : T[P]
}

/**
 * Get the type of the inner properties passed in T
 * and force a mapped type iteration
 * It allows the type to workaround circular refs limitations
 */
export type ForcedUnwrapProperties<T> = { [P in keyof T]: T[P] }[keyof T]
/**
 * Transform an array in the resulting OneOf but wrapping it in an object
 * It allows the type to workaround circular refs limitations
 */
export type ArrayToOneOfObject<T> = T extends [...infer R] ? { t: OneOf<R> } : any

/**
 * Type that transform a list of SchemaBuilders in the following manner
 * [SchemaBuilder<T1>, SchemaBuilder<T2>, ...] => T1 | T2 | ...
 */
export type OneOf<T> = T extends [SchemaBuilder<any>, SchemaBuilder<any>, ...any]
    ? T extends [SchemaBuilder<infer S>, ...infer R]
        ? S | ForcedUnwrapProperties<ArrayToOneOfObject<R>>
        : any
    : T extends [SchemaBuilder<infer S>]
      ? S
      : any

/**
 * Transform an array in the resulting AllOf but wrapping it in an object
 * It allows the type to workaround circular refs limitations
 */
export type ArrayToAllOfObject<T> = T extends [...infer R] ? { t: AllOf<R> } : any

/**
 * Type that transforms a list of SchemaBuilders into the tuple of their underlying types.
 * [SchemaBuilder<T1>, SchemaBuilder<T2>, ...] => [T1, T2, ...]
 */
export type TupleOf<S extends readonly SchemaBuilder<any>[]> = {
    -readonly [K in keyof S]: S[K] extends SchemaBuilder<infer U> ? U : never
}

/**
 * Tuple type for a fixed prefix optionally followed by a rest element.
 * If `R` is `never`, the resulting tuple is closed. Otherwise an `...R[]` rest is appended.
 */
export type TupleOfWithRest<S extends readonly SchemaBuilder<any>[], R> = [R] extends [never] ? TupleOf<S> : [...TupleOf<S>, ...R[]]

/**
 * Type that transform a list of SchemaBuilders in the following manner
 * [SchemaBuilder<T1>, SchemaBuilder<T2>, ...] => T1 & T2 & ...
 */
export type AllOf<T> = T extends [SchemaBuilder<any>, SchemaBuilder<any>, ...any]
    ? T extends [SchemaBuilder<infer S>, ...infer R]
        ? S & ForcedUnwrapProperties<ArrayToAllOfObject<R>>
        : any
    : T extends [SchemaBuilder<infer S>]
      ? S
      : any

/**
 * Type that extract the required properties names from an object
 * @see https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-414808995
 */
export type RequiredKnownKeys<T> = {
    [K in keyof T]: {} extends Pick<T, K> ? never : K
} extends { [_ in keyof T]: infer U }
    ? {} extends U
        ? never
        : U
    : never

/**
 * Type that extract the optional properties names from an object
 * @see https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-414808995
 */
export type OptionalKnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : {} extends Pick<T, K> ? K : never
} extends { [_ in keyof T]: infer U }
    ? {} extends U
        ? never
        : U
    : never

/**
 * Type that extract all the keys from an object without the index signature
 * @see https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-414808995
 */
export type KnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U }
    ? U
    : never

/**
 * Similar to keyof T but only keep string properties
 */
export type StringKeys<T> = Extract<keyof T, string>

/**
 * Extract the string keys of T where the value match the type C
 */
export type KeysOfType<T, C> = { [P in StringKeys<T>]: T[P] extends C ? P : never }[StringKeys<T>]

/**
 * Force typescript to expand the given type
 */
export type Expand<T> = T extends object ? { [P in keyof T]: T[P] } : T

/**
 * Merge two object types together deeply
 */
export type DeepMerge<T1, T2> = Omit<T1, Extract<keyof T1, keyof T2>> &
    Omit<T2, Extract<keyof T2, keyof T1>> & {
        [P in keyof T1 & keyof T2]: T1[P] extends object ? { [P2 in keyof DeepMerge<T1[P], T2[P]>]: DeepMerge<T1[P], T2[P]>[P2] } : T1[P]
    }

/**
 * Experimental type to evaluate a const PATH of T (as given by property accessor) and replace its target by the type U
 * @experimental
 */
export type PathReplace<PATH extends unknown[], T, U> = PATH extends [infer PATH_ELEMENT, ...infer REST]
    ? T extends any[]
        ? PathReplace<REST, T[number], U>[]
        : PATH_ELEMENT extends keyof T
          ? Expand<Omit<T, Extract<keyof T, PATH_ELEMENT>> & { [P in PATH_ELEMENT]: PathReplace<REST, T[P], U> }>
          : never
    : U

/**
 * Map an object type `T` back to the property-definition map shape accepted by
 * `SchemaBuilder.objectSchema` / `SchemaBuilder.addProperties`.
 *
 * It is the inverse of `ObjectSchemaDefinition`: required properties map to a single
 * `SchemaBuilder`, optional properties to a `[SchemaBuilder, undefined]` tuple (the marker
 * used to detect optionality). This is the type of the `objectProperties` getter, so that
 * `SB.objectSchema({}, { ...aSchema.objectProperties })` round-trips `T`.
 *
 * When `T` has no object member (a primitive or array schema), it resolves to the empty map `{}` —
 * `objectProperties` is safe to call on any schema and simply yields no properties to spread.
 */
export type PropertiesOf<T> = IsAny<T> extends true
    ? any
    : [ObjectMember<T>] extends [never]
      ? // Not an object schema (e.g. a string, number or array schema): no properties to extract.
        {}
      : string extends keyof ObjectMember<T>
        ? // `T` has a string index signature (a record / `additionalProperties` result): a precise
          // per-key mapping is meaningless, so fall back to the loose `objectSchema`-input type. This
          // also keeps the mapping `T`-independent for such types, so it does not perturb the structural
          // identity of `SchemaBuilder` (which `PropertyAccessor` relies on for its recursive types).
          { [k: string]: SchemaBuilder<any> | [SchemaBuilder<any>, undefined] }
        : MergedObjectProperties<ObjectMember<T>>

/**
 * The object (non-array) members of a possibly-union `T`. Primitives and arrays/tuples are dropped, so
 * `string | { a: number }` keeps only `{ a: number }`, and a primitive or array `T` resolves to `never`.
 */
export type ObjectMember<T> = T extends readonly any[] ? never : T extends object ? T : never

/**
 * Backs {@link PropertiesOf} once `O` has been reduced to the object members of the schema type.
 *
 * It maps over a *computed* key set (`UnionKeys<O>`, not `keyof O`) so the mapped type is non-homomorphic
 * and does not distribute over a union `O` (e.g. a top-level `oneOf` yielding `A | B`). Each property's
 * type is collected across every member, mirroring the runtime which merges branch properties into a
 * single `oneOf` (so `string` + `number` -> `string | number`).
 *
 * A property is emitted as **optional** (the `[SchemaBuilder, undefined]` tuple) when it is absent from
 * some member (`K` not in `keyof O`, which for a union is the keys common to *all* members) or when its
 * merged value type already admits `undefined`. This matches the runtime, where a property contributed by
 * only some `oneOf`/`anyOf` branches is not guaranteed to be present.
 */
export type MergedObjectProperties<O> = {
    [K in UnionKeys<O>]-?: K extends keyof O
        ? undefined extends UnionValueAt<O, K>
            ? [SchemaBuilder<Exclude<UnionValueAt<O, K>, undefined>>, undefined]
            : SchemaBuilder<UnionValueAt<O, K>>
        : [SchemaBuilder<Exclude<UnionValueAt<O, K>, undefined>>, undefined]
}

/**
 * All property keys appearing in any member of a (possibly union) `T`. Distributes over `T` so a
 * union contributes the keys of every branch.
 */
export type UnionKeys<T> = T extends unknown ? keyof T : never

/**
 * The type of property `K` collected across every member of a (possibly union) `T`. A key present in
 * several branches yields the union of its per-branch types; a key absent from a branch contributes
 * nothing for that branch.
 */
export type UnionValueAt<T, K extends PropertyKey> = T extends unknown ? (K extends keyof T ? T[K] : never) : never

/**
 * Resolve to `true` only when `T` is `any`. Used to keep `any`-typed builders structurally
 * compatible (a mapped type over `any` would otherwise collapse to an index-signature object
 * rather than `any`).
 */
export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Transform a map of SchemaBuilders into it's corresponding model type
 * You can wrap a schema with brackets to declare the property is optional
 * @example: {
 *   s: SB.stringSchema(),
 *   b: [SB.booleanSchema()]
 * }
 * => outputs type {
 *   s: string,
 *   b?: boolean
 * }
 */
export type ObjectSchemaDefinition<T extends { [k: string]: SchemaBuilder<any> | (SchemaBuilder<any> | undefined)[] }> =
    // force the sort order of properties to be the same as the one defined in the source object
    Partial<Record<keyof T, unknown>> &
        // compute required and optional properties
        ({ [K in keyof T as T[K] extends SchemaBuilder<any> ? K : never]: T[K] extends SchemaBuilder<infer U> ? U : never } & {
            [K in keyof T as T[K] extends Array<infer I> ? (undefined extends I ? K : never) : never]?: T[K] extends Array<SchemaBuilder<infer U> | undefined>
                ? U
                : never
        } & {
            [K in keyof T as T[K] extends Array<infer I> ? (undefined extends I ? never : K) : never]: T[K] extends Array<SchemaBuilder<infer U>> ? U : never
        }) extends infer O
        ? { [K in keyof O]: O[K] } // force re-indexing the properties to avoid the '&'
        : never
