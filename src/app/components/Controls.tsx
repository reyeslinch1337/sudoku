import { digitCounts } from '../../game/check';
import type { Store } from '../store';
import { IconAuto, IconCheck, IconErase, IconHint, IconPencil, IconRedo, IconUndo } from './Icons';

function Tool(props: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: preact.ComponentChildren;
}) {
  return (
    <button
      type="button"
      class={props.active ? 'tool active' : 'tool'}
      aria-label={props.label}
      aria-pressed={props.active === undefined ? undefined : props.active}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
      <span class="tool-label">{props.label}</span>
    </button>
  );
}

export function Toolbar({ store }: { store: Store }) {
  const t = store.t.value;
  const g = store.game.value;
  return (
    <div class="toolbar">
      <Tool
        label={t.undo}
        disabled={!g.past.length}
        onClick={() => store.dispatch({ type: 'undo' })}
      >
        <IconUndo />
      </Tool>
      <Tool
        label={t.redo}
        disabled={!g.future.length}
        onClick={() => store.dispatch({ type: 'redo' })}
      >
        <IconRedo />
      </Tool>
      <Tool label={t.erase} onClick={store.erase}>
        <IconErase />
      </Tool>
      <Tool
        label={t.notes}
        active={store.noteMode.value}
        onClick={() => (store.noteMode.value = !store.noteMode.value)}
      >
        <IconPencil />
      </Tool>
      <Tool
        label={t.auto}
        active={g.autoCandidates}
        onClick={() => store.dispatch({ type: 'toggleAuto' })}
      >
        <IconAuto />
      </Tool>
      <Tool label={t.check} onClick={store.check}>
        <IconCheck />
      </Tool>
      <Tool
        label={t.hint}
        active={store.hint.value.level > 0}
        onClick={() => void store.pressHint()}
      >
        <IconHint />
      </Tool>
    </div>
  );
}

export function NumPad({ store }: { store: Store }) {
  const counts = digitCounts(store.game.value.values);
  const notes = store.noteMode.value;
  return (
    <div class={notes ? 'numpad notes-mode' : 'numpad'}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
        const left = 9 - counts[d];
        return (
          <button
            type="button"
            key={d}
            class={left <= 0 ? 'num done' : 'num'}
            aria-label={String(d)}
            onClick={() => store.inputDigit(d)}
          >
            <span class="num-digit">{d}</span>
            <span class="num-left">{left > 0 ? left : ''}</span>
          </button>
        );
      })}
    </div>
  );
}
