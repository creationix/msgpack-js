exports.encode = function (value) {
  var buffer = new Buffer(sizeof(value));
  encode(value, buffer, 0);
  return buffer;
}

exports.decode = decode;

// http://wiki.msgpack.org/display/MSGPACK/Format+specification
// I've extended the protocol to have two new types that were previously reserved.
//   buffer 16  11011000  0xd8
//   buffer 32  11011001  0xd9
// These work just like raw16 and raw32 except they are node buffers instead of strings.
//
// Also I've added a type for `undefined`
//   undefined  11000100  0xc4

function decode(buffer, offset) {
  var offset = 0;
  function map(length) {
    var value = {};
    for (var i = 0; i < length; i++) {
      var key = parse();
      value[key] = parse();
    }
    return value;
  }
  function buf(length) {
    var value = buffer.slice(offset, offset + length);
    offset += length;
    return value;
  }
  function raw(length) {
    var value = buffer.toString('utf8', offset, offset + length);
    offset += length;
    return value;
  }
  function array(length) {
    var value = new Array(length);
    for (var i = 0; i < length; i++) {
      value[i] = parse();
    }
    return value;
  }
  function parse() {
    var type = buffer[offset];
    var value, length;
    switch (type) {
    // nil
    case 0xc0:
      offset++;
      return null;
    // false
    case 0xc2:
      offset++;
      return false;
    // true
    case 0xc3:
      offset++;
      return true;
    // undefined
    case 0xc4:
      offset++;
      return undefined;
    // float      
    case 0xca:
      value = buffer.readFloatBE(offset + 1);
      offset += 5;
      return value;
    // double
    case 0xcb:
      value = buffer.readDoubleBE(offset + 1);
      offset += 9;
      return value;
    // uint8
    case 0xcc:
      value = buffer[offset + 1];
      offset += 2;
      return value;
    // uint 16
    case 0xcd:
      value = buffer.readUInt16BE(offset + 1);
      offset += 3;
      return value;
    // uint 32
    case 0xce:
      value = buffer.readUInt32BE(offset + 1);
      offset += 5;
      return value;
    // uint64
    case 0xcf:
      value = buffer.readUInt64BE(offset + 1);
      offset += 9;
      return value;
    // int 8
    case 0xd0:
      value = buffer.readInt8(offset + 1);
      offset += 2;
      return value;
    // int 16
    case 0xd1:
      value = buffer.readInt16BE(offset + 1);
      offset += 3;
      return value;
    // int 32
    case 0xd2:
      value = buffer.readInt32BE(offset + 1);
      offset += 5;
      return value;
    // int 64
    case 0xd3:
      value = buffer.readInt64BE(offset + 1);
      offset += 9;
      return value;
    // map 16
    case 0xde:
      length = buffer.readUInt16BE(offset + 1);
      offset += 3;
      return map(length);
    // map 32
    case 0xdf:
      length = buffer.readUInt32BE(offset + 1);
      offset += 5;
      return map(length);
    // array 16
    case 0xdc:
      length = buffer.readUInt16BE(offset + 1);
      offset += 3;
      return array(length);
    // array 32
    case 0xdd:
      length = buffer.readUInt32BE(offset + 1);
      offset += 5;
      return array(length);
    // buffer 16
    case 0xd8:
      length = buffer.readUInt16BE(offset + 1);
      offset += 3;
      return buf(length);
    // buffer 32
    case 0xd9:
      length = buffer.readUInt32BE(offset + 1);
      offset += 5;
      return buf(length);
    // raw 16
    case 0xda:
      length = buffer.readUInt16BE(offset + 1);
      offset += 3;
      return raw(length);
    // raw 32
    case 0xdb:
      length = buffer.readUInt32BE(offset + 1);
      offset += 5;
      return raw(length);
    }
    // FixRaw
    if ((type & 0xe0) === 0xa0) {
      length = type & 0x1f;
      offset++;
      return raw(length);
    }
    // FixMap
    if ((type & 0xf0) === 0x80) {
      length = type & 0x0f;
      offset++;
      return map(length);
    }
    // FixArray
    if ((type & 0xf0) === 0x90) {
      length = type & 0x0f;
      offset++;
      return array(length);
    }
    // Positive FixNum
    if ((type & 0x80) === 0x00) {
      offset++;
      return type;
    }
    // Negative Fixnum
    if ((type & 0xe0) === 0xe0) {
      value = buffer.readInt8(offset);
      offset++;
      return value;
    }
    throw new Error("Unknown type 0x" + type.toString(16));
  }
  var value = parse();
  if (offset !== buffer.length) throw new Error((buffer.length - offset) + " trailing bytes");
  return value;
}

