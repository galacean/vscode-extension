'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var chevrotain = require('chevrotain');

function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;

        if ("value" in descriptor) descriptor.writable = true;

        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);

    return Constructor;
}

function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
}

function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}

function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) {
        return Array.from(iter);
    }
}

function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);

    var n = Object.prototype.toString.call(o).slice(8, -1);

    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}

function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}

var DiagnosticSeverity;
(function(DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity[/**
   * Reports an error.
   */ "Error"] = 1] = "Error";
    DiagnosticSeverity[DiagnosticSeverity[/**
   * Reports a warning.
   */ "Warning"] = 2] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity[/**
   * Reports an information.
   */ "Information"] = 3] = "Information";
    DiagnosticSeverity[DiagnosticSeverity[/**
   * Reports a hint.
   */ "Hint"] = 4] = "Hint";
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
/** The shader pass property name which reference the fragment shader main function */ var FRAG_FN_NAME = "FragmentShader";
/** The shader pass property name which reference the vertex shader main function */ var VERT_FN_NAME = "VertexShader";

function stringifyVertexFunction(vertexFnProperty, context) {
    var vertFnAst = context.passAst.content.functions.find(function(fn) {
        return fn.content.name === vertexFnProperty.content.value;
    });
    if (!vertFnAst) {
        context.diagnostics.push({
            severity: DiagnosticSeverity.Error,
            message: "not found vertex shader definition",
            token: vertexFnProperty.position
        });
        return "";
    }
    context.setMainFnAst(vertFnAst);
    context.varyingTypeAstNode = vertFnAst.content.returnType;
    // parse varying variables
    var varyingStructAstNode = context.findGlobal(vertFnAst.content.returnType.content.text);
    if (!varyingStructAstNode) {
        context.diagnostics.push({
            severity: DiagnosticSeverity.Error,
            message: "no varying struct definition",
            token: vertFnAst.content.returnType.position
        });
        return "";
    }
    context.varyingStructInfo.structAstNode = varyingStructAstNode;
    context.varyingStructInfo.reference = varyingStructAstNode.content.variables.map(function(v) {
        return {
            referenced: false,
            property: v,
            text: "varying " + v.content.type.serialize(context) + " " + v.content.variable
        };
    });
    // parsing attribute variables
    vertFnAst.content.args.forEach(function(arg) {
        var type = arg.content.type;
        if (type.isCustom) {
            var structAstNode = context.findGlobal(type.text);
            if (!structAstNode) {
                context.diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    message: "no attribute struct definition",
                    token: arg.position
                });
                return;
            } else {
                var reference = structAstNode.content.variables.map(function(v) {
                    return {
                        referenced: false,
                        property: v,
                        text: "attribute " + v.content.type.serialize(context) + " " + v.content.variable
                    };
                });
                context.attributeStructListInfo.push({
                    objectName: arg.content.name,
                    structAstNode: structAstNode,
                    reference: reference
                });
            }
        } else {
            context.attributesVariableListInfo.push({
                name: arg.content.name,
                astNode: arg,
                referenced: false,
                text: "attribute " + type.text + " " + arg.content.name
            });
        }
    });
    var vertexFnStr = vertFnAst.serialize(context);
    return [
        context.getAttribText(),
        context.getGlobalText(),
        context.getVaryingText(),
        vertexFnStr
    ].join("\n");
}
function stringifyFragmentFunction(fragmentFnProperty, context) {
    var fragFnAst = context.passAst.content.functions.find(function(fn) {
        return fn.content.name === fragmentFnProperty.content.value;
    });
    if (!fragFnAst) {
        context.diagnostics.push({
            severity: DiagnosticSeverity.Error,
            message: "not found fragment shader definition",
            token: fragmentFnProperty.position
        });
        return "";
    }
    context.setMainFnAst(fragFnAst);
    context.varyingStructInfo.objectName = fragFnAst.content.args[0].content.name;
    var fragmentFnStr = fragFnAst.serialize(context);
    return [
        context.getVaryingText(),
        context.getGlobalText(),
        fragmentFnStr
    ].join("\n");
}

var RuntimeContext = /*#__PURE__*/ function() {
    function RuntimeContext() {
        this.functionAstStack = [];
        /** Diagnostic for linting service */ this.diagnostics = [];
        /** Global variables e.g. Uniforms */ this.globalList = [];
        /** global text */ this.globalTextList = [];
        /** attributes struct list */ this.attributeStructListInfo = [];
        /** attibutes variable list */ this.attributesVariableListInfo = [];
    }
    var _proto = RuntimeContext.prototype;
    _proto.subShaderReset = function subShaderReset() {
        this.passReset();
    };
    _proto.passReset = function passReset() {
        this.globalList.length = 0;
        this.functionAstStack.length = 0;
        this.attributeStructListInfo.length = 0;
        this.attributesVariableListInfo.length = 0;
        this.varyingTypeAstNode = undefined;
        this._currentMainFnAst = undefined;
        this.passAst = undefined;
        this.serializingAstNode = undefined;
        this.varyingStructInfo = {};
    };
    _proto.setMainFnAst = function setMainFnAst(ast) {
        this.globalTextList.length = 0;
        this._currentMainFnAst = ast;
    };
    _proto._initGlobalList = function _initGlobalList() {
        this.globalList = _to_consumable_array(this.passAst.content.functions.map(function(fn) {
            return {
                referenced: false,
                ast: fn,
                name: fn.content.name
            };
        })).concat(_to_consumable_array(this.passAst.content.structs.map(function(struct) {
            return {
                referenced: false,
                ast: struct,
                name: struct.content.name
            };
        })), _to_consumable_array(this.passAst.content.variables.map(function(v) {
            return {
                referenced: false,
                ast: v,
                name: v.content.variable
            };
        })));
    };
    _proto.referenceGlobal = function referenceGlobal(name) {
        var globalV = this.globalList.find(function(global) {
            return global.name === name;
        });
        if (globalV) {
            this.globalTextList.push(globalV.ast.serialize(this, {
                global: true
            }));
            globalV.referenced = true;
        }
        return globalV;
    };
    _proto.parse = function parse(ast) {
        var _this = this;
        var _ast_content_editorProperties;
        this.shaderAst = ast;
        var ret = {};
        ret.ast = ast;
        ret.editorProperties = (_ast_content_editorProperties = ast.content.editorProperties) == null ? void 0 : _ast_content_editorProperties.toJson();
        ret.name = ast.content.name;
        ret.subShaders = ast.content.subShader.map(function(ast) {
            return _this.parseSubShaderInfo(ast);
        });
        return ret;
    };
    _proto.parseSubShaderInfo = function parseSubShaderInfo(ast) {
        var _this = this;
        var _ast_content_tags;
        this.subShaderReset();
        var ret = {};
        ret.name = ast.content.name;
        ret.tags = (_ast_content_tags = ast.content.tags) == null ? void 0 : _ast_content_tags.toObj();
        ret.passes = ast.content.pass.map(function(item) {
            return _this.parsePassInfo(item);
        });
        return ret;
    };
    _proto.parsePassInfo = function parsePassInfo(ast) {
        var _this = this;
        var _ast_content_tags;
        this.passReset();
        this.passAst = ast;
        this._initGlobalList();
        var ret = {};
        ret.name = ast.content.name;
        ret.tags = (_ast_content_tags = ast.content.tags) == null ? void 0 : _ast_content_tags.toObj();
        ret.renderStates = {};
        ast.content.propterties.forEach(function(prop) {
            if (prop.content.type === VERT_FN_NAME) {
                if (ret.vert) {
                    _this.diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        message: "multiple vertex main function found",
                        token: prop.position
                    });
                    return;
                }
                ret.vert = stringifyVertexFunction(prop, _this);
            } else if (prop.content.type === FRAG_FN_NAME) {
                if (ret.frag) {
                    _this.diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        message: "multiple fragment main function found",
                        token: prop.position
                    });
                    return;
                }
                ret.frag = stringifyFragmentFunction(prop, _this);
            }
        });
        return ret;
    };
    _proto.findGlobal = function findGlobal(variable) {
        var ret = this.passAst.content.structs.find(function(struct) {
            return struct.content.name === variable;
        });
        if (!ret) {
            ret = this.passAst.content.variables.find(function(v) {
                return v.content.variable === variable;
            });
        }
        if (!ret) {
            ret = this.passAst.content.functions.find(function(fn) {
                return fn.content.name === variable;
            });
        }
        return ret;
    };
    _proto.findLocal = function findLocal(variable) {
        var _this_currentFunctionInfo;
        return (_this_currentFunctionInfo = this.currentFunctionInfo) == null ? void 0 : _this_currentFunctionInfo.localDeclaration.find(function(declare) {
            return declare.content.variable === variable;
        });
    };
    _proto.getAttribText = function getAttribText() {
        return this.attributeStructListInfo.map(function(struct) {
            return struct.reference.filter(function(item) {
                return item.referenced;
            }).map(function(item) {
                return "" + item.text + ";";
            }).join("\n");
        }).join("\n");
    };
    _proto.getVaryingText = function getVaryingText() {
        return this.varyingStructInfo.reference.filter(function(item) {
            return item.referenced;
        }).map(function(item) {
            return "" + item.text + ";";
        }).join("\n");
    };
    _proto.getGlobalText = function getGlobalText() {
        return this.globalTextList.join("\n");
    };
    _create_class(RuntimeContext, [
        {
            key: "currentFunctionInfo",
            get: function get() {
                return this.functionAstStack[this.functionAstStack.length - 1];
            }
        },
        {
            key: "currentMainFnAst",
            get: function get() {
                return this._currentMainFnAst;
            }
        }
    ]);
    return RuntimeContext;
}();

function _assert_this_initialized(self) {
    if (self === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");

    return self;
}

function _set_prototype_of(o, p) {
    _set_prototype_of = Object.setPrototypeOf || function setPrototypeOf(o, p) {
        o.__proto__ = p;

        return o;
    };

    return _set_prototype_of(o, p);
}

function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });

    if (superClass) _set_prototype_of(subClass, superClass);
}

var ValueInt = chevrotain.createToken({
    name: "ValueInt",
    pattern: /-?\d+/
});
var ValueFloat = chevrotain.createToken({
    name: "ValueFloat",
    pattern: /-?\d+\.\d+/
});
var ValueString = chevrotain.createToken({
    name: "ValueString",
    pattern: /"[\w\s\.]*"/
});
var ValueTrue = chevrotain.createToken({
    name: "ValueTrue",
    pattern: /true/
});
var ValueFalse = chevrotain.createToken({
    name: "ValueFalse",
    pattern: /false/
});
var tokenList$4 = [
    ValueFloat,
    ValueInt,
    ValueString,
    ValueTrue,
    ValueFalse
];

