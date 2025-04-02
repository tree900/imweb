import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 3);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
light.position.set(0, 1, 0);
scene.add(light);

const loader = new GLTFLoader();
loader.load('beipink.glb', (gltf) => {
  scene.add(gltf.scene);
}, undefined, (error) => {
  console.error('An error happened', error);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
