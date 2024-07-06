import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import * as Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
var camera, scene, renderer;

var isWireframe = false;

var cameraPerspective;

var ambientLight, directionalLight;

var isDirectionalLightOn = true, isLightsOn = true, isSpotLightOn = true, isPointLightOn = true;

var clock = new THREE.Clock();

var domeMesh;
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('still-frame.png');
const domeMaterial = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide // Render the material on the back side of the geometry
});

const materials = {
  blue: new THREE.MeshBasicMaterial({color: 0x0000FF, wireframe: false}),
  black: new THREE.MeshBasicMaterial({color: 0x000000, wireframe: false}),
  green : new THREE.MeshBasicMaterial({color: 0x00FF00, wireframe: false}),
  red : new THREE.MeshBasicMaterial({color: 0xFF0000, wireframe: false}),
  yellow : new THREE.MeshBasicMaterial({color: 0xFFC000, wireframe: false}),
  lightBlue : new THREE.MeshBasicMaterial({color: 0xADD8E6, wireframe: false, side: THREE.DoubleSide}),
}

const shadeMaterials = {
  lambert : new THREE.MeshLambertMaterial({ color: 0xff0000, wireframe: false, side: THREE.DoubleSide }), 
  phong : new THREE.MeshPhongMaterial({ color: 0xFFC000, wireframe: false, side: THREE.DoubleSide}),
  toon : new THREE.MeshToonMaterial({ color: 0x006400, wireframe: false, side: THREE.DoubleSide}),
  normal : new THREE.MeshNormalMaterial({wireframe: false, side: THREE.DoubleSide}),
}

var topCylinder, topCylinderMesh;

var Mobius;

const rings = {};

const ringMesh = {};

const surfaces = [];

const spotLights = [];

const pointLights = [];

var isMoving = {
  BigRing: false,
  MediumRing: false,
  SmallRing: false,
};

var isGoingDown = {
  BigRing: true,
  MediumRing: true,
  SmallRing: true,
};

var isGoingUp = {
  BigRing: false,
  MediumRing: false,
  SmallRing: false,
};

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene(){
    'use strict'; 
    scene = new THREE.Scene();

    scene.add(new THREE.AxesHelper(100));

    createDome(0, 0, 0);
    createCylinders();
    createLights();
    createParametricFigures();
}
//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCameras() {
  cameraPerspective = new THREE.PerspectiveCamera(70,
    window.innerWidth / window.innerHeight,
    1,
    1000);
  cameraPerspective.position.x = 190;
  cameraPerspective.position.y = 170;
  cameraPerspective.position.z = 190;
  cameraPerspective.lookAt(scene.position);

  camera = cameraPerspective;
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

function createLights(){
  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(300, 300, 300);
  scene.add(directionalLight);

  // Luz ambiente
  ambientLight = new THREE.AmbientLight(0xffa500, 1);
  scene.add(ambientLight);

  // Create SpotLights
  const angleIncrement = (Math.PI * 2) / 8; // Ângulo de incremento para cada superfície
  let radius = 96;
  let cloneIndex = 0;
  for (let ring in rings) {
    for (let i = 0; i < 8; i++) {
      const angle = i * angleIncrement;
      const x = radius/1.2 * Math.cos(angle);
      const y = radius/1.2 * Math.sin(angle);
      const z = -3;

      const spotlight = new THREE.SpotLight(0xffffff, 100);
      spotlight.position.set(x, y, z);

      spotlight.angle = Math.PI; // Ângulo de abertura
      spotlight.penumbra = 0.05; // Penumbra
      spotlight.decay = 2; // Atenuação
      spotlight.distance = 200; // Distância máxima de iluminação


      rings[ring].add(spotlight);
      spotLights.push(spotlight);

      cloneIndex++;
    }
    radius -= 28; // Raio do anel
  }

  // create PointLights
  radius = 12.5;
  for (let i = 0; i < 8; i++) {
    const angle = i * angleIncrement;
      const x = radius/1.2 * Math.cos(angle);
      const y = 50;
      const z = radius/1.2 * Math.sin(angle);

    const pointLight = new THREE.PointLight(0xffffff, 1000000, 2000); // Cor, intensidade, distância
    pointLight.position.set(x, y, z);

    pointLights.push(pointLight);
    topCylinder.add(pointLight);
  }
}

function toggleDirectionalLight(){
  if (isLightsOn) {
    if (!isDirectionalLightOn) scene.remove(directionalLight); 
    else scene.add(directionalLight); 
  }
}

