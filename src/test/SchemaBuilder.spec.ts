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
                expect(error.message).to.equal(
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