function _extends() {
    _extends = Object.assign || function assign(target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
        }

        return target;
    };

    return _extends.apply(this, arguments);
}

function createKeywordToken(k, opts) {
    return chevrotain.createToken(_extends({
        label: k,
        name: k,
        pattern: new RegExp(k)
    }, opts));
}

var Shader = createKeywordToken("Shader", {
    longer_alt: ValueString
});
var EditorProperties = createKeywordToken("EditorProperties");
var SubShader = createKeywordToken("SubShader");
var Pass = createKeywordToken("Pass");
var Tags = createKeywordToken("Tags");
var BlendState = createKeywordToken("BlendState");
var DepthState = createKeywordToken("DepthState");
var StencilState = createKeywordToken("StencilState");
var RasterState = createKeywordToken("RasterState");
var Enabled = createKeywordToken("Enabled");
var SrcColorBlendFactor = createKeywordToken("SrcColorBlendFactor");
var DestColorBlendFactor = createKeywordToken("DestColorBlendFactor");
// tags
var ReplacementTag = createKeywordToken("ReplacementTag");
var PipelineStage = createKeywordToken("PipelineStage");
var VertexShader = createKeywordToken("VertexShader");
var FragmentShader = createKeywordToken("FragmentShader");
var tagTokenList = [
    ReplacementTag,
    PipelineStage
];
var tokenList$3 = [
    Shader,
    EditorProperties,
    SubShader,
    Pass,
    Tags,
    BlendState,
    DepthState,
    StencilState,
    RasterState,
    Enabled,
    DestColorBlendFactor,
    SrcColorBlendFactor,
    VertexShader,
    FragmentShader
];

/** { */ var LCurly = chevrotain.createToken({
    name: "LCurly",
    pattern: /\{/,
    label: "{"
});
/** } */ var RCurly = chevrotain.createToken({
    name: "RCurly",
    pattern: /\}/,
    label: "}"
});
/** ( */ var LBracket = chevrotain.createToken({
    name: "LBracket",
    pattern: /\(/,
    label: "("
});
/** ) */ var RBracket = chevrotain.createToken({
    name: "RBracket",
    pattern: /\)/,
    label: ")"
});
/** , */ var Comma = chevrotain.createToken({
    name: "Comma",
    pattern: /,/,
    label: ","
});
/** : */ var Colon = chevrotain.createToken({
    name: "Colon",
    pattern: /:/,
    label: ":"
});
/** = */ var Equal = chevrotain.createToken({
    name: "Equal",
    pattern: /=/,
    label: "="
});
/** ; */ var Semicolon = chevrotain.createToken({
    name: "Semicolon",
    pattern: /;/,
    label: ";"
});
/** . */ var Dot = chevrotain.createToken({
    name: "Dot",
    pattern: /\./,
    label: "."
});
var Add = chevrotain.createToken({
    name: "Add",
    pattern: /\+/,
    label: "+"
});
var Minus = chevrotain.createToken({
    name: "Minus",
    pattern: /\-/,
    label: "-"
});
var MultiEqual = chevrotain.createToken({
    name: "MultiEqual",
    pattern: /\*=/,
    label: "*="
});
var DivideEqual = chevrotain.createToken({
    name: "DivideEqual",
    pattern: /\/=/,
    label: "/="
});
var AddEqual = chevrotain.createToken({
    name: "AddEqual",
    pattern: /\+=/,
    label: "+="
});
var MinusEqual = chevrotain.createToken({
    name: "MinusEqual",
    pattern: /\-=/,
    label: "-="
});
var Mutiply = chevrotain.createToken({
    name: "Multiply",
    pattern: /\*/,
    label: "*"
});
var Divide = chevrotain.createToken({
    name: "Divide",
    pattern: /\//,
    label: "/"
});
var GreaterThan = chevrotain.createToken({
    name: "GreaterThan",
    pattern: /\>/,
    label: ">"
});
var LessThan = chevrotain.createToken({
    name: "LessThan",
    pattern: /\</,
    label: "<"
});
var tokenList$2 = [
    GreaterThan,
    LessThan,
    LCurly,
    RCurly,
    LBracket,
    RBracket,
    Comma,
    Colon,
    Equal,
    Semicolon,
    MultiEqual,
    DivideEqual,
    AddEqual,
    MinusEqual,
    Add,
    Minus,
    Mutiply,
    Divide,
    Dot,
    GreaterThan,
    LessThan
];

var TypeInteger = chevrotain.createToken({
    name: "TypeInteger",
    pattern: /Integer/
});
var TypeString = chevrotain.createToken({
    name: "TypeString",
    pattern: /String/
});
var TypeFloat = chevrotain.createToken({
    name: "TypeFloat",
    pattern: /Float/
});
var TypeRange = chevrotain.createToken({
    name: "Range",
    pattern: /Range/
});
var tokenList$1 = [
    TypeInteger,
    TypeString,
    TypeFloat,
    TypeRange
];

var glsl_mat2 = chevrotain.createToken({
    name: "glsl_mat2",
    pattern: /mat2/
});
var glsl_mat3 = chevrotain.createToken({
    name: "glsl_mat3",
    pattern: /mat3/
});
var glsl_mat4 = chevrotain.createToken({
    name: "glsl_mat4",
    pattern: /mat4/
});
var glsl_vec2 = chevrotain.createToken({
    name: "glsl_vec2",
    pattern: /vec2/
});
var glsl_vec3 = chevrotain.createToken({
    name: "glsl_vec3",
    pattern: /vec3/
});
var glsl_vec4 = chevrotain.createToken({
    name: "glsl_vec4",
    pattern: /vec4/
});
var glsl_ivec2 = chevrotain.createToken({
    name: "glsl_ivec2",
    pattern: /ivec2/
});
var glsl_ivec3 = chevrotain.createToken({
    name: "glsl_ivec3",
    pattern: /ivec3/
});
var glsl_ivec4 = chevrotain.createToken({
    name: "glsl_ivec4",
    pattern: /ivec4/
});
var glsl_float = chevrotain.createToken({
    name: "glsl_float",
    pattern: /float/
});
var glsl_int = chevrotain.createToken({
    name: "glsl_int",
    pattern: /int/
});
var glsl_sampler2D = chevrotain.createToken({
    name: "glsl_sampler2D",
    pattern: /sampler2D/
});
var tokenList = [
    glsl_ivec2,
    glsl_ivec3,
    glsl_ivec4,
    glsl_mat2,
    glsl_mat3,
    glsl_mat4,
    glsl_vec2,
    glsl_vec3,
    glsl_vec4,
    glsl_float,
    glsl_int,
    glsl_sampler2D
];

// built-in variable
var GLPosition = createKeywordToken("gl_Position");
var GLFragColor = createKeywordToken("gl_FragColor");
// function
var Pow = createKeywordToken("pow");
var Texture2D = createKeywordToken("texture2D");
// macro
var M_DEFINE = createKeywordToken("#define", {
    name: "m_define"
});
var M_IFDEF = createKeywordToken("#ifdef", {
    name: "m_ifdef"
});
var M_IFNDEF = createKeywordToken("#ifndef", {
    name: "m_ifndef"
});
var M_ELSE = createKeywordToken("#else", {
    name: "m_else"
});
var M_ELIF = createKeywordToken("#elif", {
    name: "m_elif"
});
var M_ENDIF = createKeywordToken("#endif", {
    name: "m_endif"
});
var M_INCLUDE = createKeywordToken("#include", {
    name: "m_include"
});
// other
var Struct = createKeywordToken("struct");
var If = createKeywordToken("if");
var Else = createKeywordToken("else");
var Discard = createKeywordToken("discard");
var Void = createKeywordToken("void");
var Return = createKeywordToken("return");
var variableTokenList = [
    GLPosition,
    GLFragColor
];
var funcTokenList = [
    Texture2D,
    Pow
];
var macroTokenList = [
    M_DEFINE,
    M_IFDEF,
    M_IFNDEF,
    M_ELSE,
    M_ELIF,
    M_ENDIF,
    M_INCLUDE
];
var otherTokenList = [
    Struct,
    If,
    Else,
    Discard,
    Void,
    Return
];

var Identifier = chevrotain.createToken({
    name: "Identifier",
    pattern: /[a-zA-z]\w*/
});
var WhiteSpace = chevrotain.createToken({
    name: "WhiteSpace",
    pattern: /(\s|\n)+/,
    group: chevrotain.Lexer.SKIPPED
});
var CommnetLine = chevrotain.createToken({
    name: "CommnetLine",
    pattern: /\/\/.*\n/,
    group: chevrotain.Lexer.SKIPPED
});
var CommentMultiLine = chevrotain.createToken({
    name: "CommentMultiLine",
    pattern: /\/\*.*?\*\//,
    group: chevrotain.Lexer.SKIPPED
});

var ALL_RULES = [];
function consume(idx, tokType) {
    if (idx === 0) return this.CONSUME1(tokType);
    else if (idx === 1) return this.CONSUME2(tokType);
    else if (idx === 2) return this.CONSUME3(tokType);
    else if (idx === 3) return this.CONSUME4(tokType);
    else if (idx === 4) return this.CONSUME5(tokType);
    else if (idx === 5) return this.CONSUME6(tokType);
    return this.CONSUME7(tokType);
}

function RuleShader() {
    var _this = this;
    var $ = this;
    this.CONSUME(Shader);
    this.CONSUME(ValueString);
    this.CONSUME(LCurly);
    this.MANY(function() {
        _this.OR([
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleProperty);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleSubShader);
                }
            }
        ]);
    });
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleShader",
    fn: RuleShader
});

function RuleSubShader() {
    var _this = this;
    var $ = this;
    this.CONSUME(SubShader);
    this.CONSUME(ValueString);
    this.CONSUME(LCurly);
    this.MANY(function() {
        _this.OR([
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleShaderPass);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleTag);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleRenderStateDeclaration);
                }
            }
        ]);
    });
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleSubShader",
    fn: RuleSubShader
});

function RuleShaderPass() {
    var _this = this;
    var $ = this;
    this.CONSUME(Pass);
    this.CONSUME(ValueString);
    this.CONSUME(LCurly);
    this.MANY(function() {
        _this.OR([
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleTag);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleStruct);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleFn);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleFnVariableDeclaration);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.SubShaderPassPropertyAssignment);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleRenderStateDeclaration);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleFnMacroInclude);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleFnMacroDefine);
                }
            }
        ]);
    });
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleShaderPass",
    fn: RuleShaderPass
});

