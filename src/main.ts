import {vec3, vec4, mat4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
//import * as Stats from 'stats.js';
// import * as DAT from 'dat-gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

import Cube from './geometry/cube';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  color: [255.0, 0.0, 0.0], 
  flame: [255.0, 255.0, 0.0],
  colorNoise: 3.0,
  smoothLeft: -1.0,
  smoothRight: 1.0,
  displacementFreq: 0.03,
  'Reset Scene': resetScene,
};

let icosphere: Icosphere;
let square: Square;
let prevTesselations: number = 5;
let prevColor : number[] = [255.0, 0.0, 0.0];
let prevFlame : number[] = [255.0, 255.0, 0.0];
let cube: Cube;
let time: number = 0;
let prevColorNoise: number = 0.0;
let prevSmoothLeft: number = 0.0;
let prevSmoothRight: number = 0.0;  
let prevDisplacementFrequency: number = 0.0;

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();

  //this guy will be our background
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();

  // cube = new Cube(vec3.fromValues(0, 0, 0), 1);
  // cube.create();
}

function resetScene() { 
  controls.tesselations = 5;
  controls.color = [255.0, 0.0, 0.0];
  controls.flame = [255.0, 255.0, 0.0];
  controls.colorNoise = 3.0;
  controls.smoothLeft = -1.0;
  controls.smoothRight = 1.0;
  controls.displacementFreq = 0.03;

  loadScene();
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.addColor(controls, 'color');
  gui.addColor(controls, 'flame');
  gui.add(controls, 'colorNoise', 1.0, 30.0).step(1.0);
  gui.add(controls, 'smoothLeft', -5.0, 5.0).step(0.1);
  gui.add(controls, 'smoothRight', -5.0, 5.0).step(0.1);
  gui.add(controls, 'displacementFreq', 0.0, 0.5).step(0.001);
  gui.add(controls, 'Reset Scene');
  
  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/fireball-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/fireball-frag.glsl')),
  ]);

  const background = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/back-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/back-frag.glsl')),
  ]);


  // const custom_shader = new ShaderProgram([
  //   new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
  //   new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
  // ]);


  function updateColor() {
    const [r, g, b] = controls.color;
    lambert.setUniformVec4('u_Color',vec4.fromValues(r/255, g/255, b/255, 1));
    //custom_shader.setUniformVec4('u_Color',vec4.fromValues(r/255, g/255, b/255, 1));
    
  }

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

    time = time + 1;
    lambert.setTime(time);
    background.setTime(time);
    
    gl.disable(gl.DEPTH_TEST);
    renderer.render(camera, background, [
      square,
    ]);

    gl.enable(gl.DEPTH_TEST);

    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
       icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
       icosphere.create();
    }

    //add time
    if (controls.color != prevColor) {
      prevColor = controls.color;
      updateColor();
    }

    if (controls.flame != prevFlame) {
      prevFlame = controls.flame;
      lambert.setUniformVec4('u_Flame', vec4.fromValues(prevFlame[0]/255, prevFlame[1]/255, prevFlame[2]/255, 1));
    }

    if (controls.colorNoise !== prevColorNoise) {
      prevColorNoise = controls.colorNoise;
      lambert.setUniform1f('u_ColorNoise', controls.colorNoise);
    }
    
    if (controls.smoothLeft !== prevSmoothLeft) {
      prevSmoothLeft = controls.smoothLeft;
      lambert.setUniform1f('u_SmoothLeft', controls.smoothLeft);
    }

    if (controls.smoothRight !== prevSmoothRight) {
      prevSmoothRight = controls.smoothRight;
      lambert.setUniform1f('u_SmoothRight', controls.smoothRight);
    }

    if (controls.displacementFreq !== prevDisplacementFrequency) {
      prevDisplacementFrequency = controls.displacementFreq;
      lambert.setUniform1f('u_Freq0', controls.displacementFreq);
    }


    
    renderer.render(camera, lambert, [
      icosphere,
    ]);

    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
