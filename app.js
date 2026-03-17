// ══════════════════════════════════════════════════
//  app.js — Our Little Journal (clean rewrite)
// ══════════════════════════════════════════════════

// ── WHO AM I ──
var myUser = localStorage.getItem("journal_user");
if (!myUser) {
  myUser = Math.random() < 0.5 ? "H" : "S";
  localStorage.setItem("journal_user", myUser);
}
console.log("I am:", myUser);

var COLORS = { H: "#8b3a2a", S: "#4a6741" };

// ── QUILL ──
var quill = null;

function initQuill() {
  if (quill) return;
  quill = new Quill("#quill-editor", {
    theme: "snow",
    placeholder: "Write anything here… thoughts, memories, dreams, plans…",
    modules: {
      toolbar: [
        [{ font: [] }, { size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ header: [1, 2, 3, false] }],
        [{ align: [] }],
        [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
        ["blockquote", "code-block"],
        ["link", "image"],
        ["clean"]
      ]
    }
  });
}

// ── OPEN / CLOSE ──
function openJournal() {
  document.getElementById("coverScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  document.getElementById("userBadge").textContent = "You are: " + myUser;
  setJournalDate();
  initQuill();
  initWbCanvas();
  loadEntries();
  listenChat();
}

function closeJournal() {
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("coverScreen").classList.remove("hidden");
  if (entriesRef) {
    entriesRef.off("value", entriesCallback);
    entriesRef = null;
  }
  db.ref("chat").off();
}

// ── TABS ──
function switchTab(name, el) {
  document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
  document.querySelectorAll(".panel").forEach(function(p) {
    p.classList.remove("active");
    p.classList.add("hidden");
  });
  el.classList.add("active");
  var panel = document.getElementById("panel-" + name);
  panel.classList.remove("hidden");
  panel.classList.add("active");
  if (name === "whiteboard") resizeWbCanvas();
}

// ══════════════════════════════════════
//  JOURNAL
// ══════════════════════════════════════

function setJournalDate() {
  var d = new Date();
  document.getElementById("journalDate").textContent = d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

// ── SAVE ──
function saveEntry() {
  if (!quill) { alert("Editor not ready yet!"); return; }

  var rawText = quill.getText();
  var text = rawText.replace(/\n/g, "").trim();
  var html = quill.root.innerHTML;
  var photoImgs = document.querySelectorAll("#photoGrid .photo-item img");
  var photos = [];
  for (var i = 0; i < photoImgs.length; i++) {
    photos.push(photoImgs[i].src);
  }

  var isEmpty = (text.length === 0) && (html === "<p><br></p>") && (photos.length === 0);
  if (isEmpty) {
    alert("Write something first! ✨");
    return;
  }

  var now = Date.now();
  var entry = {
    text: text,
    html: html,
    photos: photos,
    author: myUser,
    date: new Date(now).toISOString(),
    timestamp: now
  };

  console.log("Saving:", entry.author, entry.timestamp, text.slice(0, 30));
  showToast("Saving… ✦");

  db.ref("entries").push(entry).then(function(ref) {
    console.log("Saved! Key:", ref.key);
    quill.setContents([]);
    document.getElementById("photoGrid").innerHTML = "";
    document.getElementById("audioList").innerHTML = "";
    clearJCanvas();
    document.getElementById("journalCanvasWrap").classList.add("hidden");
    showToast("Entry saved ✦");
  }).catch(function(err) {
    console.error("Save error:", err);
    alert("Save failed: " + err.message);
  });
}

// ── LOAD ──
var entriesRef = null;
var entriesCallback = null;

function loadEntries() {
  var list = document.getElementById("entriesList");
  list.innerHTML = "<p style='font-style:italic;color:#7a5c3e;font-size:13px;'>Loading entries…</p>";

  if (entriesRef && entriesCallback) {
    entriesRef.off("value", entriesCallback);
  }

  entriesRef = db.ref("entries");

  entriesCallback = function(snap) {
    console.log("Got snapshot, exists:", snap.exists(), "numChildren:", snap.numChildren());
    list.innerHTML = "";
    var entries = [];

    snap.forEach(function(child) {
      var val = child.val();
      val.id = child.key;
      entries.push(val);
    });

    if (entries.length === 0) {
      list.innerHTML = "<p style='font-style:italic;color:#7a5c3e;font-size:13px;'>No entries yet — write your first one!</p>";
      return;
    }

    entries.sort(function(a, b) {
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var card = document.createElement("div");
      card.className = "entry-card";

      var dateStr = "Unknown date";
      if (entry.date) {
        dateStr = new Date(entry.date).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        });
      }

      var preview = "(photos only)";
      if (entry.text && entry.text.length > 0) {
        preview = entry.text.length > 80 ? entry.text.slice(0, 80) + "…" : entry.text;
      }

      var photoNote = "";
      if (entry.photos && entry.photos.length > 0) {
        photoNote = "<div style='font-size:11px;color:#7a5c3e;margin-top:4px;'>📷 " + entry.photos.length + " photo" + (entry.photos.length > 1 ? "s" : "") + "</div>";
      }

      card.innerHTML =
        "<div class='entry-card-date'>" + dateStr + " · by " + (entry.author || "?") + "</div>" +
        "<div class='entry-card-preview'>" + preview + "</div>" +
        photoNote;

      (function(e) {
        card.onclick = function() { openEntry(e); };
      })(entry);

      list.appendChild(card);
    }
  };

  entriesRef.on("value", entriesCallback, function(err) {
    console.error("Load error:", err);
    list.innerHTML = "<p style='color:#8b3a2a;font-size:13px;'>Error: " + err.message + "</p>";
  });
}

// ── OPEN ENTRY MODAL ──
function openEntry(entry) {
  var date = entry.date
    ? new Date(entry.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Unknown date";

  var html = "<b style=\"font-family:'Playfair Display',serif;font-size:16px;\">" + date + "</b>";
  html += "<hr style='border:none;border-top:1px solid #c9a97a;margin:10px 0;'>";

  if (entry.html) {
    html += "<div class='entry-body'>" + entry.html + "</div>";
  } else if (entry.text) {
    html += "<p style='font-size:14px;line-height:1.8;white-space:pre-wrap;'>" + escapeHtml(entry.text) + "</p>";
  }

  if (entry.photos && entry.photos.length > 0) {
    html += "<div style='display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;margin-top:12px;'>";
    for (var i = 0; i < entry.photos.length; i++) {
      html += "<img src='" + entry.photos[i] + "' style='width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;border:1px solid #c9a97a;'>";
    }
    html += "</div>";
  }

  html += "<button onclick=\"document.getElementById('entry-modal').remove()\" style='margin-top:1rem;padding:6px 16px;background:#8b3a2a;color:#f5ead8;border:none;border-radius:3px;cursor:pointer;font-family:Lora,serif;font-size:12px;letter-spacing:1px;'>Close</button>";

  var overlay = document.createElement("div");
  overlay.id = "entry-modal";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(44,31,16,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;";

  var box = document.createElement("div");
  box.style.cssText = "background:#f5ead8;border-radius:8px;border:1.5px solid #c9a97a;max-width:560px;width:100%;max-height:82vh;overflow-y:auto;padding:1.5rem;font-family:Lora,serif;color:#3b2a1a;";
  box.innerHTML = html;

  overlay.appendChild(box);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

// ── PHOTOS ──
function addPhotos(input) {
  var grid = document.getElementById("photoGrid");
  var files = Array.from(input.files);
  files.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      resizeImage(e.target.result, 800, function(dataUrl) {
        var item = document.createElement("div");
        item.className = "photo-item";
        item.innerHTML = "<img src='" + dataUrl + "' alt='photo'><button class='photo-del' onclick='this.parentElement.remove()'>×</button>";
        grid.appendChild(item);
      });
    };
    reader.readAsDataURL(file);
  });
  input.value = "";
}

function resizeImage(dataUrl, maxWidth, callback) {
  var img = new Image();
  img.onload = function() {
    var scale = Math.min(1, maxWidth / img.width);
    var w = Math.round(img.width * scale);
    var h = Math.round(img.height * scale);
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL("image/jpeg", 0.75));
  };
  img.src = dataUrl;
}

// ── AUDIO ──
function addAudio(input) {
  var file = input.files[0];
  if (!file) return;
  var url = URL.createObjectURL(file);
  var item = document.createElement("div");
  item.className = "audio-item";
  item.innerHTML = "<span class='audio-label'>" + escapeHtml(file.name) + " (this session only)</span><audio controls src='" + url + "'></audio>";
  document.getElementById("audioList").appendChild(item);
  input.value = "";
}

// ── JOURNAL MINI CANVAS ──
var jDrawing = false, jLastX = 0, jLastY = 0;
var jColor = "#3b2a1a", jInitDone = false;

function toggleDraw() {
  var wrap = document.getElementById("journalCanvasWrap");
  wrap.classList.toggle("hidden");
  if (!jInitDone) { jInitDone = true; initJCanvas(); }
}

function initJCanvas() {
  var canvas = document.getElementById("journal-canvas");
  var ctx = canvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  function getPos(e) {
    var r = canvas.getBoundingClientRect();
    var sx = canvas.width / r.width, sy = canvas.height / r.height;
    var src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  canvas.addEventListener("mousedown", function(e) {
    jDrawing = true;
    var p = getPos(e); jLastX = p.x; jLastY = p.y;
  });
  canvas.addEventListener("mousemove", function(e) {
    if (!jDrawing) return;
    var p = getPos(e);
    ctx.beginPath(); ctx.moveTo(jLastX, jLastY); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = jColor;
    ctx.lineWidth = parseInt(document.getElementById("jSizeSlider").value);
    ctx.stroke();
    jLastX = p.x; jLastY = p.y;
  });
  canvas.addEventListener("mouseup", function() { jDrawing = false; });
  canvas.addEventListener("mouseleave", function() { jDrawing = false; });
  canvas.addEventListener("touchstart", function(e) {
    e.preventDefault(); jDrawing = true;
    var p = getPos(e); jLastX = p.x; jLastY = p.y;
  }, { passive: false });
  canvas.addEventListener("touchmove", function(e) {
    e.preventDefault(); if (!jDrawing) return;
    var p = getPos(e);
    ctx.beginPath(); ctx.moveTo(jLastX, jLastY); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = jColor;
    ctx.lineWidth = parseInt(document.getElementById("jSizeSlider").value);
    ctx.stroke();
    jLastX = p.x; jLastY = p.y;
  }, { passive: false });
  canvas.addEventListener("touchend", function() { jDrawing = false; });
}

function setJColor(c, el) {
  jColor = c;
  document.querySelectorAll("#journalCanvasWrap .swatch").forEach(function(s) { s.classList.remove("active"); });
  if (el) el.classList.add("active");
}

function clearJCanvas() {
  var canvas = document.getElementById("journal-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

// ══════════════════════════════════════
//  WHITEBOARD
// ══════════════════════════════════════
var wbDrawing = false, wbLastX = 0, wbLastY = 0;
var wbStartX = 0, wbStartY = 0;
var wbColor = "#3b2a1a", wbTool = "draw", wbSize = 4;
var wbSnapshot = null;

function initWbCanvas() {
  var canvas = document.getElementById("wb-canvas");
  resizeWbCanvas();

  var sizeSlider = document.getElementById("wbSizeSlider");
  sizeSlider.addEventListener("input", function() {
    wbSize = parseInt(sizeSlider.value);
    document.getElementById("wbSizeVal").textContent = wbSize;
  });

  var ctx = canvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  function getPos(e) {
    var r = canvas.getBoundingClientRect();
    var sx = canvas.width / r.width, sy = canvas.height / r.height;
    var src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function startDraw(e) {
    e.preventDefault();
    wbDrawing = true;
    var p = getPos(e);
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
    var p = getPos(e);
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
        var rx = Math.abs(p.x - wbStartX) / 2, ry = Math.abs(p.y - wbStartY) / 2;
        ctx.ellipse(wbStartX + (p.x - wbStartX) / 2, wbStartY + (p.y - wbStartY) / 2, rx, ry, 0, 0, Math.PI * 2);
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
  var canvas = document.getElementById("wb-canvas");
  var wrap = canvas.parentElement;
  var w = wrap.clientWidth || 640;
  var h = Math.max(400, Math.round(w * 0.6));
  if (canvas.width !== w || canvas.height !== h) {
    var saved = canvas.toDataURL();
    canvas.width = w; canvas.height = h;
    var img = new Image();
    img.onload = function() { canvas.getContext("2d").drawImage(img, 0, 0); };
    img.src = saved;
  }
}

window.addEventListener("resize", function() {
  var panel = document.getElementById("panel-whiteboard");
  if (!panel.classList.contains("hidden")) resizeWbCanvas();
});

function setWbTool(t, btn) {
  wbTool = t;
  document.querySelectorAll(".wb-btn").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  document.getElementById("wb-canvas").style.cursor = t === "erase" ? "cell" : "crosshair";
}

function setWbColor(c, el) {
  wbColor = c;
  wbTool = "draw";
  document.querySelectorAll("#panel-whiteboard .swatch").forEach(function(s) { s.classList.remove("active"); });
  if (el) el.classList.add("active");
  document.getElementById("toolDraw").classList.add("active");
  document.getElementById("toolErase").classList.remove("active");
  document.getElementById("wb-canvas").style.cursor = "crosshair";
}

function clearWb() {
  if (!confirm("Clear the whole whiteboard? This can't be undone.")) return;
  var canvas = document.getElementById("wb-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function saveWbImage() {
  var canvas = document.getElementById("wb-canvas");
  var a = document.createElement("a");
  a.download = "our-whiteboard.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function insertWbPhoto(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    resizeImage(e.target.result, 600, function(dataUrl) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.getElementById("wb-canvas");
        var ctx = canvas.getContext("2d");
        var maxW = canvas.width * 0.5;
        var scale = Math.min(1, maxW / img.width);
        var w = img.width * scale, h = img.height * scale;
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
  var msgs = document.getElementById("chatMessages");
  db.ref("chat").orderByChild("timestamp").limitToLast(60).on("value", function(snap) {
    msgs.innerHTML = "";
    snap.forEach(function(child) { appendMsg(child.val(), false); });
    msgs.scrollTop = msgs.scrollHeight;
  });
}

function sendMsg() {
  var input = document.getElementById("chatInput");
  var text = input.value.trim();
  if (!text) return;
  db.ref("chat").push({
    text: text,
    author: myUser,
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  });
  input.value = "";
}

function appendMsg(m, scroll) {
  if (scroll === undefined) scroll = true;
  var msgs = document.getElementById("chatMessages");
  var isMe = m.author === myUser;
  var div = document.createElement("div");
  div.className = "msg" + (isMe ? "" : " them");
  div.innerHTML =
    "<div class='msg-avatar' style='background:" + (COLORS[m.author] || "#8b3a2a") + "'>" + escapeHtml(m.author) + "</div>" +
    "<div><div class='msg-bubble'>" + escapeHtml(m.text) + "</div><div class='msg-time'>" + (m.time || "") + "</div></div>";
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
  var existing = document.querySelector(".toast-msg");
  if (existing) existing.remove();
  var t = document.createElement("div");
  t.className = "toast-msg";
  t.textContent = msg;
  t.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#3b2a1a;color:#f5ead8;padding:10px 22px;border-radius:20px;font-family:Lora,serif;font-size:13px;z-index:9999;pointer-events:none;";
  t.style.animation = "fadeInOut 2.5s forwards";
  var style = document.createElement("style");
  style.textContent = "@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(8px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}75%{opacity:1}100%{opacity:0}}";
  document.head.appendChild(style);
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2600);
}
