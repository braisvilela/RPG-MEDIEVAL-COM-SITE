import {api,post} from './api.js';
import skeleton from './monsters/skeleton.json';
import spawnConfig from './config/spawns.json';
const itemModules=import.meta.glob('./items/*.json',{eager:true,import:'default'});
const items=Object.values(itemModules).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
const auth=document.querySelector('#auth'),content=document.querySelector('#content');let me=null;
const el=(tag,cls='',txt='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=txt;return e};
const image=(src)=>{const i=el('img');i.src=src;i.alt='Sprite';i.onerror=()=>i.remove();return i};
async function session(){me=(await api('/me')).user;auth.replaceChildren();const box=el('div','panel');if(me){box.append(el('span','',`Conectado: ${me.username} (${me.role})`));const b=el('button','','Sair da conta');b.onclick=async()=>{await post('/logout',{});await session()};box.append(b)}else{const form=el('form');const name=el('input'),pass=el('input');name.placeholder='Usuário';pass.placeholder='Senha';pass.type='password';const login=el('button','','Entrar'),register=el('button','','Criar conta'),msg=el('p','error');login.type='submit';register.type='button';form.append(name,pass,login,register,msg);form.onsubmit=async e=>{e.preventDefault();try{await post('/login',{username:name.value,password:pass.value});await session()}catch(err){msg.textContent=err.message}};register.onclick=async()=>{try{await post('/register',{username:name.value,password:pass.value});msg.textContent='Conta criada! Agora entre.'}catch(err){msg.textContent=err.message}};box.append(form)}auth.append(box);if(document.querySelector('[data-tab].active'))document.querySelector('[data-tab].active').click()}
async function show(tab){content.replaceChildren();const h=el('h2','',({news:'Notícias',items:'Items List',bestiary:'Bestiário',top:'Top Levels'})[tab]);content.append(h);
if(tab==='items'){const grid=el('div','cards');items.forEach(i=>{const c=el('div','item');c.append(image(i.icon||`/assets/items/${i.id}.png`),el('h3','',i.name),el('p','',i.description||''),el('p','',`Preço de venda: ${i.sellPrice??0} Gold`));grid.append(c)});content.append(grid)}
if(tab==='bestiary'){
 const grid=el('div','cards');
 const monsters=[...new Set(spawnConfig.spawns.map(s=>s.monsterId))];
 const weaponNames=['Dagger','Longsword','Sabre','Rapier','War Axe','Flail','Mace','Halberd','Scythe'];
 content.append(el('p','muted',`${monsters.length} tipos de monstros disponíveis. Todos podem nascer com uma arma corpo a corpo aleatória.`));
 for(const id of monsters){
  const spawn=spawnConfig.spawns.find(s=>s.monsterId===id);
  const name=id.split('_').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
  const icon=id==='skeleton'?'/assets/characters/skeleton_armed/dagger/idle/down/1.png':`/assets/characters/monster_armed/${id}/dagger/idle/down/1.png`;
  const c=el('article','item bestiary-card');
  const img=image(icon);img.alt=`Sprite de ${name}`;
  c.append(img,el('h3','',name),el('p','',`Níveis de spawn: ${spawn.levelRange.min}–${spawn.levelRange.max}`),el('p','',`Vida base: ${skeleton.stats.health} (configuração compartilhada)`),el('p','',`Armas possíveis: ${weaponNames.join(', ')}`),el('p','',`Drops base: ${skeleton.drops.map(d=>`${d.itemId} (${d.chance}%)`).join(', ')}`),el('p','',`Arma equipada: drop garantido.`));
  grid.append(c);
 }
 content.append(grid);
}
if(tab==='top'){const d=await api('/top');d.characters.forEach((c,i)=>content.append(el('div','item',`${i+1}º — ${c.name} • Nível ${c.level}`)))}
if(tab==='news'){if(me?.role==='admin'){const form=el('form','panel'),title=el('input'),body=el('textarea'),btn=el('button','','New Article'),msg=el('p','error');title.placeholder='Título';body.placeholder='Mensagem';form.append(el('h3','','Publicar notícia'),title,body,btn,msg);form.onsubmit=async e=>{e.preventDefault();try{await post('/articles',{title:title.value,body:body.value});await show('news')}catch(err){msg.textContent=err.message}};content.append(form)}const data=await api('/articles');if(!data.articles.length)content.append(el('p','muted','Nenhuma notícia publicada ainda.'));data.articles.forEach(a=>{const c=el('article','article');c.append(el('h3','',a.title),el('small','',`${a.created_at} UTC • ${a.author}`),el('p','',a.body));c.lastChild.style.whiteSpace='pre-wrap';content.append(c)})}}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=async()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');try{await show(b.dataset.tab)}catch(err){content.append(el('p','error',err.message))}});
await session();document.querySelector('[data-tab="news"]').click();
