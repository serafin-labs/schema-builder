export type JSONSchemaTypeName = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null"
export type JSONSchemaValue = JSONSchemaValueArray[] | boolean | number | null | object | string
export interface JSONSchemaValueArray extends Array<JSONSchemaValue> {}

export interface JSONSchema {
    $id?: string
    $ref?: string
    $schema?: string
    $defs?: {
        [key: string]: JSONSchema | boolean
    }

    type?: JSONSchemaTypeName | JSONSchemaTypeName[]
    enum?: JSONSchemaValue[]
    const?: JSONSchemaValue

    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: number
    minimum?: number
    exclusiveMinimum?: number

    maxLength?: number
    minLength?: number
    pattern?: string

    prefixItems?: (JSONSchema | boolean)[]
    items?: JSONSchema | boolean
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    contains?: JSONSchema | boolean
    maxContains?: number
    minContains?: number

    maxProperties?: number
    minProperties?: number
    required?: string[]
    properties?: {
        [key: string]: JSONSchema | boolean
    }
    patternProperties?: {
        [key: string]: JSONSchema | boolean
    }
    additionalProperties?: JSONSchema | boolean
    dependentRequired?: {
        [key: string]: string[]
    }
    dependentSchemas?: {
        [key: string]: JSONSchema | boolean
    }
    propertyNames?: JSONSchema | boolean

    if?: JSONSchema | boolean
    then?: JSONSchema | boolean
    else?: JSONSchema | boolean

    allOf?: (JSONSchema | boolean)[]
    anyOf?: (JSONSchema | boolean)[]
    oneOf?: (JSONSchema | boolean)[]
    not?: JSONSchema | boolean

    unevaluatedItems?: JSONSchema | boolean
    unevaluatedProperties?: JSONSchema | boolean

    format?: string

    contentMediaType?: string
    contentEncoding?: string
    contentSchema?: JSONSchema | boolean

    title?: string
    description?: string
    default?: JSONSchemaValue
    readOnly?: boolean
    writeOnly?: boolean
    examples?: JSONSchemaValue
}