function toggleLights(){
  if (isLightsOn){
    surfaces.forEach(surface => {
      surface.material = surface.userData.current;
    });
    Mobius.material = Mobius.userData.current;
    ringMesh['BigRing'].material = shadeMaterials.toon;
    ringMesh['MediumRing'].material = shadeMaterials.phong;
    ringMesh['SmallRing'].material = shadeMaterials.lambert;
    topCylinderMesh.material = shadeMaterials.normal;
    domeMesh.material = domeMaterial;
  } 
  else {
    surfaces.forEach(surface => {
      surface.material = surface.userData.basic;
    });
    Mobius.material = Mobius.userData.basic;
    ringMesh['BigRing'].material = materials.green;
    ringMesh['MediumRing'].material = materials.yellow;
    ringMesh['SmallRing'].material = materials.red;
    topCylinderMesh.material = materials.blue;
    domeMesh.material = materials.lightBlue;
  }
} 

function toggleSpotLights(){
  if (isLightsOn) {
    if (!isSpotLightOn) spotLights.forEach(light => {light.intensity = 0;});
    else spotLights.forEach(light => {light.intensity = 100;});
  } 
}

function togglePointLights(){
  if (isLightsOn) {
    if (!isPointLightOn) pointLights.forEach(light => {light.intensity = 0;});
    else pointLights.forEach(light => {light.intensity = 100;});
  }
}

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

function createDome(x, y, z) {
  'use strict';

  const dome = new THREE.Object3D();
  const geometry = new THREE.SphereGeometry(400, 400, 300, 0, Math.PI * 2, 0, Math.PI / 2);
  const material = domeMaterial;

  domeMesh = new THREE.Mesh(geometry, material);
  domeMesh.position.set(x, y, z);
  dome.add(domeMesh);

  scene.add(dome);
}

function createCylinders() {
  createBigRing(0, 18, 0);
  createMediumRing(0, 42, 0);
  createSmallRing(0, 66, 0);
  createTopCylinder(0, 45, 0);
}

function createSmallRing(x, y, z) {
  const SmallRing = new THREE.Object3D();
  const outerRadius = 40;
  const innerRadius = 12;
  const outerShape = new THREE.Shape();
  outerShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  outerShape.holes.push(holePath);

  const extrudeSettings = {
    steps: 1,
    depth: 18,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);

  const material = shadeMaterials.lambert;
  const mesh = new THREE.Mesh(geometry, material);

  SmallRing.rotation.x = Math.PI / 2;

  SmallRing.position.x = x;
  SmallRing.position.y = y;
  SmallRing.position.z = z;
  mesh.position.set(0, 0, 0);

  SmallRing.add(mesh);

  rings.SmallRing = SmallRing;
  ringMesh.SmallRing = mesh;

  scene.add(SmallRing);
}

