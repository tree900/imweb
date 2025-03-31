import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
setCameraPosition();

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 배경이 검정이라 안 보일 수 있으니 회색으로 설정
renderer.setClearColor(0x222222, 1);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 6;

const loader = new GLTFLoader();
loader.load('beipink_text_dusty.glb', (gltf) => {
  console.log('GLTF loaded!');
  console.log(gltf.scene);

  const mesh = gltf.scene.children.find(child => child.isMesh);
  if (!mesh) {
    console.error('GLB에 메시 없음');
    return;
  }

  console.log('First mesh:', mesh);

  // ✅ 메시 중심 정렬
  mesh.geometry.center();

  // ✅ 컬러 머티리얼 적용해서 잘 보이도록
  mesh.material = new THREE.MeshNormalMaterial();

  // ✅ 메시 추가
  scene.add(mesh);

  // ✅ 시점 고정
  camera.lookAt(0, 0, 0);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
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
