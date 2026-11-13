
export default class InventorySystem {
    constructor(capacity = 20) {
        this.capacity = capacity;
        this.items = [];
        this.itemDefinitions = {};
        this.onChange = null;

        this.equipment = {
            Head: null,
            Arms: null,
            Torso: null,
            Legs: null,
            Feet: null,
            Amulet: null,
            Ring: null,
            Weapon: null
        };
    }

    registerItem(definition) {
        if (!definition || !definition.id) return;

        this.itemDefinitions[definition.id] = {
            ...definition
        };
    }

    registerItems(...definitions) {
        for (const definition of definitions.flat()) {
            this.registerItem(definition);
        }
    }

    getDefinition(itemId) {
        return this.itemDefinitions[itemId] || null;
    }

    formatName(id) {
        return String(id)
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    notifyChange() {
        if (typeof this.onChange === 'function') {
            this.onChange();
        }
    }

    isStackable(itemId) {
        const definition = this.getDefinition(itemId);

        if (definition) {
            return definition.stackable !== false;
        }

        return !['dagger', 'bow', 'staff'].includes(itemId);
    }

    getMaxStack(itemId) {
        if (!this.isStackable(itemId)) return 1;

        const maximum = Number(
            this.getDefinition(itemId)?.maxStack ?? 9999
        );

        return Number.isFinite(maximum) && maximum > 0
            ? Math.floor(maximum)
            : 9999;
    }

    getItem(itemId) {
        return this.items.find(item => item.id === itemId) || null;
    }

    getItemAt(index) {
        return this.items[index] || null;
    }

    getQuantity(itemId) {
        return this.items.reduce((total, item) => {
            return total + (
                item.id === itemId ? item.quantity : 0
            );
        }, 0);
    }

    hasItem(itemId, quantity = 1) {
        return this.getQuantity(itemId) >= quantity;
    }

    hasSpace(itemId, quantity = 1) {
        quantity = Math.floor(Number(quantity));

        if (
            !itemId ||
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            return false;
        }

        let remaining = quantity;
        const maxStack = this.getMaxStack(itemId);

        if (this.isStackable(itemId)) {
            for (const item of this.items) {
                if (item.id !== itemId) continue;

                remaining -= Math.max(
                    0,
                    maxStack - item.quantity
                );

                if (remaining <= 0) return true;
            }
        }

        const freeSlots = this.capacity - this.items.length;
        const requiredSlots = Math.ceil(remaining / maxStack);

        return requiredSlots <= freeSlots;
    }

    addItem(itemId, quantity = 1, name = null) {
        quantity = Math.floor(Number(quantity));

        if (!this.hasSpace(itemId, quantity)) return false;

        const definition = this.getDefinition(itemId);
        const itemName = name ||
            definition?.name ||
            this.formatName(itemId);

        const maxStack = this.getMaxStack(itemId);

        if (this.isStackable(itemId)) {
            for (const item of this.items) {
                if (item.id !== itemId) continue;

                const amount = Math.min(
                    quantity,
                    Math.max(0, maxStack - item.quantity)
                );

                item.quantity += amount;
                quantity -= amount;

                if (quantity <= 0) {
                    this.notifyChange();
                    return true;
                }
            }
        }

        while (quantity > 0) {
            const amount = Math.min(quantity, maxStack);

            this.items.push({
                id: itemId,
                name: itemName,
                quantity: amount
            });

            quantity -= amount;
        }

        this.notifyChange();
        return true;
    }

    removeItem(itemId, quantity = 1) {
        quantity = Math.floor(Number(quantity));

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            !this.hasItem(itemId, quantity)
        ) {
            return false;
        }

        for (
            let i = this.items.length - 1;
            i >= 0 && quantity > 0;
            i--
        ) {
            const item = this.items[i];

            if (item.id !== itemId) continue;

            const removed = Math.min(
                item.quantity,
                quantity
            );

            item.quantity -= removed;
            quantity -= removed;

            if (item.quantity <= 0) {
                this.items.splice(i, 1);
            }
        }

        this.notifyChange();
        return true;
    }

    removeItemAt(index, quantity = 1) {
        const item = this.getItemAt(index);
        quantity = Math.floor(Number(quantity));

        if (
            !item ||
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            item.quantity < quantity
        ) {
            return false;
        }

        item.quantity -= quantity;

        if (item.quantity <= 0) {
            this.items.splice(index, 1);
        }

        this.notifyChange();
        return true;
    }

