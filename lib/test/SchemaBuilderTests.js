"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var _1 = require("../");
describe('Schema Builder', function () {
    it('should be initialized with a JSON schema', function () {
        var schemaBuilder = new _1.SchemaBuilder({});
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(schemaBuilder.schema).to.exist;
    });
    it('should fail to initialize with a JSON schema that contains $ref', function () {
        chai_1.expect(function () { return new _1.SchemaBuilder({ "$ref": "aReference" }); }).to.throw();
    });
    it('should dereferenced a schema', function () {
        return __awaiter(this, void 0, void 0, function () {
            var schemaBuilder;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, _1.SchemaBuilder.dereferencedSchema({
                            definitions: {
                                test: { type: "string" }
                            },
                            properties: {
                                a: { $ref: "#/definitions/test" }
                            }
                        })];
                    case 1:
                        schemaBuilder = _a.sent();
                        chai_1.expect(schemaBuilder.schema.properties.a.type).to.eqls("string");
                        return [2];
                }
            });
        });
    });
    it('should create oneOf, allOf, anyOf and not schemas', function () {
        var schemaBuilder = _1.SchemaBuilder.oneOf(_1.SchemaBuilder.stringSchema(), _1.SchemaBuilder.emptySchema());
        chai_1.expect(schemaBuilder.schema.oneOf.length).to.eqls(2);
        var schemaBuilder2 = _1.SchemaBuilder.allOf(_1.SchemaBuilder.stringSchema(), _1.SchemaBuilder.emptySchema({ title: "test" }));
        chai_1.expect(schemaBuilder2.schema.allOf.length).to.eqls(2);
        var schemaBuilder3 = _1.SchemaBuilder.anyOf(_1.SchemaBuilder.stringSchema(), _1.SchemaBuilder.emptySchema());
        chai_1.expect(schemaBuilder3.schema.anyOf.length).to.eqls(2);
        var schemaBuilder4 = _1.SchemaBuilder.not(_1.SchemaBuilder.stringSchema());
        chai_1.expect(schemaBuilder4.schema.not).to.exist;
    });
    it('should create simple properties and validate data', function () {
        var subObjectSchemaBuilder = _1.SchemaBuilder.emptySchema().addString("s");
        var schemaBuilder = _1.SchemaBuilder.emptySchema()
            .addString("s1")
            .addOptionalString("s2", {})
            .addNumber("n1")
            .addOptionalNumber("n2", {})
            .addInteger("i1")
            .addOptionalInteger("i2", {})
            .addBoolean("b1")
            .addOptionalBoolean("b2", {})
            .addEnum("e1", ["a", "b", "c"])
            .addOptionalEnum("e2", ["a", "b", "c"], {})
            .addProperty("o1", subObjectSchemaBuilder)
            .addOptionalProperty("o2", subObjectSchemaBuilder)
            .addStringArray("sa1")
            .addOptionalStringArray("sa2", {})
            .addArray("a1", subObjectSchemaBuilder)
            .addOptionalArray("a2", subObjectSchemaBuilder);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s1: "test",
            n1: 42.42,
            i1: 42,
            b1: true,
            e1: "a",
            o1: { s: "test" },
            sa1: ["test"],
            a1: [{ s: "test" }]
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({}); }).to.throw();
    });
    it('should fail to add a property that already exists', function () {
        chai_1.expect(function () { return _1.SchemaBuilder.emptySchema().addString("s1").addBoolean("s1"); }).to.throw();
        chai_1.expect(function () { return _1.SchemaBuilder.emptySchema().addString("s1").addOptionalBoolean("s1"); }).to.throw();
    });
    it('should fail to add a property to a non-object schema', function () {
        chai_1.expect(function () { return _1.SchemaBuilder.stringSchema().addString("s1"); }).to.throw();
        chai_1.expect(function () { return _1.SchemaBuilder.stringSchema().addOptionalString("s1"); }).to.throw();
    });
    it('should create a schema with additional properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addAdditionalProperties();
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test",
            test: 42
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s: {},
            test: 42
        }); }).to.throw();
    });
    it('should fail to create additional properties if it is alread set', function () {
        chai_1.expect(function () { return _1.SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().addAdditionalProperties(); }).to.throw();
    });
    it('should set optional properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addBoolean("b").setOptionalProperties(["s"]);
        chai_1.expect(function () { return schemaBuilder.validate({
            b: true
        }); }).to.not.throw();
    });
    it('should set required properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addOptionalBoolean("b").setRequiredProperties(["b"]);
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test",
            b: true
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test"
        }); }).to.throw();
    });
    it('should convert to optionals', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addBoolean("b").toOptionals();
        chai_1.expect(function () { return schemaBuilder.validate({}); }).to.not.throw();
    });
    it('should convert to deep optionals', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema()
            .addProperty("s", _1.SchemaBuilder.emptySchema()
            .addString("ss")
            .addBoolean("sb"))
            .addBoolean("b")
            .toDeepOptionals();
        chai_1.expect(function () { return schemaBuilder.validate({ s: { ss: "test" } }); }).to.not.throw();
    });
    it('should rename an optional property', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").renameOptionalProperty("s", "s2");
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s2: "test"
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({}); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s2: {}
        }); }).to.throw();
    });
    it('should rename a property', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").renameProperty("s", "s2");
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s2: "test"
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test"
        }); }).to.throw();
    });
    it('should pick properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addOptionalBoolean("b").pickProperties(["b"]);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            b: true
        }); }).to.not.throw();
        var o = {
            s: "test",
            b: true
        };
        chai_1.expect(function () { return schemaBuilder.validate(o); }).to.not.throw();
        chai_1.expect(o.s).not.to.exist;
    });
    it('should omit properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addOptionalBoolean("b").omitProperties(["s"]);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            b: true
        }); }).to.not.throw();
        var o = {
            s: "test",
            b: true
        };
        chai_1.expect(function () { return schemaBuilder.validate(o); }).to.not.throw();
        chai_1.expect(o.s).not.to.exist;
    });
    it('should pick additional properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"], []);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test",
            test: 42
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s: {},
            test: 42
        }); }).to.throw();
    });
    it('should remove additional properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"]);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test"
        }); }).to.not.throw();
        var o = {
            s: "test",
            test: 42
        };
        chai_1.expect(function () { return schemaBuilder.validate(o); }).to.not.throw();
        chai_1.expect(o.test).to.not.exist;
    });
    it('should pick specific additional properties', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").addAdditionalProperties().pickAdditionalProperties(["s"], ["test"]);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test",
            test: 42
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s: "test",
            test2: 42
        }); }).to.throw();
    });
    it('should transform properties type', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addStringArray("s").transformProperties(_1.SchemaBuilder.stringSchema(), ["s"]);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s: ["test"]
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s: [{ a: "test" }]
        }); }).to.throw();
        var schemaBuilder2 = _1.SchemaBuilder.emptySchema().addStringArray("s").transformProperties(_1.SchemaBuilder.stringSchema());
        chai_1.expect(schemaBuilder2).to.exist;
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: ["test"]
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: [{ a: "test" }]
        }); }).to.throw();
    });
    it('should transform properties to array', function () {
        var schemaBuilder = _1.SchemaBuilder.emptySchema().addString("s").transformPropertiesToArray(["s"]);
        chai_1.expect(schemaBuilder).to.exist;
        chai_1.expect(function () { return schemaBuilder.validate({
            s: ["test"]
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder.validate({
            s: [{ a: "test" }]
        }); }).to.throw();
        var schemaBuilder2 = _1.SchemaBuilder.emptySchema().addString("s").transformPropertiesToArray();
        chai_1.expect(schemaBuilder2).to.exist;
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: ["test"]
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: [{ a: "test" }]
        }); }).to.throw();
    });
    it('should intersect properties', function () {
        var schemaBuilder1 = _1.SchemaBuilder.emptySchema().addString("s").addBoolean("b");
        var schemaBuilder2 = _1.SchemaBuilder.emptySchema().addOptionalString("s").intersectProperties(schemaBuilder1);
        chai_1.expect(schemaBuilder2).to.exist;
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: "test",
            b: true
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder2.validate({
            b: true
        }); }).to.throw();
    });
    it('should merge properties', function () {
        var schemaBuilder1 = _1.SchemaBuilder.emptySchema().addProperty("s", _1.SchemaBuilder.emptySchema().addString("v")).addBoolean("b");
        var schemaBuilder2 = _1.SchemaBuilder.emptySchema().addOptionalBoolean("s").mergeProperties(schemaBuilder1);
        chai_1.expect(schemaBuilder2).to.exist;
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: true,
            b: true
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: { v: "test" },
            b: true
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder2.validate({
            b: true
        }); }).to.throw();
    });
    it('should overwrite properties', function () {
        var schemaBuilder1 = _1.SchemaBuilder.emptySchema().addProperty("s", _1.SchemaBuilder.emptySchema().addString("v")).addBoolean("b").addOptionalBoolean("s2");
        var schemaBuilder2 = _1.SchemaBuilder.emptySchema().addOptionalBoolean("s").addString("s2").overwriteProperties(schemaBuilder1);
        chai_1.expect(schemaBuilder2).to.exist;
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: { v: "test" },
            b: true
        }); }).to.not.throw();
        chai_1.expect(function () { return schemaBuilder2.validate({
            s: false,
            b: true
        }); }).to.throw();
    });
    it('should fail to transform with schemas that are not simple', function () {
        var schemaBuilder = _1.SchemaBuilder.allOf(_1.SchemaBuilder.emptySchema().addString("s"), _1.SchemaBuilder.emptySchema().addBoolean("b"));
        chai_1.expect(schemaBuilder.hasSchemasCombinationKeywords).to.be.true;
        chai_1.expect(schemaBuilder.isSimpleObjectSchema).to.be.false;
        chai_1.expect(schemaBuilder.isObjectSchema).to.be.false;
        chai_1.expect(schemaBuilder.hasAditionalProperties).to.be.false;
        chai_1.expect(function () { return schemaBuilder.setOptionalProperties([]); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.setRequiredProperties([]); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.renameProperty("s", "s1"); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.renameOptionalProperty("s", "s1"); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.pickProperties(["s"]); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.omitProperties(["s"]); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.pickAdditionalProperties(["s"]); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.transformProperties(_1.SchemaBuilder.stringSchema(), ["s"]); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.transformPropertiesToArray(); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.intersectProperties(_1.SchemaBuilder.emptySchema()); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.mergeProperties(_1.SchemaBuilder.emptySchema()); }).to.throw();
        chai_1.expect(function () { return schemaBuilder.overwriteProperties(_1.SchemaBuilder.emptySchema()); }).to.throw();
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
        var queryUserSchema = userSchema.clone({ title: "UserQuery" })
            .pickProperties(["firstName", "lastName", "age", "email", "tags"])
            .transformPropertiesToArray(["firstName", "lastName", "age", "email"])
            .transformProperties(_1.SchemaBuilder.stringSchema(), ["tags"])
            .toOptionals();
        var q = {
            tags: "admin",
            age: [30, 31]
        };
        chai_1.expect(queryUserSchema).to.exist;
        chai_1.expect(function () { return queryUserSchema.validate(q); }).to.not.throw();
        chai_1.expect(function () { return queryUserSchema.validateList([q]); }).to.not.throw();
        chai_1.expect(queryUserSchema.validate.bind(queryUserSchema, {
            tags: "admin",
            age: "test"
        })).to.throw();
        chai_1.expect(queryUserSchema.validateList.bind(queryUserSchema, [{
                tags: "admin",
                age: "test"
            }])).to.throw();
    });
});

//# sourceMappingURL=SchemaBuilderTests.js.map
