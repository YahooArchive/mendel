## Manifest Validation - deterministic bundle

It is important for production environment that the same "parent file" can require different "dependencies" based on variations, but files that only exist on "base" should not have different source code because of changes on variations.

If this condition is not met, you might get the following error:

```
Error: Files with same variation (base) and id (body.js) should have the same SHA
```

If you get the above error, Mendel saves some files in a temp directory so you can use a diff tool to understand what happened with compiled versions that have different SHA-sum hash.

In order to understand potential fixes, lets see a quick 3 file application example:

```js
/*
$ tree
.
├── base
│   ├── body.js
│   └── square.js
└── variations
    └── blue_square
        └── square.js
*/

// base/body.js
var square = require('./square');
var body = document.querySelector('body');
body.apprendChild(square());

// base/square.js
module.exports = function() {
    var div = document.createElement('div');
    Object.assign(div.style, {backgroundColor: "red",  display: 'inline-block', width: '50px', height: '50px' });
    return div;
};

// variations/blue_square/square.js
module.exports = function() {
    var div = document.createElement('div');
    Object.assign(div.style, {backgroundColor: "blue",  display: 'inline-block', width: '50px', height: '50px' });
    return div;
};
```

In the example above, it is important that `base/body.js` has exactly the same compiled source code across all variations, since the actual source code only exists in `base` folder. There are some reasons during compilation we might find different versions of the same source file:

### Source inconsistency because of different "resolution"

If instead of creating `variations/blue_square/square.js` you create `variations/blue_square/square/index.js` you will create inconsistent "parent" string for the "base" variation of "body.js". The reason for that lays in absolute path resolution built-in Mendel:

```js
// relevant line in 'body.js'
var square = require('./square');

// when compiling base bundle './square' resolves to
// '/base/square.js'
// relativeToVariation('/base/square.js') -> 'square.js'
// compiled source code for 'base/body.js' while building base bundle:
var square = require('square.js');


// when compiling blue_square bundle './square' resolves to
// '/variations/square/index.js'
// relativeToVariation('/variations/square/index.js') -> 'square/index.js'
// compiled source code for 'base/body.js' while building blue_square bundle:
var square = require('square/index.js');
```

This causes `body.js` to have two different compiled versions. In order to avoid that, make sure your variations have exactly the same path and extension as the base variation for files that already exist or already "resolve" in the base bundle.

### Source inconsistency because of non-deterministic transforms

Some file transformations might be unsafe, and this problem can only be addressed outside of Mendel, on the transformation itself. For instance, lets assume the following, very naive, hypothetical Browserify transform:

```js
var options = {excludeExtensions: [".json"]};
module.exports = transformTools.makeStringTransform("timestampify", options,
function (content, transformOptions, done) {
    var newContent = content + '\n// Generated: ' + Date.now() + '\n';
    done(null, newContent);
});
```

Because `Date.now()` is different when parsing `base/body.js` the first time (for base) and the second time (for blue_square) variation, it will yield different sources for the "same file".

You could fix the potential transform problem with deterministic algorithms, in our naive example, this could be fixed by replacing `Date.now()` for git last commit date:

```js
var options = {excludeExtensions: [".json"]};
var consistentDate = HipoteticalGitLibrary.lastCommitTimestamp();
module.exports = transformTools.makeStringTransform("timestampify", options,
function (content, transformOptions, done) {
    var newContent = content + '\n// Build time: ' + consistentDate + '\n';
    done(null, newContent);
});
```

A number of transforms might make similar mistakes, take for instance [this UglifyJS2 old issue](https://github.com/mishoo/UglifyJS2/issues/229) where something similar happened.
