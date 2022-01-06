import { SchemaBuilder } from "./SchemaBuilder"

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
        : DeepPartial<T[P]>
}

/**
 * Make all properties of T required and non-nullable.
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
export type TransformPropertiesToArray<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] extends any[] ? T[P] : T[P] | T[P][] }

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
