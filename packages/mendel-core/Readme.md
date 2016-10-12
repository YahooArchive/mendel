# Mendel Core - Production resolution of file system based experiments

Mendel Core is the brains behind `mendel-middleware`. It is used to resolve hundreds or even thousands of potential permutations of "application trees". It uses deterministic hashing to provide a two step resolving:

  1. Given a variation array, it resolves which files should be used for a given user session. It outputs an "application tree" and a deterministic hash.
  2. Given a hash generated in step 1, it can recover all file dependencies for the same user session, resulting in the same exact "application tree" as step 1.

Mendel Core works by loading [Mendel Manifests](../../docs/Design.mdown) on a per-process basis, and resolving each files should be used on a per request (or per user session) basis.

```
+-----------------------------------------------+
|                                               |
|  MendelTrees long running                     |
|  instance                                     |
|                                               |
|          (contains all variations of          |
|            all pre-compiled files)            |
|                                               |
+----+--------------+------------+----------+---+
     |              |            |          |
     v              v            v          |
                                            |
+-----------+ +-----------+ +-----------+   v
| Tree for  | | Tree for  | | Tree for  |
| variations| | variations| | variations|  etc
| A         | | B, C      | | A, C      |
+-----------+ +-----------+ +-----------+
```

Each tree representation can be used to server-side render, to hash generation or to resolve a bundle for a particular set of variations.

## Request Cycle: Variation resolution

When the user first visits the application, you use a variation array to resolve the application code:

```
                         +--------------------+
                         |                    |
                         |  Mendel Manifests  |
                         |                    |
                         +---------+----------+
                                   |
                                   v

                      +---------------------------+
                      |                           |
                      |  MendelTrees per process  |
                      |          instance         |
                      |                           |
                      +------------------+--------+
                                         |
                            ^            |
NodeJS Process              |            |
+------------------------------------------------------------------+
HTTP Request                |            |
   +------------+           |            |              +--------------+
   |            |           |            |              |              |
   | variations +-----------+            +------------> | dependencies |
   |            |                        |              |              |
   +------------+                        |              +--------------+
                                         |
                                         |              +--------------+
                                         |              |              |
                                         +------------> | hash         |
                                                        |              |
                                                        +--------------+
```

Dependencies can than be used to server-side render, and hash can be used to generate bundle URLs that are safe for CDN caching.


## Request Cycle: Hash resolution

When a request comes in with a hash, Mendel is able to safely recover all the dependencies:

```
                         +--------------------+
                         |                    |
                         |  Mendel Manifests  |
                         |                    |
                         +---------+----------+
                                   |
                                   v
NodeJS Process
                      +---------------------------+
                      |                           |
                      |  MendelTrees per process  |
                      |          instance         |
                      |                           |
                      +---------------------------+

                            ^            +
NodeJS Process              |            |
+------------------------------------------------------------------+
HTTP Request                |            |
   +------------+           |            |              +--------------+
   |            |           |            |              |              |
   | hash       +-----------+            +------------> | dependencies |
   |            |                                       |              |
   +------------+                                       +--------------+
```

This request will usually be used to serve a bundle. The request can come from a user or from a CDN or any other proxy/caching layers. It does not need cookies and won't need a "Vary" header to prevent it to be corrupted by proxies. The hash is sufficient to consistently resolve the dependencies.


#### Mendel Hashing algorithm

The Mendel hash is a binary format encoded in URLSafeBase64 (RFC4648 section 5). The binary has the format below, where each number in parenthesis is the number of bytes used for a particular information:

```
      1           2           3           4          5          6
+------------+---------+--------------+---------+----------+---------+
| ascii(6*8) | uint(8) | loop uint(8) | uint(8) | uint(16) | bin(20) |
| === mendel |         | !== 255      | == 255  |          |         |
+------------+---------+--------------+---------+----------+---------+
```

The 6 pieces stand for:

