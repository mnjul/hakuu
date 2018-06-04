# This is part of Hakuu, a web site, and is licensed under AGPLv3.
# Copyright (C) 2018 Min-Zhong Lu

#!/bin/bash

node ./node_modules/eslint/bin/eslint.js ./html/assets/scripts/*.js
node ./node_modules/stylelint/bin/stylelint.js ./html/assets/styles/*
