(function (global) {
  const LA = (global.LifeApp = global.LifeApp || {});

  const modal = document.getElementById("modal");
  const modalForm = document.getElementById("modalForm");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalDelete = document.getElementById("modalDelete");
  const modalClose = document.getElementById("modalClose");
  const modalCancel = document.getElementById("modalCancel");

  let onSave = null;
  let onDelete = null;

  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });

  modalForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (onSave) {
      const ok = onSave(collectFormData());
      if (ok === false) return;
    }
    closeModal();
  });

  modalDelete.addEventListener("click", function () {
    if (onDelete && confirm("確定要刪除嗎？此操作無法復原。")) {
      onDelete();
      closeModal();
    }
  });

  function closeModal() {
    if (typeof modal.close === "function") {
      modal.close();
    } else {
      modal.removeAttribute("open");
    }
    onSave = null;
    onDelete = null;
  }

  function collectFormData() {
    const data = {};
    modalBody.querySelectorAll("[name]").forEach(function (el) {
      if (el.name === "milestone" || el.name === "milestoneDone") return;
      if (el.name === "repeatDay") {
        if (el.checked) {
          if (!data.repeatDay) data.repeatDay = [];
          data.repeatDay.push(Number(el.value));
        }
        return;
      }
      if (el.type === "checkbox") {
        data[el.name] = el.checked;
      } else if (el.type === "number") {
        data[el.name] = el.value === "" ? 0 : Number(el.value);
      } else {
        data[el.name] = el.value;
      }
    });
    mergeTimeFields(data);
    return data;
  }

  function mergeTimeFields(data) {
    const bases = {};
    Object.keys(data).forEach(function (key) {
      const m = key.match(/^(.+)_(hour|minute)$/);
      if (m) bases[m[1]] = true;
    });
    Object.keys(bases).forEach(function (base) {
      const h = data[base + "_hour"];
      const m = data[base + "_minute"];
      if (h !== "" && m !== "") {
        data[base] = h + ":" + m;
      } else if (h !== "") {
        data[base] = h + ":00";
      } else {
        data[base] = "";
      }
      delete data[base + "_hour"];
      delete data[base + "_minute"];
    });
  }

  LA.openModal = function (opts) {
    modalTitle.textContent = opts.title;
    modalBody.innerHTML = opts.bodyHtml;
    modalDelete.hidden = !opts.showDelete;
    onSave = opts.save;
    onDelete = opts.del;
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
    if (opts.onOpen) opts.onOpen();

    const firstInput = modalBody.querySelector(
      "input:not([type=checkbox]), select, textarea"
    );
    if (firstInput) {
      requestAnimationFrame(function () {
        firstInput.focus();
      });
    }
  };

  LA.closeModal = closeModal;

  LA.field = function (label, inputHtml) {
    return '<div class="field"><label>' + label + "</label>" + inputHtml + "</div>";
  };

  /** 24 小時制時間（時、分下拉選單，不顯示上午/下午） */
  LA.timeField = function (label, name, value) {
    const formatted = LA.formatTime24(value);
    const parts = formatted ? formatted.split(":") : ["", ""];
    const h = parts[0];
    const m = parts[1];

    let hourOpts = '<option value="">—</option>';
    for (let i = 0; i < 24; i++) {
      const v = String(i).padStart(2, "0");
      hourOpts +=
        '<option value="' + v + '"' + (h === v ? " selected" : "") + ">" + v + "</option>";
    }

    let minOpts = '<option value="">—</option>';
    for (let i = 0; i < 60; i++) {
      const v = String(i).padStart(2, "0");
      minOpts +=
        '<option value="' + v + '"' + (m === v ? " selected" : "") + ">" + v + "</option>";
    }

    const inner =
      '<div class="time-24h" data-time-field="' +
      name +
      '">' +
      '<select name="' +
      name +
      '_hour" class="time-part" aria-label="時（24小時制）">' +
      hourOpts +
      "</select>" +
      '<span class="time-colon" aria-hidden="true">:</span>' +
      '<select name="' +
      name +
      '_minute" class="time-part" aria-label="分">' +
      minOpts +
      "</select>" +
      "</div>";

    return LA.field(label, inner);
  };

  LA.escapeHtml = function (str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  };
})(window);
