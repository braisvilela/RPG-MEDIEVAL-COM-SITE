
export default class LootUI {

    constructor(scene) {
        this.scene = scene;
        this.monster = null;
        this.visible = false;

        this.panelWidth = 310;
        this.panelHeight = 310;

        this.panelX = 0;
        this.panelY = 0;

        this.container = scene.add.container(0, 0);
        this.container.setScrollFactor(0);
        this.container.setDepth(400000);
        this.container.setVisible(false);

        // Um único gerenciador de cliques.
        // Usa as coordenadas reais da tela do jogo.
        this.handlePointerDown = this.handlePointerDown.bind(this);

        scene.input.on(
            'pointerdown',
            this.handlePointerDown
        );

        scene.events.once('shutdown', () => {
            scene.input.off(
                'pointerdown',
                this.handlePointerDown
            );
        });
    }

    // =====================================
    // POSIÇÃO DOS ELEMENTOS
    // =====================================

    getPanelPosition() {
        const { width, height } = this.scene.scale;

        return {
            x: (width - this.panelWidth) / 2,
            y: (height - this.panelHeight) / 2
        };
    }

    isInside(px, py, x, y, width, height) {
        return (
            px >= x &&
            px <= x + width &&
            py >= y &&
            py <= y + height
        );
    }

    // =====================================
    // ABRIR E FECHAR
    // =====================================

    open(monster) {
        if (!monster?.isDead) return;
        if (monster.corpseHidden) return;

        this.monster = monster;
        this.visible = true;

        this.draw();
        this.container.setVisible(true);
    }

    close() {
        this.visible = false;
        this.monster = null;
        this.container.setVisible(false);
    }

    // =====================================
    // DESENHAR BOTÃO
    // =====================================

