import {DEFAULT_APPEARANCE, LPC_OPTIONS, HAIR_STYLES, makeFrames} from './lpc.js';
import {api,post} from './api.js';
const loading=document.querySelector('#rpg-loading');
const startLoading=()=>{loading.classList.add('visible');window.__RPG_SET_LOADING__=(value,label)=>{document.querySelector('#rpg-loading-progress').value=Math.round(value*100);document.querySelector('#rpg-loading-percent').textContent=`${Math.round(value*100)}%`;if(label)document.querySelector('#rpg-loading-label').textContent=label;};window.__RPG_HIDE_LOADING__=()=>{loading.classList.remove('visible');};window.__RPG_SET_LOADING__(0,'Preparando personagem...');};
const gate=document.querySelector('#gate'),choices=document.querySelector('#choices'),msg=document.querySelector('#gate-message');
let me;
const appearance={...DEFAULT_APPEARANCE};
const editor=document.querySelector('#lpc-editor');const canvas=document.createElement('canvas');canvas.id='lpc-preview';canvas.width=64;canvas.height=64;
const fields=document.createElement('div');fields.id='lpc-fields';editor.append(canvas,fields);
let previewId=0;
async function preview(){const id=++previewId;try{const frames=await makeFrames(appearance,false,true);if(id!==previewId)return;const img=new Image();img.onload=()=>{if(id===previewId){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,64,64);ctx.drawImage(img,0,0)}};img.src=frames['idle-down-1']}catch(e){console.warn(e)}}
function controlLabel(label){const wrap=document.createElement('label');const title=document.createElement('span');title.textContent=label;wrap.append(title);return wrap}
function select(label,key,values){const wrap=controlLabel(label);const input=document.createElement('select');values.forEach((v,i)=>{const o=document.createElement('option');o.value=key==='sex'?['male','female'][i]:String(i);o.textContent=v;input.append(o)});input.value=key==='sex'?appearance[key]:String(appearance[key]);input.onchange=()=>{appearance[key]=key==='sex'?input.value:Number(input.value);preview()};wrap.append(input);fields.append(wrap)}
function step(label,key,max){const wrap=controlLabel(label);const controls=document.createElement('div');controls.className='step-controls';const prev=document.createElement('button');prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label',`Anterior: ${label}`);const value=document.createElement('span');value.className='step-value';value.textContent=String(appearance[key]);const next=document.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label',`Próximo: ${label}`);for(const [b,d] of [[prev,-1],[next,1]])b.onclick=()=>{appearance[key]=(appearance[key]+d+max+1)%(max+1);value.textContent=String(appearance[key]);preview()};controls.append(prev,value,next);wrap.append(controls);fields.append(wrap)}
select('Body Type','sex',['Male','Female']);
function colorPicker(label,key,defaultColor){
 const wrap=controlLabel(label),input=document.createElement('input');input.type='color';input.className='lpc-color-picker';input.value=appearance[key]||defaultColor;input.setAttribute('aria-label',`Cor de ${label}`);
 input.oninput=()=>{appearance[key]=input.value;preview()};wrap.append(input);fields.append(wrap);
}
colorPicker('Body Color','skinHex','#e8b18f');
for(const [label,key,max,colorKey,defaultColor] of [
 ['Hair','hair',HAIR_STYLES.length-1,'hairHex','#8b4513'],['Beard','beard',3,'beardHex','#704020'],['Mustache','mustache',3,'mustacheHex','#704020'],['Ears','ears',4,'earsHex','#e8b18f'],['Tails','tail',1,'tailHex','#b05a32'],['Wings','wings',2,'wingsHex','#a85ac8']]){
 const wrap=controlLabel(label),controls=document.createElement('div');controls.className='step-controls';
 const color=document.createElement('input');color.type='color';color.className='lpc-color-picker';color.value=appearance[colorKey]||defaultColor;color.title=`Cor de ${label}`;color.setAttribute('aria-label',`Cor de ${label}`);
 color.oninput=()=>{appearance[colorKey]=color.value;preview()};
 const prev=document.createElement('button');prev.type='button';prev.textContent='‹';
 const value=document.createElement('span');value.className='step-value';value.textContent=key==='hair'?HAIR_STYLES[appearance[key]]?.name:appearance[key];
 const next=document.createElement('button');next.type='button';next.textContent='›';
 for(const [button,delta] of [[prev,-1],[next,1]])button.onclick=()=>{appearance[key]=(appearance[key]+delta+max+1)%(max+1);value.textContent=key==='hair'?HAIR_STYLES[appearance[key]]?.name:appearance[key];preview()};
 controls.append(color,prev,value,next);wrap.append(controls);fields.append(wrap);
}
step('Faces','face',9);
preview();
try{me=(await api('/me')).user;if(!me){location.replace('/');throw Error('Login necessário')}await render()}catch(e){msg.textContent=e.message}
async function render(){
 const data=await api('/characters');choices.replaceChildren();
 for(const c of data.characters){
  const card=document.createElement('div');card.className='item';
  const img=document.createElement('img');img.src='/assets/characters/player/idle/down/1.png';img.className='hero';
  const title=document.createElement('p');title.textContent=`${c.name} • Nível ${c.level}`;
  const play=document.createElement('button');play.textContent='Jogar';
  play.onclick=async()=>{startLoading();try{const d=await api(`/characters/${c.id}`);window.__RPG_CHARACTER__=d;if(d.save?.appearance){window.__RPG_SET_LOADING__(0.03,'Montando aparência LPC...');window.__LPC_FRAMES__=await makeFrames(d.save.appearance)}gate.remove();await import('./main.js')}catch(e){window.__RPG_HIDE_LOADING__?.();msg.textContent=e.message}};
  const remove=document.createElement('button');remove.textContent='Deletar Personagem';remove.style.marginLeft='8px';
  remove.onclick=async()=>{
   if(!confirm(`Excluir permanentemente o personagem ${c.name}? Esta ação não pode ser desfeita.`))return;
   const password=prompt(`Confirme a senha da sua conta para excluir ${c.name}:`);
   if(password===null)return;
   try{await api(`/characters/${c.id}`,{method:'DELETE',body:JSON.stringify({password})});msg.textContent='Personagem excluído.';await render()}catch(e){msg.textContent=e.message}
  };
  card.append(img,title,play,remove);choices.append(card);if(c.appearance){makeFrames(c.appearance,false,true).then(f=>{if(f['idle-down-1'])img.src=f['idle-down-1']}).catch(e=>console.warn('Prévia LPC:',e))}
 }
 document.querySelector('#open-creator').hidden=data.characters.length>=5;document.querySelector('#create').hidden=true;
}
document.querySelector('#create').onsubmit=async e=>{e.preventDefault();try{await post('/characters',{name:document.querySelector('#character-name').value,appearance:{...appearance}});msg.textContent='Personagem criado!';showSelection();await render()}catch(err){msg.textContent=err.message}};
document.querySelector('#leave').onclick=()=>location.href='/';

function showSelection(){document.querySelector('#selection-screen').hidden=false;document.querySelector('#create').hidden=true;document.querySelector('#creator-title').hidden=true;}
function showCreator(){document.querySelector('#selection-screen').hidden=true;document.querySelector('#create').hidden=false;document.querySelector('#creator-title').hidden=false;preview();}
document.querySelector('#open-creator').onclick=showCreator;
document.querySelector('#cancel-create').onclick=showSelection;
showSelection();
