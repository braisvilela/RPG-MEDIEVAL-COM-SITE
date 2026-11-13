export default class SpellSystem {

    constructor(scene, player, spellData) {

        this.scene = scene;
        this.player = player;

        this.spell = spellData;

        this.lastCastTime = -Infinity;
    }

    cast() {

        if (this.player.isDead) return false;

        if (this.player.isCasting) return false;

        // Verificar mana
        if (this.player.stats.mana < this.spell.manaCost) {

            console.log('Mana insuficiente!');

            return false;
        }

        // Verificar recarga
        const elapsed =
            this.scene.time.now - this.lastCastTime;

        if (elapsed < this.spell.cooldown) {

            console.log('Magia em recarga!');

            return false;
        }

        // Consumir mana
        this.player.stats.mana -= this.spell.manaCost;

        this.lastCastTime = this.scene.time.now;

        this.player.isCasting = true;

        this.player.isAttacking = false;

        this.player.setVelocity(0, 0);

        // Animação de conjuração
        this.player.play(
            `player-spellcast-${this.player.facing}`
        );

        console.log(`Conjurando ${this.spell.name}...`);

        // Aplicar efeito após o tempo de conjuração
        this.scene.time.delayedCall(
            this.spell.castTime,
            () => {

                if (this.player.isDead) return;

                this.applyEffect();

                this.player.isCasting = false;

                this.player.play(
                    `player-idle-${this.player.facing}`,
                    true
                );

                console.log(`${this.spell.name} utilizada!`);
            }
        );

        return true;
    }

    // =====================================
    // EFEITOS DA MAGIA
    // =====================================

    applyEffect() {

        if (this.spell.type === 'healing') {

            this.applyHealing();
        }
    }

    applyHealing() {

        const healing = this.spell.healing;

        let amount = healing.value;

        if (healing.type === 'percentage') {

            amount =
                this.player.stats.maxHealth *
                (healing.value / 100);
        }

        const previousHealth = this.player.stats.health;

        this.player.heal(amount);

        const recovered =
            this.player.stats.health - previousHealth;

        console.log(`Heal recuperou ${recovered} HP.`);
    }
}