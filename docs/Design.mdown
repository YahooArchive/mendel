Mendel Design
=============

# Principles

Mendel has some opinionated design principles that serve as strict guidelines on the remainder of this document and on its implementation. Some of those principles are what makes Mendel different from other experimentation or A/B testing frameworks.

* **Variation Performance**
    * **No payload overhead**: no client-side code for any non-active or alternative variation should be transfered to the client
    * **Synchronous and fast variation resolution**: no http or file-system access during runtime in order to resolve bundle URLs or bundle payload.
* **Variation Maintainability**
    * **Immediately disposable**: disposing of variations should be simple, straightforward - specially for bulk disposal
    * **No maintenance overhead: **keep variations updated with minimal developer effort
    * **Mnemonic source-code**: only human-readable and meaningful variation names should be committed to the source-code repository
    * **Analyzable**: comparison between variations code is essential. Developers should be able to `diff` variations easily – without guesswork or source code parsers
* **Variation Security**
    * client-side compiled code should not contain variation information
    * client-side asset URI should not contain variation information

# Additional Goals

Those are not mission critical, but go into details of aforementioned principles and add some extra requirements that are also very valuable to be covered.

## Development Environment

When possible, development environment should be the same as production environment, but there are additional challenges and features that need to be supported on development.

Here are some highlights:

### Development time Mendel features

* Source Maps are required in development
    * Might be useful in production if we can have it be external and separate routes that can have extra security in case consumer don't want to be available for visiting users
* Fast code reload: once one file is saved, regardless of how many implemented variations there are in the project, one should be able to see changes in browser (including server-side rendered markup) in under a second
* Select/override which variation (as any other configuration) to be loaded in browser via many different methods, including (but not restricted to) query string, developer box local configuration and cookies
* "Development only variations": When creating a variation, a developer should not need access or try out his new code without resorting to external configuration systems

### Expected differences when inspecting code in production or development

* In development it should be easy and straightforward to spot variation code as opposed to __base variation__ (the code that exists in all variations)
* In production we should obscure variations as much as possible, for security and privacy reasons, but this should not happen in development

## Performance requirements

### Production Performance

Production performance is non-negotiable — we should not make trade-offs sacrificing production performance. Therefore, Mendel implementation should aim to have zero bytes added to client-side code when a variation is created. Any new code or code changes a variation contain should be only delivered to users on this variation and not to the __base variation__. Also we should not have latency increased for users on any variation and any performance optimizations, like SSR (server-side rendering).

Those are the important performance goals for client side:

* No byte size overhead
* No extra network requests when the user is on a variation

Those are the important goals for server-side:

* Close to zero milliseconds variation resolution time in production
    * no network or file system operations after application startup/warm up
    * any runtime configuration update should be done with background polling/fetching/push to not impact request time
* Server-side rendering should work correctly when switching variations
    * server needs to serve isomorphic code on a per-request basis

### Development Performance

Developer Productivity is also important for any team and is proportionally more important with team size — The more people, the greater saves for the company if we invest in build-time and other quality of life improvements for developers.

Here are some important goals for development cycle:

* Mendel should avoid slowing down development server startup time
    * It is OK to increase CI/CD timings, although it would be ideal to keep the same
* When saving a file, it is expected that the developer is able to see the changes within 300 milliseconds or less, be it client-side or server side changes.
    * Also, although a full automated refresh is not required, in case the developer reloads the page manually, server-side rendering must match and work as intended within this boundary
* Live-reload or hot-loading is desirable, as well as keeping application state if possible
* When using the Web-Inspector (browser tools) it is desirable to be able to tell apart code that is default from code that is on a given experiment

## Security

The main goal for security is to make sure a user is not able to understand the extent of experiments she is assigned to. Although hiding the variation completely is impossible, the user, or intentional bad actors on the network, should not be able to tell the differences apart from each variation and infer business goals from it. So avoiding conditionals and mnemonic IDs to be part of the source code will be the main goal for security.

