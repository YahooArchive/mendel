# Mendel tree inheritance

`mendel-treenherit` is a browserify transform that resolves module dependencies using file system variations. In most cases, it is better to use `mendel-browserify` or the Mendel command line tool to generate your bundles, but if you just need to generate a bundle for a particular variation, you can use `mendel-treenherit` alone with browserify to accomplish that.

You can find all about file system variations on the Mendel documentation, but here is quick recap as visual representation:

```
Bundle "base"                                          Bundle "new_add_format"
       ^                                                      ^
       |                resolution direction                  |
       |      ----------------------------------------->      |

src/                       experiments/new_ad_format/  resolved/new_ad_format/
├── controllers            ├── controllers             ├── controllers
│   ├── main.js            │   │                       │   ├── main.js
│   ├── settings.js        │   │                       │   ├── settings.js
│   └── sidebar.js -----> X│   └── sidebar.js ------------>└── sidebar.js **
├── main_bindle.js         │                           ├── main_bindle.js
├── vendor                 │                           ├── vendor
│   ├── calendar.js        │                           │   ├── calendar.js
│   ├── ember.js           │                           │   ├── ember.js
│   ├── jquery.js          │                           │   ├── jquery.js
│   └── react.js           │                           │   └── react.js
└── views                  └── views                   └── views
    ├── admin.js               │                           ├── admin.js
    ├── ads.js -------------> X└── ads.js ---------------->├── ads.js **
    ├── list-item.js                                       ├── list-item.js
    ├── list.js                                            ├── list.js
    ├── login.js                                           ├── login.js
    ├── new_item.js                                        ├── new_item.js
    └── sidebar_item.js                                    └── sidebar_item.js

** Files marked with ** in the "resolved" tree are used from
the "experiments/new_ad_format/" tree, all other files are used
from "src/" tree.

```

To generate `base_bundle.js`, you don't need any transforms, plain old browserify should work:

    browserify src/main_bundle.js --output build/base_bundle.js

In order to generate the new add format you can use `mendel-treenherit` as follows:

```bash
browserify src/main_bindle.js                                      \
        --output build/new_add_format_bundle.js                    \
        --transform [ mandel-treenherit                            \
                      --dirs [ experiments/new_ad_format/ src/ ]   \
                    ]                                              \
```

If you pass in multiple directories you can also do multiple variation inheritance. Take the following source tree:

[![multiple folder inheritance diagram](https://cdn.rawgit.com/yahoo/mendel/master/docs/Multiple-folder-inheritance-source-tree.svg)](../../docs/Multiple-folder-inheritance-source-tree.svg)

This is the resulting resolution:

[![multiple folder inheritance diagram](https://cdn.rawgit.com/yahoo/mendel/master/docs/Multiple-folder-inheritance-resolution.svg)](../../docs/Multiple-folder-inheritance-resolution.svg)



