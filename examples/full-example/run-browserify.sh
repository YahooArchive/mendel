#!/bin/bash

mkdir -p build/client/base

browserify                                                       \
    --require   "react"                                          \
    --require   "react-dom"                                      \
    --outfile   "build/client/base/vendor.js"                    \
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


browserify      "isomorphic/base/main.js"                        \
    --external  "react"                                          \
    --external  "react-dom"                                      \
    --external  "./isomorphic/base/components/lazy.js" \
    --require   "./isomorphic/base/components/button.js" \
    --require   "./isomorphic/variations/bucket_A/components/button.js" \
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


browserify   \
    --require   "./isomorphic/base/components/lazy.js" \
    --external  "react"                                          \
    --external  "react-dom"                                      \
    --external  "./isomorphic/base/components/button.js" \
    --external  "./isomorphic/variations/bucket_A/components/button.js" \
    --outfile   "build/client/base/lazy.js"                      \
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


    # --plugin [  "extractify"                                     \
    #             --lazy [                                         \
    #                 [                                            \
    #                     --outfile "build/client/base/lazy.js"    \
    #                     --entries [                              \
    #                         "isomorphic/base/components/lazy.js" \
    #                     ]                                        \
    #                 ]                                            \
    #             ]                                                \
    # ]                                                            \
    #                                                              \

