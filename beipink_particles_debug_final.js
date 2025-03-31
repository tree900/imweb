import * as THREE from './build/three.module.js';
import { GLTFLoader } from './examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from './examples/jsm/utils/BufferGeometryUtils.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: false,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.dampingFactor = 0.1;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(4, 5, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// Particle texture
const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');
particleTexture.colorSpace = THREE.SRGBColorSpace;

let instanced, startTime = 0, animationStarted = false;
let originalPositions = [], directions = [], delays = [];

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

  if (meshes.length === 0) return;

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
    opacity: 0.9,
    side: THREE.DoubleSide,
    color: 0x000000, // black particles for debugging
  });

  instanced = new THREE.InstancedMesh(particleGeo, material, count);
  instanced.castShadow = true;

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
    instanced.setColorAt(i, new THREE.Color(0x000000));
  }

  scene.add(instanced);
  camera.lookAt(0, 0, 0);
});

// Handle click
window.addEventListener('click', (event) => {
  if (!instanced || animationStarted) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const clickPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(5));

  for (let i = 0; i < originalPositions.length; i++) {
    const distance = originalPositions[i].distanceTo(clickPoint);
    delays[i] = distance / 3.5; // spread delay
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
    let allGone = true;

    for (let i = 0; i < originalPositions.length; i++) {
      const delay = delays[i];
      const progress = animationStarted ? Math.max(0, Math.min(1, (elapsed - delay) / 3.5)) : 0;

      const move = directions[i].clone().multiplyScalar(progress);
      const pos = originalPositions[i].clone().add(move);
      const scale = 1 - progress;

      dummy.position.copy(pos);
      dummy.scale.setScalar(scale > 0 ? scale : 0);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      const baseColor = new THREE.Color(0xEFDCD5); // 연핑크베이지
      const fadeColor = new THREE.Color(0xffffff); // 흰색
      const color = baseColor.clone().lerp(fadeColor, progress);
      instanced.setColorAt(i, color);

      if (progress < 1) allGone = false;
    }

    instanced.instanceMatrix.needsUpdate = true;
    instanced.instanceColor.needsUpdate = true;

    if (allGone && animationStarted) {
      document.body.classList.add('animation-complete');
      animationStarted = false;
    }
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
