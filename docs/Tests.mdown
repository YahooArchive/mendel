## Mendel Tests

For the moment, Mendel relies on some private repository for integration tests. Make sure you have access to those in order to avoid integration breaking.

### Unit tests

**File organization:**

  * All tests are at the test directory
  * All subdirectories are stubs and fixtures\
  * Every test files corresponds to exactly one source file
  *  All build/ directories are ignored, so if your tests generate something the output is not committed by accident.

#### Running tests.

To run tests quickly, please use:

    npm test # all tests
    npm runt unit # only unit tests
    npm runt lint # only linter

If you want a quick coverage report of files and classes we already wrote tests, you can run:

    npm run coverage

This will run coverage with command line output only and will only cover files that are required by tests. To run full coverage you can:

    npm run coverage-html

This will find all files in the application and report coverage on both command line and HTML output, as well as open your browser if possible.

To run tests against a single file you can:

    npm run unit-file test/testname.js

If you do this too often, you might want to install tap globally to avoid typing `./node_modules/.bin/` all the time.

#### Single file coverage

We avoid mocking too much, so coverage might be biased when running the full suite. To make sure coverage is 100% on each file, you can run coverage on a single test file, but listing all files that were covered:

    npm run coverage-file test/testname.js

Tests are written to target a single file, so when running the single test file, look for the corresponding source file, even though many files might show up in the result.

Finally, if you want to find out if your changes are impacting those individual files coverage, there is a helper to loop through each test file running coverage and outputting summary to the terminal.

    npm run coverage-all-individualy