function RuleFnExpression() {
    var $ = this;
    this.SUBRULE($.RuleFnAddExpr);
}
ALL_RULES.push({
    name: "RuleFnExpression",
    fn: RuleFnExpression
});
function RuleFnAddExpr() {
    var _this = this;
    var $ = this;
    this.SUBRULE($.RuleFnMultiplicationExpr);
    this.MANY(function() {
        _this.SUBRULE($.RuleAddOperator);
        _this.SUBRULE2($.RuleFnMultiplicationExpr);
    });
}
ALL_RULES.push({
    name: "RuleFnAddExpr",
    fn: RuleFnAddExpr
});
function RuleFnMultiplicationExpr() {
    var _this = this;
    var $ = this;
    this.SUBRULE($.RuleFnAtomicExpr);
    this.MANY(function() {
        _this.SUBRULE($.RuleMultiplcationOperator);
        _this.SUBRULE2($.RuleFnAtomicExpr);
    });
}
ALL_RULES.push({
    name: "RuleFnMultiplicationExpr",
    fn: RuleFnMultiplicationExpr
});
function RuleFnAtomicExpr() {
    var _this = this;
    var $ = this;
    this.OPTION(function() {
        return _this.SUBRULE($.RuleAddOperator);
    });
    this.OR([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnParenthesisExpr);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleNumber);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnCall);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnVariable);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnAtomicExpr",
    fn: RuleFnAtomicExpr
});
function RuleFnParenthesisExpr() {
    var $ = this;
    this.CONSUME1(LBracket);
    this.SUBRULE($.RuleFnAddExpr);
    this.CONSUME(RBracket);
}
ALL_RULES.push({
    name: "RuleFnParenthesisExpr",
    fn: RuleFnParenthesisExpr
});
function RuleFnCall() {
    var _this = this;
    var $ = this;
    this.SUBRULE($.RuleFnCallVariable);
    this.CONSUME1(LBracket);
    this.MANY_SEP({
        SEP: Comma,
        DEF: function() {
            _this.SUBRULE($.RuleAssignableValue);
        }
    });
    this.CONSUME(RBracket);
}
ALL_RULES.push({
    name: "RuleFnCall",
    fn: RuleFnCall
});
function RuleFnCallVariable() {
    var _this = this;
    this.OR(_to_consumable_array(tokenList.map(function(item) {
        return {
            ALT: function() {
                return _this.CONSUME(item);
            }
        };
    })).concat([
        {
            ALT: function() {
                return _this.CONSUME(Pow);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(Texture2D);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(Identifier);
            }
        }
    ]));
}
ALL_RULES.push({
    name: "RuleFnCallVariable",
    fn: RuleFnCallVariable
});
function RuleFnRelationExpr() {
    var $ = this;
    this.SUBRULE($.RuleFnAddExpr);
    this.SUBRULE($.RuleRelationOperator);
    this.SUBRULE1($.RuleFnAddExpr);
}
ALL_RULES.push({
    name: "RuleFnRelationExpr",
    fn: RuleFnRelationExpr
});

function RuleFnVariableDeclaration() {
    var _this = this;
    var $ = this;
    this.SUBRULE($.RuleVariableType);
    this.CONSUME(Identifier);
    this.OPTION1(function() {
        _this.CONSUME(Equal);
        _this.SUBRULE($.RuleFnExpression);
    });
    this.CONSUME(Semicolon);
}
ALL_RULES.push({
    name: "RuleFnVariableDeclaration",
    fn: RuleFnVariableDeclaration
});
function RuleFnStatement() {
    var _this = this;
    var $ = this;
    this.OR([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnCall);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnReturnStatement);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnVariableDeclaration);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnConditionStatement);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnAssignStatement);
            }
        },
        {
            ALT: function() {
                _this.CONSUME(Discard);
                _this.CONSUME(Semicolon);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnStatement",
    fn: RuleFnStatement
});
function RuleFnAssignStatement() {
    var $ = this;
    this.SUBRULE($.RuleFnAssignLO);
    this.SUBRULE($.RuleFnAssignmentOperator);
    this.SUBRULE($.RuleFnExpression);
    this.CONSUME(Semicolon);
}
ALL_RULES.push({
    name: "RuleFnAssignStatement",
    fn: RuleFnAssignStatement
});
function RuleFnAssignmentOperator() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(Equal);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(MultiEqual);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(DivideEqual);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(AddEqual);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(MinusEqual);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnAssignmentOperator",
    fn: RuleFnAssignmentOperator
});
function RuleFnAssignLO() {
    var _this = this;
    var $ = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(GLFragColor);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(GLPosition);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnVariable);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnAssignLO",
    fn: RuleFnAssignLO
});
function RuleFnVariable() {
    var _this = this;
    this.CONSUME(Identifier);
    this.MANY(function() {
        _this.CONSUME(Dot);
        _this.CONSUME1(Identifier);
    });
}
ALL_RULES.push({
    name: "RuleFnVariable",
    fn: RuleFnVariable
});
function RuleFnBlockStatement() {
    var $ = this;
    this.CONSUME(LCurly);
    this.SUBRULE($.RuleFnBody);
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleFnBlockStatement",
    fn: RuleFnBlockStatement
});
function RuleFnConditionStatement() {
    var _this = this;
    var $ = this;
    this.CONSUME(If);
    this.CONSUME1(LBracket);
    this.SUBRULE($.RuleFnRelationExpr);
    this.CONSUME(RBracket);
    this.SUBRULE($.RuleFnBlockStatement);
    this.MANY(function() {
        _this.CONSUME(Else);
        _this.SUBRULE($.RuleFnConditionStatement);
    });
    this.OPTION(function() {
        _this.CONSUME1(Else);
        _this.SUBRULE1($.RuleFnBlockStatement);
    });
}
ALL_RULES.push({
    name: "RuleFnConditionStatement",
    fn: RuleFnConditionStatement
});
function RuleFnReturnStatement() {
    var _this = this;
    var $ = this;
    this.CONSUME(Return);
    this.OR([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnExpression);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleBoolean);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueString);
            }
        }
    ]);
    this.CONSUME(Semicolon);
}
ALL_RULES.push({
    name: "RuleFnReturnStatement",
    fn: RuleFnReturnStatement
});
function RuleFnReturnVariable() {
    var _this = this;
    var $ = this;
    this.OR(_to_consumable_array(tokenList$4.map(function(item) {
        return {
            ALT: function() {
                return _this.CONSUME(item);
            }
        };
    })).concat([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnVariable);
            }
        }
    ]));
}
ALL_RULES.push({
    name: "RuleFnReturnVariable",
    fn: RuleFnReturnVariable
});

function RuleFnMacro() {
    var _this = this;
    var $ = this;
    this.OR([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnMacroDefine);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnMacroInclude);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnMacroCondition);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnMacro",
    fn: RuleFnMacro
});
function RuleFnMacroCondition() {
    var _this = this;
    var $ = this;
    this.SUBRULE($.RuleFnMacroConditionDeclare);
    this.CONSUME(Identifier);
    this.SUBRULE($.RuleFnBody);
    this.OPTION(function() {
        _this.SUBRULE($.RuleFnMacroConditionBranch);
    });
    this.OPTION1(function() {
        _this.SUBRULE1($.RuleFnBody);
    });
    this.CONSUME(M_ENDIF);
}
ALL_RULES.push({
    name: "RuleFnMacroCondition",
    fn: RuleFnMacroCondition
});
function RuleFnMacroConditionBranch() {
    var $ = this;
    this.SUBRULE($.RuleFnMacroConditionBranchDeclare);
    this.SUBRULE($.RuleFnBody);
}
ALL_RULES.push({
    name: "RuleFnMacroConditionBranch",
    fn: RuleFnMacroConditionBranch
});
function RuleFnMacroConditionBranchDeclare() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(M_ELSE);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnMacroConditionBranchDeclare",
    fn: RuleFnMacroConditionBranchDeclare
});
function RuleFnMacroConditionDeclare() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(M_IFDEF);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(M_IFNDEF);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnMacroConditionDeclare",
    fn: RuleFnMacroConditionDeclare
});
function RuleFnMacroDefine() {
    var _this = this;
    var $ = this;
    this.CONSUME(M_DEFINE);
    this.CONSUME(Identifier);
    this.OPTION(function() {
        _this.SUBRULE($.RuleAssignableValue);
    });
}
ALL_RULES.push({
    name: "RuleFnMacroDefine",
    fn: RuleFnMacroDefine
});
function RuleFnMacroInclude() {
    this.CONSUME(M_INCLUDE);
    this.CONSUME(ValueString);
}
ALL_RULES.push({
    name: "RuleFnMacroInclude",
    fn: RuleFnMacroInclude
});

function RuleFn() {
    var _this = this;
    var $ = this;
    this.SUBRULE($.RuleFnReturnType);
    this.CONSUME1(Identifier);
    this.CONSUME1(LBracket);
    this.MANY_SEP({
        SEP: Comma,
        DEF: function() {
            return _this.SUBRULE($.RuleFnArg);
        }
    });
    this.CONSUME(RBracket);
    this.CONSUME(LCurly);
    this.SUBRULE($.RuleFnBody);
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleFn",
    fn: RuleFn
});
function RuleFnArg() {
    var $ = this;
    this.SUBRULE($.RuleVariableType);
    this.CONSUME2(Identifier);
}
ALL_RULES.push({
    name: "RuleFnArg",
    fn: RuleFnArg
});
function RuleFnReturnType() {
    var _this = this;
    var $ = this;
    this.OR([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleVariableType);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(Void);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleFnReturnType",
    fn: RuleFnReturnType
});
function RuleFnBody() {
    var _this = this;
    var $ = this;
    this.MANY(function() {
        _this.OR([
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleFnMacro);
                }
            },
            {
                ALT: function() {
                    return _this.SUBRULE($.RuleFnStatement);
                }
            }
        ]);
    });
}
ALL_RULES.push({
    name: "RuleFnBody",
    fn: RuleFnBody
});

