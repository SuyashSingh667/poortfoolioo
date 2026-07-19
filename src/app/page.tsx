"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CrowdCanvas } from "@/components/CrowdCanvas";
import GradualBlur from "@/components/GradualBlur";
import InfiniteMenu from "@/components/InfiniteMenu";
import GlitterWrap from "@/components/GlitterWrap";
import TextPressure from "@/components/TextPressure";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import PaperBinSkillset from "@/components/PaperBinSkillset";
import MeshText from "@/components/MeshText";
import InteractiveAvatar3D from "@/components/InteractiveAvatar3D";
import { CinematicFooter } from "@/components/CinematicFooter";
import { motion, useScroll, useSpring } from "framer-motion";
import ShapeBlur from "@/components/ShapeBlur";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ─── Data ─────────────────────────────────────────────────────────────────────
interface Project {
  title: string;
  description: string;
  image: string;
  link: string;
}

const projects: Project[] = [
  {
    title: "SkySentinel",
    description: "Space situational awareness platform monitoring satellite risks in Earth's orbit, integrating live TLE data with interactive 3D visualisation.",
    image: "/images/projects/skysentinel.png?v=3",
    link: "https://github.com/SuyashSingh667/SkySentinel",
  },
  {
    title: "Tribe",
    description: "Centralised campus clubs and events hub with custom calendar-based planning, event discovery, and light AI recommendations.",
    image: "/images/projects/tribe.png?v=3",
    link: "https://github.com/SuyashSingh667/Tribe",
  },
  {
    title: "VoteSamvidhan",
    description: "Blockchain-backed election integrity with constitutional literacy — secure digital voting, transparent verification, and real-time dashboards.",
    image: "/images/projects/votesamvidhan.jpg?v=3",
    link: "https://github.com/SuyashSingh667/VoteSamvidhan",
  },
];

const experiences = [
  {
    num: "01",
    org: "IIT Kanpur",
    role: "Software Development & Analytics Intern",
    desc: "Re-engineered the DoRA Giveaway Portal, integrated RESTful APIs, and built live CSR tracking dashboards.",
    tags: ["React.js", "REST APIs", "Data Dashboards"],
  },
  {
    num: "02",
    org: "SAIL Bokaro Steel",
    role: "Project Intern",
    desc: "Production data analysis under the Chief General Manager — plant performance metrics, trend identification, and control-workflow studies.",
    tags: ["Data Analysis", "Process Automation", "Reporting"],
  },
  {
    num: "03",
    org: "CodeChef BU",
    role: "Chapter President",
    desc: "Directed core operations and organised 10+ coding contests and technical events with 1 000+ cumulative participants.",
    tags: ["Leadership", "Event Planning", "Community"],
  },
  {
    num: "04",
    org: "Bennett University",
    role: "B.Tech CSE — Cloud Computing",
    desc: "Studying Computer Science with a Cloud Computing specialisation. CGPA 8.98 (2024 – 2028).",
    tags: ["Cloud Computing", "DSA", "B.Tech CSE"],
  },
];

