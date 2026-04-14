
// ==================== STATE ====================
let dfa = { states: [], alpha: [], start: '', finals: [], transitions: {} };
let minDfa = null;
let steps = [];
let currentStep = -1;
let selectedAlgo = 'table';
let cyOrig = null, cyMin = null;
let threeRenderer = null, threeScene = null, threeCamera = null, animFrame = null;
let is3D = false;
let autoTimer = null;

// Draw canvas state
let drawTool = 'state';
let drawStates = [];
let drawEdges = [];
let drawSrc = null;
let drawCtx = null;

// ==================== PRESETS ====================
const PRESETS = {
    basic: {
        states: 'q0,q1,q2,q3,q4',
        alpha: '0,1',
        start: 'q0',
        finals: 'q3,q4',
        transitions: {
            q0: { '0': 'q1', '1': 'q2' },
            q1: { '0': 'q1', '1': 'q3' },
            q2: { '0': 'q1', '1': 'q2' },
            q3: { '0': 'q1', '1': 'q4' },
            q4: { '0': 'q1', '1': 'q2' }
        }
    },

    mod3: {
        states: 'A,B,C,D,E',
        alpha: '0,1',
        start: 'A',
        finals: 'A,D',
        transitions: {
            A: { '0': 'A', '1': 'B' },
            B: { '0': 'B', '1': 'C' },
            C: { '0': 'C', '1': 'A' },
            D: { '0': 'A', '1': 'B' },  // same as A (duplicate)
            E: { '0': 'B', '1': 'C' }   // same as B (duplicate)
        }
    },

    complex: {
        states: 'q0,q1',
        alpha: '0,1',
        start: 'q0',
        finals: 'q0',
        transitions: {
            q0: { '0': 'q1', '1': 'q0' },
            q1: { '0': 'q0', '1': 'q1' }
        }
    }
};

function loadPreset(name) {
    const p = PRESETS[name];
    document.getElementById('inp-states').value = p.states;
    document.getElementById('inp-alpha').value = p.alpha;
    document.getElementById('inp-start').value = p.start;
    document.getElementById('inp-final').value = p.finals;
    buildTable();
    // Fill in transitions
    setTimeout(() => {
        Object.keys(p.transitions).forEach(st => {
            Object.keys(p.transitions[st]).forEach(sym => {
                const inp = document.getElementById(`tr_${st}_${sym}`);
                if (inp) inp.value = p.transitions[st][sym];
            });
        });
    }, 50);
}

// ==================== MODE SWITCH ====================
function switchMode(mode) {

    // hide all
    document.getElementById('table-mode').style.display = 'none';
    document.getElementById('draw-mode').style.display = 'none';
    document.getElementById('regex-mode').style.display = 'none';

    // reset tabs
    document.getElementById('tab-table').classList.remove('active');
    document.getElementById('tab-draw').classList.remove('active');
    document.getElementById('tab-regex').classList.remove('active');

    // ALSO hide algo section initially
    const algoSec = document.getElementById('algo-section');
    if (algoSec) algoSec.style.display = 'none';

    // show selected
    if (mode === 'table') {
        document.getElementById('table-mode').style.display = 'block';
        document.getElementById('tab-table').classList.add('active');
    }

    else if (mode === 'draw') {
        document.getElementById('draw-mode').style.display = 'block';
        document.getElementById('tab-draw').classList.add('active');
        initDrawCanvas();
    }

    else if (mode === 'regex') {
        document.getElementById('regex-mode').style.display = 'block';
        document.getElementById('tab-regex').classList.add('active');
    }
}
// ==================== BUILD TABLE ====================

function getReachable(dfa) {
    const visited = new Set();
    const stack = [dfa.start];

    while (stack.length) {
        const s = stack.pop();
        if (!visited.has(s)) {
            visited.add(s);

            dfa.alpha.forEach(a => {
                const next = dfa.transitions[s]?.[a];
                if (next) stack.push(next);
            });
        }
    }

    return visited;
}

