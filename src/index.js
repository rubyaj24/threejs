import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import getStarfield from './getStarField.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 2;
controls.maxDistance = 40;

// ---- Sun ----
const sunGroup = new THREE.Group();
scene.add(sunGroup);
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunGroup.add(sunMesh);

function makeGlowSprite(scale, stops) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(s => g.addColorStop(s.pos, s.color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false,
  });
  const sprite = new THREE.Sprite(m);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

sunGroup.add(makeGlowSprite(10, [
  { pos: 0.0,  color: 'rgba(255,248,230,1)' },
  { pos: 0.08, color: 'rgba(255,235,200,0.7)' },
  { pos: 0.2,  color: 'rgba(255,220,160,0.3)' },
  { pos: 0.4,  color: 'rgba(255,200,120,0.1)' },
  { pos: 1.0,  color: 'rgba(255,200,120,0)' },
]));
sunGroup.add(makeGlowSprite(16, [
  { pos: 0.0,  color: 'rgba(255,230,180,0.4)' },
  { pos: 0.3,  color: 'rgba(255,210,140,0.12)' },
  { pos: 1.0,  color: 'rgba(255,200,100,0)' },
]));

// ---- Earth orbit ----
const orbitRadius = 8;
let orbitAngle = 0;
let isOrbiting = true;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
earthGroup.position.set(orbitRadius, 0, 0);
scene.add(earthGroup);

camera.position.set(orbitRadius + 3, 2, 3);
controls.target.copy(earthGroup.position);

// ---- Texture loader with fallback ----
function loadMapTexture(url, fallbackUrl) {
  const texture = new THREE.Texture();
  let primaryFailed = false;

  const fallbackImg = new Image();
  fallbackImg.onload = () => {
    if (primaryFailed || !texture.image || texture.image === dummy) {
      texture.image = fallbackImg;
      texture.needsUpdate = true;
    }
  };
  fallbackImg.src = fallbackUrl;

  const primaryImg = new Image();
  primaryImg.onload = () => {
    texture.image = primaryImg;
    texture.needsUpdate = true;
  };
  primaryImg.onerror = () => { primaryFailed = true; };
  primaryImg.src = url;

  const dummy = document.createElement('canvas');
  dummy.width = 1;
  dummy.height = 1;
  texture.image = dummy;

  return texture;
}

