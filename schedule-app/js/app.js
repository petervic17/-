(function () {
  const LA = window.LifeApp;

  const TITLES = {
    daily: "每日事項",
    notes: "記事本",
    calendar: "行事曆",
    goals: "長期目標",
  };

  let data = LA.loadData();
  let currentTab = "daily";

  const pageTitle = document.getElementById("pageTitle");
  const btnAdd = document.getElementById("btnAdd");
  const navItems = document.querySelectorAll(".nav-item");
  const panels = document.querySelectorAll(".panel");

  function persist() {
    LA.saveData(data);
  }

  function switchTab(tab) {
    if (!TITLES[tab]) return;
    currentTab = tab;
    pageTitle.textContent = TITLES[tab];
    navItems.forEach(function (n) {
      const active = n.getAttribute("data-tab") === tab;
      n.classList.toggle("active", active);
      if (active) n.setAttribute("aria-current", "page");
      else n.removeAttribute("aria-current");
    });
    panels.forEach(function (p) {
      p.classList.toggle("active", p.getAttribute("data-panel") === tab);
    });
    LA.saveLastTab(tab);
  }

  navItems.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchTab(btn.getAttribute("data-tab"));
    });
  });

  btnAdd.addEventListener("click", function () {
    switch (currentTab) {
      case "daily":
        LA.openAddDaily();
        break;
      case "notes":
        LA.openAddNote();
        break;
      case "calendar":
        LA.openAddEvent(LA.getSelectedCalendarDate());
        break;
      case "goals":
        LA.openAddGoal();
        break;
    }
  });

  document.getElementById("modalBody").addEventListener("click", function (e) {
    if (e.target.id === "btnAddMilestone") {
      const container = document.getElementById("milestoneRows");
      if (!container) return;
      const row = document.createElement("div");
      row.className = "milestone-row";
      row.innerHTML =
        '<input type="checkbox" name="milestoneDone" title="完成">' +
        '<input type="text" name="milestone" placeholder="新里程碑">' +
        '<button type="button" class="btn-remove-ms" data-remove-ms aria-label="移除">×</button>';
      container.appendChild(row);
    }
    if (e.target.closest("[data-remove-ms]")) {
      const row = e.target.closest(".milestone-row");
      if (row) row.remove();
    }
  });

  window.addEventListener("beforeunload", function () {
    LA.saveData(data);
  });

  LA.initDaily(data, persist);
  LA.initNotes(data, persist);
  LA.initCalendar(data, persist);
  LA.initGoals(data, persist);

  const savedTab = LA.loadLastTab();
  switchTab(savedTab && TITLES[savedTab] ? savedTab : "daily");
})();
