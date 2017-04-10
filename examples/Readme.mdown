## Examples

All examples are small applications that you can go to it's root directory and run `npm install` to have it all setup.

For Mendel 1.x (`planout-example`), you can run:

    $ npm run build
    $ npm run development

For Mendel 2.x (`full-example`), you can run:

    $ npm run daemon
    $ npm run development

To start the server in development mode. In this mode every source maps are enabled and bundle compilation is done on demand. The first time you load the application is slow, but once you save a file, the full bundle, and all the bundle combinations, should have changes propagated almost immediately.

All examples also support running in production mode:

    $ npm run build
    $ npm run production

Notice that in production mode bundles will load super fast, even with combinations, but in order to see code changes you will need to stop the server, run the build step again and start the server again.
