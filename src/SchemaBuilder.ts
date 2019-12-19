import * as Ajv from 'ajv'
import * as VError from 'verror'

import { JsonSchemaType } from "./JsonSchemaType";
import { Combine, DeepPartial, Merge, Overwrite, PartialProperties, Rename, RequiredProperties, TransformProperties, TransformPropertiesToArray, UnwrapArrayProperties, Nullable } from "./TransformationTypes";
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
    constructor(protected schemaObject: JSONSchema, protected validationConfig?: Ajv.Options) {
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
    static fromJsonSchema<S>(schema: S): SchemaBuilder<JsonSchemaType<S>> {
        return new SchemaBuilder<any>(schema)
    }

    /**
     * Create an empty object schema
     * AdditionalProperties is automatically set to false
     */
    static emptySchema<N extends boolean = false>(schema: Pick<JSONSchema, JSONSchemaObjectProperties> = {}, nullable?: N): N extends true ? SchemaBuilder<{} | null> : SchemaBuilder<{}> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["object", "null"] : "object",
            additionalProperties: false
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a string schema
     */
    static stringSchema<N extends boolean = false>(schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}, nullable?: N): N extends true ? SchemaBuilder<string | null> : SchemaBuilder<string> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["string", "null"] : "string"
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a number schema
     */
    static numberSchema<N extends boolean = false>(schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, nullable?: N): N extends true ? SchemaBuilder<number | null> : SchemaBuilder<number> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["number", "null"] : "number"
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create an integer schema
     */
    static integerSchema<N extends boolean = false>(schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, nullable?: boolean): N extends true ? SchemaBuilder<number | null> : SchemaBuilder<number> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["integer", "null"] : "integer"
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a boolean schema
     */
    static booleanSchema<N extends boolean = false>(schema: Pick<JSONSchema, JSONSchemaProperties> = {}, nullable?: boolean): N extends true ? SchemaBuilder<boolean | null> : SchemaBuilder<boolean> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["boolean", "null"] : "boolean"
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create an enum schema
     */
    static enumSchema<K extends keyof any, N extends boolean = false>(values: K[], schema: Pick<JSONSchema, JSONSchemaProperties> = {}, nullable?: boolean): N extends true ? SchemaBuilder<K | null> : SchemaBuilder<K> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["string", "null"] : "string",
            enum: nullable ? [...values as string[], null] : values as string[]
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create an array schema
     */
    static arraySchema<U, N extends boolean = false>(items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}, nullable?: boolean): N extends true ? SchemaBuilder<U[] | null> : SchemaBuilder<U[]> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["array", "null"] : "array",
            items: cloneJSON(items.schemaObject)
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Return a schema builder which represents schemaBuilder1 or schemaBuilder2. "oneOf" as described by JSON Schema specifications.
     */
    static oneOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 | T2>({
            oneOf: [cloneJSON(schemaBuilder1.schemaObject), cloneJSON(schemaBuilder2.schemaObject)]
        })
    }

    /**
     * Return a schema builder which represents schemaBuilder1 and schemaBuilder2. "allOf" as described by JSON Schema specifications.
     */
    static allOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 & T2>({
            allOf: [cloneJSON(schemaBuilder1.schemaObject), cloneJSON(schemaBuilder2.schemaObject)]
        })
    }

    /**
     * Return a schema builder which represents schemaBuilder1 or schemaBuilder2 or schemaBuilder1 and schemaBuilder2. "anyOf" as described by JSON Schema specifications.
     */
    static anyOf<T1, T2>(schemaBuilder1: SchemaBuilder<T1>, schemaBuilder2: SchemaBuilder<T2>) {
        return new SchemaBuilder<T1 | T2 | (T1 & T2)>({
            anyOf: [cloneJSON(schemaBuilder1.schemaObject), cloneJSON(schemaBuilder2.schemaObject)]
        })
    }

    /**
     * Return a schema builder which represents the negation of the given schema. The only type we can assume is "any". "not" as described by JSON Schema specifications.
     */
    static not(schemaBuilder: SchemaBuilder<any>) {
        return new SchemaBuilder<any>({
            not: cloneJSON(schemaBuilder.schemaObject)
        })
    }

    /**
     * Make given properties optionals
     */
    setOptionalProperties<K extends keyof T>(properties: K[]): SchemaBuilder<PartialProperties<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'setOptionalProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        // determine the new set of required properties
        let required = [];
        let existingRequired = schemaObject.required || []
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
            let property = schemaObject.properties[optionalProperty]
            if (property && typeof property !== "boolean") {
                delete property.default
            }
        }

        // delete required array if empty
        if (required.length === 0) {
            delete schemaObject.required
        } else {
            schemaObject.required = required
        }
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make given properties required
     */
    setRequiredProperties<K extends keyof T>(properties: K[]): SchemaBuilder<RequiredProperties<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'setRequiredProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        for (let property of properties) {
            schemaObject.required = schemaObject.required || []
            if (schemaObject.required.indexOf(property as string) === -1) {
                schemaObject.required.push(property as string)
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make all properties optionals and remove their default values
     */
    toOptionals(): SchemaBuilder<{
        [P in keyof T]?: T[P];
    }> {
        let schemaObject = cloneJSON(this.schemaObject)
        delete schemaObject.required
        // remove default values for optional properties
        for (let property in schemaObject.properties) {
            delete (schemaObject.properties[property] as JSONSchema).default
        }
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make all properties and subproperties optionals
     * Remove all default values
     */
    toDeepOptionals(): SchemaBuilder<DeepPartial<T>> {
        let schemaObject = cloneJSON(this.schemaObject)
        throughJsonSchema(schemaObject, s => {
            delete s.required
            // optional properties can't have default values
            delete s.default
        })
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make all optional properties of this schema nullable
     */
    toNullable(): SchemaBuilder<Nullable<T>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'toNullable' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        let required = schemaObject.required || [];
        for (let propertyName in schemaObject.properties) {
            if (required.indexOf(propertyName) === -1) {
                let propertyValue = schemaObject.properties[propertyName];
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
                    schemaObject.properties[propertyName] = {
                        anyOf: [schemaObject.properties[propertyName], { type: "null" }]
                    }
                }
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Add a property using the given schema builder
     */
    addProperty<U, K extends keyof any, REQUIRED extends boolean = true>(propertyName: K, schemaBuilder: SchemaBuilder<U>, isRequired?: REQUIRED): SchemaBuilder<Combine<T, U, K, REQUIRED, false>> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only add properties to an object schema`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        if (propertyName in schemaObject.properties) {
            throw new VError(`Schema Builder Error: '${propertyName}' already exists in ${schemaObject.title || 'this'} schema`);
        }
        schemaObject.properties[propertyName as string] = cloneJSON(schemaBuilder.schemaObject);
        if (isRequired === true || isRequired === undefined) {
            schemaObject.required = schemaObject.required || [];
            schemaObject.required.push(propertyName as string)
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Replace an existing property of this schema
     */
    replaceProperty<U, K extends keyof T, REQUIRED extends boolean = true>(propertyName: K, schemaBuilder: SchemaBuilder<U>, isRequired?: REQUIRED): SchemaBuilder<Combine<Omit<T, K>, U, K, REQUIRED, false>> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only replace properties of an object schema`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        if (schemaObject.required) {
            schemaObject.required = schemaObject.required.filter((p: string) => p !== propertyName)
        }
        schemaObject.properties[propertyName as string] = cloneJSON(schemaBuilder.schemaObject);
        if (isRequired === true || isRequired === undefined) {
            schemaObject.required = schemaObject.required || [];
            schemaObject.required.push(propertyName as string)
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
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
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.additionalProperties = schemaBuilder ? cloneJSON(schemaBuilder.schemaObject) : true
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Add a string to the schema properties
     */
    addString<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}, isRequired?: REQUIRED, nullable?: N): SchemaBuilder<Combine<T, string, K, REQUIRED, N>> {
        return this.addProperty(propertyName, SchemaBuilder.stringSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add a string enum to the schema properties
     */
    addEnum<K extends keyof any, K2 extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(propertyName: K, values: K2[], schema: Pick<JSONSchema, JSONSchemaStringProperties> = {}, isRequired?: REQUIRED, nullable?: N): SchemaBuilder<Combine<T, K2, K, REQUIRED, N>> {
        return this.addProperty(propertyName, SchemaBuilder.enumSchema(values, schema, nullable), isRequired) as any
    }

    /**
     * Add a number to the schema properties
     */
    addNumber<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, isRequired?: REQUIRED, nullable?: N): SchemaBuilder<Combine<T, number, K, REQUIRED, N>> {
        return this.addProperty(propertyName, SchemaBuilder.numberSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add a number to the schema properties
     */
    addInteger<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {}, isRequired?: REQUIRED, nullable?: N): SchemaBuilder<Combine<T, number, K, REQUIRED, N>> {
        return this.addProperty(propertyName, SchemaBuilder.integerSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add a number to the schema properties
     */
    addBoolean<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(propertyName: K, schema: Pick<JSONSchema, JSONSchemaProperties> = {}, isRequired?: REQUIRED, nullable?: N): SchemaBuilder<Combine<T, boolean, K, REQUIRED, N>> {
        return this.addProperty(propertyName, SchemaBuilder.booleanSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add an array of objects to the schema properties
     */
    addArray<U extends {}, K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(propertyName: K, items: SchemaBuilder<U>, schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {}, isRequired?: REQUIRED, nullable?: N): SchemaBuilder<Combine<T, U[], K, REQUIRED, N>> {
        return this.addProperty(propertyName, SchemaBuilder.arraySchema(items, schema, nullable), isRequired) as any
    }

    /**
     * Rename the given property. The property schema remains unchanged.
     */
    renameProperty<K extends keyof T, K2 extends keyof any>(propertyName: K, newPropertyName: K2): SchemaBuilder<Rename<T, K, K2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'renameProperty' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {};
        if (propertyName in schemaObject.properties) {
            schemaObject.properties[newPropertyName as string] = schemaObject.properties[propertyName as string]
            delete schemaObject.properties[propertyName as string]
            // rename the property in the required array if needed
            if (schemaObject.required && schemaObject.required.indexOf(propertyName as string) !== -1) {
                schemaObject.required.splice(schemaObject.required.indexOf(propertyName as string), 1)
                schemaObject.required.push(newPropertyName as string)
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
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
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        let propertiesMap: any = {}
        for (let property of properties) {
            propertiesMap[property] = schemaObject.properties[property as string];
        }
        schemaObject.properties = propertiesMap;
        if (schemaObject.required) {
            schemaObject.required = schemaObject.required.filter((r: string) => (properties as string[]).indexOf(r) !== -1)
        }
        if (Array.isArray(schemaObject.required) && schemaObject.required.length === 0) {
            delete schemaObject.required
        }
        schemaObject.additionalProperties = false
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }


    /**
     * Filter the schema to contains only the given properties and keep additionalProperties or part of it
     * 
     * @param properties 
     * @param additionalProperties [] means no additonal properties are kept in the result. undefined means additionalProperties is kept or set to true if it was not set to false. ['aProperty'] allows you to capture only specific names that conform to additionalProperties type.
     */
    pickAdditionalProperties<K extends keyof T, K2 extends keyof T = any>(properties: K[], additionalProperties?: K2[]): SchemaBuilder<Pick<T, K> & { [P in K2]: T[P] }> {
        if (!this.isObjectSchema || !this.hasAdditionalProperties || this.hasSchemasCombinationKeywords) {
            throw new VError(`Schema Builder Error: 'pickPropertiesIncludingAdditonalProperties' can only be used with a simple object schema with additionalProperties (no oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        let additionalProps = schemaObject.additionalProperties;
        schemaObject.properties = schemaObject.properties || {}
        let propertiesMap: any = {}
        for (let property of properties) {
            propertiesMap[property] = schemaObject.properties[property as string];
        }
        schemaObject.properties = propertiesMap;
        if (schemaObject.required) {
            schemaObject.required = schemaObject.required.filter((r: string) => (properties as string[]).indexOf(r) !== -1)
        }
        if (Array.isArray(schemaObject.required) && schemaObject.required.length === 0) {
            delete schemaObject.required
        }
        if (!additionalProperties) {
            schemaObject.additionalProperties = additionalProps ? additionalProps : true;
        } else if (Array.isArray(additionalProperties) && additionalProperties.length === 0) {
            schemaObject.additionalProperties = false
        } else {
            schemaObject.additionalProperties = false
            schemaObject.required = schemaObject.required || []
            for (let additionalProperty of additionalProperties) {
                schemaObject.properties[additionalProperty] = typeof additionalProps === "boolean" ? {} : cloneJSON(additionalProps)
                schemaObject.required.push(additionalProperty)
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Filter the schema to contains everything except the given properties.
     */
    omitProperties<K extends keyof T>(properties: K[]): SchemaBuilder<Omit<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'omitProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let p = Object.keys(this.schemaObject.properties || {}).filter(k => (properties as string[]).indexOf(k) === -1);
        return this.pickProperties(p as any)
    }

    /**
     * Transform properties to accept an alternative type. additionalProperties is set false.
     * 
     * @param changedProperties properties that will have the alternative type
     * @param schemaBuilder 
     */
    transformProperties<U, K extends keyof T>(schemaBuilder: SchemaBuilder<U>, propertyNames?: K[]): SchemaBuilder<TransformProperties<T, K, U>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'transformProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(schemaObject.properties) as K[]
        for (let property of propertyNames) {
            let propertySchema = schemaObject.properties[property as string];
            schemaObject.properties[property as string] = {
                oneOf: [propertySchema, cloneJSON(schemaBuilder.schemaObject)]
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Transform the given properties to make them alternatively an array of the initial type.
     * If the property is already an Array nothing happen.
     * 
     * @param propertyNames properties that will have the alternative array type
     */
    transformPropertiesToArray<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<TransformPropertiesToArray<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'transformPropertiesToArray' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(schemaObject.properties) as K[]
        for (let property of propertyNames) {
            let propertySchema = schemaObject.properties[property as string];
            // Transform the property if it's not an array
            if ((propertySchema as JSONSchema).type !== "array") {
                schemaObject.properties[property as string] = {
                    oneOf: [propertySchema, { type: "array", items: cloneJSON(propertySchema) }]
                }
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Unwrap the given array properties to make them alternatively the generic type of the array
     * If the property is not an Array nothing happen.
     * 
     * @param propertyNames properties that will be unwrapped
     */
    unwrapArrayProperties<K extends keyof T>(propertyNames?: K[]): SchemaBuilder<UnwrapArrayProperties<T, K>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'unwrapArrayProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        propertyNames = propertyNames || Object.keys(schemaObject.properties) as K[]
        for (let property of propertyNames) {
            let propertySchema = schemaObject.properties[property as string];
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
                schemaObject.properties[property as string] = {
                    oneOf: [cloneJSON(itemsSchema), propertySchema]
                }
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a allOf statement is used.
     * This method only copy properties.
     */
    intersectProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<T & T2> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'intersectProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject1 = cloneJSON(this.schemaObject)
        let schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            schemaObject1.properties = schemaObject1.properties || {};
            for (let propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties)) {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey];
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || [];
                        schemaObject1.required.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties[propertyKey] = {
                        allOf: [schemaObject1.properties[propertyKey], schemaObject2.properties[propertyKey]]
                    }
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1 && (!schemaObject1.required || schemaObject1.required.indexOf(propertyKey) === -1)) {
                        schemaObject1.required = schemaObject1.required || [];
                        schemaObject1.required.push(propertyKey)
                    }
                }
            }
        }
        return new SchemaBuilder(schemaObject1, this.validationConfig) as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a anyOf statement is used.
     * This method only copy properties.
     */
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Merge<T, T2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'mergeProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject1 = cloneJSON(this.schemaObject)
        let schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            schemaObject1.properties = schemaObject1.properties || {};
            for (let propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties)) {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey];
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || [];
                        schemaObject1.required.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties[propertyKey] = {
                        anyOf: [schemaObject1.properties[propertyKey], schemaObject2.properties[propertyKey]]
                    }
                    if (schemaObject1.required && schemaObject1.required.indexOf(propertyKey) !== -1 && (!schemaObject2.required || schemaObject2.required.indexOf(propertyKey) === -1)) {
                        schemaObject1.required = schemaObject1.required.filter((p: string) => p !== propertyKey)
                    }
                }
            }
        }
        return new SchemaBuilder(schemaObject1, this.validationConfig) as any
    }

    /**
     * Overwrite all properties from the given schema into this one. If a property name is already used, the new type override the existing one.
     * This method only copy properties.
     */
    overwriteProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<Overwrite<T, T2>> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(`Schema Builder Error: 'overwriteProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        }
        let schemaObject1 = cloneJSON(this.schemaObject)
        let schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            schemaObject1.properties = schemaObject1.properties || {};
            for (let propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties)) {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey];
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || [];
                        schemaObject1.required.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey];
                    if (schemaObject1.required && schemaObject1.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required.filter((r: string) => r !== propertyKey)
                    }
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || [];
                        schemaObject1.required.push(propertyKey)
                    }
                }
            }
        }
        return new SchemaBuilder(schemaObject1, this.validationConfig) as any
    }

    /**
     * Extract a subschema of the current object schema
     */
    getSubschema<K extends keyof T>(propertyName: K) {
        if (!this.isSimpleObjectSchema || !this.schemaObject || typeof this.schemaObject === "boolean" || !this.schemaObject.properties) {
            throw new VError(`Schema Builder Error: 'extract' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`);
        } else {
            return new SchemaBuilder<T[K]>(this.schemaObject.properties[propertyName as string] as JSONSchema)
        }
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
     * change general schema attributes
     * 
     * @property schema
     */
    setSchemaAttributes(schema: Pick<JSONSchema, JSONSchemaGeneralProperties>): SchemaBuilder<{ [P in keyof T]: T[P] }> {
        let schemaObject = {
            ...cloneJSON(this.schemaObject),
            ...schema
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
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
            throw validationError(this.ajvList.errorsText(this.listValidationFunction.errors), this.listValidationFunction.errors)
        }
    }
    protected ajvList: any
    protected listValidationFunction: any;

    /**
     * Change the default Ajv configuration to use the given values. Any cached validation function is cleared.
     * The default validation config is { coerceTypes: true, removeAdditional: true, useDefaults: true }
     */
    configureValidation(validationConfig: Ajv.Options): this {
        this.validationConfig = validationConfig
        this.clearCache()
        return this
    }
    protected defaultValidationConfig = { coerceTypes: true, removeAdditional: true, useDefaults: true } as Ajv.Options;
    protected clearCache() {
        delete this.ajvList
        delete this.listValidationFunction
        delete this.ajv
        delete this.validationFunction
    }

    get ajvValidationConfig() {
        return {
            ...this.defaultValidationConfig,
            ...this.validationConfig
        }
    }

    /**
     * Explicitly cache the validation function for single objects with the current validation configuration
     */
    cacheValidationFunction() {
        // prepare validation function
        if (!this.validationFunction) {
            this.ajv = new Ajv(this.ajvValidationConfig);
            this.validationFunction = this.ajv.compile(this.schemaObject);
        }
    }
    /**
     * Explicitly cache the validation function for list of objects with the current validation configuration
     */
    cacheListValidationFunction() {
        // prepare validation function
        if (!this.listValidationFunction) {
            this.ajvList = new Ajv(this.ajvValidationConfig);
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
    readonly T: { [P in keyof T]: T[P] } = null as any
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
        const type = typeof schema
        if (schema == null || type != 'object') {
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
        if (schema.additionalProperties && typeof schema.additionalProperties !== "boolean") {
            throughJsonSchema(schema.additionalProperties, action)
        }
    }
    return schema
}

/**
 * Utility method to deep clone JSON objects
 */
function cloneJSON(o: any): any {
    if (typeof o !== "object" || o === null) {
        return o
    }
    if (Array.isArray(o)) {
        return o.map(cloneJSON)
    }
    let r = {} as any
    for (let key in o) {
        r[key] = cloneJSON(o[key])
    }
    return r
}

export type JSONSchemaArrayProperties = "description" | "default" | "maxItems" | "minItems" | "uniqueItems" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaStringProperties = "description" | "default" | "maxLength" | "minLength" | "pattern" | "format" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaNumberProperties = "description" | "default" | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaProperties = "description" | "default" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaObjectProperties = "title" | "description" | "maxProperties" | "minProperties" | "default" | "examples" | "readOnly" | "writeOnly";

export type JSONSchemaGeneralProperties = "title" | "description" | "default" | "examples";