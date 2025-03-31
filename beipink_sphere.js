import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 기본 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 조명
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 10;

// 파티클 텍스처
const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');

// 파티클 생성
const count = 3000;
const radius = 1.5;
const particleGeo = new THREE.PlaneGeometry(0.008, 0.008);
const material = new THREE.MeshBasicMaterial({
  map: particleTexture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  opacity: 0.7,
  side: THREE.DoubleSide
});

const instanced = new THREE.InstancedMesh(particleGeo, material, count);
scene.add(instanced);

const dummy = new THREE.Object3D();
const originalPositions = [];
const directions = [];
const delays = [];
let animationStarted = false;
let startTime = 0;

// 입자 구 내부 분포 생성
for (let i = 0; i < count; i++) {
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = 2 * Math.PI * Math.random();
  const r = Math.cbrt(Math.random()) * radius;

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  originalPositions.push(new THREE.Vector3(x, y, z));
  dummy.position.set(x, y, z);
  dummy.updateMatrix();
  instanced.setMatrixAt(i, dummy.matrix);

  directions.push(new THREE.Vector3(
    (Math.random() - 0.5) * 3,
    (Math.random() - 0.5) * 3,
    (Math.random() - 0.5) * 3
  ));
  delays.push(0);
}

// 클릭 시 해체 시작
window.addEventListener('click', (event) => {
  if (animationStarted) return;

  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const clickPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(5));

  for (let i = 0; i < count; i++) {
    const distance = originalPositions[i].distanceTo(clickPoint);
    delays[i] = distance / 2.5;
  }

  startTime = performance.now() / 1000;
  animationStarted = true;
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const now = performance.now() / 1000;
  const elapsed = now - startTime;

  for (let i = 0; i < count; i++) {
    const delay = delays[i];
    let progress = animationStarted ? Math.max(0, Math.min(1, (elapsed - delay) / 2)) : 0;
    const pos = originalPositions[i].clone().add(directions[i].clone().multiplyScalar(progress));
    const scale = 1 - progress;

    dummy.position.copy(pos);
    dummy.scale.setScalar(scale > 0 ? scale : 0);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  }

  instanced.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
}

animate();
