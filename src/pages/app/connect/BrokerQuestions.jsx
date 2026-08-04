import { useRef } from "react";

import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import Close from "@mui/icons-material/Close";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";

/**
 * The questions the broker company configured in its own dashboard.
 *
 * `answer_type` comes straight from CarrierQuestionController's allowed list:
 * Yes / No, Text, Textarea, Number, Image Upload.
 */
export default function BrokerQuestions({
  questions = [],
  values = {},
  errors = {},
  onChange,
  disabled = false,
}) {
  const fileRefs = useRef({});

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#FAFBFD]">
        <DescriptionOutlined style={{ fontSize: 64 }} className="text-blue-100" />

        <p className="mt-3 max-w-[320px] text-center text-sm text-[#4B5563]">
          This broker has not added any questions. You can continue to the
          agreement.
        </p>
      </div>
    );
  }

  const set = (id, patch) => onChange?.(id, patch);

  const inputClass = (id) =>
    `w-full rounded-xl border px-4 py-3 text-[15px] text-[#1F2937] transition-all focus:ring-2 focus:outline-none ${
      errors[`answers.${id}`]
        ? "border-red-400 focus:ring-red-100"
        : "border-[#E5E7EB] focus:border-blue-500 focus:ring-blue-100"
    }`;

  return (
    <div className="flex flex-col gap-7">
      {questions.map((question, index) => {
        const value = values[question.id] || {};
        const error = errors[`answers.${question.id}`];

        return (
          <div key={question.id} className="flex flex-col space-y-2">
            <label className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
              {index + 1}. {question.question}
              {question.is_required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </label>

            {question.answer_type === "Yes / No" && (
              <div className="flex gap-3">
                {["Yes", "No"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => set(question.id, { answer: option })}
                    className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all ${
                      value.answer === option
                        ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1E40AF]"
                        : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#CBD5E1]"
                    } disabled:opacity-50`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {question.answer_type === "Text" && (
              <input
                type="text"
                disabled={disabled}
                value={value.answer ?? ""}
                onChange={(event) =>
                  set(question.id, { answer: event.target.value })
                }
                className={inputClass(question.id)}
              />
            )}

            {question.answer_type === "Textarea" && (
              <textarea
                rows={4}
                disabled={disabled}
                value={value.answer ?? ""}
                onChange={(event) =>
                  set(question.id, { answer: event.target.value })
                }
                className={inputClass(question.id)}
              />
            )}

            {question.answer_type === "Number" && (
              <input
                type="number"
                disabled={disabled}
                value={value.answer ?? ""}
                onChange={(event) =>
                  set(question.id, { answer: event.target.value })
                }
                className={inputClass(question.id)}
              />
            )}

            {question.answer_type === "Image Upload" && (
              <>
                <input
                  type="file"
                  ref={(element) => {
                    fileRefs.current[question.id] = element;
                  }}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={disabled}
                  onChange={(event) =>
                    set(question.id, { document: event.target.files?.[0] || null })
                  }
                />

                {value.document || question.answer_document_name ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                    <div className="rounded-lg bg-white p-2 text-[#1D4ED8]">
                      <DescriptionOutlined style={{ fontSize: 20 }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {value.document?.name || question.answer_document_name}
                      </p>

                      {value.document ? (
                        <p className="text-xs text-gray-400">
                          {(value.document.size / 1024).toFixed(0)} KB
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-700">
                          Already uploaded
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        set(question.id, { document: null });
                        if (fileRefs.current[question.id]) {
                          fileRefs.current[question.id].value = "";
                        }
                      }}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 disabled:opacity-40"
                    >
                      <Close style={{ fontSize: 18 }} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      !disabled && fileRefs.current[question.id]?.click()
                    }
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (disabled) return;
                      set(question.id, {
                        document: event.dataTransfer.files?.[0] || null,
                      });
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-all ${
                      error
                        ? "border-red-400 bg-red-50/20"
                        : "border-[#CBD5E1] bg-[#FAFBFD] hover:border-[#1D4ED8]"
                    }`}
                  >
                    <FileUploadOutlined
                      style={{ fontSize: 32 }}
                      className="text-blue-100"
                    />

                    <p className="mt-1 text-sm text-[#4B5563]">
                      <span className="font-semibold text-[#1D4ED8] underline">
                        Choose a file
                      </span>{" "}
                      or drop it here
                    </p>

                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      PDF or image, up to 10MB
                    </p>
                  </div>
                )}
              </>
            )}

            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        );
      })}
    </div>
  );
}
