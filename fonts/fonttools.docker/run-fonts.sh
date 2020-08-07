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
rm merged.ttf

pyftsubset cjk-sans.ttf --text-file=cjk-sans.txt

pyftsubset cjk-sans_punctuation.otf --text-file=cjk-sans_punctuation.txt
python otf2ttf.py cjk-sans_punctuation.subset.otf

python patch-upm.py cjk-sans_punctuation.subset.ttf

pyftmerge cjk-sans.subset.ttf cjk-sans_punctuation.subset.ttf

pyftsubset latin-sans.ttf --text-file=latin-sans.txt

woff2_compress merged.ttf
woff2_compress latin-sans.subset.ttf

mv merged.woff2 cjk-sans.subset.woff2









