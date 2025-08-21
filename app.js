(function () {
  const prizes = [
    "Add on course",
    "Prompt Engineering Program",
    "Onam Career Kit",
    "Cashback",
    "Better Luck Next time",
    "Onam Hamper"
  ];

  const colors = [
    "#f94144",
    "#f3722c",
    "#f8961e",
    "#90be6d",
    "#43aa8b",
    "#577590"
  ];

  const registrationSection = document.getElementById("registrationSection");
  const registrationForm = document.getElementById("registrationForm");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const alreadySpunMsg = document.getElementById("alreadySpunMsg");

  const wheelSection = document.getElementById("wheelSection");
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  const spinBtn = document.getElementById("spinBtn");
  const resultText = document.getElementById("resultText");
  const thankYou = document.getElementById("thankYou");

  const toggleAdminBtn = document.getElementById("toggleAdmin");
  const adminSection = document.getElementById("adminSection");
  const spinsTableBody = document.querySelector("#spinsTable tbody");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const TWO_PI = Math.PI * 2;
  const segmentAngle = TWO_PI / prizes.length;
  let currentRotation = 0;
  let isSpinning = false;
  let isAdmin = false;

  // Remote sync to Google Apps Script (sends email to rp2onlineweb@gmail.com)
  const REMOTE_ENDPOINT = "https://script.google.com/macros/s/AKfycbw4BgXPKIQ3cPH6UZzg-io5M7aY721AJ4gXOe7H5BqAe1TaaJQN19Nefgy9gMwX7OaI/exec";
  const REMOTE_SECRET = "MySpinPoleSecret_2025!@#";

  function getRecords() {
    try {
      const raw = localStorage.getItem("spin_records");
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem("spin_records", JSON.stringify(records));
  }

  function findRecordByEmail(email) {
    const records = getRecords();
    return records.find(r => r.email.toLowerCase() === email.toLowerCase());
  }

  function addRecord(record) {
    const records = getRecords();
    records.push(record);
    saveRecords(records);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function drawWheel(rotation) {
    const radius = canvas.width / 2;
    const centerX = radius;
    const centerY = radius;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer ring
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    for (let i = 0; i < prizes.length; i++) {
      const startAngle = i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      // slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 8, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // divider line
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo((radius - 8) * Math.cos(endAngle), (radius - 8) * Math.sin(endAngle));
      ctx.stroke();

      // label
      const labelAngle = startAngle + segmentAngle / 2;
      ctx.save();
      ctx.rotate(labelAngle);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      const text = prizes[i];
      wrapFillText(ctx, text, radius - 28, 0, 160);
      ctx.restore();
    }

    // center hub
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, TWO_PI);
    ctx.fillStyle = "#111520";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.stroke();

    // center circle highlight
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, TWO_PI);
    ctx.fillStyle = "#1a1f2e";
    ctx.fill();

    ctx.restore();
  }

  function wrapFillText(context, text, x, y, maxWidth) {
    const words = text.split(" ");
    let line = "";
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + (line ? " " : "") + words[n];
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    const lineHeight = 20;
    const totalHeight = lineHeight * (lines.length - 1);
    for (let i = 0; i < lines.length; i++) {
      context.fillText(lines[i], x, y - totalHeight / 2 + i * lineHeight);
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function indexFromRotation(rotation) {
    const pointerAngle = -Math.PI / 2;
    const angleAtPointerInWheel = ((pointerAngle - rotation) % TWO_PI + TWO_PI) % TWO_PI;
    const epsilon = 1e-6;
    const index = Math.floor((angleAtPointerInWheel + epsilon) / segmentAngle) % prizes.length;
    return index;
  }

  function spinWheel(onComplete) {
    if (isSpinning) return;
    isSpinning = true;
    resultText.textContent = "";
    thankYou.classList.add("hidden");
    spinBtn.disabled = true;
    spinBtn.textContent = "Spinning...";

    // choose random prize index to determine target rotation
    const selectedIndex = Math.floor(Math.random() * prizes.length);
    const extraTurns = 6 + Math.random() * 3; // 6-9 turns
    const targetBase = -Math.PI / 2 - (selectedIndex * segmentAngle + segmentAngle / 2);
    const targetRotation = targetBase + extraTurns * TWO_PI;

    const start = performance.now();
    const duration = 4500; // ms
    const startRotation = currentRotation;

    function frame(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const rotation = startRotation + (targetRotation - startRotation) * eased;
      drawWheel(rotation);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        // normalize to the actual final rotation (includes fractional turns)
        currentRotation = ((targetRotation % TWO_PI) + TWO_PI) % TWO_PI;
        isSpinning = false;
        spinBtn.textContent = "Spin the Wheel";
        const finalIndex = indexFromRotation(currentRotation);
        if (typeof onComplete === "function") onComplete(finalIndex);
      }
    }
    requestAnimationFrame(frame);
  }

  function renderAdmin() {
    const records = getRecords();
    spinsTableBody.innerHTML = "";
    records.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td><span class="prize-badge">${escapeHtml(r.prize)}</span></td>
        <td>${formatDate(r.timestamp)}</td>
      `;
      spinsTableBody.appendChild(tr);
    });
  }

  function exportCsv() {
    const records = getRecords();
    const header = ["Name", "Email", "Prize", "Timestamp"];
    const rows = records.map(r => [r.name, r.email, r.prize, r.timestamp]);
    const csv = [header, ...rows]
      .map(cols => cols.map(csvEscape).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onam_spins_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"]/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    })[s]);
  }

  function showSection(id, show) {
    const el = document.getElementById(id);
    if (show) el.classList.remove("hidden"); else el.classList.add("hidden");
  }

  function initWheel() {
    drawWheel(currentRotation);
  }

  // Event wiring
  registrationForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name || !email) return;

    const existing = findRecordByEmail(email);
    if (existing) {
      alreadySpunMsg.textContent = `You have already spun and won: ${existing.prize} on ${formatDate(existing.timestamp)}`;
      alreadySpunMsg.classList.remove("hidden");
      showSection("wheelSection", true);
      spinBtn.disabled = true;
      spinBtn.textContent = "Already Spun";
      resultText.textContent = `Your prize: ${existing.prize}`;
      thankYou.classList.remove("hidden");
      return;
    }

    // Allow spin now
    showSection("wheelSection", true);
    spinBtn.disabled = false;
    spinBtn.textContent = "Spin the Wheel";
    alreadySpunMsg.classList.add("hidden");
    wheelSection.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  spinBtn.addEventListener("click", function () {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name || !email) return;

    const existing = findRecordByEmail(email);
    if (existing) {
      resultText.textContent = `Already spun: ${existing.prize}`;
      spinBtn.disabled = true;
      spinBtn.textContent = "Already Spun";
      thankYou.classList.remove("hidden");
      return;
    }

    spinWheel(function (selectedIndex) {
      const prize = prizes[selectedIndex];
      resultText.textContent = `🎉 You won: ${prize}`;
      thankYou.classList.remove("hidden");
      spinBtn.disabled = true;
      spinBtn.textContent = "Completed";
      const record = {
        name,
        email,
        prize,
        timestamp: new Date().toISOString()
      };
      addRecord(record);
      renderAdmin();
      pushRecordRemote(record); // Add remote sync here
    });
  });

  toggleAdminBtn.addEventListener("click", function () {
    const willShow = adminSection.classList.contains("hidden");
    if (willShow && !isAdmin) {
      const input = prompt("Enter admin email to access reports:");
      if (!input || input.trim().toLowerCase() !== "rp2onlineweb@gmail.com") {
        alert("Access denied. Admin email does not match.");
        return;
      }
      isAdmin = true;
    }
    showSection("adminSection", willShow);
    if (willShow) {
      renderAdmin();
    }
  });

  exportCsvBtn.addEventListener("click", function () {
    if (!isAdmin) {
      alert("Only admin can download reports.");
      return;
    }
    exportCsv();
  });

  clearAllBtn.addEventListener("click", function () {
    if (confirm("This will remove all local spin records. Continue?")) {
      localStorage.removeItem("spin_records");
      renderAdmin();
      alert("All records cleared successfully.");
    }
  });

  // Remote sync functions
  async function pushRecordRemote(record) {
    if (!REMOTE_ENDPOINT || !REMOTE_SECRET) return;
    try {
      await fetch(REMOTE_ENDPOINT + "?action=add", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: REMOTE_SECRET, ...record })
      });
    } catch (_) {}
  }

  // Initialize
  initWheel();
})();