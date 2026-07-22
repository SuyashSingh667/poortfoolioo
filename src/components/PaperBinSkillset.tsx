"use client";

import React, { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import * as THREE from "three";

const SKILL_ITEMS = [
  "React", "Next.js", "TypeScript", "WebGL", "Three.js", "Tailwind",
  "GSAP", "Framer", "Node.js", "Figma", "UI/UX", "Shaders",
];
const M = Matter;
const N = SKILL_ITEMS.length;

// ─── Paper ball canvas texture ────────────────────────────────────────────
let BALL_CACHE: HTMLImageElement | null = null;
async function getBallImg(): Promise<HTMLImageElement> {
  if (BALL_CACHE) return BALL_CACHE;
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => { BALL_CACHE = img; res(img); };
    img.onerror = rej;
    img.src = "/paper_ball.png?v=7";
  });
}
async function makeBallUrl(label: string, size: number, dark: boolean): Promise<string> {
  const img = await getBallImg();
  const S = size * 2;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;

  ctx.save();
  ctx.beginPath(); ctx.arc(S/2,S/2,S/2-1,0,Math.PI*2); ctx.clip();
  ctx.drawImage(img, 0, 0, S, S);
  // Lighten the texture by drawing a semi-transparent white overlay
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.arc(S/2,S/2,S/2-2,0,Math.PI*2); ctx.clip();
  const tilt = ((label.charCodeAt(0)*137)%100/100-0.5)*0.10;
  ctx.translate(S/2,S/2); ctx.rotate(tilt); ctx.translate(-S/2,-S/2);
  
  // Increased font scale factors to make labels larger and more readable
  const fs = Math.round(S * (label.length > 8 ? 0.155 : label.length > 5 ? 0.185 : 0.215));
  ctx.font = `900 ${fs}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 1. Draw a thick white outline to mask out dark creases directly behind the letters
  ctx.strokeStyle = "rgba(255, 255, 255, 1.0)";
  ctx.lineWidth = S * 0.09; // proportional outline width
  ctx.lineJoin = "round";
  ctx.strokeText(label, S/2, S/2);

  // 2. Draw the solid dark charcoal text on top
  ctx.fillStyle = "#111111";
  ctx.fillText(label, S/2, S/2);
  
  ctx.restore();
  return c.toDataURL();
}

// ─── Diamond mesh texture ─────────────────────────────────────────────────
function makeMeshTex(): THREE.CanvasTexture {
  const S=512, cW=22, cH=14;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle="#000"; ctx.fillRect(0,0,S,S);
  ctx.strokeStyle="#fff"; ctx.lineWidth=2.2;
  for (let row=-1;row<S/cH+2;row++) {
    for (let col=-1;col<S/cW+2;col++) {
      const x=col*cW+(row%2===0?0:cW/2), y=row*cH;
      ctx.beginPath();
      ctx.moveTo(x,y-cH/2); ctx.lineTo(x+cW/2,y);
      ctx.lineTo(x,y+cH/2); ctx.lineTo(x-cW/2,y);
      ctx.closePath(); ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5,4);
  return t;
}

// ─── Bin world constants ──────────────────────────────────────────────────
const RIM_R  = 1.87;
const BASE_R = 1.50;
const RIM_Y  = 1.90;
const BASE_Y = -1.90;
const SC     = 0.85;

interface BinPx { cx:number; rimY:number; botY:number; botYCenter:number; halfTop:number; halfBot:number; }

// ─── Init Three.js — CLIP PLANE z-split for real 3D depth ─────────────────
//
//  z: 2   ← backCanvas  : entire scene BUT clipped to z ≤ 0  (bin's back half)
//  z:10   ← DOM balls
//  z:15   ← frontCanvas : entire scene BUT clipped to z ≥ 0  (bin's front half)
//
//  Result: balls appear INSIDE the bin — front mesh in front, back mesh behind.
// ─────────────────────────────────────────────────────────────────────────
function initBin(
  backCanvas:  HTMLCanvasElement,
  frontCanvas: HTMLCanvasElement,
  cW: number, cH: number,
  dark: boolean,
  isIntersectingRef: React.RefObject<boolean>,
  onPx: (p: BinPx) => void
): () => void {
  const dpr = Math.min(window.devicePixelRatio||1, 2);

  const mkR = (canvas: HTMLCanvasElement, clipPlane: THREE.Plane) => {
    canvas.width  = cW * dpr;
    canvas.height = cH * dpr;
    const r = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true, premultipliedAlpha:false });
    r.setPixelRatio(dpr);
    r.setSize(cW, cH, false);
    r.setClearColor(0, 0);
    // Global clip plane — applied to every fragment rendered
    r.clippingPlanes = [clipPlane];
    return r;
  };

  // back: keep fragments where z ≤ 0  →  Plane normal (0,0,-1), const 0  →  keeps -z ≥ 0  i.e. z ≤ 0
  const backR  = mkR(backCanvas,  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0));
  // front: keep fragments where z ≥ 0  →  Plane normal (0,0,+1), const 0
  const frontR = mkR(frontCanvas, new THREE.Plane(new THREE.Vector3(0, 0,  1), 0));

  // Shared scene & camera (rendered twice, different clip)
  const scene = new THREE.Scene();

  const cam = new THREE.PerspectiveCamera(38, cW/cH, 0.1, 200);
  cam.position.set(0, 2.6, 10);
  cam.lookAt(0, -0.2, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, dark?.48:.72));
  const key = new THREE.DirectionalLight(dark?0xfff0e0:0xfff8f0, dark?2.1:2.5);
  key.position.set(3, 7, 9); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899cc, .48);
  fill.position.set(-5,2,-4); scene.add(fill);
  const top = new THREE.PointLight(0xffffff, dark?1.4:1.8, 28);
  top.position.set(0,6,5); scene.add(top);

  // Materials
  const meshTex = makeMeshTex();
  const bodyMat = new THREE.MeshPhongMaterial({
    color:dark?0x888888:0xbcbcbc, specular:dark?0xaaaaaa:0xffffff,
    shininess:200, alphaMap:meshTex, transparent:true, alphaTest:.06,
    side:THREE.DoubleSide,
  });
  const rimMat = new THREE.MeshPhongMaterial({
    color:dark?0xaaaaaa:0xe0e0e0, specular:0xffffff, shininess:400,
    side:THREE.FrontSide,
  });

  // Geometry
  const pts: THREE.Vector2[] = [];
  for (let i=0;i<=40;i++) {
    const t=i/40;
    pts.push(new THREE.Vector2(BASE_R+t*(RIM_R-BASE_R), BASE_Y+t*(RIM_Y-BASE_Y)));
  }
  const latheGeo  = new THREE.LatheGeometry(pts, 80);
  const rimTopGeo = new THREE.TorusGeometry(RIM_R,  .11, 28, 120);
  const rimBotGeo = new THREE.TorusGeometry(BASE_R, .07, 16, 80);
  const botCapGeo = new THREE.CylinderGeometry(BASE_R, BASE_R, 0.04, 64);

  const body   = new THREE.Mesh(latheGeo,  bodyMat);
  const rimTop = new THREE.Mesh(rimTopGeo, rimMat);
  const rimBot = new THREE.Mesh(rimBotGeo, rimMat);
  const botCap = new THREE.Mesh(botCapGeo, rimMat);

  // Torus must be horizontal — rotate from default XY plane → XZ plane
  rimTop.rotation.x = rimBot.rotation.x = Math.PI / 2;
  rimTop.position.y = RIM_Y;
  rimBot.position.y = BASE_Y;
  botCap.position.y = BASE_Y;

  const group = new THREE.Group();
  // botCap excluded — the flat grey disc was clipped by the canvas edge, causing a grey semi-circle
  group.add(body, rimTop, rimBot);
  group.scale.setScalar(SC);
  group.position.y = -0.2;
  scene.add(group);

  // Project bin positions → canvas pixels for physics calibration
  // We accept wz (depth) to account for perspective scaling of the tilted mouth/base
  const proj = (wx: number, wy: number, wz: number = 0) => {
    const v = new THREE.Vector3(wx, wy, wz).project(cam);
    return { x:(v.x*.5+.5)*cW, y:(-v.y*.5+.5)*cH };
  };
  const gy    = group.position.y;
  const rimWY = gy + RIM_Y  * SC;
  const botWY = gy + BASE_Y * SC;

  const pRC = proj(0,         rimWY);
  const pRR = proj( RIM_R*SC, rimWY);
  // Project the FRONT edge of the bottom rim torus (z = BASE_R * SC)
  // This ensures the 2D physics floor aligns with the front curve of the 3D rim rather than the higher center point
  const pBC = proj(0,         botWY, BASE_R*SC);
  const pBC_center = proj(0,  botWY, 0); // project the center for ellipse curvature math
  const pBL = proj(-BASE_R*SC,botWY);

  onPx({ cx:pRC.x, rimY:pRC.y, botY:pBC.y, botYCenter:pBC_center.y, halfTop:pRR.x-pRC.x, halfBot:pRC.x-pBL.x });

  // Render loop — same scene, different clip plane per renderer
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!isIntersectingRef.current || (window as any).isThemeTransitioning) return;
    // Render back canvas (zIndex: 2, behind the balls) — floor plate is visible
    botCap.visible = true;
    backR.render(scene,  cam);

    // Render front canvas (zIndex: 15, in front of the balls) — floor plate is invisible
    // This prevents the front half of the bottom cap from clipping/chopping the balls
    botCap.visible = false;
    frontR.render(scene, cam);
  };
  loop();

  return () => {
    cancelAnimationFrame(raf);
    backR.dispose(); frontR.dispose();
    [bodyMat, rimMat].forEach(m => m.dispose());
    [latheGeo, rimTopGeo, rimBotGeo, botCapGeo].forEach(g => g.dispose());
    meshTex.dispose();
  };
}

// ─── Component ────────────────────────────────────────────────────────────
export default function PaperBinSkillset({
  theme,
  onCountChange,
  resetKey,
  gravityY = 3.0,
  gravityX = 0.0,
  bounciness = 0.32,
  explodeTrigger = 0,
  vacuumTrigger = 0,
  highlightedSkills = [],
}: {
  theme?: string;
  onCountChange?: (insideCount: number) => void;
  resetKey?: number;
  gravityY?: number;
  gravityX?: number;
  bounciness?: number;
  explodeTrigger?: number;
  vacuumTrigger?: number;
  highlightedSkills?: string[];
}) {
  const outerRef    = useRef<HTMLDivElement>(null);
  const physRef     = useRef<HTMLDivElement>(null);
  const backCanvasR = useRef<HTMLCanvasElement>(null);
  const frontCanvasR= useRef<HTMLCanvasElement>(null);
  const engineRef   = useRef<Matter.Engine | null>(null);

  const highlightedSkillsRef = useRef(highlightedSkills);
  useEffect(() => {
    highlightedSkillsRef.current = highlightedSkills;
  }, [highlightedSkills]);
  const rafRef      = useRef(0);
  const elRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const pxRef       = useRef<BinPx | null>(null);
  const isIntersectingRef = useRef(false);
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  // Update gravity parameters dynamically
  useEffect(() => {
    console.log("Physics Sandbox - Gravity Updated:", { gravityY, gravityX, hasEngine: !!engineRef.current });
    if (engineRef.current) {
      if (engineRef.current.world && engineRef.current.world.gravity) {
        engineRef.current.world.gravity.y = gravityY;
        engineRef.current.world.gravity.x = gravityX;
      }
      engineRef.current.gravity.y = gravityY;
      engineRef.current.gravity.x = gravityX;
    }
  }, [gravityY, gravityX]);

  // Update bounciness (restitution) dynamically
  useEffect(() => {
    console.log("Physics Sandbox - Bounciness Updated:", { bounciness, hasEngine: !!engineRef.current });
    if (engineRef.current) {
      const world = engineRef.current.world;
      const bodies = Matter.Composite.allBodies(world).filter(b => !b.isStatic && b.label !== "bin");
      bodies.forEach(b => {
        b.restitution = bounciness;
      });
    }
  }, [bounciness]);

  // Trigger explosion force dynamically
  useEffect(() => {
    console.log("Physics Sandbox - Explode Triggered:", { explodeTrigger, hasEngine: !!engineRef.current });
    if (explodeTrigger > 0 && engineRef.current) {
      const world = engineRef.current.world;
      const bodies = Matter.Composite.allBodies(world).filter(b => !b.isStatic && b.label !== "bin");
      bodies.forEach(b => {
        const forceMagnitude = 0.038 * b.mass;
        const angle = Math.random() * Math.PI * 2;
        Matter.Body.applyForce(b, b.position, {
          x: Math.cos(angle) * forceMagnitude * 1.5,
          y: -Math.abs(Math.sin(angle)) * forceMagnitude * 2.2 - 0.015 * b.mass,
        });
      });
    }
  }, [explodeTrigger]);

  // Trigger vacuum suck-in force dynamically
  useEffect(() => {
    console.log("Physics Sandbox - Vacuum Triggered:", { vacuumTrigger, hasEngine: !!engineRef.current });
    if (vacuumTrigger > 0 && engineRef.current) {
      const world = engineRef.current.world;
      const bodies = Matter.Composite.allBodies(world).filter(b => !b.isStatic && b.label !== "bin");
      const px = pxRef.current;
      const binX = px ? px.cx : 150;
      const binY = px ? px.botYCenter : 300;
      
      bodies.forEach(b => {
        const dx = binX - b.position.x;
        const dy = binY - b.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        const forceMagnitude = 0.012 * b.mass;
        
        Matter.Body.applyForce(b, b.position, {
          x: (dx / dist) * forceMagnitude,
          y: (dy / dist) * forceMagnitude - 0.004 * b.mass,
        });
      });
    }
  }, [vacuumTrigger]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const observer = new IntersectionObserver(([entry]) => {
      isIntersectingRef.current = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  const [ballUrls, setBallUrls] = useState<string[]>([]);
  const [dims,     setDims    ] = useState({ w: 0, h: 0 });
  const [ready,    setReady   ] = useState(0); // number to trigger re-init

  const dark   = theme === "dark";
  const BALL_D = 72;

  // Track outer container dimensions dynamically (ResizeObserver)
  // This ensures calculations are only performed with final, settled pixel dimensions
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDims({ w: Math.round(width), h: Math.round(height) });
        }
      }
    });
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);

  // Generate ball textures
  useEffect(() => {
    let live = true;
    Promise.all(SKILL_ITEMS.map(s => makeBallUrl(s, BALL_D, dark)))
      .then(u => { if (live) setBallUrls(u); });
    return () => { live = false; };
  }, [theme, dark]);

  // Three.js Renderers & Camera Setup
  useEffect(() => {
    if (dims.w === 0 || dims.h === 0) return;
    const bc = backCanvasR.current;
    const fc = frontCanvasR.current;
    if (!bc || !fc) return;
    return initBin(bc, fc, dims.w, dims.h, dark, isIntersectingRef, px => {
      pxRef.current = px;
      setReady(prev => prev + 1); // trigger physics re-init with correct projections
    });
  }, [dims, theme, dark]);

  // Physics Simulation
  useEffect(() => {
    if (dims.w === 0 || dims.h === 0 || ready === 0 || ballUrls.length === 0) return;
    const pDiv = physRef.current;
    if (!pDiv) return;

    const W = dims.w;
    const H = dims.h;
    const px = pxRef.current!;

    const binCx   = px.cx;
    const rimY    = px.rimY;
    const botY    = Math.min(px.botY, H - 12);
    const halfTop = Math.max(px.halfTop, BALL_D * 1.5);
    const halfBot = Math.max(px.halfBot, BALL_D * 1.3);

    const engine = M.Engine.create({
      enableSleeping: false, // keep gravity active on all bodies at all times
      gravity: { x: gravityX, y: gravityY },
      positionIterations: 10,
      velocityIterations: 8,
    } as any);
    engineRef.current = engine;

    // World bounds
    const wo = { isStatic:true, friction:.7, restitution:.25 };
    M.Composite.add(engine.world, [
      M.Bodies.rectangle(W/2,  H+30,  W+300, 60, wo),
      M.Bodies.rectangle(-30,  H/2,   60, H*4,  wo),
      M.Bodies.rectangle(W+30, H/2,   60, H*4,  wo),
    ]);

    // ── Bin physics walls — tapered trapezoid ──────────────────────────────
    // The ONLY opening is through the top rim (y < rimY, x within ±halfTop)
    // We use a clean T = 14px thickness because the sub-stepping + position clamping
    // completely prevent tunneling. This removes thick corners that act as shelves.
    const T = 14;
    const bwo = { isStatic:true, friction:.92, restitution:0.15, label:"bin" };

    const lx1 = binCx - halfTop;
    const ly1 = rimY;
    const lx2 = binCx - halfBot;
    const ly2 = botY;

    const rx1 = binCx + halfTop;
    const ry1 = rimY;
    const rx2 = binCx + halfBot;
    const ry2 = botY;

    const lLen = Math.hypot(lx2 - lx1, ly2 - ly1);
    const rLen = Math.hypot(rx2 - rx1, ry2 - ry1);

    const binElements: Matter.Body[] = [
      // Left tapered wall
      M.Bodies.rectangle((lx1 + lx2)/2, (ly1 + ly2)/2, T, lLen + 6, {
        ...bwo,
        angle: Math.atan2(ly2 - ly1, lx2 - lx1) + Math.PI / 2,
      }),

      // Right tapered wall
      M.Bodies.rectangle((rx1 + rx2)/2, (ry1 + ry2)/2, T, rLen + 6, {
        ...bwo,
        angle: Math.atan2(ry2 - ry1, rx2 - rx1) + Math.PI / 2,
      }),
    ];

    // Segmented curved floor to match the 3D visual ellipse and prevent bottom clipping
    const numSegs = 9;
    const segWidth = (halfBot * 2) / numSegs;
    const dy = Math.max(10, px.botY - px.botYCenter);
    for (let j = 0; j < numSegs; j++) {
      const segX = binCx - halfBot + (j + 0.5) * segWidth;
      const dx = Math.abs(segX - binCx);
      const ratio = Math.max(0, Math.min(1, dx / halfBot));
      const segY = botY - dy * (1 - Math.sqrt(1 - ratio * ratio));
      binElements.push(
        M.Bodies.rectangle(segX, segY + T / 2, segWidth + 4, T, {
          ...bwo,
          angle: (segX - binCx) * -0.002 // slight tilt to smoothly form the bowl
        })
      );
    }

    M.Composite.add(engine.world, binElements);

    // ── Spawn balls above the bin (zero overlap, falls in naturally) ───────
    // This prevents overlapping spawning forces from exploding the balls
    // through the bottom mesh boundaries on page load.
    const bOpts = { friction:.80, frictionAir:.028, restitution: bounciness, density:.0018, inertia: Infinity };
    const bodies: Matter.Body[] = [];
    const cols = 3;
    const hSp  = 76; // horizontal spacing (no overlap since 76 > 72)
    const vSp  = 80; // vertical spacing (no overlap since 80 > 72)

    for (let i=0;i<N;i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = binCx + (col - (cols-1)/2) * hSp + (Math.random()-.5)*6;
      // Stack above the rimY
      const y    = rimY - 60 - row * vSp;
      const body = M.Bodies.circle(x, y, BALL_D/2, bOpts);
      body.plugin.isInsideBin = true; // starts as true, inside/entering bin
      bodies.push(body);
    }
    M.Composite.add(engine.world, bodies);

    const mouse = M.Mouse.create(pDiv);
    const mc    = M.MouseConstraint.create(engine, {
      mouse, constraint:{ stiffness: 0.06, angularStiffness: 0, damping: 0.2 } as any,
    });
    M.Composite.add(engine.world, mc);
    const el = (mc.mouse as any).element as HTMLElement;
    ["wheel","mousewheel","DOMMouseScroll"].forEach(ev =>
      el.removeEventListener(ev,(mc.mouse as any).mousewheel));
    el.addEventListener("wheel",()=>{},{passive:true});

    // Force-release the constraint whenever mouse/touch ends anywhere on the page.
    // Without this, if the cursor leaves the physics div while dragging,
    // Matter.js never receives mouseup and the ball stays stuck to the cursor.
    const forceRelease = () => { (mc.mouse as any).button = -1; };
    window.addEventListener("mouseup",   forceRelease, true);
    window.addEventListener("touchend",  forceRelease, { passive: true });

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (!isIntersectingRef.current || (window as any).isThemeTransitioning) return;

      const R_ball = BALL_D / 2;

      // Restricts ball positions dynamically. Run both before and after engine updates
      // to ensure drag forces cannot snap bodies through solid wall geometry.
      const clampPositions = () => {
        const draggedBody = mc.body;
        for (let i = 0; i < bodies.length; i++) {
          const body = bodies[i];
          const x = body.position.x;
          const y = body.position.y;
          const isDragged = body === draggedBody;

          if (body.plugin.isInsideBin) {
            // Check escape through upper rim
            if (y < rimY - R_ball) {
              body.plugin.isInsideBin = false;
            } else if (isDragged) {
              // Only force-override coordinates while dragging to prevent wall-phasing
              const t = Math.max(0, Math.min(1, (y - rimY) / (botY - rimY)));
              const leftInnerX  = lx1 + t * (lx2 - lx1) + R_ball;
              const rightInnerX = rx1 + t * (rx2 - rx1) - R_ball;
              
              // Curve the floor Y coordinate upward at the sides to match the bottom rim ellipse curve
              const dy = Math.max(10, px.botY - px.botYCenter);
              const dx = Math.abs(x - binCx);
              const ratio = Math.max(0, Math.min(1, dx / halfBot));
              const floorY = botY - dy * (1 - Math.sqrt(1 - ratio * ratio)) - R_ball;

              let newX = x;
              let newY = y;
              let resetX = false;
              let resetY = false;

              if (x < leftInnerX) {
                newX = leftInnerX;
                resetX = true;
              } else if (x > rightInnerX) {
                newX = rightInnerX;
                resetX = true;
              }
              if (y > floorY) {
                newY = floorY;
                resetY = true;
              }

              if (newX !== x || newY !== y) {
                M.Body.setPosition(body, { x: newX, y: newY });
                M.Body.setVelocity(body, {
                  x: resetX ? 0 : body.velocity.x,
                  y: resetY ? 0 : body.velocity.y
                });
              }
            }
          } else {
            // Outside the bin: cannot penetrate inwards through walls
            if (y >= rimY && y <= botY) {
              const t = Math.max(0, Math.min(1, (y - rimY) / (botY - rimY)));
              const leftOuterX  = lx1 + t * (lx2 - lx1) - R_ball;
              const rightOuterX = rx1 + t * (rx2 - rx1) + R_ball;

              if (x > leftOuterX && x < rightOuterX) {
                // If entering back through the top mouth, let it inside
                if (x >= lx1 && x <= rx1 && y >= rimY) {
                  body.plugin.isInsideBin = true;
                } else if (isDragged) {
                  // Only force-override coordinates while dragging
                  let newX = x;
                  if (x < binCx) {
                    newX = leftOuterX;
                  } else {
                    newX = rightOuterX;
                  }
                  M.Body.setPosition(body, { x: newX, y: y });
                  M.Body.setVelocity(body, { x: 0, y: body.velocity.y });
                }
              }
            }
          }
        }
      };

      // 1. Clamp pre-update to restrict active drag positions
      clampPositions();

      // 2. Step physics
      const subSteps = 3;
      const stepSize = (1000 / 60) / subSteps;
      for (let s = 0; s < subSteps; s++) {
        M.Engine.update(engine, stepSize);
      }

      // 3. Clamp post-update to fix any solver penetration
      clampPositions();

      let insideCount = 0;
      const activeHighlights = highlightedSkillsRef.current;
      const hasHighlights = activeHighlights && activeHighlights.length > 0;

      for (let i = 0; i < bodies.length; i++) {
        if (bodies[i].plugin.isInsideBin) {
          insideCount++;
        }
        const div = elRefs.current[i];
        if (!div) continue;
        const { position, angle } = bodies[i];
        div.style.visibility = "visible";
        div.style.left = `${position.x}px`;
        div.style.top = `${position.y}px`;

        // Apply highlights based on category hover
        const label = SKILL_ITEMS[i];
        const isHighlighted = hasHighlights && activeHighlights.includes(label);

        if (hasHighlights) {
          if (isHighlighted) {
            // Glowing, scale up, highlight on top
            div.style.filter = dark 
              ? "brightness(1.15) drop-shadow(0 0 10px rgba(255,255,255,0.4))" 
              : "brightness(1.05) drop-shadow(0 0 10px rgba(0,0,0,0.18))";
            div.style.transform = `translate(-50%,-50%) rotate(${angle}rad) scale(1.22)`;
            div.style.zIndex = "25";
          } else {
            // Fade, scale down, drop to background
            div.style.filter = dark 
              ? "brightness(0.35) grayscale(60%) opacity(0.4)" 
              : "brightness(0.85) grayscale(60%) opacity(0.3)";
            div.style.transform = `translate(-50%,-50%) rotate(${angle}rad) scale(0.88)`;
            div.style.zIndex = "5";
          }
        } else {
          // Standard styling
          div.style.filter = dark ? "brightness(.82)" : "none";
          div.style.transform = `translate(-50%,-50%) rotate(${angle}rad) scale(1)`;
          div.style.zIndex = "10";
        }
      }
      if (onCountChangeRef.current) {
        onCountChangeRef.current(insideCount);
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mouseup",  forceRelease, true);
      window.removeEventListener("touchend", forceRelease);
      M.World.clear(engine.world,false);
      M.Engine.clear(engine);
      engineRef.current=null;
    };
  }, [ready, ballUrls.length, resetKey]);

  return (
    <div
      ref={outerRef}
      style={{ position:"relative", width:"100%", height:"100%", overflow:"hidden", userSelect:"none" }}
      className="bg-transparent rounded-2xl"
    >
      {/* z:2 — bin BACK hemisphere (z≤0 clipped) — behind balls */}
      <canvas ref={backCanvasR}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:2 }}
      />

      {/* z:10 — physics DOM balls */}
      <div ref={physRef}
        style={{ position:"absolute", inset:0, overflow:"hidden", zIndex:10 }}
      >
        {ballUrls.map((src,i) => (
          <div key={i} ref={el=>{ elRefs.current[i]=el; }}
            style={{
              position:"absolute", visibility:"hidden",
              width:BALL_D, height:BALL_D, borderRadius:"50%",
              backgroundImage:`url(${src})`, backgroundSize:"cover",
              cursor:"grab", userSelect:"none", willChange:"transform",
              filter: dark ? "brightness(.82)" : "none",
            }}
            draggable={false}
          />
        ))}
      </div>

      {/* z:15 — bin FRONT hemisphere (z≥0 clipped) — in front of balls */}
      <canvas ref={frontCanvasR}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:15 }}
      />

      {/* Hint */}
      <div style={{
        position:"absolute", top:14, left:"50%", transform:"translateX(-50%)",
        fontSize:"9px", fontFamily:"monospace", textTransform:"uppercase",
        letterSpacing:".28em", opacity:.28, pointerEvents:"none",
        whiteSpace:"nowrap", zIndex:40,
      }}>
        Grab &amp; toss the paper balls
      </div>
    </div>
  );
}
PaperBinSkillset.displayName = "PaperBinSkillset";
