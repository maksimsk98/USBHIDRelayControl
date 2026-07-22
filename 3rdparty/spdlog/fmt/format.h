#pragma once

// Compatibility shim, not part of upstream spdlog 1.17.0.
//
// Older spdlog releases shipped spdlog/fmt/format.h directly; 1.17.0 moved the
// bundled fmt copy under spdlog/fmt/bundled/ and only exposes it through the
// spdlog/fmt/fmt.h umbrella header. Several PeakExpertNoGUI translation units
// still do #include <fmt/format.h> directly (independent of spdlog), which
// resolves here because ..\3rdparty\spdlog is on the include path. Keeping
// this shim avoids touching those call sites just to follow spdlog's rename.
#include "bundled/format.h"
