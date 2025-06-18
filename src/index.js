import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import getStarfield from './getStarField.js';

const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement);

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
const geo = new THREE.IcosahedronGeometry(1.0, 8);
const mat = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load("/textures/earthmap1k.jpg"),
    specularMap: new THREE.TextureLoader().load("/textures/02_earthspec1k.jpg"),
    bumpMap: new THREE.TextureLoader().load("/textures/earthbump1k.jpg"),
    bumpScale: 0.04,
});

const mesh = new THREE.Mesh(geo, mat);
earthGroup.add(mesh);

const lightMat = new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load('/textures/earthlights1k.jpg'),
    blending: THREE.AdditiveBlending,
});

const lightMesh = new THREE.Mesh(geo, lightMat);
earthGroup.add(lightMesh);

const stars = getStarfield({numStars: 20000});
scene.add(stars);

// scene.add(mesh);

const sunlight = new THREE.DirectionalLight(0xffffff);
sunlight.position.set(-2,0.5,1.5);
scene.add(sunlight);

// const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000);
// scene.add(hemiLight);

function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.001;
    lightMesh.rotation.y += 0.001;
    renderer.render(scene, camera);
}

animate();

function handleWindowResize () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleWindowResize, false);