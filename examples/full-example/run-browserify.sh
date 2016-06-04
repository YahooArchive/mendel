#!/bin/bash

mkdir -p build/client/base

browserify      "isomorphic/base/main.js"                        \
    --external  "react"                                          \
    --external  "react-dom"                                      \
    --outfile   "build/client/base/main.js"                      \
    --transform "babelify"                                       \
                                                                 \
    --plugin [  "mendel-browserify"                              \
                --no-config                                      \
                --basetree      "isomorphic/base"                \
                --variations [                                   \
                    --bucket_A                                   \
                ]                                                \
                --variationsdir "isomorphic/variations"          \
                --outdir        "build"                          \
                --bundlesoutdir "client"                         \
    ]                                                            \
                                                                 \
    --plugin [  "extractify"                                     \
                --lazy [                                         \
                    [                                            \
                        --outfile "build/client/base/lazy.js"    \
                        --entries [                              \
                            "isomorphic/base/components/lazy.js" \
                        ]                                        \
                    ]                                            \
                ]                                                \
    ]                                                            \
                                                                 \

