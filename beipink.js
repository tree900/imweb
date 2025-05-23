import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let mixer, clock = new THREE.Clock();
let particleMesh;
let clickPosition = new THREE.Vector3(0, 0, 0);
let hasClicked = false;

init();
animate();

function init() {
  const container = document.getElementById("container");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("bgCanvas"), alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const loader = new GLTFLoader();
  loader.load('beipink.glb', (gltf) => {
    particleMesh = gltf.scene;
    scene.add(particleMesh);
  });

  window.addEventListener('click', (event) => {
    if (hasClicked || !particleMesh) return;
    hasClicked = true;

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(particleMesh, true);

    if (intersects.length > 0) {
      clickPosition.copy(intersects[0].point);
      fadeInMainContent();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function fadeInMainContent() {
  const main = document.getElementById("mainContent");
  main.style.opacity = 1;
  main.style.transform = "translateY(0)";
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}
