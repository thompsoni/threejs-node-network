import { Vector3, Object3D } from "three";
import { distance2, distance3 } from "../functions/common";
import * as THREE from 'three';
import { vertexShader as vert } from '../shaders/shaderVert';
import { fragmentShader as frag } from '../shaders/shaderFrag';
import { mainCtrl } from '../index';
import { configSettings } from '../classes/config';

interface PointModel {
    pos: Vector3,
    mesh: THREE.Mesh,
    percent: number,
}

export class PathClass {
    public points: PointModel[] = [];
    public length = 0;
    public maxPoints = 20;
    public percent = 0;

    public dispose() {
        this.points.forEach( point => {
            mainCtrl.clientScene.remove(point.mesh);
        });
    }

    public addPoint( pos: Vector3 ) {
        const point: PointModel = {
            pos: pos,
            mesh: this.createPointMesh(pos),
            percent: 0,
        };
        this.points.push(point);

        if ( this.points.length >= this.maxPoints ) {
            this.removeFirst();
        } else {
            this.length = this.calcLength();
            this.updatePercentages();
        }
    }

    public removeFirst() {
        mainCtrl.clientScene.remove( this.points.shift().mesh ); // remove mesh and point from array
        this.length = this.calcLength();
        this.updatePercentages();
        this.percent = 0;
    }

    public calcLength(): number {
        let result = 0;
        if ( this.points.length > 1 ) {
            for ( let i = 0; i < this.points.length; i++ ) {
                if ( this.points[i + 1] ) {
                    result += distance3(this.points[i].pos, this.points[i + 1].pos);
                }
            }
        }
        return result;
    }

    private updatePercentages() {
        let totalLength = 0;
        for ( let i = 0; i < this.points.length; i++ ) {
            if ( i === 0 ) { 
                this.points[i].percent = 0;
            } else if ( i >= (this.points.length - 1) ) {
                this.points[i].percent = 1;
            } else {
                totalLength += distance3( this.points[i].pos, this.points[i - 1].pos ) / this.length;
                this.points[i].percent = totalLength;
            }
        }
    }

    private createPointMesh(pos: Vector3): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.RawShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            wireframe: true,
            visible: configSettings.DEBUG ? true : false,
        });

        const pointMesh = new THREE.Mesh(geometry, material);
        mainCtrl.clientScene.add(pointMesh);
        pointMesh.position.x = pos.x;
        pointMesh.position.y = pos.y;
        pointMesh.position.z = pos.z;
        return pointMesh;
    }
}