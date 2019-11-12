import * as THREE from 'three';
import { vertexShader as vert } from '../shaders/shaderVert';
import { fragmentShader as frag } from '../shaders/shaderFrag';
import { mainCtrl } from '../index';
import { configSettings as config } from './config';
import { Vector3, Vector2, CompressedTextureLoader, Object3D, AnimationClip } from 'three';
import { angle2, distance2, eulerToDeg, degToEuler, angleLerp, shortAngleDist } from '../functions/common';
import { PathClass } from './path';
import { GLTFLoader } from '../dependencies/loaders/GLTFLoader';
import { AnimationClipCreator } from '../dependencies/AnimationClipCreator';
import * as TWEEN from 'es6-tween';
import { configSettings } from '../classes/config';
import { Logger } from '../classes/logger';

export class PlayerClass {

    public id = null;
    public oldPos = new THREE.Vector3(0, 0, 0);
    public pos = new THREE.Vector3(0, 0, 0);
    public alive = false;
    public raycaster = new THREE.Raycaster();
    public raycastPos = new THREE.Vector3(0, 0, 100);
    public raycastDir = new THREE.Vector3(0, 0, -1);
    public direction = 0;
    public mouse = new THREE.Vector3(0, 0, 0);

    // movement PATH
    public path = new PathClass();

    // player box dimensions
    public boxHeight = 2;
    public boxWidth = 1;
    public playerMesh: THREE.Mesh = null;
    public playerObject: THREE.Object3D = null;
    public playerPredictionMesh: THREE.Mesh = null;

    // character model
    public characterMesh: THREE.Object3D = null;
    public characterSkeleton: THREE.SkeletonHelper = null;
    public animationMixer: THREE.AnimationMixer = null;
    public characterAnimations: THREE.AnimationAction[] = [];
    public characterScale = 1;
    public tweenRotation: TWEEN.Tween;
    public tweenZ: TWEEN.Tween;
    public animationPlayer = {
        state: 'lookaround',
    }

    constructor() {
        this.createModel();
    }

    public init() {
    }

