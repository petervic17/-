(function (global) {
  const LA = (global.LifeApp = global.LifeApp || {});
  const STORAGE_KEY = "myLifeApp_v1";
  const TAB_KEY = "myLifeApp_lastTab";

  function defaultData() {
    return { daily: [], notes: [], events: [], goals: [] };
  }

  function ensureArray(val) {
    return Array.isArray(val) ? val : [];
  }

  LA.loadData = function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      return {
        daily: ensureArray(parsed.daily),
        notes: ensureArray(parsed.notes),
        events: ensureArray(parsed.events),
        goals: ensureArray(parsed.goals),
      };
    } catch {
      return defaultData();
    }
  };

  LA.saveData = function (data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  LA.saveLastTab = function (tab) {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* 私人模式等無法寫入時略過 */
    }
  };

  LA.loadLastTab = function () {
    try {
      return localStorage.getItem(TAB_KEY);
    } catch {
      return null;
    }
  };

  LA.uid = function () {
    return Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  };

  LA.dateToISO = function (d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  };

  LA.todayISO = function () {
    return LA.dateToISO(new Date());
  };

  LA.shiftISO = function (iso, delta) {
    const p = iso.split("-").map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + delta);
    return LA.dateToISO(d);
  };

  LA.getWeekdayFromISO = function (iso) {
    const p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).getDay();
  };

  LA.formatDateZh = function (iso) {
    if (!iso) return "";
    const parts = iso.split("-").map(Number);
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return (
      parts[1] +
      "月" +
      parts[2] +
      "日（週" +
      weekdays[LA.getWeekdayFromISO(iso)] +
      "）"
    );
  };

  LA.formatDateTime = function (iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  LA.formatTime24 = function (value) {
    if (!value) return "";
    const parts = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!parts) return value;
    const h = Math.min(23, Math.max(0, parseInt(parts[1], 10)));
    const m = Math.min(59, Math.max(0, parseInt(parts[2], 10)));
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  };
})(window);
