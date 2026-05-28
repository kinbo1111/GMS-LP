/**
 * Reusable polygon mesh renderer (design-based node/edge curves).
 * Usage:
 *   <div data-polygon-mesh="solution-a"><canvas></canvas></div>
 *   PolygonMesh.initAll();
 */
(function (global) {
    const DEFAULTS = {
        gradientAngle: 147.1044,
        gradStart: { r: 72, g: 128, b: 218 },
        gradEnd: { r: 198, g: 242, b: 255 },
        lineAlpha: 0.42,
        nodeAlpha: 0.58,
        waveSpeed: 0.0008,
        drift: 0.8
    };

    class PolygonMesh {
        constructor(root, pattern, options = {}) {
            this.root = root;
            this.canvas = root.querySelector('canvas');
            this.pattern = pattern;
            this.options = { ...DEFAULTS, ...options };
            this.ctx = this.canvas?.getContext('2d');
            this.points = [];
            this.width = 0;
            this.height = 0;
            this.dpr = 1;
            this.rafId = null;
            this.isVisible = false;
            this.gradMin = 0;
            this.gradMax = 1;
            this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!this.ctx || !this.pattern) {
                return;
            }

            this.buildPoints();
            this.resize();
            this.bindEvents();
        }

        buildPoints() {
            const { nodes, anchor, rotation, scale, offset } = this.pattern;
            const ax = anchor?.x ?? 0.5;
            const ay = anchor?.y ?? 0.5;
            const rot = rotation ?? 0;
            const sc = scale ?? 1;
            const ox = offset?.x ?? 0;
            const oy = offset?.y ?? 0;
            const cos = Math.cos(rot);
            const sin = Math.sin(rot);
            const tipCount = 5;

            this.points = nodes.map(([nx, ny], index) => {
                let x = (nx - ax) * sc + ax + ox;
                let y = (ny - ay) * sc + ay + oy;
                if (rot) {
                    const dx = x - ax;
                    const dy = y - ay;
                    x = ax + dx * cos - dy * sin;
                    y = ay + dx * sin + dy * cos;
                }
                return {
                    ox: x,
                    oy: y,
                    x,
                    y,
                    seed: index * 17.13,
                    showNode: index < nodes.length - tipCount
                };
            });
        }

        updateGradientRange() {
            const angle = (this.options.gradientAngle * Math.PI) / 180;
            const ux = Math.cos(angle);
            const uy = Math.sin(angle);
            const corners = [
                { x: 0, y: 0 },
                { x: this.width, y: 0 },
                { x: 0, y: this.height },
                { x: this.width, y: this.height }
            ];
            this.gradMin = Infinity;
            this.gradMax = -Infinity;
            corners.forEach((corner) => {
                const projection = corner.x * ux + corner.y * uy;
                this.gradMin = Math.min(this.gradMin, projection);
                this.gradMax = Math.max(this.gradMax, projection);
            });
        }

        rgbaAt(px, py, alpha) {
            const angle = (this.options.gradientAngle * Math.PI) / 180;
            const ux = Math.cos(angle);
            const uy = Math.sin(angle);
            const projection = px * ux + py * uy;
            const range = Math.max(1, this.gradMax - this.gradMin);
            const t = Math.min(1, Math.max(0, (projection - this.gradMin) / range));
            const { gradStart, gradEnd } = this.options;
            const r = Math.round(gradStart.r + (gradEnd.r - gradStart.r) * t);
            const g = Math.round(gradStart.g + (gradEnd.g - gradStart.g) * t);
            const b = Math.round(gradStart.b + (gradEnd.b - gradStart.b) * t);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        resize() {
            const rect = this.root.getBoundingClientRect();
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.width = Math.max(1, Math.floor(rect.width));
            this.height = Math.max(1, Math.floor(rect.height));
            this.canvas.width = this.width * this.dpr;
            this.canvas.height = this.height * this.dpr;
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.updateGradientRange();
        }

        toScreen(point) {
            return {
                x: point.x * this.width,
                y: point.y * this.height
            };
        }

        updatePoints(time) {
            const { waveSpeed, drift } = this.options;
            this.points.forEach((point) => {
                const t = time * waveSpeed + point.seed;
                point.x = point.ox + Math.sin(t * 1.12 + point.oy * 8) * (drift / Math.max(this.width, 800));
                point.y = point.oy + Math.cos(t * 1.05 + point.ox * 8) * (drift / Math.max(this.height, 600));
            });
        }

        draw() {
            const { edges } = this.pattern;
            const { lineAlpha, nodeAlpha } = this.options;
            this.ctx.clearRect(0, 0, this.width, this.height);

            edges.forEach(([fromIndex, toIndex]) => {
                const a = this.points[fromIndex];
                const b = this.points[toIndex];
                if (!a || !b) {
                    return;
                }
                const sa = this.toScreen(a);
                const sb = this.toScreen(b);
                const midX = (sa.x + sb.x) / 2;
                const midY = (sa.y + sb.y) / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(sa.x, sa.y);
                this.ctx.lineTo(sb.x, sb.y);
                this.ctx.strokeStyle = this.rgbaAt(midX, midY, lineAlpha);
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            });

            this.points.forEach((point) => {
                if (!point.showNode) {
                    return;
                }
                const screen = this.toScreen(point);
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, 2.4, 0, Math.PI * 2);
                this.ctx.fillStyle = this.rgbaAt(screen.x, screen.y, nodeAlpha * 0.25);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, 1.4, 0, Math.PI * 2);
                this.ctx.fillStyle = this.rgbaAt(screen.x, screen.y, nodeAlpha);
                this.ctx.fill();
            });
        }

        animate = (time) => {
            if (!this.isVisible) {
                this.rafId = null;
                return;
            }
            if (!this.reduceMotion) {
                this.updatePoints(time);
            }
            this.draw();
            this.rafId = requestAnimationFrame(this.animate);
        };

        bindEvents() {
            this.onResize = () => this.resize();
            window.addEventListener('resize', this.onResize);

            this.observer = new IntersectionObserver((entries) => {
                this.isVisible = Boolean(entries[0]?.isIntersecting);
                if (this.isVisible && !this.rafId && !this.reduceMotion) {
                    this.rafId = requestAnimationFrame(this.animate);
                }
                if (!this.isVisible && this.rafId) {
                    cancelAnimationFrame(this.rafId);
                    this.rafId = null;
                }
            }, { threshold: 0.06 });

            this.observer.observe(this.root);

            const rect = this.root.getBoundingClientRect();
            this.isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
            if (this.isVisible) {
                this.draw();
                if (!this.reduceMotion) {
                    this.rafId = requestAnimationFrame(this.animate);
                }
            }
        }

        revealWithGsap() {
            if (!global.gsap || !global.ScrollTrigger || this.reduceMotion) {
                return;
            }
            global.gsap.registerPlugin(global.ScrollTrigger);
            global.gsap.set(this.canvas, { opacity: 0 });
            global.gsap.to(this.canvas, {
                opacity: 1,
                duration: 1.2,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: this.root.closest('section') || this.root,
                    start: 'top 78%',
                    once: true
                }
            });
        }

        destroy() {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            window.removeEventListener('resize', this.onResize);
            this.observer?.disconnect();
        }

        static initAll(selector = '[data-polygon-mesh]') {
            const instances = [];
            document.querySelectorAll(selector).forEach((root) => {
                const patternId = root.getAttribute('data-polygon-mesh');
                const pattern = global.PolygonMeshPatterns?.[patternId];
                if (!pattern) {
                    return;
                }
                const instance = new PolygonMesh(root, pattern);
                instance.revealWithGsap();
                instances.push(instance);
            });
            return instances;
        }
    }

    global.PolygonMesh = PolygonMesh;
}(typeof window !== 'undefined' ? window : globalThis));
