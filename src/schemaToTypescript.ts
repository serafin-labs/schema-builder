import _ from "lodash"
import { SchemaBuilder } from "./SchemaBuilder.js"
import { JSONSchema } from "./JsonSchema.js"

type CustomizeOutput = ((output: string, s: SchemaBuilder<any>) => string) | undefined

/**
 * Generate the typescript code equivalent of the given schema.
 *
 * This is the recursive implementation backing `SchemaBuilder.prototype.toTypescript`.
 * Recursive calls pass `processNamedSchema` set to `false` and stop the recursion on any schema where the title is set.
 *
 * @param builder the schema to convert
 * @param processNamedSchema whether to emit the full schema code (`true`, top-level) or just its variable name (`false`, recursion) when the schema is named
 * @param customizeOutput optional function to customize or replace entirely the output for a given Schema
 */
export function schemaToTypescript(builder: SchemaBuilder<any>, processNamedSchema: boolean, customizeOutput: CustomizeOutput): string {
    function getSchemaBuilder(schemaObject: boolean | JSONSchema | undefined): SchemaBuilder<any> {
        if (schemaObject === true || schemaObject === undefined) {
            return SchemaBuilder.anySchema()
        }
        if (schemaObject === false) {
            return SchemaBuilder.neverSchema()
        }
        return new SchemaBuilder(schemaObject)
    }
    function optionalStringify(obj: any, force = false, prefix = "") {
        let result = force || (obj !== undefined && Object.keys(obj).length) ? JSON.stringify(obj) : undefined
        result = result ? `${prefix}${result}` : ""
        return result
    }
    // Extract keywords that have dedicated instance setters into a chain string,
    // and return the residual schema with those keys removed. Called once at the
    // top of the method so every base-factory branch reuses the same residual.
    const extractExtras = (rest: JSONSchema): { chain: string; residual: JSONSchema } => {
        const residual: JSONSchema = { ...rest }
        const parts: string[] = []
        const codeFor = (s: JSONSchema | boolean | undefined) => schemaToTypescript(getSchemaBuilder(s), false, customizeOutput)
        if (residual.$id !== undefined) {
            parts.push(`.setId(${JSON.stringify(residual.$id)})`)
            delete residual.$id
        }
        if (residual.if !== undefined) {
            const entries = [`if: ${codeFor(residual.if)}`]
            if (residual.then !== undefined) entries.push(`then: ${codeFor(residual.then)}`)
            if (residual.else !== undefined) entries.push(`else: ${codeFor(residual.else)}`)
            parts.push(`.setIfThenElse({ ${entries.join(", ")} })`)
            delete residual.if
            delete residual.then
            delete residual.else
        }
        if (residual.contains !== undefined) {
            const opts: string[] = []
            if (residual.minContains !== undefined) opts.push(`minContains: ${residual.minContains}`)
            if (residual.maxContains !== undefined) opts.push(`maxContains: ${residual.maxContains}`)
            const optsArg = opts.length ? `, { ${opts.join(", ")} }` : ""
            parts.push(`.setContains(${codeFor(residual.contains)}${optsArg})`)
            delete residual.contains
            delete residual.minContains
            delete residual.maxContains
        }
        if (residual.unevaluatedItems !== undefined) {
            const v = residual.unevaluatedItems
            parts.push(`.setUnevaluatedItems(${typeof v === "boolean" ? String(v) : codeFor(v)})`)
            delete residual.unevaluatedItems
        }
        if (residual.unevaluatedProperties !== undefined) {
            const v = residual.unevaluatedProperties
            parts.push(`.setUnevaluatedProperties(${typeof v === "boolean" ? String(v) : codeFor(v)})`)
            delete residual.unevaluatedProperties
        }
        if (residual.propertyNames !== undefined && typeof residual.propertyNames !== "boolean") {
            parts.push(`.setPropertyNames(${codeFor(residual.propertyNames)})`)
            delete residual.propertyNames
        }
        if (residual.dependentRequired !== undefined) {
            for (const key of Object.keys(residual.dependentRequired)) {
                parts.push(`.addDependentRequired(${JSON.stringify(key)}, ${JSON.stringify(residual.dependentRequired[key])} as const)`)
            }
            delete residual.dependentRequired
        }
        if (residual.dependentSchemas !== undefined) {
            for (const key of Object.keys(residual.dependentSchemas)) {
                parts.push(`.addDependentSchemas(${JSON.stringify(key)}, ${codeFor(residual.dependentSchemas[key])})`)
            }
            delete residual.dependentSchemas
        }
        if (residual.contentMediaType !== undefined || residual.contentEncoding !== undefined || residual.contentSchema !== undefined) {
            const entries: string[] = []
            if (residual.contentMediaType !== undefined) entries.push(`mediaType: ${JSON.stringify(residual.contentMediaType)}`)
            if (residual.contentEncoding !== undefined) entries.push(`encoding: ${JSON.stringify(residual.contentEncoding)}`)
            if (residual.contentSchema !== undefined && typeof residual.contentSchema !== "boolean") {
                entries.push(`schema: ${codeFor(residual.contentSchema)}`)
            }
            parts.push(`.setContent({ ${entries.join(", ")} })`)
            delete residual.contentMediaType
            delete residual.contentEncoding
            delete residual.contentSchema
        }
        return { chain: parts.join(""), residual }
    }
    const o = customizeOutput ?? ((output: string, s: SchemaBuilder<any>) => output)
    if (!processNamedSchema && builder.schema.title) {
        // Named schema should be handled separately. Generate its variable name instead of its schema code.
        return o(`${_.lowerFirst(builder.schema.title)}Schema`, builder)
    }
    let { type, ...rest0 } = builder.schema
    const { chain: extrasChain, residual: restOfSchemaObject } = extractExtras(rest0)
    if (type) {
        let isNull = false
        if (restOfSchemaObject.enum) {
            const { enum: enumSchemaObject, ...restOfSchemaObjectForEnum } = restOfSchemaObject
            return o(`SB.enumSchema(${JSON.stringify(enumSchemaObject)}, ${optionalStringify(restOfSchemaObjectForEnum)})`, builder)
        }
        if (Array.isArray(type)) {
            if (type.length === 0) {
                return o(`SB.neverSchema(${optionalStringify(restOfSchemaObject)})${extrasChain}`, builder)
            }
            if (type.length === 1) {
                type = type[0]
            }
            if (Array.isArray(type) && type.length === 2 && type.includes("null")) {
                type = type[0] === "null" ? type[1] : type[0]
                isNull = true
            }
        }
        if (Array.isArray(type)) {
            // Multi-type primitive schema -> SB.typesSchema([...]). A trailing "null" is emitted as the
            // nullable flag rather than as an explicit type entry, mirroring typesSchema's own behaviour.
            let typeNames = type as string[]
            if (typeNames.includes("null")) {
                isNull = true
                typeNames = typeNames.filter((t) => t !== "null")
            }
            const primitiveTypes = new Set(["string", "number", "integer", "boolean"])
            if (typeNames.length >= 1 && typeNames.every((t) => primitiveTypes.has(t))) {
                const typesLiteral = `[${typeNames.map((t) => `"${t}"`).join(", ")}]`
                return o(
                    `SB.typesSchema(${typesLiteral}${optionalStringify(restOfSchemaObject, isNull, ", ")}${isNull ? ", true" : ""})${extrasChain}`,
                    builder,
                )
            }
        }
        if (!Array.isArray(type)) {
            switch (type) {
                case "string":
                case "boolean":
                case "integer":
                case "number":
                    return o(`SB.${type}Schema(${optionalStringify(restOfSchemaObject, isNull)}${isNull ? ", true" : ""})${extrasChain}`, builder)
                case "null":
                    return o(`SB.nullSchema(${optionalStringify(restOfSchemaObject)})${extrasChain}`, builder)
                case "array":
                    const { items, prefixItems, ...restOfSchemaObjectForArray } = restOfSchemaObject
                    if (prefixItems) {
                        // Strip the array-shape keywords that tupleSchema sets implicitly
                        // so they don't get re-emitted as user-supplied options.
                        const { minItems, ...restOfSchemaObjectForTuple } = restOfSchemaObjectForArray
                        const keepMinItems = minItems !== undefined && minItems !== prefixItems.length
                        const jsonOptions: any = keepMinItems ? { ...restOfSchemaObjectForTuple, minItems } : restOfSchemaObjectForTuple
                        const tupleParts = prefixItems.map((p) => schemaToTypescript(getSchemaBuilder(p), false, customizeOutput)).join(", ")
                        // When `items` is a schema (not `false`), it represents the tuple's rest element.
                        // Emit it as the `rest:` entry of the options object so the inferred TS tuple
                        // type is `[..., ...R[]]` rather than a closed tuple.
                        const restCode = items && typeof items !== "boolean" ? schemaToTypescript(getSchemaBuilder(items), false, customizeOutput) : null
                        let optionsArg = ""
                        if (restCode !== null) {
                            const jsonEntries = Object.entries(jsonOptions).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
                            const entries = [...jsonEntries, `rest: ${restCode}`]
                            optionsArg = `, { ${entries.join(", ")} }`
                        } else {
                            optionsArg = optionalStringify(jsonOptions, isNull, ", ")
                        }
                        return o(`SB.tupleSchema([${tupleParts}]${optionsArg}${isNull ? ", true" : ""})${extrasChain}`, builder)
                    }
                    return o(
                        `SB.arraySchema(${schemaToTypescript(getSchemaBuilder(items), false, customizeOutput)}${optionalStringify(
                            restOfSchemaObjectForArray,
                            isNull,
                            ", ",
                        )}${isNull ? ", true" : ""})${extrasChain}`,
                        builder,
                    )
                case "object":
                    const { properties, required, additionalProperties, ...restOfSchemaObjectForObject } = restOfSchemaObject
                    return o(
                        `SB.objectSchema(${JSON.stringify(restOfSchemaObjectForObject)}, {${Object.entries(properties ?? {})
                            .map((v) => {
                                const propertySchemaCode = schemaToTypescript(getSchemaBuilder(v[1]), false, customizeOutput)
                                return `"${v[0]}": ${required?.includes(v[0]) ? propertySchemaCode : `[${propertySchemaCode}, undefined]`}`
                            })
                            .join(", ")}}${isNull ? ", true" : ""})${
                            additionalProperties
                                ? `.addAdditionalProperties(${
                                      additionalProperties === true ? "" : schemaToTypescript(getSchemaBuilder(additionalProperties), false, customizeOutput)
                                  })`
                                : ""
                        }${extrasChain}`,
                        builder,
                    )
            }
        }
    } else if (restOfSchemaObject.allOf) {
        return o(
            `SB.allOf(${restOfSchemaObject.allOf.map((schemaObject) => schemaToTypescript(getSchemaBuilder(schemaObject), false, customizeOutput)).join(", ")})${extrasChain}`,
            builder,
        )
    } else if (restOfSchemaObject.oneOf) {
        return o(
            `SB.oneOf(${restOfSchemaObject.oneOf.map((schemaObject) => schemaToTypescript(getSchemaBuilder(schemaObject), false, customizeOutput)).join(", ")})${extrasChain}`,
            builder,
        )
    } else if (restOfSchemaObject.anyOf) {
        return o(
            `SB.anyOf(${restOfSchemaObject.anyOf.map((schemaObject) => schemaToTypescript(getSchemaBuilder(schemaObject), false, customizeOutput)).join(", ")})${extrasChain}`,
            builder,
        )
    } else if (restOfSchemaObject.not) {
        return o(`SB.not(${schemaToTypescript(getSchemaBuilder(restOfSchemaObject.not), false, customizeOutput)})${extrasChain}`, builder)
    }
    // default to a literal schema for unhandled cases
    return o(`SB.fromJsonSchema(${JSON.stringify(builder.schema)} as const)`, builder)
}