1. ID: The string “mendel” (lowercase) in ascii encoding
2. VERSION: The version of this binary, right now it is version 1, we reserved this for future compatibility
3. VARIATIONS_ARRAY: 0+ segments of 8 bit unsigned integers, that are different than 255
4. VARIATIONS_LIMITER: Integer with value 255 that marks end of file variations
5. FILE_COUNT: The number of total files that were hashed during tree walking
6. CONTENT_HASH: 20 byte sha1 binary

Mendel starts with ID and VERSION and will walk the manifest, starting in the entry points of the package. Each "dep" is a browserify-like payload and has a sha1 of the source code, and also the dependencies of this file. Mendel will collect sha1 of all files and count how many files were walked.

Every time Mendel finds a file with variations, it uses a one of two desired method for choosing a variation (discussed below), and it will then push **the index of the chosen variation** to the **variation index array**. The numbers are also appended to VARIATIONS_ARRAY of the binary.

Once walking is done, Mendel adds VARIATIONS_LIMITER, to the binary, adds FILE_COUNT with the number of files walked, and computes CONTENT_HASH, the sha1 of all walked sha1 of the bundle. The final binary is than encoded with URLSafeBase64.

The variations can be resolved in two ways: By an array of desired **variation names**. This is useful for generating the hash for the first time. The second way, is when we decode a hash binary, and walk the manifest to collect and bundle source code, using the **variation index array**.

Because we need to make sure the contents are the same requested by user, the hash is calculated both when generating it for the first time (when generating HTML request) and when collecting the source code payload (when dynamically serving the bundle). If it is a match, the source code can be concatenated using `browser_pack`.


## Reference Usage

Usually, you can use the `mendel-middleware` instead of using `mendel-core` directly. We also provide a [reference implementation](../../examples/full-example/) for the middleware use. In case you need advanced use of Mendel, the minimal server bellow should be enough for you to start your custom implementation.

```js
const MendelTrees = require('mendel-core');

const trees = MendelTrees(); // if no options passed, will read .mendelrc

function requestHandler(request, response) {
    // bundle should match .mendelrc bundle and can be multiple bundles
    const bundle = 'main';

    if (/index.html/.test(request.url)) {
        // variations can come from request cookie
        const variations = ['base'];
        // if you have multiple bundles you need to find one tree per bundle
        const tree = trees.findTreeForVariations(bundle, variations);
        // bundle url can be wrapped in a cookie-less CDN url
        const src = '/' + bundle + '.' + tree.hash + '.js';
        const script = '<script src="'+ src + '"></script>';
        response.end('<html><head>'+ script + '</head></html>');
    } else {
        // if you have multiple bundles you will need routes based on bundle
        const jsPath = new RegExp('/' + bundle + '\.(.*)\.js');
        if (jsPath.test(request.url)) {
            // your CDN can safely cache this url without cookies
            // and without "Vary" header
            const hash = request.url.match(jsPath)[1];
            const tree = trees.findTreeForHash(bundle, hash);
            response.end(JSON.stringify(tree)); // use your bundler
        } else {
            response.end('Not found');
        }
    }
}

const http = require('http');
const server = http.createServer(requestHandler);

server.listen(3000);
```

Usually, you won't be serving a JSON representation for your bundle, you will instead add error control, conflict detection and etc and eventually pack your bundle using UMD, browser-pack, rollup or even just concatenating all sources on global scope. Here is a minimal example of using browser pack:

```js
// on the example above, add this line at the top of the file

const bpack = require('browser-pack');

// and replace the line `response.end(JSON.stringify(tree));` by:

if (!tree || tree.error || tree.conflicts) {
    return response.end('Error ' + tree && tree.error || tree.conflictList);
}

const pack = bpack({raw: true, hasExports: true});
pack.pipe(response);

const modules = tree.deps.filter(Boolean);
for (var i = 0; i < modules.length; i++) {
    pack.write(modules[i]);
}
pack.end();
```

Please, see `mendel-middlware` for a production ready implementation of mendel-core with an express compatible API.

Please, see `mendel-development-middleware` for a viable implementation of development bundles without using `mendel-core` and with cached re-bundling based on source file changes.
