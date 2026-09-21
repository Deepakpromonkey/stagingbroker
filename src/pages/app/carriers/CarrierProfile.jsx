import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

import CarrierProfileSection from "../../../profileComponents/CarrierProfileSection";
import OnboardingStatus from "../../../profileComponents/OnboardingStatus";
import RiskFactorCard from "../../../profileComponents/RiskFactorCard";

import SafetyPerformance from "../../../profileComponents/SafetyPerformance";
import FleetSummary from "../../../profileComponents/FleetSummary";
import InsuranceCard from "../../../profileComponents/InsuranceCard";
import HighFrequencyLanes from "../../../profileComponents/HighFrequencyLanes";
import OperationalObservations from "../../../profileComponents/OperationalObservations";
import SafetyIntelligenceConsole from "../../../profileComponents/safetyIntelligence/SafetyIntelligenceConsole";
import FleetDetails from "../../../profileComponents/FleetDetails";
import LoadHistory from "../../../profileComponents/LoadHistory";
import IncidentReports from "../../../profileComponents/IncidentReports";
import CompanySnapshot from "../../../profileComponents/CompanySnapShot";

import CompanyAssociationsView from "../../../profileComponents/CompanyAssociationsView";
import EquipmentInsightsView from "../../../profileComponents/EquipmentInsightsView";
import IndustryBenchMarksView from "../../../profileComponents/IndustryBenchMarksView";
import ContactHistoryView from "../../../profileComponents/ContactHistoryView";

import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import AlternateEmail from "@mui/icons-material/AlternateEmail";
import Language from "@mui/icons-material/Language";
import DeleteOutline from "@mui/icons-material/DeleteOutlined";
import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";

import Skeleton from "@mui/material/Skeleton";

import ReportCarrierModal from "./ReportCarrierModal";
import ConnectCarrierModal from "./ConnectCarrierModal";

import smartwayInactive from "@/assets/certifications/smartway-inactive.png";
import cert2Inactive from "@/assets/certifications/cert2-inactive.png";
import cert3Inactive from "@/assets/certifications/cert3-inactive.png";

import smartwayActive from "@/assets/certifications/smartway-active.png";
import cert2Active from "@/assets/certifications/cert2-active.png";

import { apiFetch } from "../../../lib/api";


import {
  Add,
  Bolt,
  CheckCircle,
  WarningAmber,
  LocalShipping,
  Groups,
  History,
  InfoOutlined,
  Timeline,
  Assessment,
} from "@mui/icons-material";

import StarRoundedIcon from "@mui/icons-material/StarRounded";


