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
var _ = require("lodash");
var $RefParser = require("json-schema-ref-parser");
var Ajv = require("ajv");
var VError = require("verror");
var open_api_1 = require("@serafin/open-api");
var SchemaBuilder = (function () {
    function SchemaBuilder(schemaObject) {
        this.schemaObject = schemaObject;
        this.schemaObject = schemaObject;
    }
    Object.defineProperty(SchemaBuilder.prototype, "schema", {
        get: function () {
            return this.schemaObject;
        },
        enumerable: true,
        configurable: true
    });
    SchemaBuilder.dereferencedSchema = function (schema) {
        return __awaiter(this, void 0, void 0, function () {
            var dereferencedSchema;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, $RefParser.dereference(schema)];
                    case 1:
                        dereferencedSchema = _a.sent();
                        return [2, new SchemaBuilder(dereferencedSchema)];
                }
            });
        });
    };
    SchemaBuilder.emptySchema = function (schema) {
        if (schema === void 0) { schema = {}; }
        schema.type = "object";
        schema.additionalProperties = false;
        return new SchemaBuilder(schema);
    };
    SchemaBuilder.stringSchema = function (schema) {
        if (schema === void 0) { schema = {}; }
        schema.type = "string";
        return new SchemaBuilder(schema);
    };
    SchemaBuilder.numberSchema = function (schema) {
        if (schema === void 0) { schema = {}; }
        schema.type = "number";
        return new SchemaBuilder(schema);
    };
    SchemaBuilder.integerSchema = function (schema) {
        if (schema === void 0) { schema = {}; }
        schema.type = "integer";
        return new SchemaBuilder(schema);
    };
    SchemaBuilder.booleanSchema = function (schema) {
        if (schema === void 0) { schema = {}; }
        schema.type = "boolean";
        return new SchemaBuilder(schema);
    };
    SchemaBuilder.enumSchema = function (values, schema) {
        if (schema === void 0) { schema = {}; }
        schema.type = "string";
        schema.enum = values;
        return new SchemaBuilder(schema);
    };
    SchemaBuilder.arraySchema = function (items, schema) {
        if (schema === void 0) { schema = {}; }
        schema.type = "array";
        schema.items = items.schemaObject;
        return new SchemaBuilder(schema);
    };
    SchemaBuilder.oneOf = function (schemaBuilder1, schemaBuilder2) {
        return new SchemaBuilder({
            oneOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        });
    };
    SchemaBuilder.allOf = function (schemaBuilder1, schemaBuilder2) {
        return new SchemaBuilder({
            allOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        });
    };
    SchemaBuilder.anyOf = function (schemaBuilder1, schemaBuilder2) {
        return new SchemaBuilder({
            anyOf: [schemaBuilder1.schemaObject, schemaBuilder2.schemaObject]
        });
    };
    SchemaBuilder.not = function (schemaBuilder) {
        return new SchemaBuilder({
            not: schemaBuilder
        });
    };
    SchemaBuilder.prototype.setOptionalProperties = function (properties) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'setOptionalProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        var required = [];
        for (var property in this.schemaObject.properties) {
            if (properties.indexOf(property) === -1) {
                required.push(property);
            }
        }
        if (required.length === 0) {
            delete this.schemaObject.required;
        }
        else {
            this.schemaObject.required = required;
        }
        return this;
    };
    SchemaBuilder.prototype.setRequiredProperties = function (properties) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'setRequiredProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
            var property = properties_1[_i];
            this.schemaObject.required = this.schemaObject.required || [];
            if (this.schemaObject.required.indexOf(property) === -1) {
                this.schemaObject.required.push(property);
            }
        }
        return this;
    };
    SchemaBuilder.prototype.toOptionals = function () {
        delete this.schemaObject.required;
        return this;
    };
    SchemaBuilder.prototype.toDeepOptionals = function () {
        throughJsonSchema(this.schemaObject, function (s) { return delete s.required; });
        return this;
    };
    SchemaBuilder.prototype.addProperty = function (propertyName, schemaBuilder) {
        if (!this.isObjectSchema) {
            throw new Error("Schema Builder Error: you can only add properties to an object schema");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        this.schemaObject.properties[propertyName] = schemaBuilder.schemaObject;
        this.schemaObject.required = this.schemaObject.required || [];
        this.schemaObject.required.push(propertyName);
        return this;
    };
    SchemaBuilder.prototype.addOptionalProperty = function (propertyName, schemaBuilder) {
        if (!this.isObjectSchema) {
            throw new Error("Schema Builder Error: you can only add properties to an object schema");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        this.schemaObject.properties[propertyName] = schemaBuilder.schemaObject;
        return this;
    };
    SchemaBuilder.prototype.addAdditionalProperties = function (schemaBuilder) {
        if (this.schemaObject.additionalProperties) {
            throw new Error("Schema Builder Error: additionalProperties is already set in " + (this.schemaObject.title || 'this') + " schema.");
        }
        this.schemaObject.additionalProperties = schemaBuilder ? schemaBuilder.schemaObject : true;
        return this;
    };
    SchemaBuilder.prototype.addString = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addProperty(propertyName, SchemaBuilder.stringSchema(schema));
    };
    SchemaBuilder.prototype.addOptionalString = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addOptionalProperty(propertyName, SchemaBuilder.stringSchema(schema));
    };
    SchemaBuilder.prototype.addEnum = function (propertyName, values, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addProperty(propertyName, SchemaBuilder.enumSchema(values, schema));
    };
    SchemaBuilder.prototype.addOptionalEnum = function (propertyName, values, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addOptionalProperty(propertyName, SchemaBuilder.enumSchema(values, schema));
    };
    SchemaBuilder.prototype.addNumber = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addProperty(propertyName, SchemaBuilder.numberSchema(schema));
    };
    SchemaBuilder.prototype.addOptionalNumber = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addOptionalProperty(propertyName, SchemaBuilder.numberSchema(schema));
    };
    SchemaBuilder.prototype.addInteger = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addProperty(propertyName, SchemaBuilder.integerSchema(schema));
    };
    SchemaBuilder.prototype.addOptionalInteger = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addOptionalProperty(propertyName, SchemaBuilder.integerSchema(schema));
    };
    SchemaBuilder.prototype.addBoolean = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addProperty(propertyName, SchemaBuilder.booleanSchema(schema));
    };
    SchemaBuilder.prototype.addOptionalBoolean = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addOptionalProperty(propertyName, SchemaBuilder.booleanSchema(schema));
    };
    SchemaBuilder.prototype.addArray = function (propertyName, items, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addProperty(propertyName, SchemaBuilder.arraySchema(items, schema));
    };
    SchemaBuilder.prototype.addOptionalArray = function (propertyName, items, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addOptionalProperty(propertyName, SchemaBuilder.arraySchema(items, schema));
    };
    SchemaBuilder.prototype.addStringArray = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addArray(propertyName, SchemaBuilder.stringSchema(), schema);
    };
    SchemaBuilder.prototype.addOptionalStringArray = function (propertyName, schema) {
        if (schema === void 0) { schema = {}; }
        return this.addOptionalArray(propertyName, SchemaBuilder.stringSchema(), schema);
    };
    SchemaBuilder.prototype.renameProperty = function (propertyName, newPropertyName) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'renameProperty' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        if (propertyName in this.schemaObject.properties) {
            this.schemaObject.properties[newPropertyName] = this.schemaObject.properties[propertyName];
            delete this.schemaObject.properties[propertyName];
            if (this.schemaObject.required && this.schemaObject.required.indexOf(propertyName) !== -1) {
                this.schemaObject.required.splice(this.schemaObject.required.indexOf(propertyName), 1);
            }
            this.schemaObject.required = this.schemaObject.required || [];
            this.schemaObject.required.push(newPropertyName);
        }
        return this;
    };
    SchemaBuilder.prototype.renameOptionalProperty = function (propertyName, newPropertyName) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'renameOptionalProperty' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        if (propertyName in this.schemaObject.properties) {
            this.schemaObject.properties[newPropertyName] = this.schemaObject.properties[propertyName];
            delete this.schemaObject.properties[propertyName];
            if (this.schemaObject.required && this.schemaObject.required.indexOf(propertyName) !== -1) {
                this.schemaObject.required.splice(this.schemaObject.required.indexOf(propertyName), 1);
            }
        }
        return this;
    };
    SchemaBuilder.prototype.pickProperties = function (properties) {
        if (!this.isObjectSchema || this.hasSchemasCombinationKeywords) {
            throw new Error("Schema Builder Error: 'pickProperties' can only be used with a simple object schema (no oneOf, anyOf, allOf or not)");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        var propertiesMap = {};
        for (var _i = 0, properties_2 = properties; _i < properties_2.length; _i++) {
            var property = properties_2[_i];
            if (property in this.schemaObject.properties) {
                propertiesMap[property] = this.schemaObject.properties[property];
            }
            else {
                throw new Error("Schema Builder Error: picked property " + property + " is not avaialble in " + (this.schemaObject.title || 'this') + " schema.");
            }
        }
        this.schemaObject.properties = propertiesMap;
        if (this.schemaObject.required) {
            this.schemaObject.required = this.schemaObject.required.filter(function (r) { return properties.indexOf(r) !== -1; });
        }
        if (Array.isArray(this.schemaObject.required) && this.schemaObject.required.length === 0) {
            delete this.schemaObject.required;
        }
        this.schemaObject.additionalProperties = false;
        return this;
    };
    SchemaBuilder.prototype.pickPropertiesIncludingAdditonalProperties = function (properties) {
        var additionalProperties = this.schemaObject.additionalProperties;
        if (!this.isObjectSchema || !this.hasAditionalProperties || this.hasSchemasCombinationKeywords) {
            throw new Error("Schema Builder Error: 'pickPropertiesIncludingAdditonalProperties' can only be used with a simple object schema with additionalProperties (no oneOf, anyOf, allOf or not)");
        }
        this.pickProperties(properties);
        this.schemaObject.additionalProperties = additionalProperties;
        return this;
    };
    SchemaBuilder.prototype.omitProperties = function (properties) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'omitProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        var p = Object.keys(this.schemaObject.properties).filter(function (k) { return properties.indexOf(k) === -1; });
        return this.pickProperties(p);
    };
    SchemaBuilder.prototype.transformProperties = function (schemaBuilder, propertyNames) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'transformProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        for (var _i = 0, propertyNames_1 = propertyNames; _i < propertyNames_1.length; _i++) {
            var property = propertyNames_1[_i];
            var propertySchema = this.schemaObject.properties[property];
            if (!propertySchema) {
                throw new Error("Schema Builder Error: property " + property + " is not avaialble in " + (this.schemaObject.title || 'this') + " schema.");
            }
            this.schemaObject.properties[property] = {
                oneOf: [propertySchema, schemaBuilder.schemaObject]
            };
        }
        return this;
    };
    SchemaBuilder.prototype.transformPropertiesToArray = function (propertyNames) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'transformPropertiesToArray' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        this.schemaObject.properties = this.schemaObject.properties || {};
        propertyNames = propertyNames || Object.keys(this.schemaObject.properties);
        for (var _i = 0, propertyNames_2 = propertyNames; _i < propertyNames_2.length; _i++) {
            var property = propertyNames_2[_i];
            var propertySchema = this.schemaObject.properties[property];
            if (!propertySchema) {
                throw new Error("Schema Builder Error: property " + property + " is not avaialble in " + (this.schemaObject.title || 'this') + " schema.");
            }
            this.schemaObject.properties[property] = {
                oneOf: [propertySchema, { type: "array", items: propertySchema }]
            };
        }
        return this;
    };
    SchemaBuilder.prototype.mergeProperties = function (schema) {
        if (!this.isSimpleObjectSchema) {
            throw new Error("Schema Builder Error: 'mergeProperties' can only be used with a simple object schema (no additionalProperties, oneOf, anyOf, allOf or not)");
        }
        for (var propertyKey in schema.schemaObject.properties) {
            if (!(propertyKey in this.schemaObject.properties)) {
                this.schemaObject.properties[propertyKey] = schema.schemaObject.properties[propertyKey];
                if (schema.schemaObject.required && schema.schemaObject.required.indexOf(propertyKey) !== -1) {
                    this.schemaObject.required = this.schemaObject.required || [];
                    this.schemaObject.required.push(propertyKey);
                }
            }
            else {
                this.schemaObject.properties[propertyKey] = {
                    oneOf: [this.schemaObject.properties[propertyKey], schema.schemaObject.properties[propertyKey]]
                };
                if (!this.schemaObject.required || this.schemaObject.required.indexOf(propertyKey) === -1) {
                    this.schemaObject.required = this.schemaObject.required || [];
                    this.schemaObject.required.push(propertyKey);
                }
            }
        }
        return this;
    };
    SchemaBuilder.prototype.flatType = function () {
        return this;
    };
    Object.defineProperty(SchemaBuilder.prototype, "isSchemaSealed", {
        get: function () {
            return this.schemaObject.additionalProperties === false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SchemaBuilder.prototype, "isSimpleObjectSchema", {
        get: function () {
            return this.isObjectSchema && !this.hasAditionalProperties && !this.hasSchemasCombinationKeywords;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SchemaBuilder.prototype, "isObjectSchema", {
        get: function () {
            return this.schemaObject.type === "object" || (!("type" in this.schemaObject) && "properties" in this.schemaObject);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SchemaBuilder.prototype, "hasAditionalProperties", {
        get: function () {
            return this.isObjectSchema && this.schemaObject.additionalProperties !== false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SchemaBuilder.prototype, "hasSchemasCombinationKeywords", {
        get: function () {
            return "oneOf" in this.schemaObject || "allOf" in this.schemaObject || "anyOf" in this.schemaObject || "not" in this.schemaObject;
        },
        enumerable: true,
        configurable: true
    });
    SchemaBuilder.prototype.clone = function () {
        return new SchemaBuilder(_.cloneDeep(this.schemaObject));
    };
    SchemaBuilder.prototype.validate = function (o) {
        if (!this.validationFunction) {
            this.ajv = new Ajv({ coerceTypes: true, removeAdditional: true, useDefaults: true, meta: open_api_1.metaSchema });
            this.validationFunction = this.ajv.compile(this.schemaObject);
        }
        var valid = this.validationFunction(o);
        if (!valid) {
            throw validationError(this.ajv.errorsText(this.validationFunction.errors));
        }
    };
    SchemaBuilder.prototype.validateList = function (list) {
        if (!this.listValidationFunction) {
            this.ajvList = new Ajv({ coerceTypes: true, removeAdditional: true, useDefaults: true, meta: open_api_1.metaSchema });
            this.ajvList.addSchema(this.schemaObject, "schema");
            this.listValidationFunction = this.ajvList.compile({ type: "array", items: { $ref: "schema" }, minItems: 1 });
        }
        var valid = this.listValidationFunction(list);
        if (!valid) {
            throw validationError(this.ajvList.errorsText(this.listValidationFunction.errors));
        }
    };
    return SchemaBuilder;
}());
exports.SchemaBuilder = SchemaBuilder;
function validationError(ajvErrorsText) {
    var opt = {
        name: "SerafinSchemaValidationError"
    };
    return new VError(opt, "Invalid parameters: " + ajvErrorsText);
}
function throughJsonSchema(schema, action) {
    if (Array.isArray(schema)) {
        schema.forEach(function (s) {
            throughJsonSchema(s, action);
        });
    }
    else {
        if (!_.isObject(schema)) {
            return;
        }
        action(schema);
        if (schema.properties) {
            for (var property in schema.properties) {
                throughJsonSchema(schema.properties[property], action);
            }
        }
        if (schema.oneOf) {
            schema.oneOf.forEach(function (s) { return throughJsonSchema(s, action); });
        }
        if (schema.allOf) {
            schema.allOf.forEach(function (s) { return throughJsonSchema(s, action); });
        }
        if (schema.anyOf) {
            schema.anyOf.forEach(function (s) { return throughJsonSchema(s, action); });
        }
        if (schema.items) {
            throughJsonSchema(schema.items, action);
        }
        if (schema.not) {
            throughJsonSchema(schema.not, action);
        }
        if ("additionalProperties" in schema && typeof schema.additionalProperties !== "boolean") {
            throughJsonSchema(schema.additionalProperties, action);
        }
    }
    return schema;
}

//# sourceMappingURL=SchemaBuilder.js.map
