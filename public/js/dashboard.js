// public/js/dashboard.js
//
// Alpine component backing index.html (the Dashboard page).

function dashboardPage() {
  return {
    loading: true,
    stats: {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalPaymentReceived: 0,
      totalPaymentPending: 0,
      recentProjects: [],
    },

    async load() {
      this.loading = true;
      try {
        this.stats = await api.get("/api/dashboard");
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    formatCurrency,
    formatDate,
  };
}
