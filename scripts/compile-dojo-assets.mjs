import fs from "node:fs";
import path from "node:path";

const SESSION_FILES =
  "/home/azadmin/.copilot/session-state/5b2c89a8-d887-4dda-94c1-07b3b6eb8d71/files";
const DUMP_DIR = path.join(SESSION_FILES, "site_dump");
const CHUNKS_DIR = path.join(SESSION_FILES, "chunks");
const PROJECT_ROOT = "/home/azadmin/llmdojo";

// 1. Copy compiled stylesheet to public/dojo.css
const siteCss = fs.readFileSync(path.join(SESSION_FILES, "site.css"), "utf8");
fs.writeFileSync(path.join(PROJECT_ROOT, "public", "dojo.css"), siteCss);
console.log("Wrote public/dojo.css (" + siteCss.length + " bytes)");

// 2. Copy all rewritten chunks to public/dojo-chunks/ and build src/data/dojo-core-chunks.json
const publicChunksDir = path.join(PROJECT_ROOT, "public", "dojo-chunks");
fs.mkdirSync(publicChunksDir, { recursive: true });

const coreChunkFiles = [
  "033tjgu5dcxcp.js",
  "0ne70t2v68hkv.js",
  "2ttfj-iulrmhz.js",
  "3n-umzf6wqb6o.js",
  "31hjqz39q885v.js",
  "0ylov6tpv7tb2.js",
  "3n3uiaiz2ezyt.js",
  "0_vj5dckwv3y-.js",
  "02c2cldbfrnwu.js",
  "02lo_esjhqaw7.js",
  "1p79p3idm0maf.js",
  "25-qv4eqb4ll_.js",
  "26j6ren92-j5-.js",
  "28iiyqrkqtfil.js",
  "2c4t884hpvbjz.js",
  "2h7y83h85rpig.js",
  "2kkw74cpk75u8.js",
  "3exfrpnuruonm.js",
  "09l78mlv5jj0k.js",
  "0bctafo825vtf.js",
  "3cr9rsz590_qb.js",
  "35c53yd9ysr3x.js",
];

const lazyChunkFiles = [
  "3cfudc9zqdp74.js",
  "074nxqhadia2l.js",
  "456p20h1t0wca.js",
  "2_j5z5y54sn4a.js",
  "0tgn8mxf4bg4b.js",
];

const coreChunkPayloads = [];
for (const fname of [...coreChunkFiles, ...lazyChunkFiles]) {
  const srcPath = path.join(CHUNKS_DIR, fname);
  if (!fs.existsSync(srcPath)) {
    throw new Error("Missing chunk file: " + srcPath);
  }
  const rewritten = fs
    .readFileSync(srcPath, "utf8")
    .replaceAll("globalThis.TURBOPACK", "globalThis.__LLMDOJO_CHUNKS__");
  fs.writeFileSync(path.join(publicChunksDir, fname), rewritten);
  if (coreChunkFiles.includes(fname)) {
    coreChunkPayloads.push({ name: fname, code: rewritten });
  }
}

fs.writeFileSync(
  path.join(PROJECT_ROOT, "src", "data", "dojo-core-chunks.json"),
  JSON.stringify(coreChunkPayloads)
);
console.log(
  `Wrote ${coreChunkPayloads.length} core chunks to src/data/dojo-core-chunks.json and ${
    coreChunkFiles.length + lazyChunkFiles.length
  } chunks to public/dojo-chunks/`
);

