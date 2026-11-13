export default class StatusEffectSystem {

    constructor(scene) {

        this.scene = scene;

        this.effects = [];
    }

    // =====================================
    // ADICIONAR EFEITO
    // =====================================

    addEffect(target, config) {

        if (!target || target.isDead) return;

        const effect = {
            target,
            type: config.type,
            duration: config.duration,
            damage: config.damage || 0,
            interval: config.interval || 1000,
            nextTick: this.scene.time.now + (
                config.interval || 1000
            ),
            expiresAt: this.scene.time.now + config.duration
        };

        this.effects.push(effect);

        console.log(`Efeito aplicado: ${config.type}`);
    }

    // =====================================
    // REMOVER EFEITOS
    // =====================================

    removeEffects(target) {

        this.effects = this.effects.filter(
            effect => effect.target !== target
        );
    }

    // =====================================
    // ATUALIZAR EFEITOS
    // =====================================

    update(time) {

        for (let i = this.effects.length - 1; i >= 0; i--) {

            const effect = this.effects[i];

            if (
                !effect.target ||
                effect.target.isDead ||
                time >= effect.expiresAt
            ) {

                this.effects.splice(i, 1);

                continue;
            }

            // Efeitos que causam dano periódico
            if (time >= effect.nextTick) {

                if (effect.damage > 0) {

                    effect.target.takeDamage(
                        effect.damage
                    );
                }

                effect.nextTick =
                    time + effect.interval;
            }
        }
    }
}