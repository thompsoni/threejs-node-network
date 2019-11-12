import * as THREE from 'three';
import { jsonToArray, distance2 } from '../functions/common';
import { gameStateObj as gameState } from '../classes/state';
import { mainCtrl } from '..';
import { BufferGeometryUtils as BufferGeometryUtils } from '../dependencies/utils/BufferGeometryUtils';
import { NormalMapShader } from '../dependencies/shaders/NormalMapShader';
import { vertexShader as vert, terrainVertexShader } from '../shaders/shaderVert';
import { fragmentShader as frag, terrainFragmentShaderNoise } from '../shaders/shaderFrag';
import { ShaderTerrain } from '../dependencies/ShaderTerrain';
import { Logger } from '../classes/logger';
import { GLTFLoader } from '../dependencies/loaders/GLTFLoader';
import { configSettings } from './config';
import * as TWEEN from 'es6-tween';

export class MapClass {

    public terrainMesh: THREE.Mesh = null;

    // mesh objects
    public vegetationMeshList: { visible: boolean, mesh: THREE.Mesh, data: {x: number, y: number, z: number, size: number, rotation: number, type: string} }[] = [];
    
    // vegetation meshes
    public grass1Mesh: THREE.Mesh = null;
    public grass2Mesh: THREE.Mesh = null;
    public grass3Mesh: THREE.Mesh = null;
    public bush1Mesh: THREE.Mesh = null;
    public bush2Mesh: THREE.Mesh = null;
    public tree1Mesh: THREE.Mesh = null;
    public tree2Mesh: THREE.Mesh = null;
    public tree3Mesh: THREE.Mesh = null;
    public tree4Mesh: THREE.Mesh = null;
    public tree5Mesh: THREE.Mesh = null;
    public tree6Mesh: THREE.Mesh = null;
    public tree7Mesh: THREE.Mesh = null;
    public tree8Mesh: THREE.Mesh = null;
    public fallentree1Mesh: THREE.Mesh = null;
    public fallentree2Mesh: THREE.Mesh = null;
    public plant1Mesh: THREE.Mesh = null;

    public trees: any[] = null;
    public rocks: any[] = null;
    public objects: any[] = null;

    public lastRefreshPos = new THREE.Vector2(-99999, -99999);

    constructor() {
        // load meshes
        this.loadObjectMesh('src/models/vegetation/grass1.gltf', (mesh: THREE.Mesh) => { this.grass1Mesh = mesh; console.log('this.grass1Mesh', this.grass1Mesh); });
        this.loadObjectMesh('src/models/vegetation/grass2.gltf', (mesh: THREE.Mesh) => { this.grass2Mesh = mesh; console.log('this.grass2Mesh', this.grass2Mesh); });
        this.loadObjectMesh('src/models/vegetation/grass3.gltf', (mesh: THREE.Mesh) => { this.grass3Mesh = mesh; console.log('this.grass3Mesh', this.grass3Mesh); });
        this.loadObjectMesh('src/models/vegetation/bush1.gltf', (mesh: THREE.Mesh) => { this.bush1Mesh = mesh; console.log('this.bush1Mesh', this.bush1Mesh); });
        this.loadObjectMesh('src/models/vegetation/bush2.gltf', (mesh: THREE.Mesh) => { this.bush2Mesh = mesh; console.log('this.bush2Mesh', this.bush2Mesh); });
        this.loadObjectMesh('src/models/vegetation/nature/tree1.gltf', (mesh: THREE.Mesh) => { this.tree1Mesh = mesh; console.log('this.tree1Mesh', this.tree1Mesh);});
        this.loadObjectMesh('src/models/vegetation/nature/tree2.gltf', (mesh: THREE.Mesh) => { this.tree2Mesh = mesh; console.log('this.tree2Mesh', this.tree2Mesh);});
        this.loadObjectMesh('src/models/vegetation/nature/tree3.gltf', (mesh: THREE.Mesh) => { this.tree3Mesh = mesh; console.log('this.tree3Mesh', this.tree3Mesh);});
        this.loadObjectMesh('src/models/vegetation/nature/tree4.gltf', (mesh: THREE.Mesh) => { this.tree4Mesh = mesh; console.log('this.tree4Mesh', this.tree4Mesh);});
        this.loadObjectMesh('src/models/vegetation/nature/tree5.gltf', (mesh: THREE.Mesh) => { this.tree5Mesh = mesh; console.log('this.tree5Mesh', this.tree5Mesh);});
        this.loadObjectMesh('src/models/vegetation/nature/tree6.gltf', (mesh: THREE.Mesh) => { this.tree6Mesh = mesh; console.log('this.tree6Mesh', this.tree6Mesh);});
        this.loadObjectMesh('src/models/vegetation/nature/tree7.gltf', (mesh: THREE.Mesh) => { this.tree7Mesh = mesh; console.log('this.tree7Mesh', this.tree7Mesh);});
        this.loadObjectMesh('src/models/vegetation/nature/tree8.gltf', (mesh: THREE.Mesh) => { this.tree8Mesh = mesh; console.log('this.tree8Mesh', this.tree8Mesh);});
        this.loadObjectMesh('src/models/vegetation/fallentree1.gltf', (mesh: THREE.Mesh) => { this.fallentree1Mesh = mesh; console.log('this.fallentree1Mesh', this.fallentree1Mesh);});
        this.loadObjectMesh('src/models/vegetation/fallentree2.gltf', (mesh: THREE.Mesh) => { this.fallentree2Mesh = mesh; console.log('this.fallentree2Mesh', this.fallentree2Mesh); });
        this.loadObjectMesh('src/models/vegetation/plant1.gltf', (mesh: THREE.Mesh) => { this.plant1Mesh = mesh; console.log('this.plant1Mesh', this.plant1Mesh); });
    }

