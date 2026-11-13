
export default class LootSystem {
    constructor(scene) {
        this.scene = scene;
    }

    randomInt(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    }

    generate(monster) {
        const loot = [];
        const data = monster.data;

        if (data.corpse?.lootable === false) {
            return loot;
        }

        const multiplier = monster.isBoss
            ? (data.boss?.lootQuantityMultiplier ?? 1)
            : 1;

        const goldConfig = data.rewards?.gold;

        if (goldConfig) {
            const gold = this.randomInt(
                goldConfig.min,
                goldConfig.max
            );

            if (gold > 0) {
                loot.push({
                    id: 'gold',
                    name: 'Gold Coins',
                    quantity: Math.floor(gold * multiplier),
                    type: 'currency'
                });
            }
        }

        for (const drop of data.drops ?? []) {
            if (loot.length >= 6) break;

            const chance = Number(drop.chance) || 0;

            if (Math.random() * 100 >= chance) {
                continue;
            }

            const quantity = this.randomInt(
                drop.quantity?.min ?? 1,
                drop.quantity?.max ?? 1
            );

            const finalQuantity = Math.floor(
                quantity * multiplier
            );

            if (finalQuantity <= 0) continue;

            const existing = loot.find(
                item => item.id === drop.itemId
            );

            if (existing) {
                existing.quantity += finalQuantity;
            } else {
                loot.push({
                    id: drop.itemId,
                    name: this.formatName(drop.itemId),
                    quantity: finalQuantity,
                    type: 'item'
                });
            }
        }

        // The skeleton always drops the exact melee weapon visible while alive.
        if(monster.weaponId && !loot.some(item=>item.id===monster.weaponId)) {
            loot.push({id:monster.weaponId,name:this.formatName(monster.weaponId),quantity:1,type:'item'});
        }
        return loot;
    }

    formatName(id) {
        return String(id)
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    takeAll(monster, player, inventory) {
        if (!monster.isDead || !Array.isArray(monster.loot)) {
            return {
                collected: [],
                remaining: []
            };
        }

        const collected = [];
        const remaining = [];

        for (const item of monster.loot) {
            if (item.type === 'currency') {
                player.currency.gold += item.quantity;
                collected.push(item);
                continue;
            }

            const added = inventory.addItem(
                item.id,
                item.quantity,
                item.name
            );

            if (added) {
                collected.push(item);
            } else {
                remaining.push(item);
            }
        }

        monster.loot = remaining;

        return { collected, remaining };
    }
}
