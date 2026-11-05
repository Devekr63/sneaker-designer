import { useReducer } from 'react'
import type { Design } from '../domain/types'

const MAX_HISTORY = 100
/** Edits with the same key inside this window merge into one undo step (dragging a handle or color picker). */
const COALESCE_MS = 800

interface State {
  past: Design[]
  present: Design
  future: Design[]
  lastKey: string | null
  lastAt: number
}

type Action =
  | { type: 'edit'; recipe: (d: Design) => Design; key: string | null; at: number }
  | { type: 'rename'; name: string }
  | { type: 'load'; design: Design }
  | { type: 'undo' }
  | { type: 'redo' }

function commit(state: State, next: Design, key: string | null, at: number): State {
  if (next === state.present) return state
  const merge = key !== null && key === state.lastKey && at - state.lastAt < COALESCE_MS
  return {
    past: merge ? state.past : [...state.past, state.present].slice(-MAX_HISTORY),
    present: { ...next, updatedAt: new Date().toISOString() },
    future: [],
    lastKey: key,
    lastAt: at,
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'edit':
      return commit(state, action.recipe(state.present), action.key, action.at)
    case 'rename':
      // Renames don't create undo steps; they'd drown out real design changes.
      return { ...state, present: { ...state.present, name: action.name } }
    case 'load':
      return commit(state, action.design, null, 0)
    case 'undo': {
      if (!state.past.length) return state
      const prev = state.past[state.past.length - 1]
      return { past: state.past.slice(0, -1), present: prev, future: [state.present, ...state.future], lastKey: null, lastAt: 0 }
    }
    case 'redo': {
      if (!state.future.length) return state
      const [next, ...rest] = state.future
      return { past: [...state.past, state.present], present: next, future: rest, lastKey: null, lastAt: 0 }
    }
  }
}

export function useDesignHistory(initial: () => Design) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    past: [],
    present: initial(),
    future: [],
    lastKey: null,
    lastAt: 0,
  }))

  return {
    design: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    /** Applies a pure update. Pass a `key` to merge rapid repeats (drags) into one undo step. */
    edit: (recipe: (d: Design) => Design, key: string | null = null) =>
      dispatch({ type: 'edit', recipe, key, at: Date.now() }),
    rename: (name: string) => dispatch({ type: 'rename', name }),
    load: (design: Design) => dispatch({ type: 'load', design }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
  }
}
