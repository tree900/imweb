import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let textMesh;
let particles;
let velocities = [], delays = [], startTime = null;
let particleCount = 0;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // ✅ 💡 조명 추가 부분!
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 1, 1).normalize();
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);
  // ✅ 조명 끝!

  const loader = new GLTFLoader();
  loader.load('./beipink_text_dusty.glb', (gltf) => {
    textMesh = gltf.scene;
    textMesh.position.set(0, 0, 0);
    scene.add(textMesh);
  });

  window.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  animate();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  if (!textMesh) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(textMesh, true);

  if (intersects.length > 0) {
    const clickPoint = intersects[0].point;
    explodeToParticles(textMesh, clickPoint);
    scene.remove(textMesh);
  }
}

function explodeToParticles(mesh, clickPoint) {
  const geometry = mesh.children[0].geometry.clone();
  const positionAttr = geometry.attributes.position;
  particleCount = positionAttr.count;

  const positions = new Float32Array(particleCount * 3);
  velocities = [];
  delays = [];

  for (let i = 0; i < particleCount; i++) {
    const x = positionAttr.getX(i);
    const y = positionAttr.getY(i);
    const z = positionAttr.getZ(i);

    const worldPos = new THREE.Vector3(x, y, z).applyMatrix4(mesh.children[0].matrixWorld);
    positions[i * 3] = worldPos.x;
    positions[i * 3 + 1] = worldPos.y;
    positions[i * 3 + 2] = worldPos.z;

    const dir = new THREE.Vector3().subVectors(worldPos, clickPoint).normalize();
    velocities.push(dir.multiplyScalar(0.01 + Math.random() * 0.02));
    const dist = worldPos.distanceTo(clickPoint);
    delays.push(dist * 30);
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const sprite = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');
  const material = new THREE.PointsMaterial({
    size: 0.05,
    map: sprite,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particles = new THREE.Points(particleGeo, material);
  scene.add(particles);
  startTime = Date.now();
}

function animate() {
  requestAnimationFrame(animate);

  if (particles && startTime) {
    const elapsed = Date.now() - startTime;
    const posAttr = particles.geometry.attributes.position;

    for (let i = 0; i < particleCount; i++) {
      if (elapsed > delays[i]) {
        posAttr.array[i * 3] += velocities[i].x;
        posAttr.array[i * 3 + 1] += velocities[i].y;
        posAttr.array[i * 3 + 2] += velocities[i].z;
      }
    }
    posAttr.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
