# mendel-generator-prune

This generator removes dangling files, such as files required initially and later not used because of some transformation (examples would be `requires` removed after `envify` and some CSS-in-JS dependency. It also assigns `NORMALIZED_ID` to files exposed in other bundles. `NORMALIZED_ID` is the relative path to either base or any variation.

## Example
Assume that we have 2 bundles. First bundle(the main bundle) has 3 files

```
"foo.js":"1",
"bar".js":"2",
"foobar".js":"NORMALIZED_ID",
```

There is a second bundle(lazy) which has its own files as well as files from main bundle as dependencies.

```
"deps": {
    "dep1.js":"1",
    "dep2.js":"2",
    "foobar".js":"NORMALIZED_ID"
}
```

Now, even if you update other files in `main` bundle and recreate this bundle, lazy bundle will always refer to `foobar.js` by it's NORMALIZED_ID.
