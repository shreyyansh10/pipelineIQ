export function initNeuralNetworkCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CONFIG = {
    colors: ['#00E5FF', '#FF007F'],
    nodeRadius: 1.5,
    nodeSpeed: 0.3,
    connectionDistance: 150,
    density: 12000,
    pulseSpeed: 0.015,
    pulseRadius: 2.5,
    pulseSpawnRate: 0.02,
    maxPulses: 50
  };

  let width, height, nodes, pulses, animFrameId;

  class Node {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * CONFIG.nodeSpeed;
      this.vy = Math.sin(angle) * CONFIG.nodeSpeed;
      this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
      this.x = Math.max(0, Math.min(width, this.x));
      this.y = Math.max(0, Math.min(height, this.y));
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, CONFIG.nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class Pulse {
    constructor(source, target) {
      this.source = source;
      this.target = target;
      this.progress = 0;
      this.color = source.color;
    }
    update() {
      this.progress += CONFIG.pulseSpeed;
      return this.progress >= 1;
    }
    draw() {
      const currentX = this.source.x + (this.target.x - this.source.x) * this.progress;
      const currentY = this.source.y + (this.target.y - this.source.y) * this.progress;
      ctx.beginPath();
      ctx.arc(currentX, currentY, CONFIG.pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function resize() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    nodes = [];
    pulses = [];
    const count = Math.min(Math.floor((width * height) / CONFIG.density), 250);
    for (let i = 0; i < count; i++) nodes.push(new Node());
  }

  function animate() {
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, width, height);

    nodes.forEach(n => n.update());

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.connectionDistance) {
          const opacity = 1 - dist / CONFIG.connectionDistance;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${opacity * 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          if (pulses.length < CONFIG.maxPulses && Math.random() < CONFIG.pulseSpawnRate * opacity) {
            pulses.push(Math.random() > 0.5 ? new Pulse(a, b) : new Pulse(b, a));
          }
        }
      }
      nodes[i].draw();
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      if (pulses[i].update()) pulses.splice(i, 1);
      else pulses[i].draw();
    }

    animFrameId = requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();

  // Return cleanup function for React useEffect
  return function cleanup() {
    cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', resize);
  };
}