    public createModel() {
        const geometry = new THREE.BoxGeometry(this.boxWidth, this.boxWidth, this.boxHeight);
        const material = new THREE.RawShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            wireframe: true,
            visible: configSettings.DEBUG ? true : false,
        });

        // box model
        this.playerPredictionMesh = new THREE.Mesh(geometry, material);
        this.playerPredictionMesh.name = 'predictionMesh';
        this.playerObject = mainCtrl.clientScene.add(this.playerPredictionMesh);
        this.playerPredictionMesh.position.x = this.pos.x;
        this.playerPredictionMesh.position.y = this.pos.y;
        this.playerPredictionMesh.position.z = this.pos.z;

        // load character models
        this.loadCharacter('src/models/robot2/robot.gltf');
        Logger.warn('PL CREATE MODEL', this.pos);
    }

    public loadCharacter(url: string) {
                
        const loader = new GLTFLoader();
        loader.load(
            url,
            ( gltf ) => {
                Logger.log('gltf loaded', gltf);
                // called when the resource is loaded
                // gltf.scene.children[0].material.wireframe = true;
                this.characterMesh = gltf.scene.children[0];
                // this.characterMesh.material.wireframe = true;
                this.characterMesh.position.set(
                    this.playerPredictionMesh.position.x,
                    this.playerPredictionMesh.position.y,
                    this.playerPredictionMesh.position.z,
                );

                // this.characterMesh.scale.set(this.characterScale, this.characterScale, this.characterScale);
                this.playerPredictionMesh.add( this.characterMesh );
                Logger.log('LOADED', this.characterMesh);

                // skeleton
                this.characterSkeleton = new THREE.SkeletonHelper( this.characterMesh );
                this.characterSkeleton.visible = configSettings.DEBUG ? true : false;
                mainCtrl.clientScene.add( this.characterSkeleton );
                Logger.log('this.characterSkeleton', this.characterSkeleton);

                // animations
                this.animationMixer = new THREE.AnimationMixer( this.characterMesh );
                gltf.animations.forEach( (animation: AnimationClip) => {
                    Logger.log('anim', animation);
                    const action: THREE.AnimationAction = this.animationMixer.clipAction(animation);
                    this.characterAnimations[animation.name] = action;
                });
                this.animationMixer.stopAllAction();
                this.playAnimation('lookaround', 0.25, 0.3);
                Logger.log('animations', this.characterAnimations);
            },
            ( xhr ) => {
                // called while loading is progressing
                Logger.log( `${( xhr.loaded / xhr.total * 100 )}% loaded` );
            },
            ( error ) => {
                // called when loading has errors
                console.error( 'An error happened', error );
            },
        );

        /*const loader = new GLTFLoader();
        const myChar: any = null;
        loader.load( url, function ( gltf ) {


            Logger.log('gltf.scene', gltf.scene);
            gltf.scene.traverse( function ( child ) {
                if ( child.isMesh ) {
                    // child.material.envMap = envMap;
                    // mainCtrl.clientScene.add( child );
                }
            });
            // mainCtrl.clientScene.add( gltf.scene );

            Logger.log('LOADED CHAR');

        });*/
    }

    public dispose() {
        mainCtrl.clientScene.remove(this.characterMesh);
        mainCtrl.clientScene.remove(this.characterSkeleton);
        mainCtrl.clientScene.remove(this.playerPredictionMesh);
        this.path.dispose();
        this.playerPredictionMesh.geometry.dispose();
        this.playerObject = null;
        this.playerPredictionMesh = null;
        this.characterMesh = null;
        this.characterSkeleton = null;
    }

    public setPosition( pos3: Vector3 ) {
        this.pos.x = pos3.x;
        this.pos.y = pos3.y;
        this.pos.z = pos3.z;
        /*this.playerMesh.position.x = this.pos.x;
        this.playerMesh.position.y = this.pos.y;
        this.playerMesh.position.z = this.pos.z;*/
        this.mouse = pos3;

        this.playerPredictionMesh.position.x = pos3.x;
        this.playerPredictionMesh.position.y = pos3.y;
        this.playerPredictionMesh.position.z = pos3.z;
        Logger.warn('PL SET POS', this.pos);
    }

    public setDirection( mousePos3: Vector3, lerp: boolean ) {
        if ( lerp ) {
            this.direction = angle2(this.pos.x, this.pos.y, mousePos3.x, mousePos3.y);
            // Logger.log( this.playerPredictionMesh.rotation.z, this.direction, shortAngleDist(this.playerPredictionMesh.rotation.z, this.direction) );

            // shortest distance to target angle
            const shortDist = shortAngleDist(this.playerPredictionMesh.rotation.z, this.direction);
            let targetAngle = this.playerPredictionMesh.rotation.z + shortDist;
            
            if ( this.tweenRotation ) {
                this.tweenRotation.stop();
            }
            this.tweenRotation = new TWEEN.Tween({ angle : this.playerPredictionMesh.rotation.z })
            .easing(TWEEN.Easing.Quadratic.InOut)
            .to({ angle : targetAngle }, 250);

            this.tweenRotation.play();
            this.tweenRotation.on('update', ({ angle }) => {
                // Logger.log(`test ${angle}`);
                this.playerPredictionMesh.rotation.z = angle;
            });
        } else {
            this.playerPredictionMesh.rotation.z = angle2(0, 0, mousePos3.x, mousePos3.y) + Math.PI / 2;
        }
    }

    public logic() {
        if ( this.alive ) {
            // client side prediction
            const predSpeed = 0.3;
            if ( distance2(this.pos.x, this.pos.y, this.mouse.x, this.mouse.y) > predSpeed ) {
                const angle = angle2(this.pos.x, this.pos.y, this.mouse.x, this.mouse.y);
                
                this.pos.x += predSpeed * Math.cos(angle);
                this.pos.y += predSpeed * Math.sin(angle);

                if ( this.path.points.length > 0 ) {

                    const correctionSpeed = distance2(this.pos.x, this.pos.y, this.path.points[this.path.points.length - 1].pos.x, this.path.points[this.path.points.length - 1].pos.y) / 50;
                    // Logger.log('correctionSpeed', correctionSpeed);
                    const predAngle = angle2(this.pos.x, this.pos.y, this.path.points[this.path.points.length - 1].pos.x, this.path.points[this.path.points.length - 1].pos.y);
                    // const predAngleZ = angle2(this.pos.x, this.pos.z, this.path.points[this.path.points.length - 1].pos.x, this.path.points[this.path.points.length - 1].pos.z);
                    this.pos.x += correctionSpeed * Math.cos(predAngle);
                    this.pos.y += correctionSpeed * Math.sin(predAngle);
                    // this.pos.z += correctionSpeed * Math.sin(predAngleZ);

                    this.playerPredictionMesh.position.x = this.pos.x;
                    this.playerPredictionMesh.position.y = this.pos.y;
                    // this.playerPredictionMesh.position.z = this.pos.z;
                }
                this.playAnimation('run', 0.25, 0.8);
            } else {
                // player stopped
                this.playAnimation('lookaround', 0.25, 0.3);
            }

            // Z
            if ( this.path.points.length > 0 ) {
                /*if ( Math.abs(this.pos.z - this.path.points[this.path.points.length - 1].pos.z) > 0.2 ) {
                    if ( this.pos.z < this.path.points[this.path.points.length - 1].pos.z ) {
                        this.pos.z += 0.2;
                    } else if ( this.pos.z > this.path.points[this.path.points.length - 1].pos.z ) {
                        this.pos.z -= 0.2;
                    }
                    this.playerPredictionMesh.position.z = this.pos.z;
                }*/
                /*if ( this.tweenZ ) {
                    this.tweenZ.stop();
                }
                this.tweenZ = new TWEEN.Tween({ z : this.pos.z })
                // .easing(TWEEN.Easing.Quadratic.InOut)
                .to({ z : this.path.points[this.path.points.length - 1].pos.z }, 300);
    
                this.tweenZ.play();
                this.tweenZ.on('update', ({ z }) => {
                    this.pos.z = z;
                    this.playerPredictionMesh.position.z = this.pos.z;
                });*/
            }

            // Z
            const newZ = this.getZFromVertices();
            this.pos.z = newZ != null ? newZ : this.pos.z;
            this.pos.z += this.boxHeight / 2; // make the whole box visible
            this.playerPredictionMesh.position.z = this.pos.z;

            // update animations
            /*if ( this.animationMixer ) {
                this.animationMixer.update( mainCtrl.clock.getDelta() );
            }*/

            // relative to predictionMesh
            if ( this.characterMesh ) {
                this.characterMesh.rotation.y = Math.PI;
                this.characterMesh.position.z = -1.5;
            }

        }
        TWEEN.update();
    }

    public updateAnimations() {
        if ( this.animationMixer ) {
            this.animationMixer.update( 0.02 );
        }
    }

    public playAnimation( name: string, duration: number, timeScale: number ) {
        // if anim not playing, start it
        if ( this.characterAnimations[name] ) {
            if ( !this.characterAnimations[name].isRunning() ) {
                this.characterAnimations[name].play();
            }
        }

        // check we are not playing the same animation
        if ( this.animationPlayer.state !== name ) {
            Object.keys( this.characterAnimations ).forEach( animName => {
                if ( animName !== name ) {
                    this.characterAnimations[animName]
                    .fadeOut(duration);
                } else {
                    this.characterAnimations[animName]
                    .reset()
					.setEffectiveTimeScale(timeScale)
					.setEffectiveWeight(1)
                    .fadeIn(duration);
                }
            });
            this.animationPlayer.state = name;
        }
    }

    private calcZ() {
        this.raycastPos.x = this.pos.x;
        this.raycastPos.y = this.pos.y;
        this.raycaster.set(this.raycastPos, this.raycastDir);
        let intersects = this.raycaster.intersectObject( mainCtrl.map.terrainMesh );
        if ( intersects ) {
            if ( intersects.length > 0 ) {
                this.pos.z = intersects[0].point.z + (this.boxHeight / 2);
            }
        }
    }

    private calcPredictionZ() {
        this.raycastPos.x = this.playerPredictionMesh.position.x;
        this.raycastPos.y = this.playerPredictionMesh.position.y;
        this.raycaster.set(this.raycastPos, this.raycastDir);
        let intersects = this.raycaster.intersectObject( mainCtrl.map.terrainMesh );
        if ( intersects ) {
            if ( intersects.length > 0 ) {
                return intersects[0].point.z + (this.boxHeight / 2);
            }
        }
        return null;
    }

    private lerp (start, end, amount){
        return (1 - amount) * start + amount * end;
    }

    // return z elevation from terrain
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
    private zFromTriangle(myX: number, myY: number, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, ): number {
        const z = (p3.z * ((myX-p1.x) * (myY-p2.y)) + p1.z * ((myX-p2.x) * (myY-p3.y)) + p2.z * ((myX-p3.x) * (myY-p1.y)) - p2.z * ((myX-p1.x) * (myY-p3.y)) - p3.z * ((myX-p2.x) * (myY-p1.y)) - p1.z * ((myX-p3.x) * (myY-p2.y)) )
        / ( ((myX-p1.x) * (myY-p2.y)) + ((myX-p2.x) * (myY-p3.y)) + ((myX-p3.x) * (myY-p1.y)) - ((myX-p1.x) * (myY-p3.y)) - ((myX-p2.x) * (myY-p1.y)) - ((myX-p3.x) * (myY-p2.y)) );
        return z;
    }

    private getPathXYZ(startPt: Vector3, endPt: Vector3, percent: number) {
        let dx = endPt.x - startPt.x;
        let dy = endPt.y - startPt.y;
        let dz = endPt.z - startPt.z;
        let X = startPt.x + dx * percent;
        let Y = startPt.y + dy * percent;
        let Z = startPt.z + dz * percent;
        return( {x:X, y:Y, z:Z} );
    }

}
