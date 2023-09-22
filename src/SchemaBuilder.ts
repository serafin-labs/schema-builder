import Ajv, { Options } from "ajv"
import VError from "verror"
import * as _ from "lodash"
import addFormats from "ajv-formats"

import { JsonSchemaType } from "./JsonSchemaType.js"
import {
    Combine,
    DeepPartial,
    Merge,
    Overwrite,
    PartialProperties,
    Rename,
    RequiredProperties,
    TransformProperties,
    TransformPropertiesToArray,
    UnwrapArrayProperties,
    Nullable,
    OneOf,
    AllOf,
} from "./TransformationTypes"
import { JSONSchema, JSONSchemaTypeName } from "./JsonSchema.js"
import { throughJsonSchema, cloneJSON, setRequired } from "./utils.js"
import { createPropertyAccessor } from "./PropertyAccessor.js"

/**
 * Represents a JSON Schema and its type.
 */
export class SchemaBuilder<T> {
    /**
     * Get the JSON schema object
     */
    public get schema() {
        return this.schemaObject
    }

    /**
     * Initialize a new SchemaBuilder instance.
     * /!\ schemaObject must not contain references. If you have references, use something like json-schema-ref-parser library first.
     */
    constructor(protected schemaObject: JSONSchema, protected validationConfig?: Options) {
        throughJsonSchema(this.schemaObject, (s) => {
            if ("$ref" in s) {
                throw new VError(`Schema Builder Error: $ref can't be used to initialize a SchemaBuilder. Dereferenced the schema first.`)
            }
        })
    }

    /**
     * Function that take an inline JSON schema and deduces its type automatically!
     * The schema has to be provided as a literal using `as const`
     */
    static fromJsonSchema<S>(schema: S, validationConfig?: Options) {
        return new SchemaBuilder<JsonSchemaType<S>>(schema as any, validationConfig)
    }

