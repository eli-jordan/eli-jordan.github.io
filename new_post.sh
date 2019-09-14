#!/bin/bash

echo "Enter the post title"
read title
./node_modules/.bin/hexo new post "$title"