import * as _ from "lodash"
import * as $RefParser from "json-schema-ref-parser"
import * as Ajv from 'ajv'
import * as VError from 'verror'

import { JSONSchema, metaSchema } from "@serafin/open-api"

/**
 * Resolve properties of T so it appears as a flat object instead of a composition
 */
export type Resolve<T> = { [P in keyof T]: T[P] }

/**
 * Remove the second union of string literals from the first.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/12215
 */
export type Diff<T extends string, U extends string> = (
    & { [P in T]: P }
    & { [P in U]: never }
    & { [x: string]: never }
)[T];

/**
 * Drop keys K from T.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/12215
 */
export type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

/**
 * T & U but where overlapping properties use the type from U only.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/12215
 */
export type Overwrite<T, U> = Resolve<Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & U>;

/**
 * Like `T & U`, but where there are overlapping properties use the
 * type from T[P] | U[P].
 * For overloapping properties, optional info is lost. The property becomes mandatory.
 */
export type Merge<T, U> = Resolve<Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & Omit<U, Diff<keyof U, Diff<keyof U, keyof T>>> & { [P in keyof (T | U)]: (T[P] | U[P]) }>;

/**
 * Type modifier that makes all properties optionals deeply
 */
export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
}

/**
 * Make all properties of T required and non-nullable.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/15012
 */
export type Required<T> = {
    [P in { [P in keyof T]: keyof T; }[keyof T]]: T[P];
};

/**
 * T with properties K optionals
 */
export type PartialProperties<T, K extends keyof T> = Resolve<Partial<Pick<T, K>> & Omit<T, K>>

/**
 * T with properties K required
 */
export type RequiredProperties<T, K extends keyof T> = Resolve<Required<Pick<T, K>> & Omit<T, K>>

/**
 * T with property K renamed to K2
 */
export type Rename<T, K extends keyof T, K2 extends keyof any> = Resolve<Omit<T, K> & { [P in K2]: T[K] }>

/**
 * T with property K renamed to K2 and optional
 */
export type RenameOptional<T, K extends keyof T, K2 extends keyof any> = Resolve<Omit<T, K> & { [P in K2]?: T[K] }>

/**
 * T with properties K Transformed to U | T[K]
 */
export type Transform<T, K extends keyof T, U> = Resolve<Omit<T, K> & { [P in K]: (T[P] | U) }>

/**
 * T with properties K Transformed to T[K] | T[K][]
 */
export type TransformToArray<T, K extends keyof T> = Resolve<Omit<T, K> & { [P in K]: (T[P] | T[P][]) }>


/**
 * Represents a JSON Schema and its type.
 */
export class SchemaBuilder<T> {
    /**
     * Get the JSON schema object
     */
    public get schema() {
        return this.schemaObject;
    }

    /**
     * Initialize a new SchemaBuilder instance.
     * /!\ schemaObject must not contain references. If you have references, use dereferencedSchema method instead.
     * @param schemaObject 
     */
    constructor(protected schemaObject: JSONSchema) {
        this.schemaObject = schemaObject;
        throughJsonSchema(this.schemaObject, s => {
            if ("$ref" in s) {
                throw new VError(`Schema Builder Error: $ref can't be used to initialize a SchemaBuilder. Use 'SchemaBuilder.dereferencedSchema' instead.`)
            }
        })
    }

    /**
     * Initialize a dereferenced version of the given schema. All references are resolved and included inline.
     * 
     * @param schema 
     */
    static async dereferencedSchema<T>(schema: JSONSchema | string) {
        let dereferencedSchema = await ($RefParser as any).dereference(schema);
        return new SchemaBuilder<T>(dereferencedSchema)
    }

    /**
     * Create an empty object schema
     */
    static emptySchema(schema: Pick<JSONSchema, JSONSchemaObjectProperties> = {}) {
        (schema as JSONSchema).type = "object";
        (schema as JSONSchema).additionalProperties = false;
        return new SchemaBuilder<{}>(schema)
    }

