// frontend/src/features/data-upload/hooks/useMappingPage.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  analyzeSalesBatch,
  confirmSalesMappings,
  getUploadDetails,
} from "../../../api/data";

import { buildConfirmMappingsPayload } from "../utils/confirmPayload";
import { unwrapUploadDetails } from "../utils/dataUploadErrorUtils";
import { normalizeRole } from "../utils/analysisUtils";

import {
  buildBaseColumnMapFromAnalysis,
  buildColumnMapFromConfirmed,
  buildConfirmResultFromDetails,
  buildRequiredMissingFromColumnMap,
  buildRequiredMissingInit,
  getFriendlyMappingError,
  isCompletedUploadDetails,
  normalizeAnalysisResponse,
} from "../utils/mappingPageUtils";

import { useFakeProgress } from "./useFakeProgress";

export function useMappingPage({ batchId, navigate, t }) {
  const tRef = useRef(t);

  const [error, setError] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [columnMap, setColumnMap] = useState({});
  const [requiredMissingMap, setRequiredMissingMap] = useState({});

  const [confirming, setConfirming] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);

  const { pct: analyzePct, finish: finishAnalyzePct } =
    useFakeProgress(analysisLoading);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!batchId) return;

      setError("");
      setAnalysisLoading(true);

      try {
        const [analysisResult, detailsResult] = await Promise.allSettled([
          analyzeSalesBatch(batchId),
          getUploadDetails(batchId),
        ]);

        if (cancelled) return;

        const details =
          detailsResult.status === "fulfilled"
            ? unwrapUploadDetails(detailsResult.value)
            : null;

        if (isCompletedUploadDetails(details, analysisResult)) {
          const currentT = tRef.current;

          navigate("/app/data-upload/uploads", {
            replace: true,
            state: {
              uploadWarning: currentT("uploadsPage.completedUploadWarning", {
                defaultValue:
                  "This upload is already finished. The products from this file were already added to AIMOPS.",
              }),
            },
          });

          return;
        }

        if (analysisResult.status === "rejected") {
          throw analysisResult.reason;
        }

        const normalizedAnalysis = normalizeAnalysisResponse(
          analysisResult.value,
        );

        const confirmedFromDetails = buildConfirmResultFromDetails(details);
        const baseColumnMap = buildBaseColumnMapFromAnalysis(normalizedAnalysis);

        setAnalysis(normalizedAnalysis);

        if (confirmedFromDetails?.success) {
          const confirmedColumnMap = buildColumnMapFromConfirmed(
            normalizedAnalysis,
            confirmedFromDetails,
            baseColumnMap,
          );

          setColumnMap(confirmedColumnMap);
          setRequiredMissingMap(
            buildRequiredMissingFromColumnMap(
              normalizedAnalysis,
              confirmedColumnMap,
            ),
          );
          setAlreadyConfirmed(true);
          return;
        }

        setColumnMap(baseColumnMap);
        setRequiredMissingMap(buildRequiredMissingInit(normalizedAnalysis));
        setAlreadyConfirmed(false);
      } catch (err) {
        if (!cancelled) {
          const currentT = tRef.current;
          const fallback = currentT("mappingPage.errorAnalyzeFailed");

          setError(getFriendlyMappingError(err, fallback, currentT));
          setAnalysis(null);
        }
      } finally {
        if (!cancelled) {
          finishAnalyzePct();
          window.setTimeout(() => setAnalysisLoading(false), 220);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [batchId, finishAnalyzePct, navigate]);

  const allColumnsOptions = useMemo(() => {
    const columns = analysis?.columns || [];

    return columns.map((column) => ({
      value: String(column.index),
      label: column.name,
    }));
  }, [analysis]);

  const needsVerificationSet = useMemo(() => {
    const set = new Set();

    (analysis?.classified?.needs_verification || []).forEach((column) => {
      set.add(String(column.index));
    });

    return set;
  }, [analysis]);

  const setRole = (colIndex, roleRaw) => {
    if (alreadyConfirmed) return;

    const nextRole = normalizeRole(roleRaw);

    setColumnMap((previous) => {
      const previousEntry = previous[colIndex] || {};
      const previousRole = normalizeRole(previousEntry.role);

      const roleChanged = previousRole !== nextRole;
      const needsReconfirm =
        roleChanged && needsVerificationSet.has(String(colIndex));

      return {
        ...previous,
        [colIndex]: {
          ...previousEntry,
          role: nextRole,
          include: nextRole !== "skip",
          verified: needsReconfirm ? false : !!previousEntry.verified,
        },
      };
    });
  };

  const confirmVerified = (colIndex) => {
    if (alreadyConfirmed) return;

    setColumnMap((previous) => ({
      ...previous,
      [colIndex]: {
        ...(previous[colIndex] || {}),
        verified: true,
      },
    }));
  };

  const toggleInclude = (colIndex) => {
    if (alreadyConfirmed) return;

    setColumnMap((previous) => ({
      ...previous,
      [colIndex]: {
        ...(previous[colIndex] || {}),
        include: !previous[colIndex]?.include,
      },
    }));
  };

  const setRequiredMissing = (requiredRole, colIndexStr) => {
    if (alreadyConfirmed) return;

    setRequiredMissingMap((previous) => ({
      ...previous,
      [requiredRole]: colIndexStr,
    }));

    const colIndex = Number(colIndexStr);

    if (Number.isNaN(colIndex)) return;

    const isNeedsVerification = needsVerificationSet.has(String(colIndex));

    setColumnMap((previous) => ({
      ...previous,
      [colIndex]: {
        ...(previous[colIndex] || {}),
        role: normalizeRole(requiredRole),
        include: true,
        verified: !isNeedsVerification,
      },
    }));
  };

  const canConfirm = useMemo(() => {
    if (!analysis) return false;
    if (alreadyConfirmed) return true;

    const needsVerification = analysis?.classified?.needs_verification || [];

    for (const column of needsVerification) {
      if (!columnMap?.[column.index]?.verified) return false;
    }

    const needsMapping = analysis?.classified?.needs_mapping || [];

    for (const column of needsMapping) {
      const role = normalizeRole(columnMap?.[column.index]?.role);
      if (!role || role === "skip") return false;
    }

    const requiredMissing = analysis?.classified?.required_missing || [];

    for (const required of requiredMissing) {
      if (!requiredMissingMap?.[required.role]) return false;
    }

    return true;
  }, [analysis, columnMap, requiredMissingMap, alreadyConfirmed]);

  const handleConfirm = useCallback(async () => {
    setError("");

    if (!analysis || !batchId) return;

    if (alreadyConfirmed) {
      navigate(`/app/data-upload/review/${batchId}`);
      return;
    }

    const payload = buildConfirmMappingsPayload({ analysis, columnMap });

    try {
      setConfirming(true);

      const response = await confirmSalesMappings(batchId, payload);

      setAlreadyConfirmed(!!response?.success);

      navigate(`/app/data-upload/review/${batchId}`, {
        state: {
          confirmMappingsResult: response,
        },
      });
    } catch (err) {
      const currentT = tRef.current;
      const fallback = currentT("mappingPage.errorConfirmFailed");

      setError(getFriendlyMappingError(err, fallback, currentT));
    } finally {
      setConfirming(false);
    }
  }, [alreadyConfirmed, analysis, batchId, columnMap, navigate]);

  return {
    error,
    analysisLoading,
    analysis,
    analyzePct,
    columnMap,
    requiredMissingMap,
    confirming,
    alreadyConfirmed,
    allColumnsOptions,
    canConfirm,

    setRole,
    confirmVerified,
    toggleInclude,
    setRequiredMissing,
    handleConfirm,
  };
}