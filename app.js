// ══════════════════════════════════════════════════
//  app.js — Our Little Journal
//  Photos stored as base64 in Realtime Database.
//  No Firebase Storage needed (free tier friendly!)
// ══════════════════════════════════════════════════

// ── WHO AM I? ──
// Two users: "H" and "S". Stored in localStorage so each
// device remembers which person they are.
let myUser = localStorage.getItem("journal_user");
if (!myUser) {
  myUser = Math.random() < 0.5 ? "H" : "S";
  localStorage.setItem("journal_user", myUser);
}

const COLORS = { H: "#8b3a2a", S: "#4a6741" };

// ── QUILL EDITOR SETUP ──
let quill;
function initQuill() {
  if (quill) return;
  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Write anything here… thoughts, memories, dreams, plans…',
    modules: {
      toolbar: [
        [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ header: [1, 2, 3, false] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ]
    }
  });
}

// ── COVER / APP TOGGLE ──
function openJournal() {
  document.getElementById("coverScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  document.getElementById("userBadge").textContent = "You are: " + myUser;
  setJournalDate();
  initQuill();
  initWbCanvas();
  loadEntries();
  listenChat();

  // Check Firebase connection — shows a warning if config is wrong
  db.ref(".info/connected").on("value", snap => {
    if (snap.val() === false) {
      showToast("⚠ Not connected to Firebase — check your config");
    }
  });
}

function closeJournal() {
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("coverScreen").classList.remove("hidden");
  // Clean up real-time listeners
  if (entriesListener) {
    db.ref("entries").off("value", entriesListener);
    entriesListener = null;
  }
  db.ref("chat").off();
}

// ── TABS ──
function switchTab(name, el) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => {
    p.classList.remove("active");
    p.classList.add("hidden");
  });
  el.classList.add("active");
  const panel = document.getElementById("panel-" + name);
  panel.classList.remove("hidden");
  panel.classList.add("active");
  if (name === "whiteboard") resizeWbCanvas();
}

// ══════════════════════════════════════
//  JOURNAL
// ══════════════════════════════════════
function setJournalDate() {
  const d = new Date();
  document.getElementById("journalDate").textContent = d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

// ── Save Entry ──
function saveEntry() {
  const text = quill.getText().trim();
  const html = quill.root.innerHTML;
  const photoImgs = Array.from(document.querySelectorAll("#photoGrid .photo-item img"));

  // Quill returns "<p><br></p>" even when visually empty — check plain text instead
  const isEmpty = text.length === 0 || text === "\n";
  if (isEmpty && photoImgs.length === 0) {
    alert("Write something first! ✨");
    return;
  }

  const photos = photoImgs.map(img => img.src);
  const totalSize = photos.reduce((sum, p) => sum + p.length, 0);
  if (totalSize > 3_000_000) {
    if (!confirm("Your photos are quite large and may be slow to save. Continue?")) return;
  }

  // Firebase can't store undefined values — filter photos array to be safe
  const safePhotos = photos.filter(p => !!p);

  const entry = {
    text: text || "",
    html: html || "",
    photos: safePhotos,
    author: myUser || "?",
    date: new Date().toISOString(),
    timestamp: Date.now()
  };

  showToast("Saving… ✦");

  db.ref("entries").push(entry)
    .then(() => {
      quill.setContents([]);
      document.getElementById("photoGrid").innerHTML = "";
      document.getElementById("audioList").innerHTML = "";
      clearJCanvas();
      document.getElementById("journalCanvasWrap").classList.add("hidden");
      showToast("Entry saved ✦");
    })
    .catch(err => {
      console.error("Firebase save error:", err);
      alert("Couldn't save — error: " + err.message);
    });
}

// ── Load Entries ──
// Called once on open. Uses .on() so it updates in real time automatically —
// no need to call it again after saving.
let entriesListener = null;

function loadEntries() {
  const list = document.getElementById("entriesList");

  // Detach any previous listener before attaching a new one
  if (entriesListener) {
    db.ref("entries").off("value", entriesListener);
  }

  entriesListener = db.ref("entries").orderByChild("timestamp").limitToLast(20).on("value", snap => {
    list.innerHTML = "";
    const entries = [];
    snap.forEach(child => entries.unshift({ id: child.key, ...child.val() }));

    if (entries.length === 0) {
      list.innerHTML = '<p style="font-style:italic;color:var(--ink-muted);font-size:13px;">No entries yet — write your first one!</p>';
      return;
    }

    entries.forEach(entry => {
      const card = document.createElement("div");
      card.className = "entry-card";
      const date = new Date(entry.date).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
      });
      const preview = entry.text
        ? (entry.text.length > 80 ? entry.text.slice(0, 80) + "…" : entry.text)
        : "(photos only)";

      card.innerHTML = `
        <div class="entry-card-date">${date} · by ${entry.author}</div>
        <div class="entry-card-preview">${preview}</div>
        ${entry.photos && entry.photos.length > 0
          ? `<div style="font-size:11px;color:var(--ink-muted);margin-top:4px;">📷 ${entry.photos.length} photo${entry.photos.length > 1 ? "s" : ""}</div>`
          : ""}
      `;
      card.onclick = () => openEntry(entry);
      list.appendChild(card);
    });
  });
}

