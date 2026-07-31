/* ---------- Twine bridge for Babylon model 8 ---------- */
window.__twineManaged = true;
const bridgeMarkers = Object.fromEntries(
  [...document.querySelectorAll('.room-marker')].map((marker) => [marker.dataset.room, marker])
);
const bridgeState = {
  roomMode:false,
  sceneMode:'hub',
  selected:null,
  hovered:null,
  locked:false,
  completed:{ lighthouse:false, wave:false, fog:false },
  visited:{},
  partNames:{},
  guidePaused:false,
  inputFocused:false,
  lighthouseReady:false,
  observationTimer:0,
  weatherState:{ fog:.15,rain:0,wave:.2,wind:.15,cloud:.25,light:.55 },
  abyss:{
    drive:'unclear',fear:'unknown',depth:0,turbulence:.3,
    visibility:.3,currentSpeed:.26,lightPulse:.24,soundPressure:.28
  },
  waveScrollTarget:.12,
  depthTween:null,
  fogMotionTimer:0
};
let bridgeWindFactor = .15;
window.__sceneMode = bridgeState.sceneMode;
window.__twineRoomMode = bridgeState.roomMode;
window.__waveAbyssState = bridgeState.abyss;

const bridgePost = (type, extra = {}) => {
  window.parent.postMessage({ type, ...extra }, '*');
};
const bridgeClamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number(value) || 0));
const bridgeAbsolute = (node, local = V3(0,0,0)) => {
  node.computeWorldMatrix(true);
  return BABYLON.Vector3.TransformCoordinates(local, node.getWorldMatrix());
};
const bridgeProject = (position, activeCamera = camera) => {
  const rw = engine.getRenderWidth();
  const rh = engine.getRenderHeight();
  const viewport = activeCamera.viewport.toGlobal(rw, rh);
  const screen = BABYLON.Vector3.Project(
    position,
    BABYLON.Matrix.Identity(),
    activeCamera.getTransformationMatrix(),
    viewport
  );
  return {
    x:screen.x * canvas.clientWidth / rw,
    y:screen.y * canvas.clientHeight / rh,
    visible:screen.z >= 0 && screen.z <= 1
  };
};

/* Large, invisible picking volumes for the two foreground rooms. */
const bridgeHitMat = new BABYLON.StandardMaterial('twineRoomHitboxMat', scene);
bridgeHitMat.alpha = .001;
bridgeHitMat.disableLighting = true;
bridgeHitMat.disableDepthWrite = true;
const bridgeFogHit = BABYLON.MeshBuilder.CreateBox('twineFogHitbox', {
  width:FW * 1.75,height:FH * 1.55,depth:FD * 1.65
}, scene);
bridgeFogHit.parent = fogRoom;
bridgeFogHit.position.set(0,FH * .50,0);
bridgeFogHit.material = bridgeHitMat;
bridgeFogHit.visibility = .001;
bridgeFogHit.isPickable = true;
bridgeFogHit.metadata = { isRoomHitbox:true,roomId:'fog' };
const bridgeWaveHit = BABYLON.MeshBuilder.CreateBox('twineWaveHitbox', {
  width:.45,height:.16,depth:.38
}, scene);
bridgeWaveHit.parent = wd;
bridgeWaveHit.position.set(0,.01,.235);
bridgeWaveHit.material = bridgeHitMat;
bridgeWaveHit.visibility = .001;
bridgeWaveHit.isPickable = true;
bridgeWaveHit.metadata = { isRoomHitbox:true,roomId:'wave' };
const bridgeLighthouseHit = BABYLON.MeshBuilder.CreateBox('twineLighthouseHitbox', {
  width:CW * .34,height:LH * .48,depth:.035
}, scene);
bridgeLighthouseHit.parent = windowPane;
bridgeLighthouseHit.position.set(-CW * .23,-LH * .06,.025);
bridgeLighthouseHit.material = bridgeHitMat;
bridgeLighthouseHit.visibility = .001;
bridgeLighthouseHit.isPickable = true;
bridgeLighthouseHit.metadata = { isRoomHitbox:true,roomId:'lighthouse' };

