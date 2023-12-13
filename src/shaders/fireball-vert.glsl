#version 300 es

//This is a vertex shader. While it is called a "shader" due to outdated conventions, this file
//is used to apply matrix transformations to the arrays of vertex data passed to it.
//Since this code is run on your GPU, each vertex is transformed simultaneously.
//If it were run on your CPU, each vertex would have to be processed in a FOR loop, one at a time.
//This simultaneous transformation allows your program to run much faster, especially when rendering
//geometry with millions of vertices.

uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

uniform float u_Time;
uniform float u_SmoothLeft;
uniform float u_SmoothRight;
uniform float u_Freq0;

in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_LightVec;       // The direction in which our virtual light lies, relative to each vertex. This is implicitly passed to the fragment shader.
out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.

out vec4 fs_Pos;

const vec4 lightPos = vec4(5, 5, 3, 1); //The position of our virtual light, which is used to compute the shading of
                                        //the geometry in the fragment shader.


float sawtooth_wave(float x, float freq, float amplitude) {
    return (x * freq - floor(x * freq)) * amplitude;
}

float my_smoothstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * (3.0 - 2.0 * x);
}

float bias(float b, float t){
    return pow(t, log(b) /log(0.5f));
}

float noise3D( float x, float y, float z ) {
    vec3 p = vec3(x,y,z);
    return fract(sin((dot(p, vec3(127.1, 311.7, 191.999))))*43758.5453);

}

float interpNoise3D(float x, float y, float z) {
    int intX = int(floor(x));
    float fractX = fract(x);
    int intY = int(floor(y));
    float fractY = fract(y);
    int intZ = int(floor(z));
    float fractZ = fract(z);

    float v1 = noise3D(fractX, fractY, fractZ);
    float v2 = noise3D(fractX + 1.0, fractY, fractZ);
    float v3 = noise3D(fractX, fractY + 1.0, fractZ);
    float v4 = noise3D(fractX + 1.0, fractY + 1.0, fractZ);
    float v5 = noise3D(fractX, fractY, fractZ + 1.0);
    float v6 = noise3D(fractX + 1.0, fractY, fractZ + 1.0);
    float v7 = noise3D(fractX, fractY + 1.0, fractZ + 1.0);
    float v8 = noise3D(fractX + 1.0, fractY + 1.0, fractZ + 1.0);

    float i1 = mix(v1, v2, fractX);
    float i2 = mix(v3, v4, fractX);
    float i3 = mix(v5, v6, fractX);
    float i4 = mix(v7, v8, fractX);

    float j1 = mix(i1, i2, fractY);
    float j2 = mix(i3, i4, fractY);

    return mix(j1, j2, fractZ);
}

float fbm3D(float x, float y, float z) {
    float total = 0.0;
    float persistence = 0.5f;
    int octaves = 8;
    float freq = 2.f;
    float amp = 0.5f;

    for (int i = 1; i <= octaves; i++) {
        total += interpNoise3D(x * freq, y * freq, z * freq) * amp;

        freq *= 2.f;
        amp *= persistence;
    }

    return total;
}
void main()
{
    fs_Col = vs_Col;                         // Pass the vertex colors to the fragment shader for interpolation

    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);          // Pass the vertex normals to the fragment shader for interpolation.
                                                            // Transform the geometry's normals by the inverse transpose of the
                                                            // model matrix. This is necessary to ensure the normals remain
                                                            // perpendicular to the surface after the surface is transformed by
                                                            // the model matrix.
    vec4 modelposition = vs_Pos;   // Temporarily store the transformed vertex positions for use below

    //Make some parameters
    float amp0 = 0.5; // For displacement, high amplitude
    float freq0 = u_Freq0; // For displacement, low frequency

    float amp1 = 1.0; //For fbm distortion, low amplitude
    float freq1 = 1.0; //For fbm distortion, high frequency

    float time = u_Time; 

    float displacement = 0.0;

    //position displacement
    float noise = noise3D(vs_Pos.x, vs_Pos.y, vs_Pos.z);

    displacement = bias(0.2, sawtooth_wave(time *0.01, freq0, amp0));

    vec4 displacedPosition = vs_Pos + vec4(normalize(vs_Nor.xyz) * displacement, 0.0);

    //Apply fbm and smoothstep
    float step0 = u_SmoothLeft;
    float step1 = u_SmoothRight;

    float fbm_dis = fbm3D(vs_Pos.x * freq1 * time *0.002, vs_Pos.y * freq1 * time *0.004, vs_Pos.z * freq1 * time *0.001) *amp1;
    fbm_dis = my_smoothstep(step0, step1, fbm_dis);

    displacedPosition = displacedPosition + vec4(normalize(vs_Nor.xyz) * fbm_dis, 0.0);

    fs_Pos = displacedPosition;

    modelposition = u_Model * displacedPosition;

    fs_LightVec = lightPos - modelposition;  // Compute the direction in which the light source lies

    gl_Position = u_ViewProj * modelposition;// gl_Position is a built-in variable of OpenGL which is
                                             // used to render the final positions of the geometry's vertices
}
