import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, ISourceOptions } from "@tsparticles/engine";

const options: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  detectRetina: true,
  interactivity: {
    events: {
      onHover: { enable: true, mode: "grab" },
      onClick: { enable: true, mode: "push" },
    },
    modes: {
      grab: { distance: 160, links: { opacity: 0.5 } },
      push: { quantity: 3 },
    },
  },
  particles: {
    color: { value: ["#f5a524", "#22d3ee", "#94a3b8"] },
    links: {
      color: "#22d3ee",
      distance: 140,
      enable: true,
      opacity: 0.25,
      width: 1,
    },
    move: {
      enable: true,
      speed: 0.7,
      direction: "none",
      outModes: { default: "out" },
      random: true,
    },
    number: { value: 70, density: { enable: true, width: 1200, height: 800 } },
    opacity: {
      value: { min: 0.2, max: 0.6 },
      animation: { enable: true, speed: 0.6, sync: false },
    },
    shape: { type: "circle" },
    size: { value: { min: 1, max: 2.5 } },
  },
};

async function init(engine: Engine) {
  await loadSlim(engine);
}

export function ParticlesProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ParticlesProvider init={init}>{children}</ParticlesProvider>;
}

export function ParticlesBg({ className }: { className?: string }) {
  return (
    <Particles
      id="tsparticles"
      options={options}
      className={
        className ?? "pointer-events-none absolute inset-0 z-0"
      }
    />
  );
}
