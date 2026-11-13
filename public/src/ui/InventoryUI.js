
import Phaser from 'phaser';

const ARMOR = ['Head', 'Arms', 'Torso', 'Legs', 'Feet'];
const ACCESSORIES = ['Amulet', 'Ring'];

export default class InventoryUI {
    constructor(scene, inventory) {
        this.scene = scene;
        this.inventory = inventory;
        this.visible = false;
        this.selectedIndex = null;
        this.selectedEquipment = null;

        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(300000)
            .setVisible(false);

        this.tooltip = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(300010)
            .setVisible(false);

        this.draw();
    }

    add(object) {
        this.container.add(object);
        return object;
    }

    text(x, y, value, size = 13, color = '#ffffff') {
        return this.add(this.scene.add.text(x, y, String(value), {
            fontFamily: 'Arial',
            fontSize: `${size}px`,
            color
        }));
    }

    rect(x, y, w, h, fill = 0x17202b, border = 0x79624b) {
        const object = this.scene.add.rectangle(
            x, y, w, h, fill, 0.98
        ).setOrigin(0);

        object.setStrokeStyle(1, border);
        return this.add(object);
    }

    button(x, y, w, h, label, callback) {
        const background = this.rect(x, y, w, h, 0x49352b, 0xb99a67);
        background.setInteractive({ useHandCursor: true });

        background.on('pointerdown', pointer => {
            pointer.event?.stopPropagation();
            callback();
        });

        const text = this.text(x + w / 2, y + h / 2, label, 12);
        text.setOrigin(0.5);
        return background;
    }

    icon(id, x, y, size = 34) {
        const key = `item-${id}`;

        const animatedKey = `animated-item-${id}`;
        if (this.scene.textures.exists(animatedKey) && this.scene.anims.exists(animatedKey)) {
            const sprite = this.scene.add.sprite(x, y, animatedKey);
            const source = this.scene.textures.get(animatedKey).getSourceImage();
            const frame = this.scene.textures.get(animatedKey).get(0);
            const ratio = Math.min(size / (frame.width || size), size / (frame.height || size));
            sprite.setDisplaySize((frame.width || size) * ratio, (frame.height || size) * ratio);
            sprite.play(animatedKey);
            return this.add(sprite);
        }
        if (this.scene.textures.exists(key)) {
            const image = this.scene.add.image(x, y, key);
            const source = this.scene.textures.get(key).getSourceImage();
            const ratio = Math.min(size / (source.width || size), size / (source.height || size));
            image.setDisplaySize((source.width || size) * ratio, (source.height || size) * ratio);
            return this.add(image);
        }

        const symbols = {
            dagger: '†',
            bow: '➶',
            staff: '✦',
            arrow: '➤',
            bone: '◇'
        };

        return this.text(
            x, y,
            symbols[id] || id.slice(0, 3).toUpperCase(),
            13,
            '#e8cf98'
        ).setOrigin(0.5);
    }

    itemTooltip(item, pointer) {
        if (!item) return;

        this.tooltip.removeAll(true);

        const definition = this.inventory.getDefinition(item.id) || {};
        const lines = [
            definition.name || item.name || item.id,
            definition.itemType || definition.type || 'Item',
            definition.description || '',
            ...Object.entries(definition.stats || {})
                .filter(([, value]) => Number(value) !== 0)
                .map(([key, value]) => `${key}: +${value}`)
        ];

        const width = 245;
        const height = Math.max(90, lines.length * 19 + 20);

        const bg = this.scene.add.rectangle(
            0, 0, width, height, 0x10151e, 0.98
        ).setOrigin(0);

        bg.setStrokeStyle(2, 0xc2a26d);
        this.tooltip.add(bg);

        lines.forEach((line, i) => {
            const text = this.scene.add.text(
                10, 10 + i * 19, line,
                {
                    fontFamily: 'Arial',
                    fontSize: i === 0 ? '14px' : '12px',
                    color: i === 0 ? '#f6d58e' : '#eeeeee',
                    wordWrap: { width: width - 20 }
                }
            );

            this.tooltip.add(text);
        });

        const px = pointer?.x ?? this.scene.scale.width / 2;
        const py = pointer?.y ?? this.scene.scale.height / 2;

        this.tooltip.setPosition(
            Phaser.Math.Clamp(px + 12, 0, Math.max(0, this.scene.scale.width - width)),
            Phaser.Math.Clamp(py + 12, 0, Math.max(0, this.scene.scale.height - height))
        );

        this.tooltip.setVisible(true);
    }

    hideTooltip() {
        this.tooltip.setVisible(false);
    }

