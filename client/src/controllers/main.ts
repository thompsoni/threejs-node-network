import { MapClass, MapPacket, mapJsonToMapPacket } from "../classes/map";
import * as THREE from 'three';
import { BufferGeometryUtils as BufferGeometryUtils } from '../dependencies/utils/BufferGeometryUtils';
import OrbitControls from 'orbit-controls-es6';
import * as Colyseus from 'colyseus.js';
import $ from 'jquery-ts';
import { gameStateObj as gameState } from '../classes/state';
import { INIT_MAP_ID, MOUSE_MSG, MOUSE_ID, PLAYER_ADD_ID, PLAYER_MOVE_ID, SNAPSHOT_ID, PLAYER_ADD_MSG, INIT_MAP_MSG, PLAYER_REMOVE_ID, PLAYER_REMOVE_MSG, PLAYER_MOVE_MSG, SNAPSHOT_MSG } from "../classes/messages";
import { EntityMap } from 'colyseus.js';
import { PlayerClass } from '../classes/player';
import { Vector3, Vector2 } from 'three';
import { vertexShader as vert, terrainVertexShader } from '../shaders/shaderVert';
import { fragmentShader as frag, terrainFragmentShaderNoise } from '../shaders/shaderFrag';
import { angle2, distance3 } from '../functions/common';
import { NormalMapShader } from '../dependencies/shaders/NormalMapShader';
import { ShaderTerrain } from '../dependencies/ShaderTerrain';
import { Logger } from '../classes/logger';

export class MainController {

    // players
    public players: EntityMap<PlayerClass> = {};

