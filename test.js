/*global Buffer*/

var assert = require('assert'),
    msgpack = require('./msgpack');

var tests = [
  true, false, null,
  0, 1, -1, 2, -2, 4, -4, 6, -6,
  0x10, -0x10, 0x20, -0x20, 0x40, -0x40,
  0x80, -0x80, 0x100, -0x100, 0x200, -0x100,
  0x1000, -0x1000, 0x10000, -0x10000
  // {"a" : 1, "b" : 2, "c" : [1, 2, 3]},
];

tests.forEach(function (o) {
  process.stdout.write("Testing " + JSON.stringify(o));
  var b = msgpack.pack(o);
  process.stdout.write(' \t.');
  var oo = msgpack.unpack(b);
  process.stdout.write('o');
  try {
    assert.deepEqual(oo, o);
    process.stdout.write('O\n');
  } catch (err) {
    process.stdout.write('X\n');
    console.dir([o, b, oo]);
  }
});
