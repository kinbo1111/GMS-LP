(function () {
    const canvas = document.querySelector('.first-view__particles');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealContent = () => {
        document.body.classList.add('is-loaded');
        document.querySelectorAll('.first-view__title, .first-view__lead, .first-view__text, .first-view__button').forEach((element) => {
            element.style.opacity = '1';
            element.style.transform = 'none';
        });
    };

    // Build a conical-helix path: counter-clockwise, starting at the cone
    // apex (top-right, radius 0) and spiralling out to the base centred on
    // the bottom-left. Because the base radius spans the full diagonal, the
    // (thick-stroked) spiral sweeps across — and fully covers — the viewport.
    // Also returns the cumulative arc length at each sample so the reveal can
    // be paced evenly by the spiral parameter for a smooth leading edge.
    const buildSpiralPath = (width, height, turns, baseRadius, tMax) => {
        const startX = width; // top-right apex
        const startY = 0;
        const endX = 0;       // bottom-left base centre
        const endY = height;
        const steps = Math.max(720, Math.ceil(turns * 160));
        const last = Math.round(steps * tMax);
        const cumulative = new Array(last + 1);
        let d = '';
        let prevX = 0;
        let prevY = 0;
        let total = 0;

        for (let index = 0; index <= last; index += 1) {
            const t = index / steps;
            const cx = startX + (endX - startX) * t;
            const cy = startY + (endY - startY) * t;
            const radius = baseRadius * t;            // 0 at apex → max at base
            const angle = -2 * Math.PI * turns * t;   // counter-clockwise (y-down)
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);

            if (index === 0) {
                d += `M${x.toFixed(2)} ${y.toFixed(2)} `;
                cumulative[index] = 0;
            } else {
                d += `L${x.toFixed(2)} ${y.toFixed(2)} `;
                total += Math.hypot(x - prevX, y - prevY);
                cumulative[index] = total;
            }

            prevX = x;
            prevY = y;
        }

        return { d: d.trim(), cumulative, total };
    };

    const runFirstViewReveal = () => {
        const introEl = document.getElementById('fv-intro');
        if (!introEl) {
            revealContent();
            return;
        }

        const finish = () => {
            introEl.classList.add('is-done');
            revealContent();
            window.setTimeout(() => introEl.remove(), 600);
        };

        if (reduceMotion) {
            finish();
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const turns = 9;
        const diagonal = Math.hypot(width, height);
        const baseRadius = diagonal * 1.12;
        // Stroke covers both the radial growth and the centre's travel per
        // turn, so consecutive coils overlap and leave no gaps.
        const strokeWidth = ((baseRadius + diagonal) / turns) * 1.18;
        // Stop right where coverage completes (the bottom-left corner clears
        // last) so the timeline isn't padded with an invisible tail.
        const tMax = 0.47;
        const { d: path, cumulative, total } = buildSpiralPath(width, height, turns, baseRadius, tMax);
        const region = `x="${-2 * width}" y="${-2 * height}" width="${5 * width}" height="${5 * height}"`;

        introEl.style.background = 'transparent';
        introEl.innerHTML = `
            <svg class="fv-intro__svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <mask id="fvRevealMask" maskUnits="userSpaceOnUse" ${region}>
                        <rect width="${width}" height="${height}" fill="#ffffff"></rect>
                        <path class="fv-intro__spiral" d="${path}" fill="none" stroke="#000000" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"></path>
                    </mask>
                </defs>
                <rect width="${width}" height="${height}" fill="#ffffff" mask="url(#fvRevealMask)"></rect>
            </svg>`;

        const spiral = introEl.querySelector('.fv-intro__spiral');
        if (!spiral) {
            finish();
            return;
        }

        const segments = cumulative.length - 1;
        spiral.style.strokeDasharray = `${total}`;
        spiral.style.strokeDashoffset = `${total}`;

        const duration = 2500;
        // Gentle symmetric ease (sine) for a soft start and a soft landing.
        const easeInOutSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
        const fadeStart = 0.86; // dissolve the final sliver to avoid a hard stop
        let startTime = null;

        const step = (now) => {
            if (startTime === null) {
                startTime = now;
            }
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeInOutSine(progress);

            // Pace by spiral parameter (even leading-edge motion), mapping the
            // eased progress through the arc-length table.
            const pointer = eased * segments;
            const lower = Math.min(Math.floor(pointer), segments - 1);
            const frac = pointer - lower;
            const drawn = cumulative[lower] + (cumulative[lower + 1] - cumulative[lower]) * frac;
            spiral.style.strokeDashoffset = `${total - drawn}`;

            if (progress > fadeStart) {
                introEl.style.opacity = `${Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart))}`;
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                finish();
            }
        };

        requestAnimationFrame(step);
    };

    const initPerformanceSection = () => {
        const section = document.querySelector('.performance');
        if (!section) {
            return;
        }

        const list = section.querySelector('.performance__list');
        const items = section.querySelectorAll('.performance__item');
        const currentStep = section.querySelector('[data-performance-current]');
        const totalStep = section.querySelector('[data-performance-total]');
        if (!list || items.length === 0) {
            return;
        }

        const itemArray = Array.from(items);
        const firstItem = itemArray[0];
        const totalCount = itemArray.length;

        if (totalStep) {
            totalStep.textContent = String(totalCount).padStart(2, '0');
        }

        if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
            itemArray.forEach((item, index) => {
                item.style.opacity = index === 0 ? '1' : '0';
                item.style.transform = 'none';
            });
            if (currentStep) {
                currentStep.textContent = '01';
            }
            return;
        }

        window.gsap.registerPlugin(window.ScrollTrigger);

        window.gsap.set(itemArray, {
            autoAlpha: 0,
            y: 0,
            scale: 0.15,
            transformOrigin: '50% 50%'
        });

        itemArray.forEach((item, index) => {
            item.style.zIndex = `${index + 1}`;
        });

        window.gsap.set(firstItem, {
            autoAlpha: 1,
            y: 0,
            scale: 1
        });

        const timeline = window.gsap.timeline({
            defaults: {
                ease: 'power2.out',
                duration: 1
            },
            scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: `+=${(totalCount - 1) * 110}%`,
                scrub: 0.8,
                pin: true,
                anticipatePin: 1,
                snap: {
                    snapTo: totalCount > 1 ? 1 / (totalCount - 1) : 1,
                    duration: {
                        min: 0.12,
                        max: 0.28
                    },
                    ease: 'power1.inOut'
                },
                onUpdate: (self) => {
                    const stepIndex = Math.round(self.progress * (totalCount - 1));
                    if (currentStep) {
                        currentStep.textContent = String(stepIndex + 1).padStart(2, '0');
                    }
                }
            }
        });

        for (let index = 1; index < totalCount; index += 1) {
            timeline
                .set(itemArray[index - 1], {
                    autoAlpha: 0,
                    scale: 0.78,
                    y: 0
                })
                .to(itemArray[index], {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.2,
                    ease: 'power3.out'
                });
        }
    };

    const initPerformanceEarth = () => {
        const canvas = document.querySelector('.performance__earth-mesh');
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');
        const baseHue = 200;

        // --- build a geodesic icosphere (icosahedron + 2 subdivisions) ---
        const phi = (1 + Math.sqrt(5)) / 2;
        let verts = [
            [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
            [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
            [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
        ].map((v) => {
            const l = Math.hypot(v[0], v[1], v[2]);
            return [v[0] / l, v[1] / l, v[2] / l];
        });
        let faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];

        const subdivide = () => {
            const cache = {};
            const next = [];
            const midpoint = (a, b) => {
                const key = a < b ? `${a}_${b}` : `${b}_${a}`;
                if (cache[key] !== undefined) {
                    return cache[key];
                }
                const va = verts[a];
                const vb = verts[b];
                const m = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2];
                const l = Math.hypot(m[0], m[1], m[2]);
                verts.push([m[0] / l, m[1] / l, m[2] / l]);
                cache[key] = verts.length - 1;
                return cache[key];
            };
            faces.forEach(([a, b, c]) => {
                const ab = midpoint(a, b);
                const bc = midpoint(b, c);
                const ca = midpoint(c, a);
                next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
            });
            faces = next;
        };
        subdivide();
        subdivide();

        const edgeSeen = new Set();
        const edges = [];
        faces.forEach(([a, b, c]) => {
            [[a, b], [b, c], [c, a]].forEach(([x, y]) => {
                const key = x < y ? `${x}_${y}` : `${y}_${x}`;
                if (!edgeSeen.has(key)) {
                    edgeSeen.add(key);
                    edges.push([x, y]);
                }
            });
        });

        const nodeStyle = verts.map(() => {
            const r = Math.random();
            return {
                type: r > 0.9 ? 1 : (r < 0.22 ? 2 : 0),
                hue: baseHue + Math.random() * 30
            };
        });

        let W = 0;
        let H = 0;
        let R = 0;
        const pivotLocal = 0; // spin around the vertical polar axis (through the centre)
        const tilt = -0.22;
        const persp = 3.6;
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth;
            H = canvas.clientHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            R = Math.min(W, H) * 0.46;
        };
        resize();
        window.addEventListener('resize', resize);

        const projected = new Array(verts.length);

        const project = (angle) => {
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const cx = W / 2;
            const cy = H / 2;
            for (let i = 0; i < verts.length; i += 1) {
                const v = verts[i];
                const dx = v[0] - pivotLocal;
                const rx = pivotLocal + dx * cosA + v[2] * sinA; // rotate about right-edge axis
                const rz = -dx * sinA + v[2] * cosA;
                const ry = v[1];
                const y2 = ry * cosT - rz * sinT;                // slight tilt for depth
                const z2 = ry * sinT + rz * cosT;
                const factor = persp / (persp - z2);
                projected[i] = {
                    x: cx + rx * R * factor,
                    y: cy + y2 * R * factor,
                    z: z2,
                    s: factor
                };
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, W, H);

            faces.forEach(([a, b, c]) => {
                const pa = projected[a];
                const pb = projected[b];
                const pc = projected[c];
                const avgZ = (pa.z + pb.z + pc.z) / 3;
                const light = 0.03 + ((avgZ + 1) / 2) * 0.1;
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.lineTo(pc.x, pc.y);
                ctx.closePath();
                ctx.fillStyle = `hsla(${baseHue + 8}, 80%, 55%, ${Math.min(0.14, light)})`;
                ctx.fill();
            });

            edges.forEach(([a, b]) => {
                const pa = projected[a];
                const pb = projected[b];
                const avgZ = (pa.z + pb.z) / 2;
                const front = (avgZ + 1) / 2;
                if (avgZ >= 0) {
                    ctx.strokeStyle = `hsla(${baseHue}, 92%, 70%, ${0.18 + front * 0.5})`;
                    ctx.lineWidth = 1.1;
                } else {
                    ctx.strokeStyle = `hsla(${baseHue + 30}, 35%, 88%, ${0.06 + front * 0.16})`;
                    ctx.lineWidth = 0.8;
                }
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.stroke();
            });

            for (let i = 0; i < projected.length; i += 1) {
                const p = projected[i];
                if (p.z < -0.15) {
                    continue;
                }
                const front = (p.z + 1) / 2;
                const style = nodeStyle[i];
                let r = 1.6 * p.s;
                let alpha = 0.3 + front * 0.5;
                if (style.type === 1) {
                    r = 2.6 * p.s;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r + 3.4 * p.s, 0, Math.PI * 2);
                    ctx.strokeStyle = `hsla(${style.hue}, 95%, 80%, ${0.16 + front * 0.5})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else if (style.type === 2) {
                    r = 1 * p.s;
                    alpha = 0.26 + front * 0.45;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${style.hue}, 100%, 82%, ${Math.min(1, alpha)})`;
                ctx.fill();
            }
        };

        // West-to-east spin: a steadily increasing angle drives the front
        // surface left -> right, matching the real Earth's eastward rotation.
        const speed = (Math.PI * 2) / 26000; // ~26s per full rotation

        if (reduceMotion) {
            project(0);
            draw();
            return;
        }

        let start = null;
        const frame = (now) => {
            if (start === null) {
                start = now;
            }
            project((now - start) * speed);
            draw();
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    };

    const initSolutionMesh = () => {
        if (!window.PolygonMesh) {
            return;
        }
        window.PolygonMesh.initAll('[data-polygon-mesh]');
    };

    const initSolutionSection = () => {
        const section = document.querySelector('.solution');
        if (!section) {
            return;
        }

        const targets = section.querySelectorAll('.solution__visual, .solution__card');
        if (!targets.length) {
            return;
        }

        if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
            return;
        }

        window.gsap.registerPlugin(window.ScrollTrigger);

        window.gsap.set(targets, {
            autoAlpha: 0,
            scale: 0.15,
            transformOrigin: '50% 50%'
        });

        window.gsap.to(targets, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.28,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: {
                trigger: section,
                start: 'top 72%',
                once: true
            }
        });
    };

    const initAppScene = () => {
        const section = document.querySelector('.app-scene');
        if (!section) {
            return;
        }

        const indexEl = section.querySelector('[data-app-step-index]');
        const titleEl = section.querySelector('[data-app-step-title]');
        const textEl = section.querySelector('[data-app-step-text]');
        const noteEl = section.querySelector('[data-app-step-note]');
        const marker = section.querySelector('.app-scene__marker');
        const model = section.querySelector('.app-scene__model');

        const steps = [
            {
                index: '01',
                title: '会員登録',
                text: 'まずは、アプリをダウンロードし、会員登録。<br>アカウント・免許証・決済方法を登録すれば、<br>すぐにご利用いただけます。',
                note: '※HELLO CYCLINGアカウントをお持ちの方は会員登録なしでご利用いただけます。'
            },
            {
                index: '02',
                title: '借りる',
                text: 'アプリで、借りたい場所（ステーション）を選び、<br>乗りたい車種を予約。<br>必要なときにすぐ出発できます。',
                note: '※ご利用可能な車種・ステーションはエリアにより異なります。'
            },
            {
                index: '03',
                title: '返却する',
                text: 'HELLO MOBILITYのロゴがあるステーションなら、<br>借りた場所でなくても返却可能。<br>片道利用にも柔軟に対応できます。',
                note: '※返却可能ステーションはアプリでご確認ください。'
            },
            {
                index: '04',
                title: 'すぐに利用開始',
                text: '登録・予約・返却までスマートフォンで完結。<br>短時間から気軽に利用でき、<br>毎日の移動選択肢を広げます。',
                note: '※料金や詳細条件はアプリ内をご確認ください。'
            }
        ];

        let activeStep = -1;

        const applyStep = (stepIndex) => {
            if (stepIndex === activeStep || !steps[stepIndex]) {
                return;
            }

            const step = steps[stepIndex];
            if (indexEl) indexEl.textContent = step.index;
            if (titleEl) titleEl.textContent = step.title;
            if (textEl) textEl.innerHTML = step.text;
            if (noteEl) noteEl.textContent = step.note;

            activeStep = stepIndex;
        };

        const onScroll = () => {
            const rect = section.getBoundingClientRect();
            const viewHeight = window.innerHeight || 1;
            const trackLength = Math.max(1, rect.height - viewHeight);
            const progress = Math.min(Math.max(-rect.top / trackLength, 0), 0.9999);
            const stepIndex = Math.min(3, Math.floor(progress * 4));
            applyStep(stepIndex);

            if (marker) {
                const angle = progress * Math.PI * 2;
                const radius = 41;
                const x = Math.cos(angle - Math.PI / 2) * radius;
                const y = Math.sin(angle - Math.PI / 2) * radius;
                marker.style.transform = `translate(calc(-50% + ${x}%), ${y}%) rotate(-45deg)`;
            }

            if (model) {
                const tilt = (progress - 0.5) * 10;
                model.style.transform = `translate(-50%, -50%) rotate(${tilt}deg)`;
            }
        };

        applyStep(0);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll();
    };

    const initHeaderMenu = () => {
        const header = document.getElementById('header');
        if (!header) {
            return;
        }

        const toggle = header.querySelector('.header__toggle');
        const overlay = header.querySelector('.header__overlay');
        const links = header.querySelectorAll('.header__nav a');
        if (!toggle) {
            return;
        }

        const setOpen = (open) => {
            header.classList.toggle('is-open', open);
            document.body.classList.toggle('is-nav-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
        };

        toggle.addEventListener('click', () => {
            setOpen(!header.classList.contains('is-open'));
        });

        overlay?.addEventListener('click', () => setOpen(false));
        links.forEach((link) => link.addEventListener('click', () => setOpen(false)));

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        });

        const desktopQuery = window.matchMedia('(min-width: 1025px)');
        const handleViewportChange = () => {
            if (desktopQuery.matches) {
                setOpen(false);
            }
        };
        if (desktopQuery.addEventListener) {
            desktopQuery.addEventListener('change', handleViewportChange);
        } else if (desktopQuery.addListener) {
            desktopQuery.addListener(handleViewportChange);
        }
    };

    window.addEventListener('DOMContentLoaded', initHeaderMenu);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runFirstViewReveal);
    } else {
        runFirstViewReveal();
    }
    window.addEventListener('load', initPerformanceSection);
    window.addEventListener('load', initPerformanceEarth);
    window.addEventListener('load', initSolutionMesh);
    window.addEventListener('load', initSolutionSection);
    window.addEventListener('load', initAppScene);

    if (!canvas || reduceMotion) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const points = [];
    const pointCount = 46;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createPoints = () => {
        points.length = 0;
        for (let i = 0; i < pointCount; i += 1) {
            points.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 1.8 + 1
            });
        }
    };

    const tick = () => {
        ctx.clearRect(0, 0, width, height);

        points.forEach((point, index) => {
            point.x += point.vx;
            point.y += point.vy;

            if (point.x < 0 || point.x > width) point.vx *= -1;
            if (point.y < 0 || point.y > height) point.vy *= -1;

            ctx.beginPath();
            ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(63, 132, 255, 0.75)';
            ctx.fill();

            for (let j = index + 1; j < points.length; j += 1) {
                const other = points[j];
                const dx = point.x - other.x;
                const dy = point.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 140) {
                    ctx.beginPath();
                    ctx.moveTo(point.x, point.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.strokeStyle = `rgba(67, 122, 255, ${0.22 * (1 - dist / 140)})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        });

        requestAnimationFrame(tick);
    };

    resize();
    createPoints();
    tick();

    window.addEventListener('resize', () => {
        resize();
        createPoints();
    });
}());
