import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// 기본 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 조명
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// 컨트롤
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 6;

// 입자 텍스처
const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let instanced;
let originalPositions = [];
let directions = [];
let delays = [];
let animationStarted = false;
let startTime = 0;

const loader = new GLTFLoader();
loader.load('beipink_text_dusty.glb', (gltf) => {
  const mesh = gltf.scene.children[0];
  const geometry = mesh.geometry;
  const count = geometry.attributes.position.count;

  // 입자 밀도 조절용 서브디바이드 (선택: Blender에서 미리 적용해도 좋음)

  const particleGeo = new THREE.PlaneGeometry(0.008, 0.008);
  const material = new THREE.MeshBasicMaterial({
    map: particleTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.7,
    side: THREE.DoubleSide
  });

  instanced = new THREE.InstancedMesh(particleGeo, material, count);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const x = geometry.attributes.position.getX(i);
    const y = geometry.attributes.position.getY(i);
    const z = geometry.attributes.position.getZ(i);
    originalPositions.push(new THREE.Vector3(x, y, z));
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
    directions.push(new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ));
    delays.push(0); // 나중에 클릭 기준 거리로 세팅됨
  }

  scene.add(instanced);
});

// 클릭 → 해체 트리거
window.addEventListener('click', (event) => {
  if (!instanced || animationStarted) return;

  // 마우스 클릭 좌표 → 정규화
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const clickPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(5)); // 클릭 지점 추정

  // 입자마다 해체 거리 기반 지연 계산
  for (let i = 0; i < originalPositions.length; i++) {
    const distance = originalPositions[i].distanceTo(clickPoint);
    delays[i] = distance / 2; // 퍼지는 속도 조정
  }

  startTime = performance.now() / 1000;
  animationStarted = true;
});

const clock = new THREE.Clock();
const dummy = new THREE.Object3D();

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const currentTime = performance.now() / 1000;

  if (instanced) {
    const elapsed = currentTime - startTime;

    for (let i = 0; i < originalPositions.length; i++) {
      const delay = delays[i];
      let progress = Math.max(0, Math.min(1, (elapsed - delay) / 2)); // 2초간 분산
      const move = directions[i].clone().multiplyScalar(progress);
      const pos = originalPositions[i].clone().add(move);
      const scale = 1 - progress;

      dummy.position.copy(pos);
      dummy.scale.setScalar(scale > 0 ? scale : 0);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }

    instanced.instanceMatrix.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

animate();
