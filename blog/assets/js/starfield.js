/**
 * Restored from D:\Blog commit 05065bec17d9e318e86c35c3c1fe5aa2205fba01.
 * DeepSeek-inspired grid; adapted for Notebook and live motion preferences.
 *
 * - 90px grid of dots; mouse pushes them apart (140px radius), spring pulls them back.
 * - Adjacent nodes are joined by faint lines, leaving a 10px gap at each end.
 * - Follows [data-theme]; renders a static grid on touch or reduced motion.
 */
(function () {
    "use strict";

    var canvas = document.getElementById("starfield-canvas");
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    // ---- theme colors -------------------------------------------------
    // Preserve the original faint blue grid in light and dark themes.
    function themeColors() {
        var dark = document.documentElement.getAttribute("data-theme") === "dark";
        return dark
            ? { line: "rgba(140, 170, 215, 0.12)", dot: "rgba(160, 190, 230, 0.35)" }
            : { line: "rgba(60, 100, 160, 0.1)", dot: "rgba(60, 100, 160, 0.2)" };
    }

    // ---- state --------------------------------------------------------
    var mouse = { x: -9999, y: -9999 }; // off-screen until first mousemove
    var width = 0, height = 0;
    var points = [];
    var cols = 0, rows = 0;
    var rafId = 0;
    var lastFrame = 0;
    var FRAME_MS = 1000 / 30; // 30 fps cap
    var SPACING = 90;         // grid spacing
    var RADIUS = 140;         // mouse influence radius
    var THRESHOLD = 20;       // line-drawing distance

    function buildGrid() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = Math.ceil(width / SPACING) + 1;
        rows = Math.ceil(height / SPACING) + 1;
        var offX = (width - (cols - 1) * SPACING) / 2;
        var offY = (height - (rows - 1) * SPACING) / 2;

        points = [];
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var rx = offX + SPACING * c;
                var ry = offY + SPACING * r;
                points.push({ restX: rx, restY: ry, x: rx, y: ry, vx: 0, vy: 0 });
            }
        }
    }

    function canAnimate() {
        return !reduceMotion.matches && finePointer.matches && !document.hidden;
    }

    function frame(now) {
        rafId = 0;
        if (!canAnimate()) return;
        if (now - lastFrame < FRAME_MS) {
            rafId = requestAnimationFrame(frame);
            return;
        }
        lastFrame = now - ((now - lastFrame) % FRAME_MS);

        var i, p, dx, dy, dist, f, nx, ny;
        var mx = mouse.x, my = mouse.y;
        var maxMovement = 0;

        // ---- physics: mouse repulsion + spring + damping ----
        for (i = 0; i < points.length; i++) {
            p = points[i];
            dx = p.x - mx;
            dy = p.y - my;
            dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < RADIUS && dist > 0.1) {
                f = (1 - dist / RADIUS) * 30 * 0.1;
                nx = dx / dist;
                ny = dy / dist;
                p.vx += nx * f;
                p.vy += ny * f;
            }
            // spring back to rest position
            p.vx += 0.05 * (p.restX - p.x);
            p.vy += 0.05 * (p.restY - p.y);
            // damping
            p.vx *= 0.85;
            p.vy *= 0.85;
            p.x += p.vx;
            p.y += p.vy;
            var movement = Math.abs(p.vx) + Math.abs(p.vy);
            // Low velocity at a spring turning point is not a settled grid.
            if (mouse.x === -9999) movement += Math.abs(p.restX - p.x) + Math.abs(p.restY - p.y);
            if (movement > maxMovement) maxMovement = movement;
        }

        draw();
        if (maxMovement >= 0.01) rafId = requestAnimationFrame(frame);
    }

    function draw() {
        var colors = themeColors();
        ctx.clearRect(0, 0, width, height);
        var nx, ny;

        // ---- grid lines (horizontal) ----
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 0.5;
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols - 1; c++) {
                var a = points[r * cols + c];
                var b = points[r * cols + c + 1];
                var lx = b.x - a.x, ly = b.y - a.y;
                var ld = Math.sqrt(lx * lx + ly * ly);
                if (ld < THRESHOLD) continue; // too close together — skip
                nx = lx / ld;
                ny = ly / ld;
                ctx.beginPath();
                ctx.moveTo(a.x + 10 * nx, a.y + 10 * ny);
                ctx.lineTo(b.x - 10 * nx, b.y - 10 * ny);
                ctx.stroke();
            }
        }

        // ---- grid lines (vertical) ----
        for (c = 0; c < cols; c++) {
            for (r = 0; r < rows - 1; r++) {
                var a2 = points[r * cols + c];
                var b2 = points[(r + 1) * cols + c];
                var lx2 = b2.x - a2.x, ly2 = b2.y - a2.y;
                var ld2 = Math.sqrt(lx2 * lx2 + ly2 * ly2);
                if (ld2 < THRESHOLD) continue; // too close together — skip
                nx = lx2 / ld2;
                ny = ly2 / ld2;
                ctx.beginPath();
                ctx.moveTo(a2.x + 10 * nx, a2.y + 10 * ny);
                ctx.lineTo(b2.x - 10 * nx, b2.y - 10 * ny);
                ctx.stroke();
            }
        }

        // ---- dots, brighten near mouse ----
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            var dx = p.x - mouse.x;
            var dy = p.y - mouse.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var glow = Math.max(0, 1 - dist / RADIUS);
            var radius = 1.8 + 2 * glow;
            ctx.globalAlpha = 0.2 + 0.4 * glow;
            ctx.fillStyle = colors.dot;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

    }

    function wake() {
        if (!rafId && canAnimate()) {
            lastFrame = 0;
            rafId = requestAnimationFrame(frame);
        }
    }

    function onMouseMove(e) {
        if (!canAnimate() || e.pointerType === "touch") return;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        wake();
    }

    function onMouseLeave() {
        mouse.x = -9999;
        mouse.y = -9999;
        wake();
    }

    function stop() {
        cancelAnimationFrame(rafId);
        rafId = 0;
        mouse.x = mouse.y = -9999;
    }

    function reset() {
        stop();
        buildGrid();
        draw();
    }

    reset();
    new MutationObserver(draw).observe(document.documentElement, {
        attributes: true, attributeFilter: ["data-theme"]
    });
    window.addEventListener("pointermove", onMouseMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("blur", onMouseLeave);
    window.addEventListener("resize", reset);
    reduceMotion.addEventListener("change", reset);
    finePointer.addEventListener("change", reset);
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop();
        else reset();
    });
    window.addEventListener("pagehide", stop);
    window.addEventListener("pageshow", reset);
})();
