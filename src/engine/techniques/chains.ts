// Alternating inference chains. X-Chain, XY-Chain, Skyscraper and 2-String Kite are special
// cases found by restricting which links the search may use.

import { type Grid, CELL_UNITS, POPCOUNT, UNITS, bit, colOf, digitsOf, rowOf, sees } from '../grid';
import { RATING, chainRating } from '../rating';
import { type Cand, type Link, type Mark, type Step, type TechniqueId, makeStep } from '../step';

const node = (cell: number, d: number) => cell * 9 + d - 1;
const cellOf = (n: number) => (n / 9) | 0;
const digitOf = (n: number) => (n % 9) + 1;

type Mode = 'x' | 'xy' | 'full';

interface Graph {
  nodes: number[];
  strong: number[][]; // indexed by node id
  weak: number[][];
}

/** Strong and weak links between candidates of the current grid. */
export function buildGraph(g: Grid): Graph {
  const nodes: number[] = [];
  const strong: number[][] = Array.from({ length: 729 }, () => []);
  const weak: number[][] = Array.from({ length: 729 }, () => []);
  for (let c = 0; c < 81; c++) for (const d of digitsOf(g.cands[c])) nodes.push(node(c, d));
  const addStrong = (a: number, b: number) => {
    if (!strong[a].includes(b)) strong[a].push(b);
    if (!strong[b].includes(a)) strong[b].push(a);
  };
  for (let c = 0; c < 81; c++) {
    if (POPCOUNT[g.cands[c]] === 2) {
      const [x, y] = digitsOf(g.cands[c]);
      addStrong(node(c, x), node(c, y));
    }
  }
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const ps = unit.filter((c) => g.cands[c] & bit(d));
      if (ps.length === 2) addStrong(node(ps[0], d), node(ps[1], d));
    }
  }
  for (const n of nodes) {
    const c = cellOf(n);
    const d = digitOf(n);
    for (const e of digitsOf(g.cands[c])) if (e !== d) weak[n].push(node(c, e));
    for (const u of CELL_UNITS[c]) {
      for (const p of UNITS[u]) {
        if (p === c || !(g.cands[p] & bit(d))) continue;
        const m = node(p, d);
        if (!weak[n].includes(m)) weak[n].push(m);
      }
    }
  }
  return { nodes, strong, weak };
}

const weakLinked = (a: number, b: number): boolean => {
  if (a === b) return false;
  const ca = cellOf(a);
  const cb = cellOf(b);
  if (ca === cb) return true;
  return digitOf(a) === digitOf(b) && sees(ca, cb);
};

function allowed(g: Grid, mode: Mode, from: number, to: number, isStrong: boolean): boolean {
  const sameCell = cellOf(from) === cellOf(to);
  if (mode === 'x') return !sameCell && digitOf(from) === digitOf(to);
  if (mode === 'xy') {
    if (isStrong) return sameCell && POPCOUNT[g.cands[cellOf(from)]] === 2;
    return !sameCell;
  }
  return true;
}

interface Chain {
  nodes: number[];
  elims: Cand[];
}

function eliminationsFor(graph: Graph, start: number, end: number): Cand[] {
  const out: Cand[] = [];
  for (const c of graph.weak[start]) {
    if (c !== end && weakLinked(c, end)) out.push({ cell: cellOf(c), digit: digitOf(c) });
  }
  return out;
}

