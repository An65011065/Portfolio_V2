/** 
 * Compiles a vertex or fragment shader.
 * @param {WebGLRenderingContext} gl 
 * @param {String} shaderSource
 * @param {GLenum} type, either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @return {WebGLShader}
 */
const compileShader = (gl, shaderSource, type) => {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const name = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw "Error compiling " + name + " shader: " + error;
  }

  return shader;
};

/** 
 * Compiles a shader program from vertex and fragment shader sources.
 * @param {WebGLRenderingContext} gl 
 * @param {String} vertexShaderSource
 * @param {String} fragmentShaderSource
 * @return {WebGLProgram}
 */
const compileProgram = (gl, vertexShaderSource, fragmentShaderSource) => {
  let vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  let fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw "Error compiling shader program: " + gl.getProgramInfoLog(program);

  gl.useProgram(program);
  return program;
};

/** 
 * Sets up an image to use as a texture.
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @param {String} imageId, the "id" given to the <img> element in index.html
 * @param {String} uniformName, String representing the name of the variable
 *                 to use for the sampler2D in the shader, for example:
 *                 uniform sampler2D uniformName;
 * @param {Number} index, texture unit index to activate (N in gl.TEXTUREN).
 */
const setupTexture = (gl, program, imageId, uniformName, index) => {
  // retrieve the image
  let image = document.getElementById(imageId);

  // create the texture and activate it
  let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // define the texture to be that of the requested image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // set which texture index to use for the uniform sampler2D in the shader
  // you will need 'uniform sampler2D uniformName' to use the texture within your shader
  gl.uniform1i(gl.getUniformLocation(program, uniformName), index);
};

class WebGLEarth {
  /** 
   * Initializes the canvas and saves the mesh object (which has "vertices" and "triangles").
   * The model, view and projection matrices are set up as well as callbacks for mouse
   * clicking, dragging and scrolling.
   * @param {String} canvasId, destination for rendered images (id of <canvas> element).
   * @param {Object} mesh, with fields for "vertices" (1d array of float, stride of 3) and
   *                                       "triangles" (1d array of integer indices, stride of 3).
   */
  constructor(canvasId, mesh) {
    // initialize webgl
    this.canvas = document.getElementById(canvasId);
    this.gl = this.canvas.getContext("webgl");
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.mesh = mesh;
    this.eye = vec3.fromValues(0, -5, 0);
    this.center = vec3.create(); // origin
    this.modelMatrix = mat4.create();
    this.viewMatrix = mat4.create();
    const up = vec3.fromValues(0, 0, 1);
    mat4.lookAt(this.viewMatrix, this.eye, this.center, up);

    const fov = Math.PI / 4.0;
    const aspectRatio = this.canvas.width / this.canvas.height;
    this.projectionMatrix = mat4.create();
    mat4.perspective(this.projectionMatrix, fov, aspectRatio, 0.1, 1000);

    // setup the callbacks
    this.dragging = false;
    let renderer = this;
    this.canvas.addEventListener("mousemove", function(event) {
      if (!renderer.dragging) return;
      const dx = (event.pageX - renderer.lastX) / renderer.canvas.width;
      const dy = (event.pageY - renderer.lastY) / renderer.canvas.height;
      const speed = 4;
      const Ry = mat4.fromZRotation(mat4.create(), speed * dx);
      const Rx = mat4.fromXRotation(mat4.create(), speed * dy);
      renderer.modelMatrix = mat4.multiply(
        mat4.create(),
        mat4.multiply(mat4.create(), Rx, Ry),
        renderer.modelMatrix
      );
      renderer.draw();
      renderer.lastX = event.pageX;
      renderer.lastY = event.pageY;
    });
    this.canvas.addEventListener("mousedown", function(event) {
      renderer.dragging = true;
      renderer.lastX = event.pageX;
      renderer.lastY = event.pageY;
    });
    this.canvas.addEventListener("mouseup", function(event) {
      renderer.dragging = false;
    });
    this.canvas.addEventListener("wheel", function(event) {
      event.preventDefault();
      let scale = 1.0;
      if (event.deltaY > 0) scale = 0.9;
      else if (event.deltaY < 0) scale = 1.1;
      let direction = vec3.create();
      vec3.subtract(direction, renderer.eye, renderer.center);
      vec3.scaleAndAdd(renderer.eye, renderer.center, direction, scale);
      mat4.lookAt(renderer.viewMatrix, renderer.eye, renderer.center, up);
      renderer.draw();
    });
  }

