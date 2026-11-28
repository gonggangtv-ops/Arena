"""Play the three bosses through the shipped menu, including keyboard, touch and a fresh Solo match."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from shutil import which
from threading import Thread

from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parents[2] / 'app/src/main/assets'


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def exercise(browser, url, mobile, pictures):
    size = {'width': 844, 'height': 390} if mobile else {'width': 1120, 'height': 680}
    ctx = browser.new_context(viewport=size, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    page.set_default_timeout(120000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if 'THREE.WebGLProgram: Shader Error' in m.text else None)
    page.add_init_script("""window.__noMenu=true;requestAnimationFrame=()=>0;
        localStorage.setItem('ar_q','low');localStorage.setItem('ar_mute','1');""")
    def wait(script):
        page.wait_for_function(script, polling=80)
    def click(selector):
        el = page.locator(selector)
        assert el.is_visible(), selector
        el.click(force=True)
    def photo(name):
        if pictures:
            pictures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=pictures / name)
    def launch(kind, phase=2):
        click('#btPick' if page.evaluate("state==='bossTrial'") else '#bossTrialBtn')
        click('label:has(input[value="'+kind+'"])')
        assert page.locator('#btPhaseField').is_visible() == (kind != 'boss')
        if kind != 'boss':
            page.locator('#btPhase').select_option(str(phase))
        click('#btForm [type=submit]')
        wait("!$('bossTrialPicker').open&&$('loading').classList.contains('hidden')||MoonfallLoading.snapshot().failed")
        actual = page.evaluate("""() => ({kind:ME()?.kind,atHome:ME()&&dist(ME(),ME().home)<2,
          rig:!!R3.objs.get(myId)?.sk, count:units.length,phase:ME()?.ph, seed:WD.seed,
          error:MoonfallLoading.snapshot().error||$('menuMsg').textContent,state})""")
        assert actual == dict(kind=kind,atHome=True,rig=True,count=4,phase=phase if kind!='boss' else 0,
                              seed=fixture_seed,error='',state='bossTrial'), actual
    def frames(count):
        page.evaluate("""n=>{for(let i=1;i<n;i++)hostUpdate(1/30);ArenaBossTrial.frame(1/30)}""",count)
    def refreshed():
        # Tick the HUD, whose DOM updates are deliberately less frequent than the simulation.
        page.evaluate("for(let i=0;i<3;i++)ArenaBossTrial.frame(.04)")
    def has_move(move):
        return page.locator('[data-move="'+move+'"]').count() == 1
    def projected_target():
        return page.evaluate("""() => {const h=units.find(u=>u.wk==='bow');return {...w2s(h.x,h.y),name:h.name}}""")

    page.goto(url+('?lang=en' if mobile else ''), wait_until='domcontentloaded')
    wait("window.MoonfallLoading?.isReady()||window.MoonfallLoading?.snapshot().failed")
    assert page.evaluate('MoonfallLoading.isReady()'), errors
    fixture_seed = 1729 if mobile else 777
    saved = page.evaluate("""seed=>{const p=structuredClone(ArenaProject.published);p.seed=seed;
      const raw=JSON.stringify(ArenaProject.validate(p));localStorage.setItem(ArenaProject.storageKey,raw);return raw}""",fixture_seed)
    click('#bossTrialBtn')
    assert page.locator('#bossTrialPicker').is_visible()
    if mobile:
        assert page.locator('#btPickerTitle').inner_text()=='Boss Trial'
    else:
        photo('MuzCruor-boss-picker.png')
    click('#btCancel')
    wait("!$('bossTrialPicker').open")

    launch('snowqueen')
    assert has_move('winter') and page.locator('#btActions button').count()==8
    frames(12)
    assert page.evaluate("Object.keys(ME().cds).length===0 && !aoes.some(a=>a.owner===ME())")
    if mobile:
        stick=page.locator('#btStick').bounding_box()
        assert stick
        x,y=stick['x']+stick['width']/2,stick['y']+stick['height']/2
        cdp=ctx.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+32,'y':y}]})
    else:
        page.keyboard.down('d')
    start=page.evaluate('ME().x')
    frames(12)
    assert page.evaluate('ME().x')>start+5, (start,page.evaluate('ME().x'))
    if mobile:
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
        page.keyboard.up('d')
    target=projected_target()
    if mobile:
        page.touchscreen.tap(target['x'],target['y'])
    else:
        page.mouse.click(target['x'],target['y'])
    refreshed()
    assert target['name'] in page.locator('#btTarget').inner_text(),target
    if mobile:
        page.locator('[data-move=winter]').tap(force=True)
    else:
        page.keyboard.press('v')
    frames(1)
    assert page.evaluate("""()=>{const a=aoes.find(a=>a.kind==='qwinter');
      return a&&a.owner===ME()&&a.r===1150&&a.delay===3.4&&a.safes.length===2&&ME().cds.winter===26}""")
    frames(32)
    refreshed()
    assert page.locator('[data-move=winter]').get_attribute('data-cooling') is not None
    assert page.evaluate("document.querySelector('#eclBoss')?.style.opacity!=='1'")
    photo('MuzCruor-boss-touch.png' if mobile else 'MuzCruor-boss-winter.png')
    if mobile:
        page.set_viewport_size({'width':390,'height':844})
        wait('H>W')
        t=page.evaluate('gameT')
        refreshed()
        assert page.evaluate('gameT')==t and not page.locator('#btActions').is_visible()
        page.set_viewport_size(size)
        wait('W>H')
        refreshed()
    else:
        launch('snowqueen',0)
        assert not has_move('winter') and has_move('lance')
        page.keyboard.press('q')
        frames(1)
        assert page.evaluate("ME().cds.lance===6 && aoes.some(a=>a.kind==='qlance')")
        page.evaluate("ME().hp=ME().maxHp*.60")
        refreshed()
        assert page.evaluate('ME().ph')==1 and has_move('blizz') and not has_move('winter')

        launch('overlord',1)
        assert has_move('summon') and not has_move('ult')
        click('[data-move=summon]')
        frames(1)
        assert page.evaluate("ME().summons.length===2 && ME().summons.every(id=>UMAP.get(id)?.team===ME().team) && ME().cds.summon===22")
        launch('overlord',2)
        assert has_move('ult') and not has_move('summon')
        page.keyboard.press('v')
        frames(1)
        assert page.evaluate("aoes.some(a=>a.kind==='ueclipse'&&a.r===1050&&a.delay===3.2) && ME().cds.ult===28")
        frames(19);refreshed()
        assert page.evaluate("Number($('eclDark').style.opacity)>0")
        photo('MuzCruor-boss-eclipse.png')
        launch('boss')
        assert page.locator('#btActions button').count()==3 and not has_move('ult')
        page.keyboard.press('q')
        frames(1)
        assert page.evaluate("ME().brT===8 && aoes.some(a=>a.kind==='breath'&&a.dot===1.6)")
        frames(47)
        page.keyboard.press('e')
        frames(1)
        assert page.evaluate("ME().slT===9 && aoes.some(a=>a.kind==='slam'&&a.stun===1)")
        for _ in range(12):
            frames(6)
            if page.evaluate("ME().busyT<=0 && ME().stunT<=0 && !ME().kb && ME().atkCd<=0"):
                break
        page.keyboard.press('j')
        frames(1)
        assert page.evaluate("!!ME().fw"),page.evaluate("({busy:ME().busyT,attack:ME().atkCd,stunned:ME().stunT,kb:!!ME().kb,remaining:units.filter(u=>u.hero&&!u.dead).length,result:!$('btResult').hidden})")
        # The two round-end paths use the actual combat death handler.
        page.evaluate("kill(ME(),units.find(u=>u.hero))")
        refreshed()
        assert page.locator('#btResult').is_visible() and not page.evaluate('gameOver')
        click('#btPick');click('label:has(input[value=snowqueen])');click('#btCancel')
        click('#btRetry')
        wait("state==='bossTrial'&&ME()?.kind==='boss'&&!ME().dead&&$('loading').classList.contains('hidden')")
        page.evaluate("units.filter(u=>u.hero).forEach(h=>kill(h,ME()))")
        refreshed()
        assert page.locator('#btOutcome').inner_text()=='พิชิตผู้ท้าชิงครบแล้ว'
        page.wait_for_timeout(950)
        assert page.evaluate("state==='bossTrial'&&!gameOver&&$('end').classList.contains('hidden')")

    click('#btLeave')
    assert page.evaluate("state==='menu' && $('bossTrialHud').hidden && !ME()")
    assert page.evaluate('localStorage.getItem(ArenaProject.storageKey)')==saved
    click('#soloBtn')
    wait("state==='play'&&$('loading').classList.contains('hidden')")
    assert page.evaluate("ME().hero && units.filter(u=>u.hero).length===32 && DROP.st==='pick' && WD.seed==="+str(fixture_seed))
    assert not errors,errors
    print(('touch' if mobile else 'keyboard')+' passed', flush=True)
    ctx.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pictures',type=Path)
    parser.add_argument('--device',choices=['both','desktop','mobile'],default='both')
    args=parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(SITE))) as site,sync_playwright() as pw:
        Thread(target=site.serve_forever,daemon=True).start()
        browser=pw.chromium.launch(executable_path=which('chromium'),args=['--no-sandbox','--enable-unsafe-swiftshader'])
        for mobile in [False,True]:
            if args.device in ('both','mobile' if mobile else 'desktop'):
                exercise(browser,f'http://127.0.0.1:{site.server_port}/index.html',mobile,args.pictures)
        browser.close()
