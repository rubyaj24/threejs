import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import getStarfield from './getStarField.js';

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement);

const earthGroup = new THREE.Group();
earthGroup.rotation.z = 23.4 * Math.PI / 180;
scene.add(earthGroup);
const geo = new THREE.IcosahedronGeometry(1.0, 8);
const mat = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('/textures/590923.jpg'),
    // color: 0xccff,
    // flatShading: true,
});

const mesh = new THREE.Mesh(geo, mat);
earthGroup.add(mesh);

const stars = getStarfield({numStars: 20000});
scene.add(stars);

scene.add(mesh);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000);
scene.add(hemiLight);

function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.001;
    renderer.render(scene, camera);
}

animate();
