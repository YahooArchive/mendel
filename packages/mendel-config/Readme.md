# Mendel Config

This is an internal package that helps Mendel normalize configuration defaults, on `.mendelrc` or on `package.json`. It is used by many Mendel packages to make sure all packages use the same defaults and same merging logic.

## API

```js
var configParser = require('mendel-config');

// passing no options will lookup `.mendelrc` or `package.json` in the current
// folder and parent folders recursively. If not found returns default config.
var config = configParser();

// passing `basedir` as string or as property will make mendel lookup
// `.mendelrc` or `package.json` in the target folder instead.
var config = configParser('./sub/folder/config');

// which is equivalent to:
var config = configParser({ basedir: './sub/folder/config' });

// programmatic config only
var config = configParser({
    config: false, // prevent looking for `.mendelrc` or `package.json`
    // any other valid config
});

// Lookup `.mendelrc` or `package.json` and override a few params
var config = configParser({
    // any valid config, except config:false
});
```

Configuration parsing happens in 3 steps:

#### 1. Merging by precedence:

Configuration precedence is, from order to strongest to weakest:

  1. Passing configuration as an JavaScript object
  2. Configuration on `.mendelrc` or `package.json`
  3. Mendel defaults

The only exception is `basedir`. `basedir` has different meanings depending on where you declare it:

  1. If `basedir` is passed programmatically it is meant as a configuration lookup folder
  2. If any of `.mendelrc` or `package.json` is found, basedir is forced to be the folder that contains the config file, even if you provide one as property of the configuration object.
  3. All other path entries that are not absolute will be relative to `basedir`

### 2. Merging by environment

Either `process.env.MENDEL_ENV` or `process.env.NODE_ENV` values can be used to configure overrides on `.mendelrc`.

### 3. Resolving relative paths

After parsing and merging all the configurations a number of path properties will be resolved relative to basedir or their "parent" configuration, for example `bundlesoutdir` is relative to `outdir` which is in place relative to `basedir`. Please refer to `.mendelrc` file configuration documentation to a full list.

### 4. Parsing bundles

In `.mendelrc` or `package.json` the bundles entry is an object, we will transform bundles into an array and lastly the following arrays will be flattened: `entries`, `require`, `external`, `exclude`, `ignore`.

Flattening is useful to use YAML references to manipulate the file lists. For example, the `logged_in_bundle` bellow will have all files from `vendor` and from `main`, since arrays are flattened:

```yml
bundles:

  vendor:
    require: &vendor_list
      - react
      - react-dom

  main:
    entries:
      - ./src/base/main.js
    require: &main_files # make utils available to logged_in_bundle
      - ./src/base/utils.js
    external: *vendor_list

  logged_in_bundle:
    entries:
      - ./src/base/logged_in.js
    external: # following arrays are flattened
      - *main_files
      - *vendor_list
```