/* A portal-rendered halo makes the tiny lighthouse legible before hover. */
const bridgeLighthouseHaloMat = new BABYLON.StandardMaterial('twineLighthouseHaloMat', scene);
bridgeLighthouseHaloMat.disableLighting = true;
bridgeLighthouseHaloMat.disableDepthWrite = true;
bridgeLighthouseHaloMat.backFaceCulling = false;
bridgeLighthouseHaloMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
bridgeLighthouseHaloMat.emissiveColor = hexc(0xd5a354).scale(1.15);
bridgeLighthouseHaloMat.alpha = .18;
const bridgeLighthouseHalo = BABYLON.MeshBuilder.CreateDisc('twineLighthouseHalo', {
  radius:2.4,tessellation:48,sideOrientation:BABYLON.Mesh.DOUBLESIDE
}, scene);
bridgeLighthouseHalo.parent = tower;
bridgeLighthouseHalo.position.set(0,11.6,.5);
bridgeLighthouseHalo.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
bridgeLighthouseHalo.material = bridgeLighthouseHaloMat;
bridgeLighthouseHalo.layerMask = SEA_LAYER;
bridgeLighthouseHalo.isPickable = false;
if (rtt.renderList.indexOf(bridgeLighthouseHalo) < 0) rtt.renderList.push(bridgeLighthouseHalo);

const bridgeRoomMeshes = {
  fog:fogRoom.getChildMeshes().filter((mesh) => mesh !== bridgeFogHit),
  wave:wd.getChildMeshes().filter((mesh) => mesh !== bridgeWaveHit)
};
const BRIDGE_GOLD = hexc(0xd5a354);
const BRIDGE_GOLD_DIM = hexc(0x5f3d1d);
const bridgeMarkerAnchors = {
  fog:() => bridgeAbsolute(fogRoom,V3(-.04,FH + .055,.02)),
  wave:() => bridgeAbsolute(wd,V3(0,.12,.34)),
  lighthouse:() => bridgeAbsolute(windowPane,V3(-CW * .23,LH * .10,.04))
};
const bridgeMarkerOffsets = {
  fog:{x:-78,y:4},
  wave:{x:-10,y:18},
  lighthouse:{x:112,y:-26}
};
const bridgeRoomLabel = (roomId) => ({
  lighthouse:'등대의 방',fog:'안개의 방',wave:'파도의 방'
}[roomId] || roomId);

function bridgeMarkerPosition(roomId) {
  return bridgeProject(bridgeMarkerAnchors[roomId](),camera);
}
function bridgeUpdateMarkerCopy(roomId, marker) {
  marker.classList.toggle('is-complete',!!bridgeState.completed[roomId]);
  marker.classList.toggle('is-hovered',
    bridgeState.hovered === roomId || bridgeState.selected === roomId);
  const part = marker.querySelector('.room-marker__part');
  if (part) {
    const saved = String(bridgeState.partNames[roomId] || '').trim();
    part.textContent = saved || (
      roomId === 'fog' ? '아직 이름 붙지 않은 부분' :
      roomId === 'lighthouse' ? '계속 살피는 부분' :
      '당장 버티게 하는 부분'
    );
  }
  marker.setAttribute('aria-label',
    bridgeRoomLabel(roomId) + (bridgeState.completed[roomId] ? ' 다시 살펴보기' : ' 살펴보기'));
}
function bridgeUpdateMarkers(now = performance.now()) {
  const active = bridgeState.roomMode && bridgeState.sceneMode === 'hub';
  const breath = .5 + .5 * Math.sin(now * .002);
  Object.entries(bridgeMarkers).forEach(([roomId,marker]) => {
    if (!active) {
      marker.style.display = 'none';
      return;
    }
    const projected = bridgeMarkerPosition(roomId);
    if (!projected.visible) {
      marker.style.display = 'none';
      return;
    }
    const offset = bridgeMarkerOffsets[roomId];
    marker.style.left = (projected.x + offset.x) + 'px';
    marker.style.top = (projected.y + offset.y) + 'px';
    marker.style.display = 'flex';
    bridgeUpdateMarkerCopy(roomId,marker);
  });
  const lighthouseFocus = bridgeState.hovered === 'lighthouse' ||
    bridgeState.selected === 'lighthouse';
  bridgeLighthouseHaloMat.alpha = bridgeState.completed.lighthouse && !lighthouseFocus
    ? .07
    : lighthouseFocus ? .55 : .16 + breath * .08;
  bridgeLighthouseHalo.scaling.setAll(lighthouseFocus ? 1.14 : 1);
  ['fog','wave'].forEach((roomId) => {
    const focused = bridgeState.hovered === roomId || bridgeState.selected === roomId;
    const completed = !!bridgeState.completed[roomId];
    bridgeRoomMeshes[roomId].forEach((mesh) => {
      mesh.renderOutline = active && (!completed || focused);
      mesh.outlineColor = focused ? BRIDGE_GOLD : BRIDGE_GOLD_DIM;
      mesh.outlineWidth = focused ? .006 : .0015 + breath * .0007;
    });
  });
}
function bridgeBeginSelection(roomId) {
  if (!bridgeState.roomMode || bridgeState.sceneMode !== 'hub' ||
      bridgeState.locked || !roomId) return;
  bridgeState.locked = true;
  bridgeState.selected = roomId;
  bridgeState.hovered = roomId;
  canvas.style.cursor = 'default';
  window.setTimeout(() => {
    bridgePost('twine-room-select',{object:roomId});
    bridgeState.locked = false;
  },400);
}
function bridgePickRoom(pointerEvent) {
  const hit = scene.pick(
    scene.pointerX,scene.pointerY,
    (mesh) => !!(mesh.metadata && mesh.metadata.isRoomHitbox),
    false,camera
  );
  if (hit && hit.hit && hit.pickedMesh) return hit.pickedMesh.metadata.roomId;
  const lighthouseMarker = bridgeMarkers.lighthouse;
  if (lighthouseMarker && lighthouseMarker.style.display !== 'none') {
    const rect = lighthouseMarker.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (Math.hypot(pointerEvent.clientX - cx,pointerEvent.clientY - cy) < 86) {
      return 'lighthouse';
    }
  }
  return null;
}

