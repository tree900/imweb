import * as THREE from './build/three.module.js';
import { GLTFLoader } from './examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer;
let textMesh, particles;
let particleSystemCreated = false;

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const loader = new GLTFLoader();
  loader.load('./examples/textures/beipink_text_dusty.glb', (gltf) => {
    textMesh = gltf.scene;
    scene.add(textMesh);
  });

  window.addEventListener('click', onClick);
  window.addEventListener('resize', onWindowResize);
}

function onClick() {
  if (textMesh && !particleSystemCreated) {
    scene.remove(textMesh);
    createParticleSystem();
    particleSystemCreated = true;
  }
}

function createParticleSystem() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const count = 3000;

  for (let i = 0; i < count; i++) {
    positions.push((Math.random() - 0.5) * 2);
    positions.push((Math.random() - 0.5) * 2);
    positions.push((Math.random() - 0.5) * 2);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const textureLoader = new THREE.TextureLoader();
  const sprite = textureLoader.load('./examples/textures/neo_particle.png');

  const material = new THREE.PointsMaterial({
    size: 0.1,
    map: sprite,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function animate() {
  requestAnimationFrame(animate);

  if (particles) {
    particles.rotation.y += 0.002;
    particles.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
