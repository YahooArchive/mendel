#!/bin/bash

mkdir -p build

browserify app/index.js -p ../../../packages/mendel-browserify \
    -p  ../../../packages/mendel-requirify \
    -o build/app.js
