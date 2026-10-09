import { type Grid, POPCOUNT, UNITS, bit, firstDigit } from '../grid';
import { RATING } from '../rating';
import { type Step, makeStep } from '../step';

function hiddenSingleIn(g: Grid, unitFrom: number, unitTo: number, rating: number): Step | null {
  for (let u = unitFrom; u < unitTo; u++) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      let pos = -1;
      let n = 0;
      for (const c of UNITS[u]) {
        if (g.digits[c] === d) {
          n = 2; // already placed
          break;
        }
        if (g.cands[c] & b) {
          pos = c;
          n++;
        }
      }
      if (n === 1) {
        return makeStep('hidden-single', rating, {
          placements: [{ cell: pos, digit: d }],
          cells: [pos],
          units: [u],
          marks: [{ cell: pos, digit: d, role: 'key' }],
        });
      }
    }
  }
  return null;
}

export const hiddenSingleBox = (g: Grid): Step | null =>
  hiddenSingleIn(g, 18, 27, RATING.hiddenSingleBox);

export const hiddenSingleLine = (g: Grid): Step | null =>
  hiddenSingleIn(g, 0, 18, RATING.hiddenSingleLine);

export function nakedSingle(g: Grid): Step | null {
  for (let c = 0; c < 81; c++) {
    if (g.digits[c] || POPCOUNT[g.cands[c]] !== 1) continue;
    const d = firstDigit(g.cands[c]);
    return makeStep('naked-single', RATING.nakedSingle, {
      placements: [{ cell: c, digit: d }],
      cells: [c],
      marks: [{ cell: c, digit: d, role: 'key' }],
    });
  }
  return null;
}