// ---- Earth with day/night shader ----
const earthGeo = new THREE.IcosahedronGeometry(0.4, 8);
const dayTex = loadMapTexture('/textures/world.200406.3x5400x2700.jpg', '/textures/earthmap1k.jpg');
const nightTex = loadMapTexture('/textures/dnb_land_ocean_ice.2012.3600x1800.jpg', '/textures/earthlights1k.jpg');
const earthMat = new THREE.ShaderMaterial({
  uniforms: {
    dayTexture: { value: dayTex },
    nightTexture: { value: nightTex },
    lightDir: { value: new THREE.Vector3(-1, 0, 0) },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 lightDir;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec3 n = normalize(vNormal);
      vec3 l = normalize(vec3(viewMatrix * vec4(lightDir, 0.0)));
      float diff = dot(n, l);

      vec4 day = texture2D(dayTexture, vUv);
      vec4 night = texture2D(nightTexture, vUv);

      float dayBright = smoothstep(0.0, 0.3, diff);
      float nightBright = 1.0 - smoothstep(-0.15, 0.2, diff);

      vec3 finalCol = day.rgb * dayBright + night.rgb * nightBright * 2.0;
      gl_FragColor = vec4(finalCol, 1.0);
    }
  `,
});

const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earthMesh);

const cloudMat = new THREE.MeshBasicMaterial({
  map: new THREE.TextureLoader().load('/textures/earthcloudmap.jpg'),
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const cloudMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.41, 8), cloudMat);
earthGroup.add(cloudMesh);

const starfield = getStarfield({ numStars: 25000 });
scene.add(starfield.group);

// Lighting is handled in the Earth shader; no scene lights needed

// ---- Axes helper ----
const axesHelper = new THREE.AxesHelper(1.0);
axesHelper.visible = false;
earthGroup.add(axesHelper);

// ---- Orbit ring (dotted) ----
const ringSegments = 180;
const ringPositions = [];
for (let i = 0; i < ringSegments; i++) {
  const theta = (i / ringSegments) * Math.PI * 2;
  ringPositions.push(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius);
}
const ringGeo = new THREE.BufferGeometry();
ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPositions, 3));
const ringMat = new THREE.PointsMaterial({
  color: 0x00ff00,
  size: 0.05,
  transparent: true,
  opacity: 0.1,
  sizeAttenuation: true,
});
const orbitRing = new THREE.Points(ringGeo, ringMat);
orbitRing.visible = true;
scene.add(orbitRing);

// ---- Auto-rotation with idle detection ----
let autoRotate = true;
let autoRotateTimeout = null;

controls.addEventListener('start', () => {
  autoRotate = false;
  if (autoRotateTimeout) clearTimeout(autoRotateTimeout);
});

controls.addEventListener('end', () => {
  if (autoRotateTimeout) clearTimeout(autoRotateTimeout);
  autoRotateTimeout = setTimeout(() => {
    autoRotate = true;
  }, 3000);
});

// ---- Data display ----
function updateDataDisplay() {
  const rotDeg = ((earthMesh.rotation.y * 180 / Math.PI) % 360 + 360) % 360;
  document.getElementById('rotation-data').textContent = `${rotDeg.toFixed(2)}°`;

  document.getElementById('tilt-data').textContent = `23.44°`;

  const dist = camera.position.distanceTo(earthGroup.position);
  document.getElementById('zoom-data').textContent = `${dist.toFixed(2)} AU`;

  const localCamPos = camera.position.clone();
  earthGroup.worldToLocal(localCamPos);
  const lat = Math.asin(localCamPos.y / localCamPos.length()) * 180 / Math.PI;
  const lon = Math.atan2(localCamPos.z, localCamPos.x) * 180 / Math.PI;
  document.getElementById('cam-data').textContent =
    `${lat >= 0 ? '+' : ''}${lat.toFixed(2)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(2)}°`;
}

// ---- Clock ----
function updateClock() {
  const now = new Date();
  document.getElementById('clock-time').textContent =
    now.toLocaleTimeString('en-GB', { hour12: false });
  document.getElementById('clock-date').textContent =
    now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
}
setInterval(updateClock, 1000);
updateClock();

// ---- Toggle controls ----
function toggleFeature(btnId, onActivate, onDeactivate) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('click', () => {
    const active = btn.classList.toggle('active');
    if (active) onActivate(); else onDeactivate();
  });
}

toggleFeature('toggle-scanline',
  () => document.body.classList.add('show-scanline'),
  () => document.body.classList.remove('show-scanline')
);

toggleFeature('toggle-axis',
  () => { axesHelper.visible = true; },
  () => { axesHelper.visible = false; }
);

toggleFeature('toggle-orbit',
  () => { orbitRing.visible = true; },
  () => { orbitRing.visible = false; }
);

let lockFollow = true;

toggleFeature('toggle-lock',
  () => {
    lockFollow = true;
    const frameDist = 1.5;
    const dir = new THREE.Vector3().subVectors(camera.position, earthGroup.position).normalize();
    camera.position.copy(earthGroup.position).add(dir.multiplyScalar(frameDist));
    controls.target.copy(earthGroup.position);
    controls.update();
  },
  () => {
    lockFollow = false;
  }
);

toggleFeature('toggle-hud',
  () => document.body.classList.remove('hud-hidden'),
  () => document.body.classList.add('hud-hidden')
);

// ---- Mobile panel expand/collapse ----
document.querySelectorAll('.info-panel, .clock-panel').forEach(el => {
  el.addEventListener('click', () => {
    if (window.innerWidth > 640) return;
    const isExpanded = el.classList.contains('expanded');
    document.querySelectorAll('.info-panel, .clock-panel').forEach(p => p.classList.remove('expanded'));
    if (!isExpanded) el.classList.add('expanded');
  });
});

document.addEventListener('click', (e) => {
  if (window.innerWidth > 640) return;
  if (!e.target.closest('.info-panel') && !e.target.closest('.clock-panel')) {
    document.querySelectorAll('.info-panel, .clock-panel').forEach(p => p.classList.remove('expanded'));
  }
});

const _sunDir = new THREE.Vector3();

// ---- Animate ----
function animate() {
  requestAnimationFrame(animate);

  if (isOrbiting) {
    orbitAngle += 0.002;
    earthGroup.position.x = orbitRadius * Math.cos(orbitAngle);
    earthGroup.position.z = orbitRadius * Math.sin(orbitAngle);

    _sunDir.copy(earthGroup.position).negate().normalize();
    earthMat.uniforms.lightDir.value.copy(_sunDir);

    if (lockFollow) {
      controls.target.copy(earthGroup.position);
      controls.update();
    }
  }

  if (autoRotate) {
    earthMesh.rotation.y += 0.001;
    cloudMesh.rotation.y += 0.0005;
  }

  starfield.update();
  updateDataDisplay();
  renderer.render(scene, camera);
}

animate();

// ---- Resize ----
function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);
