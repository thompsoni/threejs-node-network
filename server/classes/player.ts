import * as THREE from 'three';
import { vertexShader as vert } from '../shaders/shaderVert';
import { fragmentShader as frag } from '../shaders/shaderFrag';
import { configSettings as config } from './config';
import { ServerScene as serverScene } from '../controllers/main';
import { mainCtrl } from '../index';
import { nosync } from "colyseus";
import { angle2, distance2 } from '../functions/common';
import { PLAYER_MOVE_ID, PLAYER_MOVE_MSG } from './messages';

export class PlayerClass {

    public pos = new THREE.Vector3(0, 0, 0);
    public alive = false;

    @nosync
    public angleToMouse = 0;

    @nosync
    public speed = 0.3;

    @nosync
    public clientId = null;

    @nosync
    public mouse = new THREE.Vector3(0, 0, 0);

    @nosync
    public mouseTimestamp = 0;

    @nosync
    public oldPos = new THREE.Vector3(0, 0, 0);

    @nosync
    public posLock = false;

    @nosync
    public raycaster = new THREE.Raycaster();

    @nosync
    public raycastPos = new THREE.Vector3(0, 0, 1000);

    @nosync
    public raycastDir = new THREE.Vector3(0, 0, -1);

    // player box dimensions
    @nosync
    public boxHeight = 2;

    @nosync
    public boxWidth = 1;

    @nosync
    public playerMesh: THREE.Mesh = null;

    @nosync
    public playerModel: THREE.Object3D = null;

    constructor() {
    }

