# This patches Source Han Sans's units-per-em to be consistent with Gen Jyuu Gothic.

import re
import sys


def get_file_content(filename):
    with open(filename, 'rb') as f:
        return f.read()


def write_file_content(filename, content):
    with open(filename, 'wb') as f:
        f.write(content)


filename = sys.argv[1]

content = get_file_content(filename)
content = re.sub(b'\x5f\x0f\x3c\xf5(..)\x03\xe8',
                 b'\x5f\x0f\x3c\xf5\\1\x04\x00', content, 1)
write_file_content(filename, content)
