<p align="center"><img src="https://serafin-labs.github.io/images/logo-serafin-with-text-1080.png" width="300"/></p>

Serafin Schema Builder is a library that ease the creation of a JSON Schema and its associated Typescript type.

## Installation

```
npm i @serafin/schema-builder
```

## Why Schema Builder?

JSON schema is the base of Open API documents so it's really important for Serafin framework.
JSON Schema is powerfull but it is also verbose. 

On top of the JSON schema, you also have to create the Typescript interface that it represents. If you take in account other schemas and interfaces you have to define (one for the post body, one for the patch body, one for get query parameters, etc.), it starts to be problematic.

Schema builder is here to save you from all this tedious work!

To summarize, this library allows you to programatically create a JSON Schema and its associated typescript type __at the same time__.

## A quick example

Let's create simple User and Task schemas.

```typescript
// Schema for the Task
let taskSchema = SchemaBuilder.emptySchema()
    .addString("name")
    .addNumber("progress")
    .addOptionalBoolean("isCompleted")

// Schema for the User
let userSchema = SchemaBuilder.emptySchema()
    .addString("id", { pattern: "\\w" })
    .addString("firstName")
    .addString("lastName")
    .addEnum("role", ["admin", "user"])
    .addString("email", { format: "email" })
    .addStringArray("tags", { minItems: 1 })
    .addOptionalInteger("age")
    .addArray("tasks", taskSchema)

// References to generated interfaces
type Task = typeof taskSchema.T;
type User = typeof userSchema.T;

```

With the code above, we have created two JSON schemas. You can access them with ```.schema```. ```userSchema.schema``` for example contains :

```json
{
   "type":"object",
   "additionalProperties":false,
   "properties":{
      "id":{
         "pattern":"\\w",
         "type":"string"
      },
      "firstName":{
         "type":"string"
      },
      "lastName":{
         "type":"string"
      },
      "role":{
         "type":"string",
         "enum":[
            "admin",
            "user"
         ]
      },
      "email":{
         "format":"email",
         "type":"string"
      },
      "tags":{
         "minItems":1,
         "type":"array",
         "items":{
            "type":"string"
         }
      },
      "age":{
         "type":"integer"
      },
      "tasks":{
         "type":"array",
         "items":{
            "type":"object",
            "additionalProperties":false,
            "properties":{
               "name":{
                  "type":"string"
               },
               "progress":{
                  "type":"number"
               },
               "isCompleted":{
                  "type":"boolean"
               }
            },
            "required":[
               "name",
               "progress"
            ]
         }
      }
   },
   "required":[
      "id",
      "firstName",
      "lastName",
      "role",
      "email",
      "tags",
      "tasks"
   ]
}
```

Thanks to the power of type operations in Typescript, we also have created two interfaces. We can create an explicit reference to it using the ```typeof``` keyword.

```type User``` is equivalent to the following :

```typescript
type User = {
    id: string;
    firstName: string;
    lastName: string;
    role: "admin" | "user";
    email: string;
    tags: string[];
    age?: number;
    tasks: {
        name: string;
        progress: number;
        isCompleted?: boolean;
    }[];
}
```

We want also to have an alternative schema for the user when we send a patch request. Let's modify the initial schema:

```typescript
let userPatchSchema = userSchema.clone()
    .pickProperties(["firstName", "lastName", "email", "age", "tags"])
    .toOptionals()

type UserPatch = typeof userPatchSchema.T;
```

```type UserPatch``` is equivalent to the following :

```typescript
type UserPatch = {
    firstName?: string;
    lastName?: string;
    email?: string;
    tags?: string[];
    age?: number;
}
```

We can now use the ```validate``` method to validate data against our schema. The validation use ```Ajv``` and a custom meta schema that match Open Api 3 specifications.

```typescript
userPatchSchema.validate({
    firstName: "John",
    age: 42
})
```

There's more! This was a simple example. This library provides also a lot of transformation operations that you can apply to your schemas.


## Usage

Since it's a Typescript library, intellisense and code comments provide already a good description of the Api.

This section will focus on advanced transformation methods and how to use them. Refer to the code for the rest.

### dereferencedSchema

When you create an instance of ```SchemaBuilder```, you usually starts with ```SchemaBuilder.emptySchema()```. But if you already have an existing json schema, you can pass it to the constructor directly :

```typescript
let mySchema = new SchemaBuilder<...>({...});
```

However ```SchemaBuilder``` expect a schema without ```$ref```. If you want to initialize a schema with local or external references, you have to "dereferenced" it first using ```dereferencedSchema``` static method. It uses ```json-schema-ref-parser``` library to inline all references of your schema.

### clone

All the methods of ```SchemaBuilder``` may affect the json schema and the gneric type. When you need a new version of a schema, you have to clone the original schema first to ensure you don't cause any side effects.

```typescript
let originalSchema = SchemaBuilder.emptySchema()
    .addString("prop1");
let modifiedSchema = originalSchema.clone()
    .addString("prop2");
```

### allOf, anyOf, oneOf, not

