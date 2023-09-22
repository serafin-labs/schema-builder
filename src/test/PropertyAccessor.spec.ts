import { expect } from "chai"
import { SchemaBuilder } from "../SchemaBuilder.js"
import { createPropertyAccessor } from "../PropertyAccessor.js"
import { pipeline } from "stream"
import { JSONSchema } from "../JsonSchema.js"

describe("Property Accessor", function () {
    it("should get and set a top level property", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addNumber("n")
        const data: typeof schema.T = { s: "test", n: 42 }
        const pa = createPropertyAccessor<typeof schema.T>().s
        expect(pa.path).eqls(["s"])
        expect(pa.get(data)).to.equals("test")
        expect(pa.set(data, "modified")).to.eqls({ s: "modified", n: 42 })
    })

    it("should get and set a deeply nested property", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addProperty("o", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", o: { n: 42 } }
        const pa = createPropertyAccessor<typeof schema.T>().o.n
        expect(pa.path).eqls(["o", "n"])
        expect(pa.get(data)).to.equals(42)
        expect(pa.set(data, 21)).to.eqls({ s: "test", o: { n: 21 } })
        expect(pa.set(data, 21)).to.not.equals({ s: "test", o: { n: 21 } })
    })

    it("should get and set a deeply nested property in an array", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", a: [{ n: 42 }] }
        const pa = createPropertyAccessor<typeof schema.T>().a[0].n
        expect(pa.path).eqls(["a", 0, "n"])
        expect(pa.get(data)).to.equals(42)
        expect(pa.set(data, 21)).to.eqls({ s: "test", a: [{ n: 21 }] })
    })

    it("should add element to an array", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", a: [{ n: 42 }] }
        const pa = createPropertyAccessor<typeof schema.T>().a[1].n
        expect(pa.path).eqls(["a", 1, "n"])
        expect(pa.set(data, 21)).to.eqls({ s: "test", a: [{ n: 42 }, { n: 21 }] })
    })

    it("should copy intermediate objects but not unchanged properties", function () {
        const schema = SchemaBuilder.emptySchema({})
            .addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
            .addProperty("o", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { a: [{ n: 42 }], o: { n: 42 } }
        const pa1 = createPropertyAccessor<typeof schema.T>().a[0].n
        const r1 = pa1.set(data, 42)
        expect(r1.o).to.equals(data.o)
        expect(r1.a).to.not.equals(data.a)
        const pa2 = createPropertyAccessor<typeof schema.T>().o.n
        const r2 = pa2.set(data, 42)
        expect(r2.o).to.not.equals(data.o)
        expect(r2.a).to.equals(data.a)
    })

    it("should initialize missing arrays and objects", function () {
        const schema = SchemaBuilder.emptySchema({}).addArray("a", SchemaBuilder.emptySchema().addNumber("n"), {}, false)
        const data: typeof schema.T = {}
        const pa = createPropertyAccessor<typeof schema.T>()("a")(0)("n")
        expect(pa.set(data, 42)).to.eqls({ a: [{ n: 42 }] })
    })

    it("should transform the result in and out", function () {
        const schema = SchemaBuilder.emptySchema({}).addNumber("n")
        const data: typeof schema.T = { n: 42 }
        const pa = createPropertyAccessor<typeof schema.T>().n.transform(
            (v) => `${v}`,
            (v) => Number(v),
        )
        expect(pa.path).eqls(["n"])
        expect(pa.get(data)).to.equals("42")
        expect(pa.set(data, "43")).to.eqls({ n: 43 })
    })

    it("should fail set when transform setValueMapping is not defined", function () {
        const schema = SchemaBuilder.emptySchema({}).addNumber("n")
        const data: typeof schema.T = { n: 42 }
        const pa = createPropertyAccessor<typeof schema.T>().n.transform((v) => `${v}`)
        expect(pa.path).eqls(["n"])
        expect(pa.get(data)).to.equals("42")
        expect(pa.set.bind(pa, data, "43")).to.throw()
    })

    it("should transform objects", function () {
        const schema = SchemaBuilder.emptySchema({}).addProperty("o", SchemaBuilder.emptySchema({}).addNumber("n").addString("s"))
        const data: typeof schema.T = { o: { n: 42, s: "test" } }
        const pa = createPropertyAccessor<typeof schema.T>().o.transform(
            (v) => v.n,
            (v, d) => ({ ...d, n: v }),
        )
        expect(pa.path).eqls(["o"])
        expect(pa.get(data)).to.equals(42)
        expect(pa.set(data, 43)).to.eqls({ o: { n: 43, s: "test" } })
    })

    it("should build a path to a tuple element", function () {
        const pa = createPropertyAccessor<{ a: [string, number, boolean] }>().a[1]
        expect(pa.set({ a: ["test", 42, true] }, 43)).to.eqls({ a: ["test", 43, true] })
    })

    it("should get a sub schema", function () {
        const schema = SchemaBuilder.emptySchema({}).addProperty(
            "o",
            SchemaBuilder.emptySchema({}).addArray(
                "a",
                SchemaBuilder.emptySchema({}).addNumber("n", { description: "A number" }).addString("s", { description: "A string" }),
            ),
        )
        const pa1 = createPropertyAccessor(schema).o.a[0].n
        expect(pa1.schema.schema.description).to.equals("A number")
        const pa2 = createPropertyAccessor(schema)("o")("a")(0)("s")
        expect(pa2.schema.schema.description).to.equals("A string")
    })

    it("should narrow a union type schema", function () {
        const schema1 = SchemaBuilder.emptySchema({}).addString("s", { description: "A string" })
        const schema2 = SchemaBuilder.emptySchema({}).addNumber("n")
        const schema3 = SchemaBuilder.emptySchema({}).addProperty("o", SchemaBuilder.oneOf(schema1, schema2))

        const pa = createPropertyAccessor(schema3).o.narrow(() => schema1).s
        expect(pa.path).eqls(["o", "s"])
        expect(pa.schema.schema.description).to.equals("A string")
    })
})
