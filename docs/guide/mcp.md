# MCP connectors

The [Model Context Protocol](https://modelcontextprotocol.io) describes each tool a server exposes with an **`inputSchema`** — a plain JSON Schema object that tells the client (and the model) what arguments the tool accepts. An optional **`outputSchema`** can describe the structured result.

That makes `SchemaBuilder` a natural fit: define the tool's arguments once, hand the JSON Schema to the protocol, and reuse the inferred type to write a fully-typed handler — no duplicated shape, no drift between what you advertise and what you validate.

## Defining a tool's input schema

Build the argument schema as usual. `.schema` is the JSON Schema you advertise to MCP, and `typeof schema.T` is the type of the validated arguments:

```ts
import { SB } from "@serafin/schema-builder"

const createTaskArgs = SB.objectSchema(
    { title: "create_task", description: "Create a new task" },
    {
        name: SB.stringSchema({ minLength: 1 }),
        priority: SB.enumSchema(["low", "medium", "high"]),
        dueDate: [SB.stringSchema({ format: "date" }), undefined], // optional
    },
)

// The type of the arguments the handler receives:
type CreateTaskArgs = typeof createTaskArgs.T
```

## Wiring it into an MCP server

Using the low-level [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) `Server`, the `inputSchema` field of a tool is raw JSON Schema — so you pass `.schema` directly, then validate the incoming arguments with the same builder before handling them:

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"

const server = new Server({ name: "task-server", version: "1.0.0" }, { capabilities: { tools: {} } })

// Advertise the tool, using the JSON Schema produced by SB.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "create_task",
            description: "Create a new task",
            inputSchema: createTaskArgs.schema,
        },
    ],
}))

// Handle a call: validate, then work with a fully-typed argument object.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "create_task") {
        // `validate` throws if the arguments don't match the advertised schema.
        const args = request.params.arguments as CreateTaskArgs
        createTaskArgs.validate(args)

        // `args` is typed: args.name (string), args.priority ("low" | "medium" | "high"),
        // args.dueDate (string | undefined).
        const task = await createTask(args)
        return { content: [{ type: "text", text: `Created task ${task.id}` }] }
    }
    throw new Error(`Unknown tool: ${request.params.name}`)
})
```

Because the advertised `inputSchema` and the runtime `validate` come from the **same builder**, the contract you publish and the data you accept can never disagree.

::: tip Deriving related shapes
The same composition tools used elsewhere apply here. For an `update_task` tool that takes a partial patch, derive it from the create schema instead of redefining it:

```ts
const updateTaskArgs = createTaskArgs.toOptionals()
```

:::
