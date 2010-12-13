/*global Buffer*/
var assert = require('assert');
var msgpack = require('./msgpack');

var o = {"a" : 1, "b" : 2, "c" : [1, 2, 3]};
console.dir(o);
var b = msgpack.pack(o);
console.dir(new Buffer(JSON.stringify(b)));
console.dir(b);
var oo = msgpack.unpack(b, 'utf8');

assert.deepEqual(oo, o);

