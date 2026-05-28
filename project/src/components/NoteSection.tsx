import { useEffect, useMemo, useState } from "react";
import { C } from "../constants/theme";
import type { NoteResponse, NoteType } from "../services/Patientservice";
import { patientService } from "../services/Patientservice";
import { IconCheck, IconClose } from "./icons";
import { Btn, SectionLabel, Txt } from "./ui";

interface NoteSectionProps {
  title: string;
  noteType: NoteType;
  patientFileId?: number;
  userId: number;
  initialNotes?: NoteResponse[];
  placeholder?: string;
  composerLabel?: string;
  hint?: string;
  accentColor?: string;
  toast?: {
    success: (m: string) => void;
    error: (m: string) => void;
    info: (m: string) => void;
    warning: (m: string) => void;
  };
  onChange?: (notes: NoteResponse[]) => void;
}

const PREVIEW_COUNT = 1;

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteSection({
  title,
  noteType,
  patientFileId,
  userId,
  initialNotes,
  placeholder,
  composerLabel,
  hint,
  accentColor = C.teal,
  toast,
  onChange,
}: NoteSectionProps) {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Seed from summary's denormalised notes when available
  useEffect(() => {
    if (!initialNotes) return;
    const filtered = initialNotes
      .filter(n => n.noteType === noteType)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    setNotes(filtered);
    setLoaded(true);
  }, [initialNotes, noteType]);

  // Fallback fetch when initialNotes isn't provided (or patientFileId arrives later)
  useEffect(() => {
    if (loaded || !patientFileId || initialNotes) return;
    patientService
      .getNotesByFile(patientFileId, noteType)
      .then(list => {
        const sorted = [...list].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setNotes(sorted);
        setLoaded(true);
      })
      .catch(err => {
        console.warn(`[NOTES:${noteType}] load failed`, err);
        setLoaded(true);
      });
  }, [patientFileId, noteType, loaded, initialNotes]);

  useEffect(() => {
    onChange?.(notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const visible = expanded ? notes : notes.slice(0, PREVIEW_COUNT);
  const hidden = Math.max(0, notes.length - PREVIEW_COUNT);

  const canSubmit = useMemo(
    () => Boolean(draft.trim()) && Boolean(patientFileId) && !busy,
    [draft, patientFileId, busy],
  );

  async function handleAdd() {
    if (!patientFileId) {
      toast?.error("Cannot save note: patient file not linked");
      return;
    }
    if (!draft.trim()) {
      toast?.warning("Enter a note before saving");
      return;
    }
    setBusy(true);
    try {
      const created = await patientService.createNote({
        patientFileId,
        userId,
        noteType,
        content: draft.trim(),
      });
      setNotes(prev => [created, ...prev]);
      setDraft("");
      toast?.success(`${title} added`);
    } catch (err) {
      console.warn(`[NOTES:${noteType}] create failed`, err);
      toast?.error(`Could not save ${title.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(n: NoteResponse) {
    setEditingId(n.id);
    setEditDraft(n.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function handleSaveEdit(id: number) {
    if (!editDraft.trim()) {
      toast?.warning("Note content cannot be empty");
      return;
    }
    setBusy(true);
    try {
      const updated = await patientService.updateNote(id, {
        content: editDraft.trim(),
        userId,
      });
      setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...updated } : n)));
      cancelEdit();
      toast?.success(`${title} updated`);
    } catch (err) {
      console.warn(`[NOTES:${noteType}] update failed`, err);
      toast?.error(`Could not update ${title.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setBusy(true);
    try {
      await patientService.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      toast?.success(`${title} deleted`);
    } catch (err) {
      console.warn(`[NOTES:${noteType}] delete failed`, err);
      toast?.error(`Could not delete ${title.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionLabel mb={12}>{title}</SectionLabel>

      {notes.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {visible.map((n) => {
            const isEditing = editingId === n.id;
            return (
              <div
                key={n.id}
                style={{
                  background: C.bgDeep,
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${accentColor}`,
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 17,
                      color: C.textMuted,
                      fontWeight: 600,
                    }}
                  >
                    {formatTime(n.createdAt)}
                    {n.addedBy ? ` · ${n.addedBy}` : ""}
                    {n.updatedAt && n.updatedAt !== n.createdAt ? " · edited" : ""}
                  </div>
                  {!isEditing && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => beginEdit(n)}
                        disabled={busy}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: C.textMuted,
                          fontSize: 17,
                          fontWeight: 700,
                          cursor: busy ? "not-allowed" : "pointer",
                          padding: "2px 6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        disabled={busy}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: C.textLight,
                          cursor: busy ? "not-allowed" : "pointer",
                          padding: 2,
                          display: "flex",
                          alignItems: "center",
                        }}
                        aria-label="Delete note"
                      >
                        <IconClose size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <>
                    <Txt
                      rows={3}
                      value={editDraft}
                      onChange={(e: any) => setEditDraft(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <Btn
                        onClick={() => handleSaveEdit(n.id)}
                        s={{
                          flex: 1,
                          padding: "8px 0",
                          fontSize: 18,
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        <IconCheck
                          size={12}
                          color="white"
                          style={{ marginRight: 4 }}
                        />
                        Save
                      </Btn>
                      <Btn
                        variant="ghost"
                        onClick={cancelEdit}
                        s={{ flex: 1, padding: "8px 0", fontSize: 18 }}
                      >
                        Cancel
                      </Btn>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      fontSize: 19,
                      color: C.text,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {n.content}
                  </div>
                )}
              </div>
            );
          })}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              style={{
                border: "none",
                background: "transparent",
                color: accentColor,
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 2px",
              }}
            >
              {expanded ? "Hide earlier notes" : `View ${hidden} earlier note${hidden === 1 ? "" : "s"} ▾`}
            </button>
          )}
        </div>
      )}

      <Txt
        label={composerLabel ?? `Add ${title.toLowerCase()}`}
        rows={3}
        value={draft}
        onChange={(e: any) => setDraft(e.target.value)}
        placeholder={placeholder}
        hint={hint}
      />
      <Btn
        variant="ghost"
        full
        onClick={handleAdd}
        s={{ padding: "11px 0", marginTop: 4, opacity: canSubmit ? 1 : 0.6 }}
      >
        {busy ? "Saving…" : `Add ${title}`}
      </Btn>
    </>
  );
}
