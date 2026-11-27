// ===================== NETWORK =====================
// Two transports share one protocol: PeerJS/WebRTC (APK + hosted web) and the artifact "room" capability (claude.ai page).
const NET_PREFIX=MOON?'cursedrealm1-':CURSED?'arenaroyale6-':'arenaroyale5-';
// quick match: lobbies sit on a few well-known slot ids; seekers probe them all, join the fullest, or claim a free one
const QM_SLOTS=6,QM_WAIT=30,QM_SCAN=4000,QM_TOTAL=32;
// public room list: every listed room runs a tiny 'beacon' peer on one of these well-known ids that answers who/what it is
const ROOM_SLOTS=12;
const NONFATAL=['peer-unavailable','webrtc','negotiation-failed','connection-closed','disconnected'];
const net={mode:'solo',tr:null,code:'',lobby:[],inputs:{},spec:{},snapT:0,inT:0,lastSnap:0,lastN:0,lastEv:0,cl:{},snapN:0,qm:false,qmEnd:0,jw:false,starting:false,
  cfg:{max:16,fill:32,size:'A',ts:1},rname:'',pw:'',pub:true,lock:false,chat:[],chatT:{}};
function peerOpts(){const q=new URLSearchParams(location.search);const o={debug:0};
  if(q.get('peerhost')){o.host=q.get('peerhost');o.port=+(q.get('peerport')||9000);o.path='/';o.secure=false;o.config={iceServers:[]}}
  else o.config={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}].concat(Array.isArray(window.AR_ICE)?window.AR_ICE:[])};
  return o}
const randCode=()=>{const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=A[Math.floor(Math.random()*A.length)];return s};
const jsonBytes=s=>{let n=s.length;for(let i=0;i<s.length;i++)if(s.charCodeAt(i)>127)n+=2;return n};
const PeerT={kind:'peer',peer:null,conns:new Map(),hostConn:null,unl:false,
  ok(){return typeof window.Peer==='function'&&typeof window.RTCPeerConnection==='function'},
  qmId(i){return NET_PREFIX+'qm'+i},prId(i){return NET_PREFIX+'pr'+i},bk:null,
  // listed room: claim the first free beacon slot; the beacon answers probes with the room card
  beacon(info,i){i=i||0;if(i>=ROOM_SLOTS||!this.peer)return;const b=this.bk=new Peer(this.prId(i),peerOpts());
    b.on('connection',c=>{c.on('data',d=>{if(d&&d.t==='q'){try{c.send(info())}catch(e){}setTimeout(()=>{try{c.close()}catch(e){}},1500)}})});
    b.on('error',e=>{if(e.type==='unavailable-id'&&this.bk===b){try{b.destroy()}catch(x){}this.bk=null;setTimeout(()=>{if(this.peer)this.beacon(info,i+1)},150)}});
    b.on('disconnected',()=>{if(this.bk===b&&!b.destroyed)setTimeout(()=>{try{if(this.bk===b&&!b.destroyed)b.reconnect()}catch(e){}},1000)})},
  unbeacon(){const b=this.bk;this.bk=null;if(b)try{b.destroy()}catch(e){}},
  // read every beacon at once (its own short-lived peer, so it never disturbs a game connection)
  list(cb){let done=false,got=0,miss=0,opened=false;const L=[];let p;try{p=new Peer(undefined,peerOpts())}catch(e){cb(L,false);return}
    const fin=()=>{if(done)return;done=true;clearTimeout(t0);setTimeout(()=>{try{p.destroy()}catch(e){}},300);cb(L,opened)};
    const t0=setTimeout(fin,9000),chk=()=>{if(got+miss>=ROOM_SLOTS)fin()};
    p.on('open',()=>{opened=true;setTimeout(fin,3500);for(let i=0;i<ROOM_SLOTS;i++){const c=p.connect(this.prId(i),{reliable:true,serialization:'json'});let seen=false;
      c.on('open',()=>{try{c.send({t:'q',v:VER})}catch(e){}});
      c.on('data',d=>{if(seen||!d||d.t!=='ri')return;seen=true;L.push(d);got++;try{c.close()}catch(e){}chk()})}});
    p.on('error',e=>{if(e.type==='peer-unavailable'){miss++;chk()}else if(NONFATAL.indexOf(e.type)<0)fin()})},
  host(id,h){this.unl=false;const p=this.peer=new Peer(id,peerOpts());
    p.on('open',()=>h.open());
    p.on('connection',c=>{c.on('data',d=>{if(!d||!d.t)return;if(d.t==='hello'&&!this.conns.has(c.peer)){this.conns.set(c.peer,c);h.join(c.peer,d)}else if(this.conns.get(c.peer)===c)h.msg(c.peer,d);
        else if(d.t==='q'&&h.info){try{c.send(h.info())}catch(e){}}});
      const drop=()=>{if(this.conns.get(c.peer)===c){this.conns.delete(c.peer);h.leave(c.peer)}};c.on('close',drop);c.on('error',drop)});
    p.on('error',e=>h.error(e.type));p.on('disconnected',()=>{if(!this.unl&&this.peer===p)try{p.reconnect()}catch(e){}})},
  // probe every quick-match slot at once; a slot that answers 'qi' holds a lobby. Stops early once a joinable lobby answers.
  scan(win,cb){let done=false,opened=false,to=null;const R=[];const p=this.peer=new Peer(undefined,peerOpts());
    const fin=v=>{if(done)return;done=true;clearTimeout(to);clearTimeout(t0);cb(v)};
    const t0=setTimeout(()=>{if(!opened)fin(null)},12000);
    p.on('open',()=>{opened=true;to=setTimeout(()=>fin(R),win);
      for(let i=0;i<QM_SLOTS;i++){const c=p.connect(this.qmId(i),{reliable:true,serialization:'json'});const r=R[i]={s:'?',c};
        c.on('open',()=>{try{c.send({t:'q',v:VER})}catch(e){}});
        c.on('data',d=>{if(done||!d||d.t!=='qi'||r.s==='h')return;r.s='h';r.n=d.n|0;r.st=d.st;r.v=d.v;
          if(d.v===VER&&d.st==='lobby'&&r.n<MAX_HUMANS){clearTimeout(to);to=setTimeout(()=>fin(R),900)}})}});
    p.on('error',e=>{if(NONFATAL.indexOf(e.type)<0)fin(null)})},
  // keep the probe connection to the chosen lobby and continue as a normal client on it
  adopt(c,hello,h){this.hostConn=c;c.on('data',d=>h.msg(d));c.on('close',()=>h.close());
    if(this.peer)this.peer.on('error',e=>{if(NONFATAL.indexOf(e.type)<0)h.error(e.type)});try{c.send(hello)}catch(e){}h.open()},
  join(code,hello,h){const p=this.peer=new Peer(undefined,peerOpts());
    p.on('open',()=>{const c=this.hostConn=p.connect(NET_PREFIX+code,{reliable:true,serialization:'json'});
      c.on('open',()=>{c.send(hello);h.open()});c.on('data',d=>h.msg(d));c.on('close',()=>h.close())});
    p.on('error',e=>h.error(e.type))},
  send(cid,m){const c=this.conns.get(cid);if(c&&c.open)try{c.send(m)}catch(e){}},
  snap(cid,s){this.send(cid,s)},
  toHost(m){const c=this.hostConn;if(c&&c.open)try{c.send(m)}catch(e){}},
  input(i){this.toHost({t:'i',mx:i[0],my:i[1],a:i[2],b:i[3]})},
  kick(cid){const c=this.conns.get(cid);if(c){this.conns.delete(cid);setTimeout(()=>{try{c.close()}catch(e){}},400)}},
  // a quick-match lobby gives its slot back once the match starts (open connections stay up)
  setState(st){const p=this.peer;if(st==='play'&&p&&!this.unl&&String(p.id||'').indexOf(NET_PREFIX+'qm')===0){this.unl=true;try{p.disconnect()}catch(e){}}},
  budget:1e9,rate:15,
  close(){this.unbeacon();try{this.peer&&this.peer.destroy()}catch(e){}this.peer=null;this.conns=new Map();this.hostConn=null;this.unl=false}};
// Artifact room transport: reliable messages + latest snapshot ride in per-client named rooms' presence objects.
const RoomT={kind:'room',api:null,g:null,ch:new Map(),me:null,budget:3500,rate:12,qm:false,qk:'',warm:false,
  ok(){return !!this.api},
  // quick-match lobbies advertise {qm:{c,n,v,st}} in the page-wide room presence
  qmOthers(){const L=[];if(!this.api)return L;let ps=[];try{ps=this.api.peers()||[]}catch(e){}
    for(const p of ps){const q=p.presence&&p.presence.qm;if(p.isMe||!q||typeof q.c!=='string'||!/^[A-Z0-9]{5}$/.test(q.c)||q.v!==VER||q.st!=='lobby'||(q.n|0)>=MAX_HUMANS)continue;L.push({c:q.c,n:q.n|0})}return L},
  qmList(cb){setTimeout(()=>cb(this.qmOthers()),this.warm?400:2200)},
  // listed rooms advertise {pr:{...room card}} in the page-wide presence
  pk:'',advert(info){if(!this.api)return;const k=info?JSON.stringify(info):'';if(this.pk===k)return;this.pk=k;this.api.presence({pr:info||null}).catch(()=>{})},
  list(cb){setTimeout(()=>{const L=[];let ps=[];try{ps=this.api.peers()||[]}catch(e){}
    for(const p of ps){const q=p.presence&&p.presence.pr;if(p.isMe||!q||typeof q!=='object')continue;L.push(Object.assign({},q,{t:'ri'}))}cb(L,true)},this.warm?300:2200)},
  rn(code,cid){return 'ar5-'+code.toLowerCase()+(cid?'-'+cid:'')},
  async host(code,h){
    try{this.g=await this.api.join(this.rn(code))}catch(e){h.error('room');return}
    await new Promise(r=>setTimeout(r,1000));
    if(this.g.peers().some(p=>!p.isMe&&p.presence&&p.presence.h)){try{this.g.leave()}catch(e){}this.g=null;h.error('unavailable-id');return}
    this.code=code;this.peerCid=new Map();this.st='lobby';this.g.presence({h:{v:VER,st:'lobby'}}).catch(()=>{});
    this.g.onPeers(chg=>{
      for(const p of chg.peers){const hi=p.presence&&p.presence.hello;if(p.isMe||!hi||typeof hi.cid!=='string'||!/^[a-z0-9]{6,12}$/.test(hi.cid)||this.peerCid.has(p.peer))continue;
        if(hi.v!==VER)continue;this.peerCid.set(p.peer,hi.cid);this.openClient(hi.cid,hi,h)}
      for(const p of chg.left){const cid=this.peerCid.get(p.peer);if(cid){this.peerCid.delete(p.peer);const c=this.ch.get(cid);if(c){this.ch.delete(cid);try{c.r.leave()}catch(e){}h.leave(cid)}}}});
    h.open()},
  async openClient(cid,hello,h){let r;try{r=await this.api.join(this.rn(this.code,cid))}catch(e){return}
    const c={r,outSeq:0,outQ:[],inAck:0,S:null,dirty:false};this.ch.set(cid,c);
    r.onPeers(chg=>{for(const p of chg.peers){if(p.isMe||!p.presence)continue;const pr=p.presence;
      if(typeof pr.k==='number'&&c.outQ.length){c.outQ=c.outQ.filter(q=>q[0]>pr.k)}
      if(typeof pr.ea==='number')net.cl[cid]&&(net.cl[cid].ea=pr.ea);
      if(Array.isArray(pr.q))for(const q of pr.q){if(!Array.isArray(q)||q[0]<=c.inAck)continue;c.inAck=q[0];if(q[1]&&typeof q[1]==='object')h.msg(cid,q[1]);c.dirty=true}
      if(Array.isArray(pr.i))h.msg(cid,{t:'i',mx:+pr.i[0]||0,my:+pr.i[1]||0,a:pr.i[2]===2?2:pr.i[2]?1:0,b:pr.i[3]?1:0})}
      if(c.dirty)this.flush(c)});
    h.join(cid,Object.assign({t:'hello'},hello))},
  flush(c){c.dirty=false;const o={q:c.outQ,k:c.inAck};if(c.S)o.S=c.S;c.r.presence(o).catch(()=>{})},
  send(cid,m){const c=this.ch.get(cid);if(!c)return;c.outQ.push([++c.outSeq,m]);if(c.outQ.length>12)c.outQ.splice(0,c.outQ.length-12);this.flush(c)},
  snap(cid,s){const c=this.ch.get(cid);if(!c)return;c.S=s;this.flush(c)},
  kick(cid){const c=this.ch.get(cid);if(c)setTimeout(()=>{this.ch.delete(cid);try{c.r.leave()}catch(e){}},1500)},
  setState(st){if(this.g&&this.st!==st){this.st=st;this.g.presence({h:{v:VER,st}}).catch(()=>{})}
    if(this.qm&&this.api&&this.code){const n=net.lobby.length,k=st+n;if(this.qk!==k){this.qk=k;this.api.presence({qm:st==='play'?null:{c:this.code,n,v:VER,st}}).catch(()=>{})}}},
  async join(code,hello,h){
    let g;try{g=this.g=await this.api.join(this.rn(code))}catch(e){h.error('room');return}
    let host=null;for(let t=0;t<30&&!host;t++){host=g.peers().find(p=>!p.isMe&&p.presence&&p.presence.h);if(!host)await new Promise(r=>setTimeout(r,200))}
    if(!host){try{g.leave()}catch(e){}this.g=null;h.error('peer-unavailable');return}
    if(host.presence.h.v!==VER){h.error('version');return}if(host.presence.h.st==='play'){h.msg({t:'busy'});return}
    const cid=randId(8);let r;try{r=await this.api.join(this.rn(code,cid))}catch(e){h.error('room');return}
    const c=this.me={r,cid,outSeq:0,outQ:[],inAck:0,inp:[0,0,0],lastS:0,ok:false,ea:0};
    g.onPeers(chg=>{if(chg.left.some(p=>p.peer===host.peer))h.close()});
    r.onPeers(chg=>{for(const p of chg.peers){if(p.isMe||!p.presence)continue;const pr=p.presence;if(!c.ok){c.ok=true;h.open()}let dirty=false;
      if(typeof pr.k==='number'&&c.outQ.length){c.outQ=c.outQ.filter(q=>q[0]>pr.k)}
      if(Array.isArray(pr.q))for(const q of pr.q){if(!Array.isArray(q)||q[0]<=c.inAck)continue;c.inAck=q[0];dirty=true;h.msg(q[1])}
      if(pr.S&&pr.S.n>c.lastS){c.lastS=pr.S.n;h.msg(pr.S);if(net.lastEv!==c.ea){c.ea=net.lastEv;dirty=true}}
      if(dirty)this.flushC()}});
    g.presence({hello:Object.assign({cid,v:VER},hello)}).catch(()=>{});
    setTimeout(()=>{if(!c.ok)h.error('peer-unavailable')},15000)},
  flushC(){const c=this.me;if(!c)return;c.r.presence({q:c.outQ,k:c.inAck,i:c.inp,ea:net.lastEv}).catch(()=>{})},
  toHost(m){const c=this.me;if(!c)return;c.outQ.push([++c.outSeq,m]);if(c.outQ.length>16)c.outQ.splice(0,c.outQ.length-16);this.flushC()},
  input(i){const c=this.me;if(!c)return;if(c.inp[0]===i[0]&&c.inp[1]===i[1]&&c.inp[2]===i[2])return;c.inp=i;this.flushC()},
  close(){if(this.qm&&this.qk&&this.api)this.api.presence({qm:null}).catch(()=>{});if(this.pk)this.advert(null);this.qm=false;this.qk='';this.code='';
    try{this.me&&this.me.r.leave()}catch(e){}for(const c of this.ch.values())try{c.r.leave()}catch(e){}try{this.g&&this.g.leave()}catch(e){}this.g=null;this.me=null;this.ch=new Map()}};
const mpTransport=()=>PeerT.ok()?PeerT:RoomT.ok()?RoomT:null;
const mpSupported=()=>!!mpTransport();
function arenaDisplayName(u){
  return u.hero&&isHuman(u)&&window.ArenaLanguage?ArenaLanguage.literal(u.name):u.name;
}
function resultName(u){
  return isHuman(u)?u.name:window.ArenaLanguage?.text(u.name)??u.name;
}
function myName(){return($('pname').value.trim()||(window.ArenaLanguage?.text('ผู้เล่น')||'ผู้เล่น')).slice(0,12)}
function netSend(m){if(net.tr)net.tr.toHost(m)}
function leaveNet(){const t=net.tr;net.tr=null;net.mode='solo';net.jw=false;net.inputs={};net.spec={};net.cl={};if(t)t.close()}
// shared host callbacks (private room and quick-match lobby)
function hostHandlers(onTaken){let opened=false;return{
  open:()=>{opened=true;net.lobby=[{ctrl:'host',name:myName(),look:chosenLook,team:0}];net.qmEnd=performance.now()+QM_WAIT*1000;showLobby();menuMsg('');if(net.qm)net.tr.setState('lobby');
    else{hostChat('','', 'สร้างห้องแล้ว · รหัส '+net.code,1);if(net.pub&&net.tr&&net.tr.kind==='peer')PeerT.beacon(roomInfo);advertise()}},
  join:(cid,hello)=>hostJoin(cid,hello),msg:(cid,d)=>hostOnData(cid,d),leave:cid=>hostDrop(cid),
  info:()=>({t:'qi',v:VER,n:net.lobby.length,st:roomSt()}),
  error:t=>{if(t==='unavailable-id'&&onTaken&&!opened){onTaken();return}
    if(opened||NONFATAL.indexOf(t)>=0)return;   // once the lobby is up, keep it: signalling hiccups and dead probes don't matter
    if(state==='lobby'||state==='menu'){menuMsg(t==='room'?'ห้องออนไลน์ของหน้านี้ใช้ไม่ได้ (ต้องล็อกอิน Claude และได้รับเชิญ)':'เชื่อมต่อเซิร์ฟเวอร์ห้องไม่ได้ ตรวจอินเทอร์เน็ต');leaveNet();showMenu()}}}}
function hostRoom(retry){
  const T=mpTransport();if(!T){menuMsg(MP_HINT);return}
  leaveNet();net.qm=false;net.tr=T;net.mode='host';net.code=randCode();net.chat=[];
  if(!retry){net.rname=cleanName($('rname').value)||myName()+(window.ArenaLanguage?.text(' ห้อง')||' ห้อง');net.pw=$('rpw').value.trim().slice(0,12);net.pub=$('rpub').checked;net.lock=!!net.pw}
  menuMsg('กำลังสร้างห้อง…','#9fb6b8');
  T.host(T.kind==='peer'?NET_PREFIX+net.code:net.code,hostHandlers(()=>{if((retry||0)<4)hostRoom((retry||0)+1);else{menuMsg('สร้างห้องไม่สำเร็จ ลองอีกครั้ง');leaveNet();showMenu()}}))}
// ---- quick match: find strangers to play with ----
function quickMatch(tries,skip,note){
  const T=mpTransport();if(!T){menuMsg(MP_HINT);return}
  tries=tries||0;skip=skip||[];
  leaveNet();net.qm=true;net.tr=T;net.mode='search';net.code='';net.lobby=[];net.chat=[];net.rname='';const tok=net.qmTok=(net.qmTok||0)+1;showSearch(note);
  const live=()=>net.qmTok===tok&&net.mode==='search';
  const again=sk=>{if(net.qmTok!==tok)return;if(tries>=4){leaveNet();showMenu();menuMsg('ยังหาห้องไม่ได้ ลองกดจับคู่อีกครั้ง');return}
    setTimeout(()=>{if(net.qmTok===tok)quickMatch(tries+1,sk||skip,note)},250+Math.random()*700)};
  if(T.kind==='peer'){
    T.scan(QM_SCAN,R=>{if(!live())return;if(!R){leaveNet();showMenu();menuMsg('เชื่อมต่อเซิร์ฟเวอร์จับคู่ไม่ได้ ตรวจอินเทอร์เน็ต');return}
      let b=-1;R.forEach((r,i)=>{if(r.s==='h'&&r.v===VER&&r.st==='lobby'&&r.n<MAX_HUMANS&&(b<0||r.n>R[b].n))b=i});
      for(let i=0;i<R.length;i++)if(i!==b)try{R[i].c.close()}catch(e){}
      if(b>=0){qmJoinPeer(T,R[b].c);return}
      // nobody waiting: open a lobby on the lowest slot that isn't held. If someone grabs it first, scan again (and join them).
      const k=R.findIndex((r,i)=>r.s!=='h'&&skip.indexOf(i)<0);T.close();if(k<0){again([]);return}
      net.mode='host';net.code=randCode();T.host(T.qmId(k),hostHandlers(()=>{T.close();net.mode='search';again(skip.concat([k]))}))})}
  else T.qmList(L=>{if(!live())return;L.sort((a,b)=>b.n-a.n||(a.c<b.c?-1:1));
      if(L.length){qmJoinRoom(L[0].c);return}
      net.mode='host';net.code=randCode();T.qm=true;T.host(net.code,hostHandlers(()=>{T.close();net.mode='search';again()}))})}