function buildTable() {
    const states = document.getElementById('inp-states').value.split(',').map(s => s.trim()).filter(Boolean);
    const alpha = document.getElementById('inp-alpha').value.split(',').map(s => s.trim()).filter(Boolean);
    if (!states.length || !alpha.length) return;
    const wrap = document.getElementById('trans-table-wrapper');
    let html = '<table class="trans-table"><thead><tr><th>State</th>';
    alpha.forEach(a => html += `<th>${a}</th>`);
    html += '</tr></thead><tbody>';
    states.forEach(st => {
        html += `<tr><td class="state-label-cell">${st}</td>`;
        alpha.forEach(a => {
            html += `<td><input id="tr_${st}_${a}" placeholder="—" /></td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    const algoSec = document.getElementById('algo-section');
    if (algoSec) algoSec.style.display = 'block';
}

// ==================== PARSE DFA ====================
function parseDFA() {
    const states = document.getElementById('inp-states').value.split(',').map(s => s.trim()).filter(Boolean);
    const alpha = document.getElementById('inp-alpha').value.split(',').map(s => s.trim()).filter(Boolean);
    const start = document.getElementById('inp-start').value.trim();
    const finals = document.getElementById('inp-final').value.split(',').map(s => s.trim()).filter(Boolean);
    const transitions = {};
    states.forEach(st => {
        transitions[st] = {};
        alpha.forEach(a => {
            const el = document.getElementById(`tr_${st}_${a}`);
            transitions[st][a] = el ? el.value.trim() : '';
        });
    });
    return { states, alpha, start, finals, transitions };
}

function validateDFA(d) {
    const msgs = [];
    if (!d.start) msgs.push({ type: 'error', msg: 'No start state defined' });
    if (!d.states.includes(d.start)) msgs.push({ type: 'error', msg: `Start state "${d.start}" not in states list` });
    d.finals.forEach(f => { if (!d.states.includes(f)) msgs.push({ type: 'error', msg: `Final state "${f}" not in states list` }); });
    // Check transitions
    d.states.forEach(st => {
        d.alpha.forEach(a => {
            const target = d.transitions[st]?.[a];
            if (!target) msgs.push({ type: 'warn', msg: `Missing transition: δ(${st}, ${a})` });
            else if (!d.states.includes(target)) msgs.push({ type: 'error', msg: `Invalid target: δ(${st}, ${a}) = ${target}` });
        });
    });
    // Check unreachable
    const reachable = getReachable(d);
    d.states.filter(s => !reachable.has(s)).forEach(s => {
        msgs.push({ type: 'warn', msg: `State "${s}" is unreachable from start state` });
    });
    return msgs;
}

function removeUnreachable(dfa) {
    const visited = new Set();
    const stack = [dfa.start];

    while (stack.length) {
        const s = stack.pop();

        if (!visited.has(s)) {
            visited.add(s);

            dfa.alpha.forEach(a => {
                const next = dfa.transitions[s]?.[a];
                if (next) stack.push(next);
            });
        }
    }

    const newStates = dfa.states.filter(s => visited.has(s));

    const newTransitions = {};
    newStates.forEach(s => {
        newTransitions[s] = {};
        dfa.alpha.forEach(a => {
            const next = dfa.transitions[s]?.[a];
            if (next && visited.has(next)) {
                newTransitions[s][a] = next;
            }
        });
    });

    const newFinals = dfa.finals.filter(s => visited.has(s));

    return {
        states: newStates,
        alpha: dfa.alpha,
        start: dfa.start,
        finals: newFinals,
        transitions: newTransitions
    };
}

function showWarnings(msgs) {
    const wrap = document.getElementById('warnings');
    if (!msgs.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = msgs.map(m => `<div class="warning-item warning-${m.type === 'error' ? 'error' : m.type === 'warn' ? 'warn' : 'info'}">
    ${m.type === 'error' ? '✕' : '⚠'} ${m.msg}
  </div>`).join('');
}

function selectAlgo(a) {
    selectedAlgo = a;

    document.getElementById('algo-table').classList.toggle('active', a === 'table');
    document.getElementById('algo-partition').classList.toggle('active', a === 'partition');

    const descs = {
        table: 'Marks pairs of distinguishable states...',
        partition: 'Iteratively refines partitions...'
    };

    document.getElementById('algo-desc').textContent = descs[a];
}

// ==================== TABLE FILLING ALGORITHM ====================
function runTableFilling(d) {
    const states = d.states.filter(s => getReachable(d).has(s));
    const n = states.length;
    const idx = {};
    states.forEach((s, i) => idx[s] = i);
    const isFinal = s => d.finals.includes(s);

    const marked = Array.from({ length: n }, () => Array(n).fill(false));
    const steps = [];

    // STEP 1: Initialization
    steps.push({
        title: 'INITIALIZATION',
        desc: `Begin with ${n} reachable states.`,
        matrix: JSON.parse(JSON.stringify(marked)),
        highlight: [],
        phase: 'init'
    });

    // STEP 2: Mark final vs non-final
    const initMarked = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (isFinal(states[i]) !== isFinal(states[j])) {
                marked[i][j] = true;
                initMarked.push([i, j]);
            }
        }
    }

    steps.push({
        title: 'MARK BASE PAIRS',
        desc: `Final vs non-final marked.`,
        matrix: JSON.parse(JSON.stringify(marked)),
        highlight: initMarked,
        phase: 'base'
    });

    // STEP 3: PROPAGATION (FIXED)
    let changed = true;
    let iteration = 0;

    while (changed) {
        changed = false;
        iteration++;
        const newlyMarked = [];

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < i; j++) {

                if (marked[i][j]) continue;

                for (const a of d.alpha) {

                    const tiState = d.transitions[states[i]]?.[a];
                    const tjState = d.transitions[states[j]]?.[a];

                    if (!tiState || !tjState) continue;

                    const ti = idx[tiState];
                    const tj = idx[tjState];

                    if (ti === undefined || tj === undefined) continue;

                    const hi = Math.max(ti, tj);
                    const lo = Math.min(ti, tj);

                    if (marked[hi][lo]) {
                        marked[i][j] = true;
                        newlyMarked.push([i, j]);
                        changed = true;
                        break;
                    }
                }
            }
        }

        if (newlyMarked.length > 0 || iteration <= 2) {
            steps.push({
                title: `PROPAGATION — PASS ${iteration}`,
                desc: `${newlyMarked.length} new pair(s) marked.`,
                matrix: JSON.parse(JSON.stringify(marked)),
                highlight: newlyMarked,
                phase: 'propagate',
                states
            });
        }
    }

    // STEP 4: EQUIVALENCE (FIXED USING UNION-FIND)
    const parent = {};
    states.forEach(s => parent[s] = s);

    function find(x) {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }

    function union(a, b) {
        parent[find(a)] = find(b);
    }

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (!marked[i][j]) {
                union(states[i], states[j]);
            }
        }
    }

    const groups = {};
    states.forEach(s => {
        const root = find(s);
        if (!groups[root]) groups[root] = [];
        groups[root].push(s);
    });

    const equiv = Object.values(groups);

    steps.push({
        title: 'EQUIVALENCE CLASSES',
        desc: `Found ${equiv.length} groups.`,
        matrix: JSON.parse(JSON.stringify(marked)),
        highlight: [],
        phase: 'done',
        states,
        equiv
    });

    return { steps, equiv, states };
}


// ==================== PARTITION REFINEMENT ====================
function runPartitionRefinement(d) {
    const reachable = getReachable(d);
    const states = d.states.filter(s => reachable.has(s));
    const isFinal = s => d.finals.includes(s);
    const steps = [];

    // Initial partition: {finals} vs {non-finals}
    let partition = [];
    const finals = states.filter(isFinal);
    const nonFinals = states.filter(s => !isFinal(s));
    if (finals.length) partition.push(finals);
    if (nonFinals.length) partition.push(nonFinals);

    steps.push({
        title: 'INITIAL PARTITION',
        desc: `Start with two groups: Final states {${finals.join(', ')}} and Non-final states {${nonFinals.join(', ')}}. We will refine until no more splits are needed.`,
        partition: JSON.parse(JSON.stringify(partition)),
        phase: 'init'
    });

    // Refine
    let changed = true;
    let iter = 0;
    while (changed) {
        changed = false;
        iter++;
        const newPartition = [];
        let splitDesc = [];
        for (const group of partition) {
            if (group.length === 1) { newPartition.push(group); continue; }
            // Try to split by each symbol
            let subGroups = [group];
            for (const a of d.alpha) {
                const nextSplit = [];
                for (const sg of subGroups) {
                    if (sg.length <= 1) { nextSplit.push(sg); continue; }
                    const splitMap = {};
                    for (const s of sg) {
                        const target = d.transitions[s]?.[a] || '__dead__';
                        // Find which partition class target belongs to
                        const cls = partition.findIndex(p => p.includes(target));
                        const key = cls === -1 ? 'dead' : `C${cls}`;
                        if (!splitMap[key]) splitMap[key] = [];
                        splitMap[key].push(s);
                    }
                    const subs = Object.values(splitMap);
                    if (subs.length > 1) {
                        splitDesc.push(`{${sg.join(',')}} splits on '${a}' → ${subs.map(sg => `{${sg.join(',')}}`).join(' | ')}`);
                        changed = true;
                    }
                    nextSplit.push(...subs);
                }
                subGroups = nextSplit;
            }
            newPartition.push(...subGroups);
        }
        partition = newPartition;
        steps.push({
            title: `REFINEMENT — PASS ${iter}`,
            desc: changed
                ? `Split groups by transition behavior: ${splitDesc.join('; ')}. Partition now has ${partition.length} classes.`
                : `No more splits possible. Partition is stable with ${partition.length} equivalence classes.`,
            partition: JSON.parse(JSON.stringify(partition)),
            phase: changed ? 'split' : 'stable'
        });
        if (!changed) break;
    }

    steps.push({
        title: 'STABLE PARTITION',
        desc: `Final partition has ${partition.length} groups. Each group becomes one state in the minimized DFA.`,
        partition: JSON.parse(JSON.stringify(partition)),
        phase: 'done'
    });

    // Build equiv from partition
    const equiv = partition;
    return { steps, equiv, states };
}

// ==================== BUILD MINIMIZED DFA ====================
function buildMinimizedDFA(d, equiv) {
    const stateToClass = {};
    equiv.forEach((cls, i) => cls.forEach(s => stateToClass[s] = i));
    const classNames = equiv.map((cls, i) => `M${i}`);
    const startClass = stateToClass[d.start];
    const finalClasses = new Set();
    d.finals.forEach(f => { if (stateToClass[f] !== undefined) finalClasses.add(stateToClass[f]); });
    const transitions = {};
    equiv.forEach((cls, i) => {
        transitions[classNames[i]] = {};
        d.alpha.forEach(a => {
            const target = d.transitions[cls[0]]?.[a];
            if (target && stateToClass[target] !== undefined) {
                transitions[classNames[i]][a] = classNames[stateToClass[target]];
            }
        });
    });
    return {
        states: classNames,
        alpha: d.alpha,
        start: classNames[startClass],
        finals: [...finalClasses].map(i => classNames[i]),
        transitions,
        stateLabels: equiv.map((cls, i) => ({ name: classNames[i], merged: cls }))
    };
}

// ==================== CYTOSCAPE RENDERING ====================
function cyStyle(isFinal, isStart, isHighlight, isMin) {
    const color = isHighlight ? '#f59e0b' : isMin ? '#10b981' : '#63b3ed';
    const bgColor = isHighlight ? 'rgba(245,158,11,0.18)' : isMin ? 'rgba(16,185,129,0.12)' : 'rgba(99,179,237,0.1)';
    return { color, bgColor, borderColor: color };
}

function renderCytoscape(containerId, d, highlightStates = [], isMin = false, mergedLabels = null) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    el.innerHTML = '';

    const nodes = d.states.map(s => ({
        data: {
            id: s,
            label: s,
            isFinal: d.finals.includes(s),
            isStart: s === d.start,
            merged: mergedLabels ? (mergedLabels.find(l => l.name === s)?.merged?.join(',') || s) : s,
            highlight: highlightStates.includes(s)
        }
    }));

    const edgeMap = {};
    d.states.forEach(s => {
        d.alpha.forEach(a => {
            const t = d.transitions[s]?.[a];
            if (t) {
                const key = `${s}_${t}`;
                if (!edgeMap[key]) edgeMap[key] = { from: s, to: t, labels: [] };
                edgeMap[key].labels.push(a);
            }
        });
    });

    const edges = Object.values(edgeMap).map((e, i) => ({
        data: { id: `e${i}`, source: e.from, target: e.to, label: e.labels.join(',') }
    }));

    const cy = cytoscape({
        container: el,
        elements: { nodes, edges },
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': n =>
                        n.data('highlight') ? 'rgba(245,158,11,0.2)'
                            : (isMin ? 'rgba(16,185,129,0.12)' : 'rgba(99,179,237,0.1)'),

                    'border-width': n => n.data('isFinal') ? 3 : 1.5,

                    'border-color': n =>
                        n.data('highlight') ? '#f59e0b'
                            : (isMin ? '#10b981' : '#63b3ed'),

                    'border-style': 'solid',

                    // 🔥 FIXED LABEL (NO OVERLAP)
                    'label': n => {
                        const merged = n.data('merged').split(',');

                        if (merged.length > 3) {
                            return `${n.data('label')}\n{${merged.slice(0, 2).join(',')}...}`;
                        }

                        return n.data('merged') !== n.data('label')
                            ? `${n.data('label')}\n{${n.data('merged')}}`
                            : n.data('label');
                    },

                    'color': '#e2e8f0',
                    'font-family': 'Space Mono, monospace',

                    // 🔥 FONT FIX
                    'font-size': '9px',

                    'text-valign': 'center',
                    'text-halign': 'center',

                    // 🔥 BIGGER NODE
                    'width': 55,
                    'height': 55,

                    'text-wrap': 'wrap',

                    // 🔥 LIMIT WIDTH
                    'text-max-width': '50px',

                    'shape': 'ellipse'
                }
            },
            {
                selector: 'node[?isFinal]',
                style: { 'border-width': 3, 'border-style': 'double' }
            },
            {
                selector: 'node[?isStart]',
                style: { 'border-color': '#a78bfa' }
            },
            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'line-color': 'rgba(99,179,237,0.5)',
                    'target-arrow-color': 'rgba(99,179,237,0.5)',
                    'label': 'data(label)',
                    'font-size': '10px',
                    'color': '#94a3b8',
                    'font-family': 'Space Mono, monospace',
                    'text-background-color': '#0d1420',
                    'text-background-opacity': 1,
                    'text-background-padding': '2px',
                    'width': 1.5
                }
            },
            {
                selector: 'edge[source = target]',
                style: {
                    'curve-style': 'loop',
                    'loop-direction': '-45deg',
                    'loop-sweep': '45deg'
                }
            }
        ],

        // 🔥 FIXED LAYOUT (NO OVERLAP)
        layout: {
            name: 'cose',
            padding: 30,
            animate: true,
            animationDuration: 500,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 120,
            nodeRepulsion: 8000
        },

        userZoomingEnabled: true,
        userPanningEnabled: true
    });

    // Tooltip (unchanged)
    cy.on('mouseover', 'node', e => {
        const n = e.target;
        const tip = document.getElementById('tooltip');
        tip.innerHTML = `<b>${n.data('id')}</b>
            ${n.data('isStart') ? ' ◀ Start' : ''}
            ${n.data('isFinal') ? ' ● Final' : ''}
            ${n.data('merged') !== n.data('label') ? '<br>Merged: ' + n.data('merged') : ''}`;
        tip.style.display = 'block';
    });

    cy.on('mouseout', 'node', () => {
        document.getElementById('tooltip').style.display = 'none';
    });

    cy.on('mousemove', e => {
        const tip = document.getElementById('tooltip');
        tip.style.left = (e.originalEvent.clientX + 12) + 'px';
        tip.style.top = (e.originalEvent.clientY - 10) + 'px';
    });

    return cy;
}

// ==================== ALGORITHM VISUALIZATION ====================
function renderAlgoViz(step, states) {
    const container = document.getElementById('algo-center');
    container.innerHTML = '';

    if (selectedAlgo === 'table' && step.matrix) {
        renderMatrix(container, step, states);
    } else if (selectedAlgo === 'partition' && step.partition) {
        renderPartition(container, step);
    }
    document.getElementById('algo-viz-label').textContent = step.title || '—';
}

function formatStateLabel(s) {
    const parts = s.split(',');

    if (parts.length > 4) {
        return parts.slice(0, 2).join(',') + '\n...';
    }

    return parts.join('\n');
}

function renderMatrix(container, step, states) {
    if (!states || !states.length) return;
    const n = states.length;
    const cellSize = Math.min(36, Math.floor(280 / (n + 1)));

    let html = `<div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:8px;">Lower-triangular distinguishability matrix</div>`;
    html += `<div style="display:flex;flex-direction:column;gap:2px;">`;

    // Header row
    html += `<div style="display:flex;gap:2px;">`;
    html += `<div style="width:${cellSize + 20}px;height:${cellSize}px;"></div>`;
    for (let j = 0; j < n - 1; j++) {
        html += `<div class="matrix-cell header matrix-label" style="width:${cellSize}px;height:${cellSize}px;font-size:${Math.max(8, cellSize / 3.5)}px;">${formatStateLabel(states[j])}</div>`;
    }
    html += `</div>`;

    for (let i = 1; i < n; i++) {
        html += `<div style="display:flex;gap:2px;">`;
        html += `<div class="matrix-cell header" style="width:${cellSize + 20}px;height:${cellSize}px;font-size:${Math.max(8, cellSize / 3.5)}px;">${formatStateLabel(states[i])}</div>`;
        for (let j = 0; j < i; j++) {
            const isHighlight = step.highlight?.some(h => h[0] === i && h[1] === j);
            const isMarked = step.matrix[i][j];
            let cls = isHighlight ? 'checking' : isMarked ? 'marked' : 'equiv';
            html += `<div class="matrix-cell ${cls}" style="width:${cellSize}px;height:${cellSize}px;font-size:${Math.max(7, cellSize / 4)}px;">${isMarked ? '✕' : '≡'}</div>`;
        }
        for (let j = i; j < n - 1; j++) {
            html += `<div style="width:${cellSize}px;height:${cellSize}px;"></div>`;
        }
        html += `</div>`;
    }
    html += `</div>`;

    if (step.equiv) {
        html += `<div style="margin-top:10px;">`;
        html += `<div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:6px;">Equivalence Classes:</div>`;
        step.equiv.forEach((cls, i) => {
            const isF = cls.some(s => dfa.finals.includes(s));
            html += `<span class="partition-group ${isF ? 'partition-final' : 'partition-non-final'}">{${cls.join(',')}}</span>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
}

function renderPartition(container, step) {
    let html = `<div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:10px;">Partition at this step:</div>`;
    step.partition.forEach((group, i) => {
        const isF = group.some(s => dfa.finals.includes(s));
        const cls = step.phase === 'split' ? 'partition-split' : isF ? 'partition-final' : 'partition-non-final';
        html += `<span class="partition-group ${cls}">P${i}: {${group.join(', ')}}</span>`;
    });
    html += `<div style="margin-top:12px;font-size:12px;color:var(--text);font-family:var(--sans);">${step.desc}</div>`;
    container.innerHTML = html;
}

// ==================== MAIN MINIMIZE ====================

function buildDFAFromCanvas() {
    if (!drawStates.length) return null;

    const states = drawStates.map(s => s.name);
    const start = drawStates[0]?.name;

    const finals = drawStates
        .filter(s => s.final)
        .map(s => s.name);

    const alpha = [...new Set(drawEdges.map(e => e.sym))];

    const transitions = {};

    states.forEach(s => {
        transitions[s] = {};
    });

    drawEdges.forEach(e => {

        if (!transitions[e.from]) {
            transitions[e.from] = {};
        }

        // ⚠ overwrite warning (debug)
        if (transitions[e.from][e.sym]) {
            console.warn(`Overwriting: ${e.from} --${e.sym}--> ${transitions[e.from][e.sym]} with ${e.to}`);
        }

        transitions[e.from][e.sym] = e.to;
    });

    return {
        states,
        alpha,
        start,
        finals,
        transitions
    };
}

function validateCanvasDFA(d) {
        for (let s of d.states) {
            for (let a of d.alpha) {

                if (!d.transitions[s] || d.transitions[s][a] === undefined) {
                    alert(`❌ Missing transition: δ(${s}, ${a})`);
                    return false;
                }
            }
        }
        return true;
    }

function startMinimization() {

    clearSim();

    const isRegexMode = document.getElementById('tab-regex').classList.contains('active');
    const isDrawMode = document.getElementById('tab-draw').classList.contains('active');

    let localDFA;

    if (isDrawMode) {
        localDFA = buildDFAFromCanvas();

        if (!validateCanvasDFA(localDFA)) {
            return;
        }
    }
    else if (isRegexMode && window.regexDFA) {
        localDFA = JSON.parse(JSON.stringify(window.regexDFA));
    }
    else {
        localDFA = parseDFA();
    }

    if (!localDFA || !localDFA.states.length) {
        alert("DFA not defined properly");
        return;
    }

    dfa = localDFA;

    // 🔥 ALWAYS show original DFA FIRST
    cyOrig = renderCytoscape('cy-orig', dfa, [], false);
    document.getElementById('orig-state-count').textContent = `${dfa.states.length} states`;

    let result;

    if (selectedAlgo === 'table') {
        result = runTableFilling(dfa);
    } else {
        result = runPartitionRefinement(dfa);
    }

    steps = result.steps;
    const equiv = result.equiv;

    minDfa = buildMinimizedDFA(dfa, equiv);

    window._algStates = result.states;

    currentStep = 0;
    updateStepUI();

    // enable buttons
    document.getElementById('btn-next').disabled = false;
    document.getElementById('btn-prev').disabled = false;
    document.getElementById('btn-auto').disabled = false;
    document.getElementById('btn-3d').disabled = false;

    setStatus("Minimization ready 🚀", "var(--green)");
}


function updateStepUI() {
    if (!steps.length) return;
    const step = steps[Math.min(currentStep, steps.length - 1)];
    const total = steps.length;

    document.getElementById('step-counter').textContent = `Step ${currentStep + 1} / ${total}`;
    document.getElementById('step-bar').style.width = `${((currentStep + 1) / total) * 100}%`;

    const content = document.getElementById('step-content');
    content.classList.remove('fade-in');
    void content.offsetWidth;
    content.classList.add('fade-in');
    content.innerHTML = `<div class="step-title">${step.title}</div><div class="step-desc">${step.desc}</div>`;

    renderAlgoViz(step, window._algStates);

    // Show minimized DFA on last step
    if (minDfa) {
        cyMin = renderCytoscape('cy-min', minDfa, [], true, minDfa.stateLabels);
        document.getElementById('min-state-count').textContent = `${minDfa.states.length} states`;
        showComparison();
        document.getElementById('btn-3d').disabled = false;
    }
}

function nextStep() {
    if (currentStep < steps.length - 1) {
        currentStep++;
        updateStepUI();
    }
}
function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        updateStepUI();
    }
}
function autoPlay() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; document.getElementById('btn-auto').textContent = '▶ Auto'; return; }
    document.getElementById('btn-auto').textContent = '⏹ Stop';
    autoTimer = setInterval(() => {
        if (currentStep < steps.length - 1) {
            nextStep();
        } else {
            clearInterval(autoTimer);
            autoTimer = null;
            document.getElementById('btn-auto').textContent = '▶ Auto';
        }
    }, 1200);
}

function showComparison() {
    document.getElementById('comparison-bar').style.display = 'flex';
    document.getElementById('cmp-orig').textContent = dfa.states.length;
    document.getElementById('cmp-min').textContent = minDfa.states.length;
    const pct = dfa.states.length > 0 ? Math.round((1 - minDfa.states.length / dfa.states.length) * 100) : 0;
    document.getElementById('cmp-pct').textContent = `${pct}% reduction`;

    // Show equiv classes
    let html = 'Merged: ';
    minDfa.stateLabels.forEach(l => {
        if (l.merged.length > 1) html += `{${l.merged.join(', ')}} → ${l.name}  `;
    });
    if (html === 'Merged: ') html += 'No states merged (already minimal)';
    document.getElementById('equiv-info').textContent = html;
}

function setStatus(msg, color = 'var(--muted)') {
    const el = document.getElementById('status-text');
    el.textContent = msg;
    el.style.color = color;
}

// ==================== STRING SIMULATOR ====================
function runSim() {
    const str = document.getElementById('sim-input').value.trim();
    const container = document.getElementById('sim-results');
    if (!dfa.start) { container.innerHTML = '<div class="warning-item warning-warn">⚠ Define and minimize a DFA first.</div>'; return; }

    // const simulateDFA = (d, s) => {
    //     let state = d.start;
    //     const path = [state];
    //     for (const ch of s) {
    //         if (!d.transitions[state]) return { accepted: false, path, error: `No transitions from ${state}` };
    //         state = d.transitions[state][ch];
    //         if (!state) return { accepted: false, path, error: `No transition on '${ch}'` };
    //         path.push(state);
    //     }
    //     return { accepted: d.finals.includes(state), path };
    // };


    const simulateDFA = (d, s) => {
        let state = d.start;
        const path = [state];

        for (let i = 0; i < s.length; i++) {
            const ch = s[i].trim();

            // invalid symbol
            if (!d.alpha.includes(ch)) {
                return {
                    accepted: false,
                    path,
                    error: `Invalid symbol '${ch}'`
                };
            }

            // missing transition
            if (!d.transitions[state] || !d.transitions[state][ch]) {
                return {
                    accepted: false,
                    path,
                    error: `No transition from ${state} on '${ch}'`
                };
            }

            state = d.transitions[state][ch];
            path.push(state);
        }

        return {
            accepted: d.finals.includes(state),
            path
        };
    };


    const origResult = simulateDFA(dfa, str);
    const minResult = minDfa ? simulateDFA(minDfa, str) : null;

    let html = '<div style="display:flex;gap:24px;flex-wrap:wrap;">';

    const renderSim = (label, d, res, color) => {
        let h = `<div><div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:6px;">${label}</div>`;
        h += `<div class="sim-track">`;
        [...str].forEach((ch, i) => {
            const visited = i < res.path.length - 1;
            const active = i === res.path.length - 2;
            h += `<div class="sim-char ${active ? 'active' : visited ? 'visited' : ''}">${ch}</div>`;
        });
        if (str.length === 0) h += `<div class="sim-char" style="opacity:0.3">ε</div>`;
        h += '</div>';
        h += `<div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:6px;">Path: ${res.path.join(' → ')}</div>`;
        h += `<div class="sim-result ${res.accepted ? 'sim-accept' : 'sim-reject'}">
    ${res.error ? res.error + '<br>' : ''}
    ${res.accepted ? '✓ ACCEPTED' : '✕ REJECTED'}
        </div>`;
        h += `</div>`;
        return h;
    };

    html += renderSim('ORIGINAL DFA', dfa, origResult, '#63b3ed');
    if (minResult) html += renderSim('MINIMIZED DFA', minDfa, minResult, '#10b981');
    html += '</div>';
    container.innerHTML = html;
}
function resetSim() { document.getElementById('sim-results').innerHTML = ''; document.getElementById('sim-input').value = ''; }
function clearSim() { resetSim(); }

// ==================== 3D VIEW ====================
function toggle3D() {
    if (!minDfa) return;
    is3D = !is3D;
    const cont = document.getElementById('three-canvas-container');
    if (is3D) {
        cont.classList.add('active');
        init3D(minDfa);
        document.getElementById('btn-3d').textContent = '✕ Close 3D';
        cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        cont.classList.remove('active');
        document.getElementById('btn-3d').textContent = '◈ 3D View';
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    }
}

function init3D(d) {
    const canvas = document.getElementById('threeCanvas');
    if (threeRenderer) { threeRenderer.dispose(); threeRenderer = null; }
    const W = canvas.parentElement.clientWidth || 800;
    const H = 380;

    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    threeCamera.position.set(0, 0, 10);

    threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    threeRenderer.setSize(W, H);
    threeRenderer.setClearColor(0x080c14, 1);

    // Lighting
    threeScene.add(new THREE.AmbientLight(0x334466, 0.8));
    const dirLight = new THREE.DirectionalLight(0x63b3ed, 0.6);
    dirLight.position.set(5, 5, 5);
    threeScene.add(dirLight);
    const ptLight = new THREE.PointLight(0xa78bfa, 0.8, 20);
    ptLight.position.set(-3, 3, 5);
    threeScene.add(ptLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x1a2744, 0x0d1a30);
    gridHelper.position.y = -4;
    threeScene.add(gridHelper);

    const n = d.states.length;
    const positions = {};
    const R = Math.max(3, n * 0.8);
    d.states.forEach((s, i) => {
        const angle = (i / n) * Math.PI * 2;
        positions[s] = new THREE.Vector3(Math.cos(angle) * R, Math.sin(angle) * R * 0.5, 0);
    });

    // Nodes
    const nodeObjects = {};
    d.states.forEach(s => {
        const isFinal = d.finals.includes(s);
        const isStart = s === d.start;
        const color = isStart ? 0xa78bfa : isFinal ? 0x10b981 : 0x63b3ed;
        const geo = new THREE.SphereGeometry(isFinal ? 0.6 : 0.5, 32, 32);
        const mat = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9,
            shininess: 80
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(positions[s]);
        threeScene.add(mesh);
        nodeObjects[s] = mesh;

        // Ring for final states
        if (isFinal) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.75, 0.05, 8, 32),
                new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.5 })
            );
            ring.position.copy(positions[s]);
            threeScene.add(ring);
        }
    });

    // Edges
    const edgeMap = {};
    d.states.forEach(s => {
        d.alpha.forEach(a => {
            const t = d.transitions[s]?.[a];
            if (!t) return;
            const key = `${s}_${t}`;
            if (!edgeMap[key]) edgeMap[key] = { from: s, to: t, labels: [] };
            edgeMap[key].labels.push(a);
        });
    });

    Object.values(edgeMap).forEach(e => {
        const p1 = positions[e.from].clone();
        const p2 = positions[e.to].clone();
        const isSelf = e.from === e.to;

        if (isSelf) {
            const pts = [];
            for (let i = 0; i <= 32; i++) {
                const a = (i / 32) * Math.PI * 2;
                pts.push(new THREE.Vector3(p1.x + Math.cos(a) * 0.8, p1.y + Math.sin(a) * 0.8 + 0.5, p1.z));
            }
            const curve = new THREE.CatmullRomCurve3(pts);
            const geo = new THREE.TubeGeometry(curve, 32, 0.03, 6, true);
            threeScene.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x4a6fa5, transparent: true, opacity: 0.7 })));
        } else {
            const mid = p1.clone().add(p2).multiplyScalar(0.5);
            mid.z += 1;
            const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
            const geo = new THREE.TubeGeometry(curve, 20, 0.04, 6, false);
            threeScene.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x3a6a9c, transparent: true, opacity: 0.7 })));

            // Arrow cone
            const dir = p2.clone().sub(p1).normalize();
            const coneGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
            const coneMat = new THREE.MeshPhongMaterial({ color: 0x63b3ed });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            const arrowPos = p2.clone().sub(dir.clone().multiplyScalar(0.6));
            cone.position.copy(arrowPos);
            cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            threeScene.add(cone);
        }
    });

    // Animate
    let t = 0;
    function animate() {
        animFrame = requestAnimationFrame(animate);
        t += 0.008;
        threeScene.rotation.y = Math.sin(t) * 0.4;
        threeScene.rotation.x = Math.sin(t * 0.5) * 0.1;
        // Pulse nodes
        d.states.forEach(s => {
            const m = nodeObjects[s];
            const scale = 1 + 0.05 * Math.sin(t * 2 + d.states.indexOf(s));
            m.scale.setScalar(scale);
            m.material.emissiveIntensity = 0.2 + 0.2 * Math.sin(t + d.states.indexOf(s));
        });
        threeRenderer.render(threeScene, threeCamera);
    }
    animate();
}

