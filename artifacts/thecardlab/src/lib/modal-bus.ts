type ModalKey = "pricing" | "install";

const listeners = new Map<ModalKey, Set<() => void>>();

export function openModal(key: ModalKey) {
  listeners.get(key)?.forEach((fn) => fn());
}

export function onOpenModal(key: ModalKey, fn: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(fn);
  return () => {
    listeners.get(key)?.delete(fn);
  };
}
