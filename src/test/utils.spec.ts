import { expect } from "chai"
import { cloneRoot, cloneJSON, setRequired } from "../utils.js"
import { JSONSchema } from "../JsonSchema.js"

describe("utils", function () {
    describe("cloneRoot", function () {
        it("shallow-clones a plain object root", function () {
            const root = { a: 1, b: { nested: true } }
            const copy = cloneRoot(root)
            expect(copy).to.not.equal(root)
            expect(copy).to.eql(root)
            // Unlisted nested values keep their reference (shallow root clone only)
            expect(copy.b).to.equal(root.b)
        })

        it("shallow-clones an array root", function () {
            const root = [1, 2, 3]
            const copy = cloneRoot(root)
            expect(copy).to.not.equal(root)
            expect(copy).to.eql(root)
            expect(Array.isArray(copy)).to.equal(true)
        })

        it("shallow-clones listed container keys when present", function () {
            const inner = { p: { type: "string" } }
            const root: any = { properties: inner, other: { keep: true } }
            const copy: any = cloneRoot(root, { properties: {} })
            expect(copy).to.not.equal(root)
            expect(copy.properties).to.not.equal(inner)
            expect(copy.properties).to.eql(inner)
            // unlisted keys keep reference
            expect(copy.other).to.equal(root.other)
        })

        it("clones array containers when listed and present", function () {
            const required = ["a", "b"]
            const root: any = { required }
            const copy: any = cloneRoot(root, { required: [] })
            expect(copy.required).to.not.equal(required)
            expect(copy.required).to.eql(required)
            expect(Array.isArray(copy.required)).to.equal(true)
        })

        it("falls back to the provided default container when the key is missing", function () {
            const root: any = {}
            const copy: any = cloneRoot(root, { properties: {}, required: [] })
            expect(copy.properties).to.eql({})
            expect(copy.required).to.eql([])
            expect(Array.isArray(copy.required)).to.equal(true)
        })

        it("falls back to defaults when the existing key is null", function () {
            const root: any = { properties: null }
            const copy: any = cloneRoot(root, { properties: {} })
            expect(copy.properties).to.eql({})
        })

        it("does not mutate the original when the copy is mutated", function () {
            const root: any = { properties: { a: 1 } }
            const copy: any = cloneRoot(root, { properties: {} })
            copy.properties.b = 2
            expect(root.properties).to.eql({ a: 1 })
        })
    })

    describe("cloneJSON", function () {
        it("returns primitives unchanged", function () {
            expect(cloneJSON(42)).to.equal(42)
            expect(cloneJSON("test")).to.equal("test")
            expect(cloneJSON(true)).to.equal(true)
            expect(cloneJSON(null)).to.equal(null)
            expect(cloneJSON(undefined)).to.equal(undefined)
        })

        it("deep-clones plain objects", function () {
            const o = { a: 1, b: { c: 2 } }
            const c = cloneJSON(o)
            expect(c).to.not.equal(o)
            expect(c.b).to.not.equal(o.b)
            expect(c).to.eql(o)
        })

        it("deep-clones arrays and nested arrays", function () {
            const a = [1, [2, [3, 4]]]
            const c = cloneJSON(a)
            expect(c).to.not.equal(a)
            expect(c[1]).to.not.equal(a[1])
            expect(c).to.eql(a)
        })

        it("copies only own enumerable keys (ignores prototype chain)", function () {
            const proto = { inherited: "x" }
            const o = Object.create(proto)
            o.own = 1
            const c: any = cloneJSON(o)
            expect(c.own).to.equal(1)
            expect("inherited" in c).to.equal(false)
        })
    })

    describe("setRequired", function () {
        it("deletes 'required' when the array is empty", function () {
            const schema: JSONSchema = { type: "object", required: ["a"] }
            setRequired(schema, [])
            expect("required" in schema).to.equal(false)
        })

        it("deletes 'required' when called with a null/undefined-like value", function () {
            const schema: JSONSchema = { type: "object", required: ["a"] }
            // The helper guards on `!required || required.length === 0`; both undefined and
            // an empty array end up wiping the key.
            setRequired(schema, undefined as any)
            expect("required" in schema).to.equal(false)
        })

        it("assigns the array when it has at least one entry", function () {
            const schema: JSONSchema = { type: "object" }
            setRequired(schema, ["a", "b"])
            expect(schema.required).to.eql(["a", "b"])
        })
    })
})