    public clientSetMap(mapPacket: MapPacket) {
        gameState.mapLoaded = false;
        // fog
            mainCtrl.clientScene.background = new THREE.Color( 0xffffff );
            mainCtrl.clientScene.fog = new THREE.Fog( 0xffffff, -20, 400 );
                
        // LIGHTS
            mainCtrl.clientScene.add( new THREE.AmbientLight( 0x111111 ) );

            mainCtrl.directionalLight = new THREE.DirectionalLight( 0xffffff, 2.0 );
            mainCtrl.directionalLight.position.set( 0, -100, 0 );
            mainCtrl.clientScene.add( mainCtrl.directionalLight );

            mainCtrl.pointLight = new THREE.PointLight( 0xff4400, 1.5 );
            mainCtrl.pointLight.position.set( 1000, 0, 50 );
            mainCtrl.clientScene.add( mainCtrl.pointLight );
                
        // CREATE TERRAIN MODEL
            let terrainGeometry = new THREE.PlaneBufferGeometry(
                mapPacket.geometry[0],
                mapPacket.geometry[1],
                mapPacket.geometry[2],
                mapPacket.geometry[3],
            );
            BufferGeometryUtils.computeTangents( terrainGeometry );

        // HEIGHT + NORMAL MAPS
            let normalShader = NormalMapShader;

            let rx = 256, ry = 256;
            let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };

            const heightMap = new THREE.WebGLRenderTarget( rx, ry, pars );
            heightMap.texture.generateMipmaps = false;

            const normalMap = new THREE.WebGLRenderTarget( rx, ry, pars );
            normalMap.texture.generateMipmaps = false;

            const uniformsNoise = {
                time: { value: 1.0 },
                scale: { value: new THREE.Vector2( 1.5, 1.5 ) },
                offset: { value: new THREE.Vector2( 0, 0 ) }
            };

            const uniformsNormal = THREE.UniformsUtils.clone( normalShader.uniforms );

            uniformsNormal.height.value = 0.05;
            uniformsNormal.resolution.value.set( rx, ry );
            uniformsNormal.heightMap.value = heightMap.texture;

            let vertexShader = terrainVertexShader;

        // TEXTURES
            let loadingManager = new THREE.LoadingManager( function () {
                // terrain.visible = true;
            });
            let textureLoader = new THREE.TextureLoader( loadingManager );

            let specularMap = new THREE.WebGLRenderTarget( 2048, 2048, pars );
            specularMap.texture.generateMipmaps = false;

