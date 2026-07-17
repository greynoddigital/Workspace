// public/js/settings.js
//
// Alpine component backing settings.html (the Settings page).

function settingsPage() {
  return {
    loading: true,
    saving: false,
    saved: false,
    tab: "company",
    settings: {},
    newServiceName: "",
    newCategoryName: "",
    newStatusName: "",
    newChecklistItem: {},

    async load() {
      this.loading = true;
      this.settings = await api.get("/api/settings");
      this.loading = false;
    },

    async save() {
      this.saving = true;
      this.settings = await api.put("/api/settings", this.settings);
      this.saving = false;
      this.saved = true;
      setTimeout(() => (this.saved = false), 2000);
    },

    addServiceName() {
      const name = this.newServiceName.trim();
      if (!name) return;
      this.settings.services.push({ name, hsnSac: "", description: "" });
      this.newServiceName = "";
    },

    addStatus() {
      const status = this.newStatusName.trim();
      if (!status) return;
      this.settings.projectStatuses.push(status);
      this.newStatusName = "";
    },

    addCategory() {
      const name = this.newCategoryName.trim();
      if (!name || this.settings.checklistTemplate[name]) return;
      this.settings.checklistTemplate[name] = [];
      this.newCategoryName = "";
    },

    removeCategory(cat) {
      if (!confirm('Remove category "' + cat + '"?')) return;
      delete this.settings.checklistTemplate[cat];
    },

    addChecklistItem(cat) {
      const label = (this.newChecklistItem[cat] || "").trim();
      if (!label) return;
      this.settings.checklistTemplate[cat].push(label);
      this.newChecklistItem[cat] = "";
    },
  };
}