function encode(value, buffer, offset) {
  var type = typeof value;

  // Strings Bytes
  if (type === "string") {
    var length = Buffer.byteLength(value);
    // fix raw
    if (length < 0x20) {
      buffer[offset] = length | 0xa0;
      buffer.write(value, offset + 1);
      return 1 + length;
    }
    // raw 16
    if (length < 0x10000) {
      buffer[offset] = 0xda;
      buffer.writeUInt16BE(length, offset + 1);
      buffer.write(value, offset + 3);
      return 3 + length;
    }
    // raw 32
    if (length < 0x100000000) {
      buffer[offset] = 0xdb;
      buffer.writeUInt32BE(length, offset + 1);
      buffer.write(value, offset + 5);
      return 5 + length;
    }
  }

  if (Buffer.isBuffer(value)) {
    var length = value.length;
    // buffer 16
    if (length < 0x10000) {
      buffer[offset] = 0xd8;
      buffer.writeUInt16BE(length, offset + 1);
      value.copy(buffer, offset + 3);
      return 3 + length;
    }
    // buffer 32
    if (length < 0x100000000) {
      buffer[offset] = 0xd9;
      buffer.writeUInt32BE(length, offset + 1);
      value.copy(buffer, offset + 5);
      return 5 + length;
    }
  }
  
  if (type === "number") {
    // Floating Point
    if ((value << 0) !== value) {
      buffer[offset] =  0xcb;
      buffer.writeDoubleBE(value, offset + 1);
      return 9;
    }

    // Integers
    if (value >=0) {
      // positive fixnum
      if (value < 0x80) {
        buffer[offset] = value;
        return 1;
      }
      // uint 8
      if (value < 0x100) {
        buffer[offset] = 0xcc;
        buffer[offset + 1] = value;
        return 2;
      }
      // uint 16
      if (value < 0x10000) {
        buffer[offset] = 0xcd;
        buffer.writeUInt16BE(value, offset + 1);
        return 3;
      }
      // uint 32
      if (value < 0x100000000) {
        buffer[offset] = 0xce;
        buffer.writeUInt32BE(value, offset + 1);
        return 5;
      }
      // uint 64
      if (value < 0x10000000000000000) {
        buffer[offset] = 0xcf;
        buffer.writeUInt64BE(value, offset + 1);
        return 9;
      }
      throw new Error("Number too big 0x" + value.toString(16));
    }
    // negative fixnum
    if (value >= -0x20) {
      buffer.writeInt8(value, offset);
      return 1;
    }
    // int 8
    if (value >= -0x80) {
      buffer[offset] = 0xd0;
      buffer.writeInt8(value, offset + 1);
      return 2;
    }
    // int 16
    if (value >= -0x8000) {
      buffer[offset] = 0xd1;
      buffer.writeInt16BE(value, offset + 1);
      return 3;
    }
    // int 32
    if (value >= -0x80000000) {
      buffer[offset] = 0xd2;
      buffer.writeInt32BE(value, offset + 1);
      return 5;
    }
    // int 64
    if (value >= -0x8000000000000000) {
      buffer[offset] = 0xd3;
      buffer.writeInt64BE(value, offset + 1);
      return 9;
    }
    throw new Error("Number too small -0x" + value.toString(16).substr(1));
  }
  
  // undefined
  if (type === "undefined") {
    buffer[offset] = 0xc4;
    return 1;
  }
  
  // null
  if (value === null) {
    buffer[offset] = 0xc0;
    return 1;
  }

  // Boolean
  if (type === "boolean") {
    buffer[offset] = value ? 0xc3 : 0xc2;
    return 1;
  }
  
  // Container Types
  if (type === "object") {
    var length, size = 0;
    var isArray = Array.isArray(value);

    if (isArray) {
      length = value.length;
    }
    else {
      var keys = Object.keys(value);
      length = keys.length;
    }

    var size;
    if (length < 0x10) {
      buffer[offset] = length | (isArray ? 0x90 : 0x80);
      size = 1;
    }
    else if (length < 0x10000) {
      buffer[offset] = isArray ? 0xdc : 0xde;
      buffer.writeUInt16BE(length, offset + 1);
      size = 3;
    }
    else if (length < 0x100000000) {
      buffer[offset] = isArray ? 0xdd : 0xdf;
      buffer.writeUInt32BE(length, offset + 1);
      size = 5;
    }

    if (isArray) {
      for (var i = 0; i < length; i++) {
        size += encode(value[i], buffer, offset + size);
      }
    }
    else {
      for (var i = 0; i < length; i++) {
        var key = keys[i];
        size += encode(key, buffer, offset + size);
        size += encode(value[key], buffer, offset + size);
      }
    }
    
    return size;
  }
  throw new Error("Unknown type " + type);
}