function RuleProteryItem() {
    var $ = this;
    this.CONSUME(Identifier);
    this.CONSUME9(LBracket);
    this.CONSUME(ValueString);
    this.CONSUME(Comma);
    this.SUBRULE($.RulePropertyItemType);
    this.CONSUME(RBracket);
    this.CONSUME(Equal);
    this.SUBRULE($.RulePropertyItemValue);
    this.CONSUME(Semicolon);
}
ALL_RULES.push({
    name: "RuleProteryItem",
    fn: RuleProteryItem
});
function RulePropertyItemType() {
    var _this = this;
    var $ = this;
    this.OR(_to_consumable_array(tokenList$1.filter(function(item) {
        return item.name !== "Range";
    }).map(function(item) {
        return {
            ALT: function() {
                return _this.CONSUME(item);
            }
        };
    })).concat([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleVariableType);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleRange);
            }
        }
    ]));
}
ALL_RULES.push({
    name: "RulePropertyItemType",
    fn: RulePropertyItemType
});
function RulePropertyItemValue() {
    var _this = this;
    var $ = this;
    this.OR([
        {
            ALT: function() {
                return _this.SUBRULE($.TupleFloat4);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.TupleFloat3);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.TupleFloat2);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.TupleInt4);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.TupleInt3);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.TupleInt2);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueTrue);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueFalse);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME1(ValueInt);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueString);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueFloat);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RulePropertyItemValue",
    fn: RulePropertyItemValue
});
function RuleRange() {
    this.CONSUME(TypeRange);
    this.CONSUME2(LBracket);
    this.CONSUME(ValueInt);
    this.CONSUME(Comma);
    this.CONSUME1(ValueInt);
    this.CONSUME(RBracket);
}
ALL_RULES.push({
    name: "RuleRange",
    fn: RuleRange
});
function RuleProperty() {
    var _this = this;
    var $ = this;
    this.CONSUME(EditorProperties);
    this.CONSUME(LCurly);
    this.MANY(function() {
        _this.SUBRULE($.RuleProteryItem);
    });
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleProperty",
    fn: RuleProperty
});

function RuleTuple(type, num) {
    var valueToken = type === "int" ? ValueInt : ValueFloat;
    this.CONSUME2(LBracket);
    for(var i = 0; i < num - 1; i++){
        consume.bind(this)(i, valueToken);
        consume.bind(this)(i, Comma);
    }
    this.CONSUME(valueToken);
    this.CONSUME(RBracket);
}
ALL_RULES.push({
    name: "TupleInt2",
    fn: function fn() {
        RuleTuple.bind(this)("int", 2);
    }
});
ALL_RULES.push({
    name: "TupleInt3",
    fn: function fn() {
        // @ts-ignore
        RuleTuple.bind(this)("int", 3);
    }
});
ALL_RULES.push({
    name: "TupleInt4",
    fn: function fn() {
        // @ts-ignore
        RuleTuple.bind(this)("int", 4);
    }
});
ALL_RULES.push({
    name: "TupleFloat2",
    fn: function fn() {
        // @ts-ignore
        RuleTuple.bind(this)("float", 2);
    }
});
ALL_RULES.push({
    name: "TupleFloat3",
    fn: function fn() {
        // @ts-ignore
        RuleTuple.bind(this)("float", 3);
    }
});
ALL_RULES.push({
    name: "TupleFloat4",
    fn: function fn() {
        // @ts-ignore
        RuleTuple.bind(this)("float", 4);
    }
});

function RuleTag() {
    var _this = this;
    var $ = this;
    this.CONSUME(Tags);
    this.CONSUME(LCurly);
    this.MANY_SEP({
        DEF: function() {
            _this.SUBRULE($.RuleTagAssignment);
        },
        SEP: Comma
    });
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleTag",
    fn: RuleTag
});
function RuleTagAssignment() {
    var $ = this;
    this.SUBRULE($.RuleTagType);
    this.CONSUME(Equal);
    this.CONSUME(ValueString);
}
ALL_RULES.push({
    name: "RuleTagAssignment",
    fn: RuleTagAssignment
});
function RuleTagType() {
    var _this = this;
    this.OR(tagTokenList.map(function(kw) {
        return {
            ALT: function() {
                return _this.CONSUME(kw);
            }
        };
    }));
}
ALL_RULES.push({
    name: "RuleTagType",
    fn: RuleTagType
});

function SubShaderPassPropertyAssignment() {
    var $ = this;
    this.SUBRULE($.RuleShaderPassPropertyType);
    this.CONSUME(Equal);
    this.CONSUME(Identifier);
    this.CONSUME(Semicolon);
}
ALL_RULES.push({
    name: "SubShaderPassPropertyAssignment",
    fn: SubShaderPassPropertyAssignment
});
function RuleShaderPassPropertyType() {
    var _this = this;
    var $ = this;
    this.OR([
        {
            ALT: function() {
                return _this.SUBRULE($.RuleRenderStateType);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(VertexShader);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(FragmentShader);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleShaderPassPropertyType",
    fn: RuleShaderPassPropertyType
});

function RuleStruct() {
    var _this = this;
    var $ = this;
    this.CONSUME(Struct);
    this.CONSUME(Identifier);
    this.CONSUME(LCurly);
    this.MANY(function() {
        _this.SUBRULE($.RuleDeclaration);
        _this.CONSUME(Semicolon);
    });
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleStruct",
    fn: RuleStruct
});

function RuleDeclare() {
    var $ = this;
    this.SUBRULE($.RuleVariableType);
    this.CONSUME2(Identifier);
}
ALL_RULES.push({
    name: "RuleDeclaration",
    fn: RuleDeclare
});
function RuleRenderStateType() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(BlendState);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(DepthState);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(RasterState);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(StencilState);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleRenderStateType",
    fn: RuleRenderStateType
});
function RuleStateProperty() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(Enabled);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(DestColorBlendFactor);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(SrcColorBlendFactor);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleStateProperty",
    fn: RuleStateProperty
});
function RuleAssignableValue() {
    var _this = this;
    var $ = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(ValueTrue);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueFalse);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueString);
            }
        },
        {
            ALT: function() {
                return _this.SUBRULE($.RuleFnAddExpr);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(GLFragColor);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(GLPosition);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleAssignableValue",
    fn: RuleAssignableValue
});
function RuleRenderStateDeclaration() {
    var _this = this;
    var $ = this;
    this.SUBRULE($.RuleRenderStateType);
    this.CONSUME(Identifier);
    this.CONSUME(LCurly);
    this.MANY(function() {
        _this.SUBRULE($.RuleStatePropertyAssign);
        _this.CONSUME(Semicolon);
    });
    this.CONSUME(RCurly);
}
ALL_RULES.push({
    name: "RuleRenderStateDeclaration",
    fn: RuleRenderStateDeclaration
});
function RuleStatePropertyAssign() {
    var $ = this;
    this.SUBRULE($.RuleStateProperty);
    this.CONSUME(Equal);
    this.SUBRULE($.RuleAssignableValue);
}
ALL_RULES.push({
    name: "RuleStatePropertyAssign",
    fn: RuleStatePropertyAssign
});
function RuleNumberWithSign() {
    var _this = this;
    var $ = this;
    this.OPTION(function() {
        return _this.SUBRULE($.RuleAddOperator);
    });
    this.SUBRULE($.RuleNumber);
}
ALL_RULES.push({
    name: "RuleNumberWithSign",
    fn: RuleNumberWithSign
});
function RuleNumber() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME1(ValueInt);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueFloat);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleNumber",
    fn: RuleNumber
});
function RuleBoolean() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(ValueTrue);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(ValueFalse);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleBoolean",
    fn: RuleBoolean
});
function RuleAddOperator() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(Add);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(Minus);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleAddOperator",
    fn: RuleAddOperator
});
function RuleMultiplcationOperator() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(Mutiply);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(Divide);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleMultiplcationOperator",
    fn: RuleMultiplcationOperator
});
function RuleRelationOperator() {
    var _this = this;
    this.OR([
        {
            ALT: function() {
                return _this.CONSUME(GreaterThan);
            }
        },
        {
            ALT: function() {
                return _this.CONSUME(LessThan);
            }
        }
    ]);
}
ALL_RULES.push({
    name: "RuleRelationOperator",
    fn: RuleRelationOperator
});

function RuleVariableType() {
    var _this = this;
    var types = tokenList.map(function(item) {
        return {
            ALT: function() {
                return _this.CONSUME(item);
            }
        };
    });
    this.OR(_to_consumable_array(types).concat([
        {
            ALT: function() {
                return _this.CONSUME(Identifier);
            }
        }
    ]));
}
ALL_RULES.push({
    name: "RuleVariableType",
    fn: RuleVariableType
});

var allTokens = [
    WhiteSpace,
    CommnetLine,
    CommentMultiLine
].concat(_to_consumable_array(tokenList$2), _to_consumable_array(tokenList$3), _to_consumable_array(variableTokenList), _to_consumable_array(funcTokenList), _to_consumable_array(macroTokenList), _to_consumable_array(otherTokenList), _to_consumable_array(tagTokenList), _to_consumable_array(tokenList$4), _to_consumable_array(tokenList), _to_consumable_array(tokenList$1), [
    Identifier
]);
var ShaderParser = /*#__PURE__*/ function(CstParser) {
    _inherits(ShaderParser, CstParser);
    function ShaderParser() {
        var _this;
        _this = CstParser.call(this, allTokens, {
            maxLookahead: 8
        }) || this;
        _this.lexer = new chevrotain.Lexer(allTokens);
        ALL_RULES.forEach(function(rule) {
            _this.RULE(rule.name, rule.fn.bind(_assert_this_initialized(_this)));
        });
        _this.performSelfAnalysis();
        return _this;
    }
    var _proto = ShaderParser.prototype;
    _proto.parse = function parse(text) {
        // TODO: replace include
        var lexingResult = this.lexer.tokenize(text);
        this.input = lexingResult.tokens;
    };
    return ShaderParser;
}(chevrotain.CstParser);