Avoiding variation names on URLs will prevent sizable download of different bundles by scripts, so hashing will be used instead of variation names/numbers.

# Methodology

Mendel uses file system folders for variation resolution. The first part of this section is a preamble to why we reached this design, and the second part is dedicated to how the resolution should work.

## Conditional versus separate built packages

There are different cases in which code may differ from the __base variation__ or "default" experience:

* Experiments, also know as variations (ofter referred as "buckets" or A/B tests)
* Conditional features (configuration based "feature flipper")
* Partners customization (white labeling)

There are mainly two ways of creating this differences for such variations: Conditionals to be evaluated in runtime and code selection at build time.

**Conditional versus separate built packages flowchart**

```
                                           +------------------+
+----------+     +---------------+         |Production Package|
|          |     |               |         |                  |
| Codebase +---> | Build Process +-------> +------+    +------+
|          |     |               |         |Code A| OR |Code B|
+----------+     +---------------+         |      |    |      |
                                           +------+----+------+

                                           +-----------+
                                           |           |
                                     +---> | Package A |
+----------+     +---------------+   |     |           |
|          |     |               |   |     +-----------+
| Codebase +---> | Build Process +---+
|          |     |               |   |     +-----------+
+----------+     +---------------+   |     |           |
                                     +---> | Package B |
                                           |           |
                                           +-----------+
```


There is also two parts of Front-End responsibilities for an isomorphic project to serve features to users, the server-side and client-side portions. In React applications we have a lot of code that is isomorphic and will be used in both environments.

### Client-side Design

> Important note: This section is outdated. Mendel design was conceived before we decided to have manifests with each file as a module. We expected to have some sort of grouping of those modules on the initial design and this section needs to be revised to convey the actual implementation. None of the principles changed.

For client-side transferring (downloading) the code is very costly to user perceived performance. Shipping conditional code would mean client downloading code-paths that are impossible to be executed in the client given the variation a user is assigned to, adding unnecessary payload overhead.

Therefore, the only viable approach is to have separate bundles (or modules) for each variation.

For performance reasons each client might receive more than one bundle, usually optimized for caching. A bundle with modules that rarely changes provides more cache-hits than the main application bundle in CI/CD environments. So for each experiment, all bundles that have code differences will need a new bundle version.

**Simplified Client-side packaging flowchart**

```
"BUCKET A" (or variation A) has files that only affect "Bundle D"

                                          +-------------------+
                                    +---> | Default Bundle A  |
                                    |     +-------------------+
                                    |     +-------------------+
                                    +---> | Default Bundle B  |
+----------+     +---------------+  |     +-------------------+
|          |     |               |  |     +-------------------+
| Codebase +---> | Build Process +--+---> | Default Bundle C  |
|          |     |               |  |     +-------------------+
+----------+     +---------------+  |     +-------------------+
                                    +---> | Default Bundle D  |
                                    |     +-------------------+
                                    |     +-------------------+
                                    +---> | BUCKET A Bundle D |
                                          +-------------------+

Colors:
  * Code shipped to all users
  * Code shipped to users in control (default) variation
  * Code shipped only to users in BUCKET A


Notes:
The above flowchart does not discuss transport. This simplification allows for better understanding of how the build process separates bundles/modules for each user variation. Also important to note is the fact that "BUCKET A Bundle D" most likely include some of the code on "Default Bundle D", but it is bundled together for performance.
During implementation we might also choose to have a common package that does not contain any conditionals or any experiment code. The only benefit of this approach is caching, allowing a user that is assigned to a bucket to be unassigned and avoiding a whole application package to be re-fetched.
Since we have continuous deployment, this will be a minor consideration, since every deploy will invalidate a number of packages. We will aim for being able to deploy daily and experiments usually run for at least 5 days, any performance improvements regarding deployment cache will benefit bucket testing caching strategies directly.
```


### Server-side Design

Performance concerns for server-side are different from client side. Server-side is about how much time application spend in memory and CPU or internal networking/file system operations before it flushes results to the client.