    drawEquipment(slot, x, y, size) {
        const background = this.rect(x, y, size, size, 0x111821, 0x8a704b);
        const item = this.inventory.getEquipped(slot);

        if (item) {
            this.icon(item.id, x + size / 2, y + size / 2, size - 12);
        } else {
            this.text(
                x + size / 2, y + size / 2,
                slot.slice(0, 2).toUpperCase(),
                11, '#77818d'
            ).setOrigin(0.5);
        }

        this.text(x + size / 2, y + size + 2, slot.toUpperCase(), 9, '#d9bd8a').setOrigin(0.5, 0);

        // Hit area acima do sprite e das legendas: o slot inteiro recebe o clique.
        const hitArea = this.add(this.scene.add.rectangle(x, y, size, size, 0xffffff, 0.001).setOrigin(0));
        hitArea.setInteractive({ useHandCursor: !!item });

        hitArea.on('pointerover', pointer => {
            if (item) this.itemTooltip(item, pointer);
        });

        hitArea.on('pointerout', () => this.hideTooltip());

        hitArea.on('pointerdown', pointer => {
            pointer.event?.stopPropagation();
            this.hideTooltip();
            this.selectedIndex = null;
            this.selectedEquipment = item ? slot : null;
            this.draw();
        });
    }

    drawBagSlot(index, x, y, size) {
        const item = this.inventory.items[index];

        const background = this.rect(
            x, y, size, size,
            item ? 0x2c261f : 0x151a20,
            0x685b48
        );

        if (!item) {
            const emptyHit = this.add(this.scene.add.rectangle(x, y, size, size, 0xffffff, 0.001).setOrigin(0));
            emptyHit.setInteractive({useHandCursor:false});
            return;
        }

        this.icon(item.id, x + size / 2, y + size / 2, size - 16);

        if (item.quantity > 1) {
            this.text(
                x + size - 4,
                y + size - 4,
                String(item.quantity),
                11, '#ffdf83'
            ).setOrigin(1, 1).setDepth(1);
        }

        // Zona de interação fixa no topo: independe dos pixels transparentes do GIF.
        const hitArea = this.add(this.scene.add.rectangle(x, y, size, size, 0xffffff, 0.001).setOrigin(0));
        hitArea.setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', pointer => {
            this.itemTooltip(item, pointer);
        });

        hitArea.on('pointerout', () => this.hideTooltip());

        hitArea.on('pointerdown', pointer => {
            pointer.event?.stopPropagation();
            this.hideTooltip();
            this.selectedEquipment = null;
            this.selectedIndex = index;
            this.draw();
        });
    }

    actionEquip() {
        if (this.selectedIndex === null) return;

        const result = this.inventory.equipItem(this.selectedIndex);

        if (result.success) {
            this.scene.applyEquipmentStats?.();
            this.scene.saveProgress?.();
            this.selectedIndex = null;
        }

        this.message = result.success ? 'Item equipado.' : result.message;
        this.draw();
    }

    actionDrop() {
        if (this.selectedIndex === null) return;
        const item=this.inventory.getItemAt(this.selectedIndex);
        if (!item) return;
        if (!this.scene.multiplayerSystem?.ready) {
            this.message='Conecte-se ao servidor para dropar itens.';
        } else {
            this.scene.multiplayerSystem.send({type:'drop_item',index:this.selectedIndex,quantity:1});
            this.message='Solicitando descarte no chão...';
            this.selectedIndex=null;
        }
        this.draw();
    }

    actionUnequip() {
        if (!this.selectedEquipment) return;

        const removed = this.inventory.unequipItem(this.selectedEquipment);

        if (removed) {
            this.scene.applyEquipmentStats?.();
            this.scene.saveProgress?.();
            this.selectedEquipment = null;
        }

        this.message = removed ? 'Item removido.' : 'Mochila cheia.';
        this.draw();
    }

    draw() {
        this.container.removeAll(true);
        this.hideTooltip();

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        const panelW = 820;
        const panelH = 520;
        const scale = Math.max(0.2, Math.min(
            1,
            (width - 12) / panelW,
            (height - 12) / panelH
        ));

        this.container.setScale(scale);

        const x = (width - panelW * scale) / 2;
        const y = (height - panelH * scale) / 2;

        if (!this.hasWindowPosition) this.container.setPosition(x, y);
        else this.container.setPosition(Phaser.Math.Clamp(this.container.x,-panelW*scale+80,width-80),Phaser.Math.Clamp(this.container.y,0,height-40));

        this.rect(0, 0, panelW, panelH, 0x1a1717, 0xb39362);

        this.rect(8, 8, 480, 504, 0x12222a, 0x8d7351);
        this.rect(496, 8, 316, 504, 0x241b18, 0x8d7351);

        const player = this.scene.player;

        this.text(
            180, 18,
            `${player.playerName || 'Knight'} - Level ${player.level}`,
            23, '#f5d59b'
        ).setOrigin(0.5, 0);

        const dragTitle = this.text(600, 20, 'ITEMS BAG', 20, '#f1d49a');
        dragTitle.setInteractive({useHandCursor:true});
        this.scene.input.setDraggable(dragTitle);
        dragTitle.on('drag', pointer => {
            const dx=(pointer.position.x-pointer.prevPosition.x);
            const dy=(pointer.position.y-pointer.prevPosition.y);
            this.container.x=Phaser.Math.Clamp(this.container.x+dx,-(820*this.container.scaleX)+80,this.scene.scale.width-80);
            this.container.y=Phaser.Math.Clamp(this.container.y+dy,0,this.scene.scale.height-40);
            this.hasWindowPosition = true;
        });

        this.button(765, 18, 34, 32, 'X', () => this.hide());

        ARMOR.forEach((slot, i) => {
            this.drawEquipment(slot, 20, 70 + i * 72, 55);
        });

        ACCESSORIES.forEach((slot, i) => {
            this.drawEquipment(slot, 415, 110 + i * 92, 55);
        });

        // Visual do personagem: usa o sprite já carregado.
        const texture = `player-idle-${player.facing || 'down'}-1`;

        if (this.scene.textures.exists(texture)) {
            const image = this.scene.add.image(245, 245, texture);
            image.setDisplaySize(190, 240);
            this.add(image);
        } else {
            this.text(210, 240, 'PERSONAGEM', 16);
        }

        this.drawEquipment('Weapon', 25, 440, 55);

        const attack = Math.floor(player.stats.physicalAttack || 0);
        const magic = Math.floor(player.stats.magicalAttack || 0);
        const defense = Math.floor(player.stats.physicalDefense || 0);

        this.text(110, 445, `DAMAGE: ${attack}`, 16, '#e9c785');
        this.text(110, 470, `MAGIC: ${magic}`, 14, '#91bfff');
        this.text(285, 445, `ARMOR: ${defense}`, 16, '#e9c785');

        const columns = 5;
        const size = 52;
        const gap = 7;
        const startX = 511;
        const startY = 68;

        for (let i = 0; i < this.inventory.capacity; i++) {
            const col = i % columns;
            const row = Math.floor(i / columns);

            this.drawBagSlot(
                i,
                startX + col * (size + gap),
                startY + row * (size + gap),
                size
            );
        }

        this.text(
            510, 316,
            `${this.inventory.items.length}/${this.inventory.capacity} slots`,
            13, '#c9b58e'
        );

        this.text(
            510, 340,
            `Gold: ${player.currency?.gold || 0}`,
            14, '#f1d17b'
        );

        if (this.selectedIndex !== null) {
            const item = this.inventory.getItemAt(this.selectedIndex);

            if (item) {
                this.rect(503, 370, 302, 130, 0x121922, 0x9d8058);
                this.text(513, 380, item.name || item.id, 14, '#f4d28b');

                this.button(510, 410, 90, 34, 'EQUIP', () => this.actionEquip());
                this.button(608, 410, 90, 34, 'DROP', () => this.actionDrop());
                this.button(706, 410, 90, 34, 'CLOSE', () => {
                    this.selectedIndex = null;
                    this.draw();
                });
            }
        }

        if (this.selectedEquipment) {
            this.rect(503, 370, 302, 130, 0x121922, 0x9d8058);
            this.text(513, 380, this.selectedEquipment, 14, '#f4d28b');

            this.button(510, 410, 135, 34, 'UNEQUIP', () => this.actionUnequip());
            this.button(660, 410, 135, 34, 'CLOSE', () => {
                this.selectedEquipment = null;
                this.draw();
            });
        }

        if (this.message) {
            this.text(510, 477, this.message, 12, '#f0d7a7');
        }
    }

    show() {
        this.visible = true;
        this.draw();
        this.container.setVisible(true);
    }

    hide() {
        this.visible = false;
        this.selectedIndex = null;
        this.selectedEquipment = null;
        this.container.setVisible(false);
        this.hideTooltip();
    }

    toggle() {
        if (this.visible) this.hide();
        else this.show();
    }

    refresh() {
        if (this.visible) this.draw();
    }
}