    getEquipmentSlot(itemId) {
        const slot = this.getDefinition(itemId)?.itemType;

        return Object.prototype.hasOwnProperty.call(
            this.equipment,
            slot
        ) ? slot : null;
    }

    getEquipped(slot) {
        return this.equipment[slot] || null;
    }

    getEquippedWeapon() {
        const item = this.getEquipped('Weapon');

        return item
            ? this.getDefinition(item.id)
            : null;
    }

    equipItem(index) {
        const item = this.getItemAt(index);

        if (!item) {
            return {
                success: false,
                message: 'Item não encontrado.'
            };
        }

        const slot = this.getEquipmentSlot(item.id);

        if (!slot) {
            return {
                success: false,
                message: 'Este item não pode ser equipado.'
            };
        }

        const previous = this.equipment[slot];

        const backupItems = this.items.map(entry => ({
            ...entry
        }));

        const selected = {
            id: item.id,
            name: item.name,
            quantity: this.isStackable(item.id) && this.getDefinition(item.id)?.combat?.consumeEquipped ? item.quantity : 1
        };

        // Retira uma unidade do item escolhido.
        item.quantity -= selected.quantity;

        if (item.quantity <= 0) {
            this.items.splice(index, 1);
        }

        // Devolve o equipamento anterior à mochila.
        if (previous) {
            const added = this.addItem(
                previous.id,
                previous.quantity || 1,
                previous.name
            );

            if (!added) {
                // Cancela a troca sem perder nenhum item.
                this.items = backupItems;

                this.notifyChange();

                return {
                    success: false,
                    message: 'Mochila cheia.'
                };
            }
        }

        this.equipment[slot] = selected;
        this.notifyChange();

        return {
            success: true,
            slot,
            equipped: selected,
            replaced: previous
        };
    }

    unequipItem(slot) {
        if (!Object.prototype.hasOwnProperty.call(
            this.equipment,
            slot
        )) {
            return false;
        }

        const item = this.equipment[slot];

        if (!item) return false;

        if (!this.addItem(item.id, item.quantity || 1, item.name)) {
            return false;
        }

        this.equipment[slot] = null;
        this.notifyChange();

        return true;
    }

    dropItem(index, quantity = 1) {
        return this.removeItemAt(index, quantity);
    }

    getEquipmentBonuses() {
        const bonuses = {};

        for (const item of Object.values(this.equipment)) {
            if (!item) continue;

            const definition = this.getDefinition(item.id);
            const stats = definition?.stats || {};

            for (const [key, value] of Object.entries(stats)) {
                const amount = Number(value);

                if (!Number.isFinite(amount)) continue;

                // Vida e mana atuais não são bônus permanentes.
                if (key === 'health' || key === 'mana') continue;

                bonuses[key] = (bonuses[key] || 0) + amount;
            }
        }

        return bonuses;
    }

    serialize() {
        return {
            items: this.items.map(item => ({
                ...item
            })),

            equipment: Object.fromEntries(
                Object.entries(this.equipment).map(
                    ([slot, item]) => [
                        slot,
                        item ? { ...item } : null
                    ]
                )
            )
        };
    }

    load(data) {
        this.items = [];

        for (const slot of Object.keys(this.equipment)) {
            this.equipment[slot] = null;
        }

        // Compatibilidade com inventários antigos.
        const savedItems = Array.isArray(data)
            ? data
            : data?.items;

        if (Array.isArray(savedItems)) {
            for (const item of savedItems) {
                if (!item || typeof item.id !== 'string') {
                    continue;
                }

                const quantity = Math.floor(
                    Number(item.quantity ?? 1)
                );

                if (quantity <= 0) continue;

                this.addItem(
                    item.id,
                    quantity,
                    item.name
                );
            }
        }

        const savedEquipment = Array.isArray(data)
            ? null
            : data?.equipment;

        if (savedEquipment) {
            for (const slot of Object.keys(this.equipment)) {
                const item = savedEquipment[slot];

                if (
                    item &&
                    typeof item.id === 'string' &&
                    this.getEquipmentSlot(item.id) === slot
                ) {
                    this.equipment[slot] = {
                        id: item.id,
                        name: item.name ||
                            this.formatName(item.id),
                        quantity: Math.max(1, Math.min(Number(item.quantity)||1, this.getMaxStack(item.id)))
                    };
                }
            }
        }

        this.notifyChange();
    }
}