For this reason, server side performance is split into two parts:

#### Isomorphic Code and Server Side Rendering (SSR)

Since client-side code will be separated in build time in different bundles, the isomorphic part of the server-side code should match exactly the client-side code and will need to follow the same strategy.

For isomorphic code, we need to adopt the same source code design as client-side code. For this reason Mendel provides a resolver so NodeJS applications can "require" the modules with the same variations.

#### Server only code

Mendel is not opinionated for server only code. Any application using Mendel can continue to use their configuration systems and resolve variations in their own way.

## Isomorphic Source Code: Variations as file system folders

On the source code, we will aim to fulfill all maintainability goals.

To understand how a developer would create, maintain and remove variations, let's assume the following application structure:

**Sample application file system tree**

```
bash> tree
.
├── BuildToolFile.js
├── lib
│   └── crypto.js
├── package.json
├── src
│   ├── server
│   │   ├── app.js
│   │   ├── index.js
│   │   ├── middleware.js
│   │   └── utils.js
│   └── ui
│       ├── controllers
│       │   ├── main.js
│       │   ├── settings.js
│       │   └── sidebar.js
│       ├── main_bundle.js
│       ├── vendor
│       │   ├── calendar_widget.js
│       │   ├── ember.js
│       │   ├── jquery.js
│       │   └── react.js
│       └── views
│           ├── admin.js
│           ├── ads.js
│           ├── list-item.js
│           ├── list.js
│           ├── login.js
│           ├── new_item.js
│           └── sidebar_item.js
└── tests
    ├── server
    │   └── app.test.js
    └── ui
        └── views
            ├── admin.test.js
            ├── ads.test.js
            └── list.test.js
```


For each client-side (or isomorphic) file that will have code differences between control and a particular variation, we will create a folder with duplicate of files for each file that we need differences. For this particular application, all isomorphic code is on the /ui/ folder, therefore we will replicate the /ui/ folder structure and only controllers/sidebar.js and views/ads.js will have differences, we will create the following tree:



**Sample new bucket filesystem tree**

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


Note: "experiments" is just an arbitrary name, but “features”, “buckets” or “variations”, etc are good choices as well.

**IMPORTANT**: No files that will be exactly the same as the default experience will need to be duplicated. The build process and development server will take care of reusing the files.

### File system variation tree resolution

Since the experiments tree should follow exactly the same folder structure as the reference tree, any missing file is used from the default folder.

**Schema for filesystem experiments tree resolution**


```
src/ui/                    experiments/new_ad_format/  resolved/new_ad_format/
├── controllers            ├── controllers      +-+    ├── controllers
│   ├── main.js            │   │                  |    │   ├── main.js
│   ├── settings.js        │   │                  |    │   ├── settings.js
│   └── sidebar.js -----> X│   └── sidebar.js     |    │   └── sidebar.js
├── main_bindle.js         │                      |    ├── main_bindle.js
├── vendor                 │                      |    ├── vendor
│   ├── calendar_widget.js │                      |    │   ├── calendar_widget.js
│   ├── ember.js           │                      |    │   ├── ember.js
│   ├── jquery.js          │                      +--> │   ├── jquery.js
│   └── react.js           │                      |    │   └── react.js
└── views                  └── views              |    └── views
    ├── admin.js               │                  |        ├── admin.js
    ├── ads.js -------------> X└── ads.js         |        ├── ads.js
    ├── list-item.js                              |        ├── list-item.js
    ├── list.js                                   |        ├── list.js
    ├── login.js                                  |        ├── login.js
    ├── new_item.js                               |        ├── new_item.js
    └── sidebar_item.js                         +-+        └── sidebar_item.js
```


Notice that all files that don’t exist on the /experiments/new_ad_format/ folder will be used from the default paths. The /resolved/ tree is not part of the code base, it only exists during runtime.

### Fulfilling the Maintainability goals

Let’s go over our Design Principles to understand why this design achieves all the required traits so far.