    @nosync
    create(clientId, newX, newY) {
        this.pos.x = newX;
        this.pos.y = newY;
        this.pos.z = this.calcZ();
        this.alive = true;
        this.clientId = clientId;

        this.mouse.x = newX;
        this.mouse.y = newY;

        const geometry = new THREE.BoxGeometry(this.boxWidth, this.boxWidth, this.boxHeight);
        const material = new THREE.RawShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            wireframe: true,
        });

        this.playerMesh = new THREE.Mesh(geometry, material);
        this.playerModel = serverScene.add(this.playerMesh);

        this.playerMesh.position.x = this.pos.x;
        this.playerMesh.position.y = this.pos.y;
        this.playerMesh.position.z = this.pos.z;

        console.warn('PL CREATED', this.pos);
    }

    @nosync
    dispose() {
        serverScene.remove(this.playerMesh);
        this.playerModel = null;
        this.playerMesh = null;
    }

    @nosync
    logic() {
        // this.pos.x += 0.5;
        if ( this.alive ) {
            this.angleToMouse = angle2(this.pos.x, this.pos.y, this.mouse.x, this.mouse.y);
            if ( distance2(this.pos.x, this.pos.y, this.mouse.x, this.mouse.y) > this.speed ) {
                this.pos.x += this.speed * Math.cos(this.angleToMouse);
                this.pos.y += this.speed * Math.sin(this.angleToMouse);
                // this.pos.z = this.calcZ();

                // update model pos
                this.playerMesh.position.x = this.pos.x;
                this.playerMesh.position.y = this.pos.y;
                // this.playerMesh.position.z = this.pos.z;
                // this.posLock = true;
            } else {
                // if player stopped moving, send 1 point
                /*if ( this.posLock ) {
                    // update z according to terrain
                    this.oldPos.x = this.pos.x;
                    this.oldPos.y = this.pos.y;
                    this.oldPos.z = this.pos.z;
    
                    // update to all players
                    const packet: PLAYER_MOVE_MSG = {
                        id: PLAYER_MOVE_ID,
                        data: { clientId: this.clientId, pos: this.pos },
                    };
                    mainCtrl.room.broadcast(packet);
                    this.posLock = false;
                }*/
            }

            // send movement package
            if ( Math.abs(this.oldPos.x - this.pos.x) > 1 || Math.abs(this.oldPos.y - this.pos.y) > 1 ) {

                // update Z
                /*this.pos.z = this.calcZ();
                this.playerMesh.position.z = this.pos.z;*/
                const newZ = this.getZFromVertices();
                this.pos.z = newZ != null ? newZ : this.pos.z;
                this.playerMesh.position.z = this.pos.z;

                // update z according to terrain
                this.oldPos.x = this.pos.x;
                this.oldPos.y = this.pos.y;
                this.oldPos.z = this.pos.z;

                // update to all players
                const packet: PLAYER_MOVE_MSG = {
                    id: PLAYER_MOVE_ID,
                    data: { clientId: this.clientId, pos: this.pos },
                };
                mainCtrl.room.broadcast(packet);
            }
            // console.log(intersects[0]);

        }
        // let euler = new THREE.Euler( intersects[0].face.normal.x, intersects[0].face.normal.y, intersects[0].face.normal.z, 'XYZ' );
        // this.playerMesh.setRotationFromEuler(euler);
    }

    // return z elevation from terrain
    @nosync
    private getZFromVertices(): number {
        if ( mainCtrl.map.terrainMesh ) {
            // note, there are 255 tiles but 256 vertices per each row. PL XY are flipped to match the terrain XY
            const tileWidth = 10000 / 255;
            const vertices = mainCtrl.map.terrainMesh.geometry['attributes'].position.array;
            const Xtranslate = ((this.pos.y + 5000) / tileWidth);
            const Ytranslate = ((this.pos.x + 5000) / tileWidth);
            const XPos = Math.floor( Xtranslate );
            const YPos = Math.floor( Ytranslate );

            // vertice positions in the array, first upperleft corner, then get upperright and bottom left
            const vertexPos = ((256 * 3) * YPos) + (XPos * 3);
            const vertexPosX = ((256 * 3) * YPos) + ((XPos + 1) * 3);
            const vertexPosY = ((256 * 3) * (YPos + 1)) + (XPos * 3);
            const vertexPosXY = ((256 * 3) * (YPos + 1)) + ((XPos + 1) * 3);
            // console.log(XPos, YPos, vertices[vertexPos], vertices[vertexPosX], vertices[vertexPosY], vertices[vertexPosXY]);
            // console.log(XPos, YPos, Xtranslate, Ytranslate, this.pos.x, this.pos.y);

            const distX = distance2(this.pos.x, this.pos.y, vertices[vertexPosXY], vertices[vertexPosXY + 1] *-1);
            const distY = distance2(this.pos.x, this.pos.y, vertices[vertexPos], vertices[vertexPos + 1] *-1);

            if ( distX < distY ) {
                const p1 = new THREE.Vector3( vertices[vertexPosX], vertices[vertexPosX + 1] *-1, vertices[vertexPosX + 2] );
                const p2 = new THREE.Vector3( vertices[vertexPosY], vertices[vertexPosY + 1] *-1, vertices[vertexPosY + 2] );
                const p3 = new THREE.Vector3( vertices[vertexPosXY], vertices[vertexPosXY + 1] *-1, vertices[vertexPosXY + 2] );
                const z = this.zFromTriangle(this.pos.y, this.pos.x, p1, p2, p3);
                // console.log('DOWN', z);
                return z;
            } else {
                const p1 = new THREE.Vector3( vertices[vertexPos], vertices[vertexPos + 1] *-1, vertices[vertexPos + 2] );
                const p2 = new THREE.Vector3( vertices[vertexPosX], vertices[vertexPosX + 1] *-1, vertices[vertexPosX + 2] );
                const p3 = new THREE.Vector3( vertices[vertexPosY], vertices[vertexPosY + 1] *-1, vertices[vertexPosY + 2] );
                const z = this.zFromTriangle(this.pos.y, this.pos.x, p1, p2, p3);
                // console.log('UP', z);
                return z;
            }
        }
        return null;
    }

    // calculate x,y pos inside a triangle
    @nosync
    private zFromTriangle(myX: number, myY: number, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, ): number {
        const z = (p3.z * ((myX-p1.x) * (myY-p2.y)) + p1.z * ((myX-p2.x) * (myY-p3.y)) + p2.z * ((myX-p3.x) * (myY-p1.y)) - p2.z * ((myX-p1.x) * (myY-p3.y)) - p3.z * ((myX-p2.x) * (myY-p1.y)) - p1.z * ((myX-p3.x) * (myY-p2.y)) )
        / ( ((myX-p1.x) * (myY-p2.y)) + ((myX-p2.x) * (myY-p3.y)) + ((myX-p3.x) * (myY-p1.y)) - ((myX-p1.x) * (myY-p3.y)) - ((myX-p2.x) * (myY-p1.y)) - ((myX-p3.x) * (myY-p2.y)) );
        return z;
    }

    @nosync
    calcZ() {
        this.raycastPos.x = this.pos.x;
        this.raycastPos.y = this.pos.y;
        this.raycaster.set(this.raycastPos, this.raycastDir);
        let intersects = this.raycaster.intersectObject( mainCtrl.map.terrainMesh );
        if ( intersects ) {
            if ( intersects.length > 0 ) {
                return this.pos.z = intersects[0].point.z + (this.boxHeight / 2);
            }
        }

        return null;
    }

}

export const players = [];
