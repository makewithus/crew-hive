const m = new Map();
export const getItemAsync = async (k) => (m.has(k) ? m.get(k) : null);
export const setItemAsync = async (k, v) => { m.set(k, v); };
export const deleteItemAsync = async (k) => { m.delete(k); };
export const __dump = () => m;
