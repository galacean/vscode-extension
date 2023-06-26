'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

var version = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
// needs a separate module as this is required inside chevrotain productive code
// and also in the entry point for webpack(api.ts).
// A separate file avoids cyclic dependencies and webpack errors.
exports.VERSION = "10.5.0";

});

/** Used for built-in method references. */
var objectProto$j = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$j;

  return value === proto;
}

var _isPrototype = isPrototype;

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

var _overArg = overArg;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = _overArg(Object.keys, Object);

var _nativeKeys = nativeKeys;

/** Used for built-in method references. */
var objectProto$i = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$g = objectProto$i.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!_isPrototype(object)) {
    return _nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$g.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

var _baseKeys = baseKeys;

/** Detect free variable `global` from Node.js. */

var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

var _freeGlobal = freeGlobal;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = _freeGlobal || freeSelf || Function('return this')();

var _root = root;

/** Built-in value references. */
var Symbol$1 = _root.Symbol;

var _Symbol = Symbol$1;

/** Used for built-in method references. */
var objectProto$h = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$f = objectProto$h.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$h.toString;

/** Built-in value references. */
var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$f.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

var _getRawTag = getRawTag;

/** Used for built-in method references. */
var objectProto$g = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$g.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

var _objectToString = objectToString;

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? _getRawTag(value)
    : _objectToString(value);
}

var _baseGetTag = baseGetTag;

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

var isObject_1 = isObject;

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag$2 = '[object Function]',
    genTag$1 = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject_1(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = _baseGetTag(value);
  return tag == funcTag$2 || tag == genTag$1 || tag == asyncTag || tag == proxyTag;
}

var isFunction_1 = isFunction;

/** Used to detect overreaching core-js shims. */
var coreJsData = _root['__core-js_shared__'];

var _coreJsData = coreJsData;

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(_coreJsData && _coreJsData.keys && _coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

var _isMasked = isMasked;

/** Used for built-in method references. */
var funcProto$1 = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString$1 = funcProto$1.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString$1.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

var _toSource = toSource;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto$f = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty$e = objectProto$f.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty$e).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject_1(value) || _isMasked(value)) {
    return false;
  }
  var pattern = isFunction_1(value) ? reIsNative : reIsHostCtor;
  return pattern.test(_toSource(value));
}

var _baseIsNative = baseIsNative;

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

var _getValue = getValue;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = _getValue(object, key);
  return _baseIsNative(value) ? value : undefined;
}

var _getNative = getNative;

/* Built-in method references that are verified to be native. */
var DataView = _getNative(_root, 'DataView');

var _DataView = DataView;

/* Built-in method references that are verified to be native. */
var Map$1 = _getNative(_root, 'Map');

var _Map = Map$1;

/* Built-in method references that are verified to be native. */
var Promise$1 = _getNative(_root, 'Promise');

var _Promise = Promise$1;

/* Built-in method references that are verified to be native. */
var Set = _getNative(_root, 'Set');

var _Set = Set;

/* Built-in method references that are verified to be native. */
var WeakMap = _getNative(_root, 'WeakMap');

var _WeakMap = WeakMap;

/** `Object#toString` result references. */
var mapTag$6 = '[object Map]',
    objectTag$3 = '[object Object]',
    promiseTag = '[object Promise]',
    setTag$6 = '[object Set]',
    weakMapTag$2 = '[object WeakMap]';

var dataViewTag$4 = '[object DataView]';

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = _toSource(_DataView),
    mapCtorString = _toSource(_Map),
    promiseCtorString = _toSource(_Promise),
    setCtorString = _toSource(_Set),
    weakMapCtorString = _toSource(_WeakMap);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = _baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((_DataView && getTag(new _DataView(new ArrayBuffer(1))) != dataViewTag$4) ||
    (_Map && getTag(new _Map) != mapTag$6) ||
    (_Promise && getTag(_Promise.resolve()) != promiseTag) ||
    (_Set && getTag(new _Set) != setTag$6) ||
    (_WeakMap && getTag(new _WeakMap) != weakMapTag$2)) {
  getTag = function(value) {
    var result = _baseGetTag(value),
        Ctor = result == objectTag$3 ? value.constructor : undefined,
        ctorString = Ctor ? _toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag$4;
        case mapCtorString: return mapTag$6;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag$6;
        case weakMapCtorString: return weakMapTag$2;
      }
    }
    return result;
  };
}

var _getTag = getTag;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

var isObjectLike_1 = isObjectLike;

/** `Object#toString` result references. */
var argsTag$3 = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike_1(value) && _baseGetTag(value) == argsTag$3;
}

var _baseIsArguments = baseIsArguments;

/** Used for built-in method references. */
var objectProto$e = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$d = objectProto$e.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable$1 = objectProto$e.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
  return isObjectLike_1(value) && hasOwnProperty$d.call(value, 'callee') &&
    !propertyIsEnumerable$1.call(value, 'callee');
};

var isArguments_1 = isArguments;

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

var isArray_1 = isArray;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$1;
}

var isLength_1 = isLength;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength_1(value.length) && !isFunction_1(value);
}

var isArrayLike_1 = isArrayLike;

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

var stubFalse_1 = stubFalse;

var isBuffer_1 = createCommonjsModule(function (module, exports) {
/** Detect free variable `exports`. */
var freeExports = exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? _root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse_1;

module.exports = isBuffer;
});

/** `Object#toString` result references. */
var argsTag$2 = '[object Arguments]',
    arrayTag$2 = '[object Array]',
    boolTag$3 = '[object Boolean]',
    dateTag$3 = '[object Date]',
    errorTag$2 = '[object Error]',
    funcTag$1 = '[object Function]',
    mapTag$5 = '[object Map]',
    numberTag$3 = '[object Number]',
    objectTag$2 = '[object Object]',
    regexpTag$4 = '[object RegExp]',
    setTag$5 = '[object Set]',
    stringTag$4 = '[object String]',
    weakMapTag$1 = '[object WeakMap]';

var arrayBufferTag$3 = '[object ArrayBuffer]',
    dataViewTag$3 = '[object DataView]',
    float32Tag$2 = '[object Float32Array]',
    float64Tag$2 = '[object Float64Array]',
    int8Tag$2 = '[object Int8Array]',
    int16Tag$2 = '[object Int16Array]',
    int32Tag$2 = '[object Int32Array]',
    uint8Tag$2 = '[object Uint8Array]',
    uint8ClampedTag$2 = '[object Uint8ClampedArray]',
    uint16Tag$2 = '[object Uint16Array]',
    uint32Tag$2 = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag$2] = typedArrayTags[float64Tag$2] =
typedArrayTags[int8Tag$2] = typedArrayTags[int16Tag$2] =
typedArrayTags[int32Tag$2] = typedArrayTags[uint8Tag$2] =
typedArrayTags[uint8ClampedTag$2] = typedArrayTags[uint16Tag$2] =
typedArrayTags[uint32Tag$2] = true;
typedArrayTags[argsTag$2] = typedArrayTags[arrayTag$2] =
typedArrayTags[arrayBufferTag$3] = typedArrayTags[boolTag$3] =
typedArrayTags[dataViewTag$3] = typedArrayTags[dateTag$3] =
typedArrayTags[errorTag$2] = typedArrayTags[funcTag$1] =
typedArrayTags[mapTag$5] = typedArrayTags[numberTag$3] =
typedArrayTags[objectTag$2] = typedArrayTags[regexpTag$4] =
typedArrayTags[setTag$5] = typedArrayTags[stringTag$4] =
typedArrayTags[weakMapTag$1] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike_1(value) &&
    isLength_1(value.length) && !!typedArrayTags[_baseGetTag(value)];
}

var _baseIsTypedArray = baseIsTypedArray;

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

var _baseUnary = baseUnary;

var _nodeUtil = createCommonjsModule(function (module, exports) {
/** Detect free variable `exports`. */
var freeExports = exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && _freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule && freeModule.require && freeModule.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

module.exports = nodeUtil;
});

/* Node.js helper references. */
var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? _baseUnary(nodeIsTypedArray) : _baseIsTypedArray;

var isTypedArray_1 = isTypedArray;

/** `Object#toString` result references. */
var mapTag$4 = '[object Map]',
    setTag$4 = '[object Set]';

/** Used for built-in method references. */
var objectProto$d = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$c = objectProto$d.hasOwnProperty;

/**
 * Checks if `value` is an empty object, collection, map, or set.
 *
 * Objects are considered empty if they have no own enumerable string keyed
 * properties.
 *
 * Array-like values such as `arguments` objects, arrays, buffers, strings, or
 * jQuery-like collections are considered empty if they have a `length` of `0`.
 * Similarly, maps and sets are considered empty if they have a `size` of `0`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is empty, else `false`.
 * @example
 *
 * _.isEmpty(null);
 * // => true
 *
 * _.isEmpty(true);
 * // => true
 *
 * _.isEmpty(1);
 * // => true
 *
 * _.isEmpty([1, 2, 3]);
 * // => false
 *
 * _.isEmpty({ 'a': 1 });
 * // => false
 */
function isEmpty(value) {
  if (value == null) {
    return true;
  }
  if (isArrayLike_1(value) &&
      (isArray_1(value) || typeof value == 'string' || typeof value.splice == 'function' ||
        isBuffer_1(value) || isTypedArray_1(value) || isArguments_1(value))) {
    return !value.length;
  }
  var tag = _getTag(value);
  if (tag == mapTag$4 || tag == setTag$4) {
    return !value.size;
  }
  if (_isPrototype(value)) {
    return !_baseKeys(value).length;
  }
  for (var key in value) {
    if (hasOwnProperty$c.call(value, key)) {
      return false;
    }
  }
  return true;
}

var isEmpty_1 = isEmpty;

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

var _arrayMap = arrayMap;

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

var _listCacheClear = listCacheClear;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

var eq_1 = eq;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq_1(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

var _assocIndexOf = assocIndexOf;

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

var _listCacheDelete = listCacheDelete;

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

var _listCacheGet = listCacheGet;

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return _assocIndexOf(this.__data__, key) > -1;
}

var _listCacheHas = listCacheHas;

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = _assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

var _listCacheSet = listCacheSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = _listCacheClear;
ListCache.prototype['delete'] = _listCacheDelete;
ListCache.prototype.get = _listCacheGet;
ListCache.prototype.has = _listCacheHas;
ListCache.prototype.set = _listCacheSet;

var _ListCache = ListCache;

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new _ListCache;
  this.size = 0;
}

var _stackClear = stackClear;

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

var _stackDelete = stackDelete;

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

var _stackGet = stackGet;

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

var _stackHas = stackHas;

/* Built-in method references that are verified to be native. */
var nativeCreate = _getNative(Object, 'create');

var _nativeCreate = nativeCreate;

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = _nativeCreate ? _nativeCreate(null) : {};
  this.size = 0;
}

var _hashClear = hashClear;

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

var _hashDelete = hashDelete;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$2 = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto$c = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$b = objectProto$c.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (_nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED$2 ? undefined : result;
  }
  return hasOwnProperty$b.call(data, key) ? data[key] : undefined;
}

var _hashGet = hashGet;

/** Used for built-in method references. */
var objectProto$b = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$a = objectProto$b.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return _nativeCreate ? (data[key] !== undefined) : hasOwnProperty$a.call(data, key);
}

var _hashHas = hashHas;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (_nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
  return this;
}

var _hashSet = hashSet;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = _hashClear;
Hash.prototype['delete'] = _hashDelete;
Hash.prototype.get = _hashGet;
Hash.prototype.has = _hashHas;
Hash.prototype.set = _hashSet;

var _Hash = Hash;

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new _Hash,
    'map': new (_Map || _ListCache),
    'string': new _Hash
  };
}

var _mapCacheClear = mapCacheClear;

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

var _isKeyable = isKeyable;

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return _isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

var _getMapData = getMapData;

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = _getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

var _mapCacheDelete = mapCacheDelete;

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return _getMapData(this, key).get(key);
}

var _mapCacheGet = mapCacheGet;

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return _getMapData(this, key).has(key);
}

var _mapCacheHas = mapCacheHas;

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = _getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

var _mapCacheSet = mapCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = _mapCacheClear;
MapCache.prototype['delete'] = _mapCacheDelete;
MapCache.prototype.get = _mapCacheGet;
MapCache.prototype.has = _mapCacheHas;
MapCache.prototype.set = _mapCacheSet;

var _MapCache = MapCache;

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE$2 = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof _ListCache) {
    var pairs = data.__data__;
    if (!_Map || (pairs.length < LARGE_ARRAY_SIZE$2 - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new _MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

var _stackSet = stackSet;

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new _ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = _stackClear;
Stack.prototype['delete'] = _stackDelete;
Stack.prototype.get = _stackGet;
Stack.prototype.has = _stackHas;
Stack.prototype.set = _stackSet;

var _Stack = Stack;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

var _setCacheAdd = setCacheAdd;

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

var _setCacheHas = setCacheHas;

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new _MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = _setCacheAdd;
SetCache.prototype.has = _setCacheHas;

var _SetCache = SetCache;

/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

var _arraySome = arraySome;

/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

var _cacheHas = cacheHas;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$5 = 1,
    COMPARE_UNORDERED_FLAG$3 = 2;

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Check that cyclic values are equal.
  var arrStacked = stack.get(array);
  var othStacked = stack.get(other);
  if (arrStacked && othStacked) {
    return arrStacked == other && othStacked == array;
  }
  var index = -1,
      result = true,
      seen = (bitmask & COMPARE_UNORDERED_FLAG$3) ? new _SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!_arraySome(other, function(othValue, othIndex) {
            if (!_cacheHas(seen, othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, bitmask, customizer, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

var _equalArrays = equalArrays;

/** Built-in value references. */
var Uint8Array = _root.Uint8Array;

var _Uint8Array = Uint8Array;

/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

var _mapToArray = mapToArray;

/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

var _setToArray = setToArray;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$4 = 1,
    COMPARE_UNORDERED_FLAG$2 = 2;

/** `Object#toString` result references. */
var boolTag$2 = '[object Boolean]',
    dateTag$2 = '[object Date]',
    errorTag$1 = '[object Error]',
    mapTag$3 = '[object Map]',
    numberTag$2 = '[object Number]',
    regexpTag$3 = '[object RegExp]',
    setTag$3 = '[object Set]',
    stringTag$3 = '[object String]',
    symbolTag$3 = '[object Symbol]';

var arrayBufferTag$2 = '[object ArrayBuffer]',
    dataViewTag$2 = '[object DataView]';

/** Used to convert symbols to primitives and strings. */
var symbolProto$2 = _Symbol ? _Symbol.prototype : undefined,
    symbolValueOf$1 = symbolProto$2 ? symbolProto$2.valueOf : undefined;

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag$2:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag$2:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new _Uint8Array(object), new _Uint8Array(other))) {
        return false;
      }
      return true;

    case boolTag$2:
    case dateTag$2:
    case numberTag$2:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return eq_1(+object, +other);

    case errorTag$1:
      return object.name == other.name && object.message == other.message;

    case regexpTag$3:
    case stringTag$3:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag$3:
      var convert = _mapToArray;

    case setTag$3:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
      convert || (convert = _setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG$2;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = _equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack['delete'](object);
      return result;

    case symbolTag$3:
      if (symbolValueOf$1) {
        return symbolValueOf$1.call(object) == symbolValueOf$1.call(other);
      }
  }
  return false;
}

var _equalByTag = equalByTag;

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

var _arrayPush = arrayPush;

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray_1(object) ? result : _arrayPush(result, symbolsFunc(object));
}

var _baseGetAllKeys = baseGetAllKeys;

/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

var _arrayFilter = arrayFilter;

/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

var stubArray_1 = stubArray;

/** Used for built-in method references. */
var objectProto$a = Object.prototype;

/** Built-in value references. */
var propertyIsEnumerable = objectProto$a.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols$1 = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols$1 ? stubArray_1 : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return _arrayFilter(nativeGetSymbols$1(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

var _getSymbols = getSymbols;

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

var _baseTimes = baseTimes;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

var _isIndex = isIndex;

/** Used for built-in method references. */
var objectProto$9 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$9 = objectProto$9.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray_1(value),
      isArg = !isArr && isArguments_1(value),
      isBuff = !isArr && !isArg && isBuffer_1(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray_1(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? _baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$9.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           _isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

var _arrayLikeKeys = arrayLikeKeys;

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys$1(object) {
  return isArrayLike_1(object) ? _arrayLikeKeys(object) : _baseKeys(object);
}

var keys_1 = keys$1;

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return _baseGetAllKeys(object, keys_1, _getSymbols);
}

var _getAllKeys = getAllKeys;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$3 = 1;

/** Used for built-in method references. */
var objectProto$8 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$8 = objectProto$8.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3,
      objProps = _getAllKeys(object),
      objLength = objProps.length,
      othProps = _getAllKeys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty$8.call(other, key))) {
      return false;
    }
  }
  // Check that cyclic values are equal.
  var objStacked = stack.get(object);
  var othStacked = stack.get(other);
  if (objStacked && othStacked) {
    return objStacked == other && othStacked == object;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

var _equalObjects = equalObjects;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$2 = 1;

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]',
    arrayTag$1 = '[object Array]',
    objectTag$1 = '[object Object]';

/** Used for built-in method references. */
var objectProto$7 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$7 = objectProto$7.hasOwnProperty;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray_1(object),
      othIsArr = isArray_1(other),
      objTag = objIsArr ? arrayTag$1 : _getTag(object),
      othTag = othIsArr ? arrayTag$1 : _getTag(other);

  objTag = objTag == argsTag$1 ? objectTag$1 : objTag;
  othTag = othTag == argsTag$1 ? objectTag$1 : othTag;

  var objIsObj = objTag == objectTag$1,
      othIsObj = othTag == objectTag$1,
      isSameTag = objTag == othTag;

  if (isSameTag && isBuffer_1(object)) {
    if (!isBuffer_1(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new _Stack);
    return (objIsArr || isTypedArray_1(object))
      ? _equalArrays(object, other, bitmask, customizer, equalFunc, stack)
      : _equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
    var objIsWrapped = objIsObj && hasOwnProperty$7.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty$7.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new _Stack);
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new _Stack);
  return _equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}

var _baseIsEqualDeep = baseIsEqualDeep;

/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Unordered comparison
 *  2 - Partial comparison
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObjectLike_1(value) && !isObjectLike_1(other))) {
    return value !== value && other !== other;
  }
  return _baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
}

var _baseIsEqual = baseIsEqual;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG$1 = 1,
    COMPARE_UNORDERED_FLAG$1 = 2;

/**
 * The base implementation of `_.isMatch` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Object} source The object of property values to match.
 * @param {Array} matchData The property names, values, and compare flags to match.
 * @param {Function} [customizer] The function to customize comparisons.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, source, matchData, customizer) {
  var index = matchData.length,
      length = index,
      noCustomizer = !customizer;

  if (object == null) {
    return !length;
  }
  object = Object(object);
  while (index--) {
    var data = matchData[index];
    if ((noCustomizer && data[2])
          ? data[1] !== object[data[0]]
          : !(data[0] in object)
        ) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0],
        objValue = object[key],
        srcValue = data[1];

    if (noCustomizer && data[2]) {
      if (objValue === undefined && !(key in object)) {
        return false;
      }
    } else {
      var stack = new _Stack;
      if (customizer) {
        var result = customizer(objValue, srcValue, key, object, source, stack);
      }
      if (!(result === undefined
            ? _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack)
            : result
          )) {
        return false;
      }
    }
  }
  return true;
}

var _baseIsMatch = baseIsMatch;

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject_1(value);
}

var _isStrictComparable = isStrictComparable;

/**
 * Gets the property names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = keys_1(object),
      length = result.length;

  while (length--) {
    var key = result[length],
        value = object[key];

    result[length] = [key, value, _isStrictComparable(value)];
  }
  return result;
}

var _getMatchData = getMatchData;

/**
 * A specialized version of `matchesProperty` for source values suitable
 * for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function matchesStrictComparable(key, srcValue) {
  return function(object) {
    if (object == null) {
      return false;
    }
    return object[key] === srcValue &&
      (srcValue !== undefined || (key in Object(object)));
  };
}

var _matchesStrictComparable = matchesStrictComparable;

/**
 * The base implementation of `_.matches` which doesn't clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatches(source) {
  var matchData = _getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return _matchesStrictComparable(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || _baseIsMatch(object, source, matchData);
  };
}

var _baseMatches = baseMatches;

/** `Object#toString` result references. */
var symbolTag$2 = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike_1(value) && _baseGetTag(value) == symbolTag$2);
}

var isSymbol_1 = isSymbol;

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray_1(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol_1(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

var _isKey = isKey;

/** Error message constants. */
var FUNC_ERROR_TEXT$1 = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `clear`, `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT$1);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || _MapCache);
  return memoized;
}

// Expose `MapCache`.
memoize.Cache = _MapCache;

var memoize_1 = memoize;

/** Used as the maximum memoize cache size. */
var MAX_MEMOIZE_SIZE = 500;

/**
 * A specialized version of `_.memoize` which clears the memoized function's
 * cache when it exceeds `MAX_MEMOIZE_SIZE`.
 *
 * @private
 * @param {Function} func The function to have its output memoized.
 * @returns {Function} Returns the new memoized function.
 */
function memoizeCapped(func) {
  var result = memoize_1(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });

  var cache = result.cache;
  return result;
}

var _memoizeCapped = memoizeCapped;

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = _memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

var _stringToPath = stringToPath;

/** Used as references for various `Number` constants. */
var INFINITY$3 = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto$1 = _Symbol ? _Symbol.prototype : undefined,
    symbolToString = symbolProto$1 ? symbolProto$1.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray_1(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return _arrayMap(value, baseToString) + '';
  }
  if (isSymbol_1(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY$3) ? '-0' : result;
}

var _baseToString = baseToString;

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : _baseToString(value);
}

var toString_1 = toString;

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray_1(value)) {
    return value;
  }
  return _isKey(value, object) ? [value] : _stringToPath(toString_1(value));
}

var _castPath = castPath;

/** Used as references for various `Number` constants. */
var INFINITY$2 = 1 / 0;

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol_1(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY$2) ? '-0' : result;
}

var _toKey = toKey;

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = _castPath(path, object);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[_toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

var _baseGet = baseGet;

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : _baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

var get_1 = get;

/**
 * The base implementation of `_.hasIn` without support for deep paths.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {Array|string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
function baseHasIn(object, key) {
  return object != null && key in Object(object);
}

var _baseHasIn = baseHasIn;

/**
 * Checks if `path` exists on `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @param {Function} hasFunc The function to check properties.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 */
function hasPath(object, path, hasFunc) {
  path = _castPath(path, object);

  var index = -1,
      length = path.length,
      result = false;

  while (++index < length) {
    var key = _toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && isLength_1(length) && _isIndex(key, length) &&
    (isArray_1(object) || isArguments_1(object));
}

var _hasPath = hasPath;

/**
 * Checks if `path` is a direct or inherited property of `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 * @example
 *
 * var object = _.create({ 'a': _.create({ 'b': 2 }) });
 *
 * _.hasIn(object, 'a');
 * // => true
 *
 * _.hasIn(object, 'a.b');
 * // => true
 *
 * _.hasIn(object, ['a', 'b']);
 * // => true
 *
 * _.hasIn(object, 'b');
 * // => false
 */
function hasIn(object, path) {
  return object != null && _hasPath(object, path, _baseHasIn);
}

var hasIn_1 = hasIn;

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatchesProperty(path, srcValue) {
  if (_isKey(path) && _isStrictComparable(srcValue)) {
    return _matchesStrictComparable(_toKey(path), srcValue);
  }
  return function(object) {
    var objValue = get_1(object, path);
    return (objValue === undefined && objValue === srcValue)
      ? hasIn_1(object, path)
      : _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}

var _baseMatchesProperty = baseMatchesProperty;

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

var identity_1 = identity;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

var _baseProperty = baseProperty;

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyDeep(path) {
  return function(object) {
    return _baseGet(object, path);
  };
}

var _basePropertyDeep = basePropertyDeep;

/**
 * Creates a function that returns the value at `path` of a given object.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': 2 } },
 *   { 'a': { 'b': 1 } }
 * ];
 *
 * _.map(objects, _.property('a.b'));
 * // => [2, 1]
 *
 * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
 * // => [1, 2]
 */
function property(path) {
  return _isKey(path) ? _baseProperty(_toKey(path)) : _basePropertyDeep(path);
}

var property_1 = property;

/**
 * The base implementation of `_.iteratee`.
 *
 * @private
 * @param {*} [value=_.identity] The value to convert to an iteratee.
 * @returns {Function} Returns the iteratee.
 */
function baseIteratee(value) {
  // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
  // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
  if (typeof value == 'function') {
    return value;
  }
  if (value == null) {
    return identity_1;
  }
  if (typeof value == 'object') {
    return isArray_1(value)
      ? _baseMatchesProperty(value[0], value[1])
      : _baseMatches(value);
  }
  return property_1(value);
}

var _baseIteratee = baseIteratee;

/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

var _createBaseFor = createBaseFor;

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = _createBaseFor();

var _baseFor = baseFor;

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && _baseFor(object, iteratee, keys_1);
}

var _baseForOwn = baseForOwn;

/**
 * Creates a `baseEach` or `baseEachRight` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    if (collection == null) {
      return collection;
    }
    if (!isArrayLike_1(collection)) {
      return eachFunc(collection, iteratee);
    }
    var length = collection.length,
        index = fromRight ? length : -1,
        iterable = Object(collection);

    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}

var _createBaseEach = createBaseEach;

/**
 * The base implementation of `_.forEach` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object} Returns `collection`.
 */
var baseEach = _createBaseEach(_baseForOwn);

var _baseEach = baseEach;

/**
 * The base implementation of `_.map` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function baseMap(collection, iteratee) {
  var index = -1,
      result = isArrayLike_1(collection) ? Array(collection.length) : [];

  _baseEach(collection, function(value, key, collection) {
    result[++index] = iteratee(value, key, collection);
  });
  return result;
}

var _baseMap = baseMap;

/**
 * Creates an array of values by running each element in `collection` thru
 * `iteratee`. The iteratee is invoked with three arguments:
 * (value, index|key, collection).
 *
 * Many lodash methods are guarded to work as iteratees for methods like
 * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
 *
 * The guarded methods are:
 * `ary`, `chunk`, `curry`, `curryRight`, `drop`, `dropRight`, `every`,
 * `fill`, `invert`, `parseInt`, `random`, `range`, `rangeRight`, `repeat`,
 * `sampleSize`, `slice`, `some`, `sortBy`, `split`, `take`, `takeRight`,
 * `template`, `trim`, `trimEnd`, `trimStart`, and `words`
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 * @example
 *
 * function square(n) {
 *   return n * n;
 * }
 *
 * _.map([4, 8], square);
 * // => [16, 64]
 *
 * _.map({ 'a': 4, 'b': 8 }, square);
 * // => [16, 64] (iteration order is not guaranteed)
 *
 * var users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * // The `_.property` iteratee shorthand.
 * _.map(users, 'user');
 * // => ['barney', 'fred']
 */
function map(collection, iteratee) {
  var func = isArray_1(collection) ? _arrayMap : _baseMap;
  return func(collection, _baseIteratee(iteratee));
}

var map_1 = map;

/**
 * A specialized version of `_.forEach` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

var _arrayEach = arrayEach;

/**
 * Casts `value` to `identity` if it's not a function.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Function} Returns cast function.
 */
function castFunction(value) {
  return typeof value == 'function' ? value : identity_1;
}

var _castFunction = castFunction;

/**
 * Iterates over elements of `collection` and invokes `iteratee` for each element.
 * The iteratee is invoked with three arguments: (value, index|key, collection).
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * **Note:** As with other "Collections" methods, objects with a "length"
 * property are iterated like arrays. To avoid this behavior use `_.forIn`
 * or `_.forOwn` for object iteration.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @alias each
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @returns {Array|Object} Returns `collection`.
 * @see _.forEachRight
 * @example
 *
 * _.forEach([1, 2], function(value) {
 *   console.log(value);
 * });
 * // => Logs `1` then `2`.
 *
 * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
 *   console.log(key);
 * });
 * // => Logs 'a' then 'b' (iteration order is not guaranteed).
 */
function forEach(collection, iteratee) {
  var func = isArray_1(collection) ? _arrayEach : _baseEach;
  return func(collection, _castFunction(iteratee));
}

var forEach_1 = forEach;

/**
 * The base implementation of `_.values` and `_.valuesIn` which creates an
 * array of `object` property values corresponding to the property names
 * of `props`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} props The property names to get values for.
 * @returns {Object} Returns the array of property values.
 */
function baseValues(object, props) {
  return _arrayMap(props, function(key) {
    return object[key];
  });
}

var _baseValues = baseValues;

/**
 * Creates an array of the own enumerable string keyed property values of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property values.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.values(new Foo);
 * // => [1, 2] (iteration order is not guaranteed)
 *
 * _.values('hi');
 * // => ['h', 'i']
 */
function values(object) {
  return object == null ? [] : _baseValues(object, keys_1(object));
}

var values_1 = values;

/** Used for built-in method references. */
var objectProto$6 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$6 = objectProto$6.hasOwnProperty;

/**
 * The base implementation of `_.has` without support for deep paths.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {Array|string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
function baseHas(object, key) {
  return object != null && hasOwnProperty$6.call(object, key);
}

var _baseHas = baseHas;

/**
 * Checks if `path` is a direct property of `object`.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 * @example
 *
 * var object = { 'a': { 'b': 2 } };
 * var other = _.create({ 'a': _.create({ 'b': 2 }) });
 *
 * _.has(object, 'a');
 * // => true
 *
 * _.has(object, 'a.b');
 * // => true
 *
 * _.has(object, ['a', 'b']);
 * // => true
 *
 * _.has(other, 'a');
 * // => false
 */
function has(object, path) {
  return object != null && _hasPath(object, path, _baseHas);
}

var has_1 = has;

var defineProperty = (function() {
  try {
    var func = _getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

var _defineProperty = defineProperty;

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && _defineProperty) {
    _defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

var _baseAssignValue = baseAssignValue;

/** Used for built-in method references. */
var objectProto$5 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$5 = objectProto$5.hasOwnProperty;

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty$5.call(object, key) && eq_1(objValue, value)) ||
      (value === undefined && !(key in object))) {
    _baseAssignValue(object, key, value);
  }
}

var _assignValue = assignValue;

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    if (newValue === undefined) {
      newValue = source[key];
    }
    if (isNew) {
      _baseAssignValue(object, key, newValue);
    } else {
      _assignValue(object, key, newValue);
    }
  }
  return object;
}

var _copyObject = copyObject;

/**
 * The base implementation of `_.assign` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return object && _copyObject(source, keys_1(source), object);
}

var _baseAssign = baseAssign;

/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

var _nativeKeysIn = nativeKeysIn;

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$4 = objectProto$4.hasOwnProperty;

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject_1(object)) {
    return _nativeKeysIn(object);
  }
  var isProto = _isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty$4.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

var _baseKeysIn = baseKeysIn;

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike_1(object) ? _arrayLikeKeys(object, true) : _baseKeysIn(object);
}

var keysIn_1 = keysIn;

/**
 * The base implementation of `_.assignIn` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssignIn(object, source) {
  return object && _copyObject(source, keysIn_1(source), object);
}

var _baseAssignIn = baseAssignIn;

var _cloneBuffer = createCommonjsModule(function (module, exports) {
/** Detect free variable `exports`. */
var freeExports = exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? _root.Buffer : undefined,
    allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

/**
 * Creates a clone of  `buffer`.
 *
 * @private
 * @param {Buffer} buffer The buffer to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Buffer} Returns the cloned buffer.
 */
function cloneBuffer(buffer, isDeep) {
  if (isDeep) {
    return buffer.slice();
  }
  var length = buffer.length,
      result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

  buffer.copy(result);
  return result;
}

module.exports = cloneBuffer;
});

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

var _copyArray = copyArray;

/**
 * Copies own symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbols(source, object) {
  return _copyObject(source, _getSymbols(source), object);
}

var _copySymbols = copySymbols;

/** Built-in value references. */
var getPrototype = _overArg(Object.getPrototypeOf, Object);

var _getPrototype = getPrototype;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own and inherited enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbolsIn = !nativeGetSymbols ? stubArray_1 : function(object) {
  var result = [];
  while (object) {
    _arrayPush(result, _getSymbols(object));
    object = _getPrototype(object);
  }
  return result;
};

var _getSymbolsIn = getSymbolsIn;

/**
 * Copies own and inherited symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbolsIn(source, object) {
  return _copyObject(source, _getSymbolsIn(source), object);
}

var _copySymbolsIn = copySymbolsIn;

/**
 * Creates an array of own and inherited enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeysIn(object) {
  return _baseGetAllKeys(object, keysIn_1, _getSymbolsIn);
}

var _getAllKeysIn = getAllKeysIn;

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$3.hasOwnProperty;

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty$3.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

var _initCloneArray = initCloneArray;

/**
 * Creates a clone of `arrayBuffer`.
 *
 * @private
 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new _Uint8Array(result).set(new _Uint8Array(arrayBuffer));
  return result;
}

var _cloneArrayBuffer = cloneArrayBuffer;

/**
 * Creates a clone of `dataView`.
 *
 * @private
 * @param {Object} dataView The data view to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned data view.
 */
function cloneDataView(dataView, isDeep) {
  var buffer = isDeep ? _cloneArrayBuffer(dataView.buffer) : dataView.buffer;
  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
}

var _cloneDataView = cloneDataView;

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/**
 * Creates a clone of `regexp`.
 *
 * @private
 * @param {Object} regexp The regexp to clone.
 * @returns {Object} Returns the cloned regexp.
 */
function cloneRegExp(regexp) {
  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
  result.lastIndex = regexp.lastIndex;
  return result;
}

var _cloneRegExp = cloneRegExp;

/** Used to convert symbols to primitives and strings. */
var symbolProto = _Symbol ? _Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * Creates a clone of the `symbol` object.
 *
 * @private
 * @param {Object} symbol The symbol object to clone.
 * @returns {Object} Returns the cloned symbol object.
 */
function cloneSymbol(symbol) {
  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
}

var _cloneSymbol = cloneSymbol;

/**
 * Creates a clone of `typedArray`.
 *
 * @private
 * @param {Object} typedArray The typed array to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned typed array.
 */
function cloneTypedArray(typedArray, isDeep) {
  var buffer = isDeep ? _cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}

var _cloneTypedArray = cloneTypedArray;

/** `Object#toString` result references. */
var boolTag$1 = '[object Boolean]',
    dateTag$1 = '[object Date]',
    mapTag$2 = '[object Map]',
    numberTag$1 = '[object Number]',
    regexpTag$2 = '[object RegExp]',
    setTag$2 = '[object Set]',
    stringTag$2 = '[object String]',
    symbolTag$1 = '[object Symbol]';

var arrayBufferTag$1 = '[object ArrayBuffer]',
    dataViewTag$1 = '[object DataView]',
    float32Tag$1 = '[object Float32Array]',
    float64Tag$1 = '[object Float64Array]',
    int8Tag$1 = '[object Int8Array]',
    int16Tag$1 = '[object Int16Array]',
    int32Tag$1 = '[object Int32Array]',
    uint8Tag$1 = '[object Uint8Array]',
    uint8ClampedTag$1 = '[object Uint8ClampedArray]',
    uint16Tag$1 = '[object Uint16Array]',
    uint32Tag$1 = '[object Uint32Array]';

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag$1:
      return _cloneArrayBuffer(object);

    case boolTag$1:
    case dateTag$1:
      return new Ctor(+object);

    case dataViewTag$1:
      return _cloneDataView(object, isDeep);

    case float32Tag$1: case float64Tag$1:
    case int8Tag$1: case int16Tag$1: case int32Tag$1:
    case uint8Tag$1: case uint8ClampedTag$1: case uint16Tag$1: case uint32Tag$1:
      return _cloneTypedArray(object, isDeep);

    case mapTag$2:
      return new Ctor;

    case numberTag$1:
    case stringTag$2:
      return new Ctor(object);

    case regexpTag$2:
      return _cloneRegExp(object);

    case setTag$2:
      return new Ctor;

    case symbolTag$1:
      return _cloneSymbol(object);
  }
}

var _initCloneByTag = initCloneByTag;

/** Built-in value references. */
var objectCreate = Object.create;

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} proto The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(proto) {
    if (!isObject_1(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object;
    object.prototype = undefined;
    return result;
  };
}());

var _baseCreate = baseCreate;

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !_isPrototype(object))
    ? _baseCreate(_getPrototype(object))
    : {};
}

var _initCloneObject = initCloneObject;

/** `Object#toString` result references. */
var mapTag$1 = '[object Map]';

/**
 * The base implementation of `_.isMap` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 */
function baseIsMap(value) {
  return isObjectLike_1(value) && _getTag(value) == mapTag$1;
}

var _baseIsMap = baseIsMap;

/* Node.js helper references. */
var nodeIsMap = _nodeUtil && _nodeUtil.isMap;

/**
 * Checks if `value` is classified as a `Map` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 * @example
 *
 * _.isMap(new Map);
 * // => true
 *
 * _.isMap(new WeakMap);
 * // => false
 */
var isMap = nodeIsMap ? _baseUnary(nodeIsMap) : _baseIsMap;

var isMap_1 = isMap;

/** `Object#toString` result references. */
var setTag$1 = '[object Set]';

/**
 * The base implementation of `_.isSet` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 */
function baseIsSet(value) {
  return isObjectLike_1(value) && _getTag(value) == setTag$1;
}

var _baseIsSet = baseIsSet;

/* Node.js helper references. */
var nodeIsSet = _nodeUtil && _nodeUtil.isSet;

/**
 * Checks if `value` is classified as a `Set` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 * @example
 *
 * _.isSet(new Set);
 * // => true
 *
 * _.isSet(new WeakSet);
 * // => false
 */
var isSet = nodeIsSet ? _baseUnary(nodeIsSet) : _baseIsSet;

var isSet_1 = isSet;

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG = 1,
    CLONE_FLAT_FLAG = 2,
    CLONE_SYMBOLS_FLAG$1 = 4;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag$1 = '[object RegExp]',
    setTag = '[object Set]',
    stringTag$1 = '[object String]',
    symbolTag = '[object Symbol]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
cloneableTags[boolTag] = cloneableTags[dateTag] =
cloneableTags[float32Tag] = cloneableTags[float64Tag] =
cloneableTags[int8Tag] = cloneableTags[int16Tag] =
cloneableTags[int32Tag] = cloneableTags[mapTag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag$1] = cloneableTags[setTag] =
cloneableTags[stringTag$1] = cloneableTags[symbolTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[weakMapTag] = false;

/**
 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
 * traversed objects.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Deep clone
 *  2 - Flatten inherited properties
 *  4 - Clone symbols
 * @param {Function} [customizer] The function to customize cloning.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The parent object of `value`.
 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, bitmask, customizer, key, object, stack) {
  var result,
      isDeep = bitmask & CLONE_DEEP_FLAG,
      isFlat = bitmask & CLONE_FLAT_FLAG,
      isFull = bitmask & CLONE_SYMBOLS_FLAG$1;

  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject_1(value)) {
    return value;
  }
  var isArr = isArray_1(value);
  if (isArr) {
    result = _initCloneArray(value);
    if (!isDeep) {
      return _copyArray(value, result);
    }
  } else {
    var tag = _getTag(value),
        isFunc = tag == funcTag || tag == genTag;

    if (isBuffer_1(value)) {
      return _cloneBuffer(value, isDeep);
    }
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = (isFlat || isFunc) ? {} : _initCloneObject(value);
      if (!isDeep) {
        return isFlat
          ? _copySymbolsIn(value, _baseAssignIn(result, value))
          : _copySymbols(value, _baseAssign(result, value));
      }
    } else {
      if (!cloneableTags[tag]) {
        return object ? value : {};
      }
      result = _initCloneByTag(value, tag, isDeep);
    }
  }
  // Check for circular references and return its corresponding clone.
  stack || (stack = new _Stack);
  var stacked = stack.get(value);
  if (stacked) {
    return stacked;
  }
  stack.set(value, result);

  if (isSet_1(value)) {
    value.forEach(function(subValue) {
      result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
    });
  } else if (isMap_1(value)) {
    value.forEach(function(subValue, key) {
      result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack));
    });
  }

  var keysFunc = isFull
    ? (isFlat ? _getAllKeysIn : _getAllKeys)
    : (isFlat ? keysIn_1 : keys_1);

  var props = isArr ? undefined : keysFunc(value);
  _arrayEach(props || value, function(subValue, key) {
    if (props) {
      key = subValue;
      subValue = value[key];
    }
    // Recursively populate clone (susceptible to call stack limits).
    _assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack));
  });
  return result;
}

var _baseClone = baseClone;

/** Used to compose bitmasks for cloning. */
var CLONE_SYMBOLS_FLAG = 4;

/**
 * Creates a shallow clone of `value`.
 *
 * **Note:** This method is loosely based on the
 * [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
 * and supports cloning arrays, array buffers, booleans, date objects, maps,
 * numbers, `Object` objects, regexes, sets, strings, symbols, and typed
 * arrays. The own enumerable properties of `arguments` objects are cloned
 * as plain objects. An empty object is returned for uncloneable values such
 * as error objects, functions, DOM nodes, and WeakMaps.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to clone.
 * @returns {*} Returns the cloned value.
 * @see _.cloneDeep
 * @example
 *
 * var objects = [{ 'a': 1 }, { 'b': 2 }];
 *
 * var shallow = _.clone(objects);
 * console.log(shallow[0] === objects[0]);
 * // => true
 */
function clone(value) {
  return _baseClone(value, CLONE_SYMBOLS_FLAG);
}

var clone_1 = clone;

var print = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRINT_WARNING = exports.PRINT_ERROR = void 0;
function PRINT_ERROR(msg) {
    /* istanbul ignore else - can't override global.console in node.js */
    if (console && console.error) {
        console.error("Error: ".concat(msg));
    }
}
exports.PRINT_ERROR = PRINT_ERROR;
function PRINT_WARNING(msg) {
    /* istanbul ignore else - can't override global.console in node.js*/
    if (console && console.warn) {
        // TODO: modify docs accordingly
        console.warn("Warning: ".concat(msg));
    }
}
exports.PRINT_WARNING = PRINT_WARNING;

});

var timer_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.timer = void 0;
function timer(func) {
    var start = new Date().getTime();
    var val = func();
    var end = new Date().getTime();
    var total = end - start;
    return { time: total, value: val };
}
exports.timer = timer;

});

var toFastProperties_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFastProperties = void 0;
// based on: https://github.com/petkaantonov/bluebird/blob/b97c0d2d487e8c5076e8bd897e0dcd4622d31846/src/util.js#L201-L216
function toFastProperties(toBecomeFast) {
    function FakeConstructor() { }
    // If our object is used as a constructor it would receive
    FakeConstructor.prototype = toBecomeFast;
    var fakeInstance = new FakeConstructor();
    function fakeAccess() {
        return typeof fakeInstance.bar;
    }
    // help V8 understand this is a "real" prototype by actually using
    // the fake instance.
    fakeAccess();
    fakeAccess();
    // Always true condition to suppress the Firefox warning of unreachable
    // code after a return statement.
    return toBecomeFast;
}
exports.toFastProperties = toFastProperties;

});

var api$3 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFastProperties = exports.timer = exports.PRINT_ERROR = exports.PRINT_WARNING = void 0;

Object.defineProperty(exports, "PRINT_WARNING", { enumerable: true, get: function () { return print.PRINT_WARNING; } });
Object.defineProperty(exports, "PRINT_ERROR", { enumerable: true, get: function () { return print.PRINT_ERROR; } });

Object.defineProperty(exports, "timer", { enumerable: true, get: function () { return timer_1.timer; } });

Object.defineProperty(exports, "toFastProperties", { enumerable: true, get: function () { return toFastProperties_1.toFastProperties; } });

});

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

var _baseSlice = baseSlice;

/** Used to match a single whitespace character. */
var reWhitespace = /\s/;

/**
 * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
 * character of `string`.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {number} Returns the index of the last non-whitespace character.
 */
function trimmedEndIndex(string) {
  var index = string.length;

  while (index-- && reWhitespace.test(string.charAt(index))) {}
  return index;
}

var _trimmedEndIndex = trimmedEndIndex;

/** Used to match leading whitespace. */
var reTrimStart = /^\s+/;

/**
 * The base implementation of `_.trim`.
 *
 * @private
 * @param {string} string The string to trim.
 * @returns {string} Returns the trimmed string.
 */
function baseTrim(string) {
  return string
    ? string.slice(0, _trimmedEndIndex(string) + 1).replace(reTrimStart, '')
    : string;
}

var _baseTrim = baseTrim;

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol_1(value)) {
    return NAN;
  }
  if (isObject_1(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject_1(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = _baseTrim(value);
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

var toNumber_1 = toNumber;

/** Used as references for various `Number` constants. */
var INFINITY$1 = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308;

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber_1(value);
  if (value === INFINITY$1 || value === -INFINITY$1) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

var toFinite_1 = toFinite;

/**
 * Converts `value` to an integer.
 *
 * **Note:** This method is loosely based on
 * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3.2);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3.2');
 * // => 3
 */
function toInteger(value) {
  var result = toFinite_1(value),
      remainder = result % 1;

  return result === result ? (remainder ? result - remainder : result) : 0;
}

var toInteger_1 = toInteger;

/**
 * Creates a slice of `array` with `n` elements dropped from the beginning.
 *
 * @static
 * @memberOf _
 * @since 0.5.0
 * @category Array
 * @param {Array} array The array to query.
 * @param {number} [n=1] The number of elements to drop.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {Array} Returns the slice of `array`.
 * @example
 *
 * _.drop([1, 2, 3]);
 * // => [2, 3]
 *
 * _.drop([1, 2, 3], 2);
 * // => [3]
 *
 * _.drop([1, 2, 3], 5);
 * // => []
 *
 * _.drop([1, 2, 3], 0);
 * // => [1, 2, 3]
 */
function drop(array, n, guard) {
  var length = array == null ? 0 : array.length;
  if (!length) {
    return [];
  }
  n = (guard || n === undefined) ? 1 : toInteger_1(n);
  return _baseSlice(array, n < 0 ? 0 : n, length);
}

var drop_1 = drop;

/** `Object#toString` result references. */
var stringTag = '[object String]';

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a string, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' ||
    (!isArray_1(value) && isObjectLike_1(value) && _baseGetTag(value) == stringTag);
}

var isString_1 = isString;

/** `Object#toString` result references. */
var regexpTag = '[object RegExp]';

/**
 * The base implementation of `_.isRegExp` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
 */
function baseIsRegExp(value) {
  return isObjectLike_1(value) && _baseGetTag(value) == regexpTag;
}

var _baseIsRegExp = baseIsRegExp;

/* Node.js helper references. */
var nodeIsRegExp = _nodeUtil && _nodeUtil.isRegExp;

/**
 * Checks if `value` is classified as a `RegExp` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
 * @example
 *
 * _.isRegExp(/abc/);
 * // => true
 *
 * _.isRegExp('/abc/');
 * // => false
 */
var isRegExp = nodeIsRegExp ? _baseUnary(nodeIsRegExp) : _baseIsRegExp;

var isRegExp_1 = isRegExp;

/**
 * The base implementation of `_.set`.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {Array|string} path The path of the property to set.
 * @param {*} value The value to set.
 * @param {Function} [customizer] The function to customize path creation.
 * @returns {Object} Returns `object`.
 */
function baseSet(object, path, value, customizer) {
  if (!isObject_1(object)) {
    return object;
  }
  path = _castPath(path, object);

  var index = -1,
      length = path.length,
      lastIndex = length - 1,
      nested = object;

  while (nested != null && ++index < length) {
    var key = _toKey(path[index]),
        newValue = value;

    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return object;
    }

    if (index != lastIndex) {
      var objValue = nested[key];
      newValue = customizer ? customizer(objValue, key, nested) : undefined;
      if (newValue === undefined) {
        newValue = isObject_1(objValue)
          ? objValue
          : (_isIndex(path[index + 1]) ? [] : {});
      }
    }
    _assignValue(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}

var _baseSet = baseSet;

/**
 * The base implementation of  `_.pickBy` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} paths The property paths to pick.
 * @param {Function} predicate The function invoked per property.
 * @returns {Object} Returns the new object.
 */
function basePickBy(object, paths, predicate) {
  var index = -1,
      length = paths.length,
      result = {};

  while (++index < length) {
    var path = paths[index],
        value = _baseGet(object, path);

    if (predicate(value, path)) {
      _baseSet(result, _castPath(path, object), value);
    }
  }
  return result;
}

var _basePickBy = basePickBy;

/**
 * Creates an object composed of the `object` properties `predicate` returns
 * truthy for. The predicate is invoked with two arguments: (value, key).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The source object.
 * @param {Function} [predicate=_.identity] The function invoked per property.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'a': 1, 'b': '2', 'c': 3 };
 *
 * _.pickBy(object, _.isNumber);
 * // => { 'a': 1, 'c': 3 }
 */
function pickBy(object, predicate) {
  if (object == null) {
    return {};
  }
  var props = _arrayMap(_getAllKeysIn(object), function(prop) {
    return [prop];
  });
  predicate = _baseIteratee(predicate);
  return _basePickBy(object, props, function(value, path) {
    return predicate(value, path[0]);
  });
}

var pickBy_1 = pickBy;

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

var _apply = apply;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax$3 = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax$3(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax$3(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return _apply(func, this, otherArgs);
  };
}

var _overRest = overRest;

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

var constant_1 = constant;

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !_defineProperty ? identity_1 : function(func, string) {
  return _defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant_1(string),
    'writable': true
  });
};

var _baseSetToString = baseSetToString;

/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeNow = Date.now;

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

var _shortOut = shortOut;

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = _shortOut(_baseSetToString);

var _setToString = setToString;

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return _setToString(_overRest(func, start, identity_1), func + '');
}

var _baseRest = baseRest;

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject_1(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike_1(object) && _isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq_1(object[index], value);
  }
  return false;
}

var _isIterateeCall = isIterateeCall;

/**
 * Creates a function like `_.assign`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return _baseRest(function(object, sources) {
    var index = -1,
        length = sources.length,
        customizer = length > 1 ? sources[length - 1] : undefined,
        guard = length > 2 ? sources[2] : undefined;

    customizer = (assigner.length > 3 && typeof customizer == 'function')
      ? (length--, customizer)
      : undefined;

    if (guard && _isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}

var _createAssigner = createAssigner;

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

/**
 * Assigns own enumerable string keyed properties of source objects to the
 * destination object. Source objects are applied from left to right.
 * Subsequent sources overwrite property assignments of previous sources.
 *
 * **Note:** This method mutates `object` and is loosely based on
 * [`Object.assign`](https://mdn.io/Object/assign).
 *
 * @static
 * @memberOf _
 * @since 0.10.0
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @see _.assignIn
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * function Bar() {
 *   this.c = 3;
 * }
 *
 * Foo.prototype.b = 2;
 * Bar.prototype.d = 4;
 *
 * _.assign({ 'a': 0 }, new Foo, new Bar);
 * // => { 'a': 1, 'c': 3 }
 */
var assign = _createAssigner(function(object, source) {
  if (_isPrototype(source) || isArrayLike_1(source)) {
    _copyObject(source, keys_1(source), object);
    return;
  }
  for (var key in source) {
    if (hasOwnProperty$2.call(source, key)) {
      _assignValue(object, key, source[key]);
    }
  }
});

var assign_1 = assign;

var model$1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeProduction = exports.serializeGrammar = exports.Terminal = exports.Alternation = exports.RepetitionWithSeparator = exports.Repetition = exports.RepetitionMandatoryWithSeparator = exports.RepetitionMandatory = exports.Option = exports.Alternative = exports.Rule = exports.NonTerminal = exports.AbstractProduction = void 0;
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var isString_1$1 = __importDefault(isString_1);
var isRegExp_1$1 = __importDefault(isRegExp_1);
var pickBy_1$1 = __importDefault(pickBy_1);
var assign_1$1 = __importDefault(assign_1);
// TODO: duplicated code to avoid extracting another sub-package -- how to avoid?
function tokenLabel(tokType) {
    if (hasTokenLabel(tokType)) {
        return tokType.LABEL;
    }
    else {
        return tokType.name;
    }
}
// TODO: duplicated code to avoid extracting another sub-package -- how to avoid?
function hasTokenLabel(obj) {
    return (0, isString_1$1.default)(obj.LABEL) && obj.LABEL !== "";
}
var AbstractProduction = /** @class */ (function () {
    function AbstractProduction(_definition) {
        this._definition = _definition;
    }
    Object.defineProperty(AbstractProduction.prototype, "definition", {
        get: function () {
            return this._definition;
        },
        set: function (value) {
            this._definition = value;
        },
        enumerable: false,
        configurable: true
    });
    AbstractProduction.prototype.accept = function (visitor) {
        visitor.visit(this);
        (0, forEach_1$1.default)(this.definition, function (prod) {
            prod.accept(visitor);
        });
    };
    return AbstractProduction;
}());
exports.AbstractProduction = AbstractProduction;
var NonTerminal = /** @class */ (function (_super) {
    __extends(NonTerminal, _super);
    function NonTerminal(options) {
        var _this = _super.call(this, []) || this;
        _this.idx = 1;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    Object.defineProperty(NonTerminal.prototype, "definition", {
        get: function () {
            if (this.referencedRule !== undefined) {
                return this.referencedRule.definition;
            }
            return [];
        },
        set: function (definition) {
            // immutable
        },
        enumerable: false,
        configurable: true
    });
    NonTerminal.prototype.accept = function (visitor) {
        visitor.visit(this);
        // don't visit children of a reference, we will get cyclic infinite loops if we do so
    };
    return NonTerminal;
}(AbstractProduction));
exports.NonTerminal = NonTerminal;
var Rule = /** @class */ (function (_super) {
    __extends(Rule, _super);
    function Rule(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.orgText = "";
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    return Rule;
}(AbstractProduction));
exports.Rule = Rule;
var Alternative = /** @class */ (function (_super) {
    __extends(Alternative, _super);
    function Alternative(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.ignoreAmbiguities = false;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    return Alternative;
}(AbstractProduction));
exports.Alternative = Alternative;
var Option = /** @class */ (function (_super) {
    __extends(Option, _super);
    function Option(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.idx = 1;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    return Option;
}(AbstractProduction));
exports.Option = Option;
var RepetitionMandatory = /** @class */ (function (_super) {
    __extends(RepetitionMandatory, _super);
    function RepetitionMandatory(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.idx = 1;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    return RepetitionMandatory;
}(AbstractProduction));
exports.RepetitionMandatory = RepetitionMandatory;
var RepetitionMandatoryWithSeparator = /** @class */ (function (_super) {
    __extends(RepetitionMandatoryWithSeparator, _super);
    function RepetitionMandatoryWithSeparator(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.idx = 1;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    return RepetitionMandatoryWithSeparator;
}(AbstractProduction));
exports.RepetitionMandatoryWithSeparator = RepetitionMandatoryWithSeparator;
var Repetition = /** @class */ (function (_super) {
    __extends(Repetition, _super);
    function Repetition(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.idx = 1;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    return Repetition;
}(AbstractProduction));
exports.Repetition = Repetition;
var RepetitionWithSeparator = /** @class */ (function (_super) {
    __extends(RepetitionWithSeparator, _super);
    function RepetitionWithSeparator(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.idx = 1;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    return RepetitionWithSeparator;
}(AbstractProduction));
exports.RepetitionWithSeparator = RepetitionWithSeparator;
var Alternation = /** @class */ (function (_super) {
    __extends(Alternation, _super);
    function Alternation(options) {
        var _this = _super.call(this, options.definition) || this;
        _this.idx = 1;
        _this.ignoreAmbiguities = false;
        _this.hasPredicates = false;
        (0, assign_1$1.default)(_this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
        return _this;
    }
    Object.defineProperty(Alternation.prototype, "definition", {
        get: function () {
            return this._definition;
        },
        set: function (value) {
            this._definition = value;
        },
        enumerable: false,
        configurable: true
    });
    return Alternation;
}(AbstractProduction));
exports.Alternation = Alternation;
var Terminal = /** @class */ (function () {
    function Terminal(options) {
        this.idx = 1;
        (0, assign_1$1.default)(this, (0, pickBy_1$1.default)(options, function (v) { return v !== undefined; }));
    }
    Terminal.prototype.accept = function (visitor) {
        visitor.visit(this);
    };
    return Terminal;
}());
exports.Terminal = Terminal;
function serializeGrammar(topRules) {
    return (0, map_1$1.default)(topRules, serializeProduction);
}
exports.serializeGrammar = serializeGrammar;
function serializeProduction(node) {
    function convertDefinition(definition) {
        return (0, map_1$1.default)(definition, serializeProduction);
    }
    /* istanbul ignore else */
    if (node instanceof NonTerminal) {
        var serializedNonTerminal = {
            type: "NonTerminal",
            name: node.nonTerminalName,
            idx: node.idx
        };
        if ((0, isString_1$1.default)(node.label)) {
            serializedNonTerminal.label = node.label;
        }
        return serializedNonTerminal;
    }
    else if (node instanceof Alternative) {
        return {
            type: "Alternative",
            definition: convertDefinition(node.definition)
        };
    }
    else if (node instanceof Option) {
        return {
            type: "Option",
            idx: node.idx,
            definition: convertDefinition(node.definition)
        };
    }
    else if (node instanceof RepetitionMandatory) {
        return {
            type: "RepetitionMandatory",
            idx: node.idx,
            definition: convertDefinition(node.definition)
        };
    }
    else if (node instanceof RepetitionMandatoryWithSeparator) {
        return {
            type: "RepetitionMandatoryWithSeparator",
            idx: node.idx,
            separator: (serializeProduction(new Terminal({ terminalType: node.separator }))),
            definition: convertDefinition(node.definition)
        };
    }
    else if (node instanceof RepetitionWithSeparator) {
        return {
            type: "RepetitionWithSeparator",
            idx: node.idx,
            separator: (serializeProduction(new Terminal({ terminalType: node.separator }))),
            definition: convertDefinition(node.definition)
        };
    }
    else if (node instanceof Repetition) {
        return {
            type: "Repetition",
            idx: node.idx,
            definition: convertDefinition(node.definition)
        };
    }
    else if (node instanceof Alternation) {
        return {
            type: "Alternation",
            idx: node.idx,
            definition: convertDefinition(node.definition)
        };
    }
    else if (node instanceof Terminal) {
        var serializedTerminal = {
            type: "Terminal",
            name: node.terminalType.name,
            label: tokenLabel(node.terminalType),
            idx: node.idx
        };
        if ((0, isString_1$1.default)(node.label)) {
            serializedTerminal.terminalLabel = node.label;
        }
        var pattern = node.terminalType.PATTERN;
        if (node.terminalType.PATTERN) {
            serializedTerminal.pattern = (0, isRegExp_1$1.default)(pattern)
                ? pattern.source
                : pattern;
        }
        return serializedTerminal;
    }
    else if (node instanceof Rule) {
        return {
            type: "Rule",
            name: node.name,
            orgText: node.orgText,
            definition: convertDefinition(node.definition)
        };
    }
    else {
        throw Error("non exhaustive match");
    }
}
exports.serializeProduction = serializeProduction;

});

var visitor = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAstVisitor = void 0;

var GAstVisitor = /** @class */ (function () {
    function GAstVisitor() {
    }
    GAstVisitor.prototype.visit = function (node) {
        var nodeAny = node;
        switch (nodeAny.constructor) {
            case model$1.NonTerminal:
                return this.visitNonTerminal(nodeAny);
            case model$1.Alternative:
                return this.visitAlternative(nodeAny);
            case model$1.Option:
                return this.visitOption(nodeAny);
            case model$1.RepetitionMandatory:
                return this.visitRepetitionMandatory(nodeAny);
            case model$1.RepetitionMandatoryWithSeparator:
                return this.visitRepetitionMandatoryWithSeparator(nodeAny);
            case model$1.RepetitionWithSeparator:
                return this.visitRepetitionWithSeparator(nodeAny);
            case model$1.Repetition:
                return this.visitRepetition(nodeAny);
            case model$1.Alternation:
                return this.visitAlternation(nodeAny);
            case model$1.Terminal:
                return this.visitTerminal(nodeAny);
            case model$1.Rule:
                return this.visitRule(nodeAny);
            /* istanbul ignore next */
            default:
                throw Error("non exhaustive match");
        }
    };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitNonTerminal = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitAlternative = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitOption = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitRepetition = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitRepetitionMandatory = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitRepetitionMandatoryWithSeparator = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitRepetitionWithSeparator = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitAlternation = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitTerminal = function (node) { };
    /* istanbul ignore next - testing the fact a NOOP function exists is non-trivial  */
    GAstVisitor.prototype.visitRule = function (node) { };
    return GAstVisitor;
}());
exports.GAstVisitor = GAstVisitor;

});

/**
 * The base implementation of `_.some` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function baseSome(collection, predicate) {
  var result;

  _baseEach(collection, function(value, index, collection) {
    result = predicate(value, index, collection);
    return !result;
  });
  return !!result;
}

var _baseSome = baseSome;

/**
 * Checks if `predicate` returns truthy for **any** element of `collection`.
 * Iteration is stopped once `predicate` returns truthy. The predicate is
 * invoked with three arguments: (value, index|key, collection).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 * @example
 *
 * _.some([null, 0, 'yes', false], Boolean);
 * // => true
 *
 * var users = [
 *   { 'user': 'barney', 'active': true },
 *   { 'user': 'fred',   'active': false }
 * ];
 *
 * // The `_.matches` iteratee shorthand.
 * _.some(users, { 'user': 'barney', 'active': false });
 * // => false
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.some(users, ['active', false]);
 * // => true
 *
 * // The `_.property` iteratee shorthand.
 * _.some(users, 'active');
 * // => true
 */
function some(collection, predicate, guard) {
  var func = isArray_1(collection) ? _arraySome : _baseSome;
  if (guard && _isIterateeCall(collection, predicate, guard)) {
    predicate = undefined;
  }
  return func(collection, _baseIteratee(predicate));
}

var some_1 = some;

/**
 * A specialized version of `_.every` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if all elements pass the predicate check,
 *  else `false`.
 */
function arrayEvery(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (!predicate(array[index], index, array)) {
      return false;
    }
  }
  return true;
}

var _arrayEvery = arrayEvery;

/**
 * The base implementation of `_.every` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if all elements pass the predicate check,
 *  else `false`
 */
function baseEvery(collection, predicate) {
  var result = true;
  _baseEach(collection, function(value, index, collection) {
    result = !!predicate(value, index, collection);
    return result;
  });
  return result;
}

var _baseEvery = baseEvery;

/**
 * Checks if `predicate` returns truthy for **all** elements of `collection`.
 * Iteration is stopped once `predicate` returns falsey. The predicate is
 * invoked with three arguments: (value, index|key, collection).
 *
 * **Note:** This method returns `true` for
 * [empty collections](https://en.wikipedia.org/wiki/Empty_set) because
 * [everything is true](https://en.wikipedia.org/wiki/Vacuous_truth) of
 * elements of empty collections.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {boolean} Returns `true` if all elements pass the predicate check,
 *  else `false`.
 * @example
 *
 * _.every([true, 1, null, 'yes'], Boolean);
 * // => false
 *
 * var users = [
 *   { 'user': 'barney', 'age': 36, 'active': false },
 *   { 'user': 'fred',   'age': 40, 'active': false }
 * ];
 *
 * // The `_.matches` iteratee shorthand.
 * _.every(users, { 'user': 'barney', 'active': false });
 * // => false
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.every(users, ['active', false]);
 * // => true
 *
 * // The `_.property` iteratee shorthand.
 * _.every(users, 'active');
 * // => false
 */
function every(collection, predicate, guard) {
  var func = isArray_1(collection) ? _arrayEvery : _baseEvery;
  if (guard && _isIterateeCall(collection, predicate, guard)) {
    predicate = undefined;
  }
  return func(collection, _baseIteratee(predicate));
}

var every_1 = every;

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

var _baseFindIndex = baseFindIndex;

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

var _baseIsNaN = baseIsNaN;

/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

var _strictIndexOf = strictIndexOf;

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? _strictIndexOf(array, value, fromIndex)
    : _baseFindIndex(array, _baseIsNaN, fromIndex);
}

var _baseIndexOf = baseIndexOf;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax$2 = Math.max;

/**
 * Checks if `value` is in `collection`. If `collection` is a string, it's
 * checked for a substring of `value`, otherwise
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * is used for equality comparisons. If `fromIndex` is negative, it's used as
 * the offset from the end of `collection`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object|string} collection The collection to inspect.
 * @param {*} value The value to search for.
 * @param {number} [fromIndex=0] The index to search from.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.reduce`.
 * @returns {boolean} Returns `true` if `value` is found, else `false`.
 * @example
 *
 * _.includes([1, 2, 3], 1);
 * // => true
 *
 * _.includes([1, 2, 3], 1, 2);
 * // => false
 *
 * _.includes({ 'a': 1, 'b': 2 }, 1);
 * // => true
 *
 * _.includes('abcd', 'bc');
 * // => true
 */
function includes(collection, value, fromIndex, guard) {
  collection = isArrayLike_1(collection) ? collection : values_1(collection);
  fromIndex = (fromIndex && !guard) ? toInteger_1(fromIndex) : 0;

  var length = collection.length;
  if (fromIndex < 0) {
    fromIndex = nativeMax$2(length + fromIndex, 0);
  }
  return isString_1(collection)
    ? (fromIndex <= length && collection.indexOf(value, fromIndex) > -1)
    : (!!length && _baseIndexOf(collection, value, fromIndex) > -1);
}

var includes_1 = includes;

var helpers = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductionDslName = exports.isBranchingProd = exports.isOptionalProd = exports.isSequenceProd = void 0;
var some_1$1 = __importDefault(some_1);
var every_1$1 = __importDefault(every_1);
var includes_1$1 = __importDefault(includes_1);

function isSequenceProd(prod) {
    return (prod instanceof model$1.Alternative ||
        prod instanceof model$1.Option ||
        prod instanceof model$1.Repetition ||
        prod instanceof model$1.RepetitionMandatory ||
        prod instanceof model$1.RepetitionMandatoryWithSeparator ||
        prod instanceof model$1.RepetitionWithSeparator ||
        prod instanceof model$1.Terminal ||
        prod instanceof model$1.Rule);
}
exports.isSequenceProd = isSequenceProd;
function isOptionalProd(prod, alreadyVisited) {
    if (alreadyVisited === void 0) { alreadyVisited = []; }
    var isDirectlyOptional = prod instanceof model$1.Option ||
        prod instanceof model$1.Repetition ||
        prod instanceof model$1.RepetitionWithSeparator;
    if (isDirectlyOptional) {
        return true;
    }
    // note that this can cause infinite loop if one optional empty TOP production has a cyclic dependency with another
    // empty optional top rule
    // may be indirectly optional ((A?B?C?) | (D?E?F?))
    if (prod instanceof model$1.Alternation) {
        // for OR its enough for just one of the alternatives to be optional
        return (0, some_1$1.default)(prod.definition, function (subProd) {
            return isOptionalProd(subProd, alreadyVisited);
        });
    }
    else if (prod instanceof model$1.NonTerminal && (0, includes_1$1.default)(alreadyVisited, prod)) {
        // avoiding stack overflow due to infinite recursion
        return false;
    }
    else if (prod instanceof model$1.AbstractProduction) {
        if (prod instanceof model$1.NonTerminal) {
            alreadyVisited.push(prod);
        }
        return (0, every_1$1.default)(prod.definition, function (subProd) {
            return isOptionalProd(subProd, alreadyVisited);
        });
    }
    else {
        return false;
    }
}
exports.isOptionalProd = isOptionalProd;
function isBranchingProd(prod) {
    return prod instanceof model$1.Alternation;
}
exports.isBranchingProd = isBranchingProd;
function getProductionDslName(prod) {
    /* istanbul ignore else */
    if (prod instanceof model$1.NonTerminal) {
        return "SUBRULE";
    }
    else if (prod instanceof model$1.Option) {
        return "OPTION";
    }
    else if (prod instanceof model$1.Alternation) {
        return "OR";
    }
    else if (prod instanceof model$1.RepetitionMandatory) {
        return "AT_LEAST_ONE";
    }
    else if (prod instanceof model$1.RepetitionMandatoryWithSeparator) {
        return "AT_LEAST_ONE_SEP";
    }
    else if (prod instanceof model$1.RepetitionWithSeparator) {
        return "MANY_SEP";
    }
    else if (prod instanceof model$1.Repetition) {
        return "MANY";
    }
    else if (prod instanceof model$1.Terminal) {
        return "CONSUME";
    }
    else {
        throw Error("non exhaustive match");
    }
}
exports.getProductionDslName = getProductionDslName;

});

var api$2 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSequenceProd = exports.isBranchingProd = exports.isOptionalProd = exports.getProductionDslName = exports.GAstVisitor = exports.serializeProduction = exports.serializeGrammar = exports.Alternative = exports.Alternation = exports.RepetitionWithSeparator = exports.RepetitionMandatoryWithSeparator = exports.RepetitionMandatory = exports.Repetition = exports.Option = exports.NonTerminal = exports.Terminal = exports.Rule = void 0;

Object.defineProperty(exports, "Rule", { enumerable: true, get: function () { return model$1.Rule; } });
Object.defineProperty(exports, "Terminal", { enumerable: true, get: function () { return model$1.Terminal; } });
Object.defineProperty(exports, "NonTerminal", { enumerable: true, get: function () { return model$1.NonTerminal; } });
Object.defineProperty(exports, "Option", { enumerable: true, get: function () { return model$1.Option; } });
Object.defineProperty(exports, "Repetition", { enumerable: true, get: function () { return model$1.Repetition; } });
Object.defineProperty(exports, "RepetitionMandatory", { enumerable: true, get: function () { return model$1.RepetitionMandatory; } });
Object.defineProperty(exports, "RepetitionMandatoryWithSeparator", { enumerable: true, get: function () { return model$1.RepetitionMandatoryWithSeparator; } });
Object.defineProperty(exports, "RepetitionWithSeparator", { enumerable: true, get: function () { return model$1.RepetitionWithSeparator; } });
Object.defineProperty(exports, "Alternation", { enumerable: true, get: function () { return model$1.Alternation; } });
Object.defineProperty(exports, "Alternative", { enumerable: true, get: function () { return model$1.Alternative; } });
Object.defineProperty(exports, "serializeGrammar", { enumerable: true, get: function () { return model$1.serializeGrammar; } });
Object.defineProperty(exports, "serializeProduction", { enumerable: true, get: function () { return model$1.serializeProduction; } });

Object.defineProperty(exports, "GAstVisitor", { enumerable: true, get: function () { return visitor.GAstVisitor; } });

Object.defineProperty(exports, "getProductionDslName", { enumerable: true, get: function () { return helpers.getProductionDslName; } });
Object.defineProperty(exports, "isOptionalProd", { enumerable: true, get: function () { return helpers.isOptionalProd; } });
Object.defineProperty(exports, "isBranchingProd", { enumerable: true, get: function () { return helpers.isBranchingProd; } });
Object.defineProperty(exports, "isSequenceProd", { enumerable: true, get: function () { return helpers.isSequenceProd; } });

});

var rest = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestWalker = void 0;
var drop_1$1 = __importDefault(drop_1);
var forEach_1$1 = __importDefault(forEach_1);

/**
 *  A Grammar Walker that computes the "remaining" grammar "after" a productions in the grammar.
 */
var RestWalker = /** @class */ (function () {
    function RestWalker() {
    }
    RestWalker.prototype.walk = function (prod, prevRest) {
        var _this = this;
        if (prevRest === void 0) { prevRest = []; }
        (0, forEach_1$1.default)(prod.definition, function (subProd, index) {
            var currRest = (0, drop_1$1.default)(prod.definition, index + 1);
            /* istanbul ignore else */
            if (subProd instanceof api$2.NonTerminal) {
                _this.walkProdRef(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.Terminal) {
                _this.walkTerminal(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.Alternative) {
                _this.walkFlat(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.Option) {
                _this.walkOption(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.RepetitionMandatory) {
                _this.walkAtLeastOne(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.RepetitionMandatoryWithSeparator) {
                _this.walkAtLeastOneSep(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.RepetitionWithSeparator) {
                _this.walkManySep(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.Repetition) {
                _this.walkMany(subProd, currRest, prevRest);
            }
            else if (subProd instanceof api$2.Alternation) {
                _this.walkOr(subProd, currRest, prevRest);
            }
            else {
                throw Error("non exhaustive match");
            }
        });
    };
    RestWalker.prototype.walkTerminal = function (terminal, currRest, prevRest) { };
    RestWalker.prototype.walkProdRef = function (refProd, currRest, prevRest) { };
    RestWalker.prototype.walkFlat = function (flatProd, currRest, prevRest) {
        // ABCDEF => after the D the rest is EF
        var fullOrRest = currRest.concat(prevRest);
        this.walk(flatProd, fullOrRest);
    };
    RestWalker.prototype.walkOption = function (optionProd, currRest, prevRest) {
        // ABC(DE)?F => after the (DE)? the rest is F
        var fullOrRest = currRest.concat(prevRest);
        this.walk(optionProd, fullOrRest);
    };
    RestWalker.prototype.walkAtLeastOne = function (atLeastOneProd, currRest, prevRest) {
        // ABC(DE)+F => after the (DE)+ the rest is (DE)?F
        var fullAtLeastOneRest = [
            new api$2.Option({ definition: atLeastOneProd.definition })
        ].concat(currRest, prevRest);
        this.walk(atLeastOneProd, fullAtLeastOneRest);
    };
    RestWalker.prototype.walkAtLeastOneSep = function (atLeastOneSepProd, currRest, prevRest) {
        // ABC DE(,DE)* F => after the (,DE)+ the rest is (,DE)?F
        var fullAtLeastOneSepRest = restForRepetitionWithSeparator(atLeastOneSepProd, currRest, prevRest);
        this.walk(atLeastOneSepProd, fullAtLeastOneSepRest);
    };
    RestWalker.prototype.walkMany = function (manyProd, currRest, prevRest) {
        // ABC(DE)*F => after the (DE)* the rest is (DE)?F
        var fullManyRest = [
            new api$2.Option({ definition: manyProd.definition })
        ].concat(currRest, prevRest);
        this.walk(manyProd, fullManyRest);
    };
    RestWalker.prototype.walkManySep = function (manySepProd, currRest, prevRest) {
        // ABC (DE(,DE)*)? F => after the (,DE)* the rest is (,DE)?F
        var fullManySepRest = restForRepetitionWithSeparator(manySepProd, currRest, prevRest);
        this.walk(manySepProd, fullManySepRest);
    };
    RestWalker.prototype.walkOr = function (orProd, currRest, prevRest) {
        var _this = this;
        // ABC(D|E|F)G => when finding the (D|E|F) the rest is G
        var fullOrRest = currRest.concat(prevRest);
        // walk all different alternatives
        (0, forEach_1$1.default)(orProd.definition, function (alt) {
            // wrapping each alternative in a single definition wrapper
            // to avoid errors in computing the rest of that alternative in the invocation to computeInProdFollows
            // (otherwise for OR([alt1,alt2]) alt2 will be considered in 'rest' of alt1
            var prodWrapper = new api$2.Alternative({ definition: [alt] });
            _this.walk(prodWrapper, fullOrRest);
        });
    };
    return RestWalker;
}());
exports.RestWalker = RestWalker;
function restForRepetitionWithSeparator(repSepProd, currRest, prevRest) {
    var repSepRest = [
        new api$2.Option({
            definition: [
                new api$2.Terminal({ terminalType: repSepProd.separator })
            ].concat(repSepProd.definition)
        })
    ];
    var fullRepSepRest = repSepRest.concat(currRest, prevRest);
    return fullRepSepRest;
}

});

/** Built-in value references. */
var spreadableSymbol = _Symbol ? _Symbol.isConcatSpreadable : undefined;

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray_1(value) || isArguments_1(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

var _isFlattenable = isFlattenable;

/**
 * The base implementation of `_.flatten` with support for restricting flattening.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {number} depth The maximum recursion depth.
 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, depth, predicate, isStrict, result) {
  var index = -1,
      length = array.length;

  predicate || (predicate = _isFlattenable);
  result || (result = []);

  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, depth - 1, predicate, isStrict, result);
      } else {
        _arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

var _baseFlatten = baseFlatten;

/**
 * Flattens `array` a single level deep.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to flatten.
 * @returns {Array} Returns the new flattened array.
 * @example
 *
 * _.flatten([1, [2, [3, [4]], 5]]);
 * // => [1, 2, [3, [4]], 5]
 */
function flatten(array) {
  var length = array == null ? 0 : array.length;
  return length ? _baseFlatten(array, 1) : [];
}

var flatten_1 = flatten;

/**
 * A specialized version of `_.includes` for arrays without support for
 * specifying an index to search from.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludes(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && _baseIndexOf(array, value, 0) > -1;
}

var _arrayIncludes = arrayIncludes;

/**
 * This function is like `arrayIncludes` except that it accepts a comparator.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludesWith(array, value, comparator) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }
  return false;
}

var _arrayIncludesWith = arrayIncludesWith;

/**
 * This method returns `undefined`.
 *
 * @static
 * @memberOf _
 * @since 2.3.0
 * @category Util
 * @example
 *
 * _.times(2, _.noop);
 * // => [undefined, undefined]
 */
function noop() {
  // No operation performed.
}

var noop_1 = noop;

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/**
 * Creates a set object of `values`.
 *
 * @private
 * @param {Array} values The values to add to the set.
 * @returns {Object} Returns the new set.
 */
var createSet = !(_Set && (1 / _setToArray(new _Set([,-0]))[1]) == INFINITY) ? noop_1 : function(values) {
  return new _Set(values);
};

var _createSet = createSet;

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE$1 = 200;

/**
 * The base implementation of `_.uniqBy` without support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new duplicate free array.
 */
function baseUniq(array, iteratee, comparator) {
  var index = -1,
      includes = _arrayIncludes,
      length = array.length,
      isCommon = true,
      result = [],
      seen = result;

  if (comparator) {
    isCommon = false;
    includes = _arrayIncludesWith;
  }
  else if (length >= LARGE_ARRAY_SIZE$1) {
    var set = iteratee ? null : _createSet(array);
    if (set) {
      return _setToArray(set);
    }
    isCommon = false;
    includes = _cacheHas;
    seen = new _SetCache;
  }
  else {
    seen = iteratee ? [] : result;
  }
  outer:
  while (++index < length) {
    var value = array[index],
        computed = iteratee ? iteratee(value) : value;

    value = (comparator || value !== 0) ? value : 0;
    if (isCommon && computed === computed) {
      var seenIndex = seen.length;
      while (seenIndex--) {
        if (seen[seenIndex] === computed) {
          continue outer;
        }
      }
      if (iteratee) {
        seen.push(computed);
      }
      result.push(value);
    }
    else if (!includes(seen, computed, comparator)) {
      if (seen !== result) {
        seen.push(computed);
      }
      result.push(value);
    }
  }
  return result;
}

var _baseUniq = baseUniq;

/**
 * Creates a duplicate-free version of an array, using
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons, in which only the first occurrence of each element
 * is kept. The order of result values is determined by the order they occur
 * in the array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to inspect.
 * @returns {Array} Returns the new duplicate free array.
 * @example
 *
 * _.uniq([2, 1, 2]);
 * // => [2, 1]
 */
function uniq(array) {
  return (array && array.length) ? _baseUniq(array) : [];
}

var uniq_1 = uniq;

var first_1 = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstForTerminal = exports.firstForBranching = exports.firstForSequence = exports.first = void 0;
var flatten_1$1 = __importDefault(flatten_1);
var uniq_1$1 = __importDefault(uniq_1);
var map_1$1 = __importDefault(map_1);

var gast_2 = api$2;
function first(prod) {
    /* istanbul ignore else */
    if (prod instanceof api$2.NonTerminal) {
        // this could in theory cause infinite loops if
        // (1) prod A refs prod B.
        // (2) prod B refs prod A
        // (3) AB can match the empty set
        // in other words a cycle where everything is optional so the first will keep
        // looking ahead for the next optional part and will never exit
        // currently there is no safeguard for this unique edge case because
        // (1) not sure a grammar in which this can happen is useful for anything (productive)
        return first(prod.referencedRule);
    }
    else if (prod instanceof api$2.Terminal) {
        return firstForTerminal(prod);
    }
    else if ((0, gast_2.isSequenceProd)(prod)) {
        return firstForSequence(prod);
    }
    else if ((0, gast_2.isBranchingProd)(prod)) {
        return firstForBranching(prod);
    }
    else {
        throw Error("non exhaustive match");
    }
}
exports.first = first;
function firstForSequence(prod) {
    var firstSet = [];
    var seq = prod.definition;
    var nextSubProdIdx = 0;
    var hasInnerProdsRemaining = seq.length > nextSubProdIdx;
    var currSubProd;
    // so we enter the loop at least once (if the definition is not empty
    var isLastInnerProdOptional = true;
    // scan a sequence until it's end or until we have found a NONE optional production in it
    while (hasInnerProdsRemaining && isLastInnerProdOptional) {
        currSubProd = seq[nextSubProdIdx];
        isLastInnerProdOptional = (0, gast_2.isOptionalProd)(currSubProd);
        firstSet = firstSet.concat(first(currSubProd));
        nextSubProdIdx = nextSubProdIdx + 1;
        hasInnerProdsRemaining = seq.length > nextSubProdIdx;
    }
    return (0, uniq_1$1.default)(firstSet);
}
exports.firstForSequence = firstForSequence;
function firstForBranching(prod) {
    var allAlternativesFirsts = (0, map_1$1.default)(prod.definition, function (innerProd) {
        return first(innerProd);
    });
    return (0, uniq_1$1.default)((0, flatten_1$1.default)(allAlternativesFirsts));
}
exports.firstForBranching = firstForBranching;
function firstForTerminal(terminal) {
    return [terminal.terminalType];
}
exports.firstForTerminal = firstForTerminal;

});

var constants = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.IN = void 0;
// TODO: can this be removed? where is it used?
exports.IN = "_~IN~_";

});

var follow = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInProdFollowPrefix = exports.buildBetweenProdsFollowPrefix = exports.computeAllProdsFollows = exports.ResyncFollowsWalker = void 0;


var forEach_1$1 = __importDefault(forEach_1);
var assign_1$1 = __importDefault(assign_1);


// This ResyncFollowsWalker computes all of the follows required for RESYNC
// (skipping reference production).
var ResyncFollowsWalker = /** @class */ (function (_super) {
    __extends(ResyncFollowsWalker, _super);
    function ResyncFollowsWalker(topProd) {
        var _this = _super.call(this) || this;
        _this.topProd = topProd;
        _this.follows = {};
        return _this;
    }
    ResyncFollowsWalker.prototype.startWalking = function () {
        this.walk(this.topProd);
        return this.follows;
    };
    ResyncFollowsWalker.prototype.walkTerminal = function (terminal, currRest, prevRest) {
        // do nothing! just like in the public sector after 13:00
    };
    ResyncFollowsWalker.prototype.walkProdRef = function (refProd, currRest, prevRest) {
        var followName = buildBetweenProdsFollowPrefix(refProd.referencedRule, refProd.idx) +
            this.topProd.name;
        var fullRest = currRest.concat(prevRest);
        var restProd = new api$2.Alternative({ definition: fullRest });
        var t_in_topProd_follows = (0, first_1.first)(restProd);
        this.follows[followName] = t_in_topProd_follows;
    };
    return ResyncFollowsWalker;
}(rest.RestWalker));
exports.ResyncFollowsWalker = ResyncFollowsWalker;
function computeAllProdsFollows(topProductions) {
    var reSyncFollows = {};
    (0, forEach_1$1.default)(topProductions, function (topProd) {
        var currRefsFollow = new ResyncFollowsWalker(topProd).startWalking();
        (0, assign_1$1.default)(reSyncFollows, currRefsFollow);
    });
    return reSyncFollows;
}
exports.computeAllProdsFollows = computeAllProdsFollows;
function buildBetweenProdsFollowPrefix(inner, occurenceInParent) {
    return inner.name + occurenceInParent + constants.IN;
}
exports.buildBetweenProdsFollowPrefix = buildBetweenProdsFollowPrefix;
function buildInProdFollowPrefix(terminal) {
    var terminalName = terminal.terminalType.name;
    return terminalName + terminal.idx + constants.IN;
}
exports.buildInProdFollowPrefix = buildInProdFollowPrefix;

});

/**
 * Checks if `value` is `undefined`.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
 * @example
 *
 * _.isUndefined(void 0);
 * // => true
 *
 * _.isUndefined(null);
 * // => false
 */
function isUndefined(value) {
  return value === undefined;
}

var isUndefined_1 = isUndefined;

var regexpToAst = createCommonjsModule(function (module) {
(function(root, factory) {
    // istanbul ignore next
    if (module.exports) {
        module.exports = factory();
    } else {
        // istanbul ignore next
        root.regexpToAst = factory();
    }
})(
    typeof self !== "undefined"
        ? // istanbul ignore next
          self
        : commonjsGlobal,
    function() {
        // references
        // https://hackernoon.com/the-madness-of-parsing-real-world-javascript-regexps-d9ee336df983
        // https://www.ecma-international.org/ecma-262/8.0/index.html#prod-Pattern
        function RegExpParser() {}

        RegExpParser.prototype.saveState = function() {
            return {
                idx: this.idx,
                input: this.input,
                groupIdx: this.groupIdx
            }
        };

        RegExpParser.prototype.restoreState = function(newState) {
            this.idx = newState.idx;
            this.input = newState.input;
            this.groupIdx = newState.groupIdx;
        };

        RegExpParser.prototype.pattern = function(input) {
            // parser state
            this.idx = 0;
            this.input = input;
            this.groupIdx = 0;

            this.consumeChar("/");
            var value = this.disjunction();
            this.consumeChar("/");

            var flags = {
                type: "Flags",
                loc: { begin: this.idx, end: input.length },
                global: false,
                ignoreCase: false,
                multiLine: false,
                unicode: false,
                sticky: false
            };

            while (this.isRegExpFlag()) {
                switch (this.popChar()) {
                    case "g":
                        addFlag(flags, "global");
                        break
                    case "i":
                        addFlag(flags, "ignoreCase");
                        break
                    case "m":
                        addFlag(flags, "multiLine");
                        break
                    case "u":
                        addFlag(flags, "unicode");
                        break
                    case "y":
                        addFlag(flags, "sticky");
                        break
                }
            }

            if (this.idx !== this.input.length) {
                throw Error(
                    "Redundant input: " + this.input.substring(this.idx)
                )
            }
            return {
                type: "Pattern",
                flags: flags,
                value: value,
                loc: this.loc(0)
            }
        };

        RegExpParser.prototype.disjunction = function() {
            var alts = [];
            var begin = this.idx;

            alts.push(this.alternative());

            while (this.peekChar() === "|") {
                this.consumeChar("|");
                alts.push(this.alternative());
            }

            return { type: "Disjunction", value: alts, loc: this.loc(begin) }
        };

        RegExpParser.prototype.alternative = function() {
            var terms = [];
            var begin = this.idx;

            while (this.isTerm()) {
                terms.push(this.term());
            }

            return { type: "Alternative", value: terms, loc: this.loc(begin) }
        };

        RegExpParser.prototype.term = function() {
            if (this.isAssertion()) {
                return this.assertion()
            } else {
                return this.atom()
            }
        };

        RegExpParser.prototype.assertion = function() {
            var begin = this.idx;
            switch (this.popChar()) {
                case "^":
                    return {
                        type: "StartAnchor",
                        loc: this.loc(begin)
                    }
                case "$":
                    return { type: "EndAnchor", loc: this.loc(begin) }
                // '\b' or '\B'
                case "\\":
                    switch (this.popChar()) {
                        case "b":
                            return {
                                type: "WordBoundary",
                                loc: this.loc(begin)
                            }
                        case "B":
                            return {
                                type: "NonWordBoundary",
                                loc: this.loc(begin)
                            }
                    }
                    // istanbul ignore next
                    throw Error("Invalid Assertion Escape")
                // '(?=' or '(?!'
                case "(":
                    this.consumeChar("?");

                    var type;
                    switch (this.popChar()) {
                        case "=":
                            type = "Lookahead";
                            break
                        case "!":
                            type = "NegativeLookahead";
                            break
                    }
                    ASSERT_EXISTS(type);

                    var disjunction = this.disjunction();

                    this.consumeChar(")");

                    return {
                        type: type,
                        value: disjunction,
                        loc: this.loc(begin)
                    }
            }
            // istanbul ignore next
            ASSERT_NEVER_REACH_HERE();
        };

        RegExpParser.prototype.quantifier = function(isBacktracking) {
            var range;
            var begin = this.idx;
            switch (this.popChar()) {
                case "*":
                    range = {
                        atLeast: 0,
                        atMost: Infinity
                    };
                    break
                case "+":
                    range = {
                        atLeast: 1,
                        atMost: Infinity
                    };
                    break
                case "?":
                    range = {
                        atLeast: 0,
                        atMost: 1
                    };
                    break
                case "{":
                    var atLeast = this.integerIncludingZero();
                    switch (this.popChar()) {
                        case "}":
                            range = {
                                atLeast: atLeast,
                                atMost: atLeast
                            };
                            break
                        case ",":
                            var atMost;
                            if (this.isDigit()) {
                                atMost = this.integerIncludingZero();
                                range = {
                                    atLeast: atLeast,
                                    atMost: atMost
                                };
                            } else {
                                range = {
                                    atLeast: atLeast,
                                    atMost: Infinity
                                };
                            }
                            this.consumeChar("}");
                            break
                    }
                    // throwing exceptions from "ASSERT_EXISTS" during backtracking
                    // causes severe performance degradations
                    if (isBacktracking === true && range === undefined) {
                        return undefined
                    }
                    ASSERT_EXISTS(range);
                    break
            }

            // throwing exceptions from "ASSERT_EXISTS" during backtracking
            // causes severe performance degradations
            if (isBacktracking === true && range === undefined) {
                return undefined
            }

            ASSERT_EXISTS(range);

            if (this.peekChar(0) === "?") {
                this.consumeChar("?");
                range.greedy = false;
            } else {
                range.greedy = true;
            }

            range.type = "Quantifier";
            range.loc = this.loc(begin);
            return range
        };

        RegExpParser.prototype.atom = function() {
            var atom;
            var begin = this.idx;
            switch (this.peekChar()) {
                case ".":
                    atom = this.dotAll();
                    break
                case "\\":
                    atom = this.atomEscape();
                    break
                case "[":
                    atom = this.characterClass();
                    break
                case "(":
                    atom = this.group();
                    break
            }

            if (atom === undefined && this.isPatternCharacter()) {
                atom = this.patternCharacter();
            }

            ASSERT_EXISTS(atom);

            atom.loc = this.loc(begin);

            if (this.isQuantifier()) {
                atom.quantifier = this.quantifier();
            }

            return atom
        };

        RegExpParser.prototype.dotAll = function() {
            this.consumeChar(".");
            return {
                type: "Set",
                complement: true,
                value: [cc("\n"), cc("\r"), cc("\u2028"), cc("\u2029")]
            }
        };

        RegExpParser.prototype.atomEscape = function() {
            this.consumeChar("\\");

            switch (this.peekChar()) {
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                    return this.decimalEscapeAtom()
                case "d":
                case "D":
                case "s":
                case "S":
                case "w":
                case "W":
                    return this.characterClassEscape()
                case "f":
                case "n":
                case "r":
                case "t":
                case "v":
                    return this.controlEscapeAtom()
                case "c":
                    return this.controlLetterEscapeAtom()
                case "0":
                    return this.nulCharacterAtom()
                case "x":
                    return this.hexEscapeSequenceAtom()
                case "u":
                    return this.regExpUnicodeEscapeSequenceAtom()
                default:
                    return this.identityEscapeAtom()
            }
        };

        RegExpParser.prototype.decimalEscapeAtom = function() {
            var value = this.positiveInteger();

            return { type: "GroupBackReference", value: value }
        };

        RegExpParser.prototype.characterClassEscape = function() {
            var set;
            var complement = false;
            switch (this.popChar()) {
                case "d":
                    set = digitsCharCodes;
                    break
                case "D":
                    set = digitsCharCodes;
                    complement = true;
                    break
                case "s":
                    set = whitespaceCodes;
                    break
                case "S":
                    set = whitespaceCodes;
                    complement = true;
                    break
                case "w":
                    set = wordCharCodes;
                    break
                case "W":
                    set = wordCharCodes;
                    complement = true;
                    break
            }

            ASSERT_EXISTS(set);

            return { type: "Set", value: set, complement: complement }
        };

        RegExpParser.prototype.controlEscapeAtom = function() {
            var escapeCode;
            switch (this.popChar()) {
                case "f":
                    escapeCode = cc("\f");
                    break
                case "n":
                    escapeCode = cc("\n");
                    break
                case "r":
                    escapeCode = cc("\r");
                    break
                case "t":
                    escapeCode = cc("\t");
                    break
                case "v":
                    escapeCode = cc("\v");
                    break
            }
            ASSERT_EXISTS(escapeCode);

            return { type: "Character", value: escapeCode }
        };

        RegExpParser.prototype.controlLetterEscapeAtom = function() {
            this.consumeChar("c");
            var letter = this.popChar();
            if (/[a-zA-Z]/.test(letter) === false) {
                throw Error("Invalid ")
            }

            var letterCode = letter.toUpperCase().charCodeAt(0) - 64;
            return { type: "Character", value: letterCode }
        };

        RegExpParser.prototype.nulCharacterAtom = function() {
            // TODO implement '[lookahead ∉ DecimalDigit]'
            // TODO: for the deprecated octal escape sequence
            this.consumeChar("0");
            return { type: "Character", value: cc("\0") }
        };

        RegExpParser.prototype.hexEscapeSequenceAtom = function() {
            this.consumeChar("x");
            return this.parseHexDigits(2)
        };

        RegExpParser.prototype.regExpUnicodeEscapeSequenceAtom = function() {
            this.consumeChar("u");
            return this.parseHexDigits(4)
        };

        RegExpParser.prototype.identityEscapeAtom = function() {
            // TODO: implement "SourceCharacter but not UnicodeIDContinue"
            // // http://unicode.org/reports/tr31/#Specific_Character_Adjustments
            var escapedChar = this.popChar();
            return { type: "Character", value: cc(escapedChar) }
        };

        RegExpParser.prototype.classPatternCharacterAtom = function() {
            switch (this.peekChar()) {
                // istanbul ignore next
                case "\n":
                // istanbul ignore next
                case "\r":
                // istanbul ignore next
                case "\u2028":
                // istanbul ignore next
                case "\u2029":
                // istanbul ignore next
                case "\\":
                // istanbul ignore next
                case "]":
                    throw Error("TBD")
                default:
                    var nextChar = this.popChar();
                    return { type: "Character", value: cc(nextChar) }
            }
        };

        RegExpParser.prototype.characterClass = function() {
            var set = [];
            var complement = false;
            this.consumeChar("[");
            if (this.peekChar(0) === "^") {
                this.consumeChar("^");
                complement = true;
            }

            while (this.isClassAtom()) {
                var from = this.classAtom();
                var isFromSingleChar = from.type === "Character";
                if (isFromSingleChar && this.isRangeDash()) {
                    this.consumeChar("-");
                    var to = this.classAtom();
                    var isToSingleChar = to.type === "Character";

                    // a range can only be used when both sides are single characters
                    if (isToSingleChar) {
                        if (to.value < from.value) {
                            throw Error("Range out of order in character class")
                        }
                        set.push({ from: from.value, to: to.value });
                    } else {
                        // literal dash
                        insertToSet(from.value, set);
                        set.push(cc("-"));
                        insertToSet(to.value, set);
                    }
                } else {
                    insertToSet(from.value, set);
                }
            }

            this.consumeChar("]");

            return { type: "Set", complement: complement, value: set }
        };

        RegExpParser.prototype.classAtom = function() {
            switch (this.peekChar()) {
                // istanbul ignore next
                case "]":
                // istanbul ignore next
                case "\n":
                // istanbul ignore next
                case "\r":
                // istanbul ignore next
                case "\u2028":
                // istanbul ignore next
                case "\u2029":
                    throw Error("TBD")
                case "\\":
                    return this.classEscape()
                default:
                    return this.classPatternCharacterAtom()
            }
        };

        RegExpParser.prototype.classEscape = function() {
            this.consumeChar("\\");
            switch (this.peekChar()) {
                // Matches a backspace.
                // (Not to be confused with \b word boundary outside characterClass)
                case "b":
                    this.consumeChar("b");
                    return { type: "Character", value: cc("\u0008") }
                case "d":
                case "D":
                case "s":
                case "S":
                case "w":
                case "W":
                    return this.characterClassEscape()
                case "f":
                case "n":
                case "r":
                case "t":
                case "v":
                    return this.controlEscapeAtom()
                case "c":
                    return this.controlLetterEscapeAtom()
                case "0":
                    return this.nulCharacterAtom()
                case "x":
                    return this.hexEscapeSequenceAtom()
                case "u":
                    return this.regExpUnicodeEscapeSequenceAtom()
                default:
                    return this.identityEscapeAtom()
            }
        };

        RegExpParser.prototype.group = function() {
            var capturing = true;
            this.consumeChar("(");
            switch (this.peekChar(0)) {
                case "?":
                    this.consumeChar("?");
                    this.consumeChar(":");
                    capturing = false;
                    break
                default:
                    this.groupIdx++;
                    break
            }
            var value = this.disjunction();
            this.consumeChar(")");

            var groupAst = {
                type: "Group",
                capturing: capturing,
                value: value
            };

            if (capturing) {
                groupAst.idx = this.groupIdx;
            }

            return groupAst
        };

        RegExpParser.prototype.positiveInteger = function() {
            var number = this.popChar();

            // istanbul ignore next - can't ever get here due to previous lookahead checks
            // still implementing this error checking in case this ever changes.
            if (decimalPatternNoZero.test(number) === false) {
                throw Error("Expecting a positive integer")
            }

            while (decimalPattern.test(this.peekChar(0))) {
                number += this.popChar();
            }

            return parseInt(number, 10)
        };

        RegExpParser.prototype.integerIncludingZero = function() {
            var number = this.popChar();
            if (decimalPattern.test(number) === false) {
                throw Error("Expecting an integer")
            }

            while (decimalPattern.test(this.peekChar(0))) {
                number += this.popChar();
            }

            return parseInt(number, 10)
        };

        RegExpParser.prototype.patternCharacter = function() {
            var nextChar = this.popChar();
            switch (nextChar) {
                // istanbul ignore next
                case "\n":
                // istanbul ignore next
                case "\r":
                // istanbul ignore next
                case "\u2028":
                // istanbul ignore next
                case "\u2029":
                // istanbul ignore next
                case "^":
                // istanbul ignore next
                case "$":
                // istanbul ignore next
                case "\\":
                // istanbul ignore next
                case ".":
                // istanbul ignore next
                case "*":
                // istanbul ignore next
                case "+":
                // istanbul ignore next
                case "?":
                // istanbul ignore next
                case "(":
                // istanbul ignore next
                case ")":
                // istanbul ignore next
                case "[":
                // istanbul ignore next
                case "|":
                    // istanbul ignore next
                    throw Error("TBD")
                default:
                    return { type: "Character", value: cc(nextChar) }
            }
        };
        RegExpParser.prototype.isRegExpFlag = function() {
            switch (this.peekChar(0)) {
                case "g":
                case "i":
                case "m":
                case "u":
                case "y":
                    return true
                default:
                    return false
            }
        };

        RegExpParser.prototype.isRangeDash = function() {
            return this.peekChar() === "-" && this.isClassAtom(1)
        };

        RegExpParser.prototype.isDigit = function() {
            return decimalPattern.test(this.peekChar(0))
        };

        RegExpParser.prototype.isClassAtom = function(howMuch) {
            if (howMuch === undefined) {
                howMuch = 0;
            }

            switch (this.peekChar(howMuch)) {
                case "]":
                case "\n":
                case "\r":
                case "\u2028":
                case "\u2029":
                    return false
                default:
                    return true
            }
        };

        RegExpParser.prototype.isTerm = function() {
            return this.isAtom() || this.isAssertion()
        };

        RegExpParser.prototype.isAtom = function() {
            if (this.isPatternCharacter()) {
                return true
            }

            switch (this.peekChar(0)) {
                case ".":
                case "\\": // atomEscape
                case "[": // characterClass
                // TODO: isAtom must be called before isAssertion - disambiguate
                case "(": // group
                    return true
                default:
                    return false
            }
        };

        RegExpParser.prototype.isAssertion = function() {
            switch (this.peekChar(0)) {
                case "^":
                case "$":
                    return true
                // '\b' or '\B'
                case "\\":
                    switch (this.peekChar(1)) {
                        case "b":
                        case "B":
                            return true
                        default:
                            return false
                    }
                // '(?=' or '(?!'
                case "(":
                    return (
                        this.peekChar(1) === "?" &&
                        (this.peekChar(2) === "=" || this.peekChar(2) === "!")
                    )
                default:
                    return false
            }
        };

        RegExpParser.prototype.isQuantifier = function() {
            var prevState = this.saveState();
            try {
                return this.quantifier(true) !== undefined
            } catch (e) {
                return false
            } finally {
                this.restoreState(prevState);
            }
        };

        RegExpParser.prototype.isPatternCharacter = function() {
            switch (this.peekChar()) {
                case "^":
                case "$":
                case "\\":
                case ".":
                case "*":
                case "+":
                case "?":
                case "(":
                case ")":
                case "[":
                case "|":
                case "/":
                case "\n":
                case "\r":
                case "\u2028":
                case "\u2029":
                    return false
                default:
                    return true
            }
        };

        RegExpParser.prototype.parseHexDigits = function(howMany) {
            var hexString = "";
            for (var i = 0; i < howMany; i++) {
                var hexChar = this.popChar();
                if (hexDigitPattern.test(hexChar) === false) {
                    throw Error("Expecting a HexDecimal digits")
                }
                hexString += hexChar;
            }
            var charCode = parseInt(hexString, 16);
            return { type: "Character", value: charCode }
        };

        RegExpParser.prototype.peekChar = function(howMuch) {
            if (howMuch === undefined) {
                howMuch = 0;
            }
            return this.input[this.idx + howMuch]
        };

        RegExpParser.prototype.popChar = function() {
            var nextChar = this.peekChar(0);
            this.consumeChar();
            return nextChar
        };

        RegExpParser.prototype.consumeChar = function(char) {
            if (char !== undefined && this.input[this.idx] !== char) {
                throw Error(
                    "Expected: '" +
                        char +
                        "' but found: '" +
                        this.input[this.idx] +
                        "' at offset: " +
                        this.idx
                )
            }

            if (this.idx >= this.input.length) {
                throw Error("Unexpected end of input")
            }
            this.idx++;
        };

        RegExpParser.prototype.loc = function(begin) {
            return { begin: begin, end: this.idx }
        };

        // consts and utilities
        var hexDigitPattern = /[0-9a-fA-F]/;
        var decimalPattern = /[0-9]/;
        var decimalPatternNoZero = /[1-9]/;

        function cc(char) {
            return char.charCodeAt(0)
        }

        function insertToSet(item, set) {
            if (item.length !== undefined) {
                item.forEach(function(subItem) {
                    set.push(subItem);
                });
            } else {
                set.push(item);
            }
        }

        function addFlag(flagObj, flagKey) {
            if (flagObj[flagKey] === true) {
                throw "duplicate flag " + flagKey
            }

            flagObj[flagKey] = true;
        }

        function ASSERT_EXISTS(obj) {
            // istanbul ignore next
            if (obj === undefined) {
                throw Error("Internal Error - Should never get here!")
            }
        }

        // istanbul ignore next
        function ASSERT_NEVER_REACH_HERE() {
            throw Error("Internal Error - Should never get here!")
        }

        var i;
        var digitsCharCodes = [];
        for (i = cc("0"); i <= cc("9"); i++) {
            digitsCharCodes.push(i);
        }

        var wordCharCodes = [cc("_")].concat(digitsCharCodes);
        for (i = cc("a"); i <= cc("z"); i++) {
            wordCharCodes.push(i);
        }

        for (i = cc("A"); i <= cc("Z"); i++) {
            wordCharCodes.push(i);
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#character-classes
        var whitespaceCodes = [
            cc(" "),
            cc("\f"),
            cc("\n"),
            cc("\r"),
            cc("\t"),
            cc("\v"),
            cc("\t"),
            cc("\u00a0"),
            cc("\u1680"),
            cc("\u2000"),
            cc("\u2001"),
            cc("\u2002"),
            cc("\u2003"),
            cc("\u2004"),
            cc("\u2005"),
            cc("\u2006"),
            cc("\u2007"),
            cc("\u2008"),
            cc("\u2009"),
            cc("\u200a"),
            cc("\u2028"),
            cc("\u2029"),
            cc("\u202f"),
            cc("\u205f"),
            cc("\u3000"),
            cc("\ufeff")
        ];

        function BaseRegExpVisitor() {}

        BaseRegExpVisitor.prototype.visitChildren = function(node) {
            for (var key in node) {
                var child = node[key];
                /* istanbul ignore else */
                if (node.hasOwnProperty(key)) {
                    if (child.type !== undefined) {
                        this.visit(child);
                    } else if (Array.isArray(child)) {
                        child.forEach(function(subChild) {
                            this.visit(subChild);
                        }, this);
                    }
                }
            }
        };

        BaseRegExpVisitor.prototype.visit = function(node) {
            switch (node.type) {
                case "Pattern":
                    this.visitPattern(node);
                    break
                case "Flags":
                    this.visitFlags(node);
                    break
                case "Disjunction":
                    this.visitDisjunction(node);
                    break
                case "Alternative":
                    this.visitAlternative(node);
                    break
                case "StartAnchor":
                    this.visitStartAnchor(node);
                    break
                case "EndAnchor":
                    this.visitEndAnchor(node);
                    break
                case "WordBoundary":
                    this.visitWordBoundary(node);
                    break
                case "NonWordBoundary":
                    this.visitNonWordBoundary(node);
                    break
                case "Lookahead":
                    this.visitLookahead(node);
                    break
                case "NegativeLookahead":
                    this.visitNegativeLookahead(node);
                    break
                case "Character":
                    this.visitCharacter(node);
                    break
                case "Set":
                    this.visitSet(node);
                    break
                case "Group":
                    this.visitGroup(node);
                    break
                case "GroupBackReference":
                    this.visitGroupBackReference(node);
                    break
                case "Quantifier":
                    this.visitQuantifier(node);
                    break
            }

            this.visitChildren(node);
        };

        BaseRegExpVisitor.prototype.visitPattern = function(node) {};

        BaseRegExpVisitor.prototype.visitFlags = function(node) {};

        BaseRegExpVisitor.prototype.visitDisjunction = function(node) {};

        BaseRegExpVisitor.prototype.visitAlternative = function(node) {};

        // Assertion
        BaseRegExpVisitor.prototype.visitStartAnchor = function(node) {};

        BaseRegExpVisitor.prototype.visitEndAnchor = function(node) {};

        BaseRegExpVisitor.prototype.visitWordBoundary = function(node) {};

        BaseRegExpVisitor.prototype.visitNonWordBoundary = function(node) {};

        BaseRegExpVisitor.prototype.visitLookahead = function(node) {};

        BaseRegExpVisitor.prototype.visitNegativeLookahead = function(node) {};

        // atoms
        BaseRegExpVisitor.prototype.visitCharacter = function(node) {};

        BaseRegExpVisitor.prototype.visitSet = function(node) {};

        BaseRegExpVisitor.prototype.visitGroup = function(node) {};

        BaseRegExpVisitor.prototype.visitGroupBackReference = function(node) {};

        BaseRegExpVisitor.prototype.visitQuantifier = function(node) {};

        return {
            RegExpParser: RegExpParser,
            BaseRegExpVisitor: BaseRegExpVisitor,
            VERSION: "0.5.0"
        }
    }
);
});

/**
 * Gets the first element of `array`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @alias first
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the first element of `array`.
 * @example
 *
 * _.head([1, 2, 3]);
 * // => 1
 *
 * _.head([]);
 * // => undefined
 */
function head(array) {
  return (array && array.length) ? array[0] : undefined;
}

var head_1 = head;

var first = head_1;

/**
 * Creates an array with all falsey values removed. The values `false`, `null`,
 * `0`, `""`, `undefined`, and `NaN` are falsey.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to compact.
 * @returns {Array} Returns the new array of filtered values.
 * @example
 *
 * _.compact([0, 1, false, 2, '', 3]);
 * // => [1, 2, 3]
 */
function compact(array) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (value) {
      result[resIndex++] = value;
    }
  }
  return result;
}

var compact_1 = compact;

/**
 * The base implementation of `_.filter` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function baseFilter(collection, predicate) {
  var result = [];
  _baseEach(collection, function(value, index, collection) {
    if (predicate(value, index, collection)) {
      result.push(value);
    }
  });
  return result;
}

var _baseFilter = baseFilter;

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that negates the result of the predicate `func`. The
 * `func` predicate is invoked with the `this` binding and arguments of the
 * created function.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Function
 * @param {Function} predicate The predicate to negate.
 * @returns {Function} Returns the new negated function.
 * @example
 *
 * function isEven(n) {
 *   return n % 2 == 0;
 * }
 *
 * _.filter([1, 2, 3, 4, 5, 6], _.negate(isEven));
 * // => [1, 3, 5]
 */
function negate(predicate) {
  if (typeof predicate != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  return function() {
    var args = arguments;
    switch (args.length) {
      case 0: return !predicate.call(this);
      case 1: return !predicate.call(this, args[0]);
      case 2: return !predicate.call(this, args[0], args[1]);
      case 3: return !predicate.call(this, args[0], args[1], args[2]);
    }
    return !predicate.apply(this, args);
  };
}

var negate_1 = negate;

/**
 * The opposite of `_.filter`; this method returns the elements of `collection`
 * that `predicate` does **not** return truthy for.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 * @see _.filter
 * @example
 *
 * var users = [
 *   { 'user': 'barney', 'age': 36, 'active': false },
 *   { 'user': 'fred',   'age': 40, 'active': true }
 * ];
 *
 * _.reject(users, function(o) { return !o.active; });
 * // => objects for ['fred']
 *
 * // The `_.matches` iteratee shorthand.
 * _.reject(users, { 'age': 40, 'active': true });
 * // => objects for ['barney']
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.reject(users, ['active', false]);
 * // => objects for ['fred']
 *
 * // The `_.property` iteratee shorthand.
 * _.reject(users, 'active');
 * // => objects for ['barney']
 */
function reject(collection, predicate) {
  var func = isArray_1(collection) ? _arrayFilter : _baseFilter;
  return func(collection, negate_1(_baseIteratee(predicate)));
}

var reject_1 = reject;

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * The base implementation of methods like `_.difference` without support
 * for excluding multiple arrays or iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Array} values The values to exclude.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of filtered values.
 */
function baseDifference(array, values, iteratee, comparator) {
  var index = -1,
      includes = _arrayIncludes,
      isCommon = true,
      length = array.length,
      result = [],
      valuesLength = values.length;

  if (!length) {
    return result;
  }
  if (iteratee) {
    values = _arrayMap(values, _baseUnary(iteratee));
  }
  if (comparator) {
    includes = _arrayIncludesWith;
    isCommon = false;
  }
  else if (values.length >= LARGE_ARRAY_SIZE) {
    includes = _cacheHas;
    isCommon = false;
    values = new _SetCache(values);
  }
  outer:
  while (++index < length) {
    var value = array[index],
        computed = iteratee == null ? value : iteratee(value);

    value = (comparator || value !== 0) ? value : 0;
    if (isCommon && computed === computed) {
      var valuesIndex = valuesLength;
      while (valuesIndex--) {
        if (values[valuesIndex] === computed) {
          continue outer;
        }
      }
      result.push(value);
    }
    else if (!includes(values, computed, comparator)) {
      result.push(value);
    }
  }
  return result;
}

var _baseDifference = baseDifference;

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike_1(value) && isArrayLike_1(value);
}

var isArrayLikeObject_1 = isArrayLikeObject;

/**
 * Creates an array of `array` values not included in the other given arrays
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons. The order and references of result values are
 * determined by the first array.
 *
 * **Note:** Unlike `_.pullAll`, this method returns a new array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to inspect.
 * @param {...Array} [values] The values to exclude.
 * @returns {Array} Returns the new array of filtered values.
 * @see _.without, _.xor
 * @example
 *
 * _.difference([2, 1], [2, 3]);
 * // => [1]
 */
var difference = _baseRest(function(array, values) {
  return isArrayLikeObject_1(array)
    ? _baseDifference(array, _baseFlatten(values, 1, isArrayLikeObject_1, true))
    : [];
});

var difference_1 = difference;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax$1 = Math.max;

/**
 * Gets the index at which the first occurrence of `value` is found in `array`
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons. If `fromIndex` is negative, it's used as the
 * offset from the end of `array`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} [fromIndex=0] The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 * @example
 *
 * _.indexOf([1, 2, 1, 2], 2);
 * // => 1
 *
 * // Search from the `fromIndex`.
 * _.indexOf([1, 2, 1, 2], 2, 2);
 * // => 3
 */
function indexOf(array, value, fromIndex) {
  var length = array == null ? 0 : array.length;
  if (!length) {
    return -1;
  }
  var index = fromIndex == null ? 0 : toInteger_1(fromIndex);
  if (index < 0) {
    index = nativeMax$1(length + index, 0);
  }
  return _baseIndexOf(array, value, index);
}

var indexOf_1 = indexOf;

/**
 * Creates a `_.find` or `_.findLast` function.
 *
 * @private
 * @param {Function} findIndexFunc The function to find the collection index.
 * @returns {Function} Returns the new find function.
 */
function createFind(findIndexFunc) {
  return function(collection, predicate, fromIndex) {
    var iterable = Object(collection);
    if (!isArrayLike_1(collection)) {
      var iteratee = _baseIteratee(predicate);
      collection = keys_1(collection);
      predicate = function(key) { return iteratee(iterable[key], key, iterable); };
    }
    var index = findIndexFunc(collection, predicate, fromIndex);
    return index > -1 ? iterable[iteratee ? collection[index] : index] : undefined;
  };
}

var _createFind = createFind;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * This method is like `_.find` except that it returns the index of the first
 * element `predicate` returns truthy for instead of the element itself.
 *
 * @static
 * @memberOf _
 * @since 1.1.0
 * @category Array
 * @param {Array} array The array to inspect.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param {number} [fromIndex=0] The index to search from.
 * @returns {number} Returns the index of the found element, else `-1`.
 * @example
 *
 * var users = [
 *   { 'user': 'barney',  'active': false },
 *   { 'user': 'fred',    'active': false },
 *   { 'user': 'pebbles', 'active': true }
 * ];
 *
 * _.findIndex(users, function(o) { return o.user == 'barney'; });
 * // => 0
 *
 * // The `_.matches` iteratee shorthand.
 * _.findIndex(users, { 'user': 'fred', 'active': false });
 * // => 1
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.findIndex(users, ['active', false]);
 * // => 0
 *
 * // The `_.property` iteratee shorthand.
 * _.findIndex(users, 'active');
 * // => 2
 */
function findIndex(array, predicate, fromIndex) {
  var length = array == null ? 0 : array.length;
  if (!length) {
    return -1;
  }
  var index = fromIndex == null ? 0 : toInteger_1(fromIndex);
  if (index < 0) {
    index = nativeMax(length + index, 0);
  }
  return _baseFindIndex(array, _baseIteratee(predicate), index);
}

var findIndex_1 = findIndex;

/**
 * Iterates over elements of `collection`, returning the first element
 * `predicate` returns truthy for. The predicate is invoked with three
 * arguments: (value, index|key, collection).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to inspect.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param {number} [fromIndex=0] The index to search from.
 * @returns {*} Returns the matched element, else `undefined`.
 * @example
 *
 * var users = [
 *   { 'user': 'barney',  'age': 36, 'active': true },
 *   { 'user': 'fred',    'age': 40, 'active': false },
 *   { 'user': 'pebbles', 'age': 1,  'active': true }
 * ];
 *
 * _.find(users, function(o) { return o.age < 40; });
 * // => object for 'barney'
 *
 * // The `_.matches` iteratee shorthand.
 * _.find(users, { 'age': 1, 'active': true });
 * // => object for 'pebbles'
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.find(users, ['active', false]);
 * // => object for 'fred'
 *
 * // The `_.property` iteratee shorthand.
 * _.find(users, 'active');
 * // => object for 'barney'
 */
var find = _createFind(findIndex_1);

var find_1 = find;

/**
 * Iterates over elements of `collection`, returning an array of all elements
 * `predicate` returns truthy for. The predicate is invoked with three
 * arguments: (value, index|key, collection).
 *
 * **Note:** Unlike `_.remove`, this method returns a new array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 * @see _.reject
 * @example
 *
 * var users = [
 *   { 'user': 'barney', 'age': 36, 'active': true },
 *   { 'user': 'fred',   'age': 40, 'active': false }
 * ];
 *
 * _.filter(users, function(o) { return !o.active; });
 * // => objects for ['fred']
 *
 * // The `_.matches` iteratee shorthand.
 * _.filter(users, { 'age': 36, 'active': true });
 * // => objects for ['barney']
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.filter(users, ['active', false]);
 * // => objects for ['fred']
 *
 * // The `_.property` iteratee shorthand.
 * _.filter(users, 'active');
 * // => objects for ['barney']
 *
 * // Combining several predicates using `_.overEvery` or `_.overSome`.
 * _.filter(users, _.overSome([{ 'age': 36 }, ['age', 40]]));
 * // => objects for ['fred', 'barney']
 */
function filter(collection, predicate) {
  var func = isArray_1(collection) ? _arrayFilter : _baseFilter;
  return func(collection, _baseIteratee(predicate));
}

var filter_1 = filter;

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * Assigns own and inherited enumerable string keyed properties of source
 * objects to the destination object for all destination properties that
 * resolve to `undefined`. Source objects are applied from left to right.
 * Once a property is set, additional values of the same property are ignored.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @see _.defaultsDeep
 * @example
 *
 * _.defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
 * // => { 'a': 1, 'b': 2 }
 */
var defaults = _baseRest(function(object, sources) {
  object = Object(object);

  var index = -1;
  var length = sources.length;
  var guard = length > 2 ? sources[2] : undefined;

  if (guard && _isIterateeCall(sources[0], sources[1], guard)) {
    length = 1;
  }

  while (++index < length) {
    var source = sources[index];
    var props = keysIn_1(source);
    var propsIndex = -1;
    var propsLength = props.length;

    while (++propsIndex < propsLength) {
      var key = props[propsIndex];
      var value = object[key];

      if (value === undefined ||
          (eq_1(value, objectProto$1[key]) && !hasOwnProperty$1.call(object, key))) {
        object[key] = source[key];
      }
    }
  }

  return object;
});

var defaults_1 = defaults;

/**
 * A specialized version of `_.reduce` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {*} [accumulator] The initial value.
 * @param {boolean} [initAccum] Specify using the first element of `array` as
 *  the initial value.
 * @returns {*} Returns the accumulated value.
 */
function arrayReduce(array, iteratee, accumulator, initAccum) {
  var index = -1,
      length = array == null ? 0 : array.length;

  if (initAccum && length) {
    accumulator = array[++index];
  }
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array);
  }
  return accumulator;
}

var _arrayReduce = arrayReduce;

/**
 * The base implementation of `_.reduce` and `_.reduceRight`, without support
 * for iteratee shorthands, which iterates over `collection` using `eachFunc`.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {*} accumulator The initial value.
 * @param {boolean} initAccum Specify using the first or last element of
 *  `collection` as the initial value.
 * @param {Function} eachFunc The function to iterate over `collection`.
 * @returns {*} Returns the accumulated value.
 */
function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
  eachFunc(collection, function(value, index, collection) {
    accumulator = initAccum
      ? (initAccum = false, value)
      : iteratee(accumulator, value, index, collection);
  });
  return accumulator;
}

var _baseReduce = baseReduce;

/**
 * Reduces `collection` to a value which is the accumulated result of running
 * each element in `collection` thru `iteratee`, where each successive
 * invocation is supplied the return value of the previous. If `accumulator`
 * is not given, the first element of `collection` is used as the initial
 * value. The iteratee is invoked with four arguments:
 * (accumulator, value, index|key, collection).
 *
 * Many lodash methods are guarded to work as iteratees for methods like
 * `_.reduce`, `_.reduceRight`, and `_.transform`.
 *
 * The guarded methods are:
 * `assign`, `defaults`, `defaultsDeep`, `includes`, `merge`, `orderBy`,
 * and `sortBy`
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [accumulator] The initial value.
 * @returns {*} Returns the accumulated value.
 * @see _.reduceRight
 * @example
 *
 * _.reduce([1, 2], function(sum, n) {
 *   return sum + n;
 * }, 0);
 * // => 3
 *
 * _.reduce({ 'a': 1, 'b': 2, 'c': 1 }, function(result, value, key) {
 *   (result[value] || (result[value] = [])).push(key);
 *   return result;
 * }, {});
 * // => { '1': ['a', 'c'], '2': ['b'] } (iteration order is not guaranteed)
 */
function reduce(collection, iteratee, accumulator) {
  var func = isArray_1(collection) ? _arrayReduce : _baseReduce,
      initAccum = arguments.length < 3;

  return func(collection, _baseIteratee(iteratee), accumulator, initAccum, _baseEach);
}

var reduce_1 = reduce;

var reg_exp_parser = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearRegExpParserCache = exports.getRegExpAst = void 0;

var regExpAstCache = {};
var regExpParser = new regexpToAst.RegExpParser();
function getRegExpAst(regExp) {
    var regExpStr = regExp.toString();
    if (regExpAstCache.hasOwnProperty(regExpStr)) {
        return regExpAstCache[regExpStr];
    }
    else {
        var regExpAst = regExpParser.pattern(regExpStr);
        regExpAstCache[regExpStr] = regExpAst;
        return regExpAst;
    }
}
exports.getRegExpAst = getRegExpAst;
function clearRegExpParserCache() {
    regExpAstCache = {};
}
exports.clearRegExpParserCache = clearRegExpParserCache;

});

var lexer_1 = lexer;

var reg_exp = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canMatchCharCode = exports.firstCharOptimizedIndices = exports.getOptimizedStartCodesIndices = exports.failedOptimizationPrefixMsg = void 0;

var isArray_1$1 = __importDefault(isArray_1);
var every_1$1 = __importDefault(every_1);
var forEach_1$1 = __importDefault(forEach_1);
var find_1$1 = __importDefault(find_1);
var values_1$1 = __importDefault(values_1);
var includes_1$1 = __importDefault(includes_1);



var complementErrorMessage = "Complement Sets are not supported for first char optimization";
exports.failedOptimizationPrefixMsg = 'Unable to use "first char" lexer optimizations:\n';
function getOptimizedStartCodesIndices(regExp, ensureOptimizations) {
    if (ensureOptimizations === void 0) { ensureOptimizations = false; }
    try {
        var ast = (0, reg_exp_parser.getRegExpAst)(regExp);
        var firstChars = firstCharOptimizedIndices(ast.value, {}, ast.flags.ignoreCase);
        return firstChars;
    }
    catch (e) {
        /* istanbul ignore next */
        // Testing this relies on the regexp-to-ast library having a bug... */
        // TODO: only the else branch needs to be ignored, try to fix with newer prettier / tsc
        if (e.message === complementErrorMessage) {
            if (ensureOptimizations) {
                (0, api$3.PRINT_WARNING)("".concat(exports.failedOptimizationPrefixMsg) +
                    "\tUnable to optimize: < ".concat(regExp.toString(), " >\n") +
                    "\tComplement Sets cannot be automatically optimized.\n" +
                    "\tThis will disable the lexer's first char optimizations.\n" +
                    "\tSee: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#COMPLEMENT for details.");
            }
        }
        else {
            var msgSuffix = "";
            if (ensureOptimizations) {
                msgSuffix =
                    "\n\tThis will disable the lexer's first char optimizations.\n" +
                        "\tSee: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#REGEXP_PARSING for details.";
            }
            (0, api$3.PRINT_ERROR)("".concat(exports.failedOptimizationPrefixMsg, "\n") +
                "\tFailed parsing: < ".concat(regExp.toString(), " >\n") +
                "\tUsing the regexp-to-ast library version: ".concat(regexpToAst.VERSION, "\n") +
                "\tPlease open an issue at: https://github.com/bd82/regexp-to-ast/issues" +
                msgSuffix);
        }
    }
    return [];
}
exports.getOptimizedStartCodesIndices = getOptimizedStartCodesIndices;
function firstCharOptimizedIndices(ast, result, ignoreCase) {
    switch (ast.type) {
        case "Disjunction":
            for (var i = 0; i < ast.value.length; i++) {
                firstCharOptimizedIndices(ast.value[i], result, ignoreCase);
            }
            break;
        case "Alternative":
            var terms = ast.value;
            for (var i = 0; i < terms.length; i++) {
                var term = terms[i];
                // skip terms that cannot effect the first char results
                switch (term.type) {
                    case "EndAnchor":
                    // A group back reference cannot affect potential starting char.
                    // because if a back reference is the first production than automatically
                    // the group being referenced has had to come BEFORE so its codes have already been added
                    case "GroupBackReference":
                    // assertions do not affect potential starting codes
                    case "Lookahead":
                    case "NegativeLookahead":
                    case "StartAnchor":
                    case "WordBoundary":
                    case "NonWordBoundary":
                        continue;
                }
                var atom = term;
                switch (atom.type) {
                    case "Character":
                        addOptimizedIdxToResult(atom.value, result, ignoreCase);
                        break;
                    case "Set":
                        if (atom.complement === true) {
                            throw Error(complementErrorMessage);
                        }
                        (0, forEach_1$1.default)(atom.value, function (code) {
                            if (typeof code === "number") {
                                addOptimizedIdxToResult(code, result, ignoreCase);
                            }
                            else {
                                // range
                                var range = code;
                                // cannot optimize when ignoreCase is
                                if (ignoreCase === true) {
                                    for (var rangeCode = range.from; rangeCode <= range.to; rangeCode++) {
                                        addOptimizedIdxToResult(rangeCode, result, ignoreCase);
                                    }
                                }
                                // Optimization (2 orders of magnitude less work for very large ranges)
                                else {
                                    // handle unoptimized values
                                    for (var rangeCode = range.from; rangeCode <= range.to && rangeCode < lexer_1.minOptimizationVal; rangeCode++) {
                                        addOptimizedIdxToResult(rangeCode, result, ignoreCase);
                                    }
                                    // Less common charCode where we optimize for faster init time, by using larger "buckets"
                                    if (range.to >= lexer_1.minOptimizationVal) {
                                        var minUnOptVal = range.from >= lexer_1.minOptimizationVal
                                            ? range.from
                                            : lexer_1.minOptimizationVal;
                                        var maxUnOptVal = range.to;
                                        var minOptIdx = (0, lexer_1.charCodeToOptimizedIndex)(minUnOptVal);
                                        var maxOptIdx = (0, lexer_1.charCodeToOptimizedIndex)(maxUnOptVal);
                                        for (var currOptIdx = minOptIdx; currOptIdx <= maxOptIdx; currOptIdx++) {
                                            result[currOptIdx] = currOptIdx;
                                        }
                                    }
                                }
                            }
                        });
                        break;
                    case "Group":
                        firstCharOptimizedIndices(atom.value, result, ignoreCase);
                        break;
                    /* istanbul ignore next */
                    default:
                        throw Error("Non Exhaustive Match");
                }
                // reached a mandatory production, no more **start** codes can be found on this alternative
                var isOptionalQuantifier = atom.quantifier !== undefined && atom.quantifier.atLeast === 0;
                if (
                // A group may be optional due to empty contents /(?:)/
                // or if everything inside it is optional /((a)?)/
                (atom.type === "Group" && isWholeOptional(atom) === false) ||
                    // If this term is not a group it may only be optional if it has an optional quantifier
                    (atom.type !== "Group" && isOptionalQuantifier === false)) {
                    break;
                }
            }
            break;
        /* istanbul ignore next */
        default:
            throw Error("non exhaustive match!");
    }
    // console.log(Object.keys(result).length)
    return (0, values_1$1.default)(result);
}
exports.firstCharOptimizedIndices = firstCharOptimizedIndices;
function addOptimizedIdxToResult(code, result, ignoreCase) {
    var optimizedCharIdx = (0, lexer_1.charCodeToOptimizedIndex)(code);
    result[optimizedCharIdx] = optimizedCharIdx;
    if (ignoreCase === true) {
        handleIgnoreCase(code, result);
    }
}
function handleIgnoreCase(code, result) {
    var char = String.fromCharCode(code);
    var upperChar = char.toUpperCase();
    /* istanbul ignore else */
    if (upperChar !== char) {
        var optimizedCharIdx = (0, lexer_1.charCodeToOptimizedIndex)(upperChar.charCodeAt(0));
        result[optimizedCharIdx] = optimizedCharIdx;
    }
    else {
        var lowerChar = char.toLowerCase();
        if (lowerChar !== char) {
            var optimizedCharIdx = (0, lexer_1.charCodeToOptimizedIndex)(lowerChar.charCodeAt(0));
            result[optimizedCharIdx] = optimizedCharIdx;
        }
    }
}
function findCode(setNode, targetCharCodes) {
    return (0, find_1$1.default)(setNode.value, function (codeOrRange) {
        if (typeof codeOrRange === "number") {
            return (0, includes_1$1.default)(targetCharCodes, codeOrRange);
        }
        else {
            // range
            var range_1 = codeOrRange;
            return ((0, find_1$1.default)(targetCharCodes, function (targetCode) { return range_1.from <= targetCode && targetCode <= range_1.to; }) !== undefined);
        }
    });
}
function isWholeOptional(ast) {
    var quantifier = ast.quantifier;
    if (quantifier && quantifier.atLeast === 0) {
        return true;
    }
    if (!ast.value) {
        return false;
    }
    return (0, isArray_1$1.default)(ast.value)
        ? (0, every_1$1.default)(ast.value, isWholeOptional)
        : isWholeOptional(ast.value);
}
var CharCodeFinder = /** @class */ (function (_super) {
    __extends(CharCodeFinder, _super);
    function CharCodeFinder(targetCharCodes) {
        var _this = _super.call(this) || this;
        _this.targetCharCodes = targetCharCodes;
        _this.found = false;
        return _this;
    }
    CharCodeFinder.prototype.visitChildren = function (node) {
        // No need to keep looking...
        if (this.found === true) {
            return;
        }
        // switch lookaheads as they do not actually consume any characters thus
        // finding a charCode at lookahead context does not mean that regexp can actually contain it in a match.
        switch (node.type) {
            case "Lookahead":
                this.visitLookahead(node);
                return;
            case "NegativeLookahead":
                this.visitNegativeLookahead(node);
                return;
        }
        _super.prototype.visitChildren.call(this, node);
    };
    CharCodeFinder.prototype.visitCharacter = function (node) {
        if ((0, includes_1$1.default)(this.targetCharCodes, node.value)) {
            this.found = true;
        }
    };
    CharCodeFinder.prototype.visitSet = function (node) {
        if (node.complement) {
            if (findCode(node, this.targetCharCodes) === undefined) {
                this.found = true;
            }
        }
        else {
            if (findCode(node, this.targetCharCodes) !== undefined) {
                this.found = true;
            }
        }
    };
    return CharCodeFinder;
}(regexpToAst.BaseRegExpVisitor));
function canMatchCharCode(charCodes, pattern) {
    if (pattern instanceof RegExp) {
        var ast = (0, reg_exp_parser.getRegExpAst)(pattern);
        var charCodeFinder = new CharCodeFinder(charCodes);
        charCodeFinder.visit(ast);
        return charCodeFinder.found;
    }
    else {
        return ((0, find_1$1.default)(pattern, function (char) {
            return (0, includes_1$1.default)(charCodes, char.charCodeAt(0));
        }) !== undefined);
    }
}
exports.canMatchCharCode = canMatchCharCode;

});

var lexer_public_1 = lexer_public;

var lexer = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.charCodeToOptimizedIndex = exports.minOptimizationVal = exports.buildLineBreakIssueMessage = exports.LineTerminatorOptimizedTester = exports.isShortPattern = exports.isCustomPattern = exports.cloneEmptyGroups = exports.performWarningRuntimeChecks = exports.performRuntimeChecks = exports.addStickyFlag = exports.addStartOfInput = exports.findUnreachablePatterns = exports.findModesThatDoNotExist = exports.findInvalidGroupType = exports.findDuplicatePatterns = exports.findUnsupportedFlags = exports.findStartOfInputAnchor = exports.findEmptyMatchRegExps = exports.findEndOfInputAnchor = exports.findInvalidPatterns = exports.findMissingPatterns = exports.validatePatterns = exports.analyzeTokenTypes = exports.enableSticky = exports.disableSticky = exports.SUPPORT_STICKY = exports.MODES = exports.DEFAULT_MODE = void 0;


var first_1 = __importDefault(first);
var isEmpty_1$1 = __importDefault(isEmpty_1);
var compact_1$1 = __importDefault(compact_1);
var isArray_1$1 = __importDefault(isArray_1);
var values_1$1 = __importDefault(values_1);
var flatten_1$1 = __importDefault(flatten_1);
var reject_1$1 = __importDefault(reject_1);
var difference_1$1 = __importDefault(difference_1);
var indexOf_1$1 = __importDefault(indexOf_1);
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var isString_1$1 = __importDefault(isString_1);
var isFunction_1$1 = __importDefault(isFunction_1);
var isUndefined_1$1 = __importDefault(isUndefined_1);
var find_1$1 = __importDefault(find_1);
var has_1$1 = __importDefault(has_1);
var keys_1$1 = __importDefault(keys_1);
var isRegExp_1$1 = __importDefault(isRegExp_1);
var filter_1$1 = __importDefault(filter_1);
var defaults_1$1 = __importDefault(defaults_1);
var reduce_1$1 = __importDefault(reduce_1);
var includes_1$1 = __importDefault(includes_1);



var PATTERN = "PATTERN";
exports.DEFAULT_MODE = "defaultMode";
exports.MODES = "modes";
exports.SUPPORT_STICKY = typeof new RegExp("(?:)").sticky === "boolean";
function disableSticky() {
    exports.SUPPORT_STICKY = false;
}
exports.disableSticky = disableSticky;
function enableSticky() {
    exports.SUPPORT_STICKY = true;
}
exports.enableSticky = enableSticky;
function analyzeTokenTypes(tokenTypes, options) {
    options = (0, defaults_1$1.default)(options, {
        useSticky: exports.SUPPORT_STICKY,
        debug: false,
        safeMode: false,
        positionTracking: "full",
        lineTerminatorCharacters: ["\r", "\n"],
        tracer: function (msg, action) { return action(); }
    });
    var tracer = options.tracer;
    tracer("initCharCodeToOptimizedIndexMap", function () {
        initCharCodeToOptimizedIndexMap();
    });
    var onlyRelevantTypes;
    tracer("Reject Lexer.NA", function () {
        onlyRelevantTypes = (0, reject_1$1.default)(tokenTypes, function (currType) {
            return currType[PATTERN] === lexer_public_1.Lexer.NA;
        });
    });
    var hasCustom = false;
    var allTransformedPatterns;
    tracer("Transform Patterns", function () {
        hasCustom = false;
        allTransformedPatterns = (0, map_1$1.default)(onlyRelevantTypes, function (currType) {
            var currPattern = currType[PATTERN];
            /* istanbul ignore else */
            if ((0, isRegExp_1$1.default)(currPattern)) {
                var regExpSource = currPattern.source;
                if (regExpSource.length === 1 &&
                    // only these regExp meta characters which can appear in a length one regExp
                    regExpSource !== "^" &&
                    regExpSource !== "$" &&
                    regExpSource !== "." &&
                    !currPattern.ignoreCase) {
                    return regExpSource;
                }
                else if (regExpSource.length === 2 &&
                    regExpSource[0] === "\\" &&
                    // not a meta character
                    !(0, includes_1$1.default)([
                        "d",
                        "D",
                        "s",
                        "S",
                        "t",
                        "r",
                        "n",
                        "t",
                        "0",
                        "c",
                        "b",
                        "B",
                        "f",
                        "v",
                        "w",
                        "W"
                    ], regExpSource[1])) {
                    // escaped meta Characters: /\+/ /\[/
                    // or redundant escaping: /\a/
                    // without the escaping "\"
                    return regExpSource[1];
                }
                else {
                    return options.useSticky
                        ? addStickyFlag(currPattern)
                        : addStartOfInput(currPattern);
                }
            }
            else if ((0, isFunction_1$1.default)(currPattern)) {
                hasCustom = true;
                // CustomPatternMatcherFunc - custom patterns do not require any transformations, only wrapping in a RegExp Like object
                return { exec: currPattern };
            }
            else if (typeof currPattern === "object") {
                hasCustom = true;
                // ICustomPattern
                return currPattern;
            }
            else if (typeof currPattern === "string") {
                if (currPattern.length === 1) {
                    return currPattern;
                }
                else {
                    var escapedRegExpString = currPattern.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
                    var wrappedRegExp = new RegExp(escapedRegExpString);
                    return options.useSticky
                        ? addStickyFlag(wrappedRegExp)
                        : addStartOfInput(wrappedRegExp);
                }
            }
            else {
                throw Error("non exhaustive match");
            }
        });
    });
    var patternIdxToType;
    var patternIdxToGroup;
    var patternIdxToLongerAltIdxArr;
    var patternIdxToPushMode;
    var patternIdxToPopMode;
    tracer("misc mapping", function () {
        patternIdxToType = (0, map_1$1.default)(onlyRelevantTypes, function (currType) { return currType.tokenTypeIdx; });
        patternIdxToGroup = (0, map_1$1.default)(onlyRelevantTypes, function (clazz) {
            var groupName = clazz.GROUP;
            /* istanbul ignore next */
            if (groupName === lexer_public_1.Lexer.SKIPPED) {
                return undefined;
            }
            else if ((0, isString_1$1.default)(groupName)) {
                return groupName;
            }
            else if ((0, isUndefined_1$1.default)(groupName)) {
                return false;
            }
            else {
                throw Error("non exhaustive match");
            }
        });
        patternIdxToLongerAltIdxArr = (0, map_1$1.default)(onlyRelevantTypes, function (clazz) {
            var longerAltType = clazz.LONGER_ALT;
            if (longerAltType) {
                var longerAltIdxArr = (0, isArray_1$1.default)(longerAltType)
                    ? (0, map_1$1.default)(longerAltType, function (type) { return (0, indexOf_1$1.default)(onlyRelevantTypes, type); })
                    : [(0, indexOf_1$1.default)(onlyRelevantTypes, longerAltType)];
                return longerAltIdxArr;
            }
        });
        patternIdxToPushMode = (0, map_1$1.default)(onlyRelevantTypes, function (clazz) { return clazz.PUSH_MODE; });
        patternIdxToPopMode = (0, map_1$1.default)(onlyRelevantTypes, function (clazz) {
            return (0, has_1$1.default)(clazz, "POP_MODE");
        });
    });
    var patternIdxToCanLineTerminator;
    tracer("Line Terminator Handling", function () {
        var lineTerminatorCharCodes = getCharCodes(options.lineTerminatorCharacters);
        patternIdxToCanLineTerminator = (0, map_1$1.default)(onlyRelevantTypes, function (tokType) { return false; });
        if (options.positionTracking !== "onlyOffset") {
            patternIdxToCanLineTerminator = (0, map_1$1.default)(onlyRelevantTypes, function (tokType) {
                if ((0, has_1$1.default)(tokType, "LINE_BREAKS")) {
                    return !!tokType.LINE_BREAKS;
                }
                else {
                    return (checkLineBreaksIssues(tokType, lineTerminatorCharCodes) === false &&
                        (0, reg_exp.canMatchCharCode)(lineTerminatorCharCodes, tokType.PATTERN));
                }
            });
        }
    });
    var patternIdxToIsCustom;
    var patternIdxToShort;
    var emptyGroups;
    var patternIdxToConfig;
    tracer("Misc Mapping #2", function () {
        patternIdxToIsCustom = (0, map_1$1.default)(onlyRelevantTypes, isCustomPattern);
        patternIdxToShort = (0, map_1$1.default)(allTransformedPatterns, isShortPattern);
        emptyGroups = (0, reduce_1$1.default)(onlyRelevantTypes, function (acc, clazz) {
            var groupName = clazz.GROUP;
            if ((0, isString_1$1.default)(groupName) && !(groupName === lexer_public_1.Lexer.SKIPPED)) {
                acc[groupName] = [];
            }
            return acc;
        }, {});
        patternIdxToConfig = (0, map_1$1.default)(allTransformedPatterns, function (x, idx) {
            return {
                pattern: allTransformedPatterns[idx],
                longerAlt: patternIdxToLongerAltIdxArr[idx],
                canLineTerminator: patternIdxToCanLineTerminator[idx],
                isCustom: patternIdxToIsCustom[idx],
                short: patternIdxToShort[idx],
                group: patternIdxToGroup[idx],
                push: patternIdxToPushMode[idx],
                pop: patternIdxToPopMode[idx],
                tokenTypeIdx: patternIdxToType[idx],
                tokenType: onlyRelevantTypes[idx]
            };
        });
    });
    var canBeOptimized = true;
    var charCodeToPatternIdxToConfig = [];
    if (!options.safeMode) {
        tracer("First Char Optimization", function () {
            charCodeToPatternIdxToConfig = (0, reduce_1$1.default)(onlyRelevantTypes, function (result, currTokType, idx) {
                if (typeof currTokType.PATTERN === "string") {
                    var charCode = currTokType.PATTERN.charCodeAt(0);
                    var optimizedIdx = charCodeToOptimizedIndex(charCode);
                    addToMapOfArrays(result, optimizedIdx, patternIdxToConfig[idx]);
                }
                else if ((0, isArray_1$1.default)(currTokType.START_CHARS_HINT)) {
                    var lastOptimizedIdx_1;
                    (0, forEach_1$1.default)(currTokType.START_CHARS_HINT, function (charOrInt) {
                        var charCode = typeof charOrInt === "string"
                            ? charOrInt.charCodeAt(0)
                            : charOrInt;
                        var currOptimizedIdx = charCodeToOptimizedIndex(charCode);
                        // Avoid adding the config multiple times
                        /* istanbul ignore else */
                        // - Difficult to check this scenario effects as it is only a performance
                        //   optimization that does not change correctness
                        if (lastOptimizedIdx_1 !== currOptimizedIdx) {
                            lastOptimizedIdx_1 = currOptimizedIdx;
                            addToMapOfArrays(result, currOptimizedIdx, patternIdxToConfig[idx]);
                        }
                    });
                }
                else if ((0, isRegExp_1$1.default)(currTokType.PATTERN)) {
                    if (currTokType.PATTERN.unicode) {
                        canBeOptimized = false;
                        if (options.ensureOptimizations) {
                            (0, api$3.PRINT_ERROR)("".concat(reg_exp.failedOptimizationPrefixMsg) +
                                "\tUnable to analyze < ".concat(currTokType.PATTERN.toString(), " > pattern.\n") +
                                "\tThe regexp unicode flag is not currently supported by the regexp-to-ast library.\n" +
                                "\tThis will disable the lexer's first char optimizations.\n" +
                                "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNICODE_OPTIMIZE");
                        }
                    }
                    else {
                        var optimizedCodes = (0, reg_exp.getOptimizedStartCodesIndices)(currTokType.PATTERN, options.ensureOptimizations);
                        /* istanbul ignore if */
                        // start code will only be empty given an empty regExp or failure of regexp-to-ast library
                        // the first should be a different validation and the second cannot be tested.
                        if ((0, isEmpty_1$1.default)(optimizedCodes)) {
                            // we cannot understand what codes may start possible matches
                            // The optimization correctness requires knowing start codes for ALL patterns.
                            // Not actually sure this is an error, no debug message
                            canBeOptimized = false;
                        }
                        (0, forEach_1$1.default)(optimizedCodes, function (code) {
                            addToMapOfArrays(result, code, patternIdxToConfig[idx]);
                        });
                    }
                }
                else {
                    if (options.ensureOptimizations) {
                        (0, api$3.PRINT_ERROR)("".concat(reg_exp.failedOptimizationPrefixMsg) +
                            "\tTokenType: <".concat(currTokType.name, "> is using a custom token pattern without providing <start_chars_hint> parameter.\n") +
                            "\tThis will disable the lexer's first char optimizations.\n" +
                            "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_OPTIMIZE");
                    }
                    canBeOptimized = false;
                }
                return result;
            }, []);
        });
    }
    return {
        emptyGroups: emptyGroups,
        patternIdxToConfig: patternIdxToConfig,
        charCodeToPatternIdxToConfig: charCodeToPatternIdxToConfig,
        hasCustom: hasCustom,
        canBeOptimized: canBeOptimized
    };
}
exports.analyzeTokenTypes = analyzeTokenTypes;
function validatePatterns(tokenTypes, validModesNames) {
    var errors = [];
    var missingResult = findMissingPatterns(tokenTypes);
    errors = errors.concat(missingResult.errors);
    var invalidResult = findInvalidPatterns(missingResult.valid);
    var validTokenTypes = invalidResult.valid;
    errors = errors.concat(invalidResult.errors);
    errors = errors.concat(validateRegExpPattern(validTokenTypes));
    errors = errors.concat(findInvalidGroupType(validTokenTypes));
    errors = errors.concat(findModesThatDoNotExist(validTokenTypes, validModesNames));
    errors = errors.concat(findUnreachablePatterns(validTokenTypes));
    return errors;
}
exports.validatePatterns = validatePatterns;
function validateRegExpPattern(tokenTypes) {
    var errors = [];
    var withRegExpPatterns = (0, filter_1$1.default)(tokenTypes, function (currTokType) {
        return (0, isRegExp_1$1.default)(currTokType[PATTERN]);
    });
    errors = errors.concat(findEndOfInputAnchor(withRegExpPatterns));
    errors = errors.concat(findStartOfInputAnchor(withRegExpPatterns));
    errors = errors.concat(findUnsupportedFlags(withRegExpPatterns));
    errors = errors.concat(findDuplicatePatterns(withRegExpPatterns));
    errors = errors.concat(findEmptyMatchRegExps(withRegExpPatterns));
    return errors;
}
function findMissingPatterns(tokenTypes) {
    var tokenTypesWithMissingPattern = (0, filter_1$1.default)(tokenTypes, function (currType) {
        return !(0, has_1$1.default)(currType, PATTERN);
    });
    var errors = (0, map_1$1.default)(tokenTypesWithMissingPattern, function (currType) {
        return {
            message: "Token Type: ->" +
                currType.name +
                "<- missing static 'PATTERN' property",
            type: lexer_public_1.LexerDefinitionErrorType.MISSING_PATTERN,
            tokenTypes: [currType]
        };
    });
    var valid = (0, difference_1$1.default)(tokenTypes, tokenTypesWithMissingPattern);
    return { errors: errors, valid: valid };
}
exports.findMissingPatterns = findMissingPatterns;
function findInvalidPatterns(tokenTypes) {
    var tokenTypesWithInvalidPattern = (0, filter_1$1.default)(tokenTypes, function (currType) {
        var pattern = currType[PATTERN];
        return (!(0, isRegExp_1$1.default)(pattern) &&
            !(0, isFunction_1$1.default)(pattern) &&
            !(0, has_1$1.default)(pattern, "exec") &&
            !(0, isString_1$1.default)(pattern));
    });
    var errors = (0, map_1$1.default)(tokenTypesWithInvalidPattern, function (currType) {
        return {
            message: "Token Type: ->" +
                currType.name +
                "<- static 'PATTERN' can only be a RegExp, a" +
                " Function matching the {CustomPatternMatcherFunc} type or an Object matching the {ICustomPattern} interface.",
            type: lexer_public_1.LexerDefinitionErrorType.INVALID_PATTERN,
            tokenTypes: [currType]
        };
    });
    var valid = (0, difference_1$1.default)(tokenTypes, tokenTypesWithInvalidPattern);
    return { errors: errors, valid: valid };
}
exports.findInvalidPatterns = findInvalidPatterns;
var end_of_input = /[^\\][$]/;
function findEndOfInputAnchor(tokenTypes) {
    var EndAnchorFinder = /** @class */ (function (_super) {
        __extends(EndAnchorFinder, _super);
        function EndAnchorFinder() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.found = false;
            return _this;
        }
        EndAnchorFinder.prototype.visitEndAnchor = function (node) {
            this.found = true;
        };
        return EndAnchorFinder;
    }(regexpToAst.BaseRegExpVisitor));
    var invalidRegex = (0, filter_1$1.default)(tokenTypes, function (currType) {
        var pattern = currType.PATTERN;
        try {
            var regexpAst = (0, reg_exp_parser.getRegExpAst)(pattern);
            var endAnchorVisitor = new EndAnchorFinder();
            endAnchorVisitor.visit(regexpAst);
            return endAnchorVisitor.found;
        }
        catch (e) {
            // old behavior in case of runtime exceptions with regexp-to-ast.
            /* istanbul ignore next - cannot ensure an error in regexp-to-ast*/
            return end_of_input.test(pattern.source);
        }
    });
    var errors = (0, map_1$1.default)(invalidRegex, function (currType) {
        return {
            message: "Unexpected RegExp Anchor Error:\n" +
                "\tToken Type: ->" +
                currType.name +
                "<- static 'PATTERN' cannot contain end of input anchor '$'\n" +
                "\tSee chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS" +
                "\tfor details.",
            type: lexer_public_1.LexerDefinitionErrorType.EOI_ANCHOR_FOUND,
            tokenTypes: [currType]
        };
    });
    return errors;
}
exports.findEndOfInputAnchor = findEndOfInputAnchor;
function findEmptyMatchRegExps(tokenTypes) {
    var matchesEmptyString = (0, filter_1$1.default)(tokenTypes, function (currType) {
        var pattern = currType.PATTERN;
        return pattern.test("");
    });
    var errors = (0, map_1$1.default)(matchesEmptyString, function (currType) {
        return {
            message: "Token Type: ->" +
                currType.name +
                "<- static 'PATTERN' must not match an empty string",
            type: lexer_public_1.LexerDefinitionErrorType.EMPTY_MATCH_PATTERN,
            tokenTypes: [currType]
        };
    });
    return errors;
}
exports.findEmptyMatchRegExps = findEmptyMatchRegExps;
var start_of_input = /[^\\[][\^]|^\^/;
function findStartOfInputAnchor(tokenTypes) {
    var StartAnchorFinder = /** @class */ (function (_super) {
        __extends(StartAnchorFinder, _super);
        function StartAnchorFinder() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.found = false;
            return _this;
        }
        StartAnchorFinder.prototype.visitStartAnchor = function (node) {
            this.found = true;
        };
        return StartAnchorFinder;
    }(regexpToAst.BaseRegExpVisitor));
    var invalidRegex = (0, filter_1$1.default)(tokenTypes, function (currType) {
        var pattern = currType.PATTERN;
        try {
            var regexpAst = (0, reg_exp_parser.getRegExpAst)(pattern);
            var startAnchorVisitor = new StartAnchorFinder();
            startAnchorVisitor.visit(regexpAst);
            return startAnchorVisitor.found;
        }
        catch (e) {
            // old behavior in case of runtime exceptions with regexp-to-ast.
            /* istanbul ignore next - cannot ensure an error in regexp-to-ast*/
            return start_of_input.test(pattern.source);
        }
    });
    var errors = (0, map_1$1.default)(invalidRegex, function (currType) {
        return {
            message: "Unexpected RegExp Anchor Error:\n" +
                "\tToken Type: ->" +
                currType.name +
                "<- static 'PATTERN' cannot contain start of input anchor '^'\n" +
                "\tSee https://chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS" +
                "\tfor details.",
            type: lexer_public_1.LexerDefinitionErrorType.SOI_ANCHOR_FOUND,
            tokenTypes: [currType]
        };
    });
    return errors;
}
exports.findStartOfInputAnchor = findStartOfInputAnchor;
function findUnsupportedFlags(tokenTypes) {
    var invalidFlags = (0, filter_1$1.default)(tokenTypes, function (currType) {
        var pattern = currType[PATTERN];
        return pattern instanceof RegExp && (pattern.multiline || pattern.global);
    });
    var errors = (0, map_1$1.default)(invalidFlags, function (currType) {
        return {
            message: "Token Type: ->" +
                currType.name +
                "<- static 'PATTERN' may NOT contain global('g') or multiline('m')",
            type: lexer_public_1.LexerDefinitionErrorType.UNSUPPORTED_FLAGS_FOUND,
            tokenTypes: [currType]
        };
    });
    return errors;
}
exports.findUnsupportedFlags = findUnsupportedFlags;
// This can only test for identical duplicate RegExps, not semantically equivalent ones.
function findDuplicatePatterns(tokenTypes) {
    var found = [];
    var identicalPatterns = (0, map_1$1.default)(tokenTypes, function (outerType) {
        return (0, reduce_1$1.default)(tokenTypes, function (result, innerType) {
            if (outerType.PATTERN.source === innerType.PATTERN.source &&
                !(0, includes_1$1.default)(found, innerType) &&
                innerType.PATTERN !== lexer_public_1.Lexer.NA) {
                // this avoids duplicates in the result, each Token Type may only appear in one "set"
                // in essence we are creating Equivalence classes on equality relation.
                found.push(innerType);
                result.push(innerType);
                return result;
            }
            return result;
        }, []);
    });
    identicalPatterns = (0, compact_1$1.default)(identicalPatterns);
    var duplicatePatterns = (0, filter_1$1.default)(identicalPatterns, function (currIdenticalSet) {
        return currIdenticalSet.length > 1;
    });
    var errors = (0, map_1$1.default)(duplicatePatterns, function (setOfIdentical) {
        var tokenTypeNames = (0, map_1$1.default)(setOfIdentical, function (currType) {
            return currType.name;
        });
        var dupPatternSrc = (0, first_1.default)(setOfIdentical).PATTERN;
        return {
            message: "The same RegExp pattern ->".concat(dupPatternSrc, "<-") +
                "has been used in all of the following Token Types: ".concat(tokenTypeNames.join(", "), " <-"),
            type: lexer_public_1.LexerDefinitionErrorType.DUPLICATE_PATTERNS_FOUND,
            tokenTypes: setOfIdentical
        };
    });
    return errors;
}
exports.findDuplicatePatterns = findDuplicatePatterns;
function findInvalidGroupType(tokenTypes) {
    var invalidTypes = (0, filter_1$1.default)(tokenTypes, function (clazz) {
        if (!(0, has_1$1.default)(clazz, "GROUP")) {
            return false;
        }
        var group = clazz.GROUP;
        return group !== lexer_public_1.Lexer.SKIPPED && group !== lexer_public_1.Lexer.NA && !(0, isString_1$1.default)(group);
    });
    var errors = (0, map_1$1.default)(invalidTypes, function (currType) {
        return {
            message: "Token Type: ->" +
                currType.name +
                "<- static 'GROUP' can only be Lexer.SKIPPED/Lexer.NA/A String",
            type: lexer_public_1.LexerDefinitionErrorType.INVALID_GROUP_TYPE_FOUND,
            tokenTypes: [currType]
        };
    });
    return errors;
}
exports.findInvalidGroupType = findInvalidGroupType;
function findModesThatDoNotExist(tokenTypes, validModes) {
    var invalidModes = (0, filter_1$1.default)(tokenTypes, function (clazz) {
        return (clazz.PUSH_MODE !== undefined && !(0, includes_1$1.default)(validModes, clazz.PUSH_MODE));
    });
    var errors = (0, map_1$1.default)(invalidModes, function (tokType) {
        var msg = "Token Type: ->".concat(tokType.name, "<- static 'PUSH_MODE' value cannot refer to a Lexer Mode ->").concat(tokType.PUSH_MODE, "<-") +
            "which does not exist";
        return {
            message: msg,
            type: lexer_public_1.LexerDefinitionErrorType.PUSH_MODE_DOES_NOT_EXIST,
            tokenTypes: [tokType]
        };
    });
    return errors;
}
exports.findModesThatDoNotExist = findModesThatDoNotExist;
function findUnreachablePatterns(tokenTypes) {
    var errors = [];
    var canBeTested = (0, reduce_1$1.default)(tokenTypes, function (result, tokType, idx) {
        var pattern = tokType.PATTERN;
        if (pattern === lexer_public_1.Lexer.NA) {
            return result;
        }
        // a more comprehensive validation for all forms of regExps would require
        // deeper regExp analysis capabilities
        if ((0, isString_1$1.default)(pattern)) {
            result.push({ str: pattern, idx: idx, tokenType: tokType });
        }
        else if ((0, isRegExp_1$1.default)(pattern) && noMetaChar(pattern)) {
            result.push({ str: pattern.source, idx: idx, tokenType: tokType });
        }
        return result;
    }, []);
    (0, forEach_1$1.default)(tokenTypes, function (tokType, testIdx) {
        (0, forEach_1$1.default)(canBeTested, function (_a) {
            var str = _a.str, idx = _a.idx, tokenType = _a.tokenType;
            if (testIdx < idx && testTokenType(str, tokType.PATTERN)) {
                var msg = "Token: ->".concat(tokenType.name, "<- can never be matched.\n") +
                    "Because it appears AFTER the Token Type ->".concat(tokType.name, "<-") +
                    "in the lexer's definition.\n" +
                    "See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNREACHABLE";
                errors.push({
                    message: msg,
                    type: lexer_public_1.LexerDefinitionErrorType.UNREACHABLE_PATTERN,
                    tokenTypes: [tokType, tokenType]
                });
            }
        });
    });
    return errors;
}
exports.findUnreachablePatterns = findUnreachablePatterns;
function testTokenType(str, pattern) {
    /* istanbul ignore else */
    if ((0, isRegExp_1$1.default)(pattern)) {
        var regExpArray = pattern.exec(str);
        return regExpArray !== null && regExpArray.index === 0;
    }
    else if ((0, isFunction_1$1.default)(pattern)) {
        // maintain the API of custom patterns
        return pattern(str, 0, [], {});
    }
    else if ((0, has_1$1.default)(pattern, "exec")) {
        // maintain the API of custom patterns
        return pattern.exec(str, 0, [], {});
    }
    else if (typeof pattern === "string") {
        return pattern === str;
    }
    else {
        throw Error("non exhaustive match");
    }
}
function noMetaChar(regExp) {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
    var metaChars = [
        ".",
        "\\",
        "[",
        "]",
        "|",
        "^",
        "$",
        "(",
        ")",
        "?",
        "*",
        "+",
        "{"
    ];
    return ((0, find_1$1.default)(metaChars, function (char) { return regExp.source.indexOf(char) !== -1; }) === undefined);
}
function addStartOfInput(pattern) {
    var flags = pattern.ignoreCase ? "i" : "";
    // always wrapping in a none capturing group preceded by '^' to make sure matching can only work on start of input.
    // duplicate/redundant start of input markers have no meaning (/^^^^A/ === /^A/)
    return new RegExp("^(?:".concat(pattern.source, ")"), flags);
}
exports.addStartOfInput = addStartOfInput;
function addStickyFlag(pattern) {
    var flags = pattern.ignoreCase ? "iy" : "y";
    // always wrapping in a none capturing group preceded by '^' to make sure matching can only work on start of input.
    // duplicate/redundant start of input markers have no meaning (/^^^^A/ === /^A/)
    return new RegExp("".concat(pattern.source), flags);
}
exports.addStickyFlag = addStickyFlag;
function performRuntimeChecks(lexerDefinition, trackLines, lineTerminatorCharacters) {
    var errors = [];
    // some run time checks to help the end users.
    if (!(0, has_1$1.default)(lexerDefinition, exports.DEFAULT_MODE)) {
        errors.push({
            message: "A MultiMode Lexer cannot be initialized without a <" +
                exports.DEFAULT_MODE +
                "> property in its definition\n",
            type: lexer_public_1.LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE
        });
    }
    if (!(0, has_1$1.default)(lexerDefinition, exports.MODES)) {
        errors.push({
            message: "A MultiMode Lexer cannot be initialized without a <" +
                exports.MODES +
                "> property in its definition\n",
            type: lexer_public_1.LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY
        });
    }
    if ((0, has_1$1.default)(lexerDefinition, exports.MODES) &&
        (0, has_1$1.default)(lexerDefinition, exports.DEFAULT_MODE) &&
        !(0, has_1$1.default)(lexerDefinition.modes, lexerDefinition.defaultMode)) {
        errors.push({
            message: "A MultiMode Lexer cannot be initialized with a ".concat(exports.DEFAULT_MODE, ": <").concat(lexerDefinition.defaultMode, ">") +
                "which does not exist\n",
            type: lexer_public_1.LexerDefinitionErrorType.MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST
        });
    }
    if ((0, has_1$1.default)(lexerDefinition, exports.MODES)) {
        (0, forEach_1$1.default)(lexerDefinition.modes, function (currModeValue, currModeName) {
            (0, forEach_1$1.default)(currModeValue, function (currTokType, currIdx) {
                if ((0, isUndefined_1$1.default)(currTokType)) {
                    errors.push({
                        message: "A Lexer cannot be initialized using an undefined Token Type. Mode:" +
                            "<".concat(currModeName, "> at index: <").concat(currIdx, ">\n"),
                        type: lexer_public_1.LexerDefinitionErrorType.LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED
                    });
                }
                else if ((0, has_1$1.default)(currTokType, "LONGER_ALT")) {
                    var longerAlt = (0, isArray_1$1.default)(currTokType.LONGER_ALT)
                        ? currTokType.LONGER_ALT
                        : [currTokType.LONGER_ALT];
                    (0, forEach_1$1.default)(longerAlt, function (currLongerAlt) {
                        if (!(0, isUndefined_1$1.default)(currLongerAlt) &&
                            !(0, includes_1$1.default)(currModeValue, currLongerAlt)) {
                            errors.push({
                                message: "A MultiMode Lexer cannot be initialized with a longer_alt <".concat(currLongerAlt.name, "> on token <").concat(currTokType.name, "> outside of mode <").concat(currModeName, ">\n"),
                                type: lexer_public_1.LexerDefinitionErrorType.MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE
                            });
                        }
                    });
                }
            });
        });
    }
    return errors;
}
exports.performRuntimeChecks = performRuntimeChecks;
function performWarningRuntimeChecks(lexerDefinition, trackLines, lineTerminatorCharacters) {
    var warnings = [];
    var hasAnyLineBreak = false;
    var allTokenTypes = (0, compact_1$1.default)((0, flatten_1$1.default)((0, values_1$1.default)(lexerDefinition.modes)));
    var concreteTokenTypes = (0, reject_1$1.default)(allTokenTypes, function (currType) { return currType[PATTERN] === lexer_public_1.Lexer.NA; });
    var terminatorCharCodes = getCharCodes(lineTerminatorCharacters);
    if (trackLines) {
        (0, forEach_1$1.default)(concreteTokenTypes, function (tokType) {
            var currIssue = checkLineBreaksIssues(tokType, terminatorCharCodes);
            if (currIssue !== false) {
                var message = buildLineBreakIssueMessage(tokType, currIssue);
                var warningDescriptor = {
                    message: message,
                    type: currIssue.issue,
                    tokenType: tokType
                };
                warnings.push(warningDescriptor);
            }
            else {
                // we don't want to attempt to scan if the user explicitly specified the line_breaks option.
                if ((0, has_1$1.default)(tokType, "LINE_BREAKS")) {
                    if (tokType.LINE_BREAKS === true) {
                        hasAnyLineBreak = true;
                    }
                }
                else {
                    if ((0, reg_exp.canMatchCharCode)(terminatorCharCodes, tokType.PATTERN)) {
                        hasAnyLineBreak = true;
                    }
                }
            }
        });
    }
    if (trackLines && !hasAnyLineBreak) {
        warnings.push({
            message: "Warning: No LINE_BREAKS Found.\n" +
                "\tThis Lexer has been defined to track line and column information,\n" +
                "\tBut none of the Token Types can be identified as matching a line terminator.\n" +
                "\tSee https://chevrotain.io/docs/guide/resolving_lexer_errors.html#LINE_BREAKS \n" +
                "\tfor details.",
            type: lexer_public_1.LexerDefinitionErrorType.NO_LINE_BREAKS_FLAGS
        });
    }
    return warnings;
}
exports.performWarningRuntimeChecks = performWarningRuntimeChecks;
function cloneEmptyGroups(emptyGroups) {
    var clonedResult = {};
    var groupKeys = (0, keys_1$1.default)(emptyGroups);
    (0, forEach_1$1.default)(groupKeys, function (currKey) {
        var currGroupValue = emptyGroups[currKey];
        /* istanbul ignore else */
        if ((0, isArray_1$1.default)(currGroupValue)) {
            clonedResult[currKey] = [];
        }
        else {
            throw Error("non exhaustive match");
        }
    });
    return clonedResult;
}
exports.cloneEmptyGroups = cloneEmptyGroups;
// TODO: refactor to avoid duplication
function isCustomPattern(tokenType) {
    var pattern = tokenType.PATTERN;
    /* istanbul ignore else */
    if ((0, isRegExp_1$1.default)(pattern)) {
        return false;
    }
    else if ((0, isFunction_1$1.default)(pattern)) {
        // CustomPatternMatcherFunc - custom patterns do not require any transformations, only wrapping in a RegExp Like object
        return true;
    }
    else if ((0, has_1$1.default)(pattern, "exec")) {
        // ICustomPattern
        return true;
    }
    else if ((0, isString_1$1.default)(pattern)) {
        return false;
    }
    else {
        throw Error("non exhaustive match");
    }
}
exports.isCustomPattern = isCustomPattern;
function isShortPattern(pattern) {
    if ((0, isString_1$1.default)(pattern) && pattern.length === 1) {
        return pattern.charCodeAt(0);
    }
    else {
        return false;
    }
}
exports.isShortPattern = isShortPattern;
/**
 * Faster than using a RegExp for default newline detection during lexing.
 */
exports.LineTerminatorOptimizedTester = {
    // implements /\n|\r\n?/g.test
    test: function (text) {
        var len = text.length;
        for (var i = this.lastIndex; i < len; i++) {
            var c = text.charCodeAt(i);
            if (c === 10) {
                this.lastIndex = i + 1;
                return true;
            }
            else if (c === 13) {
                if (text.charCodeAt(i + 1) === 10) {
                    this.lastIndex = i + 2;
                }
                else {
                    this.lastIndex = i + 1;
                }
                return true;
            }
        }
        return false;
    },
    lastIndex: 0
};
function checkLineBreaksIssues(tokType, lineTerminatorCharCodes) {
    if ((0, has_1$1.default)(tokType, "LINE_BREAKS")) {
        // if the user explicitly declared the line_breaks option we will respect their choice
        // and assume it is correct.
        return false;
    }
    else {
        /* istanbul ignore else */
        if ((0, isRegExp_1$1.default)(tokType.PATTERN)) {
            try {
                // TODO: why is the casting suddenly needed?
                (0, reg_exp.canMatchCharCode)(lineTerminatorCharCodes, tokType.PATTERN);
            }
            catch (e) {
                /* istanbul ignore next - to test this we would have to mock <canMatchCharCode> to throw an error */
                return {
                    issue: lexer_public_1.LexerDefinitionErrorType.IDENTIFY_TERMINATOR,
                    errMsg: e.message
                };
            }
            return false;
        }
        else if ((0, isString_1$1.default)(tokType.PATTERN)) {
            // string literal patterns can always be analyzed to detect line terminator usage
            return false;
        }
        else if (isCustomPattern(tokType)) {
            // custom token types
            return { issue: lexer_public_1.LexerDefinitionErrorType.CUSTOM_LINE_BREAK };
        }
        else {
            throw Error("non exhaustive match");
        }
    }
}
function buildLineBreakIssueMessage(tokType, details) {
    /* istanbul ignore else */
    if (details.issue === lexer_public_1.LexerDefinitionErrorType.IDENTIFY_TERMINATOR) {
        return ("Warning: unable to identify line terminator usage in pattern.\n" +
            "\tThe problem is in the <".concat(tokType.name, "> Token Type\n") +
            "\t Root cause: ".concat(details.errMsg, ".\n") +
            "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#IDENTIFY_TERMINATOR");
    }
    else if (details.issue === lexer_public_1.LexerDefinitionErrorType.CUSTOM_LINE_BREAK) {
        return ("Warning: A Custom Token Pattern should specify the <line_breaks> option.\n" +
            "\tThe problem is in the <".concat(tokType.name, "> Token Type\n") +
            "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_LINE_BREAK");
    }
    else {
        throw Error("non exhaustive match");
    }
}
exports.buildLineBreakIssueMessage = buildLineBreakIssueMessage;
function getCharCodes(charsOrCodes) {
    var charCodes = (0, map_1$1.default)(charsOrCodes, function (numOrString) {
        if ((0, isString_1$1.default)(numOrString)) {
            return numOrString.charCodeAt(0);
        }
        else {
            return numOrString;
        }
    });
    return charCodes;
}
function addToMapOfArrays(map, key, value) {
    if (map[key] === undefined) {
        map[key] = [value];
    }
    else {
        map[key].push(value);
    }
}
exports.minOptimizationVal = 256;
/**
 * We are mapping charCode above ASCI (256) into buckets each in the size of 256.
 * This is because ASCI are the most common start chars so each one of those will get its own
 * possible token configs vector.
 *
 * Tokens starting with charCodes "above" ASCI are uncommon, so we can "afford"
 * to place these into buckets of possible token configs, What we gain from
 * this is avoiding the case of creating an optimization 'charCodeToPatternIdxToConfig'
 * which would contain 10,000+ arrays of small size (e.g unicode Identifiers scenario).
 * Our 'charCodeToPatternIdxToConfig' max size will now be:
 * 256 + (2^16 / 2^8) - 1 === 511
 *
 * note the hack for fast division integer part extraction
 * See: https://stackoverflow.com/a/4228528
 */
var charCodeToOptimizedIdxMap = [];
function charCodeToOptimizedIndex(charCode) {
    return charCode < exports.minOptimizationVal
        ? charCode
        : charCodeToOptimizedIdxMap[charCode];
}
exports.charCodeToOptimizedIndex = charCodeToOptimizedIndex;
/**
 * This is a compromise between cold start / hot running performance
 * Creating this array takes ~3ms on a modern machine,
 * But if we perform the computation at runtime as needed the CSS Lexer benchmark
 * performance degrades by ~10%
 *
 * TODO: Perhaps it should be lazy initialized only if a charCode > 255 is used.
 */
function initCharCodeToOptimizedIndexMap() {
    if ((0, isEmpty_1$1.default)(charCodeToOptimizedIdxMap)) {
        charCodeToOptimizedIdxMap = new Array(65536);
        for (var i = 0; i < 65536; i++) {
            charCodeToOptimizedIdxMap[i] = i > 255 ? 255 + ~~(i / 255) : i;
        }
    }
}

});

/**
 * Gets the last element of `array`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the last element of `array`.
 * @example
 *
 * _.last([1, 2, 3]);
 * // => 3
 */
function last(array) {
  var length = array == null ? 0 : array.length;
  return length ? array[length - 1] : undefined;
}

var last_1 = last;

var tokens = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTokenType = exports.hasExtendingTokensTypesMapProperty = exports.hasExtendingTokensTypesProperty = exports.hasCategoriesProperty = exports.hasShortKeyProperty = exports.singleAssignCategoriesToksMap = exports.assignCategoriesMapProp = exports.assignCategoriesTokensProp = exports.assignTokenDefaultProps = exports.expandCategories = exports.augmentTokenTypes = exports.tokenIdxToClass = exports.tokenShortNameIdx = exports.tokenStructuredMatcherNoCategories = exports.tokenStructuredMatcher = void 0;
var isEmpty_1$1 = __importDefault(isEmpty_1);
var compact_1$1 = __importDefault(compact_1);
var isArray_1$1 = __importDefault(isArray_1);
var flatten_1$1 = __importDefault(flatten_1);
var difference_1$1 = __importDefault(difference_1);
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var has_1$1 = __importDefault(has_1);
var includes_1$1 = __importDefault(includes_1);
var clone_1$1 = __importDefault(clone_1);
function tokenStructuredMatcher(tokInstance, tokConstructor) {
    var instanceType = tokInstance.tokenTypeIdx;
    if (instanceType === tokConstructor.tokenTypeIdx) {
        return true;
    }
    else {
        return (tokConstructor.isParent === true &&
            tokConstructor.categoryMatchesMap[instanceType] === true);
    }
}
exports.tokenStructuredMatcher = tokenStructuredMatcher;
// Optimized tokenMatcher in case our grammar does not use token categories
// Being so tiny it is much more likely to be in-lined and this avoid the function call overhead
function tokenStructuredMatcherNoCategories(token, tokType) {
    return token.tokenTypeIdx === tokType.tokenTypeIdx;
}
exports.tokenStructuredMatcherNoCategories = tokenStructuredMatcherNoCategories;
exports.tokenShortNameIdx = 1;
exports.tokenIdxToClass = {};
function augmentTokenTypes(tokenTypes) {
    // collect the parent Token Types as well.
    var tokenTypesAndParents = expandCategories(tokenTypes);
    // add required tokenType and categoryMatches properties
    assignTokenDefaultProps(tokenTypesAndParents);
    // fill up the categoryMatches
    assignCategoriesMapProp(tokenTypesAndParents);
    assignCategoriesTokensProp(tokenTypesAndParents);
    (0, forEach_1$1.default)(tokenTypesAndParents, function (tokType) {
        tokType.isParent = tokType.categoryMatches.length > 0;
    });
}
exports.augmentTokenTypes = augmentTokenTypes;
function expandCategories(tokenTypes) {
    var result = (0, clone_1$1.default)(tokenTypes);
    var categories = tokenTypes;
    var searching = true;
    while (searching) {
        categories = (0, compact_1$1.default)((0, flatten_1$1.default)((0, map_1$1.default)(categories, function (currTokType) { return currTokType.CATEGORIES; })));
        var newCategories = (0, difference_1$1.default)(categories, result);
        result = result.concat(newCategories);
        if ((0, isEmpty_1$1.default)(newCategories)) {
            searching = false;
        }
        else {
            categories = newCategories;
        }
    }
    return result;
}
exports.expandCategories = expandCategories;
function assignTokenDefaultProps(tokenTypes) {
    (0, forEach_1$1.default)(tokenTypes, function (currTokType) {
        if (!hasShortKeyProperty(currTokType)) {
            exports.tokenIdxToClass[exports.tokenShortNameIdx] = currTokType;
            currTokType.tokenTypeIdx = exports.tokenShortNameIdx++;
        }
        // CATEGORIES? : TokenType | TokenType[]
        if (hasCategoriesProperty(currTokType) &&
            !(0, isArray_1$1.default)(currTokType.CATEGORIES)
        // &&
        // !isUndefined(currTokType.CATEGORIES.PATTERN)
        ) {
            currTokType.CATEGORIES = [currTokType.CATEGORIES];
        }
        if (!hasCategoriesProperty(currTokType)) {
            currTokType.CATEGORIES = [];
        }
        if (!hasExtendingTokensTypesProperty(currTokType)) {
            currTokType.categoryMatches = [];
        }
        if (!hasExtendingTokensTypesMapProperty(currTokType)) {
            currTokType.categoryMatchesMap = {};
        }
    });
}
exports.assignTokenDefaultProps = assignTokenDefaultProps;
function assignCategoriesTokensProp(tokenTypes) {
    (0, forEach_1$1.default)(tokenTypes, function (currTokType) {
        // avoid duplications
        currTokType.categoryMatches = [];
        (0, forEach_1$1.default)(currTokType.categoryMatchesMap, function (val, key) {
            currTokType.categoryMatches.push(exports.tokenIdxToClass[key].tokenTypeIdx);
        });
    });
}
exports.assignCategoriesTokensProp = assignCategoriesTokensProp;
function assignCategoriesMapProp(tokenTypes) {
    (0, forEach_1$1.default)(tokenTypes, function (currTokType) {
        singleAssignCategoriesToksMap([], currTokType);
    });
}
exports.assignCategoriesMapProp = assignCategoriesMapProp;
function singleAssignCategoriesToksMap(path, nextNode) {
    (0, forEach_1$1.default)(path, function (pathNode) {
        nextNode.categoryMatchesMap[pathNode.tokenTypeIdx] = true;
    });
    (0, forEach_1$1.default)(nextNode.CATEGORIES, function (nextCategory) {
        var newPath = path.concat(nextNode);
        // avoids infinite loops due to cyclic categories.
        if (!(0, includes_1$1.default)(newPath, nextCategory)) {
            singleAssignCategoriesToksMap(newPath, nextCategory);
        }
    });
}
exports.singleAssignCategoriesToksMap = singleAssignCategoriesToksMap;
function hasShortKeyProperty(tokType) {
    return (0, has_1$1.default)(tokType, "tokenTypeIdx");
}
exports.hasShortKeyProperty = hasShortKeyProperty;
function hasCategoriesProperty(tokType) {
    return (0, has_1$1.default)(tokType, "CATEGORIES");
}
exports.hasCategoriesProperty = hasCategoriesProperty;
function hasExtendingTokensTypesProperty(tokType) {
    return (0, has_1$1.default)(tokType, "categoryMatches");
}
exports.hasExtendingTokensTypesProperty = hasExtendingTokensTypesProperty;
function hasExtendingTokensTypesMapProperty(tokType) {
    return (0, has_1$1.default)(tokType, "categoryMatchesMap");
}
exports.hasExtendingTokensTypesMapProperty = hasExtendingTokensTypesMapProperty;
function isTokenType(tokType) {
    return (0, has_1$1.default)(tokType, "tokenTypeIdx");
}
exports.isTokenType = isTokenType;

});

var lexer_errors_public = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLexerErrorProvider = void 0;
exports.defaultLexerErrorProvider = {
    buildUnableToPopLexerModeMessage: function (token) {
        return "Unable to pop Lexer Mode after encountering Token ->".concat(token.image, "<- The Mode Stack is empty");
    },
    buildUnexpectedCharactersMessage: function (fullText, startOffset, length, line, column) {
        return ("unexpected character: ->".concat(fullText.charAt(startOffset), "<- at offset: ").concat(startOffset, ",") + " skipped ".concat(length, " characters."));
    }
};

});

var lexer_public = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.LexerDefinitionErrorType = void 0;

var noop_1$1 = __importDefault(noop_1);
var isEmpty_1$1 = __importDefault(isEmpty_1);
var isArray_1$1 = __importDefault(isArray_1);
var last_1$1 = __importDefault(last_1);
var reject_1$1 = __importDefault(reject_1);
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var keys_1$1 = __importDefault(keys_1);
var isUndefined_1$1 = __importDefault(isUndefined_1);
var identity_1$1 = __importDefault(identity_1);
var assign_1$1 = __importDefault(assign_1);
var reduce_1$1 = __importDefault(reduce_1);
var clone_1$1 = __importDefault(clone_1);
(function (LexerDefinitionErrorType) {
    LexerDefinitionErrorType[LexerDefinitionErrorType["MISSING_PATTERN"] = 0] = "MISSING_PATTERN";
    LexerDefinitionErrorType[LexerDefinitionErrorType["INVALID_PATTERN"] = 1] = "INVALID_PATTERN";
    LexerDefinitionErrorType[LexerDefinitionErrorType["EOI_ANCHOR_FOUND"] = 2] = "EOI_ANCHOR_FOUND";
    LexerDefinitionErrorType[LexerDefinitionErrorType["UNSUPPORTED_FLAGS_FOUND"] = 3] = "UNSUPPORTED_FLAGS_FOUND";
    LexerDefinitionErrorType[LexerDefinitionErrorType["DUPLICATE_PATTERNS_FOUND"] = 4] = "DUPLICATE_PATTERNS_FOUND";
    LexerDefinitionErrorType[LexerDefinitionErrorType["INVALID_GROUP_TYPE_FOUND"] = 5] = "INVALID_GROUP_TYPE_FOUND";
    LexerDefinitionErrorType[LexerDefinitionErrorType["PUSH_MODE_DOES_NOT_EXIST"] = 6] = "PUSH_MODE_DOES_NOT_EXIST";
    LexerDefinitionErrorType[LexerDefinitionErrorType["MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE"] = 7] = "MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE";
    LexerDefinitionErrorType[LexerDefinitionErrorType["MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY"] = 8] = "MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY";
    LexerDefinitionErrorType[LexerDefinitionErrorType["MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST"] = 9] = "MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST";
    LexerDefinitionErrorType[LexerDefinitionErrorType["LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED"] = 10] = "LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED";
    LexerDefinitionErrorType[LexerDefinitionErrorType["SOI_ANCHOR_FOUND"] = 11] = "SOI_ANCHOR_FOUND";
    LexerDefinitionErrorType[LexerDefinitionErrorType["EMPTY_MATCH_PATTERN"] = 12] = "EMPTY_MATCH_PATTERN";
    LexerDefinitionErrorType[LexerDefinitionErrorType["NO_LINE_BREAKS_FLAGS"] = 13] = "NO_LINE_BREAKS_FLAGS";
    LexerDefinitionErrorType[LexerDefinitionErrorType["UNREACHABLE_PATTERN"] = 14] = "UNREACHABLE_PATTERN";
    LexerDefinitionErrorType[LexerDefinitionErrorType["IDENTIFY_TERMINATOR"] = 15] = "IDENTIFY_TERMINATOR";
    LexerDefinitionErrorType[LexerDefinitionErrorType["CUSTOM_LINE_BREAK"] = 16] = "CUSTOM_LINE_BREAK";
    LexerDefinitionErrorType[LexerDefinitionErrorType["MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE"] = 17] = "MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE";
})(exports.LexerDefinitionErrorType || (exports.LexerDefinitionErrorType = {}));
var DEFAULT_LEXER_CONFIG = {
    deferDefinitionErrorsHandling: false,
    positionTracking: "full",
    lineTerminatorsPattern: /\n|\r\n?/g,
    lineTerminatorCharacters: ["\n", "\r"],
    ensureOptimizations: false,
    safeMode: false,
    errorMessageProvider: lexer_errors_public.defaultLexerErrorProvider,
    traceInitPerf: false,
    skipValidations: false,
    recoveryEnabled: true
};
Object.freeze(DEFAULT_LEXER_CONFIG);
var Lexer = /** @class */ (function () {
    function Lexer(lexerDefinition, config) {
        if (config === void 0) { config = DEFAULT_LEXER_CONFIG; }
        var _this = this;
        this.lexerDefinition = lexerDefinition;
        this.lexerDefinitionErrors = [];
        this.lexerDefinitionWarning = [];
        this.patternIdxToConfig = {};
        this.charCodeToPatternIdxToConfig = {};
        this.modes = [];
        this.emptyGroups = {};
        this.trackStartLines = true;
        this.trackEndLines = true;
        this.hasCustom = false;
        this.canModeBeOptimized = {};
        // Duplicated from the parser's perf trace trait to allow future extraction
        // of the lexer to a separate package.
        this.TRACE_INIT = function (phaseDesc, phaseImpl) {
            // No need to optimize this using NOOP pattern because
            // It is not called in a hot spot...
            if (_this.traceInitPerf === true) {
                _this.traceInitIndent++;
                var indent = new Array(_this.traceInitIndent + 1).join("\t");
                if (_this.traceInitIndent < _this.traceInitMaxIdent) {
                    console.log("".concat(indent, "--> <").concat(phaseDesc, ">"));
                }
                var _a = (0, api$3.timer)(phaseImpl), time = _a.time, value = _a.value;
                /* istanbul ignore next - Difficult to reproduce specific performance behavior (>10ms) in tests */
                var traceMethod = time > 10 ? console.warn : console.log;
                if (_this.traceInitIndent < _this.traceInitMaxIdent) {
                    traceMethod("".concat(indent, "<-- <").concat(phaseDesc, "> time: ").concat(time, "ms"));
                }
                _this.traceInitIndent--;
                return value;
            }
            else {
                return phaseImpl();
            }
        };
        if (typeof config === "boolean") {
            throw Error("The second argument to the Lexer constructor is now an ILexerConfig Object.\n" +
                "a boolean 2nd argument is no longer supported");
        }
        // todo: defaults func?
        this.config = (0, assign_1$1.default)({}, DEFAULT_LEXER_CONFIG, config);
        var traceInitVal = this.config.traceInitPerf;
        if (traceInitVal === true) {
            this.traceInitMaxIdent = Infinity;
            this.traceInitPerf = true;
        }
        else if (typeof traceInitVal === "number") {
            this.traceInitMaxIdent = traceInitVal;
            this.traceInitPerf = true;
        }
        this.traceInitIndent = -1;
        this.TRACE_INIT("Lexer Constructor", function () {
            var actualDefinition;
            var hasOnlySingleMode = true;
            _this.TRACE_INIT("Lexer Config handling", function () {
                if (_this.config.lineTerminatorsPattern ===
                    DEFAULT_LEXER_CONFIG.lineTerminatorsPattern) {
                    // optimized built-in implementation for the defaults definition of lineTerminators
                    _this.config.lineTerminatorsPattern = lexer_1.LineTerminatorOptimizedTester;
                }
                else {
                    if (_this.config.lineTerminatorCharacters ===
                        DEFAULT_LEXER_CONFIG.lineTerminatorCharacters) {
                        throw Error("Error: Missing <lineTerminatorCharacters> property on the Lexer config.\n" +
                            "\tFor details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#MISSING_LINE_TERM_CHARS");
                    }
                }
                if (config.safeMode && config.ensureOptimizations) {
                    throw Error('"safeMode" and "ensureOptimizations" flags are mutually exclusive.');
                }
                _this.trackStartLines = /full|onlyStart/i.test(_this.config.positionTracking);
                _this.trackEndLines = /full/i.test(_this.config.positionTracking);
                // Convert SingleModeLexerDefinition into a IMultiModeLexerDefinition.
                if ((0, isArray_1$1.default)(lexerDefinition)) {
                    actualDefinition = {
                        modes: { defaultMode: (0, clone_1$1.default)(lexerDefinition) },
                        defaultMode: lexer_1.DEFAULT_MODE
                    };
                }
                else {
                    // no conversion needed, input should already be a IMultiModeLexerDefinition
                    hasOnlySingleMode = false;
                    actualDefinition = (0, clone_1$1.default)(lexerDefinition);
                }
            });
            if (_this.config.skipValidations === false) {
                _this.TRACE_INIT("performRuntimeChecks", function () {
                    _this.lexerDefinitionErrors = _this.lexerDefinitionErrors.concat((0, lexer_1.performRuntimeChecks)(actualDefinition, _this.trackStartLines, _this.config.lineTerminatorCharacters));
                });
                _this.TRACE_INIT("performWarningRuntimeChecks", function () {
                    _this.lexerDefinitionWarning = _this.lexerDefinitionWarning.concat((0, lexer_1.performWarningRuntimeChecks)(actualDefinition, _this.trackStartLines, _this.config.lineTerminatorCharacters));
                });
            }
            // for extra robustness to avoid throwing an none informative error message
            actualDefinition.modes = actualDefinition.modes
                ? actualDefinition.modes
                : {};
            // an error of undefined TokenTypes will be detected in "performRuntimeChecks" above.
            // this transformation is to increase robustness in the case of partially invalid lexer definition.
            (0, forEach_1$1.default)(actualDefinition.modes, function (currModeValue, currModeName) {
                actualDefinition.modes[currModeName] = (0, reject_1$1.default)(currModeValue, function (currTokType) { return (0, isUndefined_1$1.default)(currTokType); });
            });
            var allModeNames = (0, keys_1$1.default)(actualDefinition.modes);
            (0, forEach_1$1.default)(actualDefinition.modes, function (currModDef, currModName) {
                _this.TRACE_INIT("Mode: <".concat(currModName, "> processing"), function () {
                    _this.modes.push(currModName);
                    if (_this.config.skipValidations === false) {
                        _this.TRACE_INIT("validatePatterns", function () {
                            _this.lexerDefinitionErrors = _this.lexerDefinitionErrors.concat((0, lexer_1.validatePatterns)(currModDef, allModeNames));
                        });
                    }
                    // If definition errors were encountered, the analysis phase may fail unexpectedly/
                    // Considering a lexer with definition errors may never be used, there is no point
                    // to performing the analysis anyhow...
                    if ((0, isEmpty_1$1.default)(_this.lexerDefinitionErrors)) {
                        (0, tokens.augmentTokenTypes)(currModDef);
                        var currAnalyzeResult_1;
                        _this.TRACE_INIT("analyzeTokenTypes", function () {
                            currAnalyzeResult_1 = (0, lexer_1.analyzeTokenTypes)(currModDef, {
                                lineTerminatorCharacters: _this.config.lineTerminatorCharacters,
                                positionTracking: config.positionTracking,
                                ensureOptimizations: config.ensureOptimizations,
                                safeMode: config.safeMode,
                                tracer: _this.TRACE_INIT
                            });
                        });
                        _this.patternIdxToConfig[currModName] =
                            currAnalyzeResult_1.patternIdxToConfig;
                        _this.charCodeToPatternIdxToConfig[currModName] =
                            currAnalyzeResult_1.charCodeToPatternIdxToConfig;
                        _this.emptyGroups = (0, assign_1$1.default)({}, _this.emptyGroups, currAnalyzeResult_1.emptyGroups);
                        _this.hasCustom = currAnalyzeResult_1.hasCustom || _this.hasCustom;
                        _this.canModeBeOptimized[currModName] =
                            currAnalyzeResult_1.canBeOptimized;
                    }
                });
            });
            _this.defaultMode = actualDefinition.defaultMode;
            if (!(0, isEmpty_1$1.default)(_this.lexerDefinitionErrors) &&
                !_this.config.deferDefinitionErrorsHandling) {
                var allErrMessages = (0, map_1$1.default)(_this.lexerDefinitionErrors, function (error) {
                    return error.message;
                });
                var allErrMessagesString = allErrMessages.join("-----------------------\n");
                throw new Error("Errors detected in definition of Lexer:\n" + allErrMessagesString);
            }
            // Only print warning if there are no errors, This will avoid pl
            (0, forEach_1$1.default)(_this.lexerDefinitionWarning, function (warningDescriptor) {
                (0, api$3.PRINT_WARNING)(warningDescriptor.message);
            });
            _this.TRACE_INIT("Choosing sub-methods implementations", function () {
                // Choose the relevant internal implementations for this specific parser.
                // These implementations should be in-lined by the JavaScript engine
                // to provide optimal performance in each scenario.
                if (lexer_1.SUPPORT_STICKY) {
                    _this.chopInput = identity_1$1.default;
                    _this.match = _this.matchWithTest;
                }
                else {
                    _this.updateLastIndex = noop_1$1.default;
                    _this.match = _this.matchWithExec;
                }
                if (hasOnlySingleMode) {
                    _this.handleModes = noop_1$1.default;
                }
                if (_this.trackStartLines === false) {
                    _this.computeNewColumn = identity_1$1.default;
                }
                if (_this.trackEndLines === false) {
                    _this.updateTokenEndLineColumnLocation = noop_1$1.default;
                }
                if (/full/i.test(_this.config.positionTracking)) {
                    _this.createTokenInstance = _this.createFullToken;
                }
                else if (/onlyStart/i.test(_this.config.positionTracking)) {
                    _this.createTokenInstance = _this.createStartOnlyToken;
                }
                else if (/onlyOffset/i.test(_this.config.positionTracking)) {
                    _this.createTokenInstance = _this.createOffsetOnlyToken;
                }
                else {
                    throw Error("Invalid <positionTracking> config option: \"".concat(_this.config.positionTracking, "\""));
                }
                if (_this.hasCustom) {
                    _this.addToken = _this.addTokenUsingPush;
                    _this.handlePayload = _this.handlePayloadWithCustom;
                }
                else {
                    _this.addToken = _this.addTokenUsingMemberAccess;
                    _this.handlePayload = _this.handlePayloadNoCustom;
                }
            });
            _this.TRACE_INIT("Failed Optimization Warnings", function () {
                var unOptimizedModes = (0, reduce_1$1.default)(_this.canModeBeOptimized, function (cannotBeOptimized, canBeOptimized, modeName) {
                    if (canBeOptimized === false) {
                        cannotBeOptimized.push(modeName);
                    }
                    return cannotBeOptimized;
                }, []);
                if (config.ensureOptimizations && !(0, isEmpty_1$1.default)(unOptimizedModes)) {
                    throw Error("Lexer Modes: < ".concat(unOptimizedModes.join(", "), " > cannot be optimized.\n") +
                        '\t Disable the "ensureOptimizations" lexer config flag to silently ignore this and run the lexer in an un-optimized mode.\n' +
                        "\t Or inspect the console log for details on how to resolve these issues.");
                }
            });
            _this.TRACE_INIT("clearRegExpParserCache", function () {
                (0, reg_exp_parser.clearRegExpParserCache)();
            });
            _this.TRACE_INIT("toFastProperties", function () {
                (0, api$3.toFastProperties)(_this);
            });
        });
    }
    Lexer.prototype.tokenize = function (text, initialMode) {
        if (initialMode === void 0) { initialMode = this.defaultMode; }
        if (!(0, isEmpty_1$1.default)(this.lexerDefinitionErrors)) {
            var allErrMessages = (0, map_1$1.default)(this.lexerDefinitionErrors, function (error) {
                return error.message;
            });
            var allErrMessagesString = allErrMessages.join("-----------------------\n");
            throw new Error("Unable to Tokenize because Errors detected in definition of Lexer:\n" +
                allErrMessagesString);
        }
        return this.tokenizeInternal(text, initialMode);
    };
    // There is quite a bit of duplication between this and "tokenizeInternalLazy"
    // This is intentional due to performance considerations.
    // this method also used quite a bit of `!` none null assertions because it is too optimized
    // for `tsc` to always understand it is "safe"
    Lexer.prototype.tokenizeInternal = function (text, initialMode) {
        var _this = this;
        var i, j, k, matchAltImage, longerAlt, matchedImage, payload, altPayload, imageLength, group, tokType, newToken, errLength, msg, match;
        var orgText = text;
        var orgLength = orgText.length;
        var offset = 0;
        var matchedTokensIndex = 0;
        // initializing the tokensArray to the "guessed" size.
        // guessing too little will still reduce the number of array re-sizes on pushes.
        // guessing too large (Tested by guessing x4 too large) may cost a bit more of memory
        // but would still have a faster runtime by avoiding (All but one) array resizing.
        var guessedNumberOfTokens = this.hasCustom
            ? 0 // will break custom token pattern APIs the matchedTokens array will contain undefined elements.
            : Math.floor(text.length / 10);
        var matchedTokens = new Array(guessedNumberOfTokens);
        var errors = [];
        var line = this.trackStartLines ? 1 : undefined;
        var column = this.trackStartLines ? 1 : undefined;
        var groups = (0, lexer_1.cloneEmptyGroups)(this.emptyGroups);
        var trackLines = this.trackStartLines;
        var lineTerminatorPattern = this.config.lineTerminatorsPattern;
        var currModePatternsLength = 0;
        var patternIdxToConfig = [];
        var currCharCodeToPatternIdxToConfig = [];
        var modeStack = [];
        var emptyArray = [];
        Object.freeze(emptyArray);
        var getPossiblePatterns;
        function getPossiblePatternsSlow() {
            return patternIdxToConfig;
        }
        function getPossiblePatternsOptimized(charCode) {
            var optimizedCharIdx = (0, lexer_1.charCodeToOptimizedIndex)(charCode);
            var possiblePatterns = currCharCodeToPatternIdxToConfig[optimizedCharIdx];
            if (possiblePatterns === undefined) {
                return emptyArray;
            }
            else {
                return possiblePatterns;
            }
        }
        var pop_mode = function (popToken) {
            // TODO: perhaps avoid this error in the edge case there is no more input?
            if (modeStack.length === 1 &&
                // if we have both a POP_MODE and a PUSH_MODE this is in-fact a "transition"
                // So no error should occur.
                popToken.tokenType.PUSH_MODE === undefined) {
                // if we try to pop the last mode there lexer will no longer have ANY mode.
                // thus the pop is ignored, an error will be created and the lexer will continue parsing in the previous mode.
                var msg_1 = _this.config.errorMessageProvider.buildUnableToPopLexerModeMessage(popToken);
                errors.push({
                    offset: popToken.startOffset,
                    line: popToken.startLine,
                    column: popToken.startColumn,
                    length: popToken.image.length,
                    message: msg_1
                });
            }
            else {
                modeStack.pop();
                var newMode = (0, last_1$1.default)(modeStack);
                patternIdxToConfig = _this.patternIdxToConfig[newMode];
                currCharCodeToPatternIdxToConfig =
                    _this.charCodeToPatternIdxToConfig[newMode];
                currModePatternsLength = patternIdxToConfig.length;
                var modeCanBeOptimized = _this.canModeBeOptimized[newMode] && _this.config.safeMode === false;
                if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
                    getPossiblePatterns = getPossiblePatternsOptimized;
                }
                else {
                    getPossiblePatterns = getPossiblePatternsSlow;
                }
            }
        };
        function push_mode(newMode) {
            modeStack.push(newMode);
            currCharCodeToPatternIdxToConfig =
                this.charCodeToPatternIdxToConfig[newMode];
            patternIdxToConfig = this.patternIdxToConfig[newMode];
            currModePatternsLength = patternIdxToConfig.length;
            currModePatternsLength = patternIdxToConfig.length;
            var modeCanBeOptimized = this.canModeBeOptimized[newMode] && this.config.safeMode === false;
            if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
                getPossiblePatterns = getPossiblePatternsOptimized;
            }
            else {
                getPossiblePatterns = getPossiblePatternsSlow;
            }
        }
        // this pattern seems to avoid a V8 de-optimization, although that de-optimization does not
        // seem to matter performance wise.
        push_mode.call(this, initialMode);
        var currConfig;
        var recoveryEnabled = this.config.recoveryEnabled;
        while (offset < orgLength) {
            matchedImage = null;
            var nextCharCode = orgText.charCodeAt(offset);
            var chosenPatternIdxToConfig = getPossiblePatterns(nextCharCode);
            var chosenPatternsLength = chosenPatternIdxToConfig.length;
            for (i = 0; i < chosenPatternsLength; i++) {
                currConfig = chosenPatternIdxToConfig[i];
                var currPattern = currConfig.pattern;
                payload = null;
                // manually in-lined because > 600 chars won't be in-lined in V8
                var singleCharCode = currConfig.short;
                if (singleCharCode !== false) {
                    if (nextCharCode === singleCharCode) {
                        // single character string
                        matchedImage = currPattern;
                    }
                }
                else if (currConfig.isCustom === true) {
                    match = currPattern.exec(orgText, offset, matchedTokens, groups);
                    if (match !== null) {
                        matchedImage = match[0];
                        if (match.payload !== undefined) {
                            payload = match.payload;
                        }
                    }
                    else {
                        matchedImage = null;
                    }
                }
                else {
                    this.updateLastIndex(currPattern, offset);
                    matchedImage = this.match(currPattern, text, offset);
                }
                if (matchedImage !== null) {
                    // even though this pattern matched we must try a another longer alternative.
                    // this can be used to prioritize keywords over identifiers
                    longerAlt = currConfig.longerAlt;
                    if (longerAlt !== undefined) {
                        // TODO: micro optimize, avoid extra prop access
                        // by saving/linking longerAlt on the original config?
                        var longerAltLength = longerAlt.length;
                        for (k = 0; k < longerAltLength; k++) {
                            var longerAltConfig = patternIdxToConfig[longerAlt[k]];
                            var longerAltPattern = longerAltConfig.pattern;
                            altPayload = null;
                            // single Char can never be a longer alt so no need to test it.
                            // manually in-lined because > 600 chars won't be in-lined in V8
                            if (longerAltConfig.isCustom === true) {
                                match = longerAltPattern.exec(orgText, offset, matchedTokens, groups);
                                if (match !== null) {
                                    matchAltImage = match[0];
                                    if (match.payload !== undefined) {
                                        altPayload = match.payload;
                                    }
                                }
                                else {
                                    matchAltImage = null;
                                }
                            }
                            else {
                                this.updateLastIndex(longerAltPattern, offset);
                                matchAltImage = this.match(longerAltPattern, text, offset);
                            }
                            if (matchAltImage && matchAltImage.length > matchedImage.length) {
                                matchedImage = matchAltImage;
                                payload = altPayload;
                                currConfig = longerAltConfig;
                                // Exit the loop early after matching one of the longer alternatives
                                // The first matched alternative takes precedence
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            // successful match
            if (matchedImage !== null) {
                imageLength = matchedImage.length;
                group = currConfig.group;
                if (group !== undefined) {
                    tokType = currConfig.tokenTypeIdx;
                    // TODO: "offset + imageLength" and the new column may be computed twice in case of "full" location information inside
                    // createFullToken method
                    newToken = this.createTokenInstance(matchedImage, offset, tokType, currConfig.tokenType, line, column, imageLength);
                    this.handlePayload(newToken, payload);
                    // TODO: optimize NOOP in case there are no special groups?
                    if (group === false) {
                        matchedTokensIndex = this.addToken(matchedTokens, matchedTokensIndex, newToken);
                    }
                    else {
                        groups[group].push(newToken);
                    }
                }
                text = this.chopInput(text, imageLength);
                offset = offset + imageLength;
                // TODO: with newlines the column may be assigned twice
                column = this.computeNewColumn(column, imageLength);
                if (trackLines === true && currConfig.canLineTerminator === true) {
                    var numOfLTsInMatch = 0;
                    var foundTerminator = void 0;
                    var lastLTEndOffset = void 0;
                    lineTerminatorPattern.lastIndex = 0;
                    do {
                        foundTerminator = lineTerminatorPattern.test(matchedImage);
                        if (foundTerminator === true) {
                            lastLTEndOffset = lineTerminatorPattern.lastIndex - 1;
                            numOfLTsInMatch++;
                        }
                    } while (foundTerminator === true);
                    if (numOfLTsInMatch !== 0) {
                        line = line + numOfLTsInMatch;
                        column = imageLength - lastLTEndOffset;
                        this.updateTokenEndLineColumnLocation(newToken, group, lastLTEndOffset, numOfLTsInMatch, line, column, imageLength);
                    }
                }
                // will be NOOP if no modes present
                this.handleModes(currConfig, pop_mode, push_mode, newToken);
            }
            else {
                // error recovery, drop characters until we identify a valid token's start point
                var errorStartOffset = offset;
                var errorLine = line;
                var errorColumn = column;
                var foundResyncPoint = recoveryEnabled === false;
                while (foundResyncPoint === false && offset < orgLength) {
                    // Identity Func (when sticky flag is enabled)
                    text = this.chopInput(text, 1);
                    offset++;
                    for (j = 0; j < currModePatternsLength; j++) {
                        var currConfig_1 = patternIdxToConfig[j];
                        var currPattern = currConfig_1.pattern;
                        // manually in-lined because > 600 chars won't be in-lined in V8
                        var singleCharCode = currConfig_1.short;
                        if (singleCharCode !== false) {
                            if (orgText.charCodeAt(offset) === singleCharCode) {
                                // single character string
                                foundResyncPoint = true;
                            }
                        }
                        else if (currConfig_1.isCustom === true) {
                            foundResyncPoint =
                                currPattern.exec(orgText, offset, matchedTokens, groups) !== null;
                        }
                        else {
                            this.updateLastIndex(currPattern, offset);
                            foundResyncPoint = currPattern.exec(text) !== null;
                        }
                        if (foundResyncPoint === true) {
                            break;
                        }
                    }
                }
                errLength = offset - errorStartOffset;
                // at this point we either re-synced or reached the end of the input text
                msg = this.config.errorMessageProvider.buildUnexpectedCharactersMessage(orgText, errorStartOffset, errLength, errorLine, errorColumn);
                errors.push({
                    offset: errorStartOffset,
                    line: errorLine,
                    column: errorColumn,
                    length: errLength,
                    message: msg
                });
                if (recoveryEnabled === false) {
                    break;
                }
            }
        }
        // if we do have custom patterns which push directly into the
        // TODO: custom tokens should not push directly??
        if (!this.hasCustom) {
            // if we guessed a too large size for the tokens array this will shrink it to the right size.
            matchedTokens.length = matchedTokensIndex;
        }
        return {
            tokens: matchedTokens,
            groups: groups,
            errors: errors
        };
    };
    Lexer.prototype.handleModes = function (config, pop_mode, push_mode, newToken) {
        if (config.pop === true) {
            // need to save the PUSH_MODE property as if the mode is popped
            // patternIdxToPopMode is updated to reflect the new mode after popping the stack
            var pushMode = config.push;
            pop_mode(newToken);
            if (pushMode !== undefined) {
                push_mode.call(this, pushMode);
            }
        }
        else if (config.push !== undefined) {
            push_mode.call(this, config.push);
        }
    };
    Lexer.prototype.chopInput = function (text, length) {
        return text.substring(length);
    };
    Lexer.prototype.updateLastIndex = function (regExp, newLastIndex) {
        regExp.lastIndex = newLastIndex;
    };
    // TODO: decrease this under 600 characters? inspect stripping comments option in TSC compiler
    Lexer.prototype.updateTokenEndLineColumnLocation = function (newToken, group, lastLTIdx, numOfLTsInMatch, line, column, imageLength) {
        var lastCharIsLT, fixForEndingInLT;
        if (group !== undefined) {
            // a none skipped multi line Token, need to update endLine/endColumn
            lastCharIsLT = lastLTIdx === imageLength - 1;
            fixForEndingInLT = lastCharIsLT ? -1 : 0;
            if (!(numOfLTsInMatch === 1 && lastCharIsLT === true)) {
                // if a token ends in a LT that last LT only affects the line numbering of following Tokens
                newToken.endLine = line + fixForEndingInLT;
                // the last LT in a token does not affect the endColumn either as the [columnStart ... columnEnd)
                // inclusive to exclusive range.
                newToken.endColumn = column - 1 + -fixForEndingInLT;
            }
            // else single LT in the last character of a token, no need to modify the endLine/EndColumn
        }
    };
    Lexer.prototype.computeNewColumn = function (oldColumn, imageLength) {
        return oldColumn + imageLength;
    };
    Lexer.prototype.createOffsetOnlyToken = function (image, startOffset, tokenTypeIdx, tokenType) {
        return {
            image: image,
            startOffset: startOffset,
            tokenTypeIdx: tokenTypeIdx,
            tokenType: tokenType
        };
    };
    Lexer.prototype.createStartOnlyToken = function (image, startOffset, tokenTypeIdx, tokenType, startLine, startColumn) {
        return {
            image: image,
            startOffset: startOffset,
            startLine: startLine,
            startColumn: startColumn,
            tokenTypeIdx: tokenTypeIdx,
            tokenType: tokenType
        };
    };
    Lexer.prototype.createFullToken = function (image, startOffset, tokenTypeIdx, tokenType, startLine, startColumn, imageLength) {
        return {
            image: image,
            startOffset: startOffset,
            endOffset: startOffset + imageLength - 1,
            startLine: startLine,
            endLine: startLine,
            startColumn: startColumn,
            endColumn: startColumn + imageLength - 1,
            tokenTypeIdx: tokenTypeIdx,
            tokenType: tokenType
        };
    };
    Lexer.prototype.addTokenUsingPush = function (tokenVector, index, tokenToAdd) {
        tokenVector.push(tokenToAdd);
        return index;
    };
    Lexer.prototype.addTokenUsingMemberAccess = function (tokenVector, index, tokenToAdd) {
        tokenVector[index] = tokenToAdd;
        index++;
        return index;
    };
    Lexer.prototype.handlePayloadNoCustom = function (token, payload) { };
    Lexer.prototype.handlePayloadWithCustom = function (token, payload) {
        if (payload !== null) {
            token.payload = payload;
        }
    };
    Lexer.prototype.matchWithTest = function (pattern, text, offset) {
        var found = pattern.test(text);
        if (found === true) {
            return text.substring(offset, pattern.lastIndex);
        }
        return null;
    };
    Lexer.prototype.matchWithExec = function (pattern, text) {
        var regExpArray = pattern.exec(text);
        return regExpArray !== null ? regExpArray[0] : null;
    };
    Lexer.SKIPPED = "This marks a skipped Token pattern, this means each token identified by it will" +
        "be consumed and then thrown into oblivion, this can be used to for example to completely ignore whitespace.";
    Lexer.NA = /NOT_APPLICABLE/;
    return Lexer;
}());
exports.Lexer = Lexer;

});

var tokens_public = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenMatcher = exports.createTokenInstance = exports.EOF = exports.createToken = exports.hasTokenLabel = exports.tokenName = exports.tokenLabel = void 0;
var isString_1$1 = __importDefault(isString_1);
var has_1$1 = __importDefault(has_1);
var isUndefined_1$1 = __importDefault(isUndefined_1);


function tokenLabel(tokType) {
    if (hasTokenLabel(tokType)) {
        return tokType.LABEL;
    }
    else {
        return tokType.name;
    }
}
exports.tokenLabel = tokenLabel;
function tokenName(tokType) {
    return tokType.name;
}
exports.tokenName = tokenName;
function hasTokenLabel(obj) {
    return (0, isString_1$1.default)(obj.LABEL) && obj.LABEL !== "";
}
exports.hasTokenLabel = hasTokenLabel;
var PARENT = "parent";
var CATEGORIES = "categories";
var LABEL = "label";
var GROUP = "group";
var PUSH_MODE = "push_mode";
var POP_MODE = "pop_mode";
var LONGER_ALT = "longer_alt";
var LINE_BREAKS = "line_breaks";
var START_CHARS_HINT = "start_chars_hint";
function createToken(config) {
    return createTokenInternal(config);
}
exports.createToken = createToken;
function createTokenInternal(config) {
    var pattern = config.pattern;
    var tokenType = {};
    tokenType.name = config.name;
    if (!(0, isUndefined_1$1.default)(pattern)) {
        tokenType.PATTERN = pattern;
    }
    if ((0, has_1$1.default)(config, PARENT)) {
        throw ("The parent property is no longer supported.\n" +
            "See: https://github.com/chevrotain/chevrotain/issues/564#issuecomment-349062346 for details.");
    }
    if ((0, has_1$1.default)(config, CATEGORIES)) {
        // casting to ANY as this will be fixed inside `augmentTokenTypes``
        tokenType.CATEGORIES = config[CATEGORIES];
    }
    (0, tokens.augmentTokenTypes)([tokenType]);
    if ((0, has_1$1.default)(config, LABEL)) {
        tokenType.LABEL = config[LABEL];
    }
    if ((0, has_1$1.default)(config, GROUP)) {
        tokenType.GROUP = config[GROUP];
    }
    if ((0, has_1$1.default)(config, POP_MODE)) {
        tokenType.POP_MODE = config[POP_MODE];
    }
    if ((0, has_1$1.default)(config, PUSH_MODE)) {
        tokenType.PUSH_MODE = config[PUSH_MODE];
    }
    if ((0, has_1$1.default)(config, LONGER_ALT)) {
        tokenType.LONGER_ALT = config[LONGER_ALT];
    }
    if ((0, has_1$1.default)(config, LINE_BREAKS)) {
        tokenType.LINE_BREAKS = config[LINE_BREAKS];
    }
    if ((0, has_1$1.default)(config, START_CHARS_HINT)) {
        tokenType.START_CHARS_HINT = config[START_CHARS_HINT];
    }
    return tokenType;
}
exports.EOF = createToken({ name: "EOF", pattern: lexer_public_1.Lexer.NA });
(0, tokens.augmentTokenTypes)([exports.EOF]);
function createTokenInstance(tokType, image, startOffset, endOffset, startLine, endLine, startColumn, endColumn) {
    return {
        image: image,
        startOffset: startOffset,
        endOffset: endOffset,
        startLine: startLine,
        endLine: endLine,
        startColumn: startColumn,
        endColumn: endColumn,
        tokenTypeIdx: tokType.tokenTypeIdx,
        tokenType: tokType
    };
}
exports.createTokenInstance = createTokenInstance;
function tokenMatcher(token, tokType) {
    return (0, tokens.tokenStructuredMatcher)(token, tokType);
}
exports.tokenMatcher = tokenMatcher;

});

var errors_public = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGrammarValidatorErrorProvider = exports.defaultGrammarResolverErrorProvider = exports.defaultParserErrorProvider = void 0;

var first_1 = __importDefault(first);
var map_1$1 = __importDefault(map_1);
var reduce_1$1 = __importDefault(reduce_1);

var gast_2 = api$2;
exports.defaultParserErrorProvider = {
    buildMismatchTokenMessage: function (_a) {
        var expected = _a.expected, actual = _a.actual; _a.previous; _a.ruleName;
        var hasLabel = (0, tokens_public.hasTokenLabel)(expected);
        var expectedMsg = hasLabel
            ? "--> ".concat((0, tokens_public.tokenLabel)(expected), " <--")
            : "token of type --> ".concat(expected.name, " <--");
        var msg = "Expecting ".concat(expectedMsg, " but found --> '").concat(actual.image, "' <--");
        return msg;
    },
    buildNotAllInputParsedMessage: function (_a) {
        var firstRedundant = _a.firstRedundant; _a.ruleName;
        return "Redundant input, expecting EOF but found: " + firstRedundant.image;
    },
    buildNoViableAltMessage: function (_a) {
        var expectedPathsPerAlt = _a.expectedPathsPerAlt, actual = _a.actual; _a.previous; var customUserDescription = _a.customUserDescription; _a.ruleName;
        var errPrefix = "Expecting: ";
        // TODO: issue: No Viable Alternative Error may have incomplete details. #502
        var actualText = (0, first_1.default)(actual).image;
        var errSuffix = "\nbut found: '" + actualText + "'";
        if (customUserDescription) {
            return errPrefix + customUserDescription + errSuffix;
        }
        else {
            var allLookAheadPaths = (0, reduce_1$1.default)(expectedPathsPerAlt, function (result, currAltPaths) { return result.concat(currAltPaths); }, []);
            var nextValidTokenSequences = (0, map_1$1.default)(allLookAheadPaths, function (currPath) {
                return "[".concat((0, map_1$1.default)(currPath, function (currTokenType) { return (0, tokens_public.tokenLabel)(currTokenType); }).join(", "), "]");
            });
            var nextValidSequenceItems = (0, map_1$1.default)(nextValidTokenSequences, function (itemMsg, idx) { return "  ".concat(idx + 1, ". ").concat(itemMsg); });
            var calculatedDescription = "one of these possible Token sequences:\n".concat(nextValidSequenceItems.join("\n"));
            return errPrefix + calculatedDescription + errSuffix;
        }
    },
    buildEarlyExitMessage: function (_a) {
        var expectedIterationPaths = _a.expectedIterationPaths, actual = _a.actual, customUserDescription = _a.customUserDescription; _a.ruleName;
        var errPrefix = "Expecting: ";
        // TODO: issue: No Viable Alternative Error may have incomplete details. #502
        var actualText = (0, first_1.default)(actual).image;
        var errSuffix = "\nbut found: '" + actualText + "'";
        if (customUserDescription) {
            return errPrefix + customUserDescription + errSuffix;
        }
        else {
            var nextValidTokenSequences = (0, map_1$1.default)(expectedIterationPaths, function (currPath) {
                return "[".concat((0, map_1$1.default)(currPath, function (currTokenType) { return (0, tokens_public.tokenLabel)(currTokenType); }).join(","), "]");
            });
            var calculatedDescription = "expecting at least one iteration which starts with one of these possible Token sequences::\n  " +
                "<".concat(nextValidTokenSequences.join(" ,"), ">");
            return errPrefix + calculatedDescription + errSuffix;
        }
    }
};
Object.freeze(exports.defaultParserErrorProvider);
exports.defaultGrammarResolverErrorProvider = {
    buildRuleNotFoundError: function (topLevelRule, undefinedRule) {
        var msg = "Invalid grammar, reference to a rule which is not defined: ->" +
            undefinedRule.nonTerminalName +
            "<-\n" +
            "inside top level rule: ->" +
            topLevelRule.name +
            "<-";
        return msg;
    }
};
exports.defaultGrammarValidatorErrorProvider = {
    buildDuplicateFoundError: function (topLevelRule, duplicateProds) {
        function getExtraProductionArgument(prod) {
            if (prod instanceof api$2.Terminal) {
                return prod.terminalType.name;
            }
            else if (prod instanceof api$2.NonTerminal) {
                return prod.nonTerminalName;
            }
            else {
                return "";
            }
        }
        var topLevelName = topLevelRule.name;
        var duplicateProd = (0, first_1.default)(duplicateProds);
        var index = duplicateProd.idx;
        var dslName = (0, gast_2.getProductionDslName)(duplicateProd);
        var extraArgument = getExtraProductionArgument(duplicateProd);
        var hasExplicitIndex = index > 0;
        var msg = "->".concat(dslName).concat(hasExplicitIndex ? index : "", "<- ").concat(extraArgument ? "with argument: ->".concat(extraArgument, "<-") : "", "\n                  appears more than once (").concat(duplicateProds.length, " times) in the top level rule: ->").concat(topLevelName, "<-.                  \n                  For further details see: https://chevrotain.io/docs/FAQ.html#NUMERICAL_SUFFIXES \n                  ");
        // white space trimming time! better to trim afterwards as it allows to use WELL formatted multi line template strings...
        msg = msg.replace(/[ \t]+/g, " ");
        msg = msg.replace(/\s\s+/g, "\n");
        return msg;
    },
    buildNamespaceConflictError: function (rule) {
        var errMsg = "Namespace conflict found in grammar.\n" +
            "The grammar has both a Terminal(Token) and a Non-Terminal(Rule) named: <".concat(rule.name, ">.\n") +
            "To resolve this make sure each Terminal and Non-Terminal names are unique\n" +
            "This is easy to accomplish by using the convention that Terminal names start with an uppercase letter\n" +
            "and Non-Terminal names start with a lower case letter.";
        return errMsg;
    },
    buildAlternationPrefixAmbiguityError: function (options) {
        var pathMsg = (0, map_1$1.default)(options.prefixPath, function (currTok) {
            return (0, tokens_public.tokenLabel)(currTok);
        }).join(", ");
        var occurrence = options.alternation.idx === 0 ? "" : options.alternation.idx;
        var errMsg = "Ambiguous alternatives: <".concat(options.ambiguityIndices.join(" ,"), "> due to common lookahead prefix\n") +
            "in <OR".concat(occurrence, "> inside <").concat(options.topLevelRule.name, "> Rule,\n") +
            "<".concat(pathMsg, "> may appears as a prefix path in all these alternatives.\n") +
            "See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#COMMON_PREFIX\n" +
            "For Further details.";
        return errMsg;
    },
    buildAlternationAmbiguityError: function (options) {
        var pathMsg = (0, map_1$1.default)(options.prefixPath, function (currtok) {
            return (0, tokens_public.tokenLabel)(currtok);
        }).join(", ");
        var occurrence = options.alternation.idx === 0 ? "" : options.alternation.idx;
        var currMessage = "Ambiguous Alternatives Detected: <".concat(options.ambiguityIndices.join(" ,"), "> in <OR").concat(occurrence, ">") +
            " inside <".concat(options.topLevelRule.name, "> Rule,\n") +
            "<".concat(pathMsg, "> may appears as a prefix path in all these alternatives.\n");
        currMessage =
            currMessage +
                "See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#AMBIGUOUS_ALTERNATIVES\n" +
                "For Further details.";
        return currMessage;
    },
    buildEmptyRepetitionError: function (options) {
        var dslName = (0, gast_2.getProductionDslName)(options.repetition);
        if (options.repetition.idx !== 0) {
            dslName += options.repetition.idx;
        }
        var errMsg = "The repetition <".concat(dslName, "> within Rule <").concat(options.topLevelRule.name, "> can never consume any tokens.\n") +
            "This could lead to an infinite loop.";
        return errMsg;
    },
    // TODO: remove - `errors_public` from nyc.config.js exclude
    //       once this method is fully removed from this file
    buildTokenNameError: function (options) {
        /* istanbul ignore next */
        return "deprecated";
    },
    buildEmptyAlternationError: function (options) {
        var errMsg = "Ambiguous empty alternative: <".concat(options.emptyChoiceIdx + 1, ">") +
            " in <OR".concat(options.alternation.idx, "> inside <").concat(options.topLevelRule.name, "> Rule.\n") +
            "Only the last alternative may be an empty alternative.";
        return errMsg;
    },
    buildTooManyAlternativesError: function (options) {
        var errMsg = "An Alternation cannot have more than 256 alternatives:\n" +
            "<OR".concat(options.alternation.idx, "> inside <").concat(options.topLevelRule.name, "> Rule.\n has ").concat(options.alternation.definition.length + 1, " alternatives.");
        return errMsg;
    },
    buildLeftRecursionError: function (options) {
        var ruleName = options.topLevelRule.name;
        var pathNames = (0, map_1$1.default)(options.leftRecursionPath, function (currRule) { return currRule.name; });
        var leftRecursivePath = "".concat(ruleName, " --> ").concat(pathNames
            .concat([ruleName])
            .join(" --> "));
        var errMsg = "Left Recursion found in grammar.\n" +
            "rule: <".concat(ruleName, "> can be invoked from itself (directly or indirectly)\n") +
            "without consuming any Tokens. The grammar path that causes this is: \n ".concat(leftRecursivePath, "\n") +
            " To fix this refactor your grammar to remove the left recursion.\n" +
            "see: https://en.wikipedia.org/wiki/LL_parser#Left_factoring.";
        return errMsg;
    },
    // TODO: remove - `errors_public` from nyc.config.js exclude
    //       once this method is fully removed from this file
    buildInvalidRuleNameError: function (options) {
        /* istanbul ignore next */
        return "deprecated";
    },
    buildDuplicateRuleNameError: function (options) {
        var ruleName;
        if (options.topLevelRule instanceof api$2.Rule) {
            ruleName = options.topLevelRule.name;
        }
        else {
            ruleName = options.topLevelRule;
        }
        var errMsg = "Duplicate definition, rule: ->".concat(ruleName, "<- is already defined in the grammar: ->").concat(options.grammarName, "<-");
        return errMsg;
    }
};

});

var parser_1 = parser$1;

var resolver = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GastRefResolverVisitor = exports.resolveGrammar = void 0;

var forEach_1$1 = __importDefault(forEach_1);
var values_1$1 = __importDefault(values_1);

function resolveGrammar(topLevels, errMsgProvider) {
    var refResolver = new GastRefResolverVisitor(topLevels, errMsgProvider);
    refResolver.resolveRefs();
    return refResolver.errors;
}
exports.resolveGrammar = resolveGrammar;
var GastRefResolverVisitor = /** @class */ (function (_super) {
    __extends(GastRefResolverVisitor, _super);
    function GastRefResolverVisitor(nameToTopRule, errMsgProvider) {
        var _this = _super.call(this) || this;
        _this.nameToTopRule = nameToTopRule;
        _this.errMsgProvider = errMsgProvider;
        _this.errors = [];
        return _this;
    }
    GastRefResolverVisitor.prototype.resolveRefs = function () {
        var _this = this;
        (0, forEach_1$1.default)((0, values_1$1.default)(this.nameToTopRule), function (prod) {
            _this.currTopLevel = prod;
            prod.accept(_this);
        });
    };
    GastRefResolverVisitor.prototype.visitNonTerminal = function (node) {
        var ref = this.nameToTopRule[node.nonTerminalName];
        if (!ref) {
            var msg = this.errMsgProvider.buildRuleNotFoundError(this.currTopLevel, node);
            this.errors.push({
                message: msg,
                type: parser_1.ParserDefinitionErrorType.UNRESOLVED_SUBRULE_REF,
                ruleName: this.currTopLevel.name,
                unresolvedRefName: node.nonTerminalName
            });
        }
        else {
            node.referencedRule = ref;
        }
    };
    return GastRefResolverVisitor;
}(api$2.GAstVisitor));
exports.GastRefResolverVisitor = GastRefResolverVisitor;

});

/**
 * A specialized version of `baseAggregator` for arrays.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} setter The function to set `accumulator` values.
 * @param {Function} iteratee The iteratee to transform keys.
 * @param {Object} accumulator The initial aggregated object.
 * @returns {Function} Returns `accumulator`.
 */
function arrayAggregator(array, setter, iteratee, accumulator) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    var value = array[index];
    setter(accumulator, value, iteratee(value), array);
  }
  return accumulator;
}

var _arrayAggregator = arrayAggregator;

/**
 * Aggregates elements of `collection` on `accumulator` with keys transformed
 * by `iteratee` and values set by `setter`.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} setter The function to set `accumulator` values.
 * @param {Function} iteratee The iteratee to transform keys.
 * @param {Object} accumulator The initial aggregated object.
 * @returns {Function} Returns `accumulator`.
 */
function baseAggregator(collection, setter, iteratee, accumulator) {
  _baseEach(collection, function(value, key, collection) {
    setter(accumulator, value, iteratee(value), collection);
  });
  return accumulator;
}

var _baseAggregator = baseAggregator;

/**
 * Creates a function like `_.groupBy`.
 *
 * @private
 * @param {Function} setter The function to set accumulator values.
 * @param {Function} [initializer] The accumulator object initializer.
 * @returns {Function} Returns the new aggregator function.
 */
function createAggregator(setter, initializer) {
  return function(collection, iteratee) {
    var func = isArray_1(collection) ? _arrayAggregator : _baseAggregator,
        accumulator = initializer ? initializer() : {};

    return func(collection, setter, _baseIteratee(iteratee), accumulator);
  };
}

var _createAggregator = createAggregator;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an object composed of keys generated from the results of running
 * each element of `collection` thru `iteratee`. The order of grouped values
 * is determined by the order they occur in `collection`. The corresponding
 * value of each key is an array of elements responsible for generating the
 * key. The iteratee is invoked with one argument: (value).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The iteratee to transform keys.
 * @returns {Object} Returns the composed aggregate object.
 * @example
 *
 * _.groupBy([6.1, 4.2, 6.3], Math.floor);
 * // => { '4': [4.2], '6': [6.1, 6.3] }
 *
 * // The `_.property` iteratee shorthand.
 * _.groupBy(['one', 'two', 'three'], 'length');
 * // => { '3': ['one', 'two'], '5': ['three'] }
 */
var groupBy = _createAggregator(function(result, value, key) {
  if (hasOwnProperty.call(result, key)) {
    result[key].push(value);
  } else {
    _baseAssignValue(result, key, [value]);
  }
});

var groupBy_1 = groupBy;

/**
 * Creates a flattened array of values by running each element in `collection`
 * thru `iteratee` and flattening the mapped results. The iteratee is invoked
 * with three arguments: (value, index|key, collection).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new flattened array.
 * @example
 *
 * function duplicate(n) {
 *   return [n, n];
 * }
 *
 * _.flatMap([1, 2], duplicate);
 * // => [1, 1, 2, 2]
 */
function flatMap(collection, iteratee) {
  return _baseFlatten(map_1(collection, iteratee), 1);
}

var flatMap_1 = flatMap;

/**
 * Creates a slice of `array` with `n` elements dropped from the end.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Array
 * @param {Array} array The array to query.
 * @param {number} [n=1] The number of elements to drop.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {Array} Returns the slice of `array`.
 * @example
 *
 * _.dropRight([1, 2, 3]);
 * // => [1, 2]
 *
 * _.dropRight([1, 2, 3], 2);
 * // => [1]
 *
 * _.dropRight([1, 2, 3], 5);
 * // => []
 *
 * _.dropRight([1, 2, 3], 0);
 * // => [1, 2, 3]
 */
function dropRight(array, n, guard) {
  var length = array == null ? 0 : array.length;
  if (!length) {
    return [];
  }
  n = (guard || n === undefined) ? 1 : toInteger_1(n);
  n = length - n;
  return _baseSlice(array, 0, n < 0 ? 0 : n);
}

var dropRight_1 = dropRight;

var interpreter = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextPossibleTokensAfter = exports.possiblePathsFrom = exports.NextTerminalAfterAtLeastOneSepWalker = exports.NextTerminalAfterAtLeastOneWalker = exports.NextTerminalAfterManySepWalker = exports.NextTerminalAfterManyWalker = exports.AbstractNextTerminalAfterProductionWalker = exports.NextAfterTokenWalker = exports.AbstractNextPossibleTokensWalker = void 0;

var first_1$1 = __importDefault(first);
var isEmpty_1$1 = __importDefault(isEmpty_1);
var dropRight_1$1 = __importDefault(dropRight_1);
var drop_1$1 = __importDefault(drop_1);
var last_1$1 = __importDefault(last_1);
var forEach_1$1 = __importDefault(forEach_1);
var clone_1$1 = __importDefault(clone_1);


var AbstractNextPossibleTokensWalker = /** @class */ (function (_super) {
    __extends(AbstractNextPossibleTokensWalker, _super);
    function AbstractNextPossibleTokensWalker(topProd, path) {
        var _this = _super.call(this) || this;
        _this.topProd = topProd;
        _this.path = path;
        _this.possibleTokTypes = [];
        _this.nextProductionName = "";
        _this.nextProductionOccurrence = 0;
        _this.found = false;
        _this.isAtEndOfPath = false;
        return _this;
    }
    AbstractNextPossibleTokensWalker.prototype.startWalking = function () {
        this.found = false;
        if (this.path.ruleStack[0] !== this.topProd.name) {
            throw Error("The path does not start with the walker's top Rule!");
        }
        // immutable for the win
        this.ruleStack = (0, clone_1$1.default)(this.path.ruleStack).reverse(); // intelij bug requires assertion
        this.occurrenceStack = (0, clone_1$1.default)(this.path.occurrenceStack).reverse(); // intelij bug requires assertion
        // already verified that the first production is valid, we now seek the 2nd production
        this.ruleStack.pop();
        this.occurrenceStack.pop();
        this.updateExpectedNext();
        this.walk(this.topProd);
        return this.possibleTokTypes;
    };
    AbstractNextPossibleTokensWalker.prototype.walk = function (prod, prevRest) {
        if (prevRest === void 0) { prevRest = []; }
        // stop scanning once we found the path
        if (!this.found) {
            _super.prototype.walk.call(this, prod, prevRest);
        }
    };
    AbstractNextPossibleTokensWalker.prototype.walkProdRef = function (refProd, currRest, prevRest) {
        // found the next production, need to keep walking in it
        if (refProd.referencedRule.name === this.nextProductionName &&
            refProd.idx === this.nextProductionOccurrence) {
            var fullRest = currRest.concat(prevRest);
            this.updateExpectedNext();
            this.walk(refProd.referencedRule, fullRest);
        }
    };
    AbstractNextPossibleTokensWalker.prototype.updateExpectedNext = function () {
        // need to consume the Terminal
        if ((0, isEmpty_1$1.default)(this.ruleStack)) {
            // must reset nextProductionXXX to avoid walking down another Top Level production while what we are
            // really seeking is the last Terminal...
            this.nextProductionName = "";
            this.nextProductionOccurrence = 0;
            this.isAtEndOfPath = true;
        }
        else {
            this.nextProductionName = this.ruleStack.pop();
            this.nextProductionOccurrence = this.occurrenceStack.pop();
        }
    };
    return AbstractNextPossibleTokensWalker;
}(rest.RestWalker));
exports.AbstractNextPossibleTokensWalker = AbstractNextPossibleTokensWalker;
var NextAfterTokenWalker = /** @class */ (function (_super) {
    __extends(NextAfterTokenWalker, _super);
    function NextAfterTokenWalker(topProd, path) {
        var _this = _super.call(this, topProd, path) || this;
        _this.path = path;
        _this.nextTerminalName = "";
        _this.nextTerminalOccurrence = 0;
        _this.nextTerminalName = _this.path.lastTok.name;
        _this.nextTerminalOccurrence = _this.path.lastTokOccurrence;
        return _this;
    }
    NextAfterTokenWalker.prototype.walkTerminal = function (terminal, currRest, prevRest) {
        if (this.isAtEndOfPath &&
            terminal.terminalType.name === this.nextTerminalName &&
            terminal.idx === this.nextTerminalOccurrence &&
            !this.found) {
            var fullRest = currRest.concat(prevRest);
            var restProd = new api$2.Alternative({ definition: fullRest });
            this.possibleTokTypes = (0, first_1.first)(restProd);
            this.found = true;
        }
    };
    return NextAfterTokenWalker;
}(AbstractNextPossibleTokensWalker));
exports.NextAfterTokenWalker = NextAfterTokenWalker;
/**
 * This walker only "walks" a single "TOP" level in the Grammar Ast, this means
 * it never "follows" production refs
 */
var AbstractNextTerminalAfterProductionWalker = /** @class */ (function (_super) {
    __extends(AbstractNextTerminalAfterProductionWalker, _super);
    function AbstractNextTerminalAfterProductionWalker(topRule, occurrence) {
        var _this = _super.call(this) || this;
        _this.topRule = topRule;
        _this.occurrence = occurrence;
        _this.result = {
            token: undefined,
            occurrence: undefined,
            isEndOfRule: undefined
        };
        return _this;
    }
    AbstractNextTerminalAfterProductionWalker.prototype.startWalking = function () {
        this.walk(this.topRule);
        return this.result;
    };
    return AbstractNextTerminalAfterProductionWalker;
}(rest.RestWalker));
exports.AbstractNextTerminalAfterProductionWalker = AbstractNextTerminalAfterProductionWalker;
var NextTerminalAfterManyWalker = /** @class */ (function (_super) {
    __extends(NextTerminalAfterManyWalker, _super);
    function NextTerminalAfterManyWalker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NextTerminalAfterManyWalker.prototype.walkMany = function (manyProd, currRest, prevRest) {
        if (manyProd.idx === this.occurrence) {
            var firstAfterMany = (0, first_1$1.default)(currRest.concat(prevRest));
            this.result.isEndOfRule = firstAfterMany === undefined;
            if (firstAfterMany instanceof api$2.Terminal) {
                this.result.token = firstAfterMany.terminalType;
                this.result.occurrence = firstAfterMany.idx;
            }
        }
        else {
            _super.prototype.walkMany.call(this, manyProd, currRest, prevRest);
        }
    };
    return NextTerminalAfterManyWalker;
}(AbstractNextTerminalAfterProductionWalker));
exports.NextTerminalAfterManyWalker = NextTerminalAfterManyWalker;
var NextTerminalAfterManySepWalker = /** @class */ (function (_super) {
    __extends(NextTerminalAfterManySepWalker, _super);
    function NextTerminalAfterManySepWalker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NextTerminalAfterManySepWalker.prototype.walkManySep = function (manySepProd, currRest, prevRest) {
        if (manySepProd.idx === this.occurrence) {
            var firstAfterManySep = (0, first_1$1.default)(currRest.concat(prevRest));
            this.result.isEndOfRule = firstAfterManySep === undefined;
            if (firstAfterManySep instanceof api$2.Terminal) {
                this.result.token = firstAfterManySep.terminalType;
                this.result.occurrence = firstAfterManySep.idx;
            }
        }
        else {
            _super.prototype.walkManySep.call(this, manySepProd, currRest, prevRest);
        }
    };
    return NextTerminalAfterManySepWalker;
}(AbstractNextTerminalAfterProductionWalker));
exports.NextTerminalAfterManySepWalker = NextTerminalAfterManySepWalker;
var NextTerminalAfterAtLeastOneWalker = /** @class */ (function (_super) {
    __extends(NextTerminalAfterAtLeastOneWalker, _super);
    function NextTerminalAfterAtLeastOneWalker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NextTerminalAfterAtLeastOneWalker.prototype.walkAtLeastOne = function (atLeastOneProd, currRest, prevRest) {
        if (atLeastOneProd.idx === this.occurrence) {
            var firstAfterAtLeastOne = (0, first_1$1.default)(currRest.concat(prevRest));
            this.result.isEndOfRule = firstAfterAtLeastOne === undefined;
            if (firstAfterAtLeastOne instanceof api$2.Terminal) {
                this.result.token = firstAfterAtLeastOne.terminalType;
                this.result.occurrence = firstAfterAtLeastOne.idx;
            }
        }
        else {
            _super.prototype.walkAtLeastOne.call(this, atLeastOneProd, currRest, prevRest);
        }
    };
    return NextTerminalAfterAtLeastOneWalker;
}(AbstractNextTerminalAfterProductionWalker));
exports.NextTerminalAfterAtLeastOneWalker = NextTerminalAfterAtLeastOneWalker;
// TODO: reduce code duplication in the AfterWalkers
var NextTerminalAfterAtLeastOneSepWalker = /** @class */ (function (_super) {
    __extends(NextTerminalAfterAtLeastOneSepWalker, _super);
    function NextTerminalAfterAtLeastOneSepWalker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NextTerminalAfterAtLeastOneSepWalker.prototype.walkAtLeastOneSep = function (atleastOneSepProd, currRest, prevRest) {
        if (atleastOneSepProd.idx === this.occurrence) {
            var firstAfterfirstAfterAtLeastOneSep = (0, first_1$1.default)(currRest.concat(prevRest));
            this.result.isEndOfRule = firstAfterfirstAfterAtLeastOneSep === undefined;
            if (firstAfterfirstAfterAtLeastOneSep instanceof api$2.Terminal) {
                this.result.token = firstAfterfirstAfterAtLeastOneSep.terminalType;
                this.result.occurrence = firstAfterfirstAfterAtLeastOneSep.idx;
            }
        }
        else {
            _super.prototype.walkAtLeastOneSep.call(this, atleastOneSepProd, currRest, prevRest);
        }
    };
    return NextTerminalAfterAtLeastOneSepWalker;
}(AbstractNextTerminalAfterProductionWalker));
exports.NextTerminalAfterAtLeastOneSepWalker = NextTerminalAfterAtLeastOneSepWalker;
function possiblePathsFrom(targetDef, maxLength, currPath) {
    if (currPath === void 0) { currPath = []; }
    // avoid side effects
    currPath = (0, clone_1$1.default)(currPath);
    var result = [];
    var i = 0;
    // TODO: avoid inner funcs
    function remainingPathWith(nextDef) {
        return nextDef.concat((0, drop_1$1.default)(targetDef, i + 1));
    }
    // TODO: avoid inner funcs
    function getAlternativesForProd(definition) {
        var alternatives = possiblePathsFrom(remainingPathWith(definition), maxLength, currPath);
        return result.concat(alternatives);
    }
    /**
     * Mandatory productions will halt the loop as the paths computed from their recursive calls will already contain the
     * following (rest) of the targetDef.
     *
     * For optional productions (Option/Repetition/...) the loop will continue to represent the paths that do not include the
     * the optional production.
     */
    while (currPath.length < maxLength && i < targetDef.length) {
        var prod = targetDef[i];
        /* istanbul ignore else */
        if (prod instanceof api$2.Alternative) {
            return getAlternativesForProd(prod.definition);
        }
        else if (prod instanceof api$2.NonTerminal) {
            return getAlternativesForProd(prod.definition);
        }
        else if (prod instanceof api$2.Option) {
            result = getAlternativesForProd(prod.definition);
        }
        else if (prod instanceof api$2.RepetitionMandatory) {
            var newDef = prod.definition.concat([
                new api$2.Repetition({
                    definition: prod.definition
                })
            ]);
            return getAlternativesForProd(newDef);
        }
        else if (prod instanceof api$2.RepetitionMandatoryWithSeparator) {
            var newDef = [
                new api$2.Alternative({ definition: prod.definition }),
                new api$2.Repetition({
                    definition: [new api$2.Terminal({ terminalType: prod.separator })].concat(prod.definition)
                })
            ];
            return getAlternativesForProd(newDef);
        }
        else if (prod instanceof api$2.RepetitionWithSeparator) {
            var newDef = prod.definition.concat([
                new api$2.Repetition({
                    definition: [new api$2.Terminal({ terminalType: prod.separator })].concat(prod.definition)
                })
            ]);
            result = getAlternativesForProd(newDef);
        }
        else if (prod instanceof api$2.Repetition) {
            var newDef = prod.definition.concat([
                new api$2.Repetition({
                    definition: prod.definition
                })
            ]);
            result = getAlternativesForProd(newDef);
        }
        else if (prod instanceof api$2.Alternation) {
            (0, forEach_1$1.default)(prod.definition, function (currAlt) {
                // TODO: this is a limited check for empty alternatives
                //   It would prevent a common case of infinite loops during parser initialization.
                //   However **in-directly** empty alternatives may still cause issues.
                if ((0, isEmpty_1$1.default)(currAlt.definition) === false) {
                    result = getAlternativesForProd(currAlt.definition);
                }
            });
            return result;
        }
        else if (prod instanceof api$2.Terminal) {
            currPath.push(prod.terminalType);
        }
        else {
            throw Error("non exhaustive match");
        }
        i++;
    }
    result.push({
        partialPath: currPath,
        suffixDef: (0, drop_1$1.default)(targetDef, i)
    });
    return result;
}
exports.possiblePathsFrom = possiblePathsFrom;
function nextPossibleTokensAfter(initialDef, tokenVector, tokMatcher, maxLookAhead) {
    var EXIT_NON_TERMINAL = "EXIT_NONE_TERMINAL";
    // to avoid creating a new Array each time.
    var EXIT_NON_TERMINAL_ARR = [EXIT_NON_TERMINAL];
    var EXIT_ALTERNATIVE = "EXIT_ALTERNATIVE";
    var foundCompletePath = false;
    var tokenVectorLength = tokenVector.length;
    var minimalAlternativesIndex = tokenVectorLength - maxLookAhead - 1;
    var result = [];
    var possiblePaths = [];
    possiblePaths.push({
        idx: -1,
        def: initialDef,
        ruleStack: [],
        occurrenceStack: []
    });
    while (!(0, isEmpty_1$1.default)(possiblePaths)) {
        var currPath = possiblePaths.pop();
        // skip alternatives if no more results can be found (assuming deterministic grammar with fixed lookahead)
        if (currPath === EXIT_ALTERNATIVE) {
            if (foundCompletePath &&
                (0, last_1$1.default)(possiblePaths).idx <= minimalAlternativesIndex) {
                // remove irrelevant alternative
                possiblePaths.pop();
            }
            continue;
        }
        var currDef = currPath.def;
        var currIdx = currPath.idx;
        var currRuleStack = currPath.ruleStack;
        var currOccurrenceStack = currPath.occurrenceStack;
        // For Example: an empty path could exist in a valid grammar in the case of an EMPTY_ALT
        if ((0, isEmpty_1$1.default)(currDef)) {
            continue;
        }
        var prod = currDef[0];
        /* istanbul ignore else */
        if (prod === EXIT_NON_TERMINAL) {
            var nextPath = {
                idx: currIdx,
                def: (0, drop_1$1.default)(currDef),
                ruleStack: (0, dropRight_1$1.default)(currRuleStack),
                occurrenceStack: (0, dropRight_1$1.default)(currOccurrenceStack)
            };
            possiblePaths.push(nextPath);
        }
        else if (prod instanceof api$2.Terminal) {
            /* istanbul ignore else */
            if (currIdx < tokenVectorLength - 1) {
                var nextIdx = currIdx + 1;
                var actualToken = tokenVector[nextIdx];
                if (tokMatcher(actualToken, prod.terminalType)) {
                    var nextPath = {
                        idx: nextIdx,
                        def: (0, drop_1$1.default)(currDef),
                        ruleStack: currRuleStack,
                        occurrenceStack: currOccurrenceStack
                    };
                    possiblePaths.push(nextPath);
                }
                // end of the line
            }
            else if (currIdx === tokenVectorLength - 1) {
                // IGNORE ABOVE ELSE
                result.push({
                    nextTokenType: prod.terminalType,
                    nextTokenOccurrence: prod.idx,
                    ruleStack: currRuleStack,
                    occurrenceStack: currOccurrenceStack
                });
                foundCompletePath = true;
            }
            else {
                throw Error("non exhaustive match");
            }
        }
        else if (prod instanceof api$2.NonTerminal) {
            var newRuleStack = (0, clone_1$1.default)(currRuleStack);
            newRuleStack.push(prod.nonTerminalName);
            var newOccurrenceStack = (0, clone_1$1.default)(currOccurrenceStack);
            newOccurrenceStack.push(prod.idx);
            var nextPath = {
                idx: currIdx,
                def: prod.definition.concat(EXIT_NON_TERMINAL_ARR, (0, drop_1$1.default)(currDef)),
                ruleStack: newRuleStack,
                occurrenceStack: newOccurrenceStack
            };
            possiblePaths.push(nextPath);
        }
        else if (prod instanceof api$2.Option) {
            // the order of alternatives is meaningful, FILO (Last path will be traversed first).
            var nextPathWithout = {
                idx: currIdx,
                def: (0, drop_1$1.default)(currDef),
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPathWithout);
            // required marker to avoid backtracking paths whose higher priority alternatives already matched
            possiblePaths.push(EXIT_ALTERNATIVE);
            var nextPathWith = {
                idx: currIdx,
                def: prod.definition.concat((0, drop_1$1.default)(currDef)),
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPathWith);
        }
        else if (prod instanceof api$2.RepetitionMandatory) {
            // TODO:(THE NEW operators here take a while...) (convert once?)
            var secondIteration = new api$2.Repetition({
                definition: prod.definition,
                idx: prod.idx
            });
            var nextDef = prod.definition.concat([secondIteration], (0, drop_1$1.default)(currDef));
            var nextPath = {
                idx: currIdx,
                def: nextDef,
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPath);
        }
        else if (prod instanceof api$2.RepetitionMandatoryWithSeparator) {
            // TODO:(THE NEW operators here take a while...) (convert once?)
            var separatorGast = new api$2.Terminal({
                terminalType: prod.separator
            });
            var secondIteration = new api$2.Repetition({
                definition: [separatorGast].concat(prod.definition),
                idx: prod.idx
            });
            var nextDef = prod.definition.concat([secondIteration], (0, drop_1$1.default)(currDef));
            var nextPath = {
                idx: currIdx,
                def: nextDef,
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPath);
        }
        else if (prod instanceof api$2.RepetitionWithSeparator) {
            // the order of alternatives is meaningful, FILO (Last path will be traversed first).
            var nextPathWithout = {
                idx: currIdx,
                def: (0, drop_1$1.default)(currDef),
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPathWithout);
            // required marker to avoid backtracking paths whose higher priority alternatives already matched
            possiblePaths.push(EXIT_ALTERNATIVE);
            var separatorGast = new api$2.Terminal({
                terminalType: prod.separator
            });
            var nthRepetition = new api$2.Repetition({
                definition: [separatorGast].concat(prod.definition),
                idx: prod.idx
            });
            var nextDef = prod.definition.concat([nthRepetition], (0, drop_1$1.default)(currDef));
            var nextPathWith = {
                idx: currIdx,
                def: nextDef,
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPathWith);
        }
        else if (prod instanceof api$2.Repetition) {
            // the order of alternatives is meaningful, FILO (Last path will be traversed first).
            var nextPathWithout = {
                idx: currIdx,
                def: (0, drop_1$1.default)(currDef),
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPathWithout);
            // required marker to avoid backtracking paths whose higher priority alternatives already matched
            possiblePaths.push(EXIT_ALTERNATIVE);
            // TODO: an empty repetition will cause infinite loops here, will the parser detect this in selfAnalysis?
            var nthRepetition = new api$2.Repetition({
                definition: prod.definition,
                idx: prod.idx
            });
            var nextDef = prod.definition.concat([nthRepetition], (0, drop_1$1.default)(currDef));
            var nextPathWith = {
                idx: currIdx,
                def: nextDef,
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPathWith);
        }
        else if (prod instanceof api$2.Alternation) {
            // the order of alternatives is meaningful, FILO (Last path will be traversed first).
            for (var i = prod.definition.length - 1; i >= 0; i--) {
                var currAlt = prod.definition[i];
                var currAltPath = {
                    idx: currIdx,
                    def: currAlt.definition.concat((0, drop_1$1.default)(currDef)),
                    ruleStack: currRuleStack,
                    occurrenceStack: currOccurrenceStack
                };
                possiblePaths.push(currAltPath);
                possiblePaths.push(EXIT_ALTERNATIVE);
            }
        }
        else if (prod instanceof api$2.Alternative) {
            possiblePaths.push({
                idx: currIdx,
                def: prod.definition.concat((0, drop_1$1.default)(currDef)),
                ruleStack: currRuleStack,
                occurrenceStack: currOccurrenceStack
            });
        }
        else if (prod instanceof api$2.Rule) {
            // last because we should only encounter at most a single one of these per invocation.
            possiblePaths.push(expandTopLevelRule(prod, currIdx, currRuleStack, currOccurrenceStack));
        }
        else {
            throw Error("non exhaustive match");
        }
    }
    return result;
}
exports.nextPossibleTokensAfter = nextPossibleTokensAfter;
function expandTopLevelRule(topRule, currIdx, currRuleStack, currOccurrenceStack) {
    var newRuleStack = (0, clone_1$1.default)(currRuleStack);
    newRuleStack.push(topRule.name);
    var newCurrOccurrenceStack = (0, clone_1$1.default)(currOccurrenceStack);
    // top rule is always assumed to have been called with occurrence index 1
    newCurrOccurrenceStack.push(1);
    return {
        idx: currIdx,
        def: topRule.definition,
        ruleStack: newRuleStack,
        occurrenceStack: newCurrOccurrenceStack
    };
}

});

var lookahead = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.areTokenCategoriesNotUsed = exports.isStrictPrefixOfPath = exports.containsPath = exports.getLookaheadPathsForOptionalProd = exports.getLookaheadPathsForOr = exports.lookAheadSequenceFromAlternatives = exports.buildSingleAlternativeLookaheadFunction = exports.buildAlternativesLookAheadFunc = exports.buildLookaheadFuncForOptionalProd = exports.buildLookaheadFuncForOr = exports.getLookaheadPaths = exports.getProdType = exports.PROD_TYPE = void 0;
var isEmpty_1$1 = __importDefault(isEmpty_1);
var flatten_1$1 = __importDefault(flatten_1);
var every_1$1 = __importDefault(every_1);
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var has_1$1 = __importDefault(has_1);
var reduce_1$1 = __importDefault(reduce_1);




var gast_2 = api$2;
var PROD_TYPE;
(function (PROD_TYPE) {
    PROD_TYPE[PROD_TYPE["OPTION"] = 0] = "OPTION";
    PROD_TYPE[PROD_TYPE["REPETITION"] = 1] = "REPETITION";
    PROD_TYPE[PROD_TYPE["REPETITION_MANDATORY"] = 2] = "REPETITION_MANDATORY";
    PROD_TYPE[PROD_TYPE["REPETITION_MANDATORY_WITH_SEPARATOR"] = 3] = "REPETITION_MANDATORY_WITH_SEPARATOR";
    PROD_TYPE[PROD_TYPE["REPETITION_WITH_SEPARATOR"] = 4] = "REPETITION_WITH_SEPARATOR";
    PROD_TYPE[PROD_TYPE["ALTERNATION"] = 5] = "ALTERNATION";
})(PROD_TYPE = exports.PROD_TYPE || (exports.PROD_TYPE = {}));
function getProdType(prod) {
    /* istanbul ignore else */
    if (prod instanceof api$2.Option || prod === "Option") {
        return PROD_TYPE.OPTION;
    }
    else if (prod instanceof api$2.Repetition || prod === "Repetition") {
        return PROD_TYPE.REPETITION;
    }
    else if (prod instanceof api$2.RepetitionMandatory ||
        prod === "RepetitionMandatory") {
        return PROD_TYPE.REPETITION_MANDATORY;
    }
    else if (prod instanceof api$2.RepetitionMandatoryWithSeparator ||
        prod === "RepetitionMandatoryWithSeparator") {
        return PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR;
    }
    else if (prod instanceof api$2.RepetitionWithSeparator ||
        prod === "RepetitionWithSeparator") {
        return PROD_TYPE.REPETITION_WITH_SEPARATOR;
    }
    else if (prod instanceof api$2.Alternation || prod === "Alternation") {
        return PROD_TYPE.ALTERNATION;
    }
    else {
        throw Error("non exhaustive match");
    }
}
exports.getProdType = getProdType;
function getLookaheadPaths(options) {
    var occurrence = options.occurrence, rule = options.rule, prodType = options.prodType, maxLookahead = options.maxLookahead;
    var type = getProdType(prodType);
    if (type === PROD_TYPE.ALTERNATION) {
        return getLookaheadPathsForOr(occurrence, rule, maxLookahead);
    }
    else {
        return getLookaheadPathsForOptionalProd(occurrence, rule, type, maxLookahead);
    }
}
exports.getLookaheadPaths = getLookaheadPaths;
function buildLookaheadFuncForOr(occurrence, ruleGrammar, maxLookahead, hasPredicates, dynamicTokensEnabled, laFuncBuilder) {
    var lookAheadPaths = getLookaheadPathsForOr(occurrence, ruleGrammar, maxLookahead);
    var tokenMatcher = areTokenCategoriesNotUsed(lookAheadPaths)
        ? tokens.tokenStructuredMatcherNoCategories
        : tokens.tokenStructuredMatcher;
    return laFuncBuilder(lookAheadPaths, hasPredicates, tokenMatcher, dynamicTokensEnabled);
}
exports.buildLookaheadFuncForOr = buildLookaheadFuncForOr;
/**
 *  When dealing with an Optional production (OPTION/MANY/2nd iteration of AT_LEAST_ONE/...) we need to compare
 *  the lookahead "inside" the production and the lookahead immediately "after" it in the same top level rule (context free).
 *
 *  Example: given a production:
 *  ABC(DE)?DF
 *
 *  The optional '(DE)?' should only be entered if we see 'DE'. a single Token 'D' is not sufficient to distinguish between the two
 *  alternatives.
 *
 *  @returns A Lookahead function which will return true IFF the parser should parse the Optional production.
 */
function buildLookaheadFuncForOptionalProd(occurrence, ruleGrammar, k, dynamicTokensEnabled, prodType, lookaheadBuilder) {
    var lookAheadPaths = getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, k);
    var tokenMatcher = areTokenCategoriesNotUsed(lookAheadPaths)
        ? tokens.tokenStructuredMatcherNoCategories
        : tokens.tokenStructuredMatcher;
    return lookaheadBuilder(lookAheadPaths[0], tokenMatcher, dynamicTokensEnabled);
}
exports.buildLookaheadFuncForOptionalProd = buildLookaheadFuncForOptionalProd;
function buildAlternativesLookAheadFunc(alts, hasPredicates, tokenMatcher, dynamicTokensEnabled) {
    var numOfAlts = alts.length;
    var areAllOneTokenLookahead = (0, every_1$1.default)(alts, function (currAlt) {
        return (0, every_1$1.default)(currAlt, function (currPath) {
            return currPath.length === 1;
        });
    });
    // This version takes into account the predicates as well.
    if (hasPredicates) {
        /**
         * @returns {number} - The chosen alternative index
         */
        return function (orAlts) {
            // unfortunately the predicates must be extracted every single time
            // as they cannot be cached due to references to parameters(vars) which are no longer valid.
            // note that in the common case of no predicates, no cpu time will be wasted on this (see else block)
            var predicates = (0, map_1$1.default)(orAlts, function (currAlt) { return currAlt.GATE; });
            for (var t = 0; t < numOfAlts; t++) {
                var currAlt = alts[t];
                var currNumOfPaths = currAlt.length;
                var currPredicate = predicates[t];
                if (currPredicate !== undefined && currPredicate.call(this) === false) {
                    // if the predicate does not match there is no point in checking the paths
                    continue;
                }
                nextPath: for (var j = 0; j < currNumOfPaths; j++) {
                    var currPath = currAlt[j];
                    var currPathLength = currPath.length;
                    for (var i = 0; i < currPathLength; i++) {
                        var nextToken = this.LA(i + 1);
                        if (tokenMatcher(nextToken, currPath[i]) === false) {
                            // mismatch in current path
                            // try the next pth
                            continue nextPath;
                        }
                    }
                    // found a full path that matches.
                    // this will also work for an empty ALT as the loop will be skipped
                    return t;
                }
                // none of the paths for the current alternative matched
                // try the next alternative
            }
            // none of the alternatives could be matched
            return undefined;
        };
    }
    else if (areAllOneTokenLookahead && !dynamicTokensEnabled) {
        // optimized (common) case of all the lookaheads paths requiring only
        // a single token lookahead. These Optimizations cannot work if dynamically defined Tokens are used.
        var singleTokenAlts = (0, map_1$1.default)(alts, function (currAlt) {
            return (0, flatten_1$1.default)(currAlt);
        });
        var choiceToAlt_1 = (0, reduce_1$1.default)(singleTokenAlts, function (result, currAlt, idx) {
            (0, forEach_1$1.default)(currAlt, function (currTokType) {
                if (!(0, has_1$1.default)(result, currTokType.tokenTypeIdx)) {
                    result[currTokType.tokenTypeIdx] = idx;
                }
                (0, forEach_1$1.default)(currTokType.categoryMatches, function (currExtendingType) {
                    if (!(0, has_1$1.default)(result, currExtendingType)) {
                        result[currExtendingType] = idx;
                    }
                });
            });
            return result;
        }, {});
        /**
         * @returns {number} - The chosen alternative index
         */
        return function () {
            var nextToken = this.LA(1);
            return choiceToAlt_1[nextToken.tokenTypeIdx];
        };
    }
    else {
        // optimized lookahead without needing to check the predicates at all.
        // this causes code duplication which is intentional to improve performance.
        /**
         * @returns {number} - The chosen alternative index
         */
        return function () {
            for (var t = 0; t < numOfAlts; t++) {
                var currAlt = alts[t];
                var currNumOfPaths = currAlt.length;
                nextPath: for (var j = 0; j < currNumOfPaths; j++) {
                    var currPath = currAlt[j];
                    var currPathLength = currPath.length;
                    for (var i = 0; i < currPathLength; i++) {
                        var nextToken = this.LA(i + 1);
                        if (tokenMatcher(nextToken, currPath[i]) === false) {
                            // mismatch in current path
                            // try the next pth
                            continue nextPath;
                        }
                    }
                    // found a full path that matches.
                    // this will also work for an empty ALT as the loop will be skipped
                    return t;
                }
                // none of the paths for the current alternative matched
                // try the next alternative
            }
            // none of the alternatives could be matched
            return undefined;
        };
    }
}
exports.buildAlternativesLookAheadFunc = buildAlternativesLookAheadFunc;
function buildSingleAlternativeLookaheadFunction(alt, tokenMatcher, dynamicTokensEnabled) {
    var areAllOneTokenLookahead = (0, every_1$1.default)(alt, function (currPath) {
        return currPath.length === 1;
    });
    var numOfPaths = alt.length;
    // optimized (common) case of all the lookaheads paths requiring only
    // a single token lookahead.
    if (areAllOneTokenLookahead && !dynamicTokensEnabled) {
        var singleTokensTypes = (0, flatten_1$1.default)(alt);
        if (singleTokensTypes.length === 1 &&
            (0, isEmpty_1$1.default)(singleTokensTypes[0].categoryMatches)) {
            var expectedTokenType = singleTokensTypes[0];
            var expectedTokenUniqueKey_1 = expectedTokenType.tokenTypeIdx;
            return function () {
                return this.LA(1).tokenTypeIdx === expectedTokenUniqueKey_1;
            };
        }
        else {
            var choiceToAlt_2 = (0, reduce_1$1.default)(singleTokensTypes, function (result, currTokType, idx) {
                result[currTokType.tokenTypeIdx] = true;
                (0, forEach_1$1.default)(currTokType.categoryMatches, function (currExtendingType) {
                    result[currExtendingType] = true;
                });
                return result;
            }, []);
            return function () {
                var nextToken = this.LA(1);
                return choiceToAlt_2[nextToken.tokenTypeIdx] === true;
            };
        }
    }
    else {
        return function () {
            nextPath: for (var j = 0; j < numOfPaths; j++) {
                var currPath = alt[j];
                var currPathLength = currPath.length;
                for (var i = 0; i < currPathLength; i++) {
                    var nextToken = this.LA(i + 1);
                    if (tokenMatcher(nextToken, currPath[i]) === false) {
                        // mismatch in current path
                        // try the next pth
                        continue nextPath;
                    }
                }
                // found a full path that matches.
                return true;
            }
            // none of the paths matched
            return false;
        };
    }
}
exports.buildSingleAlternativeLookaheadFunction = buildSingleAlternativeLookaheadFunction;
var RestDefinitionFinderWalker = /** @class */ (function (_super) {
    __extends(RestDefinitionFinderWalker, _super);
    function RestDefinitionFinderWalker(topProd, targetOccurrence, targetProdType) {
        var _this = _super.call(this) || this;
        _this.topProd = topProd;
        _this.targetOccurrence = targetOccurrence;
        _this.targetProdType = targetProdType;
        return _this;
    }
    RestDefinitionFinderWalker.prototype.startWalking = function () {
        this.walk(this.topProd);
        return this.restDef;
    };
    RestDefinitionFinderWalker.prototype.checkIsTarget = function (node, expectedProdType, currRest, prevRest) {
        if (node.idx === this.targetOccurrence &&
            this.targetProdType === expectedProdType) {
            this.restDef = currRest.concat(prevRest);
            return true;
        }
        // performance optimization, do not iterate over the entire Grammar ast after we have found the target
        return false;
    };
    RestDefinitionFinderWalker.prototype.walkOption = function (optionProd, currRest, prevRest) {
        if (!this.checkIsTarget(optionProd, PROD_TYPE.OPTION, currRest, prevRest)) {
            _super.prototype.walkOption.call(this, optionProd, currRest, prevRest);
        }
    };
    RestDefinitionFinderWalker.prototype.walkAtLeastOne = function (atLeastOneProd, currRest, prevRest) {
        if (!this.checkIsTarget(atLeastOneProd, PROD_TYPE.REPETITION_MANDATORY, currRest, prevRest)) {
            _super.prototype.walkOption.call(this, atLeastOneProd, currRest, prevRest);
        }
    };
    RestDefinitionFinderWalker.prototype.walkAtLeastOneSep = function (atLeastOneSepProd, currRest, prevRest) {
        if (!this.checkIsTarget(atLeastOneSepProd, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR, currRest, prevRest)) {
            _super.prototype.walkOption.call(this, atLeastOneSepProd, currRest, prevRest);
        }
    };
    RestDefinitionFinderWalker.prototype.walkMany = function (manyProd, currRest, prevRest) {
        if (!this.checkIsTarget(manyProd, PROD_TYPE.REPETITION, currRest, prevRest)) {
            _super.prototype.walkOption.call(this, manyProd, currRest, prevRest);
        }
    };
    RestDefinitionFinderWalker.prototype.walkManySep = function (manySepProd, currRest, prevRest) {
        if (!this.checkIsTarget(manySepProd, PROD_TYPE.REPETITION_WITH_SEPARATOR, currRest, prevRest)) {
            _super.prototype.walkOption.call(this, manySepProd, currRest, prevRest);
        }
    };
    return RestDefinitionFinderWalker;
}(rest.RestWalker));
/**
 * Returns the definition of a target production in a top level level rule.
 */
var InsideDefinitionFinderVisitor = /** @class */ (function (_super) {
    __extends(InsideDefinitionFinderVisitor, _super);
    function InsideDefinitionFinderVisitor(targetOccurrence, targetProdType, targetRef) {
        var _this = _super.call(this) || this;
        _this.targetOccurrence = targetOccurrence;
        _this.targetProdType = targetProdType;
        _this.targetRef = targetRef;
        _this.result = [];
        return _this;
    }
    InsideDefinitionFinderVisitor.prototype.checkIsTarget = function (node, expectedProdName) {
        if (node.idx === this.targetOccurrence &&
            this.targetProdType === expectedProdName &&
            (this.targetRef === undefined || node === this.targetRef)) {
            this.result = node.definition;
        }
    };
    InsideDefinitionFinderVisitor.prototype.visitOption = function (node) {
        this.checkIsTarget(node, PROD_TYPE.OPTION);
    };
    InsideDefinitionFinderVisitor.prototype.visitRepetition = function (node) {
        this.checkIsTarget(node, PROD_TYPE.REPETITION);
    };
    InsideDefinitionFinderVisitor.prototype.visitRepetitionMandatory = function (node) {
        this.checkIsTarget(node, PROD_TYPE.REPETITION_MANDATORY);
    };
    InsideDefinitionFinderVisitor.prototype.visitRepetitionMandatoryWithSeparator = function (node) {
        this.checkIsTarget(node, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR);
    };
    InsideDefinitionFinderVisitor.prototype.visitRepetitionWithSeparator = function (node) {
        this.checkIsTarget(node, PROD_TYPE.REPETITION_WITH_SEPARATOR);
    };
    InsideDefinitionFinderVisitor.prototype.visitAlternation = function (node) {
        this.checkIsTarget(node, PROD_TYPE.ALTERNATION);
    };
    return InsideDefinitionFinderVisitor;
}(gast_2.GAstVisitor));
function initializeArrayOfArrays(size) {
    var result = new Array(size);
    for (var i = 0; i < size; i++) {
        result[i] = [];
    }
    return result;
}
/**
 * A sort of hash function between a Path in the grammar and a string.
 * Note that this returns multiple "hashes" to support the scenario of token categories.
 * -  A single path with categories may match multiple **actual** paths.
 */
function pathToHashKeys(path) {
    var keys = [""];
    for (var i = 0; i < path.length; i++) {
        var tokType = path[i];
        var longerKeys = [];
        for (var j = 0; j < keys.length; j++) {
            var currShorterKey = keys[j];
            longerKeys.push(currShorterKey + "_" + tokType.tokenTypeIdx);
            for (var t = 0; t < tokType.categoryMatches.length; t++) {
                var categoriesKeySuffix = "_" + tokType.categoryMatches[t];
                longerKeys.push(currShorterKey + categoriesKeySuffix);
            }
        }
        keys = longerKeys;
    }
    return keys;
}
/**
 * Imperative style due to being called from a hot spot
 */
function isUniquePrefixHash(altKnownPathsKeys, searchPathKeys, idx) {
    for (var currAltIdx = 0; currAltIdx < altKnownPathsKeys.length; currAltIdx++) {
        // We only want to test vs the other alternatives
        if (currAltIdx === idx) {
            continue;
        }
        var otherAltKnownPathsKeys = altKnownPathsKeys[currAltIdx];
        for (var searchIdx = 0; searchIdx < searchPathKeys.length; searchIdx++) {
            var searchKey = searchPathKeys[searchIdx];
            if (otherAltKnownPathsKeys[searchKey] === true) {
                return false;
            }
        }
    }
    // None of the SearchPathKeys were found in any of the other alternatives
    return true;
}
function lookAheadSequenceFromAlternatives(altsDefs, k) {
    var partialAlts = (0, map_1$1.default)(altsDefs, function (currAlt) {
        return (0, interpreter.possiblePathsFrom)([currAlt], 1);
    });
    var finalResult = initializeArrayOfArrays(partialAlts.length);
    var altsHashes = (0, map_1$1.default)(partialAlts, function (currAltPaths) {
        var dict = {};
        (0, forEach_1$1.default)(currAltPaths, function (item) {
            var keys = pathToHashKeys(item.partialPath);
            (0, forEach_1$1.default)(keys, function (currKey) {
                dict[currKey] = true;
            });
        });
        return dict;
    });
    var newData = partialAlts;
    // maxLookahead loop
    for (var pathLength = 1; pathLength <= k; pathLength++) {
        var currDataset = newData;
        newData = initializeArrayOfArrays(currDataset.length);
        var _loop_1 = function (altIdx) {
            var currAltPathsAndSuffixes = currDataset[altIdx];
            // paths in current alternative loop
            for (var currPathIdx = 0; currPathIdx < currAltPathsAndSuffixes.length; currPathIdx++) {
                var currPathPrefix = currAltPathsAndSuffixes[currPathIdx].partialPath;
                var suffixDef = currAltPathsAndSuffixes[currPathIdx].suffixDef;
                var prefixKeys = pathToHashKeys(currPathPrefix);
                var isUnique = isUniquePrefixHash(altsHashes, prefixKeys, altIdx);
                // End of the line for this path.
                if (isUnique || (0, isEmpty_1$1.default)(suffixDef) || currPathPrefix.length === k) {
                    var currAltResult = finalResult[altIdx];
                    // TODO: Can we implement a containsPath using Maps/Dictionaries?
                    if (containsPath(currAltResult, currPathPrefix) === false) {
                        currAltResult.push(currPathPrefix);
                        // Update all new  keys for the current path.
                        for (var j = 0; j < prefixKeys.length; j++) {
                            var currKey = prefixKeys[j];
                            altsHashes[altIdx][currKey] = true;
                        }
                    }
                }
                // Expand longer paths
                else {
                    var newPartialPathsAndSuffixes = (0, interpreter.possiblePathsFrom)(suffixDef, pathLength + 1, currPathPrefix);
                    newData[altIdx] = newData[altIdx].concat(newPartialPathsAndSuffixes);
                    // Update keys for new known paths
                    (0, forEach_1$1.default)(newPartialPathsAndSuffixes, function (item) {
                        var prefixKeys = pathToHashKeys(item.partialPath);
                        (0, forEach_1$1.default)(prefixKeys, function (key) {
                            altsHashes[altIdx][key] = true;
                        });
                    });
                }
            }
        };
        // alternatives loop
        for (var altIdx = 0; altIdx < currDataset.length; altIdx++) {
            _loop_1(altIdx);
        }
    }
    return finalResult;
}
exports.lookAheadSequenceFromAlternatives = lookAheadSequenceFromAlternatives;
function getLookaheadPathsForOr(occurrence, ruleGrammar, k, orProd) {
    var visitor = new InsideDefinitionFinderVisitor(occurrence, PROD_TYPE.ALTERNATION, orProd);
    ruleGrammar.accept(visitor);
    return lookAheadSequenceFromAlternatives(visitor.result, k);
}
exports.getLookaheadPathsForOr = getLookaheadPathsForOr;
function getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, k) {
    var insideDefVisitor = new InsideDefinitionFinderVisitor(occurrence, prodType);
    ruleGrammar.accept(insideDefVisitor);
    var insideDef = insideDefVisitor.result;
    var afterDefWalker = new RestDefinitionFinderWalker(ruleGrammar, occurrence, prodType);
    var afterDef = afterDefWalker.startWalking();
    var insideFlat = new api$2.Alternative({ definition: insideDef });
    var afterFlat = new api$2.Alternative({ definition: afterDef });
    return lookAheadSequenceFromAlternatives([insideFlat, afterFlat], k);
}
exports.getLookaheadPathsForOptionalProd = getLookaheadPathsForOptionalProd;
function containsPath(alternative, searchPath) {
    compareOtherPath: for (var i = 0; i < alternative.length; i++) {
        var otherPath = alternative[i];
        if (otherPath.length !== searchPath.length) {
            continue;
        }
        for (var j = 0; j < otherPath.length; j++) {
            var searchTok = searchPath[j];
            var otherTok = otherPath[j];
            var matchingTokens = searchTok === otherTok ||
                otherTok.categoryMatchesMap[searchTok.tokenTypeIdx] !== undefined;
            if (matchingTokens === false) {
                continue compareOtherPath;
            }
        }
        return true;
    }
    return false;
}
exports.containsPath = containsPath;
function isStrictPrefixOfPath(prefix, other) {
    return (prefix.length < other.length &&
        (0, every_1$1.default)(prefix, function (tokType, idx) {
            var otherTokType = other[idx];
            return (tokType === otherTokType ||
                otherTokType.categoryMatchesMap[tokType.tokenTypeIdx]);
        }));
}
exports.isStrictPrefixOfPath = isStrictPrefixOfPath;
function areTokenCategoriesNotUsed(lookAheadPaths) {
    return (0, every_1$1.default)(lookAheadPaths, function (singleAltPaths) {
        return (0, every_1$1.default)(singleAltPaths, function (singlePath) {
            return (0, every_1$1.default)(singlePath, function (token) { return (0, isEmpty_1$1.default)(token.categoryMatches); });
        });
    });
}
exports.areTokenCategoriesNotUsed = areTokenCategoriesNotUsed;

});

var checks = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (commonjsGlobal && commonjsGlobal.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPrefixAlternativesAmbiguities = exports.validateSomeNonEmptyLookaheadPath = exports.validateTooManyAlts = exports.RepetitionCollector = exports.validateAmbiguousAlternationAlternatives = exports.validateEmptyOrAlternative = exports.getFirstNoneTerminal = exports.validateNoLeftRecursion = exports.validateRuleIsOverridden = exports.validateRuleDoesNotAlreadyExist = exports.OccurrenceValidationCollector = exports.identifyProductionForDuplicates = exports.validateGrammar = exports.validateLookahead = void 0;
var first_1 = __importDefault(first);
var isEmpty_1$1 = __importDefault(isEmpty_1);
var drop_1$1 = __importDefault(drop_1);
var flatten_1$1 = __importDefault(flatten_1);
var filter_1$1 = __importDefault(filter_1);
var reject_1$1 = __importDefault(reject_1);
var difference_1$1 = __importDefault(difference_1);
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var groupBy_1$1 = __importDefault(groupBy_1);
var reduce_1$1 = __importDefault(reduce_1);
var pickBy_1$1 = __importDefault(pickBy_1);
var values_1$1 = __importDefault(values_1);
var includes_1$1 = __importDefault(includes_1);
var flatMap_1$1 = __importDefault(flatMap_1);
var clone_1$1 = __importDefault(clone_1);




var gast_2 = api$2;
var gast_3 = api$2;
var dropRight_1$1 = __importDefault(dropRight_1);
var compact_1$1 = __importDefault(compact_1);

function validateLookahead(options) {
    var lookaheadValidationErrorMessages = options.lookaheadStrategy.validate({
        rules: options.rules,
        tokenTypes: options.tokenTypes,
        grammarName: options.grammarName
    });
    return (0, map_1$1.default)(lookaheadValidationErrorMessages, function (errorMessage) { return (__assign({ type: parser_1.ParserDefinitionErrorType.CUSTOM_LOOKAHEAD_VALIDATION }, errorMessage)); });
}
exports.validateLookahead = validateLookahead;
function validateGrammar(topLevels, tokenTypes, errMsgProvider, grammarName) {
    var duplicateErrors = (0, flatMap_1$1.default)(topLevels, function (currTopLevel) { return validateDuplicateProductions(currTopLevel, errMsgProvider); });
    var termsNamespaceConflictErrors = checkTerminalAndNoneTerminalsNameSpace(topLevels, tokenTypes, errMsgProvider);
    var tooManyAltsErrors = (0, flatMap_1$1.default)(topLevels, function (curRule) {
        return validateTooManyAlts(curRule, errMsgProvider);
    });
    var duplicateRulesError = (0, flatMap_1$1.default)(topLevels, function (curRule) {
        return validateRuleDoesNotAlreadyExist(curRule, topLevels, grammarName, errMsgProvider);
    });
    return duplicateErrors.concat(termsNamespaceConflictErrors, tooManyAltsErrors, duplicateRulesError);
}
exports.validateGrammar = validateGrammar;
function validateDuplicateProductions(topLevelRule, errMsgProvider) {
    var collectorVisitor = new OccurrenceValidationCollector();
    topLevelRule.accept(collectorVisitor);
    var allRuleProductions = collectorVisitor.allProductions;
    var productionGroups = (0, groupBy_1$1.default)(allRuleProductions, identifyProductionForDuplicates);
    var duplicates = (0, pickBy_1$1.default)(productionGroups, function (currGroup) {
        return currGroup.length > 1;
    });
    var errors = (0, map_1$1.default)((0, values_1$1.default)(duplicates), function (currDuplicates) {
        var firstProd = (0, first_1.default)(currDuplicates);
        var msg = errMsgProvider.buildDuplicateFoundError(topLevelRule, currDuplicates);
        var dslName = (0, api$2.getProductionDslName)(firstProd);
        var defError = {
            message: msg,
            type: parser_1.ParserDefinitionErrorType.DUPLICATE_PRODUCTIONS,
            ruleName: topLevelRule.name,
            dslName: dslName,
            occurrence: firstProd.idx
        };
        var param = getExtraProductionArgument(firstProd);
        if (param) {
            defError.parameter = param;
        }
        return defError;
    });
    return errors;
}
function identifyProductionForDuplicates(prod) {
    return "".concat((0, api$2.getProductionDslName)(prod), "_#_").concat(prod.idx, "_#_").concat(getExtraProductionArgument(prod));
}
exports.identifyProductionForDuplicates = identifyProductionForDuplicates;
function getExtraProductionArgument(prod) {
    if (prod instanceof gast_2.Terminal) {
        return prod.terminalType.name;
    }
    else if (prod instanceof gast_2.NonTerminal) {
        return prod.nonTerminalName;
    }
    else {
        return "";
    }
}
var OccurrenceValidationCollector = /** @class */ (function (_super) {
    __extends(OccurrenceValidationCollector, _super);
    function OccurrenceValidationCollector() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.allProductions = [];
        return _this;
    }
    OccurrenceValidationCollector.prototype.visitNonTerminal = function (subrule) {
        this.allProductions.push(subrule);
    };
    OccurrenceValidationCollector.prototype.visitOption = function (option) {
        this.allProductions.push(option);
    };
    OccurrenceValidationCollector.prototype.visitRepetitionWithSeparator = function (manySep) {
        this.allProductions.push(manySep);
    };
    OccurrenceValidationCollector.prototype.visitRepetitionMandatory = function (atLeastOne) {
        this.allProductions.push(atLeastOne);
    };
    OccurrenceValidationCollector.prototype.visitRepetitionMandatoryWithSeparator = function (atLeastOneSep) {
        this.allProductions.push(atLeastOneSep);
    };
    OccurrenceValidationCollector.prototype.visitRepetition = function (many) {
        this.allProductions.push(many);
    };
    OccurrenceValidationCollector.prototype.visitAlternation = function (or) {
        this.allProductions.push(or);
    };
    OccurrenceValidationCollector.prototype.visitTerminal = function (terminal) {
        this.allProductions.push(terminal);
    };
    return OccurrenceValidationCollector;
}(gast_3.GAstVisitor));
exports.OccurrenceValidationCollector = OccurrenceValidationCollector;
function validateRuleDoesNotAlreadyExist(rule, allRules, className, errMsgProvider) {
    var errors = [];
    var occurrences = (0, reduce_1$1.default)(allRules, function (result, curRule) {
        if (curRule.name === rule.name) {
            return result + 1;
        }
        return result;
    }, 0);
    if (occurrences > 1) {
        var errMsg = errMsgProvider.buildDuplicateRuleNameError({
            topLevelRule: rule,
            grammarName: className
        });
        errors.push({
            message: errMsg,
            type: parser_1.ParserDefinitionErrorType.DUPLICATE_RULE_NAME,
            ruleName: rule.name
        });
    }
    return errors;
}
exports.validateRuleDoesNotAlreadyExist = validateRuleDoesNotAlreadyExist;
// TODO: is there anyway to get only the rule names of rules inherited from the super grammars?
// This is not part of the IGrammarErrorProvider because the validation cannot be performed on
// The grammar structure, only at runtime.
function validateRuleIsOverridden(ruleName, definedRulesNames, className) {
    var errors = [];
    var errMsg;
    if (!(0, includes_1$1.default)(definedRulesNames, ruleName)) {
        errMsg =
            "Invalid rule override, rule: ->".concat(ruleName, "<- cannot be overridden in the grammar: ->").concat(className, "<-") +
                "as it is not defined in any of the super grammars ";
        errors.push({
            message: errMsg,
            type: parser_1.ParserDefinitionErrorType.INVALID_RULE_OVERRIDE,
            ruleName: ruleName
        });
    }
    return errors;
}
exports.validateRuleIsOverridden = validateRuleIsOverridden;
function validateNoLeftRecursion(topRule, currRule, errMsgProvider, path) {
    if (path === void 0) { path = []; }
    var errors = [];
    var nextNonTerminals = getFirstNoneTerminal(currRule.definition);
    if ((0, isEmpty_1$1.default)(nextNonTerminals)) {
        return [];
    }
    else {
        var ruleName = topRule.name;
        var foundLeftRecursion = (0, includes_1$1.default)(nextNonTerminals, topRule);
        if (foundLeftRecursion) {
            errors.push({
                message: errMsgProvider.buildLeftRecursionError({
                    topLevelRule: topRule,
                    leftRecursionPath: path
                }),
                type: parser_1.ParserDefinitionErrorType.LEFT_RECURSION,
                ruleName: ruleName
            });
        }
        // we are only looking for cyclic paths leading back to the specific topRule
        // other cyclic paths are ignored, we still need this difference to avoid infinite loops...
        var validNextSteps = (0, difference_1$1.default)(nextNonTerminals, path.concat([topRule]));
        var errorsFromNextSteps = (0, flatMap_1$1.default)(validNextSteps, function (currRefRule) {
            var newPath = (0, clone_1$1.default)(path);
            newPath.push(currRefRule);
            return validateNoLeftRecursion(topRule, currRefRule, errMsgProvider, newPath);
        });
        return errors.concat(errorsFromNextSteps);
    }
}
exports.validateNoLeftRecursion = validateNoLeftRecursion;
function getFirstNoneTerminal(definition) {
    var result = [];
    if ((0, isEmpty_1$1.default)(definition)) {
        return result;
    }
    var firstProd = (0, first_1.default)(definition);
    /* istanbul ignore else */
    if (firstProd instanceof gast_2.NonTerminal) {
        result.push(firstProd.referencedRule);
    }
    else if (firstProd instanceof gast_2.Alternative ||
        firstProd instanceof gast_2.Option ||
        firstProd instanceof gast_2.RepetitionMandatory ||
        firstProd instanceof gast_2.RepetitionMandatoryWithSeparator ||
        firstProd instanceof gast_2.RepetitionWithSeparator ||
        firstProd instanceof gast_2.Repetition) {
        result = result.concat(getFirstNoneTerminal(firstProd.definition));
    }
    else if (firstProd instanceof gast_2.Alternation) {
        // each sub definition in alternation is a FLAT
        result = (0, flatten_1$1.default)((0, map_1$1.default)(firstProd.definition, function (currSubDef) {
            return getFirstNoneTerminal(currSubDef.definition);
        }));
    }
    else if (firstProd instanceof gast_2.Terminal) ;
    else {
        throw Error("non exhaustive match");
    }
    var isFirstOptional = (0, api$2.isOptionalProd)(firstProd);
    var hasMore = definition.length > 1;
    if (isFirstOptional && hasMore) {
        var rest = (0, drop_1$1.default)(definition);
        return result.concat(getFirstNoneTerminal(rest));
    }
    else {
        return result;
    }
}
exports.getFirstNoneTerminal = getFirstNoneTerminal;
var OrCollector = /** @class */ (function (_super) {
    __extends(OrCollector, _super);
    function OrCollector() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.alternations = [];
        return _this;
    }
    OrCollector.prototype.visitAlternation = function (node) {
        this.alternations.push(node);
    };
    return OrCollector;
}(gast_3.GAstVisitor));
function validateEmptyOrAlternative(topLevelRule, errMsgProvider) {
    var orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    var ors = orCollector.alternations;
    var errors = (0, flatMap_1$1.default)(ors, function (currOr) {
        var exceptLast = (0, dropRight_1$1.default)(currOr.definition);
        return (0, flatMap_1$1.default)(exceptLast, function (currAlternative, currAltIdx) {
            var possibleFirstInAlt = (0, interpreter.nextPossibleTokensAfter)([currAlternative], [], tokens.tokenStructuredMatcher, 1);
            if ((0, isEmpty_1$1.default)(possibleFirstInAlt)) {
                return [
                    {
                        message: errMsgProvider.buildEmptyAlternationError({
                            topLevelRule: topLevelRule,
                            alternation: currOr,
                            emptyChoiceIdx: currAltIdx
                        }),
                        type: parser_1.ParserDefinitionErrorType.NONE_LAST_EMPTY_ALT,
                        ruleName: topLevelRule.name,
                        occurrence: currOr.idx,
                        alternative: currAltIdx + 1
                    }
                ];
            }
            else {
                return [];
            }
        });
    });
    return errors;
}
exports.validateEmptyOrAlternative = validateEmptyOrAlternative;
function validateAmbiguousAlternationAlternatives(topLevelRule, globalMaxLookahead, errMsgProvider) {
    var orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    var ors = orCollector.alternations;
    // New Handling of ignoring ambiguities
    // - https://github.com/chevrotain/chevrotain/issues/869
    ors = (0, reject_1$1.default)(ors, function (currOr) { return currOr.ignoreAmbiguities === true; });
    var errors = (0, flatMap_1$1.default)(ors, function (currOr) {
        var currOccurrence = currOr.idx;
        var actualMaxLookahead = currOr.maxLookahead || globalMaxLookahead;
        var alternatives = (0, lookahead.getLookaheadPathsForOr)(currOccurrence, topLevelRule, actualMaxLookahead, currOr);
        var altsAmbiguityErrors = checkAlternativesAmbiguities(alternatives, currOr, topLevelRule, errMsgProvider);
        var altsPrefixAmbiguityErrors = checkPrefixAlternativesAmbiguities(alternatives, currOr, topLevelRule, errMsgProvider);
        return altsAmbiguityErrors.concat(altsPrefixAmbiguityErrors);
    });
    return errors;
}
exports.validateAmbiguousAlternationAlternatives = validateAmbiguousAlternationAlternatives;
var RepetitionCollector = /** @class */ (function (_super) {
    __extends(RepetitionCollector, _super);
    function RepetitionCollector() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.allProductions = [];
        return _this;
    }
    RepetitionCollector.prototype.visitRepetitionWithSeparator = function (manySep) {
        this.allProductions.push(manySep);
    };
    RepetitionCollector.prototype.visitRepetitionMandatory = function (atLeastOne) {
        this.allProductions.push(atLeastOne);
    };
    RepetitionCollector.prototype.visitRepetitionMandatoryWithSeparator = function (atLeastOneSep) {
        this.allProductions.push(atLeastOneSep);
    };
    RepetitionCollector.prototype.visitRepetition = function (many) {
        this.allProductions.push(many);
    };
    return RepetitionCollector;
}(gast_3.GAstVisitor));
exports.RepetitionCollector = RepetitionCollector;
function validateTooManyAlts(topLevelRule, errMsgProvider) {
    var orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    var ors = orCollector.alternations;
    var errors = (0, flatMap_1$1.default)(ors, function (currOr) {
        if (currOr.definition.length > 255) {
            return [
                {
                    message: errMsgProvider.buildTooManyAlternativesError({
                        topLevelRule: topLevelRule,
                        alternation: currOr
                    }),
                    type: parser_1.ParserDefinitionErrorType.TOO_MANY_ALTS,
                    ruleName: topLevelRule.name,
                    occurrence: currOr.idx
                }
            ];
        }
        else {
            return [];
        }
    });
    return errors;
}
exports.validateTooManyAlts = validateTooManyAlts;
function validateSomeNonEmptyLookaheadPath(topLevelRules, maxLookahead, errMsgProvider) {
    var errors = [];
    (0, forEach_1$1.default)(topLevelRules, function (currTopRule) {
        var collectorVisitor = new RepetitionCollector();
        currTopRule.accept(collectorVisitor);
        var allRuleProductions = collectorVisitor.allProductions;
        (0, forEach_1$1.default)(allRuleProductions, function (currProd) {
            var prodType = (0, lookahead.getProdType)(currProd);
            var actualMaxLookahead = currProd.maxLookahead || maxLookahead;
            var currOccurrence = currProd.idx;
            var paths = (0, lookahead.getLookaheadPathsForOptionalProd)(currOccurrence, currTopRule, prodType, actualMaxLookahead);
            var pathsInsideProduction = paths[0];
            if ((0, isEmpty_1$1.default)((0, flatten_1$1.default)(pathsInsideProduction))) {
                var errMsg = errMsgProvider.buildEmptyRepetitionError({
                    topLevelRule: currTopRule,
                    repetition: currProd
                });
                errors.push({
                    message: errMsg,
                    type: parser_1.ParserDefinitionErrorType.NO_NON_EMPTY_LOOKAHEAD,
                    ruleName: currTopRule.name
                });
            }
        });
    });
    return errors;
}
exports.validateSomeNonEmptyLookaheadPath = validateSomeNonEmptyLookaheadPath;
function checkAlternativesAmbiguities(alternatives, alternation, rule, errMsgProvider) {
    var foundAmbiguousPaths = [];
    var identicalAmbiguities = (0, reduce_1$1.default)(alternatives, function (result, currAlt, currAltIdx) {
        // ignore (skip) ambiguities with this alternative
        if (alternation.definition[currAltIdx].ignoreAmbiguities === true) {
            return result;
        }
        (0, forEach_1$1.default)(currAlt, function (currPath) {
            var altsCurrPathAppearsIn = [currAltIdx];
            (0, forEach_1$1.default)(alternatives, function (currOtherAlt, currOtherAltIdx) {
                if (currAltIdx !== currOtherAltIdx &&
                    (0, lookahead.containsPath)(currOtherAlt, currPath) &&
                    // ignore (skip) ambiguities with this "other" alternative
                    alternation.definition[currOtherAltIdx].ignoreAmbiguities !== true) {
                    altsCurrPathAppearsIn.push(currOtherAltIdx);
                }
            });
            if (altsCurrPathAppearsIn.length > 1 &&
                !(0, lookahead.containsPath)(foundAmbiguousPaths, currPath)) {
                foundAmbiguousPaths.push(currPath);
                result.push({
                    alts: altsCurrPathAppearsIn,
                    path: currPath
                });
            }
        });
        return result;
    }, []);
    var currErrors = (0, map_1$1.default)(identicalAmbiguities, function (currAmbDescriptor) {
        var ambgIndices = (0, map_1$1.default)(currAmbDescriptor.alts, function (currAltIdx) { return currAltIdx + 1; });
        var currMessage = errMsgProvider.buildAlternationAmbiguityError({
            topLevelRule: rule,
            alternation: alternation,
            ambiguityIndices: ambgIndices,
            prefixPath: currAmbDescriptor.path
        });
        return {
            message: currMessage,
            type: parser_1.ParserDefinitionErrorType.AMBIGUOUS_ALTS,
            ruleName: rule.name,
            occurrence: alternation.idx,
            alternatives: currAmbDescriptor.alts
        };
    });
    return currErrors;
}
function checkPrefixAlternativesAmbiguities(alternatives, alternation, rule, errMsgProvider) {
    // flatten
    var pathsAndIndices = (0, reduce_1$1.default)(alternatives, function (result, currAlt, idx) {
        var currPathsAndIdx = (0, map_1$1.default)(currAlt, function (currPath) {
            return { idx: idx, path: currPath };
        });
        return result.concat(currPathsAndIdx);
    }, []);
    var errors = (0, compact_1$1.default)((0, flatMap_1$1.default)(pathsAndIndices, function (currPathAndIdx) {
        var alternativeGast = alternation.definition[currPathAndIdx.idx];
        // ignore (skip) ambiguities with this alternative
        if (alternativeGast.ignoreAmbiguities === true) {
            return [];
        }
        var targetIdx = currPathAndIdx.idx;
        var targetPath = currPathAndIdx.path;
        var prefixAmbiguitiesPathsAndIndices = (0, filter_1$1.default)(pathsAndIndices, function (searchPathAndIdx) {
            // prefix ambiguity can only be created from lower idx (higher priority) path
            return (
            // ignore (skip) ambiguities with this "other" alternative
            alternation.definition[searchPathAndIdx.idx].ignoreAmbiguities !==
                true &&
                searchPathAndIdx.idx < targetIdx &&
                // checking for strict prefix because identical lookaheads
                // will be be detected using a different validation.
                (0, lookahead.isStrictPrefixOfPath)(searchPathAndIdx.path, targetPath));
        });
        var currPathPrefixErrors = (0, map_1$1.default)(prefixAmbiguitiesPathsAndIndices, function (currAmbPathAndIdx) {
            var ambgIndices = [currAmbPathAndIdx.idx + 1, targetIdx + 1];
            var occurrence = alternation.idx === 0 ? "" : alternation.idx;
            var message = errMsgProvider.buildAlternationPrefixAmbiguityError({
                topLevelRule: rule,
                alternation: alternation,
                ambiguityIndices: ambgIndices,
                prefixPath: currAmbPathAndIdx.path
            });
            return {
                message: message,
                type: parser_1.ParserDefinitionErrorType.AMBIGUOUS_PREFIX_ALTS,
                ruleName: rule.name,
                occurrence: occurrence,
                alternatives: ambgIndices
            };
        });
        return currPathPrefixErrors;
    }));
    return errors;
}
exports.checkPrefixAlternativesAmbiguities = checkPrefixAlternativesAmbiguities;
function checkTerminalAndNoneTerminalsNameSpace(topLevels, tokenTypes, errMsgProvider) {
    var errors = [];
    var tokenNames = (0, map_1$1.default)(tokenTypes, function (currToken) { return currToken.name; });
    (0, forEach_1$1.default)(topLevels, function (currRule) {
        var currRuleName = currRule.name;
        if ((0, includes_1$1.default)(tokenNames, currRuleName)) {
            var errMsg = errMsgProvider.buildNamespaceConflictError(currRule);
            errors.push({
                message: errMsg,
                type: parser_1.ParserDefinitionErrorType.CONFLICT_TOKENS_RULES_NAMESPACE,
                ruleName: currRuleName
            });
        }
    });
    return errors;
}

});

var gast_resolver_public = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGrammar = exports.resolveGrammar = void 0;
var forEach_1$1 = __importDefault(forEach_1);
var defaults_1$1 = __importDefault(defaults_1);



function resolveGrammar(options) {
    var actualOptions = (0, defaults_1$1.default)(options, {
        errMsgProvider: errors_public.defaultGrammarResolverErrorProvider
    });
    var topRulesTable = {};
    (0, forEach_1$1.default)(options.rules, function (rule) {
        topRulesTable[rule.name] = rule;
    });
    return (0, resolver.resolveGrammar)(topRulesTable, actualOptions.errMsgProvider);
}
exports.resolveGrammar = resolveGrammar;
function validateGrammar(options) {
    options = (0, defaults_1$1.default)(options, {
        errMsgProvider: errors_public.defaultGrammarValidatorErrorProvider
    });
    return (0, checks.validateGrammar)(options.rules, options.tokenTypes, options.errMsgProvider, options.grammarName);
}
exports.validateGrammar = validateGrammar;

});

var exceptions_public = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EarlyExitException = exports.NotAllInputParsedException = exports.NoViableAltException = exports.MismatchedTokenException = exports.isRecognitionException = void 0;
var includes_1$1 = __importDefault(includes_1);
var MISMATCHED_TOKEN_EXCEPTION = "MismatchedTokenException";
var NO_VIABLE_ALT_EXCEPTION = "NoViableAltException";
var EARLY_EXIT_EXCEPTION = "EarlyExitException";
var NOT_ALL_INPUT_PARSED_EXCEPTION = "NotAllInputParsedException";
var RECOGNITION_EXCEPTION_NAMES = [
    MISMATCHED_TOKEN_EXCEPTION,
    NO_VIABLE_ALT_EXCEPTION,
    EARLY_EXIT_EXCEPTION,
    NOT_ALL_INPUT_PARSED_EXCEPTION
];
Object.freeze(RECOGNITION_EXCEPTION_NAMES);
// hacks to bypass no support for custom Errors in javascript/typescript
function isRecognitionException(error) {
    // can't do instanceof on hacked custom js exceptions
    return (0, includes_1$1.default)(RECOGNITION_EXCEPTION_NAMES, error.name);
}
exports.isRecognitionException = isRecognitionException;
var RecognitionException = /** @class */ (function (_super) {
    __extends(RecognitionException, _super);
    function RecognitionException(message, token) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        _this.token = token;
        _this.resyncedTokens = [];
        // fix prototype chain when typescript target is ES5
        Object.setPrototypeOf(_this, _newTarget.prototype);
        /* istanbul ignore next - V8 workaround to remove constructor from stacktrace when typescript target is ES5 */
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, _this.constructor);
        }
        return _this;
    }
    return RecognitionException;
}(Error));
var MismatchedTokenException = /** @class */ (function (_super) {
    __extends(MismatchedTokenException, _super);
    function MismatchedTokenException(message, token, previousToken) {
        var _this = _super.call(this, message, token) || this;
        _this.previousToken = previousToken;
        _this.name = MISMATCHED_TOKEN_EXCEPTION;
        return _this;
    }
    return MismatchedTokenException;
}(RecognitionException));
exports.MismatchedTokenException = MismatchedTokenException;
var NoViableAltException = /** @class */ (function (_super) {
    __extends(NoViableAltException, _super);
    function NoViableAltException(message, token, previousToken) {
        var _this = _super.call(this, message, token) || this;
        _this.previousToken = previousToken;
        _this.name = NO_VIABLE_ALT_EXCEPTION;
        return _this;
    }
    return NoViableAltException;
}(RecognitionException));
exports.NoViableAltException = NoViableAltException;
var NotAllInputParsedException = /** @class */ (function (_super) {
    __extends(NotAllInputParsedException, _super);
    function NotAllInputParsedException(message, token) {
        var _this = _super.call(this, message, token) || this;
        _this.name = NOT_ALL_INPUT_PARSED_EXCEPTION;
        return _this;
    }
    return NotAllInputParsedException;
}(RecognitionException));
exports.NotAllInputParsedException = NotAllInputParsedException;
var EarlyExitException = /** @class */ (function (_super) {
    __extends(EarlyExitException, _super);
    function EarlyExitException(message, token, previousToken) {
        var _this = _super.call(this, message, token) || this;
        _this.previousToken = previousToken;
        _this.name = EARLY_EXIT_EXCEPTION;
        return _this;
    }
    return EarlyExitException;
}(RecognitionException));
exports.EarlyExitException = EarlyExitException;

});

var recoverable = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attemptInRepetitionRecovery = exports.Recoverable = exports.InRuleRecoveryException = exports.IN_RULE_RECOVERY_EXCEPTION = exports.EOF_FOLLOW_KEY = void 0;

var isEmpty_1$1 = __importDefault(isEmpty_1);
var dropRight_1$1 = __importDefault(dropRight_1);
var flatten_1$1 = __importDefault(flatten_1);
var map_1$1 = __importDefault(map_1);
var find_1$1 = __importDefault(find_1);
var has_1$1 = __importDefault(has_1);
var includes_1$1 = __importDefault(includes_1);
var clone_1$1 = __importDefault(clone_1);



exports.EOF_FOLLOW_KEY = {};
exports.IN_RULE_RECOVERY_EXCEPTION = "InRuleRecoveryException";
var InRuleRecoveryException = /** @class */ (function (_super) {
    __extends(InRuleRecoveryException, _super);
    function InRuleRecoveryException(message) {
        var _this = _super.call(this, message) || this;
        _this.name = exports.IN_RULE_RECOVERY_EXCEPTION;
        return _this;
    }
    return InRuleRecoveryException;
}(Error));
exports.InRuleRecoveryException = InRuleRecoveryException;
/**
 * This trait is responsible for the error recovery and fault tolerant logic
 */
var Recoverable = /** @class */ (function () {
    function Recoverable() {
    }
    Recoverable.prototype.initRecoverable = function (config) {
        this.firstAfterRepMap = {};
        this.resyncFollows = {};
        this.recoveryEnabled = (0, has_1$1.default)(config, "recoveryEnabled")
            ? config.recoveryEnabled // assumes end user provides the correct config value/type
            : parser_1.DEFAULT_PARSER_CONFIG.recoveryEnabled;
        // performance optimization, NOOP will be inlined which
        // effectively means that this optional feature does not exist
        // when not used.
        if (this.recoveryEnabled) {
            this.attemptInRepetitionRecovery = attemptInRepetitionRecovery;
        }
    };
    Recoverable.prototype.getTokenToInsert = function (tokType) {
        var tokToInsert = (0, tokens_public.createTokenInstance)(tokType, "", NaN, NaN, NaN, NaN, NaN, NaN);
        tokToInsert.isInsertedInRecovery = true;
        return tokToInsert;
    };
    Recoverable.prototype.canTokenTypeBeInsertedInRecovery = function (tokType) {
        return true;
    };
    Recoverable.prototype.canTokenTypeBeDeletedInRecovery = function (tokType) {
        return true;
    };
    Recoverable.prototype.tryInRepetitionRecovery = function (grammarRule, grammarRuleArgs, lookAheadFunc, expectedTokType) {
        var _this = this;
        // TODO: can the resyncTokenType be cached?
        var reSyncTokType = this.findReSyncTokenType();
        var savedLexerState = this.exportLexerState();
        var resyncedTokens = [];
        var passedResyncPoint = false;
        var nextTokenWithoutResync = this.LA(1);
        var currToken = this.LA(1);
        var generateErrorMessage = function () {
            var previousToken = _this.LA(0);
            // we are preemptively re-syncing before an error has been detected, therefor we must reproduce
            // the error that would have been thrown
            var msg = _this.errorMessageProvider.buildMismatchTokenMessage({
                expected: expectedTokType,
                actual: nextTokenWithoutResync,
                previous: previousToken,
                ruleName: _this.getCurrRuleFullName()
            });
            var error = new exceptions_public.MismatchedTokenException(msg, nextTokenWithoutResync, _this.LA(0));
            // the first token here will be the original cause of the error, this is not part of the resyncedTokens property.
            error.resyncedTokens = (0, dropRight_1$1.default)(resyncedTokens);
            _this.SAVE_ERROR(error);
        };
        while (!passedResyncPoint) {
            // re-synced to a point where we can safely exit the repetition/
            if (this.tokenMatcher(currToken, expectedTokType)) {
                generateErrorMessage();
                return; // must return here to avoid reverting the inputIdx
            }
            else if (lookAheadFunc.call(this)) {
                // we skipped enough tokens so we can resync right back into another iteration of the repetition grammar rule
                generateErrorMessage();
                // recursive invocation in other to support multiple re-syncs in the same top level repetition grammar rule
                grammarRule.apply(this, grammarRuleArgs);
                return; // must return here to avoid reverting the inputIdx
            }
            else if (this.tokenMatcher(currToken, reSyncTokType)) {
                passedResyncPoint = true;
            }
            else {
                currToken = this.SKIP_TOKEN();
                this.addToResyncTokens(currToken, resyncedTokens);
            }
        }
        // we were unable to find a CLOSER point to resync inside the Repetition, reset the state.
        // The parsing exception we were trying to prevent will happen in the NEXT parsing step. it may be handled by
        // "between rules" resync recovery later in the flow.
        this.importLexerState(savedLexerState);
    };
    Recoverable.prototype.shouldInRepetitionRecoveryBeTried = function (expectTokAfterLastMatch, nextTokIdx, notStuck) {
        // Edge case of arriving from a MANY repetition which is stuck
        // Attempting recovery in this case could cause an infinite loop
        if (notStuck === false) {
            return false;
        }
        // no need to recover, next token is what we expect...
        if (this.tokenMatcher(this.LA(1), expectTokAfterLastMatch)) {
            return false;
        }
        // error recovery is disabled during backtracking as it can make the parser ignore a valid grammar path
        // and prefer some backtracking path that includes recovered errors.
        if (this.isBackTracking()) {
            return false;
        }
        // if we can perform inRule recovery (single token insertion or deletion) we always prefer that recovery algorithm
        // because if it works, it makes the least amount of changes to the input stream (greedy algorithm)
        //noinspection RedundantIfStatementJS
        if (this.canPerformInRuleRecovery(expectTokAfterLastMatch, this.getFollowsForInRuleRecovery(expectTokAfterLastMatch, nextTokIdx))) {
            return false;
        }
        return true;
    };
    // Error Recovery functionality
    Recoverable.prototype.getFollowsForInRuleRecovery = function (tokType, tokIdxInRule) {
        var grammarPath = this.getCurrentGrammarPath(tokType, tokIdxInRule);
        var follows = this.getNextPossibleTokenTypes(grammarPath);
        return follows;
    };
    Recoverable.prototype.tryInRuleRecovery = function (expectedTokType, follows) {
        if (this.canRecoverWithSingleTokenInsertion(expectedTokType, follows)) {
            var tokToInsert = this.getTokenToInsert(expectedTokType);
            return tokToInsert;
        }
        if (this.canRecoverWithSingleTokenDeletion(expectedTokType)) {
            var nextTok = this.SKIP_TOKEN();
            this.consumeToken();
            return nextTok;
        }
        throw new InRuleRecoveryException("sad sad panda");
    };
    Recoverable.prototype.canPerformInRuleRecovery = function (expectedToken, follows) {
        return (this.canRecoverWithSingleTokenInsertion(expectedToken, follows) ||
            this.canRecoverWithSingleTokenDeletion(expectedToken));
    };
    Recoverable.prototype.canRecoverWithSingleTokenInsertion = function (expectedTokType, follows) {
        var _this = this;
        if (!this.canTokenTypeBeInsertedInRecovery(expectedTokType)) {
            return false;
        }
        // must know the possible following tokens to perform single token insertion
        if ((0, isEmpty_1$1.default)(follows)) {
            return false;
        }
        var mismatchedTok = this.LA(1);
        var isMisMatchedTokInFollows = (0, find_1$1.default)(follows, function (possibleFollowsTokType) {
            return _this.tokenMatcher(mismatchedTok, possibleFollowsTokType);
        }) !== undefined;
        return isMisMatchedTokInFollows;
    };
    Recoverable.prototype.canRecoverWithSingleTokenDeletion = function (expectedTokType) {
        if (!this.canTokenTypeBeDeletedInRecovery(expectedTokType)) {
            return false;
        }
        var isNextTokenWhatIsExpected = this.tokenMatcher(this.LA(2), expectedTokType);
        return isNextTokenWhatIsExpected;
    };
    Recoverable.prototype.isInCurrentRuleReSyncSet = function (tokenTypeIdx) {
        var followKey = this.getCurrFollowKey();
        var currentRuleReSyncSet = this.getFollowSetFromFollowKey(followKey);
        return (0, includes_1$1.default)(currentRuleReSyncSet, tokenTypeIdx);
    };
    Recoverable.prototype.findReSyncTokenType = function () {
        var allPossibleReSyncTokTypes = this.flattenFollowSet();
        // this loop will always terminate as EOF is always in the follow stack and also always (virtually) in the input
        var nextToken = this.LA(1);
        var k = 2;
        while (true) {
            var foundMatch = (0, find_1$1.default)(allPossibleReSyncTokTypes, function (resyncTokType) {
                var canMatch = (0, tokens_public.tokenMatcher)(nextToken, resyncTokType);
                return canMatch;
            });
            if (foundMatch !== undefined) {
                return foundMatch;
            }
            nextToken = this.LA(k);
            k++;
        }
    };
    Recoverable.prototype.getCurrFollowKey = function () {
        // the length is at least one as we always add the ruleName to the stack before invoking the rule.
        if (this.RULE_STACK.length === 1) {
            return exports.EOF_FOLLOW_KEY;
        }
        var currRuleShortName = this.getLastExplicitRuleShortName();
        var currRuleIdx = this.getLastExplicitRuleOccurrenceIndex();
        var prevRuleShortName = this.getPreviousExplicitRuleShortName();
        return {
            ruleName: this.shortRuleNameToFullName(currRuleShortName),
            idxInCallingRule: currRuleIdx,
            inRule: this.shortRuleNameToFullName(prevRuleShortName)
        };
    };
    Recoverable.prototype.buildFullFollowKeyStack = function () {
        var _this = this;
        var explicitRuleStack = this.RULE_STACK;
        var explicitOccurrenceStack = this.RULE_OCCURRENCE_STACK;
        return (0, map_1$1.default)(explicitRuleStack, function (ruleName, idx) {
            if (idx === 0) {
                return exports.EOF_FOLLOW_KEY;
            }
            return {
                ruleName: _this.shortRuleNameToFullName(ruleName),
                idxInCallingRule: explicitOccurrenceStack[idx],
                inRule: _this.shortRuleNameToFullName(explicitRuleStack[idx - 1])
            };
        });
    };
    Recoverable.prototype.flattenFollowSet = function () {
        var _this = this;
        var followStack = (0, map_1$1.default)(this.buildFullFollowKeyStack(), function (currKey) {
            return _this.getFollowSetFromFollowKey(currKey);
        });
        return (0, flatten_1$1.default)(followStack);
    };
    Recoverable.prototype.getFollowSetFromFollowKey = function (followKey) {
        if (followKey === exports.EOF_FOLLOW_KEY) {
            return [tokens_public.EOF];
        }
        var followName = followKey.ruleName + followKey.idxInCallingRule + constants.IN + followKey.inRule;
        return this.resyncFollows[followName];
    };
    // It does not make any sense to include a virtual EOF token in the list of resynced tokens
    // as EOF does not really exist and thus does not contain any useful information (line/column numbers)
    Recoverable.prototype.addToResyncTokens = function (token, resyncTokens) {
        if (!this.tokenMatcher(token, tokens_public.EOF)) {
            resyncTokens.push(token);
        }
        return resyncTokens;
    };
    Recoverable.prototype.reSyncTo = function (tokType) {
        var resyncedTokens = [];
        var nextTok = this.LA(1);
        while (this.tokenMatcher(nextTok, tokType) === false) {
            nextTok = this.SKIP_TOKEN();
            this.addToResyncTokens(nextTok, resyncedTokens);
        }
        // the last token is not part of the error.
        return (0, dropRight_1$1.default)(resyncedTokens);
    };
    Recoverable.prototype.attemptInRepetitionRecovery = function (prodFunc, args, lookaheadFunc, dslMethodIdx, prodOccurrence, nextToksWalker, notStuck) {
        // by default this is a NO-OP
        // The actual implementation is with the function(not method) below
    };
    Recoverable.prototype.getCurrentGrammarPath = function (tokType, tokIdxInRule) {
        var pathRuleStack = this.getHumanReadableRuleStack();
        var pathOccurrenceStack = (0, clone_1$1.default)(this.RULE_OCCURRENCE_STACK);
        var grammarPath = {
            ruleStack: pathRuleStack,
            occurrenceStack: pathOccurrenceStack,
            lastTok: tokType,
            lastTokOccurrence: tokIdxInRule
        };
        return grammarPath;
    };
    Recoverable.prototype.getHumanReadableRuleStack = function () {
        var _this = this;
        return (0, map_1$1.default)(this.RULE_STACK, function (currShortName) {
            return _this.shortRuleNameToFullName(currShortName);
        });
    };
    return Recoverable;
}());
exports.Recoverable = Recoverable;
function attemptInRepetitionRecovery(prodFunc, args, lookaheadFunc, dslMethodIdx, prodOccurrence, nextToksWalker, notStuck) {
    var key = this.getKeyForAutomaticLookahead(dslMethodIdx, prodOccurrence);
    var firstAfterRepInfo = this.firstAfterRepMap[key];
    if (firstAfterRepInfo === undefined) {
        var currRuleName = this.getCurrRuleFullName();
        var ruleGrammar = this.getGAstProductions()[currRuleName];
        var walker = new nextToksWalker(ruleGrammar, prodOccurrence);
        firstAfterRepInfo = walker.startWalking();
        this.firstAfterRepMap[key] = firstAfterRepInfo;
    }
    var expectTokAfterLastMatch = firstAfterRepInfo.token;
    var nextTokIdx = firstAfterRepInfo.occurrence;
    var isEndOfRule = firstAfterRepInfo.isEndOfRule;
    // special edge case of a TOP most repetition after which the input should END.
    // this will force an attempt for inRule recovery in that scenario.
    if (this.RULE_STACK.length === 1 &&
        isEndOfRule &&
        expectTokAfterLastMatch === undefined) {
        expectTokAfterLastMatch = tokens_public.EOF;
        nextTokIdx = 1;
    }
    // We don't have anything to re-sync to...
    // this condition was extracted from `shouldInRepetitionRecoveryBeTried` to act as a type-guard
    if (expectTokAfterLastMatch === undefined || nextTokIdx === undefined) {
        return;
    }
    if (this.shouldInRepetitionRecoveryBeTried(expectTokAfterLastMatch, nextTokIdx, notStuck)) {
        // TODO: performance optimization: instead of passing the original args here, we modify
        // the args param (or create a new one) and make sure the lookahead func is explicitly provided
        // to avoid searching the cache for it once more.
        this.tryInRepetitionRecovery(prodFunc, args, lookaheadFunc, expectTokAfterLastMatch);
    }
}
exports.attemptInRepetitionRecovery = attemptInRepetitionRecovery;

});

var keys = createCommonjsModule(function (module, exports) {
// Lookahead keys are 32Bit integers in the form
// TTTTTTTT-ZZZZZZZZZZZZ-YYYY-XXXXXXXX
// XXXX -> Occurrence Index bitmap.
// YYYY -> DSL Method Type bitmap.
// ZZZZZZZZZZZZZZZ -> Rule short Index bitmap.
// TTTTTTTTT -> alternation alternative index bitmap
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeyForAutomaticLookahead = exports.AT_LEAST_ONE_SEP_IDX = exports.MANY_SEP_IDX = exports.AT_LEAST_ONE_IDX = exports.MANY_IDX = exports.OPTION_IDX = exports.OR_IDX = exports.BITS_FOR_ALT_IDX = exports.BITS_FOR_RULE_IDX = exports.BITS_FOR_OCCURRENCE_IDX = exports.BITS_FOR_METHOD_TYPE = void 0;
exports.BITS_FOR_METHOD_TYPE = 4;
exports.BITS_FOR_OCCURRENCE_IDX = 8;
exports.BITS_FOR_RULE_IDX = 12;
// TODO: validation, this means that there may at most 2^8 --> 256 alternatives for an alternation.
exports.BITS_FOR_ALT_IDX = 8;
// short string used as part of mapping keys.
// being short improves the performance when composing KEYS for maps out of these
// The 5 - 8 bits (16 possible values, are reserved for the DSL method indices)
exports.OR_IDX = 1 << exports.BITS_FOR_OCCURRENCE_IDX;
exports.OPTION_IDX = 2 << exports.BITS_FOR_OCCURRENCE_IDX;
exports.MANY_IDX = 3 << exports.BITS_FOR_OCCURRENCE_IDX;
exports.AT_LEAST_ONE_IDX = 4 << exports.BITS_FOR_OCCURRENCE_IDX;
exports.MANY_SEP_IDX = 5 << exports.BITS_FOR_OCCURRENCE_IDX;
exports.AT_LEAST_ONE_SEP_IDX = 6 << exports.BITS_FOR_OCCURRENCE_IDX;
// this actually returns a number, but it is always used as a string (object prop key)
function getKeyForAutomaticLookahead(ruleIdx, dslMethodIdx, occurrence) {
    return occurrence | dslMethodIdx | ruleIdx;
}
exports.getKeyForAutomaticLookahead = getKeyForAutomaticLookahead;
32 - exports.BITS_FOR_ALT_IDX;

});

var llk_lookahead = createCommonjsModule(function (module, exports) {
var __spreadArray = (commonjsGlobal && commonjsGlobal.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLkLookaheadStrategy = void 0;
var flatMap_1$1 = __importDefault(flatMap_1);
var isEmpty_1$1 = __importDefault(isEmpty_1);




var LLkLookaheadStrategy = /** @class */ (function () {
    function LLkLookaheadStrategy(options) {
        var _a;
        this.maxLookahead =
            (_a = options === null || options === void 0 ? void 0 : options.maxLookahead) !== null && _a !== void 0 ? _a : parser_1.DEFAULT_PARSER_CONFIG.maxLookahead;
    }
    LLkLookaheadStrategy.prototype.validate = function (options) {
        var leftRecursionErrors = this.validateNoLeftRecursion(options.rules);
        if ((0, isEmpty_1$1.default)(leftRecursionErrors)) {
            var emptyAltErrors = this.validateEmptyOrAlternatives(options.rules);
            var ambiguousAltsErrors = this.validateAmbiguousAlternationAlternatives(options.rules, this.maxLookahead);
            var emptyRepetitionErrors = this.validateSomeNonEmptyLookaheadPath(options.rules, this.maxLookahead);
            var allErrors = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], leftRecursionErrors, true), emptyAltErrors, true), ambiguousAltsErrors, true), emptyRepetitionErrors, true);
            return allErrors;
        }
        return leftRecursionErrors;
    };
    LLkLookaheadStrategy.prototype.validateNoLeftRecursion = function (rules) {
        return (0, flatMap_1$1.default)(rules, function (currTopRule) {
            return (0, checks.validateNoLeftRecursion)(currTopRule, currTopRule, errors_public.defaultGrammarValidatorErrorProvider);
        });
    };
    LLkLookaheadStrategy.prototype.validateEmptyOrAlternatives = function (rules) {
        return (0, flatMap_1$1.default)(rules, function (currTopRule) {
            return (0, checks.validateEmptyOrAlternative)(currTopRule, errors_public.defaultGrammarValidatorErrorProvider);
        });
    };
    LLkLookaheadStrategy.prototype.validateAmbiguousAlternationAlternatives = function (rules, maxLookahead) {
        return (0, flatMap_1$1.default)(rules, function (currTopRule) {
            return (0, checks.validateAmbiguousAlternationAlternatives)(currTopRule, maxLookahead, errors_public.defaultGrammarValidatorErrorProvider);
        });
    };
    LLkLookaheadStrategy.prototype.validateSomeNonEmptyLookaheadPath = function (rules, maxLookahead) {
        return (0, checks.validateSomeNonEmptyLookaheadPath)(rules, maxLookahead, errors_public.defaultGrammarValidatorErrorProvider);
    };
    LLkLookaheadStrategy.prototype.buildLookaheadForAlternation = function (options) {
        return (0, lookahead.buildLookaheadFuncForOr)(options.prodOccurrence, options.rule, options.maxLookahead, options.hasPredicates, options.dynamicTokensEnabled, lookahead.buildAlternativesLookAheadFunc);
    };
    LLkLookaheadStrategy.prototype.buildLookaheadForOptional = function (options) {
        return (0, lookahead.buildLookaheadFuncForOptionalProd)(options.prodOccurrence, options.rule, options.maxLookahead, options.dynamicTokensEnabled, (0, lookahead.getProdType)(options.prodType), lookahead.buildSingleAlternativeLookaheadFunction);
    };
    return LLkLookaheadStrategy;
}());
exports.LLkLookaheadStrategy = LLkLookaheadStrategy;

});

var looksahead = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectMethods = exports.LooksAhead = void 0;
var forEach_1$1 = __importDefault(forEach_1);
var has_1$1 = __importDefault(has_1);



var gast_2 = api$2;

/**
 * Trait responsible for the lookahead related utilities and optimizations.
 */
var LooksAhead = /** @class */ (function () {
    function LooksAhead() {
    }
    LooksAhead.prototype.initLooksAhead = function (config) {
        this.dynamicTokensEnabled = (0, has_1$1.default)(config, "dynamicTokensEnabled")
            ? config.dynamicTokensEnabled // assumes end user provides the correct config value/type
            : parser_1.DEFAULT_PARSER_CONFIG.dynamicTokensEnabled;
        this.maxLookahead = (0, has_1$1.default)(config, "maxLookahead")
            ? config.maxLookahead // assumes end user provides the correct config value/type
            : parser_1.DEFAULT_PARSER_CONFIG.maxLookahead;
        this.lookaheadStrategy = (0, has_1$1.default)(config, "lookaheadStrategy")
            ? config.lookaheadStrategy // assumes end user provides the correct config value/type
            : new llk_lookahead.LLkLookaheadStrategy({ maxLookahead: this.maxLookahead });
        this.lookAheadFuncsCache = new Map();
    };
    LooksAhead.prototype.preComputeLookaheadFunctions = function (rules) {
        var _this = this;
        (0, forEach_1$1.default)(rules, function (currRule) {
            _this.TRACE_INIT("".concat(currRule.name, " Rule Lookahead"), function () {
                var _a = collectMethods(currRule), alternation = _a.alternation, repetition = _a.repetition, option = _a.option, repetitionMandatory = _a.repetitionMandatory, repetitionMandatoryWithSeparator = _a.repetitionMandatoryWithSeparator, repetitionWithSeparator = _a.repetitionWithSeparator;
                (0, forEach_1$1.default)(alternation, function (currProd) {
                    var prodIdx = currProd.idx === 0 ? "" : currProd.idx;
                    _this.TRACE_INIT("".concat((0, gast_2.getProductionDslName)(currProd)).concat(prodIdx), function () {
                        var laFunc = _this.lookaheadStrategy.buildLookaheadForAlternation({
                            prodOccurrence: currProd.idx,
                            rule: currRule,
                            maxLookahead: currProd.maxLookahead || _this.maxLookahead,
                            hasPredicates: currProd.hasPredicates,
                            dynamicTokensEnabled: _this.dynamicTokensEnabled
                        });
                        var key = (0, keys.getKeyForAutomaticLookahead)(_this.fullRuleNameToShort[currRule.name], keys.OR_IDX, currProd.idx);
                        _this.setLaFuncCache(key, laFunc);
                    });
                });
                (0, forEach_1$1.default)(repetition, function (currProd) {
                    _this.computeLookaheadFunc(currRule, currProd.idx, keys.MANY_IDX, "Repetition", currProd.maxLookahead, (0, gast_2.getProductionDslName)(currProd));
                });
                (0, forEach_1$1.default)(option, function (currProd) {
                    _this.computeLookaheadFunc(currRule, currProd.idx, keys.OPTION_IDX, "Option", currProd.maxLookahead, (0, gast_2.getProductionDslName)(currProd));
                });
                (0, forEach_1$1.default)(repetitionMandatory, function (currProd) {
                    _this.computeLookaheadFunc(currRule, currProd.idx, keys.AT_LEAST_ONE_IDX, "RepetitionMandatory", currProd.maxLookahead, (0, gast_2.getProductionDslName)(currProd));
                });
                (0, forEach_1$1.default)(repetitionMandatoryWithSeparator, function (currProd) {
                    _this.computeLookaheadFunc(currRule, currProd.idx, keys.AT_LEAST_ONE_SEP_IDX, "RepetitionMandatoryWithSeparator", currProd.maxLookahead, (0, gast_2.getProductionDslName)(currProd));
                });
                (0, forEach_1$1.default)(repetitionWithSeparator, function (currProd) {
                    _this.computeLookaheadFunc(currRule, currProd.idx, keys.MANY_SEP_IDX, "RepetitionWithSeparator", currProd.maxLookahead, (0, gast_2.getProductionDslName)(currProd));
                });
            });
        });
    };
    LooksAhead.prototype.computeLookaheadFunc = function (rule, prodOccurrence, prodKey, prodType, prodMaxLookahead, dslMethodName) {
        var _this = this;
        this.TRACE_INIT("".concat(dslMethodName).concat(prodOccurrence === 0 ? "" : prodOccurrence), function () {
            var laFunc = _this.lookaheadStrategy.buildLookaheadForOptional({
                prodOccurrence: prodOccurrence,
                rule: rule,
                maxLookahead: prodMaxLookahead || _this.maxLookahead,
                dynamicTokensEnabled: _this.dynamicTokensEnabled,
                prodType: prodType
            });
            var key = (0, keys.getKeyForAutomaticLookahead)(_this.fullRuleNameToShort[rule.name], prodKey, prodOccurrence);
            _this.setLaFuncCache(key, laFunc);
        });
    };
    // this actually returns a number, but it is always used as a string (object prop key)
    LooksAhead.prototype.getKeyForAutomaticLookahead = function (dslMethodIdx, occurrence) {
        var currRuleShortName = this.getLastExplicitRuleShortName();
        return (0, keys.getKeyForAutomaticLookahead)(currRuleShortName, dslMethodIdx, occurrence);
    };
    LooksAhead.prototype.getLaFuncFromCache = function (key) {
        return this.lookAheadFuncsCache.get(key);
    };
    /* istanbul ignore next */
    LooksAhead.prototype.setLaFuncCache = function (key, value) {
        this.lookAheadFuncsCache.set(key, value);
    };
    return LooksAhead;
}());
exports.LooksAhead = LooksAhead;
var DslMethodsCollectorVisitor = /** @class */ (function (_super) {
    __extends(DslMethodsCollectorVisitor, _super);
    function DslMethodsCollectorVisitor() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.dslMethods = {
            option: [],
            alternation: [],
            repetition: [],
            repetitionWithSeparator: [],
            repetitionMandatory: [],
            repetitionMandatoryWithSeparator: []
        };
        return _this;
    }
    DslMethodsCollectorVisitor.prototype.reset = function () {
        this.dslMethods = {
            option: [],
            alternation: [],
            repetition: [],
            repetitionWithSeparator: [],
            repetitionMandatory: [],
            repetitionMandatoryWithSeparator: []
        };
    };
    DslMethodsCollectorVisitor.prototype.visitOption = function (option) {
        this.dslMethods.option.push(option);
    };
    DslMethodsCollectorVisitor.prototype.visitRepetitionWithSeparator = function (manySep) {
        this.dslMethods.repetitionWithSeparator.push(manySep);
    };
    DslMethodsCollectorVisitor.prototype.visitRepetitionMandatory = function (atLeastOne) {
        this.dslMethods.repetitionMandatory.push(atLeastOne);
    };
    DslMethodsCollectorVisitor.prototype.visitRepetitionMandatoryWithSeparator = function (atLeastOneSep) {
        this.dslMethods.repetitionMandatoryWithSeparator.push(atLeastOneSep);
    };
    DslMethodsCollectorVisitor.prototype.visitRepetition = function (many) {
        this.dslMethods.repetition.push(many);
    };
    DslMethodsCollectorVisitor.prototype.visitAlternation = function (or) {
        this.dslMethods.alternation.push(or);
    };
    return DslMethodsCollectorVisitor;
}(api$2.GAstVisitor));
var collectorVisitor = new DslMethodsCollectorVisitor();
function collectMethods(rule) {
    collectorVisitor.reset();
    rule.accept(collectorVisitor);
    var dslMethods = collectorVisitor.dslMethods;
    // avoid uncleaned references
    collectorVisitor.reset();
    return dslMethods;
}
exports.collectMethods = collectMethods;

});

var cst = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNoneTerminalToCst = exports.addTerminalToCst = exports.setNodeLocationFull = exports.setNodeLocationOnlyOffset = void 0;
/**
 * This nodeLocation tracking is not efficient and should only be used
 * when error recovery is enabled or the Token Vector contains virtual Tokens
 * (e.g, Python Indent/Outdent)
 * As it executes the calculation for every single terminal/nonTerminal
 * and does not rely on the fact the token vector is **sorted**
 */
function setNodeLocationOnlyOffset(currNodeLocation, newLocationInfo) {
    // First (valid) update for this cst node
    if (isNaN(currNodeLocation.startOffset) === true) {
        // assumption1: Token location information is either NaN or a valid number
        // assumption2: Token location information is fully valid if it exist
        // (both start/end offsets exist and are numbers).
        currNodeLocation.startOffset = newLocationInfo.startOffset;
        currNodeLocation.endOffset = newLocationInfo.endOffset;
    }
    // Once the startOffset has been updated with a valid number it should never receive
    // any farther updates as the Token vector is sorted.
    // We still have to check this this condition for every new possible location info
    // because with error recovery enabled we may encounter invalid tokens (NaN location props)
    else if (currNodeLocation.endOffset < newLocationInfo.endOffset === true) {
        currNodeLocation.endOffset = newLocationInfo.endOffset;
    }
}
exports.setNodeLocationOnlyOffset = setNodeLocationOnlyOffset;
/**
 * This nodeLocation tracking is not efficient and should only be used
 * when error recovery is enabled or the Token Vector contains virtual Tokens
 * (e.g, Python Indent/Outdent)
 * As it executes the calculation for every single terminal/nonTerminal
 * and does not rely on the fact the token vector is **sorted**
 */
function setNodeLocationFull(currNodeLocation, newLocationInfo) {
    // First (valid) update for this cst node
    if (isNaN(currNodeLocation.startOffset) === true) {
        // assumption1: Token location information is either NaN or a valid number
        // assumption2: Token location information is fully valid if it exist
        // (all start/end props exist and are numbers).
        currNodeLocation.startOffset = newLocationInfo.startOffset;
        currNodeLocation.startColumn = newLocationInfo.startColumn;
        currNodeLocation.startLine = newLocationInfo.startLine;
        currNodeLocation.endOffset = newLocationInfo.endOffset;
        currNodeLocation.endColumn = newLocationInfo.endColumn;
        currNodeLocation.endLine = newLocationInfo.endLine;
    }
    // Once the start props has been updated with a valid number it should never receive
    // any farther updates as the Token vector is sorted.
    // We still have to check this this condition for every new possible location info
    // because with error recovery enabled we may encounter invalid tokens (NaN location props)
    else if (currNodeLocation.endOffset < newLocationInfo.endOffset === true) {
        currNodeLocation.endOffset = newLocationInfo.endOffset;
        currNodeLocation.endColumn = newLocationInfo.endColumn;
        currNodeLocation.endLine = newLocationInfo.endLine;
    }
}
exports.setNodeLocationFull = setNodeLocationFull;
function addTerminalToCst(node, token, tokenTypeName) {
    if (node.children[tokenTypeName] === undefined) {
        node.children[tokenTypeName] = [token];
    }
    else {
        node.children[tokenTypeName].push(token);
    }
}
exports.addTerminalToCst = addTerminalToCst;
function addNoneTerminalToCst(node, ruleName, ruleResult) {
    if (node.children[ruleName] === undefined) {
        node.children[ruleName] = [ruleResult];
    }
    else {
        node.children[ruleName].push(ruleResult);
    }
}
exports.addNoneTerminalToCst = addNoneTerminalToCst;

});

var lang_extensions = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineNameProp = void 0;
var NAME = "name";
function defineNameProp(obj, nameValue) {
    Object.defineProperty(obj, NAME, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: nameValue
    });
}
exports.defineNameProp = defineNameProp;

});

var cst_visitor = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMissingCstMethods = exports.validateVisitor = exports.CstVisitorDefinitionError = exports.createBaseVisitorConstructorWithDefaults = exports.createBaseSemanticVisitorConstructor = exports.defaultVisit = void 0;
var isEmpty_1$1 = __importDefault(isEmpty_1);
var compact_1$1 = __importDefault(compact_1);
var isArray_1$1 = __importDefault(isArray_1);
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var filter_1$1 = __importDefault(filter_1);
var keys_1$1 = __importDefault(keys_1);
var isFunction_1$1 = __importDefault(isFunction_1);
var isUndefined_1$1 = __importDefault(isUndefined_1);

function defaultVisit(ctx, param) {
    var childrenNames = (0, keys_1$1.default)(ctx);
    var childrenNamesLength = childrenNames.length;
    for (var i = 0; i < childrenNamesLength; i++) {
        var currChildName = childrenNames[i];
        var currChildArray = ctx[currChildName];
        var currChildArrayLength = currChildArray.length;
        for (var j = 0; j < currChildArrayLength; j++) {
            var currChild = currChildArray[j];
            // distinction between Tokens Children and CstNode children
            if (currChild.tokenTypeIdx === undefined) {
                this[currChild.name](currChild.children, param);
            }
        }
    }
    // defaultVisit does not support generic out param
}
exports.defaultVisit = defaultVisit;
function createBaseSemanticVisitorConstructor(grammarName, ruleNames) {
    var derivedConstructor = function () { };
    // can be overwritten according to:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/
    // name?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FFunction%2Fname
    (0, lang_extensions.defineNameProp)(derivedConstructor, grammarName + "BaseSemantics");
    var semanticProto = {
        visit: function (cstNode, param) {
            // enables writing more concise visitor methods when CstNode has only a single child
            if ((0, isArray_1$1.default)(cstNode)) {
                // A CST Node's children dictionary can never have empty arrays as values
                // If a key is defined there will be at least one element in the corresponding value array.
                cstNode = cstNode[0];
            }
            // enables passing optional CstNodes concisely.
            if ((0, isUndefined_1$1.default)(cstNode)) {
                return undefined;
            }
            return this[cstNode.name](cstNode.children, param);
        },
        validateVisitor: function () {
            var semanticDefinitionErrors = validateVisitor(this, ruleNames);
            if (!(0, isEmpty_1$1.default)(semanticDefinitionErrors)) {
                var errorMessages = (0, map_1$1.default)(semanticDefinitionErrors, function (currDefError) { return currDefError.msg; });
                throw Error("Errors Detected in CST Visitor <".concat(this.constructor.name, ">:\n\t") +
                    "".concat(errorMessages.join("\n\n").replace(/\n/g, "\n\t")));
            }
        }
    };
    derivedConstructor.prototype = semanticProto;
    derivedConstructor.prototype.constructor = derivedConstructor;
    derivedConstructor._RULE_NAMES = ruleNames;
    return derivedConstructor;
}
exports.createBaseSemanticVisitorConstructor = createBaseSemanticVisitorConstructor;
function createBaseVisitorConstructorWithDefaults(grammarName, ruleNames, baseConstructor) {
    var derivedConstructor = function () { };
    // can be overwritten according to:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/
    // name?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FFunction%2Fname
    (0, lang_extensions.defineNameProp)(derivedConstructor, grammarName + "BaseSemanticsWithDefaults");
    var withDefaultsProto = Object.create(baseConstructor.prototype);
    (0, forEach_1$1.default)(ruleNames, function (ruleName) {
        withDefaultsProto[ruleName] = defaultVisit;
    });
    derivedConstructor.prototype = withDefaultsProto;
    derivedConstructor.prototype.constructor = derivedConstructor;
    return derivedConstructor;
}
exports.createBaseVisitorConstructorWithDefaults = createBaseVisitorConstructorWithDefaults;
var CstVisitorDefinitionError;
(function (CstVisitorDefinitionError) {
    CstVisitorDefinitionError[CstVisitorDefinitionError["REDUNDANT_METHOD"] = 0] = "REDUNDANT_METHOD";
    CstVisitorDefinitionError[CstVisitorDefinitionError["MISSING_METHOD"] = 1] = "MISSING_METHOD";
})(CstVisitorDefinitionError = exports.CstVisitorDefinitionError || (exports.CstVisitorDefinitionError = {}));
function validateVisitor(visitorInstance, ruleNames) {
    var missingErrors = validateMissingCstMethods(visitorInstance, ruleNames);
    return missingErrors;
}
exports.validateVisitor = validateVisitor;
function validateMissingCstMethods(visitorInstance, ruleNames) {
    var missingRuleNames = (0, filter_1$1.default)(ruleNames, function (currRuleName) {
        return (0, isFunction_1$1.default)(visitorInstance[currRuleName]) === false;
    });
    var errors = (0, map_1$1.default)(missingRuleNames, function (currRuleName) {
        return {
            msg: "Missing visitor method: <".concat(currRuleName, "> on ").concat((visitorInstance.constructor.name), " CST Visitor."),
            type: CstVisitorDefinitionError.MISSING_METHOD,
            methodName: currRuleName
        };
    });
    return (0, compact_1$1.default)(errors);
}
exports.validateMissingCstMethods = validateMissingCstMethods;

});

var tree_builder = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeBuilder = void 0;

var noop_1$1 = __importDefault(noop_1);
var has_1$1 = __importDefault(has_1);
var keys_1$1 = __importDefault(keys_1);
var isUndefined_1$1 = __importDefault(isUndefined_1);


/**
 * This trait is responsible for the CST building logic.
 */
var TreeBuilder = /** @class */ (function () {
    function TreeBuilder() {
    }
    TreeBuilder.prototype.initTreeBuilder = function (config) {
        this.CST_STACK = [];
        // outputCst is no longer exposed/defined in the pubic API
        this.outputCst = config.outputCst;
        this.nodeLocationTracking = (0, has_1$1.default)(config, "nodeLocationTracking")
            ? config.nodeLocationTracking // assumes end user provides the correct config value/type
            : parser_1.DEFAULT_PARSER_CONFIG.nodeLocationTracking;
        if (!this.outputCst) {
            this.cstInvocationStateUpdate = noop_1$1.default;
            this.cstFinallyStateUpdate = noop_1$1.default;
            this.cstPostTerminal = noop_1$1.default;
            this.cstPostNonTerminal = noop_1$1.default;
            this.cstPostRule = noop_1$1.default;
        }
        else {
            if (/full/i.test(this.nodeLocationTracking)) {
                if (this.recoveryEnabled) {
                    this.setNodeLocationFromToken = cst.setNodeLocationFull;
                    this.setNodeLocationFromNode = cst.setNodeLocationFull;
                    this.cstPostRule = noop_1$1.default;
                    this.setInitialNodeLocation = this.setInitialNodeLocationFullRecovery;
                }
                else {
                    this.setNodeLocationFromToken = noop_1$1.default;
                    this.setNodeLocationFromNode = noop_1$1.default;
                    this.cstPostRule = this.cstPostRuleFull;
                    this.setInitialNodeLocation = this.setInitialNodeLocationFullRegular;
                }
            }
            else if (/onlyOffset/i.test(this.nodeLocationTracking)) {
                if (this.recoveryEnabled) {
                    this.setNodeLocationFromToken = cst.setNodeLocationOnlyOffset;
                    this.setNodeLocationFromNode = cst.setNodeLocationOnlyOffset;
                    this.cstPostRule = noop_1$1.default;
                    this.setInitialNodeLocation =
                        this.setInitialNodeLocationOnlyOffsetRecovery;
                }
                else {
                    this.setNodeLocationFromToken = noop_1$1.default;
                    this.setNodeLocationFromNode = noop_1$1.default;
                    this.cstPostRule = this.cstPostRuleOnlyOffset;
                    this.setInitialNodeLocation =
                        this.setInitialNodeLocationOnlyOffsetRegular;
                }
            }
            else if (/none/i.test(this.nodeLocationTracking)) {
                this.setNodeLocationFromToken = noop_1$1.default;
                this.setNodeLocationFromNode = noop_1$1.default;
                this.cstPostRule = noop_1$1.default;
                this.setInitialNodeLocation = noop_1$1.default;
            }
            else {
                throw Error("Invalid <nodeLocationTracking> config option: \"".concat(config.nodeLocationTracking, "\""));
            }
        }
    };
    TreeBuilder.prototype.setInitialNodeLocationOnlyOffsetRecovery = function (cstNode) {
        cstNode.location = {
            startOffset: NaN,
            endOffset: NaN
        };
    };
    TreeBuilder.prototype.setInitialNodeLocationOnlyOffsetRegular = function (cstNode) {
        cstNode.location = {
            // without error recovery the starting Location of a new CstNode is guaranteed
            // To be the next Token's startOffset (for valid inputs).
            // For invalid inputs there won't be any CSTOutput so this potential
            // inaccuracy does not matter
            startOffset: this.LA(1).startOffset,
            endOffset: NaN
        };
    };
    TreeBuilder.prototype.setInitialNodeLocationFullRecovery = function (cstNode) {
        cstNode.location = {
            startOffset: NaN,
            startLine: NaN,
            startColumn: NaN,
            endOffset: NaN,
            endLine: NaN,
            endColumn: NaN
        };
    };
    /**
       *  @see setInitialNodeLocationOnlyOffsetRegular for explanation why this work
  
       * @param cstNode
       */
    TreeBuilder.prototype.setInitialNodeLocationFullRegular = function (cstNode) {
        var nextToken = this.LA(1);
        cstNode.location = {
            startOffset: nextToken.startOffset,
            startLine: nextToken.startLine,
            startColumn: nextToken.startColumn,
            endOffset: NaN,
            endLine: NaN,
            endColumn: NaN
        };
    };
    TreeBuilder.prototype.cstInvocationStateUpdate = function (fullRuleName) {
        var cstNode = {
            name: fullRuleName,
            children: Object.create(null)
        };
        this.setInitialNodeLocation(cstNode);
        this.CST_STACK.push(cstNode);
    };
    TreeBuilder.prototype.cstFinallyStateUpdate = function () {
        this.CST_STACK.pop();
    };
    TreeBuilder.prototype.cstPostRuleFull = function (ruleCstNode) {
        // casts to `required<CstNodeLocation>` are safe because `cstPostRuleFull` should only be invoked when full location is enabled
        var prevToken = this.LA(0);
        var loc = ruleCstNode.location;
        // If this condition is true it means we consumed at least one Token
        // In this CstNode.
        if (loc.startOffset <= prevToken.startOffset === true) {
            loc.endOffset = prevToken.endOffset;
            loc.endLine = prevToken.endLine;
            loc.endColumn = prevToken.endColumn;
        }
        // "empty" CstNode edge case
        else {
            loc.startOffset = NaN;
            loc.startLine = NaN;
            loc.startColumn = NaN;
        }
    };
    TreeBuilder.prototype.cstPostRuleOnlyOffset = function (ruleCstNode) {
        var prevToken = this.LA(0);
        // `location' is not null because `cstPostRuleOnlyOffset` will only be invoked when location tracking is enabled.
        var loc = ruleCstNode.location;
        // If this condition is true it means we consumed at least one Token
        // In this CstNode.
        if (loc.startOffset <= prevToken.startOffset === true) {
            loc.endOffset = prevToken.endOffset;
        }
        // "empty" CstNode edge case
        else {
            loc.startOffset = NaN;
        }
    };
    TreeBuilder.prototype.cstPostTerminal = function (key, consumedToken) {
        var rootCst = this.CST_STACK[this.CST_STACK.length - 1];
        (0, cst.addTerminalToCst)(rootCst, consumedToken, key);
        // This is only used when **both** error recovery and CST Output are enabled.
        this.setNodeLocationFromToken(rootCst.location, consumedToken);
    };
    TreeBuilder.prototype.cstPostNonTerminal = function (ruleCstResult, ruleName) {
        var preCstNode = this.CST_STACK[this.CST_STACK.length - 1];
        (0, cst.addNoneTerminalToCst)(preCstNode, ruleName, ruleCstResult);
        // This is only used when **both** error recovery and CST Output are enabled.
        this.setNodeLocationFromNode(preCstNode.location, ruleCstResult.location);
    };
    TreeBuilder.prototype.getBaseCstVisitorConstructor = function () {
        if ((0, isUndefined_1$1.default)(this.baseCstVisitorConstructor)) {
            var newBaseCstVisitorConstructor = (0, cst_visitor.createBaseSemanticVisitorConstructor)(this.className, (0, keys_1$1.default)(this.gastProductionsCache));
            this.baseCstVisitorConstructor = newBaseCstVisitorConstructor;
            return newBaseCstVisitorConstructor;
        }
        return this.baseCstVisitorConstructor;
    };
    TreeBuilder.prototype.getBaseCstVisitorConstructorWithDefaults = function () {
        if ((0, isUndefined_1$1.default)(this.baseCstVisitorWithDefaultsConstructor)) {
            var newConstructor = (0, cst_visitor.createBaseVisitorConstructorWithDefaults)(this.className, (0, keys_1$1.default)(this.gastProductionsCache), this.getBaseCstVisitorConstructor());
            this.baseCstVisitorWithDefaultsConstructor = newConstructor;
            return newConstructor;
        }
        return this.baseCstVisitorWithDefaultsConstructor;
    };
    TreeBuilder.prototype.getLastExplicitRuleShortName = function () {
        var ruleStack = this.RULE_STACK;
        return ruleStack[ruleStack.length - 1];
    };
    TreeBuilder.prototype.getPreviousExplicitRuleShortName = function () {
        var ruleStack = this.RULE_STACK;
        return ruleStack[ruleStack.length - 2];
    };
    TreeBuilder.prototype.getLastExplicitRuleOccurrenceIndex = function () {
        var occurrenceStack = this.RULE_OCCURRENCE_STACK;
        return occurrenceStack[occurrenceStack.length - 1];
    };
    return TreeBuilder;
}());
exports.TreeBuilder = TreeBuilder;

});

var lexer_adapter = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.LexerAdapter = void 0;

/**
 * Trait responsible abstracting over the interaction with Lexer output (Token vector).
 *
 * This could be generalized to support other kinds of lexers, e.g.
 * - Just in Time Lexing / Lexer-Less parsing.
 * - Streaming Lexer.
 */
var LexerAdapter = /** @class */ (function () {
    function LexerAdapter() {
    }
    LexerAdapter.prototype.initLexerAdapter = function () {
        this.tokVector = [];
        this.tokVectorLength = 0;
        this.currIdx = -1;
    };
    Object.defineProperty(LexerAdapter.prototype, "input", {
        get: function () {
            return this.tokVector;
        },
        set: function (newInput) {
            // @ts-ignore - `this parameter` not supported in setters/getters
            //   - https://www.typescriptlang.org/docs/handbook/functions.html#this-parameters
            if (this.selfAnalysisDone !== true) {
                throw Error("Missing <performSelfAnalysis> invocation at the end of the Parser's constructor.");
            }
            // @ts-ignore - `this parameter` not supported in setters/getters
            //   - https://www.typescriptlang.org/docs/handbook/functions.html#this-parameters
            this.reset();
            this.tokVector = newInput;
            this.tokVectorLength = newInput.length;
        },
        enumerable: false,
        configurable: true
    });
    // skips a token and returns the next token
    LexerAdapter.prototype.SKIP_TOKEN = function () {
        if (this.currIdx <= this.tokVector.length - 2) {
            this.consumeToken();
            return this.LA(1);
        }
        else {
            return parser_1.END_OF_FILE;
        }
    };
    // Lexer (accessing Token vector) related methods which can be overridden to implement lazy lexers
    // or lexers dependent on parser context.
    LexerAdapter.prototype.LA = function (howMuch) {
        var soughtIdx = this.currIdx + howMuch;
        if (soughtIdx < 0 || this.tokVectorLength <= soughtIdx) {
            return parser_1.END_OF_FILE;
        }
        else {
            return this.tokVector[soughtIdx];
        }
    };
    LexerAdapter.prototype.consumeToken = function () {
        this.currIdx++;
    };
    LexerAdapter.prototype.exportLexerState = function () {
        return this.currIdx;
    };
    LexerAdapter.prototype.importLexerState = function (newState) {
        this.currIdx = newState;
    };
    LexerAdapter.prototype.resetLexerState = function () {
        this.currIdx = -1;
    };
    LexerAdapter.prototype.moveToTerminatedState = function () {
        this.currIdx = this.tokVector.length - 1;
    };
    LexerAdapter.prototype.getLexerPosition = function () {
        return this.exportLexerState();
    };
    return LexerAdapter;
}());
exports.LexerAdapter = LexerAdapter;

});

var recognizer_api = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecognizerApi = void 0;
var values_1$1 = __importDefault(values_1);
var includes_1$1 = __importDefault(includes_1);





/**
 * This trait is responsible for implementing the public API
 * for defining Chevrotain parsers, i.e:
 * - CONSUME
 * - RULE
 * - OPTION
 * - ...
 */
var RecognizerApi = /** @class */ (function () {
    function RecognizerApi() {
    }
    RecognizerApi.prototype.ACTION = function (impl) {
        return impl.call(this);
    };
    RecognizerApi.prototype.consume = function (idx, tokType, options) {
        return this.consumeInternal(tokType, idx, options);
    };
    RecognizerApi.prototype.subrule = function (idx, ruleToCall, options) {
        return this.subruleInternal(ruleToCall, idx, options);
    };
    RecognizerApi.prototype.option = function (idx, actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, idx);
    };
    RecognizerApi.prototype.or = function (idx, altsOrOpts) {
        return this.orInternal(altsOrOpts, idx);
    };
    RecognizerApi.prototype.many = function (idx, actionORMethodDef) {
        return this.manyInternal(idx, actionORMethodDef);
    };
    RecognizerApi.prototype.atLeastOne = function (idx, actionORMethodDef) {
        return this.atLeastOneInternal(idx, actionORMethodDef);
    };
    RecognizerApi.prototype.CONSUME = function (tokType, options) {
        return this.consumeInternal(tokType, 0, options);
    };
    RecognizerApi.prototype.CONSUME1 = function (tokType, options) {
        return this.consumeInternal(tokType, 1, options);
    };
    RecognizerApi.prototype.CONSUME2 = function (tokType, options) {
        return this.consumeInternal(tokType, 2, options);
    };
    RecognizerApi.prototype.CONSUME3 = function (tokType, options) {
        return this.consumeInternal(tokType, 3, options);
    };
    RecognizerApi.prototype.CONSUME4 = function (tokType, options) {
        return this.consumeInternal(tokType, 4, options);
    };
    RecognizerApi.prototype.CONSUME5 = function (tokType, options) {
        return this.consumeInternal(tokType, 5, options);
    };
    RecognizerApi.prototype.CONSUME6 = function (tokType, options) {
        return this.consumeInternal(tokType, 6, options);
    };
    RecognizerApi.prototype.CONSUME7 = function (tokType, options) {
        return this.consumeInternal(tokType, 7, options);
    };
    RecognizerApi.prototype.CONSUME8 = function (tokType, options) {
        return this.consumeInternal(tokType, 8, options);
    };
    RecognizerApi.prototype.CONSUME9 = function (tokType, options) {
        return this.consumeInternal(tokType, 9, options);
    };
    RecognizerApi.prototype.SUBRULE = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 0, options);
    };
    RecognizerApi.prototype.SUBRULE1 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 1, options);
    };
    RecognizerApi.prototype.SUBRULE2 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 2, options);
    };
    RecognizerApi.prototype.SUBRULE3 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 3, options);
    };
    RecognizerApi.prototype.SUBRULE4 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 4, options);
    };
    RecognizerApi.prototype.SUBRULE5 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 5, options);
    };
    RecognizerApi.prototype.SUBRULE6 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 6, options);
    };
    RecognizerApi.prototype.SUBRULE7 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 7, options);
    };
    RecognizerApi.prototype.SUBRULE8 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 8, options);
    };
    RecognizerApi.prototype.SUBRULE9 = function (ruleToCall, options) {
        return this.subruleInternal(ruleToCall, 9, options);
    };
    RecognizerApi.prototype.OPTION = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 0);
    };
    RecognizerApi.prototype.OPTION1 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 1);
    };
    RecognizerApi.prototype.OPTION2 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 2);
    };
    RecognizerApi.prototype.OPTION3 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 3);
    };
    RecognizerApi.prototype.OPTION4 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 4);
    };
    RecognizerApi.prototype.OPTION5 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 5);
    };
    RecognizerApi.prototype.OPTION6 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 6);
    };
    RecognizerApi.prototype.OPTION7 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 7);
    };
    RecognizerApi.prototype.OPTION8 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 8);
    };
    RecognizerApi.prototype.OPTION9 = function (actionORMethodDef) {
        return this.optionInternal(actionORMethodDef, 9);
    };
    RecognizerApi.prototype.OR = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 0);
    };
    RecognizerApi.prototype.OR1 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 1);
    };
    RecognizerApi.prototype.OR2 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 2);
    };
    RecognizerApi.prototype.OR3 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 3);
    };
    RecognizerApi.prototype.OR4 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 4);
    };
    RecognizerApi.prototype.OR5 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 5);
    };
    RecognizerApi.prototype.OR6 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 6);
    };
    RecognizerApi.prototype.OR7 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 7);
    };
    RecognizerApi.prototype.OR8 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 8);
    };
    RecognizerApi.prototype.OR9 = function (altsOrOpts) {
        return this.orInternal(altsOrOpts, 9);
    };
    RecognizerApi.prototype.MANY = function (actionORMethodDef) {
        this.manyInternal(0, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY1 = function (actionORMethodDef) {
        this.manyInternal(1, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY2 = function (actionORMethodDef) {
        this.manyInternal(2, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY3 = function (actionORMethodDef) {
        this.manyInternal(3, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY4 = function (actionORMethodDef) {
        this.manyInternal(4, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY5 = function (actionORMethodDef) {
        this.manyInternal(5, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY6 = function (actionORMethodDef) {
        this.manyInternal(6, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY7 = function (actionORMethodDef) {
        this.manyInternal(7, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY8 = function (actionORMethodDef) {
        this.manyInternal(8, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY9 = function (actionORMethodDef) {
        this.manyInternal(9, actionORMethodDef);
    };
    RecognizerApi.prototype.MANY_SEP = function (options) {
        this.manySepFirstInternal(0, options);
    };
    RecognizerApi.prototype.MANY_SEP1 = function (options) {
        this.manySepFirstInternal(1, options);
    };
    RecognizerApi.prototype.MANY_SEP2 = function (options) {
        this.manySepFirstInternal(2, options);
    };
    RecognizerApi.prototype.MANY_SEP3 = function (options) {
        this.manySepFirstInternal(3, options);
    };
    RecognizerApi.prototype.MANY_SEP4 = function (options) {
        this.manySepFirstInternal(4, options);
    };
    RecognizerApi.prototype.MANY_SEP5 = function (options) {
        this.manySepFirstInternal(5, options);
    };
    RecognizerApi.prototype.MANY_SEP6 = function (options) {
        this.manySepFirstInternal(6, options);
    };
    RecognizerApi.prototype.MANY_SEP7 = function (options) {
        this.manySepFirstInternal(7, options);
    };
    RecognizerApi.prototype.MANY_SEP8 = function (options) {
        this.manySepFirstInternal(8, options);
    };
    RecognizerApi.prototype.MANY_SEP9 = function (options) {
        this.manySepFirstInternal(9, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE = function (actionORMethodDef) {
        this.atLeastOneInternal(0, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE1 = function (actionORMethodDef) {
        return this.atLeastOneInternal(1, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE2 = function (actionORMethodDef) {
        this.atLeastOneInternal(2, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE3 = function (actionORMethodDef) {
        this.atLeastOneInternal(3, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE4 = function (actionORMethodDef) {
        this.atLeastOneInternal(4, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE5 = function (actionORMethodDef) {
        this.atLeastOneInternal(5, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE6 = function (actionORMethodDef) {
        this.atLeastOneInternal(6, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE7 = function (actionORMethodDef) {
        this.atLeastOneInternal(7, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE8 = function (actionORMethodDef) {
        this.atLeastOneInternal(8, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE9 = function (actionORMethodDef) {
        this.atLeastOneInternal(9, actionORMethodDef);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP = function (options) {
        this.atLeastOneSepFirstInternal(0, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP1 = function (options) {
        this.atLeastOneSepFirstInternal(1, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP2 = function (options) {
        this.atLeastOneSepFirstInternal(2, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP3 = function (options) {
        this.atLeastOneSepFirstInternal(3, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP4 = function (options) {
        this.atLeastOneSepFirstInternal(4, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP5 = function (options) {
        this.atLeastOneSepFirstInternal(5, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP6 = function (options) {
        this.atLeastOneSepFirstInternal(6, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP7 = function (options) {
        this.atLeastOneSepFirstInternal(7, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP8 = function (options) {
        this.atLeastOneSepFirstInternal(8, options);
    };
    RecognizerApi.prototype.AT_LEAST_ONE_SEP9 = function (options) {
        this.atLeastOneSepFirstInternal(9, options);
    };
    RecognizerApi.prototype.RULE = function (name, implementation, config) {
        if (config === void 0) { config = parser_1.DEFAULT_RULE_CONFIG; }
        if ((0, includes_1$1.default)(this.definedRulesNames, name)) {
            var errMsg = errors_public.defaultGrammarValidatorErrorProvider.buildDuplicateRuleNameError({
                topLevelRule: name,
                grammarName: this.className
            });
            var error = {
                message: errMsg,
                type: parser_1.ParserDefinitionErrorType.DUPLICATE_RULE_NAME,
                ruleName: name
            };
            this.definitionErrors.push(error);
        }
        this.definedRulesNames.push(name);
        var ruleImplementation = this.defineRule(name, implementation, config);
        this[name] = ruleImplementation;
        return ruleImplementation;
    };
    RecognizerApi.prototype.OVERRIDE_RULE = function (name, impl, config) {
        if (config === void 0) { config = parser_1.DEFAULT_RULE_CONFIG; }
        var ruleErrors = (0, checks.validateRuleIsOverridden)(name, this.definedRulesNames, this.className);
        this.definitionErrors = this.definitionErrors.concat(ruleErrors);
        var ruleImplementation = this.defineRule(name, impl, config);
        this[name] = ruleImplementation;
        return ruleImplementation;
    };
    RecognizerApi.prototype.BACKTRACK = function (grammarRule, args) {
        return function () {
            // save org state
            this.isBackTrackingStack.push(1);
            var orgState = this.saveRecogState();
            try {
                grammarRule.apply(this, args);
                // if no exception was thrown we have succeed parsing the rule.
                return true;
            }
            catch (e) {
                if ((0, exceptions_public.isRecognitionException)(e)) {
                    return false;
                }
                else {
                    throw e;
                }
            }
            finally {
                this.reloadRecogState(orgState);
                this.isBackTrackingStack.pop();
            }
        };
    };
    // GAST export APIs
    RecognizerApi.prototype.getGAstProductions = function () {
        return this.gastProductionsCache;
    };
    RecognizerApi.prototype.getSerializedGastProductions = function () {
        return (0, api$2.serializeGrammar)((0, values_1$1.default)(this.gastProductionsCache));
    };
    return RecognizerApi;
}());
exports.RecognizerApi = RecognizerApi;

});

var recognizer_engine = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecognizerEngine = void 0;
var isEmpty_1$1 = __importDefault(isEmpty_1);
var isArray_1$1 = __importDefault(isArray_1);
var flatten_1$1 = __importDefault(flatten_1);
var every_1$1 = __importDefault(every_1);
var uniq_1$1 = __importDefault(uniq_1);
var isObject_1$1 = __importDefault(isObject_1);
var has_1$1 = __importDefault(has_1);
var values_1$1 = __importDefault(values_1);
var reduce_1$1 = __importDefault(reduce_1);
var clone_1$1 = __importDefault(clone_1);








/**
 * This trait is responsible for the runtime parsing engine
 * Used by the official API (recognizer_api.ts)
 */
var RecognizerEngine = /** @class */ (function () {
    function RecognizerEngine() {
    }
    RecognizerEngine.prototype.initRecognizerEngine = function (tokenVocabulary, config) {
        this.className = this.constructor.name;
        // TODO: would using an ES6 Map or plain object be faster (CST building scenario)
        this.shortRuleNameToFull = {};
        this.fullRuleNameToShort = {};
        this.ruleShortNameIdx = 256;
        this.tokenMatcher = tokens.tokenStructuredMatcherNoCategories;
        this.subruleIdx = 0;
        this.definedRulesNames = [];
        this.tokensMap = {};
        this.isBackTrackingStack = [];
        this.RULE_STACK = [];
        this.RULE_OCCURRENCE_STACK = [];
        this.gastProductionsCache = {};
        if ((0, has_1$1.default)(config, "serializedGrammar")) {
            throw Error("The Parser's configuration can no longer contain a <serializedGrammar> property.\n" +
                "\tSee: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_6-0-0\n" +
                "\tFor Further details.");
        }
        if ((0, isArray_1$1.default)(tokenVocabulary)) {
            // This only checks for Token vocabularies provided as arrays.
            // That is good enough because the main objective is to detect users of pre-V4.0 APIs
            // rather than all edge cases of empty Token vocabularies.
            if ((0, isEmpty_1$1.default)(tokenVocabulary)) {
                throw Error("A Token Vocabulary cannot be empty.\n" +
                    "\tNote that the first argument for the parser constructor\n" +
                    "\tis no longer a Token vector (since v4.0).");
            }
            if (typeof tokenVocabulary[0].startOffset === "number") {
                throw Error("The Parser constructor no longer accepts a token vector as the first argument.\n" +
                    "\tSee: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_4-0-0\n" +
                    "\tFor Further details.");
            }
        }
        if ((0, isArray_1$1.default)(tokenVocabulary)) {
            this.tokensMap = (0, reduce_1$1.default)(tokenVocabulary, function (acc, tokType) {
                acc[tokType.name] = tokType;
                return acc;
            }, {});
        }
        else if ((0, has_1$1.default)(tokenVocabulary, "modes") &&
            (0, every_1$1.default)((0, flatten_1$1.default)((0, values_1$1.default)(tokenVocabulary.modes)), tokens.isTokenType)) {
            var allTokenTypes_1 = (0, flatten_1$1.default)((0, values_1$1.default)(tokenVocabulary.modes));
            var uniqueTokens = (0, uniq_1$1.default)(allTokenTypes_1);
            this.tokensMap = (0, reduce_1$1.default)(uniqueTokens, function (acc, tokType) {
                acc[tokType.name] = tokType;
                return acc;
            }, {});
        }
        else if ((0, isObject_1$1.default)(tokenVocabulary)) {
            this.tokensMap = (0, clone_1$1.default)(tokenVocabulary);
        }
        else {
            throw new Error("<tokensDictionary> argument must be An Array of Token constructors," +
                " A dictionary of Token constructors or an IMultiModeLexerDefinition");
        }
        // always add EOF to the tokenNames -> constructors map. it is useful to assure all the input has been
        // parsed with a clear error message ("expecting EOF but found ...")
        this.tokensMap["EOF"] = tokens_public.EOF;
        var allTokenTypes = (0, has_1$1.default)(tokenVocabulary, "modes")
            ? (0, flatten_1$1.default)((0, values_1$1.default)(tokenVocabulary.modes))
            : (0, values_1$1.default)(tokenVocabulary);
        var noTokenCategoriesUsed = (0, every_1$1.default)(allTokenTypes, function (tokenConstructor) {
            return (0, isEmpty_1$1.default)(tokenConstructor.categoryMatches);
        });
        this.tokenMatcher = noTokenCategoriesUsed
            ? tokens.tokenStructuredMatcherNoCategories
            : tokens.tokenStructuredMatcher;
        // Because ES2015+ syntax should be supported for creating Token classes
        // We cannot assume that the Token classes were created using the "extendToken" utilities
        // Therefore we must augment the Token classes both on Lexer initialization and on Parser initialization
        (0, tokens.augmentTokenTypes)((0, values_1$1.default)(this.tokensMap));
    };
    RecognizerEngine.prototype.defineRule = function (ruleName, impl, config) {
        if (this.selfAnalysisDone) {
            throw Error("Grammar rule <".concat(ruleName, "> may not be defined after the 'performSelfAnalysis' method has been called'\n") +
                "Make sure that all grammar rule definitions are done before 'performSelfAnalysis' is called.");
        }
        var resyncEnabled = (0, has_1$1.default)(config, "resyncEnabled")
            ? config.resyncEnabled // assumes end user provides the correct config value/type
            : parser_1.DEFAULT_RULE_CONFIG.resyncEnabled;
        var recoveryValueFunc = (0, has_1$1.default)(config, "recoveryValueFunc")
            ? config.recoveryValueFunc // assumes end user provides the correct config value/type
            : parser_1.DEFAULT_RULE_CONFIG.recoveryValueFunc;
        // performance optimization: Use small integers as keys for the longer human readable "full" rule names.
        // this greatly improves Map access time (as much as 8% for some performance benchmarks).
        var shortName = this.ruleShortNameIdx << (keys.BITS_FOR_METHOD_TYPE + keys.BITS_FOR_OCCURRENCE_IDX);
        this.ruleShortNameIdx++;
        this.shortRuleNameToFull[shortName] = ruleName;
        this.fullRuleNameToShort[ruleName] = shortName;
        var invokeRuleWithTry;
        // Micro optimization, only check the condition **once** on rule definition
        // instead of **every single** rule invocation.
        if (this.outputCst === true) {
            invokeRuleWithTry = function invokeRuleWithTry() {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                try {
                    this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
                    impl.apply(this, args);
                    var cst = this.CST_STACK[this.CST_STACK.length - 1];
                    this.cstPostRule(cst);
                    return cst;
                }
                catch (e) {
                    return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc);
                }
                finally {
                    this.ruleFinallyStateUpdate();
                }
            };
        }
        else {
            invokeRuleWithTry = function invokeRuleWithTryCst() {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                try {
                    this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
                    return impl.apply(this, args);
                }
                catch (e) {
                    return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc);
                }
                finally {
                    this.ruleFinallyStateUpdate();
                }
            };
        }
        var wrappedGrammarRule = Object.assign(invokeRuleWithTry, { ruleName: ruleName, originalGrammarAction: impl });
        return wrappedGrammarRule;
    };
    RecognizerEngine.prototype.invokeRuleCatch = function (e, resyncEnabledConfig, recoveryValueFunc) {
        var isFirstInvokedRule = this.RULE_STACK.length === 1;
        // note the reSync is always enabled for the first rule invocation, because we must always be able to
        // reSync with EOF and just output some INVALID ParseTree
        // during backtracking reSync recovery is disabled, otherwise we can't be certain the backtracking
        // path is really the most valid one
        var reSyncEnabled = resyncEnabledConfig && !this.isBackTracking() && this.recoveryEnabled;
        if ((0, exceptions_public.isRecognitionException)(e)) {
            var recogError = e;
            if (reSyncEnabled) {
                var reSyncTokType = this.findReSyncTokenType();
                if (this.isInCurrentRuleReSyncSet(reSyncTokType)) {
                    recogError.resyncedTokens = this.reSyncTo(reSyncTokType);
                    if (this.outputCst) {
                        var partialCstResult = this.CST_STACK[this.CST_STACK.length - 1];
                        partialCstResult.recoveredNode = true;
                        return partialCstResult;
                    }
                    else {
                        return recoveryValueFunc(e);
                    }
                }
                else {
                    if (this.outputCst) {
                        var partialCstResult = this.CST_STACK[this.CST_STACK.length - 1];
                        partialCstResult.recoveredNode = true;
                        recogError.partialCstResult = partialCstResult;
                    }
                    // to be handled Further up the call stack
                    throw recogError;
                }
            }
            else if (isFirstInvokedRule) {
                // otherwise a Redundant input error will be created as well and we cannot guarantee that this is indeed the case
                this.moveToTerminatedState();
                // the parser should never throw one of its own errors outside its flow.
                // even if error recovery is disabled
                return recoveryValueFunc(e);
            }
            else {
                // to be recovered Further up the call stack
                throw recogError;
            }
        }
        else {
            // some other Error type which we don't know how to handle (for example a built in JavaScript Error)
            throw e;
        }
    };
    // Implementation of parsing DSL
    RecognizerEngine.prototype.optionInternal = function (actionORMethodDef, occurrence) {
        var key = this.getKeyForAutomaticLookahead(keys.OPTION_IDX, occurrence);
        return this.optionInternalLogic(actionORMethodDef, occurrence, key);
    };
    RecognizerEngine.prototype.optionInternalLogic = function (actionORMethodDef, occurrence, key) {
        var _this = this;
        var lookAheadFunc = this.getLaFuncFromCache(key);
        var action;
        if (typeof actionORMethodDef !== "function") {
            action = actionORMethodDef.DEF;
            var predicate_1 = actionORMethodDef.GATE;
            // predicate present
            if (predicate_1 !== undefined) {
                var orgLookaheadFunction_1 = lookAheadFunc;
                lookAheadFunc = function () {
                    return predicate_1.call(_this) && orgLookaheadFunction_1.call(_this);
                };
            }
        }
        else {
            action = actionORMethodDef;
        }
        if (lookAheadFunc.call(this) === true) {
            return action.call(this);
        }
        return undefined;
    };
    RecognizerEngine.prototype.atLeastOneInternal = function (prodOccurrence, actionORMethodDef) {
        var laKey = this.getKeyForAutomaticLookahead(keys.AT_LEAST_ONE_IDX, prodOccurrence);
        return this.atLeastOneInternalLogic(prodOccurrence, actionORMethodDef, laKey);
    };
    RecognizerEngine.prototype.atLeastOneInternalLogic = function (prodOccurrence, actionORMethodDef, key) {
        var _this = this;
        var lookAheadFunc = this.getLaFuncFromCache(key);
        var action;
        if (typeof actionORMethodDef !== "function") {
            action = actionORMethodDef.DEF;
            var predicate_2 = actionORMethodDef.GATE;
            // predicate present
            if (predicate_2 !== undefined) {
                var orgLookaheadFunction_2 = lookAheadFunc;
                lookAheadFunc = function () {
                    return predicate_2.call(_this) && orgLookaheadFunction_2.call(_this);
                };
            }
        }
        else {
            action = actionORMethodDef;
        }
        if (lookAheadFunc.call(this) === true) {
            var notStuck = this.doSingleRepetition(action);
            while (lookAheadFunc.call(this) === true &&
                notStuck === true) {
                notStuck = this.doSingleRepetition(action);
            }
        }
        else {
            throw this.raiseEarlyExitException(prodOccurrence, lookahead.PROD_TYPE.REPETITION_MANDATORY, actionORMethodDef.ERR_MSG);
        }
        // note that while it may seem that this can cause an error because by using a recursive call to
        // AT_LEAST_ONE we change the grammar to AT_LEAST_TWO, AT_LEAST_THREE ... , the possible recursive call
        // from the tryInRepetitionRecovery(...) will only happen IFF there really are TWO/THREE/.... items.
        // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
        this.attemptInRepetitionRecovery(this.atLeastOneInternal, [prodOccurrence, actionORMethodDef], lookAheadFunc, keys.AT_LEAST_ONE_IDX, prodOccurrence, interpreter.NextTerminalAfterAtLeastOneWalker);
    };
    RecognizerEngine.prototype.atLeastOneSepFirstInternal = function (prodOccurrence, options) {
        var laKey = this.getKeyForAutomaticLookahead(keys.AT_LEAST_ONE_SEP_IDX, prodOccurrence);
        this.atLeastOneSepFirstInternalLogic(prodOccurrence, options, laKey);
    };
    RecognizerEngine.prototype.atLeastOneSepFirstInternalLogic = function (prodOccurrence, options, key) {
        var _this = this;
        var action = options.DEF;
        var separator = options.SEP;
        var firstIterationLookaheadFunc = this.getLaFuncFromCache(key);
        // 1st iteration
        if (firstIterationLookaheadFunc.call(this) === true) {
            action.call(this);
            //  TODO: Optimization can move this function construction into "attemptInRepetitionRecovery"
            //  because it is only needed in error recovery scenarios.
            var separatorLookAheadFunc = function () {
                return _this.tokenMatcher(_this.LA(1), separator);
            };
            // 2nd..nth iterations
            while (this.tokenMatcher(this.LA(1), separator) === true) {
                // note that this CONSUME will never enter recovery because
                // the separatorLookAheadFunc checks that the separator really does exist.
                this.CONSUME(separator);
                action.call(this);
            }
            // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
            this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
                prodOccurrence,
                separator,
                separatorLookAheadFunc,
                action,
                interpreter.NextTerminalAfterAtLeastOneSepWalker
            ], separatorLookAheadFunc, keys.AT_LEAST_ONE_SEP_IDX, prodOccurrence, interpreter.NextTerminalAfterAtLeastOneSepWalker);
        }
        else {
            throw this.raiseEarlyExitException(prodOccurrence, lookahead.PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR, options.ERR_MSG);
        }
    };
    RecognizerEngine.prototype.manyInternal = function (prodOccurrence, actionORMethodDef) {
        var laKey = this.getKeyForAutomaticLookahead(keys.MANY_IDX, prodOccurrence);
        return this.manyInternalLogic(prodOccurrence, actionORMethodDef, laKey);
    };
    RecognizerEngine.prototype.manyInternalLogic = function (prodOccurrence, actionORMethodDef, key) {
        var _this = this;
        var lookaheadFunction = this.getLaFuncFromCache(key);
        var action;
        if (typeof actionORMethodDef !== "function") {
            action = actionORMethodDef.DEF;
            var predicate_3 = actionORMethodDef.GATE;
            // predicate present
            if (predicate_3 !== undefined) {
                var orgLookaheadFunction_3 = lookaheadFunction;
                lookaheadFunction = function () {
                    return predicate_3.call(_this) && orgLookaheadFunction_3.call(_this);
                };
            }
        }
        else {
            action = actionORMethodDef;
        }
        var notStuck = true;
        while (lookaheadFunction.call(this) === true && notStuck === true) {
            notStuck = this.doSingleRepetition(action);
        }
        // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
        this.attemptInRepetitionRecovery(this.manyInternal, [prodOccurrence, actionORMethodDef], lookaheadFunction, keys.MANY_IDX, prodOccurrence, interpreter.NextTerminalAfterManyWalker, 
        // The notStuck parameter is only relevant when "attemptInRepetitionRecovery"
        // is invoked from manyInternal, in the MANY_SEP case and AT_LEAST_ONE[_SEP]
        // An infinite loop cannot occur as:
        // - Either the lookahead is guaranteed to consume something (Single Token Separator)
        // - AT_LEAST_ONE by definition is guaranteed to consume something (or error out).
        notStuck);
    };
    RecognizerEngine.prototype.manySepFirstInternal = function (prodOccurrence, options) {
        var laKey = this.getKeyForAutomaticLookahead(keys.MANY_SEP_IDX, prodOccurrence);
        this.manySepFirstInternalLogic(prodOccurrence, options, laKey);
    };
    RecognizerEngine.prototype.manySepFirstInternalLogic = function (prodOccurrence, options, key) {
        var _this = this;
        var action = options.DEF;
        var separator = options.SEP;
        var firstIterationLaFunc = this.getLaFuncFromCache(key);
        // 1st iteration
        if (firstIterationLaFunc.call(this) === true) {
            action.call(this);
            var separatorLookAheadFunc = function () {
                return _this.tokenMatcher(_this.LA(1), separator);
            };
            // 2nd..nth iterations
            while (this.tokenMatcher(this.LA(1), separator) === true) {
                // note that this CONSUME will never enter recovery because
                // the separatorLookAheadFunc checks that the separator really does exist.
                this.CONSUME(separator);
                // No need for checking infinite loop here due to consuming the separator.
                action.call(this);
            }
            // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
            this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
                prodOccurrence,
                separator,
                separatorLookAheadFunc,
                action,
                interpreter.NextTerminalAfterManySepWalker
            ], separatorLookAheadFunc, keys.MANY_SEP_IDX, prodOccurrence, interpreter.NextTerminalAfterManySepWalker);
        }
    };
    RecognizerEngine.prototype.repetitionSepSecondInternal = function (prodOccurrence, separator, separatorLookAheadFunc, action, nextTerminalAfterWalker) {
        while (separatorLookAheadFunc()) {
            // note that this CONSUME will never enter recovery because
            // the separatorLookAheadFunc checks that the separator really does exist.
            this.CONSUME(separator);
            action.call(this);
        }
        // we can only arrive to this function after an error
        // has occurred (hence the name 'second') so the following
        // IF will always be entered, its possible to remove it...
        // however it is kept to avoid confusion and be consistent.
        // Performance optimization: "attemptInRepetitionRecovery" will be defined as NOOP unless recovery is enabled
        /* istanbul ignore else */
        this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
            prodOccurrence,
            separator,
            separatorLookAheadFunc,
            action,
            nextTerminalAfterWalker
        ], separatorLookAheadFunc, keys.AT_LEAST_ONE_SEP_IDX, prodOccurrence, nextTerminalAfterWalker);
    };
    RecognizerEngine.prototype.doSingleRepetition = function (action) {
        var beforeIteration = this.getLexerPosition();
        action.call(this);
        var afterIteration = this.getLexerPosition();
        // This boolean will indicate if this repetition progressed
        // or if we are "stuck" (potential infinite loop in the repetition).
        return afterIteration > beforeIteration;
    };
    RecognizerEngine.prototype.orInternal = function (altsOrOpts, occurrence) {
        var laKey = this.getKeyForAutomaticLookahead(keys.OR_IDX, occurrence);
        var alts = (0, isArray_1$1.default)(altsOrOpts) ? altsOrOpts : altsOrOpts.DEF;
        var laFunc = this.getLaFuncFromCache(laKey);
        var altIdxToTake = laFunc.call(this, alts);
        if (altIdxToTake !== undefined) {
            var chosenAlternative = alts[altIdxToTake];
            return chosenAlternative.ALT.call(this);
        }
        this.raiseNoAltException(occurrence, altsOrOpts.ERR_MSG);
    };
    RecognizerEngine.prototype.ruleFinallyStateUpdate = function () {
        this.RULE_STACK.pop();
        this.RULE_OCCURRENCE_STACK.pop();
        // NOOP when cst is disabled
        this.cstFinallyStateUpdate();
        if (this.RULE_STACK.length === 0 && this.isAtEndOfInput() === false) {
            var firstRedundantTok = this.LA(1);
            var errMsg = this.errorMessageProvider.buildNotAllInputParsedMessage({
                firstRedundant: firstRedundantTok,
                ruleName: this.getCurrRuleFullName()
            });
            this.SAVE_ERROR(new exceptions_public.NotAllInputParsedException(errMsg, firstRedundantTok));
        }
    };
    RecognizerEngine.prototype.subruleInternal = function (ruleToCall, idx, options) {
        var ruleResult;
        try {
            var args = options !== undefined ? options.ARGS : undefined;
            this.subruleIdx = idx;
            ruleResult = ruleToCall.apply(this, args);
            this.cstPostNonTerminal(ruleResult, options !== undefined && options.LABEL !== undefined
                ? options.LABEL
                : ruleToCall.ruleName);
            return ruleResult;
        }
        catch (e) {
            throw this.subruleInternalError(e, options, ruleToCall.ruleName);
        }
    };
    RecognizerEngine.prototype.subruleInternalError = function (e, options, ruleName) {
        if ((0, exceptions_public.isRecognitionException)(e) && e.partialCstResult !== undefined) {
            this.cstPostNonTerminal(e.partialCstResult, options !== undefined && options.LABEL !== undefined
                ? options.LABEL
                : ruleName);
            delete e.partialCstResult;
        }
        throw e;
    };
    RecognizerEngine.prototype.consumeInternal = function (tokType, idx, options) {
        var consumedToken;
        try {
            var nextToken = this.LA(1);
            if (this.tokenMatcher(nextToken, tokType) === true) {
                this.consumeToken();
                consumedToken = nextToken;
            }
            else {
                this.consumeInternalError(tokType, nextToken, options);
            }
        }
        catch (eFromConsumption) {
            consumedToken = this.consumeInternalRecovery(tokType, idx, eFromConsumption);
        }
        this.cstPostTerminal(options !== undefined && options.LABEL !== undefined
            ? options.LABEL
            : tokType.name, consumedToken);
        return consumedToken;
    };
    RecognizerEngine.prototype.consumeInternalError = function (tokType, nextToken, options) {
        var msg;
        var previousToken = this.LA(0);
        if (options !== undefined && options.ERR_MSG) {
            msg = options.ERR_MSG;
        }
        else {
            msg = this.errorMessageProvider.buildMismatchTokenMessage({
                expected: tokType,
                actual: nextToken,
                previous: previousToken,
                ruleName: this.getCurrRuleFullName()
            });
        }
        throw this.SAVE_ERROR(new exceptions_public.MismatchedTokenException(msg, nextToken, previousToken));
    };
    RecognizerEngine.prototype.consumeInternalRecovery = function (tokType, idx, eFromConsumption) {
        // no recovery allowed during backtracking, otherwise backtracking may recover invalid syntax and accept it
        // but the original syntax could have been parsed successfully without any backtracking + recovery
        if (this.recoveryEnabled &&
            // TODO: more robust checking of the exception type. Perhaps Typescript extending expressions?
            eFromConsumption.name === "MismatchedTokenException" &&
            !this.isBackTracking()) {
            var follows = this.getFollowsForInRuleRecovery(tokType, idx);
            try {
                return this.tryInRuleRecovery(tokType, follows);
            }
            catch (eFromInRuleRecovery) {
                if (eFromInRuleRecovery.name === recoverable.IN_RULE_RECOVERY_EXCEPTION) {
                    // failed in RuleRecovery.
                    // throw the original error in order to trigger reSync error recovery
                    throw eFromConsumption;
                }
                else {
                    throw eFromInRuleRecovery;
                }
            }
        }
        else {
            throw eFromConsumption;
        }
    };
    RecognizerEngine.prototype.saveRecogState = function () {
        // errors is a getter which will clone the errors array
        var savedErrors = this.errors;
        var savedRuleStack = (0, clone_1$1.default)(this.RULE_STACK);
        return {
            errors: savedErrors,
            lexerState: this.exportLexerState(),
            RULE_STACK: savedRuleStack,
            CST_STACK: this.CST_STACK
        };
    };
    RecognizerEngine.prototype.reloadRecogState = function (newState) {
        this.errors = newState.errors;
        this.importLexerState(newState.lexerState);
        this.RULE_STACK = newState.RULE_STACK;
    };
    RecognizerEngine.prototype.ruleInvocationStateUpdate = function (shortName, fullName, idxInCallingRule) {
        this.RULE_OCCURRENCE_STACK.push(idxInCallingRule);
        this.RULE_STACK.push(shortName);
        // NOOP when cst is disabled
        this.cstInvocationStateUpdate(fullName);
    };
    RecognizerEngine.prototype.isBackTracking = function () {
        return this.isBackTrackingStack.length !== 0;
    };
    RecognizerEngine.prototype.getCurrRuleFullName = function () {
        var shortName = this.getLastExplicitRuleShortName();
        return this.shortRuleNameToFull[shortName];
    };
    RecognizerEngine.prototype.shortRuleNameToFullName = function (shortName) {
        return this.shortRuleNameToFull[shortName];
    };
    RecognizerEngine.prototype.isAtEndOfInput = function () {
        return this.tokenMatcher(this.LA(1), tokens_public.EOF);
    };
    RecognizerEngine.prototype.reset = function () {
        this.resetLexerState();
        this.subruleIdx = 0;
        this.isBackTrackingStack = [];
        this.errors = [];
        this.RULE_STACK = [];
        // TODO: extract a specific reset for TreeBuilder trait
        this.CST_STACK = [];
        this.RULE_OCCURRENCE_STACK = [];
    };
    return RecognizerEngine;
}());
exports.RecognizerEngine = RecognizerEngine;

});

var error_handler = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;

var has_1$1 = __importDefault(has_1);
var clone_1$1 = __importDefault(clone_1);


/**
 * Trait responsible for runtime parsing errors.
 */
var ErrorHandler = /** @class */ (function () {
    function ErrorHandler() {
    }
    ErrorHandler.prototype.initErrorHandler = function (config) {
        this._errors = [];
        this.errorMessageProvider = (0, has_1$1.default)(config, "errorMessageProvider")
            ? config.errorMessageProvider // assumes end user provides the correct config value/type
            : parser_1.DEFAULT_PARSER_CONFIG.errorMessageProvider;
    };
    ErrorHandler.prototype.SAVE_ERROR = function (error) {
        if ((0, exceptions_public.isRecognitionException)(error)) {
            error.context = {
                ruleStack: this.getHumanReadableRuleStack(),
                ruleOccurrenceStack: (0, clone_1$1.default)(this.RULE_OCCURRENCE_STACK)
            };
            this._errors.push(error);
            return error;
        }
        else {
            throw Error("Trying to save an Error which is not a RecognitionException");
        }
    };
    Object.defineProperty(ErrorHandler.prototype, "errors", {
        get: function () {
            return (0, clone_1$1.default)(this._errors);
        },
        set: function (newErrors) {
            this._errors = newErrors;
        },
        enumerable: false,
        configurable: true
    });
    // TODO: consider caching the error message computed information
    ErrorHandler.prototype.raiseEarlyExitException = function (occurrence, prodType, userDefinedErrMsg) {
        var ruleName = this.getCurrRuleFullName();
        var ruleGrammar = this.getGAstProductions()[ruleName];
        var lookAheadPathsPerAlternative = (0, lookahead.getLookaheadPathsForOptionalProd)(occurrence, ruleGrammar, prodType, this.maxLookahead);
        var insideProdPaths = lookAheadPathsPerAlternative[0];
        var actualTokens = [];
        for (var i = 1; i <= this.maxLookahead; i++) {
            actualTokens.push(this.LA(i));
        }
        var msg = this.errorMessageProvider.buildEarlyExitMessage({
            expectedIterationPaths: insideProdPaths,
            actual: actualTokens,
            previous: this.LA(0),
            customUserDescription: userDefinedErrMsg,
            ruleName: ruleName
        });
        throw this.SAVE_ERROR(new exceptions_public.EarlyExitException(msg, this.LA(1), this.LA(0)));
    };
    // TODO: consider caching the error message computed information
    ErrorHandler.prototype.raiseNoAltException = function (occurrence, errMsgTypes) {
        var ruleName = this.getCurrRuleFullName();
        var ruleGrammar = this.getGAstProductions()[ruleName];
        // TODO: getLookaheadPathsForOr can be slow for large enough maxLookahead and certain grammars, consider caching ?
        var lookAheadPathsPerAlternative = (0, lookahead.getLookaheadPathsForOr)(occurrence, ruleGrammar, this.maxLookahead);
        var actualTokens = [];
        for (var i = 1; i <= this.maxLookahead; i++) {
            actualTokens.push(this.LA(i));
        }
        var previousToken = this.LA(0);
        var errMsg = this.errorMessageProvider.buildNoViableAltMessage({
            expectedPathsPerAlt: lookAheadPathsPerAlternative,
            actual: actualTokens,
            previous: previousToken,
            customUserDescription: errMsgTypes,
            ruleName: this.getCurrRuleFullName()
        });
        throw this.SAVE_ERROR(new exceptions_public.NoViableAltException(errMsg, this.LA(1), previousToken));
    };
    return ErrorHandler;
}());
exports.ErrorHandler = ErrorHandler;

});

var context_assist = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentAssist = void 0;

var first_1 = __importDefault(first);
var isUndefined_1$1 = __importDefault(isUndefined_1);
var ContentAssist = /** @class */ (function () {
    function ContentAssist() {
    }
    ContentAssist.prototype.initContentAssist = function () { };
    ContentAssist.prototype.computeContentAssist = function (startRuleName, precedingInput) {
        var startRuleGast = this.gastProductionsCache[startRuleName];
        if ((0, isUndefined_1$1.default)(startRuleGast)) {
            throw Error("Rule ->".concat(startRuleName, "<- does not exist in this grammar."));
        }
        return (0, interpreter.nextPossibleTokensAfter)([startRuleGast], precedingInput, this.tokenMatcher, this.maxLookahead);
    };
    // TODO: should this be a member method or a utility? it does not have any state or usage of 'this'...
    // TODO: should this be more explicitly part of the public API?
    ContentAssist.prototype.getNextPossibleTokenTypes = function (grammarPath) {
        var topRuleName = (0, first_1.default)(grammarPath.ruleStack);
        var gastProductions = this.getGAstProductions();
        var topProduction = gastProductions[topRuleName];
        var nextPossibleTokenTypes = new interpreter.NextAfterTokenWalker(topProduction, grammarPath).startWalking();
        return nextPossibleTokenTypes;
    };
    return ContentAssist;
}());
exports.ContentAssist = ContentAssist;

});

var gast_recorder = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GastRecorder = void 0;
var last_1$1 = __importDefault(last_1);
var isArray_1$1 = __importDefault(isArray_1);
var some_1$1 = __importDefault(some_1);
var forEach_1$1 = __importDefault(forEach_1);
var isFunction_1$1 = __importDefault(isFunction_1);
var has_1$1 = __importDefault(has_1);






var RECORDING_NULL_OBJECT = {
    description: "This Object indicates the Parser is during Recording Phase"
};
Object.freeze(RECORDING_NULL_OBJECT);
var HANDLE_SEPARATOR = true;
var MAX_METHOD_IDX = Math.pow(2, keys.BITS_FOR_OCCURRENCE_IDX) - 1;
var RFT = (0, tokens_public.createToken)({ name: "RECORDING_PHASE_TOKEN", pattern: lexer_public_1.Lexer.NA });
(0, tokens.augmentTokenTypes)([RFT]);
var RECORDING_PHASE_TOKEN = (0, tokens_public.createTokenInstance)(RFT, "This IToken indicates the Parser is in Recording Phase\n\t" +
    "" +
    "See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details", 
// Using "-1" instead of NaN (as in EOF) because an actual number is less likely to
// cause errors if the output of LA or CONSUME would be (incorrectly) used during the recording phase.
-1, -1, -1, -1, -1, -1);
Object.freeze(RECORDING_PHASE_TOKEN);
var RECORDING_PHASE_CSTNODE = {
    name: "This CSTNode indicates the Parser is in Recording Phase\n\t" +
        "See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details",
    children: {}
};
/**
 * This trait handles the creation of the GAST structure for Chevrotain Grammars
 */
var GastRecorder = /** @class */ (function () {
    function GastRecorder() {
    }
    GastRecorder.prototype.initGastRecorder = function (config) {
        this.recordingProdStack = [];
        this.RECORDING_PHASE = false;
    };
    GastRecorder.prototype.enableRecording = function () {
        var _this = this;
        this.RECORDING_PHASE = true;
        this.TRACE_INIT("Enable Recording", function () {
            var _loop_1 = function (i) {
                var idx = i > 0 ? i : "";
                _this["CONSUME".concat(idx)] = function (arg1, arg2) {
                    return this.consumeInternalRecord(arg1, i, arg2);
                };
                _this["SUBRULE".concat(idx)] = function (arg1, arg2) {
                    return this.subruleInternalRecord(arg1, i, arg2);
                };
                _this["OPTION".concat(idx)] = function (arg1) {
                    return this.optionInternalRecord(arg1, i);
                };
                _this["OR".concat(idx)] = function (arg1) {
                    return this.orInternalRecord(arg1, i);
                };
                _this["MANY".concat(idx)] = function (arg1) {
                    this.manyInternalRecord(i, arg1);
                };
                _this["MANY_SEP".concat(idx)] = function (arg1) {
                    this.manySepFirstInternalRecord(i, arg1);
                };
                _this["AT_LEAST_ONE".concat(idx)] = function (arg1) {
                    this.atLeastOneInternalRecord(i, arg1);
                };
                _this["AT_LEAST_ONE_SEP".concat(idx)] = function (arg1) {
                    this.atLeastOneSepFirstInternalRecord(i, arg1);
                };
            };
            /**
             * Warning Dark Voodoo Magic upcoming!
             * We are "replacing" the public parsing DSL methods API
             * With **new** alternative implementations on the Parser **instance**
             *
             * So far this is the only way I've found to avoid performance regressions during parsing time.
             * - Approx 30% performance regression was measured on Chrome 75 Canary when attempting to replace the "internal"
             *   implementations directly instead.
             */
            for (var i = 0; i < 10; i++) {
                _loop_1(i);
            }
            // DSL methods with the idx(suffix) as an argument
            _this["consume"] = function (idx, arg1, arg2) {
                return this.consumeInternalRecord(arg1, idx, arg2);
            };
            _this["subrule"] = function (idx, arg1, arg2) {
                return this.subruleInternalRecord(arg1, idx, arg2);
            };
            _this["option"] = function (idx, arg1) {
                return this.optionInternalRecord(arg1, idx);
            };
            _this["or"] = function (idx, arg1) {
                return this.orInternalRecord(arg1, idx);
            };
            _this["many"] = function (idx, arg1) {
                this.manyInternalRecord(idx, arg1);
            };
            _this["atLeastOne"] = function (idx, arg1) {
                this.atLeastOneInternalRecord(idx, arg1);
            };
            _this.ACTION = _this.ACTION_RECORD;
            _this.BACKTRACK = _this.BACKTRACK_RECORD;
            _this.LA = _this.LA_RECORD;
        });
    };
    GastRecorder.prototype.disableRecording = function () {
        var _this = this;
        this.RECORDING_PHASE = false;
        // By deleting these **instance** properties, any future invocation
        // will be deferred to the original methods on the **prototype** object
        // This seems to get rid of any incorrect optimizations that V8 may
        // do during the recording phase.
        this.TRACE_INIT("Deleting Recording methods", function () {
            var that = _this;
            for (var i = 0; i < 10; i++) {
                var idx = i > 0 ? i : "";
                delete that["CONSUME".concat(idx)];
                delete that["SUBRULE".concat(idx)];
                delete that["OPTION".concat(idx)];
                delete that["OR".concat(idx)];
                delete that["MANY".concat(idx)];
                delete that["MANY_SEP".concat(idx)];
                delete that["AT_LEAST_ONE".concat(idx)];
                delete that["AT_LEAST_ONE_SEP".concat(idx)];
            }
            delete that["consume"];
            delete that["subrule"];
            delete that["option"];
            delete that["or"];
            delete that["many"];
            delete that["atLeastOne"];
            delete that.ACTION;
            delete that.BACKTRACK;
            delete that.LA;
        });
    };
    //   Parser methods are called inside an ACTION?
    //   Maybe try/catch/finally on ACTIONS while disabling the recorders state changes?
    // @ts-expect-error -- noop place holder
    GastRecorder.prototype.ACTION_RECORD = function (impl) {
        // NO-OP during recording
    };
    // Executing backtracking logic will break our recording logic assumptions
    GastRecorder.prototype.BACKTRACK_RECORD = function (grammarRule, args) {
        return function () { return true; };
    };
    // LA is part of the official API and may be used for custom lookahead logic
    // by end users who may forget to wrap it in ACTION or inside a GATE
    GastRecorder.prototype.LA_RECORD = function (howMuch) {
        // We cannot use the RECORD_PHASE_TOKEN here because someone may depend
        // On LA return EOF at the end of the input so an infinite loop may occur.
        return parser_1.END_OF_FILE;
    };
    GastRecorder.prototype.topLevelRuleRecord = function (name, def) {
        try {
            var newTopLevelRule = new api$2.Rule({ definition: [], name: name });
            newTopLevelRule.name = name;
            this.recordingProdStack.push(newTopLevelRule);
            def.call(this);
            this.recordingProdStack.pop();
            return newTopLevelRule;
        }
        catch (originalError) {
            if (originalError.KNOWN_RECORDER_ERROR !== true) {
                try {
                    originalError.message =
                        originalError.message +
                            '\n\t This error was thrown during the "grammar recording phase" For more info see:\n\t' +
                            "https://chevrotain.io/docs/guide/internals.html#grammar-recording";
                }
                catch (mutabilityError) {
                    // We may not be able to modify the original error object
                    throw originalError;
                }
            }
            throw originalError;
        }
    };
    // Implementation of parsing DSL
    GastRecorder.prototype.optionInternalRecord = function (actionORMethodDef, occurrence) {
        return recordProd.call(this, api$2.Option, actionORMethodDef, occurrence);
    };
    GastRecorder.prototype.atLeastOneInternalRecord = function (occurrence, actionORMethodDef) {
        recordProd.call(this, api$2.RepetitionMandatory, actionORMethodDef, occurrence);
    };
    GastRecorder.prototype.atLeastOneSepFirstInternalRecord = function (occurrence, options) {
        recordProd.call(this, api$2.RepetitionMandatoryWithSeparator, options, occurrence, HANDLE_SEPARATOR);
    };
    GastRecorder.prototype.manyInternalRecord = function (occurrence, actionORMethodDef) {
        recordProd.call(this, api$2.Repetition, actionORMethodDef, occurrence);
    };
    GastRecorder.prototype.manySepFirstInternalRecord = function (occurrence, options) {
        recordProd.call(this, api$2.RepetitionWithSeparator, options, occurrence, HANDLE_SEPARATOR);
    };
    GastRecorder.prototype.orInternalRecord = function (altsOrOpts, occurrence) {
        return recordOrProd.call(this, altsOrOpts, occurrence);
    };
    GastRecorder.prototype.subruleInternalRecord = function (ruleToCall, occurrence, options) {
        assertMethodIdxIsValid(occurrence);
        if (!ruleToCall || (0, has_1$1.default)(ruleToCall, "ruleName") === false) {
            var error = new Error("<SUBRULE".concat(getIdxSuffix(occurrence), "> argument is invalid") +
                " expecting a Parser method reference but got: <".concat(JSON.stringify(ruleToCall), ">") +
                "\n inside top level rule: <".concat(this.recordingProdStack[0].name, ">"));
            error.KNOWN_RECORDER_ERROR = true;
            throw error;
        }
        var prevProd = (0, last_1$1.default)(this.recordingProdStack);
        var ruleName = ruleToCall.ruleName;
        var newNoneTerminal = new api$2.NonTerminal({
            idx: occurrence,
            nonTerminalName: ruleName,
            label: options === null || options === void 0 ? void 0 : options.LABEL,
            // The resolving of the `referencedRule` property will be done once all the Rule's GASTs have been created
            referencedRule: undefined
        });
        prevProd.definition.push(newNoneTerminal);
        return this.outputCst ? RECORDING_PHASE_CSTNODE : RECORDING_NULL_OBJECT;
    };
    GastRecorder.prototype.consumeInternalRecord = function (tokType, occurrence, options) {
        assertMethodIdxIsValid(occurrence);
        if (!(0, tokens.hasShortKeyProperty)(tokType)) {
            var error = new Error("<CONSUME".concat(getIdxSuffix(occurrence), "> argument is invalid") +
                " expecting a TokenType reference but got: <".concat(JSON.stringify(tokType), ">") +
                "\n inside top level rule: <".concat(this.recordingProdStack[0].name, ">"));
            error.KNOWN_RECORDER_ERROR = true;
            throw error;
        }
        var prevProd = (0, last_1$1.default)(this.recordingProdStack);
        var newNoneTerminal = new api$2.Terminal({
            idx: occurrence,
            terminalType: tokType,
            label: options === null || options === void 0 ? void 0 : options.LABEL
        });
        prevProd.definition.push(newNoneTerminal);
        return RECORDING_PHASE_TOKEN;
    };
    return GastRecorder;
}());
exports.GastRecorder = GastRecorder;
function recordProd(prodConstructor, mainProdArg, occurrence, handleSep) {
    if (handleSep === void 0) { handleSep = false; }
    assertMethodIdxIsValid(occurrence);
    var prevProd = (0, last_1$1.default)(this.recordingProdStack);
    var grammarAction = (0, isFunction_1$1.default)(mainProdArg) ? mainProdArg : mainProdArg.DEF;
    var newProd = new prodConstructor({ definition: [], idx: occurrence });
    if (handleSep) {
        newProd.separator = mainProdArg.SEP;
    }
    if ((0, has_1$1.default)(mainProdArg, "MAX_LOOKAHEAD")) {
        newProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
    }
    this.recordingProdStack.push(newProd);
    grammarAction.call(this);
    prevProd.definition.push(newProd);
    this.recordingProdStack.pop();
    return RECORDING_NULL_OBJECT;
}
function recordOrProd(mainProdArg, occurrence) {
    var _this = this;
    assertMethodIdxIsValid(occurrence);
    var prevProd = (0, last_1$1.default)(this.recordingProdStack);
    // Only an array of alternatives
    var hasOptions = (0, isArray_1$1.default)(mainProdArg) === false;
    var alts = hasOptions === false ? mainProdArg : mainProdArg.DEF;
    var newOrProd = new api$2.Alternation({
        definition: [],
        idx: occurrence,
        ignoreAmbiguities: hasOptions && mainProdArg.IGNORE_AMBIGUITIES === true
    });
    if ((0, has_1$1.default)(mainProdArg, "MAX_LOOKAHEAD")) {
        newOrProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
    }
    var hasPredicates = (0, some_1$1.default)(alts, function (currAlt) { return (0, isFunction_1$1.default)(currAlt.GATE); });
    newOrProd.hasPredicates = hasPredicates;
    prevProd.definition.push(newOrProd);
    (0, forEach_1$1.default)(alts, function (currAlt) {
        var currAltFlat = new api$2.Alternative({ definition: [] });
        newOrProd.definition.push(currAltFlat);
        if ((0, has_1$1.default)(currAlt, "IGNORE_AMBIGUITIES")) {
            currAltFlat.ignoreAmbiguities = currAlt.IGNORE_AMBIGUITIES; // assumes end user provides the correct config value/type
        }
        // **implicit** ignoreAmbiguities due to usage of gate
        else if ((0, has_1$1.default)(currAlt, "GATE")) {
            currAltFlat.ignoreAmbiguities = true;
        }
        _this.recordingProdStack.push(currAltFlat);
        currAlt.ALT.call(_this);
        _this.recordingProdStack.pop();
    });
    return RECORDING_NULL_OBJECT;
}
function getIdxSuffix(idx) {
    return idx === 0 ? "" : "".concat(idx);
}
function assertMethodIdxIsValid(idx) {
    if (idx < 0 || idx > MAX_METHOD_IDX) {
        var error = new Error(
        // The stack trace will contain all the needed details
        "Invalid DSL Method idx value: <".concat(idx, ">\n\t") +
            "Idx value must be a none negative value smaller than ".concat(MAX_METHOD_IDX + 1));
        error.KNOWN_RECORDER_ERROR = true;
        throw error;
    }
}

});

var perf_tracer = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTracer = void 0;
var has_1$1 = __importDefault(has_1);


/**
 * Trait responsible for runtime parsing errors.
 */
var PerformanceTracer = /** @class */ (function () {
    function PerformanceTracer() {
    }
    PerformanceTracer.prototype.initPerformanceTracer = function (config) {
        if ((0, has_1$1.default)(config, "traceInitPerf")) {
            var userTraceInitPerf = config.traceInitPerf;
            var traceIsNumber = typeof userTraceInitPerf === "number";
            this.traceInitMaxIdent = traceIsNumber
                ? userTraceInitPerf
                : Infinity;
            this.traceInitPerf = traceIsNumber
                ? userTraceInitPerf > 0
                : userTraceInitPerf; // assumes end user provides the correct config value/type
        }
        else {
            this.traceInitMaxIdent = 0;
            this.traceInitPerf = parser_1.DEFAULT_PARSER_CONFIG.traceInitPerf;
        }
        this.traceInitIndent = -1;
    };
    PerformanceTracer.prototype.TRACE_INIT = function (phaseDesc, phaseImpl) {
        // No need to optimize this using NOOP pattern because
        // It is not called in a hot spot...
        if (this.traceInitPerf === true) {
            this.traceInitIndent++;
            var indent = new Array(this.traceInitIndent + 1).join("\t");
            if (this.traceInitIndent < this.traceInitMaxIdent) {
                console.log("".concat(indent, "--> <").concat(phaseDesc, ">"));
            }
            var _a = (0, api$3.timer)(phaseImpl), time = _a.time, value = _a.value;
            /* istanbul ignore next - Difficult to reproduce specific performance behavior (>10ms) in tests */
            var traceMethod = time > 10 ? console.warn : console.log;
            if (this.traceInitIndent < this.traceInitMaxIdent) {
                traceMethod("".concat(indent, "<-- <").concat(phaseDesc, "> time: ").concat(time, "ms"));
            }
            this.traceInitIndent--;
            return value;
        }
        else {
            return phaseImpl();
        }
    };
    return PerformanceTracer;
}());
exports.PerformanceTracer = PerformanceTracer;

});

var apply_mixins = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMixins = void 0;
function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach(function (baseCtor) {
        var baseProto = baseCtor.prototype;
        Object.getOwnPropertyNames(baseProto).forEach(function (propName) {
            if (propName === "constructor") {
                return;
            }
            var basePropDescriptor = Object.getOwnPropertyDescriptor(baseProto, propName);
            // Handle Accessors
            if (basePropDescriptor &&
                (basePropDescriptor.get || basePropDescriptor.set)) {
                Object.defineProperty(derivedCtor.prototype, propName, basePropDescriptor);
            }
            else {
                derivedCtor.prototype[propName] = baseCtor.prototype[propName];
            }
        });
    });
}
exports.applyMixins = applyMixins;

});

var parser$1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddedActionsParser = exports.CstParser = exports.Parser = exports.EMPTY_ALT = exports.ParserDefinitionErrorType = exports.DEFAULT_RULE_CONFIG = exports.DEFAULT_PARSER_CONFIG = exports.END_OF_FILE = void 0;
var isEmpty_1$1 = __importDefault(isEmpty_1);
var map_1$1 = __importDefault(map_1);
var forEach_1$1 = __importDefault(forEach_1);
var values_1$1 = __importDefault(values_1);
var has_1$1 = __importDefault(has_1);
var clone_1$1 = __importDefault(clone_1);

















exports.END_OF_FILE = (0, tokens_public.createTokenInstance)(tokens_public.EOF, "", NaN, NaN, NaN, NaN, NaN, NaN);
Object.freeze(exports.END_OF_FILE);
exports.DEFAULT_PARSER_CONFIG = Object.freeze({
    recoveryEnabled: false,
    maxLookahead: 3,
    dynamicTokensEnabled: false,
    outputCst: true,
    errorMessageProvider: errors_public.defaultParserErrorProvider,
    nodeLocationTracking: "none",
    traceInitPerf: false,
    skipValidations: false
});
exports.DEFAULT_RULE_CONFIG = Object.freeze({
    recoveryValueFunc: function () { return undefined; },
    resyncEnabled: true
});
(function (ParserDefinitionErrorType) {
    ParserDefinitionErrorType[ParserDefinitionErrorType["INVALID_RULE_NAME"] = 0] = "INVALID_RULE_NAME";
    ParserDefinitionErrorType[ParserDefinitionErrorType["DUPLICATE_RULE_NAME"] = 1] = "DUPLICATE_RULE_NAME";
    ParserDefinitionErrorType[ParserDefinitionErrorType["INVALID_RULE_OVERRIDE"] = 2] = "INVALID_RULE_OVERRIDE";
    ParserDefinitionErrorType[ParserDefinitionErrorType["DUPLICATE_PRODUCTIONS"] = 3] = "DUPLICATE_PRODUCTIONS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["UNRESOLVED_SUBRULE_REF"] = 4] = "UNRESOLVED_SUBRULE_REF";
    ParserDefinitionErrorType[ParserDefinitionErrorType["LEFT_RECURSION"] = 5] = "LEFT_RECURSION";
    ParserDefinitionErrorType[ParserDefinitionErrorType["NONE_LAST_EMPTY_ALT"] = 6] = "NONE_LAST_EMPTY_ALT";
    ParserDefinitionErrorType[ParserDefinitionErrorType["AMBIGUOUS_ALTS"] = 7] = "AMBIGUOUS_ALTS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["CONFLICT_TOKENS_RULES_NAMESPACE"] = 8] = "CONFLICT_TOKENS_RULES_NAMESPACE";
    ParserDefinitionErrorType[ParserDefinitionErrorType["INVALID_TOKEN_NAME"] = 9] = "INVALID_TOKEN_NAME";
    ParserDefinitionErrorType[ParserDefinitionErrorType["NO_NON_EMPTY_LOOKAHEAD"] = 10] = "NO_NON_EMPTY_LOOKAHEAD";
    ParserDefinitionErrorType[ParserDefinitionErrorType["AMBIGUOUS_PREFIX_ALTS"] = 11] = "AMBIGUOUS_PREFIX_ALTS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["TOO_MANY_ALTS"] = 12] = "TOO_MANY_ALTS";
    ParserDefinitionErrorType[ParserDefinitionErrorType["CUSTOM_LOOKAHEAD_VALIDATION"] = 13] = "CUSTOM_LOOKAHEAD_VALIDATION";
})(exports.ParserDefinitionErrorType || (exports.ParserDefinitionErrorType = {}));
function EMPTY_ALT(value) {
    if (value === void 0) { value = undefined; }
    return function () {
        return value;
    };
}
exports.EMPTY_ALT = EMPTY_ALT;
var Parser = /** @class */ (function () {
    function Parser(tokenVocabulary, config) {
        this.definitionErrors = [];
        this.selfAnalysisDone = false;
        var that = this;
        that.initErrorHandler(config);
        that.initLexerAdapter();
        that.initLooksAhead(config);
        that.initRecognizerEngine(tokenVocabulary, config);
        that.initRecoverable(config);
        that.initTreeBuilder(config);
        that.initContentAssist();
        that.initGastRecorder(config);
        that.initPerformanceTracer(config);
        if ((0, has_1$1.default)(config, "ignoredIssues")) {
            throw new Error("The <ignoredIssues> IParserConfig property has been deprecated.\n\t" +
                "Please use the <IGNORE_AMBIGUITIES> flag on the relevant DSL method instead.\n\t" +
                "See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#IGNORING_AMBIGUITIES\n\t" +
                "For further details.");
        }
        this.skipValidations = (0, has_1$1.default)(config, "skipValidations")
            ? config.skipValidations // casting assumes the end user passing the correct type
            : exports.DEFAULT_PARSER_CONFIG.skipValidations;
    }
    /**
     *  @deprecated use the **instance** method with the same name instead
     */
    Parser.performSelfAnalysis = function (parserInstance) {
        throw Error("The **static** `performSelfAnalysis` method has been deprecated." +
            "\t\nUse the **instance** method with the same name instead.");
    };
    Parser.prototype.performSelfAnalysis = function () {
        var _this = this;
        this.TRACE_INIT("performSelfAnalysis", function () {
            var defErrorsMsgs;
            _this.selfAnalysisDone = true;
            var className = _this.className;
            _this.TRACE_INIT("toFastProps", function () {
                // Without this voodoo magic the parser would be x3-x4 slower
                // It seems it is better to invoke `toFastProperties` **before**
                // Any manipulations of the `this` object done during the recording phase.
                (0, api$3.toFastProperties)(_this);
            });
            _this.TRACE_INIT("Grammar Recording", function () {
                try {
                    _this.enableRecording();
                    // Building the GAST
                    (0, forEach_1$1.default)(_this.definedRulesNames, function (currRuleName) {
                        var wrappedRule = _this[currRuleName];
                        var originalGrammarAction = wrappedRule["originalGrammarAction"];
                        var recordedRuleGast;
                        _this.TRACE_INIT("".concat(currRuleName, " Rule"), function () {
                            recordedRuleGast = _this.topLevelRuleRecord(currRuleName, originalGrammarAction);
                        });
                        _this.gastProductionsCache[currRuleName] = recordedRuleGast;
                    });
                }
                finally {
                    _this.disableRecording();
                }
            });
            var resolverErrors = [];
            _this.TRACE_INIT("Grammar Resolving", function () {
                resolverErrors = (0, gast_resolver_public.resolveGrammar)({
                    rules: (0, values_1$1.default)(_this.gastProductionsCache)
                });
                _this.definitionErrors = _this.definitionErrors.concat(resolverErrors);
            });
            _this.TRACE_INIT("Grammar Validations", function () {
                // only perform additional grammar validations IFF no resolving errors have occurred.
                // as unresolved grammar may lead to unhandled runtime exceptions in the follow up validations.
                if ((0, isEmpty_1$1.default)(resolverErrors) && _this.skipValidations === false) {
                    var validationErrors = (0, gast_resolver_public.validateGrammar)({
                        rules: (0, values_1$1.default)(_this.gastProductionsCache),
                        tokenTypes: (0, values_1$1.default)(_this.tokensMap),
                        errMsgProvider: errors_public.defaultGrammarValidatorErrorProvider,
                        grammarName: className
                    });
                    var lookaheadValidationErrors = (0, checks.validateLookahead)({
                        lookaheadStrategy: _this.lookaheadStrategy,
                        rules: (0, values_1$1.default)(_this.gastProductionsCache),
                        tokenTypes: (0, values_1$1.default)(_this.tokensMap),
                        grammarName: className
                    });
                    _this.definitionErrors = _this.definitionErrors.concat(validationErrors, lookaheadValidationErrors);
                }
            });
            // this analysis may fail if the grammar is not perfectly valid
            if ((0, isEmpty_1$1.default)(_this.definitionErrors)) {
                // The results of these computations are not needed unless error recovery is enabled.
                if (_this.recoveryEnabled) {
                    _this.TRACE_INIT("computeAllProdsFollows", function () {
                        var allFollows = (0, follow.computeAllProdsFollows)((0, values_1$1.default)(_this.gastProductionsCache));
                        _this.resyncFollows = allFollows;
                    });
                }
                _this.TRACE_INIT("ComputeLookaheadFunctions", function () {
                    var _a, _b;
                    (_b = (_a = _this.lookaheadStrategy).initialize) === null || _b === void 0 ? void 0 : _b.call(_a, {
                        rules: (0, values_1$1.default)(_this.gastProductionsCache)
                    });
                    _this.preComputeLookaheadFunctions((0, values_1$1.default)(_this.gastProductionsCache));
                });
            }
            if (!Parser.DEFER_DEFINITION_ERRORS_HANDLING &&
                !(0, isEmpty_1$1.default)(_this.definitionErrors)) {
                defErrorsMsgs = (0, map_1$1.default)(_this.definitionErrors, function (defError) { return defError.message; });
                throw new Error("Parser Definition Errors detected:\n ".concat(defErrorsMsgs.join("\n-------------------------------\n")));
            }
        });
    };
    // Set this flag to true if you don't want the Parser to throw error when problems in it's definition are detected.
    // (normally during the parser's constructor).
    // This is a design time flag, it will not affect the runtime error handling of the parser, just design time errors,
    // for example: duplicate rule names, referencing an unresolved subrule, ect...
    // This flag should not be enabled during normal usage, it is used in special situations, for example when
    // needing to display the parser definition errors in some GUI(online playground).
    Parser.DEFER_DEFINITION_ERRORS_HANDLING = false;
    return Parser;
}());
exports.Parser = Parser;
(0, apply_mixins.applyMixins)(Parser, [
    recoverable.Recoverable,
    looksahead.LooksAhead,
    tree_builder.TreeBuilder,
    lexer_adapter.LexerAdapter,
    recognizer_engine.RecognizerEngine,
    recognizer_api.RecognizerApi,
    error_handler.ErrorHandler,
    context_assist.ContentAssist,
    gast_recorder.GastRecorder,
    perf_tracer.PerformanceTracer
]);
var CstParser = /** @class */ (function (_super) {
    __extends(CstParser, _super);
    function CstParser(tokenVocabulary, config) {
        if (config === void 0) { config = exports.DEFAULT_PARSER_CONFIG; }
        var configClone = (0, clone_1$1.default)(config);
        configClone.outputCst = true;
        return _super.call(this, tokenVocabulary, configClone) || this;
    }
    return CstParser;
}(Parser));
exports.CstParser = CstParser;
var EmbeddedActionsParser = /** @class */ (function (_super) {
    __extends(EmbeddedActionsParser, _super);
    function EmbeddedActionsParser(tokenVocabulary, config) {
        if (config === void 0) { config = exports.DEFAULT_PARSER_CONFIG; }
        var configClone = (0, clone_1$1.default)(config);
        configClone.outputCst = false;
        return _super.call(this, tokenVocabulary, configClone) || this;
    }
    return EmbeddedActionsParser;
}(Parser));
exports.EmbeddedActionsParser = EmbeddedActionsParser;

});

var model = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildModel = void 0;

var map_1$1 = __importDefault(map_1);
var flatten_1$1 = __importDefault(flatten_1);
var values_1$1 = __importDefault(values_1);
var some_1$1 = __importDefault(some_1);
var groupBy_1$1 = __importDefault(groupBy_1);
var assign_1$1 = __importDefault(assign_1);
function buildModel(productions) {
    var generator = new CstNodeDefinitionGenerator();
    var allRules = (0, values_1$1.default)(productions);
    return (0, map_1$1.default)(allRules, function (rule) { return generator.visitRule(rule); });
}
exports.buildModel = buildModel;
var CstNodeDefinitionGenerator = /** @class */ (function (_super) {
    __extends(CstNodeDefinitionGenerator, _super);
    function CstNodeDefinitionGenerator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CstNodeDefinitionGenerator.prototype.visitRule = function (node) {
        var rawElements = this.visitEach(node.definition);
        var grouped = (0, groupBy_1$1.default)(rawElements, function (el) { return el.propertyName; });
        var properties = (0, map_1$1.default)(grouped, function (group, propertyName) {
            var allNullable = !(0, some_1$1.default)(group, function (el) { return !el.canBeNull; });
            // In an alternation with a label a property name can have
            // multiple types.
            var propertyType = group[0].type;
            if (group.length > 1) {
                propertyType = (0, map_1$1.default)(group, function (g) { return g.type; });
            }
            return {
                name: propertyName,
                type: propertyType,
                optional: allNullable
            };
        });
        return {
            name: node.name,
            properties: properties
        };
    };
    CstNodeDefinitionGenerator.prototype.visitAlternative = function (node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    };
    CstNodeDefinitionGenerator.prototype.visitOption = function (node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    };
    CstNodeDefinitionGenerator.prototype.visitRepetition = function (node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    };
    CstNodeDefinitionGenerator.prototype.visitRepetitionMandatory = function (node) {
        return this.visitEach(node.definition);
    };
    CstNodeDefinitionGenerator.prototype.visitRepetitionMandatoryWithSeparator = function (node) {
        return this.visitEach(node.definition).concat({
            propertyName: node.separator.name,
            canBeNull: true,
            type: getType(node.separator)
        });
    };
    CstNodeDefinitionGenerator.prototype.visitRepetitionWithSeparator = function (node) {
        return this.visitEachAndOverrideWith(node.definition, {
            canBeNull: true
        }).concat({
            propertyName: node.separator.name,
            canBeNull: true,
            type: getType(node.separator)
        });
    };
    CstNodeDefinitionGenerator.prototype.visitAlternation = function (node) {
        return this.visitEachAndOverrideWith(node.definition, { canBeNull: true });
    };
    CstNodeDefinitionGenerator.prototype.visitTerminal = function (node) {
        return [
            {
                propertyName: node.label || node.terminalType.name,
                canBeNull: false,
                type: getType(node)
            }
        ];
    };
    CstNodeDefinitionGenerator.prototype.visitNonTerminal = function (node) {
        return [
            {
                propertyName: node.label || node.nonTerminalName,
                canBeNull: false,
                type: getType(node)
            }
        ];
    };
    CstNodeDefinitionGenerator.prototype.visitEachAndOverrideWith = function (definition, override) {
        return (0, map_1$1.default)(this.visitEach(definition), function (definition) { return (0, assign_1$1.default)({}, definition, override); });
    };
    CstNodeDefinitionGenerator.prototype.visitEach = function (definition) {
        var _this = this;
        return (0, flatten_1$1.default)((0, map_1$1.default)(definition, function (definition) { return _this.visit(definition); }));
    };
    return CstNodeDefinitionGenerator;
}(api$2.GAstVisitor));
function getType(production) {
    if (production instanceof api$2.NonTerminal) {
        return {
            kind: "rule",
            name: production.referencedRule.name
        };
    }
    return { kind: "token" };
}

});

/**
 * Casts `array` to a slice if it's needed.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {number} start The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the cast slice.
 */
function castSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return (!start && end >= length) ? array : _baseSlice(array, start, end);
}

var _castSlice = castSlice;

/** Used to compose unicode character classes. */
var rsAstralRange$1 = '\\ud800-\\udfff',
    rsComboMarksRange$1 = '\\u0300-\\u036f',
    reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f',
    rsComboSymbolsRange$1 = '\\u20d0-\\u20ff',
    rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1,
    rsVarRange$1 = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsZWJ$1 = '\\u200d';

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
var reHasUnicode = RegExp('[' + rsZWJ$1 + rsAstralRange$1  + rsComboRange$1 + rsVarRange$1 + ']');

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string) {
  return reHasUnicode.test(string);
}

var _hasUnicode = hasUnicode;

/**
 * Converts an ASCII `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function asciiToArray(string) {
  return string.split('');
}

var _asciiToArray = asciiToArray;

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff',
    rsComboMarksRange = '\\u0300-\\u036f',
    reComboHalfMarksRange = '\\ufe20-\\ufe2f',
    rsComboSymbolsRange = '\\u20d0-\\u20ff',
    rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange,
    rsVarRange = '\\ufe0e\\ufe0f';

/** Used to compose unicode capture groups. */
var rsAstral = '[' + rsAstralRange + ']',
    rsCombo = '[' + rsComboRange + ']',
    rsFitz = '\\ud83c[\\udffb-\\udfff]',
    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
    rsNonAstral = '[^' + rsAstralRange + ']',
    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
    rsZWJ = '\\u200d';

/** Used to compose unicode regexes. */
var reOptMod = rsModifier + '?',
    rsOptVar = '[' + rsVarRange + ']?',
    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
    rsSeq = rsOptVar + reOptMod + rsOptJoin,
    rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

/**
 * Converts a Unicode `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}

var _unicodeToArray = unicodeToArray;

/**
 * Converts `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function stringToArray(string) {
  return _hasUnicode(string)
    ? _unicodeToArray(string)
    : _asciiToArray(string);
}

var _stringToArray = stringToArray;

/**
 * Creates a function like `_.lowerFirst`.
 *
 * @private
 * @param {string} methodName The name of the `String` case method to use.
 * @returns {Function} Returns the new case function.
 */
function createCaseFirst(methodName) {
  return function(string) {
    string = toString_1(string);

    var strSymbols = _hasUnicode(string)
      ? _stringToArray(string)
      : undefined;

    var chr = strSymbols
      ? strSymbols[0]
      : string.charAt(0);

    var trailing = strSymbols
      ? _castSlice(strSymbols, 1).join('')
      : string.slice(1);

    return chr[methodName]() + trailing;
  };
}

var _createCaseFirst = createCaseFirst;

/**
 * Converts the first character of `string` to upper case.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.upperFirst('fred');
 * // => 'Fred'
 *
 * _.upperFirst('FRED');
 * // => 'FRED'
 */
var upperFirst = _createCaseFirst('toUpperCase');

var upperFirst_1 = upperFirst;

var generate = createCommonjsModule(function (module, exports) {
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genDts = void 0;
var flatten_1$1 = __importDefault(flatten_1);
var isArray_1$1 = __importDefault(isArray_1);
var map_1$1 = __importDefault(map_1);
var reduce_1$1 = __importDefault(reduce_1);
var uniq_1$1 = __importDefault(uniq_1);
var upperFirst_1$1 = __importDefault(upperFirst_1);
function genDts(model, options) {
    var contentParts = [];
    contentParts = contentParts.concat("import type { CstNode, ICstVisitor, IToken } from \"chevrotain\";");
    contentParts = contentParts.concat((0, flatten_1$1.default)((0, map_1$1.default)(model, function (node) { return genCstNodeTypes(node); })));
    if (options.includeVisitorInterface) {
        contentParts = contentParts.concat(genVisitor(options.visitorInterfaceName, model));
    }
    return contentParts.join("\n\n") + "\n";
}
exports.genDts = genDts;
function genCstNodeTypes(node) {
    var nodeCstInterface = genNodeInterface(node);
    var nodeChildrenInterface = genNodeChildrenType(node);
    return [nodeCstInterface, nodeChildrenInterface];
}
function genNodeInterface(node) {
    var nodeInterfaceName = getNodeInterfaceName(node.name);
    var childrenTypeName = getNodeChildrenTypeName(node.name);
    return "export interface ".concat(nodeInterfaceName, " extends CstNode {\n  name: \"").concat(node.name, "\";\n  children: ").concat(childrenTypeName, ";\n}");
}
function genNodeChildrenType(node) {
    var typeName = getNodeChildrenTypeName(node.name);
    return "export type ".concat(typeName, " = {\n  ").concat((0, map_1$1.default)(node.properties, function (property) { return genChildProperty(property); }).join("\n  "), "\n};");
}
function genChildProperty(prop) {
    var typeName = buildTypeString(prop.type);
    return "".concat(prop.name).concat(prop.optional ? "?" : "", ": ").concat(typeName, "[];");
}
function genVisitor(name, nodes) {
    return "export interface ".concat(name, "<IN, OUT> extends ICstVisitor<IN, OUT> {\n  ").concat((0, map_1$1.default)(nodes, function (node) { return genVisitorFunction(node); }).join("\n  "), "\n}");
}
function genVisitorFunction(node) {
    var childrenTypeName = getNodeChildrenTypeName(node.name);
    return "".concat(node.name, "(children: ").concat(childrenTypeName, ", param?: IN): OUT;");
}
function buildTypeString(type) {
    if ((0, isArray_1$1.default)(type)) {
        var typeNames = (0, uniq_1$1.default)((0, map_1$1.default)(type, function (t) { return getTypeString(t); }));
        var typeString = (0, reduce_1$1.default)(typeNames, function (sum, t) { return sum + " | " + t; });
        return "(" + typeString + ")";
    }
    else {
        return getTypeString(type);
    }
}
function getTypeString(type) {
    if (type.kind === "token") {
        return "IToken";
    }
    return getNodeInterfaceName(type.name);
}
function getNodeInterfaceName(ruleName) {
    return (0, upperFirst_1$1.default)(ruleName) + "CstNode";
}
function getNodeChildrenTypeName(ruleName) {
    return (0, upperFirst_1$1.default)(ruleName) + "CstChildren";
}

});

var api$1 = createCommonjsModule(function (module, exports) {
var __assign = (commonjsGlobal && commonjsGlobal.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCstDts = void 0;


var defaultOptions = {
    includeVisitorInterface: true,
    visitorInterfaceName: "ICstNodeVisitor"
};
function generateCstDts(productions, options) {
    var effectiveOptions = __assign(__assign({}, defaultOptions), options);
    var model$1 = (0, model.buildModel)(productions);
    return (0, generate.genDts)(model$1, effectiveOptions);
}
exports.generateCstDts = generateCstDts;

});

var render_public = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSyntaxDiagramsCode = void 0;

function createSyntaxDiagramsCode(grammar, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.resourceBase, resourceBase = _c === void 0 ? "https://unpkg.com/chevrotain@".concat(version.VERSION, "/diagrams/") : _c, _d = _b.css, css = _d === void 0 ? "https://unpkg.com/chevrotain@".concat(version.VERSION, "/diagrams/diagrams.css") : _d;
    var header = "\n<!-- This is a generated file -->\n<!DOCTYPE html>\n<meta charset=\"utf-8\">\n<style>\n  body {\n    background-color: hsl(30, 20%, 95%)\n  }\n</style>\n\n";
    var cssHtml = "\n<link rel='stylesheet' href='".concat(css, "'>\n");
    var scripts = "\n<script src='".concat(resourceBase, "vendor/railroad-diagrams.js'></script>\n<script src='").concat(resourceBase, "src/diagrams_builder.js'></script>\n<script src='").concat(resourceBase, "src/diagrams_behavior.js'></script>\n<script src='").concat(resourceBase, "src/main.js'></script>\n");
    var diagramsDiv = "\n<div id=\"diagrams\" align=\"center\"></div>    \n";
    var serializedGrammar = "\n<script>\n    window.serializedGrammar = ".concat(JSON.stringify(grammar, null, "  "), ";\n</script>\n");
    var initLogic = "\n<script>\n    var diagramsDiv = document.getElementById(\"diagrams\");\n    main.drawDiagramsFromSerializedGrammar(serializedGrammar, diagramsDiv);\n</script>\n";
    return (header + cssHtml + scripts + diagramsDiv + serializedGrammar + initLogic);
}
exports.createSyntaxDiagramsCode = createSyntaxDiagramsCode;

});

var api = createCommonjsModule(function (module, exports) {
/* istanbul ignore file - tricky to import some things from this module during testing */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.createSyntaxDiagramsCode = exports.clearCache = exports.generateCstDts = exports.GAstVisitor = exports.serializeProduction = exports.serializeGrammar = exports.Terminal = exports.Rule = exports.RepetitionWithSeparator = exports.RepetitionMandatoryWithSeparator = exports.RepetitionMandatory = exports.Repetition = exports.Option = exports.NonTerminal = exports.Alternative = exports.Alternation = exports.defaultLexerErrorProvider = exports.NoViableAltException = exports.NotAllInputParsedException = exports.MismatchedTokenException = exports.isRecognitionException = exports.EarlyExitException = exports.defaultParserErrorProvider = exports.LLkLookaheadStrategy = exports.getLookaheadPaths = exports.tokenName = exports.tokenMatcher = exports.tokenLabel = exports.EOF = exports.createTokenInstance = exports.createToken = exports.LexerDefinitionErrorType = exports.Lexer = exports.EMPTY_ALT = exports.ParserDefinitionErrorType = exports.EmbeddedActionsParser = exports.CstParser = exports.VERSION = void 0;
// semantic version

Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version.VERSION; } });

Object.defineProperty(exports, "CstParser", { enumerable: true, get: function () { return parser_1.CstParser; } });
Object.defineProperty(exports, "EmbeddedActionsParser", { enumerable: true, get: function () { return parser_1.EmbeddedActionsParser; } });
Object.defineProperty(exports, "ParserDefinitionErrorType", { enumerable: true, get: function () { return parser_1.ParserDefinitionErrorType; } });
Object.defineProperty(exports, "EMPTY_ALT", { enumerable: true, get: function () { return parser_1.EMPTY_ALT; } });

Object.defineProperty(exports, "Lexer", { enumerable: true, get: function () { return lexer_public_1.Lexer; } });
Object.defineProperty(exports, "LexerDefinitionErrorType", { enumerable: true, get: function () { return lexer_public_1.LexerDefinitionErrorType; } });
// Tokens utilities

Object.defineProperty(exports, "createToken", { enumerable: true, get: function () { return tokens_public.createToken; } });
Object.defineProperty(exports, "createTokenInstance", { enumerable: true, get: function () { return tokens_public.createTokenInstance; } });
Object.defineProperty(exports, "EOF", { enumerable: true, get: function () { return tokens_public.EOF; } });
Object.defineProperty(exports, "tokenLabel", { enumerable: true, get: function () { return tokens_public.tokenLabel; } });
Object.defineProperty(exports, "tokenMatcher", { enumerable: true, get: function () { return tokens_public.tokenMatcher; } });
Object.defineProperty(exports, "tokenName", { enumerable: true, get: function () { return tokens_public.tokenName; } });
// Lookahead

Object.defineProperty(exports, "getLookaheadPaths", { enumerable: true, get: function () { return lookahead.getLookaheadPaths; } });

Object.defineProperty(exports, "LLkLookaheadStrategy", { enumerable: true, get: function () { return llk_lookahead.LLkLookaheadStrategy; } });
// Other Utilities

Object.defineProperty(exports, "defaultParserErrorProvider", { enumerable: true, get: function () { return errors_public.defaultParserErrorProvider; } });

Object.defineProperty(exports, "EarlyExitException", { enumerable: true, get: function () { return exceptions_public.EarlyExitException; } });
Object.defineProperty(exports, "isRecognitionException", { enumerable: true, get: function () { return exceptions_public.isRecognitionException; } });
Object.defineProperty(exports, "MismatchedTokenException", { enumerable: true, get: function () { return exceptions_public.MismatchedTokenException; } });
Object.defineProperty(exports, "NotAllInputParsedException", { enumerable: true, get: function () { return exceptions_public.NotAllInputParsedException; } });
Object.defineProperty(exports, "NoViableAltException", { enumerable: true, get: function () { return exceptions_public.NoViableAltException; } });

Object.defineProperty(exports, "defaultLexerErrorProvider", { enumerable: true, get: function () { return lexer_errors_public.defaultLexerErrorProvider; } });
// grammar reflection API

Object.defineProperty(exports, "Alternation", { enumerable: true, get: function () { return api$2.Alternation; } });
Object.defineProperty(exports, "Alternative", { enumerable: true, get: function () { return api$2.Alternative; } });
Object.defineProperty(exports, "NonTerminal", { enumerable: true, get: function () { return api$2.NonTerminal; } });
Object.defineProperty(exports, "Option", { enumerable: true, get: function () { return api$2.Option; } });
Object.defineProperty(exports, "Repetition", { enumerable: true, get: function () { return api$2.Repetition; } });
Object.defineProperty(exports, "RepetitionMandatory", { enumerable: true, get: function () { return api$2.RepetitionMandatory; } });
Object.defineProperty(exports, "RepetitionMandatoryWithSeparator", { enumerable: true, get: function () { return api$2.RepetitionMandatoryWithSeparator; } });
Object.defineProperty(exports, "RepetitionWithSeparator", { enumerable: true, get: function () { return api$2.RepetitionWithSeparator; } });
Object.defineProperty(exports, "Rule", { enumerable: true, get: function () { return api$2.Rule; } });
Object.defineProperty(exports, "Terminal", { enumerable: true, get: function () { return api$2.Terminal; } });
// GAST Utilities
var gast_2 = api$2;
Object.defineProperty(exports, "serializeGrammar", { enumerable: true, get: function () { return gast_2.serializeGrammar; } });
Object.defineProperty(exports, "serializeProduction", { enumerable: true, get: function () { return gast_2.serializeProduction; } });
Object.defineProperty(exports, "GAstVisitor", { enumerable: true, get: function () { return gast_2.GAstVisitor; } });

Object.defineProperty(exports, "generateCstDts", { enumerable: true, get: function () { return api$1.generateCstDts; } });
/* istanbul ignore next */
function clearCache() {
    console.warn("The clearCache function was 'soft' removed from the Chevrotain API." +
        "\n\t It performs no action other than printing this message." +
        "\n\t Please avoid using it as it will be completely removed in the future");
}
exports.clearCache = clearCache;

Object.defineProperty(exports, "createSyntaxDiagramsCode", { enumerable: true, get: function () { return render_public.createSyntaxDiagramsCode; } });
var Parser = /** @class */ (function () {
    function Parser() {
        throw new Error("The Parser class has been deprecated, use CstParser or EmbeddedActionsParser instead.\t\n" +
            "See: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_7-0-0");
    }
    return Parser;
}());
exports.Parser = Parser;

});

var mod = /*@__PURE__*/getDefaultExportFromCjs(api);

mod.Alternation;
mod.Alternative;
const CstParser = mod.CstParser;
mod.EMPTY_ALT;
mod.EOF;
mod.EarlyExitException;
mod.EmbeddedActionsParser;
mod.GAstVisitor;
mod.LLkLookaheadStrategy;
const Lexer = mod.Lexer;
mod.LexerDefinitionErrorType;
mod.MismatchedTokenException;
mod.NoViableAltException;
mod.NonTerminal;
mod.NotAllInputParsedException;
mod.Option;
mod.Parser;
mod.ParserDefinitionErrorType;
mod.Repetition;
mod.RepetitionMandatory;
mod.RepetitionMandatoryWithSeparator;
mod.RepetitionWithSeparator;
mod.Rule;
mod.Terminal;
mod.VERSION;
mod.clearCache;
mod.createSyntaxDiagramsCode;
const createToken = mod.createToken;
mod.createTokenInstance;
mod.defaultLexerErrorProvider;
mod.defaultParserErrorProvider;
mod.generateCstDts;
mod.getLookaheadPaths;
mod.isRecognitionException;
mod.serializeGrammar;
mod.serializeProduction;
mod.tokenLabel;
mod.tokenMatcher;
mod.tokenName;

var ValueInt = createToken({
    name: "ValueInt",
    pattern: /-?\d+/
});
var ValueFloat = createToken({
    name: "ValueFloat",
    pattern: /-?\d+\.\d+/
});
var ValueString = createToken({
    name: "ValueString",
    pattern: /"[\w\s\.]*"/
});
var ValueTrue = createToken({
    name: "ValueTrue",
    pattern: /true/
});
var ValueFalse = createToken({
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
    return createToken(_extends({
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

/** { */ var LCurly = createToken({
    name: "LCurly",
    pattern: /\{/,
    label: "{"
});
/** } */ var RCurly = createToken({
    name: "RCurly",
    pattern: /\}/,
    label: "}"
});
/** ( */ var LBracket = createToken({
    name: "LBracket",
    pattern: /\(/,
    label: "("
});
/** ) */ var RBracket = createToken({
    name: "RBracket",
    pattern: /\)/,
    label: ")"
});
/** , */ var Comma = createToken({
    name: "Comma",
    pattern: /,/,
    label: ","
});
/** : */ var Colon = createToken({
    name: "Colon",
    pattern: /:/,
    label: ":"
});
/** = */ var Equal = createToken({
    name: "Equal",
    pattern: /=/,
    label: "="
});
/** ; */ var Semicolon = createToken({
    name: "Semicolon",
    pattern: /;/,
    label: ";"
});
/** . */ var Dot = createToken({
    name: "Dot",
    pattern: /\./,
    label: "."
});
var Add = createToken({
    name: "Add",
    pattern: /\+/,
    label: "+"
});
var Minus = createToken({
    name: "Minus",
    pattern: /\-/,
    label: "-"
});
var MultiEqual = createToken({
    name: "MultiEqual",
    pattern: /\*=/,
    label: "*="
});
var DivideEqual = createToken({
    name: "DivideEqual",
    pattern: /\/=/,
    label: "/="
});
var AddEqual = createToken({
    name: "AddEqual",
    pattern: /\+=/,
    label: "+="
});
var MinusEqual = createToken({
    name: "MinusEqual",
    pattern: /\-=/,
    label: "-="
});
var Mutiply = createToken({
    name: "Multiply",
    pattern: /\*/,
    label: "*"
});
var Divide = createToken({
    name: "Divide",
    pattern: /\//,
    label: "/"
});
var GreaterThan = createToken({
    name: "GreaterThan",
    pattern: /\>/,
    label: ">"
});
var LessThan = createToken({
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

var TypeInteger = createToken({
    name: "TypeInteger",
    pattern: /Integer/
});
var TypeString = createToken({
    name: "TypeString",
    pattern: /String/
});
var TypeFloat = createToken({
    name: "TypeFloat",
    pattern: /Float/
});
var TypeRange = createToken({
    name: "Range",
    pattern: /Range/
});
var tokenList$1 = [
    TypeInteger,
    TypeString,
    TypeFloat,
    TypeRange
];

var glsl_mat2 = createToken({
    name: "glsl_mat2",
    pattern: /mat2/
});
var glsl_mat3 = createToken({
    name: "glsl_mat3",
    pattern: /mat3/
});
var glsl_mat4 = createToken({
    name: "glsl_mat4",
    pattern: /mat4/
});
var glsl_vec2 = createToken({
    name: "glsl_vec2",
    pattern: /vec2/
});
var glsl_vec3 = createToken({
    name: "glsl_vec3",
    pattern: /vec3/
});
var glsl_vec4 = createToken({
    name: "glsl_vec4",
    pattern: /vec4/
});
var glsl_ivec2 = createToken({
    name: "glsl_ivec2",
    pattern: /ivec2/
});
var glsl_ivec3 = createToken({
    name: "glsl_ivec3",
    pattern: /ivec3/
});
var glsl_ivec4 = createToken({
    name: "glsl_ivec4",
    pattern: /ivec4/
});
var glsl_float = createToken({
    name: "glsl_float",
    pattern: /float/
});
var glsl_int = createToken({
    name: "glsl_int",
    pattern: /int/
});
var glsl_sampler2D = createToken({
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

var Identifier = createToken({
    name: "Identifier",
    pattern: /[a-zA-z]\w*/
});
var WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /(\s|\n)+/,
    group: Lexer.SKIPPED
});
var CommnetLine = createToken({
    name: "CommnetLine",
    pattern: /\/\/.*\n/,
    group: Lexer.SKIPPED
});
var CommentMultiLine = createToken({
    name: "CommentMultiLine",
    pattern: /\/\*.*?\*\//,
    group: Lexer.SKIPPED
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
        _this.lexer = new Lexer(allTokens);
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
}(CstParser);

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