            let diffuseTexture1 = textureLoader.load( 'src/img/terrain/dirt.jpg' );
                diffuseTexture1.anisotropy = mainCtrl.renderer.capabilities.getMaxAnisotropy();
            let diffuseTexture2 = textureLoader.load( 'src/img/terrain/mossy.jpg' );
                diffuseTexture2.anisotropy = mainCtrl.renderer.capabilities.getMaxAnisotropy();
            let detailTexture = textureLoader.load( 'src/img/terrain/dirt-normalmap.jpg' );
            let noiseTexture = textureLoader.load( 'src/img/terrain/noise.jpg' );

            // create heightmap texture from base64 str
            let heightMapImage = new Image();
            heightMapImage.src = mapPacket.heightMapImg;
            const heightMapTexture = new THREE.Texture();
            heightMapTexture.image = heightMapImage;
            heightMapImage.onload = function() {
                heightMapTexture.needsUpdate = true;
            };

            // create map texture from base64 str
            let mapImage = new Image();
            mapImage.src = mapPacket.mapImg;
            const mapTexture = new THREE.Texture();
            mapTexture.image = mapImage;
            mapImage.onload = function() {
                mapTexture.needsUpdate = true;
            };

            diffuseTexture1.wrapS = diffuseTexture1.wrapT = THREE.RepeatWrapping;
            diffuseTexture2.wrapS = diffuseTexture2.wrapT = THREE.RepeatWrapping;
            detailTexture.wrapS = detailTexture.wrapT = THREE.RepeatWrapping;
            specularMap.texture.wrapS = specularMap.texture.wrapT = THREE.RepeatWrapping;
            noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

        // TERRAIN SHADER
            let terrainShader = ShaderTerrain['terrain'];

            const uniformsTerrain = THREE.UniformsUtils.clone( terrainShader.uniforms );

            // uniformsTerrain[ 'enableDiffuse2' ].value = false;
            uniformsTerrain[ 'tNormal' ].value = normalMap.texture;
            uniformsTerrain[ 'uNormalScale' ].value = 1;

            uniformsTerrain[ 'tDisplacement' ].value = noiseTexture;

            uniformsTerrain[ 'tDiffuse1' ].value = diffuseTexture1; // lowest
            uniformsTerrain[ 'tDiffuse2' ].value = diffuseTexture2; // highest
            uniformsTerrain[ 'tSpecular' ].value = specularMap.texture;
            uniformsTerrain[ 'tDetail' ].value = detailTexture;

            uniformsTerrain[ 'enableDiffuse1' ].value = true;
            uniformsTerrain[ 'enableDiffuse2' ].value = true;
            uniformsTerrain[ 'enableSpecular' ].value = true;

            uniformsTerrain[ 'diffuse' ].value.setHex( 0xffffff );
            uniformsTerrain[ 'specular' ].value.setHex( 0xffffff );

            uniformsTerrain[ 'shininess' ].value = 1;
            uniformsTerrain[ 'uDisplacementScale' ].value = 0;
            uniformsTerrain[ 'uRepeatOverlay' ].value.set( 50, 50 );

            let params = [
                [ 'heightmap', 	terrainFragmentShaderNoise, vertexShader, uniformsNoise, false ],
                [ 'normal', 	normalShader.fragmentShader, normalShader.vertexShader, uniformsNormal, false ],
                [ 'terrain', 	terrainShader.fragmentShader, terrainShader.vertexShader, uniformsTerrain, true ]
            ];

            const mlib = [];
            for ( let i = 0; i < params.length; i ++ ) {
                let material = new THREE.ShaderMaterial({
                    uniforms: params[ i ][ 3 ],
                    vertexShader: params[ i ][ 2 ],
                    fragmentShader: params[ i ][ 1 ],
                    lights: params[ i ][ 4 ],
                    fog: true
                });
                mlib[ params[ i ][ 0 ] ] = material;
            }
        
