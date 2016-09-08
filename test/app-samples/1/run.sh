#!/bin/bash

mkdir -p build

browserify app/index.js -p ../../../packages/mendel-browserify \
    -o build/app.js

