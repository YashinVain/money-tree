window.ResonanceState = {
    charge: 0,
    maxCharge: 35,
    buffActive: false,
    buffEndTime: 0,
    buffDuration: 15000,      
    cooldownAfterBuff: 45000, 
    cooldownEndTime: 0,

    addCharge(amount) {
        this.charge = Math.min(this.charge + amount, this.maxCharge);
    },

    canRelease() {
        return this.charge >= this.maxCharge && Date.now() >= this.cooldownEndTime;
    },

    isOnCooldown() {
        return this.charge >= this.maxCharge && Date.now() < this.cooldownEndTime;
    },

    release() {
        if (!this.canRelease()) return false;
        this.charge = 0;
        this.buffActive = true;
        this.buffEndTime = Date.now() + this.buffDuration;
        this.cooldownEndTime = this.buffEndTime + this.cooldownAfterBuff;
        return true;
    },

    isBuffActive() {
        if (this.buffActive && Date.now() >= this.buffEndTime) {
            this.buffActive = false;
        }
        return this.buffActive;
    },

    getBuffTimeLeft() {
        return this.isBuffActive() ? Math.max(0, this.buffEndTime - Date.now()) : 0;
    },

    getCooldownTimeLeft() {
        return Math.max(0, this.cooldownEndTime - Date.now());
    }
};