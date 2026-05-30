(function (global) {
  const LA = (global.LifeApp = global.LifeApp || {});

  let dataRef = null;
  let onChange = null;
  let searchQuery = "";

  const notesList = document.getElementById("notesList");
  const noteSearch = document.getElementById("noteSearch");

  LA.initNotes = function (data, persist) {
    dataRef = data;
    onChange = persist;
    let searchTimer = null;
    noteSearch.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchQuery = noteSearch.value.trim().toLowerCase();
        render();
      }, 200);
    });

    notesList.addEventListener("click", function (e) {
      const item = e.target.closest(".list-item[data-id]");
      if (item) openEdit(item.getAttribute("data-id"));
    });

    render();
  };

  function render() {
    let notes = dataRef.notes.slice().sort(function (a, b) {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    notes.sort(function (a, b) {
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    });

    if (searchQuery) {
      notes = notes.filter(function (n) {
        return (
          n.title.toLowerCase().includes(searchQuery) ||
          n.content.toLowerCase().includes(searchQuery)
        );
      });
    }

    notesList.innerHTML = notes
      .map(function (n) {
        return (
          '<li class="list-item note-item ' +
          (n.pinned ? "note-pinned" : "") +
          '" data-id="' +
          n.id +
          '">' +
          '<p class="note-title">' +
          LA.escapeHtml(n.title || "無標題") +
          "</p>" +
          '<p class="note-preview">' +
          (LA.escapeHtml(n.content) || "（空白）") +
          "</p>" +
          '<p class="note-date">' +
          LA.formatDateTime(n.updatedAt) +
          "</p></li>"
        );
      })
      .join("");
  }

  LA.openAddNote = function () {
    LA.openModal({
      title: "新增記事",
      bodyHtml: noteFormHtml({ title: "", content: "", pinned: false }),
      showDelete: false,
      save: function (form) {
        const now = new Date().toISOString();
        dataRef.notes.push({
          id: LA.uid(),
          title: form.title.trim(),
          content: (form.content && form.content.trim()) || "",
          pinned: !!form.pinned,
          createdAt: now,
          updatedAt: now,
        });
        onChange();
        render();
      },
    });
  };

  function openEdit(id) {
    const note = dataRef.notes.find(function (x) {
      return x.id === id;
    });
    if (!note) return;
    LA.openModal({
      title: "編輯記事",
      bodyHtml: noteFormHtml(note),
      showDelete: true,
      save: function (form) {
        note.title = form.title.trim();
        note.content = (form.content && form.content.trim()) || "";
        note.pinned = !!form.pinned;
        note.updatedAt = new Date().toISOString();
        onChange();
        render();
      },
      del: function () {
        dataRef.notes = dataRef.notes.filter(function (x) {
          return x.id !== id;
        });
        onChange();
        render();
      },
    });
  }

  function noteFormHtml(note) {
    return (
      LA.field(
        "標題",
        '<input name="title" value="' +
          LA.escapeHtml(note.title || "") +
          '" placeholder="記事標題">'
      ) +
      LA.field(
        "內容",
        '<textarea name="content" placeholder="寫下你的想法…">' +
          LA.escapeHtml(note.content || "") +
          "</textarea>"
      ) +
      '<div class="field"><label><input type="checkbox" name="pinned"' +
      (note.pinned ? " checked" : "") +
      "> 釘選在列表最上方</label></div>"
    );
  }
})(window);
