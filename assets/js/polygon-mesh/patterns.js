/**
 * Polygon mesh patterns — node coordinates are normalized 0–1 relative to canvas size.
 *
 * The geometry is traced directly from the approved design comp ("Data: From Risk
 * to Opportunity" solution background). It is a data-network style mesh that flows
 * diagonally from the lower-left up to the upper-right:
 *
 *   • Left tangle      — dense triangulated knot of nodes (lower-left → center)
 *   • Bridge           — short links carrying the spine across the middle gap
 *   • Upper cluster    — triangulated band that climbs toward the top-right corner
 *   • Lower cluster    — compact triangulated knot hanging below center
 *   • Spoke-tips       — 3 endpoint nodes rendered WITHOUT a dot (top-right,
 *                        far-right, far-left). These are the last `tipCount` nodes.
 *
 * The outermost rectangular frame from the comp is intentionally NOT included —
 * only the curve/mesh itself is reproduced.
 *
 * Both patterns share the same edge topology so they behave identically when
 * reused as components:
 *   Pattern A (solution-a) — design orientation (flows toward the right).
 *   Pattern B (solution-b) — horizontal mirror (flows toward the left).
 */
(function (global) {

    // Shared triangulation (edge index pairs into the nodes array).
    const MESH_EDGES = [
        [0,1],[0,2],[0,13],[0,49],[1,2],[1,3],[1,13],[2,3],[2,4],[2,7],
        [2,9],[2,10],[2,49],[3,4],[3,5],[3,13],[4,5],[4,10],[4,11],[5,6],
        [5,11],[5,12],[5,13],[6,12],[6,13],[6,14],[7,8],[7,9],[7,49],[8,9],
        [8,12],[8,15],[9,10],[9,11],[9,12],[10,11],[11,12],[12,14],[12,15],[13,14],
        [13,20],[13,25],[14,15],[14,16],[14,17],[14,20],[15,16],[15,19],[16,17],[16,18],
        [16,19],[16,21],[17,18],[17,20],[17,22],[18,21],[18,22],[19,21],[19,23],[20,22],
        [20,25],[20,26],[21,22],[21,23],[21,24],[22,24],[22,26],[23,24],[23,36],[24,26],
        [24,27],[24,36],[24,38],[25,26],[26,27],[26,28],[26,30],[27,28],[27,29],[27,32],
        [27,38],[28,29],[28,30],[29,30],[29,32],[29,33],[30,31],[30,33],[31,33],[31,34],
        [31,35],[32,33],[32,38],[32,39],[33,35],[33,48],[34,35],[35,48],[36,37],[36,38],
        [36,40],[37,40],[37,41],[37,43],[37,45],[38,39],[38,40],[38,41],[39,41],[39,42],
        [39,44],[40,41],[40,42],[40,43],[41,42],[41,43],[42,43],[42,44],[43,44],[43,45],
        [44,48],[45,46],[46,47]
    ];

    /* ─────────────────────────────────────────────────────────────────────
       PATTERN A — solution section (design orientation)
       Last 3 nodes (47 top-right, 48 far-right, 49 far-left) are spoke-tips.
    ───────────────────────────────────────────────────────────────────── */
    const PATTERN_SOLUTION_A = {
        id: 'solution-a',
        tipCount: 3,
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1,
        offset: { x: 0, y: 0 },
        nodes: [
            // ── 0–12  Left tangle (dense knot, lower-left → center) ───────
            [0.188, 0.659], [0.213, 0.661], [0.206, 0.608], [0.248, 0.613], [0.249, 0.592], [0.274, 0.607],
            [0.289, 0.605], [0.198, 0.514], [0.210, 0.509], [0.226, 0.530], [0.235, 0.540], [0.251, 0.535],
            [0.276, 0.504],
            // ── 13–24  Central knot (carries the spine toward the clusters)
            [0.266, 0.698], [0.317, 0.592], [0.340, 0.480], [0.359, 0.514], [0.363, 0.556],
            [0.378, 0.540], [0.379, 0.462], [0.381, 0.649], [0.395, 0.519], [0.396, 0.540], [0.399, 0.486],
            [0.419, 0.511],
            // ── 25–35  Lower cluster (compact knot, below center) ─────────
            [0.397, 0.790], [0.443, 0.706], [0.513, 0.662], [0.518, 0.710], [0.547, 0.728],
            [0.546, 0.783], [0.572, 0.834], [0.575, 0.675], [0.581, 0.739], [0.596, 0.909], [0.601, 0.811],
            // ── 36–46  Upper cluster band climbing to the top-right ───────
            [0.533, 0.352], [0.593, 0.287], [0.595, 0.532], [0.615, 0.532], [0.624, 0.429], [0.634, 0.463],
            [0.666, 0.463], [0.706, 0.308], [0.708, 0.520], [0.725, 0.230], [0.747, 0.163],
            // ── 47–49  Spoke-tips (no dot) ────────────────────────────────
            [0.832, 0.034],  // 47  top-right
            [0.776, 0.579],  // 48  far-right
            [0.104, 0.595]   // 49  far-left
        ],
        edges: MESH_EDGES
    };

    /* ─────────────────────────────────────────────────────────────────────
       PATTERN B — horizontal mirror (reusable in other sections)
       Same triangulation, flows toward the left side of the canvas.
    ───────────────────────────────────────────────────────────────────── */
    const PATTERN_SOLUTION_B = {
        id: 'solution-b',
        tipCount: 3,
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1,
        offset: { x: 0, y: 0 },
        nodes: [
            [0.812, 0.659], [0.787, 0.661], [0.794, 0.608], [0.752, 0.613], [0.751, 0.592], [0.726, 0.607],
            [0.711, 0.605], [0.802, 0.514], [0.790, 0.509], [0.774, 0.530], [0.765, 0.540], [0.749, 0.535],
            [0.724, 0.504], [0.734, 0.698], [0.683, 0.592], [0.660, 0.480], [0.641, 0.514], [0.637, 0.556],
            [0.622, 0.540], [0.621, 0.462], [0.619, 0.649], [0.605, 0.519], [0.604, 0.540], [0.601, 0.486],
            [0.581, 0.511], [0.603, 0.790], [0.557, 0.706], [0.487, 0.662], [0.482, 0.710], [0.453, 0.728],
            [0.454, 0.783], [0.428, 0.834], [0.425, 0.675], [0.419, 0.739], [0.404, 0.909], [0.399, 0.811],
            [0.467, 0.352], [0.407, 0.287], [0.405, 0.532], [0.385, 0.532], [0.376, 0.429], [0.366, 0.463],
            [0.334, 0.463], [0.294, 0.308], [0.292, 0.520], [0.275, 0.230], [0.253, 0.163],
            [0.168, 0.034],  // 47  top-left
            [0.224, 0.579],  // 48  far-left
            [0.896, 0.595]   // 49  far-right
        ],
        edges: MESH_EDGES
    };

    global.PolygonMeshPatterns = {
        'solution-a': PATTERN_SOLUTION_A,
        'solution-b': PATTERN_SOLUTION_B
    };

}(typeof window !== 'undefined' ? window : globalThis));
