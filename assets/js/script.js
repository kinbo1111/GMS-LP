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

    // First-view intro modelled on hellomobility.jp: a full-screen white cover
    // holds while the page loads (scroll locked), then lifts away as the hero
    // settles from a slight zoom to its resting identity transform.
    const INTRO_MIN_DURATION = 600;
    const introStart = Date.now();

    const lockIntroScroll = () => {
        if (document.body) {
            document.body.classList.add('is-intro');
        }
    };

    const runFirstViewReveal = () => {
        const firstView = document.getElementById('first-view');
        const intro = document.getElementById('fv-intro');

        const reveal = () => {
            if (firstView) {
                firstView.classList.add('is-revealed');
            }
            if (intro) {
                intro.classList.add('is-hidden');
            }
            if (document.body) {
                document.body.classList.remove('is-intro');
            }
            revealContent();
        };

        if (reduceMotion || !firstView) {
            reveal();
            return;
        }

        const elapsed = Date.now() - introStart;
        const wait = Math.max(INTRO_MIN_DURATION - elapsed, 0);

        // Hold the cover for a beat, then let the start frame paint so the CSS
        // transitions fire on the reveal.
        window.setTimeout(() => {
            requestAnimationFrame(() => requestAnimationFrame(reveal));
        }, wait);
    };

    lockIntroScroll();

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

    // Dotted-globe earth ported from the reference CodePen
    // (https://codepen.io/Mattaniah-Tantero/pen/myrLaPm). Same dot-map build and
    // sphere geometry, only the dot colour is changed to the brand blue so it
    // sits inside the existing polygon wireframe ring.
    const GLOBE_COLOR = 0x4db8ff; // brand blue (matches polygon-mesh hue ~200)

    const initPerformanceGlobe = () => {
        const container = document.querySelector('.performance__earth-globe');
        if (!container || !window.THREE) {
            return;
        }

        const THREE = window.THREE;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        // Pulled closer than the reference pen (z 22) so the globe fills more of
        // the ring while staying just inside the surrounding polygon.
        camera.position.set(0, 0, 16);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        container.appendChild(renderer.domElement);

        let particles = null;

        const sizeRenderer = () => {
            const size = Math.max(container.clientWidth, 1);
            renderer.setSize(size, size, false);
            camera.aspect = 1;
            camera.updateProjectionMatrix();
        };
        sizeRenderer();
        window.addEventListener('resize', sizeRenderer);

        const buildDottedMap = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1024;
            canvas.height = 512;

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg';

            img.onload = () => {
                ctx.drawImage(img, 0, 0, 1024, 512);
                const data = ctx.getImageData(0, 0, 1024, 512).data;
                const positions = [];

                for (let y = 0; y < 512; y += 3) {
                    for (let x = 0; x < 1024; x += 3) {
                        const i = (y * 1024 + x) * 4;
                        if (data[i] > 65) {
                            const lat = (y / 512) * Math.PI - Math.PI / 2;
                            const lon = (x / 1024) * 2 * Math.PI - Math.PI;
                            const r = 8.5;
                            positions.push(
                                -r * Math.cos(lat) * Math.cos(lon),
                                -r * Math.sin(lat),
                                r * Math.cos(lat) * Math.sin(lon)
                            );
                        }
                    }
                }

                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                const mat = new THREE.PointsMaterial({
                    color: GLOBE_COLOR,
                    size: 0.08,
                    transparent: true,
                    opacity: 0.6
                });
                particles = new THREE.Points(geom, mat);
                scene.add(particles);
            };
        };

        const render = () => {
            renderer.render(scene, camera);
        };

        if (reduceMotion) {
            buildDottedMap();
            const settle = window.setInterval(() => {
                if (particles) {
                    render();
                    window.clearInterval(settle);
                }
            }, 80);
            return;
        }

        buildDottedMap();
        const animate = () => {
            requestAnimationFrame(animate);
            if (particles) {
                particles.rotation.y += 0.001;
            }
            render();
        };
        animate();
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

    if (document.readyState === 'complete') {
        runFirstViewReveal();
    } else {
        window.addEventListener('load', runFirstViewReveal);
    }
    window.addEventListener('load', initPerformanceSection);
    window.addEventListener('load', initPerformanceEarth);
    window.addEventListener('load', initPerformanceGlobe);
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
