// Work on a file the author explicitly picks. No project contents are uploaded.
function installEditorProjectFiles(notice){
  const en=ArenaLanguage.language==='en',tr=(th,eng)=>en?eng:th;
  const picker=$('edLocalSource'),replace=$('edReplacement'),area=$('edSourceText');
  let original=null,handle=null,originalText='',replacement=null,directoryName='',revision=0,leaving=false;
  const isText=name=>/\.(?:js|mjs|ts|json|html?|css|glsl|vert|frag|py|java|kt|xml|ya?ml|md|txt|gd|gradle|svg|csv|obj|mtl|gltf)$/i.test(name);
  const dirty=()=>!!original&&(replacement!==null||(!area.hidden&&area.value!==originalText));
  const discard=()=>!dirty()||confirm(tr('ทิ้งการแก้ไขไฟล์ที่ยังไม่บันทึกหรือไม่','Discard unsaved file edits?'));
  $('edFileHelp').textContent=tr(
    'เปิดซอร์สเกมจากเครื่องเพื่อแก้กติกา AI หรือ VFX หรือเลือกโมเดล รูป และเสียงเพื่อแทนที่ จากนั้นบันทึกไฟล์แล้ว build เกมอีกครั้ง',
    'Open a local source file to edit rules, AI or VFX, or replace a model, image or audio file. Save the file and rebuild the game.');
  async function load(file,fileHandle){
    const token=++revision,text=isText(file.name)?await file.text():null;
    if(token!==revision)return;
    original=file;handle=fileHandle;replacement=null;originalText=text??'';directoryName=file.name;
    $('edSourceName').textContent=file.name+' · '+Math.ceil(file.size/1024)+' KB';
    area.hidden=text===null;area.value=originalText;$('edReplaceSource').disabled=false;$('edDownloadSource').disabled=false;
    $('edWriteSource').hidden=!handle;
  }
  function fail(error){if(error.name!=='AbortError')notice(error.message,'error')}
  $('edOpenSource').onclick=async()=>{
    if(!discard())return;
    if(!window.showOpenFilePicker){picker.click();return}
    try{const [h]=await window.showOpenFilePicker();await load(await h.getFile(),h)}
    catch(error){if(error.name==='SecurityError')picker.click();else fail(error)}
  };
  picker.onchange=async()=>{try{if(picker.files[0])await load(picker.files[0],null)}catch(error){fail(error)}finally{picker.value=''}};
  $('edReplaceSource').onclick=()=>{const ext=directoryName.match(/\.[^.]+$/);replace.accept=ext?ext[0]:'';replace.click()};
  replace.onchange=async()=>{
    const file=replace.files[0];replace.value='';if(!file||!original)return;
    const suffix=name=>name.match(/\.[^.]+$/)?.[0].toLowerCase()||'';
    if(suffix(file.name)!==suffix(original.name)){notice(tr('เลือกไฟล์นามสกุลเดียวกับต้นฉบับ','Choose a replacement with the same extension.'),'error');return}
    try{
      if(!area.hidden){const token=revision,text=await file.text();if(token!==revision)return;area.value=text}
      replacement=file;$('edSourceName').textContent=original.name+' ← '+file.name;
    }catch(error){fail(error)}
  };
  function content(){
    if(area.hidden)return replacement||original;
    if(/\.(?:json|gltf)$/i.test(original.name))JSON.parse(area.value);
    return new Blob([area.value],{type:original.type||'text/plain;charset=UTF-8'});
  }
  $('edDownloadSource').onclick=()=>{
    try{
      const url=URL.createObjectURL(content()),a=document.createElement('a');a.href=url;a.download=directoryName;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(error){fail(error)}
  };
  $('edWriteSource').onclick=async()=>{
    if(!handle||!dirty())return;
    const button=$('edWriteSource');button.disabled=true;
    try{
      const data=content(),h=handle,current=await h.getFile();
      if(current.size!==original.size||current.lastModified!==original.lastModified)throw Error(tr('ไฟล์บนเครื่องมีการเปลี่ยนแปลง กรุณาเปิดใหม่หรือดาวน์โหลดสำเนา','The file changed on disk. Reopen it or download a copy.'));
      const writer=await h.createWritable();try{await writer.write(data);await writer.close()}catch(error){await writer.abort().catch(()=>{});throw error}
      if(h===handle){await load(await h.getFile(),h);notice(tr('บันทึกไฟล์บนเครื่องแล้ว','File saved on this device.'))}
    }catch(error){fail(error)}finally{button.disabled=false}
  };
  addEventListener('beforeunload',event=>{if(!leaving&&dirty()){event.preventDefault();event.returnValue=''}});
  return {confirmExit(){if(!discard())return false;leaving=true;return true}};
}
