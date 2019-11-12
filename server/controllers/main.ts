import * as THREE from 'three';
import { gameServer as gameServer } from '../index';
import { GameRoom } from '../rooms/gameRoom';
import { MapClass, MapJson } from '../classes/map';
import { EntityMap } from 'colyseus';
import { PlayerClass } from '../classes/player';
import { Vector3 } from 'three';
import { Client } from 'colyseus';
import { PLAYER_ADD_MSG, PLAYER_ADD_ID, SNAPSHOT_MSG, SNAPSHOT_ID } from '../classes/messages';
import { RoomConstructor, Room, SimulationCallback } from 'colyseus/lib/Room';

export const ServerScene = new THREE.Scene();

export class MainController {

    public map = new MapClass();
    public mapJson: MapJson;
    public players: EntityMap<PlayerClass> = {};
    public room: GameRoom; // set in gameRoom

    constructor() {
        this.map.loadMapData( () => {
            this.mapJson = this.map.serverGenerateTerrain();
            gameServer.register('gameRoom', GameRoom).then( res => {
                console.log('GAME ROOM REGISTERED');
            });
        });
    }

    public addPlayer(client: Client) {
        this.players[ client.id ] = new PlayerClass();
        this.players[ client.id ].create(client.id, 0, 0);

        // spawn player
        const packet2: PLAYER_ADD_MSG = {
            id: PLAYER_ADD_ID,
            data: { clientId: client.id, pos: this.players[ client.id ].pos },
        };
        this.room.broadcast(packet2);

        // send snapshot of current players etc
        const playerList: { clientId: string, alive: boolean, pos: Vector3 }[] = [];
        Object.keys( this.players ).forEach( playerKey => {
            playerList.push({
                clientId: playerKey,
                alive: this.players[playerKey].alive,
                pos: this.players[playerKey].pos,
            }); 
        });
        const snapshotPacket: SNAPSHOT_MSG = {
            id: SNAPSHOT_ID,
            data: { playerList: playerList },
        };
        this.room.send(client, snapshotPacket);
    }

    public removePlayer(client: Client) {
        this.players[ client.id ].dispose();
        delete this.players[ client.id ];
    }

    public emptyPlayerList() {
        this.players = {};
    }

    public updatePlayerMouse(client: Client, mouse: Vector3, mouseTimestamp: number) {
        if ( mouseTimestamp > this.players[ client.id ].mouseTimestamp ) {
            this.players[ client.id ].mouse = mouse;
            this.players[ client.id ].mouseTimestamp = mouseTimestamp;
            // console.log(client.id, 'mouse updated', this.players[ client.id ].mouse);
        }
    }

    public logic(): SimulationCallback {
        Object.keys( this.players ).forEach( clientId => {
            this.players[clientId].logic();
        });
        return;
    }

}