// 3. Parse all 411 .rsc.txt files into compact, lossless page ASTs
function parseFlightFile(buf) {
  let pos = 0;
  const rows = new Map();
  const iRows = new Map();

  while (pos < buf.length) {
    let colon = pos;
    while (colon < buf.length && buf[colon] !== 0x3a && buf[colon] !== 0x0a) {
      colon++;
    }
    if (colon >= buf.length || buf[colon] === 0x0a) {
      pos = colon + 1;
      continue;
    }
    const id = buf.subarray(pos, colon).toString("utf8").trim();
    if (!id || !/^[0-9a-fA-F]+$/.test(id)) {
      let nl = colon + 1;
      while (nl < buf.length && buf[nl] !== 0x0a) nl++;
      pos = nl + 1;
      continue;
    }

    const nextByte = buf[colon + 1];
    if (nextByte === 0x54) {
      // 'T' -> length-prefixed UTF-8 byte payload
      let comma = colon + 2;
      while (comma < buf.length && buf[comma] !== 0x2c) comma++;
      const hexLen = buf.subarray(colon + 2, comma).toString("utf8");
      const byteLen = parseInt(hexLen, 16);
      const textStart = comma + 1;
      const textVal = buf
        .subarray(textStart, textStart + byteLen)
        .toString("utf8");
      // Mark raw text rows so dollar signs inside prose are not treated as Flight refs
      rows.set(id, { __rawText: textVal });
      pos = textStart + byteLen;
      if (pos < buf.length && buf[pos] === 0x0a) pos++;
      continue;
    }

    let nl = colon + 1;
    while (nl < buf.length && buf[nl] !== 0x0a) nl++;
    const line = buf.subarray(colon + 1, nl).toString("utf8");
    pos = nl + 1;

    if (line.startsWith("I[")) {
      try {
        const arr = JSON.parse(line.slice(1));
        iRows.set(id, { modId: arr[0], exp: arr[2] });
      } catch {}
    } else if (
      line[0] === "[" ||
      line[0] === "{" ||
      line[0] === '"' ||
      line === "null" ||
      line === "true" ||
      line === "false"
    ) {
      try {
        rows.set(id, JSON.parse(line));
      } catch {}
    }
  }

  const clientRefs = new Map();
  for (const [id, r] of iRows.entries()) {
    let expName = r.exp;
    if (typeof expName === "string" && expName.startsWith("$")) {
      const refVal = rows.get(expName.slice(1));
      expName =
        refVal && typeof refVal === "object" && "__rawText" in refVal
          ? refVal.__rawText
          : refVal ?? expName;
    }
    clientRefs.set(id, `@client:${r.modId}:${expName}`);
  }

  function resolveNode(node, seen = new Set()) {
    if (node && typeof node === "object" && "__rawText" in node) {
      return node.__rawText;
    }
    if (typeof node === "string") {
      if (node === "$undefined") return undefined;
      if (node === "$Sreact.fragment") return "@fragment";
      if (node === "$Sreact.suspense") return "@suspense";
      if (node === "$Sreact.view_transition") return "@fragment";
      if (node.startsWith("$$")) return node.slice(1);
      if (node.startsWith("$L")) {
        const refId = node.slice(2);
        if (clientRefs.has(refId)) return clientRefs.get(refId);
        if (rows.has(refId) && !seen.has(refId)) {
          const nextSeen = new Set(seen);
          nextSeen.add(refId);
          return resolveNode(rows.get(refId), nextSeen);
        }
        return null;
      }
      if (node.startsWith("$@")) return null;
      const pathRefMatch = node.match(/^\$([0-9a-fA-F]+):(.+)$/);
      if (pathRefMatch) {
        const refId = pathRefMatch[1];
        const segments = pathRefMatch[2].split(":");
        const pathKey = `${refId}:${pathRefMatch[2]}`;
        if (rows.has(refId) && !seen.has(pathKey)) {
          const nextSeen = new Set(seen);
          nextSeen.add(pathKey);
          let cur = rows.get(refId);
          for (const seg of segments) {
            if (cur == null) break;
            if (
              typeof cur === "string" &&
              cur.startsWith("$") &&
              !cur.startsWith("$$")
            ) {
              cur = resolveNode(cur, nextSeen);
            }
            if (cur == null) break;
            if (
              Array.isArray(cur) &&
              (cur[0] === "$" || cur[0] === "$el") &&
              seg === "props"
            ) {
              cur = cur[3];
            } else {
              cur = cur[seg];
            }
          }
          return resolveNode(cur, nextSeen);
        }
      }
      if (node.startsWith("$") && /^[0-9a-fA-F]+$/.test(node.slice(1))) {
        const refId = node.slice(1);
        if (clientRefs.has(refId)) return clientRefs.get(refId);
        if (rows.has(refId) && !seen.has(refId)) {
          const nextSeen = new Set(seen);
          nextSeen.add(refId);
          return resolveNode(rows.get(refId), nextSeen);
        }
      }
      return node;
    }
    if (Array.isArray(node)) {
      if (node[0] === "$") {
        const rawType = node[1];
        const resolvedType = resolveNode(rawType, seen);
        const key = node[2];
        const rawProps = node[3] || {};
        const props = {};
        for (const [k, v] of Object.entries(rawProps)) {
          if (k === "children") {
            props.children = resolveNode(v, seen);
          } else {
            const rv = resolveNode(v, seen);
            if (rv !== undefined) props[k] = rv;
          }
        }
        return ["$el", resolvedType, key, props];
      }
      return node.map((item) => resolveNode(item, seen));
    }
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        const rv = resolveNode(v, seen);
        if (rv !== undefined) out[k] = rv;
      }
      return out;
    }
    return node;
  }

  // Extract metadata (title & description) from row 41 or any Next.Metadata array
  let title = "LLM Dojo";
  let description =
    "Interactive AI & LLM engineering curriculum, labs, and interview prep.";
  for (const [, val] of rows.entries()) {
    if (Array.isArray(val)) {
      const str = JSON.stringify(val);
      if (str.includes('["$","title"')) {
        for (const item of val) {
          if (Array.isArray(item) && item[0] === "$" && item[1] === "title") {
            const ch = resolveNode(item[3]?.children);
            if (typeof ch === "string") title = ch;
            else if (Array.isArray(ch)) title = ch.join("");
          }
          if (
            Array.isArray(item) &&
            item[0] === "$" &&
            item[1] === "meta" &&
            item[3]?.name === "description"
          ) {
            const desc = resolveNode(item[3]?.content);
            if (typeof desc === "string") description = desc;
          }
        }
      }
    }
  }

  // Find the leaf page container ["$","$4","c",{"children":[pageChild, ...]}]
  let leafRowId = null;
  for (const [id, val] of rows.entries()) {
    if (
      Array.isArray(val) &&
      val[0] === "$" &&
      val[1] === "$4" &&
      val[2] === "c"
    ) {
      const ch = val[3]?.children;
      if (Array.isArray(ch) && ch[0] !== null) {
        const ch0Str = JSON.stringify(ch[0]);
        if (!ch0Str.includes("script-0")) {
          leafRowId = id;
        }
      }
    }
  }

  const leafRow = rows.get(leafRowId);
  const pageNode = resolveNode(leafRow[3].children[0]);

  return { title, description, tree: pageNode };
}

const rscFiles = fs
  .readdirSync(DUMP_DIR)
  .filter((f) => f.endsWith(".rsc.txt"))
  .sort();

const pagesMap = {};
let totalRoutes = 0;

for (const f of rscFiles) {
  const base = f.replace(/\.rsc\.txt$/, "");
  const routePath =
    base === "root" || base === "__root__"
      ? "/"
      : "/" + base.replace(/__/g, "/");
  const buf = fs.readFileSync(path.join(DUMP_DIR, f));
  const parsed = parseFlightFile(buf);
  pagesMap[routePath] = parsed;
  totalRoutes++;
}

const outPath = path.join(PROJECT_ROOT, "src", "data", "dojo-pages.json");
fs.writeFileSync(outPath, JSON.stringify(pagesMap));
const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
console.log(
  `Successfully compiled ${totalRoutes} routes into src/data/dojo-pages.json (${sizeMb} MB)`
);