function qmHello(){return{t:'hello',v:VER,name:myName(),look:chosenLook}}
function qmJoinPeer(T,c){net.mode='client';net.jw=true;const fail=setTimeout(()=>{if(net.mode==='client'&&net.jw)qmRequeue()},15000);T.adopt(c,qmHello(),clientHandlers('',fail))}
function qmJoinRoom(code){net.mode='client';net.code=code;net.jw=true;const fail=setTimeout(()=>{if(net.mode==='client'&&net.jw)qmRequeue()},15000);RoomT.join(code,qmHello(),clientHandlers(code,fail))}
function qmRequeue(note){note=note||'ห้องเต็มหรือเริ่มไปแล้ว — กำลังหาห้องใหม่…';leaveNet();net.qm=true;net.mode='search';showSearch(note);
  const tok=net.qmTok=(net.qmTok||0)+1;setTimeout(()=>{if(net.qmTok===tok&&net.mode==='search')quickMatch(0,[],note)},200+Math.random()*500)}
function hostJoin(cid,d){
  if(d.v!==VER){net.tr.send(cid,{t:'ver'});net.tr.kick(cid);return}
  if(state==='play'){net.tr.send(cid,{t:'busy'});net.tr.kick(cid);return}
  if(!net.qm&&net.pw&&String(d.pw||'')!==net.pw){net.tr.send(cid,{t:'pw'});net.tr.kick(cid);return}
  if(net.lobby.length>=roomMax()){net.tr.send(cid,{t:'full'});net.tr.kick(cid);return}
  net.cl[cid]={q:[],seq:0,ea:0,seen:performance.now()};
  const nm=cleanName(d.name)||'เพื่อน';net.lobby.push({ctrl:cid,name:nm,look:clamp(d.look|0,0,LOOKS.length-1),team:autoTeam()});
  net.tr.send(cid,{t:'ch',a:net.chat.slice(-20)});hostChat('','',nm+' เข้าห้อง',1);
  if(net.qm){const now=performance.now();net.qmEnd=Math.max(net.qmEnd,now+10000);if(net.lobby.length>=MAX_HUMANS)net.qmEnd=Math.min(net.qmEnd,now+4000)}
  pushLobby();AU.play('pick')}
function hostOnData(cid,d){
  if(!d||!d.t)return;if(net.cl[cid])net.cl[cid].seen=performance.now();
  if(d.t==='look'){const p=net.lobby.find(p=>p.ctrl===cid);if(p){p.look=clamp(d.look|0,0,LOOKS.length-1);pushLobby()}}
  else if(d.t==='i'){net.inputs[cid]={mx:clamp(+d.mx||0,-1,1),my:clamp(+d.my||0,-1,1),atk:!!d.a,am:d.a===2,blk:!!d.b}}   // a: 1 attack (hero first) · 2 monster attack (arena-buttons.js)
  else if(d.t==='xs'){const u=units.find(u=>u.ctrl===cid);if(CURSED&&u&&state==='play')castSpecial(u,Number.isFinite(d.x)&&Number.isFinite(d.y)?{x:clamp(+d.x,0,WORLD),y:clamp(+d.y,0,WORLD)}:null)}
  else if(d.t==='buy'){const u=units.find(u=>u.ctrl===cid);if(CURSED&&u&&state==='play')shopBuy(u,String(d.k).slice(0,4))}
  else if(d.t==='dg'){const u=units.find(u=>u.ctrl===cid);if(CURSED&&u&&state==='play')tpsDodge(u,clamp(+d.x||0,-1,1),clamp(+d.y||0,-1,1))}
  else if(d.t==='k'){const u=units.find(u=>u.ctrl===cid);if(u&&state==='play'&&d.i>=0&&d.i<3)cast(u,d.i|0,Number.isFinite(d.x)&&Number.isFinite(d.y)?{x:clamp(+d.x,0,WORLD),y:clamp(+d.y,0,WORLD)}:null)}
  else if(d.t==='u'){const u=units.find(u=>u.ctrl===cid);if(u&&state==='play')usePotion(u,clamp(d.b|0,0,BAG.length-1))}
  else if(d.t==='tm'){const p=net.lobby.find(p=>p.ctrl===cid);if(p&&state==='lobby'&&!net.qm&&setTeam(p,d.k|0))pushLobby()}
  else if(d.t==='l'){const u=units.find(u=>u.ctrl===cid);if(u&&state==='play'&&d.i>=0&&d.i<3)learn(u,d.i|0)}
  else if(d.t==='pk'){const u=units.find(u=>u.ctrl===cid);if(u&&state==='play')pickSwap(u,d.id|0)}
  else if(d.t==='ob'){const u=units.find(u=>u.ctrl===cid);if(u&&state==='play')openBox(u,d.id|0)}
  else if(d.t==='sw'){const u=units.find(u=>u.ctrl===cid);if(u&&state==='play')swapWeapons(u)}
  else if(d.t==='spec'){net.spec[cid]=d.id|0}
  else if(d.t==='ch'){const p=net.lobby.find(p=>p.ctrl===cid),now=performance.now();if(!p||now-(net.chatT[cid]||0)<600)return;net.chatT[cid]=now;
    const t=cleanMsg(d.s);if(t)hostChat(p.name,p.look,t)}
}
function hostDrop(cid){
  delete net.inputs[cid];delete net.cl[cid];
  const p=net.lobby.find(p=>p.ctrl===cid);net.lobby=net.lobby.filter(p=>p.ctrl!==cid);if(p&&state!=='play'&&net.kicking!==cid)hostChat('','',p.name+' ออกจากห้อง',1);
  const u=units.find(u=>u.ctrl===cid);if(u&&state==='play'){u.ctrl=null;u.bot=true;u.ai.pref=u.wk||WK[0];u.name+=' (บอท)';emit({t:'f',s:`${p?p.name:'เพื่อน'} หลุดจากเกม`})}
  if(state==='lobby')pushLobby();else if(!$('end').classList.contains('hidden'))endButtons()}
function pushLobby(){renderLobby();if(!net.tr)return;net.tr.setState(roomSt());advertise();
  const m={t:'lobby',players:net.lobby.map(p=>({name:p.name,look:p.look,team:p.team|0})),code:net.code,qm:net.qm?1:0,qt:net.qm?qmLeft():0,name:net.rname,cfg:net.cfg,lock:net.pw?1:0};
  for(const cid in net.cl){m.you=net.lobby.findIndex(p=>p.ctrl===cid);net.tr.send(cid,m)}}
// ---- teams in the lobby: duo / squad rooms let players pick a team; bots fill the rest ----
function nTeams(){const g=cfgGame(net.cfg,net.lobby.length);return Math.max(2,Math.round(normCfg(g).n/(net.cfg.ts||1)))}
function teamCount(k){return net.lobby.filter(p=>(p.team|0)===k).length}
function autoTeam(){const ts=net.cfg.ts||1;if(ts<=1)return 0;const N=nTeams();for(let k=0;k<N;k++)if(teamCount(k)<ts)return k;return 0}
function setTeam(p,k){const ts=net.cfg.ts||1;if(ts<=1||k<0||k>=nTeams()||(p.team|0)===k||teamCount(k)>=ts)return false;p.team=k;return true}
function fixTeams(){const ts=net.cfg.ts||1;if(ts<=1){for(const p of net.lobby)p.team=0;return}const N=nTeams();const seen={};
  for(const p of net.lobby){let k=p.team|0;if(k>=N||(seen[k]||0)>=ts){k=-1;for(let j=0;j<N;j++)if((seen[j]||0)<ts){k=j;break}if(k<0)k=0}p.team=k;seen[k]=(seen[k]||0)+1}}
// ---- online rooms: room card, settings, chat ----
function roomMax(){return net.qm?MAX_HUMANS:clamp(net.cfg.max|0,2,MAX_HUMANS)}
const TS_N={1:'ทุกคนเป็นศัตรู',2:'ทีมละ 2 คน',4:'ทีมละ 4 คน'};
function roomSt(){return state==='play'||net.starting?'play':net.lobby.length>=roomMax()?'full':'lobby'}
function roomInfo(){return{t:'ri',v:VER,c:net.code,name:net.rname,host:myName(),n:net.lobby.length,max:roomMax(),st:roomSt(),lock:net.pw?1:0,fill:net.cfg.fill|0,size:net.cfg.size,ts:net.cfg.ts||1}}
function advertise(){if(net.mode==='host'&&!net.qm&&net.pub&&net.tr&&net.tr.kind==='room')RoomT.advert(roomInfo())}
const cleanName=s=>String(s==null?'':s).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,20);
const cleanMsg=s=>String(s==null?'':s).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,80);
function cfgGame(c,hum){const f=c.fill|0;return{n:f?Math.max(f,hum):hum,size:c.size,ts:c.ts||1}}
function cfgText(c,hum){const g=normCfg(cfgGame(c,Math.max(2,hum))),sz=c.size==='A'?'อัตโนมัติ ('+SIZE_N[g.size]+')':SIZE_N[c.size]||'อัตโนมัติ';
  return `⚔️ ${TS_N[c.ts||1]} · 👥 คนจริงสูงสุด ${clamp(c.max|0,2,MAX_HUMANS)} · 🤖 ${c.fill?'เติมบอทให้ครบ '+(c.fill|0)+' คน':'ไม่มีบอท'} · 🗺️ แมพ${sz}`}
function hostChat(n,k,s,sys){const m={n:String(n).slice(0,12),k:k|0,s:String(s).slice(0,80),y:sys?1:0};chatAdd(m);if(net.tr)for(const cid in net.cl)net.tr.send(cid,{t:'ch',m})}
function chatAdd(m){net.chat.push(m);if(net.chat.length>40)net.chat.splice(0,net.chat.length-40);renderChat()}
function chatClean(m){return m&&typeof m==='object'?{n:String(m.n||'').slice(0,12),k:clamp(m.k|0,0,LOOKS.length-1),s:cleanMsg(m.s),y:m.y?1:0}:null}
function lobbySystemText(message){
  if(window.ArenaLanguage?.language!=='en')return message;
  for(const [suffix,english] of [[' เข้าห้อง',' joined the room'],[' ออกจากห้อง',' left the room'],[' ถูกเชิญออก',' was removed']]){
    if(message.endsWith(suffix))return message.slice(0,-suffix.length)+english;
  }
  return ArenaLanguage.text(message);
}
function renderChat(){const L=$('chatLog');if(!L)return;const atEnd=L.scrollHeight-L.scrollTop-L.clientHeight<30;
  L.innerHTML=net.chat.map(m=>m.y?`<div class="sy" translate="no">• ${escapeHtml(lobbySystemText(m.s))}</div>`:`<div><span translate="no" class="nm" style="color:${LOOKS[clamp(m.k|0,0,7)].c}">${escapeHtml(m.n)}</span><span translate="no" class="tx">${escapeHtml(m.s)}</span></div>`).join('')||'<div class="sy">ยังไม่มีข้อความ · ทักทายกันได้เลย</div>';
  if(atEnd)L.scrollTop=L.scrollHeight}
function sendChat(){const i=$('chatIn'),t=cleanMsg(i.value);if(!t)return;i.value='';
  if(net.mode==='host')hostChat(myName(),chosenLook,t);else if(net.mode==='client')netSend({t:'ch',s:t})}
function kickPlayer(cid){if(net.mode!=='host'||!net.cl[cid])return;const p=net.lobby.find(p=>p.ctrl===cid);net.tr.send(cid,{t:'kick'});net.tr.kick(cid);net.kicking=cid;hostDrop(cid);net.kicking=null;if(p)hostChat('','',p.name+' ถูกเชิญออก',1)}
function clientHandlers(code,fail){return{open:()=>{clearTimeout(fail)},msg:clientOnData,
  close:()=>{clearTimeout(fail);if(net.mode!=='client')return;const qm=net.qm;
    if(state==='play'&&gameOver){leaveNet();endButtons();return}   // host left after the match: stay on the results screen
    leaveNet();if(qm&&state!=='play'){qmRequeue('ห้องเดิมปิดไป — กำลังหาห้องใหม่…');return}
    showMenu();menuMsg('หลุดจากห้อง (โฮสต์ออกหรือเน็ตหลุด)')},
  error:t=>{if(net.mode!=='client'||!net.jw&&NONFATAL.indexOf(t)>=0)return;clearTimeout(fail);if(net.qm&&state!=='play'){qmRequeue();return}
    menuMsg(t==='peer-unavailable'?'ไม่พบห้อง '+code:t==='version'?'ห้องนี้ใช้เกมคนละเวอร์ชัน ให้ทุกคนอัปเดต':t==='room'?'ห้องออนไลน์ของหน้านี้ใช้ไม่ได้ (ต้องล็อกอิน Claude และได้รับเชิญ)':'เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ต');leaveNet();showMenu()}}}
function joinRoom(code,pw){
  const T=mpTransport();if(!T){menuMsg(MP_HINT);return}
  code=code.toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==5){menuMsg('รหัสห้องต้องมี 5 ตัว');return}
  leaveNet();net.qm=false;net.tr=T;net.mode='client';net.code=code;net.jw=true;net.chat=[];net.rname='';menuMsg('กำลังเข้าห้อง '+code+'…','#9fb6b8');
  const fail=setTimeout(()=>{if(net.mode==='client'&&net.jw){menuMsg('เข้าห้องไม่สำเร็จ ลองอีกครั้ง หรือใช้ Wi-Fi เดียวกัน');leaveNet();showMenu()}},20000);
  T.join(code,{t:'hello',v:VER,name:myName(),look:chosenLook,pw:String(pw||'').slice(0,12)},clientHandlers(code,fail))}
function clientOnData(d){if(!d||!d.t)return;
  switch(d.t){case 'lobby':net.jw=false;net.lobby=Array.isArray(d.players)?d.players:[];net.qm=!!d.qm;net.rname=cleanName(d.name);net.lock=!!d.lock;
      if(d.cfg&&typeof d.cfg==='object')net.cfg={max:clamp(d.cfg.max|0,2,MAX_HUMANS),fill:clamp(d.cfg.fill|0,0,TOTAL_HEROES),size:SIZE_F[d.cfg.size]||d.cfg.size==='A'?d.cfg.size:'A',ts:[1,2,4].indexOf(d.cfg.ts|0)>=0?d.cfg.ts|0:1};
      net.lobby=net.lobby.map(p=>({name:cleanName(p&&p.name).slice(0,12)||'?',look:clamp(p&&p.look|0,0,LOOKS.length-1),team:clamp(p&&p.team|0,0,15)}));net.youI=d.you|0;if(d.qm)net.qmEnd=performance.now()+clamp(+d.qt||0,0,120)*1000;if(state!=='lobby'){showLobby();menuMsg('')}else renderLobby();break;
    case 'full':if(net.qm){qmRequeue();break}menuMsg('ห้องเต็มแล้ว');leaveNet();showMenu();break;
    case 'busy':if(net.qm){qmRequeue();break}menuMsg('ห้องนี้กำลังเล่นอยู่ รอจบเกมก่อน');leaveNet();showMenu();break;
    case 'ver':if(net.qm){qmRequeue();break}menuMsg('ห้องนี้ใช้เกมคนละเวอร์ชัน ให้ทุกคนอัปเดต');leaveNet();showMenu();break;
    case 'pw':menuMsg('รหัสผ่านห้องไม่ถูกต้อง');pwAsk(net.code);leaveNet();showMenu();break;
    case 'kick':menuMsg('คุณถูกเชิญออกจากห้อง');leaveNet();showMenu();break;
    case 'ch':if(Array.isArray(d.a)){net.chat=d.a.map(chatClean).filter(m=>m&&m.s);renderChat()}else{const m=chatClean(d.m);if(m&&m.s)chatAdd(m)}break;
    case 'start':clientStart(d);break;case 'S':if(state==='play')applySnap(d);else if(net.pendS)net.pendS.push(d);break}}
// ---- events: per-client queues, compact array encoding ----
function evFocus(cid){let F=units.find(u=>u.ctrl===cid);if(F&&F.dead&&net.spec[cid])F=UMAP.get(net.spec[cid])||F;return F}
function netQueue(e){const ids=Object.keys(net.cl);if(!ids.length||state!=='play'&&e.t!=='over')return;
  for(const cid of ids){const c=net.cl[cid];const hero=units.find(u=>u.ctrl===cid);
    if(e.v&&(e.t==='x'||e.t==='s'||e.t==='a'||e.t==='f')){if(e.t!=='f'&&!(hero&&e.v.includes(hero.id)))continue}
    if(e.t==='end'&&!(hero&&hero.id===e.id))continue;
    const ownDefeat=e.t==='fx'&&e.k==='die'&&hero&&hero.id===e.by;
    if(!ownDefeat&&(e.t==='b'||e.t==='k'||e.t==='w'||e.t==='fx'||(e.t==='s'&&!e.g&&!e.v)||(e.t==='x'&&!e.v))){
      const F=evFocus(cid);if(F&&(Math.abs(F.x-e.x)>1700||Math.abs(F.y-e.y)>1300))continue}
    c.q.push([++c.seq,encEv(e,hero)]);
    if(c.q.length>80){
      const drop=c.q.findIndex(([,q])=>!(q?.t==='fx'&&q.k==='die'&&q.by===hero?.id));
      c.q.splice(drop<0?0:drop,1);
    }}}
function encEv(e,hero){switch(e.t){
  case 'x':return e.i===undefined?['x',e.x,e.y,e.s,e.c,e.l,e.g?1:0]:['x',e.x,e.y,e.s,e.c,e.l,e.g?1:0,e.i,e.o];case 's':return['s',e.n,e.x,e.y,e.g?1:0];case 'b':return['b',e.x,e.y,e.c,e.n];case 'k':return['k',e.a,e.x,e.y];
  case 'w':return['w',e.id,e.a,e.r|0,e.c,e.k||0];
  case 'f':return['f',e.s,e.v&&hero&&e.v.includes(hero.id)?1:0];case 'a':return['a',e.s,e.d||0];
  default:{const o=Object.assign({},e);delete o.v;return o}}}
function decEv(a){if(!Array.isArray(a))return a;switch(a[0]){
  case 'x':return{t:'x',x:a[1],y:a[2],s:a[3],c:a[4],l:a[5],g:a[6],i:a[7]===null?undefined:a[7],o:a[8]};case 's':return{t:'s',n:a[1],x:a[2],y:a[3],g:a[4]};case 'b':return{t:'b',x:a[1],y:a[2],c:a[3],n:a[4]};
  case 'k':return{t:'k',a:a[1],x:a[2],y:a[3]};case 'w':return{t:'w',id:a[1],a:a[2],r:a[3],c:a[4],k:a[5]};
  case 'f':return{t:'f',s:a[1],v:a[2]?[myId]:null};case 'a':return{t:'a',s:a[1],d:a[2]||2.5}}return null}
