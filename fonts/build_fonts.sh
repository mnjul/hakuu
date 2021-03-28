# This is part of Hakuu, a web site, and is licensed under AGPLv3.
# Copyright (C) 2018-2021 Min-Zhong Lu

# Remember to build docker image for the first time
# docker build --tag fonttools ./fonttools.docker

docker create --name fonttools-instance fonttools

docker cp ./fonts_source/SourceHanSerifJ-ExtraLight.otf fonttools-instance:/cjk.otf
docker cp ./fonts_source/SourceHanSerifTC-ExtraLight.otf fonttools-instance:/cjk_punctuation.otf
docker cp ./fonts_source/CormorantInfant-Light.ttf fonttools-instance:/latin.ttf
docker cp ./fonts_source/GenJyuuGothicL-Normal.ttf fonttools-instance:/cjk-sans.ttf
docker cp ./fonts_source/SourceHanSansTC-Normal.otf fonttools-instance:/cjk-sans_punctuation.otf
docker cp ./fonts_source/Rubik-Light.ttf fonttools-instance:/latin-sans.ttf

docker cp ./charsets/cjk.txt fonttools-instance:/cjk.txt
docker cp ./charsets/cjk_punctuation.txt fonttools-instance:/cjk_punctuation.txt
docker cp ./charsets/latin.txt fonttools-instance:/latin.txt
docker cp ./charsets/cjk-sans.txt fonttools-instance:/cjk-sans.txt
docker cp ./charsets/cjk-sans_punctuation.txt fonttools-instance:/cjk-sans_punctuation.txt
docker cp ./charsets/latin-sans.txt fonttools-instance:/latin-sans.txt

docker start -a fonttools-instance

docker wait fonttools-instance

docker cp fonttools-instance:/cjk.subset.woff2 ../html/assets/fonts/cjk.woff2
docker cp fonttools-instance:/latin.subset.woff2 ../html/assets/fonts/latin.woff2
docker cp fonttools-instance:/cjk-sans.subset.woff2 ../html/assets/fonts/cjk-sans.woff2
docker cp fonttools-instance:/latin-sans.subset.woff2 ../html/assets/fonts/latin-sans.woff2

docker rm fonttools-instance
