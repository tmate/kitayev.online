// Vertex Shader Source
const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = mat3(uNormalMatrix) * aNormal;
    vPosition = vec3(uModelViewMatrix * vec4(aPosition, 1.0));
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

// Fragment Shader Source
const fragmentShaderSource = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uColor;
uniform float uTransparency;

void main() {
    // Fresnel effect (edges are more reflective)
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0);
    
    // Glass color with transparency
    vec3 glassColor = uColor * (0.7 + 0.3 * fresnel);
    
    // Mix between transparent and colored based on position
    // For a disk, we can use distance from center
    float distanceFromCenter = length(vPosition.xy);
    float colorMix = smoothstep(0.3, 0.7, distanceFromCenter);
    
    gl_FragColor = vec4(glassColor, mix(uTransparency, 0.8, colorMix));
}
`;

// Shader Compilation Function
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

function createDisk(radius, segments) {
    const positions = [];
    const normals = [];
    const indices = [];

    // Center vertex
    positions.push(0, 0, 0);
    normals.push(0, 0, 1);  // Pointing up in Z direction

    // Create vertices in a circle
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 0;

        positions.push(x, y, z);
        normals.push(0, 0, 1);  // All normals point up for a flat disk
    }

    // Create triangles (indices)
    for (let i = 1; i < segments; i++) {
        indices.push(0, i, i + 1);
    }
    // Close the circle
    indices.push(0, segments, 1);

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        vertexCount: indices.length
    };
}

function setupBuffers(gl, disk) {
    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, disk.positions, gl.STATIC_DRAW);

    // Normal buffer
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, disk.normals, gl.STATIC_DRAW);

    // Index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, disk.indices, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        indices: indexBuffer
    };
}

// Initialize WebGL
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');
canvas.width = 800;
canvas.height = 600;

// Create shaders and program
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);
gl.useProgram(program);

// Create disk geometry
const disk = createDisk(1.0, 32);
const buffers = setupBuffers(gl, disk);

// Set up attribute pointers
const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);

const aNormal = gl.getAttribLocation(program, 'aNormal');
gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aNormal);

// Get uniform locations
const uColor = gl.getUniformLocation(program, 'uColor');
const uTransparency = gl.getUniformLocation(program, 'uTransparency');
const uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');

// Set up matrices (simplified - you'll want a proper matrix library)
function createProjectionMatrix() {
    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;

    const projectionMatrix = new Float32Array(16);
    const f = 1.0 / Math.tan(fieldOfView / 2);

    projectionMatrix[0] = f / aspect;
    projectionMatrix[5] = f;
    projectionMatrix[10] = (zFar + zNear) / (zNear - zFar);
    projectionMatrix[11] = -1;
    projectionMatrix[14] = (2 * zFar * zNear) / (zNear - zFar);

    return projectionMatrix;
}

// Render loop
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set uniforms
    gl.uniform3f(uColor, 0.2, 0.6, 0.9); // Blue glass color
    gl.uniform1f(uTransparency, 0.3);

    // Simple model-view matrix (disk at z = -3)
    const modelViewMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, -3, 1
    ]);

    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, createProjectionMatrix());
    gl.uniformMatrix4fv(uNormalMatrix, false, modelViewMatrix);

    // Draw the disk
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.drawElements(gl.TRIANGLES, disk.indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

// Start rendering
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
render();