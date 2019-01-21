import * as _ from "lodash"
import * as Ajv from 'ajv'
import * as VError from 'verror'

import { JsonSchemaType } from "./JsonSchemaType";
import { Combine, CombineOptional, DeepPartial, DeepPartialArray, DeepPartialObject, Merge, Omit, Overwrite, PartialProperties, Rename, RenameOptional, Required, RequiredProperties, TransformProperties, TransformPropertiesToArray, UnwrapArrayProperties } from "./TransformationTypes";
import { JSONSchema } from "./JsonSchema";


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
     * /!\ schemaObject must not contain references. If you have references, use something like json-schema-ref-parser library first. 
     */
    constructor(protected schemaObject: JSONSchema) {
        this.schemaObject = schemaObject;
        throughJsonSchema(this.schemaObject, s => {
            if ("$ref" in s) {
                throw new VError(`Schema Builder Error: $ref can't be used to initialize a SchemaBuilder. Dereferenced the schema first.`)
            }
        })
    }

    /**
     * Function that take an inline JSON schema and deduces its type automatically!
     * Type, enums and required have to be string literals for this function to work... So you'll probably have to use contants (ex: STRING_TYPE), use the helper 'keys' function or pass the schema itself as the generic type argument.
     */
    static fromJsonSchema<S extends JSONSchema>(schema: S): SchemaBuilder<{ [P in keyof JsonSchemaType<S>]: JsonSchemaType<S>[P] }> {
        return new SchemaBuilder<any>(schema)
    }

    /**
     * Create an empty object schema
     * AdditionalProperties is automatically set to false
     */
    static emptySchema(schema: Pick<JSONSchema, JSONSchemaObjectProperties> = {}, nullable?: boolean) {
        (schema as JSONSchema).type = nullable ? ["object", "null"] : "object";
        (schema as JSONSchema).additionalProperties = false;
        return new SchemaBuilder<{}>(schema)
    }

    /**
     * Create a string schema
     */
    static stringSchema(schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}, nullable?: boolean) {
        (schema as JSONSchema).type = nullable ? ["string", "null"] : "string"
        return new SchemaBuilder<string>(schema)
    }

    /**
     * Create a number schema
     */
    static numberSchema(schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, nullable?: boolean) {
        (schema as JSONSchema).type = nullable ? ["number", "null"] : "number"
        return new SchemaBuilder<number>(schema)
    }

    /**
     * Create an integer schema
     */
    static integerSchema(schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, nullable?: boolean) {
        (schema as JSONSchema).type = nullable ? ["integer", "null"] : "integer"
        return new SchemaBuilder<number>(schema)
    }

    /**
     * Create a boolean schema
     */
    static booleanSchema(schema: Pick<JSONSchema, JSONSchemaProperties> = {}, nullable?: boolean) {
        (schema as JSONSchema).type = nullable ? ["boolean", "null"] : "boolean"
        return new SchemaBuilder<boolean>(schema)
    }

    /**
     * Create an enum schema
     */
    static enumSchema<K extends keyof any>(values: K[], schema: Pick<JSONSchema, JSONSchemaProperties> = {}, nullable?: boolean) {
        (schema as JSONSchema).type = nullable ? ["string", "null"] : "string";
        (schema as JSONSchema).enum = nullable ? [...values as string[], null] : values as string[];
        return new SchemaBuilder<K>(schema)
    }

    /**
     * Create an array schema
     */
    static arraySchema<U>(items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}, nullable?: boolean) {
        (schema as JSONSchema).type = nullable ? ["array", "null"] : "array";
        (schema as JSONSchema).items = [items.schemaObject];
        return new SchemaBuilder<U[]>(schema)
    }

    /**
     * Return a schema builder which represents schemaBuilder1 or schemaBuilder2. "oneOf" as described by JSON Schema specifications.
     */
    static oneOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 | T2>({
            oneOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        })
    }

    /**
     * Return a schema builder which represents schemaBuilder1 and schemaBuilder2. "allOf" as described by JSON Schema specifications.
     */
    static allOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 & T2>({
            allOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        })
    }

    /**
     * Return a schema builder which represents schemaBuilder1 or schemaBuilder2 or schemaBuilder1 and schemaBuilder2. "anyOf" as described by JSON Schema specifications.
     */
    static anyOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 | T2 | (T1 & T2)>({
            anyOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        })
    }

    /**
     * Return a schema builder which represents the negation of the given schema. The only type we can assume is "any". "not" as described by JSON Schema specifications.
     */
    static not(schemaBuilder: SchemaBuilder<any>) {
        return new SchemaBuilder<any>({
            not: schemaBuilder.schemaObject
        })
    }

    /**
     * Make given properties optionals
     */
    setOptionalProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{ [P in keyof PartialProperties<T, K>]: PartialProperties<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'setOptionalProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        // determine the new set of required properties
        let required = [];
        let existingRequired = this.schemaObject.required || []
        let optionalProperties = [] // properties that are changing from required to optional
        for (let existingRequiredProperty of existingRequired) {
            if ((properties as string[]).indexOf(existingRequiredProperty) === -1) {
                required.push(existingRequiredProperty)
            } else {
                optionalProperties.push(existingRequiredProperty)
            }
        }

        // clear default values for optional properties
        for (let optionalProperty of optionalProperties) {
            let property = this.schemaObject.properties[optionalProperty]
            if (property && typeof property !== "boolean") {
                delete property.default
            }
        }

        // delete required array if empty
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
    setRequiredProperties<K extends keyof T>(properties: K[]): SchemaBuilder<{ [P in keyof RequiredProperties<T, K>]: RequiredProperties<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'setRequiredProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        for (let property of properties) {
            this.schemaObject.required = this.schemaObject.required || []
            if (this.schemaObject.required.indexOf(property as string) === -1) {
                this.schemaObject.required.push(property as string)
            }
        }
        return this as any
    }

    /**
     * Make all properties optionals and remove their default values
     */
    toOptionals(): SchemaBuilder<{
        [P in keyof T]?: T[P];
    }> {
        delete this.schemaObject.required
        // remove default values for optional properties
        for (let property in this.schemaObject.properties) {
            delete (this.schemaObject.properties[property] as JSONSchema).default
        }
        return this as any
    }

    /**
     * Make all properties and subproperties optionals
     * Remove all default values
     */
    toDeepOptionals(): SchemaBuilder<DeepPartial<T>> {
        throughJsonSchema(this.schemaObject, s => {
            delete s.required
            // optional properties can't have default values
            delete s.default
        })
        return this as any
    }

    /**
     * Make all optional properties of this schema nullable
     */
    toNullable() {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'toNullable' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let required = this.schema.required || [];
        for (let propertyName in this.schema.properties) {
            if (required.indexOf(propertyName) === -1) {
                let propertyValue = this.schema.properties[propertyName];
                if (typeof propertyValue !== "boolean" && "type" in propertyValue) {
                    if (Array.isArray(propertyValue.type) && propertyValue.type.indexOf("null") === -1) {
                        propertyValue.type = [...propertyValue.type, "null"]
                    } else if (typeof propertyValue.type === "string" && propertyValue.type !== "null") {
                        propertyValue.type = [propertyValue.type, "null"]
                    }
                    if ("enum" in propertyValue && propertyValue.enum.indexOf(null) === -1) {
                        propertyValue.enum = [...propertyValue.enum, null]
                    }
                } else {
                    this.schema.properties[propertyName] = {
                        oneOf: [this.schema.properties[propertyName], { type: "null" }]
                    }
                }
            }
        }
        return this
    }

    /**
     * Add a property using the given schema builder
     * /!\ If 'schemaBuilder' param is used somewhere else, you should clone it first to avoid side effects
     */
    addProperty<U, K extends keyof any, REQUIRED extends boolean = true>(propertyName: K, schemaBuilder: SchemaBuilder<U>, isRequired?: REQUIRED): REQUIRED extends true ? SchemaBuilder<{ [P in keyof Combine<T, U, K>]: Combine<T, U, K>[P] }> : SchemaBuilder<{ [P in keyof CombineOptional<T, U, K>]: CombineOptional<T, U, K>[P] }> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only add properties to an object schema`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        if (propertyName in this.schemaObject.properties) {
            throw new VError(`Schema Builder Error: '${propertyName}' already exists in ${this.schemaObject.title || 'this'} schema`);
        }
        this.schemaObject.properties[propertyName as string] = schemaBuilder.schemaObject;
        if (isRequired === true || isRequired === undefined) {
            this.schemaObject.required = this.schemaObject.required || [];
            this.schemaObject.required.push(propertyName as string)
        }
        return this as any
    }

    /**
     * Add additional properties schema.
     * /!\ Many type operations can't work properly with index signatures. Try to use additionalProperties at the last step of your SchemaBuilder definition.
     * /!\ In typescript index signature MUST be compatible with other properties. However its supported in JSON schema, you can use it but you have to force the index singature to any.
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
     */
    addString<K extends keyof any, REQUIRED extends boolean = true>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}, isRequired?: REQUIRED, nullable?: boolean): REQUIRED extends true ? SchemaBuilder<{ [P in keyof Combine<T, string, K>]: Combine<T, string, K>[P] }> : SchemaBuilder<{ [P in keyof CombineOptional<T, string, K>]: CombineOptional<T, string, K>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.stringSchema(schema, nullable), isRequired)
    }

    /**
     * Add a string enum to the schema properties
     */
    addEnum<K extends keyof any, K2 extends keyof any, REQUIRED extends boolean = true>(propertyName: K, values: K2[], schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}, isRequired?: REQUIRED, nullable?: boolean): REQUIRED extends true ? SchemaBuilder<{ [P in keyof Combine<T, K2, K>]: Combine<T, K2, K>[P] }> : SchemaBuilder<{ [P in keyof CombineOptional<T, K2, K>]: CombineOptional<T, K2, K>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.enumSchema(values, schema, nullable), isRequired)
    }

    /**
     * Add a number to the schema properties
     */
    addNumber<K extends keyof any, REQUIRED extends boolean = true>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, isRequired?: REQUIRED, nullable?: boolean): REQUIRED extends true ? SchemaBuilder<{ [P in keyof Combine<T, number, K>]: Combine<T, number, K>[P] }> : SchemaBuilder<{ [P in keyof CombineOptional<T, number, K>]: CombineOptional<T, number, K>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.numberSchema(schema, nullable), isRequired)
    }

    /**
     * Add a number to the schema properties
     */
    addInteger<K extends keyof any, REQUIRED extends boolean = true>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, isRequired?: REQUIRED, nullable?: boolean): REQUIRED extends true ? SchemaBuilder<{ [P in keyof Combine<T, number, K>]: Combine<T, number, K>[P] }> : SchemaBuilder<{ [P in keyof CombineOptional<T, number, K>]: CombineOptional<T, number, K>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.integerSchema(schema, nullable), isRequired)
    }

    /**
     * Add a number to the schema properties
     */
    addBoolean<K extends keyof any, REQUIRED extends boolean = true>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaProperties> = {}, isRequired?: REQUIRED, nullable?: boolean): REQUIRED extends true ? SchemaBuilder<{ [P in keyof Combine<T, boolean, K>]: Combine<T, boolean, K>[P] }> : SchemaBuilder<{ [P in keyof CombineOptional<T, boolean, K>]: CombineOptional<T, boolean, K>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.booleanSchema(schema, nullable), isRequired)
    }

    /**
     * Add an array of objects to the schema properties
     */
    addArray<U extends {}, K extends keyof any, REQUIRED extends boolean = true>(propertyName: K, items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}, isRequired?: REQUIRED, nullable?: boolean): REQUIRED extends true ? SchemaBuilder<{ [P in keyof Combine<T, U[], K>]: Combine<T, U[], K>[P] }> : SchemaBuilder<{ [P in keyof CombineOptional<T, U[], K>]: CombineOptional<T, U[], K>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.arraySchema(items, schema, nullable), isRequired)
    }

    /**
     * Rename the given property. The property schema remains unchanged.
     */
    renameProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<{ [P in keyof Rename<T, K, K2>]: Rename<T, K, K2>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'renameProperty' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        if (propertyName in this.schemaObject.properties) {
            this.schemaObject.properties[newPropertyName as string] = this.schemaObject.properties[propertyName as string]
            delete this.schemaObject.properties[propertyName as string]
            // rename the property in the required array if needed
            if (this.schemaObject.required && this.schemaObject.required.indexOf(propertyName as string) !== -1) {
                this.schemaObject.required.splice(this.schemaObject.required.indexOf(propertyName as string), 1)
                this.schemaObject.required.push(newPropertyName as string)
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
            propertiesMap[property] = this.schemaObject.properties[property as string];
        }
        this.schemaObject.properties = propertiesMap;
        if (this.schemaObject.required) {
            this.schemaObject.required = this.schemaObject.required.filter((r) => (properties as string[]).indexOf(r) !== -1)
        }
        if (Array.isArray(this.schemaObject.required) && this.schemaObject.required.length === 0) {
            delete this.schemaObject.required
        }
        this.schemaObject.additionalProperties = false
        return this as any
    }


    /**
     * Filter the schema to contains only the given properties and keep additionalProperties or part of it
     * 
     * @param properties 
     * @param withAdditionalProperties null means no additonal properties are kept in the result. [] means additionalProperties is kept or set to true if it was not set to false. ['aProperty'] allows you to capture only specific names that conform to additionalProperties type.
     */
    pickAdditionalProperties<K extends keyof T, K2 extends keyof T = null>(properties: K[], additionalProperties: K2[] = null): SchemaBuilder<Pick<T, K> & { [P in K2]: T[P] }> {
        let additionalProps = this.schemaObject.additionalProperties;
        if (!this.isObjectSchema || !this.hasAdditionalProperties || this.hasSchemasCombinationKeywords) {
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
     * /!\ If 'schemaBuilder' param is used somewhere else, you should clone it first to avoid side effects
     * 
     * @param changedProperties properties that will have the alternative type
     * @param schemaBuilder 
     */
    transformProperties<U, K extends keyof T>(schemaBuilder: SchemaBuilder<U>, propertyNames?: K[]): SchemaBuilder<{ [P in keyof TransformProperties<T, K, U>]: TransformProperties<T, K, U>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'transformProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(this.schemaObject.properties) as any
        for (let property of propertyNames) {
            let propertySchema = this.schemaObject.properties[property as string];
            this.schemaObject.properties[property as string] = {
                oneOf: [propertySchema, schemaBuilder.schemaObject]
            }
        }
        return this as any
    }

    /**
     * Transform the given properties to make them alternatively an array of the initial type.
     * If the property is already an Array nothing happen.
     * 
     * @param propertyNames properties that will have the alternative array type
     */
    transformPropertiesToArray<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<{ [P in keyof TransformPropertiesToArray<T, K>]: TransformPropertiesToArray<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'transformPropertiesToArray' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(this.schemaObject.properties) as any
        for (let property of propertyNames) {
            let propertySchema = this.schemaObject.properties[property as string];
            // Transform the property if it's not an array
            if ((propertySchema as JSONSchema).type !== "array") {
                this.schemaObject.properties[property as string] = {
                    oneOf: [propertySchema, { type: "array", items: [propertySchema] }]
                }
            }
        }
        return this as any
    }

    /**
     * Unwrap the given array properties to make them alternatively the generic type of the array
     * If the property is not an Array nothing happen.
     * 
     * @param propertyNames properties that will be unwrapped
     */
    unwrapArrayProperties<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<{ [P in keyof UnwrapArrayProperties<T, K>]: UnwrapArrayProperties<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'unwrapArrayProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        this.schemaObject.properties = this.schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(this.schemaObject.properties) as any
        for (let property of propertyNames) {
            let propertySchema = this.schemaObject.properties[property as string];
            // Transform the property if it's an array
            if ((propertySchema as JSONSchema).type === "array") {
                let items = (propertySchema as JSONSchema).items
                let itemsSchema: JSONSchema
                if (Array.isArray(items)) {
                    if (items.length === 1) {
                        itemsSchema = items[0] as JSONSchema
                    } else {
                        itemsSchema = { oneOf: items }
                    }
                } else {
                    itemsSchema = items as JSONSchema
                }
                this.schemaObject.properties[property as string] = {
                    oneOf: [itemsSchema, propertySchema]
                }
            }
        }
        return this as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a allOf statement is used.
     * This method only copy properties.
     * /!\ If 'schemaBuilder' param is used somewhere else, you should clone it first to avoid side effects
     */
    intersectProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof (T & T2)]: (T & T2)[P] }> {
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
     * /!\ If 'schemaBuilder' param is used somewhere else, you should clone it first to avoid side effects
     */
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof Merge<T, T2>]: Merge<T, T2>[P] }> {
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
     * /!\ If 'schemaBuilder' param is used somewhere else, you should clone it first to avoid side effects
     */
    overwriteProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof Overwrite<T, T2>]: Overwrite<T, T2>[P] }> {
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
                    if (this.schemaObject.required && this.schemaObject.required.indexOf(propertyKey) !== -1) {
                        this.schemaObject.required = this.schemaObject.required.filter(r => r !== propertyKey)
                    }
                    if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1) {
                        this.schemaObject.required = this.schemaObject.required || [];
                        this.schemaObject.required.push(propertyKey)
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
        return this.isObjectSchema && !this.hasAdditionalProperties && !this.hasSchemasCombinationKeywords
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
    get hasAdditionalProperties() {
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
        let schemaCopy: any = _.cloneDeep(this.schemaObject)
        for (let propertyName in schema) {
            schemaCopy[propertyName] = (schema as any)[propertyName]
        }
        return new SchemaBuilder(schemaCopy) as any
    }

    /**
     * Validate the given object against the schema. If the object is invalid an error is thrown with the appropriate details.
     */
    validate(o: T) {
        // ensure validation function is cached
        this.cacheValidationFunction()
        // run validation
        let valid = this.validationFunction(o);
        // check if an error needs to be thrown
        if (!valid) {
            throw validationError(this.ajv.errorsText(this.validationFunction.errors), this.validationFunction.errors)
        }
    }
    protected ajv: any
    protected validationFunction: any;

    /**
     * Validate the given list of object against the schema. If any object is invalid, an error is thrown with the appropriate details.
     */
    validateList(list: T[]) {
        // ensure validation function is cached
        this.cacheListValidationFunction()
        // run validation
        let valid = this.listValidationFunction(list);
        // check if an error needs to be thrown
        if (!valid) {
            throw validationError(this.ajvList.errorsText(this.listValidationFunction.errors), this.validationFunction.errors)
        }
    }
    protected ajvList: any
    protected listValidationFunction: any;

    /**
     * Change the default Ajv configuration to use the given values. Any cached validation function is cleared.
     * The default validation config is { coerceTypes: true, removeAdditional: true, useDefaults: true }
     */
    configureValidation(config: { coerceTypes?: boolean, removeAdditional?: boolean, useDefaults?: boolean, allErrors?: boolean }) {
        this.validationConfig = { ...this.validationConfig, ...config }
        this.clearCache()
    }
    protected validationConfig = { coerceTypes: true, removeAdditional: true, useDefaults: true };
    protected clearCache() {
        delete this.ajvList
        delete this.listValidationFunction
        delete this.ajv
        delete this.validationFunction
    }

    /**
     * Explicitly cache the validation function for single objects with the current validation configuration
     */
    cacheValidationFunction() {
        // prepare validation function
        if (!this.validationFunction) {
            this.ajv = new Ajv({ ...this.validationConfig });
            this.validationFunction = this.ajv.compile(this.schemaObject);
        }
    }
    /**
     * Explicitly cache the validation function for list of objects with the current validation configuration
     */
    cacheListValidationFunction() {
        // prepare validation function
        if (!this.listValidationFunction) {
            this.ajvList = new Ajv({ ...this.validationConfig });
            this.ajvList.addSchema(this.schemaObject, "schema");
            this.listValidationFunction = this.ajvList.compile({ type: "array", items: { $ref: "schema" }, minItems: 1 });
        }
    }

    /**
     * This property makes the access to the underlying T type easy.
     * You can do things like type MyModel = typeof myModelSchemaBuilder.T
     * Or use GenericType["T"] in a generic type definition.
     * It's not supposed to be set or accessed 
     */
    readonly T?: T
}

function validationError(ajvErrorsText: string, errorsDetails: any) {
    let opt: any = {
        name: "SerafinSchemaValidationError",
        info: {
            ajvErrors: errorsDetails
        }
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
                throughJsonSchema(schema.properties[property] as JSONSchema, action)
            }
        }
        if (schema.oneOf) {
            schema.oneOf.forEach(s => throughJsonSchema(s as JSONSchema[], action))
        }
        if (schema.allOf) {
            schema.allOf.forEach(s => throughJsonSchema(s as JSONSchema[], action))
        }
        if (schema.anyOf) {
            schema.anyOf.forEach(s => throughJsonSchema(s as JSONSchema[], action))
        }
        if (schema.items) {
            throughJsonSchema(schema.items as JSONSchema, action)
        }
        if (schema.not) {
            throughJsonSchema(schema.not as JSONSchema, action)
        }
        if ("additionalProperties" in schema && typeof schema.additionalProperties !== "boolean") {
            throughJsonSchema(schema.additionalProperties, action)
        }
    }
    return schema
}

export type JSONSchemaArrayProperties = "description" | "default" | "maxItems" | "minItems" | "uniqueItems" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaStringProperties = "description" | "default" | "maxLength" | "minLength" | "pattern" | "format" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaNumberProperties = "description" | "default" | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaProperties = "description" | "default" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaObjectProperties = "title" | "description" | "maxProperties" | "minProperties" | "default" | "examples" | "readOnly" | "writeOnly";