function createMediumRing(x, y, z) {
  const MediumRing = new THREE.Object3D();
  const outerRadius = 68;
  const innerRadius = 40;
  const outerShape = new THREE.Shape();
  outerShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  outerShape.holes.push(holePath);

  const extrudeSettings = {
    steps: 1,
    depth: 18,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
  const material = shadeMaterials.phong;
  const mesh = new THREE.Mesh(geometry, material);

  MediumRing.rotation.x = Math.PI / 2;

  MediumRing.position.x = x;
  MediumRing.position.y = y;
  MediumRing.position.z = z;
  mesh.position.set(0, 0, 0);
  MediumRing.add(mesh);

  rings.MediumRing = MediumRing;
  ringMesh.MediumRing = mesh;

  scene.add(MediumRing);
}

function createBigRing(x, y, z) {
  const BigRing = new THREE.Object3D();
  const outerRadius = 96;
  const innerRadius = 68;
  const outerShape = new THREE.Shape();
  outerShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  outerShape.holes.push(holePath);

  const extrudeSettings = {
    steps: 1,
    depth: 18,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
  const material = shadeMaterials.toon;
  const mesh = new THREE.Mesh(geometry, material);

  BigRing.rotation.x = Math.PI / 2;

  BigRing.position.x = x;
  BigRing.position.y = y;
  BigRing.position.z = z;

  mesh.position.set(0, 0, 0);
  BigRing.add(mesh);

  rings.BigRing = BigRing;
  ringMesh.BigRing = mesh;

  scene.add(BigRing);
}

function createTopCylinder(x, y, z) {
  topCylinder = new THREE.Object3D();
  const geometry = new THREE.CylinderGeometry(25, 25, 90, 100);
  const material = shadeMaterials.normal;
  const mesh = new THREE.Mesh(geometry, material);

  topCylinder.position.x = x;
  topCylinder.position.y = y;
  topCylinder.position.z = z;

  mesh.position.set(0, 0, 0);
  topCylinder.add(mesh);
  topCylinderMesh = mesh;

  scene.add(topCylinder);
}

function rotateTopCylinder() {
  const deltaTime = clock.getDelta();
  topCylinder.rotation.y += 0.1 * deltaTime;
}

function moveRingUp(ring) {
  rings[ring].position.y += 0.3;
  if (rings[ring].position.y > 90) {
    rings[ring].position.y = 90;
    isGoingDown[ring] = true;
    isGoingUp[ring] = false;
  }
}

function moveRingDown(ring) {
  rings[ring].position.y += -0.3;
  if (rings[ring].position.y < 0) {
    rings[ring].position.y = 0;
    isGoingDown[ring] = false;
    isGoingUp[ring] = true
  }
}

function checkRingMovement() {
  for (let key in rings) {
    if (isMoving[key]) {
      if (isGoingDown[key]) moveRingDown(key);
      else if (isGoingUp[key]) moveRingUp(key);
    }
  }
}

//////////////////////
/* PARAMETRIC FUNCTIONS */
//////////////////////

function hyperboloid(u, v, target) {
  const a = 5;
  const b = 5;
  const c = 10;
  u = (u - 0.5) * 2; // u in range [-1, 1]
  v = v * Math.PI * 2;
  const x = a * Math.cosh(u) * Math.cos(v);
  const y = b * Math.cosh(u) * Math.sin(v);
  const z = c * Math.sinh(u);
  target.set(x, y, z);
}

function kleinBottle(u, v, target) {
  u = u * Math.PI * 2;
  v = v * Math.PI * 2;
  u = u * 2;
  let x, y, z;
  if (u < Math.PI) {
    x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
    y = 8 * Math.sin(u) + (2 * (1 - Math.cos(u) / 2)) * Math.sin(u) * Math.cos(v);
  } else {
    x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
    y = 8 * Math.sin(u);
  }
  z = (2 * (1 - Math.cos(u) / 2)) * Math.sin(v);
  target.set(x, y, z);
}

function enneper(u, v, target) {
  u = (u - 0.5) * 2; // u in range [-1, 1]
  v = (v - 0.5) * 2; // v in range [-1, 1]
  const x = u - (u**3) / 3 + u * v**2;
  const y = v - (v**3) / 3 + v * u**2;
  const z = u**2 - v**2;
  target.set(x * 5, y * 5, z * 5);
}

function twistedCone(u, v, target) {
  const r = u * 5;
  const theta = v * 2 * Math.PI;
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  const z = r * Math.sin(3 * theta);
  target.set(x, y, z);
}

function tetrahedral(u, v, target) {
  u = u * 2 - 1; // u in range [-1, 1]
  v = v * 2 - 1; // v in range [-1, 1]
  const y = u * (1 - v * v) / Math.sqrt(1 + u * u);
  const x = v * (1 - u * u) / Math.sqrt(1 + v * v);
  const z = (u * v) / Math.sqrt(1 + u * u + v * v);
  target.set(x * 5, y * 5, z * 5);
}

function cone(u, v, target) {
  const R = 5; // Base radius
  const H = 10; // Height
  const x = (1 - u) * R * Math.cos(v * 2 * Math.PI);
  const y = u * H;
  const z = (1 - u) * R * Math.sin(v * 2 * Math.PI);
  target.set(x, y, z);
}

function frustum(u, v, target) {
  const R1 = 5; // Top base radius (larger)
  const R2 = 2.5; // Bottom base radius (smaller)
  const H = 10; // Height
  const radius = R1 + (R2 - R1) * u; // Interpolating radius
  const angle = v * 2 * Math.PI;
  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  const y = u * H; // Height along the y-axis
  target.set(x, y, z);
}

function doughnut(u, v, target) {
  const R = 5; // Major radius
  const r = 2; // Minor radius
  
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI * 2;

  const x = (R + r * Math.cos(phi)) * Math.cos(theta);
  const y = (R + r * Math.cos(phi)) * Math.sin(theta);
  const z = r * Math.sin(phi);

  target.set(x, y, z);
}

function createParametricSurface(surfaceFunc, widthSegments, heightSegments) {
  const geometry = new ParametricGeometry(surfaceFunc, widthSegments, heightSegments);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xFFC000, wireframe: false, side: THREE.DoubleSide}));
  mesh.scale.set(0.5, 0.5, 0.5);
  mesh.userData.lambert = new THREE.MeshLambertMaterial({ color: 0xff0000, wireframe: false, side: THREE.DoubleSide });
  mesh.userData.phong = new THREE.MeshPhongMaterial({ color: 0xFFC000, wireframe: false, side: THREE.DoubleSide});
  mesh.userData.toon = new THREE.MeshToonMaterial({ color: 0x006400, wireframe: false, side: THREE.DoubleSide});
  mesh.userData.normal = new THREE.MeshNormalMaterial({wireframe: false, side: THREE.DoubleSide});
  mesh.userData.basic = new THREE.MeshBasicMaterial({color: 0xADD8E6, wireframe: false});
  mesh.userData.current = new THREE.MeshPhongMaterial({ color: 0xFFC000, wireframe: false, side: THREE.DoubleSide});
  surfaces.push(mesh);
}

