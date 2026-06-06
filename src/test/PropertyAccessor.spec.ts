import { expect } from "chai"
import { createPropertyAccessor } from "../PropertyAccessor.js"
import { SchemaBuilder } from "../SchemaBuilder.js"

describe("Property Accessor", function () {
    it("should get and set a top level property", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addNumber("n")
        const data: typeof schema.T = { s: "test", n: 42 }
        const pa = createPropertyAccessor<typeof schema.T>().s
        expect(pa.path).eqls(["s"])
        expect(pa.get(data)).to.equals("test")
        expect(pa.set(data, "modified")).to.eqls({ s: "modified", n: 42 })
    })

    it("should get, set and unset a deeply nested property", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addProperty("o", SchemaBuilder.emptySchema().addNumber("n", {}, false), false).toNullable()
        const data: typeof schema.T = { s: "test", o: { n: 42 } }
        const pa = createPropertyAccessor<typeof schema.T>().o.n
        expect(pa.path).eqls(["o", "n"])
        expect(pa.get(data)).to.equals(42)
        expect(pa.set(data, 21)).to.eqls({ s: "test", o: { n: 21 } })
        expect(pa.set(data, 21)).to.not.equals({ s: "test", o: { n: 21 } })
        expect(pa.unset(data)).to.eqls({ s: "test", o: {} })
    })

    it("should get, set and unset a deeply nested property in an array", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", a: [{ n: 42 }] }
        const pa = createPropertyAccessor<typeof schema.T>().a[0].n
        expect(pa.path).eqls(["a", 0, "n"])
        expect(pa.get(data)).to.equals(42)
        expect(pa.set(data, 21)).to.eqls({ s: "test", a: [{ n: 21 }] })
        expect(pa.unset(data)).to.eqls({ s: "test", a: [{}] })
    })

    it("should add element to an array", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s").addArray("a", SchemaBuilder.emptySchema().addNumber("n"))
        const data: typeof schema.T = { s: "test", a: [{ n: 42 }] }
        const pa = createPropertyAccessor<typeof schema.T>().a[1].n
        expect(pa.path).eqls(["a", 1, "n"])
        expect(pa.set(data, 21)).to.eqls({ s: "test", a: [{ n: 42 }, { n: 21 }] })
    })

    it("preserves the root array type when set is called with an array root", function () {
        type Items = { n: number }[]
        const data: Items = [{ n: 1 }, { n: 2 }]
        const pa = createPropertyAccessor<Items>()[1].n
        const result = pa.set(data, 99)
        expect(Array.isArray(result)).to.equal(true)
        expect(result).to.eqls([{ n: 1 }, { n: 99 }])
        // Original array is not mutated
        expect(data).to.eqls([{ n: 1 }, { n: 2 }])
    })

    it("preserves the root array type when unset is called with an array root", function () {
        type Items = { n?: number }[]
        const data: Items = [{ n: 1 }, { n: 2 }]
        const pa = createPropertyAccessor<Items>()[0].n
        const result = pa.unset(data)
        expect(Array.isArray(result)).to.equal(true)
        expect(result).to.eqls([{}, { n: 2 }])
        expect(data).to.eqls([{ n: 1 }, { n: 2 }])
    })

    it("preserves the root array type even for a single-element path on the array itself", function () {
        type Items = ({ n: number } | undefined)[]
        const data: Items = [{ n: 1 }, { n: 2 }, { n: 3 }]
        const pa = createPropertyAccessor<Items>()[2]
        const setResult = pa.set(data, { n: 99 })
        expect(Array.isArray(setResult)).to.equal(true)
        expect(setResult).to.eqls([{ n: 1 }, { n: 2 }, { n: 99 }])
        const unsetResult = pa.unset(data)
        expect(Array.isArray(unsetResult)).to.equal(true)
        // `delete` on an array index leaves a sparse hole; behavior matches Object.assign semantics
        expect(unsetResult).to.have.length(3)
        expect(unsetResult[0]).to.eql({ n: 1 })
        expect(unsetResult[1]).to.eql({ n: 2 })
        expect(2 in unsetResult).to.equal(false)
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

    it("throws when narrow is called on a schema-backed accessor without a transform", function () {
        const schema = SchemaBuilder.emptySchema({}).addString("s")
        const pa = createPropertyAccessor(schema).s
        expect(() => (pa as any).narrow()).to.throw("'schemaTransform' is mandatory when narrowing a property accessor with a schema")
    })

    it("allows narrow with no schema and no transform (returns a schema-less accessor)", function () {
        type M = { o: { s: string } | { n: number } }
        const data: M = { o: { s: "hi" } }
        const pa = createPropertyAccessor<M>().o.narrow<{ s: string }>()
        expect(pa.path).eqls(["o"])
        expect(pa.schema).to.equal(undefined)
        expect(pa.get(data)).to.eql({ s: "hi" })
    })

    it("returns undefined when getting a path through a missing intermediate", function () {
        const pa = createPropertyAccessor<{ o?: { n: number } }>().o.n
        expect(pa.get({})).to.equal(undefined)
        expect(pa.get({ o: undefined } as any)).to.equal(undefined)
    })

    it("unset is a no-op when an intermediate object is missing", function () {
        const pa = createPropertyAccessor<{ o?: { n?: number } }>().o.n
        const result = pa.unset({})
        expect(result).to.eql({})
    })

    it("returns the input untouched when set is called with an empty-path accessor", function () {
        // An empty path can only be obtained at the very root of the builder.
        const pa = createPropertyAccessor<{ a: number }>()
        const data = { a: 1 }
        const result = pa.set(data, { a: 2 })
        // mutatePath with an empty path returns a shallow copy of the data
        expect(result).to.eql({ a: 1 })
        expect(result).to.not.equal(data)
    })

    it("exposes reserved property names directly from the accessor instead of recursing", function () {
        const pa = createPropertyAccessor<{ x: number }>()
        // Accessing `path`, `get`, `set`, `unset`, `schema`, `transform`, `narrow`
        // must return the accessor's own values, not build a deeper accessor.
        expect(pa.path).to.eql([])
        expect(typeof pa.get).to.equal("function")
        expect(typeof pa.set).to.equal("function")
        expect(typeof pa.unset).to.equal("function")
        expect(typeof pa.transform).to.equal("function")
        expect(typeof pa.narrow).to.equal("function")
    })
})
