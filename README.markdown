# msgpack for node

A handwritten msgpack encoder and decoder for Node.JS.

I've extended the format a little to allow for encoding and decoding of `undefined` and `Buffer` instances.

## Usage

    var msgpack = require('msgpack');
    var assert = require('assert');

    var initial = {Hello: "World"};
    var encoded = msgpack.encode(initial);
    var decoded = msgpack.decode(encoded);

    assert.deepEqual(initial, decoded);

