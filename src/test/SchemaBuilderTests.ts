import { expect } from "chai";
import * as chai from "chai";
import { SchemaBuilder } from "../";

describe('Schema Builder', function () {

    it('should be initialized with a JSON schema', function () {
        let schemaBuilder = new SchemaBuilder({})
        expect(schemaBuilder).to.exist
        expect(schemaBuilder.schema).to.exist
    });

    it('should initialize a simple schema and validate data', function () {
        let schemaBuilder = SchemaBuilder.emptySchema().addString("test")
        expect(schemaBuilder).to.exist
        expect(schemaBuilder.validate.bind(schemaBuilder, {
            test: "aString"
        })).to.not.throw()
        expect(schemaBuilder.validate.bind(schemaBuilder, {
            t: 42
        })).to.throw()
    });

    it('should initialize a complex schema and validate data', function () {
        let taskSchema = SchemaBuilder.emptySchema()
            .addString("name")
            .addNumber("progress")
            .addOptionalBoolean("isCompleted")

        let userSchema = SchemaBuilder.emptySchema()
            .addString("id", { pattern: "\\w" })
            .addString("firstName")
            .addString("lastName")
            .addEnum("role", ["admin", "user"])
            .addString("email", { format: "email" })
            .addStringArray("tags", { minItems: 1 })
            .addOptionalInteger("age")
            .addOptionalStringArray("friendsIds")
            .addArray("tasks", taskSchema)

        expect(userSchema).to.exist
        expect(userSchema.validate.bind(userSchema, {
            id: "1",
            firstName: "John",
            lastName: "Doe",
            email: "john-doe@test.com",
            role: "admin",
            tags: ["test"],
            tasks: [{
                name: "something to do",
                progress: 0,
                isCompleted: false
            }]
        })).to.not.throw()
        expect(userSchema.validate.bind(userSchema, {
            id: "1_",
            firstName: "John",
            lastName: "Doe",
            email: "john-doe-test.com",
            role: "test",
            tags: [],
            tasks: [{
                name: "something to do",
                progress: 0,
                isCompleted: false
            }]
        })).to.throw()

        let queryUserSchema = userSchema.clone()
            .pickProperties(["firstName", "lastName", "age", "email", "tags"])
            .transformProperties(SchemaBuilder.stringSchema(), ["tags"])
            .transformPropertiesToArray(["firstName", "lastName", "age", "email"])
            .toOptionals()
        expect(queryUserSchema).to.exist
        expect(queryUserSchema.validate.bind(queryUserSchema, {
            tags: "admin",
            age: [30, 31]
        })).to.not.throw()
        expect(queryUserSchema.validate.bind(queryUserSchema, {
            tags: "admin",
            age: "test"
        })).to.throw()
    });

});