    createButton(
        x,
        y,
        width,
        height,
        label,
        color,
        borderColor
    ) {
        const background = this.scene.add.rectangle(
            x,
            y,
            width,
            height,
            color
        );

        background.setStrokeStyle(
            2,
            borderColor
        );

        const text = this.scene.add.text(
            x,
            y,
            label,
            {
                fontFamily: 'Arial',
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        // Os elementos são apenas visuais.
        // O clique é processado por handlePointerDown().
        this.container.add([
            background,
            text
        ]);
    }

    // =====================================
    // DESENHAR JANELA
    // =====================================

    draw() {
        this.container.removeAll(true);

        if (!this.monster) return;

        const position = this.getPanelPosition();

        this.panelX = position.x;
        this.panelY = position.y;

        // Os filhos usam coordenadas locais.
        this.container.setPosition(
            this.panelX,
            this.panelY
        );

        // Fundo do painel
        const bg = this.scene.add.rectangle(
            0,
            0,
            this.panelWidth,
            this.panelHeight,
            0x202733,
            0.98
        ).setOrigin(0);

        bg.setStrokeStyle(
            2,
            0x8c9aad
        );

        // O fundo bloqueia cliques no mundo.
        bg.setInteractive();

        this.container.add(bg);

        // Título
        const title = this.scene.add.text(
            15,
            15,
            `${this.monster.monsterName} Lv. ${this.monster.level}`,
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff'
            }
        );

        this.container.add(title);

        // =====================================
        // BOTÃO X
        // =====================================

        this.createButton(
            this.panelWidth - 25,
            25,
            36,
            36,
            'X',
            0x63313a,
            0xc77b82
        );

        // =====================================
        // ITENS
        // =====================================

        const items = this.monster.loot ?? [];

        if (items.length === 0) {

            const emptyText = this.scene.add.text(
                this.panelWidth / 2,
                125,
                'O corpo está vazio.',
                {
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    color: '#aeb9c9'
                }
            ).setOrigin(0.5);

            this.container.add(emptyText);
        }

        items.slice(0, 6).forEach((item, index) => {

            const col = index % 2;
            const row = Math.floor(index / 2);

            const sx = 15 + col * 145;
            const sy = 55 + row * 58;

            const slot = this.scene.add.rectangle(
                sx,
                sy,
                135,
                50,
                0x111923
            ).setOrigin(0);

            slot.setStrokeStyle(
                1,
                0x536174
            );

            this.container.add(slot);

            const textureKey = `item-${item.id}`;

            if (
                this.scene.textures.exists(textureKey)
            ) {
                const icon = this.scene.add.image(
                    sx + 25,
                    sy + 25,
                    textureKey
                );

                icon.setDisplaySize(32, 32);
                this.container.add(icon);
            }

            const text = this.scene.add.text(
                sx + 49,
                sy + 10,
                `${item.name}\nx${item.quantity}`,
                {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    color: item.type === 'currency'
                        ? '#f0d07d'
                        : '#ffffff'
                }
            );

            this.container.add(text);
        });

        // =====================================
        // BOTÃO PEGAR TUDO
        // =====================================

        this.createButton(
            this.panelWidth / 2,
            this.panelHeight - 34,
            200,
            42,
            'PEGAR TUDO',
            0x376c48,
            0x81c996
        );
    }

    // =====================================
    // GERENCIADOR DE CLIQUES
    // =====================================

    handlePointerDown(pointer) {

        if (!this.visible || !this.monster) {
            return;
        }

        // pointer.x/y são coordenadas do canvas,
        // sem deslocamento da câmera do mundo.
        const localX = pointer.x - this.panelX;
        const localY = pointer.y - this.panelY;

        // =====================================
        // CLIQUE NO X
        // =====================================

        const closeX = this.panelWidth - 25;
        const closeY = 25;

        if (
            this.isInside(
                localX,
                localY,
                closeX - 18,
                closeY - 18,
                36,
                36
            )
        ) {
            this.close();
            return;
        }

        // =====================================
        // CLIQUE EM PEGAR TUDO
        // =====================================

        const takeX = this.panelWidth / 2;
        const takeY = this.panelHeight - 34;

        if (
            this.isInside(
                localX,
                localY,
                takeX - 100,
                takeY - 21,
                200,
                42
            )
        ) {
            this.takeAll();
            return;
        }

        // =====================================
        // CLIQUE EM UM ITEM
        // =====================================

        const items = this.monster.loot ?? [];

        for (
            let index = 0;
            index < Math.min(items.length, 6);
            index++
        ) {
            const col = index % 2;
            const row = Math.floor(index / 2);

            const sx = 15 + col * 145;
            const sy = 55 + row * 58;

            if (
                this.isInside(
                    localX,
                    localY,
                    sx,
                    sy,
                    135,
                    50
                )
            ) {
                this.takeItem(index);
                return;
            }
        }
    }

    // =====================================
    // PEGAR ITEM INDIVIDUAL
    // =====================================

    takeItem(index) {

        if (!this.monster?.isDead) return;

        const item = this.monster.loot?.[index];

        if (!item) return;

        if (item.type === 'currency') {

            this.scene.player.currency.gold +=
                Number(item.quantity) || 0;

            this.monster.loot.splice(index, 1);

        } else {

            const added =
                this.scene.inventorySystem.addItem(
                    item.id,
                    item.quantity,
                    item.name
                );

            if (!added) {
                console.warn(
                    'Inventário cheio. Não foi possível coletar:',
                    item.name
                );
                return;
            }

            this.monster.loot.splice(index, 1);
        }

        this.afterCollect();
    }

    // =====================================
    // PEGAR TUDO
    // =====================================

    takeAll() {

        if (!this.monster?.isDead) return;

        const result = this.scene.lootSystem.takeAll(
            this.monster,
            this.scene.player,
            this.scene.inventorySystem
        );

        console.log(
            '[LootUI] Itens coletados:',
            result.collected
        );

        this.afterCollect();
    }

    // =====================================
    // ATUALIZAR APÓS COLETA
    // =====================================

    afterCollect() {

        this.scene.inventoryUI?.refresh();
        this.scene.characterUI?.refresh();
        this.scene.updateHUD();

        this.scene.saveProgress();
        if(this.monster?.isDead && this.monster.loot.length===0){
            this.scene.multiplayerSystem?.send({type:'monster_looted',id:this.scene.monsters.indexOf(this.monster)});
        }

        if (
            !this.monster ||
            this.monster.loot.length === 0
        ) {
            this.close();
        } else {
            this.draw();
        }
    }
}
