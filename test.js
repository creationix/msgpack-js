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
  10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000,
  10000000000, 100000000000, 1000000000000,
  -10, -100, -1000, -10000, -100000, -1000000, -10000000, -100000000,
  -1000000000, -10000000000, -100000000000, -1000000000000,
  1.1, 0.1, -0.02,
  'hello', 'world', bops.from("Hello"), bops.from("World"),
  [1,2,3], [], {name: "Tim", age: 29}, {},
  {a: 1, b: 2, c: [1, 2, 3]}
];

test('regression test #10', function (assert) {
  var input = new Buffer("grRzb3VyY2VfcGFja2V0X2hlYWRlcoOncGFja19pZIWndmVyc19ubwCpcGFja190eXBlAKNkZmgBo3BpZEGkcGNhdAStcGFja19zZXFfY3RybIKpc2VxX2ZsYWdzA6dzZXFfY250S6hwYWNrX2xlbs0BCbFwYWNrZXRfZGF0YV9maWVsZIKwYXBwbGljYXRpb25fZGF0YYKjc2lkBqZwYXJhbXOBo2hrNt4AP6liZWxhX21vZGUwp2Fwc192ZXIRqHBwc190aW1lzuUAACCrdGNfcmVjZWl2ZWQaq3RjX2V4ZWN1dGVkGqp0Y19lcnJfYWNrAKt0Y19lcnJfZXhlYwCodG1fdG90YWzMxqd0bV9zZW50zMaqdG1fZHJvcHBlZACrdG1fYnVmZmVyZWQArHNjaV90bV90b3RhbD6vc2NpX3RtX2FjY2VwdGVkPq5zY2lfdG1fZHJvcHBlZACtc2NpX3RtX2VuYWJsZR+qc2NpX3RtX3BpZEKtc3B3X2xpbmtfc3RhdAWuc3B3X3RpbWVfY29kZXPNBL6rc3B3X2RtYV9lcnIAqnNwd190eF9lcnIAqnNwd19yeF9lcnIAr2VkYWNfc2luZ2xlX2VycgCtZWRhY19lcnJfc3RhdACtZWRhY19lcnJfYWRkcgCqcGNtX3R4X2NudM0rrqpwY21fcnhfY250zSutq3BjbV9lcnJfY250AK1wY21fZXJyX2ZsYWdzAKpsZXVfdHhfY250zS9pqmxldV9yeF9jbnTNL2mrbGV1X2Vycl9jbnQArWxldV9lcnJfZmxhZ3MAqnJmbV90eF9jbnTNCeWqcmZtX3J4X2NudM0J4atyZm1fZXJyX2NudACtcmZtX2Vycl9mbGFncwCrb3JiaXRfdmFsaWQAq29yYml0X2ZsYWdzA65vcmJpdF9pbnRlcnZhbM0D6KljYWxjX3RpbWWSZ2utaGFsZl9vcmJpdF90MQCtaGFsZl9vcmJpdF90MgCsb2ZmX25hZGlyX3QxAKxvZmZfbmFkaXJfdDIArW9yYml0X3RpbWVfdGGCo3NlY85SFOVNpG1zZWPMtK1vcmJpdF90aW1lX3RigqNzZWPOUhTlTqRtc2VjzLStb3JiaXRfZGlzdF9oYcsAAAAAAAAAAK1vcmJpdF9kaXN0X2hiywAAAAAAAAAArW9yYml0X2Rpc3RfZGjLAAAAAAAAAACvb3JiaXRfcG9seW5vbV9hywAAAAAAAAAAr29yYml0X3BvbHlub21fYssAAAAAAAAAAKZ0Y19sb2eVhqR0aW1lqzA6MjA6MDEuNzUxp3RjX3N0YXQgqXRjX2xlbmd0aAKndGNfdHlwZcy6qnRjX3N1YnR5cGUZqXRjX3BhcmFtc84BAAAAhqR0aW1lpDA6MDCndGNfc3RhdACpdGNfbGVuZ3RoAKd0Y190eXBlAKp0Y19zdWJ0eXBlAKl0Y19wYXJhbXMAhqR0aW1lpDA6MDCndGNfc3RhdACpdGNfbGVuZ3RoAKd0Y190eXBlAKp0Y19zdWJ0eXBlAKl0Y19wYXJhbXMAhqR0aW1lpDA6MDCndGNfc3RhdACpdGNfbGVuZ3RoAKd0Y190eXBlAKp0Y19zdWJ0eXBlAKl0Y19wYXJhbXMAhqR0aW1lpDA6MDCndGNfc3RhdACpdGNfbGVuZ3RoAKd0Y190eXBlAKp0Y19zdWJ0eXBlAKl0Y19wYXJhbXMAp2hrX2NmZzWCpnNpZF9lblGrcnBfaW50ZXJ2YWzNAeCnaGtfY2ZnNoKmc2lkX2VuYatycF9pbnRlcnZhbM0B4Kdoa19jZmc3gqZzaWRfZW5wq3JwX2ludGVydmFszQHgp2hrX2NmZziCpnNpZF9lbsyAq3JwX2ludGVydmFsUKdoa19jZmc5gqZzaWRfZW7MkKtycF9pbnRlcnZhbFCoaGtfY2ZnMTCCpnNpZF9lbsyhq3JwX2ludGVydmFszQHgqGhrX2NmZzExgqZzaWRfZW7MsatycF9pbnRlcnZhbM0B4Khoa19jZmcxMoKmc2lkX2VuzMCrcnBfaW50ZXJ2YWzNAeCoaGtfY2ZnMTOCpnNpZF9lbszRq3JwX2ludGVydmFszQHgqGhrX2NmZzE0gqZzaWRfZW7M4atycF9pbnRlcnZhbFCoaGtfY2ZnMTWCpnNpZF9lbszwq3JwX2ludGVydmFszQHgsWRhdGFfZmllbGRfaGVhZGVyhqNzaGYAqHB1c192ZXJzAaxzZXJ2aWNlX3R5cGUDr3NlcnZpY2Vfc3VidHlwZRmnZGVzdF9pZACkc2NldKsxNjo1OjMzLDcxOA==", "base64");
  msgpack.decode(input);
  assert.end();
});

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

function Foo () {
  this.instance = true
}

Foo.prototype.blah = 324

Foo.prototype.doThing = function () {}

function jsonableFunction () {
  console.log("can be json'ed")
}

jsonableFunction.toJSON = function () { return this.toString() }

var jsonLikes = [
  {fun: function () {}, string: 'hello'},
  {toJSON: function () {
    return {object: true}
  }},
  new Date(0),
  /regexp/,
  new Foo(),
  {fun: jsonableFunction},
  jsonableFunction,
]

test('treats functions same as json', function (assert) {
  jsonLikes.forEach(function (input) {
    assert.deepEqual(
      msgpack.decode(msgpack.encode(input)),
      JSON.parse(JSON.stringify(input)),
      util.inspect(input)
    )
  })
  assert.end()
})

test('returns undefined for a function', function (assert) {
  function noop () {}
  assert.equal(msgpack.encode(noop), JSON.stringify(noop))
  assert.end()
})
