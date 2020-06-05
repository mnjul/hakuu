#!/bin/bash

cd /

pyftsubset cjk.otf --text-file=cjk.txt
python otf2ttf.py cjk.subset.otf

pyftsubset cjk_punctuation.otf --text-file=cjk_punctuation.txt
python otf2ttf.py cjk_punctuation.subset.otf

pyftmerge cjk.subset.ttf cjk_punctuation.subset.ttf

pyftsubset latin.ttf --text-file=latin.txt

woff2_compress merged.ttf
woff2_compress latin.subset.ttf

mv merged.woff2 cjk.subset.woff2