function sizeof(value) {
  var type = typeof value;

  // Raw Bytes
  if (type === "string") {
    var length = Buffer.byteLength(value);
    if (length < 0x20) {
      return 1 + length;
    }
    if (length < 0x10000) {
      return 3 + length;
    }
    if (length < 0x100000000) {
      return 5 + length;
    }
  }
  
  if (Buffer.isBuffer(value)) {
    var length = value.length;
    if (length < 0x10000) {
      return 3 + length;
    }
    if (length < 0x100000000) {
      return 5 + length;
    }
  }
  
  if (type === "number") {
    // Floating Point
    // double
    if (value << 0 !== value) return 9;

    // Integers
    if (value >=0) {
      // positive fixnum
      if (value < 0x80) return 1;
      // uint 8
      if (value < 0x100) return 2;
      // uint 16
      if (value < 0x10000) return 3;
      // uint 32
      if (value < 0x100000000) return 5;
      // uint 64
      if (value < 0x10000000000000000) return 9;
      throw new Error("Number too big 0x" + value.toString(16));
    }
    // negative fixnum
    if (value >= -0x20) return 1;
    // int 8
    if (value >= -0x80) return 2;
    // int 16
    if (value >= -0x8000) return 3;
    // int 32
    if (value >= -0x80000000) return 5;
    // int 64
    if (value >= -0x8000000000000000) return 9;
    throw new Error("Number too small -0x" + value.toString(16).substr(1));
  }
  
  // Boolean, null, undefined
  if (type === "boolean" || type === "undefined" || value === null) return 1;
  
  // Container Types
  if (type === "object") {
    var length, size = 0;
    if (Array.isArray(value)) {
      length = value.length;
      for (var i = 0; i < length; i++) {
        size += sizeof(value[i]);
      }
    }
    else {
      var keys = Object.keys(value);
      length = keys.length;
      for (var i = 0; i < length; i++) {
        var key = keys[i];
        size += sizeof(key) + sizeof(value[key]);
      }
    }
    if (length < 0x10) {
      return 1 + size;
    }
    if (length < 0x10000) {
      return 3 + size;
    }
    if (length < 0x100000000) {
      return 5 + size;
    }
    throw new Error("Array or object too long 0x" + length.toString(16));
  }
  throw new Error("Unknown type " + type);
}


