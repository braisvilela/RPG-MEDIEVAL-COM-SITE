
import Phaser from 'phaser';

export default class DamageText {
    static show(scene, x, y, amount, options = {}) {
        if (!scene?.add || !scene?.tweens) return null;

        const value = Math.max(
            0,
            Math.floor(Number(amount) || 0)
        );

        if (value <= 0) return null;

        const critical = Boolean(options.critical);
        const received = Boolean(options.received);

        const color = critical
            ? '#ffe15a'
            : received
                ? '#ff5555'
                : '#ffbb55';

        const label = critical
            ? `CRÍTICO! ${value}`
            : `-${value}`;

        const offsetX = Phaser.Math.Between(-14, 14);

        const text = scene.add.text(
            x + offsetX,
            y - 55,
            label,
            {
                fontFamily: 'Arial',
                fontSize: critical ? '22px' : '17px',
                fontStyle: 'bold',
                color,
                stroke: '#171010',
                strokeThickness: 5,
                align: 'center'
            }
        );

        text.setOrigin(0.5);
        text.setDepth(150000);
        text.setScale(critical ? 1.15 : 1);

        scene.tweens.add({
            targets: text,
            y: text.y - (critical ? 65 : 48),
            x: text.x + Phaser.Math.Between(-8, 8),
            alpha: 0,
            scale: critical ? 1.35 : 1.08,
            duration: critical ? 1100 : 850,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (text.active) text.destroy();
            }
        });

        return text;
    }

    static dealt(scene, target, amount, critical = false) {
        if (!target) return;

        return this.show(
            scene,
            target.x,
            target.y,
            amount,
            { critical }
        );
    }

    static received(scene, player, amount) {
        if (!player) return;

        return this.show(
            scene,
            player.x,
            player.y,
            amount,
            { received: true }
        );
    }
}
