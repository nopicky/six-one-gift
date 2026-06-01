/**
 * 公共逻辑 — dangni / xiloubiexu 共享
 * 使用前需在页面中定义 PAGE_CONFIG 对象：
 *   window.PAGE_CONFIG = {
 *     audioSrc,      // 音频文件路径
 *     songName,      // 歌曲名
 *     artist,        // 歌手名
 *     photos,        // [{src, alt, caption}, ...]
 *     lrcData,       // [[time, text], ...]
 *   }
 */
(function () {
  "use strict";

  const CFG = window.PAGE_CONFIG || {};

  // ===== 可修改配置：在一起的日期 =====
  const START_DATE = "2026-02-07T00:00:00";

  // ===== 歌曲显示文案 =====
  const songLabel = (CFG.songName || "") + (CFG.artist ? " · " + CFG.artist : "");

  // ===== 开场 loading =====
  setTimeout(() => document.getElementById("loader").classList.add("hide"), 2000);

  // ===== 打字机标题 =====
  const titleText = "六一快乐，\n我的小朋友";
  const titleEl = document.getElementById("typingTitle");
  let typeIndex = 0;
  function typeTitle() {
    titleEl.textContent = titleText.slice(0, typeIndex);
    typeIndex += 1;
    if (typeIndex <= titleText.length) requestAnimationFrame(() => setTimeout(typeTitle, 120));
  }
  setTimeout(typeTitle, 2150);

  // ===== 在一起天数实时计算 =====
  const daysEl = document.getElementById("daysTogether");
  function updateDays() {
    const start = new Date(START_DATE).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - start);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000) % 24;
    const minutes = Math.floor(diff / 60000) % 60;
    const seconds = Math.floor(diff / 1000) % 60;
    daysEl.textContent = `${days}天 ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  updateDays();
  setInterval(updateDays, 1000);

  // ===== Canvas 背景粒子系统：爱心/圆点混合、上浮、连线、鼠标交互 =====
  const particleCanvas = document.getElementById("particleCanvas");
  const pCtx = particleCanvas.getContext("2d");
  const trailCanvas = document.getElementById("trailCanvas");
  const tCtx = trailCanvas.getContext("2d");
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  let dpr = 1;
  let particles = [];
  let explosions = [];
  let trails = [];

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const canvas of [particleCanvas, trailCanvas]) {
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
    }
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticles();
    layoutPhotoWall();
  }

  function createParticles() {
    const count = Math.max(120, Math.floor(innerWidth * innerHeight / 5200));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.45 + 0.12,
      drift: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.45 + 0.18,
      pulse: Math.random() * Math.PI * 2,
      shape: Math.random() > 0.58 ? "heart" : "dot",
      color: Math.random() > 0.5 ? "#ff4fa3" : "#ffd36a"
    }));
  }

  function drawHeart(ctx, x, y, size, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 16, size / 16);
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 2 + 0.1; t += 0.12) {
      const px = 16 * Math.pow(Math.sin(t), 3);
      const py = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.restore();
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function animateParticles(time = 0) {
    pCtx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const distance = Math.hypot(dx, dy);
      if (pointer.active && distance < 150) {
        const force = (150 - distance) / 150;
        p.x -= dx * force * 0.012;
        p.y -= dy * force * 0.012;
      }

      p.y -= p.speed;
      p.x += p.drift + Math.sin(time * 0.001 + p.pulse) * 0.12;
      if (p.y < -30) {
        p.y = innerHeight + 30;
        p.x = Math.random() * innerWidth;
      }

      const alpha = p.alpha + Math.sin(time * 0.002 + p.pulse) * 0.12;
      if (p.shape === "heart") drawHeart(pCtx, p.x, p.y, p.size * 5, p.color, alpha);
      else {
        pCtx.beginPath();
        pCtx.fillStyle = hexToRgba(p.color, alpha);
        pCtx.shadowColor = p.color;
        pCtx.shadowBlur = 10;
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fill();
      }
    }

    // 星座连线
    pCtx.shadowBlur = 0;
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        if (gap < 95) {
          pCtx.beginPath();
          pCtx.strokeStyle = `rgba(255, 211, 106, ${0.14 * (1 - gap / 95)})`;
          pCtx.lineWidth = 1;
          pCtx.moveTo(a.x, a.y);
          pCtx.lineTo(b.x, b.y);
          pCtx.stroke();
        }
      }
    }

    drawExplosions();
    requestAnimationFrame(animateParticles);
  }

  // ===== 鼠标拖尾光点 =====
  function animateTrail() {
    tCtx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = trails.length - 1; i >= 0; i -= 1) {
      const t = trails[i];
      t.life -= 1;
      tCtx.beginPath();
      tCtx.fillStyle = `rgba(255, 143, 190, ${t.life / t.maxLife})`;
      tCtx.shadowColor = "#ff4fa3";
      tCtx.shadowBlur = 18;
      tCtx.arc(t.x, t.y, t.size * (t.life / t.maxLife), 0, Math.PI * 2);
      tCtx.fill();
      if (t.life <= 0) trails.splice(i, 1);
    }
    requestAnimationFrame(animateTrail);
  }

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    trails.push({ x: event.clientX, y: event.clientY, size: Math.random() * 10 + 8, life: 24, maxLife: 24 });
    if (trails.length > 80) trails.shift();
  });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  // ===== 3D 照片墙 =====
  const cylinder = document.getElementById("photoCylinder");
  let dragStart = 0;
  let baseRotation = 0;
  let dragRotation = 0;
  let isDragging = false;

  function layoutPhotoWall() {
    if (!cylinder) return;
    const cards = [...cylinder.querySelectorAll(".photo-card")];
    const radius = innerWidth < 760 ? 250 : 360;
    cards.forEach((card, index) => {
      const angle = (360 / cards.length) * index;
      card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
    });
  }

  cylinder.addEventListener("pointerdown", (event) => {
    isDragging = true;
    dragStart = event.clientX;
    cylinder.classList.add("dragging");
    cylinder.setPointerCapture(event.pointerId);
  });

  cylinder.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    dragRotation = baseRotation + (event.clientX - dragStart) * 0.35;
    cylinder.style.transform = `rotateY(${dragRotation}deg)`;
  });

  cylinder.addEventListener("pointerup", () => {
    isDragging = false;
    baseRotation = dragRotation;
    cylinder.classList.remove("dragging");
    cylinder.style.animation = "none";
  });

  // 照片 hover 视差
  document.querySelectorAll(".photo-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const rx = (event.clientY - rect.top) / rect.height - 0.5;
      const ry = (event.clientX - rect.left) / rect.width - 0.5;
      card.style.boxShadow = `${-ry * 16}px ${rx * 16 + 28}px 80px rgba(255, 79, 163, 0.42)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.boxShadow = "";
    });
  });

  // ===== Intersection Observer 滚动动画 =====
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  document.querySelectorAll(".reveal, .timeline-item").forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 80, 420)}ms`;
    observer.observe(el);
  });

  // ===== 情话 3D 翻转轮播 =====
  const quoteCards = [...document.querySelectorAll(".quote-card")];
  const quoteControls = document.getElementById("quoteControls");
  let quoteIndex = 0;
  quoteCards.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = `dot${index === 0 ? " active" : ""}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `切换到第 ${index + 1} 句情话`);
    dot.addEventListener("click", () => showQuote(index));
    quoteControls.appendChild(dot);
  });

  function showQuote(index) {
    quoteIndex = index;
    quoteCards.forEach((card, i) => card.classList.toggle("active", i === quoteIndex));
    [...quoteControls.children].forEach((dot, i) => dot.classList.toggle("active", i === quoteIndex));
  }
  setInterval(() => showQuote((quoteIndex + 1) % quoteCards.length), 3600);

  // ===== 惊喜爱心粒子爆炸 =====
  function explodeHearts(x = innerWidth / 2, y = innerHeight / 2) {
    for (let i = 0; i < 180; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2.4;
      explosions.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 55 + 45,
        maxLife: 100,
        size: Math.random() * 5 + 3,
        color: Math.random() > 0.35 ? "#ff4fa3" : "#ffd36a",
        shape: Math.random() > 0.5 ? "heart" : "dot"
      });
    }
  }

  function drawExplosions() {
    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      const e = explosions[i];
      e.life -= 1;
      e.x += e.vx;
      e.y += e.vy;
      e.vy += 0.035;
      e.vx *= 0.992;
      const alpha = Math.max(0, e.life / e.maxLife);
      if (e.shape === "heart") drawHeart(pCtx, e.x, e.y, e.size * 5, e.color, alpha);
      else {
        pCtx.beginPath();
        pCtx.fillStyle = hexToRgba(e.color, alpha);
        pCtx.shadowColor = e.color;
        pCtx.shadowBlur = 18;
        pCtx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        pCtx.fill();
      }
      if (e.life <= 0) explosions.splice(i, 1);
    }
  }

  document.getElementById("surpriseButton").addEventListener("click", (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    explodeHearts(rect.left + rect.width / 2, rect.top + rect.height / 2);
    document.getElementById("confessionText").classList.add("show");
  });

  // ===== 顶部持续飘落小爱心/樱花 =====
  function spawnFalling() {
    const node = document.createElement("span");
    node.className = "falling";
    node.textContent = Math.random() > 0.45 ? "❤" : "✦";
    node.style.left = `${Math.random() * 100}vw`;
    node.style.fontSize = `${Math.random() * 12 + 12}px`;
    node.style.animationDuration = `${Math.random() * 5 + 6}s`;
    node.style.setProperty("--drift", `${(Math.random() - 0.5) * 180}px`);
    document.body.appendChild(node);
    node.addEventListener("animationend", () => node.remove());
  }
  setInterval(spawnFalling, 360);

  resizeCanvas();
  animateParticles();
  animateTrail();
  window.addEventListener("resize", resizeCanvas);

  // ===== 背景音乐：本地 MP3 自动播放 =====
  const bgMusic = document.getElementById("bgMusic");
  const musicToggle = document.getElementById("musicToggle");
  const musicTooltip = document.getElementById("musicTooltip");
  bgMusic.volume = 0.45;

  let musicPlaying = false;

  // 音频加载错误提示
  bgMusic.addEventListener("error", () => {
    musicTooltip.textContent = "⚠ 音频加载失败，请检查文件";
    musicTooltip.classList.add("show");
    updateMusicUI();
  });

  function updateMusicUI() {
    if (musicPlaying) {
      musicToggle.classList.add("playing");
      musicToggle.classList.remove("paused");
      musicToggle.textContent = "♪";
    } else {
      musicToggle.classList.add("paused");
      musicToggle.classList.remove("playing");
      musicToggle.textContent = "♫";
    }
  }

  function showTooltip(msg) {
    if (msg) musicTooltip.textContent = msg;
    musicTooltip.classList.add("show");
    clearTimeout(musicTooltip._timeout);
    musicTooltip._timeout = setTimeout(() => musicTooltip.classList.remove("show"), 2500);
  }

  // 自动播放核心
  function tryAutoplay() {
    bgMusic.muted = false;
    const playPromise = bgMusic.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        musicPlaying = true;
        updateMusicUI();
        showTooltip(songLabel + " ♪");
      }).catch(() => {
        bgMusic.muted = true;
        bgMusic.play().then(() => {
          bgMusic.muted = false;
          musicPlaying = true;
          updateMusicUI();
          showTooltip(songLabel + " ♪");
        }).catch(() => {
          musicPlaying = false;
          updateMusicUI();
          showTooltip("点击屏幕任意位置开始播放 ♪");
        });
      });
    }
  }

  setTimeout(tryAutoplay, 2200);

  // 全局点击兜底
  document.addEventListener("click", () => {
    if (!musicPlaying) {
      bgMusic.muted = false;
      bgMusic.play().then(() => {
        musicPlaying = true;
        updateMusicUI();
        showTooltip(songLabel + " ♪");
      }).catch(() => {});
    }
  }, { once: false });

  // 音乐按钮点击切换
  musicToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (musicPlaying) {
      bgMusic.pause();
      musicPlaying = false;
    } else {
      bgMusic.play().then(() => {
        musicPlaying = true;
      }).catch(() => {});
    }
    updateMusicUI();
    showTooltip();
  });

  // ===== 歌词系统 =====
  const lrcData = CFG.lrcData || [];

  let currentLyricIndex = -1;
  let lyricTimeout = null;

  function showLyric(index) {
    if (index === currentLyricIndex) return;
    currentLyricIndex = index;
    clearTimeout(lyricTimeout);

    if (index < 0 || index >= lrcData.length) return;

    const text = lrcData[index][1];

    // 右下角歌词：由下而上冲击入场
    const cornerLyrics = document.getElementById("cornerLyrics");
    const cornerBeam = document.getElementById("cornerBeam");
    if (cornerLyrics) {
      cornerLyrics.classList.remove("rise");
      void cornerLyrics.offsetWidth;
      cornerLyrics.textContent = text;
      cornerLyrics.classList.add("rise");
    }
    if (cornerBeam) {
      cornerBeam.classList.remove("shock");
      void cornerBeam.offsetWidth;
      cornerBeam.classList.add("shock");
      setTimeout(() => cornerBeam.classList.remove("shock"), 500);
    }

    // 定时准备下一句
    const nextTime = (index + 1 < lrcData.length) ? lrcData[index + 1][0] : 230;
    const duration = (nextTime - lrcData[index][0]) * 1000;
    const fadeStart = Math.max(600, duration - 1200);
    lyricTimeout = setTimeout(() => {
      // 歌词自然淡出前留一个余韵
    }, fadeStart);
  }

  let audioReallyPlaying = false;
  let fallbackStartTime = null;
  let fallbackRAF = null;

  function getLyricIndex(t) {
    let idx = -1;
    for (let i = lrcData.length - 1; i >= 0; i--) {
      if (t >= lrcData[i][0]) { idx = i; break; }
    }
    return idx;
  }

  bgMusic.addEventListener("timeupdate", () => {
    if (!audioReallyPlaying) { audioReallyPlaying = true; fallbackStartTime = null; }
    if (fallbackRAF) { cancelAnimationFrame(fallbackRAF); fallbackRAF = null; }
    showLyric(getLyricIndex(bgMusic.currentTime));
  });

  bgMusic.addEventListener("seeked", () => {
    if (!audioReallyPlaying) { audioReallyPlaying = true; fallbackStartTime = null; }
    showLyric(getLyricIndex(bgMusic.currentTime));
  });

  bgMusic.addEventListener("pause", () => {});

  bgMusic.addEventListener("play", () => {
    audioReallyPlaying = true;
    fallbackStartTime = null;
    if (fallbackRAF) { cancelAnimationFrame(fallbackRAF); fallbackRAF = null; }
    showLyric(getLyricIndex(bgMusic.currentTime));
  });

  // 备援：音频未播放时，用模拟时间轴驱动歌词
  function startLyricsFallback() {
    if (audioReallyPlaying) return;
    fallbackStartTime = performance.now() / 1000;
    function tick() {
      if (audioReallyPlaying) { fallbackRAF = null; return; }
      const elapsed = performance.now() / 1000 - fallbackStartTime;
      showLyric(getLyricIndex(elapsed));
      fallbackRAF = requestAnimationFrame(tick);
    }
    fallbackRAF = requestAnimationFrame(tick);
    musicTooltip.textContent = "点击屏幕播放音乐 ♪ 歌词预览中…";
    musicTooltip.classList.add("show");
  }

  setTimeout(() => {
    if (!audioReallyPlaying) startLyricsFallback();
  }, 3000);
})();
