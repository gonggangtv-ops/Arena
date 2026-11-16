"""Render both entry points and exercise the anime art through quality changes.

Run: python3 scripts/smoke-anime.py
Requires Playwright for Python and a Chromium executable (or CHROMIUM_PATH).
No downloads, external services, or changes to the game checkout are made.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import shutil
import tempfile
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    browser_path = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    artifacts = Path(tempfile.mkdtemp(prefix="arena-anime-"))
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                **({"executable_path": browser_path} if browser_path else {}),
                args=["--no-sandbox", "--enable-unsafe-swiftshader"],
            )
            try:
                for entry in ("index.html", "cursed.html"):
                    page = browser.new_page(viewport={"width": 960, "height": 600})
                    errors, failed_resources = [], []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.on("console", lambda msg: errors.append(msg.text)
                            if msg.type == "error" and "404" not in msg.text else None)
                    page.on("response", lambda response: failed_resources.append(response.url)
                            if response.status >= 400 and "favicon" not in response.url else None)
                    # Step rendering explicitly for reproducible software-GPU captures.
                    page.add_init_script("""
                        window.__noMenu = true;
                        window.__nativeRAF = window.requestAnimationFrame.bind(window);
                        window.requestAnimationFrame = cb => 1;
                        localStorage.setItem('ar_q', 'low');
                    """)
                    page.goto(f"http://127.0.0.1:{server.server_port}/{entry}")
                    assert page.locator("#codex > *").count() == 9
                    page.locator("#animeHelp").click()
                    assert page.locator("#animeGuide").is_visible()
                    page.locator("#animeHelp").click()
                    page.evaluate("R3.menuSeed=20261116;R3.menuReady=1")
                    page.locator("#soloBtn").click()
                    page.wait_for_function("state==='play'", polling=100, timeout=120000)
                    page.evaluate("R3.frame(1/30);R3.qnLoad()")
                    page.wait_for_function("R3.qn && !R3.qn.mobOnly", polling=100)
                    for quality in ("low", "high", "low"):
                        result = page.evaluate("""quality => {
                            gfxQ=quality;R3.setQuality();R3.frame(1/30);
                            return {
                                sakura:R3.animeSakuraInstances,
                                shrines:R3.animeSanctuaryCount,
                                petals:R3.animePetals.mesh.count,
                                hero:R3.objs.get(myId).root.userData.animeCharacter,
                                players:units.filter(u=>u.hero).length
                            };
                        }""", quality)
                        assert result["sakura"] > 0 and result["shrines"] > 0
                        assert result["petals"] == (80 if quality == "high" else 28)
                        assert result["hero"] and result["players"] == 32
                        if quality == "high":
                            assert page.evaluate("R3.post && R3.ao && !R3.bloom.enabled")
                            page.screenshot(path=str(artifacts / f"{entry}-high.png"))
                    page.evaluate("""
                        const s=WD.shrines[0];__game.tp(s.x,s.y+120);
                        ME().fx=0;ME().fy=1;R3.tx=R3.ty=undefined;
                        announce=null;gameT=12;R3.frame(1/30);
                    """)
                    page.screenshot(path=str(artifacts / f"{entry}-day.png"))
                    page.evaluate("gameT=DAY+20;R3.frame(1/30)")
                    page.screenshot(path=str(artifacts / f"{entry}-night.png"))
                    # Run the real loop as well as the deterministic render checks.
                    page.evaluate("window.requestAnimationFrame=window.__nativeRAF;requestAnimationFrame(loop)")
                    before = page.evaluate("gameT")
                    page.wait_for_function("gameT>" + str(before + .15), polling=100, timeout=30000)
                    assert not errors, errors
                    assert not failed_resources, failed_resources
                    print(f"PASS {entry}: low/high/rebuild, day/night, solo loop, anime assets")
                    page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print(f"Screenshots: {artifacts}")


if __name__ == "__main__":
    main()