// ==================== EXPORT ====================
function exportPNG() {
    const canvas = document.getElementById('cy-min').querySelector('canvas');
    if (!canvas && !cyMin) { alert('Please minimize DFA first.'); return; }
    if (cyMin) {
        const png = cyMin.png({ output: 'blob', bg: '#0d1420', scale: 2 });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(png);
        a.download = 'minimized-dfa.png';
        a.click();
    }
}
function exportJSON() {
    if (!minDfa) { alert('Please minimize DFA first.'); return; }
    const data = { original: dfa, minimized: minDfa };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dfa-minimized.json';
    a.click();
}
function exportOrigJSON() {
    const blob = new Blob([JSON.stringify(dfa, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dfa-original.json';
    a.click();
}

// ==================== CANVAS DRAW ====================
function initDrawCanvas() {
    const canvas = document.getElementById('draw-canvas');
    drawCtx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 800;
    canvas.style.width = '100%';
    redrawCanvas();

    canvas.onclick = e => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        handleCanvasClick(x, y);
    };
}
function setDrawTool(t) {
    drawTool = t; drawSrc = null;
    document.querySelectorAll('.draw-tool').forEach(b => b.classList.remove('active'));
    document.getElementById(`dt-${t}`)?.classList.add('active');
}
function handleCanvasClick(x, y) {
    const hitState = drawStates.find(s => Math.hypot(s.x - x, s.y - y) < 24);
    if (drawTool === 'state') {
        const name = `q${drawStates.length}`;
        drawStates.push({ x, y, name, final: false });
        redrawCanvas();
    } else if (drawTool === 'final') {
        if (hitState) { hitState.final = !hitState.final; redrawCanvas(); }
        else {
            const name = `q${drawStates.length}`;
            drawStates.push({ x, y, name, final: true });
            redrawCanvas();
        }
    } else if (drawTool === 'edge') {
        if (!hitState) return;
        if (!drawSrc) { drawSrc = hitState; return; }
        const sym = prompt(`Transition symbol from ${drawSrc.name} to ${hitState.name}:`, dfa.alpha[0] || '0');
        if (sym) drawEdges.push({ from: drawSrc.name, to: hitState.name, sym });
        drawSrc = null;
        redrawCanvas();
    } else if (drawTool === 'delete') {
        if (hitState) {
            drawStates = drawStates.filter(s => s !== hitState);
            drawEdges = drawEdges.filter(e => e.from !== hitState.name && e.to !== hitState.name);
            redrawCanvas();
        }
    }
}
function redrawCanvas() {
    if (!drawCtx) return;
    const c = drawCtx;
    const canvas = document.getElementById('draw-canvas');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#080c14';
    c.fillRect(0, 0, canvas.width, canvas.height);

    // Edges
    drawEdges.forEach(e => {
        const from = drawStates.find(s => s.name === e.from);
        const to = drawStates.find(s => s.name === e.to);
        if (!from || !to) return;
        c.beginPath();
        c.strokeStyle = 'rgba(99,179,237,0.6)';
        c.lineWidth = 1.5;
        if (from === to) {
            const loopX = from.x;
            const loopY = from.y - 30;

            // draw loop
            c.arc(loopX, loopY, 15, 0, Math.PI * 2);

            // 🔥 LABEL FIX
            c.fillStyle = '#94a3b8';
            c.font = '11px Space Mono, monospace';
            c.textAlign = 'center';

            c.fillText(e.sym, loopX, loopY - 20);
        } else {
            // 🔥 CURVE FIX
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // midpoint
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;

            // perpendicular offset
            const offset = 40;

            const cx = mx - (dy / dist) * offset;
            const cy = my + (dx / dist) * offset;

            c.moveTo(from.x, from.y);
            c.quadraticCurveTo(cx, cy, to.x, to.y);

            // save for label later
            e._curve = { cx, cy };
        }
        c.stroke();
        // Arrow
        if (from !== to) {
            // 🔥 CURVE BASED ARROW FIX

            let angle, ex, ey;

            if (e._curve) {
                // curve ke end ka tangent use karenge
                const t = 0.9; // near end point

                const x1 = from.x;
                const y1 = from.y;
                const cx = e._curve.cx;
                const cy = e._curve.cy;
                const x2 = to.x;
                const y2 = to.y;

                // derivative of quadratic bezier
                const dx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx);
                const dy = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy);

                angle = Math.atan2(dy, dx);

                // arrow position थोड़ा पीछे
                ex = x2 - Math.cos(angle) * 26;
                ey = y2 - Math.sin(angle) * 26;

            } else {
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                angle = Math.atan2(dy, dx);

                ex = to.x - dx / len * 26;
                ey = to.y - dy / len * 26;
            }
            c.beginPath();
            c.moveTo(ex, ey);
            c.lineTo(ex - 10 * Math.cos(angle - 0.4), ey - 10 * Math.sin(angle - 0.4));
            c.moveTo(ex, ey);
            c.lineTo(ex - 10 * Math.cos(angle + 0.4), ey - 10 * Math.sin(angle + 0.4));
            c.strokeStyle = 'rgba(99,179,237,0.8)';
            c.stroke();
            // Label

            c.fillStyle = '#94a3b8';
            c.font = '11px Space Mono, monospace';
            let lx, ly;

            if (e._curve) {
                lx = e._curve.cx;
                ly = e._curve.cy;
            } else {
                lx = (from.x + to.x) / 2;
                ly = (from.y + to.y) / 2;
            }

            c.fillText(e.sym, lx + 5, ly - 5);
        }
    });

    // Nodes
    drawStates.forEach((s, i) => {
        c.beginPath();
        c.arc(s.x, s.y, 22, 0, Math.PI * 2);
        c.fillStyle = s.final ? 'rgba(16,185,129,0.15)' : 'rgba(99,179,237,0.1)';
        c.fill();
        c.strokeStyle = s.final ? '#10b981' : '#63b3ed';
        c.lineWidth = s === drawSrc ? 2.5 : 1.5;
        c.stroke();
        if (s.final) {
            c.beginPath();
            c.arc(s.x, s.y, 18, 0, Math.PI * 2);
            c.strokeStyle = '#10b981';
            c.lineWidth = 1;
            c.stroke();
        }
        if (i === 0) {
            c.beginPath();
            c.moveTo(s.x - 36, s.y);
            c.lineTo(s.x - 22, s.y);
            c.strokeStyle = '#a78bfa';
            c.lineWidth = 1.5;
            c.stroke();
            c.fillStyle = '#a78bfa';
            c.beginPath();
            c.moveTo(s.x - 22, s.y);
            c.lineTo(s.x - 30, s.y - 5);
            c.lineTo(s.x - 30, s.y + 5);
            c.fill();
        }
        c.fillStyle = '#e2e8f0';
        c.font = '11px Space Mono, monospace';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(s.name, s.x, s.y);
    });
}
function clearCanvas() { drawStates = []; drawEdges = []; redrawCanvas(); }
function buildFromCanvas() {
    if (!drawStates.length) return;
    document.getElementById('inp-states').value = drawStates.map(s => s.name).join(',');
    document.getElementById('inp-start').value = drawStates[0]?.name || '';
    document.getElementById('inp-final').value = drawStates.filter(s => s.final).map(s => s.name).join(',');
    const allSyms = [...new Set(drawEdges.map(e => e.sym))];
    document.getElementById('inp-alpha').value = allSyms.join(',') || '0,1';
    switchMode('table');
    buildTable();
    setTimeout(() => {
        drawEdges.forEach(e => {
            const inp = document.getElementById(`tr_${e.from}_${e.sym}`);
            if (inp) inp.value = e.to;
        });
    }, 100);
}

