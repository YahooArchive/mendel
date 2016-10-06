# Mendel

Mendel is a framework for building and serving client side JavaScript bundles for A/B testing experiments in web applications.

It is meant to be simple and easy to use on a daily basis. It works very well for small applications and small teams, but also scale for complex use cases that large applications or larger teams might need.

##### Example scenario of application A/B testing

```
+-------------------------------------------------------------------------+
| Shopping cart application                                               |
+------------------------------+--------------------+---------------------+
| 90% of users                 | 5% of users        | 5% of users         |
+-------------------------------------------------------------------------+
| Base experience              | Experiment A       | Experiment B        |
+-------------------------------------------------------------------------+
| By default cart is a link    | Live shopping cart | Live shopping cart  |
| in the horizontal navigation | as a sidebar       | floating and docked |
| menu with counter for number |                    | to the bottom of    |
| of items                     |                    | the page            |
+------------------------------+--------------------+---------------------+
```

Mendel supports:

* JavaScript bundle generation (similar to Webpack/Browserify) for each variation/experiment/bucket
* Isomorphic applications (a.k.a. server side rendering, such as ReactDOMServer or Ember Fastboot)
* Multivariate testing and/or Multilayer experimentation
* Variation/experiment/bucket inheritance that enables code-reuse across different experiments.

Mendel does not support:

* Experiment resolution: Mendel does not provide [random assignment](https://en.wikipedia.org/wiki/Random_assignment) of users into experiments
* Experiments measurement: Mendel does not provide a way to track performance of experiments based on user actions

Both of the above are covered by existing open source tools, such as [Open Web Analytics](http://www.openwebanalytics.com), [Piwik](https://piwik.org) and [many others](https://www.google.com/#q=open+source+web+analytics).

## Advantages of using Mendel

Mendel is built on top of solid [design principles](docs/Design.mdown) and is hardened by years of using the same strategy inside Yahoo, from teams ranging from 3 to 30+ developers contributing daily to large applications. Here are a few of the advantages of using Mendel:

  * **Maintainability**: All variation/experimentation code is organized and compiled in a way to be immediately disposable, impose no maintenance overhead, and be very easy to debug and analyze.
  * **Performance**: Server side resolution is synchronous and fast, and client side code will have no payload overhead.
  * **Security**: Bundle URL and client-side compiled code does not contain variation/experiment information.

Mendel also have a clear development flow. All other experimentation we could find lack built in support for a smooth development workflow. In Mendel fast development cycle is a first-class citizen.

## How to use Mendel

Mendel uses files to create differences for each experiment you want to run for your users. With Mendel you don't create conditionals such as `if(myExperimentRunning) { /* do something different */ }`. You just copy the file you need to be slightly different and change your code.

For example, let's say your application has a `controllers` directory and a `views` directory, and for a given experiment you will change how display ads are rendered. You then create the following structure **in addition** to your application code.


```
bash> tree
...
├── experiments
│   └── new_ad_format
│       ├── controllers
│       │   └── sidebar.js
│       └── views
│           └── ads.js
...
```

Next, you add the experiment to your configuration. Each experiment is called a "variation" in Mendel, and each variation is a list of folders. Here is the newly added `new_ad_format` variation:

```yaml
variationsdir: experiments
variations:
  new_ad_on_sidebar: ## experiment id is inferred from this key
    - new_ad_format  ## directory name (if not same as id)
```

That's it, with two simple steps, you now have have an experiment ready to run. The default code is usually called `base` and does not need to be declared. Mendel will then generate bundles for each of your variations.

### File system resolution

To understand which files you need to create is very straightforward. Mendel just merges the directory tree in runtime. **The resulting tree is not written to disk**, but the following diagram explains how your files will be combined for a given experiment:

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

## Stability and Roadmap

The way mendel experiments are built is quite stable since mid 2014, and Mendel implementation just improves how it is compiled and add some features, like multi-layer. Mendel 1.x can be considered stable and is also used in production applications by Yahoo. We are also [building Mendel 2.x](docs/Roadmap.mdown), which experiment/variations creation will be exactly the same, production middleware API is also considered stable and only file configuration format and development middleware will be breaking changes in 2.0.


Since documentation is still short of ideal, we recommend you start with the "examples" directory. It is a sample application and there is a [small Readme file](examples/Readme.mdown) to get you started there.

## Why is is Mendel so different?

Mendel is the result of extensive research done by Yahoo on how to achieve not only the aforementioned performance goals, but also on how to effectively address development across large teams. We found that conditionals in the code base resulted in experiments which were hard to dispose of after they had run their course, which led to [technical debt](https://en.wikipedia.org/wiki/Technical_debt) and poor performance in our code bases.

The main goal for Mendel is to be sustainable. Sustainability comes from being able to test the experiments correctly, keeping experiments up-to-date with our "base/master/default" application code, and keeping front-end performance unchanged throughout experimentation and adoption of experiment results. There is a full [design document](docs/Design.mdown) available if you are curious about the details.

## Why is it called "Mendel"?

[George Mendel](https://en.wikipedia.org/wiki/Gregor_Mendel) is considered one of the pioneers in genetics. His famous experiments include identifying phenotypes such as seed shape, flower color, seed coat tint, pod shape, unripe pod color, flower location, and plant height on different breeds of pea plants. We find that in many ways, we are doing similar experiments with our software applications. We want to know what "application phenotypes" will be most fitting for the relationship between our products and our users, hence the homage to George Mendel.

### Developing Mendel and Contributions

Mendel is a monorepo. In order to develop for Mendel you will need to create a lot of `npm link`s. To make it easy, we created a small script. You can run `npm run linkall` to link all packages to your node installation and cross-link all Mendel packages that depend on each other. This will also run `npm install` in all places that you need to.

Mendel follows Browserify plugin pattern and NPM small packages style. Whitespace conventions are on `.editorconfig` file, please use [editor config plugin for your code editor](http://editorconfig.org).

We also have some [test documentation](docs/Tests.mdown) in case you want to make a pull request.

## License

Mendel is [MIT licensed](LICENSE).
