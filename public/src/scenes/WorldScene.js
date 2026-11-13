
import Phaser from 'phaser';

import Player from '../Player.js';
import Monster from '../Monster.js';
import NPC from '../npc.js';
import ShopUI from '../ui/SHOPUI.js';
import GameHUD from '../ui/GameHUD.js';
import ChatUI from '../ui/ChatUI.js';
import {post} from '../api.js';

import SaveSystem from '../systems/SaveSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import MultiplayerSystem from '../systems/MultiplayerSystem.js';
import SpellSystem from '../systems/SpellSystem.js';
import StatusEffectSystem from '../systems/StatusEffectSystem.js';
import InventorySystem from '../systems/InventorySystem.js';
import LootSystem from '../systems/LootSystem.js';

import InventoryUI from '../ui/InventoryUI.js';
import CharacterUI from '../ui/CharacterUI.js';
import LootUI from '../ui/LootUI.js';
import MinimapUI from '../ui/MinimapUI.js';

import playerData from '../data/player.json';
import skeletonData from '../monsters/skeleton.json';
import healData from '../spells/heal.json';
import spawnData from '../config/spawns.json';

import daggerData from '../items/dagger.json';
import bowData from '../items/bow.json';
import staffData from '../items/staff.json';
import arrowData from '../items/arrow.json';
import boneData from '../items/bone.json';
const additionalItems = import.meta.glob('../items/*.json', { eager: true, import: 'default' });

const LPC_WEAPON_ANIMATIONS = {"dagger": {"walk": {"width": 64, "count": 9}, "slash": {"width": 64, "count": 6}, "thrust": {"width": 64, "count": 8}}, "longsword": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}, "thrust": {"width": 192, "count": 8}}, "sabre": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}}, "rapier": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}}, "war_axe": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}}, "flail": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}}, "mace": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}, "thrust": {"width": 64, "count": 8}}, "halberd": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}, "thrust": {"width": 192, "count": 8}}, "scythe": {"walk": {"width": 64, "count": 9}, "slash": {"width": 192, "count": 6}}};

const DIRECTIONS = ['down', 'up', 'left', 'right'];
const CORPSE_HIDE_DELAY = 10000;
const SKELETON_MELEE_WEAPONS = ['dagger','longsword','sabre','rapier','war_axe','flail','mace','halberd','scythe'];
const MONSTER_VARIANTS = ["red_skeleton", "white_lizard", "yellow_skeleton", "black_skeleton", "dark_lizard", "gold_lizard", "green_lizard", "green_skeleton", "ice_skeleton", "purple_skeleton"];

