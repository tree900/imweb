import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// 기본 세팅
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
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 6;

// 입자 텍스처
const particleTexture = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');

// GLTF 로드
const loader = new GLTFLoader();
loader.load('beipink_text_dusty.glb', (gltf) => {
  const baseMesh = gltf.scene.children[0]; // 텍스트 메시
  const geometry = baseMesh.geometry;
  const count = geometry.attributes.position.count;

  // Instanced 입자 준비
  const particleGeo = new THREE.PlaneGeometry(0.03, 0.03);
  const material = new THREE.MeshBasicMaterial({
    map: particleTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const instanced = new THREE.InstancedMesh(particleGeo, material, count);
  const dummy = new THREE.Object3D();
  const direction = [];

  for (let i = 0; i < count; i++) {
    const x = geometry.attributes.position.getX(i);
    const y = geometry.attributes.position.getY(i);
    const z = geometry.attributes.position.getZ(i);

    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    direction.push(new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ));
  }

  scene.add(instanced);

  // 입자 해체 애니메이션
  let time = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    time += clock.getDelta();

    for (let i = 0; i < count; i++) {
      geometry.attributes.position.getX(i);
      geometry.attributes.position.getY(i);
      geometry.attributes.position.getZ(i);

      dummy.position.set(
        geometry.attributes.position.getX(i) + direction[i].x * time,
        geometry.attributes.position.getY(i) + direction[i].y * time,
        geometry.attributes.position.getZ(i) + direction[i].z * time
      );

      dummy.scale.setScalar(1 - time * 0.5); // 점점 작아지게
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }

    instanced.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    if (time >= 2.0) {
      document.body.classList.add('animation-complete');
    }
  }

  animate();
});
