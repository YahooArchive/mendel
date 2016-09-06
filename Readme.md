# Mendel

Build tool chain for experimentation on isomorphic web applications with tree-inheritance and multivariate support.

## What does it mean? 🌈

Mendel is a small set of tools which enable "A/B testing" experiments within a web application, while not sacrificing front-end performance. The experiments can range from simple, one-line changes to large, complex variances across the application.

The main component of Mendel is a Browserify plugin that generates multiple JavaScript bundles, each bundle with variations that you want to test. You can use Mendel by itself, or with favorite build tools, such as NPM run scripts, Grunt, Gulp, etc.

Mendel also provides additional tools for:

  * Ability to combine multiple experiments: Often known as multilayer or multivariate testing, this enables large applications to perform simultaneous experiments that overlap (i.e. a given user can participate with multiple experiments and the same time, or a given experiment can contain interchangeable combinations).
  * Better development cycle: Fast feedback is essential in development. Once you save a file, Mendel makes use of Watchify internally to efficiently provide instant feedback
  * Isomorphic support: Most A/B test bundling tools are focused on client-side only, while Mendel solves the problem of server and client rendering, such as React and Ember ability to serve HTML for fast first paint while booting up into a Single Page Application quickly.

## Beta stages

Mendel is a new name for an experimentation design we have run at Yahoo for a long time in production. It was developed initially for mobile web experimentation and this new project is the Open Source implementation of a successful design we have run for years. But this repository is not complete yet. We will get to a 1.0 release soon, but these last steps will be done in the open. If you want to start using or trying out Mendel, we recommend you start with the "examples" directory. It is a sample application and there is a [small Readme file](examples/Readme.mdown) to get you started there.

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

If you have everything setup correctly, you now have two variations. The default code is usually called `base` and does not need to be declared. Mendel will then generate bundles for each of your variations.

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
