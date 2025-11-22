// static/js/leaderboard.js
document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("leaderboard-body");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("search-input");
  const myRankBox = document.getElementById("my-rank-box");
  const btnRefresh = document.getElementById("btn-refresh");
  const btnTop10 = document.getElementById("btn-top10");

  let currentPage = 1;
  let perPage = 15;
  let searchQuery = "";

  function formatDate(s) {
    return s || "N/A";
  }

  function renderRows(rows) {
    tbody.innerHTML = "";
    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3">No data available.</td></tr>`;
      return;
    }
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.rank}</td>
        <td>${r.username}</td>
        <td>${r.accuracy}%</td>
        <td>${r.total_correct}</td>
        <td>${r.total_questions}</td>
        <td>${r.total_quizzes}</td>
        <td>${formatDate(r.last_active)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderPagination(total, page) {
    pagination.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    // Simple: show up to 7 page buttons centered around current
    const maxButtons = 7;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

    // Prev
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-sm btn-outline-primary";
    prevBtn.textContent = "Prev";
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener("click", () => loadLeaderboard(page - 1));
    pagination.appendChild(prevBtn);

    for (let i = start; i <= end; i++) {
      const b = document.createElement("button");
      b.className = `btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline-primary'}`;
      b.textContent = i;
      b.dataset.page = i;
      b.addEventListener("click", () => loadLeaderboard(i));
      pagination.appendChild(b);
    }

    // Next
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-sm btn-outline-primary";
    nextBtn.textContent = "Next";
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener("click", () => loadLeaderboard(page + 1));
    pagination.appendChild(nextBtn);
  }

  async function loadLeaderboard(page = 1) {
    currentPage = page;
    const q = encodeURIComponent(searchQuery || "");
    try {
      const res = await fetch(`/api/leaderboard?page=${page}&per_page=${perPage}&search=${q}`);
      const data = await res.json();
      if (!data.success) {
        renderRows([]);
        myRankBox.innerHTML = `<div class="alert alert-warning p-2 mb-0">Could not load leaderboard.</div>`;
        return;
      }
      renderRows(data.leaderboard || []);
      renderPagination(data.total || 0, page);
      loadMyRank(); // update the my-rank box
    } catch (err) {
      console.error("Leaderboard error:", err);
      renderRows([]);
      myRankBox.innerHTML = `<div class="alert alert-danger p-2 mb-0">Error loading data.</div>`;
    }
  }

  async function loadMyRank() {
    try {
      const ures = await fetch("/api/user-info");
      const udata = await ures.json();
      if (!udata.success) {
        myRankBox.innerHTML = `<div class="alert alert-secondary p-2 mb-0">Sign in to see your rank</div>`;
        return;
      }
      const res = await fetch(`/api/leaderboard?per_page=9999`);
      const data = await res.json();
      if (!data.success) {
        myRankBox.innerHTML = `<div class="alert alert-warning p-2 mb-0">Rank unavailable</div>`;
        return;
      }
      const rows = data.leaderboard || [];
      const me = rows.find(r => r.user_id === udata.id);
      if (me) {
        myRankBox.innerHTML = `
          <div class="card p-2">
            <div class="small text-muted">Your rank</div>
            <div class="h5 mb-0">#${me.rank} — ${me.username}</div>
            <div class="small mt-1">Accuracy: <strong>${me.accuracy}%</strong> • Correct: <strong>${me.total_correct}</strong></div>
          </div>
        `;
      } else {
        myRankBox.innerHTML = `<div class="alert alert-info p-2 mb-0">You are not ranked yet. Try taking quizzes!</div>`;
      }
    } catch (e) {
      console.error("My rank error:", e);
      myRankBox.innerHTML = `<div class="alert alert-secondary p-2 mb-0">Unable to fetch rank</div>`;
    }
  }

  // UI actions
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    // small debounce
    if (window._lb_search_timeout) clearTimeout(window._lb_search_timeout);
    window._lb_search_timeout = setTimeout(() => loadLeaderboard(1), 300);
  });

  btnRefresh.addEventListener("click", () => loadLeaderboard(currentPage));

  btnTop10.addEventListener("click", () => {
    perPage = 10;
    loadLeaderboard(1);
    // after a short delay revert perPage to default so pagination behaves normally
    setTimeout(() => { perPage = 15; }, 1000);
  });

  // initial load
  loadLeaderboard(1);
});