function createParametricFigures() {
  createParametricSurface(hyperboloid, 21, 21);
  createParametricSurface(kleinBottle, 22, 22);
  createParametricSurface(enneper, 23, 23);
  createParametricSurface(twistedCone, 24, 24);
  createParametricSurface(tetrahedral, 25, 25);
  createParametricSurface(frustum, 24, 24);
  createParametricSurface(cone, 23, 23);
  createParametricSurface(doughnut, 22, 22);

  createParametricSurface(hyperboloid, 18, 18);
  createParametricSurface(kleinBottle, 19, 19);
  createParametricSurface(enneper, 20, 20);
  createParametricSurface(twistedCone, 21, 21);
  createParametricSurface(tetrahedral, 22, 22);
  createParametricSurface(frustum, 21, 21);
  createParametricSurface(cone, 20, 20);
  createParametricSurface(doughnut, 19, 19);

  createParametricSurface(hyperboloid, 17, 17);
  createParametricSurface(kleinBottle, 18, 18);
  createParametricSurface(enneper, 19, 19);
  createParametricSurface(twistedCone, 20, 20);
  createParametricSurface(tetrahedral, 19, 19);
  createParametricSurface(frustum, 18, 18);
  createParametricSurface(cone, 17, 17);
  createParametricSurface(doughnut, 16, 16);

  addParametricSurfacesToRing();

  createMobiusStrip();
}

