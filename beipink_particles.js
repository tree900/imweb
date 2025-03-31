import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
setCameraPosition();

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0); // 배경 투명

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 6;

const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');

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

  // 모든 메시 검색
  const meshes = [];
  gltf.scene.traverse(child => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });

  if (meshes.length === 0) {
    console.error('GLB 파일에 메시가 없습니다!');
    return;
  }

  // 메시들을 하나로 병합된 geometry로 결합
  const geometries = meshes.map(m => {
    m.geometry.applyMatrix4(m.matrixWorld);
    return m.geometry;
  });
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
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
    const baseColor = new THREE.Color(0.92, 0.85, 0.87); // 시작 색상
    instanced.setColorAt(i, baseColor);
  }

  scene.add(instanced);
  camera.lookAt(0, 0, 0);
});

// 클릭 이벤트 → 입자 흩어짐 애니메이션
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

      // 🌈 컬러 그라데이션 (세 가지 컬러 중간값)
      const color1 = new THREE.Color(0.92, 0.85, 0.87); // 핑크빛
      const color2 = new THREE.Color(0.7, 0.8, 1.0);    // 연블루
      const color3 = new THREE.Color(0.8, 1.0, 0.9);    // 민트
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