// ==================== INIT ====================
window.onload = () => {
    switchMode('table');
    buildTable();
    loadPreset('basic');
};




function convertRegex() {
    const regex = document.getElementById('regex-input').value.trim();
    if (!regex) return alert("Enter regex");

    const withConcat = addConcat(regex);
    const postfix = regexToPostfix(withConcat);
    const nfa = postfixToNFA(postfix);
    let dfaBuilt = nfaToDFA(nfa);

    // clean DFA
    dfaBuilt = removeUnreachable(dfaBuilt);

    window.regexDFA = dfaBuilt;

    // show algorithm section
    document.getElementById('algo-section').style.display = 'block';

    setStatus("Regex ready → Click Minimize", "var(--green)");
}






function nfaToDFA(nfa) {

    const dfaStates = [];
    const dfaTrans = {};
    const queue = [];

    // 🔹 epsilon closure
    function epsilonClosure(states) {
        const stack = [...states];
        const closure = new Set(states);

        while (stack.length) {
            const state = stack.pop();

            const eps = nfa.transitions[state]?.['ε'] || [];

            eps.forEach(n => {
                if (!closure.has(n)) {
                    closure.add(n);
                    stack.push(n);
                }
            });
        }

        return closure;
    }

    // 🔹 start state
    const startClosure = epsilonClosure([nfa.start]);
    let startState = [...startClosure].sort().join(',');
    if (!startState) startState = 'DEAD';

    queue.push(startState);
    dfaStates.push(startState);

    // 🔹 build DFA
    while (queue.length > 0) {

        const current = queue.shift();
        const currentSet = current === 'DEAD' ? [] : current.split(',');

        dfaTrans[current] = {};

        for (const sym of nfa.alpha) {

            let moveSet = new Set();

            currentSet.forEach(s => {
                const next = nfa.transitions[s]?.[sym] || [];
                next.forEach(n => moveSet.add(n));
            });

            const closure = epsilonClosure([...moveSet]);
            let newState = [...closure].sort().join(',');

            // 🔥 DEAD fix
            if (!newState) newState = 'DEAD';

            if (!dfaStates.includes(newState)) {
                dfaStates.push(newState);
                queue.push(newState);
            }

            dfaTrans[current][sym] = newState;
        }
    }

    // 🔥 DEAD loop
    if (dfaStates.includes('DEAD')) {
        dfaTrans['DEAD'] = {};
        nfa.alpha.forEach(sym => {
            dfaTrans['DEAD'][sym] = 'DEAD';
        });
    }

    // 🔹 final states
    const dfaFinals = dfaStates.filter(st =>
        st !== 'DEAD' &&
        st.split(',').some(s => nfa.finals.includes(s))
    );

    return {
        states: dfaStates,
        alpha: nfa.alpha,
        start: startState,
        finals: dfaFinals,
        transitions: dfaTrans
    };
}



