var Stream = require('stream').Stream;

function Encoder(onData) {
  Stream.call(this);
  this.buffer = new Buffer(1024);
  this.offset = 0;
  if (onData) {
    this.on('data', onData);
  }
}
Encoder.prototype = {
  __proto__: Stream.prototype,
  constructor: Encoder,
  
  push: function (byte) {
    this.buffer[this.offset++] = byte;
    if (this.offset === 1024) {
      this.flush();
    }
  },
  chunk: function (chunk) {
    var length;
    // Handle string chunks
    if (typeof chunk === 'string') {
      length = Buffer.byteLength(chunk);
      if (length <= 1024) {
        if (length > 1024 - this.offset) {
          this.flush();
        }
        this.buffer.write(chunk, this.offset);
        this.offset += length;
        if (this.offset === 1024) {
          this.flush();
        }
        return;
      }
      this.chunk(new Buffer(chunk));
      return;
    }
    length = chunk.length;
    if (length <= 1024) {
      if (chunk.length > 1024 - this.offset) {
        this.flush();
      }
      chunk.copy(this.buffer, this.offset);
      this.offset += chunk.length;
      if (this.offset === 1024) {
        this.flush();
      }
      return;      
    }

    // Data is too big to fit, flush what we got already
    this.flush();
    this.emit('data', chunk);
  },

  flush: function () {
    if (this.offset) {
      this.emit('data', this.buffer.slice(0, this.offset));
      var b = this.buffer.slice(0, this.offset);
      this.buffer = new Buffer(1024);
      this.offset = 0;
    }
  },
  
  end: function () {
    this.flush();
    this.emit('end');
  },
  
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
    if (num < 0) {
      // TODO: Make sure this works for negative numbers too
      this.emit('error', new Error("INT64 not implemented for negative numbers!"));
      return;
    }
    var high = Math.floor(num / 0x100000000);
    var low = num - high * 0x100000000;
    this.INT32(high);
    this.INT32(low);
  },
  SINGLE: function (num) {
    // TODO: Implement
    // big-endian IEEE 754 single precision floating point number 
    // XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX
    this.emit('error', new Error("SINGLE not implemented!"));
  },
  DOUBLE: function (num) {
    // TODO: Implement
    // big-endian IEEE 754 double precision floating point number
    // XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX_XXXXXXXX
    this.emit('error', new Error("DOUBLE not implemented!"));
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
      this.emit('error', new Error("Number to large"));
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
    this.emit('error', new Error("Number to small"));
  },
  float: function (num) {
    // TODO: Detect when SINGLE is enough precision somehow
    this.push(0xcb);
    this.DOUBLE(num);
  },
  raw: function (buffer) {
    var length = buffer.length;
    // fix raw
    if (length < 0x20) {
      this.push(0xa0 | length);
      this.chunk(buffer);
      return;
    }
    // raw 16
    if (length < 0x10000) {
      this.push(0xda);
      this.INT16(length);
      this.chunk(buffer);
      return;
    }
    // raw 32
    if (length < 0x100000000) {
      this.push(0xdb);
      this.INT32(length);
      this.chunk(buffer);
      return;
    }
    this.emit('error', new Error("Raw buffer too long"));
  },
  array: function (val) {
    var length = val.length;
    if (length < 0x10) {
      // fix array
      this.push(0x90 | length);
    } else if (length < 0x10000) {
      // array 16
      this.push(0xdc);
      this.INT16(length);
    } else if (length < 0x100000000) {
      // array 32
      this.push(0xdd);
      this.INT32(length);
    } else {
      this.emit('error', new Error("Array too long"));
    }
    for (var i = 0; i < length; i++) {
      this.pack(val[i]);
    }
  },
  map: function (val) {
    var keys = Object.keys(val);
    var length = keys.length;
    if (length < 0x10) {
      // fix map
      this.push(0x80 | length);
    } else if (length < 0x10000) {
      // map 16
      this.push(0xde);
      this.INT16(length);
    } else if (length < 0x100000000) {
      // map 32
      this.push(0xdf);
      this.INT32(length);
    } else {
      this.emit('error', new Error("Map too long"));
    }
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      this.raw(key);
      this.pack(val[key]);
    }
  },
  pack: function (val) {
    // typeof is fastest way to check if it's a number.
    // http://jsperf.com/number-detection
    if (typeof val === 'number') {
      // Math.floor to test if it's an int
      // http://jsperf.com/integer-check
      if (Math.floor(val) === val) {
        this.integer(val);
        return;
      }
      this.float(val);
      return;
    }
    // nil
    if (val === null) {
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
    if (typeof val === 'string') {
      // Encode strings as buffers
      this.raw(val);
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
    this.emit('error', new Error("Unknown value: " + val));
  }
};

var fs = require('fs');
var out = fs.createWriteStream('my.db');
var json = fs.readFileSync('sample.json', 'utf8');
var mine = new Encoder();
mine.pipe(process.stdout);
//mine.pack(1);
//mine.pack(0);
//mine.pack(true);
//mine.pack([1,2,3]);
//mine.pack({Hello: "World"});
json.split("\n").forEach(function (line) {
  try {
    mine.pack(JSON.parse(line));
  } catch (err) {
  }
});
mine.end();

