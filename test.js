"use strict";
var bops = require('bops');
var test = require('tape');
var msgpack = require('./msgpack');
var util = require('util');

var tests = [
  true, false, null, undefined,
  0, 1, -1, 2, -2, 4, -4, 6, -6,
  0x10, -0x10, 0x20, -0x20, 0x40, -0x40,
  0x80, -0x80, 0x100, -0x100, 0x200, -0x100,
  0x1000, -0x1000, 0x10000, -0x10000,
  0x20000, -0x20000, 0x40000,-0x40000,
  10, 100, 1000, 10000, 100000, 1000000,
  -10, -100, -1000, -10000, -100000, -1000000,
  'hello', 'world', bops.from("Hello"), bops.from("World"),
  [1,2,3], [], {name: "Tim", age: 29}, {},
  {a: 1, b: 2, c: [1, 2, 3]},
];

test('codec works as expected', function(assert) {

  tests.forEach(function (input) {
    var packed = msgpack.encode(input);
    console.log(packed);
    var output = msgpack.decode(packed);
    if (bops.is(input)) {
      assert.true(bops.is(output));
      for (var i = 0, l = input.length; i < l; i++) {
        assert.equal(input[i], output[i]);
      }
      assert.equal(input.length, output.length);
    }
    else {
      assert.deepEqual(input, output);
    }
  });

  assert.end();

});