```SchemaBuilder``` contains static method to create ```allOf```, ```anyOf```, ```oneOf``` and ```not``` constructs.

When you start using one of those in a ```SchemaBuilder```, most of the transformation methods won't work anymore. It's because they expect the schema to contains only ```properties```.

### renameProperty and renameOptionalProperty

```renameProperty``` allows you to change the name of property without affecting its schema.

```typescript
let schema = SchemaBuilder.emptySchema()
    .addString("prop1")
    .renameProperty("prop1", "prop2");
```

### addAdditionalProperties

You can set ```additionalProperties``` in your json schema using this method.

```typescript
// additionalProperties is set to true and an any index signature is added to the generic interface
let schema = SchemaBuilder.emptySchema()
    .addAdditionalProperties()

// additionalProperties is set to a string json schema and a string index signature is added to the generic interface
let schema2 = SchemaBuilder.emptySchema()
    .addAdditionalProperties(SchemaBuilder.stringSchema())
```

__/!\\__ Index signatures and type operations are not working well together. If you start using ```additionalProperties``` in a schema, most of the transformation methods will fail after that. Try to use ```addAdditionalProperties``` at the last step if possible

### pickProperties & omitProperties

You can use this two methods to take a subset of the properties of the schema.

```typescript
let schema = SchemaBuilder.emptySchema()
    .addString("prop1")
    .addBoolean("prop2")

// pickedSchema only contains "prop1"
let pickedSchema = schema.clone()
    .pickProperties(["prop1"])

// omitSchema only contains "prop1"
let omitSchema = schema.clone()
    .omitProperties(["prop2"])
```

### pickAdditionalProperties

This method is a version of ```pickProperties``` that supports ```additionalProperties```. You can keep the index signature, remove it or even restrict it to specific property names:

```typescript
let schema = SchemaBuilder.emptySchema()
    .addString("prop1")
    .addBoolean("prop2")
    .addAdditionalProperties(SchemaBuilder.stringSchema())

// pick properties and remove the index signature from the schema
let schemaWithoutIndexSignature = schema.clone()
    .pickAdditionalProperties(["prop1", "prop2"])

// pick properties and keep the index signature from the schema
let schemaWithIndexSignature = schema.clone()
    .pickAdditionalProperties(["prop1"], [])

// pick properties and keep only "prop3" from the index signature
let schemaWithOtherProperties = schema.clone()
    .pickAdditionalProperties(["prop1", "prop2"], ["prop3"])
```

### mergeProperties

```mergeProperties``` method allows you to merge properties from the given schema into the current one. Properties that are defined in both schemas are merged using ```oneOf``` operator (```|``` operator in Typescript).

```typescript
let schema2 = SchemaBuilder.emptySchema()
    .addStringArray("prop2")
    .addNumber("prop3")

let schema = SchemaBuilder.emptySchema()
    .addString("prop1")
    .addBoolean("prop2")
    .mergeProperties(schema2)
```

Which gives you following interface : 

```typescript
type T = {
    prop1: string;
    prop3: number;
    prop2: boolean | string[];
}
```


### overwriteProperties

```overwriteProperties``` method allows you to overwrite properties with the given schema. Properties that are defined in both schemas take the new type instead.

```typescript
let schema2 = SchemaBuilder.emptySchema()
    .addStringArray("prop2")
    .addNumber("prop3")

let schema = SchemaBuilder.emptySchema()
    .addString("prop1")
    .addBoolean("prop2")
    .overwriteProperties(schema2)
```

Which gives you following interface : 

```typescript
type T = {
    prop1: string;
    prop2: string[];
    prop3: number;
}
```

### transformProperties

```transformProperties``` method allows you to add a new type to existing properties. The json schema operator used is ```oneOf``` and the typescript type operator is ```|```.

```typescript
let schema = SchemaBuilder.emptySchema()
    .addStringArray("prop1")
    .addBoolean("prop2")
    .transformProperties(SchemaBuilder.stringSchema(), ["prop1"])
```

### transformPropertiesToArray

```transformPropertiesToArray``` method allows you to transofrm existing properties and to add an array version of it. The json schema operator used is ```oneOf``` and the typescript type operator is ```|```.

```typescript
let schema = SchemaBuilder.emptySchema()
    .addString("prop1")
    .addBoolean("prop2")
    .transformPropertiesToArray(["prop1"])
```

### validate

```validate``` and ```validateList``` methods allows you to easily run validation against your schema. Those two methods use ```Ajv``` library. It uses the following configuration :

```typescript
import { metaSchema } from "@serafin/open-api"

new Ajv({ coerceTypes: true, removeAdditional: true, useDefaults: true, meta: metaSchema })
```

```metaSchema``` is a subset of the current JSON Schema specification that corresponds to what Open Api 3 has decided to support. See the official Open Api 3 documentation for more details.


## What's next?

```schema-builder``` is a component of **Serafin** framework. You can go to the main documentation to learn more  about it : [https://github.com/serafin-labs/serafin](https://github.com/serafin-labs/serafin)