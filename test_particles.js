import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0); // 투명 배경

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const particleTexture = new THREE.TextureLoader().load(
  './examples/textures/neo_particle.png',
  () => console.log('✅ Texture loaded'),
  undefined,
  (err) => console.error('❌ Texture load failed:', err)
);

// ▶️ 간단한 입자 100개 테스트
const count = 100;
const particleGeo = new THREE.PlaneGeometry(0.04, 0.04); // 크게 보이게
const material = new THREE.MeshBasicMaterial({
  map: particleTexture,
  transparent: true,
  depthWrite: false,
  opacity: 1.0,
  side: THREE.DoubleSide
});

const instanced = new THREE.InstancedMesh(particleGeo, material, count);
const dummy = new THREE.Object3D();

for (let i = 0; i < count; i++) {
  const x = (Math.random() - 0.5) * 2;
  const y = (Math.random() - 0.5) * 2;
  const z = (Math.random() - 0.5) * 2;
  dummy.position.set(x, y, z);
  dummy.updateMatrix();
  instanced.setMatrixAt(i, dummy.matrix);
}
scene.add(instanced);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