* **Immediately disposable:** Delete the /new_ad_format/ folder and the experiment is gone.
* **Upfront costs:** It is possible to write tests against different variations (more on that later on this document). Also conflicts can be detected and solved at development time, as opposed to runtime exceptions and combinations developers forgot, or were time constrained to test
* **Mnemonic source-code:** The folder name can be mnemonic (new_ad_format as example above or logo_short below)
* **Analyzable:**
    * There are many folder diff tools available (and we can include some on our build tools)
    * By spotting the number of files in a folder any developer can have a grasp of how complex this experiment is.

![visualization of development tree and source maps in different browsers](design_0.png)

The above image was taken from a real production variation on Yahoo Mobile Search code base (experiment run mid 2015) and developer environment using source maps.

Also, there are additional developer benefits of using this pattern. On the developer tools you can open/list all the files that affect the experiment:

![source maps auto completion in chrome based on mnemonic variation name](design_1.png)

Also, here is a window comparison viewing default experience (base, or control variation) versus the implementation of a different logo.

![visual outcome of a variation and source maps tree comparison](design_2.png)

And here is a diff comparison of one variation to the other.

```diff
diff src/client/default/less/searchbox.less src/client/logo_short/less/searchbox.less
7,9c7,9
< @YlogoIconWidth: 0;
< @YlogoIconHeight: 0;
< @YlogoWidth: @YlogoIconWidth;
---
> @YlogoIconWidth: 36px;
> @YlogoIconHeight: 36px;
> @YlogoWidth: @YlogoIconWidth + 4px;
15a16,26
>   .logo {
>     position: absolute;
>     background-size: @YlogoIconWidth @YlogoIconHeight;
>     width: @YlogoIconWidth;
>     height: @YlogoIconHeight;
>     background-repeat: no-repeat;
>     background-image: url('../../client/img/logo.png');
>     opacity: 1;
>     z-index: 1;
>     user-select:none;
>   }
149,150c160,161
<   30%     { width:@sboxwidth; }
<   100%    { width:@sboxwidth; }
---
>   30%     { transform: translateX(0);width:@sboxwidth; }
>   100%    { transform: translateX(0);width:@sboxwidth; }
```

### Extra benefits of file system folder based approach

Besides or design principles, let’s go over some additional benefits of experiments on a folder:

* **Separates complexity:** When understanding a component, source code will not be mixed up with different implementations, and permutations are kept away.
    * Decreases "fear of a file being complex" as compared to conditionals in the code
    * Decreases the "this component will be hard to maintain, as there are other combinations already" if we nest files in the same tree
* **Composable experiments:** A large new feature might be implemented as a folder, and extra experiments can *inherit *code in a declarative chain. More on that on "Variation Inheritance" later.
* **Friendly to developer tools:** Any developer can "grep" the main src/ui/ tree to find uses of a class, get ideas for refactor, and generally reason about the application without dealing with conditionals or duplicated similar files on the same tree. The experiment folder can be hidden in code editor when giving talks and many small quality of life sugar for developers.
* **Any filetype:** Conditionals are great for Javascript, but CSS and other files would need extra syntax for creating variations, with the file system approach even JSON configuration can be tweaked per variation
* **Predictable combinations:** When dealing with multiple variations, if the same file is used for many experiments, more than one conditional will be introduced and the order they are implemented might not be consistent with other files that also have multiple variations. With file system folders, there is always only one predictable file that will be used.

### Variation Inheritance (or: sharing experiment code)

It is very often needed to introduce a new feature as an experiment so we can first measure engagement, fix immediate issues not detected during initial testing, and eventually enable to all users. But it is also becoming a best practice, to test small UI variations of the new feature in order to enable only the optimal version to the user.

For example, let's assume our new_ads_format/ example above comes from a new provider and they have a library to fetch ads asynchronously. Our example now is slightly more complex:

```
bash> tree experiments/
experiments/
└── new_ad_format
    ├── controllers
    │   ├── more_money.js
    │   └── sidebar.js
    ├── vendor
    │   └── more_money_platform.js
    └── views
        └── ads.js
```