function _create_for_of_iterator_helper_loose(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

    if (it) return (it = it.call(o)).next.bind(it);
    // Fallback for engines without symbol support
    if (Array.isArray(o) || (it = _unsupported_iterable_to_array(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;

        var i = 0;

        return function() {
            if (i >= o.length) return { done: true };

            return { done: false, value: o[i++] };
        };
    }

    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var AstNode = /*#__PURE__*/ function() {
    function AstNode(ast) {
        /** @internal */ this._isAstNode = true;
        this.position = ast.position;
        this.content = ast.content;
    }
    var _proto = AstNode.prototype;
    _proto._doSerialization = function _doSerialization(context, args) {
        throw _extends({
            message: "NOT IMPLEMENTED",
            astNode: this
        }, this.position);
    };
    _proto._beforeSerialization = function _beforeSerialization(context, args) {
        context.serializingAstNode = this;
    };
    _proto.serialize = function serialize(context, args) {
        this._beforeSerialization(context, args);
        return this._doSerialization(context, args);
    };
    _proto._jsonifybject = function _jsonifybject(obj, includePos, withClass) {
        if (withClass === void 0) withClass = false;
        var _this = this;
        if (typeof obj !== "object") return obj;
        var ret = {};
        if (obj._isAstNode) {
            return obj.toJson(includePos, withClass);
        }
        for(var k in obj){
            var v = obj[k];
            if (v === null || v === undefined) continue;
            if (v._isAstNode) {
                v = v.toJson(includePos, withClass);
            } else if (Array.isArray(v)) {
                v = v.map(function(i) {
                    return _this._jsonifybject(i, includePos, withClass);
                });
            } else if (typeof v === "object") {
                v = this._jsonifybject(v, includePos, withClass);
            }
            ret[k] = v;
        }
        return ret;
    };
    _proto.toJson = function toJson(includePos, withClass) {
        if (includePos === void 0) includePos = false;
        if (withClass === void 0) withClass = false;
        var _this = this;
        var res;
        if (Array.isArray(this.content)) {
            res = this.content.map(function(item) {
                return _this._jsonifybject(item, includePos, withClass);
            });
        } else if (typeof this.content === "object") {
            res = this._jsonifybject(this.content, includePos, withClass);
        } else {
            res = this.content;
        }
        var ret = {
            content: res
        };
        if (includePos) {
            ret.position = this.position;
        }
        if (withClass) {
            ret.Class = this.constructor.name;
        }
        return ret;
    };
    return AstNode;
}();

var ReturnTypeAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(ReturnTypeAstNode, AstNode);
    function ReturnTypeAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = ReturnTypeAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        if (this.content.isCustom) {
            context.findGlobal(this.content.text);
        }
        return this.content.text;
    };
    return ReturnTypeAstNode;
}(AstNode);
var ObjectAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(ObjectAstNode, AstNode);
    function ObjectAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = ObjectAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var astList = Object.values(this.content).sort(astSortAsc).filter(function(item) {
            return item.constructor.name !== "AstNode";
        });
        return astList.map(function(ast) {
            return ast.serialize(context);
        }).join("\n");
    };
    return ObjectAstNode;
}(AstNode);
var FnAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnAstNode, AstNode);
    function FnAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        context.functionAstStack.push({
            fnAst: this,
            localDeclaration: []
        });
        var returnType;
        var args;
        var fnName;
        if (context.currentMainFnAst === this) {
            returnType = "void";
            args = "";
            fnName = "main";
        } else {
            returnType = this.content.returnType.serialize(context);
            args = this.content.args.map(function(arg) {
                return arg.serialize(context);
            }).join(", ");
            fnName = this.content.name;
        }
        var body = this.content.body.serialize(context);
        context.functionAstStack.pop();
        return returnType + " " + fnName + " (" + args + ") {\n" + body + "\n}";
    };
    return FnAstNode;
}(AstNode);
var FnBodyAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnBodyAstNode, AstNode);
    function FnBodyAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnBodyAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var _this_content_macros, _this_content_statements;
        var statements = _to_consumable_array((_this_content_macros = this.content.macros) != null ? _this_content_macros : []).concat(_to_consumable_array((_this_content_statements = this.content.statements) != null ? _this_content_statements : [])).sort(function(a, b) {
            return a.position.start.line - b.position.start.line;
        });
        return statements.map(function(s) {
            return s.serialize(context);
        }).join("\n");
    };
    return FnBodyAstNode;
}(AstNode);
var FnMacroDefineAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnMacroDefineAstNode, AstNode);
    function FnMacroDefineAstNode() {
        return AstNode.apply(this, arguments);
    }
    return FnMacroDefineAstNode;
}(AstNode);
var FnMacroIncludeAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnMacroIncludeAstNode, AstNode);
    function FnMacroIncludeAstNode() {
        return AstNode.apply(this, arguments);
    }
    return FnMacroIncludeAstNode;
}(AstNode);
var FnMacroConditionAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnMacroConditionAstNode, AstNode);
    function FnMacroConditionAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnMacroConditionAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var _this_content_branch;
        var body = this.content.body.serialize(context);
        var _this_content_branch_serialize;
        var branch = (_this_content_branch_serialize = (_this_content_branch = this.content.branch) == null ? void 0 : _this_content_branch.serialize(context)) != null ? _this_content_branch_serialize : "";
        return this.content.command + " " + this.content.identifier + "\n  " + body + "\n" + branch + "\n#endif";
    };
    return FnMacroConditionAstNode;
}(AstNode);
var FnMacroConditionBranchAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnMacroConditionBranchAstNode, AstNode);
    function FnMacroConditionBranchAstNode() {
        return AstNode.apply(this, arguments);
    }
    return FnMacroConditionBranchAstNode;
}(AstNode);
var FnCallAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnCallAstNode, AstNode);
    function FnCallAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnCallAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        if (this.content.isCustom) {
            if (!context.referenceGlobal(this.content.function)) {
                context.diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
                    message: "Not found function definition",
                    token: this.position
                });
            }
        }
        var args = this.content.args.map(function(item) {
            return item.serialize(context);
        }).join(", ");
        return this.content.function + "(" + args + ")";
    };
    return FnCallAstNode;
}(AstNode);
var FnConditionStatementAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnConditionStatementAstNode, AstNode);
    function FnConditionStatementAstNode() {
        return AstNode.apply(this, arguments);
    }
    return FnConditionStatementAstNode;
}(AstNode);
var FnBlockStatementAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnBlockStatementAstNode, AstNode);
    function FnBlockStatementAstNode() {
        return AstNode.apply(this, arguments);
    }
    return FnBlockStatementAstNode;
}(AstNode);
var RelationOperatorAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(RelationOperatorAstNode, AstNode);
    function RelationOperatorAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = RelationOperatorAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content.text;
    };
    return RelationOperatorAstNode;
}(AstNode);
var RelationExprAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(RelationExprAstNode, AstNode);
    function RelationExprAstNode() {
        return AstNode.apply(this, arguments);
    }
    return RelationExprAstNode;
}(AstNode);
var FnAssignStatementAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnAssignStatementAstNode, AstNode);
    function FnAssignStatementAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnAssignStatementAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var value = this.content.value;
        var valueStr = value.serialize(context);
        return this.content.assignee.serialize(context) + " " + this.content.operator + " " + valueStr + ";";
    };
    return FnAssignStatementAstNode;
}(AstNode);
var AddOperatorAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(AddOperatorAstNode, AstNode);
    function AddOperatorAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = AddOperatorAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content;
    };
    return AddOperatorAstNode;
}(AstNode);
var MultiplcationOperatorAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(MultiplcationOperatorAstNode, AstNode);
    function MultiplcationOperatorAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = MultiplcationOperatorAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content;
    };
    return MultiplcationOperatorAstNode;
}(AstNode);
var AddExpreAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(AddExpreAstNode, AstNode);
    function AddExpreAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = AddExpreAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var orderItemList = _to_consumable_array(this.content.operands).concat(_to_consumable_array(this.content.operators)).sort(astSortAsc);
        return orderItemList.map(function(item) {
            return item.serialize(context);
        }).join(" ");
    };
    return AddExpreAstNode;
}(AstNode);
var MutliplicationExprAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(MutliplicationExprAstNode, AstNode);
    function MutliplicationExprAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = MutliplicationExprAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var orderItemList = _to_consumable_array(this.content.operands).concat(_to_consumable_array(this.content.operators)).sort(astSortAsc);
        return orderItemList.map(function(item) {
            return item.serialize(context);
        }).join(" ");
    };
    return MutliplicationExprAstNode;
}(AstNode);
var FnAtomicExprAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnAtomicExprAstNode, AstNode);
    function FnAtomicExprAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnAtomicExprAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var _this_content_sign;
        var _this_content_sign_serialize;
        var signStr = (_this_content_sign_serialize = (_this_content_sign = this.content.sign) == null ? void 0 : _this_content_sign.serialize(context)) != null ? _this_content_sign_serialize : "";
        return signStr + this.content.RuleFnAtomicExpr.serialize(context);
    };
    return FnAtomicExprAstNode;
}(AstNode);
var NumberAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(NumberAstNode, AstNode);
    function NumberAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = NumberAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content;
    };
    return NumberAstNode;
}(AstNode);
var BooleanAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(BooleanAstNode, AstNode);
    function BooleanAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = BooleanAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content;
    };
    return BooleanAstNode;
}(AstNode);
var AssignLoAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(AssignLoAstNode, AstNode);
    function AssignLoAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = AssignLoAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content;
    };
    return AssignLoAstNode;
}(AstNode);
var FnVariableAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnVariableAstNode, AstNode);
    function FnVariableAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnVariableAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        var objName = this.content[0];
        var propName = this.content[1];
        if (propName) {
            if (objName === context.varyingStructInfo.objectName) {
                var ref = context.varyingStructInfo.reference.find(function(ref) {
                    return ref.property.content.variable === propName;
                });
                ref && (ref.referenced = true);
                return this.content.slice(1).join(".");
            } else {
                var attribStruct = context.attributeStructListInfo.find(function(struct) {
                    return struct.objectName === objName;
                });
                if (attribStruct) {
                    var ref1 = attribStruct.reference.find(function(ref) {
                        return ref.property.content.variable === propName;
                    });
                    ref1 && (ref1.referenced = true);
                    return this.content.slice(1).join(".");
                }
            }
        }
        if (!context.findLocal(objName)) {
            if (!context.referenceGlobal(objName)) {
                context.diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    message: "Not found variable definition",
                    token: this.position
                });
            }
        }
        return this.content.join(".");
    };
    return FnVariableAstNode;
}(AstNode);
var FnReturnStatemtneAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnReturnStatemtneAstNode, AstNode);
    function FnReturnStatemtneAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnReturnStatemtneAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        if (context.currentFunctionInfo.fnAst === context.currentMainFnAst) {
            return "";
        }
        return "return " + this.content.serialize(context) + ";";
    };
    return FnReturnStatemtneAstNode;
}(AstNode);
var FnArgAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(FnArgAstNode, AstNode);
    function FnArgAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = FnArgAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context, args) {
        context.currentFunctionInfo.localDeclaration.push(new DeclarationAstNode({
            position: this.position,
            content: {
                variable: this.content.name,
                type: new VariableTypeAstNode({
                    position: this.position,
                    content: this.content.type
                })
            }
        }));
        return this.content.type.text + " " + this.content.name;
    };
    return FnArgAstNode;
}(AstNode);
var RenderStateDeclarationAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(RenderStateDeclarationAstNode, AstNode);
    function RenderStateDeclarationAstNode() {
        return AstNode.apply(this, arguments);
    }
    return RenderStateDeclarationAstNode;
}(AstNode);
var StatePropertyAssignAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(StatePropertyAssignAstNode, AstNode);
    function StatePropertyAssignAstNode() {
        return AstNode.apply(this, arguments);
    }
    return StatePropertyAssignAstNode;
}(AstNode);
var AssignableValueAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(AssignableValueAstNode, AstNode);
    function AssignableValueAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = AssignableValueAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content;
    };
    return AssignableValueAstNode;
}(AstNode);
var VariableTypeAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(VariableTypeAstNode, AstNode);
    function VariableTypeAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = VariableTypeAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content.text;
    };
    return VariableTypeAstNode;
}(AstNode);
var VariableDeclarationAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(VariableDeclarationAstNode, AstNode);
    function VariableDeclarationAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = VariableDeclarationAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context, opts) {
        if (context.currentFunctionInfo) {
            context.currentFunctionInfo.localDeclaration.push(this);
        }
        var typeNode = this.content.type;
        if (typeNode.content.text === context.varyingTypeAstNode.content.text) {
            if (this.content.default) {
                context.diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    message: "不应该给 varying 对象赋值",
                    token: this.content.default.position
                });
            }
            context.varyingStructInfo.objectName = this.content.variable;
            return "";
        }
        if (typeNode.content.isCustom) {
            if (!context.referenceGlobal(typeNode.content.text)) {
                context.diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    message: "Undefined type " + typeNode.content.text,
                    token: this.position
                });
            }
        }
        var ret = typeNode.content.text + " " + this.content.variable;
        if (opts == null ? void 0 : opts.global) {
            ret = "uniform " + ret;
        }
        if (this.content.default) {
            ret += " = " + this.content.default.serialize(context);
        }
        return ret + ";";
    };
    return VariableDeclarationAstNode;
}(AstNode);
var DeclarationAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(DeclarationAstNode, AstNode);
    function DeclarationAstNode() {
        return AstNode.apply(this, arguments);
    }
    return DeclarationAstNode;
}(AstNode);
var StructAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(StructAstNode, AstNode);
    function StructAstNode() {
        return AstNode.apply(this, arguments);
    }
    return StructAstNode;
}(AstNode);
var PassPropertyAssignmentAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(PassPropertyAssignmentAstNode, AstNode);
    function PassPropertyAssignmentAstNode() {
        return AstNode.apply(this, arguments);
    }
    return PassPropertyAssignmentAstNode;
}(AstNode);
var TagAssignmentAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(TagAssignmentAstNode, AstNode);
    function TagAssignmentAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = TagAssignmentAstNode.prototype;
    _proto._doSerialization = function _doSerialization(context) {
        return this.content.tag + " = " + this.content.value;
    };
    return TagAssignmentAstNode;
}(AstNode);
var TagAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(TagAstNode, AstNode);
    function TagAstNode() {
        return AstNode.apply(this, arguments);
    }
    var _proto = TagAstNode.prototype;
    _proto.toObj = function toObj() {
        var ret = {};
        for(var _iterator = _create_for_of_iterator_helper_loose(this.content), _step; !(_step = _iterator()).done;){
            var t = _step.value;
            ret[t.content.tag] = t.content.value.replace(/"(.*)"/, "$1");
        }
        return ret;
    };
    return TagAstNode;
}(AstNode);
var PropertyItemAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(PropertyItemAstNode, AstNode);
    function PropertyItemAstNode() {
        return AstNode.apply(this, arguments);
    }
    return PropertyItemAstNode;
}(AstNode);
var PropertyAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(PropertyAstNode, AstNode);
    function PropertyAstNode() {
        return AstNode.apply(this, arguments);
    }
    return PropertyAstNode;
}(AstNode);
var TupleNumber4AstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(TupleNumber4AstNode, AstNode);
    function TupleNumber4AstNode() {
        return AstNode.apply(this, arguments);
    }
    return TupleNumber4AstNode;
}(AstNode);
var RangeAstNode = /*#__PURE__*/ function(AstNode) {
    _inherits(RangeAstNode, AstNode);
    function RangeAstNode() {
        return AstNode.apply(this, arguments);
    }
    return RangeAstNode;
}(AstNode);

