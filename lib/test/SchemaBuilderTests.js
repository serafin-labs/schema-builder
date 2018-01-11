"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var _1 = require("../");
describe('Schema Builder', function () {
    it('should be initialized with a JSON schema', function () {
        var schemaBuilder = new _1.SchemaBuilder({});
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(schemaBuilder.schema).to.exist;
    });
    it('should initialize a simple schema and validate data', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("test");
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(schemaBuilder.validate.bind(schemaBuilder, {
            test: "aString"
        })).to.not.throw();
        chai_1.expect(schemaBuilder.validate.bind(schemaBuilder, {
            t: 42
        })).to.throw();
    });
    it('should initialize a complex schema and validate data', function () {
        var taskSchema = _1.SchemaBuilder.emptySchema()
            .addString("name")
            .addNumber("progress")
            .addOptionalBoolean("isCompleted");
        var userSchema = _1.SchemaBuilder.emptySchema()
            .addString("id", { pattern: "\\w" })
            .addString("firstName")
            .addString("lastName")
            .addEnum("role", ["admin", "user"])
            .addString("email", { format: "email" })
            .addStringArray("tags", { minItems: 1 })
            .addOptionalInteger("age")
            .addOptionalStringArray("friendsIds")
            .addArray("tasks", taskSchema);
        chai_1.expect(userSchema).to.exist;
        chai_1.expect(userSchema.validate.bind(userSchema, {
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
        })).to.not.throw();
        chai_1.expect(userSchema.validate.bind(userSchema, {
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
        })).to.throw();
        var queryUserSchema = userSchema.clone()
            .pickProperties(["firstName", "lastName", "age", "email", "tags"])
            .transformProperties(_1.SchemaBuilder.stringSchema(), ["tags"])
            .transformPropertiesToArray(["firstName", "lastName", "age", "email"])
            .toOptionals();
        chai_1.expect(queryUserSchema).to.exist;
        chai_1.expect(queryUserSchema.validate.bind(queryUserSchema, {
            tags: "admin",
            age: [30, 31]
        })).to.not.throw();
        chai_1.expect(queryUserSchema.validate.bind(queryUserSchema, {
            tags: "admin",
            age: "test"
        })).to.throw();
    });
});

//# sourceMappingURL=SchemaBuilderTests.js.map
