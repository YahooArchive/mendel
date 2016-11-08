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
# Mendel v2

build-dir: ./build

# Base/default variation configuration
base-config:
  id: base
  dir: ./src/master

variation-config:
  variation-dirs:
    - ./src/environments
    - ./src/settings
    - ./src/experiments
    - ./src/themes
  # dir names should be unique across all roots or mendel throws
  variations:
    # id of variation
    button_color:
      # name of the folder
      - blue_button

route-config:
  variation: /d/mendel/:variations/:bundle
  hash: /d/mendel/:hash/:bundle

transforms: # a list of all available transforms for all envs and types
  babelify-dev:
    plugin: mendel-babelify
    options:
      plugins:
        -
          - react-intl
          - messagesDir: ./tmp/strings/
            enforceDescriptions: true
  babelify-prod:
    plugin: mendel-babelify
    options:
      plugins:
        - react-intl-remove-description
        - transform-react-remove-prop-types
        -
          - react-intl
          - messagesDir: ./tmp/strings/
            enforceDescriptions: true
  custom-transform:
    plugin: ./transforms/custom.js
  envify-dev:
    options:
      NODE_ENV: development
  envify-prod:
    options:
      NODE_ENV: production
  minify:
    plugin: mendel-uglify-js
  coverage:
    plugin: mendel-istanbul
  post-css:
    plugin: mendel-post-css
    options:
      foo: bar # auto-prefixex, rtl-css

types:
  css:
    transforms:
      - post-css
    outlet:
      plugin: mendel-css-pack
  javascript:
    outlet:
      plugin: mendel-bundle-browser-pack
    transforms:
      - envify-dev
      - babelify-dev
    extensions:
      - .js
      - .json
      - .jsx
  node_modules:
    transforms:
      - envify-dev

env:
  production:
    types:
      javascript:
        outlet:
          plugin: mendel-bundle-rollup
        transforms:
          - envify-prod
          - babelify-dev
          - minify
        node_modules:
          - envify-prod
          - minify
  unit-test:
    types:
      javascript:
        transforms:
          - envify-dev
          - babelify-dev
          - coverage

# Order is relevant. E.g.,
# if extract-bundles comes first, we can generate lazy bundle specific css
# if css comes first, css file includes rules from files on lazy bundles
# if node-modules is last, we can use lazy-bundle as optional input (see below)
generators: # AKA graph transforms - or graph operations
  - id: extract-bundles
    plugin: mendel-extract-bundles
  - id: node-modules-generator
    plugin: mendel-extract-node-modules

# "outfile" is optional and only needed for single layer generation
bundles:
  main:
    outfile: app.js
    entries:
      - /apps/main
  lazy-group-1:
    outfile: lazy1.js
    generator: extract-bundles
    extract-from: main
    extract-entries:
      - /apps/lazy
  deps:
    outfile: vendor.js
    generator: node-modules-generator
    all-bundles: true # expects only 1 bundle to apply this generator, or throws
                      # look for node_modules in every other bundle
    # alternative configuration
    # if the array don't contain lazy, the node_modules only used on lazy would
    # be kept on lazy_bundle
    # bundles:
    #   - mail_app
    #   - compose_app
  css:
    outfile: app.css
    generator: atomic-css-generator
    entries:
      - /apps/main
```

```yml
# Mendel v1
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
