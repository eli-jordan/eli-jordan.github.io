#!/bin/bash

echo "Enter the talk page title"
read title
./node_modules/.bin/hexo new page --path talks/"$title" "$title" 