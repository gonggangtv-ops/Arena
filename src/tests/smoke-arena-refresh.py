"""Arena presentation smoke checks against the current, real deployment tree.

No success response is fabricated. A held/corrupt illustration is used only to
exercise the admission gate. Screenshots are temporary; the JSON is reproducible.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import re
import shutil
import sys
import tempfile

from playwright.sync_api import sync_playwright


PROJECT = Path(__file__).resolve().parents[2]
DEPLOY = PROJECT / 'app/src/main/assets'
RESULT = PROJECT / 'moonfall-docs/reports/arena-refresh/smoke.json'
PICTURES = Path(tempfile.mkdtemp(prefix='arena-refresh-'))
NEW_ART = '**/arena-citadel.webp'
SHADER_ERROR = re.compile(r'WebGLProgram|shader error|shader couldn.t|VALIDATE_STATUS|GL_INVALID|program not valid', re.I)


class FileHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class SiteServer(ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        # Deliberately closing an invalid-load page can abort its other downloads.
        if isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)):
            return
        super().handle_error(request, client_address)


class Visit:
    def __init__(self, browser, address, *, mobile=False):
        self.mobile = mobile
        self.address = address
        self.context = browser.new_context(
            viewport={'width': 844 if mobile else 1280, 'height': 390 if mobile else 800},
            is_mobile=mobile, has_touch=mobile, device_scale_factor=1,
            **({'user_agent': 'Mozilla/5.0 (Linux; Android 14) Mobile'} if mobile else {}))
        self.page = self.context.new_page()
        self.page.set_default_timeout(240000)
        self.errors = []
        self.shader_errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('console', lambda message: self.shader_errors.append(message.text)
                     if message.type == 'error' and SHADER_ERROR.search(message.text) else None)
        self.page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
        # Freeze only the unattended animation/simulation loop. The actual boot
        # compilation and explicit game renders still execute; quality/tone keep
        # their real fresh-user defaults.
        self.page.add_init_script("window.__noMenu=true;requestAnimationFrame=()=>0;"
                                  "if(localStorage.getItem('ar_snd')===null)localStorage.setItem('ar_snd','2');"
                                  "if(localStorage.getItem('ar_mute')===null)localStorage.setItem('ar_mute','1')")

    def open(self, document='index.html'):
        self.page.goto(self.address + '/' + document, wait_until='domcontentloaded', timeout=240000)
        self.page.wait_for_function('window.MoonfallLoading', polling=100)

    def ready(self):
        self.page.wait_for_function('MoonfallLoading.isReady()||MoonfallLoading.snapshot().failed', polling=100)
        value = self.page.evaluate("""() => {
          const boot=MoonfallLoading.snapshot(),assets=CelestialAssets.snapshot();
          const expected=assets.assets.length+Object.keys(AR_QN).length+
            Object.keys(MoonfallUI.snapshot().atlas.sheets).length+7+3;
          return {boot,expected,modelCount:assets.assets.length,
            allModelsLoaded:assets.assets.every(asset=>asset.state==='loaded'),
            selectedKeys:window.CELESTIAL_KEYS||null,moody,gfxQ,high:R3.hi,
            icons:MoonfallUI.snapshot().loadedIcons};
        }""")
        assert value['boot']['ready'] and not value['boot']['failed'], value
        assert value['boot']['total'] == value['expected'] and value['boot']['artDone'] == 1, value
        assert value['allModelsLoaded'], value
        if value['selectedKeys']:
            assert value['modelCount'] == len(value['selectedKeys']), value
        assert self.page.locator('#loading').is_hidden()
        return value

    def press(self, selector):
        target = self.page.locator(selector)
        (target.tap if self.mobile else target.click)()

    def picture(self, name):
        self.page.screenshot(path=str(PICTURES / (name + '.png')), scale='css')

    def clean(self):
        diagnostic = self.page.evaluate("""() => ({
          failedPrograms:(R3.renderer.info.programs||[]).filter(program=>program.diagnostics?.runnable===false)
            .map(program=>({name:program.name,log:program.diagnostics.programLog})),
          programs:(R3.renderer.info.programs||[]).length,
          contextLost:R3.renderer.getContext().isContextLost()
        })""")
        assert not self.errors and not self.shader_errors, (self.errors, self.shader_errors)
        assert not diagnostic['failedPrograms'] and not diagnostic['contextLost'], diagnostic
        return {'pageErrors': self.errors, 'shaderErrors': self.shader_errors, **diagnostic}


def fits(page, selector, *, target=False):
    bounds = page.locator(selector).evaluate("""element=>{
      const r=element.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,
        viewportWidth:innerWidth,viewportHeight:innerHeight,
        localWidth:element.clientWidth,scrollWidth:element.scrollWidth};
    }""")
    assert bounds['scrollWidth'] <= bounds['localWidth'] + 1, bounds
    if target:
        assert bounds['x'] >= 0 and bounds['y'] >= 0, bounds
        assert bounds['right'] <= bounds['viewportWidth'] + 1, bounds
        assert bounds['bottom'] <= bounds['viewportHeight'] + 1, bounds
        assert bounds['width'] >= 44 and bounds['height'] >= 44, bounds
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    return bounds


def panel(page, name):
    page.wait_for_function("""name=>{
      const selected=document.getElementById('arenaSettingsTab-'+name);
      return selected.getAttribute('aria-selected')==='true'&&selected.tabIndex===0&&
        !document.getElementById('arenaSettingsPanel-'+name).hidden;
    }""", arg=name, polling=100)
    assert page.locator('#arenaSettingsPanel-' + name).is_visible()
    assert page.locator('#arenaSettings [role="tab"][aria-selected="true"]').count() == 1


def close_dialog(visit, *, escape=False):
    if escape:
        visit.page.keyboard.press('Escape')
    else:
        visit.press('#arenaSettings .arena-settings-close')
    visit.page.wait_for_function("""!document.getElementById('arenaSettings').open&&
      document.getElementById('arenaSettingsBtn').getAttribute('aria-expanded')==='false'""", polling=100)
    assert visit.page.evaluate("document.activeElement.id==='arenaSettingsBtn'")
    assert visit.page.locator('#arenaSettingsBtn').get_attribute('aria-expanded') == 'false'


def settings(visit):
    page = visit.page
    visit.press('#arenaSettingsBtn')
    assert page.locator('#arenaSettings').evaluate('dialog=>dialog.open&&dialog.matches(":modal")')
    assert page.locator('#arenaSettingsBtn').get_attribute('aria-expanded') == 'true'
    panel(page, 'graphics')
    assert page.evaluate("document.activeElement.id==='arenaSettingsTab-graphics'")
    rows = page.evaluate("""() => ['qBtn','toneBtn','aoBtn','viewBtn','camBtn','sndBtn'].map(id=>{
      const button=document.getElementById(id);return {id,unique:document.querySelectorAll('#'+id).length===1,
        handler:typeof button.onclick==='function',row:!!button.closest('.arena-setting-row'),
        description:!!button.getAttribute('aria-describedby')};
    })""")
    assert all(row['unique'] and row['handler'] and row['row'] and row['description'] for row in rows), rows
    for key in ['Tab'] * 9 + ['Shift+Tab'] * 9:
        page.keyboard.press(key)
        assert page.evaluate("!!document.activeElement.closest('#arenaSettings')"), key
    page.locator('#arenaSettingsTab-graphics').focus()
    page.keyboard.press('ArrowDown')
    panel(page, 'controls')
    assert page.evaluate("document.activeElement.id==='arenaSettingsTab-controls'")
    guide = page.locator('.arena-controls-guide').inner_text()
    assert all(key in guide for key in ['W A S D', 'Q', 'E', 'R', 'Shift', 'V', 'B', 'P', 'มือถือ']), guide
    page.keyboard.press('End')
    panel(page, 'audio')
    page.keyboard.press('Home')
    panel(page, 'graphics')
    before_label = page.locator('#toneBtn').inner_text()
    assert page.evaluate('moody===true')
    assert 'ซิเนมาติก' in before_label, before_label
    assert 'อัตโนมัติ' in page.locator('#qBtn').inner_text()
    visit.press('#toneBtn')
    assert page.evaluate("moody===false&&localStorage.getItem('ar_tone2')==='bright'")
    assert page.locator('#toneBtn').inner_text() != before_label
    assert 'เป็นกลาง' in page.locator('#toneBtn').inner_text()
    visit.press('#qBtn')
    assert page.evaluate("gfxQ==='high'&&localStorage.getItem('ar_q')==='high'")
    assert 'สูง' in page.locator('#qBtn').inner_text()
    visit.press('#qBtn')
    assert page.evaluate("gfxQ==='low'&&localStorage.getItem('ar_q')==='low'")
    assert 'ประหยัด' in page.locator('#qBtn').inner_text()
    visit.press('#aoBtn')
    assert page.evaluate("localStorage.getItem('ar_ao')==='0'")
    assert 'ปิด' in page.locator('#aoBtn').inner_text()
    visit.press('#viewBtn')
    page.wait_for_function("!view3D&&document.getElementById('qBtn').closest('.arena-setting-row').hidden", polling=100)
    assert page.evaluate("localStorage.getItem('ar_view')==='2d'")
    visit.press('#viewBtn')
    page.wait_for_function("view3D&&!document.getElementById('qBtn').closest('.arena-setting-row').hidden", polling=100)
    assert page.evaluate("localStorage.getItem('ar_view')==='3d'")
    visit.press('#arenaSettingsTab-controls')
    visit.press('#camBtn')
    assert page.evaluate("!camNear&&localStorage.getItem('ar_cam')==='far'")
    assert 'ไกล' in page.locator('#camBtn').inner_text()
    visit.press('#arenaSettingsTab-audio')
    for expected in [0, 1, 2]:
        visit.press('#sndBtn')
        assert page.evaluate('AU.mode') == expected
        assert page.evaluate("localStorage.getItem('ar_snd')") == str(expected)
    close_dialog(visit, escape=True)
    visit.press('#arenaSettingsBtn')
    panel(page, 'audio')
    close_dialog(visit)
    return {'originalControls': rows, 'tabNavigation': True, 'backgroundFocusBlockedAndFocusRestored': True,
            'currentValueChanges': True, 'viewToggle': '3d -> 2d -> 3d', 'guide': guide}


def enter_arena(visit):
    visit.press('#soloBtn')
    visit.page.wait_for_function("state==='play'&&document.getElementById('loading').classList.contains('hidden')", polling=100)
    value = visit.page.evaluate("""async()=>{
      await R3.renderer.compileAsync(R3.scene,R3.cam);R3.frame(1/30);
      return {state,heroes:units.filter(unit=>unit.hero).length,alive,view3D,
        heroReady:!!ME()&&!ME().dead,drawCalls:R3.renderer.info.render.calls,
        geometries:R3.renderer.info.memory.geometries,textures:R3.renderer.info.memory.textures};
    }""")
    assert value['state'] == 'play' and value['heroes'] > 1 and value['heroReady'], value
    assert value['view3D'] and value['drawCalls'] > 0, value
    return value


service = SiteServer(('127.0.0.1', 0), partial(FileHandler, directory=str(DEPLOY)))
Thread(target=service.serve_forever, daemon=True).start()
address = f'http://127.0.0.1:{service.server_port}'
results = []
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=shutil.which('chromium'),
                                             args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        for mobile in [False, True]:
            label = 'mobile-landscape' if mobile else 'desktop'
            visit = Visit(browser, address, mobile=mobile)
            page = visit.page
            held = []
            page.route(NEW_ART, lambda route: held.append(route))
            visit.open()
            page.wait_for_function("""() => {
              const boot=MoonfallLoading.snapshot();
              return boot.packDone===Object.keys(AR_QN).length&&boot.musicDone===7&&
                CelestialAssets.snapshot().assets.every(asset=>asset.state==='loaded')&&
                MoonfallUI.snapshot().state==='loaded'&&document.fonts.status==='loaded';
            }""", polling=100)
            assert held, 'The required Arena illustration was not requested'
            assert page.locator('#loading').is_visible() and page.locator('#soloBtn').is_disabled()
            locked = page.evaluate("""() => {
              document.getElementById('soloBtn').click();hostStartMatch();enterPlay();quickMatch();hostRoom();joinRoom('BLOCK','');
              document.getElementById('arenaSettingsBtn')?.click();
              return state==='menu'&&!MoonfallLoading.isReady()&&net.tr===null&&
                !document.getElementById('arenaSettings')?.open;
            }""")
            assert locked and page.evaluate('MoonfallLoading.snapshot().artDone===0')
            visit.picture(label + '-waiting-art')
            for route in held:
                route.continue_()
            page.unroute(NEW_ART)
            boot_state = visit.ready()
            assert boot_state['moody'] and boot_state['gfxQ'] == 'auto', boot_state
            page.wait_for_function("document.getElementById('menu').dataset.arenaMenu", polling=100)
            heading = page.locator('#menu h1').inner_text()
            assert 'Arena' in heading and 'Royale' in heading and 'Cursed' not in heading, heading
            primary = fits(page, '#soloBtn', target=True)
            fits(page, '#menu')
            visit.picture(label + '-ready')
            checks = settings(visit)
            if mobile:
                page.set_viewport_size({'width': 390, 'height': 844})
                fits(page, '#soloBtn', target=True)
                visit.press('#arenaSettingsBtn')
                page.wait_for_function("document.querySelector('#arenaSettings [role=tablist]').getAttribute('aria-orientation')==='horizontal'", polling=100)
                fits(page, '#arenaSettings')
                visit.picture('mobile-portrait-settings')
                close_dialog(visit)
                page.set_viewport_size({'width': 844, 'height': 390})
            # The settings must survive a real reload through the same origin.
            page.reload(wait_until='domcontentloaded')
            persisted_boot = visit.ready()
            persisted = page.evaluate("({moody,gfxQ,camNear,view3D,ao:localStorage.getItem('ar_ao'),sound:AU.mode})")
            assert persisted == {'moody': False, 'gfxQ': 'low', 'camNear': False, 'view3D': True, 'ao': '0', 'sound': 2}, persisted
            visit.press('#arenaSettingsBtn')
            panel(page, 'graphics')
            visit.picture(label + '-settings-persisted')
            close_dialog(visit)
            started = enter_arena(visit)
            if not mobile:
                page.keyboard.down('w')
                assert page.evaluate('localInput().my<0')
                page.keyboard.up('w')
                page.keyboard.press('p')
                assert page.evaluate('CUR.open')
                page.keyboard.press('p')
                assert not page.evaluate('CUR.open')
                before = page.evaluate('UI.bagOpen')
                page.keyboard.press('b')
                assert page.evaluate('UI.bagOpen') != before
                page.keyboard.press('b')
            visit.picture(label + '-playing')
            results.append({'case': label, 'gateBlocked': locked, 'boot': boot_state,
                            'primary': primary, 'settings': checks, 'persistence': persisted,
                            'reloadedBoot': persisted_boot, 'game': started, 'diagnostics': visit.clean()})
            visit.context.close()
            print('PASS ' + label + ': strict art gate, native settings/persistence and real start', flush=True)

        visit = Visit(browser, address, mobile=True)
        broken = {'value': True}
        visit.page.route(NEW_ART, lambda route: route.fulfill(status=200, content_type='image/webp', body=b'invalid-arena-art')
                         if broken['value'] else route.continue_())
        visit.open()
        visit.page.wait_for_function('MoonfallLoading.snapshot().failed', polling=100)
        failed = visit.page.evaluate('MoonfallLoading.snapshot()')
        assert visit.page.locator('#soloBtn').is_disabled() and visit.page.locator('#moonfallLoadError').is_visible()
        retry = visit.page.locator('#moonfallLoadRetry')
        retry.scroll_into_view_if_needed()
        fits(visit.page, '#moonfallLoadRetry', target=True)
        visit.picture('invalid-art-retry')
        broken['value'] = False
        with visit.page.expect_navigation(wait_until='domcontentloaded', timeout=240000):
            retry.tap()
        recovered = visit.ready()
        results.append({'case': 'invalid-required-art', 'failed': failed, 'recovered': recovered,
                        'diagnostics': visit.clean()})
        visit.context.close()
        print('PASS corrupt required art: error locks admission and real retry recovers', flush=True)
        # cursed.html is no longer maintained (owner 2026-11-23), so it is no longer opened here
        browser.close()
finally:
    service.shutdown()
    service.server_close()

RESULT.parent.mkdir(parents=True, exist_ok=True)
RESULT.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
print('Screenshots (temporary):', PICTURES, flush=True)
