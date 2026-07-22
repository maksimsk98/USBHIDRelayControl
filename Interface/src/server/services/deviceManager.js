/**
 * DeviceManager
 *
 * Responsibilities:
 * - store last backend snapshot
 * - track device ownership per session
 * - return owner-aware availability
 * - assign devices from UI config
 * - release devices per session
 */

const { SERVICE_CHROMATOGRAPH_NAMES } = require("./constants");

const freeRangeNodes = ['autosamplerIps'] // freeRange we will use to describe nodes that don't have set list of options, and instead free range of choice

class DeviceManager {
  constructor() {
    this.snapshot = null;
    this.chromatographNames = {}; // sessionId → chromatograph name
  }

  /* -------------------------------------------------------------------------- */
  /* SNAPSHOT MANAGEMENT                                                        */
  /* -------------------------------------------------------------------------- */

  /**
   * Convert backend payload → annotated structure { value, owner }
   */
  annotateSnapshot(raw) {
    const annotateArray = (arr = []) =>
      arr.map(v => ({ value: v, owner: null }));

    return {
      autosamplerIps: annotateArray(raw.autosamplerIps),
      comPortList: annotateArray(raw.comPortList),
      degassers: annotateArray(raw.degassers),
      pumps: annotateArray(raw.pumps),
      thermostats: annotateArray(raw.thermostats),

      detectors: Object.fromEntries(
        Object.entries(raw.detectors || {}).map(([model, list]) => [
          model,
          annotateArray(list)
        ])
      )
    };
  }
  

  /**
   * Update snapshot from backend while preserving ownership.
   * Called after fetchNodes.
   */
  updateSnapshot(raw) {
    const annotated = this.annotateSnapshot(raw);

    if (!this.snapshot) {
      this.snapshot = annotated;
      return;
    }

    const preserveOwner = (oldArr = [], newArr = []) =>
      newArr.map(n => {
        const existing = oldArr.find(o => o.value === n.value);
        return {
          value: n.value,
          owner: existing?.owner ?? null
        };
      });

    // Merge function for free‑range categories: keep all old entries,
    // add any new raw values that don't already exist.
    const mergeFreeRange = (oldArr = [], newArr = []) => {
      const merged = [...oldArr]; // start with all existing entries
      for (const n of newArr) {
        if (!merged.some(ex => ex.value === n.value)) {
          merged.push({ value: n.value, owner: null });
        }
      }
      // Preserve the freeRange flag
      merged.freeRange = true;
      return merged;
    };

    for (const key of Object.keys(annotated)) {
      if (key === "detectors") {
        this.snapshot.detectors ??= {};

        for (const model of Object.keys(annotated.detectors)) {
          this.snapshot.detectors[model] = preserveOwner(
            this.snapshot.detectors[model],
            annotated.detectors[model]
          );
        }
      } else {
        if (freeRangeNodes.includes(key)) {
          this.snapshot[key] = mergeFreeRange(this.snapshot[key], annotated[key]);
        } else {
          this.snapshot[key] = preserveOwner(this.snapshot[key], annotated[key]);
        }
      }
    }

    this.emitUpdate();
  }

  /* -------------------------------------------------------------------------- */
  /* CONFIG → DEVICE EXTRACTION                                                 */
  /* -------------------------------------------------------------------------- */

  /**
   * Extract device references from UI config.
   * Adjust if UI schema changes.
   */
  extractDevicesFromConfig(config) {
    const data = config?.chromatograph?.data;
    if (!data) return [];

    const devices = [];

    const pushDevice = (category, value, model = undefined) => {
        if (!value) return;
        const d = { category, value };
        if (model) d.model = model;
        devices.push(d);
    };

    // AUTOSAMPLER
    if (data.autosampler) {
        pushDevice("autosamplerIps", data.autosampler.ip);
        pushDevice("comPortList", data.autosampler.comPort);
    }

    // DETECTOR
    if (data.detector) {
        pushDevice("detectors", data.detector.name, data.detector.type);
    }

    // THERMOSTAT
    if (data.thermostat) {
        pushDevice("thermostats", data.thermostat.name);
    }

    // DEGASSER
    if (data.degasser) {
        pushDevice("degassers", data.degasser.name);
    }

    // PUMPS
    if (data.pumps) {
        // data.pumps = { A1, A2, B1, B2 }
        for (const key of Object.keys(data.pumps)) {
            pushDevice("pumps", data.pumps[key]);
        }
    }

    return devices;
}


