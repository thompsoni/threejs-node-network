import { MapJson } from "./map";
import { Vector3 } from "three";
import { EntityMap } from "colyseus.js";
import { PlayerClass } from "./player";

export interface INIT_MAP_MSG {
    id: 'INIT_MAP',
    data: MapJson,
}
export const INIT_MAP_ID = 'INIT_MAP';

export interface MOUSE_MSG {
    id: 'MOUSE',
    data: { clientId: string, pos: Vector3 },
    timestamp: number,
}
export const MOUSE_ID = 'MOUSE';

// new players joins game
export interface PLAYER_ADD_MSG {
    id: 'PLAYER_ADD',
    data: { clientId: string, pos: Vector3 }, // location
}
export const PLAYER_ADD_ID = 'PLAYER_ADD';

// remove player
export interface PLAYER_REMOVE_MSG {
    id: 'PLAYER_REMOVE',
    data: { clientId: string },
}
export const PLAYER_REMOVE_ID = 'PLAYER_REMOVE';

// player move
export interface PLAYER_MOVE_MSG {
    id: 'PLAYER_MOVE',
    data: { clientId: string, pos: Vector3 },
}
export const PLAYER_MOVE_ID = 'PLAYER_MOVE';

// snapshot of current state
export interface SNAPSHOT_MSG {
    id: 'SNAPSHOT',
    data: { playerList: { clientId: string, alive: boolean, pos: Vector3 }[] },
}
export const SNAPSHOT_ID = 'SNAPSHOT';
