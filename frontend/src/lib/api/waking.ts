// Tiny external store tracking requests that are retrying because the API is cold-starting
// (Render's free tier sleeps after inactivity and takes ~30-60s to wake up).
type Listener = () => void;

let waking = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export const wakingStore = {
  begin() {
    waking += 1;
    if (waking === 1) emit();
  },
  end() {
    waking = Math.max(0, waking - 1);
    if (waking === 0) emit();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return waking > 0;
  },
  getServerSnapshot() {
    return false;
  },
};