/** Shortest productive chain from one start node, or null. Explores at most maxLinks links. */
function searchFrom(
  g: Grid,
  graph: Graph,
  start: number,
  mode: Mode,
  maxLinks: number,
): Chain | null {
  // State: node * 2 + p, where p = 1 means the node was reached by a strong link.
  const parent = new Int32Array(729 * 2).fill(-1);
  const startState = start * 2;
  parent[startState] = startState;
  let frontier = [startState];
  for (let depth = 1; depth <= maxLinks && frontier.length; depth++) {
    const next: number[] = [];
    for (const s of frontier) {
      const n = s >> 1;
      const viaStrong = (s & 1) === 1;
      const edges = viaStrong ? graph.weak[n] : graph.strong[n];
      for (const m of edges) {
        if (!allowed(g, mode, n, m, !viaStrong)) continue;
        const t = m * 2 + (viaStrong ? 0 : 1);
        if (parent[t] !== -1) continue;
        parent[t] = s;
        next.push(t);
        if (!viaStrong && m !== start) {
          const elims = eliminationsFor(graph, start, m);
          if (elims.length) {
            const nodes: number[] = [];
            for (let x = t; ; x = parent[x]) {
              nodes.push(x >> 1);
              if (x === startState) break;
            }
            return { nodes: nodes.reverse(), elims };
          }
        }
      }
    }
    frontier = next;
  }
  return null;
}

function lineKind(a: number, b: number): 'row' | 'col' | 'box' {
  if (rowOf(a) === rowOf(b)) return 'row';
  if (colOf(a) === colOf(b)) return 'col';
  return 'box';
}

function classify(mode: Mode, nodes: number[]): TechniqueId {
  if (mode === 'xy') return 'xy-chain';
  if (mode === 'full') return 'aic';
  if (nodes.length === 4) {
    const [a, b, c, d] = nodes.map(cellOf);
    const s1 = lineKind(a, b);
    const s2 = lineKind(c, d);
    const w = lineKind(b, c);
    if (s1 === s2 && s1 !== 'box' && w !== 'box' && w !== s1) return 'skyscraper';
    if (s1 !== s2 && s1 !== 'box' && s2 !== 'box' && w === 'box') return 'two-string-kite';
  }
  return 'x-chain';
}

function ratingOf(id: TechniqueId, links: number): number {
  switch (id) {
    case 'skyscraper':
      return RATING.skyscraper;
    case 'two-string-kite':
      return RATING.twoStringKite;
    case 'x-chain':
      return chainRating(RATING.xChain, links, RATING.chainMax);
    case 'xy-chain':
      return chainRating(RATING.xyChain, links, RATING.chainMax);
    default:
      return chainRating(RATING.aic, links, RATING.chainMax);
  }
}

function toStep(mode: Mode, chain: Chain): Step {
  const links = chain.nodes.length - 1;
  const id = classify(mode, chain.nodes);
  const marks: Mark[] = chain.nodes.map((n, k) => ({
    cell: cellOf(n),
    digit: digitOf(n),
    role: k % 2 === 0 ? 'off' : 'on',
  }));
  const linkList: Link[] = [];
  for (let k = 0; k < links; k++) {
    const a = chain.nodes[k];
    const b = chain.nodes[k + 1];
    linkList.push({
      from: { cell: cellOf(a), digit: digitOf(a) },
      to: { cell: cellOf(b), digit: digitOf(b) },
      strong: k % 2 === 0,
    });
  }
  return makeStep(id, ratingOf(id, links), {
    eliminations: chain.elims,
    cells: [...new Set(chain.nodes.map(cellOf))],
    marks,
    links: linkList,
  });
}

/** Lowest rated chain of the given mode, or null. */
function bestChain(g: Grid, graph: Graph, mode: Mode, maxLinks: number): Step | null {
  let best: Step | null = null;
  for (const start of graph.nodes) {
    if (!graph.strong[start].length) continue;
    // Within one mode a longer chain never rates lower, so later searches can stop earlier.
    const limit = best ? best.links.length : maxLinks;
    const chain = searchFrom(g, graph, start, mode, limit);
    if (!chain) continue;
    const step = toStep(mode, chain);
    if (!best || step.rating < best.rating || step.links.length < best.links.length) best = step;
  }
  return best;
}

export const MAX_CHAIN_LINKS = 15;

/** The lowest rated X-Chain, XY-Chain or AIC available. */
export function chains(g: Grid): Step | null {
  const graph = buildGraph(g);
  let best: Step | null = null;
  for (const mode of ['x', 'xy', 'full'] as const) {
    const s = bestChain(g, graph, mode, MAX_CHAIN_LINKS);
    if (s && (!best || s.rating < best.rating)) best = s;
  }
  return best;
}
