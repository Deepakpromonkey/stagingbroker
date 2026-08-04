import React, { useEffect, useState } from "react";

import Drawer from "@mui/material/Drawer";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";

import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlined";
import NotesIcon from "@mui/icons-material/Notes";
import TuneIcon from "@mui/icons-material/Tune";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Add } from "@mui/icons-material";

import { apiFetch } from "../../../lib/api";
import { toast, ToastContainer } from "../../../components/ui/Toaster";

const QUESTIONS_ENDPOINT = "/carrier-questions";

const AUTH_USER_KEY = "crm_user";

const BORDER = "#e2e8f0";
const ACCENT = "#1c5dbe";
const TEXT_DARK = "#0f172a";
const TEXT_MUTE = "#64748b";

const PAGE_SIZE = 10;

// The API stores/expects the literal label as `answer_type`
// (see Postman examples: "answer_type": "Yes / No", "answer_type": "Number")
const ANSWER_TYPES = ["Yes / No", "Text", "Textarea", "Number", "Image Upload"];

const TYPE_STYLES = {
  "Yes / No": { color: "#185abc", bg: "#eaf2ff" },
  Text: { color: "#0f766e", bg: "#e6f7f4" },
  Textarea: { color: "#0f766e", bg: "#e6f7f4" },
  Number: { color: "#b45309", bg: "#fef3e2" },
  "Image Upload": { color: "#7c3aed", bg: "#f2ecfe" },
};

const EMPTY_QUESTION = {
  id: null,
  question: "",
  answer_type: "",
  is_required: true,
};

function typeStyle(type) {
  return TYPE_STYLES[type] || { color: "#6b7280", bg: "#f1f5f9" };
}

function previewPillStyle(color) {
  return {
    fontSize: 12,
    fontWeight: 600,
    color,
    background: color + "14",
    borderRadius: 999,
    padding: "4px 12px",
  };
}

function sectionLabelStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11.5,
    fontWeight: 700,
    color: TEXT_MUTE,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
  };
}

function fieldCardStyle() {
  return {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: "18px 18px 20px",
    marginBottom: 16,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
  };
}

