import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useParams, useNavigate, useSearchParams } from "react-router-dom";

import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

import Badge from "@mui/icons-material/Badge";
import DoneAll from "@mui/icons-material/DoneAll";
import AccountBalance from "@mui/icons-material/AccountBalance";
import SensorsOutlined from "@mui/icons-material/SensorsOutlined";
import Edit from "@mui/icons-material/Edit";
import Upload from "@mui/icons-material/Upload";
import HeadsetMic from "@mui/icons-material/HeadsetMic";
import DragIndicator from "@mui/icons-material/DragIndicator";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import Close from "@mui/icons-material/Close";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";

import { apiFetch, API_BASE } from "../../../lib/api";

import OtpModal from "./OtpModal";
import ESign from "./ESign";
import ESignUpload from "./ESignUpload";
import PdfViewer from "./PdfViewer";
import BrokerQuestions from "./BrokerQuestions";
import ThankYou from "./ThankYou";

const steps = [
  { id: 1, label: "CARRIER DETAILS" },
  { id: 2, label: "GOVERNMENT ID" },
  { id: 3, label: "BANK & FACTORING" },
  { id: 4, label: "ELD CONNECTION" },
  { id: 5, label: "BROKER QUESTIONS" },
  { id: 6, label: "DOCUMENTS" },
  { id: 7, label: "E-SIGN & SUBMIT" },
];

const stepTitles = {
  1: "Carrier Details",
  2: "Government ID",
  3: "Bank Verification",
  4: "ELD Connection",
  5: "Broker Questions",
  6: "Compliance Documents",
  7: "E-Sign",
};

/**
 * Carrier onboarding wizard.
 *
 * Public page — the carrier is not a user of the system. Every call is
 * authorised by the 64 character invitation token in the URL, so `skipAuth` is
 * set on each request.
 */
