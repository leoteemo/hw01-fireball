#version 300 es
precision highp float;

uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform float u_Time;

in vec2 fs_Pos;
out vec4 out_Col;

float noise1D(float x) {
  x = (x * 100.0) + 0.1;
  return fract(sin(x) * 43758.5453);
}

float noise2D(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}


void main() {

  float value = noise2D(fs_Pos);
  float time = u_Time *0.001;

  float r = sin(time + noise1D(fs_Pos.x)) * value + 0.5; // Red channel varies with time and x position
  float g = cos(time + noise1D(fs_Pos.y)) * value + 0.5; // Green channel varies with time and y position
  float b = sin(time *3.14159) * 0.5 + 0.5;         // Blue channel varies with time


  out_Col = vec4(r, g, b, 1.0);
}
