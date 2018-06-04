# This is part of Hakuu, a web site, and is licensed under AGPLv3.
# Copyright (C) 2018 Min-Zhong Lu

#!/bin/bash

# Remember to build docker image for the first time
# docker build --tag fonttools ./fonttools.docker

docker create --name fonttools-instance fonttools pyftsubset /src.otf --text-file=/src.txt

docker cp ./fonts_source/SourceHanSerifTC-ExtraLight.otf fonttools-instance:/src.otf

docker cp ./charsets/cjk.txt fonttools-instance:/src.txt

docker start fonttools-instance

docker wait fonttools-instance

docker cp fonttools-instance:/src.subset.otf ../html/assets/fonts/cjk.otf

docker rm fonttools-instance



docker create --name fonttools-instance fonttools pyftsubset /src.ttf --text-file=/src.txt

docker cp ./fonts_source/CormorantInfant-Light.ttf fonttools-instance:/src.ttf

docker cp ./charsets/latin.txt fonttools-instance:/src.txt

docker start fonttools-instance

docker wait fonttools-instance

docker cp fonttools-instance:/src.subset.ttf ../html/assets/fonts/latin.ttf

docker rm fonttools-instance
