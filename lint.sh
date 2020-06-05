# This is part of Hakuu, a web site, and is licensed under AGPLv3.
# Copyright (C) 2018 Min-Zhong Lu

#!/bin/bash

node ./node_modules/.bin/eslint ./html/assets/scripts/*.js
node ./node_modules/.bin/stylelint ./html/assets/styles/*
