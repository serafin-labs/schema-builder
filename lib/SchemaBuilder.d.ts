import { JSONSchema } from "@serafin/open-api";
export declare class SchemaBuilder<T> {
    protected schemaObject: JSONSchema;
    readonly schema: JSONSchema;
    constructor(schemaObject: JSONSchema);
    static dereferencedSchema<T>(schema: JSONSchema | string): Promise<SchemaBuilder<T>>;
    static emptySchema(schema?: Pick<JSONSchema, JSONSchemaObjectProperties>): SchemaBuilder<{}>;
    static stringSchema(schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<string>;
    static numberSchema(schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<number>;
    static integerSchema(schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<number>;
    static booleanSchema(schema?: Pick<JSONSchema, JSONSchemaProperties>): SchemaBuilder<boolean>;
    static enumSchema<K extends keyof any>(values: K[], schema?: Pick<JSONSchema, JSONSchemaProperties>): SchemaBuilder<K>;
    static arraySchema<U>(items: SchemaBuilder<U>, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<U[]>;
    static oneOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>): SchemaBuilder<T1 | T2>;
    static allOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>): SchemaBuilder<T1 & T2>;
    static anyOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>): SchemaBuilder<T1 | T2 | (T1 & T2)>;
    static not(schemaBuilder: SchemaBuilder<any>): SchemaBuilder<any>;
    setOptionalProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Partial<Pick<T, K>> & Omit<T, K>>;
    setRequiredProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Required<Pick<T, K>> & Omit<T, K>>;
    toOptionals(): SchemaBuilder<Partial<T>>;
    toDeepOptionals(): SchemaBuilder<DeepPartial<T>>;
    addProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<T & {
        [P in K]: U;
    }>;
    addOptionalProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<T & {
        [P in K]?: U;
    }>;
    addAdditionalProperties<U>(schemaBuilder: SchemaBuilder<U>): SchemaBuilder<T & {
        [P: string]: U;
    }>;
    addString<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<T & {
        [P in K]: string;
    }>;
    addOptionalString<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<T & {
        [P in K]?: string;
    }>;
    addEnum<K extends keyof any, K2 extends keyof any>(propertyName: K, values: K2[], schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<T & {
        [P in K]: K2;
    }>;
    addOptionalEnum<K extends keyof any, K2 extends keyof any>(propertyName: K, values: K2[], schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<T & {
        [P in K]?: K2;
    }>;
    addNumber<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<T & {
        [P in K]: number;
    }>;
    addOptionalNumber<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<T & {
        [P in K]?: number;
    }>;
    addInteger<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<T & {
        [P in K]: number;
    }>;
    addOptionalInteger<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<T & {
        [P in K]?: number;
    }>;
    addBoolean<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaProperties>): SchemaBuilder<T & {
        [P in K]: boolean;
    }>;
    addOptionalBoolean<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaProperties>): SchemaBuilder<T & {
        [P in K]?: boolean;
    }>;
    addArray<U, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<T & {
        [P in K]: U[];
    }>;
    addOptionalArray<U, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<T & {
        [P in K]?: U[];
    }>;
    addStringArray<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<T & {
        [P in K]: string[];
    }>;
    addOptionalStringArray<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<T & {
        [P in K]?: string[];
    }>;
    renameProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<Omit<T, K> & {
        [P in K2]: T[K];
    }>;
    renameOptionalProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<Omit<T, K> & {
        [P in K2]?: T[K];
    }>;
    pickProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Pick<T, K>>;
    pickPropertiesIncludingAdditonalProperties<K extends keyof T, K2 extends keyof T>(properties: K[]): SchemaBuilder<Pick<T, K> & {
        [P in K2]: T[P];
    }>;
    omitProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Omit<T, K>>;
    transformProperties<U, K extends keyof T, K2 extends keyof T>(schemaBuilder: SchemaBuilder<U>, propertyNames?: K[]): SchemaBuilder<Omit<T, K> & {
        [P in K]: (T[P] | U);
    }>;
    transformPropertiesToArray<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<Omit<T, K> & {
        [P in K]: (T[P] | T[P][]);
    }>;
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Merge<T, T2>>;
    flatType(): SchemaBuilder<{
        [P in keyof T]: T[P];
    }>;
    readonly isSchemaSealed: boolean;
    readonly isSimpleObjectSchema: boolean;
    clone(): this;
    validate(o: T): void;
    protected ajv: any;
    protected validationFunction: any;
    validateList(list: T[]): void;
    protected ajvList: any;
    protected listValidationFunction: any;
}
export declare type Diff<T extends string, U extends string> = ({
    [P in T]: P;
} & {
    [P in U]: never;
} & {
    [x: string]: never;
})[T];
export declare type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;
export declare type Overwrite<T, U> = Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & U;
export declare type Merge<T, U> = Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & Omit<U, Diff<keyof U, Diff<keyof U, keyof T>>> & {
    [P in keyof (T | U)]: (T[P] | U[P]);
};
export declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export declare type Required<T> = {
    [P in {
        [P in keyof T]: keyof T;
    }[keyof T]]: T[P];
};
export declare type JSONSchemaArrayProperties = "description" | "default" | "maxItems" | "minItems" | "uniqueItems" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaStringProperties = "description" | "default" | "maxLength" | "minLength" | "pattern" | "format" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaNumberProperties = "description" | "default" | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaProperties = "description" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaObjectProperties = "title" | "description" | "maxProperties" | "minProperties" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";
