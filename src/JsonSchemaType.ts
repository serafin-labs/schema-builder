/**
 * This file contains a set of special conditional types used to transform a litteral JSON schema into the corresponding typescript type.
 */

// Constant string literals that helps defining inline json shemas
export const STRING_TYPE = "string" as "string"
export const INTEGER_TYPE = "integer" as "integer"
export const NUMBER_TYPE = "number" as "number"
export const BOOLEAN_TYPE = "boolean" as "boolean"
export const NULL_TYPE = "null" as "null"
export const OBJECT_TYPE = "object" as "object"
export const ARRAY_TYPE = "array" as "array"
export const keys = <K extends keyof any>(v: K[]): K[] => v

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
 * Types for a oneOf list
 */
export type JsonSchemaOneOfType<T> = { [P in keyof T]: T[P] extends { type: string } | { oneOf: any } | { allOf: any } | { anyOf: any } | { not: any } ? JsonSchemaType<T[P]> : never }[keyof T];

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
    R extends Array<infer KR> ?
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
 * Type for json schema primitive types
 */
export type JsonSchemaPrimitiveType<TYPE, ITEM, PROPERTIES, REQUIRED, AP> =
    TYPE extends "integer" | "number" | "boolean" | "null" | "string" ? JsonSchemaSimpleTypes<TYPE> :
    TYPE extends "object" ? JsonSchemaObjectType<PROPERTIES, REQUIRED, AP> :
    TYPE extends "array" ? ITEM extends Array<infer ITEMS> ? JsonSchemaArray<ITEMS> : JsonSchemaArray<ITEM> : never

/**
 * Deduce the type that represents a JSON Schema from the Schema itself.
 * allOf is not supported and will resolve to any
 */
export type JsonSchemaType<T> =
    T extends { type?: infer TYPE, oneOf?: infer ONE_OF, anyOf?: infer ANY_OF, items?: infer ITEM, properties?: infer PROPERTIES, required?: infer REQUIRED, additionalProperties?: infer AP, enum?: infer ENUM, const?: infer CONST } ?
    ONE_OF extends any[] ? JsonSchemaOneOfType<ONE_OF> :
    ANY_OF extends any[] ? JsonSchemaOneOfType<ANY_OF> :
    ENUM extends Array<infer ENUM_VALUE> ? ENUM_VALUE :
    {} extends CONST ?
    TYPE extends string ? JsonSchemaPrimitiveType<TYPE, ITEM, PROPERTIES, REQUIRED, AP> :
    TYPE extends Array<infer TYPES> ? JsonSchemaPrimitiveType<TYPES, ITEM, PROPERTIES, REQUIRED, AP> :
    any :
    CONST :
    never;