function isCstNode(node) {
    return !!node.children;
}
function extractCstToken(ctx, opts) {
    if (!ctx) return undefined;
    var _ctx_children;
    var obj = (_ctx_children = ctx.children) != null ? _ctx_children : ctx;
    for(var tk in obj){
        var value = obj[tk][0];
        var _opts_fnNode, _opts_fnToken;
        if (isCstNode(value)) return (_opts_fnNode = opts == null ? void 0 : opts.fnNode == null ? void 0 : opts.fnNode(value)) != null ? _opts_fnNode : extractCstToken(value, opts);
        else return (_opts_fnToken = opts == null ? void 0 : opts.fnToken == null ? void 0 : opts.fnToken(value)) != null ? _opts_fnToken : value.image;
    }
    return undefined;
}
function defaultVisit(ctx) {
    var content = {};
    var start = {
        line: Number.MAX_SAFE_INTEGER,
        offset: -1
    }, end = {
        line: 0,
        offset: -1
    };
    for(var k in ctx){
        if (isCstNode(ctx[k][0])) {
            var astInfo = this.visit(ctx[k][0]);
            if (astInfo.position.start.line < start.line) {
                start = astInfo.position.start;
            }
            if (astInfo.position.end.line > end.line) {
                end = astInfo.position.end;
            }
            content[k] = astInfo;
        } else {
            var token = ctx[k][0];
            var position = getTokenPosition(token);
            if (position.start.line < start.line) {
                start = position.start;
            }
            if (position.end.line > end.line) {
                end = position.end;
            }
            content[k] = new AstNode({
                content: token.image,
                position: position
            });
        }
    }
    return new ObjectAstNode({
        position: {
            start: start,
            end: end
        },
        content: content
    });
}
/**
 * get token position
 */ function getTokenPosition(token) {
    return {
        start: {
            line: token.startLine,
            offset: token.startColumn
        },
        end: {
            line: token.endLine,
            offset: token.endColumn
        }
    };
}
/**
 * get OR type CstNode position
 */ function getOrTypeCstNodePosition(node) {
    if (!isCstNode(node)) return getTokenPosition(node);
    var cstNode = node;
    for(var k in cstNode.children){
        var child = cstNode.children[k];
        if (!child) continue;
        return getOrTypeCstNodePosition(child[0]);
    }
}
function astSortAsc(a, b) {
    return a.position.start.line > b.position.start.line || a.position.start.line === b.position.start.line && a.position.start.offset >= b.position.start.offset ? 1 : -1;
}

