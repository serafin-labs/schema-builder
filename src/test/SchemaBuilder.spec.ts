import { expect } from "chai"
import { SchemaBuilder, SB } from "../SchemaBuilder.js"
import { JSONSchema } from "../JsonSchema.js"

describe("Schema Builder", function () {
    it("should be initialized with a JSON schema", function () {
        let schemaBuilder = new SchemaBuilder({})
        expect(schemaBuilder).to.exist
        expect(schemaBuilder.schema).to.exist
    })

    it("should fail to initialize with a JSON schema that contains $ref", function () {
        expect(() => new SchemaBuilder({ $ref: "aReference" })).to.throw()
    })

    it("should create oneOf, allOf, anyOf and not schemas", function () {
        let schemaBuilder = SB.oneOf(SB.stringSchema(), SB.emptySchema(), SB.booleanSchema())
        expect((schemaBuilder.schema.oneOf as any).length).to.eqls(3)
        let schemaBuilder2 = SB.allOf(SB.stringSchema(), SB.emptySchema({ title: "test" }))
        expect((schemaBuilder2.schema.allOf as any).length).to.eqls(2)
        let schemaBuilder3 = SB.anyOf(SB.stringSchema(), SB.emptySchema(), SB.booleanSchema(), SB.numberSchema())
        expect((schemaBuilder3.schema.anyOf as any).length).to.eqls(4)
        let schemaBuilder4 = SB.not(SB.stringSchema())
        expect(schemaBuilder4.schema.not).to.exist
    })

    it("should create simple properties and validate data", function () {
        let subObjectSchemaBuilder = SB.emptySchema().addString("s")
        let schemaBuilder = SB.emptySchema()
            .addString("s1")
            .addString("s2", {}, false)
            .addNumber("n1")
            .addNumber("n2", {}, false)
            .addInteger("i1")
            .addInteger("i2", {}, false)
            .addBoolean("b1")
            .addBoolean("b2", {}, false)
            .addEnum("e1", ["a", "b", "c"])
            .addEnum("e2", ["a", "b", "c"], {}, false)
            .addEnum("e3", [false])
            .addEnum("e4", [1, 2])
            .addEnum("e5", [1, true, "true"] as const)
            .addProperty("o1", subObjectSchemaBuilder)
            .addProperty("o2", subObjectSchemaBuilder, false)
            .addArray("sa1", SB.stringSchema())
            .addArray("sa2", SB.stringSchema(), {}, false)
            .addArray("a1", subObjectSchemaBuilder)
            .addArray("a2", subObjectSchemaBuilder, {}, false)
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s1: "test",
                n1: 42.42,
                i1: 42,
                b1: true,
                e1: "a",
                e3: false,
                e4: 2,
                e5: "true",
                o1: { s: "test" },
                sa1: ["test"],
                a1: [{ s: "test" }],
            }),
        ).to.not.throw()
        expect(() => schemaBuilder.validate({} as any)).to.throw()
    })

    it("should create tuple schemas and validate data", function () {
        const tuple = SB.tupleSchema([SB.stringSchema(), SB.numberSchema(), SB.booleanSchema()])
        expect(tuple.schema.type).to.equal("array")
        expect((tuple.schema.prefixItems as any).length).to.equal(3)
        expect(tuple.schema.items).to.equal(false)
        expect(tuple.schema.minItems).to.equal(3)
        expect(() => tuple.validate(["a", 1, true] as any)).to.not.throw()
        // missing items
        expect(() => tuple.validate(["a", 1] as any)).to.throw()
        // wrong type at position
        expect(() => tuple.validate([1, "a", true] as any)).to.throw()
        // extra items
        expect(() => tuple.validate(["a", 1, true, "x"] as any)).to.throw()
    })

    it("should create nullable tuple schemas", function () {
        const tuple = SB.tupleSchema([SB.stringSchema(), SB.numberSchema()], {}, true)
        expect(tuple.schema.type).to.eql(["array", "null"])
        expect(() => tuple.validate(["a", 1] as any)).to.not.throw()
        expect(() => tuple.validate(null as any)).to.not.throw()
    })

    it("should create tuple schemas with a rest element", function () {
        const tuple = SB.tupleSchema([SB.stringSchema(), SB.numberSchema()], { rest: SB.booleanSchema() })
        expect(tuple.schema.type).to.equal("array")
        expect((tuple.schema.prefixItems as any).length).to.equal(2)
        expect(tuple.schema.items).to.eql({ type: "boolean" })
        expect(tuple.schema.minItems).to.equal(2)
        // exact-length still valid
        expect(() => tuple.validate(["a", 1] as any)).to.not.throw()
        // rest elements must match the rest schema
        expect(() => tuple.validate(["a", 1, true, false] as any)).to.not.throw()
        // wrong type in rest
        expect(() => tuple.validate(["a", 1, "nope"] as any)).to.throw()
        // missing prefix item
        expect(() => tuple.validate(["a"] as any)).to.throw()
    })

    it("should addTuple with a rest element", function () {
        const schemaBuilder = SB.emptySchema().addTuple("xs", [SB.stringSchema()], { rest: SB.numberSchema() })
        expect(() => schemaBuilder.validate({ xs: ["a"] })).to.not.throw()
        expect(() => schemaBuilder.validate({ xs: ["a", 1, 2, 3] })).to.not.throw()
        expect(() => schemaBuilder.validate({ xs: ["a", "b"] } as any)).to.throw()
        expect(() => schemaBuilder.validate({ xs: [] } as any)).to.throw()
    })

    it("should addTuple on an object schema and validate data", function () {
        const schemaBuilder = SB.emptySchema()
            .addTuple("pair", [SB.stringSchema(), SB.numberSchema()])
            .addTuple("optionalPair", [SB.stringSchema(), SB.numberSchema()], {}, false)
        expect(() => schemaBuilder.validate({ pair: ["a", 1] })).to.not.throw()
        expect(() => schemaBuilder.validate({ pair: ["a", 1], optionalPair: ["b", 2] })).to.not.throw()
        expect(() => schemaBuilder.validate({} as any)).to.throw()
        expect(() => schemaBuilder.validate({ pair: ["a"] } as any)).to.throw()
        expect(() => schemaBuilder.validate({ pair: [1, "a"] } as any)).to.throw()
    })

    it("should add multiple properties at the same time and validate data", function () {
        let schemaBuilder = SB.emptySchema().addProperties({
            s1: SB.stringSchema(),
            s2: [SB.stringSchema(), undefined],
            sb: [SB.stringSchema(), SB.booleanSchema()],
        })

        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s1: "test",
                sb: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s1: "test",
                s2: "test",
                sb: "true",
            }),
        ).to.not.throw()
        expect(() => schemaBuilder.validate({} as any)).to.throw()
    })

    it("should change validation config and copy it throught transformations", function () {
        let schemaBuilder1 = SB.emptySchema().addString("s").addNumber("n")
        let schemaBuilder2 = schemaBuilder1.configureValidation({ coerceTypes: true })
        expect(schemaBuilder1).to.exist
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                n: 42,
                s: "test",
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                n: "42",
                s: "test",
            } as any),
        ).to.not.throw()
        expect(() =>
            schemaBuilder1.validate({
                n: "42",
                s: "test",
            } as any),
        ).to.throw()
    })

    it("should fail to add a property that already exists", function () {
        expect(() => SB.emptySchema().addString("s1").addBoolean("s1")).to.throw()
        expect(() => SB.emptySchema().addString("s1").addBoolean("s1", {}, false)).to.throw()
    })

    it("should fail to add a property to a non-object schema", function () {
        expect(() => SB.stringSchema().addString("s1")).to.throw()
        expect(() => SB.stringSchema().addString("s1", {}, false)).to.throw()
    })

    it("should create a schema with additional properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addAdditionalProperties()
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s: "test",
                test: 42,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: {},
                test: 42,
            } as any),
        ).to.throw()
    })

    it("should fail to create additional properties if it is alread set", function () {
        expect(() => SB.emptySchema().addString("s").addAdditionalProperties().addAdditionalProperties()).to.throw()
    })

    it("should set optional properties", function () {
        let schemaBuilder = SB.emptySchema()
            .addString("s", { default: "test" })
            .addBoolean("b", { default: false })
            .addBoolean("c", {}, false)
            .setOptionalProperties(["s"])
        expect(((schemaBuilder.schema.properties as any).s as JSONSchema).default).to.not.exist
        expect(((schemaBuilder.schema.properties as any).b as JSONSchema).default).to.exist
        expect(() =>
            schemaBuilder.validate({
                b: true,
            }),
        ).to.not.throw()
    })

    it("should set required properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addBoolean("b", {}, false).setRequiredProperties(["b"])
        expect(() =>
            schemaBuilder.validate({
                s: "test",
                b: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: "test",
            } as any),
        ).to.throw()
    })

    it("should convert to optionals", function () {
        let schemaBuilder = SB.emptySchema().addString("s", { default: "test" }).addBoolean("b").toOptionals()
        expect(((schemaBuilder.schema.properties as any).s as JSONSchema).default).to.not.exist
        expect(() => schemaBuilder.validate({})).to.not.throw()
    })

    it("should convert to deep optionals", function () {
        let innerSchema = SB.emptySchema().addString("ss", { default: "test" }).addBoolean("sb")
        let schemaBuilder = SB.emptySchema().addBoolean("b", { default: true }).addProperty("s", innerSchema).toDeepOptionals()
        expect(((schemaBuilder.schema.properties as any).b as JSONSchema).default).to.not.exist
        expect(((((schemaBuilder.schema.properties as any).s as JSONSchema).properties as any).ss as JSONSchema).default).to.not.exist
        expect(() => schemaBuilder.validate({ s: { ss: "test" } })).to.not.throw()
    })

    it("should add nullable properties", function () {
        let schemaBuilder = SB.emptySchema().addEnum("s", ["a", "b", "c"], {}, false, true).addArray("a", SB.stringSchema(), {}, false, true)
        expect(() => schemaBuilder.validate({ s: null, a: null })).to.not.throw()
    })

    it("should convert to nullable", function () {
        let schemaBuilder = SB.emptySchema().addEnum("s", ["a", "b", "c"], {}, false).addArray("a", SB.stringSchema(), {}, false)
        expect(() => schemaBuilder.validate({ s: null, a: null } as any)).to.throw()
        expect(() => schemaBuilder.toNullable().validate({ s: null, a: null })).to.not.throw()
    })

    it("should rename a property", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addBoolean("b", {}, false).renameProperty("s", "s2").renameProperty("b", "b2")
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s2: "test",
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: "test",
            } as any),
        ).to.throw()
    })

    it("should pick properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addBoolean("b", {}, false).pickProperties(["b"])
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                b: true,
            }),
        ).to.not.throw()
        let o = {
            s: "test",
            b: true,
        }
        expect(() => schemaBuilder.validate(o as any)).to.throw()
    })

    it("should omit properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addBoolean("b", {}, false).omitProperties(["s"])
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                b: true,
            }),
        ).to.not.throw()
        let o = {
            s: "test",
            b: true,
        }
        expect(() => schemaBuilder.validate(o as any)).to.throw()
    })

    it("should pick additional properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"])
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s: "test",
                test: 42,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: {},
                test: 42,
            } as any),
        ).to.throw()
    })

    it("should remove additional properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"], [])
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s: "test",
            }),
        ).to.not.throw()
        let o = {
            s: "test",
            test: 42,
        }
        expect(() => schemaBuilder.validate(o as any)).to.throw()
    })

    it("should pick specific additional properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"], ["test"])
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s: "test",
                test: 42,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: "test",
                test2: 42,
            } as any),
        ).to.throw()
    })

    it("should transform properties type", function () {
        let schemaBuilder = SB.emptySchema().addArray("s", SB.stringSchema()).transformProperties(SB.stringSchema(), ["s"])
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s: ["test"],
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: [{ a: "test" }],
            } as any),
        ).to.throw()
        let schemaBuilder2 = SB.emptySchema().addArray("s", SB.stringSchema()).transformProperties(SB.stringSchema())
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: ["test"],
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: [{ a: "test" }],
            } as any),
        ).to.throw()
    })

    it("should unwrap array properties", function () {
        let schemaBuilder = SB.emptySchema().addString("s", {}, false).addArray("a", SB.booleanSchema()).unwrapArrayProperties(["a"])
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                a: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: "test",
            } as any),
        ).to.throw()
        let schemaBuilder2 = SB.emptySchema().addString("s", {}, false).addArray("a", SB.booleanSchema()).unwrapArrayProperties()
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                a: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: "test",
            } as any),
        ).to.throw()
    })

    it("should transform properties to array", function () {
        let schemaBuilder = SB.emptySchema().addString("s", {}, false).transformPropertiesToArray(["s"], { minItems: 2 })
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                s: ["test"],
            }),
        ).to.throw()
        expect(() =>
            schemaBuilder.validate({
                s: ["test1", "test2"],
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                s: [{ a: "test" }],
            } as any),
        ).to.throw()
        let schemaBuilder2 = SB.emptySchema().addString("s").transformPropertiesToArray()
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: ["test"],
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: [{ a: "test" }],
            } as any),
        ).to.throw()
    })

    it("should intersect properties", function () {
        let schemaBuilder1 = SB.emptySchema().addString("s").addBoolean("b")
        let schemaBuilder2 = SB.emptySchema().addString("s", {}, false).intersectProperties(schemaBuilder1)
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: "test",
                b: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                b: true,
            } as any),
        ).to.throw()
    })

    it("should intersectProperties work with an empty schema", function () {
        expect(() => SB.emptySchema().intersectProperties(SB.emptySchema().addString("test"))).to.not.throw()
    })

    it("should merge properties", function () {
        let schemaBuilder1 = SB.emptySchema().addProperty("s", SB.emptySchema().addString("v")).addBoolean("b")
        let schemaBuilder2 = SB.emptySchema().addBoolean("s", {}, false).mergeProperties(schemaBuilder1)
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: true,
                b: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: { v: "test" },
                b: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                b: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: true,
            } as any),
        ).to.throw()
    })

    it("should overwrite properties", function () {
        let schemaBuilder1 = SB.emptySchema().addProperty("s", SB.emptySchema().addString("v")).addBoolean("b").addBoolean("s2", {}, false).addBoolean("s3", {})
        let schemaBuilder2 = SB.emptySchema().addBoolean("s", {}, false).addString("s2").addString("s3").overwriteProperties(schemaBuilder1)
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: { v: "test" },
                b: true,
                s3: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: false,
                b: true,
                s3: true,
            } as any),
        ).to.throw()
    })

    it("should fail to transform with schemas that are not simple", function () {
        let schemaBuilder = SB.allOf(SB.emptySchema().addString("s"), SB.emptySchema().addBoolean("b"))
        expect(schemaBuilder.hasSchemasCombinationKeywords).to.be.true
        expect(schemaBuilder.isSimpleObjectSchema).to.be.false
        expect(schemaBuilder.isObjectSchema).to.be.false
        expect(schemaBuilder.hasAdditionalProperties).to.be.false
        expect(() => schemaBuilder.setOptionalProperties([])).to.throw()
        expect(() => schemaBuilder.setRequiredProperties([])).to.throw()
        expect(() => schemaBuilder.renameProperty("s", "s1")).to.throw()
        expect(() => schemaBuilder.pickProperties(["s"])).to.throw()
        expect(() => schemaBuilder.omitProperties(["s"])).to.throw()
        expect(() => schemaBuilder.pickAdditionalProperties(["s"])).to.throw()
        expect(() => schemaBuilder.transformProperties(SB.stringSchema(), ["s"])).to.throw()
        expect(() => schemaBuilder.transformPropertiesToArray()).to.throw()
        expect(() => schemaBuilder.intersectProperties(SB.emptySchema())).to.throw()
        expect(() => schemaBuilder.mergeProperties(SB.emptySchema())).to.throw()
        expect(() => schemaBuilder.overwriteProperties(SB.emptySchema())).to.throw()
    })

    it("should initialize a complex schema and validate data", function () {
        let taskSchema = SB.objectSchema(
            {
                title: "Task",
            },
            {
                name: SB.stringSchema(),
                progress: SB.numberSchema(),
                isCompleted: [SB.booleanSchema(), undefined],
            },
        )

        let userSchema = SB.objectSchema(
            {
                title: "User",
            },
            {
                id: SB.stringSchema({ pattern: "\\w" }),
                firstName: SB.stringSchema(),
                lastName: SB.stringSchema(),
                role: SB.enumSchema(["admin", "user"]),
                email: SB.stringSchema({ format: "email" }),
                tags: SB.arraySchema(SB.stringSchema(), { minItems: 1 }),
                age: [SB.integerSchema(), undefined],
                friendsIds: [SB.arraySchema(SB.stringSchema()), undefined],
                tasks: SB.arraySchema(taskSchema),
            },
        )

        expect(userSchema).to.exist
        expect(
            userSchema.validate.bind(userSchema, {
                id: "1",
                firstName: "John",
                lastName: "Doe",
                email: "john-doe@test.com",
                role: "admin",
                tags: ["test"],
                tasks: [
                    {
                        name: "something to do",
                        progress: 0,
                    },
                ],
            }),
        ).to.not.throw()
        expect(
            userSchema.validate.bind(userSchema, {
                id: "1_",
                firstName: "John",
                lastName: "Doe",
                email: "john-doe-test.com",
                role: "test",
                tags: [],
                tasks: [
                    {
                        name: "something to do",
                        progress: 0,
                        isCompleted: false,
                    },
                ],
            } as any),
        ).to.throw()

        let queryUserSchema = userSchema
            .setSchemaAttributes({ title: "UserQuery" })
            .pickProperties(["firstName", "lastName", "age", "email", "tags"])
            .transformPropertiesToArray()
            .unwrapArrayProperties()
            .addBoolean("anOption")
            .toOptionals()
        type QueryUser = typeof queryUserSchema.T
        let q: QueryUser = {
            tags: "admin",
            age: [30, 31],
        }
        expect(queryUserSchema).to.exist
        expect(() => queryUserSchema.validate(q)).to.not.throw()
        expect(
            queryUserSchema.validate.bind(queryUserSchema, {
                tags: "admin",
                age: "test",
            } as any),
        ).to.throw()
    })

    it("should set an inline schema", function () {
        let schemaBuilder = SB.fromJsonSchema({
            type: "object",
            properties: {
                anEmptySchema: {},
                aMultiTypeSchema: {
                    type: ["integer", "string", "object", "array"],
                    description: "this is a test",
                    items: {
                        type: "boolean",
                    },
                    additionalProperties: false,
                    properties: {
                        ok: {
                            type: "boolean",
                        },
                    },
                },
                aString: {
                    type: "string",
                    minLength: 1,
                },
                aConstString: {
                    type: "string",
                    const: "constant",
                },
                aSpecialEnum: {
                    type: ["string", "number"],
                    enum: ["A", "B", 1, 2],
                },
                aNullableString: {
                    type: ["string", "null"],
                },
                aNullProperty: {
                    type: "null",
                },
                aBoolean: {
                    type: "boolean",
                },
                anInteger: {
                    type: "integer",
                    minimum: 0,
                },
                aSubObject: {
                    type: "object",
                    additionalProperties: {
                        type: "number",
                    },
                    properties: {
                        aSubProperty: {
                            type: "number",
                            maximum: 100,
                        },
                    },
                },
                aOneOfObject: {
                    oneOf: [
                        {
                            type: "integer",
                        },
                        {
                            type: "boolean",
                        },
                        {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                test: { type: "string" },
                            },
                        },
                    ],
                },
                anArray: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: ["a", "b", "c"],
                    },
                },
                aMultiArray: {
                    type: "array",
                    prefixItems: [
                        {
                            type: "string",
                        },
                        {
                            type: "boolean",
                        },
                    ],
                },
            },
            required: ["aBoolean", "anArray"],
            additionalProperties: false,
        } as const)
        let a: typeof schemaBuilder.T
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                aBoolean: false,
                aSubObject: {
                    aSubProperty: 42,
                },
                anArray: ["a"],
                aNullableString: null,
            }),
        ).to.not.throw()

        expect(() =>
            schemaBuilder.validate({
                aBoolean: true,
                anInteger: -1,
            } as any),
        ).to.throw()

        expect(() =>
            schemaBuilder.validate({
                aBoolean: true,
                anArray: ["a"],
                aString: null,
            } as any),
        ).to.throw()
    })

    it("should replace a property", function () {
        let schemaBuilder1 = SB.emptySchema().addProperty("s", SB.emptySchema().addString("v")).addBoolean("b")
        let schemaBuilder2 = schemaBuilder1.replaceProperty("s", SB.booleanSchema())
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: false,
                b: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: { v: "test" },
                b: true,
            } as any),
        ).to.throw()
    })

    it("should deep replace a property", function () {
        let schemaBuilder1 = SB.emptySchema().addProperty("s", SB.emptySchema().addString("v"))
        let schemaBuilder2 = schemaBuilder1.replaceProperty("s", (s) => s.replaceProperty("v", SB.integerSchema()))
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: { v: 42 },
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: { v: "test" },
            } as any),
        ).to.throw()
    })

    it("should add or replace a property", function () {
        let schemaBuilder1 = SB.emptySchema().addProperty("s", SB.emptySchema().addString("v"))
        let schemaBuilder2 = schemaBuilder1.addOrReplaceProperty("b", SB.booleanSchema()).addOrReplaceProperty("s", SB.booleanSchema())
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                s: false,
                b: true,
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: { v: "test" },
                b: true,
            } as any),
        ).to.throw()
    })

    it("should get a subschema", function () {
        let schemaBuilder1 = SB.emptySchema().addProperty("s", SB.emptySchema().addString("v"), false)
        let schemaBuilder2 = schemaBuilder1.getSubschema("s").getSubschema("v")
        expect(schemaBuilder2).to.exist
        expect(() => schemaBuilder2.validate("test")).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: { v: "test" },
            } as any),
        ).to.throw()
    })

    it("should throw a clear error when getSubschema is called with an unknown property", function () {
        const schemaBuilder = SB.emptySchema({ title: "Container" }).addString("s").addNumber("n")
        expect(() => (schemaBuilder as any).getSubschema("missing")).to.throw(
            "Schema Builder Error: 'getSubschema' called with unknown property 'missing' on Container schema. Known properties: s, n.",
        )
    })

    it("should throw a clear error when getSubschema is called on a schema with combination keywords", function () {
        const schemaBuilder = SB.oneOf(SB.emptySchema().addString("s"), SB.emptySchema().addNumber("n"))
        expect(() => (schemaBuilder as any).getSubschema("s")).to.throw(
            "Schema Builder Error: 'getSubschema' can only be used with an object schema that does not use oneOf, anyOf, allOf or not",
        )
    })

    it("should report '(none)' when getSubschema is called on a schema that declares no properties", function () {
        const schemaBuilder = SB.emptySchema({ title: "Empty" })
        expect(() => (schemaBuilder as any).getSubschema("missing")).to.throw(
            "Schema Builder Error: 'getSubschema' called with unknown property 'missing' on Empty schema. Known properties: (none).",
        )
    })

    it("should return the declared property's subschema even when additionalProperties is set", function () {
        const schemaBuilder = SB.emptySchema().addString("declared").addAdditionalProperties(SB.numberSchema())
        const sub = (schemaBuilder as any).getSubschema("declared")
        expect(sub.schema.type).to.equal("string")
    })

    it("should fall back to the additionalProperties schema for undeclared properties", function () {
        const schemaBuilder = SB.emptySchema().addString("declared").addAdditionalProperties(SB.numberSchema())
        const sub = (schemaBuilder as any).getSubschema("unknown")
        expect(sub.schema.type).to.equal("number")
    })

    it("should return an any schema when additionalProperties is true and the property is undeclared", function () {
        const schemaBuilder = SB.emptySchema().addString("declared").addAdditionalProperties()
        const sub = (schemaBuilder as any).getSubschema("unknown")
        // anySchema is created from an empty `{}` — no `type` keyword.
        expect(sub.schema.type).to.equal(undefined)
    })

    it("should still throw for an undeclared property when additionalProperties is false", function () {
        const schemaBuilder = SB.emptySchema({ title: "Strict" }).addString("declared")
        expect(() => (schemaBuilder as any).getSubschema("unknown")).to.throw(
            "Schema Builder Error: 'getSubschema' called with unknown property 'unknown' on Strict schema. Known properties: declared.",
        )
    })

    it("should get a array subschema", function () {
        let schemaBuilder1 = SB.arraySchema(SB.emptySchema().addString("test"), {}, true)
        let schemaBuilder2 = schemaBuilder1.getItemsSubschema()
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                test: "42",
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                test: true,
            } as any),
        ).to.throw()
    })

    it("should get schema properties", function () {
        let schemaBuilder = SB.emptySchema().addString("req").addNumber("opt", {}, false).addAdditionalProperties()
        const properties = schemaBuilder.properties
        const requiredProperties = schemaBuilder.requiredProperties
        const optionalProperties = schemaBuilder.optionalProperties
        expect(properties).to.eql(["req", "opt"])
        expect(requiredProperties).to.eql(["req"])
        expect(optionalProperties).to.eql(["opt"])
    })

    it("should get property accessor", function () {
        let schemaBuilder = SB.emptySchema().addProperty("o", SB.emptySchema().addString("s").addBoolean("o"))
        const pa = schemaBuilder.getPropertyAccessor().o.s
        expect(pa.path).to.eql(["o", "s"])
    })

    it("should generate code for a schema", function () {
        let taskSchema = SB.objectSchema(
            {
                title: "Task",
            },
            {
                name: SB.stringSchema(),
                progress: SB.numberSchema(),
                isCompleted: [SB.booleanSchema(), undefined],
            },
        )
        expect(taskSchema.toTypescript()).to.eqls([
            "taskSchema",
            'SB.objectSchema({"title":"Task"}, {"name": SB.stringSchema(), "progress": SB.numberSchema(), "isCompleted": [SB.booleanSchema(), undefined]})',
        ])
    })

    it("should render nullable primitives regardless of the `type` array ordering", function () {
        // Schemas built via the SB.*Schema(..., true) helpers put "null" last,
        // but schemas declared by hand (or via fromJsonSchema) can put it first.
        // toTypescript should render either ordering as a nullable primitive.
        const nullLast = SB.fromJsonSchema({ type: ["string", "null"] } as const)
        expect(nullLast.toTypescript()[1]).to.equal("SB.stringSchema({}, true)")

        const nullFirst = SB.fromJsonSchema({ type: ["null", "string"] } as const)
        expect(nullFirst.toTypescript()[1]).to.equal("SB.stringSchema({}, true)")

        const numberNullFirst = SB.fromJsonSchema({ type: ["null", "number"] } as const)
        expect(numberNullFirst.toTypescript()[1]).to.equal("SB.numberSchema({}, true)")

        const booleanNullFirst = SB.fromJsonSchema({ type: ["null", "boolean"] } as const)
        expect(booleanNullFirst.toTypescript()[1]).to.equal("SB.booleanSchema({}, true)")
    })

    describe("Error messages testings", function () {
        const advancedSchema = SB.emptySchema({ title: "AdvancedSchema", description: "This is an advanced schema" })
            .addString("asOptNull", {}, false, true)
            .addProperty(
                "ao",
                SB.emptySchema()
                    .addProperty(
                        "bo",
                        SB.emptySchema()
                            .addProperty("co", SB.emptySchema().addString("ds").addBoolean("db").addArray("das", SB.stringSchema()))
                            .addEnum("ce", ["ce1", "ce2", "ce3"])
                            .addInteger("ciMinMax", { title: "ci", minimum: 10, maximum: 100 })
                            .addNumber("cn"),
                    )
                    .addArray(
                        "bao",
                        SB.emptySchema()
                            .addString("esOpt", {}, false)
                            .addBoolean("ebOptNull", {}, false, true)
                            .addArray("ea", SB.numberSchema())
                            .addBoolean("ebOpt", {}, false),
                    ),
            )
            .addString("as")
            .addArray("aaeOpt", SB.enumSchema(["aae1", "aae2", "aae3"]), {}, false)
            .addProperty("ao2Opt", SB.emptySchema().addAdditionalProperties(), false)

        it("should return detailed error messages for nested properties", function () {
            try {
                advancedSchema.validate({
                    ao: {
                        bo: { co: { ds: "a", db: true, das: ["a", "b", "c"] }, ce: "ce1", ciMinMax: 9, cn: 12.34 },
                        bao: [{ esOpt: "test", ebOptNull: null, ea: [1, 2, 3] }],
                    },
                    ao2Opt: { a: 42 },
                    aaeOpt: ["aae1", "aae2", "aae3", "aae4"],
                    asOptNull: "",
                } as any)
            } catch (error) {
                expect(error).to.exist
                expect((error as any).message).to.equal(
                    "Invalid parameters: data must have required property 'as', data/ao/bo/ciMinMax must be >= 10, data/aaeOpt/3 must be equal to one of the allowed values",
                )
            }
        })
    })

    describe("Test Enum/Const Schema", function () {
        it("should create a schema with const values", function () {
            let schema = SB.objectSchema(
                {},
                {
                    name: SB.constSchema("good"),
                    progress: SB.constSchema(42),
                    isCompleted: SB.constSchema(true),
                },
            )
            type Schema = typeof schema.T
            const goodData: Schema = {
                name: "good",
                progress: 42,
                isCompleted: true,
            }
            const badData: any = {
                name: "bad",
                progress: 21,
                isCompleted: false,
            }

            expect(() => schema.validate(goodData)).to.not.throw()
            expect(() => schema.validate(badData)).to.throw(
                "Invalid parameters: data/name must be equal to constant, data/progress must be equal to constant, data/isCompleted must be equal to constant",
            )
        })

        it("includes `null` in `type` when `null` appears in the values", function () {
            const onlyNull = SB.enumSchema([null] as const)
            expect(onlyNull.schema.type).to.equal("null")
            expect(onlyNull.schema.enum).to.eql([null])

            const stringOrNull = SB.enumSchema(["a", null] as const)
            expect(stringOrNull.schema.type).to.eql(["string", "null"])
            expect(stringOrNull.schema.enum).to.eql(["a", null])
            expect(() => stringOrNull.validate(null as any)).to.not.throw()
            expect(() => stringOrNull.validate("a")).to.not.throw()
            expect(() => stringOrNull.validate("b" as any)).to.throw()

            const numberOrNull = SB.enumSchema([1, 2, null] as const)
            expect(numberOrNull.schema.type).to.eql(["number", "null"])
            expect(() => numberOrNull.validate(null as any)).to.not.throw()
            expect(() => numberOrNull.validate(1)).to.not.throw()
            expect(() => numberOrNull.validate(3 as any)).to.throw()
        })

        it("adds `null` to both `type` and `enum` when nullable is true", function () {
            const nullableString = SB.enumSchema(["a"] as const, {}, true)
            expect(nullableString.schema.type).to.eql(["string", "null"])
            expect(nullableString.schema.enum).to.eql(["a", null])
            expect(() => nullableString.validate(null)).to.not.throw()
            expect(() => nullableString.validate("a")).to.not.throw()
        })

        it("does not duplicate `null` in `type`/`enum` when both nullable and a literal null are present", function () {
            const schema = SB.enumSchema(["a", null] as const, {}, true)
            const type = schema.schema.type as string[]
            expect(type.filter((t) => t === "null")).to.have.length(1)
            const enumValues = schema.schema.enum as unknown[]
            expect(enumValues.filter((v) => v === null)).to.have.length(1)
        })

        it("should use oneOf with literal values for type narrowing", function () {
            let schema = SB.objectSchema(
                {},
                {
                    name: SB.enumSchema(["test", "test2"] as const),
                    conditionalObject: SB.oneOf(
                        SB.objectSchema({}, { type: SB.constSchema("foo"), foo: SB.stringSchema() }),
                        SB.objectSchema({}, { type: SB.enumSchema("bar"), bar: SB.numberSchema() }),
                        SB.objectSchema({}, { type: SB.enumSchema(["baz"] as const), baz: SB.booleanSchema() }),
                    ),
                },
            )
            type Schema = typeof schema.T
            const goodDataFoo: Schema = {
                name: "test",
                conditionalObject: { type: "foo", foo: "test" },
            }
            const goodDataBar: Schema = {
                name: "test2",
                conditionalObject: { type: "bar", bar: 42 },
            }
            const badData: any = {
                name: "test",
                conditionalObject: { type: "foo", bar: 42 },
            }
            expect(() => schema.validate(goodDataFoo)).to.not.throw()
            expect(() => schema.validate(goodDataBar)).to.not.throw()
            expect(() => schema.validate(badData)).to.throw("Invalid parameters: data/conditionalObject must have required property 'foo'")
        })

        it("playground with different typing of enumSchema", function () {
            enum TestEnum {
                foo = "foo",
                bar = "bar",
                baz = "baz",
            }
            const TestEnumValues = Object.values(TestEnum)

            const literalSchema = SB.objectSchema(
                {},
                {
                    enumLiteralString: SB.enumSchema("test"),
                    enumLiteralEnum: SB.enumSchema(TestEnum.foo),
                },
            )
            type LiteralSchema = typeof literalSchema.T
            expect(() => literalSchema.validate({ enumLiteralString: "test", enumLiteralEnum: TestEnum.foo })).to.not.throw()
            expect(() => literalSchema.validate({ enumLiteralString: "test", enumLiteralEnum: "foo" as TestEnum.foo })).to.not.throw()
            expect(() => literalSchema.validate({ enumLiteralString: "test", enumLiteralEnum: "baz" as TestEnum.foo })).to.throw(
                "Invalid parameters: data/enumLiteralEnum must be equal to one of the allowed values",
            )

            const stringEnumSchema = SB.objectSchema(
                {},
                {
                    enumArrayUniqueValueString: SB.enumSchema(["foo"]),
                    enumArrayUniqueConstValueString: SB.enumSchema(["foo"] as const),
                    enumArrayMultipleValuesString: SB.enumSchema(["foo", "bar"]),
                    enumArrayMultipleConstValuesString: SB.enumSchema(["foo", "bar"] as const),
                },
            )

            type StringEnumSchema = typeof stringEnumSchema.T
            expect(() =>
                stringEnumSchema.validate({
                    enumArrayUniqueValueString: "foo",
                    enumArrayUniqueConstValueString: "foo",
                    enumArrayMultipleValuesString: "bar",
                    enumArrayMultipleConstValuesString: "bar",
                }),
            ).to.not.throw()
            expect(() =>
                stringEnumSchema.validate({
                    enumArrayUniqueValueString: "baz",
                    enumArrayUniqueConstValueString: "foo",
                    enumArrayMultipleValuesString: "baz",
                    enumArrayMultipleConstValuesString: "foo",
                }),
            ).to.throw(
                "Invalid parameters: data/enumArrayUniqueValueString must be equal to one of the allowed values, data/enumArrayMultipleValuesString must be equal to one of the allowed values",
            )

            const enumEnumSchema = SB.objectSchema(
                {},
                {
                    enumArrayUniqueConstValue: SB.enumSchema([TestEnum.foo] as const),
                    enumArrayUniqueValue: SB.enumSchema([TestEnum.foo]),
                    enumArrayMultipleValues: SB.enumSchema([TestEnum.foo, TestEnum.bar]),
                    enumArrayMultipleConstValues: SB.enumSchema([TestEnum.foo, TestEnum.bar] as const),

                    enumMultipleValuesEnumValues: SB.enumSchema(TestEnumValues),
                },
            )

            type EnumEnumSchema = typeof enumEnumSchema.T
            expect(() =>
                enumEnumSchema.validate({
                    enumArrayUniqueConstValue: TestEnum.foo,
                    enumArrayUniqueValue: TestEnum.foo,
                    enumArrayMultipleValues: TestEnum.bar,
                    enumArrayMultipleConstValues: TestEnum.bar,
                    enumMultipleValuesEnumValues: TestEnum.bar,
                }),
            ).to.not.throw()
            expect(() =>
                enumEnumSchema.validate({
                    enumArrayUniqueConstValue: TestEnum.baz,
                    enumArrayUniqueValue: TestEnum.baz,
                    enumArrayMultipleValues: TestEnum.baz,
                    enumArrayMultipleConstValues: TestEnum.baz,

                    enumMultipleValuesEnumValues: "baz",
                } as any),
            ).to.throw(
                "Invalid parameters: data/enumArrayUniqueConstValue must be equal to one of the allowed values, data/enumArrayUniqueValue must be equal to one of the allowed values, data/enumArrayMultipleValues must be equal to one of the allowed values, data/enumArrayMultipleConstValues must be equal to one of the allowed values",
            )
        })
    })

    describe("constSchema Test", function () {
        it("should create a schema with const values", function () {
            const schema = SB.objectSchema(
                {},
                {
                    string: SB.constSchema("string"),
                    number: SB.constSchema(42),
                    true: SB.constSchema(true),
                    false: SB.constSchema(false),
                    null: SB.constSchema(null),
                },
            )

            expect(() => schema.validate({ string: "string", number: 42, true: true, false: false, null: null })).to.not.throw()
            expect(() => schema.validate({ string: "string", number: 42, true: true, false: false, null: "null" } as any)).to.throw(
                "Invalid parameters: data/null must be equal to constant",
            )
        })
    })

    describe("Static factory helpers", function () {
        it("nullSchema creates a `{ type: 'null' }` schema that accepts only null", function () {
            const s = SB.nullSchema()
            expect(s.schema.type).to.equal("null")
            expect(() => s.validate(null)).to.not.throw()
            expect(() => s.validate("nope" as any)).to.throw()
        })

        it("anySchema accepts arbitrary values", function () {
            const s = SB.anySchema()
            expect(s.schema.type).to.equal(undefined)
            expect(() => s.validate(42 as any)).to.not.throw()
            expect(() => s.validate("any" as any)).to.not.throw()
            expect(() => s.validate({ ok: true } as any)).to.not.throw()
        })

        it("neverSchema produces a schema with `type: []` that nothing validates against", function () {
            const s = SB.neverSchema()
            expect(s.schema.type).to.eql([])
            expect(() => (s as any).validate(undefined)).to.throw()
            expect(() => (s as any).validate(null)).to.throw()
            expect(() => (s as any).validate("anything")).to.throw()
        })

        it("primitive *Schema helpers add `null` to `type` when nullable is true", function () {
            expect(SB.stringSchema({}, true).schema.type).to.eql(["string", "null"])
            expect(SB.numberSchema({}, true).schema.type).to.eql(["number", "null"])
            expect(SB.integerSchema({}, true).schema.type).to.eql(["integer", "null"])
            expect(SB.booleanSchema({}, true).schema.type).to.eql(["boolean", "null"])
        })

        it("emptySchema nullable produces a `['object', 'null']` schema", function () {
            const s = SB.emptySchema({}, true)
            expect(s.schema.type).to.eql(["object", "null"])
            expect(s.schema.additionalProperties).to.equal(false)
            expect(() => s.validate(null as any)).to.not.throw()
            expect(() => s.validate({} as any)).to.not.throw()
        })

        it("objectSchema nullable produces a `['object', 'null']` schema with properties", function () {
            const s = SB.objectSchema({}, { a: SB.stringSchema() }, true)
            expect(s.schema.type).to.eql(["object", "null"])
            expect(() => s.validate(null as any)).to.not.throw()
            expect(() => s.validate({ a: "ok" })).to.not.throw()
            expect(() => s.validate({ a: 1 } as any)).to.throw()
        })

        it("arraySchema nullable produces a `['array', 'null']` schema", function () {
            const s = SB.arraySchema(SB.stringSchema(), {}, true)
            expect(s.schema.type).to.eql(["array", "null"])
            expect(() => s.validate(null)).to.not.throw()
            expect(() => s.validate(["a", "b"])).to.not.throw()
        })

        it("globalAJVValidationConfig exposes the merged static config", function () {
            const cfg = SB.globalAJVValidationConfig
            expect(cfg).to.be.an("object")
            // Defaults seeded on the class
            expect(cfg.useDefaults).to.equal(true)
            expect(cfg.coerceTypes).to.equal(false)
        })

        it("validate is a no-op success path that exercises cacheValidationFunction", function () {
            const s = SB.emptySchema().addString("s")
            s.cacheValidationFunction() // explicit prime
            expect(() => s.validate({ s: "ok" })).to.not.throw()
            // second call uses the cached function
            expect(() => s.validate({ s: "ok again" })).to.not.throw()
        })
    })

    describe("Instance edge cases", function () {
        it("addProperties throws on a name collision with the existing schema", function () {
            const s = SB.emptySchema({ title: "Box" }).addString("a")
            expect(() => s.addProperties({ a: SB.stringSchema() })).to.throw("Schema Builder Error: 'a' already exists in Box schema")
        })

        it("addProperties throws when called on a non-object schema", function () {
            expect(() => (SB.stringSchema() as any).addProperties({ a: SB.stringSchema() })).to.throw("you can only add properties to an object schema")
        })

        it("addProperty throws when called on a non-object schema", function () {
            expect(() => (SB.stringSchema() as any).addProperty("a", SB.stringSchema())).to.throw("you can only add properties to an object schema")
        })

        it("replaceProperty throws when called on a non-object schema", function () {
            expect(() => (SB.stringSchema() as any).replaceProperty("a", SB.stringSchema())).to.throw("you can only replace properties of an object schema")
        })

        it("renameProperty throws when the source property does not exist", function () {
            const s = SB.emptySchema({ title: "Box" }).addString("a")
            expect(() => (s as any).renameProperty("missing", "x")).to.throw("'renameProperty' called with unknown property 'missing' on Box schema")
        })

        it("renameProperty throws when the target name already exists", function () {
            const s = SB.emptySchema({ title: "Box" }).addString("a").addString("b")
            expect(() => (s as any).renameProperty("a", "b")).to.throw("'renameProperty' target 'b' already exists in Box schema")
        })

        it("renameProperty throws when source and target are the same", function () {
            const s = SB.emptySchema({ title: "Box" }).addString("a")
            expect(() => (s as any).renameProperty("a", "a")).to.throw("'renameProperty' source and target are both 'a' on Box schema")
        })

        it("replaceProperty throws when the property does not exist", function () {
            const s = SB.emptySchema({ title: "Box" }).addString("a")
            expect(() => (s as any).replaceProperty("missing", SB.numberSchema())).to.throw(
                "'replaceProperty' called with unknown property 'missing' on Box schema",
            )
        })

        it("addOrReplaceProperty adds a new property via addProperty (which would reject duplicates)", function () {
            // Sanity-check that the add/replace dispatch works in both branches.
            const base = SB.emptySchema().addString("existing")
            const added = base.addOrReplaceProperty("brandNew", SB.numberSchema())
            expect((added.schema.properties as any).brandNew.type).to.equal("number")
            expect((added.schema.properties as any).existing.type).to.equal("string")

            const replaced = base.addOrReplaceProperty("existing", SB.booleanSchema())
            expect((replaced.schema.properties as any).existing.type).to.equal("boolean")
        })

        it("renameProperty preserves required when renaming a required property", function () {
            const s = SB.emptySchema().addString("a").addBoolean("b", {}, false)
            const renamed = s.renameProperty("a", "a2")
            expect(renamed.schema.required).to.eql(["a2"])
        })

        it("toNullable does not duplicate `null` when a property's type is already `['T', 'null']`", function () {
            const s = SB.emptySchema().addString("a", {}, false, true).toNullable()
            const a: any = (s.schema.properties as any).a
            expect(a.type).to.eql(["string", "null"])
        })

        it("toNullable wraps a property in `anyOf` when it has no `type` (e.g. const)", function () {
            const s = SB.emptySchema().addProperty("c", SB.constSchema("X"), false).toNullable()
            const c: any = (s.schema.properties as any).c
            expect(c.anyOf).to.be.an("array")
            expect(c.anyOf).to.have.length(2)
            expect(c.anyOf[1]).to.eql({ type: "null" })
        })

        it("toNullable adds `null` to an existing `enum` if not already present", function () {
            const s = SB.emptySchema().addEnum("e", ["a", "b"], {}, false).toNullable()
            const e: any = (s.schema.properties as any).e
            expect(e.enum).to.eql(["a", "b", null])
        })

        it("transformPropertiesToArray leaves an already-array property unchanged", function () {
            const s = SB.emptySchema().addArray("a", SB.stringSchema()).transformPropertiesToArray(["a"])
            // Original schema unchanged: no oneOf wrapping
            expect((s.schema.properties as any).a.oneOf).to.equal(undefined)
            expect((s.schema.properties as any).a.type).to.equal("array")
        })

        it("unwrapArrayProperties leaves a non-array property unchanged", function () {
            const s = SB.emptySchema()
                .addString("s")
                .unwrapArrayProperties(["s"] as any)
            expect((s.schema.properties as any).s.type).to.equal("string")
        })

        it("unwrapArrayProperties handles a single-element `prefixItems` tuple", function () {
            const inner = SB.emptySchema().addProperty("a", SB.fromJsonSchema({ type: "array", prefixItems: [{ type: "string" } as any] } as const))
            const result = (inner as any).unwrapArrayProperties(["a"])
            const a: any = (result.schema.properties as any).a
            expect(a.oneOf).to.be.an("array")
            expect(a.oneOf[0]).to.eql({ type: "string" })
        })

        it("unwrapArrayProperties wraps a multi-element `prefixItems` tuple in oneOf", function () {
            const inner = SB.fromJsonSchema({
                type: "object",
                additionalProperties: false,
                properties: {
                    a: { type: "array", prefixItems: [{ type: "string" }, { type: "number" }] },
                },
            } as const)
            const result = (inner as any).unwrapArrayProperties(["a"])
            const a: any = (result.schema.properties as any).a
            expect(a.oneOf).to.be.an("array")
            expect(a.oneOf[0]).to.eql({ oneOf: [{ type: "string" }, { type: "number" }] })
        })

        it("getItemsSubschema throws when the schema is not an array schema", function () {
            const s = SB.emptySchema().addString("s")
            expect(() => (s as any).getItemsSubschema()).to.throw("'getItemsSubschema' can only be used with an array schema with non-tuple items")
        })

        it("getItemsSubschema throws when the schema uses `prefixItems` (tuple form)", function () {
            const tuple = SB.fromJsonSchema({ type: "array", prefixItems: [{ type: "string" }, { type: "number" }] } as const)
            expect(() => (tuple as any).getItemsSubschema()).to.throw("'getItemsSubschema' can only be used with an array schema with non-tuple items")
        })

        it("addAdditionalProperties without a builder sets it to `true`", function () {
            const s = SB.emptySchema().addString("s").addAdditionalProperties()
            expect(s.schema.additionalProperties).to.equal(true)
        })

        it("isObjectSchema is true for a typeless schema that declares `properties`", function () {
            const s = new SchemaBuilder({ properties: { a: { type: "string" } } })
            expect(s.isObjectSchema).to.equal(true)
        })

        it("isArraySchema is true for a typed array schema and for a typeless schema with `items`", function () {
            const arr = SB.arraySchema(SB.stringSchema())
            expect(arr.isArraySchema).to.equal(true)
            const inferred = new SchemaBuilder({ items: { type: "string" } })
            expect(inferred.isArraySchema).to.equal(true)
        })

        it("properties/requiredProperties/optionalProperties return null on schemas that use combination keywords", function () {
            const s = SB.oneOf(SB.emptySchema().addString("s"), SB.emptySchema().addNumber("n"))
            expect(s.properties).to.equal(null)
            expect(s.requiredProperties).to.equal(null)
            expect(s.optionalProperties).to.equal(null)
        })

        it("setSchemaAttributes shallow-merges general attributes onto a fresh schema", function () {
            const s = SB.emptySchema().addString("s")
            const updated = s.setSchemaAttributes({ title: "Updated", description: "desc" })
            expect(updated.schema.title).to.equal("Updated")
            expect(updated.schema.description).to.equal("desc")
            // does not mutate the original
            expect(s.schema.title).to.equal(undefined)
        })

        it("pickAdditionalProperties with capture names makes them required (locked behavior)", function () {
            // The captured names land in `required` (intentional — see the JSDoc note).
            const s = SB.emptySchema().addString("s").addAdditionalProperties(SB.numberSchema()).pickAdditionalProperties(["s"], ["captured"])
            expect((s.schema as any).required).to.include("captured")
            expect(() => s.validate({ s: "x", captured: 1 })).to.not.throw()
            // Missing the captured property fails validation because it's now required.
            expect(() => s.validate({ s: "x" } as any)).to.throw()
        })

        it("pickAdditionalProperties with capture names defaults the captured schema to `{}` when additionalProperties was `true`", function () {
            const s = SB.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"], ["captured"])
            expect((s.schema.properties as any).captured).to.eql({})
        })
    })

    describe("toTypescript", function () {
        it("emits SB.allOf for an allOf schema", function () {
            const s = SB.allOf(SB.stringSchema(), SB.numberSchema())
            expect(s.toTypescript()[1]).to.equal("SB.allOf(SB.stringSchema(), SB.numberSchema())")
        })

        it("emits SB.oneOf for a oneOf schema", function () {
            const s = SB.oneOf(SB.stringSchema(), SB.booleanSchema())
            expect(s.toTypescript()[1]).to.equal("SB.oneOf(SB.stringSchema(), SB.booleanSchema())")
        })

        it("emits SB.anyOf for an anyOf schema", function () {
            const s = SB.anyOf(SB.stringSchema(), SB.numberSchema())
            expect(s.toTypescript()[1]).to.equal("SB.anyOf(SB.stringSchema(), SB.numberSchema())")
        })

        it("emits SB.not for a not schema", function () {
            const s = SB.not(SB.stringSchema())
            expect(s.toTypescript()[1]).to.equal("SB.not(SB.stringSchema())")
        })

        it("emits SB.nullSchema for a null-typed schema", function () {
            expect(SB.nullSchema().toTypescript()[1]).to.equal("SB.nullSchema()")
        })

        it("emits SB.neverSchema for a `type: []` schema", function () {
            expect(SB.neverSchema().toTypescript()[1]).to.equal("SB.neverSchema()")
        })

        it("emits SB.arraySchema (with nested helper) for an array schema", function () {
            const s = SB.arraySchema(SB.stringSchema())
            expect(s.toTypescript()[1]).to.equal("SB.arraySchema(SB.stringSchema())")
        })

        it("emits SB.arraySchema with nullable suffix when the array is `['array', 'null']`", function () {
            const s = SB.arraySchema(SB.stringSchema(), {}, true)
            expect(s.toTypescript()[1]).to.equal("SB.arraySchema(SB.stringSchema(), {}, true)")
        })

        it("emits SB.enumSchema for a schema with an `enum` keyword", function () {
            const s = SB.enumSchema(["a", "b"] as const)
            expect(s.toTypescript()[1]).to.equal('SB.enumSchema(["a","b"], )')
        })

        it("collapses a single-entry `type` array down to a primitive", function () {
            const s = SB.fromJsonSchema({ type: ["string"] } as const)
            expect(s.toTypescript()[1]).to.equal("SB.stringSchema()")
        })

        it("emits `.addAdditionalProperties(...)` for objects that accept extra properties", function () {
            const withSchema = SB.emptySchema().addString("s").addAdditionalProperties(SB.numberSchema())
            expect(withSchema.toTypescript()[1]).to.contain(".addAdditionalProperties(SB.numberSchema())")

            const withTrue = SB.emptySchema().addString("s").addAdditionalProperties()
            expect(withTrue.toTypescript()[1]).to.contain(".addAdditionalProperties()")
        })

        it("emits SB.tupleSchema for an array schema with prefixItems", function () {
            const tuple = SB.tupleSchema([SB.stringSchema(), SB.numberSchema()])
            const code = tuple.toTypescript()[1]
            expect(code).to.contain("SB.tupleSchema([SB.stringSchema(), SB.numberSchema()])")
        })

        it("emits SB.tupleSchema with `rest` option when items is a schema", function () {
            const tuple = SB.tupleSchema([SB.stringSchema()], { rest: SB.numberSchema() })
            const code = tuple.toTypescript()[1]
            expect(code).to.contain("SB.tupleSchema([SB.stringSchema()]")
            expect(code).to.contain("rest: SB.numberSchema()")
        })

        it("preserves a non-default minItems override when emitting SB.tupleSchema", function () {
            const tuple = SB.fromJsonSchema({
                type: "array",
                prefixItems: [{ type: "string" }, { type: "number" }],
                items: false,
                minItems: 1,
            } as const)
            const code = tuple.toTypescript()[1]
            expect(code).to.contain('"minItems":1')
        })

        it("returns a named-schema reference when recursing into a child that has a `title`", function () {
            const inner = SB.objectSchema({ title: "Inner" }, { v: SB.stringSchema() })
            const outer = SB.objectSchema({}, { inner })
            const [varName, code] = outer.toTypescript()
            expect(varName).to.equal("schema") // outer has no title
            // The reference to the named child schema is emitted by variable name,
            // not by inlining its full definition.
            expect(code).to.contain("innerSchema")
            expect(code).to.not.contain('"title":"Inner"')
        })

        it("derives the variable name from the schema title", function () {
            const s = SB.emptySchema({ title: "Outer" }).addString("s")
            expect(s.toTypescript()[0]).to.equal("outerSchema")
        })

        it("falls back to SB.fromJsonSchema for unhandled shapes", function () {
            const s = SB.fromJsonSchema({ type: ["string", "number"] } as const)
            const code = s.toTypescript()[1]
            expect(code.startsWith("SB.fromJsonSchema(")).to.equal(true)
        })

        it("invokes the customizeOutput hook for every emitted fragment", function () {
            const inner = SB.objectSchema({ title: "Inner" }, { v: SB.stringSchema() })
            const outer = SB.objectSchema({}, { inner })
            const seen: string[] = []
            const [, code] = outer.toTypescript((output, schema) => {
                seen.push(schema.schema.title ?? "(no title)")
                return `/*hooked*/${output}`
            })
            expect(code.startsWith("/*hooked*/")).to.equal(true)
            // The inner reference (named schema) and at least the string subschemas
            // pass through customizeOutput too.
            expect(seen).to.include("Inner")
        })
    })

    describe("Test Pattern Properties", function () {
        it("should create a schema with pattern properties", function () {
            //SB.setGlobalValidationConfig({ verbose: true })
            let schema = SB.objectSchema({}, { notPatternProperties: SB.stringSchema() })
                .addPatternProperty("X-", "", SB.stringSchema())
                .addPatternProperty("o-", "", SB.objectSchema({}, { test: SB.stringSchema() }))
            type Schema = typeof schema.T
            const goodData: Schema = {
                notPatternProperties: "test",
                "X-value1": "v1",
                "X-value2": "v2",
                "o-object1": { test: "Hello" },
                "o-object2": { test: "World" },
            }
            const badData: any = {
                notPatternProperties: "test",
                "X-value1": 21,
                "X-GoodValue": "Good Value",
                "X-value2": true,
                "o-object1": { id: "Hello" },
                "o-object2": { test: { id: "wrong data" } },
            }
            expect(() => schema.validate(goodData)).to.not.throw()
            expect(() => schema.validate(badData)).to.throw(
                "Invalid parameters: data/X-value1 must be string, data/X-value2 must be string, data/o-object1 must have required property 'test', data/o-object1 must NOT have additional properties, data/o-object2/test must be string",
            )
        })
    })
})

describe("Test Side Effects With global AJV config", function () {
    it("should change the global configuration of validation an validate differently", function () {
        SB.setGlobalValidationConfig({ allErrors: true })
        let testSchema = SB.objectSchema(
            {},
            {
                name: SB.stringSchema(),
                progress: SB.numberSchema(),
                isCompleted: [SB.booleanSchema(), undefined],
            },
        )
        expect(() => testSchema.validate({} as any)).to.throw(
            "Invalid parameters: data must have required property 'name', data must have required property 'progress'",
        )
        SB.setGlobalValidationConfig({ allErrors: false })
        expect(() => testSchema.validate({} as any)).to.throw("Invalid parameters: data must have required property 'name'")
    })
})
