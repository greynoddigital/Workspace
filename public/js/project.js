// public/js/project.js
//
// Alpine component backing project.html (the Project detail page).
// Handles all six tabs: Overview, Services, Payments, Files, Notes,
// Documents - plus the three document-creation modals.

function projectDetailPage() {
  return {
    // ─── Core state ────────────────────────────────────────────────────
    loading: true,
    project: null,
    projectId: new URLSearchParams(window.location.search).get("id"),
    tab: "overview",
    statuses: ["Lead", "In Progress", "Completed", "On Hold", "Cancelled"],
    serviceOptions: [],
    workReferenceOptions: [],
    formError: "",

    async load() {
      this.loading = true;
      try {
        const settings = await api.get("/api/settings");
        if (settings.projectStatuses) this.statuses = settings.projectStatuses;
        if (settings.services) this.serviceOptions = settings.services;
        this.checklistTemplate = settings.checklistTemplate || {};
        this.defaultQuotationTerms = settings.defaultQuotationTerms || "";
        this.workReferenceOptions = settings.workReferences || [];

        this.project = await api.get("/api/projects/" + this.projectId);
        this.editForm = { ...this.project };
        this.notesContent = (await api.get("/api/projects/" + this.projectId + "/notes")).content;
      } catch (err) {
        console.error(err);
        this.project = null;
      } finally {
        this.loading = false;
      }
    },

    get totals() {
      if (!this.project) return { total: 0, paid: 0, pending: 0 };
      const total = (this.project.services || []).reduce((sum, s) => sum + Number(s.price) * Number(s.quantity), 0);
      const paid = (this.project.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      return { total, paid, pending: Math.max(0, total - paid) };
    },

    get unbilledPayments() {
      if (!this.project) return [];
      return (this.project.payments || []).filter((p) => !p.invoicedInInvoiceId);
    },

    // ─── Overview tab ──────────────────────────────────────────────────
    editForm: {},

    async saveOverview() {
      this.formError = "";
      try {
        this.project = await api.put("/api/projects/" + this.projectId, this.editForm);
      } catch (err) {
        this.formError = err.message;
      }
    },

    showDeleteConfirm: false,
    confirmDelete() {
      this.showDeleteConfirm = true;
    },
    async deleteProject() {
      try {
        await api.del("/api/projects/" + this.projectId);
        window.location.href = "/projects.html";
      } catch (err) {
        alert(err.message);
      }
    },

    // ─── Services tab ──────────────────────────────────────────────────
    serviceForm: { name: "", price: "", quantity: 1, hsnSac: "", description: "" },
    serviceError: "",

    // serviceOptions holds full catalog entries ({name, hsnSac,
    // description}), not just names. When the user picks one from the
    // dropdown, copy its hsnSac/description onto serviceForm so they
    // get saved on the project service (and from there, into any
    // quotation built from this project's services).
    onServiceCatalogPick() {
      const match = this.serviceOptions.find((s) => s.name === this.serviceForm.name);
      this.serviceForm.hsnSac = match ? match.hsnSac || "" : "";
      this.serviceForm.description = match ? match.description || "" : "";
    },

    async addService() {
      this.serviceError = "";
      try {
        await api.post("/api/projects/" + this.projectId + "/services", this.serviceForm);
        this.project = await api.get("/api/projects/" + this.projectId);
        this.serviceForm = { name: "", price: "", quantity: 1, hsnSac: "", description: "" };
      } catch (err) {
        this.serviceError = err.message;
      }
    },

    async deleteService(serviceId) {
      if (!confirm("Remove this service?")) return;
      await api.del("/api/projects/" + this.projectId + "/services/" + serviceId);
      this.project = await api.get("/api/projects/" + this.projectId);
    },

    // ─── Payments tab ──────────────────────────────────────────────────
    paymentForm: { date: "", amount: "", method: "", reference: "", notes: "" },
    paymentError: "",

    async addPayment() {
      this.paymentError = "";
      try {
        await api.post("/api/projects/" + this.projectId + "/payments", this.paymentForm);
        this.project = await api.get("/api/projects/" + this.projectId);
        this.paymentForm = { date: "", amount: "", method: "", reference: "", notes: "" };
      } catch (err) {
        this.paymentError = err.message;
      }
    },

    async deletePayment(paymentId) {
      if (!confirm("Remove this payment?")) return;
      await api.del("/api/projects/" + this.projectId + "/payments/" + paymentId);
      this.project = await api.get("/api/projects/" + this.projectId);
    },

    // ─── Files tab ─────────────────────────────────────────────────────
    fileForm: { fileName: "", driveLink: "" },
    fileError: "",

    async addFile() {
      this.fileError = "";
      try {
        await api.post("/api/projects/" + this.projectId + "/files", this.fileForm);
        this.project = await api.get("/api/projects/" + this.projectId);
        this.fileForm = { fileName: "", driveLink: "" };
      } catch (err) {
        this.fileError = err.message;
      }
    },

    async deleteFile(fileId) {
      if (!confirm("Remove this file link?")) return;
      await api.del("/api/projects/" + this.projectId + "/files/" + fileId);
      this.project = await api.get("/api/projects/" + this.projectId);
    },

    // ─── Notes tab ─────────────────────────────────────────────────────
    notesContent: "",
    notesSaved: false,

    async saveNotes() {
      await api.put("/api/projects/" + this.projectId + "/notes", { content: this.notesContent });
      this.notesSaved = true;
      setTimeout(() => (this.notesSaved = false), 2000);
    },

    // ─── Documents tab ─────────────────────────────────────────────────
    documents: { quotations: [], checklists: [], invoices: [] },
    checklistTemplate: {},
    docError: "",

    async loadDocuments() {
      this.documents = await api.get("/api/projects/" + this.projectId + "/documents");
    },

    async saveDriveLink(kind, doc) {
      await api.put("/api/projects/" + this.projectId + "/" + kind + "/" + doc.id, { driveLink: doc.driveLink });
    },

    // Saves a manually-edited Quotation/Checklist/Invoice number. This
    // is purely a label change on the document - it never affects the
    // internal auto-numbering counter, so the *next* document created
    // still gets the next sequential number regardless of what this
    // one was renamed to. Every PDF generated afterwards uses this
    // saved value instead of regenerating a number.
    async saveDocNumber(kind, doc) {
      try {
        const updated = await api.put("/api/projects/" + this.projectId + "/" + kind + "/" + doc.id, {
          number: doc.number,
        });
        doc.number = updated.number; // reflect server-side trimming, etc.
      } catch (err) {
        alert(err.message); // e.g. "Document number cannot be empty."
        await this.loadDocuments(); // revert the input to the last saved value
      }
    },

    async deleteDoc(kind, docId) {
      if (!confirm("Delete this document record?")) return;
      await api.del("/api/projects/" + this.projectId + "/" + kind + "/" + docId);
      await this.loadDocuments();
      if (kind === "invoices") this.project = await api.get("/api/projects/" + this.projectId);
    },

    // Editing which Work References are attached to an *existing*
    // quotation. Re-checks a box and saving re-snapshots that
    // reference's current Settings data onto the quotation (see
    // routes/quotations.js); references left unchecked/untouched keep
    // whatever snapshot they already had.
    showReferencesModal: false,
    referencesModalQuotation: null,
    referencesModalSelectedIds: [],

    openReferencesModal(quotation) {
      this.docError = "";
      this.referencesModalQuotation = quotation;
      this.referencesModalSelectedIds = (quotation.workReferenceIds || []).slice();
      this.showReferencesModal = true;
    },

    async saveReferencesModal() {
      try {
        const updated = await api.put(
          "/api/projects/" + this.projectId + "/quotations/" + this.referencesModalQuotation.id,
          { workReferenceIds: this.referencesModalSelectedIds }
        );
        Object.assign(this.referencesModalQuotation, updated);
        this.showReferencesModal = false;
      } catch (err) {
        alert(err.message);
      }
    },

    // Quotation modal
    showQuotationModal: false,
    quotationForm: { date: "", items: [], terms: "", workReferenceIds: [] },
    defaultQuotationTerms: "",

    openQuotationModal() {
      this.docError = "";
      this.quotationForm = {
        date: new Date().toISOString().slice(0, 10),
        items: (this.project.services || []).map((s) => ({
          name: s.name,
          price: s.price,
          quantity: s.quantity,
          hsnSac: s.hsnSac || "",
          description: s.description || "",
        })),
        terms: this.defaultQuotationTerms,
        workReferenceIds: [],
      };
      if (this.quotationForm.items.length === 0) {
        this.quotationForm.items.push({ name: "", price: 0, quantity: 1, hsnSac: "", description: "" });
      }
      this.showQuotationModal = true;
    },

    // If a quotation line's name matches a catalog service and its
    // hsnSac/description are still blank, fill them in from the
    // catalog. Used for lines added manually via "+ Add Line" (they
    // don't come from project.services, so they start out blank).
    // Never overwrites a value the user already entered/edited.
    autofillQuotationItem(idx) {
      const item = this.quotationForm.items[idx];
      const match = this.serviceOptions.find((s) => s.name === item.name);
      if (!match) return;
      if (!item.hsnSac) item.hsnSac = match.hsnSac || "";
      if (!item.description) item.description = match.description || "";
    },

    async createQuotation() {
      this.docError = "";
      try {
        await api.post("/api/projects/" + this.projectId + "/quotations", {
          date: this.quotationForm.date,
          items: this.quotationForm.items,
          terms: this.quotationForm.terms,
          workReferenceIds: this.quotationForm.workReferenceIds,
        });
        this.showQuotationModal = false;
        await this.loadDocuments();
      } catch (err) {
        this.docError = err.message;
      }
    },

    // Checklist modal
    showChecklistModal: false,
    checklistForm: { date: "", categories: {}, customItems: [] },

    openChecklistModal() {
      this.docError = "";
      const categories = {};
      for (const [catName, items] of Object.entries(this.checklistTemplate)) {
        categories[catName] = items.map((label) => ({ label, checked: false }));
      }
      this.checklistForm = {
        date: new Date().toISOString().slice(0, 10),
        categories,
        customItems: [],
      };
      this.showChecklistModal = true;
    },

    async createChecklist() {
      this.docError = "";
      try {
        await api.post("/api/projects/" + this.projectId + "/checklists", {
          date: this.checklistForm.date,
          categories: this.checklistForm.categories,
          customItems: this.checklistForm.customItems,
        });
        this.showChecklistModal = false;
        await this.loadDocuments();
      } catch (err) {
        this.docError = err.message;
      }
    },

    // Invoice modal
    showInvoiceModal: false,
    invoiceForm: { date: "", paymentIds: [] },

    openInvoiceModal() {
      this.docError = "";
      this.invoiceForm = {
        date: new Date().toISOString().slice(0, 10),
        paymentIds: this.unbilledPayments.map((p) => p.id),
      };
      this.showInvoiceModal = true;
    },

    async createInvoice() {
      this.docError = "";
      try {
        await api.post("/api/projects/" + this.projectId + "/invoices", {
          date: this.invoiceForm.date,
          paymentIds: this.invoiceForm.paymentIds,
        });
        this.showInvoiceModal = false;
        this.project = await api.get("/api/projects/" + this.projectId);
        await this.loadDocuments();
      } catch (err) {
        this.docError = err.message;
      }
    },

    formatCurrency,
    formatDate,
  };
}
