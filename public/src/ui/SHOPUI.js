import Phaser from 'phaser';

export default class ShopUI {
    constructor(scene, inventory) {
        this.scene = scene;
        this.inventory = inventory;
        this.visible = false;
        this.selectedIndex = null;
        this.confirmMode = null;
        this.message = '';
        this.container = scene.add.container(0, 0)
            .setScrollFactor(0).setDepth(400000).setVisible(false);
        this.draw();
    }

    add(object) { this.container.add(object); return object; }
    text(x, y, value, size = 14, color = '#ffffff') {
        return this.add(this.scene.add.text(x, y, String(value), {
            fontFamily: 'Arial', fontSize: `${size}px`, color,
            stroke: '#0a0d12', strokeThickness: 2
        }));
    }
    rect(x, y, w, h, color = 0x19232e, border = 0x867453) {
        const obj = this.scene.add.rectangle(x, y, w, h, color, 0.98).setOrigin(0);
        obj.setStrokeStyle(1, border);
        return this.add(obj);
    }
    button(x, y, w, h, label, callback, color = 0x51402d) {
        const bg = this.rect(x, y, w, h, color, 0xbfa477);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', pointer => {
            pointer.event?.stopPropagation();
            callback();
        });
        this.text(x + w / 2, y + h / 2, label, 13, '#fff2d4').setOrigin(0.5);
        return bg;
    }
    isEquippable(item) {
        const def = this.inventory.getDefinition(item.id) || {};
        return Boolean(this.inventory.getEquipmentSlot(item.id)) ||
            ['weapon', 'armor', 'armour', 'equipment', 'accessory'].includes(
                String(def.type || '').toLowerCase()
            );
    }
    isDrop(item) {
        const def = this.inventory.getDefinition(item.id) || {};
        return !this.isEquippable(item) &&
            ['loot', 'drop', 'material'].includes(String(def.type || '').toLowerCase());
    }
    price(item) {
        const def = this.inventory.getDefinition(item.id) || {};
        const price = Number(def.sellPrice ?? 0);
        return Number.isFinite(price) ? Math.max(0, Math.floor(price)) : 0;
    }
    sellSelected() {
        const item = this.inventory.getItemAt(this.selectedIndex);
        if (!item) { this.message = 'Selecione um item.'; this.draw(); return; }
        const total = this.price(item) * item.quantity;
        const removed = this.inventory.removeItemAt(this.selectedIndex, item.quantity);
        if (removed) {
            this.scene.player.currency.gold = (Number(this.scene.player.currency.gold) || 0) + total;
            this.scene.saveProgress?.();
            this.message = `Vendido por ${total} Gold.`;
            this.selectedIndex = null;
        } else this.message = 'Não foi possível vender.';
        this.draw();
    }
    bulkSell(mode) {
        if (this.confirmMode !== mode) {
            this.confirmMode = mode;
            this.selectedIndex = null;
            this.message = mode === 'drops'
                ? 'Clique em CONFIRMAR para vender todos os drops.'
                : 'ATENÇÃO: venderá também armas e equipamentos da mochila.';
            this.draw();
            return;
        }
        let gold = 0;
        let count = 0;
        for (let i = this.inventory.items.length - 1; i >= 0; i--) {
            const item = this.inventory.items[i];
            if (mode === 'drops' && !this.isDrop(item)) continue;
            const quantity = item.quantity;
            const price = this.price(item) * quantity;
            if (this.inventory.removeItemAt(i, quantity)) {
                gold += price;
                count += quantity;
            }
        }
        this.scene.player.currency.gold = (Number(this.scene.player.currency.gold) || 0) + gold;
        this.scene.saveProgress?.();
        this.confirmMode = null;
        this.message = count ? `${count} item(ns) vendidos por ${gold} Gold.` : 'Nenhum item elegível para venda.';
        this.draw();
    }
    draw() {
        this.container.removeAll(true);
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const panelW = 680, panelH = 490;
        const scale = Math.max(0.25, Math.min(1, (width - 16) / panelW, (height - 16) / panelH));
        this.container.setScale(scale);
        if (!this.hasWindowPosition) this.container.setPosition((width - panelW * scale) / 2, (height - panelH * scale) / 2);

        // Bloqueia cliques no mapa quando a loja está aberta.
        const overlay = this.scene.add.rectangle(
            -(width / scale), -(height / scale), width * 3 / scale, height * 3 / scale,
            0x000000, 0.62
        ).setOrigin(0).setInteractive();
        this.add(overlay);
        this.rect(0, 0, panelW, panelH, 0x17212b, 0xb99a62);
        const dragTitle = this.text(20, 16, '(NPC) Mark — Comerciante', 22, '#f3d18c');
        dragTitle.setInteractive({useHandCursor:true});
        this.scene.input.setDraggable(dragTitle);
        dragTitle.on('drag',pointer=>{
            this.container.x += pointer.position.x-pointer.prevPosition.x;
            this.container.y += pointer.position.y-pointer.prevPosition.y;
            this.hasWindowPosition=true;
        });
        this.button(624, 14, 40, 34, 'X', () => this.hide());
        this.text(20, 54, 'Selecione um item para vender a pilha inteira.', 13, '#d3d8de');

        this.button(20, 83, 210, 40, 'VENDER DROPS', () => this.bulkSell('drops'));
        this.button(239, 83, 210, 40, 'VENDER TUDO', () => this.bulkSell('all'), 0x653b34);
        if (this.confirmMode) {
            this.button(458, 83, 206, 40, 'CONFIRMAR VENDA', () => this.bulkSell(this.confirmMode), 0x356449);
        } else {
            this.button(458, 83, 206, 40, 'CANCELAR', () => {
                this.selectedIndex = null; this.message = ''; this.draw();
            }, 0x39485a);
        }

        const cols = 5, size = 54, gap = 7, startX = 20, startY = 147;
        for (let i = 0; i < this.inventory.capacity; i++) {
            const x = startX + (i % cols) * (size + gap);
            const y = startY + Math.floor(i / cols) * (size + gap);
            const item = this.inventory.getItemAt(i);
            const selected = this.selectedIndex === i;
            const bg = this.rect(x, y, size, size,
                selected ? 0x5d5032 : item ? 0x303943 : 0x202832,
                selected ? 0xf5d17a : 0x5e6977);
            if (!item) continue;
            const key = `item-${item.id}`;
            const animatedKey = `animated-item-${item.id}`;
            if (this.scene.textures.exists(animatedKey) && this.scene.anims.exists(animatedKey)) {
                const image = this.scene.add.sprite(x + size / 2, y + size / 2, animatedKey);
                image.setDisplaySize(34, 34).play(animatedKey);
                this.add(image);
            } else if (this.scene.textures.exists(key)) {
                const image = this.scene.add.image(x + size / 2, y + size / 2, key);
                image.setDisplaySize(34, 34);
                this.add(image);
            } else this.text(x + 6, y + 9, item.id.slice(0, 5), 12, '#ffe2a0');
            this.text(x + size - 4, y + size - 16, String(item.quantity), 11, '#ffe1a1').setOrigin(1, 0);
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', pointer => {
                pointer.event?.stopPropagation();
                this.selectedIndex = i;
                this.confirmMode = null;
                this.message = '';
                this.draw();
            });
        }

        this.rect(343, 145, 321, 241, 0x222b35, 0x786b53);
        const item = this.inventory.getItemAt(this.selectedIndex);
        if (item) {
            const def = this.inventory.getDefinition(item.id) || {};
            this.text(357, 162, def.name || item.name || item.id, 18, '#ffe0a0');
            this.text(357, 202, `Quantidade: ${item.quantity}`, 14);
            this.text(357, 229, `Preço unitário: ${this.price(item)} Gold`, 14);
            this.text(357, 256, `Total: ${this.price(item) * item.quantity} Gold`, 16, '#f8d079');
            this.button(357, 321, 136, 43, 'VENDER', () => this.sellSelected(), 0x376146);
            this.button(505, 321, 145, 43, 'CANCELAR', () => {
                this.selectedIndex = null; this.message = ''; this.draw();
            }, 0x485263);
        } else {
            this.text(357, 169, 'Nenhum item selecionado.', 15, '#c5cbd1');
            this.text(357, 208, 'Equipamentos em uso não', 13, '#d3d8de');
            this.text(357, 229, 'são vendidos.', 13, '#d3d8de');
        }
        this.text(20, 408, `Gold: ${Math.floor(Number(this.scene.player.currency?.gold) || 0).toLocaleString('pt-BR')}`, 17, '#f6ce72');
        this.text(20, 440, this.message, 13, '#ffdf9e');
        this.text(545, 449, 'FECHAR LOJA', 12, '#e4d1ae');
        this.button(545, 420, 119, 25, 'FECHAR', () => this.hide(), 0x4b3b3b);
    }
    show() {
        this.scene.inventoryUI?.hide();
        this.scene.characterUI?.hide();
        this.scene.lootUI?.close?.();
        this.visible = true;
        this.selectedIndex = null;
        this.confirmMode = null;
        this.message = '';
        this.draw();
        this.container.setVisible(true);
        this.scene.player?.setVelocity(0, 0);
        this.scene.combatSystem?.cancelTarget();
    }
    hide() {
        this.visible = false;
        this.selectedIndex = null;
        this.confirmMode = null;
        this.container.setVisible(false);
    }
    refresh() { if (this.visible) this.draw(); }
}