If we now want to make slight variations on top of this experiment, we should not need to duplicate again the new controller, the sidebar placement or the vendor library. We should be able for variations to declare only the differences over a main implementation variation. We will only need to duplicate the views/ads.js file across all variations, for that, lets rename the full implementation to "new_ad_format_main":

```
bash> tree experiments/
experiments/
├── new_ad_format_big
│   └── views
│       └── ads.js
├── new_ad_format_colorful
│   └── views
│       └── ads.js
├── new_ad_format_discreet
│   └── views
│       └── ads.js
└── new_ad_format_main
    ├── controllers
    │   ├── more_money.js
    │   └── sidebar.js
    ├── vendor
    │   └── more_money_platform.js
    └── views
        └── ads.js
```

> Note: This section needs reviewing. This is now covered by .mendelrc file, package.json with "mendel" key or the browserify plugin command-line params. The resolution is unchanged.

In order for this to work, we will need to configure the chain of inheritance, which can be done in application level configuration or in a Mendel configuration file, but eventually we want to achieve the following combination:

* default (baseline)
* new_ad_format_main → default
* new_ad_format_big → new ad_format_main → default
* new_ad_format_colorful → new ad_format_main → default
* new_ad_format_discreet → new ad_format_main → default

Tree resolution would work the same way, where all files present on each step of inheritance takes precedence over files on the folder it is inheriting from:

```yaml
# Initial design
{
    "new_ad_format_discreet": {
        folders: ["new_add_format_discreet", "new_ad_format_main", "default"]
    },
}
# .mendelrc implementation:
base: default
variations:
  new_ad_format_discreet:
    - new_add_format_discreet
    - new_ad_format_main
    # base is assumed as last item in all variations
```

As explained before, since inheritance order is declared explicitly, there is no inconsistency for resolving which file is being loaded, as opposed to conditionals that can be implemented in different order across different files.

A more complex example:

```yaml
# as originally designed
{
  "new_ads" {
    folders: ["new_ads"]
  },
  "sports": {
    folders: ["sports", "new_news_module", "new_video_module", "new_ads"],
  },
  "news_only": {
    folders: ["new_news_module", "new_ads"],
  },
  "video_only": {
    folders: ["new_video_module"],
  },
  "news_and_video": {
    folders: ["new_news_module", "new_video_module"],
  },
}

#
# variations resolution schema:
#  sports           = sports -> new_news_module -> new_video_module -> new_ads -> default
#  new_news_module  = new_news_module -> new_ads -> default
#  new_video_module = new_video_module -> default
#  news_and_video   = new_news_module -> new_video_module -> default
#

# .mendelrc format
base: default
variations:
  new_ads:
    - new_ads
  sports:
    - sports
    - new_news_module
    - new_video_module
    - new_ads
  news_only:
    - new_news_module
    - new_ads
  video_only:
    - new_video_module
  news_and_video:
    - new_news_module
    - new_video_module
```


Notice that news_and_video won't receive new_ads implicitly. This is very important to create complex scenarios, and the above example is a simplification of real use cases that happened in Yahoo Search products before. This is a code sharing pattern intended for developers, it was a consequence of multivariate test requirements that had this complex graph as outcome.

### Comparison to other strategies and designs

> Note: This was a bullet list compiled from a series of Q&A sessions internally held at Yahoo. This section is here for historical purposes and will be removed once this design is revised to convey the current architecture in Mendel

* conditional in the code
    * would deliver more code to the client
    * even conditionals with async loaders would have some more code (including the loader) and then add more requests for scripts/css async. with 20 layers, 20 small files/requests would be required
    * unmanageable in the long run
    * not immediately disposable
    * scary to open 1 file with dozens of conditionals because of buckets
    * conditional precedence is not predictable and consistent across files, with file system tree merge, it is impossible to have any ambiguity, since even with bucket inheritance, there is no way a developer will be able to change precedence arbitrarily in different files
