import * as THREE from 'three';

let scene, camera, renderer, particles, geometry, material;
let targetPositions = [], currentPositions = [];
let mouse = new THREE.Vector2(0, 0);
let clock = new THREE.Clock();

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 100;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  geometry = new THREE.BufferGeometry();

  fetch("particles_positions.json")
    .then(res => res.json())
    .then(data => {
      targetPositions = data.map(p => new THREE.Vector3(p[0], p[1], p[2]));

      for (let i = 0; i < targetPositions.length; i++) {
        currentPositions.push(new THREE.Vector3(
          (Math.random() - 0.5) * 400,
          (Math.random() - 0.5) * 400,
          (Math.random() - 0.5) * 400
        ));
      }

      const positions = new Float32Array(currentPositions.length * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      material = new THREE.PointsMaterial({ color: 0xff69b4, size: 1.5 });
      particles = new THREE.Points(geometry, material);
      scene.add(particles);
    });

  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (!particles) return;

  const positions = particles.geometry.attributes.position.array;

  for (let i = 0; i < currentPositions.length; i++) {
    let cur = currentPositions[i];
    let target = targetPositions[i];
    let distToMouse = cur.distanceTo(new THREE.Vector3(mouse.x * 100, mouse.y * 100, 0));
    let speed = distToMouse < 50 ? 0.1 : 0.02;

    cur.lerp(target, speed);

    positions[i * 3 + 0] = cur.x;
    positions[i * 3 + 1] = cur.y;
    positions[i * 3 + 2] = cur.z;
  }

  particles.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
