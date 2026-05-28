(function () {
    const canvas = document.querySelector('.first-view__particles');
    const intro = document.querySelector('.fv-intro');
    const introMaskPosition = intro?.querySelector('.fv-intro__mask-position');
    const orbitLine = intro?.querySelector('.fv-intro__orbit-line');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealContent = () => {
        document.body.classList.add('is-loaded');
        document.querySelectorAll('.first-view__title, .first-view__lead, .first-view__text, .first-view__button').forEach((element) => {
            element.style.opacity = '1';
            element.style.transform = 'none';
        });
    };

    const buildRotatedEllipseArc = ({
        cx,
        cy,
        rx,
        ry,
        rotationDeg,
        startDeg,
        endDeg,
        segments
    }) => {
        const rotation = (rotationDeg * Math.PI) / 180;
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const start = (startDeg * Math.PI) / 180;
        const end = (endDeg * Math.PI) / 180;
        const step = (end - start) / segments;
        const points = [];

        for (let index = 0; index <= segments; index += 1) {
            const angle = start + step * index;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const x = cx + rx * cosA * cosR - ry * sinA * sinR;
            const y = cy + rx * cosA * sinR + ry * sinA * cosR;
            points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
        }

        return `M ${points[0]} ${points.slice(1).map((point) => `L ${point}`).join(' ')}`;
    };

    const runIntroAnimation = () => {
        if (!intro || !introMaskPosition || !window.gsap || reduceMotion) {
            intro?.remove();
            revealContent();
            return;
        }

        const orbitPath = buildRotatedEllipseArc({
            cx: 50,
            cy: 50,
            rx: 37.5,
            ry: 18.8,
            rotationDeg: 135,
            startDeg: -90,
            endDeg: 90,
            segments: 160
        });

        if (orbitLine) {
            orbitLine.setAttribute('d', orbitPath);
            const orbitLength = orbitLine.getTotalLength();
            orbitLine.style.strokeDasharray = `${orbitLength}`;
            orbitLine.style.strokeDashoffset = `${orbitLength}`;
        }

        const timeline = window.gsap.timeline({
            defaults: {
                ease: 'power2.inOut'
            },
            onComplete: () => {
                intro.remove();
                revealContent();
            }
        });

        timeline
            .set(introMaskPosition, {
                x: 28,
                y: -28,
                scale: 0.08,
                rotate: 0
            })
            .to(orbitLine, {
                opacity: 1,
                duration: 0.25
            }, 0)
            .to(orbitLine, {
                strokeDashoffset: 0,
                duration: 1.25,
                ease: 'power2.out'
            }, 0.08)
            .to(introMaskPosition, {
                x: -26,
                y: 26,
                scale: 2.95,
                rotate: 20,
                duration: 1.45,
                ease: 'power3.inOut'
            }, 0.18)
            .to(orbitLine, {
                opacity: 0,
                duration: 0.22
            }, 1.18)
            .to(intro, {
                opacity: 0,
                duration: 0.26
            }, 1.34);
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
    window.addEventListener('load', runIntroAnimation);
    window.addEventListener('load', initPerformanceSection);
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
