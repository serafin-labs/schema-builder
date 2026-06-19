import { defineConfig } from "vitepress"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import { fileURLToPath } from "node:url"

// Resolve the built declaration files of the library itself so that Twoslash
// code blocks type-check against the real `@serafin/schema-builder` API.
// `npm run build` must have produced `lib/esm/` before building the docs.
const libTypes = fileURLToPath(new URL("../../lib/esm/index.d.ts", import.meta.url))

// Deployed to GitHub Pages at https://serafin-labs.github.io/schema-builder/
const base = "/schema-builder/"

export default defineConfig({
    base,
    lang: "en-US",
    title: "Schema Builder",
    description: "A TypeScript JSON Schema library that creates a schema and its type at the same time.",
    cleanUrls: true,
    lastUpdated: true,

    head: [["link", { rel: "icon", type: "image/png", href: `${base}logo.png` }]],

    markdown: {
        codeTransformers: [
            transformerTwoslash({
                twoslashOptions: {
                    compilerOptions: {
                        // Map the package name to the locally built declarations.
                        paths: {
                            "@serafin/schema-builder": [libTypes],
                        },
                        strict: true,
                        target: 99, // ESNext
                        module: 199, // NodeNext
                        moduleResolution: 99, // Bundler
                    },
                },
            }),
        ],
        languages: ["typescript", "javascript", "json", "bash"],
    },

    themeConfig: {
        logo: "/logo.png",

        nav: [
            { text: "Guide", link: "/guide/getting-started" },
            { text: "API Reference", link: "/api/" },
            {
                text: "v0.18",
                items: [
                    { text: "npm", link: "https://www.npmjs.com/package/@serafin/schema-builder" },
                    { text: "Changelog", link: "https://github.com/serafin-labs/schema-builder/releases" },
                ],
            },
        ],

        sidebar: {
            "/guide/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "Why Schema Builder?", link: "/guide/why" },
                        { text: "Getting Started", link: "/guide/getting-started" },
                    ],
                },
                {
                    text: "Building Schemas",
                    items: [
                        { text: "Primitive Schemas", link: "/guide/primitives" },
                        { text: "Object Schemas", link: "/guide/objects" },
                        { text: "Arrays & Tuples", link: "/guide/arrays" },
                        { text: "Enums, Consts & Unions", link: "/guide/enums-unions" },
                    ],
                },
                {
                    text: "Transforming Schemas",
                    items: [
                        { text: "Picking & Omitting", link: "/guide/pick-omit" },
                        { text: "Optionals & Nullables", link: "/guide/optionals" },
                        { text: "Merging & Overwriting", link: "/guide/merging" },
                        { text: "Transforming Properties", link: "/guide/transforming" },
                    ],
                },
                {
                    text: "Combining Schemas",
                    items: [
                        { text: "allOf / anyOf / oneOf / not", link: "/guide/combinators" },
                        { text: "Conditionals & Dependencies", link: "/guide/conditionals" },
                    ],
                },
                {
                    text: "Using Schemas",
                    items: [
                        { text: "Validation", link: "/guide/validation" },
                        { text: "From a literal JSON Schema", link: "/guide/from-json-schema" },
                        { text: "Generating SchemaBuilder code", link: "/guide/generating-code" },
                    ],
                },
                {
                    text: "Examples",
                    items: [{ text: "MCP connectors", link: "/guide/mcp" }],
                },
            ],
            "/api/": [
                {
                    text: "API Reference",
                    items: [
                        { text: "Overview", link: "/api/" },
                        { text: "Factory methods", link: "/api/factories" },
                        { text: "Instance methods", link: "/api/instance-methods" },
                    ],
                },
            ],
        },

        search: {
            provider: "local",
        },

        socialLinks: [{ icon: "github", link: "https://github.com/serafin-labs/schema-builder" }],

        editLink: {
            pattern: "https://github.com/serafin-labs/schema-builder/edit/master/docs/:path",
            text: "Edit this page on GitHub",
        },

        footer: {
            message: "Released under the MIT License.",
            copyright: "Copyright © Serafin Labs",
        },
    },
})
