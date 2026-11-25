const f = new Map();
export const documentDirectory = "mem://";
export const makeDirectoryAsync = async () => {};
export const writeAsStringAsync = async (p, s) => { f.set(p, s); };
export const readAsStringAsync = async (p) => { if (!f.has(p)) throw new Error("ENOENT"); return f.get(p); };
export const deleteAsync = async (p) => { for (const k of [...f.keys()]) if (k.startsWith(p)) f.delete(k); };
