"""Real Moonfall key art, strict boot admission, and cinematic menu layout.

Serve the built deployment tree; never substitute successful image/model fixtures.
Screenshots stay under /tmp. This suite does not change historical UI/UX reports.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import shutil
import tempfile

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'app/src/main/assets'
MODEL_COUNT = len(json.loads((SITE / 'assets/meshy/manifest.json').read_text())['assets'])
# Real manifest models + original QN18 / atlases3 / audio7 / font1 / render1 / art1.
BOOT_TASKS = MODEL_COUNT + 31
OUT = ROOT / 'moonfall-docs/reports/cinematic-ui'
SHOTS = Path(tempfile.mkdtemp(prefix='arena-cinematic-ui-'))
ART = '**/moonfall-key-art.webp'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(
    ('127.0.0.1', 0), partial(Handler, directory=str(SITE)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}'
reports = []


def fresh(browser, width, height, *, mobile=False, reduced=False):
    options = {
        'viewport': {'width': width, 'height': height},
        'is_mobile': mobile,
        'has_touch': mobile,
        'reduced_motion': 'reduce' if reduced else 'no-preference',
    }
    if mobile:
        options['user_agent'] = 'Mozilla/5.0 (Linux; Android 14) Mobile'
    context = browser.new_context(**options)
    page = context.new_page()
    page.set_default_timeout(180000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
    # Retain real loads and a real compile/render, while avoiding an unattended
    # match loop. Polling below is explicitly timer based because RAF is paused.
    page.add_init_script(
        "window.__noMenu=true;window.requestAnimationFrame=cb=>1;"
        "localStorage.setItem('ar_q','low');"
        "localStorage.setItem('ar_sound','off')")
    return page, errors


def go(page):
    page.goto(url + '/cursed.html', wait_until='domcontentloaded', timeout=180000)
    page.wait_for_function('window.MoonfallLoading', polling=100)


def ready(page):
    page.wait_for_function(
        'window.MoonfallLoading&&(MoonfallLoading.isReady()||'
        'MoonfallLoading.snapshot().failed)', polling=100)
    snapshot = page.evaluate('MoonfallLoading.snapshot()')
    assert page.evaluate('MoonfallLoading.isReady()'), snapshot
    assert snapshot['artDone'] == 1, snapshot
    assert snapshot['total'] == BOOT_TASKS, snapshot
    assert page.locator('#loading').is_hidden()
    page.wait_for_function(
        'document.getElementById("menu").dataset.moonfallMenu', polling=100)
    return snapshot


def no_entry(page):
    assert page.locator('#soloBtn').is_disabled()
    assert page.locator('#loading').is_visible()
    assert not page.evaluate('MoonfallLoading.isReady()')
    blocked = page.evaluate("""() => {
      document.getElementById('soloBtn').click();
      hostStartMatch();hostStartMatch2();enterPlay();quickMatch();hostRoom();
      joinRoom('BLOCK','');
      return state==='menu'&&units.length===0&&net.tr===null;
    }""")
    assert blocked, 'A game entry point bypassed the key-art readiness gate'
    return blocked


def no_horizontal_overflow(page, selector):
    bounds = page.evaluate("""selector => {
      const root=document.documentElement,body=document.body;
      const element=document.querySelector(selector);
      return {viewport:innerWidth,document:root.scrollWidth,body:body.scrollWidth,
        local:element.scrollWidth,localWidth:element.clientWidth};
    }""", selector)
    assert bounds['document'] <= bounds['viewport'] + 1, bounds
    assert bounds['body'] <= bounds['viewport'] + 1, bounds
    assert bounds['local'] <= bounds['localWidth'] + 1, bounds
    return bounds


def in_view(page, selector):
    bounds = page.locator(selector).evaluate("""element => {
      const r=element.getBoundingClientRect();
      const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,
        width:r.width,height:r.height,viewportWidth:innerWidth,
        viewportHeight:innerHeight,reachable:!!hit&&element.contains(hit)};
    }""")
    assert bounds['left'] >= -1 and bounds['top'] >= -1, bounds
    assert bounds['right'] <= bounds['viewportWidth'] + 1, bounds
    assert bounds['bottom'] <= bounds['viewportHeight'] + 1, bounds
    assert bounds['width'] >= 44 and bounds['height'] >= 44, bounds
    assert bounds['reachable'], bounds
    return bounds


def uses_key_art(page, selector):
    return page.evaluate("""selector => {
      const root=document.querySelector(selector);
      return [root,...root.querySelectorAll('*')].some(element =>
        (element.tagName==='IMG'&&element.currentSrc.includes('moonfall-key-art.webp'))||
        [null,'::before','::after'].some(pseudo =>
          getComputedStyle(element,pseudo).backgroundImage.includes('moonfall-key-art.webp')));
    }""", selector)


def assert_reduced_motion(page):
    result = page.evaluate("""() => ({
      requested:matchMedia('(prefers-reduced-motion: reduce)').matches,
      activeLoops:document.getAnimations().filter(animation => {
        const target=animation.effect?.target;
        return target instanceof Element&&target.closest('#loading,#menu')&&
          animation.playState==='running'&&
          animation.effect.getComputedTiming().iterations===Infinity;
      }).map(animation => animation.animationName||animation.id||'unnamed')
    })""")
    assert result['requested'], result
    assert not result['activeLoops'], result
    return result


def retained_controls(page, *, mobile):
    """Exercise moved original controls through native keyboard and touch input."""
    name = page.locator('#pname')
    name.fill('MoonfallQA')
    name.press('Tab')
    assert name.input_value() == 'MoonfallQA'
    assert page.evaluate("myName()==='MoonfallQA'&&localStorage.getItem('ar_name')==='MoonfallQA'")

    cloak = page.locator('.moonfall-cloak')
    cloak_summary = cloak.locator('summary')
    target = page.evaluate('(chosenLook+1)%LOOKS.length')
    (cloak_summary.tap if mobile else cloak_summary.click)()
    assert cloak.evaluate('element=>element.open')
    option = page.locator('#looks .look').nth(target)
    (option.tap if mobile else option.click)()
    selected = page.evaluate("""target => ({
      chosen:chosenLook,stored:localStorage.getItem('ar_look'),
      selected:[...document.querySelectorAll('#looks .look')].map((button,index)=>
        ({index,pressed:button.getAttribute('aria-pressed'),selected:button.classList.contains('sel')}))
    })""", target)
    assert selected['chosen'] == target and selected['stored'] == str(target), selected
    assert all(button['pressed'] == ('true' if button['index'] == target else 'false')
               and button['selected'] == (button['index'] == target)
               for button in selected['selected']), selected
    no_horizontal_overflow(page, '#menu')
    (cloak_summary.tap if mobile else cloak_summary.click)()
    assert not cloak.evaluate('element=>element.open')

    settings = page.locator('#moonfallMenuSettings')
    summary = settings.locator(':scope > summary')
    summary.focus()
    summary.press('Enter')
    assert settings.evaluate('element=>element.open')
    retained = page.evaluate("""() => ['viewBtn','qBtn','fuseBtn','camBtn','toneBtn','aoBtn','sndBtn'].map(id=>{
      const button=document.getElementById(id);
      return {id,unique:document.querySelectorAll('#'+id).length===1,
        insideSettings:!!button.closest('#moonfallMenuSettings'),
        enabled:!button.disabled,originalHandler:typeof button.onclick==='function'};
    })""")
    assert all(item['unique'] and item['insideSettings'] and item['enabled']
               and item['originalHandler'] for item in retained), retained
    camera = page.locator('#camBtn')
    old_camera = page.evaluate('camNear')
    (camera.tap if mobile else camera.click)()
    assert page.evaluate('camNear') != old_camera
    (camera.tap if mobile else camera.click)()
    assert page.evaluate('camNear') == old_camera
    summary.focus()
    summary.press('Space')
    assert not settings.evaluate('element=>element.open')

    guide = page.locator('#moonfallWeaponGuide')
    guide_summary = guide.locator(':scope > summary')
    (guide_summary.tap if mobile else guide_summary.click)()
    assert guide.evaluate('element=>element.open')
    assert page.locator('#codex .wcard').count() == 9
    assert page.locator('#codex .moonfall-menu-skill').count() == 27
    (guide_summary.tap if mobile else guide_summary.click)()
    assert not guide.evaluate('element=>element.open')
    page.evaluate("document.getElementById('menu').scrollTop=0;getSelection()?.removeAllRanges()")
    page.locator('#soloBtn').focus()
    in_view(page, '#soloBtn')
    return {'nameEditableAndSaved': True, 'nativeDetailsKeyboardAndTouch': True,
            'cloakSelection': selected, 'settings': retained,
            'cameraHandlerRetained': True, 'weaponCards': 9, 'skillIcons': 27}


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=shutil.which('chromium'),
            args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        for name, width, height, mobile, reduced in [
            ('desktop', 1100, 700, False, False),
            ('landscape', 844, 390, True, False),
            ('portrait', 390, 844, True, False),
            ('reduced-motion', 844, 390, True, True),
        ]:
            page, errors = fresh(browser, width, height, mobile=mobile,
                                 reduced=reduced)
            held = []
            page.route(ART, lambda route: held.append(route))
            go(page)
            # Every other downloadable resource is real and ready. A held image
            # must still prevent admission even when no model/audio work remains.
            page.wait_for_function("""modelCount => {
              const boot=MoonfallLoading.snapshot();
              return boot.packDone===18&&boot.musicDone===7&&
                CelestialAssets.snapshot().assets.length===modelCount&&
                CelestialAssets.snapshot().assets.every(asset=>asset.state==='loaded')&&
                MoonfallUI.snapshot().state==='loaded'&&document.fonts.status==='loaded';
            }""", arg=MODEL_COUNT, polling=100)
            assert held, 'The required key-art URL was never requested'
            pending = page.evaluate('MoonfallLoading.snapshot()')
            assert pending['artDone'] == 0 and not pending['failed'], pending
            blocked = no_entry(page)
            assert int(page.locator('#moonfallLoadProgress').get_attribute(
                'aria-valuenow')) < 100
            assert uses_key_art(page, '#loading')
            no_horizontal_overflow(page, '#loading')
            if reduced:
                assert_reduced_motion(page)
            page.screenshot(path=str(SHOTS / f'loading-{name}.png'), scale='css')
            for route in held:
                route.continue_()
            page.unroute(ART)
            boot = ready(page)
            assert uses_key_art(page, '#menu')
            controls = retained_controls(page, mobile=mobile)
            layout = no_horizontal_overflow(page, '#menu')
            primary = in_view(page, '#soloBtn')
            assert not page.locator('#soloBtn').is_disabled()
            motion = assert_reduced_motion(page) if reduced else None
            page.screenshot(path=str(SHOTS / f'menu-{name}.png'), scale='css')
            assert not errors, errors
            reports.append({
                'case': name, 'viewport': {'width': width, 'height': height},
                'otherResourcesLoadedBeforeArt': True,
                'entryBlockedUntilArtDecoded': blocked,
                'boot': boot, 'primaryAboveFold': primary,
                'overflow': layout, 'controls': controls,
                'reducedMotion': motion, 'errors': errors,
            })
            page.context.close()
            print(f'PASS {name}: decoded real art, guarded entry, menu layout', flush=True)

        # Corrupt only the new image, then recover via the visible real reload
        # action. The short landscape viewport must keep that action reachable.
        page, errors = fresh(browser, 844, 390, mobile=True)
        broken = {'yes': True}
        page.route(ART, lambda route: route.fulfill(
            status=200, content_type='image/webp', body=b'invalid-key-art')
            if broken['yes'] else route.continue_())
        go(page)
        page.wait_for_function('MoonfallLoading.snapshot().failed', polling=100)
        failed = page.evaluate('MoonfallLoading.snapshot()')
        no_entry(page)
        assert page.locator('#moonfallLoadError').is_visible()
        assert page.locator('#moonfallLoadRetry').is_visible()
        overflow = no_horizontal_overflow(page, '#loading')
        retry = page.locator('#moonfallLoadRetry')
        retry.scroll_into_view_if_needed()
        retry_bounds = in_view(page, '#moonfallLoadRetry')
        page.screenshot(path=str(SHOTS / 'failed-key-art-landscape.png'), scale='css')
        broken['yes'] = False
        with page.expect_navigation(wait_until='domcontentloaded', timeout=180000):
            retry.tap()
        recovered = ready(page)
        assert not errors, errors
        reports.append({
            'case': 'invalid-key-art-and-real-retry', 'failed': failed,
            'noEntry': True, 'errorVisible': True, 'retryReachable': retry_bounds,
            'overflow': overflow, 'recovered': recovered, 'errors': errors,
        })
        page.context.close()
        print('PASS invalid key art: locked error, reachable retry, real reload', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()

OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'results.json').write_text(
    json.dumps(reports, ensure_ascii=False, indent=2) + '\n')
print('Screenshots (not committed):', SHOTS, flush=True)
