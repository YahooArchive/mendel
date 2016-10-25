#!/bin/bash
git status -sb
echo "ab -n 1000 -c 1 -l http://localhost:3000/?variations=bucket_D"
ab -n 1000 -c 1 -l http://localhost:3000/?variations=bucket_D
