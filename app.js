// ══════════════════════════════════════════════════
//  app.js — Our Little Journal (clean rewrite)
// ══════════════════════════════════════════════════

// ── WHO AM I ──
var myUser = localStorage.getItem("journal_user");
// Always show picker so they can switch if needed
myUser = null;
localStorage.removeItem("journal_user");

var COLORS = { J: "#8b3a2a", Z: "#4a6741" };

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
  showPinScreen();
}

function showPinScreen() {
  var overlay = document.createElement("div");
  overlay.id = "pin-screen";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(44,31,16,0.92);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem;";

  overlay.innerHTML =
    "<div style='background:#f5ead8;border-radius:12px;border:1.5px solid #c9a97a;padding:2rem;max-width:320px;width:100%;text-align:center;font-family:Lora,serif;color:#3b2a1a;'>" +
      "<div style='font-size:24px;color:#8b3a2a;margin-bottom:0.5rem;'>✦</div>" +
      "<p style='font-family:Playfair Display,serif;font-size:18px;font-style:italic;margin-bottom:0.3rem;'>Our Little Journal</p>" +
      "<p style='font-size:12px;color:#7a5c3e;letter-spacing:2px;text-transform:uppercase;margin-bottom:1.5rem;'>Enter PIN to continue</p>" +
      "<input id='pinInput' type='password' maxlength='4' placeholder='· · · ·' style='width:100%;padding:10px;text-align:center;font-size:22px;letter-spacing:8px;border:1.5px solid #c9a97a;border-radius:6px;background:#ede0c8;color:#3b2a1a;outline:none;margin-bottom:1rem;font-family:Lora,serif;'>" +
      "<p id='pinError' style='font-size:12px;color:#8b3a2a;min-height:18px;margin-bottom:0.8rem;'></p>" +
      "<button onclick='checkPin()' style='width:100%;padding:10px;background:#8b3a2a;color:#f5ead8;border:none;border-radius:6px;font-family:Lora,serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;'>Enter</button>" +
    "</div>";

  document.body.appendChild(overlay);
  document.getElementById("pinInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") checkPin();
  });
  setTimeout(function() { document.getElementById("pinInput").focus(); }, 100);
}

var PIN = "0523"; // ← Change this to your own PIN!

function checkPin() {
  var input = document.getElementById("pinInput").value.trim();
  if (input === PIN) {
    document.getElementById("pin-screen").remove();
    showUserPicker();
  } else {
    document.getElementById("pinError").textContent = "Wrong PIN, try again ✦";
    document.getElementById("pinInput").value = "";
    document.getElementById("pinInput").focus();
  }
}

function showUserPicker() {
  var saved = localStorage.getItem("journal_user");

  var overlay = document.createElement("div");
  overlay.id = "user-picker";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(44,31,16,0.92);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem;";

  overlay.innerHTML =
    "<div style='background:#f5ead8;border-radius:12px;border:1.5px solid #c9a97a;padding:2rem;max-width:320px;width:100%;text-align:center;font-family:Lora,serif;color:#3b2a1a;'>" +
      "<div style='font-size:24px;color:#8b3a2a;margin-bottom:0.5rem;'>✦</div>" +
      "<p style='font-family:Playfair Display,serif;font-size:18px;font-style:italic;margin-bottom:0.3rem;'>Who are you?</p>" +
      "<p style='font-size:12px;color:#7a5c3e;letter-spacing:1px;margin-bottom:1.5rem;'>Choose your initial</p>" +
      "<div style='display:flex;gap:1rem;justify-content:center;'>" +
        "<button onclick='pickUser(\"J\")' style='flex:1;padding:1.2rem;background:" + (saved === "J" ? "#8b3a2a" : "#ede0c8") + ";color:" + (saved === "J" ? "#f5ead8" : "#3b2a1a") + ";border:1.5px solid #c9a97a;border-radius:8px;font-family:Playfair Display,serif;font-size:28px;cursor:pointer;transition:all 0.2s;'>J</button>" +
        "<button onclick='pickUser(\"Z\")' style='flex:1;padding:1.2rem;background:" + (saved === "Z" ? "#4a6741" : "#ede0c8") + ";color:" + (saved === "Z" ? "#f5ead8" : "#3b2a1a") + ";border:1.5px solid #c9a97a;border-radius:8px;font-family:Playfair Display,serif;font-size:28px;cursor:pointer;transition:all 0.2s;'>Z</button>" +
      "</div>" +
    "</div>";

  document.body.appendChild(overlay);
}

