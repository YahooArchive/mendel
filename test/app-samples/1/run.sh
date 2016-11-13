#!/bin/bash

if [ -d build/ ]
then
    rm -rf build/
fi
if [ -d build-requirify/ ]
then
    rm -rf build-requirify/
fi

mkdir -p build
mkdir -p build-requirify

browserify app/index.js -p ../../../packages/mendel-browserify \
    -p  ../../../packages/mendel-requirify \
    -o build/app.js
