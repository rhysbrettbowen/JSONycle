JSONycle = {};
//goog.provide('JSONycle');



/**
 * Parses a JSON string and returns the result. This throws an exception if
 * the string is an invalid JSON string.
 *
 * Note that this is very slow on large strings. If you trust the source of
 * the string then you should use unsafeParse instead.
 *
 * @param {*} s The JSON string to parse.
 * @param {Array|string=} c the cycles to parse.
 * @return {Object} The object generated from the JSON string.
 */
JSONycle.parse = function(s, c) {
  var o = String(s);
  var obj;
  /** @preserveTry */
  try {
    obj = /** @type {Object} */ (eval('(' + o + ')'));
    if(!c)
      return obj;
    if(typeof c == 'string')
      c = JSONycle.parse(c);
    for (var i = 0; i < c.length; c++) {
      var key = obj;
      var val = obj;
      for (var n = 0; (n+1) < c[i][0].length; n++) {
        key = key[c[i][0][n]];
      }
      for (var m = 0; m < c[i][1]; m++) {
        val = val[c[i][m]];
      }
      key[c[i][0][n]] = val;
    }
    return obj;
  } catch (ex) {
  }
  throw Error('Invalid JSON string: ' + o);
};


/**
 * Serializes an object or a value to a JSON string.
 *
 * @param {*} object The object to serialize.
 * @param {boolean=} opt_jsonCycles whether to return cycles as string.
 * @return {string} A JSON string representation of the input.
 */
JSONycle.stringify = function(object, opt_jsonCycles) {
  return new JSONycle.Serializer()
      .serialize(object, opt_jsonCycles);
};

/**
 * return index in array
 * 
 * @param {Array} arr array to search for item
 * @param {Object} obj item to search for
 * @return {number} index of item
 */
JSONycle.arrayIndex = function(arr, obj) {
  for(var i = 0; i < arr.length; i++)
  if(arr[i] === obj)
    return i;
  return -1;
};


/**
 * return the type of an object.
 * 
 * @param {*} value value to get type of
 * @return {string} the type
 */
JSONycle.type = function (value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {

      if (value instanceof Array) {
        return 'array';
      } else if (value instanceof Object) {
        return s;
      }
      var className = Object.prototype.toString.call(
          /** @type {Object} */ (value));
      if (className == '[object Window]') {
        return 'object';
      }
      if ((className == '[object Array]' ||
           typeof value.length == 'number' &&
           typeof value.splice != 'undefined' &&
           typeof value.propertyIsEnumerable != 'undefined' &&
           !value.propertyIsEnumerable('splice')

          )) {
        return 'array';
      }
      if ((className == '[object Function]' ||
          typeof value.call != 'undefined' &&
          typeof value.propertyIsEnumerable != 'undefined' &&
          !value.propertyIsEnumerable('call'))) {
        return 'function';
      }


    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    return 'object';
  }
  return s;
}


/**
 * Class that is used to serialize JSON objects to a string.
 * @constructor
 */
JSONycle.Serializer = function() {
};


/**
 * Serializes an object or a value to a JSON string.
 *
 * @param {*} object The object to serialize.
 * @param {boolean=} opt_jsonCycles whether to return cycles as string.
 * @return {string} A JSON string representation of the input.
 */
JSONycle.Serializer.prototype.serialize = function(object, opt_jsonCycles) {
  var sb = [];
  var trail = [];
  var cycles = [];
  var key = [];
  this.serialize_(object, sb, trail, cycles, key);
  if (opt_jsonCycles)
    cycles = JSONycle.stringify(cycles)[0];
  return [sb.join(''), cycles];
};


/**
 * Serializes a generic value to a JSON string
 * @private
 * @param {*} object The object to serialize.
 * @param {Array} sb Array used as a string builder.
 * @param {Array} trail the objects in the branch.
 * @param {Array} cycles an array of the found cycles.
 * @param {keys} keys the keys along the branch so far.
 * @throws Error if there are loops in the object graph.
 */
JSONycle.Serializer.prototype.serialize_ = function(object, sb, trail, cycles, keys) {
  trail.push(object);
  switch (typeof object) {
    case 'string':
      this.serializeString_((/** @type {string} */ object), sb);
      break;
    case 'number':
      this.serializeNumber_((/** @type {number} */ object), sb);
      break;
    case 'boolean':
      sb.push(object);
      break;
    case 'undefined':
      sb.push('null');
      break;
    case 'object':
      if (object == null) {
        sb.push('null');
        break;
      }
      if (JSONycle.type(object) === 'array') {
        this.serializeArray_((/** @type {!Array} */ object), sb, trail, cycles, keys);
        break;
      }
      this.serializeObject_((/** @type {Object} */ object), sb, trail, cycles, keys);
      break;
    case 'function':
      // Skip functions.
      break;
    default:
      throw Error('Unknown type: ' + typeof object);
  }
  trail.pop();
};


