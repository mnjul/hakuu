# This is part of Hakuu, a web site, and is licensed under AGPLv3.
# Copyright (C) 2018 Min-Zhong Lu

#!/bin/bash

# Remember to build docker image for the first time
# docker build --tag fonttools ./fonttools.docker

docker create --name fonttools-instance fonttools

docker cp ./fonts_source/SourceHanSerifJ-ExtraLight.otf fonttools-instance:/cjk.otf
docker cp ./fonts_source/SourceHanSerifTC-ExtraLight.otf fonttools-instance:/cjk_punctuation.otf
docker cp ./fonts_source/CormorantInfant-Light.ttf fonttools-instance:/latin.ttf

docker cp ./charsets/cjk.txt fonttools-instance:/cjk.txt
docker cp ./charsets/cjk_punctuation.txt fonttools-instance:/cjk_punctuation.txt
docker cp ./charsets/latin.txt fonttools-instance:/latin.txt

docker start fonttools-instance

docker wait fonttools-instance

docker cp fonttools-instance:/cjk.subset.woff2 ../html/assets/fonts/cjk.woff2
docker cp fonttools-instance:/latin.subset.woff2 ../html/assets/fonts/latin.woff2

docker rm fonttools-instance
