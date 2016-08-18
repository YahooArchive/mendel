#!/bin/bash

mkdir -p build/client/base

# # vendor bundle, without variations, but create manifest to be
# # served by the middleware
# browserify                                                       \
#     --require   "react"                                          \
#     --require   "react-dom"                                      \
#     --outfile   "build/client/base/vendor.js"                    \
#                                                                  \
#     --plugin [  "mendel-browserify"                              \
#                 --no-config                                      \
#                 --basetree      "isomorphic/base"                \
#                 --outdir        "build"                          \
#                 --bundlesoutdir "client"                         \
#     ]                                                            \

# main bundle, with all variations, and with output to server
browserify      "isomorphic/base/main.js"                                \
    --external  "react"                                                  \
    --external  "react-dom"                                              \
    --external  "react-dom"                                              \
    --outfile   "build/client/base/main.js"                              \
    --transform "babelify"                                               \
    --debug                                                              \
                                                                         \
    --plugin [  "mendel-extractify"                                      \
                --extract [                                              \
                    [                                                    \
                        --outfile "build/client/base/lazy.js"            \
                        --entries [                                      \
                            "isomorphic/base/components/lazy.js"         \
                        ]                                                \
                    ]                                                    \
                ]                                                        \
    ]                                                                    \
                                                                         \
    --plugin [  "mendel-browserify"                                      \
                --no-config                                              \
                --basetree      "isomorphic/base"                        \
                --variations [                                           \
                    --bucket_A                                           \
                ]                                                        \
                --variationsdir "isomorphic/variations"                  \
                --outdir        "build"                                  \
                --bundlesoutdir "client"                                 \
    ]                                                                    \
                                                                         \
    --plugin [  "mendel-requirify"                                       \
                --outdir       "build/server"                            \
    ]                                                                    \
                                                                         \

# the lazy bundle is an example of external bundle that never need
# to be rendered on the server, but has all variations
# browserify                                                               \
#     --require   "./isomorphic/base/components/lazy.js"                   \
#     --external  "react"                                                  \
#     --external  "react-dom"                                              \
#     --external  "./isomorphic/base/components/button.js"                 \
#     --outfile   "build/client/base/lazy.js"                              \
#     --transform "babelify"                                               \
#                                                                          \
#     --plugin [  "mendel-browserify"                                      \
#                 --no-config                                              \
#                 --basetree      "isomorphic/base"                        \
                # --variations [                                           \
                #     --bucket_A                                           \
                #     --bucket_D [ 'partner_C' ]                           \
                #     --feature_B                                          \
                #     --partner_C                                          \
                # ]                                                        \
#                 --variationsdir "isomorphic/variations"                  \
#                 --outdir        "build"                                  \
#                 --bundlesoutdir "client"                                 \
#     ]                                                                    \
#                                                                          \



    # --plugin [  "mendel-extractify"                                      \
    #             --extract [                                              \
    #                 [                                                    \
    #                     --outfile "build/client/base/lazy.js"            \
    #                     --entries [                                      \
    #                         "isomorphic/base/components/lazy.js"         \
    #                     ]                                                \
    #                 ]                                                    \
    #             ]                                                        \
    # ]                                                                    \

    # --plugin [  "extractify"                                             \
    #             --lazy [                                                 \
    #                 [                                                    \
    #                     --outfile "build/client/base/lazy.js"            \
    #                     --entries [                                      \
    #                         "isomorphic/base/components/lazy.js"         \
    #                     ]                                                \
    #                 ]                                                    \
    #             ]                                                        \
    # ]                                                                    \

