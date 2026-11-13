export default class ChatUI {
  constructor(scene){
    this.scene=scene;this.active='local';this.entries={local:[],global:[],log:[]};
    this.root=document.createElement('section');this.root.id='rpg-chat';
    this.root.innerHTML=`<div class="chat-tabs"><button data-tab="local">Chat Local</button><button data-tab="global">Chat Global (50 Gold)</button><button data-tab="log">Chat Log</button><button class="chat-min">−</button></div><div class="chat-messages" aria-live="polite"></div><form class="chat-form"><input maxlength="180" autocomplete="off" placeholder="Escreva uma mensagem..."/><button>Enviar</button></form>`;
    document.body.append(this.root);
    this.messages=this.root.querySelector('.chat-messages');this.form=this.root.querySelector('form');this.input=this.root.querySelector('input');
    this.root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>this.tab(b.dataset.tab));
    this.root.querySelector('.chat-min').onclick=()=>this.root.classList.toggle('chat-collapsed');
    this.form.onsubmit=e=>{e.preventDefault();const text=this.input.value.trim();if(!text||this.active==='log')return;this.scene.multiplayerSystem?.send({type:'chat',channel:this.active,text});this.input.value=''};
    this.outsidePointer = e => { if (!this.root.contains(e.target)) this.input.blur(); };
    document.addEventListener('pointerdown', this.outsidePointer, true);
    this.input.addEventListener('keydown',e=>e.stopPropagation());this.input.addEventListener('keyup',e=>e.stopPropagation());
    this.style=document.createElement('style');this.style.textContent=`#rpg-chat{position:fixed;left:12px;bottom:10px;width:min(510px,calc(100vw - 24px));height:230px;z-index:10000;background:rgba(13,20,31,.91);border:1px solid #7c7159;border-radius:8px;color:#e9e0c8;font:13px Arial;display:flex;flex-direction:column;overflow:hidden}#rpg-chat .chat-tabs{display:flex;background:#273143}#rpg-chat button{background:transparent;color:#eee0bb;border:0;padding:9px;cursor:pointer;font:inherit}#rpg-chat button.active{background:#4d4938;color:#fff}#rpg-chat .chat-min{margin-left:auto}#rpg-chat .chat-messages{flex:1;overflow:auto;padding:8px;white-space:pre-wrap;overflow-wrap:anywhere}#rpg-chat .chat-line{margin-bottom:5px}#rpg-chat .chat-time{color:#a4a6b2}#rpg-chat .chat-form{display:flex;border-top:1px solid #495367}#rpg-chat input{flex:1;min-width:0;background:#172233;color:white;border:0;padding:10px;outline:none}#rpg-chat .chat-form button{background:#435337}#rpg-chat.chat-collapsed{height:35px}#rpg-chat.chat-collapsed .chat-messages,#rpg-chat.chat-collapsed .chat-form{display:none}`;document.head.append(this.style);
    this.tab('local');scene.events.once('shutdown',()=>this.destroy());
  }
  tab(channel){this.active=channel;this.root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===channel));this.form.style.display=channel==='log'?'none':'flex';this.render()}
  add(channel,text,at=new Date()){const date=new Date(at);const stamp=Number.isNaN(date.getTime())?'--:--:--':date.toLocaleTimeString('pt-BR',{hour12:false});const lines=this.entries[channel]||this.entries.log;lines.push({stamp,text});if(lines.length>200)lines.shift();if(this.active===channel)this.render()}
  receive(m){if(m.channel==='local'){
      const camera=this.scene.cameras.main;const x=Number(m.x),y=Number(m.y);
      const rect=camera.worldView;if(!rect.contains(x,y))return;
    }
    this.add(m.channel,`${m.name}: ${m.text}`,m.at);
  }
  system(text,channel='log'){this.add(channel,text)}
  combat(text){this.add('log',text)}
  render(){this.messages.replaceChildren();for(const line of this.entries[this.active]){const div=document.createElement('div');div.className='chat-line';const t=document.createElement('span');t.className='chat-time';t.textContent=`${line.stamp} `;div.append(t,document.createTextNode(line.text));this.messages.append(div)}this.messages.scrollTop=this.messages.scrollHeight}
  destroy(){document.removeEventListener('pointerdown',this.outsidePointer,true);this.root.remove();this.style.remove()}
}
