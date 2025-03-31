import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// 기본 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
setCameraPosition();

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

// 컨트롤 (잠금 가능)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 6;

// 입자 텍스처
const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');

// 입자 변수들
let instanced;
let originalPositions = [];
let directions = [];
let delays = [];
let colors = [];
let animationStarted = false;
let startTime = 0;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const loader = new GLTFLoader();
loader.load('beipink_text_dusty.glb', (gltf) => {
  const mesh = gltf.scene.children[0];
  const geometry = mesh.geometry;
  const count = geometry.attributes.position.count;

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
    const x = geometry.attributes.position.getX(i);
    const y = geometry.attributes.position.getY(i);
    const z = geometry.attributes.position.getZ(i);

    const pos = new THREE.Vector3(x, y, z);
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

    // 초기 색상: 밝은 핑크
    const color = new THREE.Color(0.92, 0.85, 0.86);
    colors.push(color);
  }

  scene.add(instanced);
});

// 클릭 → 해체 트리거
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
    let finished = true;

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

      // 색상 변경 (그라데이션)
      const color = new THREE.Color();
      color.r = 0.92 - 0.4 * progress;
      color.g = 0.86 - 0.4 * progress;
      color.b = 0.87 - 0.3 * progress;

      instanced.setColorAt(i, color);

      if (progress < 1) finished = false;
    }

    instanced.instanceMatrix.needsUpdate = true;
    instanced.instanceColor.needsUpdate = true;

    // 입자 완전히 사라지면 콘텐츠 등장
    if (finished && animationStarted) {
      document.body.classList.add('animation-complete');
      animationStarted = false;
    }
  }

  renderer.render(scene, camera);
}

animate();

// 모바일 대응
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  setCameraPosition();
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 카메라 위치 조정 함수
function setCameraPosition() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.position.z = aspect < 1 ? 6 : 5;
}
