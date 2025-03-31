import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const scene = new THREE.Scene();

// 흰색 배경
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('beipinkCanvas'),
  alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xffffff, 1); // ✅ 흰색 배경

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
scene.add(camera);

camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// 좌표축 표시
const axesHelper = new THREE.AxesHelper(2);
scene.add(axesHelper);

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
    console.error('❌ No mesh found in GLTF!');
    return;
  }

  const geometries = meshes.map(mesh => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    return geo;
  });

  const mergedGeometry = mergeGeometries(geometries, false);
  mergedGeometry.center(); // ✅ 센터링
  scene.add(new THREE.BoxHelper(new THREE.Mesh(mergedGeometry), 0xff00ff));

  // 디버깅 좌표 출력
  const posAttr = mergedGeometry.attributes.position;
  if (posAttr.count > 0) {
    const firstPos = new THREE.Vector3(
      posAttr.getX(0),
      posAttr.getY(0),
      posAttr.getZ(0)
    );
    console.log("After center - First vertex:", firstPos);
  }

  // 입자 생성
  const particleGeo = new THREE.PlaneGeometry(0.01, 0.01);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0x000000, // ✅ 검정색 입자
    side: THREE.DoubleSide
  });

  const count = mergedGeometry.attributes.position.count;
  const instanced = new THREE.InstancedMesh(particleGeo, particleMat, count);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    dummy.position.set(
      posAttr.getX(i),
      posAttr.getY(i),
      posAttr.getZ(i)
    );
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  }

  scene.add(instanced);
});

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
