import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef } from "react";

const CharacterV1 = ({ char, index, centerIndex, scrollYProgress }) => {
  const isSpace = char === " ";
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);

  return (
    <motion.span
      className={`inline-block text-white ${isSpace ? "w-4" : ""}`}
      style={{ x, rotateX }}
    >
      {char}
    </motion.span>
  );
};

const CharacterV2 = ({ char, index, centerIndex, scrollYProgress }) => {
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.75, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [Math.abs(distanceFromCenter) * 50, 0]);

  return (
    <motion.img
      src={char}
      alt=""
      className="h-16 w-16 shrink-0 object-contain will-change-transform invert opacity-80"
      style={{ x, scale, y, transformOrigin: "center" }}
    />
  );
};

const CharacterV3 = ({ char, index, centerIndex, scrollYProgress }) => {
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 90, 0]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [-Math.abs(distanceFromCenter) * 20, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.75, 1]);

  return (
    <motion.img
      src={char}
      alt="Froscel Candidate Evaluation"
      className="h-24 w-40 shrink-0 object-cover rounded-xl border border-white/10 will-change-transform opacity-90"
      style={{ x, rotate, y, scale, transformOrigin: "center" }}
    />
  );
};

const TextScrollAnimation = () => {
  const targetRef = useRef(null);
  const targetRef2 = useRef(null);
  const targetRef3 = useRef(null);

  const { scrollYProgress } = useScroll({ target: targetRef });
  const { scrollYProgress: scrollYProgress2 } = useScroll({ target: targetRef2 });
  const { scrollYProgress: scrollYProgress3 } = useScroll({ target: targetRef3 });

  const text = "HIRE THE BEST ";
  const characters = text.split("");
  const centerIndex = Math.floor(characters.length / 2);

  const techIcons = [
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/react.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/nodedotjs.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/python.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/docker.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/cplusplus.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/amazonwebservices.svg",
  ];
  const iconCenterIndex = Math.floor(techIcons.length / 2);

  const unsplashImages = [
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=500&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&q=80",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&q=80",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=500&q=80"
  ];
  const imageCenterIndex = Math.floor(unsplashImages.length / 2);

  return (
    <div className="w-full bg-black relative flex flex-col gap-24 md:gap-32 py-20 z-20">
      {/* Block 1 */}
      <div
        ref={targetRef}
        className="relative box-border flex items-center justify-center w-full px-6 z-10"
      >
        <div
          className="font-heading italic w-full max-w-5xl text-center text-6xl md:text-8xl lg:text-[7.5rem] leading-[0.9] tracking-tighter text-white"
          style={{ perspective: "500px" }}
        >
          {characters.map((char, index) => (
            <CharacterV1
              key={index}
              char={char}
              index={index}
              centerIndex={centerIndex}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>

      {/* Block 2 */}
      <div
        ref={targetRef2}
        className="relative box-border flex flex-col items-center justify-center w-full px-6"
      >
        <div className="flex flex-col items-center text-center z-10 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-heading italic text-white mb-6 leading-[0.9] tracking-tight">
            Universal Compatibility.
          </h2>
          <p className="font-body font-light flex items-center justify-center gap-4 text-xl md:text-2xl tracking-tight text-white/60 mb-6 w-full max-w-xl mx-auto">
            <Bracket className="h-8 text-white/20 shrink-0" />
            <span className="truncate">evaluate across any tech stack</span>
            <Bracket className="h-8 scale-x-[-1] text-white/20 shrink-0" />
          </p>
          <p className="text-white/40 font-body font-light text-base md:text-lg leading-relaxed max-w-3xl">
            Whether your engineering teams are architecting React applications, deploying Python machine learning models, or building high-performance low-level systems in C++, Froscel's live environments seamlessly adapt to your engineering requirements to ensure absolute fidelity during technical rounds.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 mt-12 w-full max-w-5xl mx-auto opacity-70">
          {techIcons.map((char, index) => (
            <CharacterV2
              key={index}
              char={char}
              index={index}
              centerIndex={iconCenterIndex}
              scrollYProgress={scrollYProgress2}
            />
          ))}
        </div>
      </div>

      {/* Block 3 */}
      <div
        ref={targetRef3}
        className="relative box-border flex flex-col items-center justify-center w-full px-6"
      >
        <div className="flex flex-col items-center text-center z-10 max-w-4xl mx-auto px-6 mt-16 lg:mt-0">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-heading italic text-white mb-6 leading-[0.9] tracking-tight">
            Actionable Intelligence.
          </h2>
          <p className="font-body font-light flex items-center justify-center gap-4 text-xl md:text-2xl tracking-tight text-white/60 mb-6 w-full max-w-xl mx-auto">
            <Bracket className="h-8 text-white/20 shrink-0" />
            <span className="truncate">verified by proprietary AI</span>
            <Bracket className="h-8 scale-x-[-1] text-white/20 shrink-0" />
          </p>
          <p className="text-white/40 font-body font-light text-base md:text-lg leading-relaxed max-w-3xl">
            Stop relying on basic code execution metrics. Froscel's neural intelligence assesses behavioral traits, communication clarity, systems architecture intuition, and problem-solving resilience to uncover the signal behind the noise and deliver your next exceptional hire.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-10 mt-12 w-full max-w-6xl mx-auto" style={{ perspective: "500px" }}>
          {unsplashImages.map((char, index) => (
            <CharacterV3
              key={index}
              char={char}
              index={index}
              centerIndex={imageCenterIndex}
              scrollYProgress={scrollYProgress3}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export { CharacterV1, CharacterV2, CharacterV3, TextScrollAnimation };

const Bracket = ({ className }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 27 78" className={className}>
      <path
        fill="currentColor"
        d="M26.52 77.21h-5.75c-6.83 0-12.38-5.56-12.38-12.38V48.38C8.39 43.76 4.63 40 .01 40v-4c4.62 0 8.38-3.76 8.38-8.38V12.4C8.38 5.56 13.94 0 20.77 0h5.75v4h-5.75c-4.62 0-8.38 3.76-8.38 8.38V27.6c0 4.34-2.25 8.17-5.64 10.38 3.39 2.21 5.64 6.04 5.64 10.38v16.45c0 4.62 3.76 8.38 8.38 8.38h5.75v4.02Z"
      />
    </svg>
  );
};
