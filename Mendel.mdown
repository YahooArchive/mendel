
Mendel is a framework that acknowledge that any web application needs more than just a bundler. As application grows it will need at least one, but probably multiple of the following:

  1. A/B testing bundling framework: Experimenting with different UI/UX variations is essential for building a successful, competitive application. Mendel provides a well rounded strategy to avoid [tech debt](1) and excessive bundle payload caused by experimentation. Mendel also supports multivariate/multilayer experiments and experiments can use [server-side rendering](2).

  2. Many web applications need features that are contextual to certain users: [white-labeling](3), theme support and environment/settings based features can add unexpected complexity to your code base. Mendel architecture provides and easy mental model that reduce complexity and increase maintainability for such scenarios.

  3. A more comprehensive feature-set bundler: Most build tools don't scale as your application grows. Mendel has specific features and a better configuration system to deal with bundle splitting rules, environment specific configuration. Incremental builds and multi-core support helps speed up development and production builds.


