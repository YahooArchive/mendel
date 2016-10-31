# Mendel configuration

The Mendel command line tool and most of Mendel's standalone packages are compatible with the same configuration. The configuration can be passed in 3 ways:

  1. A file named `.mendelrc` in the root of your project
  2. In a `mendel` property in the `package.json` for your project
  3. As a JavaScript `options` object, if you are using one of the standalone packages programmatically.

Most standalone packages support only a subset of the configuration, and Mendel CLI supports all of them. If `.mendelrc` is provided, `package.json` will be ignored, but if you use mendel programmatically and one of the files are also available `options` will take precedence and override params in the file configuration.

## Path configuration

## Variations and Variation Inheritance

## Bundle configuration

## Middleware configuration

## Enviroment based overrides

## Post process middleware plugin configuration
