class GameState {

    public screen = 0; // -1 = init first load, 0 = login, 1 = ingame, 2 = register
    public loginLoaded = false;
    public mapLoaded = false;

    constructor() {
    }

    setState(stateId) {
        this.screen = stateId;
    }
}

export const gameStateObj = new GameState();
