(function (global) {
  const LA = (global.LifeApp = global.LifeApp || {});

  let dataRef = null;
  let onChange = null;
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  let selectedDay = LA.todayISO();

  const calMonthLabel = document.getElementById("calMonthLabel");
  const calGrid = document.getElementById("calGrid");
  const calDayDetail = document.getElementById("calDayDetail");
  const calDayTitle = document.getElementById("calDayTitle");
  const calEventList = document.getElementById("calEventList");
  const calHolidayBanner = document.getElementById("calHolidayBanner");
  const calPrevMonth = document.getElementById("calPrevMonth");
  const calNextMonth = document.getElementById("calNextMonth");

  const CATEGORIES = {
    work: "工作",
    personal: "個人",
    study: "學習",
    other: "其他",
  };

  LA.initCalendar = function (data, persist) {
    dataRef = data;
    onChange = persist;
    calPrevMonth.addEventListener("click", function () {
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderMonth();
    });
    calNextMonth.addEventListener("click", function () {
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderMonth();
    });
    document.getElementById("calToday").addEventListener("click", function () {
      const today = LA.todayISO();
      const parts = today.split("-").map(Number);
      viewYear = parts[0];
      viewMonth = parts[1] - 1;
      selectedDay = today;
      renderMonth();
    });

    calGrid.addEventListener("click", function (e) {
      const cell = e.target.closest(".cal-cell");
      if (cell) selectDay(cell.getAttribute("data-date"));
    });
    calEventList.addEventListener("click", function (e) {
      const item = e.target.closest(".list-item[data-id]");
      if (item) openEditEvent(item.getAttribute("data-id"));
    });

    renderMonth();
  };

  function renderMonth() {
    calMonthLabel.textContent = viewYear + "年" + (viewMonth + 1) + "月";

    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();

    const eventsByDate = {};
    dataRef.events.forEach(function (e) {
      if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
      eventsByDate[e.date].push(e);
    });
    Object.keys(eventsByDate).forEach(function (d) {
      eventsByDate[d].sort(function (a, b) {
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
    });
    const today = LA.todayISO();
    const cells = [];

    const prevLast = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevLast - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push(cellHtml(d, toISO(y, m, d), true, eventsByDate, today));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(cellHtml(d, toISO(viewYear, viewMonth + 1, d), false, eventsByDate, today));
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 2 > 12 ? 1 : viewMonth + 2;
      const y = viewMonth + 2 > 12 ? viewYear + 1 : viewYear;
      cells.push(cellHtml(d, toISO(y, m, d), true, eventsByDate, today));
    }

    calGrid.innerHTML = cells.join("");
    selectDay(selectedDay);
  }

  function eventLabelsHtml(iso, eventsByDate) {
    const events = eventsByDate[iso];
    if (!events || !events.length) return "";
    const maxShow = 2;
    let html = "";
    for (let i = 0; i < Math.min(events.length, maxShow); i++) {
      html +=
        '<span class="cal-event-label">' + LA.escapeHtml(events[i].title) + "</span>";
    }
    if (events.length > maxShow) {
      html +=
        '<span class="cal-event-label cal-event-more">+' +
        (events.length - maxShow) +
        "</span>";
    }
    return html;
  }

  function cellHtml(day, iso, otherMonth, eventsByDate, today) {
    const classes = ["cal-cell"];
    if (otherMonth) classes.push("other-month");
    if (iso === today) classes.push("today");
    if (iso === selectedDay) classes.push("selected");
    if (LA.isRedCalendarDay(iso)) classes.push("cal-red");

    const holiday = LA.getTaiwanHoliday(iso);
    const holidayHtml = holiday
      ? '<span class="cal-holiday-label">' + LA.escapeHtml(holiday) + "</span>"
      : "";
    const eventHtml = eventLabelsHtml(iso, eventsByDate);
    if (holidayHtml || eventHtml) classes.push("cal-cell-labels");

    return (
      '<button type="button" class="' +
      classes.join(" ") +
      '" data-date="' +
      iso +
      '">' +
      '<span class="cal-day-num">' +
      day +
      "</span>" +
      holidayHtml +
      eventHtml +
      "</button>"
    );
  }

  function selectDay(iso) {
    selectedDay = iso;
    calGrid.querySelectorAll(".cal-cell").forEach(function (btn) {
      btn.classList.toggle("selected", btn.getAttribute("data-date") === iso);
    });
    calDayDetail.hidden = false;

    const holiday = LA.getTaiwanHoliday(iso);
    let titleText = LA.formatDateZh(iso);
    if (holiday) titleText += " · " + holiday;
    else if (LA.isWeekend(iso)) titleText += " · 例假";
    calDayTitle.textContent = titleText;

    if (holiday) {
      calHolidayBanner.hidden = false;
      calHolidayBanner.textContent = holiday;
    } else if (LA.isWeekend(iso)) {
      calHolidayBanner.hidden = false;
      calHolidayBanner.textContent = "例假（週末）";
    } else {
      calHolidayBanner.hidden = true;
      calHolidayBanner.textContent = "";
    }

    const events = dataRef.events
      .filter(function (e) {
        return e.date === iso;
      })
      .sort(function (a, b) {
        return (a.startTime || "").localeCompare(b.startTime || "");
      });

    calEventList.innerHTML = events
      .map(function (e) {
        return (
          '<li class="list-item event-item cat-' +
          (e.category || "other") +
          '" data-id="' +
          e.id +
          '">' +
          '<span class="event-time">' +
          timeLabel(e) +
          "</span>" +
          '<p class="event-title">' +
          LA.escapeHtml(e.title) +
          "</p>" +
          (e.note ? '<p class="daily-meta">' + LA.escapeHtml(e.note) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");
  }

  function timeLabel(e) {
    const s = LA.formatTime24(e.startTime);
    const end = LA.formatTime24(e.endTime);
    if (s && end) return s + " – " + end;
    if (s) return s;
    return "全天";
  }

  LA.openAddEvent = function (date) {
    const d = date || selectedDay;
    LA.openModal({
      title: "新增行程",
      bodyHtml: eventFormHtml({ date: d }),
      showDelete: false,
      save: function (form) {
        dataRef.events.push({
          id: LA.uid(),
          title: form.title.trim(),
          date: form.date,
          startTime: form.startTime || "",
          endTime: form.endTime || "",
          category: form.category || "other",
          note: (form.note && form.note.trim()) || "",
        });
        onChange();
        const prefix =
          viewYear + "-" + String(viewMonth + 1).padStart(2, "0");
        if (form.date.indexOf(prefix) === 0) {
          renderMonth();
        } else {
          const parts = form.date.split("-").map(Number);
          viewYear = parts[0];
          viewMonth = parts[1] - 1;
          renderMonth();
        }
        selectDay(form.date);
      },
    });
  };

  function openEditEvent(id) {
    const ev = dataRef.events.find(function (x) {
      return x.id === id;
    });
    if (!ev) return;
    LA.openModal({
      title: "編輯行程",
      bodyHtml: eventFormHtml(ev),
      showDelete: true,
      save: function (form) {
        ev.title = form.title.trim();
        ev.date = form.date;
        ev.startTime = form.startTime || "";
        ev.endTime = form.endTime || "";
        ev.category = form.category || "other";
        ev.note = (form.note && form.note.trim()) || "";
        onChange();
        renderMonth();
        selectDay(form.date);
      },
      del: function () {
        dataRef.events = dataRef.events.filter(function (x) {
          return x.id !== id;
        });
        onChange();
        renderMonth();
        selectDay(selectedDay);
      },
    });
  }

  function eventFormHtml(ev) {
    let cats = "";
    Object.keys(CATEGORIES).forEach(function (k) {
      cats +=
        '<option value="' +
        k +
        '"' +
        (ev.category === k ? " selected" : "") +
        ">" +
        CATEGORIES[k] +
        "</option>";
    });
    return (
      LA.field(
        "標題",
        '<input name="title" required value="' +
          LA.escapeHtml(ev.title || "") +
          '" placeholder="會議、約會…">'
      ) +
      LA.field(
        "日期",
        '<input type="date" name="date" required value="' +
          (ev.date || selectedDay) +
          '">'
      ) +
      '<div class="field-row">' +
      LA.timeField("開始", "startTime", ev.startTime || "") +
      LA.timeField("結束", "endTime", ev.endTime || "") +
      "</div>" +
      LA.field('分類', '<select name="category">' + cats + "</select>") +
      LA.field(
        "備註",
        '<textarea name="note" placeholder="選填">' +
          LA.escapeHtml(ev.note || "") +
          "</textarea>"
      )
    );
  }

  function toISO(year, month, day) {
    return (
      year +
      "-" +
      String(month).padStart(2, "0") +
      "-" +
      String(day).padStart(2, "0")
    );
  }

  LA.getSelectedCalendarDate = function () {
    return selectedDay;
  };
})(window);
