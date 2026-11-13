import http from 'node:http';
import {attachRealtime} from './realtime.js';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||3000);
const dir=path.resolve(process.env.DATA_DIR||path.join(root,'server-data'));
await mkdir(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,'game.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, pass_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player');
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS characters(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL UNIQUE COLLATE NOCASE,level INTEGER NOT NULL DEFAULT 1,save_json TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS articles(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
function hashPass(pass,salt=randomBytes(16).toString('hex')){return salt+':'+scryptSync(pass,salt,64).toString('hex')}
function verify(pass,hash){const [salt,expected]=hash.split(':');if(!salt||!expected)return false;const a=Buffer.from(expected,'hex'),b=scryptSync(pass,salt,64);return a.length===b.length&&timingSafeEqual(a,b)}
const admin=db.prepare('SELECT id FROM users WHERE username=?').get('adm');
if(!admin){const pass=process.env.ADMIN_PASSWORD;if(!pass||pass.length<10){console.error('Defina ADMIN_PASSWORD com pelo menos 10 caracteres antes da primeira inicialização.');process.exit(1)}db.prepare('INSERT INTO users(username,pass_hash,role) VALUES(?,?,?)').run('adm',hashPass(pass),'admin');console.log('Administrador criado: adm')}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
function send(res,status,data,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});res.end(JSON.stringify(data))}
function cookie(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('rpg_session='))?.slice(12)||''}
function user(req){const token=cookie(req);if(!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare(`SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?`).get(createHash('sha256').update(token).digest('hex'),Date.now())||null}
function auth(req){const u=user(req);if(!u)throw [401,'Faça login.'];return u}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',chunk=>{b+=chunk;if(b.length>150000){reject([413,'Dados muito grandes.']);req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch{reject([400,'JSON inválido.'])}});req.on('error',reject)})}
const cleanName=x=>typeof x==='string'?x.trim():'';
function characterView(c){let appearance=null;try{appearance=JSON.parse(c.save_json)?.appearance||null}catch{}return {id:c.id,name:c.name,level:c.level,appearance}}
function defaultSave(name,appearance=null){return {version:1,playerName:name,appearance,position:null,level:1,experience:0,experienceToNextLevel:100,stats:null,baseStats:null,currency:{gold:0},facing:'down',inventory:{items:[],equipment:{}},monsters:[]}}
function normalizedSave(input,old,name){if(!input||typeof input!=='object'||Array.isArray(input))throw [400,'Save inválido'];const s=JSON.parse(JSON.stringify(input));if(JSON.stringify(s).length>120000)throw [413,'Save muito grande'];s.version=1;s.playerName=name;s.appearance=old.appearance||null;s.level=Math.max(1,Math.min(100000,Math.floor(Number(s.level)||old.level||1)));s.experience=Math.max(0,Number(s.experience)||0);s.experienceToNextLevel=Math.max(1,Number(s.experienceToNextLevel)||100);s.currency={gold:Math.max(0,Math.floor(Number(s.currency?.gold)||0))};return s}
function validateAppearance(a){if(!a||typeof a!=='object'||Array.isArray(a))return null;const o={sex:a.sex==='female'?'female':'male'};for(const [k,max] of Object.entries({skin:5,tail:1,wings:2,face:9,ears:4,hair:84,beard:3,mustache:3,hairColor:7,beardColor:7,mustacheColor:7,earsColor:7,tailColor:7,wingsColor:7})){const n=Number(a[k]);o[k]=Number.isInteger(n)?Math.max(0,Math.min(max,n)):0}for(const key of ['skinHex','hairHex','beardHex','mustacheHex','earsHex','tailHex','wingsHex']){o[key]=typeof a[key]==='string'&&/^#[0-9a-fA-F]{6}$/.test(a[key])?a[key].toLowerCase():null;}return o}
const requestHandler=async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');const pathname=u.pathname;
 if(pathname.startsWith('/api/')){
  if(!['GET','POST','PUT','DELETE'].includes(req.method))throw [405,'Método não permitido'];
  if(req.method!=='GET'){const origin=req.headers.origin;const host=req.headers.host;if(origin&&new URL(origin).host!==host)throw [403,'Origem inválida'];}
  if(pathname==='/api/me'&&req.method==='GET')return send(res,200,{user:user(req)});
  if(pathname==='/api/register'&&req.method==='POST'){const b=await body(req),name=cleanName(b.username),pass=b.password;if(!/^[a-zA-Z0-9_]{3,24}$/.test(name)||name.toLowerCase()==='adm'||typeof pass!=='string'||pass.length<8||pass.length>128)throw [400,'Usuário: 3-24 letras/números/_; senha: 8-128 caracteres.'];try{db.prepare('INSERT INTO users(username,pass_hash) VALUES(?,?)').run(name,hashPass(pass))}catch{throw [409,'Nome de usuário indisponível.']}return send(res,201,{ok:true})}
  if(pathname==='/api/login'&&req.method==='POST'){const b=await body(req),name=cleanName(b.username),pass=b.password;const row=db.prepare('SELECT * FROM users WHERE username=?').get(name);if(!row||typeof pass!=='string'||!verify(pass,row.pass_hash))throw [401,'Usuário ou senha inválidos.'];const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),row.id,Date.now()+7*86400000);return send(res,200,{user:{id:row.id,username:row.username,role:row.role}},{'set-cookie':`rpg_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='1'?'; Secure':''}`})}
  if(pathname==='/api/logout'&&req.method==='POST'){const token=cookie(req);if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(createHash('sha256').update(token).digest('hex'));return send(res,200,{ok:true},{'set-cookie':'rpg_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
  if(pathname==='/api/characters'&&req.method==='GET'){const a=auth(req);return send(res,200,{characters:db.prepare('SELECT id,name,level FROM characters WHERE user_id=? ORDER BY id').all(a.id).map(characterView)})}
  if(pathname==='/api/characters'&&req.method==='POST'){const a=auth(req),b=await body(req),name=cleanName(b.name);if(!/^[\p{L}0-9_ ]{3,20}$/u.test(name))throw [400,'Nome deve ter de 3 a 20 caracteres.'];db.exec('BEGIN IMMEDIATE');try{const count=db.prepare('SELECT count(*) n FROM characters WHERE user_id=?').get(a.id).n;if(count>=5)throw [409,'Limite de cinco personagens atingido.'];const appearance=validateAppearance(b.appearance);const r=db.prepare('INSERT INTO characters(user_id,name,level,save_json) VALUES(?,?,1,?)').run(a.id,name,JSON.stringify(defaultSave(name,appearance)));db.exec('COMMIT');return send(res,201,{character:{id:Number(r.lastInsertRowid),name,level:1}})}catch(e){db.exec('ROLLBACK');if(e?.code==='ERR_SQLITE_ERROR')throw [409,'Nome de personagem já utilizado.'];throw e}}
  const match=pathname.match(/^\/api\/characters\/(\d+)$/);
  if(match){const a=auth(req),id=Number(match[1]),c=db.prepare('SELECT * FROM characters WHERE id=? AND user_id=?').get(id,a.id);if(!c)throw [404,'Personagem não encontrado.'];if(req.method==='GET')return send(res,200,{character:characterView(c),save:JSON.parse(c.save_json)});if(req.method==='DELETE'){const b=await body(req);const account=db.prepare('SELECT pass_hash FROM users WHERE id=?').get(a.id);if(typeof b.password!=='string'||!verify(b.password,account.pass_hash))throw [403,'Senha da conta incorreta.'];db.prepare('DELETE FROM characters WHERE id=? AND user_id=?').run(id,a.id);return send(res,200,{ok:true})}if(req.method==='PUT'){const b=await body(req),save=normalizedSave(b.save,JSON.parse(c.save_json),c.name);db.prepare('UPDATE characters SET save_json=?,level=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').run(JSON.stringify(save),save.level,id,a.id);return send(res,200,{ok:true})}}
  if(pathname==='/api/articles'&&req.method==='GET')return send(res,200,{articles:db.prepare('SELECT a.id,a.title,a.body,a.created_at,u.username author FROM articles a JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC,a.id DESC LIMIT 100').all()});
  if(pathname==='/api/articles'&&req.method==='POST'){const a=auth(req);if(a.role!=='admin')throw [403,'Somente administradores.'];const b=await body(req),title=cleanName(b.title),message=cleanName(b.body);if(title.length<3||title.length>120||message.length<1||message.length>10000)throw [400,'Título (3-120) e mensagem (1-10000) obrigatórios.'];db.prepare('INSERT INTO articles(user_id,title,body) VALUES(?,?,?)').run(a.id,title,message);return send(res,201,{ok:true})}
  if(pathname==='/api/top'&&req.method==='GET')return send(res,200,{characters:db.prepare('SELECT name,level FROM characters ORDER BY level DESC,updated_at ASC LIMIT 20').all()});
  throw [404,'Rota inexistente'];
 }
 let file=pathname==='/'?'/index.html':pathname;
 if(file==='/game')file='/game.html';
 const staticRoot=path.join(root,'dist');
 let resolved=path.resolve(staticRoot,'.'+decodeURIComponent(file));
 if(!resolved.startsWith(staticRoot+path.sep))throw [403,'Caminho inválido'];
 if(!existsSync(resolved))throw [404,'Arquivo não encontrado'];
 const content=await readFile(resolved);res.writeHead(200,{'content-type':mime[path.extname(resolved)]||'application/octet-stream','x-content-type-options':'nosniff'});res.end(content);
 }catch(e){if(!res.headersSent)send(res,Array.isArray(e)?e[0]:500,{error:Array.isArray(e)?e[1]:'Erro interno.'});else res.end();if(!Array.isArray(e))console.error(e)}};
const server=http.createServer(requestHandler);
attachRealtime(server,req=>{const u=user(req);if(!u)return null;return {...u,characterLookup:id=>db.prepare('SELECT id,name,level FROM characters WHERE id=? AND user_id=?').get(id,u.id)}} ,root,db);
server.listen(port,()=>console.log(`RPG em http://localhost:${port}`));
