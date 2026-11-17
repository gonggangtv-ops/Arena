/* Round 2: reorganize menu presentation without replacing game/network handlers. */
window.installMoonfallMenuUX=function(){
  'use strict';
  setTimeout(()=>{
    const menu=document.getElementById('menu');if(menu.dataset.moonfallMenu)return;menu.dataset.moonfallMenu='1';
    const group=(tag,className,nodes)=>{const node=document.createElement(tag);node.className=className;nodes[0].before(node);for(const item of nodes)node.appendChild(item);return node;};
    group('header','moonfall-menu-title',[menu.querySelector('.anime-kicker'),menu.querySelector('h1'),menu.querySelector(':scope > .sub')]);
    const identity=document.getElementById('pname').closest('.row');identity.classList.add('moonfall-identity');
    const looks=document.getElementById('looks');group('div','moonfall-cloak',[looks.previousElementSibling,looks]);
    const actions=document.getElementById('soloBtn').closest('.row');actions.classList.add('moonfall-play-actions');actions.setAttribute('aria-label','เลือกการเล่น');
    const intro=document.createElement('p');intro.className='moonfall-start-hint';intro.textContent='เริ่มมือเปล่า · เก็บอาวุธในสนาม · อัปสกิลเพื่อเอาตัวรอด';actions.after(intro);
    const settings=document.createElement('details');settings.className='moonfall-menu-section';settings.id='moonfallMenuSettings';
    const settingTitle=document.createElement('summary');settingTitle.textContent='ภาพ เสียง และสูตรหลอมอาวุธ';settings.appendChild(settingTitle);
    const settingRow=document.getElementById('viewBtn').closest('.row');settingRow.before(settings);settings.appendChild(settingRow);
    const reference=document.createElement('details');reference.className='moonfall-menu-section';reference.id='moonfallWeaponGuide';
    const referenceTitle=document.createElement('summary');referenceTitle.textContent='รู้จักอาวุธและสกิล · 9 แบบ';reference.appendChild(referenceTitle);
    const codex=document.getElementById('codex');codex.before(reference);reference.appendChild(codex);
    const gallery=document.createElement('a');gallery.href='moonfall-ui-preview.html';gallery.target='_blank';gallery.rel='noopener';gallery.className='moonfall-gallery-link';gallery.textContent='ดูภาพสกิลทั้ง 27 สกิล ↗';reference.appendChild(gallery);
    // Place secondary reference after the play/identity actions, retaining nodes.
    const tools=menu.querySelector('.celestial-tools');tools.after(settings);settings.after(reference);
    const updateLooks=()=>looks.querySelectorAll('.look').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===chosenLook)));
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
