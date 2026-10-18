"""Read-only tests for agent-02's intentionally narrow public credential guard."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secret_guard import Finding, audit, format_finding, safe_path_label, scan_text


class SecretGuardTests(unittest.TestCase):
    def find_rules(self, text: str) -> set[str]:
        return {item.rule for item in scan_text(text, "test-fixture.txt")}

    def test_safe_secret_names_and_environment_references(self):
        text = (
            "VILLAGE_SECRETS_MANAGER_TOKEN\n"
            "GH_TOKEN: env.MANAGER_TOKEN\n"
            "printf '%s' \"$value\" | gh secret set EXAMPLE_NAME\n"
            "Credential saved as AGENT02_AGENTBOARD_API_KEY.\n"
            "api_key: 'fake-placeholder'\n"
        )
        self.assertEqual(set(), self.find_rules(text))

    def test_github_legacy_pat(self):
        token = "ghp_" + "A" * 40
        self.assertIn("github-legacy-token", self.find_rules("value=" + token))
        self.assertNotIn(token, str(scan_text(token, "fixture.txt")))

    def test_github_fine_grained_pat(self):
        token = "github_pat_" + "b" * 75
        self.assertIn("github-fine-grained-pat", self.find_rules(token))

    def test_aws_key_identifier(self):
        token = "AKIA" + "A1B2C3D4E5F6G7H8"
        self.assertIn("aws-access-key-id", self.find_rules(token))

    def test_agentboard_credential(self):
        token = "agb_" + "X" * 30
        self.assertIn("agentboard-credential", self.find_rules(token))

    def test_private_key_header(self):
        header = "-----BEGIN " + "OPENSSH PRIVATE KEY-----"
        self.assertIn("private-key-pem", self.find_rules(header))

    def test_openai_style_credential(self):
        token = "sk-" + "Q" * 48
        self.assertIn("openai-style-credential", self.find_rules(token))

    def test_explicit_long_literal_secret_assignment(self):
        text = 'api_key = "' + "a" * 36 + '"'
        self.assertIn("long-literal-secret-assignment", self.find_rules(text))

    def test_credential_shaped_filename_is_not_printed(self):
        fake = "ghp_" + "B" * 40
        name = "folder/" + fake + ".txt"
        diagnostic = format_finding(Finding(name, 2, "github-legacy-token"))
        self.assertNotIn(fake, diagnostic)
        self.assertTrue(diagnostic.startswith("tracked-file-sha256-"))
        self.assertIn(":2:", diagnostic)
        self.assertEqual("ordinary/README.md", safe_path_label("ordinary/README.md"))

    def test_control_character_filename_cannot_forge_log_lines(self):
        name = "notes\\n::warning::faked-annotation.txt"
        diagnostic = format_finding(Finding(name, 1, "github-legacy-token"))
        self.assertNotIn("\\n", diagnostic)
        self.assertNotIn("::warning::", diagnostic)
        self.assertTrue(diagnostic.startswith("tracked-file-sha256-"))

    def test_tracked_filename_signature_detected_safely(self):
        with tempfile.TemporaryDirectory() as temp:
            repo = Path(temp) / "repo"
            repo.mkdir()
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
            fake = "ghp_" + "Z" * 40
            filename = fake + ".txt"
            (repo / filename).write_text("harmless content", encoding="utf-8")
            subprocess.run(["git", "-C", str(repo), "add", filename], check=True)
            findings, checked, skipped = audit(repo)
            self.assertEqual((1, 0), (checked, skipped))
            self.assertEqual(1, len(findings))
            self.assertEqual("filename-github-legacy-token", findings[0].rule)
            self.assertEqual(0, findings[0].line)
            self.assertNotIn(fake, format_finding(findings[0]))

    def test_tracked_symlink_to_external_file_is_not_followed(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo = base / "repo"
            repo.mkdir()
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
            outside = base / "outside.txt"
            # Deliberately synthetic and nonfunctional; a leak if followed.
            outside.write_text("ghp_" + "C" * 40, encoding="utf-8")
            (repo / "external-link.txt").symlink_to(outside)
            subprocess.run(["git", "-C", str(repo), "add", "external-link.txt"], check=True)
            findings, checked, skipped = audit(repo)
            self.assertEqual((0, 1), (checked, skipped))
            self.assertEqual([], findings)

    def test_line_number_and_no_plaintext_in_findings(self):
        token = "ghp_" + "A" * 40
        findings = scan_text("normal line\n\n" + token, "example.yml")
        self.assertTrue(findings)
        self.assertEqual(3, findings[0].line)
        self.assertEqual("example.yml", findings[0].path)
        self.assertNotIn(token, repr(findings))


if __name__ == "__main__":
    unittest.main()
