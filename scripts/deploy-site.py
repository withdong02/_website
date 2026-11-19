#!/usr/bin/env python3
"""Package the static build, or receive it through the restricted SSH entrypoint."""
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
from urllib.parse import quote


def file_hash(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def package(source, output, previous_manifest=None):
    files = sorted(file for file in source.rglob('*') if file.is_file())
    manifest = {file.relative_to(source).as_posix(): file_hash(file) for file in files}
    output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(output, 'w:gz') as archive:
        for file in files:
            if file.is_symlink():
                raise ValueError(f'Symlink in build: {file}')
            name = file.relative_to(source).as_posix()
            if previous_manifest is None or previous_manifest.get(name) != manifest[name]:
                archive.add(file, arcname='site/' + name)
        data = json.dumps(manifest, ensure_ascii=False).encode()
        info = tarfile.TarInfo('manifest.json')
        info.size = len(data)
        archive.addfile(info, io.BytesIO(data))
    print(f'Packaged {len(files)} files: {output}')


def unpack(stream, destination, previous=None):
    seen = set()
    size = 0
    with tarfile.open(fileobj=stream, mode='r|gz') as archive:
        for member in archive:
            name = member.name
            path = PurePosixPath(name)
            if (not member.isfile() or path.is_absolute() or '..' in path.parts or
                    '\\' in name or name in seen or
                    not (name == 'manifest.json' or name.startswith('site/'))):
                raise ValueError(f'Unsafe archive entry: {name}')
            seen.add(name)
            size += member.size
            if size > 1024**3 or len(seen) > 10000:
                raise ValueError('Deployment exceeds 1 GiB or 10000 files')
            member.mode = 0o644
            archive.extract(member, destination, filter='data')
    manifest = json.loads((destination / 'manifest.json').read_text())
    site = destination / 'site'
    site.mkdir(exist_ok=True)
    for name, expected in manifest.items():
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or '\\' in name or not re.fullmatch('[a-f0-9]{64}', expected):
            raise ValueError(f'Unsafe manifest entry: {name}')
        file = site / name
        if not file.exists() and previous is not None:
            original = previous / name
            if not original.resolve().is_relative_to(previous) or file_hash(original) != expected:
                raise ValueError(f'Cannot reuse previous file: {name}')
            file.parent.mkdir(parents=True, exist_ok=True)
            # Only missing files are linked; changed files never overwrite a previous release's inode.
            try:
                os.link(original, file)
            except PermissionError:
                shutil.copy2(original, file)
    actual = {file.relative_to(site).as_posix() for file in site.rglob('*') if file.is_file()}
    if actual != set(manifest):
        raise ValueError('File list does not match manifest')
    for name, expected in manifest.items():
        if file_hash(site / name) != expected:
            raise ValueError(f'Hash mismatch: {name}')
    for name in ['index.html', 'posts/index.html', 'tags/index.html',
                 'categories/index.html', 'archives/index.html', 'draco/draco_decoder.wasm']:
        if name not in manifest:
            raise ValueError(f'Missing required file: {name}')
    return manifest


def replace_link(target, link):
    temporary = link.with_name(link.name + '.next')
    temporary.symlink_to(target, target_is_directory=True)
    temporary.replace(link)


def probe(manifest):
    names = ['index.html', 'posts/index.html', 'tags/index.html',
             'categories/index.html', 'archives/index.html', 'draco/draco_decoder.wasm']
    names += sorted(name for name in manifest if name.startswith('posts/') and name.endswith('/index.html'))[:1]
    for name in names:
        data = subprocess.check_output([
            'curl', '--fail', '--silent', '--show-error', '--max-time', '20',
            '--resolve', 'blog.withdong02.top:443:127.0.0.1',
            'https://blog.withdong02.top/' + quote(name, safe='/'),
        ])
        if hashlib.sha256(data).hexdigest() != manifest[name]:
            raise ValueError(f'Live response differs: {name}')


def deploy(root, command, stream):
    match = re.fullmatch(r'deploy ([a-f0-9]{40}) ([1-9][0-9]*) ([1-9][0-9]*)', command)
    if not match:
        raise ValueError('Expected deploy <commit-sha> <run-id> <attempt>')
    revision, run, attempt = match.groups()
    release = root / 'releases' / f'{revision}-{run}-{attempt}'
    release.mkdir()
    current = root / 'current'
    previous = current.resolve(strict=True)
    manifest = unpack(stream, release, previous)
    replace_link(previous, root / 'previous')
    replace_link(release / 'site', current)
    try:
        probe(manifest)
    except Exception:
        replace_link(previous, current)
        print(f'Rolled back to {previous}', file=sys.stderr)
        raise
    print(f'Deployed {revision}: {len(manifest)} verified files; previous={previous}')


if __name__ == '__main__':
    if len(sys.argv) in (2, 3) and sys.argv[1] == 'pack':
        previous = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv) == 3 else None
        package(Path('dist'), Path('.tmp/site.tar.gz'), previous)
    elif sys.argv[1:] == ['receive']:
        import fcntl
        root = Path('/var/www/papercraft')
        command = os.environ.get('SSH_ORIGINAL_COMMAND', '')
        if command == 'manifest':
            print((root / 'current').resolve(strict=True).parent.joinpath('manifest.json').read_text())
        else:
            with (root / '.deploy.lock').open('a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                deploy(root, command, sys.stdin.buffer)
    else:
        sys.exit('Usage: deploy-site.py pack [previous-manifest.json]|receive')
