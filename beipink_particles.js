import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let textMesh;
let particles;
let velocities = [], delays = [], startTime = null;
let particleCount = 0;
let alphaArray;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 1, 1).normalize();
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  const loader = new GLTFLoader();
  loader.load('./beipink_text_dusty.glb', (gltf) => {
    textMesh = gltf.scene;
    textMesh.position.set(0, 0, 0);
    scene.add(textMesh);
  });

  window.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  animate();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  if (!textMesh) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(textMesh, true);

  if (intersects.length > 0) {
    const clickPoint = intersects[0].point;
    explodeToParticles(textMesh, clickPoint);
    scene.remove(textMesh);
  }
}

function explodeToParticles(mesh, clickPoint) {
  const allPositions = [];
  velocities = [];
  delays = [];
  alphaArray = [];

  const wind = new THREE.Vector3(0.0015, 0.002, 0); // 바람 효과

  mesh.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const positionAttr = child.geometry.attributes.position;
      const matrix = child.matrixWorld;

      for (let i = 0; i < positionAttr.count; i++) {
        const local = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
        const world = local.applyMatrix4(matrix);

        allPositions.push(world.x, world.y, world.z);

        const dir = new THREE.Vector3().subVectors(world, clickPoint).normalize();
        const dist = world.distanceTo(clickPoint);
        const baseSpeed = 0.002 + Math.random() * 0.005;
        const velocity = dir.multiplyScalar(baseSpeed).add(wind.clone().multiplyScalar(Math.random()));

        velocities.push(velocity);
        delays.push(dist * 40); // 퍼짐 효과
        alphaArray.push(1);
      }
    }
  });

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(allPositions), 3)
  );

  const sprite = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');
  const material = new THREE.PointsMaterial({
    size: 0.04,
    map: sprite,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particles = new THREE.Points(particleGeo, material);
  scene.add(particles);
  particleCount = allPositions.length / 3;
  startTime = Date.now();
}

function animate() {
  requestAnimationFrame(animate);

  if (particles && startTime) {
    const elapsed = Date.now() - startTime;
    const posAttr = particles.geometry.attributes.position;

    for (let i = 0; i < particleCount; i++) {
      if (elapsed > delays[i]) {
        posAttr.array[i * 3] += velocities[i].x;
        posAttr.array[i * 3 + 1] += velocities[i].y;
        posAttr.array[i * 3 + 2] += velocities[i].z;

        alphaArray[i] -= 0.004;
        if (alphaArray[i] < 0) alphaArray[i] = 0;
      }
    }

    // 평균 투명도 기반 전체 opacity 제어
    const avgAlpha = alphaArray.reduce((a, b) => a + b, 0) / alphaArray.length;
    particles.material.opacity = avgAlpha;

    posAttr.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