/**
 * Character mappings used internally for goog.string.quote
 * @private
 * @type {Object}
 */
JSONycle.Serializer.charToJsonCharCache_ = {
  '\"': '\\"',
  '\\': '\\\\',
  '/': '\\/',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',

  '\x0B': '\\u000b' // '\v' is not supported in JScript
};


/**
 * Regular expression used to match characters that need to be replaced.
 * The S60 browser has a bug where unicode characters are not matched by
 * regular expressions. The condition below detects such behaviour and
 * adjusts the regular expression accordingly.
 * @private
 * @type {RegExp}
 */
JSONycle.Serializer.charsToReplace_ = /\uffff/.test('\uffff') ?
    /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;


/**
 * Serializes a string to a JSON string
 * @private
 * @param {string} s The string to serialize.
 * @param {Array} sb Array used as a string builder.
 */
JSONycle.Serializer.prototype.serializeString_ = function(s, sb) {
  // The official JSON implementation does not work with international
  // characters.
  sb.push('"', s.replace(JSONycle.Serializer.charsToReplace_, function(c) {
    // caching the result improves performance by a factor 2-3
    if (c in JSONycle.Serializer.charToJsonCharCache_) {
      return JSONycle.Serializer.charToJsonCharCache_[c];
    }

    var cc = c.charCodeAt(0);
    var rv = '\\u';
    if (cc < 16) {
      rv += '000';
    } else if (cc < 256) {
      rv += '00';
    } else if (cc < 4096) { // \u1000
      rv += '0';
    }
    return JSONycle.Serializer.charToJsonCharCache_[c] = rv + cc.toString(16);
  }), '"');
};


/**
 * Serializes a number to a JSON string
 * @private
 * @param {number} n The number to serialize.
 * @param {Array} sb Array used as a string builder.
 */
JSONycle.Serializer.prototype.serializeNumber_ = function(n, sb) {
  sb.push(isFinite(n) && !isNaN(n) ? n : 'null');
};


/**
 * Serializes an array to a JSON string
 * @private
 * @param {Array} arr The array to serialize.
 * @param {Array} sb Array used as a string builder.
 * @param {Array} trail the objects in the branch.
 * @param {Array} cycles an array of the found cycles.
 * @param {keys} keys the keys along the branch so far.
 */
JSONycle.Serializer.prototype.serializeArray_ = function(arr, sb, trail, cycles, keys) {

  var l = arr.length;
  sb.push('[');
  var sep = '';
  for (var i = 0; i < l; i++) {
    sb.push(sep);
    var value = arr[i];
    keys.push(i);
    var ind = JSONycle.arrayIndex(trail, value);
    if(ind > -1) {
   	cycles.push([keys.slice(0), ind]);
   	sb.push('undefined');	
    }else
    	this.serialize_(
        this.replacer_ ? this.replacer_.call(arr, String(i), value) : value,
        sb, trail, cycles, keys);

    sep = ',';
    keys.pop();
  }
  sb.push(']');
};

/**
 * Serializes an object to a JSON string
 * @private
 * @param {Array} arr The array to serialize.
 * @param {Array} sb Array used as a string builder.
 * @param {Array} trail the objects in the branch.
 * @param {Array} cycles an array of the found cycles.
 * @param {keys} keys the keys along the branch so far.
 */
JSONycle.Serializer.prototype.serializeObject_ = function(obj, sb, trail, cycles, keys) {
  sb.push('{');
  var sep = '';
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key);
      var value = obj[key];
      // Skip functions.
      // TODO(ptucker) Should we return something for function properties?
      var ind = JSONycle.arrayIndex(trail, value);
      if(ind > -1) {
      	cycles.push([keys.slice(0), ind]);
      } else if (typeof value != 'function') {

        sb.push(sep);
        this.serializeString_(key, sb);
        sb.push(':');

        this.serialize_(
            this.replacer_ ? this.replacer_.call(obj, key, value) : value,
            sb, trail, cycles, keys);

        sep = ',';
      }
      keys.pop();
    }
  }
  sb.push('}');
};