    /**
     * Create an empty object schema
     * AdditionalProperties is automatically set to false
     */
    static emptySchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaObjectProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<{} | null> : SchemaBuilder<{}> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["object", "null"] : "object",
            additionalProperties: false,
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a string schema
     */
    static stringSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaStringProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<string | null> : SchemaBuilder<string> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["string", "null"] : "string",
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a number schema
     */
    static numberSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<number | null> : SchemaBuilder<number> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["number", "null"] : "number",
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create an integer schema
     */
    static integerSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {},
        nullable?: boolean,
    ): N extends true ? SchemaBuilder<number | null> : SchemaBuilder<number> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["integer", "null"] : "integer",
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a boolean schema
     */
    static booleanSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaBooleanProperties> = {},
        nullable?: boolean,
    ): N extends true ? SchemaBuilder<boolean | null> : SchemaBuilder<boolean> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["boolean", "null"] : "boolean",
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create an enum schema
     */
    static enumSchema<K extends string | number | boolean, N extends boolean = false>(
        values: readonly K[],
        schema: Pick<JSONSchema, JSONSchemaEnumProperties> = {},
        nullable?: boolean,
    ): N extends true ? SchemaBuilder<K | null> : SchemaBuilder<K> {
        const types = [] as JSONSchemaTypeName[]
        for (let value of values) {
            if (typeof value === "string" && !types.find((type) => type === "string")) {
                types.push("string")
            }
            if (typeof value === "boolean" && !types.find((type) => type === "boolean")) {
                types.push("boolean")
            }
            if (typeof value === "number" && !types.find((type) => type === "number")) {
                types.push("number")
            }
        }
        if (nullable) {
            types.push("null")
        }
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: types.length === 1 ? types[0] : types,
            enum: nullable ? [...values, null] : [...values],
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create an array schema
     */
    static arraySchema<U, N extends boolean = false>(
        items: SchemaBuilder<U>,
        schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {},
        nullable?: boolean,
    ): N extends true ? SchemaBuilder<U[] | null> : SchemaBuilder<U[]> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["array", "null"] : "array",
            items: cloneJSON(items.schemaObject),
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Return a schema builder which validate any one of the provided schemas exclusively. "oneOf" as described by JSON Schema specifications.
     */
    static oneOf<S extends SchemaBuilder<any>[]>(...schemaBuilders: S): SchemaBuilder<OneOf<S>> {
        return new SchemaBuilder<any>({
            oneOf: schemaBuilders.map((builder) => cloneJSON(builder.schemaObject)),
        })
    }

    /**
     * Return a schema builder which validate all the provided schemas. "allOf" as described by JSON Schema specifications.
     */
    static allOf<S extends SchemaBuilder<any>[]>(...schemaBuilders: S): SchemaBuilder<AllOf<S>> {
        return new SchemaBuilder<any>({
            allOf: schemaBuilders.map((builder) => cloneJSON(builder.schemaObject)),
        })
    }

    /**
     * Return a schema builder which validate any number the provided schemas. "anyOf" as described by JSON Schema specifications.
     */
    static anyOf<S extends SchemaBuilder<any>[]>(...schemaBuilders: S): SchemaBuilder<OneOf<S>> {
        return new SchemaBuilder<any>({
            anyOf: schemaBuilders.map((builder) => cloneJSON(builder.schemaObject)),
        })
    }

    /**
     * Return a schema builder which represents the negation of the given schema. The only type we can assume is "any". "not" as described by JSON Schema specifications.
     */
    static not(schemaBuilder: SchemaBuilder<any>) {
        return new SchemaBuilder<any>({
            not: cloneJSON(schemaBuilder.schemaObject),
        })
    }

    /**
     * Make given properties optionals
     */
    setOptionalProperties<K extends keyof T>(properties: readonly K[]): SchemaBuilder<{ [P in keyof PartialProperties<T, K>]: PartialProperties<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'setOptionalProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject = cloneJSON(this.schemaObject)
        const required = _.difference(schemaObject.required ?? [], properties as readonly string[])
        // clear default values for optional properties
        for (let optionalProperty of properties) {
            let property = schemaObject.properties?.[optionalProperty as string]
            if (property && typeof property !== "boolean") {
                delete property.default
            }
        }

        // delete required array if empty
        setRequired(schemaObject, required)
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make given properties required
     */
    setRequiredProperties<K extends keyof T>(properties: readonly K[]): SchemaBuilder<{ [P in keyof RequiredProperties<T, K>]: RequiredProperties<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'setRequiredProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
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
        [P in keyof T]?: T[P]
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
    toDeepOptionals(): SchemaBuilder<{ [P in keyof DeepPartial<T>]: DeepPartial<T>[P] }> {
        let schemaObject = cloneJSON(this.schemaObject)
        throughJsonSchema(schemaObject, (s) => {
            delete s.required
            // optional properties can't have default values
            delete s.default
        })
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make all optional properties of this schema nullable
     */
    toNullable(): SchemaBuilder<{ [P in keyof Nullable<T>]: Nullable<T>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'toNullable' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject = cloneJSON(this.schemaObject)
        let required = schemaObject.required || []
        for (let propertyName in schemaObject.properties) {
            if (required.indexOf(propertyName) === -1) {
                let propertyValue = schemaObject.properties[propertyName]
                if (typeof propertyValue !== "boolean" && "type" in propertyValue) {
                    if (Array.isArray(propertyValue.type) && propertyValue.type.indexOf("null") === -1) {
                        propertyValue.type = [...propertyValue.type, "null"]
                    } else if (typeof propertyValue.type === "string" && propertyValue.type !== "null") {
                        propertyValue.type = [propertyValue.type, "null"]
                    }
                    if ("enum" in propertyValue && propertyValue.enum?.indexOf(null) === -1) {
                        propertyValue.enum = [...propertyValue.enum, null]
                    }
                } else {
                    schemaObject.properties[propertyName] = {
                        anyOf: [schemaObject.properties[propertyName], { type: "null" }],
                    }
                }
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Add a property using the given schema builder
     */
    addProperty<U, K extends keyof any, REQUIRED extends boolean = true>(
        propertyName: K,
        schemaBuilder: SchemaBuilder<U>,
        isRequired?: REQUIRED,
    ): SchemaBuilder<{ [P in keyof Combine<T, U, K, REQUIRED, false>]: Combine<T, U, K, REQUIRED, false>[P] }> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only add properties to an object schema`)
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        if (propertyName in schemaObject.properties) {
            throw new VError(`Schema Builder Error: '${propertyName as string}' already exists in ${schemaObject.title || "this"} schema`)
        }
        schemaObject.properties[propertyName as string] = cloneJSON(schemaBuilder.schemaObject)
        if (isRequired === true || isRequired === undefined) {
            schemaObject.required = schemaObject.required || []
            schemaObject.required.push(propertyName as string)
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Replace an existing property of this schema
     */
    replaceProperty<U, K extends keyof T, REQUIRED extends boolean = true>(
        propertyName: K,
        schemaBuilderResolver: SchemaBuilder<U> | ((s: SchemaBuilder<T[K]>) => SchemaBuilder<U>),
        isRequired?: REQUIRED,
    ): SchemaBuilder<{ [P in keyof Combine<Omit<T, K>, U, K, REQUIRED, false>]: Combine<Omit<T, K>, U, K, REQUIRED, false>[P] }> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only replace properties of an object schema`)
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        if (schemaObject.required) {
            schemaObject.required = schemaObject.required.filter((p: string) => p !== propertyName)
        }
        const schemaBuilder = typeof schemaBuilderResolver === "function" ? schemaBuilderResolver(this.getSubschema(propertyName)) : schemaBuilderResolver
        schemaObject.properties[propertyName as string] = cloneJSON(schemaBuilder.schemaObject)
        if (isRequired === true || isRequired === undefined) {
            schemaObject.required = schemaObject.required || []
            schemaObject.required.push(propertyName as string)
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Add a property or replace it if it already exists using the given schema builder
     */
    addOrReplaceProperty<U, K extends keyof any, REQUIRED extends boolean = true>(
        propertyName: K,
        schemaBuilder: SchemaBuilder<U>,
        isRequired?: REQUIRED,
    ): SchemaBuilder<{ [P in keyof Combine<Omit<T, K>, U, K, REQUIRED, false>]: Combine<Omit<T, K>, U, K, REQUIRED, false>[P] }> {
        return this.replaceProperty(propertyName as any, schemaBuilder, isRequired) as any
    }

    /**
     * Add additional properties schema.
     * /!\ Many type operations can't work properly with index signatures. Try to use additionalProperties at the last step of your SchemaBuilder definition.
     * /!\ In typescript index signature MUST be compatible with other properties. However its supported in JSON schema, you can use it but you have to force the index singature to any.
     */
    addAdditionalProperties<U = any>(schemaBuilder?: SchemaBuilder<U>): SchemaBuilder<T & { [P: string]: U }> {
        if (this.schemaObject.additionalProperties) {
            throw new VError(`Schema Builder Error: additionalProperties is already set in ${this.schemaObject.title || "this"} schema.`)
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.additionalProperties = schemaBuilder ? cloneJSON(schemaBuilder.schemaObject) : true
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Add a string to the schema properties
     */
    addString<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        schema: Pick<JSONSchema, JSONSchemaStringProperties> = {},
        isRequired?: REQUIRED,
        nullable?: N,
    ): SchemaBuilder<{ [P in keyof Combine<T, string, K, REQUIRED, N>]: Combine<T, string, K, REQUIRED, N>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.stringSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add a string enum to the schema properties
     */
    addEnum<K extends keyof any, K2 extends string | boolean | number, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        values: readonly K2[],
        schema: Pick<JSONSchema, JSONSchemaEnumProperties> = {},
        isRequired?: REQUIRED,
        nullable?: N,
    ): SchemaBuilder<{ [P in keyof Combine<T, K2, K, REQUIRED, N>]: Combine<T, K2, K, REQUIRED, N>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.enumSchema(values, schema, nullable), isRequired) as any
    }

    /**
     * Add a number to the schema properties
     */
    addNumber<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {},
        isRequired?: REQUIRED,
        nullable?: N,
    ): SchemaBuilder<{ [P in keyof Combine<T, number, K, REQUIRED, N>]: Combine<T, number, K, REQUIRED, N>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.numberSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add an integer to the schema properties
     */
    addInteger<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {},
        isRequired?: REQUIRED,
        nullable?: N,
    ): SchemaBuilder<{ [P in keyof Combine<T, number, K, REQUIRED, N>]: Combine<T, number, K, REQUIRED, N>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.integerSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add a number to the schema properties
     */
    addBoolean<K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        schema: Pick<JSONSchema, JSONSchemaBooleanProperties> = {},
        isRequired?: REQUIRED,
        nullable?: N,
    ): SchemaBuilder<{ [P in keyof Combine<T, boolean, K, REQUIRED, N>]: Combine<T, boolean, K, REQUIRED, N>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.booleanSchema(schema, nullable), isRequired) as any
    }

    /**
     * Add an array of objects to the schema properties
     */
    addArray<U extends {}, K extends keyof any, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        items: SchemaBuilder<U>,
        schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {},
        isRequired?: REQUIRED,
        nullable?: N,
    ): SchemaBuilder<{ [P in keyof Combine<T, U[], K, REQUIRED, N>]: Combine<T, U[], K, REQUIRED, N>[P] }> {
        return this.addProperty(propertyName, SchemaBuilder.arraySchema(items, schema, nullable), isRequired) as any
    }

    /**
     * Rename the given property. The property schema remains unchanged.
     */
    renameProperty<K extends keyof T, K2 extends keyof any>(
        propertyName: K,
        newPropertyName: K2,
    ): SchemaBuilder<{ [P in keyof Rename<T, K, K2>]: Rename<T, K, K2>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'renameProperty' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
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
    pickProperties<K extends keyof T>(properties: readonly K[]): SchemaBuilder<{ [P in K]: T[P] }> {
        if (!this.isObjectSchema || this.hasSchemasCombinationKeywords) {
            throw new VError(`Schema Builder Error: 'pickProperties' can only be used with a simple object schema (no oneOf, anyOf, allOf or not)`)
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        let propertiesMap: any = {}
        for (let property of properties) {
            propertiesMap[property] = schemaObject.properties[property as string]
        }
        schemaObject.properties = propertiesMap
        if (schemaObject.required) {
            schemaObject.required = schemaObject.required.filter((r: string) => (properties as readonly string[]).indexOf(r) !== -1)
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
     * @param additionalProperties [] means no additional properties are kept in the result. undefined means additionalProperties is kept or set to true if it was not set to false. ['aProperty'] allows you to capture only specific names that conform to additionalProperties type.
     */
    pickAdditionalProperties<K extends keyof T, K2 extends keyof T = any>(
        properties: readonly K[],
        additionalProperties?: readonly K2[],
    ): SchemaBuilder<Pick<T, K> & { [P in K2]: T[P] }> {
        if (!this.isObjectSchema || !this.hasAdditionalProperties || this.hasSchemasCombinationKeywords) {
            throw new VError(
                `Schema Builder Error: 'pickPropertiesIncludingAdditonalProperties' can only be used with a simple object schema with additionalProperties (no oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject = cloneJSON(this.schemaObject)
        let additionalProps = schemaObject.additionalProperties
        schemaObject.properties = schemaObject.properties || {}
        let propertiesMap: {
            [key: string]: boolean | JSONSchema
        } = {}
        for (let property of properties) {
            propertiesMap[property as string] = schemaObject.properties[property as string]
        }
        schemaObject.properties = propertiesMap
        if (schemaObject.required) {
            schemaObject.required = schemaObject.required.filter((r: string) => (properties as readonly string[]).indexOf(r) !== -1)
        }
        if (Array.isArray(schemaObject.required) && schemaObject.required.length === 0) {
            delete schemaObject.required
        }
        if (!additionalProperties) {
            schemaObject.additionalProperties = additionalProps ? additionalProps : true
        } else if (Array.isArray(additionalProperties) && additionalProperties.length === 0) {
            schemaObject.additionalProperties = false
        } else {
            schemaObject.additionalProperties = false
            schemaObject.required = schemaObject.required || []
            if (additionalProps) {
                for (let additionalProperty of additionalProperties) {
                    schemaObject.properties[additionalProperty] = typeof additionalProps === "boolean" ? {} : cloneJSON(additionalProps)
                    schemaObject.required.push(additionalProperty)
                }
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Filter the schema to contains everything except the given properties.
     */
    omitProperties<K extends keyof T>(properties: readonly K[]): SchemaBuilder<{ [P in keyof Omit<T, K>]: Omit<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'omitProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let p = Object.keys(this.schemaObject.properties || {}).filter((k) => (properties as readonly string[]).indexOf(k) === -1)
        return this.pickProperties(p as any)
    }

    /**
     * Transform properties to accept an alternative type. additionalProperties is set false.
     *
     * @param changedProperties properties that will have the alternative type
     * @param schemaBuilder
     */
    transformProperties<U, K extends keyof T>(
        schemaBuilder: SchemaBuilder<U>,
        propertyNames?: readonly K[],
    ): SchemaBuilder<{ [P in keyof TransformProperties<T, K, U>]: TransformProperties<T, K, U>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'transformProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        propertyNames = propertyNames || (Object.keys(schemaObject.properties) as K[])
        for (let property of propertyNames) {
            let propertySchema = schemaObject.properties[property as string]
            schemaObject.properties[property as string] = {
                oneOf: [propertySchema, cloneJSON(schemaBuilder.schemaObject)],
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Transform the given properties to make them alternatively an array of the initial type.
     * If the property is already an Array nothing happen.
     *
     * @param propertyNames properties that will have the alternative array type
     * @param schema Array schema options to add to the transformed properties
     */
    transformPropertiesToArray<K extends keyof T>(
        propertyNames?: readonly K[],
        schema: Pick<JSONSchema, JSONSchemaArraySpecificProperties> = {},
    ): SchemaBuilder<{ [P in keyof TransformPropertiesToArray<T, K>]: TransformPropertiesToArray<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'transformPropertiesToArray' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        propertyNames = propertyNames || (Object.keys(schemaObject.properties) as K[])
        for (let property of propertyNames) {
            let propertySchema = schemaObject.properties[property as string]
            // Transform the property if it's not an array
            if ((propertySchema as JSONSchema).type !== "array") {
                schemaObject.properties[property as string] = {
                    oneOf: [propertySchema, { type: "array", items: cloneJSON(propertySchema), ...schema }],
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
    unwrapArrayProperties<K extends keyof T>(
        propertyNames?: readonly K[],
    ): SchemaBuilder<{ [P in keyof UnwrapArrayProperties<T, K>]: UnwrapArrayProperties<T, K>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'unwrapArrayProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject = cloneJSON(this.schemaObject)
        schemaObject.properties = schemaObject.properties || {}
        propertyNames = propertyNames || (Object.keys(schemaObject.properties) as K[])
        for (let property of propertyNames) {
            let propertySchema = schemaObject.properties[property as string]
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
                    oneOf: [cloneJSON(itemsSchema), propertySchema],
                }
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a allOf statement is used.
     * This method only copy properties.
     */
    intersectProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof (T & T2)]: (T & T2)[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'intersectProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject1 = cloneJSON(this.schemaObject)
        let schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            schemaObject1.properties = schemaObject1.properties || {}
            for (let propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties)) {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || []
                        schemaObject1.required.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties[propertyKey] = {
                        allOf: [schemaObject1.properties[propertyKey], schemaObject2.properties[propertyKey]],
                    }
                    if (
                        schemaObject2.required &&
                        schemaObject2.required.indexOf(propertyKey) !== -1 &&
                        (!schemaObject1.required || schemaObject1.required.indexOf(propertyKey) === -1)
                    ) {
                        schemaObject1.required = schemaObject1.required || []
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
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof Merge<T, T2>]: Merge<T, T2>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'mergeProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject1 = cloneJSON(this.schemaObject)
        let schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            schemaObject1.properties = schemaObject1.properties || {}
            for (let propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties)) {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || []
                        schemaObject1.required.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties[propertyKey] = {
                        anyOf: [schemaObject1.properties[propertyKey], schemaObject2.properties[propertyKey]],
                    }
                    if (
                        schemaObject1.required &&
                        schemaObject1.required.indexOf(propertyKey) !== -1 &&
                        (!schemaObject2.required || schemaObject2.required.indexOf(propertyKey) === -1)
                    ) {
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
    overwriteProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof Overwrite<T, T2>]: Overwrite<T, T2>[P] }> {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: 'overwriteProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
        let schemaObject1 = cloneJSON(this.schemaObject)
        let schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            schemaObject1.properties = schemaObject1.properties || {}
            for (let propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties)) {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || []
                        schemaObject1.required.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties[propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject1.required && schemaObject1.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required.filter((r: string) => r !== propertyKey)
                    }
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required || []
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
            throw new VError(
                `Schema Builder Error: 'getSubschema' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        } else {
            return new SchemaBuilder<T[K]>(this.schemaObject.properties[propertyName as string] as JSONSchema)
        }
    }

    /**
     * Extract the item schema of the current array schema
     */
    getItemsSubschema() {
        if (!this.schemaObject || this.schemaObject.type !== "array" || !this.schemaObject.items || Array.isArray(this.schemaObject.items)) {
            throw new VError(`Schema Builder Error: 'getItemsSubschema' can only be used with an array schema with non-array items`)
        } else {
            return new SchemaBuilder<T extends Array<infer ITEMS> ? ITEMS : never>(this.schemaObject.items as JSONSchema)
        }
    }

    /**
     * Build a property accessor starting from this schema type
     * @returns a property accessor for the type represented by the schema
     */
    getPropertyAccessor() {
        return createPropertyAccessor(this as SchemaBuilder<T>)
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
     * true if the schema represent an array
     */
    get isArraySchema() {
        return this.schemaObject.type === "array" && !("properties" in this.schemaObject)
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

    get properties(): string[] | null {
        if (this.isObjectSchema && !this.hasSchemasCombinationKeywords) {
            return Object.keys(this.schemaObject.properties || {})
        }
        return null
    }

    get requiredProperties(): string[] | null {
        if (this.isObjectSchema && !this.hasSchemasCombinationKeywords) {
            return this.schemaObject.required ? [...this.schemaObject.required] : []
        }
        return null
    }

    get optionalProperties(): string[] | null {
        const properties = this.properties
        const required = this.requiredProperties
        return properties ? properties.filter((property) => required && required.indexOf(property) === -1) : null
    }

    /**
     * change general schema attributes
     *
     * @property schema
     */
    setSchemaAttributes(schema: Pick<JSONSchema, JSONSchemaGeneralProperties>): SchemaBuilder<{ [P in keyof T]: T[P] }> {
        let schemaObject = {
            ...cloneJSON(this.schemaObject),
            ...schema,
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
        let valid = this.validationFunction(o)
        // check if an error needs to be thrown
        if (!valid) {
            throw validationError(this.ajv.errorsText(this.validationFunction.errors), this.validationFunction.errors)
        }
    }
    protected ajv: any
    protected validationFunction: any

    /**
     * Validate the given list of object against the schema. If any object is invalid, an error is thrown with the appropriate details.
     */
    validateList(list: T[]) {
        // ensure validation function is cached
        this.cacheListValidationFunction()
        // run validation
        let valid = this.listValidationFunction(list)
        // check if an error needs to be thrown
        if (!valid) {
            throw validationError(this.ajvList.errorsText(this.listValidationFunction.errors), this.listValidationFunction.errors)
        }
    }
    protected ajvList: any
    protected listValidationFunction: any

    /**
     * Change the default Ajv configuration to use the given values.
     * The default validation config is { coerceTypes: false, removeAdditional: false, useDefaults: true }
     */
    configureValidation(validationConfig: Options) {
        return new SchemaBuilder<T>(cloneJSON(this.schemaObject), validationConfig)
    }
    protected defaultValidationConfig = {
        coerceTypes: false,
        removeAdditional: false,
        useDefaults: true,
        strict: false,
    } as Options

    get ajvValidationConfig() {
        return {
            ...this.defaultValidationConfig,
            ...this.validationConfig,
        }
    }

    /**
     * Explicitly cache the validation function for single objects with the current validation configuration
     */
    cacheValidationFunction() {
        // prepare validation function
        if (!this.validationFunction) {
            this.ajv = new Ajv(this.ajvValidationConfig)
            addFormats(this.ajv)
            this.validationFunction = this.ajv.compile(this.schemaObject)
        }
    }
    /**
     * Explicitly cache the validation function for list of objects with the current validation configuration
     */
    cacheListValidationFunction() {
        // prepare validation function
        if (!this.listValidationFunction) {
            this.ajvList = new Ajv(this.ajvValidationConfig)
            addFormats(this.ajvList)
            this.ajvList.addSchema(this.schemaObject, "schema")
            this.listValidationFunction = this.ajvList.compile({
                type: "array",
                items: { $ref: "schema" },
                minItems: 1,
            })
        }
    }

    /**
     * This property makes the access to the underlying T type easy.
     * You can do things like type MyModel = typeof myModelSchemaBuilder.T
     * Or use GenericType["T"] in a generic type definition.
     * It's not supposed to be set or accessed
     */
    readonly T: T = null as any
}

function validationError(ajvErrorsText: string, errorsDetails: any) {
    let opt: any = {
        name: "SerafinSchemaValidationError",
        info: {
            ajvErrors: errorsDetails,
        },
    }
    return new VError(opt, `Invalid parameters: ${ajvErrorsText}`)
}

export type JSONSchemaCommonProperties = "title" | "description" | "default" | "examples" | "readOnly" | "writeOnly"

export type JSONSchemaArraySpecificProperties = "maxItems" | "minItems" | "uniqueItems"

export type JSONSchemaArrayProperties = JSONSchemaCommonProperties | JSONSchemaArraySpecificProperties

export type JSONSchemaStringProperties = JSONSchemaCommonProperties | "maxLength" | "minLength" | "pattern" | "format"

export type JSONSchemaNumberProperties = JSONSchemaCommonProperties | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum"

export type JSONSchemaEnumProperties = JSONSchemaCommonProperties

export type JSONSchemaBooleanProperties = JSONSchemaCommonProperties

export type JSONSchemaObjectProperties = JSONSchemaCommonProperties | "maxProperties" | "minProperties"

export type JSONSchemaGeneralProperties = JSONSchemaCommonProperties
