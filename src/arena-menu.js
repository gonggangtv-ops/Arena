/* Arena-only presentation. Existing buttons own their values, persistence and handlers. */
window.installArenaMenuUX=function(){
  'use strict';
  setTimeout(()=>{
    if(typeof MOON!=='undefined'&&MOON)return;
    const menu=document.getElementById('menu');
    const content=menu?.querySelector('.moonfall-menu-content');
    if(!content||menu.dataset.arenaMenu)return;
    menu.dataset.arenaMenu='1';
    const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
    const paths={
      sword:'M6 3 20 17l-3 3L3 6V3h3Zm4 11-7 7m0-5 5 5m8-11 5-7v5l-7 8m2 0 5 5m0-5-5 5',
      people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9v-2a7 7 0 0 1 14 0v2m0-16a4 4 0 0 1 0 8m3 3a6 6 0 0 1 3 5',
      gate:'M4 21V7l8-4 8 4v14M2 21h20M8 21V11h8v10M4 7h16M10 7V4m4 3V4',
      gear:'m9 3 1 3h4l1-3 3 2-1 3 2 3 3 1v4l-3 1-2 3 1 3-3 2-1-3h-4l-1 3-3-2 1-3-2-3-3-1v-4l3-1 2-3-1-3 3-2Zm3 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
      forge:'m4 3 10 10m-4-9 4-2 7 7-2 4-9-9Zm3 11-8 8-3-3 8-8m3 9h7m-5-3h5',
      picture:'M3 5h18v14H3V5Zm0 10 5-5 5 5 3-3 5 5M16 8h.01',
      control:'M8 8h8a6 6 0 0 1 6 6l-1 5h-4l-3-3h-4l-3 3H3l-1-5a6 6 0 0 1 6-6Zm-2 4v4m-2-2h4m9-1h.01M19 15h.01',
      audio:'M3 9h5l5-5v16l-5-5H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
      arrow:'M4 12h16m-6-6 6 6-6 6'
    };
    const icon=key=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.35');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[key]);svg.appendChild(path);return svg;};
    const title=menu.querySelector('.moonfall-menu-title');
    const wordmark=title.querySelector('h1');
    const name=document.title;
    wordmark.classList.add('arena-wordmark');wordmark.setAttribute('aria-label',name);
    wordmark.replaceChildren(make('span','',name));
    const loadingMark=document.getElementById('arenaLoadWordmark');
    const image=loadingMark?.querySelector('img');
    if(image){
      wordmark.append(image.cloneNode());
      for(const mark of [wordmark,loadingMark]){
        const art=mark.querySelector('img');
        art.decode().then(()=>mark.classList.add('arena-wordmark-ready'),()=>art.remove());
      }
    }
    title.querySelector('.moonfall-menu-crest')?.remove();
    title.querySelector('.anime-kicker').textContent='BATTLE ROYALE';
    title.querySelector('.moonfall-menu-chapter').remove();
    title.querySelector('.sub').textContent='32 ผู้กล้า · เก็บอาวุธ ปลดปล่อยสกิล · เหลือเพียงตำนานเดียว';
    const legend=menu.querySelector('.moonfall-menu-legend');
    if(legend)legend.remove();
    menu.querySelector('.moonfall-cloak')?.remove();
    for(const [id,graphic,label,description] of [
      ['soloBtn','sword','เข้าสู่สนาม','เล่นคนเดียว · ฝึกฝนกับบอท'],
      ['qmBtn','people','จับคู่ด่วน','ออนไลน์ · ผู้เล่นจริง'],
      ['roomsBtn','gate','ห้องออนไลน์','สร้างห้อง · เล่นกับเพื่อน']
    ]){
      const button=document.getElementById(id),copy=make('span','arena-action-copy');
      copy.append(make('span','arena-action-name',label),make('span','arena-action-description',description));
      const arrow=icon('arrow');arrow.classList.add('arena-action-arrow');button.replaceChildren(icon(graphic),copy,arrow);
    }
    const refreshWeaponPortraits=()=>{
      const atlas=window.MoonfallUI?.snapshot().atlas;
      const sheet=atlas?.sheets.armory;
      if(!sheet)return;
      for(const card of document.querySelectorAll('#codex [data-weapon],#fuseGrid [data-weapon]')){
        const tile=card.querySelector('.ic'),cell=atlas.weaponPortraits[card.dataset.weapon];
        if(!Number.isInteger(cell))continue;
        tile.textContent='';tile.classList.add('arena-weapon-portrait');tile.setAttribute('aria-hidden','true');
        tile.style.backgroundPosition=`${(cell%sheet.columns)/(sheet.columns-1)*100}% ${Math.floor(cell/sheet.columns)/(sheet.rows-1)*100}%`;
      }
    };
    window.addEventListener('moonfallui:ready',refreshWeaponPortraits,{once:true});
    if(window.MoonfallUI?.snapshot().state==='loaded')refreshWeaponPortraits();
    const utilities=make('nav','arena-menu-utilities');utilities.setAttribute('aria-label','เครื่องมือเกม');
    const open=make('button','arena-menu-tool');open.id='arenaSettingsBtn';open.type='button';
    open.append(icon('gear'),make('span','','ตั้งค่า'));open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-controls','arenaSettings');open.setAttribute('aria-expanded','false');
    const forge=document.getElementById('fuseBtn');forge.className='arena-menu-tool';forge.replaceChildren(icon('forge'),make('span','','สูตรหลอมอาวุธ'));
    utilities.append(open,forge);menu.querySelector('.moonfall-play-actions').after(utilities);

    const dialog=make('dialog','arena-settings');dialog.id='arenaSettings';dialog.setAttribute('aria-labelledby','arenaSettingsTitle');
    const header=make('header','arena-settings-header'),headingCopy=make('div');
    const heading=make('h2','','ตั้งค่าเกม');heading.id='arenaSettingsTitle';
    headingCopy.appendChild(heading);
    const close=make('button','arena-settings-close','×');close.type='button';close.setAttribute('aria-label','ปิดการตั้งค่า');close.onclick=()=>dialog.close();header.append(headingCopy,close);
    const body=make('div','arena-settings-body'),tabs=make('div','arena-settings-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','หมวดการตั้งค่า');tabs.setAttribute('aria-orientation','vertical');
    const panels=make('div','arena-settings-panels'),groups=[];
    for(const [key,graphic,label] of [['graphics','picture','กราฟิก'],['controls','control','การควบคุม'],['audio','audio','เสียง']]){
      const tab=make('button','arena-settings-tab');tab.type='button';tab.id='arenaSettingsTab-'+key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','arenaSettingsPanel-'+key);
      tab.append(icon(graphic),make('span','',label));tabs.appendChild(tab);
      const panel=make('section','arena-settings-panel');panel.id='arenaSettingsPanel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
      panel.appendChild(make('h3','',label));panels.appendChild(panel);groups.push({key,tab,panel});
    }
    const setTab=(index,focus)=>{groups.forEach((group,i)=>{group.tab.setAttribute('aria-selected',String(i===index));group.tab.tabIndex=i===index?0:-1;group.panel.hidden=i!==index;});if(focus)groups[index].tab.focus();};
    groups.forEach((group,index)=>group.tab.addEventListener('click',()=>setTab(index,false)));
    tabs.addEventListener('keydown',event=>{
      const index=groups.findIndex(group=>group.tab===event.target);if(index<0)return;
      let next=index;
      if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%groups.length;
      else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+groups.length-1)%groups.length;
      else if(event.key==='Home')next=0;else if(event.key==='End')next=groups.length-1;else return;
      event.preventDefault();setTab(next,true);
    });
    const rowFor=(group,id,label,detail)=>{
      const button=document.getElementById(id),row=make('div','arena-setting-row'),copy=make('div','arena-setting-copy'),hint=make('p','',detail);
      hint.id='arenaSettingHint-'+id;copy.append(make('h4','',label),hint);button.setAttribute('aria-describedby',hint.id);row.append(copy,button);group.panel.appendChild(row);
      return row;
    };
    const qualityRow=rowFor(groups[0],'qBtn','คุณภาพกราฟิก','อัตโนมัติปรับตามอุปกรณ์ · ประหยัดช่วยให้ภาพลื่นขึ้น');
    rowFor(groups[0],'toneBtn','บรรยากาศ','ซิเนมาติกให้เงาลึกและแสงอุ่น · เป็นกลางให้ภาพสว่างอ่านง่าย');
    rowFor(groups[0],'aoBtn','มิติของเงา','เพิ่มเงาตามพื้นและมุมวัตถุ · ปิดเพื่อลดภาระกราฟิก');
    rowFor(groups[0],'viewBtn','มุมมองเกม','สลับภาพ 3D และ 2D โดยใช้ระบบเกมเดียวกัน');
    rowFor(groups[1],'camBtn','ระยะกล้อง','ใกล้เห็นตัวละครชัด · ไกลเห็นพื้นที่รอบตัวมากขึ้น');
    const controls=make('div','arena-controls-guide');
    controls.append(make('h4','','คีย์ลัดและสัมผัส'));
    const keys=make('dl');
    for(const [key,detail] of [['W A S D','เคลื่อนที่'],['J · Space','โจมตี (ตีฮีโร่ก่อนเสมอ ไม่มีฮีโร่ในระยะจึงตีมอนสเตอร์)'],['K','ตีมอนสเตอร์อย่างเดียว (ปุ่มเล็ก 🐲 ข้างปุ่มโจมตี)'],['Q · E · R','สกิลอาวุธ (PC กดค้างเล็งตามเมาส์ ปล่อยร่าย · คลิกขวายกเลิก)'],['Shift','พุ่ง อมตะระหว่างพุ่ง คูลดาวน์ 45 วิ (ปุ่ม 💨 ซ้ายขวดเลือด)'],['V','สกิลพิเศษ (ปุ่ม ✦ เหนือปุ่มพุ่ง)'],['4 – 7 · B','ใช้ยา · เปิดกระเป๋า'],['F · T','เปิดกล่อง/เก็บอาวุธ/ค้นร่างอัศวิน · สลับอาวุธ (คูลดาวน์ 5 วิ ห้ามสลับตอนโดนตี)'],['P','ร้านค้า (ต้องยืนใกล้พ่อค้าในหมู่บ้าน)'],['ปุ่มสกิลบนจอ','แตะแล้วปล่อยเพื่อใช้ · กดค้างเพื่อดูความเสียหายและความสามารถ'],['มือถือ','จอยซ้ายเดิน · ลากจากปุ่มสกิลเพื่อเล็ง แล้วปล่อยเพื่อร่าย']])keys.append(make('dt','',key),make('dd','',detail));
    controls.appendChild(keys);groups[1].panel.appendChild(controls);
    rowFor(groups[2],'sndBtn','เพลงและเอฟเฟกต์','แตะเพื่อสลับเสียงทั้งหมด · เฉพาะเอฟเฟกต์ · ปิดเสียง');
    const credits=document.getElementById('credBtn');credits.className='arena-settings-credits';credits.addEventListener('click',()=>dialog.close(),true);groups[2].panel.appendChild(credits);
    body.append(tabs,panels);const footer=make('footer','arena-settings-footer');footer.appendChild(make('span','','ปรับแล้วมีผลทันที · เก็บการตั้งค่าไว้ในเครื่องนี้'));dialog.append(header,body,footer);document.body.appendChild(dialog);
    const previousSettings=document.getElementById('moonfallMenuSettings');
    // Retain any additional published controls instead of dropping their DOM nodes.
    const extraControls=[...previousSettings.querySelectorAll('button')];
    if(extraControls.length){const extras=make('div','arena-settings-extra');extras.append(...extraControls);groups[0].panel.appendChild(extras);}
    previousSettings.remove();
    const syncAvailability=()=>{qualityRow.hidden=document.getElementById('qBtn').classList.contains('hidden');};
    const qualityObserver=new MutationObserver(syncAvailability);qualityObserver.observe(document.getElementById('qBtn'),{attributes:true,attributeFilter:['class']});syncAvailability();
    // Translate the published setting's label without replacing syncTone/onclick.
    const toneButton=document.getElementById('toneBtn');
    const syncToneLabel=()=>{const label='ภาพ: '+(moody?'ซิเนมาติก':'เป็นกลาง');if(toneButton.textContent!==label)toneButton.textContent=label;};
    const toneObserver=new MutationObserver(syncToneLabel);toneObserver.observe(toneButton,{childList:true,characterData:true,subtree:true});syncToneLabel();
    const orientation=matchMedia('(max-width:600px)');const syncOrientation=()=>tabs.setAttribute('aria-orientation',orientation.matches?'horizontal':'vertical');orientation.addEventListener('change',syncOrientation);syncOrientation();
    setTab(0,false);
    open.addEventListener('click',()=>{if(menu.inert||menu.classList.contains('hidden')||dialog.open)return;dialog.showModal();open.setAttribute('aria-expanded','true');groups.find(group=>group.tab.getAttribute('aria-selected')==='true').tab.focus();});
    dialog.addEventListener('close',()=>{open.setAttribute('aria-expanded','false');if(!menu.inert&&!menu.classList.contains('hidden'))open.focus({preventScroll:true});});
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Tab'&&dialog.open){
        const focusable=[...dialog.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex]')].filter(node=>node.tabIndex>=0&&!node.matches(':disabled')&&!node.closest('[hidden],[inert]')&&node.getClientRects().length>0);
        const first=focusable[0],last=focusable[focusable.length-1],active=document.activeElement;
        if(!first){event.preventDefault();dialog.focus();}
        else if(event.shiftKey&&(active===first||!dialog.contains(active))){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&(active===last||!dialog.contains(active))){event.preventDefault();first.focus();}
      }
      event.stopPropagation();
    });
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
  },0);
};
