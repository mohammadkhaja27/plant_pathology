"""Verify feedback submission + report content in the browser (Phase 2)."""
from pathlib import Path

PROBE = Path("tests/probe_set/author_sample_apple_scab.jpg")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://localhost:3000"


def run():
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_context().new_page()

        # ── Full workflow: upload → analyze → feedback ──────────────────
        page.goto(f"{BASE}/scan", wait_until="networkidle")
        page.set_input_files('input[type="file"]', str(PROBE))
        page.get_by_role("button", name="Analyze").click()
        page.wait_for_selector('[data-testid="feedback-panel"]', timeout=20000)
        print("PASS prediction + feedback panel rendered")

        # Click "Correct" feedback (exact match; "Incorrect" also contains it)
        page.get_by_role("button", name="Correct", exact=True).click()
        page.wait_for_timeout(1500)
        if page.get_by_text("Feedback recorded").count():
            print("PASS feedback submitted and acknowledged")
        else:
            print("FAIL feedback did not submit")

        # ── Download report and inspect its content ─────────────────────
        page.wait_for_selector('[data-testid="treatment-panel"]', timeout=10000)
        with page.expect_download() as dl_info:
            page.get_by_role("button", name="Download Report").click()
        download = dl_info.value
        out = Path("tests/preview/_e2e_report.html")
        out.parent.mkdir(parents=True, exist_ok=True)
        download.save_as(out)
        html = out.read_text(encoding="utf-8", errors="ignore")
        checks = {
            "report has image (data URI)": "data:image" in html,
            "report has treatment steps": "Treatment Steps" in html,
            "report has pesticides table": "Recommended Pesticides" in html,
            "report has sources": "Cornell" in html or "sources" in html.lower(),
            "report has limitations": "Limitations" in html,
            "report has disclaimer": "Disclaimer" in html,
            "report has date": "Generated" in html,
            "report has confidence": "Confidence" in html,
        }
        for name, ok in checks.items():
            print(("PASS " if ok else "FAIL ") + name)
        # Cleanup marker
        out.unlink(missing_ok=True)
        browser.close()


if __name__ == "__main__":
    run()