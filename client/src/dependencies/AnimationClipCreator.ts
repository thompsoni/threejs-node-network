/**
 *
 * Creator of typical test AnimationClips / KeyframeTracks
 *
 * @author Ben Houston / http://clara.io/
 * @author David Sarno / http://lighthaus.us/
 */
import * as THREE from 'three';

export const AnimationClipCreator = function () {};

AnimationClipCreator.CreateRotationAnimation = function ( period, axis ) {

	let times = [ 0, period ], values = [ 0, 360 ];

	axis = axis || 'x';
	let trackName = '.rotation[' + axis + ']';

	let track = new THREE.NumberKeyframeTrack( trackName, times, values );

	return new THREE.AnimationClip( null, period, [ track ] );

};

AnimationClipCreator.CreateScaleAxisAnimation = function ( period, axis ) {

	let times = [ 0, period ], values = [ 0, 1 ];

	axis = axis || 'x';
	let trackName = '.scale[' + axis + ']';

	let track = new THREE.NumberKeyframeTrack( trackName, times, values );

	return new THREE.AnimationClip( null, period, [ track ] );

};

AnimationClipCreator.CreateShakeAnimation = function ( duration, shakeScale ) {

	let times = [], values = [], tmp = new THREE.Vector3();

	for ( let i = 0; i < duration * 10; i ++ ) {

		times.push( i / 10 );

		tmp.set( Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0 ).
			multiply( shakeScale ).
			toArray( values, values.length );

	}

	let trackName = '.position';

	let track = new THREE.VectorKeyframeTrack( trackName, times, values );

	return new THREE.AnimationClip( null, duration, [ track ] );

};


AnimationClipCreator.CreatePulsationAnimation = function ( duration, pulseScale ) {

	let times = [], values = [], tmp = new THREE.Vector3();

	for ( let i = 0; i < duration * 10; i ++ ) {

		times.push( i / 10 );

		let scaleFactor = Math.random() * pulseScale;
		tmp.set( scaleFactor, scaleFactor, scaleFactor ).
			toArray( values, values.length );

	}

	let trackName = '.scale';

	let track = new THREE.VectorKeyframeTrack( trackName, times, values );

	return new THREE.AnimationClip( null, duration, [ track ] );

};


AnimationClipCreator.CreateVisibilityAnimation = function ( duration ) {

	let times = [ 0, duration / 2, duration ], values = [ true, false, true ];

	let trackName = '.visible';

	let track = new THREE.BooleanKeyframeTrack( trackName, times, values );

	return new THREE.AnimationClip( null, duration, [ track ] );

};


AnimationClipCreator.CreateMaterialColorAnimation = function ( duration, colors ) {

	let times = [], values = [],
		timeStep = duration / colors.length;

	for ( let i = 0; i <= colors.length; i ++ ) {

		times.push( i * timeStep );
		values.push( colors[ i % colors.length ] );

	}

	let trackName = '.material[0].color';

	let track = new THREE.ColorKeyframeTrack( trackName, times, values );

	return new THREE.AnimationClip( null, duration, [ track ] );

};
