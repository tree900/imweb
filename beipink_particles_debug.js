import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 1); // 검정 배경

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 10;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(3, 3, 5);
scene.add(dirLight);

// 노란색 디버그 라인 (X, Y, Z 기준 축)
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 텍스처 로드
const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');
particleTexture.onLoad = () => console.log('✨ neo_particle.png loaded!');
particleTexture.onError = err => console.error('❌ Failed to load texture:', err);

// 파티클 세팅
let instanced;
let originalPositions = [];
let dummy = new THREE.Object3D();

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
    console.error('❌ No mesh found in GLB!');
    return;
  }

  const geometries = meshes.map(mesh => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld); // 월드 변환 적용
    return geo;
  });

  const mergedGeometry = mergeGeometries(geometries, false);
  mergedGeometry.center(); // 중심 정렬
  console.log("After center - First vertex:", 
    mergedGeometry.attributes.position.getX(0), 
    mergedGeometry.attributes.position.getY(0), 
    mergedGeometry.attributes.position.getZ(0)
  );

  // 파티클 생성
  const count = mergedGeometry.attributes.position.count;
  const particleGeo = new THREE.PlaneGeometry(0.015, 0.015); // 디버깅용 크게
  const material = new THREE.MeshBasicMaterial({
    map: particleTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  });

  instanced = new THREE.InstancedMesh(particleGeo, material, count);
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
    instanced.setColorAt(i, new THREE.Color(1, 1, 1)); // 흰색
  }

  scene.add(instanced);
  camera.lookAt(0, 0, 0);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (instanced) {
    instanced.instanceMatrix.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
