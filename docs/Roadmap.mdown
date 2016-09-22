## Mendel 2.0 Roadmap

The main goal for 2.0 is being able to deliver bundles compiled by more compilers, rollupjs being the main goal we want to achieve. This would enable Mendel to have smaller bundles. But Mendel has a lot more features than rollup has right now, experimentation/variation bundling and external/expose/splitting bundles.

We also want to change internally how bundles are compiled so we have build time reduction by not running transformations more than once.

#### Goals breakdown for 2.0 development

* Mendel Advocating / Documentation
    * Update Mendel documentation for
        * CLI use
        * .mendelrc capabilities
        * Cookbook recipe for “creating a variation”
        * Instalation guide


* Mendel 2.0 - Fix Mendel isomorphic requires (package.json:[browser/main])
    * Mendel server-side bundling needs to be removed from client bundle pipeline

* Mendel 2.0 - New manifest with client and server specific transforms
    * Should have:
        * Common transforms
        * Server transforms
        * Client transforms
    * Must support browserify transforms
    * **Will not** support browserify plugins
    * Might support Rollup (transform only) plugins
    * Might support WebPack (transform only) plugins

* Mendel 2.0 - Multicore support
    * Mendel execution time cut by the number of available processors
    * Ideally in both development and production bundling process

* Mendel 2.0 - Rollup like compilation for production
    * smaller bundles
    * external bundles
    * extract bundles


