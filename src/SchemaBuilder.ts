import * as _ from "lodash"
import * as $RefParser from "json-schema-ref-parser"
import * as Ajv from 'ajv'
import * as VError from 'verror'

import { JSONSchema, metaSchema } from "@serafin/open-api"

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
     * /!\ schemaObject must not contain external references. If you have external references, use dereferencedSchema method instead.
     * @param schemaObject 
     */
    constructor(protected schemaObject: JSONSchema) {
        this.schemaObject = schemaObject;
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
     * Create an empty schema
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
            not: schemaBuilder
        })
    }

    /**
     * Make given properties optionals
     */
    setOptionalProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Partial<Pick<T, K>> & Omit<T, K>> {
        let required = []
        for (let property in this.schemaObject.properties) {
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
    setRequiredProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Required<Pick<T, K>> & Omit<T, K>> {
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
    toOptionals(): SchemaBuilder<Partial<T>> {
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
    addProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<T & {[P in K]: U}> {
        this.schemaObject.properties = this.schemaObject.properties || {}
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
    addOptionalProperty<U, K extends keyof any>(propertyName: K, schemaBuilder: SchemaBuilder<U>): SchemaBuilder<T & {[P in K]?: U}> {
        this.schemaObject.properties = this.schemaObject.properties || {}
        this.schemaObject.properties[propertyName] = schemaBuilder.schemaObject;
        return this as any
    }

    /**
     * Add additional properties schema
     * 
     * @param schemaBuilder 
     */
    addAdditionalProperties<U>(schemaBuilder: SchemaBuilder<U>): SchemaBuilder<T & { [P: string]: U }> {
        if (this.schemaObject.additionalProperties) {
            throw new Error(`Schema Builder Error: additionalProperties is already set in ${this.schemaObject.title || 'this'} schema.`)
        }
        this.schemaObject.additionalProperties = schemaBuilder.schemaObject
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
     * Add an array of the given schema builder to the schema properties
     * 
     * @param propertyName 
     * @param items 
     * @param schema 
     */
    addArray<U, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addProperty(propertyName, SchemaBuilder.arraySchema(items, schema))
    }

    /**
     * Add an optional array of the given schema builder to the schema properties
     * 
     * @param propertyName 
     * @param items 
     * @param schema 
     */
    addOptionalArray<U, K extends keyof any>(propertyName: K, items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addOptionalProperty(propertyName, SchemaBuilder.arraySchema(items, schema))
    }

    /**
     * Add an array of string to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addStringArray<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addArray(propertyName, SchemaBuilder.stringSchema(), schema)
    }

    /**
     * Add an optional array of string to the schema properties
     * 
     * @param propertyName 
     * @param schema 
     */
    addOptionalStringArray<K extends keyof any>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}) {
        return this.addOptionalArray(propertyName, SchemaBuilder.stringSchema(), schema)
    }

    /**
     * Filter the schema to contains only the given properties. additionalProperties is set to false.
     * 
     * @param properties 
     */
    pickProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Pick<T, K>> {
        this.schemaObject.properties = this.schemaObject.properties || {}
        let propertiesMap: any = {}
        for (let property of properties) {
            if (property in this.schemaObject.properties) {
                propertiesMap[property] = this.schemaObject.properties[property];
            } else {
                throw new Error(`Schema Builder Error: picked property ${property} is not avaialble in ${this.schemaObject.title || 'this'} schema.`);
            }
        }
        this.schemaObject.properties = propertiesMap;
        if (this.schemaObject.required) {
            this.schemaObject.required = this.schemaObject.required.filter((r) => (properties as string[]).indexOf(r) !== -1)
        }
        this.schemaObject.additionalProperties = false
        return this as any
    }


    /**
     * Filter the schema to contains only the given properties and keep additionalProperties
     * 
     * @param properties 
     */
    pickPropertiesIncludingAdditonalProperties<K extends keyof T, K2 extends keyof T>(properties: K[]): SchemaBuilder<Pick<T, K> & {[P in K2]: T[P]}> {
        let additionalProperties = this.schemaObject.additionalProperties;
        if (!additionalProperties) {
            throw new Error(`Schema Builder Error: 'pickPropertiesIncludingAdditonalProperties' can only be used with a schema that has additionalProperties defined.`);
        }
        this.pickProperties(properties);
        this.schemaObject.additionalProperties = additionalProperties;
        return this as any
    }

    /**
     * Filter the schema to contains everything except the given properties. additionalProperties is set to false.
     */
    omitProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Omit<T, K>> {
        this.schemaObject.properties = this.schemaObject.properties || {};
        let p = Object.keys(this.schemaObject.properties).filter(k => (properties as string[]).indexOf(k) === -1);
        return this.pickProperties(p as any);
    }

    /**
     * Transform properties to accept an alternative type. additionalProperties is set false.
     * 
     * @param changedProperties properties that will have the alternative type
     * @param schemaBuilder 
     */
    transformProperties<U, K extends keyof T, K2 extends keyof T>(schemaBuilder: SchemaBuilder<U>, propertyNames?: K[]): SchemaBuilder<Omit<T, K> & {[P in K]: (T[P] | U) }> {
        this.schemaObject.properties = this.schemaObject.properties || {}
        for (let property of propertyNames) {
            let propertySchema = this.schemaObject.properties[property];
            if (!propertySchema) {
                throw new Error(`Schema Builder Error: property ${property} is not avaialble in ${this.schemaObject.title || 'this'} schema.`)
            }
            this.schemaObject.properties[property] = {
                oneOf: [propertySchema, schemaBuilder.schemaObject]
            }
        }
        this.schemaObject.additionalProperties = false;
        return this as any
    }

    /**
     * Transform the given properties to make them alternatively an array of the initial type. additionalProperties is set false.
     * 
     * @param changedProperties properties that will have the alternative array type
     */
    transformPropertiesToArray<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<Omit<T, K> & {[P in K]: (T[P] | T[P][]) }> {
        this.schemaObject.properties = this.schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(this.schemaObject.properties) as any
        for (let property of propertyNames) {
            let propertySchema = this.schemaObject.properties[property];
            if (!propertySchema) {
                throw new Error(`Schema Builder Error: property ${property} is not avaialble in ${this.schemaObject.title || 'this'} schema.`)
            }
            this.schemaObject.properties[property] = {
                oneOf: [propertySchema, { type: "array", items: propertySchema }]
            }
        }
        this.schemaObject.additionalProperties = false;
        return this as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a allOf statement is used.
     * This method only copy properties. It does not copy additionalProperties, oneOf, allOf or any other fields
     * 
     * @param schema 
     */
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Merge<T, T2>> {
        for (let propertyKey in schema.schemaObject.properties) {
            if (!(propertyKey in this.schemaObject.properties)) {
                this.schemaObject.properties[propertyKey] = schema.schemaObject.properties[propertyKey];
                if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1) {
                    this.schemaObject.required = this.schemaObject.required || [];
                    this.schemaObject.required.push(propertyKey)
                }
            } else {
                this.schemaObject.properties[propertyKey] = {
                    onOf: [this.schemaObject.properties[propertyKey], schema.schemaObject.properties[propertyKey]]
                }
                if (!this.schemaObject.required || this.schemaObject.required.indexOf(propertyKey) === -1) {
                    this.schemaObject.required = this.schemaObject.required || [];
                    this.schemaObject.required.push(propertyKey)
                }
            }
        }
        return this as any
    }

    /**
     * Flatten the generic type associated with the schema
     * This method doesn't do anything. It's just here for readability in case the interface becomes messy.
     */
    flatType(): SchemaBuilder<{[P in keyof T]: T[P]}> {
        return this as any
    }

    /**
     * true if additionalProperties is set to false
     */
    get isSchemaSealed() {
        return this.schemaObject.additionalProperties === false
    }

    /**
     * true if additionalProperties is set to false and, oneOf, allOf, anyOf and not are not used
     */
    get isSimpleObjectSchema() {
        return this.schemaObject.additionalProperties === false && !("oneOf" in this.schemaObject) && !("allOf" in this.schemaObject) && !("anyOf" in this.schemaObject) && !("not" in this.schemaObject)
    }

    /**
     * Deeply clone this schema. The new schema content can be modified safely.
     */
    clone(): this {
        return new SchemaBuilder(_.cloneDeep(this.schemaObject)) as any
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
}

function validationError(ajvErrorsText) {
    let opt: any = {
        name: "SerafinSchemaValidationError"
    };
    return new VError(opt, `Invalid parameters: ${validationError}`);
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


/**
 * Remove the second union of string literals from the first.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/12215
 */
export type Diff<T extends string, U extends string> = (
    & {[P in T]: P }
    & {[P in U]: never }
    & { [x: string]: never }
)[T];

/**
 * Drop keys K from T.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/12215
 */
export type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

/**
 * T & U but where overlapping properties use thetype from U only.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/12215
 */
export type Overwrite<T, U> = Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & U;

/**
 * Like `T & U`, but where there are overlapping properties use the
 * type from T[P] | U[P].
 * For overloapping properties, optional info is lost. The property becomes mandatory.
 */
export type Merge<T, U> = Omit<T, Diff<keyof T, Diff<keyof T, keyof U>>> & Omit<U, Diff<keyof U, Diff<keyof U, keyof T>>> & {[P in keyof (T | U)]: (T[P] | U[P]) };

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
    [P in {[P in keyof T]: keyof T; }[keyof T]]: T[P];
};

export type JSONSchemaArrayProperties = "description" | "default" | "maxItems" | "minItems" | "uniqueItems" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaStringProperties = "description" | "default" | "maxLength" | "minLength" | "pattern" | "format" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaNumberProperties = "description" | "default" | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaProperties = "description" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";

export type JSONSchemaObjectProperties = "title" | "description" | "maxProperties" | "minProperties" | "default" | "example" | "deprecated" | "readOnly" | "writeOnly";