scene.onPointerObservable.add((pointerInfo) => {
  if (!bridgeState.roomMode || bridgeState.sceneMode !== 'hub' || bridgeState.locked) return;
  const event = pointerInfo.event || {};
  const roomId = bridgePickRoom(event);
  if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
    bridgeState.hovered = roomId;
    canvas.style.cursor = roomId ? 'pointer' : 'grab';
  } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK && roomId) {
    bridgeBeginSelection(roomId);
  }
});
canvas.addEventListener('pointerleave',() => {
  if (bridgeState.selected) return;
  bridgeState.hovered = null;
  canvas.style.cursor = 'grab';
});
Object.entries(bridgeMarkers).forEach(([roomId,marker]) => {
  const rename = marker.querySelector('.room-marker__rename');
  const requestRename = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!bridgeState.roomMode || bridgeState.sceneMode !== 'hub') return;
    bridgePost('twine-room-rename',{room:roomId});
  };
  rename?.addEventListener('click',requestRename);
  rename?.addEventListener('keydown',(event) => {
    if (event.key === 'Enter' || event.key === ' ') requestRename(event);
  });
  marker.addEventListener('pointerenter',() => {
    bridgeState.hovered = roomId;
    canvas.style.cursor = 'pointer';
  });
  marker.addEventListener('pointerleave',() => {
    if (!bridgeState.selected) bridgeState.hovered = null;
  });
  marker.addEventListener('click',(event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.target.closest('.room-marker__rename')) return;
    bridgeBeginSelection(roomId);
  });
});

function bridgeWaitFor(predicate,done,timeout = 5600) {
  const started = performance.now();
  const poll = () => {
    if (predicate()) {
      done();
    } else if (performance.now() - started < timeout) {
      requestAnimationFrame(poll);
    } else {
      done();
    }
  };
  poll();
}
function bridgeEnterLighthouse() {
  bridgeState.lighthouseReady = false;
  window.clearTimeout(bridgeState.observationTimer);
  if (!towerMode && !towerBusy) window.enterLighthouse();
  bridgeWaitFor(
    () => towerMode && !towerBusy,
    () => {
      if (bridgeState.lighthouseReady) return;
      bridgeState.lighthouseReady = true;
      bridgePost('lighthouse-interior-ready');
      bridgeState.observationTimer = window.setTimeout(() => {
        if (towerMode && bridgeState.sceneMode === 'lighthouse') {
          bridgePost('lighthouse-observation-ready');
        }
      },3200);
    }
  );
}
function bridgeExitLighthouse() {
  window.clearTimeout(bridgeState.observationTimer);
  if (towerMode && !towerBusy) window.leaveLighthouse();
  bridgeWaitFor(
    () => !towerMode && !towerBusy,
    () => {
      bridgeState.lighthouseReady = false;
      bridgePost('lighthouse-exit-complete');
    },
    1800
  );
}
function bridgeRequestScene(mode) {
  if (!['hub','lighthouse','wave','fog'].includes(mode)) mode = 'hub';
  if (mode === bridgeState.sceneMode) return;
  bridgeState.sceneMode = mode;
  window.__sceneMode = mode;
  bridgeState.selected = null;
  bridgeState.hovered = null;
  if (mode === 'hub') {
    bridgeState.locked = true;
    if (towerMode) window.leaveLighthouse();
    else if (sandRide || diveMode) window.leaveRoom();
    window.setTimeout(() => {
      bridgeState.locked = false;
      bridgeUpdateMarkers();
    },900);
    return;
  }
  bridgeState.locked = true;
  if (mode === 'lighthouse') {
    bridgeEnterLighthouse();
    window.setTimeout(() => { bridgeState.locked = false; },2300);
  } else if (mode === 'fog') {
    if (!sandRide && !sandBusy) window.enterSandRoom();
    bridgeWaitFor(() => sandRide && !sandBusy,() => {
      helm.speed = .08;
      bridgeState.locked = false;
    });
  } else if (mode === 'wave') {
    if (!diveMode && !diveBusy) window.enterDeepRoom();
    bridgeWaitFor(() => diveMode && !diveBusy,() => {
      bridgeState.locked = false;
    });
  }
}

