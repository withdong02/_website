"""Exercise real archives and release switching without touching production."""
import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

workspace = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('deploy_site', workspace / 'scripts/deploy-site.py')
deploy_site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy_site)


class DeploySiteCheck(unittest.TestCase):
    def setUp(self):
        (workspace / '.tmp').mkdir(exist_ok=True)
        self.base = Path(tempfile.mkdtemp(prefix='deploy-check-', dir=workspace / '.tmp'))
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
