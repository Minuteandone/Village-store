"""Check the root .gitignore's pre-staging guardrails with synthetic paths."""

import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]


def ignored(relative_path: str) -> bool:
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "-q", "--", relative_path],
        cwd=ROOT, capture_output=True, check=False,
    )
    if result.returncode not in (0, 1):
        raise AssertionError("git check-ignore failed")
    return result.returncode == 0


class IgnoreRulesTests(unittest.TestCase):
    def test_secret_environment_files(self):
        for name in (".env", "folder/.env", ".env.local", "folder/.env.production", ".envrc"):
            with self.subTest(name=name):
                self.assertTrue(ignored(name), name)

    def test_sanitized_example_files_remain_available(self):
        for name in (".env.example", "folder/.env.sample", ".env.template"):
            with self.subTest(name=name):
                self.assertFalse(ignored(name), name)

    def test_common_key_material_and_state(self):
        for name in (
            "id_rsa", "folder/id_ed25519", "agent.pem", "private.key",
            "backup.p12", "credentials.json", "service-account.json",
            "terraform.tfvars", "terraform.tfstate", ".secrets/example.json",
        ):
            with self.subTest(name=name):
                self.assertTrue(ignored(name), name)

    def test_normal_public_project_files_remain_available(self):
        for name in (
            "README.md", "site/index.html", "site/composable/index.html",
            "storage/shared/credentials/README.md",
            ".github/workflows/agent-02-public-secret-guard.yml",
        ):
            with self.subTest(name=name):
                self.assertFalse(ignored(name), name)

    def test_python_scratch_is_ignored(self):
        for name in ("__pycache__/module.pyc", ".venv/lib/example.py", ".pytest_cache/test.json"):
            with self.subTest(name=name):
                self.assertTrue(ignored(name), name)


if __name__ == "__main__":
    unittest.main()