var parser = new ShaderParser();
var ShaderVisitorConstructor = parser.getBaseCstVisitorConstructorWithDefaults();
var ShaderVisitor = /*#__PURE__*/ function(ShaderVisitorConstructor) {
    _inherits(ShaderVisitor, ShaderVisitorConstructor);
    function ShaderVisitor() {
        var _this;
        _this = ShaderVisitorConstructor.call(this) || this;
        _this.validateVisitor();
        return _this;
    }
    var _proto = ShaderVisitor.prototype;
    _proto.RuleShader = function RuleShader(ctx) {
        var _this = this;
        var _ctx_RuleSubShader;
        var editorProperties = ctx.RuleProperty ? this.visit(ctx.RuleProperty) : undefined;
        var subShader = (_ctx_RuleSubShader = ctx.RuleSubShader) == null ? void 0 : _ctx_RuleSubShader.map(function(item) {
            return _this.visit(item);
        });
        var position = {
            start: getTokenPosition(ctx.Shader[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        var ast = {
            position: position,
            content: {
                name: ctx.ValueString[0].image.replace(/"(.*)"/, "$1"),
                editorProperties: editorProperties,
                subShader: subShader
            }
        };
        return new AstNode(ast);
    };
    _proto.RuleSubShader = function RuleSubShader(ctx) {
        var _this = this;
        var _ctx_RuleShaderPass;
        var tags = ctx.RuleTag ? this.visit(ctx.RuleTag) : undefined;
        var pass = (_ctx_RuleShaderPass = ctx.RuleShaderPass) == null ? void 0 : _ctx_RuleShaderPass.map(function(item) {
            return _this.visit(item);
        });
        var position = {
            start: getTokenPosition(ctx.SubShader[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        var content = {
            name: ctx.ValueString[0].image.replace(/"(.*)"/, "$1"),
            tags: tags,
            pass: pass
        };
        return new AstNode({
            position: position,
            content: content
        });
    };
    _proto.RuleShaderPass = function RuleShaderPass(ctx) {
        var _this = this;
        var _ctx_SubShaderPassPropertyAssignment, _ctx_RuleStruct, _ctx_RuleFnVariableDeclaration, _ctx_RuleRenderStateDeclaration, _ctx_RuleFn, _ctx_RuleFnMacroDefine;
        var tags = ctx.RuleTag ? this.visit(ctx.RuleTag) : undefined;
        var propterties = (_ctx_SubShaderPassPropertyAssignment = ctx.SubShaderPassPropertyAssignment) == null ? void 0 : _ctx_SubShaderPassPropertyAssignment.map(function(item) {
            return _this.visit(item);
        });
        var structs = (_ctx_RuleStruct = ctx.RuleStruct) == null ? void 0 : _ctx_RuleStruct.map(function(item) {
            var ret = _this.visit(item);
            return ret;
        });
        var variables = (_ctx_RuleFnVariableDeclaration = ctx.RuleFnVariableDeclaration) == null ? void 0 : _ctx_RuleFnVariableDeclaration.map(function(item) {
            var ret = _this.visit(item);
            return ret;
        });
        var renderStates = (_ctx_RuleRenderStateDeclaration = ctx.RuleRenderStateDeclaration) == null ? void 0 : _ctx_RuleRenderStateDeclaration.map(function(item) {
            return _this.visit(item);
        });
        var functions = (_ctx_RuleFn = ctx.RuleFn) == null ? void 0 : _ctx_RuleFn.map(function(item) {
            var ret = _this.visit(item);
            return ret;
        });
        var defines = (_ctx_RuleFnMacroDefine = ctx.RuleFnMacroDefine) == null ? void 0 : _ctx_RuleFnMacroDefine.map(function(item) {
            return _this.visit(item);
        });
        var content = {
            name: ctx.ValueString[0].image.replace(/"(.*)"/, "$1"),
            tags: tags,
            propterties: propterties,
            structs: structs,
            variables: variables,
            defines: defines,
            renderStates: renderStates,
            functions: functions
        };
        var position = {
            start: getTokenPosition(ctx.Pass[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        return new AstNode({
            content: content,
            position: position
        });
    };
    _proto.RuleFnReturnType = function RuleFnReturnType(children, param) {
        var _children_RuleVariableType;
        var position = getOrTypeCstNodePosition({
            children: children
        });
        return new ReturnTypeAstNode({
            position: position,
            content: {
                text: extractCstToken(children),
                isCustom: !!((_children_RuleVariableType = children.RuleVariableType) == null ? void 0 : _children_RuleVariableType[0].children.Identifier)
            }
        });
    };
    _proto.RuleFn = function RuleFn(ctx) {
        var _this = this;
        var _ctx_RuleFnArg;
        var args = (_ctx_RuleFnArg = ctx.RuleFnArg) == null ? void 0 : _ctx_RuleFnArg.map(function(item) {
            return _this.visit(item);
        });
        var body = this.visit(ctx.RuleFnBody);
        var returnType = this.visit(ctx.RuleFnReturnType);
        var position = {
            start: returnType.position.start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        return new FnAstNode({
            position: position,
            content: {
                returnType: returnType,
                name: ctx.Identifier[0].image,
                args: args,
                body: body
            }
        });
    };
    _proto.RuleFnBody = function RuleFnBody(ctx) {
        var _this = this;
        var _ctx_RuleFnStatement, _ctx_RuleFnMacro;
        var start = {
            line: Number.MAX_SAFE_INTEGER,
            offset: -1
        }, end = {
            line: 0,
            offset: -1
        };
        var iterate = function(item) {
            var astInfo = _this.visit(item);
            if (astInfo.position.start.line < start.line) {
                start = astInfo.position.start;
            }
            if (astInfo.position.end.line > end.line) {
                end = astInfo.position.end;
            }
            return astInfo;
        };
        var statements = (_ctx_RuleFnStatement = ctx.RuleFnStatement) == null ? void 0 : _ctx_RuleFnStatement.map(iterate);
        var macros = (_ctx_RuleFnMacro = ctx.RuleFnMacro) == null ? void 0 : _ctx_RuleFnMacro.map(iterate);
        return new FnBodyAstNode({
            content: {
                statements: statements,
                macros: macros
            },
            position: {
                start: start,
                end: end
            }
        });
    };
    _proto.RuleFnMacro = function RuleFnMacro(children, param) {
        return defaultVisit.bind(this)(children);
    };
    _proto.RuleFnMacroDefine = function RuleFnMacroDefine(children, param) {
        var value = children.RuleAssignableValue ? this.visit(children.RuleAssignableValue) : undefined;
        var position = {
            start: getTokenPosition(children.m_define[0]).start,
            end: value ? value.position.end : getTokenPosition(children.Identifier[0]).end
        };
        return new FnMacroDefineAstNode({
            position: position,
            content: {
                variable: children.Identifier[0].image,
                value: value
            }
        });
    };
    _proto.RuleFnMacroInclude = function RuleFnMacroInclude(children, param) {
        var position = {
            start: getTokenPosition(children.m_include[0]).start,
            end: getTokenPosition(children.ValueString[0]).end
        };
        return new FnMacroIncludeAstNode({
            position: position,
            content: {
                name: children.ValueString[0].image.replace(/"(.*)"/, "$1")
            }
        });
    };
    _proto.RuleFnMacroCondition = function RuleFnMacroCondition(children, param) {
        var position = {
            start: getOrTypeCstNodePosition(children.RuleFnMacroConditionDeclare[0]).start,
            end: getTokenPosition(children.m_endif[0]).end
        };
        var branch = children.RuleFnMacroConditionBranch && this.visit(children.RuleFnMacroConditionBranch);
        return new FnMacroConditionAstNode({
            position: position,
            content: {
                command: extractCstToken(children.RuleFnMacroConditionDeclare[0]),
                identifier: children.Identifier[0].image,
                body: this.visit(children.RuleFnBody),
                branch: branch
            }
        });
    };
    _proto.RuleFnMacroConditionBranch = function RuleFnMacroConditionBranch(children, param) {
        var body = this.visit(children.RuleFnBody);
        var position = {
            start: getOrTypeCstNodePosition(children.RuleFnMacroConditionBranchDeclare[0]).start,
            end: body.position.end
        };
        return new FnMacroConditionBranchAstNode({
            position: position,
            content: {
                declare: extractCstToken(children.RuleFnMacroConditionBranchDeclare[0]),
                body: body
            }
        });
    };
    _proto.RuleFnStatement = function RuleFnStatement(ctx) {
        return defaultVisit.bind(this)(ctx);
    };
    _proto.RuleFnCall = function RuleFnCall(ctx) {
        var _this = this;
        var _ctx_RuleAssignableValue;
        var isCustom = !!ctx.RuleFnCallVariable[0].children.Identifier;
        var args = (_ctx_RuleAssignableValue = ctx.RuleAssignableValue) == null ? void 0 : _ctx_RuleAssignableValue.map(function(item) {
            return _this.visit(item);
        });
        var position = {
            start: getOrTypeCstNodePosition(ctx.RuleFnCallVariable[0]).start,
            end: getTokenPosition(ctx.RBracket[0]).end
        };
        var content = {
            function: extractCstToken(ctx.RuleFnCallVariable[0]),
            args: args,
            isCustom: isCustom
        };
        return new FnCallAstNode({
            position: position,
            content: content
        });
    };
    _proto.RuleFnConditionStatement = function RuleFnConditionStatement(ctx) {
        var _this = this;
        var _ctx_RuleFnConditionStatement, _elseIfBranches_;
        var blocks = ctx.RuleFnBlockStatement.map(function(item) {
            return _this.visit(item);
        }).sort(function(a, b) {
            return a.position.start.line - b.position.start.line;
        });
        var body = blocks[0], elseBranch = blocks[1];
        var elseIfBranches = (_ctx_RuleFnConditionStatement = ctx.RuleFnConditionStatement) == null ? void 0 : _ctx_RuleFnConditionStatement.map(function(item) {
            return _this.visit(item);
        }).sort(function(a, b) {
            return a.position.start.line - b.position.start.line;
        });
        var end = (_elseIfBranches_ = elseIfBranches[elseIfBranches.length - 1]) == null ? void 0 : _elseIfBranches_.position.end;
        var blockEnd = blocks[blocks.length - 1].position.end;
        end = end && end.line > blockEnd.line ? end : blockEnd;
        var position = {
            start: getTokenPosition(ctx.if[0]).start,
            end: end
        };
        return new FnConditionStatementAstNode({
            position: position,
            content: {
                relation: this.visit(ctx.RuleFnRelationExpr),
                body: body,
                elseBranch: elseBranch,
                elseIfBranches: elseIfBranches
            }
        });
    };
    _proto.RuleFnRelationExpr = function RuleFnRelationExpr(ctx) {
        var _this = this;
        var operands = ctx.RuleFnAddExpr.map(function(item) {
            return _this.visit(item);
        });
        var position = {
            start: operands[0].position.start,
            end: operands[1].position.end
        };
        return new RelationExprAstNode({
            position: position,
            content: {
                operator: this.visit(ctx.RuleRelationOperator),
                operands: operands
            }
        });
    };
    _proto.RuleRelationOperator = function RuleRelationOperator(children, param) {
        var position = getOrTypeCstNodePosition({
            children: children
        });
        return new RelationOperatorAstNode({
            position: position,
            content: extractCstToken(children)
        });
    };
    _proto.RuleFnBlockStatement = function RuleFnBlockStatement(ctx) {
        var position = {
            start: getTokenPosition(ctx.LCurly[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        return new FnBlockStatementAstNode({
            position: position,
            content: this.visit(ctx.RuleFnBody)
        });
    };
    _proto.RuleFnAssignStatement = function RuleFnAssignStatement(ctx) {
        var assignee = this.visit(ctx.RuleFnAssignLO);
        var position = {
            start: assignee.position.start,
            end: getTokenPosition(ctx.Semicolon[0]).end
        };
        return new FnAssignStatementAstNode({
            position: position,
            content: {
                operator: extractCstToken(ctx.RuleFnAssignmentOperator[0]),
                assignee: assignee,
                value: this.visit(ctx.RuleFnExpression)
            }
        });
    };
    _proto.RuleFnExpression = function RuleFnExpression(ctx) {
        return this.visit(ctx.RuleFnAddExpr);
    };
    _proto.RuleAddOperator = function RuleAddOperator(children, param) {
        var position = getOrTypeCstNodePosition({
            children: children
        });
        return new AddOperatorAstNode({
            content: extractCstToken(children),
            position: position
        });
    };
    _proto.RuleFnAddExpr = function RuleFnAddExpr(ctx) {
        var _this = this;
        if (ctx.RuleAddOperator) {
            var _ctx_RuleFnMultiplicationExpr;
            var operands = (_ctx_RuleFnMultiplicationExpr = ctx.RuleFnMultiplicationExpr) == null ? void 0 : _ctx_RuleFnMultiplicationExpr.map(function(item) {
                return _this.visit(item);
            });
            var position = {
                start: operands[0].position.start,
                end: operands[1].position.end
            };
            return new AddExpreAstNode({
                content: {
                    operators: ctx.RuleAddOperator.map(function(item) {
                        return _this.visit(item);
                    }),
                    operands: operands
                },
                position: position
            });
        }
        return this.visit(ctx.RuleFnMultiplicationExpr);
    };
    _proto.RuleMultiplcationOperator = function RuleMultiplcationOperator(children, param) {
        return new MultiplcationOperatorAstNode({
            content: extractCstToken(children),
            position: getOrTypeCstNodePosition({
                children: children
            })
        });
    };
    _proto.RuleFnMultiplicationExpr = function RuleFnMultiplicationExpr(ctx) {
        var _this = this;
        if (ctx.RuleMultiplcationOperator) {
            var _ctx_RuleFnAtomicExpr;
            var operands = (_ctx_RuleFnAtomicExpr = ctx.RuleFnAtomicExpr) == null ? void 0 : _ctx_RuleFnAtomicExpr.map(function(item) {
                return _this.visit(item);
            });
            var position = {
                start: operands[0].position.start,
                end: operands[1].position.end
            };
            return new MutliplicationExprAstNode({
                content: {
                    operators: ctx.RuleMultiplcationOperator.map(function(item) {
                        return _this.visit(item);
                    }),
                    operands: operands
                },
                position: position
            });
        }
        return this.visit(ctx.RuleFnAtomicExpr);
    };
    _proto.RuleFnAtomicExpr = function RuleFnAtomicExpr(ctx) {
        var exprAst = defaultVisit.bind(this)(ctx);
        var position = exprAst.position;
        var sign;
        if (ctx.RuleAddOperator) {
            sign = this.visit(ctx.RuleAddOperator);
            position.start = sign.position.start;
            delete exprAst.content.RuleAddOperator;
        }
        return new FnAtomicExprAstNode({
            content: {
                sign: sign,
                RuleFnAtomicExpr: exprAst
            },
            position: position
        });
    };
    _proto.RuleFnParenthesisExpr = function RuleFnParenthesisExpr(ctx) {
        return this.visit(ctx.RuleFnAddExpr);
    };
    _proto.RuleNumber = function RuleNumber(children) {
        return new NumberAstNode({
            content: extractCstToken(children),
            position: getOrTypeCstNodePosition({
                children: children
            })
        });
    };
    _proto.RuleBoolean = function RuleBoolean(children, param) {
        var position = getOrTypeCstNodePosition({
            children: children
        });
        return new BooleanAstNode({
            content: extractCstToken(children),
            position: position
        });
    };
    _proto.RuleFnAssignLO = function RuleFnAssignLO(ctx) {
        if (ctx.RuleFnVariable) {
            return this.visit(ctx.RuleFnVariable);
        }
        var _ctx_gl_FragColor;
        var token = (_ctx_gl_FragColor = ctx.gl_FragColor) != null ? _ctx_gl_FragColor : ctx.gl_Position;
        return new AssignLoAstNode({
            content: token == null ? void 0 : token[0].image,
            position: getOrTypeCstNodePosition({
                children: ctx
            })
        });
    };
    _proto.RuleFnVariable = function RuleFnVariable(ctx) {
        var position = {
            start: getTokenPosition(ctx.Identifier[0]).start,
            end: getTokenPosition(ctx.Identifier[ctx.Identifier.length - 1]).end
        };
        return new FnVariableAstNode({
            content: ctx.Identifier.map(function(item) {
                return item.image;
            }),
            position: position
        });
    };
    _proto.RuleFnReturnStatement = function RuleFnReturnStatement(ctx) {
        var position = {
            start: getTokenPosition(ctx.return[0]).start,
            end: getTokenPosition(ctx.Semicolon[0]).end
        };
        return new FnReturnStatemtneAstNode({
            position: position,
            content: defaultVisit.bind(this)(ctx)
        });
    };
    _proto.RuleFnArg = function RuleFnArg(ctx) {
        var position = {
            start: getOrTypeCstNodePosition(ctx.RuleVariableType[0]).start,
            end: getTokenPosition(ctx.Identifier[0]).end
        };
        return new FnArgAstNode({
            position: position,
            content: {
                name: ctx.Identifier[0].image,
                type: {
                    isCustom: !!ctx.RuleVariableType[0].children.Identifier,
                    text: extractCstToken(ctx.RuleVariableType[0])
                }
            }
        });
    };
    _proto.RuleRenderStateDeclaration = function RuleRenderStateDeclaration(ctx) {
        var _this = this;
        var _ctx_RuleStatePropertyAssign;
        var properties = (_ctx_RuleStatePropertyAssign = ctx.RuleStatePropertyAssign) == null ? void 0 : _ctx_RuleStatePropertyAssign.map(function(item) {
            return _this.visit(item);
        });
        var position = {
            start: getOrTypeCstNodePosition(ctx.RuleRenderStateType[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        return new RenderStateDeclarationAstNode({
            position: position,
            content: {
                name: ctx.Identifier[0].image,
                type: extractCstToken(ctx.RuleRenderStateType[0]),
                properties: properties
            }
        });
    };
    _proto.RuleAssignableValue = function RuleAssignableValue(children, param) {
        if (children.RuleFnAddExpr) {
            return this.visit(children.RuleFnAddExpr);
        }
        var position = getOrTypeCstNodePosition({
            children: children
        });
        return new AssignableValueAstNode({
            position: position,
            content: extractCstToken(children)
        });
    };
    _proto.RuleStatePropertyAssign = function RuleStatePropertyAssign(ctx) {
        var position = {
            start: getOrTypeCstNodePosition(ctx.RuleStateProperty[0]).start,
            end: getOrTypeCstNodePosition(ctx.RuleAssignableValue[0]).end
        };
        return new StatePropertyAssignAstNode({
            position: position,
            content: {
                name: extractCstToken(ctx.RuleStateProperty[0]),
                value: this.visit(ctx.RuleAssignableValue)
            }
        });
    };
    _proto.RuleFnVariableDeclaration = function RuleFnVariableDeclaration(ctx) {
        var position = {
            start: getOrTypeCstNodePosition(ctx.RuleVariableType[0]).start,
            end: getTokenPosition(ctx.Semicolon[0]).end
        };
        return new VariableDeclarationAstNode({
            position: position,
            content: {
                type: this.visit(ctx.RuleVariableType),
                variable: ctx.Identifier[0].image,
                default: ctx.RuleFnExpression ? this.visit(ctx.RuleFnExpression) : undefined
            }
        });
    };
    _proto.RuleStruct = function RuleStruct(ctx) {
        var _this = this;
        var _ctx_RuleDeclaration;
        var variables = (_ctx_RuleDeclaration = ctx.RuleDeclaration) == null ? void 0 : _ctx_RuleDeclaration.map(function(item) {
            return _this.visit(item);
        });
        var position = {
            start: getTokenPosition(ctx.struct[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        return new StructAstNode({
            position: position,
            content: {
                name: ctx.Identifier[0].image,
                variables: variables
            }
        });
    };
    _proto.RuleVariableType = function RuleVariableType(children, param) {
        var position = getOrTypeCstNodePosition({
            children: children
        });
        return new VariableTypeAstNode({
            position: position,
            content: {
                text: extractCstToken(children),
                isCustom: !!children.Identifier
            }
        });
    };
    _proto.RuleDeclaration = function RuleDeclaration(ctx) {
        var type = this.visit(ctx.RuleVariableType);
        var position = {
            start: type.position.start,
            end: getTokenPosition(ctx.Identifier[0]).end
        };
        return new DeclarationAstNode({
            position: position,
            content: {
                type: type,
                variable: ctx.Identifier[0].image
            }
        });
    };
    _proto.SubShaderPassPropertyAssignment = function SubShaderPassPropertyAssignment(ctx) {
        var position = {
            start: getOrTypeCstNodePosition(ctx.RuleShaderPassPropertyType[0]).start,
            end: getTokenPosition(ctx.Semicolon[0]).end
        };
        return new PassPropertyAssignmentAstNode({
            position: position,
            content: {
                type: extractCstToken(ctx.RuleShaderPassPropertyType[0]),
                value: ctx.Identifier[0].image
            }
        });
    };
    _proto.RuleTag = function RuleTag(ctx) {
        var _this = this;
        var _ctx_RuleTagAssignment;
        var position = {
            start: getTokenPosition(ctx.Tags[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        return new TagAstNode({
            content: (_ctx_RuleTagAssignment = ctx.RuleTagAssignment) == null ? void 0 : _ctx_RuleTagAssignment.map(function(item) {
                return _this.visit(item);
            }),
            position: position
        });
    };
    _proto.RuleTagAssignment = function RuleTagAssignment(ctx) {
        var position = {
            start: getOrTypeCstNodePosition(ctx.RuleTagType[0]).start,
            end: getTokenPosition(ctx.ValueString[0]).end
        };
        return new TagAssignmentAstNode({
            position: position,
            content: {
                tag: extractCstToken(ctx.RuleTagType[0]),
                value: ctx.ValueString[0].image
            }
        });
    };
    _proto.RuleProperty = function RuleProperty(ctx) {
        var _this = this;
        var _ctx_RuleProteryItem;
        var position = {
            start: getTokenPosition(ctx.EditorProperties[0]).start,
            end: getTokenPosition(ctx.RCurly[0]).end
        };
        return new PropertyAstNode({
            content: (_ctx_RuleProteryItem = ctx.RuleProteryItem) == null ? void 0 : _ctx_RuleProteryItem.map(function(item) {
                return _this.visit(item);
            }),
            position: position
        });
    };
    _proto.RuleProteryItem = function RuleProteryItem(ctx) {
        var position = {
            start: getTokenPosition(ctx.Identifier[0]).start,
            end: getTokenPosition(ctx.Semicolon[0]).end
        };
        return new PropertyItemAstNode({
            position: position,
            content: {
                name: ctx.Identifier[0].image,
                desc: ctx.ValueString[0].image,
                type: extractCstToken(ctx.RulePropertyItemType[0]),
                default: this.visit(ctx.RulePropertyItemValue)
            }
        });
    };
    _proto.RulePropertyItemValue = function RulePropertyItemValue(ctx) {
        return defaultVisit.bind(this)(ctx);
    };
    _proto.TupleFloat4 = function TupleFloat4(ctx) {
        var position = {
            start: getTokenPosition(ctx.LBracket[0]).start,
            end: getTokenPosition(ctx.RBracket[0]).end
        };
        return new TupleNumber4AstNode({
            position: position,
            content: ctx.ValueFloat.map(function(n) {
                return Number(n);
            })
        });
    };
    _proto.TupleInt4 = function TupleInt4(ctx) {
        var position = {
            start: getTokenPosition(ctx.LBracket[0]).start,
            end: getTokenPosition(ctx.RBracket[0]).end
        };
        var astInfo = {
            position: position,
            content: ctx.ValueInt.map(function(n) {
                return Number(n.image);
            })
        };
        return new TupleNumber4AstNode(astInfo);
    };
    _proto.RuleRange = function RuleRange(ctx) {
        var position = {
            start: getTokenPosition(ctx.Range[0]).start,
            end: getTokenPosition(ctx.RBracket[0]).end
        };
        return new RangeAstNode({
            position: position,
            content: ctx.ValueInt.map(function(int) {
                return Number(int.image);
            })
        });
    };
    return ShaderVisitor;
}(ShaderVisitorConstructor);

function parseShader(input) {
    parser.parse(input);
    var cst = parser.RuleShader();
    if (parser.errors.length > 0) {
        console.log(parser.errors);
        throw parser.errors;
    }
    var visitor = new ShaderVisitor();
    var ast = visitor.visit(cst);
    var context = new RuntimeContext();
    var shaderInfo = context.parse(ast);
    shaderInfo.diagnostics = context.diagnostics;
    return shaderInfo;
}
var ShaderLab = /*#__PURE__*/ function() {
    function ShaderLab() {}
    var _proto = ShaderLab.prototype;
    _proto.initialize = function initialize() {
        return Promise.resolve();
    };
    _proto.parseShader = function parseShader1(shaderCode) {
        return parseShader(shaderCode);
    };
    return ShaderLab;
}();

exports.ShaderLab = ShaderLab;
exports.ShaderParser = ShaderParser;
exports.ShaderVisitor = ShaderVisitor;
exports.parseShader = parseShader;
exports.parser = parser;
//# sourceMappingURL=main.js.map
