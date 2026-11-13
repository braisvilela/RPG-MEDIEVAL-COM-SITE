import Phaser from 'phaser';

export default class MultiplayerSystem {
  constructor(scene){
    this.scene=scene;this.players=new Map();this.lastSent=0;this.myId=window.__RPG_CHARACTER__?.character?.id;
    this.groundSprites=new Map();this.monsterStates=new Map();this.ready=false;this.lastVitals="";this.disconnected=false;
    if(!this.myId)return;
    const protocol=location.protocol==='https:'?'wss:':'ws:';
    this.ws=new WebSocket(`${protocol}//${location.host}/realtime?character=${this.myId}`);
    this.ws.onmessage=event=>{try{this.receive(JSON.parse(event.data))}catch(e){console.warn('Multiplayer:',e)}};
    this.ws.onopen=()=>{this.ready=true;this.sendMovement();this.sendVitals()};
    this.ws.onclose=()=>{this.ready=false;for(const id of [...this.players.keys()])this.remove(id);if(!this.destroying)this.showDisconnected()};
    scene.events.once('shutdown',()=>this.destroy());
  }
  send(data){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(data))}
  showDisconnected(){
    if(this.disconnected)return;this.disconnected=true;
    this.scene.player?.setVelocity(0,0);
    const w=this.scene.scale.width,h=this.scene.scale.height;
    this.disconnectionPanel=this.scene.add.container(w/2,h/2).setScrollFactor(0).setDepth(900000);
    const bg=this.scene.add.rectangle(0,0,460,160,0x101722,.97).setStrokeStyle(2,0xee7777);
    const label=this.scene.add.text(0,-20,'Conexão com o servidor perdida',{fontFamily:'Arial',fontSize:'21px',color:'#ffffff'}).setOrigin(.5);
    const hint=this.scene.add.text(0,30,'O jogo foi desconectado. Reabra após iniciar o servidor.',{fontFamily:'Arial',fontSize:'14px',color:'#e4d4b8'}).setOrigin(.5);
    this.disconnectionPanel.add([bg,label,hint]);
    this.scene.chatUI?.system('Servidor desconectado.');
  }
  sendVitals(){const p=this.scene.player;if(!p)return;const hp=Math.max(0,Number(p.stats.health)||0),maxHp=Math.max(1,Number(p.stats.maxHealth)||1);const value=`${hp}/${maxHp}`;if(value!==this.lastVitals){this.lastVitals=value;this.send({type:'vitals',hp,maxHp})}}
  sendMovement(){const p=this.scene.player;if(!p)return;this.send({type:'move',x:p.x,y:p.y,facing:p.facing,moving:Math.abs(p.body?.velocity?.x||0)+Math.abs(p.body?.velocity?.y||0)>1,attacking:Boolean(p.isAttacking)})}
  update(time,delta){if(this.ready&&time-this.lastSent>=100){this.lastSent=time;this.sendMovement();this.sendVitals()}
    for(const entry of this.players.values()){
      entry.sprite.x=Phaser.Math.Linear(entry.sprite.x,entry.x,Math.min(1,delta/90));
      entry.sprite.y=Phaser.Math.Linear(entry.sprite.y,entry.y,Math.min(1,delta/90));
      entry.label.setPosition(entry.sprite.x,entry.sprite.y-75);
      entry.hpBar.setPosition(entry.sprite.x,entry.sprite.y-56);
      entry.sprite.setDepth(Math.floor(entry.sprite.y));
    }
  }
  create(p){if(!p||p.id===this.myId||this.players.has(p.id))return;
    const x=Number(p.x)||0,y=Number(p.y)||0;
    const sprite=this.scene.add.sprite(x,y,'player-idle-down-1').setDepth(Math.floor(y));
    const label=this.scene.add.text(x,y-65,`${p.name}  |  LV. ${p.level}`,{fontFamily:'Arial',fontSize:'12px',color:'#80d8ff',stroke:'#000000',strokeThickness:3}).setOrigin(.5).setDepth(100002);
    const hpBar=this.scene.add.graphics().setDepth(100003);
    this.players.set(p.id,{sprite,label,hpBar,x,y,facing:'down',hp:Number(p.hp)||100,maxHp:Number(p.maxHp)||100});
    this.drawVitals(p.id);
    this.move(p);
  }
  move(p){const entry=this.players.get(p.id);if(!entry)return;entry.x=Number(p.x)||0;entry.y=Number(p.y)||0;const facing=['up','down','left','right'].includes(p.facing)?p.facing:'down';const key=`player-${p.moving?'walk':'idle'}-${facing}`;
    if(entry.sprite.anims.currentAnim?.key!==key&&this.scene.anims.exists(key))entry.sprite.play(key,true);
    if(p.attacking&&this.scene.anims.exists(`player-slash-${facing}`)&&entry.sprite.anims.currentAnim?.key!==`player-slash-${facing}`)entry.sprite.play(`player-slash-${facing}`,true);
  }
  drawVitals(id){const e=this.players.get(id);if(!e)return;const ratio=Phaser.Math.Clamp(e.hp/Math.max(1,e.maxHp),0,1);e.hpBar.clear();e.hpBar.fillStyle(0x101010).fillRect(-27,0,54,7);e.hpBar.fillStyle(ratio>.5?0x36cb64:ratio>.25?0xe8bc4d:0xd84848).fillRect(-26,1,52*ratio,5)}
  remove(id){const e=this.players.get(id);if(!e)return;e.sprite.destroy();e.label.destroy();e.hpBar.destroy();this.players.delete(id)}
  receive(m){if(m.type==='welcome'){for(const p of m.players)this.create(p);for(const state of m.monsters)this.applyMonster(state);for(const item of m.groundItems||[])this.addGround(item)}
    if(m.type==='ground_add')this.addGround(m.item);
    if(m.type==='ground_remove')this.removeGround(m.id);
    if(m.type==='drop_confirm'){
      const inv=this.scene.inventorySystem;
      if(inv){inv.dropItem(m.index,m.quantity);this.scene.inventoryUI?.refresh();}
    }
    if(m.type==='item_granted'){
      const inv=this.scene.inventorySystem;
      if(inv){inv.addItem(m.itemId,m.quantity||1);this.scene.inventoryUI?.refresh();}
    }
    if(m.type==='pickup_confirm'){
      const inv=this.scene.inventorySystem;
      if(inv){inv.addItem(m.itemId,m.quantity);this.scene.inventoryUI?.refresh();}
    }
    if(m.type==='join')this.create(m.player);
    if(m.type==='move')this.move(m);
    if(m.type==='leave')this.remove(m.id);
    if(m.type==='monster')this.applyMonster(m);
    if(m.type==='vitals'){const e=this.players.get(m.id);if(e){e.hp=m.hp;e.maxHp=m.maxHp;this.drawVitals(m.id)}}
    if(m.type==='chat')this.scene.chatUI?.receive(m);
    if(m.type==='system')this.scene.chatUI?.system(m.text,m.channel);
    if(m.type==='gold'){this.scene.player.currency.gold=m.gold;if(this.scene.saveSystem?.initial?.currency)this.scene.saveSystem.initial.currency.gold=m.gold;this.scene.saveProgress();this.scene.updateHUD();this.scene.chatUI?.system('Mensagem global enviada. Custo: 50 Gold.','global')}

  }
  applyMonster(state){this.monsterStates.set(state.id,state);const monster=this.scene.monsters?.[state.id];if(!monster)return;
    if(state.weaponId && monster.weaponId!==state.weaponId)monster.setWeapon(state.weaponId);
    monster.stats.health=Math.max(0,Number(state.hp)||0);
    if(state.damage>0 && !state.dead && !monster.isDead && !monster.isReturning){
      // A ranged hit must alert the monster even outside its detection radius.
      monster.startCombat(this.scene.player);
    }
    if(state.damage>0){this.scene.chatUI?.combat(`${state.attacker===this.myId?'Você causou':'Outro jogador causou'} ${state.damage} de dano em ${monster.monsterName}.`)}
    if(state.dead&&!monster.isDead){this.scene.chatUI?.combat(`${monster.monsterName} morreu.`);
      // Only the attacking player's client produces loot/experience locally.
      if(state.attacker===this.myId){monster.die()}else{
        monster.isDead=true;monster.isInCombat=false;monster.setVelocity(0,0);monster.anims.stop();monster.nameText.setText(`${monster.monsterName} - Morto`);monster.healthBar.clear();monster.enableMonsterInteraction();
      }
    }else if(!state.dead&&monster.isDead){
      monster.respawnAt=0;monster.respawn();
    }
    if(!state.dead)monster.updateHealthBar();
  }
  addGround(item){if(!item||this.groundSprites.has(item.id))return;
    const key=`item-${item.itemId}`;
    let sprite;
    if(this.scene.textures.exists(key)){sprite=this.scene.add.image(item.x,item.y,key);sprite.setDisplaySize(28,28)}
    else{sprite=this.scene.add.text(item.x,item.y,'◆',{fontSize:'22px',color:'#f2d47d'}).setOrigin(.5)}
    sprite.setDepth(Math.floor(item.y)+2).setInteractive({useHandCursor:true});
    sprite.on('pointerdown',pointer=>{pointer.event?.stopPropagation();this.send({type:'pickup_item',id:item.id})});
    this.groundSprites.set(item.id,sprite);
  }
  removeGround(id){this.groundSprites.get(id)?.destroy();this.groundSprites.delete(id)}
  attack(monster,damage,type='physical',critical=false){
    const id=this.scene.monsters.indexOf(monster);if(id<0||!this.ready)return false;
    const defense=type==='magic'?monster.stats.magicalDefense:monster.stats.physicalDefense;
    const net=Math.max(1,Math.floor((Number(damage)||0)-(Number(defense)||0)));
    this.send({type:'attack',id,damage:net,critical});return true;
  }
  destroy(){this.destroying=true;this.ws?.close();for(const id of [...this.groundSprites.keys()])this.removeGround(id);for(const id of [...this.players.keys()])this.remove(id)}
}
