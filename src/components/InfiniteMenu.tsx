"use client";

import React, { useEffect, useRef, useState } from 'react';
import { mat4, quat, vec2, vec3 } from 'gl-matrix';
import FlickerText from './FlickerText';
import './InfiniteMenu.css';

const discVertShaderSource = `#version 300 es

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

#define PI 3.141593

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);

    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}
`;

const discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
    vec2 uv = vUvs - 0.5;
    float dist = length(uv);

    // 0.40 is the radius of the inner project image (occupying 80% of the circle)
    if (dist <= 0.40) {
        // Map texture inside the inner circle, scaling it from [0, 0.40] to [0, 0.50]
        vec2 imageUv = uv * (0.50 / 0.40) + 0.5;

        int itemIndex = vInstanceId % uItemCount;
        int cellsPerRow = uAtlasSize;
        int cellX = itemIndex % cellsPerRow;
        int cellY = itemIndex / cellsPerRow;
        vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
        vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

        ivec2 texSize = textureSize(uTex, 0);
        float imageAspect = float(texSize.x) / float(texSize.y);
        float containerAspect = 1.0;
        
        float scale = max(imageAspect / containerAspect, 
                         containerAspect / imageAspect);
        
        vec2 st = vec2(imageUv.x, 1.0 - imageUv.y);
        st = (st - 0.5) * scale + 0.5;
        
        st = clamp(st, 0.0, 1.0);
        st = st * cellSize + cellOffset;
        
        outColor = texture(uTex, st);

        // Apply a 3D spherical shading shadow overlay on the flat circular image
        float r = dist / 0.40; // ranges from 0.0 to 1.0 inside the image
        float z = sqrt(max(0.0, 1.0 - r * r)); // hemispherical depth
        
        // Shading multiplier: center is 1.0, edge is 0.54 (more defined sphere)
        float shading = z * 0.46 + 0.54;
        outColor.rgb *= shading;

        outColor.a *= vAlpha;
    } else {
        // Draw the outer drop shadow in the outer ring (dist from 0.40 to 0.50)
        // Offset the shadow slightly to the top-left so the shadow drops to the bottom-right
        vec2 shadowUv = uv - vec2(-0.015, 0.015);
        float shadowDist = length(shadowUv);
        
        // Soft gradient fade that vanishes completely before the geometry edge (0.50)
        float shadowFade = smoothstep(0.48, 0.38, shadowDist);
        
        // Render shadow as a semi-transparent black overlay (softer outer shadow)
        outColor = vec4(0.0, 0.0, 0.0, shadowFade * 0.28 * vAlpha);
    }
}
`;

class Face {
  a: number;
  b: number;
  c: number;
  constructor(a: number, b: number, c: number) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
}

class Vertex {
  position: vec3;
  normal: vec3;
  uv: vec2;
  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

class Geometry {
  vertices: Vertex[];
  faces: Face[];
  constructor() {
    this.vertices = [];
    this.faces = [];
  }

  addVertex(...args: number[]) {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  addFace(...args: number[]) {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  get lastVertex() {
    return this.vertices[this.vertices.length - 1];
  }

  subdivide(divisions = 1) {
    const midPointCache: Record<string, number> = {};
    let f = this.faces;

    for (let div = 0; div < divisions; ++div) {
      const newFaces: Face[] = new Array(f.length * 4);

      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);

        const i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      });

      f = newFaces;
    }

    this.faces = f;
    return this;
  }

  spherize(radius = 1) {
    this.vertices.forEach(vertex => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get data() {
    return {
      vertices: this.vertexData,
      indices: this.indexData,
      normals: this.normalData,
      uvs: this.uvData
    };
  }

  get vertexData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.position)));
  }

  get normalData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.normal)));
  }

  get uvData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.uv)));
  }

  get indexData() {
    return new Uint16Array(this.faces.flatMap(f => [f.a, f.b, f.c]));
  }

  getMidPoint(ndxA: number, ndxB: number, cache: Record<string, number>) {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      return cache[cacheKey];
    }
    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return ndx;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1,
      t,
      0,
      1,
      t,
      0,
      -1,
      -t,
      0,
      1,
      -t,
      0,
      0,
      -1,
      t,
      0,
      1,
      t,
      0,
      -1,
      -t,
      0,
      1,
      -t,
      t,
      0,
      -1,
      t,
      0,
      1,
      -t,
      0,
      -1,
      -t,
      0,
      1
    ).addFace(
      0,
      11,
      5,
      0,
      5,
      1,
      0,
      1,
      7,
      0,
      7,
      10,
      0,
      10,
      11,
      1,
      5,
      9,
      5,
      11,
      4,
      11,
      10,
      2,
      10,
      7,
      6,
      7,
      1,
      8,
      3,
      9,
      4,
      3,
      4,
      2,
      3,
      2,
      6,
      3,
      6,
      8,
      3,
      8,
      9,
      4,
      9,
      5,
      2,
      4,
      11,
      6,
      2,
      10,
      8,
      6,
      7,
      9,
      8,
      1
    );
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    steps = Math.max(4, steps);

    const alpha = (2 * Math.PI) / steps;

    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;

    for (let i = 0; i < steps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;

      if (i > 0) {
        this.addFace(0, i, i + 1);
      }
    }
    this.addFace(0, steps, 1);
  }
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (success) {
    return shader;
  }

  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(
  gl: WebGL2RenderingContext,
  shaderSources: string[],
  transformFeedbackVaryings?: string[] | null,
  attribLocations?: Record<string, number> | null
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  const shaders: WebGLShader[] = [];

  const vertShader = createShader(gl, gl.VERTEX_SHADER, shaderSources[0]);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, shaderSources[1]);

  if (vertShader && fragShader) {
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    shaders.push(vertShader, fragShader);
  } else {
    gl.deleteProgram(program);
    return null;
  }

  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
  }

  if (attribLocations) {
    for (const attrib in attribLocations) {
      gl.bindAttribLocation(program, attribLocations[attrib], attrib);
    }
  }

  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);

  shaders.forEach(shader => {
    gl.detachShader(program, shader);
    gl.deleteShader(shader);
  });

  if (success) {
    return program;
  }

  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function makeVertexArray(
  gl: WebGL2RenderingContext,
  bufLocNumElmPairs: [WebGLBuffer | null, number, number][],
  indices: Uint16Array
): WebGLVertexArrayObject | null {
  const va = gl.createVertexArray();
  if (!va) return null;
  gl.bindVertexArray(va);

  for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
    if (loc === -1 || !buffer) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }

  if (indices) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  gl.bindVertexArray(null);
  return va;
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(2, window.devicePixelRatio);
  const displayWidth = Math.round(canvas.clientWidth * dpr);
  const displayHeight = Math.round(canvas.clientHeight * dpr);
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}

function makeBuffer(gl: WebGL2RenderingContext, sizeOrData: BufferSource, usage: number): WebGLBuffer | null {
  const buf = gl.createBuffer();
  if (!buf) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

function createAndSetupTexture(
  gl: WebGL2RenderingContext,
  minFilter: number,
  magFilter: number,
  wrapS: number,
  wrapT: number
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  return texture;
}

class ArcballControl {
  canvas: HTMLCanvasElement;
  updateCallback: (deltaTime: number) => void;
  isPointerDown = false;
  orientation = quat.create();
  pointerRotation = quat.create();
  rotationVelocity = 0;
  rotationAxis = vec3.fromValues(1, 0, 0);
  snapDirection = vec3.fromValues(0, 0, -1);
  snapTargetDirection: vec3 | null = null;
  EPSILON = 0.1;
  IDENTITY_QUAT = quat.create();

  pointerPos: vec2;
  previousPointerPos: vec2;
  _rotationVelocity: number;
  _combinedQuat: quat;

  constructor(canvas: HTMLCanvasElement, updateCallback?: (deltaTime: number) => void) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || (() => null);

    this.pointerPos = vec2.create();
    this.previousPointerPos = vec2.create();
    this._rotationVelocity = 0;
    this._combinedQuat = quat.create();

    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect();
      vec2.set(this.pointerPos, e.clientX - rect.left, e.clientY - rect.top);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
    });
    canvas.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });
    canvas.addEventListener('pointerleave', () => {
      this.isPointerDown = false;
    });
    canvas.addEventListener('pointermove', e => {
      if (this.isPointerDown) {
        const rect = canvas.getBoundingClientRect();
        vec2.set(this.pointerPos, e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    canvas.style.touchAction = 'none';
  }

  update(deltaTime: number, targetFrameDuration = 16) {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    let snapRotation = quat.create();

    if (this.isPointerDown) {
      const INTENSITY = 0.3 * timeScale;
      const ANGLE_AMPLIFICATION = 5 / timeScale;

      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);

      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);

        const p = this.project(midPointerPos);
        const q = this.project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);

        vec2.copy(this.previousPointerPos, midPointerPos);

        angleFactor *= ANGLE_AMPLIFICATION;

        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      const INTENSITY = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);

      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2;
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const sqrDist = vec3.squaredDistance(a, b);
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(a, b, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    const RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(this._combinedQuat[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }

    const RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;

    this.updateCallback(deltaTime);
  }

  quatFromVectors(a: vec3, b: vec3, out: quat, angleFactor = 1) {
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    const angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
    return { q: out, axis, angle };
  }

  private project(pos: vec2): vec3 {
    const r = 2;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const s = Math.max(w, h) - 1;

    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;

    if (xySq <= rSq / 2.0) {
      z = Math.sqrt(rSq - xySq);
    } else {
      z = rSq / Math.sqrt(xySq);
    }
    return vec3.fromValues(-x, y, z);
  }
}

class InfiniteGridMenu {
  TARGET_FRAME_DURATION = 1000 / 60;
  SPHERE_RADIUS = 1.45;

  canvas: HTMLCanvasElement;
  items: any[];
  onActiveItemChange: (index: number) => void;
  onMovementChange: (isMoving: boolean) => void;

  gl!: WebGL2RenderingContext;
  viewportSize!: vec2;
  drawBufferSize!: vec2;
  discProgram!: WebGLProgram | null;
  discLocations: any;
  discGeo!: DiscGeometry;
  discBuffers: any;
  discVAO!: WebGLVertexArrayObject | null;
  icoGeo!: IcosahedronGeometry;
  instancePositions!: vec3[];
  DISC_INSTANCE_COUNT!: number;
  discInstances: any;
  worldMatrix = mat4.create();
  tex!: WebGLTexture | null;
  atlasSize!: number;
  control!: ArcballControl;

  #time = 0;
  #deltaTime = 0;
  #deltaFrames = 0;
  #frames = 0;

  camera = {
    matrix: mat4.create(),
    near: 0.1,
    far: 40,
    fov: Math.PI / 4,
    aspect: 1,
    position: vec3.fromValues(0, 0, 3),
    up: vec3.fromValues(0, 1, 0),
    matrices: {
      view: mat4.create(),
      projection: mat4.create(),
      inversProjection: mat4.create()
    }
  };

  nearestVertexIndex: number | null = null;
  smoothRotationVelocity = 0;
  scaleFactor = 1.0;
  movementActive = false;

  constructor(canvas: HTMLCanvasElement, items: any[], onActiveItemChange: (index: number) => void, onMovementChange: (isMoving: boolean) => void, onInit: ((sk: InfiniteGridMenu) => void) | null = null, scale = 1.0) {
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || (() => {});
    this.onMovementChange = onMovementChange || (() => {});
    this.scaleFactor = scale;
    this.camera.position[2] = 3 * scale;
    this.#init(onInit);
  }

  resize() {
    this.viewportSize = vec2.set(this.viewportSize || vec2.create(), this.canvas.clientWidth, this.canvas.clientHeight);

    const gl = this.gl;
    const needsResize = resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
    if (needsResize) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    this.#updateProjectionMatrix(gl);
  }

  isIntersectingRef?: React.RefObject<boolean>;

  run(time = 0) {
    requestAnimationFrame(t => this.run(t));
    if (this.isIntersectingRef && !this.isIntersectingRef.current) return;

    this.#deltaTime = Math.min(32, time - this.#time);
    this.#time = time;
    this.#deltaFrames = this.#deltaTime / this.TARGET_FRAME_DURATION;
    this.#frames += this.#deltaFrames;

    this.#animate(this.#deltaTime);
    this.#render();
  }

  #init(onInit: ((sk: InfiniteGridMenu) => void) | null) {
    const glCtx = this.canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!glCtx) {
      throw new Error('No WebGL 2 context!');
    }
    this.gl = glCtx;
    const gl = this.gl;

    this.viewportSize = vec2.fromValues(this.canvas.clientWidth, this.canvas.clientHeight);
    this.drawBufferSize = vec2.clone(this.viewportSize);

    this.discProgram = createProgram(gl, [discVertShaderSource, discFragShaderSource], null, {
      aModelPosition: 0,
      aModelNormal: 1,
      aModelUvs: 2,
      aInstanceMatrix: 3
    });

    if (!this.discProgram) {
      throw new Error('Failed to create disc program');
    }

    this.discLocations = {
      aModelPosition: gl.getAttribLocation(this.discProgram, 'aModelPosition'),
      aModelUvs: gl.getAttribLocation(this.discProgram, 'aModelUvs'),
      aInstanceMatrix: gl.getAttribLocation(this.discProgram, 'aInstanceMatrix'),
      uWorldMatrix: gl.getUniformLocation(this.discProgram, 'uWorldMatrix'),
      uViewMatrix: gl.getUniformLocation(this.discProgram, 'uViewMatrix'),
      uProjectionMatrix: gl.getUniformLocation(this.discProgram, 'uProjectionMatrix'),
      uCameraPosition: gl.getUniformLocation(this.discProgram, 'uCameraPosition'),
      uScaleFactor: gl.getUniformLocation(this.discProgram, 'uScaleFactor'),
      uRotationAxisVelocity: gl.getUniformLocation(this.discProgram, 'uRotationAxisVelocity'),
      uTex: gl.getUniformLocation(this.discProgram, 'uTex'),
      uFrames: gl.getUniformLocation(this.discProgram, 'uFrames'),
      uItemCount: gl.getUniformLocation(this.discProgram, 'uItemCount'),
      uAtlasSize: gl.getUniformLocation(this.discProgram, 'uAtlasSize')
    };

    this.discGeo = new DiscGeometry(56, 1);
    this.discBuffers = this.discGeo.data;
    
    const posBuffer = makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW);
    const uvBuffer = makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW);

    const vao = makeVertexArray(
      gl,
      [
        [posBuffer, this.discLocations.aModelPosition, 3],
        [uvBuffer, this.discLocations.aModelUvs, 2]
      ],
      this.discBuffers.indices
    );
    if (!vao) {
      throw new Error('Failed to create VAO');
    }
    this.discVAO = vao;

    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map(v => v.position);
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;
    this.#initDiscInstances(this.DISC_INSTANCE_COUNT);

    this.worldMatrix = mat4.create();
    this.#initTexture();

    this.control = new ArcballControl(this.canvas, deltaTime => this.#onControlUpdate(deltaTime));

    this.#updateCameraMatrix();
    this.#updateProjectionMatrix(gl);
    this.resize();

    if (onInit) onInit(this);
  }

  #initTexture() {
    const gl = this.gl;
    const tex = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    if (!tex) {
      throw new Error('Failed to create WebGL texture');
    }
    this.tex = tex;

    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cellSize = 512;

    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;

    Promise.all(
      this.items.map(
        item =>
          new Promise<HTMLImageElement>(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.src = item.image;
          })
      )
    ).then(images => {
      images.forEach((img, i) => {
        const x = (i % this.atlasSize) * cellSize;
        const y = Math.floor(i / this.atlasSize) * cellSize;
        ctx.drawImage(img, x, y, cellSize, cellSize);
      });

      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
  }

  #initDiscInstances(count: number) {
    const gl = this.gl;
    const buf = gl.createBuffer();
    this.discInstances = {
      matricesArray: new Float32Array(count * 16),
      matrices: [] as Float32Array[],
      buffer: buf
    };
    for (let i = 0; i < count; ++i) {
      const instanceMatrixArray = new Float32Array(this.discInstances.matricesArray.buffer, i * 16 * 4, 16);
      instanceMatrixArray.set(mat4.create());
      this.discInstances.matrices.push(instanceMatrixArray);
    }
    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    const mat4AttribSlotCount = 4;
    const bytesPerMatrix = 16 * 4;
    for (let j = 0; j < mat4AttribSlotCount; ++j) {
      const loc = this.discLocations.aInstanceMatrix + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, j * 4 * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  #animate(deltaTime: number) {
    const gl = this.gl;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);

    let positions = this.instancePositions.map(p => vec3.transformQuat(vec3.create(), p, this.control.orientation));
    const scale = 0.25;
    const SCALE_INTENSITY = 0.6;
    positions.forEach((p, ndx) => {
      const s = (Math.abs(p[2]) / this.SPHERE_RADIUS) * SCALE_INTENSITY + (1 - SCALE_INTENSITY);
      const finalScale = s * scale;
      const matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));

      mat4.copy(this.discInstances.matrices[ndx], matrix);
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  #render() {
    const gl = this.gl;
    if (!this.discProgram) return;
    gl.useProgram(this.discProgram);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(
      this.discLocations.uCameraPosition,
      this.camera.position[0],
      this.camera.position[1],
      this.camera.position[2]
    );
    gl.uniform4f(
      this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0],
      this.control.rotationAxis[1],
      this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1
    );

    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);

    gl.uniform1f(this.discLocations.uFrames, this.#frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);

    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      this.discBuffers.indices.length,
      gl.UNSIGNED_SHORT,
      0,
      this.DISC_INSTANCE_COUNT
    );
  }

  #updateCameraMatrix() {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  #updateProjectionMatrix(gl: WebGL2RenderingContext) {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const height = this.SPHERE_RADIUS * 0.35;
    const distance = this.camera.position[2];
    if (this.camera.aspect > 1) {
      this.camera.fov = 2 * Math.atan(height / distance);
    } else {
      this.camera.fov = 2 * Math.atan(height / this.camera.aspect / distance);
    }
    mat4.perspective(
      this.camera.matrices.projection,
      this.camera.fov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  }

  #onControlUpdate(deltaTime: number) {
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 3 * this.scaleFactor;

    const isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;

    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }

    if (!this.control.isPointerDown) {
      const nearestVertexIndex = this.#findNearestVertexIndex();
      const itemIndex = nearestVertexIndex % Math.max(1, this.items.length);
      this.onActiveItemChange(itemIndex);
      const snapDirection = vec3.normalize(vec3.create(), this.#getVertexWorldPosition(nearestVertexIndex));
      this.control.snapTargetDirection = snapDirection;
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }

    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this.#updateCameraMatrix();
  }

  #findNearestVertexIndex() {
    const n = this.control.snapDirection;
    const inversOrientation = quat.conjugate(quat.create(), this.control.orientation);
    const nt = vec3.transformQuat(vec3.create(), n, inversOrientation);

    let maxD = -1;
    let nearestVertexIndex = 0;
    for (let i = 0; i < this.instancePositions.length; ++i) {
      const d = vec3.dot(nt, this.instancePositions[i]);
      if (d > maxD) {
        maxD = d;
        nearestVertexIndex = i;
      }
    }
    return nearestVertexIndex;
  }

  #getVertexWorldPosition(index: number) {
    const nearestVertexPos = this.instancePositions[index];
    return vec3.transformQuat(vec3.create(), nearestVertexPos, this.control.orientation);
  }
}

const defaultItems = [
  {
    image: 'https://picsum.photos/900/900?grayscale',
    link: 'https://google.com/',
    title: '',
    description: ''
  }
];

export interface InfiniteMenuItem {
  image: string;
  link: string;
  title: string;
  description: string;
}

export interface InfiniteMenuProps {
  items?: InfiniteMenuItem[];
  scale?: number;
}

export default function InfiniteMenu({ items = [], scale = 1.0 }: InfiniteMenuProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeItem, setActiveItem] = useState<InfiniteMenuItem | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const isIntersectingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      isIntersectingRef.current = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    let sketch: InfiniteGridMenu | null = null;

    const handleActiveItem = (index: number) => {
      const list = items.length ? items : defaultItems;
      const itemIndex = index % list.length;
      setActiveItem(list[itemIndex] as InfiniteMenuItem);
    };

    if (canvas) {
      sketch = new InfiniteGridMenu(
        canvas,
        items.length ? items : defaultItems,
        handleActiveItem,
        setIsMoving,
        sk => sk.run(),
        scale
      );
      sketch.isIntersectingRef = isIntersectingRef;
    }

    const handleResize = () => {
      if (sketch) {
        sketch.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [items, scale]);

  const [hasClickedButton, setHasClickedButton] = useState(false);

  const handleButtonClick = () => {
    if (!hasClickedButton) {
      setHasClickedButton(true);
      return;
    }
    if (!activeItem?.link) return;
    if (activeItem.link.startsWith('http')) {
      window.open(activeItem.link, '_blank');
    } else {
      console.log('Internal route:', activeItem.link);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas id="infinite-grid-menu-canvas" ref={canvasRef} />

      {activeItem && (
        <>
          <div className={`face-title ${isMoving ? 'inactive' : 'active'}`}>
            <FlickerText
              key={activeItem.title}
              text={activeItem.title}
              tag="h2"
              font={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 'inherit',
                lineHeight: '1.05em',
                letterSpacing: '-0.03em',
              }}
              colorMode="solid"
              fontColor="currentColor"
              textEnterFlickerEnabled={true}
              flicker={{
                position: 'above',
                replay: 'no',
                restState: 'filled',
                delay: 0,
                ease: { type: 'tween', duration: 1.2, ease: 'easeInOut' },
                flickerCount: 8,
                showStroke: false,
                strokePosition: 'start',
                strokeCount: 1,
                strokeColor: 'currentColor',
                strokeWidth: 1.5,
                wordFlickerEnabled: false,
                shakeEnabled: false,
                shakeWidth: 10,
                shakeSpeed: 10,
                letterFlickerEnabled: true,
                letterFlickerMode: 'opacity',
                letterFlickerOpacity: 25,
                letterFlickerIntensity: 12,
              }}
              textHoverFlickerEnabled={true}
              flickerHover={{
                ease: { type: 'tween', duration: 1.5, ease: 'easeInOut' },
                flickerCount: 3,
                showStroke: false,
                strokePosition: 'start',
                strokeCount: 1,
                strokeColor: 'currentColor',
                strokeWidth: 1.5,
                wordFlickerEnabled: false,
                shakeEnabled: false,
                shakeWidth: 10,
                shakeSpeed: 10,
                letterFlickerEnabled: true,
                letterFlickerMode: 'opacity',
                letterFlickerOpacity: 30,
                letterFlickerIntensity: 8,
              }}
            />
          </div>

          <p className={`face-description text-black dark:text-white transition-opacity ${isMoving ? 'inactive' : 'active'}`}> {activeItem.description}</p>

          <div onClick={handleButtonClick} className={`action-button ${isMoving ? 'inactive' : 'active'}`}>
            {!hasClickedButton ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M15 15l6 6m-6-6v4.8m0-4.8h4.8" />
                  <path d="M9 9L3 3m6 6V4.2M9 9H4.2" />
                </svg>
                <span>Click Me</span>
                <p className="action-button-icon">&#x2197;</p>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span>GitHub</span>
                <p className="action-button-icon">&#x2197;</p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
