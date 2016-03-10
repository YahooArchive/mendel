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

    npm test

If you want a quick coverage report of files and classes we already wrote tests, you can run:

    npm test -- --coverage

This will run coverage with command line output only and will only cover files that are required by tests. To run full coverage you can:

    npm run coverage

This will find all files in the application and report coverage on both command line and HTML output, as well as open your browser if possible.

To run tests against a single file you can:

    ./node_modules/.bin/tap test/testname.js

If you do this too often, you might want to install tap globally to avoid typing `./node_modules/.bin/` all the time.

#### Single file coverage

We avoid mocking too much, so coverage might be biased when running the full suite. To make sure coverage is 100% on each file, you can run coverage on a single file too:

    ./node_modules/.bin/tap test/testname.js --coverage

Or with HTML report:

    ./node_modules/.bin/tap test/testname.js --coverage --coverage-report=lcov

This might give you a better idea of how much a particular file is covered and
