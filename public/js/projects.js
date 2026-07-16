// public/js/projects.js
//
// Alpine component backing projects.html (the Projects list page).

function projectsPage() {
  return {
    loading: true,
    projects: [],
    query: "",
    statuses: ["Lead", "In Progress", "Completed", "On Hold", "Cancelled"],

    showCreate: false,
    formError: "",
    form: blankProjectForm(),

    async load() {
      this.loading = true;
      try {
        // Load statuses from settings so custom statuses are respected.
        const settings = await api.get("/api/settings");
        if (settings.projectStatuses) this.statuses = settings.projectStatuses;
        this.projects = await api.get("/api/projects");
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
      // Support ?new=1 deep link from the dashboard's "New Project" button.
      if (new URLSearchParams(window.location.search).get("new") === "1") {
        this.openCreateModal();
      }
    },

    async search() {
      this.loading = true;
      try {
        this.projects = this.query.trim()
          ? await api.get("/api/search?q=" + encodeURIComponent(this.query))
          : await api.get("/api/projects");
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    totals(project) {
      const total = (project.services || []).reduce((sum, s) => sum + Number(s.price) * Number(s.quantity), 0);
      const paid = (project.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      return { total, paid, pending: Math.max(0, total - paid) };
    },

    openCreateModal() {
      this.form = blankProjectForm();
      this.formError = "";
      this.showCreate = true;
    },

    async createProject() {
      this.formError = "";
      try {
        const project = await api.post("/api/projects", this.form);
        window.location.href = "/project.html?id=" + project.id;
      } catch (err) {
        this.formError = err.message;
      }
    },

    formatCurrency,
    formatDate,
  };
}

function blankProjectForm() {
  return {
    projectName: "",
    clientName: "",
    phone: "",
    email: "",
    location: "",
    description: "",
    status: "Lead",
    startDate: "",
    expectedDelivery: "",
    completedDate: "",
  };
}