        // MATERIAL
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true,
        });

        mainCtrl.map.terrainMesh = new THREE.Mesh( terrainGeometry, mlib[ 'terrain' ]);
        // mainCtrl.map.terrainMesh.geometry['attributes'].position.array = mapPacket.vertices;

        let vertices = mainCtrl.map.terrainMesh.geometry['attributes'].position.array;
        for (let i = 0; i <= vertices.length; i += 3) {

            vertices[i+2] = mapPacket.vertices[i+2];
        }

        mainCtrl.map.terrainMesh.rotation.z = Math.PI / 2;

        mainCtrl.map.terrainMesh.geometry['attributes'].position.needsUpdate = true;
        mainCtrl.map.terrainMesh.geometry.computeVertexNormals();

        // make 0,0 the upper left corner
        // mainCtrl.map.terrainMesh.position.x += mapPacket.geometry[0] / 2;
        // mainCtrl.map.terrainMesh.position.y += mapPacket.geometry[1] / 2;

        Logger.log('TERRAIN GENERATED', mainCtrl.map.terrainMesh);
        mainCtrl.clientScene.add(mainCtrl.map.terrainMesh);

        // add vegetation
        mapPacket.vegetation.forEach( vegetation => {
            this.vegetationMeshList.push({
                visible: false,
                mesh: null,
                data: vegetation,
            });
        });

        gameState.mapLoaded = true;
    }

    public setMeshMaterialOpacity(mesh: THREE.Mesh, opacity: number) {
        if ( mesh.material ) {
            mesh.material['transparent'] = true;
            mesh.material['opacity'] = opacity;
        } else {
            if ( mesh.children.length > 0 ) {
                mesh.children.forEach( child => {
                    // is a mesh
                    if ( child['material'] ) {
                        child['material']['transparent'] = true;
                        child['material']['opacity'] = opacity;
                    } else {
                        // is group
                        if ( child.children.length > 0 ) {
                            child.children.forEach( grandChild => {
                                if ( grandChild['material'] ) {
                                    grandChild['material']['transparent'] = true;
                                    grandChild['material']['opacity'] = opacity;
                                }
                            });
                        }
                    }
                });
            }
        }
    }

    public refreshVisibleVegetation() {
        if ( gameState.mapLoaded && gameState.screen === 1 ) {
            const myPlayer = mainCtrl.players[ mainCtrl.client.id ];
            for ( let i = 0; i < this.vegetationMeshList.length; i++ ) {

                if ( (this.vegetationMeshList[i].data.x > (myPlayer.pos.x - configSettings.REFRESH_AREA_WIDTH)) && (this.vegetationMeshList[i].data.x < (myPlayer.pos.x + configSettings.REFRESH_AREA_WIDTH)) ) {
                    if ( (this.vegetationMeshList[i].data.y > (myPlayer.pos.y - configSettings.REFRESH_AREA_HEIGHT)) && (this.vegetationMeshList[i].data.y < (myPlayer.pos.y + configSettings.REFRESH_AREA_HEIGHT)) ) {
                        
                        if ( !this.vegetationMeshList[i].visible ) {
                            // add mesh to scene
                            if ( this.vegetationMeshList[i].data.type === 'grass1' ) {
                                this.vegetationMeshList[i].mesh = this.grass1Mesh.clone();
                            } else if ( this.vegetationMeshList[i].data.type === 'grass2' ) {
                                this.vegetationMeshList[i].mesh = this.grass2Mesh.clone();
                            } else if ( this.vegetationMeshList[i].data.type === 'grass3' ) {
                                this.vegetationMeshList[i].mesh = this.grass3Mesh.clone();
                            } else if ( this.vegetationMeshList[i].data.type === 'tree1' ) {
                                this.vegetationMeshList[i].mesh = this.tree1Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'tree2' ) {
                                this.vegetationMeshList[i].mesh = this.tree2Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'tree3' ) {
                                this.vegetationMeshList[i].mesh = this.tree3Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'tree4' ) {
                                this.vegetationMeshList[i].mesh = this.tree4Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'tree5' ) {
                                this.vegetationMeshList[i].mesh = this.tree5Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'tree6' ) {
                                this.vegetationMeshList[i].mesh = this.tree6Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'tree7' ) {
                                this.vegetationMeshList[i].mesh = this.tree7Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'tree8' ) {
                                this.vegetationMeshList[i].mesh = this.tree8Mesh.clone();
                                this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            } else if ( this.vegetationMeshList[i].data.type === 'fallentree1' ) {
                                this.vegetationMeshList[i].mesh = this.fallentree1Mesh.clone();
                            } else if ( this.vegetationMeshList[i].data.type === 'fallentree2' ) {
                                this.vegetationMeshList[i].mesh = this.fallentree2Mesh.clone();
                            } else if ( this.vegetationMeshList[i].data.type === 'plant1' ) {
                                this.vegetationMeshList[i].mesh = this.plant1Mesh.clone();
                            } else if ( this.vegetationMeshList[i].data.type === 'bush1' ) {
                                this.vegetationMeshList[i].mesh = this.bush1Mesh.clone();
                            } else if ( this.vegetationMeshList[i].data.type === 'bush2' ) {
                                this.vegetationMeshList[i].mesh = this.bush2Mesh.clone();
                            } else {
                                Logger.warn('unknown mesh type', this.vegetationMeshList[i].data.type);
                                continue;
                            }
                            this.vegetationMeshList[i].mesh.position.set(
                                this.vegetationMeshList[i].data.x,
                                this.vegetationMeshList[i].data.y,
                                this.vegetationMeshList[i].data.z,
                            );
                            this.vegetationMeshList[i].mesh.scale.set(
                                0.025 * this.vegetationMeshList[i].data.size,
                                0.025 * this.vegetationMeshList[i].data.size,
                                0.025 * this.vegetationMeshList[i].data.size,
                            );
                            //this.vegetationMeshList[i].mesh.rotation.z = this.vegetationMeshList[i].data.rotation;
                            
                            // this.setMeshMaterialOpacity(this.vegetationMeshList[i].mesh, 0.5);
                            mainCtrl.clientScene.add(this.vegetationMeshList[i].mesh);

                            // fade in
                            /*const tweenFadeIn = new TWEEN.Tween({ opacity : 0 })
                            .easing(TWEEN.Easing.Quadratic.InOut)
                            .to({ opacity : 1 }, 500);

                            tweenFadeIn.play();
                            tweenFadeIn.on('update', ({ opacity }) => {
                                this.vegetationMeshList[i].mesh.material['opacity'] = opacity;
                            });*/
                            
                            this.vegetationMeshList[i].visible = true;
                        }
                        continue;
                    }
                }

                if ( this.vegetationMeshList[i].visible ) {
                    mainCtrl.clientScene.remove(this.vegetationMeshList[i].mesh);
                    this.vegetationMeshList[i].visible = false;
                }
            };
        }
    }

    public logic() {
        if ( mainCtrl.players[mainCtrl.client.id] ) {
            if ( distance2(
                mainCtrl.players[mainCtrl.client.id].pos.x,
                mainCtrl.players[mainCtrl.client.id].pos.y,
                this.lastRefreshPos.x,
                this.lastRefreshPos.y) > configSettings.REFRESH_DISTANCE
            ) {
                this.lastRefreshPos.x = mainCtrl.players[mainCtrl.client.id].pos.x;
                this.lastRefreshPos.y = mainCtrl.players[mainCtrl.client.id].pos.y;
                this.refreshVisibleVegetation();
                console.log('refresh');
            }
            TWEEN.update();
        }
    }

    public loadObjectMesh(url: string, callback) {
        const loader = new GLTFLoader();
        loader.load(
            url,
            ( gltf ) => {
                Logger.log(url + ' loaded', gltf);
                callback(gltf.scene.children[0]);
            },
            ( xhr ) => {
                // called while loading is progressing
                Logger.log( `${( xhr.loaded / xhr.total * 100 )}% loaded` );
            },
            ( error ) => {
                // called when loading has errors
                Logger.error( 'An error happened', error );
            },
        );
    }

}

export interface MapPacket {
    vertices: any[],
    geometry: any[],
    material: any,
    heightMapImg: string,
    mapImg: string,
    vegetation: { x: number, y: number, z: number, rotation: number, size: number, type: string }[],
    rocks: any[],
    objects: any[],
}

export interface MapJson {
    verticesJSON: string,
    geometryJSON: string,
    heightMapImg: string,
    mapImg: string,
    materialJSON: string,
    vegetationJSON: string,
    rocksJSON: string,
    objectsJSON: string,
}

export function mapJsonToMapPacket(mapJson: MapJson): MapPacket {
    return {
        vertices: jsonToArray( JSON.parse(mapJson.verticesJSON) ),
        geometry: JSON.parse(mapJson.geometryJSON),
        material: JSON.parse(mapJson.materialJSON),
        heightMapImg: mapJson.heightMapImg,
        mapImg: mapJson.mapImg,
        vegetation: JSON.parse(mapJson.vegetationJSON),
        rocks: [],
        objects: [],
    };
}
