import { JSONSchema } from "@serafin/open-api";
export declare type Resolve<T> = {
    [P in keyof T]: T[P];
};
export declare type Diff<T extends string, U extends string> = ({
    [P in T]: P;
} & {
    [P in U]: never;
} & {
    [x: string]: never;
})[T];
export declare type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;
export declare type Overwrite<T, U> = Resolve<Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & U>;
export declare type Merge<T, U> = Resolve<Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & Omit<U, Diff<keyof U, Diff<keyof U, keyof T>>> & {
    [P in keyof (T | U)]: (T[P] | U[P]);
}>;
export declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export declare type Required<T> = {
    [P in {
        [P in keyof T]: keyof T;
    }[keyof T]]: T[P];
};
export declare type PartialProperties<T, K extends keyof T> = Resolve<Partial<Pick<T, K>> & Omit<T, K>>;
export declare type RequiredProperties<T, K extends keyof T> = Resolve<Required<Pick<T, K>> & Omit<T, K>>;
export declare type Rename<T, K extends keyof T, K2 extends keyof any> = Resolve<Omit<T, K> & {
    [P in K2]: T[K];
}>;
export declare type RenameOptional<T, K extends keyof T, K2 extends keyof any> = Resolve<Omit<T, K> & {
    [P in K2]?: T[K];
}>;
export declare type Transform<T, K extends keyof T, U> = Resolve<Omit<T, K> & {
    [P in K]: (T[P] | U);
}>;
export declare type TransformToArray<T, K extends keyof T> = Resolve<Omit<T, K> & {
    [P in K]: (T[P] | T[P][]);
}>;
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
    setOptionalProperties<K extends keyof T>(properties: K[]): SchemaBuilder<PartialProperties<T, K>>;
    setRequiredProperties<K extends keyof T>(properties: K[]): SchemaBuilder<RequiredProperties<T, K>>;
    toOptionals(): SchemaBuilder<{
        [P in keyof T]?: T[P];
    }>;
    toDeepOptionals(): SchemaBuilder<DeepPartial<T>>;
    addProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: U;
        })]: (T & {
            [P in K]: U;
        })[P];
    }>;
    addOptionalProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: U;
        })]: (T & {
            [P in K]?: U;
        })[P];
    }>;
    addAdditionalProperties<U = any>(schemaBuilder?: SchemaBuilder<U>): SchemaBuilder<T & {
        [P: string]: U;
    }>;
    addString<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: string;
        })]: (T & {
            [P in K]: string;
        })[P];
    }>;
    addOptionalString<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: string;
        })]: (T & {
            [P in K]?: string;
        })[P];
    }>;
    addEnum<K extends keyof any, K2 extends keyof any>(propertyName: K, values: K2[], schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: K2;
        })]: (T & {
            [P in K]: K2;
        })[P];
    }>;
    addOptionalEnum<K extends keyof any, K2 extends keyof any>(propertyName: K, values: K2[], schema?: Pick<JSONSchema, JSONSchemaStringProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: K2;
        })]: (T & {
            [P in K]?: K2;
        })[P];
    }>;
    addNumber<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: number;
        })]: (T & {
            [P in K]: number;
        })[P];
    }>;
    addOptionalNumber<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: number;
        })]: (T & {
            [P in K]?: number;
        })[P];
    }>;
    addInteger<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: number;
        })]: (T & {
            [P in K]: number;
        })[P];
    }>;
    addOptionalInteger<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaNumberProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: number;
        })]: (T & {
            [P in K]?: number;
        })[P];
    }>;
    addBoolean<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: boolean;
        })]: (T & {
            [P in K]: boolean;
        })[P];
    }>;
    addOptionalBoolean<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: boolean;
        })]: (T & {
            [P in K]?: boolean;
        })[P];
    }>;
    addArray<U extends {}, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: U[];
        })]: (T & {
            [P in K]: U[];
        })[P];
    }>;
    addOptionalArray<U extends {}, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: U[];
        })]: (T & {
            [P in K]?: U[];
        })[P];
    }>;
    addStringArray<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: string[];
        })]: (T & {
            [P in K]: string[];
        })[P];
    }>;
    addOptionalStringArray<K extends keyof any>(propertyName: K, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: string[];
        })]: (T & {
            [P in K]?: string[];
        })[P];
    }>;
    renameProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<Rename<T, K, K2>>;
    renameOptionalProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<RenameOptional<T, K, K2>>;
    pickProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{
        [P in K]: T[P];
    }>;
    pickAdditionalProperties<K extends keyof T, K2 extends keyof T = null>(properties: K[], additionalProperties?: K2[]): SchemaBuilder<Resolve<Pick<T, K> & {
        [P in K2]: T[P];
    }>>;
    omitProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Omit<T, K>>;
    transformProperties<U, K extends keyof T>(schemaBuilder: SchemaBuilder<U>, propertyNames?: K[]): SchemaBuilder<Transform<T, K, U>>;
    transformPropertiesToArray<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<TransformToArray<T, K>>;
    intersectProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Resolve<T & T2>>;
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Merge<T, T2>>;
    overwriteProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Overwrite<T, T2>>;
    readonly isSimpleObjectSchema: boolean;
    readonly isObjectSchema: boolean;
    readonly hasAditionalProperties: boolean;
    readonly hasSchemasCombinationKeywords: boolean;
    clone(schema?: Pick<JSONSchema, JSONSchemaObjectProperties>): this;
    validate(o: T): void;
    protected ajv: any;
    protected validationFunction: any;
    validateList(list: T[]): void;
    protected ajvList: any;
    protected listValidationFunction: any;
    readonly T?: T;
}
export declare type JSONSchemaArrayProperties = "description" | "default" | "maxItems" | "minItems" | "uniqueItems" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaStringProperties = "description" | "default" | "maxLength" | "minLength" | "pattern" | "format" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaNumberProperties = "description" | "default" | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaProperties = "description" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";
export declare type JSONSchemaObjectProperties = "title" | "description" | "maxProperties" | "minProperties" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";
