import * as THREE from 'three';
import { GLTFLoader } from './examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from './examples/jsm/utils/BufferGeometryUtils.js';

const scene = new THREE.Scene();

// ✅ 흰색 배경
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xffffff, 1);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 8;

// ✅ 조명 및 그림자 (약하게)
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// ✅ 텍스처 (png 입자)
const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');
particleTexture.encoding = THREE.sRGBEncoding;

let instanced, originalPositions = [], directions = [], delays = [];
let animationStarted = false, startTime = 0;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ✅ GLTF 로딩 및 입자 생성
const loader = new GLTFLoader();
loader.load('beipink_text_dusty.glb', (gltf) => {
  console.log('GLTF loaded!');
  const meshes = [];

  gltf.scene.traverse(child => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });

  const geometries = meshes.map(mesh => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    return geo;
  });

  const mergedGeometry = mergeGeometries(geometries, false);
  mergedGeometry.center();

  const count = mergedGeometry.attributes.position.count;
  const particleGeo = new THREE.PlaneGeometry(0.01, 0.01);
  const material = new THREE.MeshBasicMaterial({
    map: particleTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
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
    dummy.lookAt(camera.position);  // ✅ 카메라 바라보게
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    directions.push(new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ));

    delays.push(0); // 클릭 지점에 따라 갱신됨
  }

  scene.add(instanced);
  camera.lookAt(0, 0, 0);
});

// ✅ 클릭 이벤트로 입자 날아감 시작
window.addEventListener('mousedown', (event) => {
  if (!instanced || animationStarted) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const clickPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(5));

  for (let i = 0; i < originalPositions.length; i++) {
    const distance = originalPositions[i].distanceTo(clickPoint);
    delays[i] = distance / 3.5;  // 거리 기반으로 퍼짐 시간 분산
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

  if (instanced && animationStarted) {
    for (let i = 0; i < originalPositions.length; i++) {
      const delay = delays[i];
      const progress = Math.max(0, Math.min(1, (elapsed - delay) / 3.5));
      const move = directions[i].clone().multiplyScalar(progress);
      const pos = originalPositions[i].clone().add(move);

      dummy.position.copy(pos);
      dummy.lookAt(camera.position);
      dummy.scale.setScalar(1 - progress);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      // ✅ 색상 그라데이션 (핑크 → 베이지)
      const color1 = new THREE.Color(0xf2cfd3);  // 연핑크
      const color2 = new THREE.Color(0xf4e4d5);  // 베이지
      const color = color1.clone().lerp(color2, progress);
      instanced.setColorAt(i, color);
    }

    instanced.instanceMatrix.needsUpdate = true;
    instanced.instanceColor.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
