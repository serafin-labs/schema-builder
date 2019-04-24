/**
 * This file contains a set of special conditional types used to transform a litteral JSON schema into the corresponding typescript type.
 */

/**
 * Type used to detect simple JSON Schema types integer, boolean, null, string, enum
 */
export type JsonSchemaSimpleTypes<TYPE> =
    TYPE extends "integer" | "number" ? number :
    TYPE extends "boolean" ? boolean :
    TYPE extends "null" ? null :
    TYPE extends "string" ? string :
    never;

/**
 * Extract the type of an array in an object type { t: T }
 */
export type ArrayToTypeObject<T> = T extends ReadonlyArray<infer T> ? { t: T } : never

/**
 * Transform all properties of a type T to JsonSchemaType and finally unwrap those properties
 */
export type UnwrapPropsToJsonSchemaType<T> = { [P in keyof T]: JsonSchemaType<T[P]> }[keyof T]

/**
 * Type for a oneOf list, anyOf list, items list
 */
export type ArrayOfJsonSchemasType<T> = UnwrapPropsToJsonSchemaType<ArrayToTypeObject<T>>;

/**
 * Type of a json object
 */
export type JsonSchemaObjectType<PROPERTIES, REQUIRED, AP> =
    AP extends false ? JsonSchemaProperties<PROPERTIES, REQUIRED> :
    AP extends true ? JsonSchemaProperties<PROPERTIES, REQUIRED> & { [k: string]: any } :
    {} extends AP ? JsonSchemaProperties<PROPERTIES, REQUIRED> & { [k: string]: any } :
    JsonSchemaProperties<PROPERTIES, REQUIRED> & JsonSchemaAdditionalProperties<AP>;

/**
 * Type of properties map for an 'object' type
 */
export type JsonSchemaProperties<T, R> =
    R extends ReadonlyArray<infer KR> ?
    [KR] extends [keyof T] ? { [P in KR]: JsonSchemaType<T[P]> } & { [P in Exclude<keyof T, KR>]?: JsonSchemaType<T[P]> } :
    never /* A required property does not exist */ :
    { [P in keyof T]?: JsonSchemaType<T[P]> } /* No required properties */;

/**
 * Intermediate interface used to avoid circular references for arrays
 */
export interface JsonSchemaArray<T> extends Array<JsonSchemaType<T>> { }

/**
 * Intermediate interface used to avoid circular references for additional properties
 */
export interface JsonSchemaAdditionalProperties<T> {
    [k: string]: JsonSchemaType<T>
}

/**
 * Type for json schema primitive types but without array (see JsonSchemaTypeWithoutArray)
 */
export type JsonSchemaPrimitiveTypeWithoutArray<TYPE, PROPERTIES, REQUIRED, AP> =
    TYPE extends "integer" | "number" | "boolean" | "null" | "string" ? JsonSchemaSimpleTypes<TYPE> :
    TYPE extends "object" ? JsonSchemaObjectType<PROPERTIES, REQUIRED, AP> :
    never

/**
 * Type for json schema primitive types
 */
export type JsonSchemaPrimitiveType<TYPE, ITEM, PROPERTIES, REQUIRED, AP> =
    TYPE extends "integer" | "number" | "boolean" | "null" | "string" ? JsonSchemaSimpleTypes<TYPE> :
    TYPE extends "object" ? JsonSchemaObjectType<PROPERTIES, REQUIRED, AP> :
    TYPE extends "array" ? ITEM extends ReadonlyArray<any> ? ArrayOfJsonSchemasType<ITEM>[] :
    ITEM extends { type: "array" } ? JsonSchemaArray<ITEM> :
    JsonSchemaTypeWithoutArray<ITEM>[] :
    never

/**
 * Same thing JsonSchemaType but without taking type: "array" into account. This is a workaround to avoid using JsonSchemaArray interface as much as possible. It makes the type more readable.
 */
export type JsonSchemaTypeWithoutArray<T> =
    T extends { type?: infer TYPE, oneOf?: infer ONE_OF, anyOf?: infer ANY_OF, allOf?: infer ALL_OF, properties?: infer PROPERTIES, required?: infer REQUIRED, additionalProperties?: infer AP, enum?: infer ENUM, const?: infer CONST } ?
    ONE_OF extends any[] ? ArrayOfJsonSchemasType<ONE_OF> :
    ANY_OF extends any[] ? ArrayOfJsonSchemasType<ANY_OF> :
    ALL_OF extends any[] ? any :
    ENUM extends ReadonlyArray<infer ENUM_VALUE> ? ENUM_VALUE :
    {} extends CONST ?
    TYPE extends string ? JsonSchemaPrimitiveTypeWithoutArray<TYPE, PROPERTIES, REQUIRED, AP> :
    TYPE extends ReadonlyArray<infer TYPES> ? JsonSchemaPrimitiveTypeWithoutArray<TYPES, PROPERTIES, REQUIRED, AP> :
    any :
    CONST :
    never;

/**
 * Deduce the type that represents a JSON Schema from the Schema itself.
 * allOf is not supported and will resolve to any
 */
export type JsonSchemaType<T> =
    T extends { type?: infer TYPE, oneOf?: infer ONE_OF, anyOf?: infer ANY_OF, allOf?: infer ALL_OF, items?: infer ITEM, properties?: infer PROPERTIES, required?: infer REQUIRED, additionalProperties?: infer AP, enum?: infer ENUM, const?: infer CONST } ?
    ONE_OF extends ReadonlyArray<any> ? ArrayOfJsonSchemasType<ONE_OF> :
    ANY_OF extends ReadonlyArray<any> ? ArrayOfJsonSchemasType<ANY_OF> :
    ALL_OF extends ReadonlyArray<any> ? any :
    ENUM extends ReadonlyArray<infer ENUM_VALUE> ? ENUM_VALUE :
    {} extends CONST ?
    TYPE extends string ? JsonSchemaPrimitiveType<TYPE, ITEM, PROPERTIES, REQUIRED, AP> :
    TYPE extends ReadonlyArray<infer TYPES> ? JsonSchemaPrimitiveType<TYPES, ITEM, PROPERTIES, REQUIRED, AP> :
    any :
    CONST :
    never;