// ── Open Entry Modal ──
function openEntry(entry) {
  const date = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
  let html = `<b style="font-family:'Playfair Display',serif;font-size:16px;">${date}</b>
    <hr style="border:none;border-top:1px solid #c9a97a;margin:10px 0;">`;

  // Show rich HTML if available, otherwise fall back to plain text
  if (entry.html) {
    html += `<div class="entry-body">${entry.html}</div>`;
  } else if (entry.text) {
    html += `<p style="font-size:14px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(entry.text)}</p>`;
  }

  if (entry.photos && entry.photos.length) {
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;margin-top:12px;">`;
    entry.photos.forEach(src => {
      html += `<img src="${src}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;border:1px solid #c9a97a;">`;
    });
    html += `</div>`;
  }

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(44,31,16,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;";
  const box = document.createElement("div");
  box.style.cssText = "background:#f5ead8;border-radius:8px;border:1.5px solid #c9a97a;max-width:560px;width:100%;max-height:82vh;overflow-y:auto;padding:1.5rem;font-family:'Lora',serif;color:#3b2a1a;";
  box.innerHTML = html + `<button onclick="this.closest('[style*=fixed]').remove()" style="margin-top:1rem;padding:6px 16px;background:#8b3a2a;color:#f5ead8;border:none;border-radius:3px;cursor:pointer;font-family:'Lora',serif;font-size:12px;letter-spacing:1px;">Close</button>`;
  overlay.appendChild(box);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

// ── Photos ──
// Uses FileReader to convert to base64, then resizes to keep files small.
function addPhotos(input) {
  const grid = document.getElementById("photoGrid");
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      resizeImage(e.target.result, 800, dataUrl => {
        const item = document.createElement("div");
        item.className = "photo-item";
        item.innerHTML = `
          <img src="${dataUrl}" alt="photo">
          <button class="photo-del" onclick="this.parentElement.remove()">×</button>
        `;
        grid.appendChild(item);
      });
    };
    reader.readAsDataURL(file);
  });
  input.value = "";
}

// Resize image dataURL to maxWidth, returns smaller dataURL via callback
function resizeImage(dataUrl, maxWidth, callback) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxWidth / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL("image/jpeg", 0.75));
  };
  img.src = dataUrl;
}

// ── Audio ──
// Audio plays locally this session only — too large for Realtime DB base64.
function addAudio(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const item = document.createElement("div");
  item.className = "audio-item";
  item.innerHTML = `
    <span class="audio-label">${escapeHtml(file.name)} (this session only)</span>
    <audio controls src="${url}"></audio>
  `;
  document.getElementById("audioList").appendChild(item);
  input.value = "";
}