// ---- snapshots ----
const f1=v=>Math.round(v*10)/10;
function uflags(o){return(o.dead?1:0)|(o.stunT>0?2:0)|(o.slowT>0?4:0)|(o.buffT>0||o.asT>0?8:0)|(o.hurtT>0?16:0)|(o.hidden?32:0)|(o.inBush?64:0)|(o.dash?128:0)|(o.rootT>0?256:0)|(o.reviveT>0?512:0)
  |(o.atkAnim>0?1024:0)|(o.castAnim>0?2048:0)|(o.wet?4096:0)|(o.shieldHp>0?8192:0)|(o.spinT>0?16384:0)|(o.lotusT>0?32768:0)|(o.leap?65536:0)|(o.invisT>0?131072:0)|(o.burnT>0?262144:0)|(o.aegis?524288:0)|(o.kb?1048576:0)|(o.rise>0?2097152:0)|(o.spdPT>0?4194304:0)|(o.fuseT>0?8388608:0)|(o.ignT>0&&o.ign>=3?16777216:0)|(o.statT>0&&o.stat>0?33554432:0)|(o.rotT>0?67108864:0)}
function heroRow(o){return[o.id,o.x|0,o.y|0,o.hp|0,uflags(o),Math.round(o.fx*99),Math.round(o.fy*99),o.maxHp,o.lvl,o.wk?AW.indexOf(o.wk):-1,o.wt,o.at,o.kills,o.mp|0,o.maxMp,o.shieldHp|0,((o.wv|0)>>15)&3]}
function selfRow(o){const row=[Math.round(o.xp),o.skl[0],o.skl[1],o.skl[2],o.pts,f1(Math.max(0,o.cd[0])),f1(Math.max(0,o.cd[1])),f1(Math.max(0,o.cd[2])),f1(o.armorV),Math.round(o.atkDmg),Math.round(o.spdB*100),Math.round(o.dmgB*100),Math.round(o.mr*100),f1(Math.max(0,o.shieldT)),
  o.bag[0],o.bag[1],o.bag[2],o.bag[3],f1(Math.max(0,o.bcd[0])),f1(Math.max(0,o.bcd[1])),f1(Math.max(0,o.bcd[2])),f1(Math.max(0,o.bcd[3])),f1(Math.max(0,o.spdPT)),o.wk2?AW.indexOf(o.wk2):-1,o.wt2,o.fury|0,o.gold|0,o.wv|0,o.wv2|0,o.xs|0,o.xl|0,f1(Math.max(0,o.xcd||0)),f1(Math.max(0,o.dgcd||0))];if(ARX)row.push(arenaStatusSnapshot(o));return row}
function mobRow(o){const r=[o.id,o.x|0,o.y|0,o.hp|0,uflags(o),Math.round(o.fx*99),Math.round(o.fy*99),o.maxHp];if(o.zombie)r.push(ZK.indexOf(o.kind));else if(o.summon)r.push(-1,EK.indexOf(o.kind));return r}
function aoeRow(a){const row=[a.x|0,a.y|0,a.r|0,f1(a.t),a.delay,a.dot||0,AOE_KINDS.indexOf(a.kind),f1(a.fxT),a.vis,a.ang!==undefined?Math.round(a.ang*100):0,a.shape==='line'?1:a.shape==='cone'?2:0,a.w||a.arc*100|0||0,a.el?EL.indexOf(a.el):-1];if(a.skyFall&&a.delay<.7)row.push(1);return row}
function snapFor(cid,c,budget){let F=evFocus(cid);F=F||{x:CX,y:CY};const R=1500;
  const near=(p,m)=>Math.abs(p.x-F.x)<R+(m||0)&&Math.abs(p.y-F.y)<R*.8+(m||0);
  const h=[],f=[];for(const u of units){if(!u.hero)continue;if(near(u,200))h.push(heroRow(u));else f.push([u.id,u.x|0,u.y|0,uflags(u)])}
  const me=units.find(u=>u.ctrl===cid);const sel=me&&!me.dead?me:F.hero?F:me;
  const mobs=units.filter(o=>o.mob&&!o.dead&&near(o)).sort((a,b)=>(Math.abs(a.x-F.x)+Math.abs(a.y-F.y))-(Math.abs(b.x-F.x)+Math.abs(b.y-F.y))).slice(0,56).map(mobRow);
  const S={t:'S',n:++net.snapN,g:f1(gameT),a:alive,z:[zone.x|0,zone.y|0,zone.r|0,zone.tx|0,zone.ty|0,zone.tr|0,['wait','shrink','done'].indexOf(zone.st),f1(zone.t),zone.ph],h,f,
    me:sel?[sel.id,...selfRow(sel)]:null,m:mobs,p:projs.filter(p=>near(p)).slice(0,40).map(p=>{const a=[p.x|0,p.y|0,p.vx|0,p.vy|0,p.kind,p.r];if(p.el)a.push(EL.indexOf(p.el));return a}),o:aoes.filter(a=>near(a,a.r)).slice(0,24).map(aoeRow),e:[]};
  let size=jsonBytes(JSON.stringify(S));
  if(size>budget){S.m=S.m.slice(0,16);S.f=[];size=jsonBytes(JSON.stringify(S))}
  const ev=c.q.filter(q=>q[0]>(net.tr.kind==='room'?c.ea:0));
  for(const q of ev){const b=jsonBytes(JSON.stringify(q))+1;if(size+b>budget)break;S.e.push(q);size+=b}
  if(net.tr.kind!=='room')c.q.splice(0,S.e.length);else if(c.q.length&&c.ea)c.q=c.q.filter(q=>q[0]>c.ea);
  return S}
function broadcastSnaps(){for(const cid in net.cl){const c=net.cl[cid];try{net.tr.snap(cid,snapFor(cid,c,net.tr.budget))}catch(e){}}}
function withLoading(fn){$('loading').classList.remove('hidden');setTimeout(()=>{try{fn()}finally{$('loading').classList.add('hidden')}},40)}
function hostStartMatch(){if(net.starting)return;net.starting=true;withLoading(()=>{try{hostStartMatch2()}finally{net.starting=false}})}
function hostStartMatch2(){
  const players=net.mode==='host'?net.lobby.slice(0,MAX_HUMANS):[{ctrl:'host',name:myName(),look:chosenLook}];
  let ms;if(typeof R3!=='undefined'&&R3.menuReady&&!R3.menuUsed&&view3D){ms=R3.menuSeed;R3.menuUsed=true}
  let cfg={n:TOTAL_HEROES,size:'L'};
  if(net.mode==='host'&&net.qm)cfg={n:Math.max(QM_TOTAL,players.length),size:'A'};
  else if(net.mode==='host'){if(!(net.cfg.fill|0)&&players.length<2){menuMsg('ปิดบอทอยู่ ต้องมีผู้เล่นอย่างน้อย 2 คน — รอเพื่อนหรือเปิดบอท');return}
    fixTeams();if((net.cfg.ts|0)>1&&!(net.cfg.fill|0)&&new Set(players.map(p=>p.team|0)).size<2){menuMsg('ปิดบอทอยู่ ต้องมีผู้เล่นอย่างน้อย 2 ทีม');return}cfg=cfgGame(net.cfg,players.length)}
  const project=ARX?ArenaProject.forMatch():null;
  const seed=hostNewGame(players,project?.seed??ms,cfg,project);if(view3D&&has3D()&&R3.ok)R3.sync();
  for(const cid in net.cl){const c=net.cl[cid];c.q=[];c.seq=0;c.ea=0;const u=units.find(u=>u.ctrl===cid);net.tr.send(cid,{t:'start',seed,cfg:MC,you:u?u.id:0,heroes:units.filter(u=>u.hero).map(u=>[u.id,u.name,u.look,u.ctrl?1:0,u.team])})}
  enterPlay();if(net.tr)net.tr.setState('play');
}
function clientStart(d){net.pendS=[];withLoading(()=>clientStart2(d))}
function clientStart2(d){setupWorld(d.seed,d.cfg);if(view3D&&has3D()&&R3.ok)R3.sync();for(const h of d.heroes)addUnit(mkHero(h[0],h[1],h[3]?'remote':null,h[2],h[4]|0||h[0]));myId=d.you;alive=d.heroes.length;net.lastN=0;net.lastEv=0;enterPlay();const P=net.pendS||[];net.pendS=null;for(const q of P)applySnap(q)}
function setFlags(u,fl){u.dead=!!(fl&1);u.stunT=fl&2?1:0;u.slowT=fl&4?1:0;u.buffT=fl&8?1:0;u.hurtT=fl&16?.1:0;u.hidden=!!(fl&32);u.inBush=!!(fl&64);u.dash=fl&128?{}:null;
  u.rootT=fl&256?1:0;u.reviveT=fl&512?1:0;if(fl&1024)u.atkAnim=Math.max(u.atkAnim,.2);if(fl&2048)u.castAnim=Math.max(u.castAnim,.3);u.wet=!!(fl&4096);
  u.shieldHp=fl&8192?Math.max(1,u.shieldHp):0;u.spinT=fl&16384?1:0;u.lotusT=fl&32768?1:0;u.leap=fl&65536?(u.leap||{c:1}):null;u.invisT=fl&131072?1:0;u.burnT=fl&262144?1:0;u.aegis=!!(fl&524288);u.kb=fl&1048576?{}:null;u.rise=fl&2097152?1:0;u.spdPT=fl&4194304?1:0;u.fuseT=fl&8388608?1:0;u.ign=fl&16777216?3:0;u.ignT=u.ign?1:0;u.stat=fl&33554432?2:0;u.statT=u.stat?1:0;u.rotT=fl&67108864?1:0}
function applySnap(d){
  if(d.n<=net.lastN)return;net.lastN=d.n;
  gameT=d.g;alive=d.a;const z=d.z;Object.assign(zone,{x:z[0],y:z[1],r:z[2],tx:z[3],ty:z[4],tr:z[5],st:['wait','shrink','done'][z[6]],t:z[7],ph:z[8]});
  const first=!net.lastSnap;
  const pos=(u,x,y,snap)=>{u.tx=x;u.ty=y;if(snap||first||u.dead||Math.hypot(u.x-x,u.y-y)>300){u.x=x;u.y=y}};
  for(const r of d.h){const u=UMAP.get(r[0]);if(!u)continue;const wasDead=u.dead;setFlags(u,r[4]);pos(u,r[1],r[2],wasDead);u.hp=r[3];u.fx=r[5]/99;u.fy=r[6]/99;u.maxHp=r[7];
    u.lvl=r[8];u.wk=r[9]>=0?AW[r[9]]||null:null;u.wt=r[10];u.at=r[11];u.kills=r[12];u.mp=r[13];u.maxMp=r[14];u.shieldHp=r[15];if(r.length>16)u.lg=r[16]|0;u.far=false}
  for(const r of d.f){const u=UMAP.get(r[0]);if(!u)continue;setFlags(u,r[3]);pos(u,r[1],r[2],true);u.far=true}
  if(d.me){const r=d.me,u=UMAP.get(r[0]);if(u){u.xp=r[1];u.skl=[r[2],r[3],r[4]];u.pts=r[5];u.cd=[r[6],r[7],r[8]];u.armorV=r[9];u.atkDmg=r[10];u.spdB=r[11]/100;u.dmgB=r[12]/100;u.mr=r[13]/100;u.shieldT=r[14];
    if(r.length>=24){u.bag=[r[15]|0,r[16]|0,r[17]|0,r[18]|0];u.bcd=[+r[19]||0,+r[20]||0,+r[21]||0,+r[22]||0];u.spdPT=+r[23]||0}
    if(r.length>=26){u.wk2=r[24]>=0?AW[r[24]]||null:null;u.wt2=r[25]|0}if(r.length>=27)u.fury=r[26]|0;if(r.length>=34){u.gold=r[27]|0;u.wv=r[28]|0;u.wv2=r[29]|0;u.xs=r[30]|0;u.xl=r[31]|0;u.xcd=+r[32]||0;u.dgcd=+r[33]||0}if(ARX)u.arenaStatus=[r[34]||[],performance.now()]}}
  const inSnap=new Set();
  for(const r of d.m){let u=UMAP.get(r[0]);
    if(!u&&r.length>8&&ZK[r[8]]){u=mkZombie(r[0],ZK[r[8]],r[1],r[2],1);addUnit(u)}
    else if(!u&&r.length>9&&r[8]===-1&&EK[r[9]]){u=mkMob({id:r[0],x:r[1],y:r[2],kind:EK[r[9]],camp:-1,summon:1});addUnit(u)}   // Overlord's summoned sentinels   // zombies are spawned by the host at night; clients meet them in the snapshot
    if(!u)continue;inSnap.add(u.id);setFlags(u,r[4]);pos(u,r[1],r[2],!u.inSnap);u.hp=r[3];u.fx=r[5]/99;u.fy=r[6]/99;u.maxHp=r[7];u.missN=0}
  for(const u of units)if(u.mob)u.inSnap=inSnap.has(u.id);
  if(units.some(u=>(u.zombie||u.summon)&&!u.inSnap&&(u.dead||++u.missN>90))){units=units.filter(u=>!((u.zombie||u.summon)&&!u.inSnap&&(u.dead||u.missN>90)));UMAP=new Map(units.map(u=>[u.id,u]))}
  if(first){const me=ME();if(me){cam.x=me.x-W/2/Z;cam.y=me.y-H/2/Z}}
  projs=d.p.map(p=>({x:p[0],y:p[1],vx:p[2],vy:p[3],kind:p[4],r:p[5],el:p.length>6?EL[p[6]]||null:null}));
  aoes=d.o.map(a=>({x:a[0],y:a[1],r:a[2],t:a[3],delay:a[4],dot:a[5],kind:AOE_KINDS[a[6]],fxT:a[7],vis:a[8],ang:a[9]/100,shape:a[10]===1?'line':a[10]===2?'cone':null,len:a[2],w:a[10]===1?a[11]:0,arc:a[10]===2?a[11]/100:0,done:a[3]>=a[4],skyFall:a[13]===1,el:a.length>12&&a[12]>=0?EL[a[12]]:undefined}));
  sndBudget={};for(const q of d.e){if(q[0]<=net.lastEv)continue;net.lastEv=q[0];const e=decEv(q[1]);if(e)applyEvent(e)}net.lastSnap=performance.now();
}
function clientUpdate(dt){
  for(const u of units){if(u.dead)continue;const k=1-Math.pow(.00002,dt);u.x=lerp(u.x,u.tx,k);u.y=lerp(u.y,u.ty,k);u.atkAnim-=dt;u.castAnim-=dt}
  for(const p of projs){p.x+=p.vx*dt;p.y+=p.vy*dt}
  for(const a of aoes){a.t+=dt;if(a.t>=a.delay&&!a.dot){a.done=true;a.fxT-=dt}}
  net.inT-=dt;if(net.inT<=0){net.inT=net.tr&&net.tr.kind==='room'?.1:.05;const i=localInput();net.tr&&net.tr.input([+i.mx.toFixed(2),+i.my.toFixed(2),i.am?2:i.atk?1:0,i.blk?1:0])}
  const me=ME();if(me){for(let i=0;i<3;i++)me.cd[i]=Math.max(0,me.cd[i]-dt);for(let i=0;i<4;i++)me.bcd[i]=Math.max(0,me.bcd[i]-dt)}
}

// ===================== VISIBILITY =====================
const allyOf=(u,me)=>!!(me&&u&&u!==me&&u.hero&&MC.ts>1&&u.team===me.team);
// teammates share what they see
function seenBy(u,L){const R=visionR()+60;if(Math.hypot(u.x-L.x,u.y-L.y)<=R)return true;
  if(MC.ts>1)for(const a of units)if(a.hero&&!a.dead&&a!==L&&a.team===L.team&&Math.abs(u.x-a.x)<R&&Math.abs(u.y-a.y)<R&&Math.hypot(u.x-a.x,u.y-a.y)<=R)return true;return false}
function unitVisibleTo(u,me,L){
  if(u===me)return true;
  if(allyOf(u,me))return true;
  if(net.mode==='client'&&(u.mob&&!u.inSnap||u.hero&&u.far))return false;
  if(L&&u!==L&&!seenBy(u,L))return false;
  if(u.hidden&&L&&dist(u,L)>170)return false;
  const ih=houseAt(u);if(ih&&ih.roofA>.6)return false;
  const ic=WD.caves.find(c=>dist(u,c)<c.R+10);if(ic&&ic.roofA>.6)return false;
  return true}

