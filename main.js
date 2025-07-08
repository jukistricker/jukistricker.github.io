import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js";

console.clear();

// Scene setup
let scene = new THREE.Scene();
scene.background = new THREE.Color(0x160016);
let camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 4, 21);
let renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let gu = {
  time: { value: 0 },
};

// Shader-enhanced material
let m = new THREE.PointsMaterial({
  size: 0.125,
  transparent: true,
  depthTest: false,
  sizeAttenuation: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: (shader) => {
    shader.uniforms.time = gu.time;
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        float d = length(abs(position) / vec3(40., 10., 40));
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;`
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(cos(moveS)*sin(moveT), cos(moveT), sin(moveS)*sin(moveT)) * shift.w;`
    );

    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);`
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d) );`
    );
  },
});

let clock = new THREE.Clock();
let p = null; // ⭐ Đảm bảo biến global để dùng được trong render loop

const loader = new GLTFLoader();
// Ambient light để mọi chỗ có chút sáng
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Directional light như ánh mặt trời
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

loader.load("model.glb", (gltf) => {
  const loopy = gltf.scene;
  loopy.traverse((child) => {
    if (child.isMesh) {
      const geometry = child.geometry;
      const position = geometry.attributes.position;

      const pts = [];
const sizes = [];
const shift = [];

const numPoints = 200000; // số ngôi sao
for (let i = 0; i < numPoints; i++) {
  // Dải hình vành đai / đĩa thiên hà (xung quanh gốc)
  const angle = Math.random() * Math.PI * 2;
  const radius = THREE.MathUtils.lerp(10, 40, Math.pow(Math.random(), 0.7)); // xa dần
  const height = (Math.random() - 0.5) * 4; // độ cao lên xuống

  const x = Math.cos(angle) * radius;
  const y = height;
  const z = Math.sin(angle) * radius;

  pts.push(new THREE.Vector3(x, y, z));
  sizes.push(Math.random() * 1.5 + 0.5);
  shift.push(
    Math.random() * Math.PI,
    Math.random() * Math.PI * 2,
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
    Math.random() * 0.9 + 0.1
  );
}


      const g = new THREE.BufferGeometry().setFromPoints(pts);
      g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
      g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

      p = new THREE.Points(g, m);
      p.rotation.order = "ZYX";
      p.rotation.z = 0.2;
      scene.add(p);
    }
  });
  scene.add(loopy); // ✨ Hiển thị model gốc với màu đầy đủ

});

// animation loop
renderer.setAnimationLoop(() => {
  controls.update();
  const t = clock.getElapsedTime() * 0.5;
  gu.time.value = t * Math.PI;
  if (p) p.rotation.y = t * 0.05;
  renderer.render(scene, camera);
});
