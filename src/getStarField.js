import * as THREE from "three";

const STAR_COLORS = [
  { r: 1.0, g: 1.0, b: 1.0, w: 60 },
  { r: 0.8, g: 0.85, b: 1.0, w: 20 },
  { r: 1.0, g: 0.95, b: 0.6, w: 10 },
  { r: 1.0, g: 0.7, b: 0.3, w: 7 },
  { r: 1.0, g: 0.4, b: 0.2, w: 3 },
];

function pickColor() {
  const total = STAR_COLORS.reduce((s, c) => s + c.w, 0);
  let r = Math.random() * total;
  for (const c of STAR_COLORS) {
    r -= c.w;
    if (r <= 0) return [c.r, c.g, c.b];
  }
  return [1, 1, 1];
}

function generateStars(count, minR, maxR) {
  const pos = [], colors = [], sizes = [], phases = [], rates = [];

  for (let i = 0; i < count; i++) {
    const radius = minR + Math.random() * (maxR - minR);
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);

    pos.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );

    const [cr, cg, cb] = pickColor();
    colors.push(cr, cg, cb);

    const brightness = 0.3 + 0.7 * (cr * 0.299 + cg * 0.587 + cb * 0.114);
    sizes.push((0.04 + Math.random() * 0.36) * brightness);
    phases.push(Math.random() * Math.PI * 2);
    rates.push(0.5 + Math.random() * 2.0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("starColor", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
  geo.setAttribute("twinklePhase", new THREE.Float32BufferAttribute(phases, 1));
  geo.setAttribute("twinkleRate", new THREE.Float32BufferAttribute(rates, 1));
  return geo;
}

const vertexShader = `
  attribute float size;
  attribute float twinklePhase;
  attribute float twinkleRate;
  attribute vec3 starColor;
  uniform float time;
  varying vec3 vColor;

  void main() {
    vColor = starColor;
    float twinkle = 0.6 + 0.4 * sin(time * twinkleRate + twinklePhase);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export default function getStarfield({ numStars = 25000 } = {}) {
  const near = Math.floor(numStars * 0.6);
  const far = numStars - near;

  const time = { value: 0 };

  const mat = new THREE.ShaderMaterial({
    uniforms: { time },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const group = new THREE.Group();
  group.add(new THREE.Points(generateStars(far, 100, 300), mat));
  group.add(new THREE.Points(generateStars(near, 25, 50), mat));

  let last = performance.now();

  function update() {
    const now = performance.now();
    time.value += (now - last) / 1000;
    last = now;
  }

  return { group, update };
}
