import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { initNeuralNetworkCanvas } from '../utils/neuralNetworkCanvas';

const features = [
  { icon: '⬚', title: 'Multi-format Upload', desc: 'Drop Python files, notebooks, or papers into one workflow.' },
  { icon: '◉', title: 'Health Scoring', desc: 'See a 0-100 pipeline score with graded analysis dimensions.' },
  { icon: '⌕', title: 'Issue Detection', desc: 'Find critical bugs, warnings, and fixes in seconds.' },
  { icon: '✦', title: 'Debug Assistant', desc: 'Ask follow-up questions and inspect the pipeline interactively.' },
];

const steps = [
  { num: '1', title: 'Upload', desc: 'Add your ML file, notebook, or paper.' },
  { num: '2', title: 'Analyze', desc: 'PipelineIQ reviews the code like a senior engineer.' },
  { num: '3', title: 'Improve', desc: 'Fix issues and iterate with production-grade guidance.' },
];

function useScrollReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.querySelectorAll('.animate-on-scroll').forEach((child) => child.classList.add('visible'));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const canvasRef = useRef(null);
  const featuresRef = useScrollReveal();
  const stepsRef = useScrollReveal();

  useEffect(() => {
    const cleanup = initNeuralNetworkCanvas('network-canvas');
    return () => { if (cleanup) cleanup(); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let W = window.innerWidth;
    let H = window.innerHeight;

    const N = 10000;
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const pz = new Float32Array(N);
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const vz = new Float32Array(N);
    const tx = new Float32Array(N);
    const ty = new Float32Array(N);
    const tz = new Float32Array(N);
    const hue = new Float32Array(N);
    const phase = new Float32Array(N);

    const PHI = Math.PI * (1 + Math.sqrt(5));
    const FOV = 550;
    const CAMERA_Z = 600;
    const REPEL_RADIUS = 120;
    const REPEL_FORCE = 6;

    let rotY = 0;
    let mouseX = -9999;
    let mouseY = -9999;
    let animT = 0;
    let animFrame;

    function initText(width, height) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      const tw = Math.min(Math.max(width, 800), 1200);
      const th = 400;
      tempCanvas.width = tw;
      tempCanvas.height = th;

      tempCtx.fillStyle = '#000';
      tempCtx.fillRect(0, 0, tw, th);
      tempCtx.fillStyle = '#fff';
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';

      const font1 = Math.min(110, tw / 7);
      const font2 = Math.min(52, tw / 13);

      tempCtx.font = `bold ${font1}px "Inter", system-ui, sans-serif`;
      tempCtx.fillText('PipelineIQ', tw / 2, th / 2 - font1 * 0.3);
      tempCtx.font = `bold ${font2}px "Inter", system-ui, sans-serif`;
      tempCtx.fillText('ML Pipeline Analyzer', tw / 2, th / 2 + font1 * 0.65);

      const imgData = tempCtx.getImageData(0, 0, tw, th).data;
      const points = [];

      for (let y = 0; y < th; y += 2) {
        for (let x = 0; x < tw; x += 2) {
          const i = (y * tw + x) * 4;
          if (imgData[i] > 128) {
            points.push({ x: x - tw / 2, y: y - th / 2 });
          }
        }
      }

      for (let i = 0; i < N; i++) {
        if (points.length > 0) {
          const pt = points[Math.floor(Math.random() * points.length)];
          // Reduced particle spread to make the text crisper and readable
          tx[i] = pt.x + (Math.random() - 0.5) * 2.5;
          ty[i] = pt.y + (Math.random() - 0.5) * 2.5;
          tz[i] = (Math.random() - 0.5) * 8;
        } else {
          tx[i] = 0; ty[i] = 0; tz[i] = 0;
        }
      }
    }

    function initParticles(width, height) {
      for (let i = 0; i < N; i++) {
        px[i] = (Math.random() - 0.5) * width * 2;
        py[i] = (Math.random() - 0.5) * height * 2;
        pz[i] = (Math.random() - 0.5) * 1000;
        vx[i] = 0;
        vy[i] = 0;
        vz[i] = 0;
        hue[i] = 140 + (i / N) * 60;
        phase[i] = Math.random() * Math.PI * 2;
      }
    }

    function update(mouseXRef, mouseYRef, width, height) {
      animT += 0.005;
      rotY = Math.sin(animT * 2) * 0.15; // Gentle rocking instead of full rotation

      const CX = width / 2;
      const CY = height / 2;

      for (let i = 0; i < N; i++) {
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);

        let targetX = tx[i] * cosY - tz[i] * sinY;
        let targetY = ty[i];
        let targetZ = tx[i] * sinY + tz[i] * cosY;

        targetX += Math.sin(animT * 8 + phase[i]) * 1.5;
        targetY += Math.cos(animT * 9 + phase[i]) * 1.5;
        targetZ += Math.sin(animT * 7 + phase[i] * 2) * 1.5;

        vx[i] += (targetX - px[i]) * 0.02;
        vy[i] += (targetY - py[i]) * 0.02;
        vz[i] += (targetZ - pz[i]) * 0.02;

        if (mouseXRef > 0) {
          const scale = FOV / (FOV + pz[i] + CAMERA_Z);
          const sx = px[i] * scale + CX;
          const sy = py[i] * scale + CY;
          const rdx = sx - mouseXRef;
          const rdy = sy - mouseYRef;
          const d2 = rdx * rdx + rdy * rdy;
          if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1) {
            const d = Math.sqrt(d2);
            const mag = REPEL_FORCE * (1 - d / REPEL_RADIUS) * 4;
            vx[i] += (rdx / d) * mag;
            vy[i] += (rdy / d) * mag;
          }
        }

        vx[i] *= 0.85;
        vy[i] *= 0.85;
        vz[i] *= 0.85;
        px[i] += vx[i];
        py[i] += vy[i];
        pz[i] += vz[i];
      }
    }

    function draw(context, width, height) {
      const CX = width / 2;
      const CY = height / 2;

      // Darker clear color and higher alpha to reduce blur/trails for sharper text
      context.fillStyle = 'rgba(0, 0, 0, 0.45)';
      context.fillRect(0, 0, width, height);

      for (let i = 0; i < N; i++) {
        const zPos = pz[i] + CAMERA_Z;
        if (zPos < 10) continue;
        const scale = FOV / zPos;
        const sx = px[i] * scale + CX;
        const sy = py[i] * scale + CY;
        const spd = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
        // Increased base alpha (0.35) and scale weighting for better visibility
        const a = Math.min(1, (0.35 + spd * 0.1) * (scale * 0.75));
        const size = (0.6 + spd * 0.12) * scale;
        const h = (hue[i] + animT * 15) % 360;
        context.beginPath();
        context.arc(sx, sy, Math.max(0.1, size), 0, 6.2832);
        context.fillStyle = `hsla(${h}, 95%, 75%, ${a})`;
        context.fill();
      }
    }

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    initText(W, H);
    initParticles(W, H);

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    function loop() {
      update(mouseX, mouseY, W, H);
      draw(ctx, W, H);
      animFrame = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="landing-page">
      <canvas ref={canvasRef} className="landing-canvas" aria-hidden="true" />

      <nav className="landing-nav">
        <div className="landing-brand">PipelineIQ</div>
        <div className="landing-nav-actions">
          <button className="landing-theme-btn" onClick={toggleTheme} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button className="landing-secondary-btn" onClick={() => navigate('/login')}>
            Login
          </button>
          <button className="landing-primary-btn" onClick={() => navigate('/signup')}>
            Get Started
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <canvas id="network-canvas"></canvas>
        {/* <div className="landing-hero-card">
          <div className="landing-badge">AI-Powered • Production Grade</div>
          <h1 className="landing-title">
            Review Your ML Pipeline
            <br />
            <span className="accent">Like a Senior Engineer</span>
          </h1>
          <p className="landing-subtitle">
            Upload Python files, Jupyter notebooks, or papers.{"\n"}
            Get production-grade AI review instantly.
          </p>
          <div className="landing-actions">
            <button className="landing-primary-btn" onClick={() => navigate('/signup')}>
              Start Analyzing Free →
            </button>
            <button className="landing-secondary-btn" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
          <div className="landing-support-text">✓ Free   ✓ No credit card   ✓ Instant results</div>
        </div> */}
      </section>

      <section className="landing-section features t">
        <div className="landing-section-inner" ref={featuresRef}>
          <div className="landing-section-heading animate-on-scroll">
            <h2>Built for fast ML review</h2>
            <p>Analyze code, trace issues, and guide fixes with a single workflow.</p>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature, index) => (
              <div key={feature.title} className={`landing-feature-card animate-on-scroll delay-${Math.min(index + 1, 4)}`}>
                <div className="landing-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner" ref={stepsRef}>
          <div className="landing-section-heading animate-on-scroll" style={{ textAlign: 'center' }}>
            <h2>How it works</h2>
            <p>Three steps from upload to actionable feedback.</p>
          </div>
          <div className="landing-steps">
            {steps.map((step, index) => (
              <div key={step.title} className={`landing-step-card animate-on-scroll delay-${Math.min(index + 1, 4)}`}>
                <div className="landing-step-number">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
