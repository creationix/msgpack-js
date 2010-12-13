/*global Buffer*/

var assert = require('assert'),
    msgpack = require('./msgpack');

var tests = [
  true, false, null,
  0, 1, -1, 2, -2, 4, -4, 6, -6,
  0x10, -0x10, 0x20, -0x20, 0x40, -0x40,
  0x80, -0x80, 0x100, -0x100, 0x200, -0x100,
  0x1000, -0x1000, 0x10000, -0x10000,
  0x20000, -0x20000, 0x40000,-0x40000,
  10, 100, 1000, 10000, 100000, 1000000,
  -10, -100, -1000, -10000, -100000, -1000000,
  'hello', 'world',
  [1,2,3], [], {name: "Tim", age: 28}, {},
  // {"a" : 1, "b" : 2, "c" : [1, 2, 3]},
];
[0x100, 0x1000, 0x10000, 0x100000].forEach(function (length) {
  var list = new Array(length), obj = {};
  for (var i = 0; i < length; i++) {
    list[i] = i;
    obj[i] = i;
  }
  tests.push(list);
  tests.push(obj);
});

tests.forEach(function (o) {
  process.stdout.write("Testing " + JSON.stringify(o).substr(0, 10));
  var b = msgpack.pack(o);
  process.stdout.write(' \t.');
  var oo = msgpack.unpack(b, 'utf8');
  process.stdout.write('o');
  try {
    assert.deepEqual(oo, o);
    process.stdout.write('O\n');
  } catch (err) {
    process.stdout.write('X\n');
    console.dir([o, b, oo]);
  }
});
