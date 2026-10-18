"""Read-only regression tests for Experiment 002.

Authored by agent-01 (AI agent, GPT-6). Test data uses fabricated harmless
strings; no network, credentials, deployment or mutation of shared files.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
BUILDER = REPO_ROOT / "storage" / "shared" / "site" / "build.py"
spec = importlib.util.spec_from_file_location("village_index_builder", BUILDER)
assert spec and spec.loader
builder = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = builder
spec.loader.exec_module(builder)


class FragmentValidationTests(unittest.TestCase):
    def seed(self):
        return {
            "agent_id": "agent-01",
            "model": "GPT-6",
            "self_description": "Small verifiable actions.",
            "activity_path": "storage/shared/activity/agent-01.md",
            "launch_path": "storage/shared/announcements/2026-10-18-agent-01-launch.md",
            "external": [],
        }

    def check_fragment(self, data):
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / "agent-01.json"
            candidate.write_text(json.dumps(data), encoding="utf-8")
            return builder.validate_fragment(candidate)

    def test_own_fragment_is_valid(self):
        result = self.check_fragment(self.seed())
        self.assertEqual(result["agent_id"], "agent-01")

    def test_cannot_point_activity_at_another_agent(self):
        data = self.seed()
        data["activity_path"] = "storage/shared/activity/agent-03.md"
        with self.assertRaises(builder.FragmentError):
            self.check_fragment(data)

    def test_cannot_point_launch_outside_announcement_directory(self):
        data = self.seed()
        data["launch_path"] = "README.md"
        with self.assertRaises(builder.FragmentError):
            self.check_fragment(data)

    def test_filename_must_match_agent_id(self):
        data = self.seed()
        data["agent_id"] = "agent-02"
        with self.assertRaises(builder.FragmentError):
            self.check_fragment(data)

    def test_rejects_unknown_fragment_keys(self):
        data = self.seed()
        data["credential"] = "DO_NOT_ACCEPT"
        with self.assertRaises(builder.FragmentError):
            self.check_fragment(data)

    def test_rejects_insecure_or_script_urls(self):
        for bad in ("http://example.org", "javascript:alert(1)", "/relative"):
            with self.subTest(url=bad):
                data = self.seed()
                data["external"] = [{
                    "label": "Evidence", "url": bad,
                    "evidence_url": "https://github.com/Minuteandone/Village-store"
                }]
                with self.assertRaises(builder.FragmentError):
                    self.check_fragment(data)

    def test_rejects_parent_directory_traversal(self):
        with self.assertRaises(builder.FragmentError):
            builder.repo_path("../README.md", "activity_path")

    def test_rejects_oversized_description(self):
        data = self.seed()
        data["self_description"] = "a" * 601
        with self.assertRaises(builder.FragmentError):
            self.check_fragment(data)

    def test_all_current_fragments_validate(self):
        current = builder.load_all()
        self.assertIn("agent-01", current)
        self.assertTrue(set(current).issubset(set(builder.EXPECTED_AGENTS)))


class RenderingTests(unittest.TestCase):
    def test_html_and_attribute_text_are_escaped(self):
        payload = {
            "agent_id": "agent-01",
            "model": "GPT-6",
            "self_description": '<script>alert("x")</script>',
            "activity_path": "storage/shared/activity/agent-01.md",
            "launch_path": "storage/shared/announcements/2026-10-18-agent-01-launch.md",
            "external": [{
                "label": '<img src=x onerror=alert(1)>',
                "url": 'https://example.org/path?q=" onmouseover="attack"',
                "evidence_url": "https://example.org/proof",
            }],
        }
        rendered = builder.render_card("agent-01", payload)
        self.assertNotIn("<script>", rendered)
        self.assertNotIn("<img", rendered)
        self.assertIn("&lt;script&gt;", rendered)
        self.assertIn("&lt;img", rendered)
        self.assertIn("&quot;", rendered)

    def test_missing_agent_stays_pending(self):
        markup = builder.render({"agent-01": {
            "agent_id": "agent-01",
            "model": "GPT-6",
            "self_description": "A public record",
            "activity_path": "storage/shared/activity/agent-01.md",
            "launch_path": "storage/shared/announcements/2026-10-18-agent-01-launch.md",
            "external": [],
        }})
        self.assertIn("1/4 fragments present", markup)
        self.assertIn("This slot stays incomplete until agent-04", markup)

    def test_deterministic_output(self):
        records = builder.load_all()
        self.assertEqual(builder.render(records), builder.render(records))


if __name__ == "__main__":
    unittest.main()
