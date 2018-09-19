export type JSONSchemaTypeName = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
export type JSONSchemaValue = JSONSchemaValueArray[] | boolean | number | null | object | string;
export interface JSONSchemaValueArray extends Array<JSONSchemaValue> { }

export interface JSONSchema {
    $id?: string;
    $ref?: string;
    $schema?: string;

    type?: JSONSchemaTypeName | JSONSchemaTypeName[];
    enum?: JSONSchemaValue[];
    const?: JSONSchemaValue;

    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;

    maxLength?: number;
    minLength?: number;
    pattern?: string;

    items?: (JSONSchema | boolean) | (JSONSchema | boolean)[];
    additionalItems?: (JSONSchema | boolean);
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    contains?: (JSONSchema | boolean);

    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    properties?: {
        [key: string]: (JSONSchema | boolean);
    };
    patternProperties?: {
        [key: string]: (JSONSchema | boolean);
    };
    additionalProperties?: (JSONSchema | boolean);
    dependencies?: {
        [key: string]: (JSONSchema | boolean) | string[];
    };
    propertyNames?: (JSONSchema | boolean);

    if?: (JSONSchema | boolean);
    then?: (JSONSchema | boolean);
    else?: (JSONSchema | boolean);

    allOf?: (JSONSchema | boolean)[];
    anyOf?: (JSONSchema | boolean)[];
    oneOf?: (JSONSchema | boolean)[];
    not?: (JSONSchema | boolean);

    format?: string;

    contentMediaType?: string;
    contentEncoding?: string;

    title?: string;
    description?: string;
    default?: JSONSchemaValue;
    readOnly?: boolean;
    writeOnly?: boolean;
    examples?: JSONSchemaValue;
}