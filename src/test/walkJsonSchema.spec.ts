import { expect } from "chai"
import { walkJsonSchema, JsonSchemaKeyword } from "../walkJsonSchema.js"
import { JSONSchema } from "../JsonSchema.js"

describe("walkJsonSchema", function () {
    function collectTitles(schema: JSONSchema | JSONSchema[]): string[] {
        const titles: string[] = []
        walkJsonSchema(schema, (s) => {
            if (s.title) titles.push(s.title)
        })
        return titles
    }

    it("invokes the callback on the root schema", function () {
        const visited: JSONSchema[] = []
        const schema: JSONSchema = { title: "root", type: "string" }
        walkJsonSchema(schema, (s) => visited.push(s))
        expect(visited).to.have.length(1)
        expect(visited[0]).to.equal(schema)
    })

    it("walks every entry of `properties`", function () {
        const schema: JSONSchema = {
            title: "root",
            type: "object",
            properties: {
                a: { title: "a", type: "string" },
                b: { title: "b", type: "number" },
            },
        }
        expect(collectTitles(schema)).to.eql(["root", "a", "b"])
    })

    it("walks every entry of `patternProperties` (and not the container map itself)", function () {
        const schema: JSONSchema = {
            title: "root",
            type: "object",
            patternProperties: {
                "^a": { title: "pattern-a", type: "string" },
                "^b": { title: "pattern-b", type: "number" },
            },
        }
        const visited: JSONSchema[] = []
        walkJsonSchema(schema, (s) => visited.push(s))
        expect(visited).to.have.length(3)
        expect(visited[0]).to.equal(schema)
        expect(visited.map((s) => s.title)).to.eql(["root", "pattern-a", "pattern-b"])
    })

    it("walks `additionalProperties` when it is a schema, skips it when it is a boolean", function () {
        const objectAdditional: JSONSchema = {
            title: "root",
            type: "object",
            additionalProperties: { title: "extra", type: "string" },
        }
        expect(collectTitles(objectAdditional)).to.eql(["root", "extra"])

        const boolTrue: JSONSchema = { title: "root", type: "object", additionalProperties: true }
        expect(collectTitles(boolTrue)).to.eql(["root"])

        const boolFalse: JSONSchema = { title: "root", type: "object", additionalProperties: false }
        expect(collectTitles(boolFalse)).to.eql(["root"])
    })

    it("walks `propertyNames` when it is a schema", function () {
        const schema: JSONSchema = {
            title: "root",
            type: "object",
            propertyNames: { title: "names", pattern: "^[a-z]+$" },
        }
        expect(collectTitles(schema)).to.eql(["root", "names"])
    })

    it("walks the schema-form entries of `dependencies` and skips the string[] entries", function () {
        const schema: JSONSchema = {
            title: "root",
            type: "object",
            dependencies: {
                a: ["b"],
                c: { title: "c-dep", required: ["d"] } as JSONSchema,
                e: { title: "e-dep" } as JSONSchema,
            },
        }
        expect(collectTitles(schema)).to.eql(["root", "c-dep", "e-dep"])
    })

    it("walks `items` whether it is a single schema or a tuple of schemas", function () {
        const single: JSONSchema = {
            title: "root",
            type: "array",
            items: { title: "item", type: "string" },
        }
        expect(collectTitles(single)).to.eql(["root", "item"])

        const tuple: JSONSchema = {
            title: "root",
            type: "array",
            items: [
                { title: "i0", type: "string" },
                { title: "i1", type: "number" },
            ],
        }
        expect(collectTitles(tuple)).to.eql(["root", "i0", "i1"])
    })

    it("walks `additionalItems` and `contains`", function () {
        const schema: JSONSchema = {
            title: "root",
            type: "array",
            items: [{ title: "i0" }],
            additionalItems: { title: "extra-item" },
            contains: { title: "contained" },
        }
        expect(collectTitles(schema)).to.eql(["root", "i0", "extra-item", "contained"])
    })

    it("walks `if`, `then` and `else`", function () {
        const schema: JSONSchema = {
            title: "root",
            if: { title: "if-branch" },
            then: { title: "then-branch" },
            else: { title: "else-branch" },
        }
        expect(collectTitles(schema)).to.eql(["root", "if-branch", "then-branch", "else-branch"])
    })

    it("walks each schema in `oneOf`, `allOf` and `anyOf`", function () {
        const schema: JSONSchema = {
            title: "root",
            oneOf: [{ title: "one-a" }, { title: "one-b" }],
            allOf: [{ title: "all-a" }],
            anyOf: [{ title: "any-a" }, { title: "any-b" }],
        }
        expect(collectTitles(schema)).to.eql(["root", "one-a", "one-b", "all-a", "any-a", "any-b"])
    })

    it("walks `not`", function () {
        const schema: JSONSchema = {
            title: "root",
            not: { title: "negated", type: "string" },
        }
        expect(collectTitles(schema)).to.eql(["root", "negated"])
    })

    it("skips boolean subschemas in every keyword that accepts them", function () {
        const schema: JSONSchema = {
            title: "root",
            additionalProperties: true,
            propertyNames: false,
            additionalItems: true,
            contains: false,
            if: true,
            then: false,
            else: true,
            not: false,
            dependencies: { x: true as any, y: false as any },
        }
        expect(collectTitles(schema)).to.eql(["root"])
    })

    it("recurses into deeply nested compositions", function () {
        const schema: JSONSchema = {
            title: "root",
            type: "object",
            properties: {
                outer: {
                    title: "outer",
                    type: "object",
                    patternProperties: {
                        "^x": {
                            title: "inner",
                            oneOf: [{ title: "leaf" }],
                        },
                    },
                },
            },
        }
        expect(collectTitles(schema)).to.eql(["root", "outer", "inner", "leaf"])
    })

    it("accepts an array of schemas at the root", function () {
        const schemas: JSONSchema[] = [{ title: "a" }, { title: "b", properties: { x: { title: "x" } } }]
        expect(collectTitles(schemas)).to.eql(["a", "b", "x"])
    })

    it("is a no-op for `null`, `undefined`, primitives and boolean subschemas", function () {
        const visit = (input: any) => {
            let calls = 0
            walkJsonSchema(input, () => calls++)
            return calls
        }
        expect(visit(null)).to.equal(0)
        expect(visit(undefined)).to.equal(0)
        expect(visit(true)).to.equal(0)
        expect(visit(false)).to.equal(0)
        expect(visit(42)).to.equal(0)
        expect(visit("string")).to.equal(0)
    })

    it("returns the original schema reference unchanged", function () {
        const schema: JSONSchema = { type: "object", properties: { a: { type: "string" } } }
        const result = walkJsonSchema(schema, () => {})
        expect(result).to.equal(schema)
    })

    it("does not visit a `properties`/`patternProperties` container as if it were a schema", function () {
        const schema: JSONSchema = {
            type: "object",
            patternProperties: {
                "^a": { $ref: "#/definitions/X" } as JSONSchema,
            },
        }
        const refs: string[] = []
        walkJsonSchema(schema, (s) => {
            if (s.$ref) refs.push(s.$ref)
        })
        expect(refs).to.eql(["#/definitions/X"])
    })

    it("invokes the callback in pre-order (parent before children)", function () {
        const order: string[] = []
        const schema: JSONSchema = {
            title: "root",
            properties: {
                a: {
                    title: "a",
                    properties: { aa: { title: "aa" } },
                },
            },
        }
        walkJsonSchema(schema, (s) => {
            if (s.title) order.push(s.title)
        })
        expect(order).to.eql(["root", "a", "aa"])
    })

    describe("keyword argument", function () {
        function collectKeywords(schema: JSONSchema | JSONSchema[]): Array<[string | undefined, JsonSchemaKeyword | undefined]> {
            const out: Array<[string | undefined, JsonSchemaKeyword | undefined]> = []
            walkJsonSchema(schema, (s, keyword) => {
                out.push([s.title, keyword])
            })
            return out
        }

        it("passes `undefined` for the root schema", function () {
            const result = collectKeywords({ title: "root", type: "string" })
            expect(result).to.eql([["root", undefined]])
        })

        it("passes `undefined` for each top-level entry when an array of schemas is the root", function () {
            const result = collectKeywords([{ title: "a" }, { title: "b" }])
            expect(result).to.eql([
                ["a", undefined],
                ["b", undefined],
            ])
        })

        it("identifies object-applicator keywords", function () {
            const schema: JSONSchema = {
                title: "root",
                properties: { p: { title: "p-child" } },
                patternProperties: { "^x": { title: "pp-child" } },
                additionalProperties: { title: "ap-child" },
                propertyNames: { title: "pn-child", type: "string" },
                dependencies: { k: { title: "dep-child" } as JSONSchema },
            }
            expect(collectKeywords(schema)).to.eql([
                ["root", undefined],
                ["p-child", "properties"],
                ["pp-child", "patternProperties"],
                ["ap-child", "additionalProperties"],
                ["pn-child", "propertyNames"],
                ["dep-child", "dependencies"],
            ])
        })

        it("identifies array-applicator keywords", function () {
            const schema: JSONSchema = {
                title: "root",
                items: [{ title: "i0" }, { title: "i1" }],
                additionalItems: { title: "extra" },
                contains: { title: "c" },
            }
            expect(collectKeywords(schema)).to.eql([
                ["root", undefined],
                ["i0", "items"],
                ["i1", "items"],
                ["extra", "additionalItems"],
                ["c", "contains"],
            ])
        })

        it("identifies the conditional keywords `if`/`then`/`else`", function () {
            const schema: JSONSchema = {
                title: "root",
                if: { title: "i" },
                then: { title: "t" },
                else: { title: "e" },
            }
            expect(collectKeywords(schema)).to.eql([
                ["root", undefined],
                ["i", "if"],
                ["t", "then"],
                ["e", "else"],
            ])
        })

        it("identifies the composition keywords `oneOf`/`allOf`/`anyOf`/`not`", function () {
            const schema: JSONSchema = {
                title: "root",
                oneOf: [{ title: "o0" }, { title: "o1" }],
                allOf: [{ title: "a0" }],
                anyOf: [{ title: "y0" }],
                not: { title: "n" },
            }
            expect(collectKeywords(schema)).to.eql([
                ["root", undefined],
                ["o0", "oneOf"],
                ["o1", "oneOf"],
                ["a0", "allOf"],
                ["y0", "anyOf"],
                ["n", "not"],
            ])
        })

        it("reports the immediate parent keyword (not the path) for deeply nested schemas", function () {
            const schema: JSONSchema = {
                title: "root",
                properties: {
                    outer: {
                        title: "outer",
                        oneOf: [{ title: "inner-of-oneOf" }],
                    },
                },
            }
            expect(collectKeywords(schema)).to.eql([
                ["root", undefined],
                ["outer", "properties"],
                ["inner-of-oneOf", "oneOf"],
            ])
        })

        it("supports backwards-compatible callbacks that ignore the second argument", function () {
            // The existing call-sites in SchemaBuilder use the one-argument form;
            // make sure that still compiles and runs.
            const visited: string[] = []
            walkJsonSchema({ title: "root", properties: { p: { title: "p" } } }, (s) => {
                if (s.title) visited.push(s.title)
            })
            expect(visited).to.eql(["root", "p"])
        })
    })

    it("catches `$ref` inside `contains`, `if`/`then`/`else`, `propertyNames` and schema-dependencies", function () {
        // Regression test for the exhaustive-traversal expansion: every newly-walked
        // keyword should expose nested $refs to the callback.
        const schema: JSONSchema = {
            type: "object",
            properties: {
                arr: {
                    type: "array",
                    contains: { $ref: "#/defs/Contained" } as JSONSchema,
                },
            },
            propertyNames: { $ref: "#/defs/Names" } as JSONSchema,
            if: { $ref: "#/defs/If" } as JSONSchema,
            then: { $ref: "#/defs/Then" } as JSONSchema,
            else: { $ref: "#/defs/Else" } as JSONSchema,
            dependencies: {
                k: { $ref: "#/defs/Dep" } as JSONSchema,
            },
        }
        const refs: string[] = []
        walkJsonSchema(schema, (s) => {
            if (s.$ref) refs.push(s.$ref)
        })
        expect(refs.sort()).to.eql(
            ["#/defs/Contained", "#/defs/Dep", "#/defs/Else", "#/defs/If", "#/defs/Names", "#/defs/Then"].sort(),
        )
    })
})
