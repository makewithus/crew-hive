/**
 * backend/config/mock-firestore.js
 * In-memory Firestore + Auth doubles. ONLY usable when APP_ENV=test and FIREBASE_MODE=mock
 * (enforced in config/firebase.js and config/env.js). Supports the subset of the Admin SDK the backend uses.
 */

import crypto from "node:crypto";

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const getPath = (obj, p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

function matches(item, f) {
  const v = getPath(item, f.field);
  switch (f.op) {
    case "==": return v === f.value;
    case "!=": return v !== f.value;
    case ">": return v > f.value;
    case ">=": return v >= f.value;
    case "<": return v < f.value;
    case "<=": return v <= f.value;
    case "in": return f.value.includes(v);
    case "array-contains": return Array.isArray(v) && v.includes(f.value);
    default: throw new Error(`mock-firestore: unsupported operator ${f.op}`);
  }
}

export class MockFirestore {
  constructor() { this.data = new Map(); }
  reset() { this.data.clear(); }
  _col(name) { if (!this.data.has(name)) this.data.set(name, new Map()); return this.data.get(name); }

  collection(name) { return new MockQuery(this, name, [], null, null).asCollection(); }

  batch() {
    const ops = [];
    const self = this;
    return {
      set(ref, data, opts) { ops.push(() => ref.set(data, opts)); return this; },
      update(ref, data) { ops.push(() => ref.update(data)); return this; },
      delete(ref) { ops.push(() => ref.delete()); return this; },
      async commit() { for (const op of ops) await op(); return self; },
    };
  }

  async runTransaction(fn) {
    const tx = {
      get: (refOrQuery) => refOrQuery.get(),
      set: (ref, d, o) => ref.set(d, o),
      update: (ref, d) => ref.update(d),
      delete: (ref) => ref.delete(),
    };
    return fn(tx);
  }
}

class MockQuery {
  constructor(db, name, filters, order, lim) { this.db = db; this.name = name; this.filters = filters; this.order = order; this.lim = lim; }
  asCollection() {
    const q = this;
    q.doc = (id) => new MockDocRef(q.db, q.name, id || crypto.randomUUID().replace(/-/g, "").slice(0, 20));
    q.add = async (data) => { const ref = q.doc(); await ref.set(data); return ref; };
    return q;
  }
  where(field, op, value) { return new MockQuery(this.db, this.name, [...this.filters, { field, op, value }], this.order, this.lim); }
  orderBy(field, dir = "asc") { return new MockQuery(this.db, this.name, this.filters, { field, dir }, this.lim); }
  limit(n) { return new MockQuery(this.db, this.name, this.filters, this.order, n); }
  async get() {
    let rows = [...this.db._col(this.name).entries()].filter(([, v]) => this.filters.every((f) => matches(v, f)));
    if (this.order) {
      const { field, dir } = this.order;
      rows.sort((a, b) => {
        const x = getPath(a[1], field), y = getPath(b[1], field);
        return (x > y ? 1 : x < y ? -1 : 0) * (dir === "desc" ? -1 : 1);
      });
    }
    if (this.lim) rows = rows.slice(0, this.lim);
    const docs = rows.map(([id, v]) => snap(this.db, this.name, id, v));
    return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
  }
}

const snap = (db, name, id, v) => ({
  id, exists: v !== undefined, data: () => clone(v), ref: new MockDocRef(db, name, id),
});

class MockDocRef {
  constructor(db, col, id) { this.db = db; this.colName = col; this.id = id; }
  get _c() { return this.db._col(this.colName); }
  async get() { return snap(this.db, this.colName, this.id, this._c.get(this.id)); }
  async set(data, opts = {}) {
    const prev = this._c.get(this.id);
    this._c.set(this.id, opts.merge && prev ? { ...prev, ...clone(data) } : clone(data));
  }
  async update(data) {
    const prev = this._c.get(this.id);
    if (prev === undefined) { const e = new Error(`NOT_FOUND: ${this.colName}/${this.id}`); e.code = 5; throw e; }
    const next = { ...prev };
    for (const [k, v] of Object.entries(clone(data))) {
      if (k.includes(".")) { const parts = k.split("."); let o = next; parts.slice(0, -1).forEach((p) => { o[p] = { ...(o[p] || {}) }; o = o[p]; }); o[parts.at(-1)] = v; }
      else next[k] = v;
    }
    this._c.set(this.id, next);
  }
  async delete() { this._c.delete(this.id); }
  collection(name) { return this.db.collection(`${this.colName}/${this.id}/${name}`); }
}

/** Auth double: custom tokens → ID tokens, revocation, deletion. Tokens are random, not forgeable by phone. */
export class MockAuth {
  constructor() { this.users = new Map(); this.custom = new Map(); this.sessions = new Map(); this.refresh = new Map(); }
  reset() { this.users.clear(); this.custom.clear(); this.sessions.clear(); this.refresh.clear(); }
  async createCustomToken(uid, claims = {}) {
    const t = `mockcustom_${crypto.randomBytes(16).toString("hex")}`;
    this.custom.set(t, { uid, claims });
    return t;
  }
  /** Test-only equivalent of Firebase's signInWithCustomToken REST call. */
  async signInWithCustomToken(customToken) {
    const c = this.custom.get(customToken);
    if (!c) throw new Error("INVALID_CUSTOM_TOKEN");
    this.custom.delete(customToken);
    this.users.set(c.uid, { uid: c.uid, claims: c.claims });
    return this._issue(c.uid, c.claims);
  }
  _issue(uid, claims) {
    const idToken = `mockid_${crypto.randomBytes(16).toString("hex")}`;
    const refreshToken = `mockrefresh_${crypto.randomBytes(16).toString("hex")}`;
    this.sessions.set(idToken, { uid, claims, revoked: false });
    this.refresh.set(refreshToken, { uid, claims });
    return { idToken, refreshToken, expiresIn: "3600" };
  }
  async refreshSession(refreshToken) {
    const r = this.refresh.get(refreshToken);
    if (!r || !this.users.has(r.uid)) throw new Error("INVALID_REFRESH_TOKEN");
    return this._issue(r.uid, r.claims);
  }
  async verifyIdToken(token, checkRevoked = false) {
    const s = this.sessions.get(token);
    if (!s || !this.users.has(s.uid)) throw Object.assign(new Error("invalid token"), { code: "auth/argument-error" });
    if (checkRevoked && s.revoked) throw Object.assign(new Error("revoked"), { code: "auth/id-token-revoked" });
    return { uid: s.uid, phone_number: s.claims.phone, ...s.claims };
  }
  async revokeRefreshTokens(uid) { for (const s of this.sessions.values()) if (s.uid === uid) s.revoked = true; for (const [k, v] of this.refresh) if (v.uid === uid) this.refresh.delete(k); }
  async deleteUser(uid) { this.users.delete(uid); (this.deleted ||= new Set()).add(uid); await this.revokeRefreshTokens(uid); }
  async getUser(uid) { if (!this.users.has(uid)) throw Object.assign(new Error("not found"), { code: "auth/user-not-found" }); return this.users.get(uid); }
}
