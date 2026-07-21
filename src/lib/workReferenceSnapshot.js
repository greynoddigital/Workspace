// src/lib/workReferenceSnapshot.js
//
// Quotations only ever store two things related to Work References:
//   - workReferenceIds: the ids of the references the user checked
//   - workReferences:   a frozen SNAPSHOT of those references' data
//     (projectName / websiteUrl / description), taken at the moment
//     the selection was saved (creation, or a later re-selection).
//
// The snapshot is what every PDF renders from, so a quotation keeps
// showing exactly the portfolio text/links it was generated with even
// if the reference is later edited or deleted in Settings. Only the
// *next* quotation (or a fresh re-selection) picks up the updated
// Settings data - this mirrors how the document numbering counter
// stays independent of a manually-edited document number.

/**
 * Builds { workReferenceIds, workReferences } from a list of selected
 * ids and the current Settings work references. Unknown/stale ids
 * (e.g. a reference deleted from Settings after being selected
 * elsewhere) are silently dropped rather than snapshotted as blank.
 */
function buildWorkReferenceSnapshot(selectedIds, settingsWorkReferences) {
  const ids = Array.isArray(selectedIds) ? selectedIds.filter((id) => typeof id === "string" && id) : [];
  const catalog = Array.isArray(settingsWorkReferences) ? settingsWorkReferences : [];
  const byId = new Map(catalog.map((ref) => [ref.id, ref]));

  const workReferences = [];
  const workReferenceIds = [];

  for (const id of ids) {
    const ref = byId.get(id);
    if (!ref) continue; // stale id - the reference no longer exists in Settings
    workReferenceIds.push(id);
    workReferences.push({
      id: ref.id,
      projectName: ref.projectName || "",
      websiteUrl: ref.websiteUrl || "",
      description: ref.description || "",
    });
  }

  return { workReferenceIds, workReferences };
}

module.exports = { buildWorkReferenceSnapshot };
