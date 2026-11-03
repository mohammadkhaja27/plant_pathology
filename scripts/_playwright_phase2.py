"""Browser verification of Phase 2 UI features via Playwright (system Chrome)."""
from pathlib import Path
import time

PROBE = Path("tests/probe_set/author_sample_apple_scab.jpg")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://localhost:3000"


def run():
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME, headless=True, args=["--no-sandbox"]
        )
        ctx = browser.new_context()
        page = ctx.new_page()

        errors = []

        def on_console(msg):
            if msg.type == "error":
                errors.append(f"[{msg.type}] {msg.text}")

        page.on("console", on_console)

        # ── 1. Scan page loads ──────────────────────────────────────────────
        page.goto(f"{BASE}/scan", wait_until="networkidle")
        print("scan page title:", page.title())

        # Upload probe image
        page.set_input_files('input[type="file"]', str(PROBE))
        page.wait_for_timeout(500)

        # Click analyze
        btn = page.get_by_role("button", name="Analyze")
        btn.click()
        page.wait_for_timeout(8000)  # inference takes a few seconds

        # Check result appears
        try:
            page.wait_for_selector('[data-testid="treatment-panel"]', timeout=15000)
            print("PASS treatment panel visible")
        except Exception:
            print("FAIL treatment panel not found")

        # Check feedback panel present (for non-demo result)
        try:
            page.wait_for_selector('[data-testid="feedback-panel"]', timeout=5000)
            print("PASS feedback panel visible")
        except Exception:
            print("FAIL feedback panel not found")

        # Check PDF/print button
        if page.get_by_text("Download Report").count():
            print("PASS Download Report button visible")
        else:
            print("FAIL Download Report button missing")

        # ── 2. History page ─────────────────────────────────────────────────
        page.goto(f"{BASE}/history", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Analytics section
        if page.get_by_text("Scan Analytics").count():
            print("PASS Scan Analytics section visible")
        else:
            print("FAIL Scan Analytics section missing")

        # Filter button
        if page.get_by_role("button", name="Filters").count():
            print("PASS Filters button visible")
        else:
            print("FAIL Filters button missing")

        # Click filters -> panel expands
        page.get_by_role("button", name="Filters").click()
        page.wait_for_timeout(500)
        if page.locator('[data-testid="history-filters"]').count():
            print("PASS filter panel expands")
        else:
            print("FAIL filter panel did not expand")

        # History row present
        if page.locator("tbody tr").count() > 0:
            print("PASS history table has rows")
        else:
            print("FAIL history table empty")

        # Delete button on row
        del_btns = page.locator('[aria-label^="Delete history entry"]')
        if del_btns.count():
            print("PASS delete buttons visible")
        else:
            print("FAIL delete buttons missing")

        # ── 3. Model page ───────────────────────────────────────────────────
        page.goto(f"{BASE}/model", wait_until="networkidle")
        page.wait_for_timeout(2000)
        if page.get_by_text("Performance").count():
            print("PASS Performance section on model page")
        else:
            print("FAIL Performance section missing")
        if page.get_by_text("0.061").count():
            print("PASS macro precision 0.061 shown")
        else:
            print("FAIL macro precision not displayed")

        # ── Summary ─────────────────────────────────────────────────────────
        print(f"\nConsole errors (Error level only): {len(errors)}")
        for e in errors[:5]:
            print(" ", e)

        browser.close()


if __name__ == "__main__":
    run()