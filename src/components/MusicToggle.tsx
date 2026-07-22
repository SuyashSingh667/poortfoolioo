"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState, useRef } from "react";

export const MusicToggleButton = () => {
  const bars = 5;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getRandomHeights = () => {
    return Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
  };

  const [heights, setHeights] = useState<number[]>(Array(bars).fill(0.1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const audio = new Audio("/audio/audio.m4a");
    audio.loop = true;
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => setIsPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setHeights(getRandomHeights());
      }, 100);
      return () => clearInterval(interval);
    } else {
      setHeights(Array(bars).fill(0.1));
    }
  }, [isPlaying]);

  const handleClick = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn("Audio play was prevented by browser autoplay policy:", err);
      });
    }
  };

  if (!mounted) {
    return (
      <div className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-full flex items-center justify-center gap-2 h-8 px-3.5 opacity-50">
        <div className="flex h-[12px] items-center gap-[3px]">
          {Array(bars).fill(0).map((_, i) => (
            <div key={i} className="bg-zinc-800 dark:bg-zinc-200 w-[1.5px] h-[3px] rounded-full" />
          ))}
        </div>
        <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          OFF
        </span>
      </div>
    );
  }

  return (
    <motion.div
      onClick={handleClick}
      initial={{ padding: "0px 14px" }}
      whileHover={{ padding: "0px 18px" }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
      className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15 cursor-pointer rounded-full flex items-center justify-center gap-2 h-8 select-none"
      title={isPlaying ? "Mute Music" : "Play Music"}
    >
      <div className="flex h-[12px] items-center gap-[3px]">
        {heights.map((height, index) => (
          <motion.div
            key={index}
            className="bg-zinc-800 dark:bg-zinc-200 w-[1.5px] rounded-full"
            initial={{ height: 3 }}
            animate={{
              height: Math.max(3, height * 12),
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 15,
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[20px] text-left">
        {isPlaying ? "ON" : "OFF"}
      </span>
    </motion.div>
  );
};
