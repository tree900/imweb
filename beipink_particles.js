import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
setCameraPosition();

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 6;

// 🧪 텍스처 로딩 테스트 포함
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load('./examples/textures/neo_particle.png',
  () => console.log('✨ neo_particle.png loaded!'),
  undefined,
  (err) => console.error('❌ Failed to load neo_particle.png', err)
);

let instanced;
let originalPositions = [];
let directions = [];
let delays = [];
let animationStarted = false;
let startTime = 0;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const loader = new GLTFLoader();
loader.load('beipink_text_dusty.glb', (gltf) => {
  console.log('GLTF loaded!');

  const meshes = [];
  gltf.scene.traverse(child => {
    if (child.isMesh) {
      console.log('FOUND MESH:', child.name);
      meshes.push(child);
    }
  });

  if (meshes.length === 0) {
    console.error('No mesh found in GLB!');
    return;
  }

  const geometries = meshes.map(mesh => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    return geo;
  });

  const mergedGeometry = mergeGeometries(geometries, false);
  mergedGeometry.center();

  const count = mergedGeometry.attributes.position.count;
  const particleGeo = new THREE.PlaneGeometry(0.008, 0.008);
  const material = new THREE.MeshBasicMaterial({
    map: particleTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  instanced = new THREE.InstancedMesh(particleGeo, material, count);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const pos = new THREE.Vector3(
      mergedGeometry.attributes.position.getX(i),
      mergedGeometry.attributes.position.getY(i),
      mergedGeometry.attributes.position.getZ(i)
    );
    originalPositions.push(pos);

    dummy.position.copy(pos);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    directions.push(new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ));

    delays.push(0);
    instanced.setColorAt(i, new THREE.Color(0.92, 0.85, 0.87));
  }

  scene.add(instanced);
  camera.lookAt(0, 0, 0);
});

window.addEventListener('click', (event) => {
  if (!instanced || animationStarted) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const clickPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(5));

  for (let i = 0; i < originalPositions.length; i++) {
    const distance = originalPositions[i].distanceTo(clickPoint);
    delays[i] = distance / 3.5;
  }

  startTime = performance.now() / 1000;
  animationStarted = true;
});

const dummy = new THREE.Object3D();

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const now = performance.now() / 1000;
  const elapsed = now - startTime;

  if (instanced) {
    let allDone = true;

    for (let i = 0; i < originalPositions.length; i++) {
      const delay = delays[i];
      const progress = animationStarted ? Math.max(0, Math.min(1, (elapsed - delay) / 3)) : 0;

      const move = directions[i].clone().multiplyScalar(progress);
      const pos = originalPositions[i].clone().add(move);
      const scale = 1 - progress;

      dummy.position.copy(pos);
      dummy.scale.setScalar(scale > 0 ? scale : 0);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      const color1 = new THREE.Color(0.92, 0.85, 0.87);
      const color2 = new THREE.Color(0.7, 0.8, 1.0);
      const color3 = new THREE.Color(0.8, 1.0, 0.9);
      const color = color1.clone().lerp(color2, progress).lerp(color3, progress * 0.5);
      instanced.setColorAt(i, color);

      if (progress < 1) allDone = false;
    }

    instanced.instanceMatrix.needsUpdate = true;
    instanced.instanceColor.needsUpdate = true;

    if (allDone && animationStarted) {
      document.body.classList.add('animation-complete');
      animationStarted = false;
    }
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  setCameraPosition();
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setCameraPosition() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.position.z = aspect < 1 ? 6 : 5;
}
