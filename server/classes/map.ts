import * as THREE from 'three';
import { ServerScene as serverScene } from '../controllers/main';
import { distance2 as dst2, distance2 } from '../functions/common';
const Perlin = require('../functions/perlinNoise').Perlin;
import { BufferGeometryUtils as BufferGeometryUtils } from '../dependencies/utils/BufferGeometryUtils';
import { configSettings } from './config';
const getPixels = require('get-pixels');
const base64Img = require('base64-img');

export class MapClass {

    public mapImgData = null;
    public mapHeightData = null;
    public mapVegetationData = null;
    public terrainMesh: THREE.Mesh = null;
    public trees: any[] = null;
    public rocks: any[] = null;
    public objects: any[] = null;

    constructor () {
    }

    public loadMapData(callback) {
        const self = this;
        getPixels('img/map.png', function(err, pixels) {
            if(err) {
              console.log('Bad image path')
              return
            }
            self.mapImgData = pixels;

            getPixels('img/map-height.png', function(err, pixels) {
                if(err) {
                  console.log('Bad image path')
                  return
                }
                self.mapHeightData = pixels;

                getPixels('img/map-vegetation.png', function(err, pixels) {
                    if(err) {
                      console.log('Bad image path')
                      return
                    }
                    self.mapVegetationData = pixels;
                    callback();
                });
            });
        });
    }

