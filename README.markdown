# MSGPACK-JS-V5

**Please see the [original README.md][1] from the source repository for more
information.**

This is a port of [creationix/msgpack-js][0] to support the new MsgPack v5
specification.

* New spec: https://github.com/msgpack/msgpack/blob/master/spec.md
* Old spec: https://github.com/msgpack/msgpack/blob/master/spec-old.md

Please feel free to open issues/pull requests for support/discussion.

# INSTALL

```sh
$ npm i msgpack-js-v5 --save
```

# EXTENSION

Since there is no way to encode `undefined` inside the msgpack spec, an extension point i
used for this purpose.

Specifically, the `fixext 1` type is used with all values being 0 to indicate undefined.
On the wire, it requires 3 bytes and should looks like this:

```
0xd4 | 0x00 | 0x00
```

Where `|` is byte separator.

