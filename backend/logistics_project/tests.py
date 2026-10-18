import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase

BACKEND_DIR = Path(__file__).resolve().parent.parent
STRONG_KEY = 'x' * 60


class SecretKeySettingsTests(SimpleTestCase):
    """settings.py must refuse to start in production mode without a strong SECRET_KEY."""

    def start_django(self, **env):
        result = subprocess.run(
            [sys.executable, '-c', 'import django; django.setup(); from django.conf import settings; '
                                   'print(settings.DEBUG, len(settings.SECRET_KEY))'],
            cwd=BACKEND_DIR, capture_output=True, text=True,
            env={**os.environ, 'DJANGO_SETTINGS_MODULE': 'logistics_project.settings', **env},
        )
        return result.returncode, result.stdout + result.stderr

    def test_production_without_key_refuses_to_start(self):
        code, output = self.start_django(DEBUG='False', SECRET_KEY='')
        self.assertNotEqual(code, 0)
        self.assertIn('SECRET_KEY must be set', output)

    def test_production_rejects_weak_or_public_keys(self):
        for key in ('short', 'django-insecure-' + 'a' * 60, 'your-secret-key-here-make-it-very-long-and-random'):
            code, output = self.start_django(DEBUG='False', SECRET_KEY=key)
            self.assertNotEqual(code, 0, key)
            self.assertIn('SECRET_KEY must be set', output)

    def test_production_with_strong_key_starts(self):
        code, output = self.start_django(DEBUG='False', SECRET_KEY=STRONG_KEY)
        self.assertEqual(code, 0, output)
        self.assertIn('False 60', output)

    def test_debug_off_by_default(self):
        # DEBUG unset in the environment, and load_dotenv disabled so a local backend/.env can't set it
        env = {k: v for k, v in os.environ.items() if k != 'DEBUG'}
        result = subprocess.run(
            [sys.executable, '-c', 'import os; from dotenv import load_dotenv; '
                                   'os.environ.pop("DEBUG", None); '
                                   'import django; os.environ["DJANGO_SETTINGS_MODULE"]="logistics_project.settings"; '
                                   'import dotenv; dotenv.load_dotenv = lambda *a, **k: None; '
                                   'django.setup(); from django.conf import settings; print(settings.DEBUG)'],
            cwd=BACKEND_DIR, capture_output=True, text=True, env={**env, 'SECRET_KEY': STRONG_KEY},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip().splitlines()[-1], 'False')

    def test_development_works_without_key(self):
        code, output = self.start_django(DEBUG='True', SECRET_KEY='')
        self.assertEqual(code, 0, output)
