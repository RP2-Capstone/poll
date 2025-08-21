(function () {
  const prizes = [
    "Add-on course",
    "Prompt Engineering Program",
    "Onam Career Kit",
    "5% Cashback",
    "10% Cashback",
    "15% Cashback",
    "Better luck next time",
    "Onam Hamper"
  ];

  const colors = [
    "#f94144",
    "#f3722c",
    "#f8961e",
    "#90be6d",
    "#43aa8b",
    "#577590",
    "#9b5de5",
    "#f9c74f"
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
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo((radius - 8) * Math.cos(endAngle), (radius - 8) * Math.sin(endAngle));
      ctx.stroke();

      // label
      const labelAngle = startAngle + segmentAngle / 2;
      ctx.save();
      ctx.rotate(labelAngle);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const text = prizes[i];
      wrapFillText(ctx, text, radius - 24, 0, 150);
      ctx.restore();
    }

    // center hub
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, TWO_PI);
    ctx.fillStyle = "#111520";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.stroke();

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
    const lineHeight = 18;
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

    // choose random prize index to determine target rotation
    const selectedIndex = Math.floor(Math.random() * prizes.length);
    const extraTurns = 5 + Math.random() * 2; // 5-7 turns
    const targetBase = -Math.PI / 2 - (selectedIndex * segmentAngle + segmentAngle / 2);
    const targetRotation = targetBase + extraTurns * TWO_PI;

    const start = performance.now();
    const duration = 5200; // ms
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
        <td>${escapeHtml(r.prize)}</td>
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
    a.download = `spins_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
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
      resultText.textContent = `Your prize: ${existing.prize}`;
      thankYou.classList.remove("hidden");
      return;
    }

    // Allow spin now
    showSection("wheelSection", true);
    spinBtn.disabled = false;
    registrationSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  spinBtn.addEventListener("click", function () {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name || !email) return;

    const existing = findRecordByEmail(email);
    if (existing) {
      resultText.textContent = `Already spun: ${existing.prize}`;
      spinBtn.disabled = true;
      thankYou.classList.remove("hidden");
      return;
    }

    spinWheel(function (selectedIndex) {
      const prize = prizes[selectedIndex];
      resultText.textContent = `You won: ${prize}`;
      thankYou.classList.remove("hidden");
      spinBtn.disabled = true;
      const record = {
        name,
        email,
        prize,
        timestamp: new Date().toISOString()
      };
      addRecord(record);
      renderAdmin();
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
    }
  });

  // Utilities re-used
  function findRecordByEmail(email) {
    const records = getRecords();
    return records.find(r => r.email.toLowerCase() === email.toLowerCase());
  }

  // Initialize
  initWheel();
})();