// ── Journal mini-canvas ──
let jDrawing = false, jLastX = 0, jLastY = 0;
let jColor = "#3b2a1a", jInitDone = false;

function toggleDraw() {
  const wrap = document.getElementById("journalCanvasWrap");
  wrap.classList.toggle("hidden");
  if (!jInitDone) { jInitDone = true; initJCanvas(); }
}

function initJCanvas() {
  const canvas = document.getElementById("journal-canvas");
  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }
  canvas.addEventListener("mousedown", e => {
    jDrawing = true;
    const p = getPos(e); jLastX = p.x; jLastY = p.y;
  });
  canvas.addEventListener("mousemove", e => {
    if (!jDrawing) return;
    const p = getPos(e);
    ctx.beginPath(); ctx.moveTo(jLastX, jLastY); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = jColor;
    ctx.lineWidth = parseInt(document.getElementById("jSizeSlider").value);
    ctx.stroke();
    jLastX = p.x; jLastY = p.y;
  });
  canvas.addEventListener("mouseup", () => jDrawing = false);
  canvas.addEventListener("mouseleave", () => jDrawing = false);
  canvas.addEventListener("touchstart", e => {
    e.preventDefault(); jDrawing = true;
    const p = getPos(e); jLastX = p.x; jLastY = p.y;
  }, { passive: false });
  canvas.addEventListener("touchmove", e => {
    e.preventDefault(); if (!jDrawing) return;
    const p = getPos(e);
    ctx.beginPath(); ctx.moveTo(jLastX, jLastY); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = jColor;
    ctx.lineWidth = parseInt(document.getElementById("jSizeSlider").value);
    ctx.stroke();
    jLastX = p.x; jLastY = p.y;
  }, { passive: false });
  canvas.addEventListener("touchend", () => jDrawing = false);
}

function setJColor(c, el) {
  jColor = c;
  document.querySelectorAll("#journalCanvasWrap .swatch").forEach(s => s.classList.remove("active"));
  if (el) el.classList.add("active");
}

