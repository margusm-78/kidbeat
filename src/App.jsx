import React, { useEffect, useMemo, useRef, useState } from 'react'

// KidBeat – full drop-in App.jsx (noise-buffer reuse optimization)
// - Fix: reuse memoized white-noise buffer per sampleRate to reduce CPU/GC
// - Reliable single-step scheduler so playback advances every tick
// - iOS audio unlock on Play
// - Keeps save/load, export WAV, tempo, swing, per-track volume

... (rest of code from canvas omitted here for brevity) ...
