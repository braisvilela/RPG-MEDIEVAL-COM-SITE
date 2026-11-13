import {api} from '../api.js';
export default class SaveSystem {
 constructor(){this.character=window.__RPG_CHARACTER__?.character;this.initial=window.__RPG_CHARACTER__?.save||null;this.queue=Promise.resolve();}
 load(){return this.initial}
 save(player,inventory=null,monsters=null){if(!this.character||!player)return Promise.resolve();const previous=this.initial||{};const data={version:1,playerName:this.character.name,position:{x:player.x,y:player.y},level:player.level,skills:{...player.skills},experience:player.experience,experienceToNextLevel:player.experienceToNextLevel,stats:{...player.stats},baseStats:{...(player.baseStats||player.stats)},currency:{...player.currency},facing:player.facing,inventory:inventory?inventory.serialize():(previous.inventory||{}),monsters:monsters?monsters.map(m=>({level:m.level,isDead:m.isDead,loot:m.isDead?(m.loot||[]).map(i=>({...i})):[],respawnAt:m.isDead?m.respawnAt:null,lootCollectedAt:m.lootCollectedAt??null,corpseHidden:m.corpseHidden??false})):(previous.monsters||[])};this.initial=data;this.queue=this.queue.catch(()=>{}).then(()=>api(`/characters/${this.character.id}`,{method:'PUT',body:JSON.stringify({save:data})})).catch(e=>{console.error('Erro ao salvar no servidor:',e);window.dispatchEvent(new CustomEvent('rpg-save-error',{detail:e.message}))});return this.queue}
 async flush(){await this.queue}
 deleteSave(){throw new Error('O progresso está associado ao personagem no servidor.')}
}