  /** 
   * Compiles the shader program: this.program should be a WebGLProgram
   * after this function is called.
   */
  compile() {
    let gl = this.gl;

    // PART 2A: define vertex and fragment shaders to render a blue sphere
    // PART 3B: use a texture to add color detail to the sphere.
    const vertexShaderSource = `
    attribute vec3 a_Position;
    attribute vec3 a_Color;
    
    varying vec3 v_Position;

    uniform sampler2D tex_Bump;
    
    uniform mat4 u_ProjectionMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ModelMatrix;
    #define PI 3.1415926454
     
    void main() {
      v_Position =  a_Position;
      float x = v_Position[0];
      float y = v_Position[1];
      float z = v_Position[2];
      float R = 1.0;
      float theta = atan(y, x);
      float phi = acos(z / R);
      float s = (theta + PI) / (2.0 * PI);
      float t = phi / PI;
      float offset = (texture2D(tex_Bump, vec2(s, t)).r) * 0.1;

      
      vec4 pos = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * (vec4((a_Position + offset), 1.0));
      pos[2] = pos[2] * 0.1;
      gl_Position = pos;
    }`;

    const fragmentShaderSource = `
    precision highp float;

    uniform sampler2D tex_Color;
    uniform float u_Sphere;
    varying vec3 v_Position;
    
    #define PI 3.1415926454

    void main() {
      float x = v_Position[0];
      float y = v_Position[1];
      float z = v_Position[2];
      float R = 1.0;
      float theta = atan(y, x);
      float phi = acos(z / R);
      float s = (theta + PI) / (2.0 * PI);
      float t = phi / PI;
      vec3 km = (texture2D(tex_Color, vec2(s, t)).rgb);
      gl_FragColor = vec4(km, 1.0);

    }`;

    // create the shader program
    this.program = compileProgram(gl, vertexShaderSource, fragmentShaderSource);

    const bgVertexShaderSource = `
    attribute vec2 a_Position;

    void main(){
    gl_Position = vec4(a_Position, 0, 1) ;
    //setting the z-coordinate to 0
    }`;

    const bgFragmentShaderSource = `
    precision mediump float;
    uniform sampler2D bgTexture;

    void main(){
    vec2 texcoord = gl_FragCoord.xy / vec2(600, 600);
    gl_FragColor= texture2D(bgTexture, texcoord);
    }`;

    this.bgProgram = compileProgram(gl, bgVertexShaderSource, bgFragmentShaderSource);
  };

  /** 
   * Writes the "vertices" and "triangles" in this.mesh to the GPU, 
   * sets up images to use for texturing (using setupImageTexture).
   */
  write() {
    let gl = this.gl;

    gl.useProgram(this.bgProgram);
    const qVertices = new Float32Array([
      -1, -1,
      +1, -1,
      +1, +1,
      -1, +1]);

    const triIndices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    this.quadvertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadvertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, qVertices, gl.STATIC_DRAW);

    this.quadtriangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadtriangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triIndices, gl.STATIC_DRAW)

    setupTexture(gl, this.bgProgram, "background", "bgTexture", 2);

    gl.useProgram(this.program);
    let program = this.program;

    const nVertices = this.mesh.vertices.length / 3;
    const nTriangles = this.mesh.triangles.length / 3;
    console.log(`writing ${nVertices} vertices and ${nTriangles} triangles`);


    // PART 1: write mesh data
    this.mesh.vertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.mesh.vertices),
      gl.STATIC_DRAW
    );

    this.triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(this.mesh.triangles),
      gl.STATIC_DRAW
    );


    let a_Position = gl.getAttribLocation(this.program, "a_Position");
    gl.enableVertexAttribArray(a_Position);



    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);



    //2562 v, 5120 t

    // PART 3A: set up a texture for the earth.jpg image
    setupTexture(gl, this.program, "earth-color", "tex_Color", 0);
    setupTexture(gl, this.program, "earth-bump", "tex_Bump", 1);

  }

  /** 
   * Renders the scene.
   */
  draw() {
    let gl = this.gl;
    let program = this.program;

    gl.clearColor(0,0,0,1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.bgProgram);
    gl.disable(gl.DEPTH_TEST);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadvertexBuffer);

    let posAttribLocation = gl.getAttribLocation(this.bgProgram, "a_Position");
    gl.enableVertexAttribArray(posAttribLocation);

    gl.vertexAttribPointer(posAttribLocation,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadtriangleBuffer);

    gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
    
    gl.useProgram(program);

    // PART 2B: associate buffers with attributes, write uniforms, and draw elements.

    // -- View & Projection Matrix --

    gl.enable(gl.DEPTH_TEST);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
    gl.vertexAttribPointer(this.program.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.program.a_Position);

    let u_ViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
    let u_ModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
    let u_ProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");

    // write the current view and model matrices
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix);
    gl.uniformMatrix4fv(u_ViewMatrix, false, this.viewMatrix);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, this.projectionMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
    gl.drawElements(gl.TRIANGLES, this.mesh.triangles.length, gl.UNSIGNED_SHORT, 0);
    console.log("error: ", gl.getError());


  }

}

