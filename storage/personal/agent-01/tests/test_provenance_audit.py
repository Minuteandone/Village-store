"""Regression tests for agent-01's read-only Git provenance auditor.

Uses disposable local repositories, no API calls, authentication, or pushes.
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "storage/personal/agent-01/tools/provenance_audit.py"
spec = importlib.util.spec_from_file_location("village_provenance_audit", SOURCE)
assert spec is not None and spec.loader is not None
auditor = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = auditor
spec.loader.exec_module(auditor)

FRAGMENT = Path("storage/shared/site/fragments/agent-01.json")


class ProvenanceGitHistoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="village-provenance-test-")
        self.repo = Path(self.tmp.name)
        self.command("init", "-q")
        self.command("config", "user.name", "Village Test Fixture")
        self.command("config", "user.email", "fixture@example.invalid")
        self.write("README.md", "# Disposable git fixture\n")
        self.commit("[fixture] Repository initialized")

    def tearDown(self):
        self.tmp.cleanup()

    def command(self, *args):
        done = subprocess.run(
            ["git", "-C", str(self.repo), *args],
            text=True, capture_output=True, check=True
        )
        return done.stdout.strip()

    def write(self, path, text):
        dst = self.repo / path
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(text, encoding="utf-8")

    def commit(self, subject):
        self.command("add", "--all")
        self.command("commit", "-q", "-m", subject)
        return self.command("rev-parse", "HEAD")

    def first(self):
        with patch.object(auditor, "REPO", self.repo):
            return auditor.first_commit(FRAGMENT)

    def test_introducing_commit_selected_for_normal_history(self):
        expected = "[agent-01 | AI] Introduce fragment"
        self.write(FRAGMENT, '{"agent_id":"agent-01"}\n')
        initial = self.commit(expected)
        self.write(FRAGMENT, '{"agent_id":"agent-01","revision":2}\n')
        self.commit("[agent-02 | AI] Mechanical modification")
        result = self.first()
        self.assertIsNotNone(result)
        self.assertEqual(result["sha"], initial)
        self.assertEqual(result["subject"], expected)
        self.assertEqual(result["claimed_agent"], "agent-01")

    def test_deleted_and_readded_fragment_uses_earliest_addition(self):
        self.write(FRAGMENT, "{}\n")
        first_sha = self.commit("[agent-01 | AI] Original introduction")
        self.command("rm", "--", str(FRAGMENT))
        self.commit("[fixture] Delete fragment")
        self.write(FRAGMENT, '{"again":true}\n')
        second_sha = self.commit("[agent-02 | AI] Re-add the same path")
        self.assertNotEqual(first_sha, second_sha)
        result = self.first()
        self.assertIsNotNone(result)
        self.assertEqual(result["sha"], first_sha)
        self.assertEqual(result["claimed_agent"], "agent-01")

    def test_absent_fragment_has_no_introduction(self):
        self.assertIsNone(self.first())

    def test_nonconforming_subject_is_not_misattributed(self):
        self.write(FRAGMENT, "{}\n")
        sha = self.commit("An unlabeled fragment addition")
        result = self.first()
        self.assertEqual(result["sha"], sha)
        self.assertIsNone(result["claimed_agent"])

    def test_missing_agent_files_are_reported_as_missing(self):
        with patch.object(auditor, "REPO", self.repo):
            report = auditor.inspect()
        self.assertEqual(len(report["entries"]), 4)
        self.assertTrue(all(item["status"] == "missing" for item in report["entries"]))
        self.assertTrue(all(item["introduction_label_matches"] is None for item in report["entries"]))


if __name__ == "__main__":
    unittest.main()
