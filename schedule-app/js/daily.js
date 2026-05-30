(function (global) {
  const LA = (global.LifeApp = global.LifeApp || {});

  const WEEKDAYS = [
    { value: 1, label: "一" },
    { value: 2, label: "二" },
    { value: 3, label: "三" },
    { value: 4, label: "四" },
    { value: 5, label: "五" },
    { value: 6, label: "六" },
    { value: 0, label: "日" },
  ];

  const QUICK_WEEKDAY = [1, 2, 3, 4, 5];
  const QUICK_WEEKEND = [6, 0];

  let dataRef = null;
  let onChange = null;
  let selectedDate = LA.todayISO();

  const dailyDate = document.getElementById("dailyDate");
  const dailyList = document.getElementById("dailyList");
  const dailyHint = document.getElementById("dailyHint");
  const dailyPrevDay = document.getElementById("dailyPrevDay");
  const dailyNextDay = document.getElementById("dailyNextDay");

  function isRecurring(task) {
    return task.repeatDays && task.repeatDays.length > 0;
  }

  function weekdayFromISO(iso) {
    return LA.getWeekdayFromISO(iso);
  }

  function matchesDate(task, iso) {
    if (isRecurring(task)) {
      if (task.repeatDays.indexOf(weekdayFromISO(iso)) === -1) return false;
      const start = task.repeatStart || task.date;
      if (start && iso < start) return false;
      if (task.repeatEnd && iso > task.repeatEnd) return false;
      return true;
    }
    return task.date === iso;
  }

  function isDoneOn(task, iso) {
    if (isRecurring(task)) {
      return !!(task.doneOn && task.doneOn[iso]);
    }
    return !!task.done;
  }

  function setDoneOn(task, iso, done) {
    if (isRecurring(task)) {
      if (!task.doneOn) task.doneOn = {};
      if (done) task.doneOn[iso] = true;
      else delete task.doneOn[iso];
    } else {
      task.done = done;
    }
  }

  function formatRepeatDays(days) {
    if (!days || !days.length) return "";
    const labels = { 0: "日", 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六" };
    const sorted = days.slice().sort(function (a, b) {
      const order = function (d) {
        return d === 0 ? 7 : d;
      };
      return order(a) - order(b);
    });
    return "每週" + sorted.map(function (d) {
      return labels[d];
    }).join("、");
  }

  function formatTimeRange(start, end) {
    const s = LA.formatTime24(start);
    const e = LA.formatTime24(end);
    if (s && e) return s + " – " + e;
    if (s) return s + " 起";
    return "";
  }

  function taskMetaLine(task) {
    const parts = [];
    const time = formatTimeRange(task.startTime, task.endTime);
    if (time) parts.push(time);
    if (isRecurring(task)) parts.push(formatRepeatDays(task.repeatDays));
    if (task.note) parts.push(task.note);
    return parts.join(" · ");
  }

  function setRepeatDayChecks(days) {
    const modalBody = document.getElementById("modalBody");
    if (!modalBody) return;
    modalBody.querySelectorAll('[name="repeatDay"]').forEach(function (cb) {
      cb.checked = days.indexOf(Number(cb.value)) !== -1;
    });
  }

  function syncDailyFormPanels() {
    const modalBody = document.getElementById("modalBody");
    if (!modalBody) return;
    const sel = modalBody.querySelector('[name="scheduleType"]');
    const onceBlock = document.getElementById("dailyOnceFields");
    const repeatBlock = document.getElementById("dailyRepeatFields");
    if (!sel || !onceBlock || !repeatBlock) return;
    const isRepeat = sel.value === "repeat";
    onceBlock.hidden = isRepeat;
    repeatBlock.hidden = !isRepeat;
  }

  LA.bindDailyForm = syncDailyFormPanels;

  function bindDailyFormDelegation() {
    if (LA._dailyFormDelegationBound) return;
    LA._dailyFormDelegationBound = true;

    const modalBody = document.getElementById("modalBody");
    modalBody.addEventListener("change", function (e) {
      if (e.target.name === "scheduleType") syncDailyFormPanels();
    });
    modalBody.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-quick-days]");
      if (!btn) return;
      const key = btn.getAttribute("data-quick-days");
      if (key === "weekday") setRepeatDayChecks(QUICK_WEEKDAY);
      else if (key === "weekend") setRepeatDayChecks(QUICK_WEEKEND);
    });
  }

  function applyFormToTask(task, form, isNew) {
    const title = (form.title && form.title.trim()) || "";
    if (!title) {
      alert("請輸入事項名稱");
      return false;
    }
    task.title = title;
    task.note = (form.note && form.note.trim()) || "";
    task.priority = form.priority || "normal";

    if (form.scheduleType === "repeat") {
      const days = form.repeatDay || [];
      if (!days.length) {
        alert("請至少選擇一個重複的星期");
        return false;
      }
      task.repeatDays = days.slice().sort();
      task.startTime = form.startTime || "";
      task.endTime = form.endTime || "";
      task.repeatStart = form.repeatStart || selectedDate;
      task.repeatEnd = form.repeatEnd || "";
      task.date = task.repeatStart;
      if (isNew) task.doneOn = {};
      delete task.done;
    } else {
      task.date = form.date;
      task.done = isNew ? false : !!task.done;
      delete task.repeatDays;
      delete task.startTime;
      delete task.endTime;
      delete task.repeatStart;
      delete task.repeatEnd;
      delete task.doneOn;
    }
    return true;
  }

  LA.initDaily = function (data, persist) {
    dataRef = data;
    onChange = persist;
    bindDailyFormDelegation();

    dailyDate.value = selectedDate;
    dailyDate.addEventListener("change", function () {
      selectedDate = dailyDate.value;
      render();
    });
    dailyPrevDay.addEventListener("click", function () {
      goToDate(LA.shiftISO(selectedDate, -1));
    });
    dailyNextDay.addEventListener("click", function () {
      goToDate(LA.shiftISO(selectedDate, 1));
    });
    document.getElementById("dailyToday").addEventListener("click", function () {
      goToDate(LA.todayISO());
    });

    dailyList.addEventListener("change", function (e) {
      if (!e.target.matches("[data-toggle]")) return;
      const id = e.target.getAttribute("data-toggle");
      const task = dataRef.daily.find(function (x) {
        return x.id === id;
      });
      if (task) {
        setDoneOn(task, selectedDate, e.target.checked);
        onChange();
        render();
      }
    });
    dailyList.addEventListener("click", function (e) {
      if (e.target.matches("[data-toggle]")) return;
      const item = e.target.closest(".list-item[data-id]");
      if (item) openEdit(item.getAttribute("data-id"));
    });

    render();
  };

  function goToDate(iso) {
    selectedDate = iso;
    dailyDate.value = selectedDate;
    render();
  }

  function render() {
    const today = LA.todayISO();
    if (selectedDate === today) {
      dailyHint.textContent = "今天";
    } else if (selectedDate < today) {
      dailyHint.textContent = "已過去的日期";
    } else {
      dailyHint.textContent = LA.formatDateZh(selectedDate);
    }

    const items = dataRef.daily
      .filter(function (t) {
        return matchesDate(t, selectedDate);
      })
      .sort(function (a, b) {
        const da = isDoneOn(a, selectedDate);
        const db = isDoneOn(b, selectedDate);
        if (da !== db) return da ? 1 : -1;
        const ta = a.startTime || "99:99";
        const tb = b.startTime || "99:99";
        return ta.localeCompare(tb);
      });

    dailyList.innerHTML = items
      .map(function (t) {
        const done = isDoneOn(t, selectedDate);
        const meta = taskMetaLine(t);
        return (
          '<li class="list-item daily-item ' +
          (done ? "done " : "") +
          (t.priority === "high" ? "priority-high" : "") +
          (isRecurring(t) ? " daily-recurring" : "") +
          '" data-id="' +
          t.id +
          '">' +
          '<input type="checkbox" ' +
          (done ? "checked " : "") +
          'aria-label="完成" data-toggle="' +
          t.id +
          '">' +
          "<div>" +
          '<p class="daily-title">' +
          LA.escapeHtml(t.title) +
          (isRecurring(t) ? ' <span class="daily-badge">重複</span>' : "") +
          "</p>" +
          (meta ? '<p class="daily-meta">' + LA.escapeHtml(meta) + "</p>" : "") +
          "</div></li>"
        );
      })
      .join("");

  }

  LA.openAddDaily = function () {
    LA.openModal({
      title: "新增每日事項",
      bodyHtml: dailyFormHtml({
        date: selectedDate,
        scheduleType: "once",
        repeatDays: [],
        repeatStart: selectedDate,
      }),
      showDelete: false,
      onOpen: LA.bindDailyForm,
      save: function (form) {
        const task = {
          id: LA.uid(),
          createdAt: new Date().toISOString(),
        };
        if (!applyFormToTask(task, form, true)) return false;
        dataRef.daily.push(task);
        onChange();
        if (!isRecurring(task) && form.date !== selectedDate) {
          selectedDate = form.date;
          dailyDate.value = selectedDate;
        }
        render();
      },
    });
  };

  function openEdit(id) {
    const task = dataRef.daily.find(function (x) {
      return x.id === id;
    });
    if (!task) return;
    LA.openModal({
      title: "編輯事項",
      bodyHtml: dailyFormHtml(task),
      showDelete: true,
      onOpen: LA.bindDailyForm,
      save: function (form) {
        if (!applyFormToTask(task, form, false)) return false;
        onChange();
        render();
      },
      del: function () {
        dataRef.daily = dataRef.daily.filter(function (x) {
          return x.id !== id;
        });
        onChange();
        render();
      },
    });
  }

  function weekdayChecksHtml(selected) {
    selected = selected || [];
    return (
      '<div class="weekday-picker">' +
      WEEKDAYS.map(function (w) {
        const checked = selected.indexOf(w.value) !== -1 ? " checked" : "";
        return (
          '<label class="weekday-chip">' +
          '<input type="checkbox" name="repeatDay" value="' +
          w.value +
          '"' +
          checked +
          ">" +
          "<span>週" +
          w.label +
          "</span></label>"
        );
      }).join("") +
      "</div>"
    );
  }

  function dailyFormHtml(task) {
    const recurring = isRecurring(task);
    const scheduleType = recurring ? "repeat" : "once";
    const repeatDays = task.repeatDays || [];

    return (
      LA.field(
        "事項",
        '<input name="title" required value="' +
          LA.escapeHtml(task.title || "") +
          '" placeholder="例如：晚間學習">'
      ) +
      LA.field(
        "類型",
        '<select name="scheduleType">' +
          '<option value="once"' +
          (scheduleType === "once" ? " selected" : "") +
          ">單日</option>" +
          '<option value="repeat"' +
          (scheduleType === "repeat" ? " selected" : "") +
          ">每週重複</option></select>"
      ) +
      '<div id="dailyOnceFields"' +
      (scheduleType === "repeat" ? " hidden" : "") +
      ">" +
      LA.field(
        "日期",
        '<input type="date" name="date" value="' + (task.date || selectedDate) + '">'
      ) +
      "</div>" +
      '<div id="dailyRepeatFields"' +
      (scheduleType === "once" ? " hidden" : "") +
      ">" +
      '<div class="field"><label>重複星期（可多選）</label>' +
      '<div class="weekday-quick">' +
      '<button type="button" class="btn-quick-week" data-quick-days="weekday">平日</button>' +
      '<button type="button" class="btn-quick-week" data-quick-days="weekend">假日</button>' +
      "</div>" +
      weekdayChecksHtml(repeatDays) +
      '<p class="field-hint">點「平日」或「假日」可快速選取，也可個別勾選星期</p></div>' +
      '<div class="field-row">' +
      LA.timeField("開始時間", "startTime", task.startTime || "") +
      LA.timeField("結束時間", "endTime", task.endTime || "") +
      "</div>" +
      '<div class="field-row">' +
      LA.field(
        "開始日期",
        '<input type="date" name="repeatStart" value="' +
          (task.repeatStart || task.date || selectedDate) +
          '">'
      ) +
      LA.field(
        "結束日期",
        '<input type="date" name="repeatEnd" value="' +
          (task.repeatEnd || "") +
          '" placeholder="選填">'
      ) +
      "</div>" +
      '<p class="field-hint">結束日期留空表示持續重複</p></div>' +
      '<div class="field-row">' +
      LA.field(
        "優先",
        '<select name="priority">' +
          '<option value="normal"' +
          (task.priority !== "high" ? " selected" : "") +
          ">一般</option>" +
          '<option value="high"' +
          (task.priority === "high" ? " selected" : "") +
          ">重要</option></select>"
      ) +
      "</div>" +
      LA.field(
        "備註",
        '<textarea name="note" placeholder="選填">' +
          LA.escapeHtml(task.note || "") +
          "</textarea>"
      )
    );
  }
})(window);
