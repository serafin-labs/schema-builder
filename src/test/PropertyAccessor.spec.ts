import { expect } from "chai"
import { SchemaBuilder } from "../SchemaBuilder"
import { createPropertyAccessor } from "../PropertyAccessor"

describe("Property Accessor", function () {
    it("should get and set a top level property", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addNumber("n")
        const data: typeof schema.T = { s: "test", n: 42 }
        const pa = createPropertyAccessor<typeof schema.T>()("s")
        expect(pa.path).eqls(["s"])
        expect(pa.get(data)).to.equals("test")
        expect(pa.set(data, "modified")).to.eqls({ s: "modified", n: 42 })
    })

    it("should get and set a deeply nested property", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addProperty("o", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", o: { n: 42 } }
        const pa = createPropertyAccessor<typeof schema.T>()("o")("n")
        expect(pa.path).eqls(["o", "n"])
        expect(pa.get(data)).to.equals(42)
        expect(pa.set(data, 21)).to.eqls({ s: "test", o: { n: 21 } })
        expect(pa.set(data, 21)).to.not.equals({ s: "test", o: { n: 21 } })
    })

    it("should get and set a deeply nested property in an array", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", a: [{ n: 42 }] }
        const pa = createPropertyAccessor<typeof schema.T>()("a")(0)("n")
        expect(pa.path).eqls(["a", 0, "n"])
        expect(pa.get(data)).to.equals(42)
        expect(pa.set(data, 21)).to.eqls({ s: "test", a: [{ n: 21 }] })
    })

    it("should add element to an array", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", a: [{ n: 42 }] }
        const pa = createPropertyAccessor<typeof schema.T>()("a")(1)("n")
        expect(pa.path).eqls(["a", 1, "n"])
        expect(pa.set(data, 21)).to.eqls({ s: "test", a: [{ n: 42 }, { n: 21 }] })
    })

    it("should copy intermediate objects but not unchanged properties", function () {
        const schema = SchemaBuilder.emptySchema({})
            .addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
            .addProperty("o", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { a: [{ n: 42 }], o: { n: 42 } }
        const pa1 = createPropertyAccessor<typeof schema.T>()("a")(0)("n")
        const r1 = pa1.set(data, 42)
        expect(r1.o).to.equals(data.o)
        expect(r1.a).to.not.equals(data.a)
        const pa2 = createPropertyAccessor<typeof schema.T>()("o")("n")
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
})
