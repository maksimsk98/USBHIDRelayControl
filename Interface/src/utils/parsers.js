export function parseIntegrationAndReport(raw = {}) {
  const {
    integration = null,
    reportSectionChecks = null,
    reportCalcParams = null,
  } = raw ?? {};

  // 1:1 — как в chooseMethod
  const {
    markStart = null,
    minHeight = null,
    minHalfWidth = null,

    useRelativeTimes = true,
    maxRelation = 15,
    searchWindow = 2,

    isSmoothingPulseChecked = true,
    isSmoothingAdaptiveChecked = true,
    isSmoothingCubicChecked = false,
    isSmoothingDoubleChecked = false,

    smoothingFactor = 1,
    smoothingWindow = 5,
    smoothingMinLevel = null,

    alternativeFilters = 'none',

    useDriftCompensation = false,
    driftFrom = null,
    driftTo = null,
  } = integration ?? {};

  const autoMarkParams = {
    markStart,
    minHeight,
    minHalfWidth,
  };

  const peakIdParams = {
    useRelativeTimes,
    maxRelation,
    searchWindow,
  };

  const smoothingParams = {
    isSmoothingPulseChecked,
    isSmoothingAdaptiveChecked,
    isSmoothingCubicChecked,
    isSmoothingDoubleChecked,
    smoothingFactor,
    smoothingWindow,
    smoothingMinLevel,
    alternativeFilters,
    useDriftCompensation,
    driftFrom,
    driftTo,
  };

  // 1:1 — как в chooseMethod
  const {
    generalParams = {},
    peakParams = {},
  } = reportSectionChecks ?? {};

  return {
    autoMarkParams,
    peakIdParams,
    smoothingParams,
    report: {
      generalParams,
      peakParams,
      reportCalcParams,
    },
  };
}