function bridgeApplyAbyssState(next = {}) {
  bridgeState.abyss = Object.assign({},bridgeState.abyss,next);
  bridgeState.abyss.depth = bridgeClamp(bridgeState.abyss.depth,0,3);
  window.__waveAbyssState = Object.assign({},bridgeState.abyss);
  const turbulence = bridgeClamp(bridgeState.abyss.turbulence);
  const visibility = bridgeClamp(bridgeState.abyss.visibility);
  const pulse = bridgeClamp(bridgeState.abyss.lightPulse);
  moteMat.alpha = .28 + turbulence * .34;
  rayMat.alpha = .10 + visibility * .26;
  glowMat.alpha = .16 + pulse * .28;
}
function bridgeDepthLocalY(ratio) {
  return -.055 - bridgeClamp(ratio) * Math.max(.2,ABYSS_D - .15);
}
function bridgeSetDiveDepth(ratio) {
  if (!diveMode) return;
  const inverse = BABYLON.Matrix.Invert(wd.getWorldMatrix());
  const local = BABYLON.Vector3.TransformCoordinates(towerSeat,inverse);
  local.y = bridgeDepthLocalY(ratio);
  towerSeat.copyFrom(BABYLON.Vector3.TransformCoordinates(local,wd.getWorldMatrix()));
}
function bridgeBeginDepthTransition(data = {}) {
  const requestId = String(data.requestId || '');
  bridgeState.depthTween = true;
  bridgeApplyAbyssState(Object.assign({},data.state || {},{depth:data.depth}));
  const targetDepth = bridgeClamp(data.depth,0,3);
  const targetRatio = Number.isFinite(Number(data.depthRatio))
    ? bridgeClamp(data.depthRatio)
    : [.12,.39,.66,.90][Math.round(targetDepth)] || .12;
  if (!diveMode) {
    bridgeState.depthTween = false;
    bridgePost('wave-depth-transition-complete',{
      requestId,depth:targetDepth,
      transitionState:targetDepth > 0 ? 'WAVE_ABYSS' : 'WAVE_ROOM'
    });
    return;
  }
  const inverse = BABYLON.Matrix.Invert(wd.getWorldMatrix());
  const startLocal = BABYLON.Vector3.TransformCoordinates(towerSeat,inverse);
  const startY = startLocal.y;
  const endY = bridgeDepthLocalY(targetRatio);
  const started = performance.now();
  const duration = String(data.action || '') === 'surface' ? 3800 : 5000;
  bridgeState.locked = true;
  window.__waveTransitionState = endY < startY ? 'WAVE_DESCENDING' : 'WAVE_ASCENDING';
  const tick = (now) => {
    const raw = bridgeClamp((now - started) / duration);
    const eased = raw < .5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2,3) / 2;
    startLocal.y = BABYLON.Scalar.Lerp(startY,endY,eased);
    towerSeat.copyFrom(BABYLON.Vector3.TransformCoordinates(startLocal,wd.getWorldMatrix()));
    if (raw < 1) {
      requestAnimationFrame(tick);
      return;
    }
    bridgeState.locked = false;
    bridgeState.depthTween = false;
    bridgeState.waveScrollTarget = targetRatio;
    window.__waveTransitionState = targetDepth > 0 ? 'WAVE_ABYSS' : 'WAVE_ROOM';
    bridgePost('wave-depth-transition-complete',{
      requestId,depth:targetDepth,transitionState:window.__waveTransitionState
    });
  };
  requestAnimationFrame(tick);
}
function bridgeFogMotion(data = {}) {
  const motion = String(data.motion || 'stay');
  const requestId = String(data.requestId || '');
  window.clearTimeout(bridgeState.fogMotionTimer);
  const shade = document.getElementById('bridgeCabinShade');
  const finish = (delay) => {
    bridgeState.fogMotionTimer = window.setTimeout(() => {
      helm.speed = .08;
      shade.classList.remove('is-active');
      bridgePost('fog-boat-motion-complete',{requestId,motion});
    },delay);
  };
  if (!sandRide) {
    bridgePost('fog-boat-motion-complete',{requestId,motion});
    return;
  }
  if (motion === 'cabin') {
    helm.speed = 0;
    shade.classList.add('is-active');
    look.pitch = -.16;
    finish(2600);
  } else if (motion === 'toward-light') {
    helm.speed = 2.5;
    look.yaw *= .25;
    finish(3900);
  } else if (motion === 'return') {
    helm.head += Math.PI * .72;
    helm.speed = 1.75;
    finish(3600);
  } else {
    helm.speed = .04;
    finish(1450);
  }
}