// Fetches the carrier question list the same way LoadSearch fetches shipments.
function useCarrierQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiFetch(QUESTIONS_ENDPOINT)
      .then((res) => {
        if (cancelled) return;
        if (res && res.status === "success") {
          setQuestions(Array.isArray(res.data) ? res.data : []);
        } else {
          setQuestions([]);
        }
      })
      .catch(() => {
        if (!cancelled) setQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  return { questions, setQuestions, loading, reload };
}

export default function CarrierQuestions() {

  const user = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "{}");

const can = (permission) => {
  const permissions = user?.permissions || [];

  if (Array.isArray(permission)) {
    return permission.some((p) => permissions.includes(p));
  }

  return permissions.includes(permission);
};

  const { questions, setQuestions, loading, reload } = useCarrierQuestions();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [pageIndex, setPageIndex] = useState(0);

  const pageCount = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const paginatedQuestions = questions.slice(
    pageIndex * PAGE_SIZE,
    pageIndex * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => {
    if (pageIndex >= pageCount) setPageIndex(Math.max(0, pageCount - 1));
  }, [questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    if (!can("edit-carrier-agreements")) return;
    setEditing({ ...EMPTY_QUESTION });
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const openEdit = (q) => {
    setEditing({ ...q });
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setFieldErrors({});
  };

  const setField = (key, value) => {
    setEditing((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: false }));
    }
  };

  const saveQuestion = () => {
    if (!editing.question.trim()) {
      setFieldErrors({ question: true });
      toast.error("Question text is required.");
      return;
    }
    if (!editing.answer_type) {
      setFieldErrors({ answer_type: true });
      toast.error("Please select an answer type.");
      return;
    }

    setFieldErrors({});
    setSaving(true);

    const isEdit = !!editing.id;
    const body = {
      question: editing.question,
      answer_type: editing.answer_type,
      is_required: !!editing.is_required,
    };

    const request = isEdit
      ? apiFetch(`${QUESTIONS_ENDPOINT}/${editing.id}`, { method: "PUT", body: JSON.stringify(body) })
      : apiFetch(QUESTIONS_ENDPOINT, { method: "POST", body: JSON.stringify(body) });

    request
      .then((res) => {
        if (isEdit) {
          setQuestions((prev) =>
            prev.map((q) => (q.id === editing.id ? { ...q, ...res.data } : q))
          );
          toast.success("Question updated.");
        } else {
          setQuestions((prev) => [res.data, ...prev]);
          setPageIndex(0);
          toast.success("Question added.");
        }
        closeDrawer();
      })
      .catch((err) => toast.error(err?.message || "Something went wrong."))
      .finally(() => setSaving(false));
  };

  const deleteQuestion = (id) => {
    apiFetch(`${QUESTIONS_ENDPOINT}/${id}`, { method: "DELETE" })
      .then(() => {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        toast.success("Question deleted.");
      })
      .catch((err) => toast.error(err?.message || "Something went wrong."));
  };

  const renderTypeBadge = (type) => {
    const style = typeStyle(type);
    return (
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: style.color,
          background: style.bg,
          borderRadius: 999,
          padding: "4px 12px",
          letterSpacing: "0.01em",
        }}
      >
        {type || "Unset"}
      </span>
    );
  };

  const renderRequiredBadge = (required) => (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 999,
        padding: "4px 12px",
        color: required ? "#15924c" : TEXT_MUTE,
        background: required ? "#e9f9ef" : "#f1f5f9",
      }}
    >
      {required ? "Required" : "Optional"}
    </span>
  );

  const renderQuestionPreview = (q) => {
    if (q.answer_type === "Yes / No") {
      return (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <span style={previewPillStyle("#185abc")}>Yes</span>
          <span style={previewPillStyle("#6b7280")}>No</span>
        </div>
      );
    }
    if (q.answer_type === "Text" || q.answer_type === "Number") {
      return (
        <div
          style={{
            marginTop: 8,
            height: 34,
            background: "#f9fafb",
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
          }}
        />
      );
    }
    if (q.answer_type === "Textarea") {
      return (
        <div
          style={{
            marginTop: 8,
            height: 60,
            background: "#f9fafb",
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
          }}
        />
      );
    }
    if (q.answer_type === "Image Upload") {
      return (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#9ca3af",
            fontSize: 12.5,
            border: "1px dashed #cbd5e1",
            borderRadius: 8,
            padding: "10px 14px",
            background: "#fafafa",
          }}
        >
          <AttachFileIcon fontSize="small" />
          <span>File / image upload</span>
        </div>
      );
    }
    return null;
  };

  const requiredCount = questions.filter((q) => q.is_required).length;

  const renderDrawer = () => {
    if (!editing) return null;
    const isEdit = !!editing.id;

    return (
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        slotProps={{
          paper: { sx: { width: { xs: "100vw", sm: 640 }, maxWidth: "100vw", p: 0 } },
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#F4F5F1" }}>
          <div
            style={{
              padding: "20px 28px",
              borderBottom: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#fff",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                flexShrink: 0,
                background: "#eaf2ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isEdit ? (
                <EditIcon sx={{ fontSize: 19, color: ACCENT }} />
              ) : (
                <AddCircleOutlineIcon sx={{ fontSize: 20, color: ACCENT }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: TEXT_DARK }}>
                {isEdit ? "Edit question" : "Add question"}
              </div>
              <div style={{ fontSize: 13, color: TEXT_MUTE, marginTop: 2 }}>
                {isEdit ? "Update the question details below." : "Fill in the details for the new question."}
              </div>
            </div>
            <IconButton onClick={closeDrawer} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", boxSizing: "border-box" }}>
            <div style={fieldCardStyle()}>
              <div style={sectionLabelStyle()}>
                <NotesIcon sx={{ fontSize: 15, color: ACCENT }} />
                Question
              </div>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                value={editing.question}
                onChange={(e) => setField("question", e.target.value)}
                placeholder="e.g. Do you have a valid motor carrier authority?"
                error={!!fieldErrors.question}
                helperText={fieldErrors.question ? "Question text is required." : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    background: "#F4F5F1",
                    "& fieldset": { borderColor: BORDER },
                    "&:hover fieldset": { borderColor: ACCENT },
                    "&.Mui-focused fieldset": { borderColor: ACCENT },
                  },
                }}
              />
            </div>

            <div style={fieldCardStyle()}>
              <div style={sectionLabelStyle()}>
                <TuneIcon sx={{ fontSize: 15, color: ACCENT }} />
                Answer type
              </div>
              <FormControl fullWidth size="small" error={!!fieldErrors.answer_type}>
                <Select
                  value={editing.answer_type}
                  onChange={(e) => setField("answer_type", e.target.value)}
                  displayEmpty
                  sx={{
                    borderRadius: "10px",
                    background: "#F4F5F1",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
                  }}
                  renderValue={(value) =>
                    value ? value : <span style={{ color: "#9ca3af" }}>Select how the carrier should respond</span>
                  }
                >
                  {ANSWER_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: `1px solid #eef2f6`,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK }}>Required</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTE, marginTop: 1 }}>Carrier must answer to continue</div>
                </div>
                <Switch
                  checked={editing.is_required}
                  onChange={(e) => setField("is_required", e.target.checked)}
                  size="small"
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: ACCENT },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: ACCENT },
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "16px 18px 18px",
                background: "#fff",
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                boxSizing: "border-box",
              }}
            >
              <div style={sectionLabelStyle()}>
                <VisibilityIcon sx={{ fontSize: 15, color: ACCENT }} />
                Preview
              </div>
              <div
                style={{
                  background: "#F4F5F1",
                  borderRadius: 10,
                  padding: "14px 16px",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK, marginBottom: 4 }}>
                  {editing.question || (
                    <span style={{ color: "#9ca3af", fontWeight: 400 }}>Your question will appear here</span>
                  )}
                </div>

                {renderQuestionPreview(editing)}

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  {editing.answer_type && renderTypeBadge(editing.answer_type)}
                  {editing.is_required && <span style={{ fontSize: 11, color: TEXT_MUTE }}>required</span>}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "16px 28px",
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              background: "#fff",
            }}
          >
            {isEdit && (
              <button
                onClick={() => {
                  if (window.confirm("Delete this question? This cannot be undone.")) {
                    deleteQuestion(editing.id);
                    closeDrawer();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#ef4444",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 4px",
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                Delete
              </button>
            )}

            <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
              <button
                onClick={closeDrawer}
                style={{
                  borderRadius: 50,
                  padding: "8px 22px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(0,0,0,.2)",
                  color: "rgba(0,0,0,.7)",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveQuestion}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 50,
                  padding: "8px 22px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: ACCENT,
                  color: "#fff",
                  border: "none",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving…" : isEdit ? "Update" : "Save"}
                <ArrowForwardIcon style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        </div>
      </Drawer>
    );
  };

  const rangeStart = questions.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min(questions.length, (pageIndex + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Carrier Questions</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
            Custom questionnaire every carrier answers during onboarding.
          </p>
        </div>

{can("edit-carrier-agreements") && (
  <button
    onClick={openAdd}
    className="mt-6 flex items-center gap-2 rounded-2xl px-6 py-4 text-[15px] font-semibold text-white shadow-sm transition-colors hover:opacity-90"
    style={{ background: ACCENT }}
  >
    <Add sx={{ fontSize: 20 }} />
    Add question
  </button>
)}
      </div>

      <ToastContainer />

      {!loading && questions.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="text-[28px] font-extrabold leading-none text-slate-900">{questions.length}</div>
            <div className="mt-1 text-sm text-slate-500">Total questions</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="text-[28px] font-extrabold leading-none text-green-600">{requiredCount}</div>
            <div className="mt-1 text-sm text-slate-500">Required</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="text-[28px] font-extrabold leading-none text-amber-600">
              {questions.length - requiredCount}
            </div>
            <div className="mt-1 text-sm text-slate-500">Optional</div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  #
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Question
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Type
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {" "}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading questions…
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                      <HelpOutlineIcon sx={{ fontSize: 24, color: ACCENT }} />
                    </div>
                    <div className="mb-1 text-[15px] font-bold text-slate-900">No questions yet</div>
                    <div className="text-sm text-slate-400">
                      Click <strong>Add question</strong> to get started.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q, index) => (
                  <tr key={q.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                    <td className="px-6 py-4 align-top text-sm font-semibold text-slate-400">
                      {pageIndex * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-6 py-4 align-top text-sm font-semibold text-slate-800">{q.question}</td>
                    <td className="px-6 py-4 align-top">{renderTypeBadge(q.answer_type)}</td>
                    <td className="px-6 py-4 align-top">{renderRequiredBadge(q.is_required)}</td>
                    <td className="px-6 py-4 align-top text-right">
                   {can("edit-carrier-agreements") && (
  <button
    onClick={() => openEdit(q)}
    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
  >
    <EditIcon sx={{ fontSize: 14 }} />
    Edit
  </button>
)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {questions.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
            <span className="text-sm text-slate-400">
              {rangeStart}-{rangeEnd} of {questions.length}
            </span>
            <div className="flex items-center gap-1">
              <IconButton
                size="small"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                sx={{ color: "#94a3b8" }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <span className="px-2 text-sm font-semibold text-slate-900">
                Page {pageIndex + 1} of {pageCount}
              </span>
              <IconButton
                size="small"
                disabled={pageIndex + 1 >= pageCount}
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                sx={{ color: "#94a3b8" }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
        )}
      </div>

      {renderDrawer()}
    </div>
  );
}