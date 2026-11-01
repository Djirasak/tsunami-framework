// The sea behind the landing hero: layered waves on a canvas. They rise from
// below when the page opens (the tsunami arrives), then keep rolling, swell
// toward the pointer and surge when the hero is clicked. Colours come from
// the page's CSS variables, so the theme switch repaints them. A few
// swimmers drift on the waves and say silly things; a click makes them panic.
// With reduced motion one still frame is drawn.
(() => {
  const canvas = document.querySelector(".landing-sea");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const stage = canvas.parentElement;

  const pixel = document.createElement("canvas").getContext("2d", {
    willReadFrequently: true,
  });
  const rgb = (css) => {
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = "#000";
    pixel.fillStyle = css;
    pixel.fillRect(0, 0, 1, 1);
    return [...pixel.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };
  const lerp = (a, b, f) => a + (b - a) * f;
  const mix = (a, b, f) => a.map((v, i) => Math.round(lerp(v, b[i], f)));
  const style = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // Back to front: where the surface sits (share of the height), how tall the
  // waves are, their length in px and their speed.
  const LAYERS = [
    { base: 0.5, amp: 30, len: 980, speed: 0.22 },
    { base: 0.58, amp: 26, len: 760, speed: -0.3 },
    { base: 0.66, amp: 22, len: 620, speed: 0.38 },
    { base: 0.75, amp: 18, len: 500, speed: -0.46 },
    { base: 0.85, amp: 14, len: 400, speed: 0.55 },
    { base: 0.95, amp: 8, len: 320, speed: -0.6 },
  ];

  // Who floats on which wave (0 is the back one), which way and how fast (px/s),
  // and what they say, one line at a time. "faces" is the way the emoji looks.
  const SWIMMERS = [
    { icon: "🐕", layer: 1, dir: 1, speed: 26, at: 0.12, faces: -1, say: ["I am not drowning. This is dog-paddling.", "Who let the waves out?"] },
    { icon: "🐈", layer: 2, dir: -1, speed: 18, at: 0.78, faces: -1, say: ["I was told there would be a box.", "Do not splash. I am a cat."] },
    { icon: "🏊", layer: 3, dir: 1, speed: 34, at: 0.45, faces: 0, say: ["Swimming in components.", "Has anyone seen my z-index?"] },
    { icon: "🦆", layer: 1, dir: -1, speed: 14, at: 0.9, faces: -1, say: ["Quack. Zero specificity, zero problems.", "Everyone else seems stressed."] },
    { icon: "🏄", layer: 4, dir: -1, speed: 42, at: 0.3, faces: 0, say: ["Surfing a tsunami. No build step.", "Cowabunga, zero dependencies!"] },
    { icon: "🐙", layer: 2, dir: 1, speed: 22, at: 0.6, faces: 0, say: ["Eight arms, still no wrapper component.", "npm install life-jacket"] },
  ];
  const PANIC = ["WAAAH!", "HELP!", "NOT AGAIN!", "GLUB GLUB"];

  let width = 0;
  let height = 0;
  let paint = [];
  let bg = [0, 0, 0];
  let bubble = { fill: "#fff", text: "#000", line: "#ccc" };
  let panicUntil = 0;
  const pointer = { x: 0.5, to: 0.5 };
  let surge = 0;
  let start = performance.now();
  let frame = 0;

  function colours() {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const accent = rgb(style("--accent"));
    bg = rgb(style("--bg"));
    bubble = {
      fill: `rgb(${rgb(style("--surface")).join(",")})`,
      text: `rgb(${rgb(style("--fg")).join(",")})`,
      line: `rgb(${rgb(style("--line")).join(",")})`,
    };
    const deep = mix(accent, [4, 22, 30], 0.62);
    paint = LAYERS.map((_, i) => {
      const f = i / (LAYERS.length - 1);
      const colour = dark
        ? mix(mix(deep, [0, 0, 0], 0.3), accent, f * 0.9)
        : mix(mix(accent, [255, 255, 255], 0.55), deep, f);
      const alpha = dark ? lerp(0.2, 0.85, f) : lerp(0.22, 0.92, f);
      return { colour, alpha };
    });
  }

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = stage.clientWidth;
    height = stage.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // easeOutBack: the water overshoots a little, then settles.
  const arrive = (p) => {
    const c = 1.5;
    const q = Math.min(Math.max(p, 0), 1) - 1;
    return 1 + (c + 1) * q * q * q + c * q * q;
  };

  function draw(now) {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, width, height);
    const step = Math.max(6, Math.round(width / 220));
    surge *= 0.965;
    pointer.x += (pointer.to - pointer.x) * 0.04;

    LAYERS.forEach((layer, i) => {
      const rise = reduce.matches
        ? 1
        : arrive((t - 0.15 - i * 0.14) / 2.1);
      const lift = (1 - rise) * height * 0.95;
      const amp = layer.amp * (1 + surge * 1.6);
      const phase = t * layer.speed * 2;
      const y0 = layer.base * height + lift;
      const swell = 34 + i * 6;
      // Where this wave's surface is at x.
      const surface = (x) => {
        const a = (x / layer.len) * Math.PI * 2;
        const d = (x / width - pointer.x) / 0.2;
        return (
          y0 +
          Math.sin(a + phase) * amp +
          Math.sin(a * 2.3 - phase * 1.3 + i) * amp * 0.38 -
          Math.exp(-d * d) * swell * (0.5 + surge)
        );
      };
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width + step; x += step) ctx.lineTo(x, surface(x));
      ctx.lineTo(width + step, height);
      ctx.closePath();
      const last = i === LAYERS.length - 1;
      const { colour, alpha } = paint[i];
      ctx.fillStyle = last
        ? `rgb(${bg.join(",")})`
        : `rgba(${colour.join(",")},${alpha})`;
      ctx.fill();
      if (!last && i > 0) {
        // A thin light line along the crest reads as foam.
        ctx.strokeStyle = `rgba(255,255,255,${0.1 + i * 0.07})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      // Swimmers sit on this wave, so the waves in front hide their feet.
      for (const who of SWIMMERS) if (who.layer === i) swim(who, t, surface, rise);
    });
  }

  function swim(who, t, surface, rise) {
    const size = Math.min(Math.max(width / 38, 26), 40);
    const span = width + size * 8;
    const x = ((who.at * span + (reduce.matches ? 0 : who.dir * who.speed * t)) % span + span) % span - size * 4;
    const y = surface(x) - size * 0.32;
    const tilt = Math.atan2(surface(x + 8) - surface(x - 8), 16) * 0.8;
    const panic = t < panicUntil;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt + (panic ? Math.sin(t * 24) * 0.25 : 0));
    ctx.globalAlpha = Math.min(rise, 1);
    if (who.faces && who.dir !== who.faces) ctx.scale(-1, 1);
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(who.icon, 0, 0);
    ctx.restore();
    if (rise < 1) return;

    // The speech bubble: each swimmer talks for a third of a nine second cycle,
    // and they take turns, so two or three bubbles show at a time.
    const cycle = (t + SWIMMERS.indexOf(who) * 1.5) / 9;
    const phase = cycle % 1;
    const fade = panic || reduce.matches ? 1 : Math.min(phase / 0.06, (0.35 - phase) / 0.06, 1);
    if (fade <= 0) return;
    const text = panic
      ? PANIC[(who.layer + Math.floor(t * 3)) % PANIC.length]
      : who.say[Math.floor(cycle) % who.say.length];
    const fontSize = width < 640 ? 11 : 13;
    ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 20;
    const h = fontSize + 14;
    const bx = Math.min(Math.max(x - w / 2, 8), width - w - 8);
    const by = y - size * 0.8 - h;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = bubble.fill;
    ctx.strokeStyle = bubble.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 8);
    ctx.moveTo(x - 5, by + h);
    ctx.lineTo(x, by + h + 6);
    ctx.lineTo(x + 5, by + h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = bubble.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + 10, by + h / 2 + 0.5);
    ctx.restore();
  }

  function loop(now) {
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  const play = () => {
    if (!frame && !reduce.matches && !document.hidden) frame = requestAnimationFrame(loop);
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  size();
  colours();
  if (reduce.matches) draw(start + 4000);
  else play();

  new ResizeObserver(() => {
    size();
    if (reduce.matches) draw(start + 4000);
  }).observe(stage);
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause())).observe(stage);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  document.addEventListener("tsunami:themechange", () => {
    colours();
    if (reduce.matches) draw(start + 4000);
  });
  stage.addEventListener("pointermove", (e) => {
    pointer.to = e.clientX / innerWidth;
  });
  stage.addEventListener("pointerdown", () => {
    surge = Math.min(surge + 0.9, 1.4);
    panicUntil = (performance.now() - start) / 1000 + 1.8;
  });
})();