  /* -------------------------------------------------------------------------- */
  /* OWNERSHIP                                                                  */
  /* -------------------------------------------------------------------------- */

  assignFromConfig(config, sessionId) {
    if (!this.snapshot)
      throw new Error("Device snapshot not initialized");

    const devices = this.extractDevicesFromConfig(config);
    const chromatographName = config?.chromatograph?.name ?? null;
    if (SERVICE_CHROMATOGRAPH_NAMES.includes(chromatographName)) return // we don't own temp

    // check phase
    for (const d of devices) {
      const device = this.findDevice(d.category, d.model, d.value);
      if (!device) {
        if (freeRangeNodes.includes(d.category)) {
          // Will be created later – skip logging
          continue;
        }
        console.log(
          `Device not found (ignoring): category=${d.category}, model=${d.model}, value=${d.value}`
        );
        continue;
      }

      if (device.owner && device.owner !== sessionId)
        throw new Error(`Device already taken: ${d.value}`);
    }

    // release previous devices first (reconfiguration)
    this.releaseSession(sessionId);

    // commit phase
    for (const d of devices) {
      const device = this.findDevice(d.category, d.model, d.value);
      if (device) {
        device.owner = sessionId;
      } else {
        // Not found – if free‑range, create a new entry
        if (freeRangeNodes.includes(d.category)) {
          const newEntry = { value: d.value, owner: sessionId };
          // Ensure the array exists (it should, but guard)
          if (!this.snapshot[d.category]) {
            this.snapshot[d.category] = [];
          }
          this.snapshot[d.category].push(newEntry);
        } else {
          // Non‑free‑range and not found – ignore (already logged)
          continue;
        }
      }
    }

    // store chromatograph name per session
    if (chromatographName) {
      this.chromatographNames[sessionId] = chromatographName;
      console.log(`Assigned chromatograph "${chromatographName}" to session ${sessionId}`);
    }

    this.emitUpdate();
  }

  /**
   * Optional helper to get chromatograph name for a session
   */
  getChromatographName(sessionId) {
    return this.chromatographNames[sessionId] ?? null;
  }

  /**
   * Release all devices owned by a session.
   */
  releaseSession(sessionId) {
    if (!this.snapshot) return;

    this.walkDevices(device => {
      if (device.owner === sessionId) {
        device.owner = null;
      }
    });

    delete this.chromatographNames[sessionId];

    this.emitUpdate();
  }

  /* -------------------------------------------------------------------------- */
  /* QUERY                                                                      */
  /* -------------------------------------------------------------------------- */

  /**
   * Return snapshot filtered to only available devices.
   * Used by fetchNodes endpoint.
   */
  getAvailableView(sessionId = null) {
    if (!this.snapshot) return null;

    const extractValues = arr =>
        arr
        .filter(d => !d.owner || d.owner === sessionId)
        .map(d => d.value);

    const result = {};

    for (const key of Object.keys(this.snapshot)) {
        if (key === "detectors") {
        result.detectors = {};

        for (const model of Object.keys(this.snapshot.detectors)) {
            result.detectors[model] = extractValues(
            this.snapshot.detectors[model]
            );
        }
        } else {
        result[key] = extractValues(this.snapshot[key]);
        }
    }

    return result;
    }