function pickUser(user) {
  myUser = user;
  localStorage.setItem("journal_user", user);
  document.getElementById("user-picker").remove();
  launchJournal();
}

function launchJournal() {
  document.getElementById("coverScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  document.getElementById("userBadge").textContent = "You are: " + myUser;
  document.getElementById("userBadge").style.color = COLORS[myUser] || "#7a5c3e";
  setJournalDate();
  initQuill();
  initWbCanvas();
  loadEntries();
  loadGallery();
  listenChat();
}

function closeJournal() {
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("coverScreen").classList.remove("hidden");
  if (entriesRef) {
    entriesRef.off("value", entriesCallback);
    entriesRef = null;
  }
  if (galleryListener) {
    db.ref("gallery").off("value", galleryListener);
    galleryListener = null;
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
      html += "<img src='" + entry.photos[i] + "' onclick='openLightbox(this.src)' style='width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;border:1px solid #c9a97a;cursor:zoom-in;'>";
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

// ── PHOTO LIGHTBOX ──
function openLightbox(src) {
  var overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:3000;display:flex;align-items:center;justify-content:center;cursor:zoom-out;";
  overlay.innerHTML = "<img src='" + src + "' style='max-width:92vw;max-height:92vh;border-radius:4px;object-fit:contain;box-shadow:0 4px 40px rgba(0,0,0,0.5);'>";
  overlay.onclick = function() { overlay.remove(); };
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
//  CHAT — with reactions + replies
// ══════════════════════════════════════

var replyingTo = null; // holds the message being replied to
var EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

function listenChat() {
  var msgs = document.getElementById("chatMessages");
  db.ref("chat").orderByChild("timestamp").limitToLast(60).on("value", function(snap) {
    msgs.innerHTML = "";
    snap.forEach(function(child) {
      appendMsg(child.key, child.val(), false);
    });
    msgs.scrollTop = msgs.scrollHeight;
  });
}

function sendMsg() {
  var input = document.getElementById("chatInput");
  var text = input.value.trim();
  if (!text) return;

  var msg = {
    text: text,
    author: myUser,
    timestamp: Date.now()
    // no 'time' field — each client formats from timestamp in their own timezone
  };

  // attach reply if one is set
  if (replyingTo) {
    msg.replyTo = {
      text: replyingTo.text,
      author: replyingTo.author
    };
  }

  db.ref("chat").push(msg);
  input.value = "";
  clearReply();
}

function appendMsg(key, m, scroll) {
  if (scroll === undefined) scroll = true;
  var msgs = document.getElementById("chatMessages");
  var isMe = m.author === myUser;

  var div = document.createElement("div");
  div.className = "msg" + (isMe ? "" : " them");
  div.setAttribute("data-key", key);

  // reply preview
  var replyHtml = "";
  if (m.replyTo) {
    replyHtml =
      "<div class='msg-reply-preview'>" +
        "<span class='msg-reply-author'>" + escapeHtml(m.replyTo.author) + "</span>" +
        "<span class='msg-reply-text'>" + escapeHtml(m.replyTo.text.slice(0, 60)) + (m.replyTo.text.length > 60 ? "…" : "") + "</span>" +
      "</div>";
  }

  // reactions display
  var reactionsHtml = buildReactionsHtml(key, m.reactions);

  // action buttons (reply + react)
  var actionsHtml =
    "<div class='msg-actions'>" +
      "<button class='msg-action-btn' onclick='startReply(\"" + key + "\", \"" + escapeHtml(m.author) + "\", \"" + escapeHtml(m.text.replace(/"/g, "&quot;")) + "\")'>↩ Reply</button>" +
      "<button class='msg-action-btn' onclick='toggleEmojiPicker(\"" + key + "\", this)'>😊</button>" +
    "</div>";

  div.innerHTML =
    "<div class='msg-avatar' style='background:" + (COLORS[m.author] || "#8b3a2a") + "'>" + escapeHtml(m.author) + "</div>" +
    "<div class='msg-content'>" +
      replyHtml +
      "<div class='msg-bubble'>" + escapeHtml(m.text) + "</div>" +
      "<div class='msg-time'>" + (m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }) : "") + "</div>" +
      reactionsHtml +
      actionsHtml +
    "</div>";

  msgs.appendChild(div);
  if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

function buildReactionsHtml(key, reactions) {
  if (!reactions) return "";
  var counts = {};
  var myReaction = null;
  Object.keys(reactions).forEach(function(user) {
    var emoji = reactions[user];
    counts[emoji] = (counts[emoji] || 0) + 1;
    if (user === myUser) myReaction = emoji;
  });
  var html = "<div class='msg-reactions'>";
  Object.keys(counts).forEach(function(emoji) {
    var active = myReaction === emoji ? " active" : "";
    html += "<span class='reaction-pill" + active + "' onclick='toggleReaction(\"" + key + "\", \"" + emoji + "\")'>" + emoji + " " + counts[emoji] + "</span>";
  });
  html += "</div>";
  return html;
}

function toggleEmojiPicker(msgKey, btn) {
  // close any open picker first
  var existing = document.querySelector(".emoji-picker");
  if (existing) {
    existing.remove();
    if (existing.getAttribute("data-key") === msgKey) return;
  }

  var picker = document.createElement("div");
  picker.className = "emoji-picker";
  picker.setAttribute("data-key", msgKey);
  EMOJIS.forEach(function(emoji) {
    var span = document.createElement("span");
    span.textContent = emoji;
    span.onclick = function() {
      toggleReaction(msgKey, emoji);
      picker.remove();
    };
    picker.appendChild(span);
  });

  btn.parentElement.appendChild(picker);

  // close on outside click
  setTimeout(function() {
    document.addEventListener("click", function handler(e) {
      if (!picker.contains(e.target) && e.target !== btn) {
        picker.remove();
        document.removeEventListener("click", handler);
      }
    });
  }, 10);
}

function toggleReaction(msgKey, emoji) {
  var ref = db.ref("chat/" + msgKey + "/reactions/" + myUser);
  ref.once("value", function(snap) {
    if (snap.val() === emoji) {
      ref.remove(); // toggle off same emoji
    } else {
      ref.set(emoji);
    }
  });
}

function startReply(key, author, text) {
  replyingTo = { key: key, author: author, text: text };
  var bar = document.getElementById("replyBar");
  document.getElementById("replyAuthor").textContent = author;
  document.getElementById("replyText").textContent = text.slice(0, 60) + (text.length > 60 ? "…" : "");
  bar.classList.remove("hidden");
  document.getElementById("chatInput").focus();
}

function clearReply() {
  replyingTo = null;
  document.getElementById("replyBar").classList.add("hidden");
}

// ══════════════════════════════════════
//  GALLERY
// ══════════════════════════════════════
var GALLERY_PER_PAGE = 4; // items per page
var galleryCurrentPage = 1;
var galleryData = []; // local cache
var galleryListener = null;

function loadGallery() {
  if (galleryListener) {
    db.ref("gallery").off("value", galleryListener);
  }
  galleryListener = db.ref("gallery").on("value", function(snap) {
    galleryData = [];
    snap.forEach(function(child) {
      var val = child.val();
      val.id = child.key;
      galleryData.push(val);
    });
    galleryData.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    renderGallery();
  });
}

function renderGallery() {
  var pages = document.getElementById("galleryPages");
  var pagination = document.getElementById("galleryPagination");
  pages.innerHTML = "";

  var totalPages = Math.max(1, Math.ceil(galleryData.length / GALLERY_PER_PAGE));
  if (galleryCurrentPage > totalPages) galleryCurrentPage = totalPages;

  var start = (galleryCurrentPage - 1) * GALLERY_PER_PAGE;
  var pageItems = galleryData.slice(start, start + GALLERY_PER_PAGE);

  if (galleryData.length === 0) {
    pages.innerHTML = "<p style='font-style:italic;color:var(--ink-muted);font-size:13px;text-align:center;padding:2rem 0;'>No pages yet — click + Add Page to start your gallery!</p>";
  } else {
    pageItems.forEach(function(item, idx) {
      var globalIdx = start + idx;
      var isReverse = globalIdx % 2 !== 0;
      var el = buildGalleryItem(item, isReverse);
      pages.appendChild(el);
    });
  }

  // pagination
  pagination.innerHTML = "";
  if (totalPages <= 1) return;

  var prevBtn = document.createElement("button");
  prevBtn.className = "page-nav-btn";
  prevBtn.textContent = "← Prev";
  prevBtn.disabled = galleryCurrentPage === 1;
  prevBtn.onclick = function() { galleryCurrentPage--; renderGallery(); };
  pagination.appendChild(prevBtn);

  for (var i = 1; i <= totalPages; i++) {
    (function(pg) {
      var btn = document.createElement("button");
      btn.className = "page-btn" + (pg === galleryCurrentPage ? " active" : "");
      btn.textContent = pg;
      btn.onclick = function() { galleryCurrentPage = pg; renderGallery(); };
      pagination.appendChild(btn);
    })(i);
  }

  var nextBtn = document.createElement("button");
  nextBtn.className = "page-nav-btn";
  nextBtn.textContent = "Next →";
  nextBtn.disabled = galleryCurrentPage === totalPages;
  nextBtn.onclick = function() { galleryCurrentPage++; renderGallery(); };
  pagination.appendChild(nextBtn);
}

function buildGalleryItem(item, isReverse) {
  var div = document.createElement("div");
  div.className = "gallery-item" + (isReverse ? " reverse" : "");
  div.setAttribute("data-id", item.id);

  // image side
  var imgWrap = document.createElement("div");
  imgWrap.className = "gallery-img-wrap";

  if (item.photo) {
    var img = document.createElement("img");
    img.src = item.photo;
    img.alt = "gallery photo";
    img.onclick = function() { openLightbox(item.photo); };
    imgWrap.appendChild(img);

    // change photo button
    var changeBtn = document.createElement("label");
    changeBtn.style.cssText = "display:block;margin-top:6px;text-align:center;font-size:11px;color:var(--ink-muted);cursor:pointer;letter-spacing:1px;text-transform:uppercase;font-family:'Lora',serif;";
    changeBtn.textContent = "Change photo";
    var fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.accept = "image/*";
    fileInput.style.display = "none";
    fileInput.onchange = function() { uploadGalleryPhoto(item.id, fileInput); };
    changeBtn.appendChild(fileInput);
    imgWrap.appendChild(changeBtn);
  } else {
    var placeholder = document.createElement("div");
    placeholder.className = "gallery-img-placeholder";
    placeholder.innerHTML = "<span>+</span><p>Add a photo</p>";
    var fileInput2 = document.createElement("input");
    fileInput2.type = "file"; fileInput2.accept = "image/*";
    fileInput2.style.cssText = "position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;";
    fileInput2.onchange = function() { uploadGalleryPhoto(item.id, fileInput2); };
    placeholder.style.position = "relative";
    placeholder.appendChild(fileInput2);
    imgWrap.appendChild(placeholder);
  }

  // text side
  var textWrap = document.createElement("div");
  textWrap.className = "gallery-text-wrap";

  var textarea = document.createElement("textarea");
  textarea.className = "gallery-caption";
  textarea.placeholder = "Write something about this moment…";
  textarea.value = item.caption || "";

  var actions = document.createElement("div");
  actions.className = "gallery-item-actions";

  var saveBtn = document.createElement("button");
  saveBtn.className = "gallery-save-btn";
  saveBtn.textContent = "Save";
  saveBtn.onclick = function() { saveGalleryCaption(item.id, textarea.value); };

  var delBtn = document.createElement("button");
  delBtn.className = "gallery-del-btn";
  delBtn.textContent = "Delete";
  delBtn.onclick = function() { deleteGalleryItem(item.id); };

  actions.appendChild(saveBtn);
  actions.appendChild(delBtn);
  textWrap.appendChild(textarea);
  textWrap.appendChild(actions);

  div.appendChild(imgWrap);
  div.appendChild(textWrap);
  return div;
}

function addGalleryItem() {
  var order = galleryData.length;
  db.ref("gallery").push({
    photo: null,
    caption: "",
    order: order,
    createdBy: myUser,
    timestamp: Date.now()
  }).then(function() {
    // jump to last page to see new item
    galleryCurrentPage = Math.ceil((galleryData.length + 1) / GALLERY_PER_PAGE);
  });
}

function uploadGalleryPhoto(id, input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    resizeImage(e.target.result, 800, function(dataUrl) {
      db.ref("gallery/" + id + "/photo").set(dataUrl).then(function() {
        showToast("Photo saved ✦");
      });
    });
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function saveGalleryCaption(id, text) {
  db.ref("gallery/" + id + "/caption").set(text).then(function() {
    showToast("Saved ✦");
  });
}

function deleteGalleryItem(id) {
  if (!confirm("Delete this gallery page?")) return;
  db.ref("gallery/" + id).remove();
}
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