* conditional removal (Esprima or other Javascript parsers and transformations)
    * same drawbacks as above maintainability wise, but would achieve "no payload overhead"
    * harder build system to implement
    * build times increase
    * it is not easily disposable (unless the same parser/exclusion is used for disposal, but this would increase even more how hard it is to implement)
    * not easy to analyze differences, since searching the codebase with grep and similar tools is harder with conditionals
    * lead to implicit precedence per file, where declarative merge/inheritance is consistent (example of if block, some statements execution, followed by another if block)
    * might be overridden "if(foo) feature2 = true"

* branches for each experiment
    * get outdated for every single commit on master while duplicating files on folders only potentially get outdated for the handful of forked files
        * which means the cost is not paid upfront, but also maintained over time
    * can’t be used for server-side, only for client-side (or isomorphic) and code that is required per-request on the server
    * can diff branches but it’s not easy to grep the codebase and see that a given function is also used on an experiment, among other analysis problems
    * regular branches would need to be disambiguated with experiment branches, confusion, naming convention, dirty codebase
    * inheritance problems
        * cannot have multiple inheritance by declarative configuration, only direct inheritance
        * if parent branch is rebased, child branch is still outdated or will incur extra development time to update

## Multivariate and Multi Layer Testing

When implementing multiple experiments, the most simple and naive approach would be: all tests are mutually exclusive, meaning, a user can only be part of one experiment at a time (or no experiment at all). A more complex approach is to allow permutations of experiments to happen.

### Multivariate

