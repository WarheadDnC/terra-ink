#!/usr/bin/env python3
"""Package the validated WordPress build and the exact committed source."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import json
import subprocess

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
parser.add_argument('--source-repo', type=Path, default=root)
args = parser.parse_args()
build = root / 'dist-wordpress'
manifest = json.loads((build / '.vite/manifest.json').read_text())
assert (build / manifest['src/wordpress.tsx']['file']).is_file()
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=args.source_repo).strip(), 'Commit source before packaging'
source = subprocess.check_output(['git', 'archive', '--format=zip', 'HEAD'], cwd=args.source_repo)
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.source_repo, text=True).strip()
plugin = root / 'wordpress/posteroom-map-designer'
args.output.parent.mkdir(parents=True, exist_ok=True)
prefix = 'posteroom-map-designer/'
with ZipFile(args.output, 'w', compression=ZIP_DEFLATED) as archive:
    for path in sorted(plugin.rglob('*')):
        relative = path.relative_to(plugin)
        if path.is_file() and relative.parts[0] not in ('build', 'source'):
            archive.write(path, prefix + str(relative))
    for path in sorted(build.rglob('*')):
        relative = path.relative_to(build)
        if path.is_file() and relative.name not in ('sw.js', 'manifest.webmanifest'):
            archive.write(path, prefix + 'build/' + str(relative))
    for name in ('LICENSE', 'LICENSE-OLD', 'TRADEMARK.md', 'COPYING'):
        archive.write(root / name, prefix + name)
    archive.writestr(prefix + 'source/terra-ink-source.zip', source)
    archive.writestr(prefix + 'source/COMMIT.txt', commit + '\n')
with ZipFile(args.output) as archive:
    assert archive.testzip() is None
    assert prefix + 'posteroom-map-designer.php' in archive.namelist()
print(args.output.resolve())