    public serverGenerateTerrain() {
        // CREATE TERRAIN MODEL
        let terrainGeometry = new THREE.PlaneBufferGeometry(
            configSettings.terrainWidth, configSettings.terrainHeight,
            255, 255
        ); // has to be 255 -> (segmentsWidth+1) * (segmentsHeight+1)
        BufferGeometryUtils.computeTangents( terrainGeometry );

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
        });

        this.terrainMesh = new THREE.Mesh( terrainGeometry, material);
        // this.terrainMesh.position.set(0, 0, 0);
        // this.terrainMesh.position.set( 0, - 125, 0 );
        // this.terrainMesh.rotation.x = - Math.PI / 2;
        // this.terrainMesh.visible = false;
        let perlin = new Perlin();
        // let peak = 50;
        // let smoothing = 500;
        let vertices = this.terrainMesh.geometry['attributes'].position.array;

        // get height data, take red value only
        const heightArray: number[] = [];
        let pixCounter = 0;
        this.mapHeightData.data.forEach(pixelCol => {
            if ( pixCounter % 4 === 0) {
                heightArray.push(pixelCol);
            }
            pixCounter++;
        });
        // console.log(heightArray, heightArray.length);

        let posCount = 0;
        for (let i = 0; i <= vertices.length; i++) {
            /*let peak = 30;
            let smoothing = 500;
            vertices[i+2] = peak * perlin.noise(
                vertices[i]/smoothing, 
                vertices[i+1]/smoothing
            )*/
            if ( i % 3 === 0 ) {
                const peak = 100;
                const height = 
                    heightArray[posCount] === 0
                    ? 0
                    : heightArray[posCount] / 255 * peak; // read any pixel bc black white
                vertices[i+2] = height;
                posCount++;
            }
        }

        this.terrainMesh.rotation.z = Math.PI / 2;
        this.terrainMesh.updateMatrixWorld(true);

        console.log('posCount', posCount);
        this.terrainMesh.geometry['attributes'].position.needsUpdate = true;
        this.terrainMesh.geometry.computeVertexNormals();

        // textures
        const heightMapImg = base64Img.base64Sync('img/map-height.png');
        const mapImg = base64Img.base64Sync('img/map.png');

        // make 0,0 upperleft corner
        // this.terrainMesh.position.x += configSettings.terrainWidth / 2;
        // this.terrainMesh.position.y += configSettings.terrainHeight / 2;
        // this.terrainMesh.rotation.z = Math.PI / 2;

        serverScene.add(this.terrainMesh);

        // generate vegetation
        const vegetationArray: { x: number, y: number, amount: number }[] = [];
        let vegetationCounter = 0;
        let pixelCounter = 0;
        this.mapVegetationData.data.forEach(pixelCol => {
            if ( vegetationCounter % 4 === 0) {

                const y = pixelCounter === 0 ? 0 : Math.floor(pixelCounter / 256);
                const x = pixelCounter - (y * 256);
                if ( pixelCol > 0 ) {
                    vegetationArray.push({
                        x: x,
                        y: y,
                        amount: pixelCol,
                    }); // only get red col
                }

                pixelCounter++;
            }
            vegetationCounter++;
        });
        const vegeArray: { x: number, y: number, z: number, rotation: number, size: number, type: string }[] = [];

        // grass
        for ( let i = 0; i < configSettings.grassCount; i++ ) {
            const rand = Math.random();
            let typeStr = '';
            if ( rand < 0.85 ) {
                const randInt = Math.floor(Math.random() * 3);
                typeStr = 'grass1';
                if ( randInt === 1 ) { typeStr = 'grass2'; }
                if ( randInt === 2 ) { typeStr = 'grass3'; }
            } else {
                const randInt = Math.floor(Math.random() * 3);
                typeStr = 'bush1';
                if ( randInt === 1 ) { typeStr = 'bush2'; }
                if ( randInt === 2 ) { typeStr = 'plant1'; }
            }
            this.addRandomVegetation(vegetationArray, vegeArray, typeStr);
        }

        // trees
        for ( let i = 0; i < configSettings.treeCount; i++ ) {
            const rand = Math.random();
            let typeStr = '';
            if ( rand < 0.95 ) {
                const randInt = Math.floor(Math.random() * 7);
                typeStr = 'tree1';
                if ( randInt === 1 ) { typeStr = 'tree2'; }
                if ( randInt === 1 ) { typeStr = 'tree3'; }
                if ( randInt === 1 ) { typeStr = 'tree4'; }
                if ( randInt === 1 ) { typeStr = 'tree5'; }
                if ( randInt === 1 ) { typeStr = 'tree6'; }
                if ( randInt === 1 ) { typeStr = 'tree7'; }
                if ( randInt === 1 ) { typeStr = 'tree8'; }
            } else {
                const randInt = Math.floor(Math.random() * 2);
                typeStr = 'fallentree1';
                if ( randInt === 1 ) { typeStr = 'fallentree2'; }
            }
            this.addRandomVegetation(vegetationArray, vegeArray, typeStr);
        }
        // console.log('vege', vegeArray);

        const terrainPacket: MapJson = {
            verticesJSON: JSON.stringify(vertices),
            geometryJSON: JSON.stringify([ configSettings.terrainWidth, configSettings.terrainHeight, 255, 255 ]),
            heightMapImg: heightMapImg,
            mapImg: mapImg,
            materialJSON: '{}',
            vegetationJSON: JSON.stringify(vegeArray),
            rocksJSON: '[]',
            objectsJSON: '[]',
        }
        console.log('TERRAIN GENERATED');

        return terrainPacket;
    }

    public addRandomVegetation(
        vegetationArray: { x: number, y: number, amount: number }[],
        resultArray: { x: number, y: number, z: number, rotation: number, size: number, type: string }[],
        type: string,
    ) {
        const randIndex = Math.floor( Math.random() * vegetationArray.length );
        const randAmount = Math.floor( Math.random() * 256 );
        if ( randAmount <= vegetationArray[randIndex].amount ) {
            const tileWidth = configSettings.terrainWidth / 256;
            const terrainX = (vegetationArray[randIndex].x * tileWidth + Math.random() * tileWidth) - 5000;
            const terrainY = (vegetationArray[randIndex].y * tileWidth + Math.random() * tileWidth) - 5000;
            const result = {
                x: terrainX,
                y: terrainY,
                z: this.getZFromVertices(terrainX, terrainY),
                rotation: Math.random() * (Math.PI * 2),
                size: 1 + Math.random(),
                type: type,
            };
            resultArray.push(result);
        } else { this.addRandomVegetation(vegetationArray, resultArray, type); }
    }

    // return z elevation from terrain (xy range is -5000 - 5000)
    private getZFromVertices(x: number, y: number): number {
        if ( this.terrainMesh ) {
            // note, there are 255 tiles but 256 vertices per each row. PL XY are flipped to match the terrain XY
            const tileWidth = 10000 / 255;
            const vertices = this.terrainMesh.geometry['attributes'].position.array;
            const Xtranslate = ((y + 5000) / tileWidth);
            const Ytranslate = ((x + 5000) / tileWidth);
            const XPos = Math.floor( Xtranslate );
            const YPos = Math.floor( Ytranslate );

            // vertice positions in the array, first upperleft corner, then get upperright and bottom left
            const vertexPos = ((256 * 3) * YPos) + (XPos * 3);
            const vertexPosX = ((256 * 3) * YPos) + ((XPos + 1) * 3);
            const vertexPosY = ((256 * 3) * (YPos + 1)) + (XPos * 3);
            const vertexPosXY = ((256 * 3) * (YPos + 1)) + ((XPos + 1) * 3);
            // console.log(XPos, YPos, vertices[vertexPos], vertices[vertexPosX], vertices[vertexPosY], vertices[vertexPosXY]);
            // console.log(XPos, YPos, Xtranslate, Ytranslate, x, y);

            const distX = distance2(x, y, vertices[vertexPosXY], vertices[vertexPosXY + 1] *-1);
            const distY = distance2(x, y, vertices[vertexPos], vertices[vertexPos + 1] *-1);

            if ( distX < distY ) {
                const p1 = new THREE.Vector3( vertices[vertexPosX], vertices[vertexPosX + 1] *-1, vertices[vertexPosX + 2] );
                const p2 = new THREE.Vector3( vertices[vertexPosY], vertices[vertexPosY + 1] *-1, vertices[vertexPosY + 2] );
                const p3 = new THREE.Vector3( vertices[vertexPosXY], vertices[vertexPosXY + 1] *-1, vertices[vertexPosXY + 2] );
                const z = this.zFromTriangle(y, x, p1, p2, p3);
                // console.log('DOWN', z);
                return z;
            } else {
                const p1 = new THREE.Vector3( vertices[vertexPos], vertices[vertexPos + 1] *-1, vertices[vertexPos + 2] );
                const p2 = new THREE.Vector3( vertices[vertexPosX], vertices[vertexPosX + 1] *-1, vertices[vertexPosX + 2] );
                const p3 = new THREE.Vector3( vertices[vertexPosY], vertices[vertexPosY + 1] *-1, vertices[vertexPosY + 2] );
                const z = this.zFromTriangle(y, x, p1, p2, p3);
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

/*getHeightData(img, scale) {

    if (scale == undefined) { scale=1; }
     
    let canvas = document.createElement( 'canvas' );
    canvas.width = img.width;
    canvas.height = img.height;
    let context = canvas.getContext( '2d' );

    let size = img.width * img.height;
    let data = new Float32Array( size );

    context.drawImage(img,0,0);

    for ( let i = 0; i < size; i ++ ) {
        data[i] = 0
    }

    let imgd = context.getImageData(0, 0, img.width, img.height);
    let pix = imgd.data;

    let j=0;
    for (let i = 0; i<pix.length; i +=4) {
        let all = pix[i]+pix[i+1]+pix[i+2];
        data[j++] = all/(12*scale);
    }
    
    return data;
}*/

// export const mapObj = new MapClass();