> Multivariate testing is a technique for testing a hypothesis in which multiple variables are modified. The goal of multivariate testing is to determine which combination of variations performs the best out of all of the possible combinations.
>
> [Comparing a Multivariate Test to an A/B Test](https://www.optimizely.com/resources/multivariate-test-vs-ab-test/)

There is two approaches for multivariate testing:

1. Build all experiments combinations upfront and allocate users evenly to each experiment
2. Have runtime resolution in order to make possible to allocate users to 2+ different experiments that were developed separately

### Multilayer

One of the tools we use at Yahoo to do Multivariate experiments is the use of "Layers". A user is always present in all active layers, and all layers can divide 100% of the users as it sees fit. In the example below, there are two layers and one particular user is assigned to two different experiments, each experiment in one layer.

```
+------------------+-----------------+------------------+
|   Bucket L1-A    |   Bucket L1-B   |   Bucket L1-C    |
|   30% of L1      |   30% of L1     |   30% of L1      |  Layer 1
+------------------+-----------------+------------------+

+-------------+-------------+-------------+-------------+
| Bucket L2-A | Bucket L2-B | Bucket L2-C | Bucket L2-C |
| 25% of L2   | 25% of L2   | 25% of L2   | 25% of L2   |  Layer 2
+-------------+-------------+-------------+-------------+

Note: all permutations are possible
```

Layers can be used to create multivariate tests, but at Yahoo this is rarely (or never) the case.

**The main goal of implementing layers is to increase experiment space for parallel experimentation.** A secondary goal is to assign different components of a complex application to different teams.

This means that the combination of experiments L1B and L2C (or any permutation for that matter) will not be analyzed as the combination being the factor of success, but instead, each variation will usually be compared to it's own control set of users.

In Mendel we implement layers because it allows different teams to work on different components, UI areas or responsibilities of the application independently. Multivariate experiments are usually developed on the same layer for measurement accuracy.

**Without multi-layer support, all experimentation teams must work together to wisely divide 100% of users into experiments and control groups.**

### Multilayer complexity

As we stated before, multilayer support can be used for multivariate testing. One could implement variable A (i.e. button color) and variable B (i.e. button placement) and allocate all variations of each variable in one layer (i.e. Layer 1: A1, A2, A3, A4; Layer 2: B1, B2, B3, B4). Permutation would happen evenly assuming all experiments have the same size.

Dynamic allocation for experiments targeting the same subset of components of an application imposes interesting technical challenges:

* Are all combinations thoroughly tested?
* How to automate such a combination of builds?
* How to automate tests?
* Is is easy to monitor errors in production?
* Does it lead to a chaotic code base in the long run?

Multi Layer increases exponentially the number of ****potential errors**** a developer can inadvertently cause in production.

It brings Testability and Maintainability issues to the project.

With 40 experiments in production, organized in 5 layers there are 6,720 permutations to be accounted for. At built time, it is not practical to run integration/UI tests against 40 experiments (in 3 browsers), let alone the 6,720 permutations. We can add a few specific tests to each isolated experiment, but there is no practical way of automating tests for all permutations.

Therefore, most Multi Layer errors are only caught by monitoring production. Thrown programmatic errors are easy to catch and fix, but UI errors are virtually undetectable and costly to fix if they are ever detected.

From all the research and design we did before creating Mendel, it becomes clear it's a question to where we want the long term continuous cost to go:

1. We enable Multi Layer, we have higher **development costs** in the long run as we progress, with potential of affecting real users inadvertently, and increasing FE architecture complexity and maintainability significantly.
2. We go back to the ****product management costs***** of having teams competing and organizing to use smaller experiments space.

Mendel does not choose for you. If you decide to use Mendel only at build time, it will generate all variations of bundles, you can upload to your CDN and use the bundles as is, with no multi-layer support.

If you want to support multi-layering (or an array of variations enabled in production for a single user), you can use mendel-middleware and the exported manifests and server generated files to achieve all the combinations in an isomorphic fashion, while keeping all performance traits discussed above.


## Implementation: Build tools and runtime libraries

Mendel is implemented using Browserify. Regardless of recent popularity of WebPack as a front-end build tool, Browserify is still state of the art and provided a stable foundation that is way more modular than WebPack and allowed the team to develop Mendel with high quality standards and in a timely manner.


### Mendel Manifest: Building Front-End assets with thousands of possible permutations in each deployment

In previous iterations of this bucket system design, used in the Mobile Search  codebase, for each experiment a single client-side bundle was generated. This practice becomes prohibitive for multi-layer scenarios where thousands of permutations are created per deployment (i.e. 40 experiments evenly distributed in 5 layers generate 6.700 permutations).

During the **Browserify pipeline**, there is an internal package format that contains source-code and extra metadata. When creating the Mendel manifest, we decided to reuse this representation, wrapped in a Mendel specific object. Here is a simplified manifest:

```json
{
  "indexes": {
    "components/button.js": 0,
    ...
  },
  "bundles": [
    {
      "variations": [
        "src/base",
        "src/variations/new_add_button",
        "sec/variations/new_add_button_red"
      ],
      "data": [
        { /* browserify payload for base */ },
        { /* browserify payload for new_add_button */ },
        { /* browserify payload for new_add_button_red */ }
      ],
      "id": "components/button.js",
      "index": 0
    },
    ...
  ]
}
```

The manifest is generated at build time, and based on entry points for an application, will traverse the dependency graph based on Javascript `import` or `require` statements. All javascript payload is already transformed, and minified at this point.

At runtime, the manifest is loaded in memory once, and we are now able to dynamically serve all possible permutations in request time, which we explain in the following sections.

### Mendel Hash - Resolving bundles at runtime

Once the manifest is loaded by a production server, Mendel runtime libraries will be able to serve all permutations required for a particular deployment.

Our hash algorithm takes caching into consideration. If a small deployment changes only one particular file inside a variation, only a subset of users users should receive a new bundle. All other users should continue to use their cached versions -- even across multiple deployments.

Since Mendel is based on file system we can understand the potential bundles and how hashing needs to be done, by analyzing the following scenario:

#### 4 experiments, divided in 2 layers, 2 experiments in each layer

[![4 experiments in 2 layers graph](https://cdn.rawgit.com/yahoo/mendel/master/docs/Mendel-4-buckets-2-layers.svg)](Mendel-4-buckets-2-layers.svg)

The image above can be used to understand a number of Mendel responsibilities. Here are the ones relevant to bundle hashing and caching:

  1. With 4 experiments in those layers Mendel can potentially generate 9 bundles.
  2. If file `F6` is changed in your application between one version and the other, it should only affects 3 bundles

This scenario is easy to understand, but large applications can yield a huge number of variations, for instance, 40 experiments evenly distributed in 8 layers will yield 6.700 permutations. Those permutations are not static at build time. Enabling and disabling permutations, organizing variations into layers are responsibilities of campaign management tools and external systems, so creating all permutations in build time would not only be slow, but also impossible by the nature of A/B testing best practices.

Also, in order to cache and serve those bundles, we need consistent URLs:

  * URLs must be the same to multiple users
  * URLs must be cookie-less, so we can use CDN caching
  * URLs should benefit from enhanced security, by obfuscating experiment names
  * URLs should be small enough

For that reason, `mendel-core` generates a hash for each bundle. The hash is based in the file list for a bundle (or what we call a tree representation), and the content of each file. This is very similar to how `git` works internally -- each blob has a hash, and each tree has a hash based on file names and blob hashes -- but it is meant to be evaluated dynamically in production.

Using hashes guarantees that we will cache bust only the required bundle on every deployment. It is very common for large applications to split the logic into multiple bundles and also common to do heavy development in variations. This allows developers to use Continuous Integration, Continuous Deployment and Continuous Delivery and rest assured that most users are not getting cache busted constantly.

Source code and details on Mendel Hashing is available at:
https://github.com/yahoo/mendel/tree/master/packages/mendel-core


#### **A) Resolving bundle URL on HTML request:**

1. Request comes in for regular routes (Inbox, Compose, etc) with a bucket-cookie
    1. bucket-cookie is an opaque blob, further represented as `[bucket-cookie-hash]`
2. Resolve bucket-cookie to a list of experiments
    1. `parse([bucket-cookie-hash]) → ['experimentA', 'experimentB']`
3. Mendel gets an array of experiments, walks the manifest and outputs a hash to be used to generate a URL
    1. `mendel(manifest, ['experimentA', 'experimentB']) → [Mendel-hash]`
    2. Example mendel hash: `bWVuZGVsAQAA_woAXorelKkTdpi858lasbIQRS6SCfw`
4. Application will have a route to serve this asset (using mendel-middleware):
    1. `/mendel/bWVuZGVsAQAA_woAXorelKkTdpi858lasbIQRS6SCfw/main_app.js`
    2. On-demand bundles will have similar URLs and a list of potential bundles is served to the user
5. We get a CDN URL to cache this resource and serve in the HTML
    1. `cdnFunction(/mendel/bWVuZGVsAQAA_woAXorelKkTdpi858lasbIQRS6SCfw/mail_app.js) → https://your.cdn/some_route/some_hash.js`
    2. `<head><script src="https://your.cdn/some_route/some_hash.js” />`
    3. `<script>/* on-demand bundles */ var lazyBundles = {…}`
    4. `lazyBundles` object contains an map for entry points on the app and URLs like 4.1. above.

#### **B) Serving the bundle:**

1. User browser requests CDN url
    1. `https://your.cdn/some_route/some_hash.js`
2. CDN fetch contents from Application URL
    1. `https://yourapp.com/mendel/bWVuZGVsAQAA_woAXorelKkTdpi858lasbIQRS6SCfw/main_app.js`
3. Mendel uses manifest and hash to generate a list of dependencies for this user
    1. `[Mendel-hash] + [Manifest] → [dep1, dep2, dep3, …]`
    2. Current implementation gives a `404` if the hash is not a Mendel hash and `404` if the hash don’t match and validates against the current manifest.
4. Mendel packages a bundle for this user
    1. `[dep1, dep2, dep3, ...] → [javascript payload]` (with `browser_pack`)
5. CDN gets the response, caches the URL for a period of time (based on headers and how frequently the asset is requested). and serves to any user requesting the same combination of experiments