    /**
     * Create a simple string schema
     */
    static stringSchema(schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}) {
        (schema as JSONSchema).type = "string"
        return new SchemaBuilder<string>(schema)
    }

    /**
     * Create a simple number schema
     */
    static numberSchema(schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}) {
        (schema as JSONSchema).type = "number"
        return new SchemaBuilder<number>(schema)
    }

    /**
     * Create a simple integer schema
     */
    static integerSchema(schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}) {
        (schema as JSONSchema).type = "integer"
        return new SchemaBuilder<number>(schema)
    }

    /**
     * Create a simple boolean schema
     */
    static booleanSchema(schema: Pick<JSONSchema, JSONSchemaProperties> = {}) {
        (schema as JSONSchema).type = "boolean"
        return new SchemaBuilder<boolean>(schema)
    }

    /**
     * Create a simple enum schema
     */
    static enumSchema<K extends keyof any>(values: K[], schema: Pick<JSONSchema, JSONSchemaProperties> = {}) {
        (schema as JSONSchema).type = "string";
        (schema as JSONSchema).enum = values;
        return new SchemaBuilder<K>(schema)
    }

    /**
     * Create a simple array schema
     */
    static arraySchema<U>(items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        (schema as JSONSchema).type = "array";
        (schema as JSONSchema).items = items.schemaObject;
        return new SchemaBuilder<U[]>(schema)
    }

    /**
     * Return a schema builder which represents schemaBuilder1 or schemaBuilder2. "oneOf" as described by JSON Schema specifications.
     * 
     * @param schemaBuilder1 
     * @param schemaBuilder2 
     */
    static oneOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 | T2>({
            oneOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        })
    }

    /**
     * Return a schema builder which represents schemaBuilder1 and schemaBuilder2. "allOf" as described by JSON Schema specifications.
     * 
     * @param schemaBuilder1 
     * @param schemaBuilder2 
     */
    static allOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 & T2>({
            allOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        })
    }

    /**
     * Return a schema builder which represents schemaBuilder1 or schemaBuilder2 or schemaBuilder1 and schemaBuilder2. "anyOf" as described by JSON Schema specifications.
     * 
     * @param schemaBuilder1 
     * @param schemaBuilder2 
     */
    static anyOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 | T2 | (T1 & T2)>({
            anyOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        })
    }

    /**
     * Return a schema builder which represents the negation of the given schema. The only type we can assume is "any". "not" as described by JSON Schema specifications.
     * 
     * @param schemaBuilder
     */
    static not(schemaBuilder: SchemaBuilder<any>) {
        return new SchemaBuilder<any>({
            not: schemaBuilder.schemaObject
        })
    }

    /**
     * Make given properties optionals
     */
    setOptionalProperties<K extends keyof T>(properties: K[]): SchemaBuilder<PartialProperties<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'setOptionalProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let required = [];
        let existingRequired = this.schemaObject.required || []
        for (let property of existingRequired) {
            if ((properties as string[]).indexOf(property) === -1) {
                required.push(property)
            }
        }
        if (required.length === 0) {
            delete this.schemaObject.required
        } else {
            this.schemaObject.required = required
        }
        return this as any
    }

    /**
     * Make given properties required
     */
    setRequiredProperties<K extends keyof T>(properties: K[]): SchemaBuilder<RequiredProperties<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'setRequiredProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        for (let property of properties) {
            this.schemaObject.required = this.schemaObject.required || []
            if (this.schemaObject.required.indexOf(property) === -1) {
                this.schemaObject.required.push(property)
            }
        }
        return this as any
    }

    /**
     * Make all properties optionals
     */
    toOptionals(): SchemaBuilder<{
        [P in keyof T]?: T[P];
    }> {
        delete this.schemaObject.required
        return this as any
    }

    /**
     * Make all properties and subproperties optionals
     */
    toDeepOptionals(): SchemaBuilder<DeepPartial<T>> {
        throughJsonSchema(this.schemaObject, s => delete s.required)
        return this as any
    }

    /**
     * Add a property using the given schema builder
     * 
     * @param propertyName 
     * @param schemaBuilder 
     */
    addProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<{ [P in keyof (T & { [P in K]: U })]: (T & { [P in K]: U })[P] }> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only add properties to an object schema`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        if (propertyName in this.schemaObject.properties) {
            throw new VError(`Schema Builder Error: '${propertyName}' already exists in ${this.schemaObject.title || 'this'} schema`);
        }
        this.schemaObject.properties[propertyName] = schemaBuilder.schemaObject;
        this.schemaObject.required = this.schemaObject.required || [];
        this.schemaObject.required.push(propertyName)
        return this as any
    }

    /**
     * Add an optional property using the given schema builder
     * 
     * @param propertyName 
     * @param schemaBuilder 
     */
    addOptionalProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<{ [P in keyof (T & { [P in K]?: U })]: (T & { [P in K]?: U })[P] }> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only add properties to an object schema`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        if (propertyName in this.schemaObject.properties) {
            throw new VError(`Schema Builder Error: '${propertyName}' already exists in ${this.schemaObject.title || 'this'} schema`);
        }
        this.schemaObject.properties[propertyName] = schemaBuilder.schemaObject;
        return this as any
    }

    /**
     * Add additional properties schema.
     * /!\ Many type operations can't work properly with index signatures. Try to use additionalProperties at the last step of your SchemaBuilder definition.
     * /!\ In typescript index signature MUST be compatible with other properties. However its supported in JSON schema, you can use it but you have to force the index singature to any.
     * 
     * @param schemaBuilder 
     */
    addAdditionalProperties<U = any>(schemaBuilder?: SchemaBuilder<U>): SchemaBuilder<T & { [P: string]: U }> {
        if (this.schemaObject.additionalProperties) {
            throw new VError(`Schema Builder Error: additionalProperties is already set in ${this.schemaObject.title || 'this'} schema.`)
        }
        this.schemaObject.additionalProperties = schemaBuilder ? schemaBuilder.schemaObject : true
        return this as any
    }

    /**
     * Add a string to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addString<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.stringSchema(schema))
    }

    /**
     * Add a optional string to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addOptionalString<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.stringSchema(schema))
    }

    /**
     * Add a string enum to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addEnum<K extends keyof any, K2 extends keyof any>(propertyName: K, values: K2[], schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.enumSchema(values, schema))
    }

    /**
     * Add a optional string to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addOptionalEnum<K extends keyof any, K2 extends keyof any>(propertyName: K, values: K2[], schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.enumSchema(values, schema))
    }

    /**
     * Add a number to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addNumber<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.numberSchema(schema))
    }

    /**
     * Add an optional number to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addOptionalNumber<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.numberSchema(schema))
    }

    /**
     * Add a number to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addInteger<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.integerSchema(schema))
    }

    /**
     * Add an optional number to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addOptionalInteger<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.integerSchema(schema))
    }

    /**
     * Add a number to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addBoolean<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.booleanSchema(schema))
    }

    /**
     * Add an optional number to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addOptionalBoolean<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.booleanSchema(schema))
    }

    /**
     * Add an array of objects to the schema properties
     * 
     * @param propertyName 
     * @param items 
     * @param schema 
     */
    addArray<U extends {}, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.arraySchema(items, schema))
    }

    /**
     * Add an optional array of objects to the schema properties
     * 
     * @param propertyName 
     * @param items 
     * @param schema 
     */
    addOptionalArray<U extends {}, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.arraySchema(items, schema))
    }

    /**
     * Add an array of string to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addStringArray<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.arraySchema(SchemaBuilder.stringSchema(), schema))
    }

    /**
     * Add an optional array of string to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addOptionalStringArray<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.arraySchema(SchemaBuilder.stringSchema(), schema))
    }

    /**
     * Rename the given property. The property schema remains unchanged. The new property is required.
     * 
     * @param propertyName 
     * @param newPropertyName 
     */
    renameProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<Rename<T, K, K2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'renameProperty' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        if (propertyName in this.schemaObject.properties) {
            this.schemaObject.properties[newPropertyName] = this.schemaObject.properties[propertyName]
            delete this.schemaObject.properties[propertyName]
            if (this.schemaObject.required && this.schemaObject.required.indexOf(propertyName) !== -1) {
                this.schemaObject.required.splice(this.schemaObject.required.indexOf(propertyName), 1)
            }
            this.schemaObject.required = this.schemaObject.required || [];
            this.schemaObject.required.push(newPropertyName)
        }
        return this as any
    }

    /**
     * Rename the given property. The property schema remains unchanged. The new property is optional.
     * 
     * @param propertyName 
     * @param newPropertyName 
     */
    renameOptionalProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<RenameOptional<T, K, K2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'renameOptionalProperty' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        if (propertyName in this.schemaObject.properties) {
            this.schemaObject.properties[newPropertyName] = this.schemaObject.properties[propertyName]
            delete this.schemaObject.properties[propertyName]
            if (this.schemaObject.required && this.schemaObject.required.indexOf(propertyName) !== -1) {
                this.schemaObject.required.splice(this.schemaObject.required.indexOf(propertyName), 1)
                if (this.schemaObject.required.length === 0) {
                    delete this.schemaObject.required
                }
            }
        }
        return this as any
    }

    /**
     * Filter the schema to contains only the given properties. additionalProperties is set to false.
     * 
     * @param properties name of properties of T to keep in the result
     */
    pickProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{ [P in K]: T[P] }> {
        if (!this.isObjectSchema || this.hasSchemasCombinationKeywords) {
            throw new VError(`Schema Builder Error: 'pickProperties' can only be used with a simple object schema (no oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        let propertiesMap: any = {}
        for (let property of properties) {
            propertiesMap[property] = this.schemaObject.properties[property];
        }
        this.schemaObject.properties = propertiesMap;
        if (this.schemaObject.required) {
            this.schemaObject.required = this.schemaObject.required.filter((r) => (properties as string[]).indexOf(r) !== -1)
        }
        if (Array.isArray(this.schemaObject.required) && this.schemaObject.required.length === 0) {
            delete this.schemaObject.required
        }
        return this as any
    }


    /**
     * Filter the schema to contains only the given properties and keep additionalProperties or part of it
     * 
     * @param properties 
     * @param withAdditionalProperties null means no additonal properties are kept in the result. [] means additionalProperties is kept or set to true if it was not set to false. ['aProperty'] allows you to capture only specific names that conform to additionalProperties type.
     */
    pickAdditionalProperties<K extends keyof T, K2 extends keyof T = null>(properties: K[], additionalProperties: K2[] = null): SchemaBuilder<Resolve<Pick<T, K> & { [P in K2]: T[P] }>> {
        let additionalProps = this.schemaObject.additionalProperties;
        if (!this.isObjectSchema || !this.hasAditionalProperties || this.hasSchemasCombinationKeywords) {
            throw new VError(`Schema Builder Error: 'pickPropertiesIncludingAdditonalProperties' can only be used with a simple object schema with additionalProperties (no oneOf, anyOf, allOf or not)`);
        }
        this.pickProperties(properties);
        if (additionalProperties === null) {
            this.schemaObject.additionalProperties = false
        } else if (Array.isArray(additionalProperties) && additionalProperties.length === 0) {
            this.schemaObject.additionalProperties = additionalProps ? additionalProps : true;
        } else {
            for (let additionalProperty of additionalProperties) {
                this.addProperty(additionalProperty, typeof additionalProps === "boolean" ? new SchemaBuilder({}) : new SchemaBuilder(additionalProps))
            }
        }
        return this as any
    }

    /**
     * Filter the schema to contains everything except the given properties.
     */
    omitProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{ [P in keyof Omit<T, K>]: Omit<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'omitProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        let p = Object.keys(this.schemaObject.properties).filter(k => (properties as string[]).indexOf(k) === -1);
        this.pickProperties(p as any);
        return this as any
    }

    /**
     * Transform properties to accept an alternative type. additionalProperties is set false.
     * 
     * @param changedProperties properties that will have the alternative type
     * @param schemaBuilder 
     */
    transformProperties<U, K extends keyof T>(schemaBuilder: SchemaBuilder<U>, propertyNames?: K[]): SchemaBuilder<Transform<T, K, U>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'transformProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(this.schemaObject.properties) as any
        for (let property of propertyNames) {
            let propertySchema = this.schemaObject.properties[property];
            this.schemaObject.properties[property] = {
                oneOf: [propertySchema, schemaBuilder.schemaObject]
            }
        }
        return this as any
    }

    /**
     * Transform the given properties to make them alternatively an array of the initial type.
     * 
     * @param changedProperties properties that will have the alternative array type
     */
    transformPropertiesToArray<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<TransformToArray<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'transformPropertiesToArray' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(this.schemaObject.properties) as any
        for (let property of propertyNames) {
            let propertySchema = this.schemaObject.properties[property];
            this.schemaObject.properties[property] = {
                oneOf: [propertySchema, { type: "array", items: propertySchema }]
            }
        }
        return this as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a allOf statement is used.
     * This method only copy properties.
     * 
     * @param schema 
     */
    intersectProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Resolve<T & T2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'intersectProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        if (schema.schemaObject.properties) {
            this.schemaObject.properties = this.schemaObject.properties || {};
            for (let propertyKey in schema.schemaObject.properties) {
                if (!(propertyKey in this.schemaObject.properties)) {
                    this.schemaObject.properties[propertyKey] = schema.schemaObject.properties[propertyKey];
                    if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1) {
                        this.schemaObject.required = this.schemaObject.required || [];
                        this.schemaObject.required.push(propertyKey)
                    }
                } else {
                    this.schemaObject.properties[propertyKey] = {
                        allOf: [this.schemaObject.properties[propertyKey], schema.schemaObject.properties[propertyKey]]
                    }
                    if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1 && (!this.schemaObject.required || this.schemaObject.required.indexOf(propertyKey) === -1)) {
                        this.schemaObject.required = this.schemaObject.required || [];
                        this.schemaObject.required.push(propertyKey)
                    }
                }
            }
        }
        return this as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a oneOf statement is used.
     * This method only copy properties.
     * 
     * @param schema 
     */
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Merge<T, T2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'mergeProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        if (schema.schemaObject.properties) {
            this.schemaObject.properties = this.schemaObject.properties || {};
            for (let propertyKey in schema.schemaObject.properties) {
                if (!(propertyKey in this.schemaObject.properties)) {
                    this.schemaObject.properties[propertyKey] = schema.schemaObject.properties[propertyKey];
                    if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1) {
                        this.schemaObject.required = this.schemaObject.required || [];
                        this.schemaObject.required.push(propertyKey)
                    }
                } else {
                    this.schemaObject.properties[propertyKey] = {
                        oneOf: [this.schemaObject.properties[propertyKey], schema.schemaObject.properties[propertyKey]]
                    }
                    if (!this.schemaObject.required || this.schemaObject.required.indexOf(propertyKey) === -1) {
                        this.schemaObject.required = this.schemaObject.required || [];
                        this.schemaObject.required.push(propertyKey)
                    }
                }
            }
        }
        return this as any
    }

    /**
     * Overwrite all properties from the given schema into this one. If a property name is already used, the new type override the existing one.
     * This method only copy properties.
     * 
     * @param schema 
     */
    overwriteProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Overwrite<T, T2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'overwriteProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        if (schema.schemaObject.properties) {
            this.schemaObject.properties = this.schemaObject.properties || {};
            for (let propertyKey in schema.schemaObject.properties) {
                if (!(propertyKey in this.schemaObject.properties)) {
                    this.schemaObject.properties[propertyKey] = schema.schemaObject.properties[propertyKey];
                    if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1) {
                        this.schemaObject.required = this.schemaObject.required || [];
                        this.schemaObject.required.push(propertyKey)
                    }
                } else {
                    this.schemaObject.properties[propertyKey] = schema.schemaObject.properties[propertyKey];
                    if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1) {
                        this.schemaObject.required = this.schemaObject.required || [];
                        this.schemaObject.required.push(propertyKey)
                    } else if (this.schemaObject.required) {
                        this.schemaObject.required = this.schemaObject.required.filter(r => r !== propertyKey)
                    }
                }
            }
        }
        return this as any
    }

    /**
     * true if additionalProperties is set to false and, oneOf, allOf, anyOf and not are not used
     */
    get isSimpleObjectSchema() {
        return this.isObjectSchema && !this.hasAditionalProperties && !this.hasSchemasCombinationKeywords
    }

    /**
     * true if the schema represent an object
     */
    get isObjectSchema() {
        return this.schemaObject.type === "object" || (!("type" in this.schemaObject) && "properties" in this.schemaObject)
    }

    /**
     * True if the schema represents an objet that can have additional properties
     */
    get hasAditionalProperties() {
        return this.isObjectSchema && this.schemaObject.additionalProperties !== false
    }

    /**
     * True if the schema contains oneOf, allOf, anyOf or not keywords
     */
    get hasSchemasCombinationKeywords() {
        return "oneOf" in this.schemaObject || "allOf" in this.schemaObject || "anyOf" in this.schemaObject || "not" in this.schemaObject
    }

    /**
     * Deeply clone this schema. The new schema content can be modified safely.
     * 
     * @property schema
     */
    clone(schema: Pick<JSONSchema, JSONSchemaObjectProperties> = {}): this {
        let schemaCopy = _.cloneDeep(this.schemaObject)
        for (let propertyName in schema) {
            schemaCopy[propertyName] = schema[propertyName]
        }
        return new SchemaBuilder(schemaCopy) as any
    }

    /**
     * Validate the given object against the schema. If the object is invalid an error is thrown with the appropriate details.
     */
    validate(o: T) {
        // prepare validation function
        if (!this.validationFunction) {
            this.ajv = new Ajv({ coerceTypes: true, removeAdditional: true, useDefaults: true, meta: metaSchema });
            this.validationFunction = this.ajv.compile(this.schemaObject);
        }
        // run validation
        let valid = this.validationFunction(o);
        // check if an error needs to be thrown
        if (!valid) {
            throw validationError(this.ajv.errorsText(this.validationFunction.errors))
        }
    }
    protected ajv
    protected validationFunction;

    /**
     * Validate the given list of object against the schema. If any object is invalid, an error is thrown with the appropriate details.
     */
    validateList(list: T[]) {
        // prepare validation function
        if (!this.listValidationFunction) {
            this.ajvList = new Ajv({ coerceTypes: true, removeAdditional: true, useDefaults: true, meta: metaSchema });
            this.ajvList.addSchema(this.schemaObject, "schema");
            this.listValidationFunction = this.ajvList.compile({ type: "array", items: { $ref: "schema" }, minItems: 1 });
        }
        // run validation
        let valid = this.listValidationFunction(list);
        // check if an error needs to be thrown
        if (!valid) {
            throw validationError(this.ajvList.errorsText(this.listValidationFunction.errors))
        }
    }
    protected ajvList
    protected listValidationFunction;

    /**
     * This property makes the access to the underlying T type easy.
     * You can do things like type MyModel = typeof myModelSchemaBuilder.T
     * Or use GenericType["T"] in a generic type definition.
     * It's not supposed to be set or accessed 
     */
    readonly T?: T
}

function validationError(ajvErrorsText) {
    let opt: any = {
        name: "SerafinSchemaValidationError"
    };
    return new VError(opt, `Invalid parameters: ${ajvErrorsText}`);
}

function throughJsonSchema(schema: JSONSchema | JSONSchema[], action: (schema: JSONSchema) => void) {
    if (Array.isArray(schema)) {
        schema.forEach((s) => {
            throughJsonSchema(s, action)
        })
    } else {
        if (!_.isObject(schema)) {
            return
        }
        action(schema)
        if (schema.properties) {
            for (let property in schema.properties) {
                throughJsonSchema(schema.properties[property], action)
            }
        }
        if (schema.oneOf) {
            schema.oneOf.forEach(s => throughJsonSchema(s, action))
        }
        if (schema.allOf) {
            schema.allOf.forEach(s => throughJsonSchema(s, action))
        }
        if (schema.anyOf) {
            schema.anyOf.forEach(s => throughJsonSchema(s, action))
        }
        if (schema.items) {
            throughJsonSchema(schema.items, action)
        }
        if (schema.not) {
            throughJsonSchema(schema.not, action)
        }
        if ("additionalProperties" in schema && typeof schema.additionalProperties !== "boolean") {
            throughJsonSchema(schema.additionalProperties, action)
        }
    }
    return schema
}

export type JSONSchemaArrayProperties = "description" | "default" | "maxItems" | "minItems" | "uniqueItems" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaStringProperties = "description" | "default" | "maxLength" | "minLength" | "pattern" | "format" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaNumberProperties = "description" | "default" | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaProperties = "description" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaObjectProperties = "title" | "description" | "maxProperties" | "minProperties" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";