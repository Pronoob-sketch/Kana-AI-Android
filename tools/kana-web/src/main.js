
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  VRMLookAtQuaternionProxy,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";

const container = document.getElementById("kana-container");

if (!container) {
  throw new Error('Missing element: kana-container');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171124);

const camera = new THREE.PerspectiveCamera(
  30,
  container.clientWidth / container.clientHeight,
  0.01,
  100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x554466, 2));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(1, 2, 3);
scene.add(light);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

let vrm = null;
let mixer = null;

const clock = new THREE.Clock();
function showDebug(message) {
  const panel = document.getElementById("debug");
  if (panel) panel.textContent += "\n" + message;
}
showDebug("MAIN.JS STARTED");

async function loadKana() {
  try {
    const gltf = await loader.loadAsync("./kana.vrm");
    vrm = gltf.userData.vrm;

    if (!vrm) throw new Error("VRM model not found");

    VRMUtils.rotateVRM0(vrm);
    scene.add(vrm.scene);

    const lookAtProxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
    lookAtProxy.name = "lookAtQuaternionProxy";
    vrm.scene.add(lookAtProxy);

    const bounds = new THREE.Box3().setFromObject(vrm.scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    const distance =
      (Math.max(size.y, 1) / 2) /
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    camera.position.set(center.x, center.y, center.z + distance * 1.35);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    console.log("Kana loaded!");

    await loadFirstAnimation();
  } catch (error) {
    console.error("Kana loading failed:", error);
  }
}

async function loadFirstAnimation() {
  try {
    showDebug("Loading animation 01...");

    const gltf = await loader.loadAsync("./animations/VRMA_07.vrma");
    const animation = gltf.userData.vrmAnimations?.[0];

    if (!animation) {
      throw new Error("No VRM animation found inside VRMA_04");
    }

    const clip = createVRMAnimationClip(animation, vrm);

    mixer = new THREE.AnimationMixer(vrm.scene);
    mixer.clipAction(clip).play();

    showDebug("Animation 01 playing!");
  } catch (error) {
  showDebug("ANIMATION ERROR: " + (error.stack || error.message || error));
 }
}

function resize() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener("resize", resize);

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);
  if (vrm) vrm.update(delta);

  renderer.render(scene, camera);
}

animate();
loadKana();
