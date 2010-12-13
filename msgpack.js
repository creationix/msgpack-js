/*global Buffer*/

function Packer(push) {
  this.push = push;
}
Packer.prototype = {
  constructor: Packer,
  INT8: function (num) {
    this.push((num >>> 0) & 0xff);
  },
  INT16: function (num) {
    this.push((num >>> 8) & 0xff);
    this.push((num >>> 0) & 0xff);
  },
  INT32: function (num) {
    this.push((num >>> 24) & 0xff);
    this.push((num >>> 16) & 0xff);
    this.push((num >>> 8) & 0xff);
    this.push((num >>> 0) & 0xff);
  },
  INT64: function (num) {
    // TODO: Implement this, it's tricky
    // Needs to accept unsigned up to 64 bits
    // and signed up to 63 bits + sign bit
    throw new Error("INT64 not implemented!");
  },
  SINGLE: function (num) {
    // TODO: Implement
    // big-endian IEEE 754 single precision floating point number 
    // XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX
    throw new Error("SINGLE not implemented!");
  },
  DOUBLE: function (num) {
    // TODO: Implement
    // big-endian IEEE 754 double precision floating point number
    // XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX
    throw new Error("DOUBLE not implemented!");
  },
  integer: function (num) {
    if (num >= 0) {
      // positive fixnum
      if (num < 0x80) {
        this.INT8(num);
        return;
      }
      // uint 8
      if (num < 0x100) {
        this.push(0xcc);
        this.INT8(num);
        return;
      }
      // uint 16
      if (num < 0x10000) {
        this.push(0xcd);
        this.INT16(num);
        return;
      }
      // uint 32
      if (num < 0x100000000) {
        this.push(0xce);
        this.INT32(num);
        return;
      }
      // uint 64
      if (num < 0x10000000000000000) {
        this.push(0xcf);
        this.INT64(num);
        return;
      }
      throw new Error("Number to large");
    }
    // negative fixnum
    if (num >= -0x20) {
      this.INT8(num);
      return;
    } 
    // int 8
    if (num >= -0x80) {
      this.push(0xd0);
      this.INT8(num);
      return;
    }
    // int 16
    if (num >= -0x8000) {
      this.push(0xd1);
      this.INT16(num);
      return;
    }
    // int 32
    if (num >= -0x80000000) {
      this.push(0xd2);
      this.INT32(num);
      return;
    }
    // int 64
    if (num >= -0x8000000000000000) {
      this.push(0xd3);
      this.INT64(num);
      return;
    }
    throw new Error("Number to small");
  },
  float: function (num) {
    // TODO: Detect when SINGLE is enough precision somehow
    this.push(0xcb);
    this.DOUBLE(num);
  },
  raw: function (buffer) {
    // fix raw
    if (buffer.length < 0x20) {
      this.push(0xa0 || buffer.length);
      this.push(buffer);
      return;
    }
    // raw 16
    if (buffer.length < 0x10000) {
      this.push(0xda);
      this.push(buffer);
      return;
    }
    // raw 32
    if (buffer.length < 0x100000000) {
      this.push(0xdb);
      this.push(buffer);
      return;
    }
    throw new Error("Raw buffer too long");
  },
  array: function (val) {
    if (val.length < 0x10) {
      // fix array
      this.push(0x90 | val.length);
    } else if (val.length < 0x10000) {
      // array 16
      this.push(0xdc);
      this.INT16(val.length);
    } else if (val.length < 0x100000000) {
      // array 32
      this.push(0xdd);
      this.INT32(val.length);
    } else {
      throw new Error("Array too long");
    }
    val.forEach(function (item) {
      this.pack(item);
    }, this);
  },
  map: function (val) {
    var keys = Object.keys(val);
    if (keys.length < 0x10) {
      // fix map
      this.push(0x80 | keys.length);
    } else if (keys.length < 0x10000) {
      // map 16
      this.push(0xde);
      this.INT16(keys.length);
    } else if (keys.length < 0x100000000) {
      // map 32
      this.push(0xdf);
      this.INT32(keys.length);
    } else {
      throw new Error("Map too long");
    }
    keys.forEach(function (key) {
      this.pack(key);
      this.pack(val[key]);
    }, this);
  },
  pack: function (val) {
    // nil
    if (val === null || val === undefined) {
      this.push(0xc0);
      return;
    }
    // true
    if (val === true) {
      this.push(0xc3);
      return;
    }
    // false
    if (val === false) {
      this.push(0xc2);
      return;
    }
    if (typeof val === 'number') {
      if (Math.floor(val) === val) {
        this.integer(val);
        return;
      }
      this.float(val);
      return;
    }
    if (typeof val === 'string') {
      // Encode strings as buffers
      this.raw(new Buffer(val));
      return;
    }
    if (typeof val === 'object') {
      if (val instanceof Buffer) {
        this.raw(val);
        return;
      }
      if (Array.isArray(val)) {
        this.array(val);
        return;
      }
      this.map(val);
      return;
    }
    console.dir(val);
    throw new Error("Unknown value");
  }
};