function bridgeSync(data) {
  const story = data.storyState || {};
  bridgeState.roomMode = !!data.roomMode;
  window.__twineRoomMode = bridgeState.roomMode;
  bridgeState.visited = story.visited || {};
  bridgeState.partNames = story.partNames || {};
  const roomState = story.roomState || {};
  ['lighthouse','wave','fog'].forEach((roomId) => {
    bridgeState.completed[roomId] = !!(roomState[roomId] && roomState[roomId].completed);
  });
  bridgeState.weatherState = Object.assign({},bridgeState.weatherState,story.weatherState || {});
  bridgeWindFactor = bridgeClamp(bridgeState.weatherState.wind,.15);
  window.__weatherTarget = Object.assign({},bridgeState.weatherState);
  if (typeof window.setWeather === 'function') window.setWeather(data.weather || {});
  beamCtl.reach = bridgeClamp(.22 + bridgeState.weatherState.light * .70);
  const nextMode = String(story.sceneMode || 'hub');
  bridgeRequestScene(nextMode);
  bridgeUpdateMarkers();
}

window.addEventListener('message',(event) => {
  const data = event.data || {};
  if (data.type === 'inner-weather-sync') {
    bridgeSync(data);
  } else if (data.type === 'lighthouse-view') {
    if (data.view === 'interior') bridgeEnterLighthouse();
    else if (data.view === 'exit') bridgeExitLighthouse();
  } else if (data.type === 'lighthouse-lens-speed') {
    const speeds = {fast:1,hold:.10,pause:0,current:.34};
    beamCtl.speed = Object.prototype.hasOwnProperty.call(speeds,data.mode)
      ? speeds[data.mode] : .34;
  } else if (data.type === 'wave-abyss-config') {
    bridgeApplyAbyssState(data.state || {});
  } else if (data.type === 'wave-depth-transition') {
    bridgeBeginDepthTransition(data);
  } else if (data.type === 'wave-scroll-depth') {
    bridgeState.waveScrollTarget = bridgeClamp(data.depth);
    bridgeSetDiveDepth(bridgeState.waveScrollTarget);
  } else if (data.type === 'fog-boat-motion') {
    bridgeFogMotion(data);
  } else if (data.type === 'guide-open') {
    bridgeState.guidePaused = true;
    camera.detachControl();
  } else if (data.type === 'guide-close') {
    bridgeState.guidePaused = false;
    if (!bridgeState.inputFocused && bridgeState.sceneMode === 'hub') camera.attachControl(canvas,true);
  } else if (data.type === 'input-focus') {
    bridgeState.inputFocused = !!data.focused;
    if (bridgeState.inputFocused) camera.detachControl();
    else if (!bridgeState.guidePaused && bridgeState.sceneMode === 'hub') camera.attachControl(canvas,true);
  } else if (data.type === 'observation-start') {
    window.__observationStarted = true;
  } else if (data.type === 'word-echo') {
    window.__lastWordEcho = String(data.text || '');
  }
});

/* Native model click navigation stays available outside Twine, but the
   embedded story owns room routing and therefore handles clicks above. */
scene.onBeforeRenderObservable.add(() => {
  bridgeUpdateMarkers();
  if (diveMode && !bridgeState.depthTween) {
    const current = bridgeState.waveScrollTarget;
    if (Number.isFinite(current)) bridgeSetDiveDepth(current);
  }
});
