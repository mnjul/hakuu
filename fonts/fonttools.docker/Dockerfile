FROM python:3.6
RUN pip install fonttools cu2qu
ADD https://raw.githubusercontent.com/fonttools/fonttools/master/Snippets/otf2ttf.py /
RUN apt-get update && apt-get install -y woff2
COPY run-fonts.sh /
COPY patch-upm.py /
ENTRYPOINT ["/run-fonts.sh"]