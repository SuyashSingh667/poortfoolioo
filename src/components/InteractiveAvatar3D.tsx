"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


interface InteractiveAvatar3DProps {
  autoRotate?: boolean;
  wireframeMode?: boolean;
  accentColor?: string;
}

export default function InteractiveAvatar3D({
  autoRotate = false,
  wireframeMode = false,
  accentColor = "#ec4899"
}: InteractiveAvatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const isIntersectingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(([entry]) => {
      isIntersectingRef.current = entry.isIntersecting;
      if (entry.isIntersecting && actionRef.current) {
        actionRef.current.paused = false;
        actionRef.current.enabled = true;
        actionRef.current.reset();
        actionRef.current.play();
      }
    }, { threshold: 0.05 });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Refs to allow communicating state from React updates to the Three.js loop
  const autoRotateRef = useRef(autoRotate);
  const wireframeModeRef = useRef(wireframeMode);
  const accentColorRef = useRef(accentColor);

  const modelRef = useRef<THREE.Object3D | null>(null);
  const pinkLightRef = useRef<THREE.PointLight | null>(null);
  const orbitRingMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Listen to prop changes and update refs and materials in real time
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    wireframeModeRef.current = wireframeMode;
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              if ("wireframe" in mat) {
                (mat as any).wireframe = wireframeMode;
              }
            });
        }
      });
    }
  }, [wireframeMode]);

  useEffect(() => {
    accentColorRef.current = accentColor;
    const colorVal = new THREE.Color(accentColor);
    if (pinkLightRef.current) {
      pinkLightRef.current.color.copy(colorVal);
    }
    if (orbitRingMatRef.current) {
      orbitRingMatRef.current.color.copy(colorVal);
    }
  }, [accentColor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get current dimensions
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // ─── Three.js Setup ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 5.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // ─── Lighting ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(5, 5, 4);
    scene.add(mainLight);

    // Cheap, performant neon HemisphereLight (Sky: Cyber Blue, Ground: Orange)
    const hemiLight = new THREE.HemisphereLight(0x06b6d4, 0xf97316, 1.5);
    scene.add(hemiLight);

    // Single active dynamic point light for specular neon glow
    const pinkLight = new THREE.PointLight(new THREE.Color(accentColorRef.current), 5, 10);
    pinkLight.position.set(-3, 1, 2);
    scene.add(pinkLight);
    pinkLightRef.current = pinkLight;

    // ─── Create Avatar Group ─────────────────────────────────────────────────
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Load the GLTF/GLB Model
    const loader = new GLTFLoader();
    let headObject: THREE.Object3D | null = null;
    let modelWrap: THREE.Group | null = null;

    loader.load(
      "/models/model.glb",
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;

        // Auto-scale and center the loaded model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Center the model relative to its own group
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        // Wrap in a parent group to control transformations cleanly
        modelWrap = new THREE.Group();
        modelWrap.add(model);

        // Scale the model wrap to fit nicely (target height is ~3.7 units)
        const scale = 3.7 / size.y;
        modelWrap.scale.setScalar(scale);

        // Adjust position so it sits well in the scene (standing on floor grid)
        modelWrap.position.y = 0.2;

        avatarGroup.add(modelWrap);

        // Initialize AnimationMixer and play the standing/idle pose clip
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixerRef.current = mixer;

          // Find Pose1 or Call_Me_Clean (the baked rest pose animation)
          const clip = gltf.animations.find(a => a.name === "Pose1") ||
                       gltf.animations.find(a => a.name === "Call_Me_Clean") ||
                       gltf.animations[0];

          if (clip) {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            actionRef.current = action;

            // Play immediately if already visible in view
            if (isIntersectingRef.current) {
              action.paused = false;
              action.enabled = true;
              action.reset();
              action.play();
            }
          }
        }

        // Traverse model to optimize materials
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if ("wireframe" in mat) {
                  (mat as any).wireframe = wireframeModeRef.current;
                }
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.roughness = Math.max(mat.roughness, 0.4);
                  mat.metalness = Math.min(mat.metalness, 0.6);
                }
              });
            }
          }

          // Dynamically detect a head node for animation
          if (child.name && child.name.toLowerCase().includes("head") && !headObject) {
            headObject = child;
          }
        });


        setLoading(false);
        handleResize();
      },
      undefined,
      (error) => {
        console.error("Error loading 3D avatar GLB model:", error);
        setLoading(false);
      }
    );



    // ─── Interaction Variables & Events ──────────────────────────────────────
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    let isMouseDown = false;
    let prevMouseX = 0, prevMouseY = 0;
    let baseRotationY = -Math.PI / 6; // slightly turned by default
    let baseRotationX = 0.05;

    const onPointerDown = (e: PointerEvent) => {
      isMouseDown = true;
      setIsDragging(true);
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isIntersectingRef.current) {
        mouseX = 0;
        mouseY = 0;
        return;
      }
      const rect = container.getBoundingClientRect();
      // Normalized mouse coords for subtle head-tracking when NOT dragging
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMouseDown) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        baseRotationY += deltaX * 0.007;
        baseRotationX += deltaY * 0.007;
        // Limit vertical rotation to prevent flipping upside down
        baseRotationX = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, baseRotationX));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onPointerUp = () => {
      isMouseDown = false;
      setIsDragging(false);
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // ─── Animation Loop ──────────────────────────────────────────────────────
    let clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      
      const isNearNeutral = 
        (!headObject || (Math.abs(headObject.rotation.y) < 0.01 && Math.abs(headObject.rotation.x) < 0.01)) &&
        Math.abs(avatarGroup.rotation.y - baseRotationY) < 0.01 &&
        Math.abs(avatarGroup.rotation.x - baseRotationX) < 0.01;

      if (!isIntersectingRef.current) {
        mouseX = 0;
        mouseY = 0;
        if (isNearNeutral || (window as any).isThemeTransitioning) {
          // If we are at neutral, stop rendering to save performance/battery
          renderer.render(scene, camera);
          return;
        }
      } else if ((window as any).isThemeTransitioning) {
        return;
      }
      
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update character animation clip mixer
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Smooth head-tracking / auto-rotation inertia
      if (!isMouseDown) {
        if (autoRotateRef.current) {
          baseRotationY += 0.004; // Gentle rotation
        }
        // Gently steer head towards the cursor
        targetX = mouseX * 0.38;
        targetY = mouseY * 0.18;
        avatarGroup.rotation.y += (targetX + baseRotationY - avatarGroup.rotation.y) * 0.08;
        avatarGroup.rotation.x += (baseRotationX - avatarGroup.rotation.x) * 0.08;
      } else {
        // Drag rotation response
        avatarGroup.rotation.y += (baseRotationY - avatarGroup.rotation.y) * 0.25;
        avatarGroup.rotation.x += (baseRotationX - avatarGroup.rotation.x) * 0.25;
      }

      // Keep model position static so the legs/feet are firmly grounded
      avatarGroup.position.y = -0.15;
      
      // Apply subtle head animations (steering towards cursor + breathing)
      if (headObject) {
        const headTargetX = mouseX * 0.25;
        const headTargetY = -mouseY * 0.15; // inverse coordinate to match mouse movement
        headObject.rotation.y += (headTargetX - headObject.rotation.y) * 0.1;
        headObject.rotation.x += (headTargetY - headObject.rotation.x) * 0.1;
        headObject.rotation.z = Math.sin(time * 0.8) * 0.015;
      }

      renderer.render(scene, camera);
    };
    animate();

    // ─── Resize Handler ──────────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      // Centered in its own grid column container
      if (modelWrap) {
        modelWrap.position.x = 0;
      }
    };
    window.addEventListener("resize", handleResize);
    // Call once initially to set correct position
    handleResize();

    // ─── Clean Up ────────────────────────────────────────────────────────────
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      cancelAnimationFrame(animId);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Traverse scene to dynamically dispose geometries and materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((mat) => mat.dispose());
          }
        }
      });
      scene.clear();
    };
  }, []);

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center select-none"
      style={{ touchAction: "none" }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 dark:bg-black/20 backdrop-blur-sm z-10 rounded-xl">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 animate-pulse">
            Booting 3D System...
          </span>
        </div>
      )}

      {/* 3D Canvas Mount Point */}
      <div 
        ref={containerRef} 
        className={`w-full h-full cursor-grab active:cursor-grabbing transition-all duration-300 ${
          isDragging ? "scale-98" : ""
        }`}
      />

    </div>
  );
}
