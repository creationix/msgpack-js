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

Since there is no way to encode `undefined` inside the msgpack spec, an extension point is
used for this purpose. Specifically, the `fixext 1` type is used with all values being 0
to indicate `undefined`. On the wire, it requires 3 bytes and should looks like this:

```
0xd4 | 0x00 | 0x00
```

Where `|` is byte separator.

# EXT / FIXEXT

Extensions are encoded/decoded to and from a simple 2-elements array tuple of the form
`[type, Buffer]`. Where `type` is the msgpack extension type identifier and `Buffer` is
the raw decoded value.

Special case for `fixext 1` since it will always be 1-byte long a simple `[type, value]`
is returned directly instead of wrapping it in node.js `Buffer`.

# VERSIONING

This package will follows `msgpack-js` version for the time being. The version string will
simply be appended with `v5`.

If and when this package diverges from the original, we can start our own versioning. Or
this module could just be merged into the original `msgpack-js` module.

 [0]: https://github.com/creationix/msgpack-js
 [1]: https://github.com/creationix/msgpack-js/blob/master/README.markdown

