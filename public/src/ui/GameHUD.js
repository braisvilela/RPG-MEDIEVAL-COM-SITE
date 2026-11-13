
import Phaser from 'phaser';

export default class GameHUD {
    constructor(scene) {
        this.scene = scene;

        this.container = scene.add.container(12, 12);
        this.container.setScrollFactor(0);
        this.container.setDepth(200000);

        this.lastDisplay = '';

        this.background = scene.add.graphics();
        this.bars = scene.add.graphics();

        this.title = scene.add.text(14, 10, '', {
            fontFamily: 'Arial',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#f5e6bc'
        });

        const valueStyle = {
            fontFamily: 'Arial',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        };

        this.healthText = scene.add.text(
            130, 48, '', valueStyle
        ).setOrigin(0.5);

        this.manaText = scene.add.text(
            130, 75, '', valueStyle
        ).setOrigin(0.5);

        this.expText = scene.add.text(
            130, 102, '', valueStyle
        ).setOrigin(0.5);

        this.goldText = scene.add.text(14, 123, '', {
            fontFamily: 'Arial',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#f4cf72',
            stroke: '#000000',
            strokeThickness: 2
        });

        this.container.add([
            this.background,
            this.title,
            this.bars,
            this.healthText,
            this.manaText,
            this.expText,
            this.goldText
        ]);

        // Arraste pelo cabeçalho; a posição é persistida localmente.
        this.dragHandle = scene.add.zone(130, 19, 250, 34)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.container.add(this.dragHandle);
        scene.input.setDraggable(this.dragHandle);
        this.dragHandle.on('dragstart', pointer => {
            this.dragStart = {
                pointerX: pointer.x, pointerY: pointer.y,
                x: this.container.x, y: this.container.y
            };
        });
        this.dragHandle.on('drag', pointer => {
            if (!this.dragStart) return;
            this.container.setPosition(
                this.dragStart.x + pointer.x - this.dragStart.pointerX,
                this.dragStart.y + pointer.y - this.dragStart.pointerY
            );
            this.clampPosition();
        });
        this.dragHandle.on('dragend', () => {
            this.dragStart = null;
            try {
                localStorage.setItem('rpg_hud_position_v1', JSON.stringify({
                    x: this.container.x, y: this.container.y
                }));
            } catch (error) { console.warn('HUD não salva:', error); }
        });
        try {
            const saved = JSON.parse(localStorage.getItem('rpg_hud_position_v1'));
            if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
                this.container.setPosition(saved.x, saved.y);
            }
        } catch (error) { /* Usa posição padrão */ }
        this.clampPosition();
        this.update();
    }

    clampPosition() {
        const w = this.scene.scale.width, h = this.scene.scale.height;
        this.container.x = Phaser.Math.Clamp(this.container.x, 0, Math.max(0, w - 260));
        this.container.y = Phaser.Math.Clamp(this.container.y, 0, Math.max(0, h - 151));
    }

    drawBar(x, y, width, height, percent, color) {
        const p = Phaser.Math.Clamp(
            Number(percent) || 0,
            0,
            1
        );

        this.bars.fillStyle(0x080d14, 1);
        this.bars.fillRoundedRect(
            x, y, width, height, 5
        );

        const innerWidth = width - 4;
        const innerHeight = height - 4;

        if (p > 0) {
            this.bars.fillStyle(color, 1);
            this.bars.fillRoundedRect(
                x + 2,
                y + 2,
                Math.max(1, innerWidth * p),
                innerHeight,
                3
            );
        }

        this.bars.lineStyle(1, 0x637185, 1);
        this.bars.strokeRoundedRect(
            x, y, width, height, 5
        );
    }

    formatValue(value) {
        return Math.floor(Number(value) || 0)
            .toLocaleString('pt-BR');
    }

    update() {
        const player = this.scene.player;
        if (!player) return;

        const stats = player.stats;

        const health = Number(stats.health) || 0;
        const maxHealth = Math.max(
            1, Number(stats.maxHealth) || 1
        );

        const mana = Number(stats.mana) || 0;
        const maxMana = Math.max(
            0, Number(stats.maxMana) || 0
        );

        const experience = Number(player.experience) || 0;
        const expMax = Math.max(
            1,
            Number(player.experienceToNextLevel) || 1
        );

        const gold = Number(player.currency?.gold) || 0;

        const display = [
            player.playerName,
            player.level,
            health,
            maxHealth,
            mana,
            maxMana,
            experience,
            expMax,
            gold
        ].join('|');

        if (display === this.lastDisplay) return;
        this.lastDisplay = display;

        this.background.clear();
        this.background.fillStyle(0x121b29, 0.94);
        this.background.fillRoundedRect(
            0, 0, 260, 151, 9
        );

        this.background.lineStyle(2, 0x6a7d96);
        this.background.strokeRoundedRect(
            0, 0, 260, 151, 9
        );

        this.title.setText(
            `${player.playerName}  |  LV. ${player.level}`
        );

        this.bars.clear();

        // HP
        this.drawBar(
            14, 37, 232, 22,
            health / maxHealth,
            0xd83d48
        );

        // MP
        this.drawBar(
            14, 64, 232, 22,
            maxMana > 0 ? mana / maxMana : 0,
            0x357de0
        );

        // EXP
        this.drawBar(
            14, 91, 232, 22,
            experience / expMax,
            0xe0b64b
        );

        this.healthText.setText(
            `${this.formatValue(health)} / ${this.formatValue(maxHealth)}`
        );

        this.manaText.setText(
            `${this.formatValue(mana)} / ${this.formatValue(maxMana)}`
        );

        this.expText.setText(
            `${this.formatValue(experience)} / ${this.formatValue(expMax)}`
        );

        this.goldText.setText(
            `Gold: ${this.formatValue(gold)}`
        );
    }
}
