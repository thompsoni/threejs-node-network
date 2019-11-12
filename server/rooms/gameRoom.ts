import { Room } from "colyseus";
import { GameState } from "../states/gameState";
import { configSettings } from '../classes/config';
import { mainCtrl } from '../index';
import { INIT_MAP_ID, INIT_MAP_MSG, MOUSE_ID, PLAYER_ADD_MSG, PLAYER_REMOVE_ID, PLAYER_ADD_ID, PLAYER_REMOVE_MSG, MOUSE_MSG } from "../classes/messages";
import { Client } from 'colyseus';
import { Vector3 } from "three";

export class GameRoom extends Room<GameState> {
    maxClients = configSettings.maxPlayers;

    onInit(options) {
        this.setState( new GameState() );
        mainCtrl.room = this;
        this.setSimulationInterval( () => mainCtrl.logic() );
        console.log("Game room created!", options);
    }

    onJoin(client: Client) {
        // this.broadcast(`${ client.sessionId } joined.`);
        console.log("pl joined!", client.sessionId);

        // send terrain to client
        const packet: INIT_MAP_MSG = {
            id: INIT_MAP_ID,
            data: mainCtrl.mapJson,
        };
        this.send(client, packet);
        mainCtrl.addPlayer(client);

        // spawn player
        /*const packet2: PLAYER_ADD_MSG = {
            id: PLAYER_ADD_ID,
            data: { clientId: client.id, pos: new Vector3(2000, 0, 0) },
        };
        this.broadcast(packet2);*/
    }

    onLeave(client: Client) {
        mainCtrl.removePlayer(client);

        // remove player
        const packet2: PLAYER_REMOVE_MSG = {
            id: PLAYER_REMOVE_ID,
            data: { clientId: client.id },
        };
        this.broadcast(packet2);
    }

    onMessage(client: Client, message: any) {
        if ( message.id === MOUSE_ID ) {
            const packet: MOUSE_MSG = message;
            mainCtrl.updatePlayerMouse(client, packet.data.pos, packet.timestamp);
            packet.data.clientId = client.id;
            this.broadcast(packet); // send new mouse pos to all players
        } else {
            console.log("unknown message", client.sessionId, message);
        }
        // this.broadcast(`(${ client.sessionId }) ${ data.message }`);
    }

    onDispose() {
        mainCtrl.emptyPlayerList();
        console.log("Dispose Game Room");
    }

}
