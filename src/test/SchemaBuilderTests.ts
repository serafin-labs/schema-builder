import { expect } from "chai"
import { SchemaBuilder } from "../"
import { JSONSchema } from "../JsonSchema"

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
        let schemaBuilder = SchemaBuilder.oneOf(SchemaBuilder.stringSchema(), SchemaBuilder.emptySchema(), SchemaBuilder.booleanSchema())
        expect((schemaBuilder.schema.oneOf as any).length).to.eqls(3)
        let schemaBuilder2 = SchemaBuilder.allOf(SchemaBuilder.stringSchema(), SchemaBuilder.emptySchema({ title: "test" }))
        expect((schemaBuilder2.schema.allOf as any).length).to.eqls(2)
        let schemaBuilder3 = SchemaBuilder.anyOf(
            SchemaBuilder.stringSchema(),
            SchemaBuilder.emptySchema(),
            SchemaBuilder.booleanSchema(),
            SchemaBuilder.numberSchema(),
        )
        expect((schemaBuilder3.schema.anyOf as any).length).to.eqls(4)
        let schemaBuilder4 = SchemaBuilder.not(SchemaBuilder.stringSchema())
        expect(schemaBuilder4.schema.not).to.exist
    })

    it("should create simple properties and validate data", function () {
        let subObjectSchemaBuilder = SchemaBuilder.emptySchema().addString("s")
        let schemaBuilder = SchemaBuilder.emptySchema()
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
            .addProperty("o1", subObjectSchemaBuilder)
            .addProperty("o2", subObjectSchemaBuilder, false)
            .addArray("sa1", SchemaBuilder.stringSchema())
            .addArray("sa2", SchemaBuilder.stringSchema(), {}, false)
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
                o1: { s: "test" },
                sa1: ["test"],
                a1: [{ s: "test" }],
            }),
        ).to.not.throw()
        expect(() => schemaBuilder.validate({} as any)).to.throw()
    })

    it("should change validation config and copy it throught transformations", function () {
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").configureValidation({ coerceTypes: false }).addNumber("n")
        expect(schemaBuilder).to.exist
        expect(() =>
            schemaBuilder.validate({
                n: 42,
                s: "test",
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder.validate({
                n: "42",
                s: "test",
            } as any),
        ).to.throw()
    })

    it("should fail to add a property that already exists", function () {
        expect(() => SchemaBuilder.emptySchema().addString("s1").addBoolean("s1")).to.throw()
        expect(() => SchemaBuilder.emptySchema().addString("s1").addBoolean("s1", {}, false)).to.throw()
    })

    it("should fail to add a property to a non-object schema", function () {
        expect(() => SchemaBuilder.stringSchema().addString("s1")).to.throw()
        expect(() => SchemaBuilder.stringSchema().addString("s1", {}, false)).to.throw()
    })

    it("should create a schema with additional properties", function () {
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addAdditionalProperties()
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
        expect(() => SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().addAdditionalProperties()).to.throw()
    })

    it("should set optional properties", function () {
        let schemaBuilder = SchemaBuilder.emptySchema()
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addBoolean("b", {}, false).setRequiredProperties(["b"])
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s", { default: "test" }).addBoolean("b").toOptionals()
        expect(((schemaBuilder.schema.properties as any).s as JSONSchema).default).to.not.exist
        expect(() => schemaBuilder.validate({})).to.not.throw()
    })

    it("should convert to deep optionals", function () {
        let innerSchema = SchemaBuilder.emptySchema().addString("ss", { default: "test" }).addBoolean("sb")
        let schemaBuilder = SchemaBuilder.emptySchema().addBoolean("b", { default: true }).addProperty("s", innerSchema).toDeepOptionals()
        expect(((schemaBuilder.schema.properties as any).b as JSONSchema).default).to.not.exist
        expect(((((schemaBuilder.schema.properties as any).s as JSONSchema).properties as any).ss as JSONSchema).default).to.not.exist
        expect(() => schemaBuilder.validate({ s: { ss: "test" } })).to.not.throw()
    })

    it("should add nullable properties", function () {
        let schemaBuilder = SchemaBuilder.emptySchema()
            .addEnum("s", ["a", "b", "c"], {}, false, true)
            .addArray("a", SchemaBuilder.stringSchema(), {}, false, true)
        expect(() => schemaBuilder.validate({ s: null, a: null })).to.not.throw()
    })

    it("should convert to nullable", function () {
        let schemaBuilder = SchemaBuilder.emptySchema().addEnum("s", ["a", "b", "c"], {}, false).addArray("a", SchemaBuilder.stringSchema(), {}, false)
        expect(() => schemaBuilder.validate({ s: null, a: null } as any)).to.throw()
        expect(() => schemaBuilder.toNullable().validate({ s: null, a: null })).to.not.throw()
    })

    it("should rename a property", function () {
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addBoolean("b", {}, false).renameProperty("s", "s2").renameProperty("b", "b2")
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addBoolean("b", {}, false).pickProperties(["b"])
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addBoolean("b", {}, false).omitProperties(["s"])
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"])
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"], [])
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"], ["test"])
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
        let schemaBuilder = SchemaBuilder.emptySchema().addArray("s", SchemaBuilder.stringSchema()).transformProperties(SchemaBuilder.stringSchema(), ["s"])
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
        let schemaBuilder2 = SchemaBuilder.emptySchema().addArray("s", SchemaBuilder.stringSchema()).transformProperties(SchemaBuilder.stringSchema())
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s", {}, false).addArray("a", SchemaBuilder.booleanSchema()).unwrapArrayProperties(["a"])
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
        let schemaBuilder2 = SchemaBuilder.emptySchema().addString("s", {}, false).addArray("a", SchemaBuilder.booleanSchema()).unwrapArrayProperties()
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
        let schemaBuilder = SchemaBuilder.emptySchema().addString("s").transformPropertiesToArray(["s"])
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
        let schemaBuilder2 = SchemaBuilder.emptySchema().addString("s").transformPropertiesToArray()
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
        let schemaBuilder1 = SchemaBuilder.emptySchema().addString("s").addBoolean("b")
        let schemaBuilder2 = SchemaBuilder.emptySchema().addString("s", {}, false).intersectProperties(schemaBuilder1)
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
        expect(() => SchemaBuilder.emptySchema().intersectProperties(SchemaBuilder.emptySchema().addString("test"))).to.not.throw()
    })

    it("should merge properties", function () {
        let schemaBuilder1 = SchemaBuilder.emptySchema().addProperty("s", SchemaBuilder.emptySchema().addString("v")).addBoolean("b")
        let schemaBuilder2 = SchemaBuilder.emptySchema().addBoolean("s", {}, false).mergeProperties(schemaBuilder1)
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
        let schemaBuilder1 = SchemaBuilder.emptySchema()
            .addProperty("s", SchemaBuilder.emptySchema().addString("v"))
            .addBoolean("b")
            .addBoolean("s2", {}, false)
            .addBoolean("s3", {})
        let schemaBuilder2 = SchemaBuilder.emptySchema().addBoolean("s", {}, false).addString("s2").addString("s3").overwriteProperties(schemaBuilder1)
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
        let schemaBuilder = SchemaBuilder.allOf(SchemaBuilder.emptySchema().addString("s"), SchemaBuilder.emptySchema().addBoolean("b"))
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
        expect(() => schemaBuilder.transformProperties(SchemaBuilder.stringSchema(), ["s"])).to.throw()
        expect(() => schemaBuilder.transformPropertiesToArray()).to.throw()
        expect(() => schemaBuilder.intersectProperties(SchemaBuilder.emptySchema())).to.throw()
        expect(() => schemaBuilder.mergeProperties(SchemaBuilder.emptySchema())).to.throw()
        expect(() => schemaBuilder.overwriteProperties(SchemaBuilder.emptySchema())).to.throw()
    })

    it("should initialize a complex schema and validate data", function () {
        let taskSchema = SchemaBuilder.emptySchema().addString("name").addNumber("progress").addBoolean("isCompleted", {}, false)

        let userSchema = SchemaBuilder.emptySchema()
            .addString("id", { pattern: "\\w" })
            .addString("firstName")
            .addString("lastName")
            .addEnum("role", ["admin", "user"])
            .addString("email", { format: "email" })
            .addArray("tags", SchemaBuilder.stringSchema(), { minItems: 1 })
            .addInteger("age", {}, false)
            .addArray("friendsIds", SchemaBuilder.stringSchema(), {}, false)
            .addArray("tasks", taskSchema)

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
                        isCompleted: false,
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
            .toOptionals()
        type QueryUser = typeof queryUserSchema.T
        let q: QueryUser = {
            tags: "admin",
            age: [30, 31],
        }
        expect(queryUserSchema).to.exist
        expect(() => queryUserSchema.validate(q)).to.not.throw()
        expect(() => queryUserSchema.validateList([q])).to.not.throw()
        expect(
            queryUserSchema.validate.bind(queryUserSchema, {
                tags: "admin",
                age: "test",
            } as any),
        ).to.throw()
        expect(
            queryUserSchema.validateList.bind(queryUserSchema, [
                {
                    tags: "admin",
                    age: "test",
                } as any,
            ]),
        ).to.throw()
    })

    it("should set an inline schema", function () {
        let schemaBuilder = SchemaBuilder.fromJsonSchema({
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
                    items: [
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
        let schemaBuilder1 = SchemaBuilder.emptySchema().addProperty("s", SchemaBuilder.emptySchema().addString("v")).addBoolean("b")
        let schemaBuilder2 = schemaBuilder1.replaceProperty("s", SchemaBuilder.booleanSchema())
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
        let schemaBuilder1 = SchemaBuilder.emptySchema().addProperty("s", SchemaBuilder.emptySchema().addString("v"))
        let schemaBuilder2 = schemaBuilder1.getSubschema("s")
        expect(schemaBuilder2).to.exist
        expect(() =>
            schemaBuilder2.validate({
                v: "test",
            }),
        ).to.not.throw()
        expect(() =>
            schemaBuilder2.validate({
                s: { v: "test" },
            } as any),
        ).to.throw()
    })

    it("should get schema properties", function () {
        let schemaBuilder = SchemaBuilder.emptySchema().addString("req").addNumber("opt", {}, false)
        expect(schemaBuilder.properties).to.eql(["req", "opt"])
        expect(schemaBuilder.requiredProperties).to.eql(["req"])
        expect(schemaBuilder.optionalProperties).to.eql(["opt"])
    })
})