function clearJCanvas() {
  const canvas = document.getElementById("journal-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}


// ══════════════════════════════════════
//  WHITEBOARD
// ══════════════════════════════════════
let wbDrawing = false, wbLastX = 0, wbLastY = 0;
let wbStartX = 0, wbStartY = 0;
let wbColor = "#3b2a1a", wbTool = "draw", wbSize = 4;
let wbSnapshot = null;

function initWbCanvas() {
  const canvas = document.getElementById("wb-canvas");
  resizeWbCanvas();

  const sizeSlider = document.getElementById("wbSizeSlider");
  sizeSlider.addEventListener("input", () => {
    wbSize = parseInt(sizeSlider.value);
    document.getElementById("wbSizeVal").textContent = wbSize;
  });

  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function startDraw(e) {
    e.preventDefault();
    wbDrawing = true;
    const p = getPos(e);
    wbLastX = p.x; wbLastY = p.y;
    wbStartX = p.x; wbStartY = p.y;
    wbSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (wbTool === "draw" || wbTool === "erase") {
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
  }

  function duringDraw(e) {
    if (!wbDrawing) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.lineWidth = wbTool === "erase" ? wbSize * 4 : wbSize;

    if (wbTool === "draw") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = wbColor;
      ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    } else if (wbTool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.putImageData(wbSnapshot, 0, 0);
      ctx.strokeStyle = wbColor;
      ctx.beginPath();
      if (wbTool === "line") {
        ctx.moveTo(wbStartX, wbStartY); ctx.lineTo(p.x, p.y);
      } else if (wbTool === "rect") {
        ctx.rect(wbStartX, wbStartY, p.x - wbStartX, p.y - wbStartY);
      } else if (wbTool === "circle") {
        const rx = Math.abs(p.x - wbStartX) / 2, ry = Math.abs(p.y - wbStartY) / 2;
        ctx.ellipse(
          wbStartX + (p.x - wbStartX) / 2,
          wbStartY + (p.y - wbStartY) / 2,
          rx, ry, 0, 0, Math.PI * 2
        );
      }
      ctx.stroke();
    }
    wbLastX = p.x; wbLastY = p.y;
  }

  function endDraw() {
    wbDrawing = false;
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", duringDraw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", duringDraw, { passive: false });
  canvas.addEventListener("touchend", endDraw);
}

function resizeWbCanvas() {
  const canvas = document.getElementById("wb-canvas");
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth || 640;
  const h = Math.max(400, Math.round(w * 0.6));
  if (canvas.width !== w || canvas.height !== h) {
    const saved = canvas.toDataURL();
    canvas.width = w; canvas.height = h;
    const img = new Image();
    img.onload = () => canvas.getContext("2d").drawImage(img, 0, 0);
    img.src = saved;
  }
}

window.addEventListener("resize", () => {
  const panel = document.getElementById("panel-whiteboard");
  if (!panel.classList.contains("hidden")) resizeWbCanvas();
});

function setWbTool(t, btn) {
  wbTool = t;
  document.querySelectorAll(".wb-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("wb-canvas").style.cursor = t === "erase" ? "cell" : "crosshair";
}

function setWbColor(c, el) {
  wbColor = c;
  wbTool = "draw";
  document.querySelectorAll("#panel-whiteboard .swatch").forEach(s => s.classList.remove("active"));
  if (el) el.classList.add("active");
  document.getElementById("toolDraw").classList.add("active");
  document.getElementById("toolErase").classList.remove("active");
  document.getElementById("wb-canvas").style.cursor = "crosshair";
}

function clearWb() {
  if (!confirm("Clear the whole whiteboard? This can't be undone.")) return;
  const canvas = document.getElementById("wb-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function saveWbImage() {
  const canvas = document.getElementById("wb-canvas");
  const a = document.createElement("a");
  a.download = "our-whiteboard.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function insertWbPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    resizeImage(e.target.result, 600, dataUrl => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById("wb-canvas");
        const ctx = canvas.getContext("2d");
        const maxW = canvas.width * 0.5;
        const scale = Math.min(1, maxW / img.width);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      };
      img.src = dataUrl;
    });
  };
  reader.readAsDataURL(file);
  input.value = "";
}


// ══════════════════════════════════════
//  CHAT
// ══════════════════════════════════════
function listenChat() {
  const msgs = document.getElementById("chatMessages");
  db.ref("chat").orderByChild("timestamp").limitToLast(60).on("value", snap => {
    msgs.innerHTML = "";
    snap.forEach(child => appendMsg(child.val(), false));
    msgs.scrollTop = msgs.scrollHeight;
  });
}

function sendMsg() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  db.ref("chat").push({
    text,
    author: myUser,
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  });

  input.value = "";
}

function appendMsg(m, scroll = true) {
  const msgs = document.getElementById("chatMessages");
  const isMe = m.author === myUser;
  const div = document.createElement("div");
  div.className = "msg" + (isMe ? "" : " them");
  div.innerHTML = `
    <div class="msg-avatar" style="background:${COLORS[m.author] || "#8b3a2a"}">${escapeHtml(m.author)}</div>
    <div>
      <div class="msg-bubble">${escapeHtml(m.text)}</div>
      <div class="msg-time">${m.time || ""}</div>
    </div>
  `;
  msgs.appendChild(div);
  if (scroll) msgs.scrollTop = msgs.scrollHeight;
}


// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg) {
  const existing = document.querySelector(".toast-msg");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = "toast-msg";
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
    background:#3b2a1a; color:#f5ead8; padding:10px 22px; border-radius:20px;
    font-family:'Lora',serif; font-size:13px; z-index:9999;
    animation:fadeInOut 2.5s forwards; pointer-events:none;
  `;
  const style = document.createElement("style");
  style.textContent = `@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(8px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 75%{opacity:1} 100%{opacity:0}}`;
  document.head.appendChild(style);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
