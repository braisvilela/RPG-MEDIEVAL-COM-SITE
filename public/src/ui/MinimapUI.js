// Minimap simplificado: visão de ocupação dos tiles e posição do jogador.
export default class MinimapUI {
  constructor(scene) {
    this.scene = scene;
    this.root = document.createElement('aside');
    this.root.id = 'rpg-minimap';
    this.root.innerHTML = '<div class="map-header"><span>Minimapa</span><button class="map-expand" title="Ampliar">⛶</button><button class="map-close" title="Fechar">×</button></div><canvas width="240" height="240"></canvas>';
    this.css = document.createElement('style');
    this.css.textContent = '#rpg-minimap{position:fixed;right:15px;top:15px;width:210px;z-index:9999;background:#141c27;border:2px solid #a38c60;border-radius:8px;padding:5px;color:#f2d59c;box-shadow:0 4px 20px #0009}#rpg-minimap .map-header{display:flex;align-items:center;gap:6px;cursor:move;user-select:none;padding:3px}#rpg-minimap button{cursor:pointer;background:#384151;color:white;border:0;border-radius:4px;padding:3px 8px}#rpg-minimap .map-expand{margin-left:auto}#rpg-minimap canvas{display:block;width:100%;aspect-ratio:1;image-rendering:pixelated;cursor:pointer}#rpg-minimap.large{width:min(72vmin,650px)}#rpg-minimap.hidden{display:none}';
    document.head.append(this.css);document.body.append(this.root);
    const header=this.root.querySelector('.map-header');
    header.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;this.drag={x:e.clientX-this.root.offsetLeft,y:e.clientY-this.root.offsetTop};header.setPointerCapture(e.pointerId)});
    header.addEventListener('pointermove',e=>{if(!this.drag)return;this.root.style.left=`${Math.max(0,Math.min(innerWidth-this.root.offsetWidth,e.clientX-this.drag.x))}px`;this.root.style.top=`${Math.max(0,Math.min(innerHeight-this.root.offsetHeight,e.clientY-this.drag.y))}px`;this.root.style.right='auto'});
    header.addEventListener('pointerup',()=>this.drag=null);header.addEventListener('pointercancel',()=>this.drag=null);
    this.root.querySelector('.map-expand').onclick=()=>this.toggle();
    this.root.querySelector('canvas').onclick=()=>this.toggle();
    this.root.querySelector('.map-close').onclick=()=>this.root.classList.add('hidden');
    this.canvas=this.root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
    this.draw();this.update=()=>this.draw();scene.events.on('postupdate',this.update);
    scene.events.once('shutdown',()=>this.destroy());
  }
  toggle(){this.root.classList.toggle('large');this.root.classList.remove('hidden')}
  draw(){
    const {ctx,canvas,scene}=this;if(!ctx||!scene.player||!scene.map)return;
    const w=canvas.width,h=canvas.height,map=scene.map;
    ctx.fillStyle='#304339';ctx.fillRect(0,0,w,h);
    const scale=Math.min(w/map.width,h/map.height);
    if(scale<=0)return;
    for(const layer of map.layers){
      if(!layer.data)continue;
      ctx.fillStyle='#7b836b';
      for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
        if(layer.data[y]?.[x]?.index>0)ctx.fillRect(x*scale,y*scale,Math.max(1,scale),Math.max(1,scale));
      }
    }
    const px=scene.player.x/map.tileWidth*scale,py=scene.player.y/map.tileHeight*scale;
    ctx.fillStyle='#ff5252';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
  }
  destroy(){this.scene.events.off('postupdate',this.update);this.root.remove();this.css.remove()}
}
