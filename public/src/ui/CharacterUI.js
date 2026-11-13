
export default class CharacterUI {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.visible = false;

        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(300000)
            .setVisible(false);

        this.draw();
    }

    formatName(key) {
        const names = {
            health: 'Vida',
            maxHealth: 'Vida máxima',
            mana: 'Mana',
            maxMana: 'Mana máxima',
            physicalAttack: 'Ataque físico',
            magicalAttack: 'Ataque mágico',
            physicalDefense: 'Defesa física',
            magicalDefense: 'Defesa mágica',
            moveSpeed: 'Velocidade',
            criticalChance: 'Chance crítica',
            criticalDamage: 'Dano crítico',
            evasion: 'Evasão',
            accuracy: 'Precisão'
        };

        return names[key] || key;
    }

    draw() {
        this.container.removeAll(true);

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        const panelWidth = 390;
        const panelHeight = 590;
        const scale = Math.min(
            1,
            (width - 12) / panelWidth,
            (height - 12) / panelHeight
        );

        this.container.setScale(Math.max(0.2, scale));
        if (!this.hasWindowPosition) this.container.setPosition(
            (width - panelWidth * scale) / 2,
            (height - panelHeight * scale) / 2
        );

        const bg = this.scene.add.rectangle(
            0, 0, panelWidth, panelHeight, 0x1c202a, 0.98
        ).setOrigin(0);

        bg.setStrokeStyle(2, 0xb69b70);
        bg.setInteractive();
        this.container.add(bg);

        const title = this.scene.add.text(
            15, 15,
            `CHARACTER - LEVEL ${this.player.level}`,
            {
                fontSize: '18px',
                color: '#f2d59c',
                fontStyle: 'bold'
            }
        );

        this.container.add(title);
        title.setInteractive({ useHandCursor: true });
        this.scene.input.setDraggable(title);
        title.on('drag', (pointer, dragX, dragY) => {
            this.container.x += pointer.position.x - pointer.prevPosition.x;
            this.container.y += pointer.position.y - pointer.prevPosition.y;
            this.hasWindowPosition = true;
        });

        const close = this.scene.add.rectangle(
            panelWidth - 26, 28, 35, 35, 0x663339
        );

        close.setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.hide());

        this.container.add(close);

        this.container.add(
            this.scene.add.text(
                panelWidth - 26, 28, 'X',
                { fontSize: '17px', color: '#ffffff' }
            ).setOrigin(0.5)
        );

        const stats = this.player.stats;
        let y = 65;

        for (const [key, value] of Object.entries(stats)) {
            const formatted = typeof value === 'number'
                ? Number(value.toFixed(2))
                : value;

            this.container.add(
                this.scene.add.text(
                    18, y,
                    `${this.formatName(key)}: ${formatted}`,
                    {
                        fontSize: '14px',
                        color: '#e5e9f0'
                    }
                )
            );

            y += 27;
            if (y > 365) break;
        }

        // Painel provisório de progressão: mostra o bônus aplicado no CombatSystem.
        this.container.add(this.scene.add.rectangle(10, 391, panelWidth - 20, 151, 0x111b29).setOrigin(0).setStrokeStyle(1, 0x927851));
        this.container.add(this.scene.add.text(18, 398, 'PROGRESSÃO DE COMBATE', {fontSize:'16px',color:'#f2d59c'}));
        const skillNames = {meleeCombat:'Melee Combat',bowCrossbow:'Bow / Crossbow',rangedWeapons:'Ranged Weapons',magicItems:'Magic Items'};
        let skillY = 425;
        for (const [key, label] of Object.entries(skillNames)) {
            const skill = Math.max(1, Number(this.player.skills?.[key]) || 1);
            const level = Math.max(1, Number(this.player.level) || 1);
            const bonus = ((level - 1) * 0.5 + (skill - 1)).toFixed(1);
            this.container.add(this.scene.add.text(18, skillY, `${label}: ${skill}   (+${bonus}% dano)`, {fontSize:'13px',color:'#e8d9b6'}));
            skillY += 27;
        }
        this.container.add(
            this.scene.add.text(
                18, 558,
                `Gold: ${this.player.currency?.gold || 0}`,
                {
                    fontSize: '15px',
                    color: '#f1d17b'
                }
            )
        );
    }

    show() {
        this.visible = true;
        this.draw();
        this.container.setVisible(true);
    }

    hide() {
        this.visible = false;
        this.container.setVisible(false);
    }

    toggle() {
        if (this.visible) this.hide();
        else this.show();
    }

    refresh() {
        if (this.visible) this.draw();
    }
}
