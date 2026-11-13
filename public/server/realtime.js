import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

// Lightweight RFC6455 WebSocket transport. No external package needed.
export function attachRealtime(server, authenticate, root, db) {
  const spawns=JSON.parse(readFileSync(path.join(root,'src/config/spawns.json'),'utf8')).spawns;
  const skeleton=JSON.parse(readFileSync(path.join(root,'src/monsters/skeleton.json'),'utf8'));
  const itemCatalog=new Map();
  const normalizeItemName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  for(const filename of readdirSync(path.join(root,'src/items'))){
    if(!filename.endsWith('.json'))continue;
    const item=JSON.parse(readFileSync(path.join(root,'src/items',filename),'utf8'));
    for(const alias of [item.id,item.name])itemCatalog.set(normalizeItemName(alias),item);
  }
  itemCatalog.set('waraxe',itemCatalog.get('war axe'));
  const skeletonWeapons=['dagger','longsword','sabre','rapier','war_axe','flail','mace','halberd','scythe'];
  const randomSkeletonWeapon=()=>skeletonWeapons[Math.floor(Math.random()*skeletonWeapons.length)];
  const peers=new Set();
  const monsters=[];
  const groundItems=new Map();let nextGroundId=1;
  for(const spawn of spawns)for(let i=0;i<spawn.maxAlive;i++){
    const level=spawn.levelRange.min;
    const boss=Boolean(skeleton.boss?.enabled&&level>=skeleton.level.bossAt);
    const multiplier=boss?skeleton.boss.statMultiplier:1;
    const hp=(skeleton.stats.health+skeleton.scaling.healthPerLevel*(level-skeleton.level.min))*multiplier;
    monsters.push({id:monsters.length,level,hp,maxHp:hp,dead:false,respawnAt:0,x:spawn.position.x,y:spawn.position.y,spawn,weaponId:randomSkeletonWeapon(),monsterId:spawn.monsterId});
  }
  function send(peer,data){if(!peer.socket.destroyed){const b=Buffer.from(JSON.stringify(data));let header;if(b.length<126){header=Buffer.from([129,b.length])}else if(b.length<65536){header=Buffer.alloc(4);header[0]=129;header[1]=126;header.writeUInt16BE(b.length,2)}else return;peer.socket.write(Buffer.concat([header,b]));}}
  function broadcast(data,except=null){for(const peer of peers)if(peer!==except)send(peer,data)}
  function close(peer){if(!peers.delete(peer))return;broadcast({type:'leave',id:peer.id});}
  function say(peer,kind,text){send(peer,{type:'system',channel:kind,text});}
  function message(peer,data){if(!data||typeof data!=='object')return;
    if(data.type==='chat'){
      const command=typeof data.text==='string'?data.text.trim():'';
      if(/^\/i(?:\s|$)/i.test(command)){
        const query=normalizeItemName(command.replace(/^\/i\s*/i,''));
        const item=itemCatalog.get(query);
        if(!item){say(peer,'local',`Item desconhecido: ${query||'(vazio)'}.`);return;}
        const row=db.prepare('SELECT save_json FROM characters WHERE id=?').get(peer.id);if(!row)return;
        const saveData=JSON.parse(row.save_json);saveData.inventory??={items:[],equipment:{}};
        const items=saveData.inventory.items??=[];
        const maxStack=item.stackable===false?1:Math.max(1,Math.min(99,Number(item.maxStack)||99));
        const stack=items.find(x=>x.id===item.id&&x.quantity<maxStack);
        if(stack)stack.quantity++;else if(items.length<20)items.push({id:item.id,quantity:1});else{say(peer,'local','Mochila cheia.');return;}
        db.prepare('UPDATE characters SET save_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(JSON.stringify(saveData),peer.id);
        send(peer,{type:'item_granted',itemId:item.id,quantity:1});say(peer,'local',`${item.name} adicionado à mochila.`);return;
      }
      const channel=data.channel==='global'?'global':'local';
      const value=typeof data.text==='string'?data.text.trim():'';
      if(!value||value.length>180||/[\x00-\x08\x0b-\x1f]/.test(value))return;
      const now=Date.now();if(now-peer.lastChat<900)return;
      peer.lastChat=now;
      if(channel==='global'){
        // Débito atômico no save persistido; saldo insuficiente impede o envio.
        const row=db.prepare('SELECT save_json FROM characters WHERE id=?').get(peer.id);
        if(!row)return;
        const saveData=JSON.parse(row.save_json);
        const gold=Math.max(0,Math.floor(Number(saveData.currency?.gold)||0));
        if(gold<50){say(peer,'global','Gold insuficiente: mensagem global custa 50 moedas.');return;}
        saveData.currency={...saveData.currency,gold:gold-50};
        db.prepare('UPDATE characters SET save_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(JSON.stringify(saveData),peer.id);
        send(peer,{type:'gold',gold:gold-50});
      }
      const payload={type:'chat',channel,id:peer.id,name:peer.name,text:value,x:peer.x,y:peer.y,at:new Date().toISOString()};
      for(const other of peers){
        if(channel==='global'||(Math.abs(other.x-peer.x)<=720&&Math.abs(other.y-peer.y)<=440))send(other,payload);
      }
      return;
    }
    if(data.type==='monster_looted'){
      const m=monsters[Number(data.id)];
      if(m?.dead){m.respawnAt=Math.min(m.respawnAt,Date.now()+1000);}
      return;
    }
    if(data.type==='drop_item'){
      const index=Number(data.index),qty=Number(data.quantity)||1;
      if(!Number.isInteger(index)||index<0||index>100||!Number.isInteger(qty)||qty<1||qty>99)return;
      const row=db.prepare('SELECT save_json FROM characters WHERE id=?').get(peer.id);if(!row)return;
      const saveData=JSON.parse(row.save_json),items=saveData.inventory?.items;
      if(!Array.isArray(items)||!items[index]||items[index].quantity<qty)return;
      const original=items[index];const itemId=String(original.id||'');if(!/^[a-z0-9_-]{1,60}$/i.test(itemId))return;
      const ground={id:nextGroundId++,itemId,quantity:qty,x:peer.x,y:peer.y,owner:peer.id};
      original.quantity-=qty;if(original.quantity===0)items.splice(index,1);
      db.prepare('UPDATE characters SET save_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(JSON.stringify(saveData),peer.id);
      groundItems.set(ground.id,ground);send(peer,{type:'drop_confirm',index,quantity:qty,id:ground.id});broadcast({type:'ground_add',item:ground});send(peer,{type:'ground_add',item:ground});return;
    }
    if(data.type==='pickup_item'){
      const id=Number(data.id),item=groundItems.get(id);if(!item)return;
      if(Math.hypot(peer.x-item.x,peer.y-item.y)>100){say(peer,'local','Aproxime-se do item para coletar.');return;}
      const row=db.prepare('SELECT save_json FROM characters WHERE id=?').get(peer.id);if(!row)return;
      const saveData=JSON.parse(row.save_json);saveData.inventory??={items:[],equipment:{}};
      const items=saveData.inventory.items??=[];const existing=items.find(e=>e.id===item.itemId&&e.quantity+item.quantity<=99);
      if(existing)existing.quantity+=item.quantity;else if(items.length<20)items.push({id:item.itemId,quantity:item.quantity});else{say(peer,'local','Mochila cheia.');return;}
      db.prepare('UPDATE characters SET save_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(JSON.stringify(saveData),peer.id);
      groundItems.delete(id);broadcast({type:'ground_remove',id});send(peer,{type:'ground_remove',id});send(peer,{type:'pickup_confirm',itemId:item.itemId,quantity:item.quantity});return;
    }
    if(data.type==='vitals'){
      const hp=Number(data.hp),maxHp=Number(data.maxHp);
      if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||maxHp<1||maxHp>1000000)return;
      peer.hp=Math.max(0,Math.min(hp,maxHp));peer.maxHp=maxHp;
      broadcast({type:'vitals',id:peer.id,hp:peer.hp,maxHp:peer.maxHp},peer);return;
    }
    if(data.type==='move'){
      const x=Number(data.x),y=Number(data.y);if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>200000||y>200000)return;
      const now=Date.now();if(now-peer.lastMove<45)return;
      peer.lastMove=now;peer.x=x;peer.y=y;
      peer.facing=['up','down','left','right'].includes(data.facing)?data.facing:'down';
      peer.moving=Boolean(data.moving);peer.attacking=Boolean(data.attacking);
      broadcast({type:'move',id:peer.id,x,y,facing:peer.facing,moving:peer.moving,attacking:peer.attacking},peer);
    }else if(data.type==='attack'){
      const m=monsters[Number(data.id)];if(!m||m.dead)return;
      const now=Date.now();if(now-peer.lastAttack<350)return;
      peer.lastAttack=now;
      // The server bounds damage; full equipment/stat verification is a later security milestone.
      const raw=Number(data.damage);if(!Number.isFinite(raw)||raw<=0)return;
      const damage=Math.max(1,Math.min(50,Math.floor(raw)));
      m.hp=Math.max(0,m.hp-damage);
      if(m.hp===0){m.dead=true;m.respawnAt=now+Math.max(1000,Number(m.spawn.respawnCooldown)||8000)}
      broadcast({type:'monster',id:m.id,hp:m.hp,dead:m.dead,respawnAt:m.respawnAt,attacker:peer.id,damage,monsterName:m.monsterId.replace(/_/g,' '),monsterId:m.monsterId,weaponId:m.weaponId,at:new Date().toISOString()});
    }
  }
  server.on('upgrade',(req,socket,head)=>{
    try{
      if(new URL(req.url,'http://localhost').pathname!=='/realtime')return socket.destroy();
      const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return socket.destroy();
      const user=authenticate(req);if(!user)return socket.destroy();
      const id=Number(new URL(req.url,'http://localhost').searchParams.get('character'));
      if(!Number.isInteger(id)||id<=0)return socket.destroy();
      const character=user.characterLookup(id);if(!character)return socket.destroy();
      const key=req.headers['sec-websocket-key'];if(typeof key!=='string'||!/^[-A-Za-z0-9+/=]{20,30}$/.test(key))return socket.destroy();
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
      const peer={socket,id, name:character.name,level:character.level,x:0,y:0,facing:'down',moving:false,attacking:false,lastMove:0,lastAttack:0,lastChat:0,hp:100,maxHp:100,buffer:Buffer.alloc(0)};
      // A second tab replaces the same character session.
      for(const old of peers)if(old.id===id)old.socket.destroy();
      peers.add(peer);
      send(peer,{type:'welcome',id,players:[...peers].filter(p=>p!==peer).map(p=>({id:p.id,name:p.name,level:p.level,x:p.x,y:p.y,facing:p.facing,moving:p.moving,hp:p.hp,maxHp:p.maxHp})),groundItems:[...groundItems.values()],monsters:monsters.map(m=>({id:m.id,level:m.level,hp:m.hp,maxHp:m.maxHp,dead:m.dead,respawnAt:m.respawnAt,weaponId:m.weaponId,monsterId:m.monsterId}))});
      broadcast({type:'join',player:{id,name:peer.name,level:peer.level,x:peer.x,y:peer.y,facing:peer.facing,hp:peer.hp,maxHp:peer.maxHp}},peer);
      socket.on('data',chunk=>{
        peer.buffer=Buffer.concat([peer.buffer,chunk]);if(peer.buffer.length>65536)return socket.destroy();
        while(peer.buffer.length>=2){const b=peer.buffer;const opcode=b[0]&15;const masked=Boolean(b[1]&128);let len=b[1]&127,offset=2;if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);offset=4}else if(len===127)return socket.destroy();if(!masked)return socket.destroy();if(len>16000)return socket.destroy();if(b.length<offset+4+len)return;const mask=b.subarray(offset,offset+4),payload=Buffer.from(b.subarray(offset+4,offset+4+len));peer.buffer=b.subarray(offset+4+len);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];if(opcode===8)return socket.end();if(opcode===9){socket.write(Buffer.from([0x8a,0]));continue}if(opcode!==1)continue;try{message(peer,JSON.parse(payload.toString('utf8')))}catch{}}
      });
      socket.on('close',()=>close(peer));socket.on('error',()=>close(peer));
      if(head?.length)socket.emit('data',head);
    }catch{socket.destroy()}
  });
  setInterval(()=>{const now=Date.now();for(const m of monsters){if(m.dead&&now>=m.respawnAt){m.dead=false;m.hp=m.maxHp;m.respawnAt=0;m.weaponId=randomSkeletonWeapon();broadcast({type:'monster',id:m.id,hp:m.hp,dead:false,respawnAt:0,weaponId:m.weaponId})}}},500).unref();
}