    checkChromatographAvailability(chromatographName, sessionId = null) {
      // Input validation
      if (!chromatographName) {
        return {
          available: false,
          owner: null,
          message: "Chromatograph name is required"
        };
      }

      // Find which session owns this chromatograph (if any)
      let ownerSession = null;
      for (const [session, chromaName] of Object.entries(this.chromatographNames)) {
        if (chromaName === chromatographName) {
          ownerSession = session;
          break;
        }
      }

      // Case 1: Chromatograph is free (not owned by anyone)
      if (!ownerSession) {
        return {
          available: true,
          owner: null,
          message: `Chromatograph '${chromatographName}' is available`
        };
      }

      // Case 2: Chromatograph is owned by the requesting session
      if (sessionId && ownerSession === sessionId) {
        return {
          available: true,
          owner: ownerSession,
          message: `Chromatograph '${chromatographName}' is owned by your session`
        };
      }

      // Case 3: Chromatograph is owned by a different session
      return {
        available: false,
        owner: ownerSession,
        message: `Chromatograph '${chromatographName}' is already taken by another session`
      };
    }


    /**
     * Return all devices grouped by session owner.
     * Output format:
     * {
     *   sessionId1: { autosamplerIps: [...], pumps: [...], detectors: { model1: [...] } ... },
     *   sessionId2: { ... }
     * }
     */
    getDevicesBySession() {
      if (!this.snapshot) return {};

      const result = {};

      const assignDevice = (session, category, value, model) => {
          if (!result[session]) result[session] = {};
          if (category === "detectors") {
          result[session].detectors ??= {};
          if (model) result[session].detectors[model] ??= [];
          result[session].detectors[model].push(value);
          } else {
          result[session][category] ??= [];
          result[session][category].push(value);
          }
      };

      this.walkDevices(d => {
          if (!d.owner) return; // skip free devices
          // find category & model
          for (const key of Object.keys(this.snapshot)) {
          if (key === "detectors") {
              for (const [modelName, list] of Object.entries(this.snapshot.detectors)) {
              if (list.includes(d)) {
                  assignDevice(d.owner, "detectors", d.value, modelName);
              }
              }
          } else {
              if (this.snapshot[key].includes(d)) {
              assignDevice(d.owner, key, d.value);
              }
          }
          }
      });

      for (const sessionId of Object.keys(result)) {
        console.log(`Annotating session ${sessionId} with chromatograph name:`, this.chromatographNames[sessionId]);
        result[sessionId].chromatographName = this.chromatographNames[sessionId] ?? null;
      }



      return result;
    }


  /**
   * Optional: return full snapshot including owners (debug/admin)
   */
  getFullSnapshot() {
    return this.snapshot;
  }

  /* -------------------------------------------------------------------------- */
  /* INTERNAL HELPERS                                                           */
  /* -------------------------------------------------------------------------- */

  findDevice(category, model, value) {
    if (!this.snapshot) return null;

    if (category === "detectors") {
      return this.snapshot.detectors?.[model]?.find(
        d => d.value === value
      );
    }

    return this.snapshot[category]?.find(
      d => d.value === value
    );
  }

  walkDevices(fn) {
    for (const key of Object.keys(this.snapshot)) {
      if (key === "detectors") {
        for (const model of Object.values(this.snapshot.detectors)) {
          model.forEach(fn);
        }
      } else {
        this.snapshot[key]?.forEach(fn);
      }
    }
  }

  // socket integration for real-time updates (optional)

    setSocket(io) {
      this.io = io;
    }

    emitUpdate() {
      if (!this.io) return;

      // Annotate snapshot with session→chromatograph mapping
      const snapshot = this.getFullSnapshot();
      const sessions = Object.fromEntries(
        Object.entries(this.chromatographNames).map(([sessionId, chromaName]) => [
          sessionId,
          { chromatographName: chromaName }
        ])
      );

      this.io.emit("devices:update", { snapshot, sessions });
    }
}

/* -------------------------------------------------------------------------- */
/* EXPORT SINGLETON                                                           */
/* -------------------------------------------------------------------------- */

const deviceManager = new DeviceManager();

module.exports = deviceManager;