function regexToPostfix(regex) {
    const output = [];
    const stack = [];

    const precedence = {
        '*': 3,
        '.': 2,
        '|': 1
    };

    for (let i = 0; i < regex.length; i++) {
        const c = regex[i];

        if (c === '0' || c === '1') {
            output.push(c);
        }

        else if (c === '(') {
            stack.push(c);
        }

        else if (c === ')') {
            while (stack.length && stack[stack.length - 1] !== '(') {
                output.push(stack.pop());
            }
            stack.pop(); // remove '('
        }

        else if (c === '*' || c === '.' || c === '|') {
            while (
                stack.length &&
                precedence[stack[stack.length - 1]] >= precedence[c]
            ) {
                output.push(stack.pop());
            }
            stack.push(c);
        }
    }

    while (stack.length) {
        output.push(stack.pop());
    }

    return output.join('');
}



function postfixToNFA(postfix) {
    let stack = [];
    let count = 0;

    function newState() { return 'q' + count++; }

    function basic(sym) {
        let s = newState(), e = newState();
        return {
            start: s,
            end: e,
            trans: { [s]: { [sym]: [e] } }
        };
    }

    function mergeTrans(t1, t2) {
        const res = JSON.parse(JSON.stringify(t1));

        Object.keys(t2).forEach(state => {
            if (!res[state]) res[state] = {};

            Object.keys(t2[state]).forEach(sym => {
                if (!res[state][sym]) res[state][sym] = [];
                res[state][sym].push(...t2[state][sym]);
            });
        });

        return res;
    }

    function concat(a, b) {
        a.trans[a.end] = a.trans[a.end] || {};
        a.trans[a.end]['ε'] = a.trans[a.end]['ε'] || [];
        a.trans[a.end]['ε'].push(b.start);

        return {
            start: a.start,
            end: b.end,
            trans: mergeTrans(a.trans, b.trans)
        };
    }

    function union(a, b) {
        let s = newState(), e = newState();

        return {
            start: s,
            end: e,
            trans: mergeTrans(
                {
                    [s]: { 'ε': [a.start, b.start] },
                    [a.end]: { 'ε': [e] },
                    [b.end]: { 'ε': [e] }
                },
                mergeTrans(a.trans, b.trans)
            )
        };
    }

    function star(a) {
        let s = newState(), e = newState();

        return {
            start: s,
            end: e,
            trans: mergeTrans(
                {
                    [s]: { 'ε': [a.start, e] },
                    [a.end]: { 'ε': [a.start, e] }
                },
                a.trans
            )
        };
    }

    for (let c of postfix) {
        if (/[01]/.test(c)) {
            stack.push(basic(c));
        } else if (c === '.') {
            let b = stack.pop(), a = stack.pop();
            stack.push(concat(a, b));
        } else if (c === '|') {
            let b = stack.pop(), a = stack.pop();
            stack.push(union(a, b));
        } else if (c === '*') {
            let a = stack.pop();
            stack.push(star(a));
        }
    }

    let res = stack[0];

    return {
        states: Object.keys(res.trans),
        alpha: ['0', '1'],
        start: res.start,
        finals: [res.end],
        transitions: res.trans
    };
}

function addConcat(regex) {
    let result = "";

    for (let i = 0; i < regex.length; i++) {
        const c1 = regex[i];
        const c2 = regex[i + 1];

        result += c1;

        if (
            c1 && c2 &&
            (c1 === '0' || c1 === '1' || c1 === ')' || c1 === '*') &&
            (c2 === '0' || c2 === '1' || c2 === '(')
        ) {
            result += '.';
        }
    }

    return result;
}

function startApp() {
    document.getElementById('home-page').style.display = 'none';
    document.querySelector('.app').style.display = 'block';
}