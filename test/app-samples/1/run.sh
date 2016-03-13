#!/bin/bash

browserify app/index.js -p ../../../packages/mendel-browserify \
    -o build/app.js

