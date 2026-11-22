"""Exercise real archives and release switching without touching production."""
import importlib.util
import io
import json
import os
import sys
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True

workspace = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('deploy_site', workspace / 'scripts/deploy/deploy-site.py')
deploy_site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy_site)


class DeploySiteCheck(unittest.TestCase):
    def setUp(self):
        (workspace / '.tmp/checks').mkdir(parents=True, exist_ok=True)
        self.base = Path(tempfile.mkdtemp(prefix='deploy-check-', dir=workspace / '.tmp/checks'))
        self.source = self.base / 'source'
        for name in ['index.html', 'posts/index.html', 'tags/index.html',
                     'categories/index.html', 'archives/index.html', 'draco/draco_decoder.wasm']:
            file = self.source / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(name.encode())
        self.archive = self.base / 'site.tar.gz'
        deploy_site.package(self.source, self.archive)

    def test_integrity_and_traversal(self):
        good = self.base / 'good'
        good.mkdir()
        with self.archive.open('rb') as stream:
            manifest = deploy_site.unpack(stream, good)
        self.assertEqual(len(manifest), 6)
        for name, link in [('site/../../escaped', False), ('site/link', True)]:
            stream = io.BytesIO()
            with tarfile.open(fileobj=stream, mode='w:gz') as archive:
                info = tarfile.TarInfo(name)
                if link:
                    info.type = tarfile.SYMTYPE
                    info.linkname = '/etc'
                archive.addfile(info)
            stream.seek(0)
            with self.assertRaisesRegex(ValueError, 'Unsafe archive'):
                deploy_site.unpack(stream, self.base / 'unsafe')
        self.assertFalse((self.base / 'escaped').exists())

    def test_corrupt_manifest_and_command(self):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as archive:
            for name, data in [('site/index.html', b'changed'),
                               ('manifest.json', json.dumps({'index.html': '0' * 64}).encode())]:
                info = tarfile.TarInfo(name)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
        stream.seek(0)
        with self.assertRaisesRegex(ValueError, 'Hash mismatch'):
            deploy_site.unpack(stream, self.base / 'corrupt')
        with self.assertRaisesRegex(ValueError, 'Expected deploy'):
            deploy_site.deploy(self.base, 'deploy ../../etc; whoami', io.BytesIO())

    @unittest.skipIf(os.name == 'nt', 'Incremental hardlinks run on the Linux server')
    def test_incremental_files_and_immutable_previous(self):
        old = self.base / 'old'
        old.mkdir()
        with self.archive.open('rb') as stream:
            manifest = deploy_site.unpack(stream, old)
        previous = old / 'site'
        (previous / 'retired.txt').write_text('Not in the new build')
        (self.source / 'index.html').write_bytes(b'new homepage')
        delta = self.base / 'delta.tar.gz'
        deploy_site.package(self.source, delta, manifest)
        with tarfile.open(delta) as archive:
            self.assertEqual(archive.getnames(), ['site/index.html', 'manifest.json'])
        new = self.base / 'new'
        new.mkdir()
        with delta.open('rb') as stream:
            deploy_site.unpack(stream, new, previous)
        self.assertEqual((previous / 'index.html').read_bytes(), b'index.html')
        self.assertEqual((new / 'site/index.html').read_bytes(), b'new homepage')
        self.assertFalse((new / 'site/retired.txt').exists())
        self.assertEqual((previous / 'tags/index.html').stat().st_ino,
                         (new / 'site/tags/index.html').stat().st_ino)
        copied = self.base / 'copied'
        copied.mkdir()
        with delta.open('rb') as stream, patch.object(deploy_site.os, 'link', side_effect=PermissionError):
            deploy_site.unpack(stream, copied, previous)
        self.assertEqual((copied / 'site/tags/index.html').read_bytes(), b'tags/index.html')

    @unittest.skipIf(os.name == 'nt', 'Release symlinks run on the Linux server')
    def test_switch_and_rollback(self):
        root = self.base / 'hosting'
        (root / 'releases').mkdir(parents=True)
        old = root / 'releases/old'
        old.mkdir()
        (root / 'current').symlink_to(old)
        command = 'deploy ' + 'a' * 40 + ' 123 1'
        with self.archive.open('rb') as stream, patch.object(deploy_site, 'probe') as probe:
            deploy_site.deploy(root, command, stream)
        probe.assert_called_once()
        current = (root / 'current').resolve()
        self.assertEqual((root / 'previous').resolve(), old)
        self.assertEqual((current / 'index.html').read_bytes(), b'index.html')
        with self.archive.open('rb') as stream, patch.object(deploy_site, 'probe', side_effect=RuntimeError('probe failed')):
            with self.assertRaisesRegex(RuntimeError, 'probe failed'):
                deploy_site.deploy(root, command[:-1] + '2', stream)
        self.assertEqual((root / 'current').resolve(), current)


if __name__ == '__main__':
    unittest.main()
