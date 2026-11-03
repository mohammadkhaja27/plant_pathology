"""Capture evidence screenshots of the new Phase 2 UI."""
from pathlib import Path

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://localhost:3000"
OUT = Path("tests/preview")


def run():
    from playwright.sync_api import sync_playwright
    PROBE = Path("tests/probe_set/author_sample_apple_scab.jpg")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_context(viewport={"width": 1366, "height": 900}).new_page()
        out = Path("tests/preview")
        out.mkdir(parents=True, exist_ok=True)

        # History page: analytics + expanded filters
        page.goto(f"{BASE}/history", wait_until="networkidle")
        page.wait_for_timeout(1500)
        page.get_by_role("button", name="Filters").click()
        page.wait_for_timeout(800)
        page.screenshot(path=str(out / "06-history-analytics-filters.png"), full_page=True)
        print("saved 6-history-analytics-filters.png")

        # Scan page with prediction + feedback panel
        page.goto(f"{BASE}/scan", wait_until="networkidle")
        page.set_input_files('input[type="file"]', str(PROBE))
        page.get_by_role("button", name="Analyze").click()
        page.wait_for_selector('[data-testid="feedback-panel"]', timeout=20000)
        page.locator('[data-testid="feedback-panel"]').scroll_into_view_if_needed()
        page.screenshot(path=str(out / "07-feedback-panel.png"), full_page=False)
        print("saved 07-feedback-panel.png")

        browser.close()


if __name__ == "__main__":
    run()