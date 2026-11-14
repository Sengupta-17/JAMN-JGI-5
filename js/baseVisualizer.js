/**
 * Interactive Mars Base Visualizer
 * Dual canvas visualizer:
 * 1. ExteriorVisualizer: Renders landing site terrain, base exterior domes, dust particles, antennas, airlock
 * 2. InteriorBlueprintVisualizer: Renders interactive blueprint cutaway, 7 modules, utility corridors, active alarms
 */

export class ExteriorVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.siteId = 'valles_marineris';
    this.animTime = 0;
    this.particles = [];
    
    this.initParticles();
    this.resize();
    this.startLoop();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 900;
    const h = 480;
    this.canvas.width = w * (window.devicePixelRatio || 1);
    this.canvas.height = h * (window.devicePixelRatio || 1);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * 1200,
        y: Math.random() * 500,
        size: Math.random() * 2 + 0.6,
        speedX: Math.random() * 1.2 + 0.3,
        speedY: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  }

  setSite(siteId) {
    this.siteId = siteId;
  }

  startLoop() {
    const loop = () => {
      this.animTime += 0.02;
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render() {
    if (!this.ctx || !this.w) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const t = this.animTime;

    ctx.clearRect(0, 0, w, h);

    // 1. Martian Sky Gradient depending on site
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (this.siteId === 'north_polar') {
      skyGrad.addColorStop(0, '#0a0d1a');
      skyGrad.addColorStop(0.5, '#2b334a');
      skyGrad.addColorStop(1, '#68595c');
    } else if (this.siteId === 'olympus_mons') {
      skyGrad.addColorStop(0, '#040509');
      skyGrad.addColorStop(0.6, '#181622');
      skyGrad.addColorStop(1, '#54362b');
    } else if (this.siteId === 'hellas_basin') {
      skyGrad.addColorStop(0, '#1c0f0a');
      skyGrad.addColorStop(0.5, '#4a2312');
      skyGrad.addColorStop(1, '#8b4513');
    } else {
      skyGrad.addColorStop(0, '#0d0d17');
      skyGrad.addColorStop(0.5, '#3b1d19');
      skyGrad.addColorStop(1, '#7a3e26');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 137.5) % w;
      const sy = (i * 93.3) % (h * 0.42);
      const twinkle = Math.sin(t * 2 + i) * 0.3 + 0.7;
      ctx.globalAlpha = twinkle * 0.75;
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }
    ctx.globalAlpha = 1.0;

    // Distant Phobos Moon
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.18, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#e2d9cc';
    ctx.shadowColor = '#ffeacc';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Distant Mountain Ridges
    ctx.fillStyle = this.siteId === 'north_polar' ? '#3d4454' : '#3d1b14';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.58);
    for (let x = 0; x <= w; x += 30) {
      const yOffset = Math.sin(x * 0.008 + 1) * 35 + Math.cos(x * 0.015) * 20;
      ctx.lineTo(x, h * 0.56 + yOffset);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Foreground Terrain Dunes
    const duneGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    if (this.siteId === 'north_polar') {
      duneGrad.addColorStop(0, '#535b6b');
      duneGrad.addColorStop(0.3, '#7d8fa3');
      duneGrad.addColorStop(1, '#3b4352');
    } else {
      duneGrad.addColorStop(0, '#592419');
      duneGrad.addColorStop(0.4, '#873922');
      duneGrad.addColorStop(1, '#3a130c');
    }
    ctx.fillStyle = duneGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.68);
    for (let x = 0; x <= w; x += 25) {
      const yOffset = Math.sin(x * 0.006) * 25 + Math.cos(x * 0.012) * 15;
      ctx.lineTo(x, h * 0.68 + yOffset);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 2. Base Structural Elements
    const bx = w * 0.5;
    const by = h * 0.74;

    ctx.save();
    // Shadow under base
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 10, 180, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corridors
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 130, by + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 125, by + 6);
    ctx.stroke();

    // Left Secondary Dome (EVA Airlock)
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(bx - 135, by + 2, 34, Math.PI, 0, false);
    ctx.fill();
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(bx - 155, by - 6, 8, 12);

    // Right Secondary Dome (Agri-Pod)
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(bx + 130, by + 4, 38, Math.PI, 0, false);
    ctx.fill();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
    ctx.fillRect(bx + 105, by - 16, 50, 8);

    // Main Central 3D-Printed Dome
    const domeGrad = ctx.createRadialGradient(bx - 20, by - 55, 10, bx, by - 20, 85);
    domeGrad.addColorStop(0, '#cbd5e1');
    domeGrad.addColorStop(0.5, '#94a3b8');
    domeGrad.addColorStop(0.85, '#64748b');
    domeGrad.addColorStop(1, '#334155');

    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(bx, by, 76, Math.PI, 0, false);
    ctx.fill();

    // 3D printed regolith rib layers
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 2;
    for (let r = 24; r <= 74; r += 12) {
      ctx.beginPath();
      ctx.arc(bx, by, r, Math.PI, 0, false);
      ctx.stroke();
    }

    // Cupola observation deck
    ctx.fillStyle = '#0ea5e9';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(bx, by - 74, 10, Math.PI, 0, false);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Airlock Door Port
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx - 18, by - 24, 36, 26);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(bx - 14, by - 22, 28, 6);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(bx, by - 10, 3, 0, Math.PI * 2);
    ctx.fill();

    // Kilopower Nuclear Mast (Far Left)
    const kx = bx - 230;
    const ky = by - 30;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(kx, ky + 30);
    ctx.lineTo(kx, ky - 45);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 6;
    for (let f = 0; f < 4; f++) {
      ctx.fillRect(kx - 18 + f * 10, ky - 35, 6, 20);
    }
    ctx.shadowBlur = 0;

    // Solar Wings (Right)
    const rx = bx + 240;
    const ry = by - 15;
    ctx.strokeStyle = '#0284c7';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(0.2);
    ctx.fillRect(-45, -8, 90, 16);
    ctx.strokeRect(-45, -8, 90, 16);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    for (let gl = -35; gl < 45; gl += 15) {
      ctx.beginPath();
      ctx.moveTo(gl, -8);
      ctx.lineTo(gl, 8);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();

    // 3. Airborne Martian Dust Particles
    ctx.fillStyle = this.siteId === 'north_polar' ? '#e2e8f0' : '#e06f47';
    for (const p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}

export class InteriorBlueprintVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.selectedModuleId = 'eclss_module';
    this.hoveredModuleId = null;
    this.activeIssues = new Set();
    this.animTime = 0;

    this.resize();
    this.bindEvents();
    this.startLoop();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 700;
    const h = rect.height > 0 ? rect.height : 580;
    this.canvas.width = w * (window.devicePixelRatio || 1);
    this.canvas.height = h * (window.devicePixelRatio || 1);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.initLayout();
  }

  initLayout() {
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;

    this.moduleNodes = [
      { id: 'command_module', name: 'Command & Comms', x: cx, y: cy, r: 48, color: '#38bdf8' },
      { id: 'eclss_module', name: 'ECLSS Atmosphere', x: cx - 170, y: cy - 90, r: 42, color: '#06b6d4' },
      { id: 'hydroponics_module', name: 'Agri-Pod Farm', x: cx + 170, y: cy - 90, r: 42, color: '#22c55e' },
      { id: 'water_recovery_module', name: 'Water Recovery', x: cx - 170, y: cy + 90, r: 42, color: '#3b82f6' },
      { id: 'power_microgrid_module', name: 'Power & Reactor', x: cx + 170, y: cy + 90, r: 42, color: '#eab308' },
      { id: 'airlock_module', name: 'EVA Airlock', x: cx - 290, y: cy, r: 38, color: '#f97316' },
      { id: 'habitation_module', name: 'Crew Quarters & Med', x: cx + 290, y: cy, r: 38, color: '#a855f7' }
    ];

    this.corridors = [
      ['command_module', 'eclss_module'],
      ['command_module', 'hydroponics_module'],
      ['command_module', 'water_recovery_module'],
      ['command_module', 'power_microgrid_module'],
      ['eclss_module', 'airlock_module'],
      ['water_recovery_module', 'airlock_module'],
      ['hydroponics_module', 'habitation_module'],
      ['power_microgrid_module', 'habitation_module']
    ];
  }

  setActiveIssues(issuesList) {
    this.activeIssues = new Set(issuesList);
  }

  onModuleSelect(cb) {
    this.onModuleSelectCallback = cb;
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found = null;
      for (const node of this.moduleNodes) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy <= node.r * node.r) {
          found = node.id;
          break;
        }
      }
      if (found !== this.hoveredModuleId) {
        this.hoveredModuleId = found;
        this.canvas.style.cursor = found ? 'pointer' : 'default';
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredModuleId && this.onModuleSelectCallback) {
        this.onModuleSelectCallback(this.hoveredModuleId);
      }
    });
  }

  startLoop() {
    const loop = () => {
      this.animTime += 0.025;
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render() {
    if (!this.ctx || !this.w) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const t = this.animTime;

    ctx.clearRect(0, 0, w, h);

    // Deep space background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    // Blueprint grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const gridStep = 32;
    for (let x = 0; x < w; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Outer Habitat Perimeter
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.min(360, w * 0.46), Math.min(200, h * 0.42), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Corridors & Conduits
    for (const [idA, idB] of this.corridors) {
      const nodeA = this.moduleNodes.find(n => n.id === idA);
      const nodeB = this.moduleNodes.find(n => n.id === idB);
      if (!nodeA || !nodeB) continue;

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.stroke();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.stroke();

      // Flowing utility pulse
      const flowOffset = (t * 25) % 100;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 18]);
      ctx.lineDashOffset = -flowOffset;
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Module Nodes
    for (const node of this.moduleNodes) {
      const hasIssue = this.activeIssues.has(node.id);
      const isSelected = this.selectedModuleId === node.id;
      const isHovered = this.hoveredModuleId === node.id;

      if (hasIssue) {
        const pulse = (Math.sin(t * 8) + 1) * 0.5;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
        ctx.lineWidth = 3 + pulse * 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 10 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isSelected || isHovered) {
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      const grad = ctx.createRadialGradient(node.x - 8, node.y - 8, 4, node.x, node.y, node.r);
      if (hasIssue) {
        grad.addColorStop(0, '#7f1d1d');
        grad.addColorStop(1, '#450a0a');
      } else {
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = hasIssue ? '#ef4444' : node.color;
      ctx.lineWidth = hasIssue ? 3 : 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.stroke();

      this.drawHardware(ctx, node, t, hasIssue);

      // Label
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = hasIssue ? '#fca5a5' : '#f1f5f9';
      ctx.fillText(node.name, node.x, node.y + node.r + 18);

      ctx.font = '9px monospace';
      if (hasIssue) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('CRITICAL ALERT', node.x, node.y + node.r + 30);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillText('ONLINE // NOMINAL', node.x, node.y + node.r + 30);
      }
    }
  }

  drawHardware(ctx, node, t, hasIssue) {
    ctx.save();
    ctx.translate(node.x, node.y);

    if (node.id === 'eclss_module') {
      ctx.strokeStyle = hasIssue ? '#ef4444' : '#06b6d4';
      ctx.lineWidth = 2;
      const angle = hasIssue ? 0 : t * 4;
      for (let i = 0; i < 4; i++) {
        const a = angle + (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * (node.r - 14), Math.sin(a) * (node.r - 14));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#0891b2';
      ctx.fill();
    } else if (node.id === 'hydroponics_module') {
      ctx.fillStyle = hasIssue ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.ellipse(-6, -4, 10, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, -4, 10, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hasIssue ? '#ef4444' : '#15803d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, -4);
      ctx.stroke();
    } else if (node.id === 'water_recovery_module') {
      ctx.strokeStyle = hasIssue ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, node.r - 16, 0, Math.PI * 2);
      ctx.stroke();
      const wave = Math.sin(t * 3) * 4;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(0, wave, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.id === 'power_microgrid_module') {
      ctx.fillStyle = hasIssue ? '#ef4444' : '#eab308';
      ctx.beginPath();
      ctx.moveTo(-4, -14);
      ctx.lineTo(6, -2);
      ctx.lineTo(0, -2);
      ctx.lineTo(4, 14);
      ctx.lineTo(-6, 2);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
    } else if (node.id === 'command_module') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, node.r - 14, 0, Math.PI * 2);
      ctx.stroke();
      const sweepAngle = t * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweepAngle) * (node.r - 14), Math.sin(sweepAngle) * (node.r - 14));
      ctx.stroke();
    } else if (node.id === 'airlock_module') {
      ctx.strokeStyle = hasIssue ? '#ef4444' : '#f97316';
      ctx.lineWidth = 3;
      ctx.strokeRect(-12, -12, 10, 24);
      ctx.strokeRect(2, -12, 10, 24);
    } else if (node.id === 'habitation_module') {
      ctx.fillStyle = hasIssue ? '#ef4444' : '#a855f7';
      ctx.fillRect(-3, -12, 6, 24);
      ctx.fillRect(-12, -3, 24, 6);
    }

    ctx.restore();
  }
}