export default function OnboardPage() {
  const { token } = useParams();

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const [initing, setIniting] = useState(true);
  const [busy, setBusy] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);

  const [carrier, setCarrier] = useState(null);
  const [broker, setBroker] = useState(null);
  const [connectRequest, setConnectRequest] = useState(null);

  const [isOtpOpen, setIsOtpOpen] = useState(false);

  // Step 3 — factoring
  const [usesFactoring, setUsesFactoring] = useState(false);
  const [factoringName, setFactoringName] = useState("");
  const [factoringDoc, setFactoringDoc] = useState(null);

  // Step 4 — the broker's questions
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [answerErrors, setAnswerErrors] = useState({});

  // Step 5 — compliance documents; holds the type currently uploading
  const [uploadingDoc, setUploadingDoc] = useState(null);

  // Step 6 — signature and where it goes on the agreement
  const [eSignType, setESignType] = useState("draw");
  const [signature, setSignature] = useState(null);
  const [placement, setPlacement] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isPhoneVerified = !!connectRequest?.mobile_verified;
  const isIdVerified = !!connectRequest?.identity_verified;
  const isBankVerified = !!connectRequest?.bank_verified;
  const isFactoringAnswered = !!connectRequest?.factoring_answered;

  /*
  | "Settled" means done, or deliberately skipped, and is what the wizard gates
  | on. The plain *_verified flags are left untouched so nothing anywhere can
  | mistake a skip for a completed check — the broker's profile relies on that
  | distinction.
  |
  | Falls back to deriving it locally for an API that predates these fields.
  */
  const isIdSkipped = !!connectRequest?.identity_skipped;
  const isBankSkipped = !!connectRequest?.bank_skipped;

  const isIdSettled =
    connectRequest?.identity_settled ?? (isIdVerified || isIdSkipped);

  // A carrier paid through a factoring company has no payout account to give
  // this broker, so answering yes retires the bank step outright.
  const isBankSettled =
    (connectRequest?.bank_settled ?? (isBankVerified || isBankSkipped)) ||
    (usesFactoring && isFactoringAnswered);
  const isEldConnected = !!connectRequest?.eld_connected;
  const isEldSkipped = !!connectRequest?.eld_skipped;

  const isEldSettled =
    connectRequest?.eld_settled ?? (isEldConnected || isEldSkipped);

  // Provider name, sync state and fleet counts, present only once the API has
  // the connection loaded. Absent while the carrier has not linked anything.
  const eld = connectRequest?.eld ?? null;

  const isQuestionnaireDone = !!connectRequest?.questionnaire_completed;
  const isDocumentsDone = !!connectRequest?.documents_completed;

  // The required set is declared by the API, so adding a document type later
  // needs no change here. Falls back to the two known types while loading.
  const documentSlots = (
    connectRequest?.documents_required || [
      { type: "w9", label: "W-9 Form" },
      { type: "coi", label: "Certificate of Insurance" },
    ]
  ).map((slot) => ({
    ...slot,
    uploaded: (connectRequest?.documents || []).find(
      (document) => document.type === slot.type,
    ),
  }));
  const isSigned = !!connectRequest?.signed;

  // What the server currently holds for step 3, as opposed to what is sitting
  // in the form. The gap between the two is what the "not saved yet" hint and
  // the blur-save both key off.
  const savedFactoringName = connectRequest?.factoring?.company_name || "";
  const savedFactoringDocName = connectRequest?.factoring?.document_name || "";

  /*
  | True when the form is showing exactly what the server already stored, so
  | there is nothing to send.
  |
  | This matters because /carrier-connect/factoring validates `document` as
  | required whenever uses_factoring_company is true, and it has no name-only
  | update path. Once the notice of assignment is saved the frontend drops its
  | local File — the server owns it — so a second POST carries no `document`
  | and comes back 422 "Upload your factoring notice of assignment to
  | continue.". goNext treated that failure as "not saved" and refused to
  | advance, which trapped carriers on step 3 forever with a fully populated
  | row already in the database.
  */
  const factoringMatchesServer =
    isFactoringAnswered &&
    !factoringDoc &&
    usesFactoring === !!connectRequest?.factoring?.uses_factoring_company &&
    factoringName.trim() === savedFactoringName;

  // Served by the API rather than straight from S3 — the bucket sends no CORS
  // headers and the viewer reads the file with XHR, so a direct link renders
  // nothing. Falls back to the flat key so this works against an API that has
  // not picked up the newer response shape yet.
  const agreementUrl =
    connectRequest?.agreement?.url || connectRequest?.agreement_url || null;

  const agreementName = connectRequest?.agreement?.name || "Broker agreement";

  // Object URL for the drag chip and the on-page preview. Revoked on change so
  // a carrier redrawing their signature repeatedly does not leak blobs.
  const signatureUrl = useMemo(
    () => (signature ? URL.createObjectURL(signature) : null),
    [signature],
  );

  useEffect(() => {
    return () => {
      if (signatureUrl) URL.revokeObjectURL(signatureUrl);
    };
  }, [signatureUrl]);

  /**
   * Drop the carrier at the first step they have not finished, so a returning
   * link does not walk them back through completed steps.
   */
  const resumeStep = (request) => {
    if (!request?.mobile_verified) return 1;

    // A skipped step is settled. Sending the carrier back to one they have
    // already declined would be an inescapable loop.
    const idSettled =
      request?.identity_settled ??
      (request?.identity_verified || request?.identity_skipped);

    const bankSettled =
      (request?.bank_settled ??
        (request?.bank_verified || request?.bank_skipped)) ||
      !!request?.factoring?.uses_factoring_company;

    // Same reasoning as the other two: a carrier who declined an ELD, or whose
    // provider Terminal cannot reach, must not be walked back to it forever.
    const eldSettled =
      request?.eld_settled ??
      (request?.eld_connected || request?.eld_skipped);

    if (!idSettled) return 2;
    if (!bankSettled || !request?.factoring_answered) return 3;
    if (!eldSettled) return 4;
    if (!request?.questionnaire_completed) return 5;
    if (!request?.documents_completed) return 6;
    return 7;
  };

  const applyRequest = useCallback((request, { resume = false } = {}) => {
    /*
    | Every step response replaces this object wholesale, which made the
    | agreement fragile: the API exposes `agreement` and `agreement_url`
    | through whenLoaded, so any response built without the relation
    | eager-loaded omits both keys rather than sending null. One such response
    | — the step 5 upload is the usual culprit, since it is the last call
    | before the carrier reaches step 6 — wiped the document the wizard had
    | already loaded, and step 6 told the carrier the broker had never
    | uploaded an agreement.
    |
    | An absent key means "not reported", not "removed", so carry the last
    | known value forward. A key that is present and null is a real answer and
    | is allowed to clear it.
    */
    setConnectRequest((previous) => {
      if (!request) return request;

      const merged = { ...request };

      if (!("agreement" in request) && previous?.agreement) {
        merged.agreement = previous.agreement;
      }

      if (!("agreement_url" in request) && previous?.agreement_url) {
        merged.agreement_url = previous.agreement_url;
      }

      /*
      | `documents` is exposed the same way and has bitten the same way: a
      | response built without the relation loaded dropped the key, every
      | compliance slot read as empty, and a carrier who had just uploaded
      | their W-9 was handed the blank dropzone back with no name, no size and
      | no way to view the file they had already sent.
      */
      if (!("documents" in request) && previous?.documents) {
        merged.documents = previous.documents;
      }

      return merged;
    });

    if (request?.factoring) {
      setUsesFactoring(!!request.factoring.uses_factoring_company);
      setFactoringName(request.factoring.company_name || "");
    }

    if (resume) {
      setCurrentStep(resumeStep(request));
    }
  }, []);

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      navigate("/carrier/invalid-access", { replace: true });
      return;
    }

    let cancelled = false;

    apiFetch("/carrier-connect/load", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (cancelled) return;

        setCarrier(res?.data?.carrier || null);
        setBroker(res?.data?.broker || null);

        applyRequest(res?.data?.connect_request, { resume: true });
      })
      .catch(() => {
        if (!cancelled) {
          navigate("/carrier/invalid-access", { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setIniting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, navigate, applyRequest]);

  /*
  | Step 6 is unusable without a document to sign, so treat a missing one as
  | worth one retry rather than a verdict.
  |
  | /carrier-connect/load is the endpoint that repairs this: it re-binds an
  | agreement the broker uploaded after the invitation went out, which is
  | exactly the case where the wizard opened with nothing attached. Asking
  | again on arrival costs one request and fixes the carrier who would
  | otherwise be stranded one click from finishing.
  |
  | Guarded by a ref so a broker who genuinely has no agreement on file gets a
  | single retry and the honest empty state, not a poll.
  */
  const agreementRefetched = useRef(false);

  useEffect(() => {
    if (initing || currentStep !== 7 || agreementUrl) return;
    if (agreementRefetched.current) return;

    agreementRefetched.current = true;

    let cancelled = false;

    apiFetch("/carrier-connect/load", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (cancelled) return;

        const refreshed = res?.data?.connect_request;

        if (refreshed) applyRequest(refreshed);
      })
      .catch(() => {
        // Nothing to recover: the empty state below already says so.
      });

    return () => {
      cancelled = true;
    };
  }, [initing, currentStep, agreementUrl, token, applyRequest]);

  // Pull the broker's questions once, when the carrier first reaches step 4.
  useEffect(() => {
    if (initing || currentStep !== 5 || questions.length > 0) return;

    apiFetch("/carrier-connect/questions", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        const list = res?.data?.questions || [];

        setQuestions(list);

        // Seed anything already answered so a returning carrier sees their work.
        setAnswers(
          list.reduce((acc, question) => {
            if (question.answer != null) {
              acc[question.id] = { answer: question.answer };
            }
            return acc;
          }, {}),
        );
      })
      .catch((err) => setErrorMessage(err?.message || "Could not load questions."));
  }, [initing, currentStep, questions.length, token]);

  const clearReturnFlag = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("verificationSessionId");
    next.delete("stripeConnect");

    // Terminal Link appends its own three on the way back.
    next.delete("eld");
    next.delete("result");
    next.delete("token");
    next.delete("state");
    setSearchParams(next, { replace: true });
  };

  // ── Step 2: government ID ────────────────────────────────────────────────

  const startIdentity = async () => {
    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/identity/start", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token }),
      });

      window.location.href = res.data.url;
    } catch (err) {
      setBusy(false);
      setErrorMessage(err?.message || "Could not start verification.");
    }
  };

  const checkIdentity = async () => {
    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/identity/verify", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token }),
      });

      applyRequest(res.data);
      setCurrentStep(3);
      setSuccessMessage(res.message || "Identity verified.");
    } catch (err) {
      setCurrentStep(2);
      setErrorMessage(err?.message || "Verification is still pending.");
    } finally {
      setBusy(false);
      clearReturnFlag();
    }
  };

  /**
   * Moves past the government ID or bank step without completing it.
   *
   * Recorded as skipped rather than silently left blank, so the broker can tell
   * "declined to do this" apart from "has not reached it yet" before they
   * tender a load.
   */
  const skipStep = async (step) => {
    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/skip", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token, step }),
      });

      applyRequest(res.data);

      // Each skip lands on the step after the one declined.
      setCurrentStep({ identity: 3, bank: 4, eld: 5 }[step] ?? 4);
    } catch (err) {
      setErrorMessage(err?.message || "Could not skip this step.");
    } finally {
      setBusy(false);
    }
  };

  // ── Step 3: bank + factoring ─────────────────────────────────────────────

  const connectBank = async () => {
    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/stripe/connect", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token }),
      });

      window.location.href = res.data.url;
    } catch (err) {
      setBusy(false);
      setErrorMessage(err?.message || "Could not open the bank form.");
    }
  };

  const verifyBank = async () => {
    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/stripe/verify", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token }),
      });

      applyRequest(res.data);
      setSuccessMessage(res.message || "Bank account connected.");
    } catch (err) {
      setErrorMessage(err?.message || "Your bank details are incomplete.");
    } finally {
      setCurrentStep(3);
      setBusy(false);
      clearReturnFlag();
    }
  };

  // ── Step 4: ELD ──────────────────────────────────────────────────────────

  const connectEld = async () => {
    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/eld/connect", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token }),
      });

      window.location.href = res.data.url;
    } catch (err) {
      setBusy(false);
      setErrorMessage(err?.message || "Could not open the ELD connection page.");
    }
  };

  /**
   * Finish the connection the carrier just made at Terminal.
   *
   * Terminal appends `result`, `token` and `state` to the return URL. The
   * public token is single-use and worthless without the state, which the API
   * checks against what it stored when the link was opened.
   */
  const verifyEld = async (publicToken, state) => {
    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/eld/verify", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          token,
          public_token: publicToken,
          state,
        }),
      });

      applyRequest(res.data);
      setSuccessMessage(res.message || "ELD connected.");
    } catch (err) {
      setErrorMessage(err?.message || "Could not finish connecting your ELD.");
    } finally {
      setCurrentStep(4);
      setBusy(false);
      clearReturnFlag();
    }
  };

  /**
   * Persists the factoring answer on its own.
   *
   * This deliberately does not advance the wizard and does not care whether the
   * bank step is finished. It used to run only from goNext, which returns early
   * at the bank gate — so a carrier who ticked the toggle and uploaded their
   * notice of assignment before completing Stripe had the file sitting in React
   * state only, and a refresh threw it away.
   *
   * @returns {Promise<boolean>} whether the answer reached the server
   */
  const persistFactoring = async ({ silent = false, doc } = {}) => {
    // `doc` is passed explicitly by the file picker: setFactoringDoc has not
    // flushed by the time the handler runs, so reading the state here would
    // post the previous file (or none at all).
    const file = doc !== undefined ? doc : factoringDoc;

    const form = new FormData();
    form.append("token", token);
    form.append("uses_factoring_company", usesFactoring ? "1" : "0");

    if (usesFactoring) {
      form.append("factoring_company_name", factoringName);
      if (file) form.append("document", file);
    }

    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/factoring", {
        method: "POST",
        skipAuth: true,
        body: form,
      });

      applyRequest(res.data);

      // The server now holds the file, so drop the local copy — the chip falls
      // back to the saved document_name and stops claiming a pending upload.
      setFactoringDoc(null);

      if (!silent) {
        setSuccessMessage(res.message || "Factoring details saved.");
      }

      return true;
    } catch (err) {
      setErrorMessage(err?.message || "Could not save your factoring details.");

      return false;
    } finally {
      setBusy(false);
    }
  };

  // Saving the moment the carrier hands us a complete answer means the work
  // survives a refresh even if they never reach the Next button.
  const onFactoringDocChosen = async (file) => {
    setFactoringDoc(file);

    // Only a name plus a document is a complete answer the API will accept, so
    // a file picked before the name is typed cannot go yet — onFactoringNameCommitted
    // sends it as soon as the name lands. Until then the chip says so rather
    // than implying the upload is safe.
    if (file && factoringName.trim()) {
      await persistFactoring({ silent: true, doc: file });
    }
  };

  /**
   * Saves on blur once the answer is complete.
   *
   * The file picker is usually the last thing a carrier touches, but not always
   * — plenty upload the notice of assignment first and type the company name
   * after. That order used to save nothing at all: onFactoringDocChosen bailed
   * on the empty name, and nothing re-checked once the name arrived, so a
   * refresh lost both the toggle and the file.
   */
  const onFactoringNameCommitted = async () => {
    if (!usesFactoring || !factoringName.trim()) return;

    // The API validates `document` as required on every write where
    // uses_factoring_company is true — there is no name-only update path — so
    // a request without a freshly attached PDF can only come back 422.
    if (!factoringDoc) return;

    await persistFactoring({ silent: true });
  };

  // Toggling is not persisted on its own: saving a "no" deletes any notice of
  // assignment already on file, which is too destructive to do on a stray tap.
  // goNext saves the final answer either way.
  const onFactoringToggled = () => {
    setUsesFactoring((value) => {
      if (value) setFactoringDoc(null);

      return !value;
    });
  };

  // ── Step 4: broker questions ─────────────────────────────────────────────

  const updateAnswer = (questionId, patch) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...current[questionId], ...patch },
    }));

    setAnswerErrors((current) => {
      const next = { ...current };
      delete next[`answers.${questionId}`];
      return next;
    });
  };

  const submitAnswers = async () => {
    if (questions.length === 0) {
      setCurrentStep(6);
      return;
    }

    const form = new FormData();
    form.append("token", token);

    questions.forEach((question) => {
      const value = answers[question.id] || {};

      form.append(`answers[${question.id}][question_id]`, String(question.id));

      if (value.answer != null && value.answer !== "") {
        form.append(`answers[${question.id}][answer]`, String(value.answer));
      }

      if (value.document) {
        form.append(`answers[${question.id}][document]`, value.document);
      }
    });

    setBusy(true);
    setAnswerErrors({});

    try {
      const res = await apiFetch("/carrier-connect/answers", {
        method: "POST",
        skipAuth: true,
        body: form,
      });

      applyRequest(res.data);
      setCurrentStep(6);
      setSuccessMessage(res.message || "Answers saved.");
    } catch (err) {
      // The API reports which question failed, so surface it inline rather than
      // as one opaque banner.
      const fieldErrors = err?.errors || {};

      setAnswerErrors(
        Object.keys(fieldErrors).reduce((acc, key) => {
          acc[key] = Array.isArray(fieldErrors[key])
            ? fieldErrors[key][0]
            : fieldErrors[key];
          return acc;
        }, {}),
      );

      setErrorMessage(err?.message || "Some answers are missing.");
    } finally {
      setBusy(false);
    }
  };

  // ── Step 5: compliance documents ─────────────────────────────────────────

  /*
  | Each file is sent the moment it is chosen rather than being batched behind
  | the Continue button, so closing the tab halfway through costs at most the
  | one upload still in flight.
  |
  | `uploadingDoc` rather than `busy`: busy raises a full-screen backdrop, which
  | would hide the very slot the carrier is watching.
  */
  const uploadDocument = async (type, file) => {
    if (!file) return;

    const form = new FormData();
    form.append("token", token);
    form.append("type", type);
    form.append("document", file);

    setUploadingDoc(type);
    setErrorMessage("");

    try {
      const res = await apiFetch("/carrier-connect/documents", {
        method: "POST",
        skipAuth: true,
        body: form,
      });

      applyRequest(res.data);
      setSuccessMessage(res.message || "Document uploaded.");
    } catch (err) {
      setErrorMessage(err?.message || "Could not upload that document.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const removeDocument = async (type) => {
    setUploadingDoc(type);
    setErrorMessage("");

    try {
      const res = await apiFetch(`/carrier-connect/documents/${type}/remove`, {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token }),
      });

      applyRequest(res.data);
    } catch (err) {
      setErrorMessage(err?.message || "Could not remove that document.");
    } finally {
      setUploadingDoc(null);
    }
  };

  // ── Step 6: e-sign ───────────────────────────────────────────────────────

  const submitSignature = async () => {
    if (!signature) {
      setErrorMessage("Please draw or upload your signature first.");
      return;
    }

    if (!placement) {
      setErrorMessage("Drag your signature onto the agreement to place it.");
      return;
    }

    const form = new FormData();
    form.append("token", token);
    form.append("signature", signature);
    form.append("page", String(placement.page));
    form.append("x_pct", String(placement.xPct));
    form.append("y_pct", String(placement.yPct));

    setBusy(true);

    try {
      const res = await apiFetch("/carrier-connect/esign", {
        method: "POST",
        skipAuth: true,
        body: form,
      });

      applyRequest(res.data);
      setSuccessMessage(res.message || "Agreement signed.");
    } catch (err) {
      setErrorMessage(err?.message || "Could not save your signature.");
    } finally {
      setBusy(false);
    }
  };

  // Didit and Stripe both hand the carrier back with a query flag; each needs a
  // server-side confirmation before the step counts as done. Declared after the
  // handlers so they exist by the time it runs.
  useEffect(() => {
    if (initing || !token) return;

    if (searchParams.get("verificationSessionId")) {
      checkIdentity();
      return;
    }

    if (searchParams.get("stripeConnect")) {
      verifyBank();
      return;
    }

    if (searchParams.get("eld")) {
      // "exit" means they closed Terminal without linking anything. Nothing to
      // verify, and nothing went wrong — just drop them back on the step.
      if (searchParams.get("result") === "success") {
        verifyEld(searchParams.get("token"), searchParams.get("state"));
      } else {
        setCurrentStep(4);
        clearReturnFlag();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initing]);

  // ── Navigation ───────────────────────────────────────────────────────────

  const goNext = () => {
    if (currentStep === 1) {
      if (!isPhoneVerified) {
        setErrorMessage("Please verify your phone number first.");
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!isIdSettled) {
        setErrorMessage(
          "Please verify your government ID, or skip this step to continue.",
        );
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (usesFactoring && !factoringName.trim()) {
        setErrorMessage("Please enter your factoring company name.");
        return;
      }

      if (usesFactoring && !factoringDoc && !savedFactoringDocName) {
        setErrorMessage("Please upload your factoring notice of assignment.");
        return;
      }

      // A changed company name still needs the PDF re-attached, because the API
      // rejects any factoring write that arrives without one. Saying so beats
      // firing a request that can only 422.
      if (
        usesFactoring &&
        !factoringDoc &&
        factoringName.trim() !== savedFactoringName
      ) {
        setErrorMessage(
          "Re-upload your notice of assignment to save the new company name.",
        );
        return;
      }

      const advance = () => {
        // A carrier who factors is paid by their factoring company, so there is
        // no payout account to ask for and the bank gate does not apply.
        if (!usesFactoring && !isBankSettled) {
          setErrorMessage(
            "Please connect your bank account, or skip this step to continue.",
          );
          return;
        }

        setCurrentStep(4);
      };

      // Already stored and unchanged — re-posting it would only earn a 422 for
      // the missing `document` and strand the carrier here.
      if (factoringMatchesServer) {
        advance();
        return;
      }

      /*
      | Save before the bank gate, not after. The bank check used to come first
      | and return early, so a carrier who had filled in their factoring details
      | but not yet finished Stripe lost them on every refresh — the answer only
      | ever reached the server on the one press of Next that happened to come
      | after Stripe was done.
      */
      persistFactoring().then((saved) => {
        if (saved) advance();
      });

      return;
    }

    if (currentStep === 4) {
      if (!isEldSettled) {
        setErrorMessage(
          "Please connect your ELD, or skip this step to continue.",
        );
        return;
      }

      setCurrentStep(5);
      return;
    }

    if (currentStep === 5) {
      submitAnswers();
      return;
    }

    if (currentStep === 6) {
      if (!isDocumentsDone) {
        setErrorMessage(
          "Please upload both your W-9 and your certificate of insurance.",
        );
        return;
      }

      setCurrentStep(7);
    }
  };

  const goBack = () => setCurrentStep((step) => Math.max(step - 1, 1));

  // ── Render ───────────────────────────────────────────────────────────────

  if (!initing && isSigned) {
    return (
      <ThankYou
        brokerName={broker?.company_name}
        carrierName={carrier?.legal_name}
        completedSteps={[
          "Phone number verified",
          "Government ID verified",
          "Bank account connected",
          isFactoringAnswered && usesFactoring
            ? "Factoring details provided"
            : "Factoring details confirmed",
          isQuestionnaireDone ? "Broker questions answered" : null,
          "W-9 and certificate of insurance provided",
          "Broker agreement signed",
        ].filter(Boolean)}
      />
    );
  }

  const detailRows = [
    { label: "DOT Number", value: carrier?.dot_number },
    { label: "MC Number", value: carrier?.mc_number },
    { label: "Legal Name", value: carrier?.legal_name },
    { label: "DBA Name", value: carrier?.dba_name },
    { label: "Email", value: carrier?.email_address },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-white px-4 py-10 font-sans text-[#1A1A1A]">
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Stepper */}
      <div className="mb-16 w-full max-w-6xl px-4 select-none">
        <div className="relative h-12 w-full">
          <div className="absolute top-6 right-4 left-4 z-0 h-[2px] bg-[#E5E7EB]">
            <div
              className="h-full bg-[#1D4ED8] transition-all duration-300 ease-in-out"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between">
            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div
                  key={step.id}
                  className="pointer-events-auto flex items-center bg-white first:pl-0 last:pr-0"
                >
                  <div className="flex items-center bg-white px-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
                        isActive || isCompleted
                          ? "bg-[#1D4ED8] text-white"
                          : "border-2 border-[#E5E7EB] bg-white text-[#9CA3AF]"
                      }`}
                    >
                      {step.id}
                    </div>

                    <span
                      className={`ml-2 hidden text-xs font-bold tracking-wider whitespace-nowrap transition-colors duration-300 lg:inline ${
                        isActive ? "text-[#1F2937]" : "text-[#9CA3AF]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-full bg-[#EFF6FF] px-4 py-1.5 text-[11px] font-bold tracking-widest text-[#1E40AF] uppercase">
        Step {currentStep} of {steps.length}
      </div>

      <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#111827]">
        {stepTitles[currentStep]}
      </h1>

      <p className="mb-12 text-sm text-[#4B5563]">
        {broker?.company_name
          ? `${broker.company_name} has invited you to connect. To be completed by your signing authority.`
          : "To be completed by the signing authority of your organisation."}
      </p>

      {initing ? (
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-12 gap-6">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div className="col-span-6" key={`skeleton-${index}`}>
                <Skeleton width="100%" height={100} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={`flex w-full flex-col ${
            currentStep === 7 ? "max-w-6xl" : "max-w-3xl"
          }`}
        >
          {/* Step 1 — carrier details + phone */}
          {currentStep === 1 && (
            <div className="mb-8 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              {detailRows.map((row) => (
                <div key={row.label} className="flex flex-col space-y-2">
                  <label className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                    {row.label}
                  </label>

                  <div className="h-[52px] w-full truncate rounded-xl border border-[#E5E7EB] px-4 py-3.5 text-[15px] text-[#1F2937]">
                    {row.value || "NA"}
                  </div>
                </div>
              ))}

              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                  Phone
                </label>

                <div className="relative flex items-center">
                  <div className="h-[52px] w-full rounded-xl border border-[#E5E7EB] px-4 py-3.5 text-[15px] text-[#1F2937]">
                    {carrier?.telephone || "NA"}
                  </div>

                  <button
                    type="button"
                    disabled={!carrier?.telephone || isPhoneVerified}
                    onClick={() => setIsOtpOpen(true)}
                    className={`absolute right-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                      isPhoneVerified
                        ? "cursor-default bg-emerald-100 text-emerald-700"
                        : !carrier?.telephone
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "bg-[#E6F4EA] text-[#137333] hover:bg-[#D2ECD7]"
                    }`}
                  >
                    {isPhoneVerified ? "Verified ✓" : "Verify"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — government ID */}
          {currentStep === 2 && (
            <div className="mb-8 flex w-full flex-col items-center">
              <label className="mb-3 text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                National ID card, passport, driver's licence or residence permit
              </label>

              <div
                className={`group flex min-h-[200px] w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                  isIdVerified
                    ? "border-green-300 bg-green-50"
                    : isIdSkipped
                      ? "border-gray-300 bg-gray-50"
                      : "border-gray-300 bg-[#FAFBFD] hover:border-blue-500"
                }`}
                onClick={() => (isIdVerified ? setCurrentStep(3) : startIdentity())}
              >
                <Badge
                  style={{ fontSize: 100 }}
                  className={
                    isIdVerified
                      ? "text-green-700 opacity-20"
                      : "text-blue-100 group-hover:text-blue-200"
                  }
                />

                {isIdVerified ? (
                  <div className="flex items-center gap-2">
                    <DoneAll className="text-green-600" />
                    <span className="text-xl font-bold text-green-600">
                      Verified
                    </span>
                  </div>
                ) : (
                  <span className="text-md font-bold text-blue-200 uppercase group-hover:text-blue-300">
                    {isIdSkipped ? "Skipped — click to verify" : "Click to start"}
                  </span>
                )}
              </div>

              {connectRequest?.identity_status && !isIdVerified && (
                <p className="mt-3 text-xs text-[#B45309]">
                  Current status: {connectRequest.identity_status}
                </p>
              )}

              {/* Skipping stays reversible — the carrier can still come back
                  and verify, and the broker sees it as skipped either way. */}
              {!isIdVerified && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => skipStep("identity")}
                  className="mt-4 text-xs font-semibold text-[#6B7280] underline underline-offset-2 transition-colors hover:text-[#374151] disabled:opacity-40"
                >
                  {isIdSkipped
                    ? "Skipped — continue without verifying"
                    : "Skip for now, I'll verify later"}
                </button>
              )}
            </div>
          )}

          {/* Step 3 — bank + factoring */}
          {currentStep === 3 && (
            <div className="mb-8 flex w-full flex-col items-center">
              {/*
                Factoring is asked first because the answer decides whether the
                rest of this step applies at all — a factored carrier is paid by
                their factoring company, so there is no payout account to
                connect. Asking for bank details first and then retracting the
                request reads as a mistake.
              */}
              <div className="w-full max-w-xl">
                <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#FAFBFD] px-4 py-3.5">
                  <div className="pr-4">
                    <span className="text-sm font-semibold text-[#374151]">
                      Do you use a factoring company?
                    </span>

                    <p className="mt-0.5 text-xs text-[#9CA3AF]">
                      If your invoices are factored, we need the notice of
                      assignment before we can pay you.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={usesFactoring}
                    onClick={onFactoringToggled}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                      usesFactoring ? "bg-[#1D4ED8]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        usesFactoring ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {usesFactoring && (
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex flex-col space-y-2">
                      <label className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                        Factoring company name
                      </label>

                      <input
                        type="text"
                        value={factoringName}
                        onChange={(event) => setFactoringName(event.target.value)}
                        onBlur={onFactoringNameCommitted}
                        placeholder="e.g. Apex Capital"
                        className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-[15px] text-[#1F2937] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                        Notice of assignment (PDF)
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <input
                        id="factoring-doc"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(event) => {
                          onFactoringDocChosen(event.target.files?.[0] || null);

                          // Re-picking the same filename fires no change event
                          // unless the input is cleared first.
                          event.target.value = "";
                        }}
                      />

                      {factoringDoc || savedFactoringDocName ? (
                        <div
                          className={`flex items-center gap-3 rounded-xl border p-3 ${
                            factoringDoc
                              ? "border-amber-200 bg-amber-50/40"
                              : "border-emerald-200 bg-emerald-50/40"
                          }`}
                        >
                          <div className="rounded-lg bg-white p-2 text-[#1D4ED8]">
                            <DescriptionOutlined style={{ fontSize: 20 }} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {factoringDoc?.name || savedFactoringDocName}
                            </p>

                            {/*
                              A file still held only in the browser is one
                              refresh away from being gone, so say that plainly
                              instead of showing the same green "uploaded" chip
                              for both states.
                            */}
                            <p
                              className={`text-xs ${
                                factoringDoc
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {factoringDoc
                                ? `${(factoringDoc.size / 1024).toFixed(0)} KB · not saved yet — enter your company name to upload`
                                : "Saved"}
                            </p>
                          </div>

                          {/*
                            Once the file is on the server there is no endpoint
                            to delete it, so the only honest action is to swap
                            it for another one. Clearing local state here just
                            made the button look broken.
                          */}
                          <label
                            htmlFor="factoring-doc"
                            title={factoringDoc ? "Remove" : "Replace"}
                            className="cursor-pointer rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600"
                            onClick={(event) => {
                              if (!factoringDoc) return;

                              event.preventDefault();
                              setFactoringDoc(null);
                            }}
                          >
                            {factoringDoc ? (
                              <Close style={{ fontSize: 18 }} />
                            ) : (
                              <Upload style={{ fontSize: 18 }} />
                            )}
                          </label>
                        </div>
                      ) : (
                        <label
                          htmlFor="factoring-doc"
                          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#FAFBFD] py-8 transition-all hover:border-[#1D4ED8]"
                        >
                          <FileUploadOutlined
                            style={{ fontSize: 32 }}
                            className="text-blue-100"
                          />

                          <p className="mt-1 text-sm text-[#4B5563]">
                            <span className="font-semibold text-[#1D4ED8] underline">
                              Choose a PDF
                            </span>{" "}
                            or drop it here
                          </p>

                          <p className="mt-1 text-xs text-[#9CA3AF]">
                            Required — up to 10MB
                          </p>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bank — only when the carrier is not factored. */}
              {usesFactoring ? (
                <div className="mt-8 w-full max-w-xl rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <DoneAll
                      style={{ fontSize: 18 }}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        No bank account needed
                      </p>

                      <p className="mt-0.5 text-xs leading-relaxed text-emerald-700">
                        Your factoring company is paid directly, so there is
                        nothing to connect here. Continue once your notice of
                        assignment is attached.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex w-full flex-col items-center">
                  <label className="mb-3 text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                    Connect and verify your bank account
                  </label>

                  <div
                    className={`group flex min-h-[180px] w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                      isBankVerified
                        ? "border-green-300 bg-green-50"
                        : isBankSkipped
                          ? "border-gray-300 bg-gray-50"
                          : "border-gray-300 bg-[#FAFBFD] hover:border-blue-500"
                    }`}
                    onClick={() => !isBankVerified && connectBank()}
                  >
                    <AccountBalance
                      style={{ fontSize: 80 }}
                      className={
                        isBankVerified
                          ? "text-green-700 opacity-20"
                          : "text-blue-100 group-hover:text-blue-200"
                      }
                    />

                    {isBankVerified ? (
                      <div className="flex items-center gap-2">
                        <DoneAll className="text-green-600" />
                        <span className="text-xl font-bold text-green-600">
                          Verified
                        </span>
                      </div>
                    ) : (
                      <span className="text-md font-bold text-blue-200 uppercase group-hover:text-blue-300">
                        {isBankSkipped
                          ? "Skipped — click to connect"
                          : "Click to start"}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 max-w-xl text-center text-xs text-[#9CA3AF]">
                    Payouts are handled by Stripe. Your bank details are entered
                    on Stripe's own form and are never stored here.
                  </p>

                  {!isBankVerified && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => skipStep("bank")}
                      className="mt-4 text-xs font-semibold text-[#6B7280] underline underline-offset-2 transition-colors hover:text-[#374151] disabled:opacity-40"
                    >
                      {isBankSkipped
                        ? "Skipped — continue without a bank account"
                        : "Skip for now, I'll add this later"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4 — ELD / telematics, connected through Terminal */}
          {currentStep === 4 && (
            <div className="mb-8 flex w-full flex-col items-center">
              <p className="mb-6 max-w-xl text-center text-sm text-[#4B5563]">
                Connect your ELD so {broker?.company_name || "this broker"} can
                see your hours of service and vehicle locations without asking
                you for them load by load.
              </p>

              <div className="flex w-full flex-col items-center">
                <label className="mb-3 text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                  Connect your ELD provider
                </label>

                <div
                  className={`group flex min-h-[180px] w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                    isEldConnected
                      ? "border-green-300 bg-green-50"
                      : isEldSkipped
                        ? "border-gray-300 bg-gray-50"
                        : "border-gray-300 bg-[#FAFBFD] hover:border-blue-500"
                  }`}
                  onClick={() => !isEldConnected && connectEld()}
                >
                  <SensorsOutlined
                    style={{ fontSize: 80 }}
                    className={
                      isEldConnected
                        ? "text-green-700 opacity-20"
                        : "text-blue-100 group-hover:text-blue-200"
                    }
                  />

                  {isEldConnected ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <DoneAll className="text-green-600" />
                        <span className="text-xl font-bold text-green-600">
                          {eld?.provider ? `${eld.provider} connected` : "Connected"}
                        </span>
                      </div>

                      {/*
                        The fleet arrives on a queue, so the carrier reaches the
                        next step while it is still importing. Saying so beats a
                        tick next to an empty fleet.
                      */}
                      <span className="text-xs text-[#6B7280]">
                        {eld?.sync_status === "completed"
                          ? `${eld?.vehicles ?? 0} vehicles, ${eld?.drivers ?? 0} drivers`
                          : "Importing your fleet — this continues in the background."}
                      </span>
                    </div>
                  ) : (
                    <span className="text-md font-bold text-blue-200 uppercase group-hover:text-blue-300">
                      {isEldSkipped
                        ? "Skipped — click to connect"
                        : "Click to start"}
                    </span>
                  )}
                </div>

                <p className="mt-3 max-w-xl text-center text-xs text-[#9CA3AF]">
                  You sign in with your ELD provider directly. Your provider
                  login is never entered here and is not stored by us.
                </p>

                {!isEldConnected && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => skipStep("eld")}
                    className="mt-4 text-xs font-semibold text-[#6B7280] underline underline-offset-2 transition-colors hover:text-[#374151] disabled:opacity-40"
                  >
                    {isEldSkipped
                      ? "Skipped — continue without an ELD"
                      : "Skip for now, my provider isn't supported"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 5 — the broker's questions */}
          {currentStep === 5 && (
            <div className="mb-8 w-full">
              <p className="mb-6 text-sm text-[#4B5563]">
                {broker?.company_name || "This broker"} asks every carrier the
                following before tendering loads.
              </p>

              <BrokerQuestions
                questions={questions}
                values={answers}
                errors={answerErrors}
                onChange={updateAnswer}
                disabled={busy || isQuestionnaireDone}
              />
            </div>
          )}

          {/* Step 5 — compliance documents */}
          {currentStep === 6 && (
            <div className="mb-8 w-full">
              <p className="mb-6 text-sm text-[#4B5563]">
                {broker?.company_name || "This broker"} needs these on file
                before the agreement can be signed. PDF, JPG or PNG, up to 10MB
                each.
              </p>

              <div className="flex flex-col gap-4">
                {documentSlots.map((slot) => {
                  const uploading = uploadingDoc === slot.type;

                  return (
                    <div key={slot.type} className="flex flex-col space-y-2">
                      <label className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
                        {slot.label}
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <input
                        id={`document-${slot.type}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(event) => {
                          uploadDocument(slot.type, event.target.files?.[0]);

                          // Re-picking the same filename after a removal fires
                          // no change event unless the input is cleared.
                          event.target.value = "";
                        }}
                      />

                      {slot.uploaded ? (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                          <div className="rounded-lg bg-white p-2 text-[#1D4ED8]">
                            <DescriptionOutlined style={{ fontSize: 20 }} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {slot.uploaded.name}
                            </p>

                            <p className="text-xs text-gray-400">
                              {slot.uploaded.size
                                ? `${(slot.uploaded.size / 1024).toFixed(0)} KB`
                                : "Uploaded"}
                            </p>
                          </div>

                          {/*
                            Opened straight from the API rather than through
                            apiFetch: this streams a PDF or an image, and the
                            carrier has no session — the invitation token in the
                            path is what authorises it, so a plain link works
                            and lets the browser render it natively.
                          */}
                          <a
                            href={`${API_BASE}/carrier-connect/documents/${token}/${slot.type}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`View ${slot.label}`}
                            className="rounded-full p-1.5 text-gray-400 no-underline hover:bg-white hover:text-[#1D4ED8]"
                          >
                            <VisibilityOutlined style={{ fontSize: 18 }} />
                          </a>

                          <button
                            type="button"
                            disabled={uploading}
                            title={`Remove ${slot.label}`}
                            onClick={() => removeDocument(slot.type)}
                            className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 disabled:opacity-40"
                          >
                            {uploading ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Close style={{ fontSize: 18 }} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor={`document-${slot.type}`}
                          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#FAFBFD] py-8 transition-all hover:border-[#1D4ED8]"
                        >
                          {uploading ? (
                            <CircularProgress size={22} />
                          ) : (
                            <>
                              <FileUploadOutlined
                                style={{ fontSize: 26 }}
                                className="text-[#94A3B8]"
                              />

                              <span className="mt-2 text-sm font-semibold text-[#374151]">
                                Upload your {slot.label}
                              </span>

                              <span className="mt-0.5 text-xs text-[#9CA3AF]">
                                PDF, JPG or PNG · max 10MB
                              </span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 6 — e-sign */}
          {currentStep === 7 && (
            <div className="w-full">
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-7">
                  <PdfViewer
                    pdfUrl={agreementUrl}
                    title={agreementName}
                    signatureUrl={signatureUrl}
                    placement={placement}
                    onPlace={setPlacement}
                    onClear={() => setPlacement(null)}
                  />
                </div>

                <div className="col-span-12 lg:col-span-5">
                  <strong className="text-sm text-gray-400">
                    Digital signature
                  </strong>

                  <div className="mt-2 mb-5 flex items-center justify-between rounded-lg bg-[#F1F5F9CC] p-2">
                    <button
                      type="button"
                      className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg py-1 ${
                        eSignType === "draw" ? "bg-white" : ""
                      }`}
                      onClick={() => {
                        setESignType("draw");
                        setSignature(null);
                        setPlacement(null);
                      }}
                    >
                      <Edit
                        style={{ fontSize: 14 }}
                        className={
                          eSignType === "draw"
                            ? "text-[#006C49]"
                            : "text-gray-500"
                        }
                      />
                      <span
                        className={`ml-1 text-xs font-semibold ${
                          eSignType === "draw"
                            ? "text-[#006C49]"
                            : "text-gray-500"
                        }`}
                      >
                        Sign
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg py-1 ${
                        eSignType === "upload" ? "bg-white" : ""
                      }`}
                      onClick={() => {
                        setESignType("upload");
                        setSignature(null);
                        setPlacement(null);
                      }}
                    >
                      <Upload
                        style={{ fontSize: 14 }}
                        className={
                          eSignType === "upload"
                            ? "text-[#006C49]"
                            : "text-gray-500"
                        }
                      />
                      <span
                        className={`ml-1 text-xs font-semibold ${
                          eSignType === "upload"
                            ? "text-[#006C49]"
                            : "text-gray-500"
                        }`}
                      >
                        Upload
                      </span>
                    </button>
                  </div>

                  {eSignType === "draw" ? (
                    <ESign
                      onChange={(file) => {
                        setSignature(file);
                        setPlacement(null);
                      }}
                      disabled={busy}
                    />
                  ) : (
                    <ESignUpload
                      onChange={(file) => {
                        setSignature(file);
                        setPlacement(null);
                      }}
                      disabled={busy}
                    />
                  )}

                  {/* Drag chip — drop this onto the agreement to place it. */}
                  {signatureUrl && (
                    <div className="mt-5">
                      {placement ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2.5">
                          <DoneAll
                            style={{ fontSize: 18 }}
                            className="text-emerald-600"
                          />

                          <span className="flex-1 text-xs text-emerald-800">
                            Placed on page {placement.page}. Drag again to move
                            it.
                          </span>

                          <button
                            type="button"
                            onClick={() => setPlacement(null)}
                            className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <div
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              "application/x-signature",
                              "1",
                            );
                            event.dataTransfer.effectAllowed = "copy";

                            const ghost = new Image();
                            ghost.src = signatureUrl;
                            event.dataTransfer.setDragImage(ghost, 20, 10);
                          }}
                          title="Drag onto the agreement to place your signature"
                          className="flex cursor-grab items-center gap-2 rounded-xl border-2 border-dashed border-[#1D4ED8] bg-blue-50/40 px-3 py-2.5 active:cursor-grabbing"
                        >
                          <img
                            src={signatureUrl}
                            alt="Your signature"
                            className="h-7 max-w-[90px] object-contain"
                          />

                          <span className="flex-1 text-xs font-semibold text-[#1E40AF]">
                            Drag me onto the signature line
                          </span>

                          <DragIndicator
                            style={{ fontSize: 18 }}
                            className="text-[#93C5FD]"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={submitSignature}
                    disabled={!signature || !placement || busy}
                    className="mt-6 w-full rounded-xl bg-[#1D4ED8] py-3.5 text-sm font-semibold tracking-wide text-white shadow-md transition-all hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                  >
                    Sign and submit
                  </button>

                  {!agreementUrl && (
                    <p className="mt-3 text-center text-xs text-[#B45309]">
                      The broker has not uploaded an agreement yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="my-6 h-[1px] w-full bg-[#E5E7EB]" />

          {currentStep !== 7 && (
            <div className="mt-2 flex items-center justify-between">
              {currentStep === 1 ? (
                <span className="flex items-center space-x-2 text-sm font-semibold text-[#4B5563]">
                  <HeadsetMic style={{ fontSize: 16 }} />
                  <span>
                    Need help? Contact {broker?.company_name || "the broker"} who
                    invited you.
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={goBack}
                  className="text-sm font-semibold text-[#4B5563] transition-colors hover:text-black"
                >
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={goNext}
                disabled={busy}
                className="rounded-xl bg-[#1D4ED8] px-10 py-3.5 text-sm font-semibold tracking-wide text-white shadow-md transition-all hover:bg-[#1E40AF] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Continue to step {currentStep + 1}
              </button>
            </div>
          )}
        </div>
      )}

      <OtpModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        token={token}
        onVerifySuccess={(request) => {
          setIsOtpOpen(false);
          applyRequest(request);
          setSuccessMessage("Phone number verified.");
        }}
      />

      <Backdrop open={busy} sx={{ zIndex: 1300, color: "#fff" }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
}
