import { EntityMap, nosync } from "colyseus";
import { MapClass, MapJson } from "../classes/map";
import { mainCtrl } from '../index';
import * as THREE from 'three';
import { PlayerClass } from "../classes/player";

export class GameState {

    public players: EntityMap<PlayerClass> = {};

    constructor() {
        this.players = mainCtrl.players;
        console.log('GAME STATE SET');
    }

    /*removePlayer (client) {
        delete this.players[ client.sessionId ];
    }

    movePlayer (client, action) {
        if (action === "left") {
        this.players[ client.sessionId ].x -= 1;

        } else if (action === "right") {
        this.players[ client.sessionId ].x += 1;
        }
    }*/
}