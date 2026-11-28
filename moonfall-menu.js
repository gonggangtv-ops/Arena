/* Cinematic Moonfall lobby. Move existing controls; retain their game/network handlers. */
window.installMoonfallMenuUX=function(){
  'use strict';
  setTimeout(()=>{
    const menu=document.getElementById('menu');if(menu.dataset.moonfallMenu)return;menu.dataset.moonfallMenu='1';
    const group=(tag,className,nodes)=>{const node=document.createElement(tag);node.className=className;nodes[0].before(node);for(const item of nodes)node.appendChild(item);return node;};
    const title=group('header','moonfall-menu-title',[menu.querySelector('.anime-kicker'),menu.querySelector('h1'),menu.querySelector(':scope > .sub')]);
    const heading=title.querySelector('h1');heading.innerHTML='<span>The Cursed</span><span>Realm</span>';
    const crest=document.createElement('span');crest.className='moonfall-menu-crest';crest.setAttribute('aria-hidden','true');title.prepend(crest);
    const chapter=document.createElement('div');chapter.className='moonfall-menu-chapter';chapter.textContent='MOONFALL';heading.after(chapter);
    const identity=document.getElementById('pname').closest('.row');identity.classList.add('moonfall-identity');
    const name=document.getElementById('pname');group('div','moonfall-player-name',[identity.querySelector('label'),name]);
    const looks=document.getElementById('looks'),cloakLabel=looks.previousElementSibling;
    const cloak=group('details','moonfall-cloak',[cloakLabel,looks]);
    const cloakTitle=document.createElement('summary');cloakLabel.before(cloakTitle);cloakTitle.appendChild(cloakLabel);
    const cloakSwatch=document.createElement('span');cloakSwatch.className='moonfall-cloak-swatch';cloakSwatch.setAttribute('aria-hidden','true');cloakTitle.prepend(cloakSwatch);
    const actions=document.getElementById('soloBtn').closest('.row');actions.classList.add('moonfall-play-actions');actions.setAttribute('aria-label','เลือกการเล่น');
    actions.prepend(document.getElementById('soloBtn'));
    const intro=document.createElement('p');intro.className='moonfall-start-hint';intro.textContent='เริ่มมือเปล่า · เก็บอาวุธในสนาม · อัปสกิลเพื่อเอาตัวรอด';actions.after(intro);
    const settings=document.createElement('details');settings.className='moonfall-menu-section';settings.id='moonfallMenuSettings';
    const settingTitle=document.createElement('summary');settingTitle.textContent='ภาพ เสียง และสูตรหลอมอาวุธ';settings.appendChild(settingTitle);
    const settingRow=document.getElementById('viewBtn').closest('.row');settingRow.before(settings);settings.appendChild(settingRow);
    const reference=document.createElement('details');reference.className='moonfall-menu-section';reference.id='moonfallWeaponGuide';
    const referenceTitle=document.createElement('summary');referenceTitle.textContent='รู้จักอาวุธและสกิล · '+WK.length+' แบบ';reference.appendChild(referenceTitle);
    const codex=document.getElementById('codex');codex.before(reference);reference.appendChild(codex);
    const gallery=document.createElement('button');gallery.type='button';gallery.className='moonfall-gallery-link';gallery.textContent='ดูสูตรหลอมและสกิลหลอมทั้ง 36 สกิล';gallery.onclick=()=>document.getElementById('fuseBtn').click();reference.appendChild(gallery);
    // The play actions lead the lobby. Secondary controls remain keyboard reachable.
    const tools=menu.querySelector('.celestial-tools');settings.appendChild(tools);settings.appendChild(document.getElementById('celestialAssetNote'));
    title.after(actions);actions.after(intro);intro.after(identity);identity.after(settings);settings.after(reference);
    const content=document.createElement('div');content.className='moonfall-menu-content';
    while(menu.firstChild)content.appendChild(menu.firstChild);menu.appendChild(content);
    const scenery=document.createElement('div');scenery.className='moonfall-menu-scenery';scenery.setAttribute('aria-hidden','true');menu.prepend(scenery);
    const legend=document.createElement('div');legend.className='moonfall-menu-legend';legend.setAttribute('aria-hidden','true');
    legend.innerHTML='<span class="moonfall-menu-legend-index">I</span><span>THE MOONFALL<span>ใต้เงาจันทราที่แตกสลาย</span></span>';scenery.appendChild(legend);
    const updateLooks=()=>looks.querySelectorAll('.look').forEach((button,i)=>{
      button.setAttribute('aria-pressed',String(i===chosenLook));
      if(i===chosenLook)cloakSwatch.style.background=button.style.background;
    });
    looks.addEventListener('click',updateLooks);updateLooks();
    const refreshArt=()=>{
      const status=window.MoonfallUI?.snapshot();if(status?.state!=='loaded')return;const atlas=status.atlas;
      for(const [j,card] of [...codex.children].entries())for(const [i,icon] of [...card.querySelectorAll('.sks span')].entries()){
        const key=WK[j],cell=atlas.skills[key]?.[i];if(cell===undefined)continue;
        icon.className='moonfall-menu-skill';icon.textContent='';icon.setAttribute('role','img');icon.setAttribute('aria-label',SK[key][i].n);
        icon.style.backgroundPosition=(cell%6/5*100)+'% '+(Math.floor(cell/6)/4*100)+'%';
      }
    };
    window.addEventListener('moonfallui:ready',refreshArt);refreshArt();
    // Keep the primary lobby action reachable above long player/config lists.
    const lobbyActions=document.getElementById('lobbyStart').closest('.row');
    lobbyActions.classList.add('moonfall-lobby-actions');lobbyActions.parentElement.prepend(lobbyActions);
  },0);
};