const SKILLS = [
  "React", "Next.js", "TypeScript", "Three.js", "WebGL",
  "Python", "Node.js", "Blockchain", "Cloud Computing",
  "UI/UX", "Figma", "Docker", "REST APIs", "GSAP",
  "Framer Motion", "Tailwind CSS", "Solidity",
];

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
function SkillsMarquee() {
  const doubled = [...SKILLS, ...SKILLS];
  return (
    <div className="overflow-hidden border-y border-black/6 dark:border-white/6 py-3.5 bg-[#fafafa] dark:bg-[#0c0c0c] transition-colors duration-500">
      <div className="flex animate-marquee whitespace-nowrap w-max">
        {doubled.map((skill, i) => (
          <span key={i} className="inline-flex items-center gap-5 px-5 text-[9px] font-mono uppercase tracking-[0.32em] text-zinc-400 dark:text-zinc-600">
            {skill}
            <span className="text-orange-500/70 text-[10px]">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Bold editorial section header ────────────────────────────────────────────
function Chapter({ num, eyebrow, title }: { num: string; eyebrow: string; title: string }) {
  const { resolvedTheme } = useTheme();
  const textColor = resolvedTheme === "dark" ? "#ffffff" : "#171717";

  return (
    <div className="relative overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors duration-500 px-6 md:px-16 pt-20 pb-10">
      {/* Ghost number */}
      <span
        aria-hidden
        className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none font-black leading-none text-black/[0.035] dark:text-white/[0.035]"
        style={{ fontSize: "clamp(6rem, 22vw, 22rem)", lineHeight: 1 }}
      >
        {num}
      </span>
      <Reveal className="relative z-10 space-y-3">
        <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.38em] text-zinc-400 dark:text-zinc-500">
          <span className="w-5 h-px bg-zinc-400 dark:bg-zinc-500 inline-block" />
          {eyebrow}
        </span>
        <div className="w-full h-[64px] sm:h-[100px] md:h-[130px] lg:h-[160px] -ml-2 select-none">
          <MeshText
            text={title}
            color={textColor}
            colorSplit={true}
            font={{
              fontFamily: "Plus Jakarta Sans",
              variant: "Bold",
              fontSize: 160,
              textAlign: "left",
              fontWeight: 800,
              lineHeight: "1em",
              letterSpacing: "0em",
            }}
          />
        </div>
      </Reveal>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { resolvedTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Hey! I'm Suyash's AI clone. Ask me anything about his work, experience, or skills!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat internally
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const sendMessageText = async (text: string) => {
    if (chatLoading) return;
    const newMessages = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else if (data.error) {
        setChatMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setChatMessages([...newMessages, { role: "assistant", content: "Hey! I couldn't process that. Feel free to ask again!" }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    await sendMessageText(userMsg);
  };


  // GSAP horizontal pin for Experiences
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      const container = cardsContainerRef.current;
      if (!container) return;
      const scrollWidth = container.scrollWidth;
      const clientWidth = window.innerWidth;
      const padding = window.innerWidth >= 768 ? 64 : 24;
      const xTranslation = -(scrollWidth - clientWidth + padding * 2);
      if (scrollWidth <= clientWidth) return;
      const anim = gsap.to(container, { x: xTranslation, ease: "none" });
      const pinTrigger = ScrollTrigger.create({
        trigger: "#experiences",
        start: "top top",
        end: () => `+=${scrollWidth - clientWidth + padding * 2}`,
        pin: true,
        scrub: 0.1,
        animation: anim,
        invalidateOnRefresh: true,
      });
      return () => { pinTrigger.kill(); anim.kill(); };
    }, 150);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const menuItems = projects.map((p) => ({
    image: p.image, link: p.link, title: p.title, description: p.description,
  }));

  return (
    <main className="min-h-screen w-full bg-[#fafafa] text-[#171717] transition-colors duration-500 dark:bg-[#0a0a0a] dark:text-[#ededed] overflow-x-hidden">

      {/* Scroll progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-orange-500 origin-left z-[300]"
        style={{ scaleX }}
      />

      {/* Gradual blur under nav */}
      <GradualBlur target="page" position="top" height="6rem" strength={2} divCount={6} curve="bezier" exponential zIndex={20} />

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 z-[200] flex w-full items-center justify-between px-6 py-5 md:px-16">
        <a href="#" className="font-mono text-[11px] font-bold tracking-widest uppercase opacity-70 hover:opacity-100 transition-opacity">
          suyash.dev
        </a>
        <nav className="hidden md:flex items-center gap-7">
          {[["#work","Work"],["#experiences","Exp"],["#skillset","Skills"],["#about","About"],["#contact","Contact"]].map(([href, label]) => (
            <a key={href} href={href} className="text-[9px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity duration-200">
              {label}
            </a>
          ))}
          <ThemeToggleButton className="scale-90" />
        </nav>
        <div className="md:hidden">
          <ThemeToggleButton className="scale-90" />
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════════
          HERO — cinematic dark, always
      ════════════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-screen w-full flex flex-col bg-[#fafafa] dark:bg-[#080808] text-[#171717] dark:text-white overflow-hidden transition-colors duration-500"
      >
        {/* Stars */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
          <GlitterWrap
            particleCount={350}
            speed={4}
            starSize={12}
            glitterIntensity={4}
            trailAmount={96}
            color1={resolvedTheme === "dark" ? "#ffffff" : "#171717"}
            color2={resolvedTheme === "dark" ? "#d4d4d4" : "#a3a3a3"}
            color3={resolvedTheme === "dark" ? "#a3a3a3" : "#737373"}
          />
        </div>

        {/* Top info strip */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}
          className="relative z-10 flex items-center justify-start px-6 md:px-16 pt-28 pb-0"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.38em] text-[#171717]/25 dark:text-white/25">Est. 2024</span>
        </motion.div>

        {/* Massive name — centred */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-10 px-4">
          <motion.span
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 0.3, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="font-mono text-[9px] uppercase tracking-[0.42em] text-[#171717]/35 dark:text-white/30 mb-5 block"
          >
            Portfolio
          </motion.span>

          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-5xl select-none"
            style={{ height: "clamp(90px, 14vw, 190px)" }}
          >
            <TextPressure
              text="SUYASH"
              flex width weight italic
              alpha={false} stroke={false}
              textColor={resolvedTheme === "dark" ? "#ffffff" : "#171717"}
              minFontSize={52}
            />
          </motion.div>


        </div>

        {/* Crowd canvas */}
        <div className="relative w-full z-0" style={{ height: "42vh" }}>
          <div className="absolute inset-0">
            <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
          </div>
          {/* Fade bottom of crowd into next section */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#fafafa] dark:to-[#080808] transition-colors duration-500 pointer-events-none" />
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="w-px h-10 bg-gradient-to-b from-[#171717]/25 to-transparent dark:from-white/25"
          />
          <span className="text-[7px] font-mono uppercase tracking-[0.4em] text-[#171717]/20 dark:text-white/20">Scroll</span>
        </motion.div>
      </section>

      {/* Skills marquee */}
      <SkillsMarquee />

      {/* ════════════════════════════════════════════════════════════════════════
          01 — WORK
      ════════════════════════════════════════════════════════════════════════ */}
      <Chapter num="01" eyebrow="Selected Work" title="Projects." />

      <section id="work" className="relative h-screen w-full overflow-hidden bg-white dark:bg-[#0c0c0c] border-b border-black/5 dark:border-white/5 transition-colors duration-500 p-4 md:p-8">
        <div className="h-full w-full rounded-[24px] md:rounded-[40px] overflow-hidden border border-black/5 dark:border-white/5 relative">
          {/* Background ShapeBlur shader effect */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-25 dark:opacity-30">
            <ShapeBlur
              variation={0}
              pixelRatioProp={typeof window !== "undefined" ? window.devicePixelRatio : 2}
              shapeSize={1.2}
              roundness={0.4}
              borderSize={0.05}
              circleSize={0.3}
              circleEdge={0.5}
            />
          </div>
          <div className="relative z-10 h-full w-full">
            <InfiniteMenu items={menuItems} scale={1.0} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          02 — EXPERIENCES
      ════════════════════════════════════════════════════════════════════════ */}
      <Chapter num="02" eyebrow="Journey" title="Experience." />

      <section
        id="experiences"
        className="relative z-20 h-screen w-full bg-white dark:bg-[#0a0a0a] border-b border-black/5 dark:border-white/5 transition-colors duration-500 overflow-hidden flex items-center"
      >
        <div className="w-full overflow-hidden">
          <div
            ref={cardsContainerRef}
            className="flex gap-0 px-6 md:px-16"
            style={{ willChange: "transform" }}
          >
            {experiences.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="w-[88vw] sm:w-[55vw] md:w-[42vw] lg:w-[36vw] shrink-0 flex flex-col justify-between border-r border-black/8 dark:border-white/8 last:border-r-0 pr-12 md:pr-16 mr-12 md:mr-16 last:pr-0 last:mr-0 min-h-[50vh]"
              >
                {/* Top */}
                <div>
                  <span className="text-[clamp(5rem,12vw,9rem)] font-black leading-none text-black/[0.06] dark:text-white/[0.05] select-none block -mb-4">
                    {item.num}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.28em] text-orange-500 block mb-3">
                    {item.role}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-black tracking-tight text-[#171717] dark:text-white mb-5 leading-tight">
                    {item.org}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-[340px]">
                    {item.desc}
                  </p>
                </div>

                {/* Bottom — tags */}
                <div className="flex flex-wrap gap-2 mt-8">
                  {item.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 border border-black/10 dark:border-zinc-800 rounded-full text-[8px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          03 — SKILLSET
      ════════════════════════════════════════════════════════════════════════ */}
      <Chapter num="03" eyebrow="Skills" title="Skills." />

      <section
        id="skillset"
        className="relative bg-white dark:bg-zinc-950 border-b border-black/5 dark:border-white/5 transition-colors duration-500 overflow-hidden"
      >
        {/* Warm glow */}
        <div className="absolute top-1/3 left-[5%] w-[400px] h-[400px] bg-orange-500/6 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-16 py-16 flex flex-col md:flex-row gap-10 items-center relative z-10">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: "-60px" }}
            className="w-full md:w-[36%] space-y-8 shrink-0"
          >
            {/* Bold headline */}
            <div>
              <h3
                className="font-black uppercase tracking-tighter leading-[0.88] text-[#171717] dark:text-white"
                style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)" }}
              >
                Built<br />
                <span className="text-zinc-300 dark:text-zinc-700">Different.</span>
              </h3>
            </div>

            {/* Tagline */}
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-[1.7] max-w-[280px]">
              Not just buzzwords on a résumé —<br />
              <span className="text-[#171717] dark:text-white font-medium">battle-tested tools</span> I ship with daily.
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              {[
                { value: "16+", label: "Skills" },
                { value: "3+", label: "Projects" },
                { value: "2+", label: "Years" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <span className="block font-black text-2xl md:text-3xl tracking-tight text-[#171717] dark:text-white leading-none">
                    {stat.value}
                  </span>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mt-1.5">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Tech stack pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["React", "Three.js", "WebGL", "TypeScript", "Next.js"].map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full border border-black/8 dark:border-white/8 bg-black/[0.03] dark:bg-white/[0.03] font-mono text-[8px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right: physics canvas */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: "-60px" }}
            className="w-full md:w-[64%] h-[65vh] md:h-[72vh] relative"
          >
            <PaperBinSkillset theme={resolvedTheme} />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          04 — ABOUT (full-screen 3D model)
      ════════════════════════════════════════════════════════════════════════ */}
      <Chapter num="04" eyebrow="About Me" title="Hello." />

      <section
        id="about"
        className="relative flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 lg:gap-24 px-6 md:px-16 lg:px-24 h-screen w-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-black/5 dark:border-white/5 transition-colors duration-500"
      >
        {/* Left Column: 3D Avatar Canvas */}
        <div className="w-full md:w-[48%] h-[50vh] md:h-[75vh] relative flex items-center justify-center">
          <InteractiveAvatar3D autoRotate={false} wireframeMode={false} accentColor="#F9731A" />
        </div>

        {/* Right Column: Liquid Glass AI Chatbox (Subtle Version) */}
        <div className="relative z-20 w-full sm:w-[420px] md:w-[430px] h-[450px] md:h-[500px] pointer-events-auto select-none liquid-glass-slab">
          <style dangerouslySetInnerHTML={{ __html: `
            .liquid-glass-slab {
              position: relative;
              --glass-bg: rgba(255, 255, 255, 0.02);
              --glass-bg-strong: rgba(255, 255, 255, 0.05);
              --glass-border: rgba(255, 255, 255, 0.1);
              --glass-highlight: rgba(255, 255, 255, 0.15);
              --text-primary: rgba(255, 255, 255, 0.9);
              --text-secondary: rgba(255, 255, 255, 0.6);
              --text-muted: rgba(255, 255, 255, 0.35);
            }

            /* Light theme overrides */
            .liquid-glass-slab-light {
              --glass-bg: rgba(0, 0, 0, 0.01);
              --glass-bg-strong: rgba(0, 0, 0, 0.03);
              --glass-border: rgba(0, 0, 0, 0.08);
              --glass-highlight: rgba(0, 0, 0, 0.05);
              --text-primary: #171717;
              --text-secondary: rgba(23, 23, 23, 0.6);
              --text-muted: rgba(23, 23, 23, 0.35);
            }

            .liquid-glass-card {
              position: relative;
              z-index: 1;
              display: flex;
              flex-direction: column;
              height: 100%;
              width: 100%;
              border-radius: 24px;
              padding: 20px;
              background: var(--glass-bg);
              border: 1px solid var(--glass-border);
              box-shadow:
                0 20px 40px -10px rgba(0, 0, 0, 0.3),
                inset 0 1px 1px var(--glass-highlight),
                inset 0 -1px 2px rgba(0, 0, 0, 0.15);
              backdrop-filter: blur(16px) saturate(140%);
              -webkit-backdrop-filter: blur(16px) saturate(140%);
              color: var(--text-primary);
              overflow: hidden;
            }

            .liquid-glass-card::before {
              content: "";
              position: absolute;
              top: -30%; left: -20%;
              width: 70%; height: 70%;
              background: radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%);
              pointer-events: none;
              transform: rotate(-20deg);
            }

            .liquid-glass-card::after {
              content: "";
              position: absolute;
              inset: 0;
              border-radius: inherit;
              padding: 1px;
              background: linear-gradient(160deg, rgba(255,255,255,0.15), rgba(255,255,255,0) 28%, rgba(255,255,255,0) 65%, rgba(0,0,0,0.1) 100%);
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              pointer-events: none;
            }

            .liquid-chip {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 12px;
              border-radius: 14px;
              background: var(--glass-bg);
              border: 1px solid rgba(255,255,255,0.06);
              color: var(--text-primary);
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
              text-align: left;
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              transition: background 0.2s ease, transform 0.15s ease, border-color 0.2s ease;
            }

            .liquid-chip:hover {
              background: var(--glass-bg-strong);
              border-color: rgba(255,255,255,0.15);
              transform: translateY(-0.5px);
            }

            .liquid-chip:active { transform: translateY(0) scale(0.98); }

            .liquid-chip-icon {
              width: 22px;
              height: 22px;
              flex-shrink: 0;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.1);
            }

            .liquid-input-bar {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 4px 6px 4px 14px;
              border-radius: 999px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
            }

            .liquid-send-btn {
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.9);
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              flex-shrink: 0;
              transition: transform 0.15s ease, background 0.2s ease;
            }
            .liquid-send-btn:hover { background: #fff; }
            .liquid-send-btn:active { transform: scale(0.92); }
            .liquid-send-btn:disabled { opacity: 0.25; cursor: not-allowed; }

            .liquid-bubble-ai {
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.08);
              backdrop-filter: blur(6px);
              border-radius: 16px;
              border-bottom-left-radius: 4px;
            }

            .liquid-bubble-user {
              background: rgba(255, 255, 255, 0.07);
              border: 1px solid rgba(255, 255, 255, 0.15);
              backdrop-filter: blur(6px);
              border-radius: 16px;
              border-bottom-right-radius: 4px;
            }
          ` }} />

          <div className={`liquid-glass-card ${resolvedTheme === "light" ? "liquid-glass-slab-light" : ""}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                <svg className="w-3.5 h-3.5 text-white/70 dark:text-white/70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z"/>
                  <path d="M19 15l.8 2.6L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.4L19 15z" opacity="0.7"/>
                </svg>
                <span className="text-[11px] font-sans font-medium tracking-widest uppercase opacity-70">Curious? Ask!</span>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-white/40 hover:text-white/80 cursor-pointer hover:bg-white/10 transition-all">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.6"/>
                  <circle cx="12" cy="12" r="1.6"/>
                  <circle cx="19" cy="12" r="1.6"/>
                </svg>
              </div>
            </div>

            {/* Dynamic Content Area */}
            {chatMessages.length <= 1 ? (
              /* Hero Intro & Suggestion Chips Grid */
              <div className="flex-1 flex flex-col justify-center my-auto transition-all duration-300">
                <div className="text-center mb-5">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 select-none text-white/80">Hello.</h2>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">How can I help you today?</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button 
                    onClick={() => sendMessageText("Who is Suyash?")}
                    className="liquid-chip"
                  >
                    <span className="liquid-chip-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4" strokeLinecap="round"/><circle cx="12" cy="17" r="0.4" fill="currentColor"/></svg>
                    </span>
                    Who is Suyash?
                  </button>
                  <button 
                    onClick={() => sendMessageText("Summarize his skillset")}
                    className="liquid-chip"
                  >
                    <span className="liquid-chip-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    Summarize skills
                  </button>
                  <button 
                    onClick={() => sendMessageText("Describe past projects")}
                    className="liquid-chip"
                  >
                    <span className="liquid-chip-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><path d="M9 18a6 6 0 1 1 6 0" strokeLinecap="round"/><path d="M9.5 21h5" strokeLinecap="round"/><path d="M12 3v2" strokeLinecap="round"/></svg>
                    </span>
                    Describe projects
                  </button>
                  <button 
                    onClick={() => sendMessageText("How can I contact him?")}
                    className="liquid-chip"
                  >
                    <span className="liquid-chip-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><path d="M9 8l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    How to contact?
                  </button>
                </div>
              </div>
            ) : (
              /* Active Chat Message Log */
              <div ref={chatLogRef} className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 scrollbar-thin">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "ml-auto items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2.5 text-xs md:text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "liquid-bubble-user text-white dark:text-white"
                          : "liquid-bubble-ai text-white/90 dark:text-white/90"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-start max-w-[85%]">
                    <div className="px-4 py-2.5 liquid-bubble-ai flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="liquid-input-bar mt-auto flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white/40 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/>
                <path d="M21 21l-4.3-4.3" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything..."
                disabled={chatLoading}
                className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-white placeholder-white/30 focus:ring-0 focus:outline-none py-2"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="liquid-send-btn"
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-4 h-4 text-zinc-800">
                  <path d="M5 12h14" strokeLinecap="round"/>
                  <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          05 — CONTACT / CINEMATIC FOOTER
      ════════════════════════════════════════════════════════════════════════ */}
      <CinematicFooter />
    </main>
  );
}