    // world
    public clientScene = new THREE.Scene();
    public raycaster = new THREE.Raycaster();
    // public mouse = new THREE.Vector3();
    public camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        10000
    );
    public controls = new OrbitControls(this.camera);
    public renderer = new THREE.WebGLRenderer({ antialias: true });
    public camAngle = 0;
    public camAngleDelta = 0;
    public clock = new THREE.Clock();

    // lights
    public directionalLight: THREE.DirectionalLight;
    public pointLight: THREE.PointLight;
    public lightVal = 0;
    public lightDir = 1;
    public lightPulseDir = false;
    public lightPulseAcceleration = 0;
    public lightPulseSpeed = 0;

    // controls
    public mouseHorizontalSpeed = 0;
    public mouseOldPos = new THREE.Vector2(0, 0);
    public mouseButtons = {
        left: false,
        middle: false,
        right: false,
    }
    public mouseTimestamp;
    public mouseVelocityIntervalId;
    // public mouseClickLock = false; // limit clicking when mouse held down
    public mouseClickIntervalId;
    public mouseClientPos = new THREE.Vector2(0, 0);

    // map
    public map: MapClass;

    // network
    public client: Colyseus.Client;
    public room: Colyseus.Room;

    constructor() {
        this.controls.enabled = false;
        this.camera.position.z = 1000;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.client = new Colyseus.Client('ws://localhost:8081');
        this.client.onOpen.add(function() {
            Logger.log("connection is now open");
        });

        this.map = new MapClass();

        // register click event
        const self = this;
        document.addEventListener('click', event => this.onMouseClick(self, event) );
        document.addEventListener('mousedown', event => this.mouseDown(self, event) );
        document.addEventListener('mouseup', event => this.mouseUp(self, event) );
        document.addEventListener('mousemove', event => this.mouseMove(self, event) );
        document.addEventListener('wheel', event => this.onMouseWheel(self, event) )

    }

    public joinGame() {
        this.room = this.client.join('gameRoom');
    
        this.room.onJoin.addOnce(function() {
            if ( gameState.screen === 0 ) {
                $('#container').html('').css({'visibility': 'hidden'});
                gameState.screen = 1;
            }
            Logger.log('client joined successfully');
        });

        const self = this;

        /*this.room.onStateChange.addOnce( state => {
            Logger.log('INIT STATE:', state );
            this.players = state.player;
        });*/

        this.room.onMessage.add( message => {

            // INIT MAP
            if ( message.id === INIT_MAP_ID ) {
                const packet: INIT_MAP_MSG = message;
                Logger.log(INIT_MAP_ID, packet);
                const mapPacket: MapPacket = mapJsonToMapPacket(packet.data);
                console.log('mappacket', mapPacket);
                self.map.clientSetMap(mapPacket);

            // PLAYER ADD 
            } else if ( message.id === PLAYER_ADD_ID ) {
                const packet: PLAYER_ADD_MSG = message;
                if ( packet.data ) {
                    Logger.log(PLAYER_ADD_ID, packet);
                    this.players[ packet.data.clientId ] = new PlayerClass();
                    const vec3 = new Vector3(packet.data.pos.x, packet.data.pos.y, packet.data.pos.z);
                    this.players[ packet.data.clientId ].setPosition(vec3);
                    this.players[ packet.data.clientId ].alive = true;
                    // this.players[ packet.data.clientId ].mouse = vec3;

                    if ( packet.data.clientId === this.client.id ) {
                        this.focusCamera(vec3);
                    }
                }

            // PLAYER REMOVE
            } else if ( message.id === PLAYER_REMOVE_ID ) {
                const packet: PLAYER_REMOVE_MSG = message;
                if ( packet.data ) {
                    this.players[ packet.data.clientId ].dispose();
                    delete this.players[ packet.data.clientId ];
                }

            // PLAYER MOVE
            }  else if ( message.id === PLAYER_MOVE_ID ) {
                const packet: PLAYER_MOVE_MSG = message;
                if ( message.data ) {
                    if ( this.players[ message.data.clientId ] ) {
                        /*if ( this.players[ message.data.clientId ].path.length === 0 ) {
                            this.players[ message.data.clientId ].path.addPoint(this.players[ message.data.clientId ].pos);
                        }*/
                        this.players[ message.data.clientId ].direction = angle2(
                            this.players[ message.data.clientId ].pos.x,
                            this.players[ message.data.clientId ].pos.y,
                            message.data.pos.x, message.data.pos.y,
                        );
                        this.players[ message.data.clientId ].path.addPoint(message.data.pos);
                        // Logger.log('pl move', this.players[ message.data.clientId ].path.points);
                    }
                }

            // MOUSE
            }  else if ( message.id === MOUSE_ID ) {
                const packet: MOUSE_MSG = message;
                if ( packet.data ) {
                    // Logger.log('UPDATE MOUSE', packet.data.pos);
                    this.players[ packet.data.clientId ].mouse = packet.data.pos;
                    // this.players[ packet.data.clientId ].setDirection(packet.data.pos);

                    // update rotation for other players
                    if ( message.data.clientId !== this.client.id ) {
                        this.players[ message.data.clientId ].setDirection(packet.data.pos, true);
                    }
                }
        
            // SNAPSHOT
            }  else if ( message.id === SNAPSHOT_ID ) {
                const packet: SNAPSHOT_MSG = message;
                if ( packet.data ) {
                    Logger.log('SNAPSHOT', packet.data);
                    // update all other player positions
                    packet.data.playerList.forEach(player => {
                        if ( player.clientId !== this.client.id ) {
                            this.players[ player.clientId ] = new PlayerClass();
                            const vec3 = new Vector3(player.pos.x, player.pos.y, player.pos.z);
                            this.players[ player.clientId ].setPosition(vec3);
                            this.players[ player.clientId ].alive = true;
                        }
                    });
                }
            
            // UNKNOWN
            } else {
                Logger.log('unknown message', message);
            }
        });

        this.room.listen('players/:id/:attribute', (change) => {
            if ( change.path['attribute'] === 'alive' ) {
                Logger.log('PL:ALIVE', change);
                if ( change.value === true ) {
                } else {
                }
            } else if ( change.path['attribute'] === 'pos' ) {
                Logger.log('PL:POS', change);
                if ( this.players[ change.path['id'] ] ) {
                }
            } else {
                console.error('unknown player attribute', change.path['attribute']);
            }
        });
    }

    public updateCamera() {
        if ( this.players[ this.client.id ] ) {
            this.focusCamera( this.players[ this.client.id ].pos );
        }
    }

    public logic() {
        this.map.logic();
        Object.keys( this.players ).forEach( clientId => {
            this.players[ clientId ].updateAnimations();
            this.players[ clientId ].logic();
        });
    }

    public render() {
        if ( gameState.screen === 1 && gameState.mapLoaded ) {

            // if ( this.lightPulseSpeed <= 0.4 ) { this.lightPulseSpeed = 0.4; }
            if ( !this.lightPulseDir ) {
                this.lightPulseAcceleration += 0.00001;
                this.lightPulseSpeed += this.lightPulseAcceleration;
                if ( this.lightPulseSpeed >= 1.0 ) {
                    this.lightPulseSpeed = 1.0;
                    this.lightPulseAcceleration = 0;
                    this.lightPulseDir = true;
                }
            } else {
                this.lightPulseAcceleration += 0.00001;
                this.lightPulseSpeed -= this.lightPulseAcceleration;
                if ( this.lightPulseSpeed <= 0 ) {
                    this.lightPulseSpeed = 0;
                    this.lightPulseAcceleration = 0;
                    this.lightPulseDir = false;
                }
            }
            // this.clientScene.fog.color.setHSL( 1, 1, 1 );
            // this.clientScene.fog.color.setHSL( 0, 0, 0 );

            // this.directionalLight.position.x = 100*this.lightPulseSpeed;
            this.directionalLight.intensity = THREE.Math.mapLinear( 1.0, 0, 1, 0.1, 3.0 + 1*this.lightPulseSpeed );
            // this.directionalLight.intensity = THREE.Math.mapLinear( 5 * this.lightPulseSpeed, 0, 1, 0.9, 1.5 );

            this.renderer.render(this.clientScene, this.camera);
        }
    }

    public onMouseClick(self, event) {
    }

    public onMouseWheel(self, event) {
        if ( event.deltaY > 0 ) {
            // down
            self.camera.zoom -= 0.05;
            self.camera.updateProjectionMatrix();
        } else {
            // up
            self.camera.zoom += 0.05;
            self.camera.updateProjectionMatrix();
        }
    }

    public mouseDown(self, event) {
        if ( event.button === 0 ) {
            if ( gameState.screen === 1 ) {
                // event.preventDefault();
        
                // const mouse = new Vector2(0, 0);
                /*self.mouseClientPos.x = (event.clientX / self.renderer.domElement.clientWidth) * 2 - 1;
                self.mouseClientPos.y = -(event.clientY / self.renderer.domElement.clientHeight) * 2 + 1;
        
                self.raycaster.setFromCamera(self.mouseClientPos, self.camera);
                const intersects = self.raycaster.intersectObject(self.map.terrainMesh);
        
                if (intersects.length > 0) {
                    Logger.log(
                        intersects[0].point,
                        self.mouseClientPos.x + self.players[ self.client.id ].pos.x,
                        self.mouseClientPos.y + self.players[ self.client.id ].pos.y,
                    );
                    // self.mouse = intersects[0].point;
                    const packet: MOUSE_MSG = {
                        id: MOUSE_ID,
                        data: { clientId: null, pos: intersects[0].point },
                        timestamp: Date.now(),
                    }
                    self.room.send(packet);
                    self.players[ self.client.id ].mouse = intersects[0].point;
                    self.players[ self.client.id ].setDirection(intersects[0].point, true);
                    self.mouseButtons.left = true;
                }*/

                self.mouseClientPos.x = (event.clientX / self.renderer.domElement.clientWidth) * 2 - 1;
                self.mouseClientPos.y = -(event.clientY / self.renderer.domElement.clientHeight) * 2 + 1;

                const mouseVec3 = new THREE.Vector3(self.mouseClientPos.x, self.mouseClientPos.y, 0);
                self.players[ self.client.id ].setDirection(mouseVec3, false);

                const vec3 = new THREE.Vector3(
                    self.players[ self.client.id ].pos.x,
                    self.players[ self.client.id ].pos.y,
                    self.players[ self.client.id ].pos.z,
                );

                vec3.x += 20 * Math.cos(self.players[ self.client.id ].playerPredictionMesh.rotation.z);
                vec3.y += 20 * Math.sin(self.players[ self.client.id ].playerPredictionMesh.rotation.z);

                const packet: MOUSE_MSG = {
                    id: MOUSE_ID,
                    data: { clientId: null, pos: vec3 },
                    timestamp: Date.now(),
                }

                self.room.send(packet);
                self.players[ self.client.id ].mouse = vec3;
                self.mouseButtons.left = true;

                // auto click if held down
                self.mouseClickIntervalId = setInterval( () => {
                    const vec3 = new THREE.Vector3(
                        self.players[ self.client.id ].pos.x,
                        self.players[ self.client.id ].pos.y,
                        self.players[ self.client.id ].pos.z,
                    );

                    vec3.x += 20 * Math.cos(self.players[ self.client.id ].playerPredictionMesh.rotation.z);
                    vec3.y += 20 * Math.sin(self.players[ self.client.id ].playerPredictionMesh.rotation.z);

                    const packet: MOUSE_MSG = {
                        id: MOUSE_ID,
                        data: { clientId: null, pos: vec3 },
                        timestamp: Date.now(),
                    }

                    self.room.send(packet);
                    self.players[ self.client.id ].mouse = vec3;
                }, 250);
            }
        }
        else if ( event.button === 2 ) {
            self.mouseButtons.right = true;
            self.mouseVelocityIntervalId = setInterval( () => {
                self.mouseHorizontalSpeed = 0;
            }, 100);
        }
    }

    public eventFire(el, etype){
        if (el.fireEvent) {
          el.fireEvent('on' + etype);
        } else {
          const evObj = document.createEvent('Events');
          evObj.initEvent(etype, true, false);
          el.dispatchEvent(evObj);
        }
    }

    public mouseUp(self, event) {
        if ( gameState.screen === 1 ) {
            if ( event.button === 2 ) {
                self.mouseButtons.right = false;
                self.mouseHorizontalSpeed = 0;
                clearInterval(self.mouseVelocityIntervalId);
            } else if ( event.button === 0 ) {
                self.mouseButtons.left = false;
                clearInterval(self.mouseClickIntervalId);

                // send exact mouse pos
                self.mouseClientPos.x = (event.clientX / self.renderer.domElement.clientWidth) * 2 - 1;
                self.mouseClientPos.y = -(event.clientY / self.renderer.domElement.clientHeight) * 2 + 1;
        
                self.raycaster.setFromCamera(self.mouseClientPos, self.camera);
                const intersects = self.raycaster.intersectObject(self.map.terrainMesh);
        
                if (intersects.length > 0) {
                    Logger.log(
                        intersects[0].point,
                        self.mouseClientPos.x + self.players[ self.client.id ].pos.x,
                        self.mouseClientPos.y + self.players[ self.client.id ].pos.y,
                    );
                    // self.mouse = intersects[0].point;
                    const packet: MOUSE_MSG = {
                        id: MOUSE_ID,
                        data: { clientId: null, pos: intersects[0].point },
                        timestamp: Date.now(),
                    }
                    self.room.send(packet);
                    self.players[ self.client.id ].mouse = intersects[0].point;
                    self.players[ self.client.id ].setDirection(intersects[0].point, true);
                }
            }
        }
    }

    public mouseMove(self, e) {
        // calc mouse speed
        if ( self.mouseButtons.right ) {
            const now = Date.now();
            const currentmX = e.screenX;

            const dt = now - self.mouseTimestamp;
            const distance = currentmX - self.mouseOldPos.x;

            if ( distance && dt ) {
                self.mouseHorizontalSpeed = distance / dt / 10;
                if ( self.mouseHorizontalSpeed >= 0.2 ) { self.mouseHorizontalSpeed = 0.2; }
                if ( self.mouseHorizontalSpeed <= -0.2 ) { self.mouseHorizontalSpeed = -0.2; }
            }

            self.mouseOldPos.x = currentmX;
            self.mouseTimestamp = now;
        }

        // update client mouse pos
        self.mouseClientPos.x = (e.clientX / self.renderer.domElement.clientWidth) * 2 - 1;
        self.mouseClientPos.y = -(e.clientY / self.renderer.domElement.clientHeight) * 2 + 1;
        if ( self.mouseButtons.left ) {
            const vec3 = new THREE.Vector3(self.mouseClientPos.x, self.mouseClientPos.y, 0);
            self.players[ self.client.id ].setDirection(vec3, false);

            const pos3 = new THREE.Vector3(
                self.players[ self.client.id ].pos.x,
                self.players[ self.client.id ].pos.y,
                self.players[ self.client.id ].pos.z,
            );

            pos3.x += 20 * Math.cos(self.players[ self.client.id ].playerPredictionMesh.rotation.z);
            pos3.y += 20 * Math.sin(self.players[ self.client.id ].playerPredictionMesh.rotation.z);
            self.players[ self.client.id ].mouse = pos3;
        }
    }

    public focusCamera(target: Vector3) {
        this.camAngle += this.mouseHorizontalSpeed;
        if ( this.camAngle > Math.PI*2 ) { this.camAngle = 0; }
        this.camera.position.x = target.x + 35 * Math.cos( this.camAngle );
        this.camera.position.y = target.y + 35 * Math.sin( this.camAngle );
        const myPlayerPosZ = this.players[ this.client.id ] ? this.players[ this.client.id ].pos.z : 0;
        this.camera.position.z = myPlayerPosZ + 40;
        this.camera.up = new THREE.Vector3(0,0,1);
        this.camera.lookAt(target);

        // return to original angle
        if ( !this.mouseButtons.right ) {
            if ( this.camAngle > 0.1 ) {
                this.camAngle -= 0.1;
            } else if ( this.camAngle < -0.1 ) {
                this.camAngle += 0.1;
            } else { this.camAngle = 0; }
        }
    }
}
