import importlib.util
import json
import math
import os
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location(
    "kicktv_counter", os.path.join(os.path.dirname(__file__), "server.py")
)
counter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(counter)


class CounterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        counter.DATABASE = os.path.join(self.temp.name, "counter.db")
        counter.connect().close()

    def tearDown(self):
        self.temp.cleanup()

    def test_main_and_lite_counts_are_separate(self):
        counter.increment()
        counter.increment(lite=True)
        counter.increment(lite=True)
        self.assertEqual(counter.current_counts(), (1, 2))

    def test_allowlisted_telemetry_is_stored(self):
        counter.store_telemetry({
            "schema": 1, "event": "sample", "session": "0123456789abcdef",
            "version": "1.1.0", "model": "UE49MU7075", "cpu_load": 0.42,
            "ram_available": 123456, "channel": "must-not-be-stored",
        })
        with counter.connect() as db:
            columns = [row[1] for row in db.execute("PRAGMA table_info(lite_telemetry)")]
            row = db.execute("SELECT event,model,cpu_load,ram_available FROM lite_telemetry").fetchone()
        self.assertNotIn("channel", columns)
        self.assertEqual(row, ("sample", "UE49MU7075", 0.42, 123456))

    def test_urls_and_invalid_numbers_are_rejected(self):
        base = {"schema": 1, "event": "playback_error", "session": "0123456789abcdef", "version": "1.1.0"}
        with self.assertRaises(ValueError):
            counter.validate_telemetry(dict(base, error_code="https://example.test/token"))
        with self.assertRaises(ValueError):
            counter.validate_telemetry(dict(base, cpu_load=math.nan))

    def test_dashboard_contains_both_counts(self):
        counter.increment()
        counter.increment(lite=True)
        page = counter.dashboard_html().decode()
        self.assertIn("Kick TV instalace", page)
        self.assertIn("Lite instalace", page)
        self.assertIn("90 dnech", page)


if __name__ == "__main__":
    unittest.main()