function rotateSurfaces() {
  for (let surface in surfaces) {
    surfaces[surface].rotation.y += 0.05;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function addParametricSurfacesToRing() {
  shuffleArray(surfaces);
  const angleIncrement = (Math.PI * 2) / 8; // Ângulo de incremento para cada superfície
  let ringRadius = 96;
  let cloneIndex = 0;
  for (let ring in rings) {
    for (let i = 0; i < 8; i++) {
      const angle = i * angleIncrement;
      const x = ringRadius/1.2 * Math.cos(angle);
      const y = ringRadius/1.2 * Math.sin(angle);
      const z = -6;
      const clone = surfaces[cloneIndex];
      clone.position.set(x, y, z);
      clone.rotation.x = -Math.PI / 2;
      rings[ring].add(clone);
      cloneIndex++;
    }
    ringRadius -= 28; // Raio do anel
  }
}

function updateShading(shadingType) {
  surfaces.forEach(surface => {
      surface.material = surface.userData[shadingType];
      surface.userData.current = surface.userData[shadingType];
  });
  Mobius.material = Mobius.userData[shadingType];
  Mobius.userData.current = Mobius.userData[shadingType];
}

function defineMobius(radius, width, segments) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [
    15,
    0,
    0,
    25,
    0,
    0,
    14.324393163944306,
    4.654277475549503,
    -0.7821723252011543,
    23.717867487861835,
    7.706402299448391,
    0.7821723252011543,
    12.333235466029882,
    8.960620073974725,
    -1.545084971874737,
    20.027444308968015,
    14.5507900177242,
    1.545084971874737,
    9.137102572777966,
    12.576142786662238,
    -2.2699524986977337,
    14.37430751892096,
    19.78453698833566,
    2.2699524986977337,
    4.930339887498949,
    15.174025904434005,
    -2.938926261462366,
    7.430339887498949,
    22.868234747372135,
    2.938926261462366,
    1.0081577850884798e-15,
    16.464466094067262,
    -3.5355339059327373,
    1.4411358132062265e-15,
    23.535533905932738,
    3.5355339059327373,
    -5.272161727492246,
    16.226045354028333,
    -4.045084971874737,
    -7.088518047505648,
    21.816215297777813,
    4.045084971874737,
    -10.421460443710483,
    14.343909739628607,
    -4.455032620941839,
    -13.089949647988437,
    18.01677003536929,
    4.455032620941839,
    -14.930339887498947,
    10.847526885842765,
    -4.755282581475767,
    -17.430339887498945,
    12.663883205856166,
    4.755282581475767,
    -18.27724023915478,
    5.938635346482025,
    -4.938441702975689,
    -19.765020412651364,
    6.422044428515876,
    4.938441702975689,
    -20,
    2.4492935982947065e-15,
    -5,
    -20,
    2.4492935982947065e-15,
    5,
    -19.765020412651364,
    -6.42204442851588,
    -4.938441702975688,
    -18.27724023915478,
    -5.938635346482029,
    4.938441702975688,
    -17.430339887498953,
    -12.66388320585616,
    -4.755282581475768,
    -14.93033988749895,
    -10.84752688584276,
    4.755282581475768,
    -13.089949647988442,
    -18.016770035369287,
    -4.455032620941839,
    -10.421460443710487,
    -14.343909739628605,
    4.455032620941839,
    -7.088518047505652,
    -21.816215297777806,
    -4.045084971874737,
    -5.27216172749225,
    -16.226045354028336,
    4.045084971874737,
    -4.323407439618679e-15,
    -23.535533905932738,
    -3.5355339059327378,
    -3.0244733552654393e-15,
    -16.464466094067262,
    3.5355339059327378,
    7.430339887498944,
    -22.86823474737214,
    -2.9389262614623664,
    4.9303398874989455,
    -15.174025904434007,
    2.9389262614623664,
    14.374307518920954,
    -19.784536988335663,
    -2.269952498697734,
    9.137102572777962,
    -12.576142786662238,
    2.269952498697734,
    20.027444308968015,
    -14.550790017724205,
    -1.5450849718747375,
    12.33323546602988,
    -8.960620073974729,
    1.5450849718747375,
    23.717867487861835,
    -7.706402299448398,
    -0.7821723252011549,
    14.324393163944308,
    -4.654277475549509,
    0.7821723252011549,
    25,
    -6.123233995736766e-15,
    -6.123233995736766e-16,
    15,
    -3.67394039744206e-15,
    6.123233995736766e-16
];
  const indices = [
    0,
    1,
    3,
    3,
    2,
    0,
    2,
    3,
    5,
    5,
    4,
    2,
    4,
    5,
    7,
    7,
    6,
    4,
    6,
    7,
    9,
    9,
    8,
    6,
    8,
    9,
    11,
    11,
    10,
    8,
    10,
    11,
    13,
    13,
    12,
    10,
    12,
    13,
    15,
    15,
    14,
    12,
    14,
    15,
    17,
    17,
    16,
    14,
    16,
    17,
    19,
    19,
    18,
    16,
    18,
    19,
    21,
    21,
    20,
    18,
    20,
    21,
    23,
    23,
    22,
    20,
    22,
    23,
    25,
    25,
    24,
    22,
    24,
    25,
    27,
    27,
    26,
    24,
    26,
    27,
    29,
    29,
    28,
    26,
    28,
    29,
    31,
    31,
    30,
    28,
    30,
    31,
    33,
    33,
    32,
    30,
    32,
    33,
    35,
    35,
    34,
    32,
    34,
    35,
    37,
    37,
    36,
    34,
    36,
    37,
    39,
    39,
    38,
    36,
    38,
    39,
    41,
    41,
    40,
    38
];
  const normals = [];
  const uvs = [];

  /*
  for (let i = 0; i <= segments; i++) {
    const u = i / segments * Math.PI * 2;
    for (let j = 0; j <= 1; j++) {
      const v = (j - 0.5) * 2;

      const x = (radius + width * v * Math.cos(u / 2)) * Math.cos(u);
      const y = (radius + width * v * Math.cos(u / 2)) * Math.sin(u);
      const z = width * v * Math.sin(u / 2);

      vertices.push(x, y, z);

      const normal = new THREE.Vector3(x, y, z).normalize();
      normals.push(normal.x, normal.y, normal.z);

      uvs.push(i / segments, j);
    }
  }


  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;

    indices.push(a, b, d);
    indices.push(d, c, a);
  }

  */

  console.log(vertices, indices)

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  //geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  //geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals()
  return geometry;
}

function createMobiusStrip() {
  const geometry = defineMobius(20, 5, 20);
  Mobius = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xFFC000, wireframe: false, side: THREE.DoubleSide}));
  Mobius.userData.lambert = new THREE.MeshLambertMaterial({ color: 0xff0000, wireframe: false, side: THREE.DoubleSide });
  Mobius.userData.phong = new THREE.MeshPhongMaterial({ color: 0xFFC000, wireframe: false, side: THREE.DoubleSide});
  Mobius.userData.toon = new THREE.MeshToonMaterial({ color: 0x006400, wireframe: false, side: THREE.DoubleSide});
  Mobius.userData.normal = new THREE.MeshNormalMaterial({wireframe: false, side: THREE.DoubleSide});
  Mobius.userData.basic = new THREE.MeshBasicMaterial({color: 0xADD8E6, wireframe: false});
  Mobius.userData.current = new THREE.MeshPhongMaterial({ color: 0xFFC000, wireframe: false, side: THREE.DoubleSide});
  Mobius.scale.set(0.5, 0.5, 0.5);
  Mobius.rotation.x = Math.PI / 2;
  Mobius.position.set(0, 50, 0);
  topCylinder.add(Mobius);
}