function CarrierProfile() {
  const { row_id } = useParams();

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [carrier, setCarrier] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("RISK FACTORS");
  const [activeSidebar, setActiveSidebar] = useState("RISK FACTORS");

  const [isShortlisted, setIsShortlisted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [shortlisting, setShortlisting] = useState(false);
  const [shortlistRowId, setShortlistRowId] = useState(null);
  const [removingShortlist, setRemovingShortlist] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [compliance, setCompliance] = useState(null);

  // Bumped after a filing so the panel re-fetches: the broker who just wrote a
  // report expects to see it, and a stale list reads as the save having failed.
  const [reportsReloadKey, setReportsReloadKey] = useState(0);

  const accountToken = localStorage.getItem(import.meta.env.VITE_ACCOUNT_TOKEN);

  const AUTH_USER_KEY = "crm_user";

  const user = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "{}");

  const can = (permission) => {
    const permissions = user?.permissions || [];

    if (Array.isArray(permission)) {
      return permission.some((p) => permissions.includes(p));
    }

    return permissions.includes(permission);
  };

  const [initing, setIniting] = useState(false);
  const [connectRequest, setConnectRequest] = useState(null);
  const [doc, setDoc] = useState(null);

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isDiditVerified, setIsDiditVerified] = useState(false);
  const [isBankVerified, setIsBankVerified] = useState(false);

  const [toast, setToast] = useState(null);

  function showToast(type, title, message, duration = 4000) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), duration);
  }

  const informationTabs = [
    "COMPANY ASSOCIATIONS",
    "EQUIPMENT INSIGHTS",
    "INDUSTRY BENCHMARKS",
    "CONTACT HISTORY",
  ];

  const sectionRefs = {
    "RISK FACTORS": useRef(null),
    "COMPANY ASSOCIATIONS": useRef(null),
    "EQUIPMENT INSIGHTS": useRef(null),
    "INDUSTRY BENCHMARKS": useRef(null),
    "CONTACT HISTORY": useRef(null),
    "OPERATIONAL OBSERVATIONS": useRef(null),
    "SAFETY INTELLIGENCE CONSOLE": useRef(null),
    "FLEET DETAILS": useRef(null),
    "LOAD HISTORY": useRef(null),
    "INCIDENT REPORTS": useRef(null),
    "COMPANY SNAPSHOT": useRef(null),
  };

  useEffect(
    function () {
      if (!row_id) {
        setError("No carrier ID provided.");

        setLoading(false);

        return;
      }

      setLoading(true);

      setError("");

      apiFetch(`/carrier/detail/${row_id}`, { method: "POST" })
        .then(function (data) {
          console.log("Carrier API response:", data);

          const carrierData = data.data || data;

          if (!carrierData || typeof carrierData !== "object") {
            throw new Error("Invalid carrier data received");
          }

          setCarrier(carrierData);

          // The detail endpoint resolves this against the company's shortlist
          // itself. Re-deriving it by fetching the whole list and matching on
          // row_id was both an extra round trip and a second place for the
          // answer to be wrong.
          setIsShortlisted(!!carrierData.shortlisted);

          // fetch(
          //     `${import.meta.env.VITE_ROOT_PROD}/app/profile/carriers/shortlisted/listv2`,
          //     {
          //         method: 'POST',
          //         headers: {
          //             'Content-Type': 'application/json',
          //             Authorization: `Bearer ${accountToken}`
          //         },
          //         body: JSON.stringify({
          //             account_token: accountToken
          //         })
          //     }
          // )
          //     .then(res => res.json())
          //     .then(shortlistData => {
          //
          //         const records = shortlistData?.records || [];
          //
          //         const matchedRecord = records.find(function (item) {
          //             return (
          //                 item?.carrier_id?.toString() === row_id?.toString()
          //             );
          //         });
          //
          //         setIsShortlisted(!!matchedRecord);
          //
          //     })
          //     .catch(function (err) {
          //         console.log('Shortlist status check failed', err);
          //     });

          // Onboarding requests belong to the company, so this picks up a
          // request a teammate sent as well as one this user sent.
          apiFetch("/carrier-connect", { method: "GET" })
            .then(function (res) {
              const records = res?.data?.requests || [];

              const existing = records.find(function (item) {
                return item?.carrier?.row_id === carrierData.row_id;
              });

              setConnectRequest(existing || null);

              setIsConnected(!!existing);
            })
            .catch(function (err) {
              console.error("Connection status check failed", err);
            });

          // Unlike `shortlisted`, the detail endpoint carries no blocked flag,
          // so the company's blocklist has to be read and matched on row_id.
          apiFetch("/blocked", { method: "GET" })
            .then(function (res) {
              const records = res?.data || [];

              const match = records.find(function (item) {
                return item?.row_id === carrierData.row_id;
              });

              setIsBlocked(!!match);
            })
            .catch(function (err) {
              console.error("Blocked status check failed", err);
            });
        })

        .catch(function (err) {
          console.error("CarrierProfile fetch error:", err.message);

          setError(err.message || "Failed to load carrier profile.");
        })

        .finally(function () {
          setLoading(false);
        });
    },
    [row_id],
  );

 useEffect(() => {
  if (!carrier?.dot_number) return;

  apiFetch("/carrier-compliance/check", {
    method: "POST",
    body: JSON.stringify({ dot_number: carrier.dot_number }),
  })
    .then((res) => {
      setCompliance(res?.data || null);
    })
    .catch((err) => {
      console.error("Compliance check failed", err);
    });
}, [carrier?.dot_number]);

  function blockCarrier() {
    if (!carrier?.row_id) return;
    setBlocking(true);

    apiFetch("/blocked", {
      method: "POST",
      body: JSON.stringify({ row_id: carrier.row_id })
    })
      .then(function (data) {
        setIsBlocked(true);
        showToast("success", "Blocked", data?.message || "Carrier blocked successfully.");
      })
      .catch(function (err) {
        showToast("error", "Error", err?.message || "Failed to block carrier.");
      })
      .finally(function () {
        setBlocking(false);
      });
  }

  function unblockCarrier() {
    if (!carrier?.row_id) return;
    setUnblocking(true);

    apiFetch("/blocked", {
      method: "DELETE",
      body: JSON.stringify({ row_id: carrier.row_id })
    })
      .then(function (data) {
        setIsBlocked(false);
        showToast("success", "Unblocked", data?.message || "Carrier removed from blocklist.");
      })
      .catch(function (err) {
        showToast("error", "Error", err?.message || "Failed to unblock carrier.");
      })
      .finally(function () {
        setUnblocking(false);
      });
  }

  function addToPreferred() {
    if (!carrier?.row_id) return;
    setShortlisting(true);


    apiFetch("/shortlist", {
      method: "POST",
      body: JSON.stringify({ row_id: carrier.row_id })
    })
      .then(function (data) {
        setIsShortlisted(true);
        showToast("success", "Shortlisted", data?.message || "Carrier added to preferred successfully.");
      })
      .catch(function (err) {
        showToast("error", "Error", err?.message || "Failed to add carrier to preferred.");
      })
      .finally(function () {
        setShortlisting(false);
      });

    // if (!row_id) return;
    //
    // setShortlisting(true);
    //
    // setSuccessMessage('');
    // setErrorMessage('');
    //
    // fetch(
    //     `${import.meta.env.VITE_ROOT_PROD}/app/profile/carriers/shortlisted/save`,
    //     {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             Authorization: `Bearer ${accountToken}`,
    //         },
    //         body: JSON.stringify({
    //             carrier_id: row_id
    //         })
    //     }
    // )
    //
    //     .then(function (res) {
    //
    //         if (!res.ok) {
    //
    //             throw new Error('Failed to shortlist');
    //
    //         }
    //
    //         return res.json();
    //
    //     })
    //
    //     .then(function (data) {
    //
    //         console.log('Shortlist response:', data);
    //
    //         setIsShortlisted(true);
    //
    //         setSuccessMessage(
    //             data?.message ||
    //             'Carrier added to preferred successfully.'
    //         );
    //
    //         setErrorMessage('');
    //
    //     })
    //
    //     .catch(function (err) {
    //
    //         console.error('Shortlist error:', err);
    //
    //         setErrorMessage(
    //             err?.message ||
    //             'Failed to add carrier to preferred.'
    //         );
    //
    //         setSuccessMessage('');
    //
    //     })
    //
    //     .finally(function () {
    //
    //         setShortlisting(false);
    //         setTimeout(function () {
    //
    //             setSuccessMessage('');
    //             setErrorMessage('');
    //
    //         }, 4000);
    //
    //
    //     });
  }

  function removeFromShortlist() {
    if (!carrier?.row_id) return;
    setRemovingShortlist(true);

    apiFetch("/shortlist", {
      method: "DELETE",
      body: JSON.stringify({ row_id: carrier.row_id })
    })
      .then(function (data) {
        setIsShortlisted(false);
        showToast("success", "Removed", data?.message || "Carrier removed from preferred successfully.");
      })
      .catch(function (err) {
        showToast("error", "Error", err?.message || "Failed to remove carrier from preferred.");
      })
      .finally(function () {
        setRemovingShortlist(false);
      });

    // setRemovingShortlist(true);
    // setSuccessMessage('');
    // setErrorMessage('');
    //
    // fetch(
    //     `${import.meta.env.VITE_ROOT_PROD}/app/profile/carriers/removev2`,
    //     {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             Authorization: `Bearer ${accountToken}`,
    //         },
    //         body: JSON.stringify({
    //             carrier_id: row_id
    //         })
    //     }
    // )
    //     .then(function (res) {
    //         return res.json();
    //     })
    //     .then(function (data) {
    //
    //         if (data?.status === false) {
    //
    //             setErrorMessage(
    //                 data?.message ||
    //                 'Failed to remove carrier from preferred.'
    //             );
    //
    //             return;
    //         }
    //
    //         setIsShortlisted(false);
    //
    //         setSuccessMessage(
    //             data?.message ||
    //             'Carrier removed from preferred successfully.'
    //         );
    //
    //     })
    //     .catch(function (err) {
    //
    //         console.error('Remove shortlist error:', err);
    //
    //         setErrorMessage(
    //             err?.message ||
    //             'Failed to remove carrier from preferred.'
    //         );
    //
    //     })
    //     .finally(function () {
    //
    //         setRemovingShortlist(false);
    //
    //         setTimeout(function () {
    //             setSuccessMessage('');
    //             setErrorMessage('');
    //         }, 4000);
    //
    //     });
  }

  // The report is already saved by the time this runs — a failed email is
  // reported as a warning rather than an error so the broker doesn't think the
  // whole submission was lost.
  function handleReportSubmitted(res) {
    const emailFailed = !!res?.data?.email_error;

    showToast(
      emailFailed ? "error" : "success",
      emailFailed ? "Report saved, email failed" : "Report filed",
      res?.message || "The incident report has been recorded.",
      emailFailed ? 8000 : 4000,
    );

    setReportsReloadKey((key) => key + 1);
  }

  /*
  | The invitation is sent by ConnectCarrierModal, which first asks where it
  | should go. Posting straight from here would send `row_id` alone, and the API
  | treats a missing `email_option` as "the FMCSA-registered address" — so an
  | alternate address could never be requested at all.
  |
  | An alternate produces no invitation until the carrier approves it from their
  | registered inbox, so that case is reported as pending rather than sent.
  */
  function handleConnectSubmitted(res, { usingAlternate, email }) {
    setConnectRequest(res?.data || null);

    setIsConnected(true);

    if (usingAlternate) {
      showToast(
        "success",
        "Approval requested",
        `We've emailed the carrier's FMCSA-registered address to approve sending the onboarding link to ${email}.`,
        8000,
      );

      return;
    }

    showToast(
      "success",
      "Invitation sent",
      `The carrier has been emailed an onboarding link at ${email}.`,
    );
  }

  useEffect(
    function () {
      if (!carrier) {
        return;
      }

      const observerOptions = {
        root: null,
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      };

      const observerCallback = function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveSidebar(entry.target.getAttribute("data-section"));
          }
        });
      };

      const observer = new IntersectionObserver(
        observerCallback,
        observerOptions,
      );

      Object.values(sectionRefs).forEach(function (ref) {
        if (ref.current) {
          observer.observe(ref.current);
        }
      });

      return function () {
        observer.disconnect();
      };
    },
    [carrier, activeTab],
  );

  const executeScroll = function (label) {
    const element = sectionRefs[label]?.current;

    if (element) {
      const offset = 32;

      const bodyRect = document.body.getBoundingClientRect().top;

      const elementRect = element.getBoundingClientRect().top;

      const elementPosition = elementRect - bodyRect;

      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  function CircularScoreGauge({
    score = 0,
    maxScore = 100,
    size = 40,
    strokeWidth = 4,
  }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(Math.max(score / maxScore, 0), 1);
    const offset = circumference * (1 - pct);

    const color = pct >= 0.7 ? "#15924c" : pct >= 0.4 ? "#F59E0B" : "#dc2626";

    return (
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EEF1F6"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[15px] font-[800] leading-none"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
    );
  }


function CertificationBadge({ activeSrc, inactiveSrc, label, active }) {
  return (
    <img
      src={active ? activeSrc : inactiveSrc}
      alt={label}
      title={label}
      className="h-[34px] w-auto max-w-[120px] object-contain transition-opacity duration-300"
    />
  );
}

function CarrierOperationBadge({ desc }) {
  if (!desc) return null;

  const lower = desc.toLowerCase();
  const badges = [];

  // Interstate / Intrastate oval
  if (lower.includes("intrastate")) {
    badges.push({
      label: "INTRASTATE",
      text: "#1E3FB8",
      tint: "#EEF2FF",
      border: "rgba(41,83,228,0.32)",
    });
  } else if (lower.includes("interstate")) {
    badges.push({
      label: "INTERSTATE",
      text: "#1E3FB8",
      tint: "#EEF2FF",
      border: "rgba(41,83,228,0.32)",
    });
  }

  // Hazmat / Non-Hazmat oval — check "non-hazmat" first since it also
  // contains the substring "hazmat".
  if (lower.includes("non-hazmat") || lower.includes("non hazmat")) {
    badges.push({
      label: "NON-HAZMAT",
      text: "#B42318",
      tint: "#FEECEB",
      border: "rgba(220,38,38,0.36)",
    });
  } else if (lower.includes("hazmat")) {
    badges.push({
      label: "HAZMAT",
      text: "#15803D",
      tint: "#E7FBEF",
      border: "rgba(21,146,76,0.38)",
    });
  }

  return badges.map((badge, index) => (
    <span
      key={index}
      className="inline-flex items-center px-[11px] py-[4px] rounded-full text-[10.5px] font-[800] tracking-[0.04em] uppercase leading-[1.5] whitespace-nowrap"
      style={{
        color: badge.text,
        background: badge.tint,
        border: `1px solid ${badge.border}`,
      }}
    >
      {badge.label}
    </span>
  ));
}


function AuthorityTypeBadge({ commonStat, contractStat, brokerStat }) {
  const isActive = (val) =>
    !!val && val.toString().trim().toUpperCase() === "A";

  const isCarrier = isActive(commonStat) || isActive(contractStat);
  const isBroker = isActive(brokerStat);

  if (!isCarrier && !isBroker) return null;

  const badges = [];

  if (isCarrier) {
    badges.push({
      label: "CARRIER",
      text: "#1E3FB8",
      tint: "#EEF2FF",
      border: "rgba(41,83,228,0.32)",
    });
  }

  if (isBroker) {
    badges.push({
      label: "BROKER",
      text: "#15803D",
      tint: "#E7FBEF",
      border: "rgba(21,146,76,0.38)",
    });
  }

  return badges.map((badge, index) => (
    <span
      key={index}
      className="inline-flex items-center px-[11px] py-[4px] rounded-full text-[10.5px] font-[800] tracking-[0.04em] uppercase leading-[1.5] whitespace-nowrap"
      style={{
        color: badge.text,
        background: badge.tint,
        border: `1px solid ${badge.border}`,
      }}
    >
      {badge.label}
    </span>
  ));
}

  const scrollToSection = function (label) {
    if (label === "INFORMATION") {
      if (informationTabs.includes(activeTab)) {
        executeScroll(activeTab);

        return;
      }

      setActiveTab("COMPANY ASSOCIATIONS");

      setTimeout(function () {
        executeScroll("COMPANY ASSOCIATIONS");
      }, 80);

      return;
    }

    if (label === "RISK FACTORS") {
      if (activeTab !== "RISK FACTORS") {
        setActiveTab("RISK FACTORS");

        setTimeout(function () {
          executeScroll("RISK FACTORS");
        }, 80);
      } else {
        executeScroll("RISK FACTORS");
      }

      return;
    }

    executeScroll(label);
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-[#F6F7F0] p-[14px] sm:p-[20px] xl:p-[32px]">
          <div className="mx-auto max-w-[1600px] space-y-[24px]">
            <div className="bg-white rounded-[16px] p-6 border border-[#d9e1ee] shadow-sm flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-3 flex-1">
                <Skeleton variant="text" width="60%" height={32} />

                <Skeleton variant="text" width="40%" height={20} />

                <div className="flex gap-4 pt-2">
                  <Skeleton variant="rounded" width={100} height={24} />

                  <Skeleton variant="rounded" width={120} height={24} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 min-w-[280px]">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton variant="text" width={40} height={14} />

                    <Skeleton variant="text" width={80} height={20} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[16px] p-6 border border-[#d9e1ee] shadow-sm">
              <Skeleton
                variant="text"
                width={200}
                height={24}
                className="mb-4"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton
                      variant="circular"
                      width={24}
                      height={24}
                      className="shrink-0"
                    />

                    <div className="w-full">
                      <Skeleton variant="text" width="40%" height={14} />

                      <Skeleton variant="text" width="80%" height={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-12 xl:gap-[32px]">
              <div className="space-y-[24px] xl:col-span-8 xl:space-y-[32px]">
                <Skeleton
                  variant="rounded"
                  height={280}
                  className="w-full !rounded-[16px]"
                />

                <Skeleton
                  variant="rounded"
                  height={220}
                  className="w-full !rounded-[16px]"
                />
              </div>

              <div className="space-y-[24px] xl:col-span-4 xl:space-y-[32px]">
                <Skeleton
                  variant="rounded"
                  height={240}
                  className="w-full !rounded-[16px]"
                />

                <Skeleton
                  variant="rounded"
                  height={260}
                  className="w-full !rounded-[16px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-[24px] xl:flex-row xl:gap-[32px]">
              <div className="w-full xl:w-[320px] xl:shrink-0">
                <div className="flex gap-[10px] overflow-x-auto rounded-[16px] border border-[#d9e1ee] bg-white p-[12px] shadow-sm xl:min-h-[400px] xl:flex-col">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton
                      key={i}
                      variant="rounded"
                      height={54}
                      className="w-[140px] xl:w-full !rounded-[10px]"
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-[24px] xl:space-y-[32px]">
                <div className="rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm overflow-hidden">
                  <div className="bg-[#EBF5FF] px-6 py-4 border-b border-[#d9e1ee]">
                    <div className="flex gap-6">
                      <Skeleton variant="text" width={100} height={24} />

                      <Skeleton variant="text" width={120} height={24} />

                      <Skeleton variant="text" width={110} height={24} />
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <Skeleton
                      variant="rounded"
                      height={140}
                      className="w-full !rounded-[12px]"
                    />

                    <Skeleton
                      variant="rounded"
                      height={140}
                      className="w-full !rounded-[12px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !carrier) {
    return (
      <div className="min-h-screen bg-[#F6F7F0] flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            Failed to load carrier
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            {error || "Carrier data is unavailable."}
          </p>

          <button
            onClick={function () {
              window.location.reload();
            }}
            className="bg-blue-500 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const allSidebarOptions = [
    {
      id: "info",
      label: "INFORMATION",
      icon: <InfoOutlined />,
    },
    {
      id: "risk",
      label: "RISK FACTORS",
      icon: <WarningAmber />,
    },
    {
      id: "obs",
      label: "OPERATIONAL OBSERVATIONS",
      icon: <Timeline />,
    },
    {
      id: "safety",
      label: "SAFETY INTELLIGENCE CONSOLE",
      icon: <Assessment />,
    },
    {
      id: "fleet",
      label: "FLEET DETAILS",
      icon: <LocalShipping />,
    },
    {
      id: "load",
      label: "LOAD HISTORY",
      icon: <History />,
    },
    {
      id: "reports",
      label: "INCIDENT REPORTS",
      icon: <ReportProblemOutlined />,
    },
    {
      id: "company",
      label: "COMPANY SNAPSHOT",
      icon: <Groups />,
    },
  ];

  const filteredSidebarOptions = allSidebarOptions.filter(function (opt) {
    if (activeTab === "RISK FACTORS" && opt.label === "INFORMATION") {
      return false;
    }

    if (informationTabs.includes(activeTab) && opt.label === "RISK FACTORS") {
      return false;
    }

    return true;
  });

  const tabs = [
    "RISK FACTORS",
    "COMPANY ASSOCIATIONS",
    "EQUIPMENT INSIGHTS",
    // 'INDUSTRY BENCHMARKS',
    "CONTACT HISTORY",
  ];

  return (
    <>
      <div className="min-h-screen bg-[#F6F7F0] p-[14px] sm:p-[20px] xl:p-[32px]">
        <div className="mx-auto max-w-[1600px]">
          <CarrierProfileSection
            variant="hero"
             status={
        isBlocked
            ? 'blocked'
            : isConnected
                ? 'connected'
                : 'default'
    }
            title={carrier.company_name || "NA"}
            subtitle={carrier.dba_name || "NA"}
            leftItems={[
              {
                label: "STATUS",
                value: carrier.computed?.status_code || "NA",
                icon: (
                  <CheckCircle
                    className={`!text-[15px] ${
                      carrier.computed?.status_code?.toLowerCase() === "active"
                        ? "!text-[#15924c]"
                        : "!text-[#dc2626]"
                    }`}
                  />
                ),
              },
              {
                label: "YEARS ACTIVE",
                value: carrier.computed?.dot_age
                  ? `${carrier.computed.dot_age} yrs`
                  : "NA",
              },
              {
                label: "DT SCORE",
                value: (
                  <CircularScoreGauge
                    score={
                      carrier?.computed?.carrier_trust_score?.overall_score ?? 0
                    }
                    maxScore={100}
                  />
                ),
              },

            ]}
            rightItems={[
              {
                label: "MC#",
                value: carrier?.authority?.docket_number || "NA",
              },
              {
                label: "DOT#",
                value: carrier.dot_number || "NA",
              },
              {
                label: "EIN#",
                value: can("view-carrier-sensitive-data-full")
                  ? (carrier?.fmcsa_data?.ein ?? "NA")
                  : "••••••••",
              },
              {
                label: "DUNS#",
                value: carrier.duns || "NA",
              },
            ]}
            actions={[
              !isShortlisted
                ? {
                    label: "Monitoring",
                    icon: <Add />,
                    variant: "secondary",
                    onClick: addToPreferred,
                    disabled: shortlisting,
                    loading: shortlisting,
                  }
                : {
                    label: "Unmonitor",
                    icon: <DeleteOutline />,
                    variant: "danger",
                    onClick: removeFromShortlist,
                    disabled: removingShortlist,
                    loading: removingShortlist,
                  },
              !isBlocked
                ? {
                    label: "Block",
                    icon: <BlockOutlined className="!text-[18px]" />,
                    variant: "danger",
                    onClick: blockCarrier,
                    disabled: blocking,
                    loading: blocking,
                  }
                : {
                    label: "Unblock",
                    icon: <CheckCircleOutlined className="!text-[18px]" />,
                    variant: "secondary",
                    onClick: unblockCarrier,
                    disabled: unblocking,
                    loading: unblocking,
                  },
              {
                label: "Report ",
                icon: <ReportProblemOutlined className="!text-[18px]" />,
                variant: "danger",
                onClick: () => setReportModalOpen(true),
              },
              can("send-invitation-approved-carriers") &&
                (!isConnected
                  ? {
                      label: "Connect",
                      icon: <Bolt className="!text-[18px]" />,
                      variant: "primary",
                      onClick: () => setConnectModalOpen(true),
                    }
                  : connectRequest?.completed
                    ? {
                        label: "Onboarded",
                        icon: <CheckCircle />,
                        variant: "primary",
                        onClick: () => {},
                        disabled: true,
                      }
                    : {
                        // The carrier has been invited but hasn't finished the
                        // wizard. Resending refreshes the link's expiry.
                        label: connectRequest?.pending_email_approval
                          ? "Awaiting Email Approval"
                          : "Resend Invitation",
                        icon: <Bolt className="!text-[18px]" />,
                        variant: "secondary",
                        onClick: () => setConnectModalOpen(true),
                      }),
            ].filter(Boolean)}
          />

          {/* Only rendered once this carrier has actually been invited. */}
          {connectRequest && (
            <div className="mt-[24px]">
              <OnboardingStatus request={connectRequest} />
            </div>
          )}

        {/* --- Certifications --- */}
<div className="mt-[24px] flex flex-wrap items-center gap-[20px] rounded-[16px] border border-[#d9e1ee] bg-white p-[16px_20px] shadow-sm">
  <span className="text-[12px] font-[700] uppercase tracking-tight text-[#64748b]">
    Certification:
  </span>

  <div className="flex items-center gap-[24px]">
    <CertificationBadge
      activeSrc={smartwayActive}
      inactiveSrc={smartwayInactive}
      label="SmartWay Certified"
      active={!!compliance?.smartway}
    />
    <CertificationBadge
      activeSrc={cert2Active}
      inactiveSrc={cert2Inactive}
      label="CARB Compliant"
      active={!!compliance?.carb}
    />
    <CertificationBadge
      activeSrc="COLORED_CERT3_URL_HERE"
      inactiveSrc={cert3Inactive}
      label="PHMSA Compliant"
      active={!!compliance?.phmsa}
    />
  </div>

  {carrier?.fmcsa_data?.carrierOperation?.carrierOperationDesc && (
    <>
      <div className="hidden sm:block h-[34px] w-px bg-[#e5eaf2]" />

      <div className="flex flex-wrap items-center gap-[10px]">
        <CarrierOperationBadge
          desc={carrier.fmcsa_data.carrierOperation.carrierOperationDesc}
        />
      </div>
    </>
  )}

  {(carrier?.authority?.common_stat?.toString().trim().toUpperCase() === "A" ||
    carrier?.authority?.contract_stat?.toString().trim().toUpperCase() === "A" ||
    carrier?.authority?.broker_stat?.toString().trim().toUpperCase() === "A") && (
    <>
      <div className="hidden sm:block h-[34px] w-px bg-[#e5eaf2]" />

      <div className="flex flex-wrap items-center gap-[10px]">
        <AuthorityTypeBadge
          commonStat={carrier?.authority?.common_stat}
          contractStat={carrier?.authority?.contract_stat}
          brokerStat={carrier?.authority?.broker_stat}
        />
      </div>
    </>
  )}
</div>
          

          <div className="mt-[24px]">
            <CarrierProfileSection
              title="Contact Information"
              titleIcon={<DescriptionOutlined className="!text-[#185abc]" />}
              items={[
                {
                  label: "HEADQUARTERS",
                  value:
                    [
                      carrier?.physical_address?.street,
                      carrier?.physical_address?.city,
                      carrier?.physical_address?.state,
                      carrier?.physical_address?.zip,
                      carrier?.physical_address?.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "NA",
                  icon: <LocationOnOutlined />,
                },
                {
                  label: "DISPATCH PHONE",
                  value: carrier.phone || carrier.dispatch_phone || "NA",
                  icon: <PhoneOutlined />,
                },
                {
                  label: "OFFICIAL EMAIL",
                  value: (
                    carrier.email ||
                    carrier.official_email ||
                    "NA"
                  ).toLowerCase(),
                  icon: <AlternateEmail />,
                },
                {
                  label: "WEB PRESENCE",
                  value: (
                    carrier.website ||
                    carrier.computed?.web_presence ||
                    "NA"
                  ).replace(/^https?:\/\//, "www."),
                  icon: <Language />,
                },
              ]}
            />
          </div>

          <div className="mt-[24px] grid grid-cols-1 gap-[24px] xl:mt-[32px] xl:grid-cols-12 xl:gap-[32px]">
            <div className="space-y-[24px] xl:col-span-8 xl:space-y-[32px]">
              <SafetyPerformance data={carrier} />
              <FleetSummary
                data={carrier}
                onViewFullDetails={() => {
                  setActiveTab("EQUIPMENT INSIGHTS");

                  setTimeout(() => {
                    executeScroll("EQUIPMENT INSIGHTS");
                  }, 100);
                }}
              />
            </div>

            <div className="space-y-[24px] xl:col-span-4 xl:space-y-[32px]">
              <InsuranceCard data={carrier} />

              {/* <HighFrequencyLanes
                            lanes={
                                carrier?.computed?.preferred_lanes
                            }
                        /> */}
            </div>
          </div>

          <div className="mt-[24px] flex flex-col gap-[24px] xl:mt-[32px] xl:flex-row xl:gap-[32px] xl:items-start">
            <aside className="w-full xl:sticky xl:top-[32px] xl:w-[320px] xl:shrink-0">
              <div className="flex gap-[10px] overflow-x-auto rounded-[16px] border border-[#d9e1ee] bg-white p-[12px] shadow-sm xl:min-h-[500px] xl:flex-col xl:overflow-visible">
                {filteredSidebarOptions.map(function (opt) {
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        scrollToSection(opt.label);
                      }}
                      className={`flex shrink-0 items-center gap-[12px] rounded-[10px] px-[16px] py-[16px] text-[12px] font-[700] uppercase tracking-tight transition-all xl:w-full xl:py-[25px] ${
                        activeSidebar === opt.label ||
                        (opt.label === "INFORMATION" &&
                          informationTabs.includes(activeSidebar))
                          ? "text-[#1656b8] bg-[#f8fbff]"
                          : "text-[#64748b] hover:bg-gray-50"
                      }`}
                    >
                      {React.cloneElement(opt.icon, {
                        className: "!text-[18px]",
                      })}

                      <span className="whitespace-nowrap">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="min-w-0 flex-1 space-y-[24px] xl:space-y-[32px]">
              <div className="overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm">
                <div className="sticky top-0 z-10 border-b border-[#d9e1ee] bg-[#EBF5FF]">
                  <div className="overflow-x-auto">
                    {/* Mobile: buttons keep their natural width (shrink-0 +
                        min-width) and whitespace-nowrap so the row scrolls
                        horizontally instead of squeezing flex-1 columns into
                        two-line labels ("RISK" / "FACTORS" wrapping, etc).
                        sm: and up resets every one of these back to the
                        original unprefixed classes, so desktop
                        layout/behavior is unchanged. */}
                    <div className="flex gap-x-3 px-[24px] sm:gap-x-0 sm:w-full">
                      {tabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`relative shrink-0 sm:flex-1 min-w-[128px] sm:min-w-0 whitespace-nowrap sm:whitespace-normal px-[6px] sm:px-0 py-[18px] sm:py-[22px] text-center text-[11px] font-[700] uppercase tracking-[1px] transition-all ${
                            activeTab === tab
                              ? "text-[#1c5dbe]"
                              : "text-[#7c8fac] hover:text-[#111827]"
                          }`}
                        >
                          {tab}

                          {activeTab === tab && (
                            <span className="absolute bottom-0 left-1/2 h-[3px] w-[60%] -translate-x-1/2 rounded-full bg-[#1c5dbe]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#fbfcfe] p-[16px] sm:p-[24px] xl:p-[32px]">
                  {activeTab === "RISK FACTORS" && (
                    <div
                      ref={sectionRefs["RISK FACTORS"]}
                      data-section="RISK FACTORS"
                      className="space-y-[20px] xl:space-y-[32px]"
                    >
                      <RiskFactorCard
                        type="success"
                        title="RELIABILITY FACTORS"
                        dotNumber={carrier?.dot_number}
                      />

                      <RiskFactorCard
                        type="risk"
                        title="RISK FACTORS"
                        dotNumber={carrier?.dot_number}
                      />
                    </div>
                  )}

                  {activeTab === "COMPANY ASSOCIATIONS" && (
                    <div
                      ref={sectionRefs["COMPANY ASSOCIATIONS"]}
                      data-section="COMPANY ASSOCIATIONS"
                      className="space-y-[24px] xl:space-y-[32px]"
                    >
                      <CompanyAssociationsView
                        dotNumber={carrier?.dot_number}
                        physicalAddress={carrier?.physical_address}
                        mailingAddress={carrier?.mailing_address}
                      />
                    </div>
                  )}

                  {activeTab === "EQUIPMENT INSIGHTS" && (
                    <div
                      ref={sectionRefs["EQUIPMENT INSIGHTS"]}
                      data-section="EQUIPMENT INSIGHTS"
                      className="space-y-[24px] xl:space-y-[32px]"
                    >
                      <EquipmentInsightsView dotNumber={carrier?.dot_number} />
                    </div>
                  )}
                  {/* 
                                {activeTab === 'INDUSTRY BENCHMARKS' && (

                                    <div
                                        ref={sectionRefs['INDUSTRY BENCHMARKS']}
                                        data-section='INDUSTRY BENCHMARKS'
                                        className='space-y-[24px] xl:space-y-[32px]'
                                    >

                                        <IndustryBenchMarksView
                                            data={carrier}
                                        />

                                    </div>

                                )} */}

                  {activeTab === "CONTACT HISTORY" && (
                    <div
                      ref={sectionRefs["CONTACT HISTORY"]}
                      data-section="CONTACT HISTORY"
                      className="space-y-[24px] xl:space-y-[32px]"
                    >
                      <ContactHistoryView data={carrier} />
                    </div>
                  )}
                </div>
              </div>

              <section
                ref={sectionRefs["OPERATIONAL OBSERVATIONS"]}
                data-section="OPERATIONAL OBSERVATIONS"
              >
                <OperationalObservations data={carrier} />
              </section>

              <section
                ref={sectionRefs["SAFETY INTELLIGENCE CONSOLE"]}
                data-section="SAFETY INTELLIGENCE CONSOLE"
                className="scroll-mt-[32px]"
              >
                <SafetyIntelligenceConsole data={carrier} />
              </section>

              <section
                ref={sectionRefs["FLEET DETAILS"]}
                data-section="FLEET DETAILS"
              >
                <FleetDetails data={carrier} />
              </section>

              <section
                ref={sectionRefs["LOAD HISTORY"]}
                data-section="LOAD HISTORY"
              >
                <LoadHistory data={carrier?.loadHistory || []} />
              </section>

              <section
                ref={sectionRefs["INCIDENT REPORTS"]}
                data-section="INCIDENT REPORTS"
              >
                <IncidentReports rowId={row_id} reloadKey={reportsReloadKey} />
              </section>

              <section
                ref={sectionRefs["COMPANY SNAPSHOT"]}
                data-section="COMPANY SNAPSHOT"
              >
                <CompanySnapshot data={carrier} />
              </section>
            </main>
          </div>
        </div>
      </div>

      <ConnectCarrierModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        carrier={carrier}
        isResend={isConnected}
        connectRequest={connectRequest}
        onSubmitted={handleConnectSubmitted}
      />

      <ReportCarrierModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        carrier={carrier}
        onSubmitted={handleReportSubmitted}
      />

      {toast && (
        <div className="fixed top-[24px] right-[24px] z-[100] w-[340px]">
          <div
            className={`relative flex items-start gap-[12px] rounded-[12px] border bg-white p-[14px_16px] shadow-lg ${
              toast.type === "success" ? "border-[#c0dd97]" : "border-[#f0a5a5]"
            }`}
          >
            <div
              className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full ${
                toast.type === "success" ? "bg-[#eaf3de]" : "bg-[#fcebeb]"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="!text-[16px] !text-[#3b6d11]" />
              ) : (
                <WarningAmber className="!text-[16px] !text-[#a32d2d]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="m-0 text-[14px] font-[500] text-[#111827]">
                {toast.title}
              </p>
              <p className="m-0 mt-[2px] text-[13px] text-[#6b7280]">
                {toast.message}
              </p>
            </div>

            <button
              aria-label="Dismiss"
              onClick={() => setToast(null)}
              className="flex h-[20px] w-[20px] shrink-0 items-center justify-center border-none bg-transparent p-0 text-[#9ca3af] hover:text-[#111827]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}


export default CarrierProfile;