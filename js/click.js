
window.gameState = window.gameState || {
    currency: 0
};

function handleClick() {
    const income = window.ResonanceState.isBuffActive() ? 2 : 1;
    window.gameState.currency += income;
    window.ResonanceState.addCharge(1);
    return income;
}