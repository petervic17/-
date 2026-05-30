(function (global) {
  const LA = (global.LifeApp = global.LifeApp || {});

  let dataRef = null;
  let onChange = null;
  const goalsList = document.getElementById("goalsList");

  LA.initGoals = function (data, persist) {
    dataRef = data;
    onChange = persist;

    goalsList.addEventListener("click", function (e) {
      const item = e.target.closest(".list-item[data-id]");
      if (item) openEdit(item.getAttribute("data-id"));
    });

    render();
  };

  function render() {
    const goals = dataRef.goals.slice().sort(function (a, b) {
      return (b.progress || 0) - (a.progress || 0);
    });

    goalsList.innerHTML = goals
      .map(function (g) {
        const ms = g.milestones || [];
        const doneCount = ms.filter(function (m) {
          return m.done;
        }).length;
        let msHtml = "";
        if (ms.length > 0) {
          msHtml =
            '<ul class="milestone-list">' +
            ms
              .map(function (m) {
                return (
                  '<li class="' +
                  (m.done ? "done" : "") +
                  '">' +
                  (m.done ? "✓" : "○") +
                  " " +
                  LA.escapeHtml(m.title) +
                  "</li>"
                );
              })
              .join("") +
            "</ul>";
        }
        const progress = g.progress != null ? g.progress : 0;
        const width = Math.min(100, Math.max(0, progress));
        return (
          '<li class="list-item goal-card" data-id="' +
          g.id +
          '">' +
          '<div class="goal-header"><h3 class="goal-title">' +
          LA.escapeHtml(g.title) +
          "</h3>" +
          (g.targetDate
            ? '<span class="goal-deadline">目標 ' +
              LA.formatDateZh(g.targetDate) +
              "</span>"
            : "") +
          "</div>" +
          '<div class="progress-wrap"><div class="progress-label"><span>進度</span><span>' +
          progress +
          "%" +
          (ms.length ? " · 里程碑 " + doneCount + "/" + ms.length : "") +
          '</span></div><div class="progress-bar"><div class="progress-fill" style="width:' +
          width +
          '%"></div></div></div>' +
          (g.description
            ? '<p class="daily-meta">' + LA.escapeHtml(g.description) + "</p>"
            : "") +
          msHtml +
          "</li>"
        );
      })
      .join("");
  }

  LA.openAddGoal = function () {
    LA.openModal({
      title: "新增長期目標",
      bodyHtml: goalFormHtml({
        title: "",
        description: "",
        targetDate: "",
        progress: 0,
        milestones: [],
      }),
      showDelete: false,
      save: function (form) {
        dataRef.goals.push({
          id: LA.uid(),
          title: form.title.trim(),
          description: (form.description && form.description.trim()) || "",
          targetDate: form.targetDate || "",
          progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
          milestones: collectMilestonesFromModal(),
          createdAt: new Date().toISOString(),
        });
        onChange();
        render();
      },
    });
  };

  function openEdit(id) {
    const goal = dataRef.goals.find(function (x) {
      return x.id === id;
    });
    if (!goal) return;
    LA.openModal({
      title: "編輯目標",
      bodyHtml: goalFormHtml(goal),
      showDelete: true,
      save: function (form) {
        goal.title = form.title.trim();
        goal.description = (form.description && form.description.trim()) || "";
        goal.targetDate = form.targetDate || "";
        goal.progress = Math.min(100, Math.max(0, Number(form.progress) || 0));
        goal.milestones = collectMilestonesFromModal(goal.milestones);
        onChange();
        render();
      },
      del: function () {
        dataRef.goals = dataRef.goals.filter(function (x) {
          return x.id !== id;
        });
        onChange();
        render();
      },
    });
  }

  function collectMilestonesFromModal(existing) {
    existing = existing || [];
    const rows =
      document.getElementById("modalBody").querySelectorAll(".milestone-row");
    const result = [];
    rows.forEach(function (row, i) {
      const titleInput = row.querySelector('input[name="milestone"]');
      const title = titleInput && titleInput.value.trim();
      if (!title) return;
      const doneInput = row.querySelector('input[name="milestoneDone"]');
      result.push({
        id: (existing[i] && existing[i].id) || LA.uid(),
        title: title,
        done: !!(doneInput && doneInput.checked),
      });
    });
    return result;
  }

  function goalFormHtml(goal) {
    const ms = goal.milestones || [];
    const msRows = ms
      .map(function (m, i) {
        return (
          '<div class="milestone-row">' +
          '<input type="checkbox" name="milestoneDone"' +
          (m.done ? " checked" : "") +
          ' title="完成">' +
          '<input type="text" name="milestone" value="' +
          LA.escapeHtml(m.title) +
          '" placeholder="里程碑 ' +
          (i + 1) +
          '">' +
          '<button type="button" class="btn-remove-ms" data-remove-ms aria-label="移除">×</button></div>'
        );
      })
      .join("");

    return (
      LA.field(
        "目標名稱",
        '<input name="title" required value="' +
          LA.escapeHtml(goal.title || "") +
          '" placeholder="例如：通過檢定、存到 10 萬">'
      ) +
      LA.field(
        "說明",
        '<textarea name="description" placeholder="為什麼想達成這個目標？">' +
          LA.escapeHtml(goal.description || "") +
          "</textarea>"
      ) +
      '<div class="field-row">' +
      LA.field(
        "目標日期",
        '<input type="date" name="targetDate" value="' + (goal.targetDate || "") + '">'
      ) +
      LA.field(
        "進度 %",
        '<input type="number" name="progress" min="0" max="100" value="' +
          (goal.progress != null ? goal.progress : 0) +
          '">'
      ) +
      "</div>" +
      '<div class="field milestones-editor"><label>里程碑（可勾選完成）</label>' +
      '<div id="milestoneRows">' +
      msRows +
      '</div><button type="button" class="btn-add-ms" id="btnAddMilestone">＋ 新增里程碑</button></div>'
    );
  }
})(window);
