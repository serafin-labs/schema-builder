import Ajv from "ajv/dist/2020.js"
import type { Options, ValidateFunction } from "ajv"
import VError from "verror"
import _ from "lodash"
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
    TupleOfWithRest,
    ObjectSchemaDefinition,
} from "./TransformationTypes.js"
import { JSONSchema, JSONSchemaTypeName } from "./JsonSchema.js"
import { cloneJSON, cloneRoot, setRequired } from "./utils.js"
import { walkJsonSchema } from "./walkJsonSchema.js"
import { createPropertyAccessor } from "./PropertyAccessor.js"
import { schemaToTypescript } from "./schemaToTypescript.js"

/**
 * Represents a JSON Schema and its type.
 */
export class SchemaBuilder<T> {
    private static globalAJVConfig: Options = {
        coerceTypes: false,
        removeAdditional: false,
        useDefaults: true,
        strict: false,
        allErrors: true,
    }
    private static globalAJVConfigVersionNumber = 0
    private localValidationFunctionVersionNumber: number = 0

    /**
     * Sets the global validation configuration for the schema builder.
     * This method merges the provided configuration with the existing global configuration
     * Will invalidate all the existing cached validation functions.
     */
    static setGlobalValidationConfig(config: Options) {
        this.globalAJVConfig = { ...this.globalAJVConfig, ...config }
        this.globalAJVConfigVersionNumber++
    }
    static get globalAJVValidationConfig() {
        return this.globalAJVConfig
    }

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
    constructor(
        protected schemaObject: JSONSchema,
        protected validationConfig?: Options,
    ) {
        walkJsonSchema(this.schemaObject, (s) => {
            if ("$ref" in s || "$dynamicRef" in s) {
                throw new VError(`Schema Builder Error: $ref / $dynamicRef can't be used to initialize a SchemaBuilder. Dereferenced the schema first.`)
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
     * Create the schema of an object with its properties. Takes a map of properties to their schema with optional properties surrounded by brackets.
     * @example: {
     *   s: SB.stringSchema(),
     *   b: [SB.booleanSchema(), undefined]
     * }
     * => outputs type {
     *   s: string,
     *   b?: boolean
     * }
     */
    static objectSchema<P extends { [k: string]: SchemaBuilder<any> | (SchemaBuilder<any> | undefined)[] }, N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaObjectProperties>,
        propertiesDefinition: P,
        nullable?: N,
    ): N extends true ? SchemaBuilder<ObjectSchemaDefinition<P> | null> : SchemaBuilder<ObjectSchemaDefinition<P>> {
        const { properties, required } = SchemaBuilder.buildPropertiesAndRequired(propertiesDefinition)
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["object", "null"] : "object",
            ...(Object.keys(properties).length ? { properties } : {}),
            ...(required.length > 0 ? { required } : {}),
            additionalProperties: false,
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Internal helper shared by `objectSchema` and `addProperties` to translate a
     * property-definition map into a `{ properties, required }` pair.
     * A property is marked required unless its definition is an array that
     * contains `undefined` (e.g. `[SB.stringSchema(), undefined]`).
     */
    private static buildPropertiesAndRequired<P extends { [k: string]: SchemaBuilder<any> | (SchemaBuilder<any> | undefined)[] }>(
        propertiesDefinition: P,
    ): { properties: NonNullable<JSONSchema["properties"]>; required: string[] } {
        const properties: NonNullable<JSONSchema["properties"]> = {}
        const required: string[] = []
        for (const propertyName in propertiesDefinition) {
            const definition = propertiesDefinition[propertyName]
            const isRequired = !Array.isArray(definition) || definition.findIndex((e) => e === undefined) === -1
            if (isRequired) {
                required.push(propertyName)
            }
            const filtered = Array.isArray(definition) ? definition.filter(<V>(v: V): v is NonNullable<V> => !!v) : definition
            properties[propertyName] = Array.isArray(filtered)
                ? filtered.length === 1 && filtered[0]
                    ? cloneJSON(filtered[0].schemaObject)
                    : { anyOf: filtered.map((builder) => cloneJSON((builder as SchemaBuilder<any>).schemaObject)) }
                : cloneJSON(filtered.schemaObject)
        }
        return { properties, required }
    }

    /**
     * Internal helper for building a primitive-typed schema with an optional `null` union.
     */
    private static primitiveSchema(primitiveType: JSONSchemaTypeName, schema: object, nullable: boolean | undefined): SchemaBuilder<any> {
        return new SchemaBuilder({
            ...cloneJSON(schema),
            type: nullable ? [primitiveType, "null"] : primitiveType,
        })
    }

    /**
     * Create a string schema
     */
    static stringSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaStringProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<string | null> : SchemaBuilder<string> {
        return SchemaBuilder.primitiveSchema("string", schema, nullable) as any
    }

    /**
     * Create a number schema
     */
    static numberSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<number | null> : SchemaBuilder<number> {
        return SchemaBuilder.primitiveSchema("number", schema, nullable) as any
    }

    /**
     * Create an integer schema
     */
    static integerSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaNumberProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<number | null> : SchemaBuilder<number> {
        return SchemaBuilder.primitiveSchema("integer", schema, nullable) as any
    }

    /**
     * Create a boolean schema
     */
    static booleanSchema<N extends boolean = false>(
        schema: Pick<JSONSchema, JSONSchemaBooleanProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<boolean | null> : SchemaBuilder<boolean> {
        return SchemaBuilder.primitiveSchema("boolean", schema, nullable) as any
    }

    /**
     * Create a null schema
     */
    static nullSchema(schema: Pick<JSONSchema, JSONSchemaCommonProperties> = {}): SchemaBuilder<null> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: "null",
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a schema that can represent any value
     */
    static anySchema(schema: Pick<JSONSchema, JSONSchemaCommonProperties> = {}): SchemaBuilder<any> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a schema that no value can satisfy. Useful when narrowing a union type
     * to an impossible branch.
     */
    static neverSchema(schema: Pick<JSONSchema, JSONSchemaCommonProperties> = {}): SchemaBuilder<never> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: [],
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create an enum schema
     * For array values, using "as const" make the typing a literal union if narrowing type is wanted.
     */
    static enumSchema<K extends string | number | boolean | null, N extends boolean = false>(
        values: K | readonly K[],
        schema: Pick<JSONSchema, JSONSchemaCommonProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<K | null> : SchemaBuilder<K> {
        const valuesArray = Array.isArray(values) ? values : [values]
        const types = new Set<JSONSchemaTypeName>()
        for (const value of valuesArray) {
            if (value === null) {
                types.add("null")
            } else if (typeof value === "string") {
                types.add("string")
            } else if (typeof value === "boolean") {
                types.add("boolean")
            } else if (typeof value === "number") {
                types.add("number")
            }
        }
        if (nullable) {
            types.add("null")
        }
        const typesArray = [...types]
        const enumIncludesNull = valuesArray.findIndex((v) => v === null) !== -1
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: typesArray.length === 1 ? typesArray[0] : typesArray,
            enum: nullable && !enumIncludesNull ? [...valuesArray, null] : [...valuesArray],
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a constant schema. Useful for narrowing types.
     */
    static constSchema<K extends string | number | boolean | null>(value: K, schema: Pick<JSONSchema, JSONSchemaCommonProperties> = {}): SchemaBuilder<K> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            const: value,
        }

        return new SchemaBuilder(s) as any
    }

    /**
     * Create an array schema
     */
    static arraySchema<U, N extends boolean = false>(
        items: SchemaBuilder<U>,
        schema: Pick<JSONSchema, JSONSchemaArrayProperties> = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<U[] | null> : SchemaBuilder<U[]> {
        let s: JSONSchema = {
            ...cloneJSON(schema),
            type: nullable ? ["array", "null"] : "array",
            items: cloneJSON(items.schemaObject),
        }
        return new SchemaBuilder(s) as any
    }

    /**
     * Create a tuple schema (fixed prefix of positionally-typed items).
     *
     * Emits `prefixItems` for the positional schemas and `minItems` equal to the prefix
     * length so all positional items must be present. By default the tuple is closed
     * (`items: false`); pass `schema.rest` to allow additional items of a given type,
     * which yields a TypeScript `[T1, T2, ...R[]]` tuple.
     */
    static tupleSchema<S extends readonly SchemaBuilder<any>[], R = never, N extends boolean = false>(
        items: readonly [...S],
        schema: Pick<JSONSchema, JSONSchemaTupleProperties> & { rest?: SchemaBuilder<R> } = {},
        nullable?: N,
    ): N extends true ? SchemaBuilder<TupleOfWithRest<S, R> | null> : SchemaBuilder<TupleOfWithRest<S, R>> {
        const { rest, ...rawSchema } = schema
        let s: JSONSchema = {
            ...cloneJSON(rawSchema),
            type: nullable ? ["array", "null"] : "array",
            prefixItems: items.map((item) => cloneJSON(item.schemaObject)),
            items: rest ? cloneJSON(rest.schemaObject) : false,
            minItems: items.length,
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
     * Build a `oneOf` over object variants tagged by a literal discriminator property.
     *
     * For each `[tag, builder]` entry, the resulting variant schema has `propertyName` injected as a
     * `const: tag` and added to `required`. The combined schema carries an OpenAPI `discriminator`
     * keyword (`{ propertyName, mapping? }`). The TypeScript type is a discriminated union, narrowable on `propertyName`.
     *
     * Each variant must be an object schema; passing a non-object schema throws.
     */
    static oneOfDiscriminated<P extends string, M extends { [tag: string]: SchemaBuilder<object> }>(
        propertyName: P,
        variants: M,
    ): SchemaBuilder<
        {
            [K in keyof M & string]: M[K] extends SchemaBuilder<infer V> ? V & { [Q in P]: K } : never
        }[keyof M & string]
    > {
        const oneOfSchemas: JSONSchema[] = []
        for (const tag of Object.keys(variants)) {
            const builder = variants[tag]
            if (!builder.isObjectSchema) {
                throw new VError(`Schema Builder Error: 'oneOfDiscriminated' variant '${tag}' is not an object schema`)
            }
            const variantSchema = cloneJSON(builder.schemaObject)
            variantSchema.properties = {
                ...(variantSchema.properties ?? {}),
                [propertyName]: { const: tag },
            }
            variantSchema.required = [...(variantSchema.required ?? []), propertyName]
            oneOfSchemas.push(variantSchema)
        }
        const discriminator: NonNullable<JSONSchema["discriminator"]> = { propertyName }
        return new SchemaBuilder<any>({
            oneOf: oneOfSchemas,
            discriminator,
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
     * Return a schema builder using `if`/`then`/`else` to switch between two type alternatives.
     * The value must satisfy `thenBuilder` when `ifBuilder` matches, and `elseBuilder` otherwise.
     *
     * The resulting type is `Th | El`. Note that TypeScript cannot reason about JSON-Schema validation
     * outcomes, so the union may include alternatives that are actually unreachable at runtime (for
     * example when `if` and `then` describe disjoint shapes).
     */
    static ifThenElse<Th, El>(ifBuilder: SchemaBuilder<any>, thenBuilder: SchemaBuilder<Th>, elseBuilder: SchemaBuilder<El>): SchemaBuilder<Th | El> {
        return new SchemaBuilder<any>({
            if: cloneJSON(ifBuilder.schemaObject),
            then: cloneJSON(thenBuilder.schemaObject),
            else: cloneJSON(elseBuilder.schemaObject),
        })
    }

    /**
     * Make given properties optionals
     */
    setOptionalProperties<K extends keyof T>(properties: readonly K[]): SchemaBuilder<{ [P in keyof PartialProperties<T, K>]: PartialProperties<T, K>[P] }> {
        this.assertSimpleObjectSchema("setOptionalProperties")
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        const required = _.difference(this.schemaObject.required ?? [], properties as readonly string[])
        // clear default values for optional properties
        for (const optionalProperty of properties) {
            const property = schemaObject.properties?.[optionalProperty as string]
            if (property && typeof property !== "boolean") {
                const cloned = { ...property }
                delete cloned.default
                schemaObject.properties![optionalProperty as string] = cloned
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
        this.assertSimpleObjectSchema("setRequiredProperties")
        const schemaObject = cloneRoot(this.schemaObject)
        if (properties.length > 0) {
            const required = [...(schemaObject.required ?? [])]
            for (const property of properties) {
                if (required.indexOf(property as string) === -1) {
                    required.push(property as string)
                }
            }
            schemaObject.required = required
        }
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make all properties optionals and remove their default values
     */
    toOptionals(): SchemaBuilder<{
        [P in keyof T]?: T[P]
    }> {
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        delete schemaObject.required
        // remove default values for optional properties
        for (const property in schemaObject.properties) {
            const inner = schemaObject.properties[property]
            if (inner && typeof inner !== "boolean") {
                const cloned = { ...inner }
                delete cloned.default
                schemaObject.properties[property] = cloned
            }
        }
        return new SchemaBuilder(schemaObject, this.validationConfig)
    }

    /**
     * Make all properties and subproperties optionals
     * Remove all default values
     */
    toDeepOptionals(): SchemaBuilder<{ [P in keyof DeepPartial<T>]: DeepPartial<T>[P] }> {
        let schemaObject = cloneJSON(this.schemaObject)
        walkJsonSchema(schemaObject, (s) => {
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
        this.assertSimpleObjectSchema("toNullable")
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        const required = schemaObject.required || []
        for (const propertyName in schemaObject.properties) {
            if (required.indexOf(propertyName) === -1) {
                const propertyValue = schemaObject.properties[propertyName]
                if (typeof propertyValue !== "boolean" && "type" in propertyValue) {
                    const cloned: JSONSchema = { ...propertyValue }
                    if (Array.isArray(cloned.type) && cloned.type.indexOf("null") === -1) {
                        cloned.type = [...cloned.type, "null"]
                    } else if (typeof cloned.type === "string" && cloned.type !== "null") {
                        cloned.type = [cloned.type, "null"]
                    }
                    if ("enum" in cloned && cloned.enum?.indexOf(null) === -1) {
                        cloned.enum = [...cloned.enum, null]
                    }
                    schemaObject.properties[propertyName] = cloned
                } else {
                    schemaObject.properties[propertyName] = {
                        anyOf: [propertyValue, { type: "null" }],
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
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        if (propertyName in schemaObject.properties!) {
            throw new VError(`Schema Builder Error: '${propertyName as string}' already exists in ${schemaObject.title || "this"} schema`)
        }
        schemaObject.properties![propertyName as string] = cloneJSON(schemaBuilder.schemaObject)
        if (isRequired === true || isRequired === undefined) {
            schemaObject.required = [...(schemaObject.required ?? []), propertyName as string]
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Replace an existing property of this schema.
     * Throws if `propertyName` is not declared on the current schema — use
     * `addOrReplaceProperty` if you need either-or semantics.
     */
    replaceProperty<U, K extends keyof T, REQUIRED extends boolean = true>(
        propertyName: K,
        schemaBuilderResolver: SchemaBuilder<U> | ((s: SchemaBuilder<T[K]>) => SchemaBuilder<U>),
        isRequired?: REQUIRED,
    ): SchemaBuilder<{ [P in keyof Combine<Omit<T, K>, U, K, REQUIRED, false>]: Combine<Omit<T, K>, U, K, REQUIRED, false>[P] }> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only replace properties of an object schema`)
        }
        const propertyKey = propertyName as string
        if (!this.schemaObject.properties || !(propertyKey in this.schemaObject.properties)) {
            throw new VError(
                `Schema Builder Error: 'replaceProperty' called with unknown property '${propertyKey}' on ${this.schemaObject.title || "this"} schema`,
            )
        }
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        if (schemaObject.required) {
            schemaObject.required = schemaObject.required.filter((p: string) => p !== propertyName)
        }
        const schemaBuilder = typeof schemaBuilderResolver === "function" ? schemaBuilderResolver(this.getSubschema(propertyName)) : schemaBuilderResolver
        schemaObject.properties![propertyKey] = cloneJSON(schemaBuilder.schemaObject)
        if (isRequired === true || isRequired === undefined) {
            schemaObject.required = [...(schemaObject.required ?? []), propertyKey]
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
        const exists = !!this.schemaObject.properties && (propertyName as string) in this.schemaObject.properties
        return exists
            ? (this.replaceProperty(propertyName as any, schemaBuilder, isRequired) as any)
            : (this.addProperty(propertyName, schemaBuilder, isRequired) as any)
    }

    /**
     * Add additional properties schema.
     * /!\ Many type operations can't work properly with index signatures. Try to use additionalProperties at the last step of your SchemaBuilder definition.
     * /!\ In typescript index signature MUST be compatible with other properties. However its supported in JSON schema, you can use it but you have to force the index signature to any.
     */
    addAdditionalProperties<U = any>(schemaBuilder?: SchemaBuilder<U>): SchemaBuilder<T & { [P: string]: U }> {
        if (this.schemaObject.additionalProperties) {
            throw new VError(`Schema Builder Error: additionalProperties is already set in ${this.schemaObject.title || "this"} schema.`)
        }
        const schemaObject = cloneRoot(this.schemaObject)
        schemaObject.additionalProperties = schemaBuilder ? cloneJSON(schemaBuilder.schemaObject) : true
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Add pattern properties to schema.
     */
    addPatternProperty<U = any, PPK extends string = "", SPK extends string = "">(
        prefixPattern: PPK,
        suffixPattern: SPK,
        schemaBuilder: SchemaBuilder<U> | true = true,
    ): SchemaBuilder<{ [Key in keyof T | `${PPK}${string}${SPK}`]: Key extends keyof T ? T[Key] : U }> {
        const newPatternKey = `^${prefixPattern}.*${suffixPattern}$`
        const schemaObject = cloneRoot(this.schemaObject, { patternProperties: {} })
        schemaObject.patternProperties![newPatternKey] = schemaBuilder === true ? true : cloneJSON(schemaBuilder.schemaObject)
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Add multiple properties to the schema using the same kind of definition as `objectSchema` static method
     */
    addProperties<P extends { [k: string]: SchemaBuilder<any> | (SchemaBuilder<any> | undefined)[] }>(
        propertiesDefinition: P,
    ): SchemaBuilder<{ [K in keyof (T & ObjectSchemaDefinition<P>)]: (T & ObjectSchemaDefinition<P>)[K] }> {
        if (!this.isObjectSchema) {
            throw new VError(`Schema Builder Error: you can only add properties to an object schema`)
        }
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        const propertiesIntersection = _.intersection(Object.keys(schemaObject.properties!), Object.keys(propertiesDefinition))
        if (propertiesIntersection.length) {
            throw new VError(`Schema Builder Error: '${propertiesIntersection.join(", ")}' already exists in ${schemaObject.title || "this"} schema`)
        }
        const { properties: newProperties, required: newRequired } = SchemaBuilder.buildPropertiesAndRequired(propertiesDefinition)
        Object.assign(schemaObject.properties!, newProperties)
        if (newRequired.length > 0) {
            schemaObject.required = [...(schemaObject.required ?? []), ...newRequired]
        }
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
     * Add an enum to the schema properties
     */
    addEnum<K extends keyof any, K2 extends string | boolean | number | null, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        values: readonly K2[],
        schema: Pick<JSONSchema, JSONSchemaCommonProperties> = {},
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
     * Add a tuple (fixed prefix of positionally-typed items) to the schema properties.
     * Pass `schema.rest` to allow additional items of a given type, yielding a
     * `[T1, T2, ...R[]]` TypeScript tuple.
     */
    addTuple<S extends readonly SchemaBuilder<any>[], R = never, K extends keyof any = string, REQUIRED extends boolean = true, N extends boolean = false>(
        propertyName: K,
        items: readonly [...S],
        schema: Pick<JSONSchema, JSONSchemaTupleProperties> & { rest?: SchemaBuilder<R> } = {},
        isRequired?: REQUIRED,
        nullable?: N,
    ): SchemaBuilder<{
        [P in keyof Combine<T, TupleOfWithRest<S, R>, K, REQUIRED, N>]: Combine<T, TupleOfWithRest<S, R>, K, REQUIRED, N>[P]
    }> {
        return this.addProperty(propertyName, SchemaBuilder.tupleSchema(items, schema, nullable), isRequired) as any
    }

    /**
     * Rename the given property. The property schema remains unchanged.
     */
    renameProperty<K extends keyof T, K2 extends keyof any>(
        propertyName: K,
        newPropertyName: K2,
    ): SchemaBuilder<{ [P in keyof Rename<T, K, K2>]: Rename<T, K, K2>[P] }> {
        this.assertSimpleObjectSchema("renameProperty")
        const source = propertyName as string
        const target = newPropertyName as string
        if (source === target) {
            throw new VError(`Schema Builder Error: 'renameProperty' source and target are both '${source}' on ${this.schemaObject.title || "this"} schema`)
        }
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        if (!(source in schemaObject.properties!)) {
            throw new VError(`Schema Builder Error: 'renameProperty' called with unknown property '${source}' on ${schemaObject.title || "this"} schema`)
        }
        if (target in schemaObject.properties!) {
            throw new VError(`Schema Builder Error: 'renameProperty' target '${target}' already exists in ${schemaObject.title || "this"} schema`)
        }
        schemaObject.properties![target] = schemaObject.properties![source]
        delete schemaObject.properties![source]
        if (schemaObject.required && schemaObject.required.indexOf(source) !== -1) {
            schemaObject.required = schemaObject.required.filter((p: string) => p !== source).concat(target)
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
        const schemaObject = cloneRoot(this.schemaObject)
        const sourceProperties = this.schemaObject.properties || {}
        const propertiesMap: any = {}
        for (const property of properties) {
            propertiesMap[property] = sourceProperties[property as string]
        }
        schemaObject.properties = propertiesMap
        if (this.schemaObject.required) {
            const filtered = this.schemaObject.required.filter((r: string) => (properties as readonly string[]).indexOf(r) !== -1)
            if (filtered.length > 0) {
                schemaObject.required = filtered
            } else {
                delete schemaObject.required
            }
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
    pickAdditionalProperties<K extends keyof T, K2 extends keyof T & string = any>(
        properties: readonly K[],
        additionalProperties?: readonly K2[],
    ): SchemaBuilder<Pick<T, K> & { [P in K2]: T[P] }> {
        if (!this.isObjectSchema || !this.hasAdditionalProperties || this.hasSchemasCombinationKeywords) {
            throw new VError(
                `Schema Builder Error: 'pickAdditionalProperties' can only be used with a simple object schema with additionalProperties (no oneOf, anyOf, allOf or not)`,
            )
        }
        const schemaObject = cloneRoot(this.schemaObject)
        const additionalProps = this.schemaObject.additionalProperties
        const sourceProperties = this.schemaObject.properties || {}
        const propertiesMap: { [key: string]: boolean | JSONSchema } = {}
        for (const property of properties) {
            propertiesMap[property as string] = sourceProperties[property as string]
        }
        schemaObject.properties = propertiesMap
        let requiredArr: string[] | undefined
        if (this.schemaObject.required) {
            const filtered = this.schemaObject.required.filter((r: string) => (properties as readonly string[]).indexOf(r) !== -1)
            requiredArr = filtered.length > 0 ? filtered : undefined
        }
        if (!additionalProperties) {
            schemaObject.additionalProperties = additionalProps ? additionalProps : true
        } else if (Array.isArray(additionalProperties) && additionalProperties.length === 0) {
            schemaObject.additionalProperties = false
        } else {
            schemaObject.additionalProperties = false
            if (additionalProps) {
                requiredArr = requiredArr ?? []
                for (const additionalProperty of additionalProperties) {
                    schemaObject.properties[additionalProperty] = typeof additionalProps === "boolean" ? {} : cloneJSON(additionalProps)
                    requiredArr.push(additionalProperty)
                }
            }
        }
        if (requiredArr) {
            schemaObject.required = requiredArr
        } else {
            delete schemaObject.required
        }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Filter the schema to contains everything except the given properties.
     */
    omitProperties<K extends keyof T>(properties: readonly K[]): SchemaBuilder<{ [P in keyof Omit<T, K>]: Omit<T, K>[P] }> {
        this.assertSimpleObjectSchema("omitProperties")
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
        this.assertSimpleObjectSchema("transformProperties")
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        propertyNames = propertyNames || (Object.keys(schemaObject.properties!) as K[])
        for (const property of propertyNames) {
            const propertySchema = schemaObject.properties![property as string]
            schemaObject.properties![property as string] = {
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
        this.assertSimpleObjectSchema("transformPropertiesToArray")
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        propertyNames = propertyNames || (Object.keys(schemaObject.properties!) as K[])
        for (const property of propertyNames) {
            const propertySchema = schemaObject.properties![property as string]
            // Transform the property if it's not an array
            if ((propertySchema as JSONSchema).type !== "array") {
                schemaObject.properties![property as string] = {
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
        this.assertSimpleObjectSchema("unwrapArrayProperties")
        const schemaObject = cloneRoot(this.schemaObject, { properties: {} })
        propertyNames = propertyNames || (Object.keys(schemaObject.properties!) as K[])
        for (const property of propertyNames) {
            const propertySchema = schemaObject.properties![property as string]
            // Transform the property if it's an array
            if ((propertySchema as JSONSchema).type === "array") {
                const { items, prefixItems } = propertySchema as JSONSchema
                let itemsSchema: JSONSchema
                if (Array.isArray(prefixItems) && prefixItems.length > 0) {
                    itemsSchema = prefixItems.length === 1 ? (prefixItems[0] as JSONSchema) : { oneOf: prefixItems }
                } else {
                    itemsSchema = items as JSONSchema
                }
                schemaObject.properties![property as string] = {
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
        this.assertSimpleObjectSchema("intersectProperties")
        const schemaObject1 = cloneRoot(this.schemaObject, { properties: {}, required: [] })
        const schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            for (const propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties!)) {
                    schemaObject1.properties![propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required!.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties![propertyKey] = {
                        allOf: [schemaObject1.properties![propertyKey], schemaObject2.properties[propertyKey]],
                    }
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1 && schemaObject1.required!.indexOf(propertyKey) === -1) {
                        schemaObject1.required!.push(propertyKey)
                    }
                }
            }
        }
        if (schemaObject1.required!.length === 0) {
            delete schemaObject1.required
        }
        return new SchemaBuilder(schemaObject1, this.validationConfig) as any
    }

    /**
     * Merge all properties from the given schema into this one. If a property name is already used, a anyOf statement is used.
     * This method only copy properties.
     */
    mergeProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof Merge<T, T2>]: Merge<T, T2>[P] }> {
        this.assertSimpleObjectSchema("mergeProperties")
        const schemaObject1 = cloneRoot(this.schemaObject, { properties: {}, required: [] })
        const schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            for (const propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties!)) {
                    schemaObject1.properties![propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required!.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties![propertyKey] = {
                        anyOf: [schemaObject1.properties![propertyKey], schemaObject2.properties[propertyKey]],
                    }
                    if (
                        schemaObject1.required!.indexOf(propertyKey) !== -1 &&
                        (!schemaObject2.required || schemaObject2.required.indexOf(propertyKey) === -1)
                    ) {
                        schemaObject1.required = schemaObject1.required!.filter((p: string) => p !== propertyKey)
                    }
                }
            }
        }
        if (schemaObject1.required!.length === 0) {
            delete schemaObject1.required
        }
        return new SchemaBuilder(schemaObject1, this.validationConfig) as any
    }

    /**
     * Overwrite all properties from the given schema into this one. If a property name is already used, the new type override the existing one.
     * This method only copy properties.
     */
    overwriteProperties<T2>(schema: SchemaBuilder<T2>): SchemaBuilder<{ [P in keyof Overwrite<T, T2>]: Overwrite<T, T2>[P] }> {
        this.assertSimpleObjectSchema("overwriteProperties")
        const schemaObject1 = cloneRoot(this.schemaObject, { properties: {}, required: [] })
        const schemaObject2 = cloneJSON(schema.schemaObject)
        if (schemaObject2.properties) {
            for (const propertyKey in schemaObject2.properties) {
                if (!(propertyKey in schemaObject1.properties!)) {
                    schemaObject1.properties![propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required!.push(propertyKey)
                    }
                } else {
                    schemaObject1.properties![propertyKey] = schemaObject2.properties[propertyKey]
                    if (schemaObject1.required!.indexOf(propertyKey) !== -1) {
                        schemaObject1.required = schemaObject1.required!.filter((r: string) => r !== propertyKey)
                    }
                    if (schemaObject2.required && schemaObject2.required.indexOf(propertyKey) !== -1) {
                        schemaObject1.required!.push(propertyKey)
                    }
                }
            }
        }
        if (schemaObject1.required!.length === 0) {
            delete schemaObject1.required
        }
        return new SchemaBuilder(schemaObject1, this.validationConfig) as any
    }

    /**
     * Extract a subschema of the current object schema.
     *
     * Resolution order for `propertyName`:
     * 1. If declared in `properties`, the corresponding subschema is returned.
     * 2. Otherwise, if `additionalProperties` is itself a schema, that schema is
     *    returned (this is what governs unknown keys in JSON Schema).
     * 3. Otherwise, if `additionalProperties` is `true`, `SchemaBuilder.anySchema()`
     *    is returned (any value is allowed).
     * 4. Otherwise (no additional properties allowed, or the schema uses
     *    `oneOf`/`anyOf`/`allOf`/`not`), a `SchemaBuilderError` is thrown.
     */
    getSubschema<K extends keyof T>(propertyName: K) {
        if (!this.isObjectSchema || this.hasSchemasCombinationKeywords || typeof this.schemaObject === "boolean") {
            throw new VError(`Schema Builder Error: 'getSubschema' can only be used with an object schema that does not use oneOf, anyOf, allOf or not`)
        }
        const properties = this.schemaObject.properties || {}
        const propertyKey = propertyName as string
        if (propertyKey in properties) {
            return new SchemaBuilder<NonNullable<T[K]>>(properties[propertyKey] as JSONSchema)
        }
        const additionalProperties = this.schemaObject.additionalProperties
        if (additionalProperties && typeof additionalProperties !== "boolean") {
            return new SchemaBuilder<NonNullable<T[K]>>(additionalProperties as JSONSchema)
        }
        if (additionalProperties === true) {
            return SchemaBuilder.anySchema() as SchemaBuilder<NonNullable<T[K]>>
        }
        const known = Object.keys(properties)
        throw new VError(
            `Schema Builder Error: 'getSubschema' called with unknown property '${propertyKey}' on ${this.schemaObject.title || "this"} schema. Known properties: ${known.length ? known.join(", ") : "(none)"}.`,
        )
    }

    /**
     * Extract the item schema of the current array schema
     */
    getItemsSubschema() {
        if (!this.schemaObject || !this.isArraySchema || !this.schemaObject.items || this.schemaObject.prefixItems) {
            throw new VError(`Schema Builder Error: 'getItemsSubschema' can only be used with an array schema with non-tuple items`)
        } else {
            return new SchemaBuilder<T extends Array<infer ITEMS> ? ITEMS : never>(this.schemaObject.items as JSONSchema)
        }
    }

    /**
     * Determine if the 'type' property of the schema contains the given type
     */
    hasType(type: JSONSchemaTypeName) {
        return !!this.schemaObject && (Array.isArray(this.schemaObject.type) ? this.schemaObject.type.includes(type) : this.schemaObject.type === type)
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
     * Internal guard used by methods that require a "simple" object schema
     * (no additionalProperties, oneOf, anyOf, allOf or not). Throws a uniform
     * error message naming the calling method.
     */
    private assertSimpleObjectSchema(methodName: string): void {
        if (!this.isSimpleObjectSchema) {
            throw new VError(
                `Schema Builder Error: '${methodName}' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)`,
            )
        }
    }

    /**
     * true if the schema represent an object
     */
    get isObjectSchema() {
        return this.hasType("object") || (!("type" in this.schemaObject) && "properties" in this.schemaObject)
    }

    /**
     * true if the schema represent an array
     */
    get isArraySchema() {
        return this.hasType("array") || (!("type" in this.schemaObject) && ("items" in this.schemaObject || "prefixItems" in this.schemaObject))
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
     * change general schema attributes (`title`, `description`, `default`, `examples`, `readOnly`, `writeOnly`, `$id`, `deprecated`).
     * `default` is typed as `T` and `examples` as `T[]` so they are checked against the schema's underlying type.
     */
    setSchemaAttributes(schema: {
        title?: string
        description?: string
        default?: T
        examples?: T[]
        readOnly?: boolean
        writeOnly?: boolean
        deprecated?: boolean
        $id?: string
    }): SchemaBuilder<{ [P in keyof T]: T[P] }> {
        const schemaObject: JSONSchema = { ...this.schemaObject, ...(schema as Pick<JSONSchema, JSONSchemaCommonProperties>) }
        return new SchemaBuilder(schemaObject, this.validationConfig) as any
    }

    /**
     * Set string-specific validation constraints (`minLength`, `maxLength`, `pattern`, `format`).
     * Constraints are shallow-merged onto the existing schema; pass `undefined` for a key to leave it unchanged.
     *
     * Only callable on a string (or nullable string) schema. Misuse is rejected at compile time
     * via the `this` constraint and at runtime with a thrown error.
     */
    setStringConstraints(
        this: [T] extends [string | null] ? SchemaBuilder<T> : never,
        constraints: Pick<JSONSchema, "minLength" | "maxLength" | "pattern" | "format">,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.hasType("string")) {
            throw new VError("Schema Builder Error: 'setStringConstraints' can only be used on a string schema")
        }
        return new SchemaBuilder({ ...self.schemaObject, ...constraints }, self.validationConfig) as any
    }

    /**
     * Set numeric validation constraints (`multipleOf`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`).
     * Constraints are shallow-merged onto the existing schema.
     *
     * Callable on a number or integer schema (including nullable variants).
     */
    setNumberConstraints(
        this: [T] extends [number | null] ? SchemaBuilder<T> : never,
        constraints: Pick<JSONSchema, "multipleOf" | "minimum" | "maximum" | "exclusiveMinimum" | "exclusiveMaximum">,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.hasType("number") && !self.hasType("integer")) {
            throw new VError("Schema Builder Error: 'setNumberConstraints' can only be used on a number or integer schema")
        }
        return new SchemaBuilder({ ...self.schemaObject, ...constraints }, self.validationConfig) as any
    }

    /**
     * Set array-specific validation constraints (`minItems`, `maxItems`, `uniqueItems`).
     * Constraints are shallow-merged onto the existing schema.
     *
     * Callable on any array or tuple schema (including nullable variants).
     */
    setArrayConstraints(
        this: [T] extends [readonly any[] | null] ? SchemaBuilder<T> : never,
        constraints: Pick<JSONSchema, "minItems" | "maxItems" | "uniqueItems">,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isArraySchema) {
            throw new VError("Schema Builder Error: 'setArrayConstraints' can only be used on an array schema")
        }
        return new SchemaBuilder({ ...self.schemaObject, ...constraints }, self.validationConfig) as any
    }

    /**
     * Set a `contains` schema on this array, with optional `minContains` / `maxContains` bounds.
     * Validation will accept the array when at least `minContains` (default `1`) and at most
     * `maxContains` (default unbounded) of its items match `containsSchema`.
     *
     * `contains` does not narrow the item type, so the builder's `T` is preserved.
     * Pass `null` for `containsSchema` to clear the `contains` / `minContains` / `maxContains` keywords.
     */
    setContains(
        this: [T] extends [readonly any[] | null] ? SchemaBuilder<T> : never,
        containsSchema: SchemaBuilder<any> | null,
        options: { minContains?: number; maxContains?: number } = {},
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isArraySchema) {
            throw new VError("Schema Builder Error: 'setContains' can only be used on an array schema")
        }
        const { contains: _c, minContains: _min, maxContains: _max, ...rest } = self.schemaObject
        const next: JSONSchema = containsSchema
            ? {
                  ...rest,
                  contains: cloneJSON(containsSchema.schemaObject),
                  ...(options.minContains !== undefined ? { minContains: options.minContains } : {}),
                  ...(options.maxContains !== undefined ? { maxContains: options.maxContains } : {}),
              }
            : rest
        return new SchemaBuilder(next, self.validationConfig) as any
    }

    /**
     * Set object-specific validation constraints (`minProperties`, `maxProperties`).
     * Constraints are shallow-merged onto the existing schema.
     *
     * Callable on an object schema (including nullable variants). Arrays are excluded at the type level.
     */
    setObjectConstraints(
        this: [T] extends [readonly any[]] ? never : [T] extends [object | null] ? SchemaBuilder<T> : never,
        constraints: Pick<JSONSchema, "minProperties" | "maxProperties">,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isObjectSchema) {
            throw new VError("Schema Builder Error: 'setObjectConstraints' can only be used on an object schema")
        }
        return new SchemaBuilder({ ...self.schemaObject, ...constraints }, self.validationConfig) as any
    }

    /**
     * Constrain the property names of this object schema with a string schema.
     * Useful for restricting keys to a pattern or format (e.g. UUID-shaped keys).
     *
     * Validation-only — the TypeScript type is preserved. Pass `null` to clear `propertyNames`.
     */
    setPropertyNames(
        this: [T] extends [readonly any[]] ? never : [T] extends [object | null] ? SchemaBuilder<T> : never,
        propertyNames: SchemaBuilder<string> | null,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isObjectSchema) {
            throw new VError("Schema Builder Error: 'setPropertyNames' can only be used on an object schema")
        }
        const { propertyNames: _pn, ...rest } = self.schemaObject
        const next: JSONSchema = propertyNames ? { ...rest, propertyNames: cloneJSON(propertyNames.schemaObject) } : rest
        return new SchemaBuilder(next, self.validationConfig) as any
    }

    /**
     * Add a `dependentRequired` entry: when `propertyName` is present, every name in `requiredNames`
     * must also be present. Validation-only — the TypeScript type is preserved.
     */
    addDependentRequired<K extends keyof NonNullable<T>>(
        this: [T] extends [readonly any[]] ? never : [T] extends [object | null] ? SchemaBuilder<T> : never,
        propertyName: K,
        requiredNames: readonly (keyof NonNullable<T>)[],
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isObjectSchema) {
            throw new VError("Schema Builder Error: 'addDependentRequired' can only be used on an object schema")
        }
        const schemaObject = cloneRoot(self.schemaObject, { dependentRequired: {} })
        schemaObject.dependentRequired![propertyName as string] = requiredNames.map((n) => n as string)
        return new SchemaBuilder(schemaObject, self.validationConfig) as any
    }

    /**
     * Add a `dependentSchemas` entry: when `propertyName` is present, the object must also validate
     * against `schema`. Validation-only — the TypeScript type is preserved (the dependent schema is
     * not merged into `T` because conditional structural narrowing is not generally expressible).
     */
    addDependentSchemas<K extends keyof NonNullable<T>>(
        this: [T] extends [readonly any[]] ? never : [T] extends [object | null] ? SchemaBuilder<T> : never,
        propertyName: K,
        schema: SchemaBuilder<any>,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isObjectSchema) {
            throw new VError("Schema Builder Error: 'addDependentSchemas' can only be used on an object schema")
        }
        const schemaObject = cloneRoot(self.schemaObject, { dependentSchemas: {} })
        schemaObject.dependentSchemas![propertyName as string] = cloneJSON(schema.schemaObject)
        return new SchemaBuilder(schemaObject, self.validationConfig) as any
    }

    /**
     * Set `unevaluatedProperties` on this object schema. Typically used in combination with
     * `allOf`/`anyOf`/`oneOf` to restrict properties not evaluated by any subschema.
     *
     * Accepts a `SchemaBuilder` (subschema all unevaluated properties must satisfy) or a boolean
     * (`true` to allow any, `false` to disallow). Pass `null` to remove the keyword.
     * Validation-only — the TypeScript type is preserved.
     */
    setUnevaluatedProperties(
        this: [T] extends [readonly any[]] ? never : [T] extends [object | null] ? SchemaBuilder<T> : never,
        unevaluated: SchemaBuilder<any> | boolean | null,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isObjectSchema) {
            throw new VError("Schema Builder Error: 'setUnevaluatedProperties' can only be used on an object schema")
        }
        const { unevaluatedProperties: _up, ...rest } = self.schemaObject
        const next: JSONSchema =
            unevaluated === null
                ? rest
                : typeof unevaluated === "boolean"
                  ? { ...rest, unevaluatedProperties: unevaluated }
                  : { ...rest, unevaluatedProperties: cloneJSON(unevaluated.schemaObject) }
        return new SchemaBuilder(next, self.validationConfig) as any
    }

    /**
     * Attach an `if`/`then`/`else` constraint to this schema as a validation-only conditional.
     * The TypeScript type is preserved — use `SchemaBuilder.ifThenElse` if you want type-level narrowing.
     *
     * Pass an object with `if` (required) plus optional `then`/`else` to set the trio; pass `null`
     * to remove all three keywords. Omitted branches in the object are also removed from the schema.
     */
    setIfThenElse(branches: { if: SchemaBuilder<any>; then?: SchemaBuilder<any>; else?: SchemaBuilder<any> } | null): SchemaBuilder<{ [P in keyof T]: T[P] }> {
        const { if: _if, then: _then, else: _else, ...rest } = this.schemaObject
        if (branches === null) {
            return new SchemaBuilder(rest, this.validationConfig) as any
        }
        const next: JSONSchema = {
            ...rest,
            if: cloneJSON(branches.if.schemaObject),
            ...(branches.then ? { then: cloneJSON(branches.then.schemaObject) } : {}),
            ...(branches.else ? { else: cloneJSON(branches.else.schemaObject) } : {}),
        }
        return new SchemaBuilder(next, this.validationConfig) as any
    }

    /**
     * Set the content-related keywords (`contentMediaType`, `contentEncoding`, `contentSchema`) on a string schema.
     * The three keywords are treated as a group — calling with `null` clears all three; calling with an object
     * sets only the provided keys (omitted keys are removed from the previous content state).
     *
     * `contentSchema` describes the result of decoding the string content (e.g. parsing a base64-encoded JSON body)
     * and must itself be a `SchemaBuilder`. Validation-only — the TypeScript type is preserved.
     */
    setContent(
        this: [T] extends [string | null] ? SchemaBuilder<T> : never,
        content: { mediaType?: string; encoding?: string; schema?: SchemaBuilder<any> } | null,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.hasType("string")) {
            throw new VError("Schema Builder Error: 'setContent' can only be used on a string schema")
        }
        const { contentMediaType: _mt, contentEncoding: _en, contentSchema: _cs, ...rest } = self.schemaObject
        if (content === null) {
            return new SchemaBuilder(rest, self.validationConfig) as any
        }
        const next: JSONSchema = {
            ...rest,
            ...(content.mediaType !== undefined ? { contentMediaType: content.mediaType } : {}),
            ...(content.encoding !== undefined ? { contentEncoding: content.encoding } : {}),
            ...(content.schema ? { contentSchema: cloneJSON(content.schema.schemaObject) } : {}),
        }
        return new SchemaBuilder(next, self.validationConfig) as any
    }

    /**
     * Set the `$id` identifier on this schema. Pass `null` to remove the keyword.
     * Useful when emitting reusable schema documents (e.g. for OpenAPI components).
     */
    setId($id: string | null): SchemaBuilder<{ [P in keyof T]: T[P] }> {
        const { $id: _, ...rest } = this.schemaObject
        const next: JSONSchema = $id !== null ? { ...rest, $id } : rest
        return new SchemaBuilder(next, this.validationConfig) as any
    }

    /**
     * Set `unevaluatedItems` on this array schema. Typically used with `prefixItems`,
     * `contains`, or composition keywords to restrict items not evaluated by any subschema.
     *
     * Accepts a `SchemaBuilder` (subschema all unevaluated items must satisfy) or a boolean
     * (`true` to allow any, `false` to disallow). Pass `null` to remove the keyword.
     * Validation-only — the TypeScript type is preserved.
     */
    setUnevaluatedItems(
        this: [T] extends [readonly any[] | null] ? SchemaBuilder<T> : never,
        unevaluated: SchemaBuilder<any> | boolean | null,
    ): SchemaBuilder<T> {
        const self = this as SchemaBuilder<T>
        if (!self.isArraySchema) {
            throw new VError("Schema Builder Error: 'setUnevaluatedItems' can only be used on an array schema")
        }
        const { unevaluatedItems: _ui, ...rest } = self.schemaObject
        const next: JSONSchema =
            unevaluated === null
                ? rest
                : typeof unevaluated === "boolean"
                  ? { ...rest, unevaluatedItems: unevaluated }
                  : { ...rest, unevaluatedItems: cloneJSON(unevaluated.schemaObject) }
        return new SchemaBuilder(next, self.validationConfig) as any
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
    protected ajv!: Ajv
    protected validationFunction!: ValidateFunction<T>

    /**
     * Change the default Ajv configuration to use the given values.
     * The default validation config is { coerceTypes: false, removeAdditional: false, useDefaults: true }
     */
    configureValidation(validationConfig: Options) {
        // The schemaObject reference is shared; both builders treat it as immutable
        // and every mutator returns a fresh copy, so no clone is needed here.
        return new SchemaBuilder<T>(this.schemaObject, validationConfig)
    }

    get ajvValidationConfig() {
        return {
            ...SchemaBuilder.globalAJVConfig,
            ...this.validationConfig,
        }
    }

    /**
     * Explicitly cache the validation function for single objects with the current validation configuration
     */
    cacheValidationFunction() {
        // prepare validation function
        if (!this.validationFunction || this.localValidationFunctionVersionNumber !== SchemaBuilder.globalAJVConfigVersionNumber) {
            this.localValidationFunctionVersionNumber = SchemaBuilder.globalAJVConfigVersionNumber
            this.ajv = new Ajv(this.ajvValidationConfig)
            addFormats(this.ajv)
            this.validationFunction = this.ajv.compile(this.schemaObject)
        }
    }
    /**
     * @experimental This function might not handle properly all cases and its design is subject to change in the future
     *
     * Generate the typescript code equivalent of the current schema.
     * Useful when you want to generate code for an OpenAPI document while keeping the concise aspect of SchemaBuilder.
     * @param customizeOutput you can provide a function to customize or replace entirely the output for a given Schema
     * @returns The generated variable name for the schema based on its "title" and the typescript code that should produce an equivalent schema
     */
    toTypescript(customizeOutput?: (output: string, s: SchemaBuilder<any>) => string) {
        return [this.schemaObject.title ? `${_.lowerFirst(this.schemaObject.title)}Schema` : "schema", schemaToTypescript(this, true, customizeOutput)] as const
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

export type JSONSchemaCommonProperties =
    | "title"
    | "description"
    | "default"
    | "examples"
    | "readOnly"
    | "writeOnly"
    | "deprecated"
    | "$id"
    | "$anchor"
    | "$dynamicAnchor"

export type JSONSchemaArraySpecificProperties = "maxItems" | "minItems" | "uniqueItems"

export type JSONSchemaArrayProperties = JSONSchemaCommonProperties | JSONSchemaArraySpecificProperties

export type JSONSchemaTupleProperties = JSONSchemaCommonProperties | "uniqueItems"

export type JSONSchemaStringProperties = JSONSchemaCommonProperties | "maxLength" | "minLength" | "pattern" | "format"

export type JSONSchemaNumberProperties = JSONSchemaCommonProperties | "multipleOf" | "maximum" | "exclusiveMaximum" | "minimum" | "exclusiveMinimum"

export type JSONSchemaBooleanProperties = JSONSchemaCommonProperties

export type JSONSchemaObjectProperties = JSONSchemaCommonProperties | "maxProperties" | "minProperties"

export type JSONSchemaGeneralProperties = JSONSchemaCommonProperties

export const SB = SchemaBuilder // shorter alias
