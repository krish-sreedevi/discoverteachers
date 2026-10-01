#!/usr/bin/env python3
"""Stamp a version onto every local JS/CSS reference so browsers fetch fresh files after each deploy.
Usage: python3 tools/stamp.py <version>   (run from the repo root before committing)"""
import re, sys, pathlib
v = sys.argv[1]
root = pathlib.Path(__file__).resolve().parent.parent
# relative ES module imports:  from './x.js'  /  import('./x.js')  -> './x.js?v=VER'
imp = re.compile(r"""((?:from\s+|import\s*\(\s*)['"])(\.{1,2}/[^'"?]+\.js)(?:\?v=[^'"]*)?(['"])""")
for f in root.joinpath('js').rglob('*.js'):
    s = f.read_text(); n = imp.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={v}{m.group(3)}", s)
    if n != s: f.write_text(n)
idx = root / 'index.html'; s = idx.read_text()
s = re.sub(r'(href="css/app\.css)(?:\?v=[^"]*)?"', rf'\1?v={v}"', s)
s = re.sub(r'(src="js/app\.js)(?:\?v=[^"]*)?"', rf'\1?v={v}"', s)
idx.write_text(s)
print('stamped', v)