// ===================== 2D DRAW (fallback view) =====================
const TREE2D=[['#2f6e3a','#3f8a48'],['#3a7a3a','#5a9a48'],['#6a9a4a','#9ac46a'],['#2a5a6a','#7a4ab8'],['#1f4a44','#2f5e56'],['#4a2e3e','#6a3a4e'],['#4a7a3a','#7aa45a']];
function draw2D(){
  const gl=$('gl');if(gl)gl.style.visibility='hidden';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(H>W*1.05){ctx.fillStyle='#0a1214';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffd35a';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText('📱 หมุนมือถือเป็นแนวนอน',W/2,H/2);return}
  if(!GROUND2D)GROUND2D=buildGround(.09);
  const me=ME(),L=listener()||me;const sx=(Math.random()-.5)*shakeA,sy=(Math.random()-.5)*shakeA;
  ctx.setTransform(DPR*Z,0,0,DPR*Z,(-cam.x*Z+sx)*DPR,(-cam.y*Z+sy)*DPR);
  const vx0=cam.x-60,vy0=cam.y-60,vx1=cam.x+W/Z+60,vy1=cam.y+H/Z+60;const vis=(x,y,m=0)=>x>vx0-m&&x<vx1+m&&y>vy0-m&&y<vy1+m;const T=performance.now()/1000;
  ctx.fillStyle='#3a3a40';ctx.fillRect(vx0-200,vy0-200,vx1-vx0+400,vy1-vy0+400);ctx.imageSmoothingEnabled=true;ctx.drawImage(GROUND2D,0,0,WORLD,WORLD);
  for(const br of WD.bridges){if(!vis(br.x,br.y,br.len))continue;ctx.save();ctx.translate(br.x,br.y);ctx.rotate(Math.atan2(br.ay,br.ax));ctx.fillStyle=br.dock?'#7a5a3a':'#9a948a';ctx.fillRect(-br.len/2,-br.wid/2,br.len,br.wid);
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=3;for(let x=-br.len/2+14;x<br.len/2;x+=18){ctx.beginPath();ctx.moveTo(x,-br.wid/2);ctx.lineTo(x,br.wid/2);ctx.stroke()}
    ctx.fillStyle=br.dock?'#5a3e26':'#6a665e';ctx.fillRect(-br.len/2,-br.wid/2,br.len,8);ctx.fillRect(-br.len/2,br.wid/2-8,br.len,8);ctx.restore()}
  for(const f of WD.flowers){if(!vis(f.x,f.y))continue;ctx.fillStyle=f.d?(f.c<.5?'#7ef9ff':'#e08aff'):(f.c<.33?'#ffe36e':f.c<.66?'#ff9ac2':'#ffffff');ctx.beginPath();ctx.arc(f.x,f.y,3,0,7);ctx.fill()}
  for(const h of WD.houses){if(!vis(h.x+h.w/2,h.y+h.h/2,Math.max(h.w,h.h)))continue;ctx.fillStyle='#6e5034';ctx.fillRect(h.x,h.y,h.w,h.h);ctx.fillStyle='rgba(140,40,60,.4)';ctx.fillRect(h.x+h.w*.3,h.y+h.h*.3,h.w*.4,h.h*.4)}
  {const C=WD.castle;ctx.fillStyle='rgba(60,56,50,.25)';ctx.fillRect(C.x,C.y,C.w,C.h)}
  for(const s of WD.shrines){if(!vis(s.x,s.y,s.r))continue;ctx.fillStyle=hexA('#8cffb0',.12+.06*Math.sin(T*2));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();
    for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ctx.fillStyle='#8a8478';ctx.beginPath();ctx.arc(s.x+Math.cos(a)*64,s.y+Math.sin(a)*64,11,0,7);ctx.fill()}ctx.fillStyle='#b8ffd0';ctx.beginPath();ctx.arc(s.x,s.y,14,0,7);ctx.fill()}
  for(const m of WD.mush){if(!vis(m.x,m.y))continue;ctx.fillStyle=m.c;ctx.beginPath();ctx.arc(m.x,m.y,m.s,Math.PI,0);ctx.fill()}
  for(const c of WD.crystals){if(!vis(c.x,c.y))continue;ctx.fillStyle=c.c;ctx.beginPath();ctx.moveTo(c.x,c.y-c.s*1.6);ctx.lineTo(c.x+c.s*.6,c.y);ctx.lineTo(c.x,c.y+c.s*.5);ctx.lineTo(c.x-c.s*.6,c.y);ctx.fill()}
  for(const a of aoes){if(!vis(a.x,a.y,a.r))continue;const col=AOE_COL[a.kind]||'#fff';const shape=()=>{ctx.beginPath();if(a.shape==='line'){const ex=a.x+Math.cos(a.ang)*a.len,ey=a.y+Math.sin(a.ang)*a.len;ctx.lineCap='round';ctx.moveTo(a.x,a.y);ctx.lineTo(ex,ey)}else if(a.shape==='cone'){ctx.moveTo(a.x,a.y);ctx.arc(a.x,a.y,a.len,a.ang-a.arc,a.ang+a.arc);ctx.closePath()}else ctx.arc(a.x,a.y,a.r,0,7)};
    if(a.shape==='line'){ctx.strokeStyle=hexA(col,a.t<a.delay?.35:.6*clamp(a.fxT/a.vis,0,1));ctx.lineWidth=a.w||160;shape();ctx.stroke();continue}
    if(a.t<a.delay){ctx.fillStyle=hexA(col,.16);ctx.strokeStyle=hexA(col,.8);ctx.lineWidth=3;shape();ctx.fill();ctx.stroke()}
    else if(a.dot){ctx.fillStyle=hexA(col,.18);ctx.strokeStyle=hexA(col,.55);ctx.lineWidth=2;shape();ctx.fill();ctx.stroke()}
    else{const k=clamp(a.fxT/a.vis,0,1);if(k<=0)continue;ctx.fillStyle=hexA(col,.4*k);ctx.strokeStyle=hexA(col,k);ctx.lineWidth=5;shape();ctx.fill();ctx.stroke()}}
  for(const it of items){if(!vis(it.x,it.y))continue;if(it.house!==undefined&&WD.houses[it.house].roofA>.6)continue;if(it.cave!==undefined&&WD.caves[it.cave].roofA>.6)continue;drawItem2D(it,T)}
  for(const b of boxes){if(!vis(b.x,b.y))continue;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a+Math.PI/2);ctx.fillStyle='#8a5a2e';ctx.fillRect(-17,-11,34,22);ctx.fillStyle=b.open?'#3a2614':'#5a3a1e';ctx.fillRect(-15,-9,30,b.open?18:8);ctx.fillStyle='#e8c050';ctx.fillRect(-3,7,6,5);ctx.restore()}
  for(const p of WD.props){if(!vis(p.x,p.y))continue;ctx.fillStyle=p.t==='barrel'?'#7a5232':'#9a7444';if(p.t==='barrel'){ctx.beginPath();ctx.arc(p.x,p.y,15,0,7);ctx.fill()}else ctx.fillRect(p.x-14,p.y-14,28,28)}
  for(const h of WD.hay){if(!vis(h.x,h.y))continue;ctx.fillStyle='#d8b050';ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,7);ctx.fill()}
  for(const l of WD.logs){if(!vis(l.x,l.y))continue;ctx.fillStyle='#7a5232';ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.a);ctx.fillRect(-34,-18,68,36);ctx.restore()}
  for(const r of WD.rocks){if(r.prop||!vis(r.x,r.y,r.r))continue;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(r.x+8,r.y+12,r.r,r.r*.8,0,0,7);ctx.fill();
    ctx.fillStyle=r.cave!==undefined?'#4a4556':'#7a7a78';ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,7);ctx.fill();ctx.fillStyle=r.cave!==undefined?'#5f5970':'#969692';ctx.beginPath();ctx.arc(r.x-r.r*.2,r.y-r.r*.25,r.r*.62,0,7);ctx.fill()}
  for(const s of WD.solids){if(!vis(s.x,s.y,s.r))continue;ctx.fillStyle=s.t==='fountain'?'#9a9aa2':s.t==='well'?'#6d6a72':s.t==='stall'?'#a0603a':s.t==='mill'?'#c8b8a0':'#8a8478';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();
    if(s.t==='fountain'||s.t==='well'){ctx.fillStyle='#3a8ac8';ctx.beginPath();ctx.arc(s.x,s.y,s.r*.66,0,7);ctx.fill()}}
  for(const m of WD.windmills){if(!vis(m.x,m.y,200))continue;ctx.save();ctx.translate(m.x,m.y);ctx.rotate(T*1.2+m.a);ctx.fillStyle='rgba(240,230,210,.85)';for(let k=0;k<4;k++){ctx.rotate(Math.PI/2);ctx.fillRect(-8,0,16,150)}ctx.restore()}
  for(const t of WD.trees){if(!vis(t.x,t.y,t.cr))continue;ctx.fillStyle='#3b2a22';ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,7);ctx.fill()}
  for(const s of swings){const k=s.life/s.max;ctx.strokeStyle=hexA(s.col,k*.9);ctx.lineWidth=10*k+2;ctx.beginPath();ctx.arc(s.u.x,s.u.y,s.r*.85,s.ang-1.1,s.ang+1.1);ctx.stroke()}
  for(const u of units){if(u.dead||!vis(u.x,u.y,80)||!unitVisibleTo(u,me,L))continue;drawUnit2D(u,me,u.inBush||u.invisT>0?.55:1)}
  for(const p of projs){if(!vis(p.x,p.y))continue;if(p.kind===0||p.kind===5||p.kind===7||p.kind===13||p.kind===11){const a=Math.atan2(p.vy,p.vx);ctx.strokeStyle=p.el?ELEM[p.el].c:p.kind===11?'#7ff0d8':p.kind===5?'#c8ff9a':'#e6fff0';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(p.x-Math.cos(a)*22,p.y-Math.sin(a)*22);ctx.lineTo(p.x,p.y);ctx.stroke()}
    else{ctx.fillStyle=p.el?ELEM[p.el].c:p.kind===14?'#ff8a3a':p.kind===2||p.kind===1?'#ff7a2a':p.kind===10?'#b9a6ff':p.kind===8?'#ff9a4a':p.kind===9?'#e8d8a8':p.kind===6?'#dfe8ff':'#bfefff';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}}
  if(ARX)drawArenaForge2D(L,vis);
  for(const p of parts){if(!vis(p.x,p.y))continue;ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.col;if(p.line)ctx.fillRect(p.x-1.5,p.y-18,3,18);else{ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,7);ctx.fill()}}ctx.globalAlpha=1;
  for(const q of WD.walls){if(!vis(q.x+q.w/2,q.y+q.h/2,Math.max(q.w,q.h)))continue;ctx.fillStyle=q.castle?'#a8a094':'#e8dcc0';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.strokeStyle='#5d4632';ctx.lineWidth=2;ctx.strokeRect(q.x,q.y,q.w,q.h)}
  for(const l of WD.lanterns){if(!vis(l.x,l.y))continue;ctx.fillStyle='#3a2a1e';ctx.fillRect(l.x-3,l.y-6,6,20);ctx.fillStyle=l.torch?'#ff8a2a':l.dire?'#c08aff':'#ffd27a';ctx.beginPath();ctx.arc(l.x,l.y-10,7,0,7);ctx.fill()}
  for(const g of WD.graves||[]){if(!vis(g.x,g.y,g.r))continue;if(isNight()){ctx.fillStyle=hexA('#7dff8a',.08+.04*Math.sin(T*2));ctx.beginPath();ctx.arc(g.x,g.y,g.r,0,7);ctx.fill()}
    for(const t of g.st){ctx.fillStyle='#5a4a38';ctx.fillRect(t.x-11,t.y+4,22,30);ctx.fillStyle='#9a9890';ctx.fillRect(t.x-11,t.y-8,22,14);ctx.beginPath();ctx.arc(t.x,t.y-8,11,Math.PI,0);ctx.fill()}}
  for(const b of WD.tgrass||[]){if(!vis(b.x,b.y,b.r))continue;const near=me&&!me.dead&&dist(me,b)<b.r;ctx.globalAlpha=near?.5:.92;ctx.fillStyle=isDire(b.x,b.y)?'#4a8a6a':'#6f8f3a';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();
    ctx.strokeStyle=isDire(b.x,b.y)?'#7ac8a0':'#a8c060';ctx.lineWidth=2.5;const Rn=mulberry32(b.x|0);ctx.beginPath();for(let k=0;k<46;k++){const a=Rn()*6.3,d=Math.sqrt(Rn())*b.r*.9,x=b.x+Math.cos(a)*d,y=b.y+Math.sin(a)*d;ctx.moveTo(x,y+7);ctx.lineTo(x+Math.sin(T*1.6+k)*3,y-11)}ctx.stroke();ctx.globalAlpha=1}
  for(const b of WD.bushes){if(!vis(b.x,b.y,b.r))continue;const near=me&&!me.dead&&dist(me,b)<b.r;ctx.globalAlpha=near?.55:.95;ctx.fillStyle='#1f5a3f';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();ctx.fillStyle='#2c7a52';
    for(let k=0;k<5;k++){const a=k*1.26+b.x*.01;ctx.beginPath();ctx.arc(b.x+Math.cos(a)*b.r*.45,b.y+Math.sin(a)*b.r*.45,b.r*.42,0,7);ctx.fill()}ctx.globalAlpha=1}
  for(const t of WD.trees){if(!vis(t.x,t.y,t.cr))continue;const near=L&&dist(L,t)<t.cr+10;ctx.globalAlpha=near?.4:.93;const c=TREE2D[t.v]||TREE2D[0];const sw=Math.sin(T*.8+t.ph)*3;
    ctx.fillStyle=c[0];ctx.beginPath();ctx.arc(t.x+sw,t.y-8,t.cr,0,7);ctx.fill();ctx.fillStyle=c[1];ctx.beginPath();ctx.arc(t.x-t.cr*.22+sw,t.y-t.cr*.3,t.cr*.6,0,7);ctx.fill();ctx.globalAlpha=1}
  for(const h of WD.houses){if(h.roofA<.02||!vis(h.x+h.w/2,h.y+h.h/2,Math.max(h.w,h.h)))continue;ctx.globalAlpha=h.roofA;const x=h.x-12,y=h.y-12,w=h.w+24,hh=h.h+24;ctx.fillStyle=h.roof;ctx.fillRect(x,y,w,hh);
    ctx.fillStyle='rgba(0,0,0,.25)';if(w>hh)ctx.fillRect(x,y+hh/2-4,w,8);else ctx.fillRect(x+w/2-4,y,8,hh);ctx.globalAlpha=1}
  {const C=WD.castle;for(const t of[...C.towers,...C.gtowers]){if(!vis(t.x,t.y,t.r))continue;ctx.fillStyle='#8a8478';ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,7);ctx.fill();ctx.fillStyle='#3a5a9a';ctx.beginPath();ctx.arc(t.x,t.y,t.r*.7,0,7);ctx.fill()}
    const K=C.keep;ctx.fillStyle='#7a7468';ctx.fillRect(K.x,K.y,K.w,K.h);ctx.fillStyle='#3a5a9a';ctx.fillRect(K.x+12,K.y+12,K.w-24,K.h-24)}
  for(const c of WD.caves){if(c.roofA<.02||!vis(c.x,c.y,c.R+100))continue;ctx.globalAlpha=c.roofA;ctx.fillStyle='#5a5852';ctx.beginPath();ctx.arc(c.x,c.y,c.R+46,0,7);ctx.fill();ctx.globalAlpha=1}
  drawLighting2D(L);
  ctx.save();ctx.beginPath();ctx.rect(vx0-300,vy0-300,vx1-vx0+600,vy1-vy0+600);ctx.arc(zone.x,zone.y,Math.max(1,zone.r),0,Math.PI*2,true);ctx.fillStyle='rgba(140,40,220,.3)';ctx.fill();ctx.restore();
  ctx.strokeStyle='rgba(210,150,255,.95)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(zone.x,zone.y,Math.max(1,zone.r),0,7);ctx.stroke();
  if(zone.st!=='done'){ctx.setLineDash([24,18]);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(zone.tx,zone.ty,Math.max(1,zone.tr),0,7);ctx.stroke();ctx.setLineDash([])}
  for(const h of hitFl)drawHitFlash(h,h.x,h.y-40,1/Z);ctx.textAlign='center';for(const t of texts)drawFloatText(t,t.x,t.y,1.15/Z);ctx.globalAlpha=1;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  for(const u of units){if(u.dead||!vis(u.x,u.y,80)||!unitVisibleTo(u,me,L))continue;if(u.mob&&u.hp>=u.maxHp)continue;drawBars((u.x-cam.x)*Z,(u.y-u.r-26-cam.y)*Z,u,me,clamp(Z,.75,1.2))}
  drawHUD();
}
function drawLighting2D(L){
  const inCave=L&&(WD.caves.some(c=>dist(L,c)<c.R+6)||inDG(L));const dark=inCave?.82:isNight()?.62:(L&&isDire(L.x,L.y)?.3:.12);
  const s=.5;lctx.setTransform(1,0,0,1,0,0);lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,LC.width,LC.height);
  lctx.fillStyle=`rgba(10,6,28,${dark})`;lctx.fillRect(0,0,LC.width,LC.height);lctx.globalCompositeOperation='destination-out';
  const hole=(x,y,r,a)=>{const px=(x-cam.x)*Z*s,py=(y-cam.y)*Z*s,rr=r*Z*s;if(px<-rr||py<-rr||px>LC.width+rr||py>LC.height+rr)return;const g=lctx.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.fillRect(px-rr,py-rr,rr*2,rr*2)};
  if(L)hole(L.x,L.y,inCave?340:visionR()*.8,1);
  for(const l of WD.lanterns)hole(l.x,l.y,240,.9);for(const m of WD.mush)hole(m.x,m.y,90,.5);for(const c of WD.crystals)hole(c.x,c.y,140,.7);for(const p of projs)if(p.kind)hole(p.x,p.y,130,.8);
  ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.drawImage(LC,0,0,LC.width,LC.height,0,0,LC.width/s,LC.height/s);ctx.restore();
}
function itemIcon(it){return it.k==='p'?BAG[it.b|0].ic:it.k==='i'?ITEM_BY[it.it].ic:it.k==='a'?'⚜️':it.k==='w'?WEAPONS[it.wk].ic:it.k==='r'?ARMORS[it.tier].ic:'📦'}
function itemColor(it){return it.k==='p'?'#ff9ae8':it.k==='w'?TIERS[it.tier].c:it.k==='r'?ARMORS[it.tier].c:it.k==='a'?'#ffd35a':'#ffffff'}
function drawItem2D(it,T){const b=Math.sin(T*3+it.id)*3;ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(it.x,it.y+16,18,6,0,0,7);ctx.fill();
  if(it.k==='c'){const r=it.gold?26:20;ctx.fillStyle=it.gold?'#e6a817':'#9a5f2c';rr(it.x-r,it.y-r*.8+b,r*2,r*1.5,5);ctx.fill();ctx.fillStyle=it.gold?'#ffe27a':'#c88a4a';ctx.fillRect(it.x-r,it.y-r*.35+b,r*2,5)}
  else{if(it.k==='w'||it.k==='r'){ctx.strokeStyle=itemColor(it);ctx.lineWidth=3;ctx.fillStyle='rgba(10,10,20,.55)';ctx.beginPath();ctx.arc(it.x,it.y+b,19,0,7);ctx.fill();ctx.stroke()}
    ctx.font='22px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(itemIcon(it),it.x,it.y+b+1);ctx.textBaseline='alphabetic'}}
function drawUnit2D(u,me,alpha){
  const c=u.hero?LOOKS[u.look].c:u.def.col;ctx.globalAlpha=alpha;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(u.x,u.y+u.r*.75,u.r*.95,u.r*.38,0,0,7);ctx.fill();
  if(u===me||allyOf(u,me)){ctx.strokeStyle=u===me?'rgba(80,230,80,.9)':'rgba(70,160,255,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(u.x,u.y,u.r+9,0,7);ctx.stroke()}
  if(u.shieldHp>0){ctx.strokeStyle='rgba(255,230,140,.85)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(u.x,u.y,u.r+5,0,7);ctx.stroke()}
  ctx.fillStyle=u.hurtT>0?'#ffffff':c;ctx.beginPath();ctx.arc(u.x,u.y,u.r,0,7);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=u.hero&&u.at>=0?ARMORS[u.at].c:'rgba(0,0,0,.35)';ctx.stroke();
  if(u.rootT>0){ctx.strokeStyle='rgba(160,240,255,.95)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(u.x,u.y,u.r+3,0,7);ctx.stroke()}
  if(u.hero){ctx.font=`${u.r*.95}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(u.wk?WEAPONS[u.wk].ic:'✊',u.x+u.fx*(u.r*.55),u.y+u.fy*(u.r*.55)+1);ctx.textBaseline='alphabetic'}
  else{ctx.fillStyle=u.zombie?'#9dff6a':isNight()?'#ff3020':u.golem?'#8ff4ff':u.boss?'#ff9a3a':'#1a2a10';ctx.beginPath();ctx.arc(u.x-u.r*.3+u.fx*5,u.y-4+u.fy*5,u.r*.13,0,7);ctx.arc(u.x+u.r*.3+u.fx*5,u.y-4+u.fy*5,u.r*.13,0,7);ctx.fill()}
  if(u.spinT>0||u.lotusT>0){ctx.strokeStyle=u.spinT>0?'rgba(255,210,150,.7)':'rgba(255,140,220,.7)';ctx.lineWidth=6;const T=performance.now()/90;ctx.beginPath();ctx.arc(u.x,u.y,u.spinT>0?150:220,T,T+2);ctx.stroke();ctx.beginPath();ctx.arc(u.x,u.y,u.spinT>0?150:220,T+3.14,T+5.14);ctx.stroke()}
  if(u.stunT>0){ctx.font='16px sans-serif';ctx.textAlign='center';const T=performance.now()/1000;for(let i=0;i<3;i++){const a=T*5+i*2.1;ctx.fillText('⭐',u.x+Math.cos(a)*18,u.y-u.r-12+Math.sin(a)*5)}}
  ctx.globalAlpha=1}
// Dota-style floating health bar (screen space)
function drawBars(px,py,u,me,sc){
  const hero=u.hero,bw=(hero?76:u.boss?130:u.r>33?72:48)*sc,bh=(hero?8:6)*sc,x=px-bw/2,y=py;
  ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(x-1.5,y-1.5,bw+3,bh+(hero?5*sc:0)+3);
  const ally=allyOf(u,me);const col=u===me?'#3fd23f':hero?(ally?'#3d9cff':'#d63b3b'):u.zombie?'#8fd14f':'#d68a2a';
  ctx.fillStyle='#2a0d0d';ctx.fillRect(x,y,bw,bh);const f=clamp(u.hp/u.maxHp,0,1);ctx.fillStyle=col;ctx.fillRect(x,y,bw*f,bh);
  if(u.shieldHp>0){const sf=clamp(u.shieldHp/u.maxHp,0,1-f);ctx.fillStyle='rgba(255,236,150,.9)';ctx.fillRect(x+bw*f,y,bw*sf,bh)}
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x,y,bw*f,bh*.35);
  if(hero){ctx.fillStyle='rgba(0,0,0,.5)';const seg=250/u.maxHp*bw;if(seg>3)for(let sx=x+seg;sx<x+bw*f-1;sx+=seg)ctx.fillRect(sx,y,1,bh);
    ctx.fillStyle='#0b1830';ctx.fillRect(x,y+bh+1*sc,bw,3.5*sc);ctx.fillStyle='#4a8cff';ctx.fillRect(x,y+bh+1*sc,bw*clamp(u.mp/Math.max(1,u.maxMp),0,1),3.5*sc);
    ctx.fillStyle='#1b1410';ctx.beginPath();ctx.arc(x-10*sc,y+bh*.7,9.5*sc,0,7);ctx.fill();ctx.strokeStyle='#c9a94a';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#ffe9a8';ctx.font=`bold ${10*sc}px sans-serif`;ctx.textAlign='center';ctx.fillText(u.lvl,x-10*sc,y+bh*.7+3.6*sc);
    const nm=(u.wk?WEAPONS[u.wk].ic+' ':'')+arenaDisplayName(u);ctx.font=`bold ${11*sc}px system-ui,sans-serif`;ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(nm,px,y-5*sc);ctx.fillStyle=u===me?'#c8ffc8':ally?'#cfe6ff':'#ffd6d6';ctx.fillText(nm,px,y-5*sc);
    if(u.aegis){ctx.font=`${12*sc}px sans-serif`;ctx.fillText('⚜️',x+bw+10*sc,y+bh+2*sc)}}
  else if(u.r>33){ctx.font=`bold ${10*sc}px system-ui,sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(u.name,px,y-4*sc);ctx.fillStyle='#ffd9a8';ctx.fillText(u.name,px,y-4*sc)}
}
// floating combat text: damage numbers in an italic serif that pop on impact, gold "CRITICAL" for crits
const DMG_F='Georgia,"Times New Roman",serif';
function drawFloatText(t,x,y,sc){ctx.globalAlpha=clamp(t.life/t.max*2.2,0,1);
  if(!t.dm){ctx.font=`bold ${(t.big?22:17)*sc}px ${ARX?ARENA_HUD_FONT:'system-ui,sans-serif'}`;ctx.lineWidth=4*sc;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(t.txt,x,y);ctx.fillStyle=t.col;ctx.fillText(t.txt,x,y);return}
  const age=t.max-t.life,cr=t.big,txt=cr?t.txt.replace('!',''):t.txt,val=+txt.replace(/,/g,'')||0,huge=t.mine&&val>=8000,pop=1+Math.max(0,.16-age)/.16*(cr?1.1:.75),sz=(cr?(huge?46:38):t.mine?(huge?32:25):18)*sc*pop;
  ctx.font=`italic bold ${sz}px ${DMG_F}`;ctx.lineWidth=Math.max(3,sz*.16);ctx.strokeStyle=cr?'rgba(60,14,0,.85)':'rgba(0,0,0,.8)';ctx.lineJoin='round';ctx.strokeText(txt,x,y);
  if(cr||huge){const g=ctx.createLinearGradient(0,y-sz*.8,0,y+sz*.1);g.addColorStop(0,'#fffbe0');g.addColorStop(.45,huge&&cr?'#ff9a2a':'#ffc23a');g.addColorStop(1,huge&&cr?'#ff2a10':'#ff7a1a');ctx.fillStyle=g}else if(t.mine){const g=ctx.createLinearGradient(0,y-sz*.8,0,y+sz*.1);g.addColorStop(0,'#ffffff');g.addColorStop(1,t.col==='#ffffff'?'#ffe2b0':t.col);ctx.fillStyle=g}else ctx.fillStyle=t.col;
  ctx.fillText(txt,x,y);
  if(cr){const w=ctx.measureText(txt).width;ctx.font=`italic bold ${sz*.52}px ${DMG_F}`;ctx.textAlign='left';ctx.lineWidth=Math.max(2,sz*.1);ctx.strokeText('CRITICAL',x+w*.5+3*sc,y-sz*.3);ctx.fillStyle='#ff9a2a';ctx.fillText('CRITICAL',x+w*.5+3*sc,y-sz*.3);ctx.textAlign='center'}}
// white star flash with a long horizontal streak where my hit landed
function drawHitFlash(h,x,y,sc){const k=1-h.t/.2,L=(h.big?150:80)*sc*(.5+k*.5),R=(h.big?26:15)*sc*k;if(k<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=k;
  let g=ctx.createLinearGradient(x-L,0,x+L,0);g.addColorStop(0,'rgba(255,240,210,0)');g.addColorStop(.5,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,240,210,0)');ctx.fillStyle=g;ctx.fillRect(x-L,y-1.6*sc,L*2,3.2*sc);
  g=ctx.createLinearGradient(0,y-L*.4,0,y+L*.4);g.addColorStop(0,'rgba(255,240,210,0)');g.addColorStop(.5,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,240,210,0)');ctx.fillStyle=g;ctx.fillRect(x-1.2*sc,y-L*.4,2.4*sc,L*.8);
  ctx.translate(x,y);ctx.rotate(.785);for(const a of[0,1.571]){ctx.rotate(a);g=ctx.createLinearGradient(-L*.3,0,L*.3,0);g.addColorStop(0,'rgba(255,220,170,0)');g.addColorStop(.5,'rgba(255,250,235,.7)');g.addColorStop(1,'rgba(255,220,170,0)');ctx.fillStyle=g;ctx.fillRect(-L*.3,-1*sc,L*.6,2*sc)}
  ctx.rotate(-2.356);ctx.translate(-x,-y);g=ctx.createRadialGradient(x,y,0,x,y,R*2.2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,h.big?'rgba(255,200,110,.7)':'rgba(255,235,200,.6)');g.addColorStop(1,'rgba(255,160,60,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R*2.2,0,7);ctx.fill();ctx.restore()}
// combo counter beside the fight: "37 HITS"
function drawCombo(s){if(COMBO.n<2||COMBO.t<=0)return;const a=clamp(COMBO.t/.6,0,1),sz=44*s*(1+COMBO.pop*.35),mm=Math.min(W,H)*.26;const x=Math.max(SAFE.l+mm+34*s,W*.27),y=H*.43;
  ctx.save();ctx.globalAlpha=a;ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.font=`italic ${sz}px ${DMG_F}`;ctx.lineJoin='round';ctx.lineWidth=5*s;ctx.strokeStyle='rgba(20,8,0,.7)';ctx.strokeText(COMBO.n,x,y);
  const g=ctx.createLinearGradient(0,y-sz*.8,0,y);g.addColorStop(0,'#fff8dc');g.addColorStop(1,COMBO.n>=50?'#ff9a3a':'#f0c060');ctx.fillStyle=g;ctx.fillText(COMBO.n,x,y);
  ctx.textAlign='left';ctx.font=`italic ${16*s}px ${DMG_F}`;ctx.lineWidth=3*s;ctx.strokeText('HITS',x+4*s,y);ctx.fillStyle='#e8d2a0';ctx.fillText('HITS',x+4*s,y);
  if(COMBO.dmg>0){const t=COMBO.dmg.toLocaleString('en-US');ctx.textAlign='right';ctx.font=`italic bold ${17*s}px ${DMG_F}`;ctx.lineWidth=3.5*s;ctx.strokeText(t,x,y-sz*.92);const g2=ctx.createLinearGradient(0,y-sz*.92-16*s,0,y-sz*.92);g2.addColorStop(0,'#ffffff');g2.addColorStop(1,'#ff9a3a');ctx.fillStyle=g2;ctx.fillText(t,x,y-sz*.92);ctx.textAlign='left';ctx.font=`italic ${11*s}px ${DMG_F}`;ctx.lineWidth=2.5*s;ctx.strokeText('DMG',x+4*s,y-sz*.92);ctx.fillStyle='#e8d2a0';ctx.fillText('DMG',x+4*s,y-sz*.92)}
  ctx.restore()}
// fury meter under the combo counter: stacks from back-to-back basic hits (faster + harder swings)
function drawFury(me,s){const f=me.fury|0;if(f<=0||me.dead)return;const mm=Math.min(W,H)*.26,x=Math.max(SAFE.l+mm+34*s,W*.27),y=H*.43+12*s,mx=f>=FURY_MAX,n=FURY_MAX,pw=5*s,gap=2*s,tw=n*pw+(n-1)*gap,x0=x-tw*.62;
  ctx.save();for(let i=0;i<n;i++){ctx.fillStyle=i<f?(mx?'#ff7a2a':'#ffc24a'):'rgba(0,0,0,.45)';ctx.fillRect(x0+i*(pw+gap),y,pw,4*s)}
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font=`italic bold ${11.5*s}px ${DMG_F}`;ctx.lineJoin='round';ctx.lineWidth=3*s;ctx.strokeStyle='rgba(20,8,0,.75)';const t=(mx?'FURY MAX  ':'')+`⚡+${Math.round(f*FURY_AS*100)}%  💥+${Math.round(f*FURY_DMG*100)}%`;
  if(mx)ctx.globalAlpha=.75+.25*Math.sin(performance.now()/90);ctx.strokeText(t,x0,y+18*s);ctx.fillStyle=mx?'#ff9a3a':'#f0d8a0';ctx.fillText(t,x0,y+18*s);ctx.restore()}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}

// ===================== HUD (Dota style) =====================
function panelBg(x,y,w,h,r){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(24,26,30,.92)');g.addColorStop(1,'rgba(8,9,11,.92)');ctx.fillStyle=g;rr(x,y,w,h,r);ctx.fill();ctx.strokeStyle='rgba(150,158,170,.7)';ctx.lineWidth=1.5;ctx.stroke()}
function drawHUD(){
  const me=ME();if(!me)return;const s=UI.s,b=UI.b;ctx.save();
  const ty=6,th=24*s;const fr=drawFrame(me,s),mmR=drawMinimap(me,s,fr.y+fr.h+8*s);
  // match status sits under the minimap: players left · clock · kills, then the zone and fusion lines
  {const x=mmR.x-2,st=(t,y,f,c,al)=>{ctx.font=f;ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.globalAlpha=al===undefined?1:al;ctx.strokeText(t,x,y);ctx.fillStyle=c;ctx.fillText(t,x,y);ctx.globalAlpha=1};let y=mmR.y+mmR.h+15*s;
    ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
    st(`${MC.ts>1?'🛡️ '+teamsLeft()+' ทีม':'👥 '+alive}   ${isNight()?'🌙':'☀️'} ${fmtT(gameT)}   💀 ${me.kills}`,y,`bold ${12.5*s}px system-ui,sans-serif`,'#e8e4d8');y+=15*s;
    const zt=zone.st==='wait'?`⏳ วงหดใน ${Math.ceil(zone.t)} วิ`:zone.st==='shrink'?'⚠️ วงกำลังหด':'🔥 วงสุดท้าย';st(zt,y,`bold ${11*s}px system-ui,sans-serif`,zone.st==='shrink'?'#ffb0f0':'#d8d8d8');y+=14*s;
    const fl=fuseLine(me);if(fl&&!me.dead){const parts=fl.t.split(' · ');for(const p of parts){st(p,y,`bold ${10*s}px system-ui,sans-serif`,fl.c,fl.p?.65+.35*Math.sin(performance.now()/150):.92);y+=12.5*s}}}
  drawTarget(me,s,fr);drawCombo(s);drawFury(me,s);
  if(scrFl.a>0){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.1,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,hexA(scrFl.c,0));g.addColorStop(1,hexA(scrFl.c,scrFl.a));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.arc(UI.mute.x,UI.mute.y,18,0,7);ctx.fill();ctx.font='17px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(['🔊','🔉','🔇'][AU.mode],UI.mute.x,UI.mute.y+1);ctx.textBaseline='alphabetic';
  if(net.mode!=='solo'){ctx.textAlign='right';ctx.font=`${11*s}px system-ui,sans-serif`;ctx.fillStyle='#bfe3ff';ctx.fillText(net.qm?'🌐 จับคู่ด่วน':`🌐 ${net.rname?(window.ArenaLanguage?.literal(net.rname)||net.rname):'ห้อง '+net.code}`,UI.mute.x-26,UI.mute.y+4)}
  if(ARX)drawArenaFeed(s);else{
  ctx.textAlign='right';ctx.font=`${12*s}px system-ui,sans-serif`;
  // kill feed stays right of the clock / zone / fusion column: long lines shrink, then get cut with …
  const fmax=Math.max(150*s,W-SAFE.r-8-(W/2+160*s))-14;
  feedList.forEach((f,i)=>{ctx.globalAlpha=clamp(f.t,0,1);const y=UI.mute.y+38+i*18*s;let t=f.txt,fs=12*s;ctx.font=`${fs}px system-ui,sans-serif`;let w=ctx.measureText(t).width;
    if(w>fmax){fs=Math.max(9.5*s,fs*fmax/w);ctx.font=`${fs}px system-ui,sans-serif`;w=ctx.measureText(t).width;if(w>fmax){while(t.length>4&&ctx.measureText(t+'…').width>fmax)t=t.slice(0,-1);t+='…';w=ctx.measureText(t).width}}
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(W-SAFE.r-8-w-14,y-13*s,w+14,17*s);ctx.fillStyle=f.hl?'#ffe27a':'#fff';ctx.fillText(t,W-SAFE.r-15,y)});ctx.globalAlpha=1;}
  UI.swap=null;
  if(me.dead){if(spectate!==null&&!gameOver){const t=UMAP.get(spectate);if(t){const st=`👁 กำลังดู ${arenaDisplayName(t)} · แตะจอเพื่อเปลี่ยน`;if(ARX)arenaNotice(st,W/2,H-24,W*.7,s,{size:13,tone:'muted'});else{ctx.textAlign='center';ctx.font=`bold ${14*s}px system-ui,sans-serif`;ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(st,W/2,H-24);ctx.fillStyle='#bfe3ff';ctx.fillText(st,W/2,H-24)}}}
    if(me.reviveT>0){if(ARX)arenaNotice('⚜️ กำลังฟื้นคืนชีพ…',W/2,H*.4,W*.7,s);else{ctx.textAlign='center';ctx.font=`bold ${22*s}px system-ui,sans-serif`;ctx.fillStyle='#ffe27a';ctx.fillText('⚜️ กำลังฟื้นคืนชีพ…',W/2,H*.4)}}
    drawAnnounce(s);ctx.restore();return}
  {const zp=zoneXY(me);if(Math.hypot(zp.x-zone.x,zp.y-zone.y)>zone.r){const t=zp===me?'อยู่นอกวง! รีบกลับเข้าวง':'ทางขึ้นคุกใต้ดินอยู่นอกวง! รีบขึ้นไป';if(ARX)arenaNotice(t,W/2,H*.2,W*.65,s,{tone:'danger',size:14});else{ctx.textAlign='center';ctx.font=`bold ${17*s}px system-ui,sans-serif`;ctx.globalAlpha=.6+.4*Math.sin(performance.now()/125);ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(t,W/2,H*.22);ctx.fillStyle='#ff6a6a';ctx.fillText(t,W/2,H*.22);ctx.globalAlpha=1;}
    const a=Math.atan2(zone.y-me.y,zone.x-me.x),R=Math.min(W,H)*.32;ctx.save();ctx.translate(W/2+Math.cos(a)*R,H/2+Math.sin(a)*R);ctx.rotate(a);ctx.fillStyle='#ff6a6a';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-12);ctx.lineTo(-4,0);ctx.lineTo(-10,12);ctx.fill();ctx.restore()}}
  drawSense(me,s);drawAnnounce(s);if(aimSt)drawAim(me,s);
  const jx=joy?joy.ox:UI.joyHome.x,jy=joy?joy.oy:UI.joyHome.y,R=b*1.1;ctx.globalAlpha=joy?.9:.4;ctx.fillStyle='rgba(255,255,255,.07)';ctx.strokeStyle='rgba(200,210,225,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(jx,jy,R,0,7);ctx.fill();ctx.stroke();
  const kx=joy?joy.x:jx,ky=joy?joy.y:jy;ctx.fillStyle='rgba(225,232,245,.42)';ctx.beginPath();ctx.arc(kx,ky,R*.45,0,7);ctx.fill();ctx.globalAlpha=1;
  const pr=drawPanel(me,s);
  drawSwap(me,s,pr);drawPotions(me,s,pr);
  if(me.inBush){const t=me.hidden?'🌿 ซ่อนตัวอยู่ — ศัตรูมองไม่เห็น':'🌿 อยู่ในพุ่ม (เพิ่งโจมตี จึงถูกเห็น)';ctx.textAlign='center';ctx.font=`bold ${12*s}px system-ui,sans-serif`;ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.75)';
    const y=pr.y-(pr.statusHeight||0)-(me.pts>0?30:16)*s-(UI.swap?UI.swap.h+8:0);ctx.strokeText(t,pr.x+pr.w*.3,y);ctx.fillStyle=me.hidden?'#9dffb0':'#ffd08a';ctx.fillText(t,pr.x+pr.w*.3,y)}
  drawBtnAtk(UI.atk,me);
  for(let i=0;i<3;i++)drawSkillBtn(UI.sk[i],i,me);
  ctx.restore();
}
function teamsLeft(){const t=new Set();for(const u of units)if(u.hero&&(!u.dead||u.reviveT>0))t.add(u.team);return t.size}
// edge arrows: allies off-screen (blue + name), footsteps of an enemy just beyond your sight (red, no name), zombies hunting you at night (green)
function edgeArrow(a,col,txt,al,s){const R=Math.min(W,H)*.4,x=W/2+Math.cos(a)*R*1.3,y=H/2+Math.sin(a)*R;ctx.save();ctx.globalAlpha=al;ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=col;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-8,-10);ctx.lineTo(-3,0);ctx.lineTo(-8,10);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
  if(txt){ctx.globalAlpha=al;ctx.font=`bold ${10.5*s}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';const lx=clamp(x-Math.cos(a)*30*s,SAFE.l+50*s,W-SAFE.r-50*s),ly=clamp(y-Math.sin(a)*22*s,48*s,H-40*s);
    ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(txt,lx,ly);ctx.fillStyle=col;ctx.fillText(txt,lx,ly);ctx.textBaseline='alphabetic'}ctx.globalAlpha=1}
function drawSense(me,s){if(gameOver)return;const vr=visionR();
  if(MC.ts>1)for(const u of units){if(!allyOf(u,me)||u.dead)continue;const d=Math.hypot(u.x-me.x,u.y-me.y);if(d<vr*.8)continue;edgeArrow(Math.atan2(u.y-me.y,u.x-me.x),'#6ab8ff',`${arenaDisplayName(u)} ${Math.round(d/40)}ม.`,.9,s)}
  let fe=null,fd=vr*2.2;for(const u of units){if(!u.hero||u===me||u.dead||allyOf(u,me)||u.hidden)continue;const d=Math.hypot(u.x-me.x,u.y-me.y);if(d<vr+40||d>fd)continue;fd=d;fe=u}
  if(fe){const p=.45+.35*Math.sin(performance.now()/180);edgeArrow(Math.atan2(fe.y-me.y,fe.x-me.x),'#ff6a5a','👣',p,s)}
  if(isNight()){let z=null,zd=900;for(const u of units){if(!u.zombie||u.dead||net.mode==='client'&&!u.inSnap)continue;const d=Math.hypot(u.x-me.x,u.y-me.y);if(d<vr*.85||d>zd)continue;zd=d;z=u}
    if(z)edgeArrow(Math.atan2(z.y-me.y,z.x-me.x),'#9dff6a','🧟',.75,s)}}
// weapon fusion status under the clock: countdown + what your two weapons will become
function fuseLine(me){if(!me||me.dead||!me.wk||FUSED[me.wk])return null;if(me.fuseT>0)return{t:'⚒️ กำลังหลอมอาวุธ…',c:'#ffd27a',p:1};
  const left=FUSE_AT-gameT,fk=canFuse(me)?fuseKey(me.wk,me.wk2):null,F=fk&&WEAPONS[fk];
  if(me.wk2&&FUSED[me.wk2])return{t:'⚒️ อาวุธสำรองหลอมแล้ว — แตะรูปอาวุธเพื่อใช้',c:'#ffd27a'};
  if(left>0){const tt=`⚒️ หลอมอาวุธใน ${fmtT(left)}`;return F?{t:`${tt} · ${WEAPONS[me.wk].ic}+${WEAPONS[me.wk2].ic} → ${F.ic} ${F.n}`,c:left<30?'#ffd27a':'#f2e2b8',p:left<30?1:0}:{t:`${tt} · ต้องมีอาวุธ 2 ชนิด (1/2)`,c:'#c8c0b0'}}
  return{t:'⚒️ เก็บอาวุธอีกชนิด — หลอมทันที',c:'#ffd27a'}}
function drawSwap(me,s,pr){const bx=boxNear(me);const it=bx?null:swapCandidate(me);if(!bx&&!it)return;if(ARX){drawArenaPickup(me,s,pr,bx,it);return}const W2=it&&WEAPONS[it.wk];const txt=bx?'📦 เปิดกล่อง':me.wk2?`🔄 รับ ${W2.ic} ${W2.names[it.tier]} · ทิ้ง ${WEAPONS[me.wk2].ic}`:`🔄 เก็บ ${W2.ic} ${W2.names[it.tier]}`+(CURSED&&it?' '+wvIcons(itWV(it)):'');
  ctx.font=`bold ${13*s}px system-ui,sans-serif`;const w=ctx.measureText(txt).width+26*s,h=30*s;const x=clamp(pr.x+pr.w/2-w/2,SAFE.l+8,W-SAFE.r-w-8),y=pr.y-h-10*s-(pr.statusHeight||0)-(me.pts>0?14*s:0);
  const pl=press[4]>0;ctx.globalAlpha=.94;panelBg(x,y,w,h,h/2);ctx.strokeStyle=bx?'#e8c050':TIERS[it.tier].c;ctx.lineWidth=2.5;rr(x,y,w,h,h/2);ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle=pl?'#fff':'#ffe9a8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,x+w/2,y+h/2+1);ctx.textBaseline='alphabetic';UI.swap={x,y,w,h}}
// backpack: two quick potion buttons stacked beside the stat panel + a bag button that opens the full list
function potBtn(B,b,me,s){const n=me.bag[b]|0,cd=Math.max(0,me.bcd[b]||0),P=BAG[b],pr=UI.potP===b&&UI.potT>0;
  const g=ctx.createRadialGradient(B.x,B.y-B.r*.3,2,B.x,B.y,B.r);g.addColorStop(0,'rgba(64,54,40,.95)');g.addColorStop(1,'rgba(16,12,9,.95)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(B.x,B.y,B.r*(pr?.92:1),0,7);ctx.fill();
  ctx.strokeStyle=n>0?['#ff6a7a','#6ab0ff','#ff9ae8','#9dffb0'][b]:'rgba(140,130,110,.6)';ctx.lineWidth=2.5;ctx.stroke();
  ctx.globalAlpha=n>0?(cd>0?.45:1):.35;ctx.font=`${B.r*.95}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(P.ic,B.x,B.y+1);ctx.globalAlpha=1;
  if(cd>0&&n>0){ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.moveTo(B.x,B.y);ctx.arc(B.x,B.y,B.r-1,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(cd/P.cd,0,1));ctx.fill()}
  ctx.fillStyle='#1b1410';ctx.beginPath();ctx.arc(B.x+B.r*.7,B.y+B.r*.7,8*s,0,7);ctx.fill();ctx.strokeStyle='#c9a94a';ctx.lineWidth=1.2;ctx.stroke();
  ctx.fillStyle=n>0?'#ffe9a8':'#8a8070';ctx.font=`bold ${10*s}px system-ui,sans-serif`;ctx.fillText(n,B.x+B.r*.7,B.y+B.r*.72);ctx.textBaseline='alphabetic'}
function potionRail(pr,s){
  const r=Math.max(16,UI.b*.4),Lb=UI.learn[0];
  return {x:Math.min(pr.x+pr.w+r+6*s,UI.sk[0].x-UI.sk[0].r-r-6*s,Lb.x-Lb.r-r-6*s),r};
}
function drawPotions(me,s,pr){if(!me.bag)return;if(UI.potT>0)UI.potT-=1/60;const {x,r}=potionRail(pr,s);
  UI.pot=[{x,y:pr.y-r-6*s,r},{x,y:pr.y-3*r-14*s,r}];UI.bagBtn={x,y:pr.y-5*r-22*s,r};
  potBtn(UI.pot[0],0,me,s);potBtn(UI.pot[1],1,me,s);
  const B=UI.bagBtn,more=(me.bag[2]|0)+(me.bag[3]|0);ctx.fillStyle=UI.bagOpen?'rgba(90,70,30,.95)':'rgba(30,24,18,.92)';ctx.beginPath();ctx.arc(B.x,B.y,B.r,0,7);ctx.fill();ctx.strokeStyle='#c9a94a';ctx.lineWidth=2;ctx.stroke();
  ctx.font=`${B.r*.95}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('🎒',B.x,B.y+1);
  if(more){ctx.fillStyle='#e8453c';ctx.beginPath();ctx.arc(B.x+B.r*.72,B.y-B.r*.7,7.5*s,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font=`bold ${9.5*s}px system-ui,sans-serif`;ctx.fillText(more,B.x+B.r*.72,B.y-B.r*.68)}ctx.textBaseline='alphabetic';
  UI.bagRows=null;if(!UI.bagOpen)return;
  const rw=232*s,rh=40*s,pw=rw+16*s,ph=BAG.length*(rh+6*s)+34*s,px=clamp(B.x-pw-B.r-8*s,SAFE.l+8,W-pw-8),py=clamp(B.y-ph*.6,40*s,H-ph-8);
  panelBg(px,py,pw,ph,10*s);ctx.fillStyle='#ffe9a8';ctx.font=`bold ${13*s}px system-ui,sans-serif`;ctx.textAlign='left';ctx.fillText('🎒 กระเป๋า · แตะเพื่อใช้',px+10*s,py+20*s);
  UI.bagRows=[];BAG.forEach((P,b)=>{const x=px+8*s,y=py+28*s+b*(rh+6*s),n=me.bag[b]|0,cd=Math.max(0,me.bcd[b]||0);UI.bagRows.push({x,y,w:rw,h:rh,b});
    ctx.fillStyle=n>0?'rgba(255,240,200,.08)':'rgba(0,0,0,.25)';rr(x,y,rw,rh,7*s);ctx.fill();ctx.globalAlpha=n>0?1:.45;
    ctx.font=`${rh*.62}px sans-serif`;ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(P.ic,x+6*s,y+rh/2+1);ctx.fillStyle='#ffe9a8';ctx.font=`bold ${12*s}px system-ui,sans-serif`;ctx.fillText(`${P.n} ×${n}`,x+rh*.85,y+rh*.33);
    ctx.fillStyle='#c8bca0';ctx.font=`${10.5*s}px system-ui,sans-serif`;ctx.fillText(cd>0?`รอ ${cd.toFixed(1)} วิ`:P.d,x+rh*.85,y+rh*.72);ctx.globalAlpha=1;ctx.textBaseline='alphabetic'})}
// aim preview while dragging a skill button: range ring + where the skill will land
function w2s(x,y){if(view3D&&has3D()&&R3.ok)return R3.toScreen(x,R3.gY(x,y)+3,y);return{x:(x-cam.x)*Z,y:(y-cam.y)*Z,ok:true}}
function polyW(pts){ctx.beginPath();let ok=true;pts.forEach((p,i)=>{const q=w2s(p[0],p[1]);if(!q.ok)ok=false;if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y)});ctx.closePath();return ok}
function circW(cx,cy,r,n){const pts=[];n=n||40;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return pts}
function drawAim(me,s){const C=UI.cancel,st=aimSt;
  if(C){const over=Math.hypot(st.x-C.x,st.y-C.y)<C.r*1.25;ctx.fillStyle=over?'rgba(220,50,50,.9)':'rgba(40,10,10,.75)';ctx.beginPath();ctx.arc(C.x,C.y,C.r,0,7);ctx.fill();ctx.strokeStyle='#ff8a8a';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font=`bold ${C.r*.8}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✕',C.x,C.y+1);ctx.font=`${10*s}px system-ui,sans-serif`;ctx.fillText('ยกเลิก',C.x,C.y+C.r+10*s);ctx.textBaseline='alphabetic';if(over)return}
  const a=skAim(me,st.i);if(!a)return;const p=st.moved?aimPoint(st):null;
  ctx.save();polyW(circW(me.x,me.y,a.range,56));ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([]);
  if(!p){ctx.restore();return}
  const col='rgba(120,200,255,',dx=p.x-me.x,dy=p.y-me.y,l=Math.hypot(dx,dy)||1,nx=dx/l,ny=dy/l,px=-ny,py=nx;
  if(a.t==='dir'){const w=a.w/2,L=a.range;polyW([[me.x+px*w,me.y+py*w],[me.x+nx*L+px*w,me.y+ny*L+py*w],[me.x+nx*(L+w*1.2),me.y+ny*(L+w*1.2)],[me.x+nx*L-px*w,me.y+ny*L-py*w],[me.x-px*w,me.y-py*w]]);ctx.fillStyle=col+'.28)';ctx.fill();ctx.strokeStyle=col+'.9)';ctx.lineWidth=2;ctx.stroke()}
  else if(a.t==='cone'){const an=Math.atan2(ny,nx),pts=[[me.x,me.y]];for(let k=0;k<=16;k++){const q=an-a.arc+2*a.arc*k/16;pts.push([me.x+Math.cos(q)*a.range,me.y+Math.sin(q)*a.range])}polyW(pts);ctx.fillStyle=col+'.28)';ctx.fill();ctx.strokeStyle=col+'.9)';ctx.lineWidth=2;ctx.stroke()}
  else if(a.t==='area'){polyW(circW(p.x,p.y,a.r,36));ctx.fillStyle='rgba(255,170,90,.3)';ctx.fill();ctx.strokeStyle='rgba(255,200,120,.95)';ctx.lineWidth=2.5;ctx.stroke()}
  else if(a.t==='unit'){const t=enemyNear(me,p,a.range);polyW(circW(p.x,p.y,230,30));ctx.strokeStyle=col+'.5)';ctx.lineWidth=1.5;ctx.stroke();
    if(t&&unitVisibleTo(t,me,me)){polyW(circW(t.x,t.y,t.r+16,24));ctx.strokeStyle='rgba(255,80,80,.95)';ctx.lineWidth=3;ctx.stroke()}}
  const q=w2s(p.x,p.y);if(q.ok){ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(q.x,q.y,4,0,7);ctx.fill()}ctx.restore()}
function drawAnnounce(s){if(!announce)return;if(ARX){arenaNotice(announce.txt,W/2,H*.3,W*.7,s,{size:16,alpha:clamp(announce.t,0,1)});return}ctx.textAlign='center';ctx.font=`bold ${19*s}px system-ui,sans-serif`;ctx.globalAlpha=clamp(announce.t,0,1);ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(announce.txt,W/2,H*.3);ctx.fillStyle='#ffe27a';ctx.fillText(announce.txt,W/2,H*.3);ctx.globalAlpha=1}
function drawMinimap(me,s,my0){
  const mm=Math.min(W,H)*.26,mx=SAFE.l+9,my=my0||8,k=mm/WORLD;const L=listener()||me;
  ctx.fillStyle='#000';ctx.fillRect(mx-3,my-3,mm+6,mm+6);ctx.strokeStyle='#7c838c';ctx.lineWidth=1.5;ctx.strokeRect(mx-2.5,my-2.5,mm+5,mm+5);
  ctx.save();ctx.beginPath();ctx.rect(mx,my,mm,mm);ctx.clip();if(MINI)ctx.drawImage(MINI,mx,my,mm,mm);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.rect(mx,my,mm,mm);if(L)ctx.arc(mx+L.x*k,my+L.y*k,visionR()*k,0,Math.PI*2,true);ctx.fill();
  ctx.fillStyle='rgba(140,40,220,.42)';ctx.beginPath();ctx.rect(mx,my,mm,mm);ctx.arc(mx+zone.x*k,my+zone.y*k,Math.max(.5,zone.r*k),0,Math.PI*2,true);ctx.fill();
  ctx.strokeStyle='#d7a0ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(mx+zone.x*k,my+zone.y*k,Math.max(.5,zone.r*k),0,7);ctx.stroke();
  if(zone.st!=='done'){ctx.strokeStyle='#fff';ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(mx+zone.tx*k,my+zone.ty*k,Math.max(.5,zone.tr*k),0,7);ctx.stroke();ctx.setLineDash([])}
  ctx.font=`${9*s}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const sh of WD.shrines)ctx.fillText('✨',mx+sh.x*k,my+sh.y*k);{const C=WD.castle;ctx.fillText('🏰',mx+C.cx*k,my+C.cy*k)}if(WD.fort&&WD.fort.castle){const F=WD.fort.castle;ctx.fillText('❄️',mx+F.x*k,my+F.y*k)}if(WD.dg)for(const e of WD.dg.ents)ctx.fillText('⛓️',mx+e.x*k,my+e.y*k);
  for(const c of WD.caves)if(discovered.has(c.id))ctx.fillText('🕳️',mx+c.x*k,my+c.y*k);
  for(const g of WD.graves)if(isNight())ctx.fillText('🪦',mx+g.x*k,my+g.y*k);
  for(const u of units){if(u.dead||u===me)continue;
    if(u.hero&&allyOf(u,me)){ctx.fillStyle='#3d9cff';ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mx+u.x*k,my+u.y*k,3.5,0,7);ctx.fill();ctx.stroke();continue}
    if(!(u.hero||u.zombie)||!L||!unitVisibleTo(u,me,L))continue;ctx.fillStyle=u.zombie?'#8fd14f':'#ff4a4a';ctx.beginPath();ctx.arc(mx+u.x*k,my+u.y*k,u.zombie?2:3,0,7);ctx.fill()}
  if(!me.dead){const px=mx+me.x*k,py=my+me.y*k,a=Math.atan2(me.fy,me.fx);ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.fillStyle='#3fd23f';ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  ctx.textBaseline='alphabetic';ctx.restore();return{x:mx,y:my,w:mm,h:mm}}
// player frame, top-left: weapon crest (tap = swap weapon), level, health / mana, stats
function drawFrame(me,s){const x0=SAFE.l+6,y0=5,w=clamp(W*.3,196*s,270*s),h=52*s;
  const bg=ctx.createLinearGradient(x0,0,x0+w,0);bg.addColorStop(0,'rgba(6,7,9,.82)');bg.addColorStop(1,'rgba(6,7,9,.25)');ctx.fillStyle=bg;rr(x0,y0,w,h,h/2);ctx.fill();
  const pr=h*.42,pcx=x0+h/2,pcy=y0+h/2;const g=ctx.createRadialGradient(pcx,pcy-pr*.3,2,pcx,pcy,pr);g.addColorStop(0,hexA(LOOKS[me.look].c,.9));g.addColorStop(1,'#0c0a0a');ctx.fillStyle=g;ctx.beginPath();ctx.arc(pcx,pcy,pr,0,7);ctx.fill();
  ctx.strokeStyle='#8a929c';ctx.lineWidth=2.5*s;ctx.beginPath();ctx.arc(pcx,pcy,pr+1.5*s,0,7);ctx.stroke();
  ctx.font=`${pr*1.05}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(me.wk?WEAPONS[me.wk].ic:'✊',pcx,pcy+1);
  if(me.fuseT>0){const k=.5+.5*Math.sin(performance.now()/70);ctx.strokeStyle=`rgba(255,210,110,${.5+.5*k})`;ctx.lineWidth=(3+3*k)*s;ctx.beginPath();ctx.arc(pcx,pcy,pr+4*s,0,7);ctx.stroke()}
  else if(me.wk&&FUSED[me.wk]){ctx.strokeStyle=hexA(WEAPONS[me.wk].glow,.8);ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(pcx,pcy,pr+4*s,performance.now()/600,performance.now()/600+4.2);ctx.stroke()}
  if(UI.wswT>0)UI.wswT-=1/60;UI.wsw={x:pcx,y:pcy,r:pr};UI.wsw2=null;
  ctx.fillStyle='#0c0d10';ctx.beginPath();ctx.arc(pcx+pr*.74,pcy+pr*.74,9*s,0,7);ctx.fill();ctx.strokeStyle='#aab2bc';ctx.lineWidth=1.3;ctx.stroke();ctx.fillStyle='#f2ecd8';ctx.font=`bold ${10*s}px sans-serif`;ctx.fillText(me.lvl,pcx+pr*.74,pcy+pr*.74+1);
  let bx=pcx+pr+10*s,bw=x0+w-bx-12*s;
  if(me.wk2){const cr=Math.max(11,pr*.56),cx=x0+w-cr-5*s,cy=pcy,pz=UI.wswT>0;UI.wsw2={x:cx,y:cy,r:cr};bw-=cr*2+10*s;
    ctx.fillStyle='#0c0d10';ctx.beginPath();ctx.arc(cx,cy,cr*(pz?.88:1),0,7);ctx.fill();ctx.strokeStyle=TIERS[clamp(me.wt2|0,0,4)].c;ctx.lineWidth=2;ctx.stroke();
    ctx.font=`${cr*1.1}px sans-serif`;ctx.fillStyle='#fff';ctx.fillText(WEAPONS[me.wk2].ic,cx,cy+1);ctx.font=`bold ${cr*.62}px sans-serif`;ctx.fillStyle='#e8e2d0';ctx.fillText('⇄',cx+cr*.8,cy+cr*.78)}
  const bar=(y,hh,f,c1,c2,txt)=>{ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(bx,y,bw,hh);const gr=ctx.createLinearGradient(0,y,0,y+hh);gr.addColorStop(0,c1);gr.addColorStop(1,c2);ctx.fillStyle=gr;ctx.fillRect(bx,y,bw*clamp(f,0,1),hh);
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(bx,y,bw*clamp(f,0,1),hh*.35);ctx.strokeStyle='rgba(150,158,170,.55)';ctx.lineWidth=1;ctx.strokeRect(bx-.5,y-.5,bw+1,hh+1);
    ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(8.5,hh*.8)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=2.5;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.strokeText(txt,bx+bw/2,y+hh/2+.5);ctx.fillText(txt,bx+bw/2,y+hh/2+.5)};
  bar(y0+8*s,12*s,me.hp/me.maxHp,'#e2484c','#8a1a20',`${fmtN(Math.ceil(me.hp))} / ${fmtN(me.maxHp)}`+(me.shieldHp>0?` (+${fmtN(Math.ceil(me.shieldHp))})`:''));
  if(me.shieldHp>0){ctx.fillStyle='rgba(255,236,150,.85)';ctx.fillRect(bx,y0+8*s,bw*clamp(me.shieldHp/me.maxHp,0,1),2*s)}
  bar(y0+23*s,8*s,me.mp/Math.max(1,me.maxMp),'#46c6cc','#17687c',`${Math.floor(me.mp)} / ${me.maxMp}`);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font=`${9.5*s}px system-ui,sans-serif`;ctx.fillStyle='#d8d4c8';ctx.lineWidth=2.5;ctx.strokeStyle='rgba(0,0,0,.7)';
  const stt=`⚔${fmtN(me.atkDmg)}  🛡${(+me.armorV).toFixed(1)}  👟${Math.round(HB.spd*(1+me.spdB))}`+(me.at>=0?'  '+ARMORS[me.at].ic:'')+(me.aegis?' ⚜️':'');ctx.strokeText(stt,bx,y0+44*s);ctx.fillText(stt,bx,y0+44*s);
  return{x:x0,y:y0,w,h}}
// enemy frame, top centre: whoever I last hit (or who is hitting me)
function drawTarget(me,s,fr){if(TGT.t<=0)return;const u=UMAP.get(TGT.id),L=listener()||me;if(!u||u===me||(!u.dead&&L&&!unitVisibleTo(u,me,L)))return;
  let tw=clamp(W*.3,180*s,310*s),tx=Math.max(W/2-tw/2,fr.x+fr.w+12*s);const lim=UI.mute.x-30;if(tx+tw>lim)tw=lim-tx;if(tw<120*s)return;
  const y=7,bh=12*s,by=y+15*s,f=u.dead?0:clamp(u.hp/u.maxHp,0,1),al=clamp(TGT.t/.5,0,1),ally=u.hero&&allyOf(u,me);ctx.save();ctx.globalAlpha=al;ctx.lineJoin='round';
  const nm=arenaDisplayName(u)+(u.hero?`  Lv.${u.lvl}`:'');ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font=`bold ${11.5*s}px system-ui,sans-serif`;ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.strokeText(nm,tx+tw/2,y+10*s);ctx.fillStyle=ally?'#bfe0ff':'#ff8f84';ctx.fillText(nm,tx+tw/2,y+10*s);
  const e=bh*.9;ctx.fillStyle='rgba(0,0,0,.75)';ctx.beginPath();ctx.moveTo(tx-e,by+bh/2);ctx.lineTo(tx,by-2);ctx.lineTo(tx+tw,by-2);ctx.lineTo(tx+tw+e,by+bh/2);ctx.lineTo(tx+tw,by+bh+2);ctx.lineTo(tx,by+bh+2);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(160,168,180,.75)';ctx.lineWidth=1.3;ctx.stroke();
  const g=ctx.createLinearGradient(0,by,0,by+bh);g.addColorStop(0,ally?'#58a8f0':'#e2484c');g.addColorStop(1,ally?'#1c4c9a':'#7c141a');ctx.fillStyle=g;ctx.fillRect(tx,by,tw*f,bh);ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(tx,by,tw*f,bh*.35);
  const t=u.dead?'กำจัดแล้ว':`${fmtN(Math.ceil(u.hp))} / ${fmtN(u.maxHp)} (${Math.round(f*100)}%)`;ctx.font=`bold ${9.5*s}px system-ui,sans-serif`;ctx.textBaseline='middle';ctx.lineWidth=2.5;ctx.strokeStyle='rgba(0,0,0,.65)';ctx.strokeText(t,tx+tw/2,by+bh/2+.5);ctx.fillStyle='#fff';ctx.fillText(t,tx+tw/2,by+bh/2+.5);ctx.restore()}
// slim strip at the bottom: level, experience, weapon in hand
function drawPanel(me,s){
  const b=UI.b;const left=SAFE.l+b*3.4,right=W-SAFE.r-b*4.6;const pw=clamp(right-left,230*s,440*s),ph=17*s;const px=clamp(W/2-pw/2-b*.6,left,right-pw),py=H-SAFE.b-ph-5;
  ctx.fillStyle='rgba(6,7,9,.6)';rr(px,py,pw,ph,ph/2);ctx.fill();ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=`bold ${10.5*s}px system-ui,sans-serif`;ctx.fillStyle='#f2ecd8';const lv='Lv.'+me.lvl;ctx.fillText(lv,px+9*s,py+ph/2+.5);
  const wpn=me.wk?`${WEAPONS[me.wk].ic} ${WEAPONS[me.wk].names[me.wt]}`:'✊ มือเปล่า';ctx.textAlign='right';ctx.fillStyle=me.wk?TIERS[me.wt].c:'#9a9890';ctx.fillText(wpn,px+pw-9*s,py+ph/2+.5);
  const x1=px+9*s+ctx.measureText(lv).width+8*s,x2=px+pw-9*s-ctx.measureText(wpn).width-8*s,xpk=me.lvl>=MAXL?1:clamp(me.xp/needXp(me.lvl),0,1);
  if(x2-x1>30){ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x1,py+ph/2-1.5*s,x2-x1,3*s);ctx.fillStyle='#d8c070';ctx.fillRect(x1,py+ph/2-1.5*s,(x2-x1)*xpk,3*s)}
  ctx.textBaseline='alphabetic';
  if(me.pts>0){ctx.textAlign='center';ctx.font=`bold ${11*s}px system-ui,sans-serif`;ctx.globalAlpha=.6+.4*Math.sin(performance.now()/160);ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(`แต้มสกิล +${me.pts}`,px+pw/2,py-6*s);ctx.fillStyle='#7dff8a';ctx.fillText(`แต้มสกิล +${me.pts}`,px+pw/2,py-6*s);ctx.globalAlpha=1}
  return{x:px,y:py,w:pw,h:ph}}
// round HUD button: soft shadow, bevelled metal rim, dark glass face tinted by `tint`, gloss on top
function btnBase(x,y,r,pr,rim,tint,dim){const R=r*(pr?.94:1),rw=Math.max(3,r*.11);
  ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.arc(x,y+r*.07,R+rw*.6,0,7);ctx.fill();
  const m=ctx.createLinearGradient(x,y-R,x,y+R);m.addColorStop(0,dim?'#7c8088':'#f4f6f9');m.addColorStop(.45,rim);m.addColorStop(1,dim?'#1c1e22':'#2a2e34');ctx.fillStyle=m;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.fill();
  ctx.fillStyle='rgba(8,6,4,.9)';ctx.beginPath();ctx.arc(x,y,R-rw,0,7);ctx.fill();
  const g=ctx.createRadialGradient(x,y-R*.35,1,x,y,R-rw);g.addColorStop(0,hexA(tint,pr?.6:.34));g.addColorStop(.75,hexA(tint,.08));g.addColorStop(1,'rgba(6,5,4,.2)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R-rw-1,0,7);ctx.fill();
  const gl=ctx.createLinearGradient(x,y-R,x,y);gl.addColorStop(0,'rgba(255,255,255,.22)');gl.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.ellipse(x,y-R*.42,R*.62,R*.36,0,0,7);ctx.fill()}
// ---- painted skill icons: game-icons.net glyph (gi.js) lit like a metal emblem over a glowing backdrop, cached per icon ----
const ICN={};
function cmix(a,b,t){const A=parseInt(a.slice(1),16),B2=parseInt(b.slice(1),16),f=(s)=>Math.round(((A>>s)&255)*(1-t)+((B2>>s)&255)*t);return `rgb(${f(16)},${f(8)},${f(0)})`}
function icoPaint(name,col,ult){const k=name+col+(ult?1:0);if(ICN[k]!==undefined)return ICN[k];ICN[k]=null;if(typeof GI==='undefined'||!GI[name]||typeof Path2D==='undefined')return null;
  try{const N=144,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),R=N/2,P=new Path2D(GI[name]);
    let g=x.createRadialGradient(R,R*.72,2,R,R,R);g.addColorStop(0,cmix(col,'#000000',.2));g.addColorStop(.5,cmix(col,'#000000',.62));g.addColorStop(1,'#050608');x.fillStyle=g;x.fillRect(0,0,N,N);
    x.save();x.globalCompositeOperation='lighter';x.translate(R,R*.9);for(let i=0;i<14;i++){x.rotate(6.2832/14);const rg=x.createLinearGradient(0,0,0,-R*1.1);rg.addColorStop(0,hexA(col,.22));rg.addColorStop(1,hexA(col,0));x.fillStyle=rg;x.beginPath();x.moveTo(0,0);x.lineTo(-R*.09,-R*1.1);x.lineTo(R*.09,-R*1.1);x.closePath();x.fill()}x.restore();
    const sc=N*.76/512,o=(N-512*sc)/2;const glyph=(f)=>{x.save();x.translate(o,o+N*.02);x.scale(sc,sc);f();x.restore()};
    glyph(()=>{x.shadowColor='rgba(0,0,0,.85)';x.shadowBlur=10;x.shadowOffsetY=3;x.fillStyle='#000';x.fill(P)});
    glyph(()=>{x.shadowColor=col;x.shadowBlur=22;x.fillStyle=col;x.globalAlpha=.9;x.fill(P)});
    glyph(()=>{x.lineJoin='round';x.lineWidth=22;x.strokeStyle='rgba(10,8,6,.75)';x.stroke(P);const fg=x.createLinearGradient(0,40,0,470);fg.addColorStop(0,'#ffffff');fg.addColorStop(.3,cmix(col,'#ffffff',.6));fg.addColorStop(.62,col);fg.addColorStop(1,cmix(col,'#000000',.5));x.fillStyle=fg;x.fill(P);
      x.save();x.clip(P);const hl=x.createLinearGradient(0,0,512,512);hl.addColorStop(0,'rgba(255,255,255,.55)');hl.addColorStop(.42,'rgba(255,255,255,0)');hl.addColorStop(.58,'rgba(0,0,0,0)');hl.addColorStop(1,'rgba(0,0,0,.35)');x.fillStyle=hl;x.fillRect(0,0,512,512);x.restore()});
    g=x.createRadialGradient(R,R,R*.62,R,R,R);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');x.fillStyle=g;x.fillRect(0,0,N,N);
    g=x.createLinearGradient(0,0,0,R);g.addColorStop(0,'rgba(255,255,255,.26)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.ellipse(R,R*.5,R*.72,R*.42,0,0,7);x.fill();
    if(ult){x.strokeStyle='rgba(255,214,120,.85)';x.lineWidth=3;x.beginPath();x.arc(R,R,R-3,0,7);x.stroke()}
    return ICN[k]=c}catch(e){return null}}
function skIco(wk,i){if(typeof SKI==='undefined'||!wk)return null;const L=SKI[wk]||(wk.startsWith('fSS')?SKI.fSS:null);if(!L||!L[i])return null;let col=L[i][1];return icoPaint(L[i][0],col,i===2)}
function wpIco(me){if(typeof WI==='undefined')return null;const F=me.wk&&FUSED[me.wk],b=!me.wk?'fist':F?(F.arch==='SS'?'fire':F.arch==='RS'||F.arch==='RR'?'bow':F.arch==='MS'?'gsword':'sword'):me.wk;const n=WI[b];if(!n)return null;
  const col=F?F.glow:me.wk&&me.wt>=2?TIERS[me.wt].c:me.wk?WEAPONS[me.wk].col:'#c8b8a0';return icoPaint(n,col,0)}
// skill / attack icons drawn as silver glyphs (where the browser supports canvas filters)
const ICO_F=(()=>{try{return 'filter' in CanvasRenderingContext2D.prototype}catch(e){return false}})();function icoMono(on){if(ICO_F)ctx.filter=on?'grayscale(.9) brightness(1.25) contrast(1.05)':'none'}
function drawBtnAtk(B,me){const ring=me.wk&&me.wt>0?TIERS[me.wt].c:'#b4bcc6';const pr=press[0]>0||atkHeld;
  btnBase(B.x,B.y,B.r,pr,ring,me.wk&&FUSED[me.wk]?WEAPONS[me.wk].glow:'#59626e');ctx.fillStyle='#fff';
  const wi=wpIco(me);ctx.textAlign='center';ctx.textBaseline='middle';if(wi){const ir=B.r*(pr?.82:.87);ctx.save();ctx.beginPath();ctx.arc(B.x,B.y,ir,0,7);ctx.clip();ctx.drawImage(wi,B.x-ir,B.y-ir,ir*2,ir*2);ctx.restore()}else{ctx.font=`${B.r*.8}px sans-serif`;icoMono(1);ctx.fillText(me.wk?WEAPONS[me.wk].ic:'✊',B.x,B.y+2);icoMono(0)}ctx.textBaseline='alphabetic'}
function drawSkillBtn(B,i,me){
  const sk=me.wk?SK[me.wk][i]:null,L=me.skl[i],cd=Math.max(0,me.cd[i]),li=Math.max(0,L-1),cost=sk?sk.mp[li]:0,max=sk?sk.cd[li]*cdMul(me):1,noMana=sk&&L>0&&me.mp<cost;const pr=press[i+1]>0;
  {const off=L===0||!sk;btnBase(B.x,B.y,B.r,pr,off?'#4e5258':cd>0?'#5e636a':i===2?'#d9c48a':'#a9b1bb',off?'#2a2c30':i===2?'#c8641a':me.wk&&WEAPONS[me.wk].col||'#5a6068',off||cd>0);ctx.fillStyle='#fff'}
  const icn=sk&&skIco(me.wk,i);ctx.textAlign='center';ctx.textBaseline='middle';
  if(icn){const ir=B.r*(pr?.82:.87);ctx.save();if(L===0&&ICO_F)ctx.filter='grayscale(.85) brightness(.8)';ctx.globalAlpha=L===0?.75:cd>0?.7:1;ctx.beginPath();ctx.arc(B.x,B.y,ir,0,7);ctx.clip();ctx.drawImage(icn,B.x-ir,B.y-ir,ir*2,ir*2);ctx.restore();ctx.fillStyle='#fff'}
  else{ctx.globalAlpha=L===0||!sk?.3:cd>0?.45:1;ctx.font=`${B.r*.85}px sans-serif`;icoMono(1);ctx.fillText(sk?sk.ic:['Q','W','R'][i],B.x,B.y+2);icoMono(0);ctx.globalAlpha=1}
  if(noMana&&cd<=0){ctx.fillStyle='rgba(30,60,200,.45)';ctx.beginPath();ctx.arc(B.x,B.y,B.r-2,0,7);ctx.fill()}
  if(cd>0&&L>0&&sk){ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.moveTo(B.x,B.y);ctx.arc(B.x,B.y,B.r-1,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(cd/max,0,1));ctx.fill();
    ctx.fillStyle='#fff';ctx.font=`bold ${B.r*.55}px system-ui,sans-serif`;ctx.fillText(cd<1?cd.toFixed(1):Math.ceil(cd),B.x,B.y+1)}
  const n=i===2?3:4;const pw=B.r*.26,gap=B.r*.07,tw=n*pw+(n-1)*gap;for(let k=0;k<n;k++){const x=B.x-tw/2+k*(pw+gap),y=B.y+B.r+3;ctx.fillStyle=k<L?'#ffd35a':'rgba(30,26,20,.9)';ctx.fillRect(x,y,pw,4);ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=1;ctx.strokeRect(x,y,pw,4)}
  if(L>0&&sk){ctx.font=`bold ${Math.max(9,B.r*.3)}px system-ui,sans-serif`;ctx.fillStyle=noMana?'#ff8080':'#8fc4ff';ctx.fillText(cost,B.x+B.r*.62,B.y+B.r*.62)}
  if(!sk&&L>0){ctx.font=`bold ${B.r*.3}px system-ui,sans-serif`;ctx.fillStyle='#e8dcc0';ctx.fillText('ไม่มีอาวุธ',B.x,B.y+B.r*.55)}
  if(L===0&&!canLearn(me,i)){ctx.font=`bold ${B.r*.36}px system-ui,sans-serif`;ctx.fillStyle='#e8dcc0';ctx.fillText(i===2?'Lv6':'🔒',B.x,B.y+B.r*.55)}
  if(canLearn(me,i)){const Lb=UI.learn[i];const pulse=1+.08*Math.sin(performance.now()/140);ctx.fillStyle='#2aa84a';ctx.beginPath();ctx.arc(Lb.x,Lb.y,Lb.r*pulse,0,7);ctx.fill();ctx.strokeStyle='#d8ffd8';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font=`bold ${Lb.r*1.5}px system-ui,sans-serif`;ctx.fillText('+',Lb.x,Lb.y+1)}
  if(sk&&L>0&&cd<=0){ctx.font=`bold ${Math.max(8,B.r*.26)}px system-ui,sans-serif`;ctx.fillStyle='rgba(255,240,200,.85)';ctx.lineWidth=2.5;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.strokeText(sk.n,B.x,B.y-B.r-6);ctx.fillText(sk.n,B.x,B.y-B.r-6)}
  ctx.textBaseline='alphabetic'}

// ===================== FLOW / UI =====================
const OV=['menu','rooms','lobby','end'];let roomsCtx=false;
const MP_HINT='เล่นออนไลน์ได้ในแอป APK, หน้าเว็บ GitHub Pages หรือหน้า Claude ที่ได้รับเชิญ';
function showOnly(id){for(const o of OV)$(o).classList.toggle('hidden',o!==id)}
function menuMsg(t,c){for(const k of ['menuMsg','roomsMsg']){$(k).textContent=t||'';$(k).style.color=c||''}$('lobbyMsg').textContent=t||''}
// leaving a room goes back to the room list when that is where the player came from
function showMenu(){if(ARX&&window.ArenaEditor?.testing){ArenaEditor.returnToEdit();return}state='menu';if(roomsCtx){showOnly('rooms');listRooms()}else showOnly('menu')}
function showRooms(){roomsCtx=true;showMenu()}
function showLobby(){state='lobby';listTok++;showOnly('lobby');renderLobby()}
function inviteLink(){if(!/^https?:$/.test(location.protocol)||net.tr&&net.tr.kind==='room')return '';return location.origin+location.pathname+'?room='+net.code}
function qmLeft(){return Math.max(0,Math.ceil((net.qmEnd-performance.now())/1000))}
function showSearch(note){state='lobby';showOnly('lobby');renderLobby();$('lobbyMsg').textContent=note||''}
function renderLobby(){const host=net.mode==='host',search=net.mode==='search',qm=net.qm&&!search,room=!qm&&!search;
  $('lobbySpin').classList.toggle('hidden',!search);$('lobbyCode').classList.toggle('hidden',search);
  $('lobbyCode').textContent=qm?'⏱ '+qmLeft():net.code;
  $('lobbyTitle').translate=!(room&&net.rname);
  $('lobbyTitle').textContent=room?(net.lock?'🔒 ':'')+(net.rname||'ห้อง '+net.code):qm?'⚡ ดวลผู้เล่นจริง':'';
  const plRow=(p,i)=>`<div class="pl"><span class="dot" style="background:${LOOKS[clamp(p.look|0,0,7)].c}"></span><span id="roomPlayer-${i}" translate="no">${escapeHtml(p.name)}</span>${i===0?' 👑':''}${host&&room&&i>0&&p.ctrl?`<button class="kick" data-k="${escapeHtml(p.ctrl)}" title="เชิญออก" aria-label="เชิญออก" aria-describedby="roomPlayer-${i}">✕</button>`:''}</div>`;
  const ts=room?(net.cfg.ts||1):1;const myI=host?0:(net.youI|0),myT=net.lobby[myI]?net.lobby[myI].team|0:-1;
  if(search)$('lobbyList').innerHTML='';
  else if(ts>1){const N=nTeams();let h='<div class="teams">';
    for(let k=0;k<N;k++){const mem=net.lobby.map((p,i)=>[p,i]).filter(q=>(q[0].team|0)===k);if(!mem.length&&k>=Math.ceil(net.lobby.length/ts)+1&&k!==myT)continue;
      h+=`<div class="team${k===myT?' me':''}"><h4><span>ทีม ${k+1}</span>${k!==myT&&mem.length<ts?`<button data-t="${k}">เข้าทีม</button>`:''}</h4>`+mem.map(q=>plRow(q[0],q[1])).join('')+'<div class="slot">'+'· ว่าง (บอท)<br>'.repeat(Math.max(0,ts-mem.length))+'</div></div>'}
    $('lobbyList').innerHTML=h+'</div>'}
  else $('lobbyList').innerHTML=net.lobby.map(plRow).join('');
  $('lobbyStart').classList.toggle('hidden',!host);$('lobbyStart').textContent=qm?'เริ่มเลย':'เริ่มเกม';$('lobbyLeave').textContent=search||qm?'ยกเลิก':'ออกจากห้อง';
  $('cfgBox').classList.toggle('hidden',!(host&&room));
  if(host&&room){$('cfgMax').value=String(net.cfg.max);$('cfgFill').value=String(net.cfg.fill);$('cfgSize').value=net.cfg.size;$('cfgMode').value=String(net.cfg.ts||1);
    for(const o of $('cfgMax').options)o.disabled=+o.value<net.lobby.length}
  const hum=net.lobby.length,mx=roomMax();
  $('lobbyNote').textContent=search?'กำลังค้นหาผู้เล่นจริงที่รออยู่…':qm?`ผู้เล่นจริง ${hum}/${MAX_HUMANS} · หมดเวลาแล้วเริ่มทันที คนไม่ครบเติมบอท (รวม ${Math.max(QM_TOTAL,hum)} คน) · ทุกคนเป็นศัตรู`:
    `ผู้เล่น ${hum}/${mx} · ${cfgText(net.cfg,hum)}`+(host?'':' · รอเจ้าของห้องกดเริ่ม…');
  const link=search||qm?'':inviteLink();$('inviteRow').classList.toggle('hidden',!link||!host);$('inviteLink').value=link;
  $('chatBox').classList.toggle('hidden',search);if(!search)renderChat();
  $('lobbyHow').textContent=search||qm?'⚡ จับคู่ด่วน · ใครกดจับคู่ตอนนี้จะมาเจอกันในห้องนี้':net.tr&&net.tr.kind==='room'?'เพื่อนเปิดหน้านี้ใน Claude แล้วเลือกห้องจากรายการ หรือพิมพ์รหัสห้อง':(net.pub?'ห้องนี้แสดงในรายการห้องออนไลน์ · ':'ห้องส่วนตัว · ')+'แชร์รหัสหรือลิงก์ให้เพื่อนได้ (แอป APK กับเว็บเล่นด้วยกันได้)'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function enterPlay(){showOnly(null);joy=null;atkHeld=false;ptrs.clear();arenaHeldSkill=null;aimSt=null;state='play';net.lastSnap=0;net.inputs={};
  try{const de=document.documentElement;if(de.requestFullscreen&&!document.fullscreenElement)de.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})).catch(()=>{})}catch(e){}}
function showEnd(win,rank,kills,lvl,time){
  $('endTitle').textContent=win?'🏆 ผู้ชนะ!':'💀 ตกรอบ';AU.play(win?'win':'death');const t=time||0;
  const tm=MC.ts>1;$('endStats').innerHTML=`${tm?'ทีมได้อันดับ':'อันดับ'} <b>#${rank}</b> จาก ${tm?Math.round(MC.n/MC.ts)+' ทีม':MC.n}<br>ฆ่า ${kills} · เลเวล ${lvl} · รอด ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
  $('watchBtn').classList.toggle('hidden',win||gameOver);endButtons();showOnly('end')}
// the host keeps the match running for everyone, so it can only leave once the match is over
function hostBusy(){return net.mode==='host'&&!gameOver&&Object.keys(net.cl).length>0}
function endButtons(){const b=$('againBtn'),hostLive=hostBusy();b.disabled=hostLive;
  b.textContent=hostLive?'รอเกมจบก่อน (คุณเป็นโฮสต์)':net.qm?'⚡ จับคู่ใหม่':net.mode==='host'?'กลับห้อง':net.mode==='client'?'รอในห้อง':'กลับเมนู';
  $('endMenu').classList.toggle('hidden',hostLive||!(net.qm||net.mode!=='solo'))}
function showFinal(e){const w=UMAP.get(e.w);$('endTitle').textContent='🏁 จบเกม';const tw=e.wt!==undefined&&MC.ts>1?units.filter(u=>u.hero&&u.team===e.wt).map(resultName):null;
  $('endStats').innerHTML=tw?`ทีมผู้ชนะ <b translate="no">${escapeHtml(tw.join(', '))}</b>`:`ผู้ชนะคือ <b translate="no">${escapeHtml(w?resultName(w):'-')}</b>`;$('watchBtn').classList.add('hidden');
  endButtons();showOnly('end')}
$('watchBtn').onclick=()=>{AU.play('click');showOnly(null);const al=units.filter(u=>u.hero&&!u.dead);spectate=al.length?al[0].id:null;if(net.mode==='client'&&spectate)netSend({t:'spec',id:spectate})};
$('againBtn').onclick=()=>{AU.play('click');if(hostBusy())return;if(net.qm){quickMatch();return}if(net.mode==='host'){state='lobby';if(net.tr)net.tr.setState('lobby');pushLobby();showLobby()}else if(net.mode==='client'){state='lobby';showLobby()}else showMenu()};
// look (cloak colour) chooser + weapon codex
const lookEl=$('looks');
LOOKS.forEach((l,i)=>{const b=document.createElement('button');b.type='button';b.className='look'+(i===chosenLook?' sel':'');b.style.background=l.c;b.title=l.n;b.setAttribute('aria-label','สีผ้าคลุม '+l.n);
  b.onclick=()=>{chosenLook=i;lsSet('ar_look',String(i));AU.init();AU.play('click');lookEl.querySelectorAll('.look').forEach((e,j)=>e.classList.toggle('sel',j===i));
    if(net.mode==='client')netSend({t:'look',look:i});else if(net.mode==='host'&&net.lobby[0]){net.lobby[0].look=i;pushLobby()}};lookEl.appendChild(b)});
const codexEl=$('codex');
for(const k of WK){const d=WEAPONS[k];const el=document.createElement('div');el.className='wcard';if(ARX)el.dataset.weapon=k;
  el.innerHTML=`<div class="ic">${d.ic}</div><b>${d.n}</b><small>${d.desc}</small><div class="sks">${SK[k].map(s=>`<span title="${s.n}">${s.ic}</span>`).join(' ')}</div>`;codexEl.appendChild(el)}
// fusion recipes: every fused weapon, what makes it and its three new skills
function recipeTxt(F){const M='🗡️🪓🔪⚔️',R='🏹🎯',S=k=>WEAPONS[k].ic+' '+WEAPONS[k].n;
  return F.arch==='MM'?`${M} ประชิด 2 ชนิด`:F.arch==='MR'?`${M} ประชิด + ${R} ยิงไกล`:F.arch==='RR'?'🏹 ธนูยาว + 🎯 หน้าไม้':F.arch==='MS'?`${M} ประชิด + ${S(F.el)}`:F.arch==='RS'?`${R} ยิงไกล + ${S(F.el)}`:`${WEAPONS[F.el].ic} + ${WEAPONS[F.el2].ic} คทา 2 ธาตุ`}
{const G=$('fuseGrid');for(const k of FK){const F=WEAPONS[k],el=document.createElement('div');el.className='fcard';if(ARX)el.dataset.weapon=k;el.style.borderColor=hexA(F.glow,.55);
  el.innerHTML=`<div class="fh2"><span class="ic">${F.ic}</span><div><b>${F.n}</b><div class="rc">${recipeTxt(F)}</div></div></div><small>${F.desc}</small><div class="sks">${SK[k].map((s,i)=>`<span>${s.ic} ${['Q','E','R'][i]} · ${s.n}</span>`).join('')}</div>`;G.appendChild(el)}}
$('fuseBtn').onclick=()=>{AU.init();AU.play('click');$('fuseOv').classList.remove('hidden')};
// sound credits (CC BY works must be credited; CC0 listed as thanks)
const CREDITS=[['ไอคอนสกิลและอาวุธ',[['Game-icons.net','Lorc, Delapouite และผู้ร่วมสร้าง','CC BY 3.0','https://game-icons.net']]],['เพลง',[
  ['Treasure Hunter (เมนู)','Tad Miller (TAD)','CC0','https://opengameart.org/node/127124'],
  ['Woodland Fantasy (กลางวัน)','Matthew Pablo — matthewpablo.com','CC BY 3.0','https://opengameart.org/node/31929'],
  ['Spooky Forest (กลางคืน)','Bendzer','CC BY 4.0','https://opengameart.org/node/94146'],
  ['Determined Pursuit (ต่อสู้)','Emma_MA','CC0','https://opengameart.org/content/determined-pursuit-epic-orchestra-loop'],
  ['Land of Fearless (วงสุดท้าย)','Alexandr Zhelanov','CC BY 4.0','https://opengameart.org/node/79931'],
  ['Slay the Old God (หน้าโหลด)','จัดหาโดยเจ้าของเกม','','']]],
 ['เสียงเอฟเฟกต์',[
  ['JC Sounds - Fantasy SFX Pack Vol 1','JC Sounds','CC BY 4.0','https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1'],
  ['8 Magic Attacks · 8 Heals and Buffs SFX','Leohpaz','CC BY 4.0','https://opengameart.org/content/8-magic-attacks'],
  ['Fantasy Sound Effects Library','Little Robot Sound Factory — www.littlerobotsoundfactory.com','CC BY 3.0','https://opengameart.org/content/fantasy-sound-effects-library'],
  ['Impact Sounds · Interface Sounds · RPG Audio','Kenney — kenney.nl','CC0','https://kenney.nl/assets'],
  ['80 CC0 RPG SFX · 80 CC0 creature SFX · 75 CC0 breaking/falling/hit · 40 CC0 water/slime','rubberduck','CC0','https://opengameart.org/users/rubberduck'],
  ['Ice breaking/shattering','IgnasD','CC0','https://opengameart.org/content/ice-breakingshattering'],
  ['Level up, power up, Coin get','wobbleboxx','CC0','https://opengameart.org/content/level-up-power-up-coin-get-13-sounds'],
  ['Big scary troll sounds','Darsycho','CC0','https://opengameart.org/content/big-scary-troll-sounds'],
  ['CC0 Deep Monster Roar','trazzz123','CC0','https://opengameart.org/content/cc0-deep-monster-roar'],
  ['Zombie / Skeleton / Monster Voice Effects','ArcadeParty','CC0','https://opengameart.org/content/zombie-skeleton-monster-voice-effects'],
  ['Zombies Sound Pack','artisticdude','CC0','https://opengameart.org/content/zombies-sound-pack'],
  ['Male Grunt/Yelling sounds','HaelDB','CC0','https://opengameart.org/content/male-gruntyelling-sounds'],
  ['15 vocal male strain/hurt/pain sounds','qubodup','CC0','https://opengameart.org/content/15-vocal-male-strainhurtpainjump-sounds'],
  ['wind1','Luke.RUSTLTD','CC0','https://opengameart.org/content/wind1']]]];
$('credList').innerHTML=CREDITS.map(([h,L])=>`<h4>${h}</h4>`+L.map(([t,a,l,u])=>`<div><b>${t}</b> — ${a}${l?` <small>(${l})</small>`:''}${u?`<br><a href="${u}" target="_blank" rel="noopener">${u}</a>`:''}</div>`).join('')).join('');
$('credBtn').onclick=()=>{AU.init();AU.play('click');$('credOv').classList.remove('hidden')};
$('credBack').onclick=()=>{AU.play('click');$('credOv').classList.add('hidden')};
$('fuseBack').onclick=()=>{AU.play('click');$('fuseOv').classList.add('hidden')};
$('pname').value=lsGet('ar_name',(window.ArenaLanguage?.text('ผู้เล่น')||'ผู้เล่น')+Math.floor(rand(10,99)));$('pname').addEventListener('change',()=>lsSet('ar_name',$('pname').value.trim()));
$('soloBtn').onclick=()=>{AU.init();AU.play('click');leaveNet();net.qm=false;hostStartMatch()};
$('qmBtn').onclick=()=>{AU.init();AU.play('click');lsSet('ar_name',myName());quickMatch()};
$('endMenu').onclick=()=>{AU.play('click');if(hostBusy())return;net.qmTok=(net.qmTok||0)+1;leaveNet();net.qm=false;showMenu()};
$('hostBtn').onclick=()=>{AU.init();AU.play('click');lsSet('ar_name',myName());lsSet('ar_rname',$('rname').value.trim());hostRoom()};
$('joinBtn').onclick=()=>{AU.init();AU.play('click');lsSet('ar_name',myName());joinRoom($('code').value,$('codePw').value.trim())};
$('code').addEventListener('keydown',e=>{if(e.key==='Enter')$('joinBtn').click()});
$('codePw').addEventListener('keydown',e=>{if(e.key==='Enter')$('joinBtn').click()});
$('rname').value=lsGet('ar_rname','');
$('roomsBtn').onclick=()=>{AU.init();AU.play('click');lsSet('ar_name',myName());menuMsg('');showRooms()};
$('roomsBack').onclick=()=>{AU.play('click');roomsCtx=false;menuMsg('');showMenu()};
$('roomsRefresh').onclick=()=>{AU.play('click');listRooms(true)};
$('chatForm').addEventListener('submit',e=>{e.preventDefault();sendChat()});
$('lobbyList').addEventListener('click',e=>{const b=e.target.closest('.kick');if(b){AU.play('click');kickPlayer(b.dataset.k)}});
for(const [id,k] of [['cfgMode','ts'],['cfgMax','max'],['cfgFill','fill'],['cfgSize','size']])$(id).addEventListener('change',()=>{if(net.mode!=='host'||net.qm)return;const v=$(id).value;
  net.cfg=Object.assign({},net.cfg,{[k]:k==='size'?v:+v});if(k==='ts'||k==='fill'||k==='max')fixTeams();lsSet('ar_cfg',JSON.stringify(net.cfg));AU.play('click');pushLobby()});
try{const c=JSON.parse(lsGet('ar_cfg','null'));if(c&&typeof c==='object')net.cfg={max:[2,4,8,16,32].indexOf(c.max|0)>=0?c.max|0:16,fill:[0,8,16,24,32].indexOf(c.fill|0)>=0?c.fill|0:32,size:['A','S','M','L'].indexOf(c.size)>=0?c.size:'A',ts:[1,2,4].indexOf(c.ts|0)>=0?c.ts|0:1}}catch(e){}
// team pick buttons in the lobby
$('lobbyList').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;AU.play('click');const k=+b.dataset.t;
  if(net.mode==='host'){const me=net.lobby[0];if(me&&setTeam(me,k))pushLobby()}else if(net.mode==='client')netSend({t:'tm',k})});
// ---- room list ----
let listTok=0,listAt=0,roomRows=[];
function listRooms(force){if(!$('rooms')||$('rooms').classList.contains('hidden'))return;const T=mpTransport();
  if(!T){$('roomsNote').textContent=MP_HINT;$('roomList').innerHTML='';return}
  const now=performance.now();if(!force&&now-listAt<2500)return;listAt=now;const tok=++listTok;
  $('roomsNote').textContent='กำลังค้นหาห้อง…';$('roomsRefresh').disabled=true;if(!roomRows.length)$('roomList').innerHTML='<div class="empty"><div class="spin" style="margin:0 auto 8px;width:28px;height:28px"></div>กำลังค้นหาห้องออนไลน์…</div>';
  T.list((L,ok)=>{if(tok!==listTok)return;$('roomsRefresh').disabled=false;listAt=performance.now();
    roomRows=L.filter(r=>r&&typeof r.c==='string'&&/^[A-Z0-9]{5}$/.test(r.c)).map(r=>({c:r.c,v:r.v,name:cleanName(r.name)||'ห้อง '+r.c,host:cleanName(r.host).slice(0,12),n:clamp(r.n|0,0,MAX_HUMANS),max:clamp(r.max|0,2,MAX_HUMANS),ts:[1,2,4].indexOf(r.ts|0)>=0?r.ts|0:1,st:['lobby','play','full'].indexOf(r.st)>=0?r.st:'lobby',lock:!!r.lock,fill:clamp(r.fill|0,0,TOTAL_HEROES),size:['A','S','M','L'].indexOf(r.size)>=0?r.size:'A'}));
    const seen=new Set();roomRows=roomRows.filter(r=>!seen.has(r.c)&&seen.add(r.c));
    roomRows.sort((a,b)=>(a.v===VER?0:1)-(b.v===VER?0:1)||(a.st==='lobby'?0:1)-(b.st==='lobby'?0:1)||b.n-a.n);
    $('roomsNote').textContent=!ok?'เชื่อมต่อเซิร์ฟเวอร์ห้องไม่ได้ ตรวจอินเทอร์เน็ต':roomRows.length?`พบ ${roomRows.length} ห้อง · อัปเดตอัตโนมัติ`:'ยังไม่มีห้องเปิดอยู่';
    renderRooms()})}
function renderRooms(){const box=$('roomList');
  if(!roomRows.length){box.innerHTML='<div class="empty">ยังไม่มีห้องที่เปิดให้เห็นตอนนี้<br>สร้างห้องของคุณเองทางขวา แล้วให้เพื่อนกดเข้าจากรายการนี้</div>';return}
  box.innerHTML=roomRows.map((r,i)=>{const old=r.v!==VER,can=!old&&r.st==='lobby';
    const chip=old?'<span class="chip f">คนละเวอร์ชัน</span>':r.st==='play'?'<span class="chip p">กำลังเล่น</span>':r.st==='full'?'<span class="chip f">เต็ม</span>':'<span class="chip l">รอผู้เล่น</span>';
    return `<div class="room"><div class="ri"><b>${r.lock?'🔒 ':''}<span id="listedRoom-${i}" translate="no">${escapeHtml(r.name)}</span>${chip}</b><small>⚔️ ${TS_N[r.ts]} · 👑 <span translate="no">${escapeHtml(r.host||'-')}</span> · 👥 ${r.n}/${r.max} · 🤖 ${r.fill?'บอทเติมครบ '+r.fill:'ไม่มีบอท'} · 🗺️ ${r.size==='A'?'อัตโนมัติ':SIZE_N[r.size]} · #${r.c}</small></div>`+
      (r.lock&&can?`<input class="pw" data-pw="${i}" aria-describedby="listedRoom-${i}" maxlength="12" placeholder="รหัสผ่าน" aria-label="รหัสผ่านห้อง">`:'')+
      `<button class="go small" data-j="${i}" ${can?'':'disabled'}>เข้า</button></div>`}).join('')}
$('roomList').addEventListener('click',e=>{const b=e.target.closest('[data-j]');if(!b||b.disabled)return;const r=roomRows[+b.dataset.j];if(!r)return;AU.init();AU.play('click');
  const pi=$('roomList').querySelector(`[data-pw="${b.dataset.j}"]`);const pw=pi?pi.value.trim():'';if(r.lock&&!pw){menuMsg('ห้องนี้ล็อกไว้ ใส่รหัสผ่านก่อน');pi&&pi.focus();return}
  lsSet('ar_name',myName());$('code').value=r.c;joinRoom(r.c,pw)});
$('roomList').addEventListener('keydown',e=>{const pi=e.target.closest('[data-pw]');if(pi&&e.key==='Enter'){const b=$('roomList').querySelector(`[data-j="${pi.dataset.pw}"]`);b&&b.click()}});
function pwAsk(code){roomsCtx=true;$('code').value=code||'';$('codePw').value='';setTimeout(()=>{try{$('codePw').focus()}catch(e){}},50)}
setInterval(()=>{if(state==='menu'&&roomsCtx)listRooms()},10000);
$('lobbyStart').onclick=()=>{AU.play('click');hostStartMatch()};
$('lobbyLeave').onclick=()=>{AU.play('click');net.qmTok=(net.qmTok||0)+1;leaveNet();net.qm=false;showMenu()};
$('copyLink').onclick=()=>{const v=$('inviteLink').value;const done=()=>{$('copyLink').textContent='คัดลอกแล้ว ✓';setTimeout(()=>$('copyLink').textContent='คัดลอกลิงก์',1500)};
  try{navigator.clipboard.writeText(v).then(done,()=>{$('inviteLink').select();done()})}catch(e){$('inviteLink').select();done()}};
function syncMpButtons(){const ok=mpSupported();$('hostBtn').disabled=!ok;$('joinBtn').disabled=!ok;$('qmBtn').disabled=!ok;listRooms(true);if(!ok)menuMsg(MP_HINT,'#9fb6b8');else if($('menuMsg').textContent===(window.ArenaLanguage?.text(MP_HINT)||MP_HINT))menuMsg('')}
syncMpButtons();
{const q=new URLSearchParams(location.search);const rc=(q.get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(rc.length===5){$('code').value=rc;roomsCtx=true;showMenu();menuMsg('ได้รับลิงก์เชิญห้อง '+rc+' · ใส่ชื่อแล้วกด "เข้าห้อง"','#ffe27a')}}
// heartbeat: WebRTC can take a long time to notice a vanished peer
setInterval(()=>{advertise();if(net.mode==='host'&&net.tr&&net.tr.kind==='peer'){const now=performance.now();for(const cid in net.cl){const c=net.cl[cid];if(c.seen&&now-c.seen>9000){net.tr.kick(cid);hostDrop(cid)}}}
  if(net.mode==='client'&&net.tr&&net.tr.kind==='peer'&&state!=='play')netSend({t:'p'});
  if(state==='lobby'&&net.qm&&(net.mode==='host'||net.mode==='client')){const now=performance.now();$('lobbyCode').textContent='⏱ '+qmLeft();
    if(net.mode==='host'&&now>=net.qmEnd){if(!net.starting)hostStartMatch()}
    else if(net.mode==='client'&&!net.jw&&now>net.qmEnd+20000)qmRequeue('ห้องเดิมไม่เริ่มเกม — กำลังหาห้องใหม่…');
    else if(net.mode==='host'&&net.tr&&net.tr.kind==='room'&&net.lobby.length===1){const t=RoomT.qmOthers().find(q=>q.c!==net.code&&(q.n>1||q.c<net.code));
      if(t){leaveNet();net.qm=true;net.tr=RoomT;net.lobby=[];net.mode='search';showSearch('พบห้องอื่นที่รออยู่ — กำลังย้ายไปรวมกัน…');qmJoinRoom(t.c)}}}},1000);
if(!PeerT.ok()&&window.claude&&typeof window.claude.use==='function'){window.claude.use('room').then(r=>{if(r){RoomT.api=r;try{r.onPeers(()=>{})}catch(e){}setTimeout(()=>{RoomT.warm=true},2500);syncMpButtons()}}).catch(()=>{})}
