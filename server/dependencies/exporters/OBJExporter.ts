/**
 * @author mrdoob / http://mrdoob.com/
 */
import * as THREE from 'three';

export class OBJExporter {

	constructor(){}

	parse( object ) {

		let output = '';

		let indexVertex = 0;
		let indexVertexUvs = 0;
		let indexNormals = 0;

		let vertex = new THREE.Vector3();
		let normal = new THREE.Vector3();
		let uv = new THREE.Vector2();

		let i, j, k, l, m, face = [];

		let parseMesh = function ( mesh ) {

			let nbVertex = 0;
			let nbNormals = 0;
			let nbVertexUvs = 0;

			let geometry = mesh.geometry;

			let normalMatrixWorld = new THREE.Matrix3();

			if ( geometry instanceof THREE.Geometry ) {

				geometry = new THREE.BufferGeometry().setFromObject( mesh );

			}

			if ( geometry instanceof THREE.BufferGeometry ) {

				// shortcuts
				let vertices = geometry.getAttribute( 'position' );
				let normals = geometry.getAttribute( 'normal' );
				let uvs = geometry.getAttribute( 'uv' );
				let indices = geometry.getIndex();

				// name of the mesh object
				output += 'o ' + mesh.name + '\n';

				// name of the mesh material
				if ( mesh.material && mesh.material.name ) {

					output += 'usemtl ' + mesh.material.name + '\n';

				}

				// vertices

				if ( vertices !== undefined ) {

					for ( i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

						vertex.x = vertices.getX( i );
						vertex.y = vertices.getY( i );
						vertex.z = vertices.getZ( i );

						// transfrom the vertex to world space
						vertex.applyMatrix4( mesh.matrixWorld );

						// transform the vertex to export format
						output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

					}

				}

				// uvs

				if ( uvs !== undefined ) {

					for ( i = 0, l = uvs.count; i < l; i ++, nbVertexUvs ++ ) {

						uv.x = uvs.getX( i );
						uv.y = uvs.getY( i );

						// transform the uv to export format
						output += 'vt ' + uv.x + ' ' + uv.y + '\n';

					}

				}

				// normals

				if ( normals !== undefined ) {

					normalMatrixWorld.getNormalMatrix( mesh.matrixWorld );

					for ( i = 0, l = normals.count; i < l; i ++, nbNormals ++ ) {

						normal.x = normals.getX( i );
						normal.y = normals.getY( i );
						normal.z = normals.getZ( i );

						// transfrom the normal to world space
						normal.applyMatrix3( normalMatrixWorld );

						// transform the normal to export format
						output += 'vn ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\n';

					}

				}

				// faces

				if ( indices !== null ) {

					for ( i = 0, l = indices.count; i < l; i += 3 ) {

						for ( m = 0; m < 3; m ++ ) {

							j = indices.getX( i + m ) + 1;

							face[ m ] = ( indexVertex + j ) + ( normals || uvs ? '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + ( normals ? '/' + ( indexNormals + j ) : '' ) : '' );

						}

						// transform the face to export format
						output += 'f ' + face.join( ' ' ) + "\n";

					}

				} else {

					for ( i = 0, l = vertices.count; i < l; i += 3 ) {

						for ( m = 0; m < 3; m ++ ) {

							j = i + m + 1;

							face[ m ] = ( indexVertex + j ) + ( normals || uvs ? '/' + ( uvs ? ( indexVertexUvs + j ) : '' ) + ( normals ? '/' + ( indexNormals + j ) : '' ) : '' );

						}

						// transform the face to export format
						output += 'f ' + face.join( ' ' ) + "\n";

					}

				}

			} else {

				console.warn( 'THREE.OBJExporter.parseMesh(): geometry type unsupported', geometry );

			}

			// update index
			indexVertex += nbVertex;
			indexVertexUvs += nbVertexUvs;
			indexNormals += nbNormals;

		};

		let parseLine = function ( line ) {

			let nbVertex = 0;

			let geometry = line.geometry;
			let type = line.type;

			if ( geometry instanceof THREE.Geometry ) {

				geometry = new THREE.BufferGeometry().setFromObject( line );

			}

			if ( geometry instanceof THREE.BufferGeometry ) {

				// shortcuts
				let vertices = geometry.getAttribute( 'position' );

				// name of the line object
				output += 'o ' + line.name + '\n';

				if ( vertices !== undefined ) {

					for ( i = 0, l = vertices.count; i < l; i ++, nbVertex ++ ) {

						vertex.x = vertices.getX( i );
						vertex.y = vertices.getY( i );
						vertex.z = vertices.getZ( i );

						// transfrom the vertex to world space
						vertex.applyMatrix4( line.matrixWorld );

						// transform the vertex to export format
						output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

					}

				}

				if ( type === 'Line' ) {

					output += 'l ';

					for ( j = 1, l = vertices.count; j <= l; j ++ ) {

						output += ( indexVertex + j ) + ' ';

					}

					output += '\n';

				}

				if ( type === 'LineSegments' ) {

					for ( j = 1, k = j + 1, l = vertices.count; j < l; j += 2, k = j + 1 ) {

						output += 'l ' + ( indexVertex + j ) + ' ' + ( indexVertex + k ) + '\n';

					}

				}

			} else {

				console.warn( 'THREE.OBJExporter.parseLine(): geometry type unsupported', geometry );

			}

			// update index
			indexVertex += nbVertex;

		};

		object.traverse( function ( child ) {

			if ( child instanceof THREE.Mesh ) {

				parseMesh( child );

			}

			if ( child instanceof THREE.Line ) {

				parseLine( child );

			}

		} );

		return output;

	}

};
