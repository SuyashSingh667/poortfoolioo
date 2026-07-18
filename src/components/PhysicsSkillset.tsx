"use client";

import React, { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

interface SkillItem {
  name: string;
  bg: string;
  fg: string;
  border?: string;
}

const SKILL_ITEMS: SkillItem[] = [
  { name: "React", bg: "#61DAFB", fg: "#000000" },
  { name: "Next.js", bg: "#000000", fg: "#ffffff", border: "#ffffff" },
  { name: "TypeScript", bg: "#3178C6", fg: "#ffffff" },
  { name: "WebGL", bg: "#990000", fg: "#ffffff" },
  { name: "Three.js", bg: "#1a1a1a", fg: "#ffffff", border: "#666666" },
  { name: "Tailwind", bg: "#38BDF8", fg: "#000000" },
  { name: "GSAP", bg: "#88CE02", fg: "#000000" },
  { name: "Framer", bg: "#FF007F", fg: "#ffffff" },
  { name: "HTML5", bg: "#E34F26", fg: "#ffffff" },
  { name: "CSS3", bg: "#1572B6", fg: "#ffffff" },
  { name: "Node.js", bg: "#339933", fg: "#ffffff" },
  { name: "Git", bg: "#F05032", fg: "#ffffff" },
  { name: "Figma", bg: "#F24E1E", fg: "#ffffff" },
  { name: "UI/UX", bg: "#a78bfa", fg: "#000000" },
  { name: "Shaders", bg: "#8b5cf6", fg: "#ffffff" },
  { name: "Canvas", bg: "#ec4899", fg: "#ffffff" },
];

const M = Matter;

function makeWalls(
  bounding: { width: number; height: number },
  world: Matter.World,
  opts: { top: boolean; bottom: boolean; left: boolean; right: boolean }
) {
  const { width: w, height: h } = bounding;
  const t = 200;
  const walls: Matter.Body[] = [];
  if (opts.top)
    walls.push(M.Bodies.rectangle(w / 2, -t / 2, w + 2 * t, t, { isStatic: true }));
  if (opts.bottom)
    walls.push(M.Bodies.rectangle(w / 2, h + t / 2, w + 2 * t, t, { isStatic: true }));
  if (opts.left)
    walls.push(M.Bodies.rectangle(-t / 2, h / 2, t, h + 2 * t, { isStatic: true }));
  if (opts.right)
    walls.push(M.Bodies.rectangle(w + t / 2, h / 2, t, h + 2 * t, { isStatic: true }));
  M.Composite.add(world, walls);
  return walls;
}

export default function PhysicsSkillset({ theme }: { theme?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef    = useRef<Matter.Engine | null>(null);
  const rafRef       = useRef(0);

  const [skillImages, setSkillImages] = useState<{ src: string }[]>([]);
  const [size,        setSize]        = useState(126);
  const [tilt,        setTilt]        = useState({ x: 0, y: 0 });
  const [glowPos,     setGlowPos]     = useState({ x: 0, y: 0 });
  const [isHovered,   setIsHovered]   = useState(false);

  const isDark = theme === "dark";

  // 1. Generate skill badges dynamically as elegant monochromatic 2D spheres
  useEffect(() => {
    const imagesArray = SKILL_ITEMS.map((skill) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { src: "" };

      const highlightColor = isDark ? "#27272a" : "#ffffff";
      const baseColor      = isDark ? "#18181b" : "#f4f4f5";
      const shadowColor    = isDark ? "#09090b" : "#e4e4e7";
      const edgeColor      = isDark ? "#020202" : "#d4d4d8";
      const textColor      = isDark ? "#f4f4f5" : "#18181b";

      const grad = ctx.createRadialGradient(100, 100, 10, 128, 128, 120);
      grad.addColorStop(0,    highlightColor);
      grad.addColorStop(0.3,  baseColor);
      grad.addColorStop(0.85, shadowColor);
      grad.addColorStop(1,    edgeColor);

      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = "900 32px sans-serif";
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(skill.name.toUpperCase(), 128, 128);

      return { src: canvas.toDataURL() };
    });

    setSkillImages(imagesArray);
  }, [theme, isDark]);

  // 2. Compute size responsively
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSize = () => {
      setSize(window.innerWidth <= 768 ? 85 : 126);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const n = SKILL_ITEMS.length;
  const friction = 1;
  const mouseEnable = true;
  const mouseStiffness = 0.991;
  const mouseAngularStiffness = 0;
  const gravX = 0;
  const gravY = 0.8;
  const wallOptions = { top: true, bottom: true, right: true, left: true };

  const depKey = JSON.stringify({
    n,
    size,
    gravX,
    gravY,
    wallOptions,
    friction,
    mouseEnable,
    mouseStiffness,
    mouseAngularStiffness,
    hasImages: skillImages.length > 0,
    theme,
  });

  useEffect(() => {
    if (skillImages.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    const engine = M.Engine.create({
      enableSleeping: false,
      gravity: { x: gravX, y: gravY },
    });
    engineRef.current = engine;

    const bounding = container.getBoundingClientRect();
    makeWalls(bounding, engine.world, wallOptions);

    let mouseConstraint: any = null;
    const onLeave = () =>
      mouseConstraint?.mouse && (mouseConstraint.mouse as any).mouseup(new Event("mouseup"));

    if (mouseEnable) {
      const mouse = M.Mouse.create(container);
      mouseConstraint = M.MouseConstraint.create(engine, {
        mouse,
        constraint: {
          angularStiffness: mouseAngularStiffness,
          stiffness: mouseStiffness,
        } as any,
      });
      M.Composite.add(engine.world, mouseConstraint);

      const el = mouseConstraint.mouse.element;
      el.removeEventListener("mousewheel",    (mouseConstraint.mouse as any).mousewheel);
      el.removeEventListener("DOMMouseScroll", (mouseConstraint.mouse as any).mousewheel);
      container.addEventListener("mouseleave", onLeave);
    }

    const bodyOpts = {
      friction: Math.max(1, Math.min(10, friction)) / 10,
      frictionAir: 0.02,
      restitution: 0.6,
    };

    const made: Matter.Body[] = [];
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * bounding.width;
      const y = size / 2 + i * (size * 0.15 + 10);
      const body = M.Bodies.circle(x, y - 200, size / 2, bodyOpts);
      made.push(body);
    }
    M.Composite.add(engine.world, made);

    const els = Array.from(
      container.querySelectorAll<HTMLElement>("[data-physics-body]")
    );

    const update = () => {
      rafRef.current = requestAnimationFrame(update);
      for (let i = 0; i < made.length; i++) {
        const el = els[i];
        if (!el) continue;
        const { position, angle } = made[i];
        el.style.visibility = "visible";
        el.style.left = `${position.x}px`;
        el.style.top  = `${position.y}px`;
        el.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
      }
      M.Engine.update(engine);
    };
    update();

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (mouseEnable)
        container.removeEventListener("mouseleave", onLeave);
      M.World.clear(engine.world, false);
      M.Engine.clear(engine);
      engineRef.current = null;
    };
  }, [depKey]);

  // Handle interactive 3D Tilting & Dynamic Gravity updates
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect  = container.getBoundingClientRect();
    const x     = e.clientX - rect.left;
    const y     = e.clientY - rect.top;
    const normX = (x / rect.width)  * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    setTilt({ x: -normY * 8, y: normX * 8 });
    setGlowPos({ x, y });
    setIsHovered(true);

    if (engineRef.current) {
      engineRef.current.gravity.x = normX * 0.8;
      engineRef.current.gravity.y = 0.8 + normY * 0.4;
    }
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);

    if (engineRef.current) {
      engineRef.current.gravity.x = 0;
      engineRef.current.gravity.y = 0.8;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.015 : 1}, ${isHovered ? 1.015 : 1}, 1)`,
        transition: isHovered ? "none" : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
        transformStyle: "preserve-3d",
      }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className="bg-zinc-50/50 dark:bg-zinc-950/20 backdrop-blur-sm border border-black/5 dark:border-white/5 rounded-3xl transition-shadow duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)]"
    >
      {/* Dynamic Ambient Background Glow Blob */}
      <div
        style={{
          position: "absolute",
          left: glowPos.x,
          top: glowPos.y,
          transform: "translate(-50%, -50%)",
          width: "250px",
          height: "250px",
          background: isDark
            ? "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(236, 72, 153, 0.04) 50%, rgba(0,0,0,0) 100%)"
            : "radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.02) 50%, rgba(0,0,0,0) 100%)",
          borderRadius: "50%",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 0,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />

      {skillImages.length > 0 &&
        Array.from({ length: n }).map((_, i) => {
          const src = skillImages[i]?.src;
          return (
            <div
              key={i}
              data-physics-body=""
              style={{
                position: "absolute",
                visibility: "hidden",
                width: size,
                height: size,
                borderRadius: "50%",
                overflow: "hidden",
                backgroundImage: src ? `url(${src})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                cursor: "grab",
                boxShadow: isHovered
                  ? `calc(${tilt.y * -0.8}px) calc(${tilt.x * 0.8}px) 25px rgba(0,0,0,0.15)`
                  : "0 10px 25px rgba(0,0,0,0.12)",
                transition: "box-shadow 0.15s ease",
                zIndex: 10,
              }}
              draggable={false}
            />
          );
        })}
    </div>
  );
}

PhysicsSkillset.displayName = "PhysicsSkillset";
