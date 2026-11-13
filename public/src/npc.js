import Phaser from 'phaser';

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, tileX = 5, tileY = 5, onInteract = null) {
        const x = (tileX + 0.5) * scene.map.tileWidth;
        const y = (tileY + 0.5) * scene.map.tileHeight;
        super(scene, x, y, 'mark-idle-down-1');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setImmovable(true);
        this.body.setAllowGravity(false);
        this.body.setSize(20, 16);
        this.body.setOffset(22, 44);
        this.setDepth(y);
        this.setInteractive({ useHandCursor: true });
        this.nameText = scene.add.text(x, y - 49, '(NPC) Mark', {
            fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold',
            color: '#ffe0a0', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(100002);
        this.play('mark-idle-down', true);
        this.on('pointerover', () => this.setTint(0xffe9ba));
        this.on('pointerout', () => this.clearTint());
        this.on('pointerdown', pointer => {
            pointer.event?.stopPropagation();
            if (typeof onInteract === 'function') onInteract(this);
        });
    }
    destroy(fromScene) {
        this.nameText?.destroy();
        super.destroy(fromScene);
    }
}
