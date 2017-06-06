## Mendel Tests

For the moment, Mendel relies on some private repositories for integration tests. Make sure you have the appropriate access in order to run integration tests.

### Unit tests

**File organization:**

  * All tests are in the test/ directory
  * Each test files corresponds to exactly one source file
  * Only stubs and fixtures use subdirectories
  * All build/ directories are ignored via the .gitignore to prevent generated output from being committed

#### Running tests.

If you have not already, please link all your local npm packages
    npm run linkall

To run tests quickly, please use:

    npm test     # all tests
    npm run unit # only unit tests
    npm run lint # only linter

If you want a quick coverage report of files and classes we already wrote tests, you can run:

    npm run coverage

This will run coverage with command line output only and will only cover files that are required by tests. To run full coverage you can:

    npm run coverage-html

This will find all files in the application and report coverage in both the command line and HTML formats. If possible, it will as open your browser to view the report.

To run tests against a single file you can:

    npm run unit-file test/testname.js

#### Single file coverage

We avoid mocking too much, so coverage might be biased when running the full suite. To make sure coverage is 100% on each file, you can run coverage on a single test file, but listing all files that were covered:

    npm run coverage-file test/testname.js

Tests are written to target a single file, so when running the single test file, look for the corresponding source file, even though many files may show up in the result.

Finally, if you want to find out if your changes are impacting those individual files coverage, there is a helper to loop through each test file running coverage and outputting summary to the terminal.

    npm run coverage-all-individualy