function rotateMobiusStrip() {
  Mobius.rotation.z += 0.01;
}

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions(){
    'use strict';

}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions(){
    'use strict';

}

////////////
/* UPDATE */
////////////
function update(){
    'use strict';
}


/////////////
/* DISPLAY */
/////////////
function render() {
    'use strict';

    renderer.render( scene, camera );

    
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
    'use strict';
    renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf0f0f0);

    document.body.appendChild(renderer.domElement);
    document.body.appendChild( VRButton.createButton( renderer ) );

    renderer.xr.enabled = true;

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    createScene();
    createCameras();
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
    'use strict';

    update();
    render();

    rotateTopCylinder();
    checkRingMovement();
    rotateSurfaces();
    rotateMobiusStrip();
    toggleSpotLights();
    toggleLights();
    toggleDirectionalLight();
    togglePointLights();
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() { 
    'use strict';
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (window.innerHeight > 0 && window.innerWidth > 0) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
    'use strict';
    getKeyOnPress(e.keyCode);
    switch (e.keyCode) {
      case(49): // 1
        isMoving['BigRing'] = true;
        break;

      case(50): // 2
        isMoving['MediumRing'] = true;
        break;

      case(51): // 3
        isMoving['SmallRing'] = true;
        break;

      case(81): // Q
        updateShading('lambert');
        break;

      case(87): // W
        updateShading('phong');
        break;

      case(69): // E
        updateShading('toon');
        break;

      case(82): // R
        updateShading('normal');
        break;
      
      case(80): // P
        isPointLightOn = !isPointLightOn;
        break;

      case(84): // T;
        isLightsOn = !isLightsOn;
        break;

      case(83): // S
        isSpotLightOn = !isSpotLightOn;
        break;
      
      case(68): // D
        isDirectionalLightOn = !isDirectionalLightOn;
        break;

      case(52): // 4
        if (!isWireframe) {
          isWireframe = true;
          ToggleWireFrame();
          break; 
        }
    }
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e){
    'use strict';
    getKeyOnRelease(e.keyCode);
    switch(e.keyCode){
      case(49): // 1
        isMoving['BigRing'] = false;
        break;

      case(50): // 2
        isMoving['MediumRing'] = false;
        break;

      case(51): // 3
        isMoving['SmallRing'] = false;
        break;

      case(52): // 4
        isWireframe = false;
        break;
    }
}

function ToggleWireFrame(){
  'use strict';
  for (let key in shadeMaterials) { 
    shadeMaterials[key].wireframe = !shadeMaterials[key].wireframe;
  }
  materials.black.wireframe = !materials.black.wireframe;
}

function getKeyOnPress(key){
  const char = String.fromCharCode(key);
  const button = document.getElementById(char.toLowerCase());
  button.classList.add('button-pressed');
}

function getKeyOnRelease(key){
  const char = String.fromCharCode(key);
  const button = document.getElementById(char.toLowerCase());
  button.classList.remove('button-pressed');
}

init();
renderer.setAnimationLoop(animate)