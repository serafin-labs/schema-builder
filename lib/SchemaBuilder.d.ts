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
    setOptionalProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{
        [x: string]: (Partial<Pick<T, K>> & Pick<T, ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]>)[string];
    }>;
    setRequiredProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{
        [x: string]: (Required<Pick<T, K>> & Pick<T, ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]>)[string];
    }>;
    toOptionals(): SchemaBuilder<Partial<T>>;
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
    addObject<U extends {}, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]: {
                [P in keyof U]: U[P];
            };
        })]: (T & {
            [P in K]: {
                [P in keyof U]: U[P];
            };
        })[P];
    }>;
    addOptionalObject<U extends {}, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: {
                [P in keyof U]: U[P];
            };
        })]: (T & {
            [P in K]?: {
                [P in keyof U]: U[P];
            };
        })[P];
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
            [P in K]: {
                [P in keyof U]: U[P];
            }[];
        })]: (T & {
            [P in K]: {
                [P in keyof U]: U[P];
            }[];
        })[P];
    }>;
    addOptionalArray<U extends {}, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema?: Pick<JSONSchema, JSONSchemaArrayProperties>): SchemaBuilder<{
        [P in keyof (T & {
            [P in K]?: {
                [P in keyof U]: U[P];
            }[];
        })]: (T & {
            [P in K]?: {
                [P in keyof U]: U[P];
            }[];
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
    renameProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<{
        [x: string]: (Pick<T, ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]> & {
            [P in K2]: T[K];
        })[string];
    }>;
    renameOptionalProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<{
        [x: string]: (Pick<T, ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]> & {
            [P in K2]?: T[K];
        })[string];
    }>;
    pickProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{
        [P in K]: T[P];
    }>;
    pickAdditionalProperties<K extends keyof T, K2 extends keyof T = null>(properties: K[], additionalProperties?: K2[]): SchemaBuilder<{}>;
    omitProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{
        [P in ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]]: Pick<T, ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]>[P];
    }>;
    transformProperties<U, K extends keyof T, K2 extends keyof T>(schemaBuilder: SchemaBuilder<U>, propertyNames?: K[]): SchemaBuilder<{
        [x: string]: (Pick<T, ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]> & {
            [P in K]: U | T[P];
        })[string];
    }>;
    transformPropertiesToArray<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<{
        [x: string]: (Pick<T, ({
            [P in keyof T]: P;
        } & {
            [P in K]: never;
        } & {
            [x: string]: never;
        })[keyof T]> & {
            [P in K]: T[P] | T[P][];
        })[string];
    }>;
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{
        [x: string]: Merge<T, T2>[string];
    }>;
    overwriteProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{
        [P in keyof Overwrite<T, T2>]: Overwrite<T, T2>[P];
    }>;
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
