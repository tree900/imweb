
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let textMesh;
let particles;
let velocities = [], delays = [], startTime = null;
let particleCount = 0;
let alphaArray;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 1, 1).normalize();
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

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
  const targetCount = 40000;
  const allPositions = [];
  velocities = [];
  delays = [];
  alphaArray = [];

  const wind = new THREE.Vector3(0.01, 0.015, 0.002);
  const tempPositions = [];

  mesh.traverse((child) => {
    if (child.geometry && (child.isMesh || child.isLine || child.isLineSegments)) {
      const posAttr = child.geometry.attributes.position;
      const matrix = child.matrixWorld;

      for (let i = 0; i < posAttr.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(matrix);
        tempPositions.push(point.clone());

        if (i < posAttr.count - 1) {
          const next = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1).applyMatrix4(matrix);
          for (let j = 1; j <= 10; j++) {
            const interp = new THREE.Vector3().lerpVectors(point, next, j / 10);
            tempPositions.push(interp.clone());
          }
        }

        // 내부 채우기용 무작위 샘플링
        for (let j = 0; j < 3; j++) {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
          );
          tempPositions.push(point.clone().add(offset));
        }
      }
    }
  });

  const count = tempPositions.length;
  for (let i = 0; i < targetCount; i++) {
    const p = tempPositions[Math.floor(Math.random() * count)];
    allPositions.push(p.x, p.y, p.z);

    const dir = new THREE.Vector3().subVectors(p, clickPoint).normalize();
    const dist = p.distanceTo(clickPoint);
    const speed = 0.002 + Math.random() * 0.004;
    const velocity = dir.multiplyScalar(speed).add(wind.clone().multiplyScalar(Math.random()));

    velocities.push(velocity);
    delays.push(dist * 30);
    alphaArray.push(1);
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3));

  const sprite = new THREE.TextureLoader().load('./examples/textures/neo_particle.png');
  const material = new THREE.PointsMaterial({
    size: 0.03,
    map: sprite,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particles = new THREE.Points(particleGeo, material);
  scene.add(particles);
  particleCount = targetCount;
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

        alphaArray[i] -= 0.0025;
        if (alphaArray[i] < 0) alphaArray[i] = 0;
      }
    }

    const avgAlpha = alphaArray.reduce((a, b) => a + b, 0) / alphaArray.length;
    particles.material.opacity = avgAlpha;

    posAttr.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