function Parser(emit) {
  this.emit = emit;
  this.left = 0;
  this.buffer = [];
  this.consume = null;
}
Parser.prototype = {
  constructor: Parser,
  push: function (byte) {
    // Accept buffers as batch bytes
    if (byte instanceof Buffer) {
      for (var i = 0, l = byte.length; i < l; i++) {
        this.push(byte[i]);
      }
      return;
    }
    // Hook to consume message bodies
    if (this.left > 0) {
      this.buffer.push(byte);
      this.left--;
      if (this.left === 0) {
        this[this.consume]();
        this.buffer.length = 0;
        this.consume = null;
      }
      return;
    }
    if (byte < 0x80) {
      // fixnum
      this.emit(byte);
      return;
    }
    if (byte >= 0xe0) {
      // negative fixnum
      this.emit(byte - 0x100);
      return;
    }
    if (byte >= 0xc0) {
      switch (byte) {
        case 0xc0: this.emit(null); return;
        case 0xc2: this.emit(false); return;
        case 0xc3: this.emit(true); return;
        case 0xca: this.consume = 'float'; this.left = 4; return;
        case 0xca: this.consume = 'double'; this.left = 8; return;
        case 0xcc: this.consume = 'uint8'; this.left = 1; return;
        case 0xcd: this.consume = 'uint16'; this.left = 2; return;
        case 0xce: this.consume = 'uint32'; this.left = 4; return;
        case 0xcf: this.consume = 'uint64'; this.left = 8; return;
        case 0xd0: this.consume = 'int8'; this.left = 1; return;
        case 0xd1: this.consume = 'int16'; this.left = 2; return;
        case 0xd2: this.consume = 'int32'; this.left = 4; return;
        case 0xd3: this.consume = 'int64'; this.left = 8; return;
        case 0xda: this.consume = 'raw16'; this.left = 2; return;
        case 0xdb: this.consume = 'raw32'; this.left = 4; return;
        case 0xdc: this.consume = 'array16'; this.left = 2; return;
        case 0xdd: this.consume = 'array32'; this.left = 4; return;
        case 0xde: this.consume = 'map16'; this.left = 2; return;
        case 0xdf: this.consume = 'map32'; this.left = 4; return;
      }
      throw new Error("Invalid variable code");
    }
    if (byte >= 0xa0) {
      // FixRaw
      throw new Error("Not Implemented");
      return;
    }
    if (byte >= 0x90) {
      // FixArray
      throw new Error("Not Implemented");
      return;
    }
    if (byte >= 0x80) {
      // FixMap
      throw new Error("Not Implemented");
      return;
    }
    throw new Error("Unknown sequence encountered");
  },
  uint8: function () {
    this.emit(this.buffer[0]);
  },
  uint16: function () {
    this.emit((this.buffer[0] << 8) +
              (this.buffer[1]));
  },
  uint32: function () {
    this.emit((this.buffer[0] << 24) +
              (this.buffer[1] << 16) +
              (this.buffer[2] << 8) +
              (this.buffer[3]));
  },
  int8: function () {
    this.emit(this.buffer[0] - 0x100);
  },
  int16: function () {
    this.emit((this.buffer[0] << 8) +
              (this.buffer[1]) - 0x10000);
  },
  int32: function () {
    console.log("\nint32");
    this.emit((this.buffer[0] << 24) +
              (this.buffer[1] << 16) +
              (this.buffer[2] << 8) +
              (this.buffer[3]));
  },


};

function encode(val) {
  var bytes = [];
  function accum(byte) {
    bytes.push(byte);
  }
  var packer = new Packer(accum);
  console.dir(packer);
  console.dir(packer.__proto__);
  packer.pack(val);
  return bytes;
}

module.exports = {
  Packer: Packer,
  Parser: Parser,
  pack: function (value) {
    var bytes = [];
    function accum(byte) {
      bytes.push(byte);
    }
    var packer = new Packer(accum);
    packer.pack(value);
    // TODO: roll in buffers somehow
    return new Buffer(bytes);
  },
  unpack: function (buffer) {
    var value;
    var parser = new Parser(function (result) {
      value = result;
    });
    parser.push(buffer);
    return value;
  }
};