const TILESETS = [
    { tiledName: 'fm_tileset', imageKey: 'fm-tileset', imagePath: '/assets/tilesets/forgotten_memories/TileSet.png' },
    { tiledName: 'fm_trees', imageKey: 'fm-trees', imagePath: '/assets/tilesets/forgotten_memories/Trees.png' },
    { tiledName: 'fm_props', imageKey: 'fm-props', imagePath: '/assets/tilesets/forgotten_memories/Props.png' },
    { tiledName: 'fm_watertiles_6frames', imageKey: 'fm-water', imagePath: '/assets/tilesets/forgotten_memories/WaterTiles-6frames.png' },

    {
        tiledName: 'terrain',
        imageKey: 'tileset-terrain',
        imagePath: '/assets/tilesets/terrain.png'
    },
    {
        tiledName: 'sandwater',
        imageKey: 'tileset-sandwater',
        imagePath: '/assets/tilesets/sandwater.png'
    },
    {
        tiledName: 'plowed_soil',
        imageKey: 'tileset-plowed-soil',
        imagePath: '/assets/tilesets/plowed_soil.png'
    }
];

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    preload() {
        this.load.on('progress', value => window.__RPG_SET_LOADING__?.(0.08+value*0.9, 'Carregando mapas, monstros e equipamentos...'));
        this.load.on('loaderror', file => {console.warn('Falha ao carregar recurso:',file?.src);});
        this.load.once('complete', () => {
            window.__RPG_SET_LOADING__?.(1, 'Entrando no mundo...');
            // Aguarda o primeiro quadro renderizado antes de retirar a tela.
            this.game.events.once('postrender', () => window.__RPG_HIDE_LOADING__?.());
        });
        const optionalImages = [
            ['item-bone', '/assets/items/drops/Bone.gif'],
            ['item-dagger', '/assets/items/melee/Dagger.gif'],
            ['item-bow', '/assets/items/ranged/Bow.gif'],
            ['item-staff', '/assets/items/staff.png'],
            ['item-arrow', '/assets/items/municao/Arrow.gif'],
			['item-gold', '/assets/items/drops/Gold_Coin.gif'],
        ];

        for (const definition of Object.values(additionalItems)) {
            if (definition.icon && !optionalImages.some(([key]) => key === `item-${definition.id}`)) {
                optionalImages.push([`item-${definition.id}`, definition.icon]);
            }
        }
        this.load.spritesheet('animated-item-bolt', '/assets/items/animated/bolt.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('animated-item-assassin_star', '/assets/items/animated/assassin_star.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('animated-item-health_potion_75', '/assets/items/animated/health_potion_75.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('animated-item-arrow', '/assets/items/animated/arrow.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('animated-item-mana_potion_75', '/assets/items/animated/mana_potion_75.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('animated-item-throwing_knife', '/assets/items/animated/throwing_knife.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('animated-item-skull', '/assets/items/animated/skull.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('animated-item-energyball', '/assets/items/animated/energyball.png', { frameWidth: 31, frameHeight: 32 });
        for (const id of [1, 2, 3, 9, 19, 35]) {
            // Sprites Tibia: 3x3 direções, com centro vazio.
            const frameSize = id === 1 ? 64 : 32;
            this.load.spritesheet(`missile_${id}`, `/assets/projeteis/missile_${id}.png`, {
                frameWidth: frameSize, frameHeight: frameSize
            });
        }
        for (const [key, path] of optionalImages) {
            this.load.image(key, path);
        }

        for (const variant of MONSTER_VARIANTS) for (const weapon of SKELETON_MELEE_WEAPONS) {
            for (const direction of DIRECTIONS) for (const [action,count] of [['walk',9],['idle',2],['slash',6]])
                for (let frame=1;frame<=count;frame++)
                    this.load.image(`${variant}-${weapon}-${action}-${direction}-${frame}`, `/assets/characters/monster_armed/${variant}/${weapon}/${action}/${direction}/${frame}.png`);
        }
        for (const weapon of SKELETON_MELEE_WEAPONS) {
            for (const direction of DIRECTIONS) {
                for (const [action, count] of [['walk',9],['idle',2],['slash',6]]) {
                    for (let frame=1;frame<=count;frame++) {
                        this.load.image(`skeleton-${weapon}-${action}-${direction}-${frame}`, `/assets/characters/skeleton_armed/${weapon}/${action}/${direction}/${frame}.png`);
                    }
                }
            }
        }
        for (const character of ['player', 'skeleton', 'mark']) {
            for (const direction of DIRECTIONS) {
                for (let i = 1; i <= 9; i++) {
                    this.load.image(
                        `${character}-walk-${direction}-${i}`,
                        (character==='player' && window.__LPC_FRAMES__?.[`walk-${direction}-${i}`]) || `/assets/characters/${character}/walk/${direction}/${i}.png`
                    );
                }

                for (let i = 1; i <= 2; i++) {
                    this.load.image(
                        `${character}-idle-${direction}-${i}`,
                        (character==='player' && window.__LPC_FRAMES__?.[`idle-${direction}-${i}`]) || `/assets/characters/${character}/idle/${direction}/${i}.png`
                    );
                }

                if (character !== 'mark') for (let i = 1; i <= 6; i++) {
                    this.load.image(
                        `${character}-slash-${direction}-${i}`,
                        (character==='player' && window.__LPC_FRAMES__?.[`slash-${direction}-${i}`]) || `/assets/characters/${character}/slash/${direction}/${i}.png`
                    );
                }
            }
        }

        if (window.__LPC_FRAMES__) for (const direction of DIRECTIONS) {
            for (let i=1;i<=13;i++) this.load.image(`player-shoot-${direction}-${i}`,window.__LPC_FRAMES__[`shoot-${direction}-${i}`]);
        }

        for (const direction of DIRECTIONS) {
            for (let i = 1; i <= 7; i++) {
                this.load.image(
                    `player-spellcast-${direction}-${i}`,
                    `/assets/characters/player/spellcast/${direction}/${i}.png`
                );
            }
        }

        for (let i = 1; i <= 6; i++) {
            this.load.image(
                `player-hurt-up-${i}`,
                window.__LPC_FRAMES__?.[`hurt-up-${i}`] || `/assets/characters/player/hurt/up/${i}.png`
            );

            this.load.image(
                `skeleton-hurt-up-${i}`,
                `/assets/characters/skeleton/hurt/up/${i}.png`
            );
        }

        // LPC weapon sheets: walking and oversize attacks retain their own frame dimensions.
        for (const [id, animations] of Object.entries(LPC_WEAPON_ANIMATIONS)) {
            for (const [animation, info] of Object.entries(animations)) {
                this.load.spritesheet(`lpc-weapon-${id}-${animation}`,
                    `/assets/lpc-equipment/${id}-${animation}.png`,
                    {frameWidth:info.width,frameHeight:info.width});
            }
        }

        this.load.tilemapTiledJSON(
            'lobby',
            '/assets/maps/lobby.tmj'
        );

        for (const config of TILESETS) {
            this.load.image(config.imageKey, config.imagePath);
        }
    }

    create() {
        this.createAnimations();

        this.map = this.make.tilemap({ key: 'lobby' });

        const activeTilesetNames = new Set(this.map.tilesets.map(tileset => tileset.name));
        const tilesets = TILESETS.filter(config => activeTilesetNames.has(config.tiledName)).map(config => {
            const tileset = this.map.addTilesetImage(
                config.tiledName,
                config.imageKey
            );

            if (!tileset) {
                throw new Error(`Tileset ausente: ${config.tiledName}`);
            }

            return tileset;
        });

        this.map.layers.forEach((layerData, index) => {
            const layer = this.map.createLayer(
                layerData.name, tilesets, 0, 0
            );

            if (!layer) return;
            if (layerData.name === 'Collision') layer.setVisible(false);

            const name = layerData.name.toLowerCase();

            layer.setDepth(
                name.includes('above') || name.includes('foreground')
                    ? 100000
                    : index * 10
            );
        });

        // Animated tiles exported from Tiled: cycle frames in Phaser 3.
        this.fmAnimatedTiles = [];
        const waterLayer = this.map.getLayer('River and Water')?.tilemapLayer;
        if (waterLayer) {
            waterLayer.forEachTile(tile => {
                if (tile.index === 6145 + 29 * 32) this.fmAnimatedTiles.push(tile);
            });
            if (this.fmAnimatedTiles.length) this.time.addEvent({delay:130, loop:true, callback: () => {
                this.fmWaterFrame = ((this.fmWaterFrame || 0) + 1) % 6;
                this.fmAnimatedTiles.forEach(tile => { tile.index = 6145 + 29 * 32 + this.fmWaterFrame; });
            }});
        }

        this.physics.world.setBounds(
            0, 0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        this.player = new Player(
            this,
            4.5 * this.map.tileWidth,
            4.5 * this.map.tileHeight,
            playerData
        );

        // Tiled collision layer: river, tree trunks and fences.
        const blockedLayer = this.map.getLayer('Collision')?.tilemapLayer;
        if (blockedLayer) {
            blockedLayer.setCollisionByExclusion([-1, 0]);
            this.physics.add.collider(this.player, blockedLayer);
        }

        this.player.playerName = window.__RPG_CHARACTER__?.character?.name || this.player.playerName;
        this.player.updatePlayerUI();
        this.player.playerName = window.__RPG_CHARACTER__?.character?.name || this.player.playerName;
        this.player.updatePlayerUI();
        this.saveSystem = new SaveSystem();
        const saved = this.saveSystem.load();

        if (saved) {
            const x = Number(saved.position?.x);
            const y = Number(saved.position?.y);

            if (Number.isFinite(x) && Number.isFinite(y)) {
                this.player.setPosition(
                    Phaser.Math.Clamp(x, 0, this.map.widthInPixels - 1),
                    Phaser.Math.Clamp(y, 0, this.map.heightInPixels - 1)
                );
            }

            this.player.level = saved.level ?? this.player.level;
            this.player.experience = saved.experience ??
                this.player.experience;

            this.player.experienceToNextLevel =
                saved.experienceToNextLevel ??
                this.player.experienceToNextLevel;

            if (saved.skills) this.player.skills = {...this.player.skills, ...saved.skills};
            if (saved.stats) {
                this.player.stats = {
                    ...this.player.stats,
                    ...saved.stats
                };
            }

            if (saved.currency) {
                this.player.currency = {
                    ...this.player.currency,
                    ...saved.currency
                };
            }

            if (DIRECTIONS.includes(saved.facing)) {
                this.player.facing = saved.facing;
            }

            this.player.setVelocity(0, 0);
            this.player.playIdle();
        }

        // =====================================
        // INVENTÁRIO E EQUIPAMENTOS
        // =====================================

        if (!this.anims.exists('animated-item-bolt')) this.anims.create({ key: 'animated-item-bolt', frames: this.anims.generateFrameNumbers('animated-item-bolt', {start:0,end:7}), frameRate:2, repeat:-1 });
        if (!this.anims.exists('animated-item-assassin_star')) this.anims.create({ key: 'animated-item-assassin_star', frames: this.anims.generateFrameNumbers('animated-item-assassin_star', {start:0,end:6}), frameRate:2, repeat:-1 });
        if (!this.anims.exists('animated-item-health_potion_75')) this.anims.create({ key: 'animated-item-health_potion_75', frames: this.anims.generateFrameNumbers('animated-item-health_potion_75', {start:0,end:11}), frameRate:10, repeat:-1 });
        if (!this.anims.exists('animated-item-arrow')) this.anims.create({ key: 'animated-item-arrow', frames: this.anims.generateFrameNumbers('animated-item-arrow', {start:0,end:5}), frameRate:2, repeat:-1 });
        if (!this.anims.exists('animated-item-mana_potion_75')) this.anims.create({ key: 'animated-item-mana_potion_75', frames: this.anims.generateFrameNumbers('animated-item-mana_potion_75', {start:0,end:11}), frameRate:10, repeat:-1 });
        if (!this.anims.exists('animated-item-throwing_knife')) this.anims.create({ key: 'animated-item-throwing_knife', frames: this.anims.generateFrameNumbers('animated-item-throwing_knife', {start:0,end:5}), frameRate:3, repeat:-1 });
        if (!this.anims.exists('animated-item-skull')) this.anims.create({ key: 'animated-item-skull', frames: this.anims.generateFrameNumbers('animated-item-skull', {start:0,end:4}), frameRate:2, repeat:-1 });
        if (!this.anims.exists('animated-item-energyball')) this.anims.create({ key: 'animated-item-energyball', frames: this.anims.generateFrameNumbers('animated-item-energyball', {start:0,end:5}), frameRate:10, repeat:-1 });
        this.inventorySystem = new InventorySystem(20);

        this.inventorySystem.registerItems(
            daggerData,
            bowData,
            staffData,
            arrowData,
            boneData,
            ...Object.values(additionalItems)
        );

        this.inventorySystem.load(saved?.inventory);

        // Evitar duplicar bônus no carregamento.
        if (saved?.baseStats) {
            this.player.baseStats = {
                ...this.player.baseStats,
                ...saved.baseStats
            };
        } else {
            const bonuses = this.inventorySystem.getEquipmentBonuses();
            const base = { ...this.player.stats };

            for (const [key, value] of Object.entries(bonuses)) {
                if (key in base && key !== 'health' && key !== 'mana') {
                    base[key] -= value;
                }
            }

            this.player.baseStats = base;
        }

        this.applyEquipmentStats();

        // =====================================
        // SISTEMAS
        // =====================================

        this.statusEffectSystem = new StatusEffectSystem(this);
        this.combatSystem = new CombatSystem(this, this.player);
        this.spellSystem = new SpellSystem(this, this.player, healData);
        this.lootSystem = new LootSystem(this);

        // =====================================
        // MONSTROS
        // =====================================

        this.monsters = [];

        this.createMonsters(saved?.monsters);
        // O estado compartilhado dos monstros vem do servidor em tempo real.
        // Não restauramos mortes antigas do save individual.
        this.multiplayerSystem = new MultiplayerSystem(this);
        this.chatUI = new ChatUI(this);
        this.minimapUI = new MinimapUI(this);

        // =====================================
        // CÂMERA
        // =====================================

        this.cameras.main.setBounds(
            0, 0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        this.cameras.main.startFollow(
            this.player, true, 0.08, 0.08
        );

        // =====================================
        // CONTROLES
        // =====================================

        this.keys = this.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D',
            heal: 'H'
        });

        this.input.keyboard.on('keydown-H', () => {
            this.spellSystem.cast();
        });

        this.input.keyboard.on('keydown-I', () => {
            if (!this.shopUI?.visible) this.toggleInventory();
        });

        this.input.keyboard.on('keydown-C', () => {
            if (!this.shopUI?.visible) this.toggleCharacter();
        });

        // =====================================
        // INTERFACES
        // =====================================

        this.gameHUD = new GameHUD(this);

        this.input.topOnly = true;

        this.inventoryUI = new InventoryUI(
            this,
            this.inventorySystem
        );

        this.characterUI = new CharacterUI(
            this,
            this.player
        );

        this.lootUI = new LootUI(this);

        this.shopUI = new ShopUI(this, this.inventorySystem);
        this.mark = new NPC(this, 5, 5, () => this.shopUI.show());

        this.createMenuButtons();

        // Equipment visual is independent of body appearance; update whenever equipment changes.
        this.weaponOverlay=this.add.sprite(this.player.x,this.player.y,'lpc-weapon-dagger-walk',0)
            .setDepth(this.player.depth+1).setVisible(false);
        this.inventorySystem.onChange = () => {
            this.inventoryUI?.refresh();
            this.characterUI?.refresh();
        };

        // =====================================
        // SALVAMENTO
        // =====================================

        this.time.addEvent({
            delay: 5000,
            loop: true,
            callback: () => {
                if (!this.player.isDead) this.saveProgress();
            }
        });

        this.handlePageHide = () => {
            if (!this.player.isDead) this.saveProgress();
        };

        window.addEventListener('pagehide', this.handlePageHide);

        // =====================================
        // TELA RESPONSIVA
        // =====================================

        this.scale.on('resize', this.handleResize, this);

        this.handleResize({
            width: this.scale.width,
            height: this.scale.height
        });

        this.events.once('shutdown', () => {
            window.removeEventListener('pagehide', this.handlePageHide);
            this.scale.off('resize', this.handleResize, this);

            for (const monster of this.monsters) {
                this.clearMonsterTimers(monster);
            }
        });
    }

    applyEquipmentStats() {
        const bonuses = this.inventorySystem.getEquipmentBonuses();
        this.player.applyEquipmentBonuses(bonuses);

        this.player.updatePlayerUI();
        this.gameHUD?.update();
        this.characterUI?.refresh();
        this.inventoryUI?.refresh();
    }

    saveProgress() {
        return this.saveSystem.save(
            this.player,
            this.inventorySystem,
            this.monsters
        );
    }

    createMenuButtons() {
        const makeButton = (letter, x, callback) => {
            const background = this.add.rectangle(
                x, 30, 36, 36, 0x253244
            );

            background.setStrokeStyle(2, 0x8b9bad);
            background.setScrollFactor(0);
            background.setDepth(250000);
            background.setInteractive({ useHandCursor: true });

            const text = this.add.text(
                x, 30, letter,
                {
                    fontSize: '19px',
                    fontStyle: 'bold',
                    color: '#ffffff'
                }
            ).setOrigin(0.5);

            text.setScrollFactor(0);
            text.setDepth(250001);

            background.on('pointerdown', callback);

            return { background, text };
        };

        this.inventoryButton = makeButton(
            'I',
            this.scale.width - 80,
            () => this.toggleInventory()
        );

        this.characterButton = makeButton(
            'C',
            this.scale.width - 35,
            () => this.toggleCharacter()
        );

        const logoutBg = this.add.rectangle(this.scale.width - 175, 30, 112, 36, 0x6b3434).setStrokeStyle(2, 0xb99a67).setScrollFactor(0).setDepth(250000).setInteractive({useHandCursor:true});
        const logoutText = this.add.text(this.scale.width - 175,30,'Deslogar',{fontSize:'13px',color:'#ffffff',fontStyle:'bold',fontFamily:'Arial',align:'center'}).setOrigin(0.5).setScrollFactor(0).setDepth(250001).setResolution(2);
        logoutBg.on('pointerdown', async pointer => {pointer.event?.stopPropagation();if(!window.confirm('Tem certeza que deseja deslogar?'))return;this.player.setVelocity(0,0);await this.saveProgress();await this.saveSystem.flush();await post('/logout',{});location.href='/';});
        this.logoutButton={background:logoutBg,text:logoutText};
    }

    toggleInventory() {
        if (this.shopUI?.visible) return;
        this.characterUI.hide();
        this.inventoryUI.toggle();
    }

    toggleCharacter() {
        if (this.shopUI?.visible) return;
        this.inventoryUI.hide();
        this.characterUI.toggle();
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;

        if (width <= 0 || height <= 0) return;

        this.cameras.main.setSize(width, height);

        this.cameras.main.setBounds(
            0, 0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        if (this.inventoryButton) {
            this.inventoryButton.background.setX(width - 80);
            this.inventoryButton.text.setX(width - 80);
        }

        if (this.characterButton) {
            this.characterButton.background.setX(width - 35);
            this.characterButton.text.setX(width - 35);
        }

        if (this.logoutButton) {this.logoutButton.background.setX(width - 175);this.logoutButton.text.setX(width - 175);}
        this.inventoryUI?.refresh();
        this.characterUI?.refresh();
        this.shopUI?.refresh();
        this.gameHUD?.clampPosition?.();

        if (this.lootUI?.monster) {
            this.lootUI.draw();
        }
    }

    createAnimations() {
        for (const variant of MONSTER_VARIANTS) for (const weapon of SKELETON_MELEE_WEAPONS) for (const direction of DIRECTIONS) {
            for (const [action,count,rate,repeat] of [['walk',9,10,-1],['idle',2,2,-1],['slash',6,12,0]]) {
                const key=`${variant}-${weapon}-${action}-${direction}`;
                if(!this.anims.exists(key))this.anims.create({key,frames:Array.from({length:count},(_,i)=>({key:`${key}-${i+1}`})),frameRate:rate,repeat});
            }
        }

        for (const weapon of SKELETON_MELEE_WEAPONS) for (const direction of DIRECTIONS) {
            for (const [action,count,rate,repeat] of [['walk',9,10,-1],['idle',2,2,-1],['slash',6,12,0]]) {
                const key=`skeleton-${weapon}-${action}-${direction}`;
                if(!this.anims.exists(key))this.anims.create({key,frames:Array.from({length:count},(_,i)=>({key:`${key}-${i+1}`})),frameRate:rate,repeat});
            }
        }

        for (const character of ['player', 'skeleton', 'mark']) {
            for (const direction of DIRECTIONS) {
                const walkKey = `${character}-walk-${direction}`;
                const idleKey = `${character}-idle-${direction}`;

                if (!this.anims.exists(walkKey)) {
                    this.anims.create({
                        key: walkKey,
                        frames: Array.from({ length: 9 }, (_, i) => ({
                            key: `${walkKey}-${i + 1}`
                        })),
                        frameRate: 10,
                        repeat: -1
                    });
                }

                if (!this.anims.exists(idleKey)) {
                    this.anims.create({
                        key: idleKey,
                        frames: Array.from({ length: 2 }, (_, i) => ({
                            key: `${idleKey}-${i + 1}`
                        })),
                        frameRate: 2,
                        repeat: -1
                    });
                }

                if (character !== 'mark') this.createOneShotAnimation(
                    `${character}-slash-${direction}`,
                    6, 12
                );
            }
        }

        if (window.__LPC_FRAMES__) for (const direction of DIRECTIONS) {
            this.createOneShotAnimation(`player-shoot-${direction}`, 13, 16);
        }

        for (const direction of DIRECTIONS) {
            this.createOneShotAnimation(
                `player-spellcast-${direction}`,
                7, 14
            );
        }

        this.createOneShotAnimation('player-hurt-up', 6, 8);
        this.createOneShotAnimation('skeleton-hurt-up', 6, 8);
    }

    createOneShotAnimation(key, count, frameRate) {
        if (this.anims.exists(key)) return;

        this.anims.create({
            key,
            frames: Array.from({ length: count }, (_, i) => ({
                key: `${key}-${i + 1}`
            })),
            frameRate,
            repeat: 0
        });
    }

    // =====================================
    // CRIAÇÃO DE MONSTROS
    // =====================================

    createMonsters(savedStates = []) {
        for (const spawn of spawnData.spawns) {
            for (let i = 0; i < spawn.maxAlive; i++) {
                const index = this.monsters.length;
                const savedLevel = savedStates?.[index]?.level;

                // Nível fixo por spawn para todos os clientes do mapa.
                const level = spawn.levelRange.min;

                const x = (
                    spawn.position.x + 0.5
                ) * this.map.tileWidth + (i % 3) * 24;

                const y = (
                    spawn.position.y + 0.5
                ) * this.map.tileHeight + Math.floor(i / 3) * 24;

                const monster = new Monster(
                    this, x, y, skeletonData, level, spawn
                );

                monster.variantId = spawn.monsterId === 'skeleton' ? 'skeleton' : spawn.monsterId;
                monster.monsterName = spawn.monsterId === 'skeleton' ? monster.monsterName : spawn.monsterId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
                monster.setWeapon('dagger');
                monster.on('pointerdown', () => {
                    if (monster.isDead) {
                        if (!monster.corpseHidden) {
                            this.lootUI?.open(monster);
                        }
                    } else {
                        this.combatSystem.selectTarget(monster);
                    }
                });

                const originalDie = monster.die.bind(monster);
                const originalRespawn = monster.respawn.bind(monster);

                monster.die = (...args) => {
                    if (monster.isDead) return;

                    const generated = this.lootSystem.generate(monster);

                    monster.loot = Array.isArray(generated) ? generated : [];
                    monster.lootGenerated = true;
                    this.chatUI?.combat(`Loot de ${monster.monsterName}: ${monster.loot.length ? monster.loot.map(item => `${item.quantity}x ${item.name}`).join(', ') : 'nenhum'}.`);

                    const delay = Math.max(
                        1000,
                        Number(spawn.respawnCooldown) ||
                        Number(skeletonData.respawn?.cooldown) ||
                        60000
                    );

                    monster.respawnAt = Date.now() + delay;
                    monster.lootCollectedAt = null;
                    monster.corpseHidden = false;

                    originalDie(...args);

                    monster.setVisible(true);
                    monster.nameText.setVisible(true);
                    monster.enableMonsterInteraction();

                    this.scheduleMonsterRespawn(monster, delay);
                    this.saveProgress();
                };

                monster.respawn = (...args) => {
                    if (!monster.isDead) return;

                    const remaining = monster.respawnAt - Date.now();

                    if (Number.isFinite(remaining) && remaining > 0) {
                        this.scheduleMonsterRespawn(monster, remaining);
                        return;
                    }

                    if (this.lootUI?.monster === monster) {
                        this.lootUI.close();
                    }

                    this.clearMonsterTimers(monster);

                    monster.loot = [];
                    monster.lootGenerated = false;
                    monster.respawnAt = null;
                    monster.lootCollectedAt = null;
                    monster.corpseHidden = false;

                    originalRespawn(...args);
                    monster.enableMonsterInteraction();

                    this.saveProgress();
                };

                this.monsters.push(monster);
            }
        }
    }

    clearMonsterTimers(monster) {
        if (monster.savedRespawnTimer) {
            monster.savedRespawnTimer.remove(false);
            monster.savedRespawnTimer = null;
        }

        if (monster.corpseHideTimer) {
            monster.corpseHideTimer.remove(false);
            monster.corpseHideTimer = null;
        }
    }

    scheduleMonsterRespawn(monster, delay) {
        if (monster.savedRespawnTimer) {
            monster.savedRespawnTimer.remove(false);
        }

        monster.savedRespawnTimer = this.time.delayedCall(
            Math.max(1, delay),
            () => {
                monster.savedRespawnTimer = null;

                if (monster.active && monster.isDead) {
                    monster.respawn();
                }
            }
        );
    }

    hideMonsterCorpse(monster) {
        if (!monster?.isDead) return;

        if (Array.isArray(monster.loot) && monster.loot.length > 0) {
            return;
        }

        monster.corpseHidden = true;

        if (this.lootUI?.monster === monster) {
            this.lootUI.close();
        }

        monster.setVisible(false);
        monster.disableInteractive();
        monster.nameText.setVisible(false);
        monster.healthBar.setVisible(false);
    }

    scheduleCorpseHide(monster, delay) {
        if (monster.corpseHideTimer) {
            monster.corpseHideTimer.remove(false);
        }

        monster.corpseHideTimer = this.time.delayedCall(
            Math.max(1, delay),
            () => {
                monster.corpseHideTimer = null;
                this.hideMonsterCorpse(monster);
                this.saveProgress();
            }
        );
    }

    updateLootedCorpses() {
        for (const monster of this.monsters) {
            if (!monster.isDead || monster.corpseHidden) continue;
            if (monster.lootCollectedAt !== null) continue;

            if (Array.isArray(monster.loot) && monster.loot.length === 0) {
                monster.lootCollectedAt = Date.now();

                this.scheduleCorpseHide(
                    monster,
                    CORPSE_HIDE_DELAY
                );

                this.saveProgress();
            }
        }
    }

    restoreMonsterStates(states) {
        if (!Array.isArray(states)) return;

        states.forEach((state, index) => {
            const monster = this.monsters[index];

            if (!monster || !state?.isDead) return;

            const respawnAt = Number(state.respawnAt);
            const remaining = respawnAt - Date.now();

            if (!Number.isFinite(remaining) || remaining <= 0) return;

            monster.isDead = true;
            monster.isInCombat = false;
            monster.isReturning = false;
            monster.isAttacking = false;

            monster.setVelocity(0, 0);

            if (monster.body) monster.body.enable = false;

            monster.stats.health = 0;

            monster.loot = Array.isArray(state.loot)
                ? state.loot.map(item => ({ ...item }))
                : [];

            monster.lootGenerated = true;
            monster.respawnAt = respawnAt;
            monster.corpseHidden = Boolean(state.corpseHidden);

            monster.lootCollectedAt =
                typeof state.lootCollectedAt === 'number' &&
                Number.isFinite(state.lootCollectedAt)
                    ? state.lootCollectedAt
                    : null;

            monster.anims.stop();

            if (this.textures.exists('skeleton-hurt-up-6')) {
                monster.setTexture('skeleton-hurt-up-6');
            }

            monster.nameText.setText(
                `${monster.monsterName} - Morto`
            );

            monster.healthBar.clear();
            monster.enableMonsterInteraction();

            this.scheduleMonsterRespawn(monster, remaining);

            if (monster.corpseHidden) {
                monster.setVisible(false);
                monster.disableInteractive();
                monster.nameText.setVisible(false);
                monster.healthBar.setVisible(false);
            } else if (monster.loot.length === 0) {
                const collectedAt = monster.lootCollectedAt ?? Date.now();
                monster.lootCollectedAt = collectedAt;

                const hideRemaining =
                    CORPSE_HIDE_DELAY - (Date.now() - collectedAt);

                if (hideRemaining <= 0) {
                    this.hideMonsterCorpse(monster);
                } else {
                    this.scheduleCorpseHide(monster, hideRemaining);
                }
            }
        });
    }

    updateHUD() {
        this.gameHUD?.update();
    }

    update(time, delta) {
        if (this.multiplayerSystem?.disconnected) {
            this.player.setVelocity(0, 0);
        } else if (this.shopUI?.visible) {
            this.player.setVelocity(0, 0);
        } else if (!this.player.isDead) {
            this.player.updateRegeneration(delta);

            const manual =
                this.keys.up.isDown ||
                this.keys.down.isDown ||
                this.keys.left.isDown ||
                this.keys.right.isDown;

            if (manual) {
                if (this.combatSystem.target) {
                    this.combatSystem.cancelTarget();
                }

                this.player.moveManually(this.keys);
            } else if (this.combatSystem.target) {
                this.combatSystem.update(time);
            } else {
                this.player.moveManually(this.keys);
            }
        }

        for (const monster of this.monsters) {
            monster.updateMonster(delta, this.player);
        }

        if (this.weaponOverlay) {
            const equipped=this.inventorySystem?.getEquipped('Weapon');
            const id=equipped?.id;
            const animations=LPC_WEAPON_ANIMATIONS[id];
            const direction={up:0,left:1,down:2,right:3}[this.player.facing]??2;
            const current=Math.max(0,(this.player.anims.currentFrame?.index||1)-1);
            const attacking=this.player.anims.currentAnim?.key?.startsWith('player-slash-');
            const animation=attacking && animations?.slash ? 'slash'
                :attacking && animations?.thrust ? 'thrust':'walk';
            const info=animations?.[animation];
            if (info && !this.player.isDead) {
                const texture=`lpc-weapon-${id}-${animation}`;
                if(this.weaponOverlay.texture.key!==texture)this.weaponOverlay.setTexture(texture);
                const frame=Math.min(info.count-1,Math.floor(current*info.count/(attacking?6:9)));
                this.weaponOverlay.setFrame(direction*info.count+frame);
                this.weaponOverlay.setPosition(this.player.x,this.player.y);
                this.weaponOverlay.setDepth(this.player.depth+1);
                this.weaponOverlay.setVisible(true);
            } else this.weaponOverlay.setVisible(false);
        }

        this.updateLootedCorpses();
        this.multiplayerSystem?.update(time,delta);

        this.statusEffectSystem.update(time);
        this.player.updatePlayerUI();
        this.updateHUD();

        if (
            this.characterUI.visible &&
            (!this.lastCharacterRefresh ||
                time - this.lastCharacterRefresh >= 500)
        ) {
            this.characterUI.refresh();
            this.lastCharacterRefresh = time;
        }

        if (
            this.inventoryUI.visible &&
            (!this.lastInventoryRefresh ||
                time - this.lastInventoryRefresh >= 500)
        ) {
            this.inventoryUI.refresh();
            this.lastInventoryRefresh = time;
        }
    }
}
