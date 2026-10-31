import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getThemeSceneConfig, getThemeHouseConfig, type ThemeScene3DConfig, type ThemeHouseConfig } from '../config/theme';

export interface HouseItem {
  p: [number, number, number];
  s: [number, number, number];
  type: 'wall' | 'base' | 'roof' | 'trim' | 'door' | 'window' | 'chimney_rim';
  rot: [number, number, number];
}

// Backward compatibility alias for any legacy imports
export type HouseCell = HouseItem;

const W = 7, D = 5, Hw = 3.5;           // дом: ширина (X), глубина (Z), высота стен
const L = 0.5, H = 0.25, T = 0.25, G = 0.03; // кирпич: длина, высота, толщина, шов
const PITCH = THREE.MathUtils.degToRad(35);
const OV = 0.5, OVX = 0.4;              // свесы крыши

function segs(len: number, brick: number, odd: number | boolean): [number, number][] {        // раскладка кирпичей с перевязкой
  const out: [number, number][] = []; let pos = 0;
  if (odd) { out.push([0, brick / 2]); pos = brick / 2; }
  while (pos + brick <= len + 1e-6) { out.push([pos, pos + brick]); pos += brick; }
  if (pos < len - 1e-6) out.push([pos, len]);
  return out;
}

/**
 * Детерминированный генератор псевдослучайных чисел (Mulberry32)
 * Гарантирует абсолютно одинаковые оттенки кирпичей и светимость окон при каждом запуске.
 */
function createSeededRandom(seed = 12345) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildHouse(): HouseItem[] {
  const items: HouseItem[] = [], openings: { p: [number, number, number]; s: [number, number, number] }[] = [];
  const add = (p: [number, number, number], s: [number, number, number], type: HouseItem['type'], rot: [number, number, number] = [0, 0, 0]) => items.push({ p, s, type, rot });
  const hit = (p: [number, number, number], s: [number, number, number]) => openings.some(o =>
    Math.abs(p[0] - o.p[0]) < (s[0] + o.s[0]) / 2 &&
    Math.abs(p[1] - o.p[1]) < (s[1] + o.s[1]) / 2 &&
    Math.abs(p[2] - o.p[2]) < (s[2] + o.s[2]) / 2);
  const push = (p: [number, number, number], s: [number, number, number], type: HouseItem['type']) => { if (!hit(p, s)) add(p, s, type); };

  const WALLS: Record<string, { along: 'x' | 'z'; plane: number; n: number }> = {
    front: { along: 'x', plane: D / 2 - T / 2, n: 1 },
    back:  { along: 'x', plane: -(D / 2 - T / 2), n: -1 },
    right: { along: 'z', plane: W / 2 - T / 2, n: 1 },
    left:  { along: 'z', plane: -(W / 2 - T / 2), n: -1 },
  };
  const at = (wall: string, c: number, y: number, sAlong: number, sY: number, sN: number, out = 0): { p: [number, number, number]; s: [number, number, number] } => {
    const k = WALLS[wall], pl = k.plane + out * k.n;
    return k.along === 'x'
      ? { p: [c, y, pl], s: [sAlong, sY, sN] }
      : { p: [pl, y, c], s: [sN, sY, sAlong] };
  };

  const windowAt = (wall: string, c: number, y0: number, y1: number, w: number) => {
    const h = y1 - y0, cy = (y0 + y1) / 2;
    openings.push(at(wall, c, cy, w, h, T + 0.04));
    const gap = 0.05, pw = (w - 3 * gap) / 2, ph = (h - 3 * gap) / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const q = at(wall, c - w / 2 + gap + pw / 2 + i * (pw + gap),
                   y0 + gap + ph / 2 + j * (ph + gap), pw, ph, 0.05);
      add(q.p, q.s, 'window');
    }
    for (const [yy] of [[y0 - 0.04], [y1 + 0.04]]) {
      const t = at(wall, c, yy, w + 0.24, 0.08, T + 0.12, 0.02);
      add(t.p, t.s, 'trim');
    }
  };

  // окна: фасад, тыл, боковые стены, чердачные в фронтонах
  [-2.2, 2.2].forEach(c => windowAt('front', c, 1.2, 2.6, 1.0));
  [-2.4, 0, 2.4].forEach(c => windowAt('back', c, 1.2, 2.6, 1.0));
  [-1.1, 1.1].forEach(c => { windowAt('right', c, 1.2, 2.6, 0.9); windowAt('left', c, 1.2, 2.6, 0.9); });
  ['right', 'left'].forEach(w => windowAt(w, 0, Hw + 0.5, Hw + 1.1, 0.6));

  // дверь
  openings.push(at('front', 0, 1.05, 1.0, 2.1, T + 0.04));
  let d = at('front', 0, 1.0, 0.9, 2.0, 0.06); add(d.p, d.s, 'door');
  d = at('front', 0, 1.6, 0.45, 0.6, 0.08, 0.01); add(d.p, d.s, 'window');
  d = at('front', 0, 0.06, 1.5, 0.12, 0.5, 0.15); add(d.p, d.s, 'trim');
  d = at('front', 0, 2.14, 1.24, 0.08, T + 0.12, 0.02); add(d.p, d.s, 'trim');

  // кирпичная кладка по периметру с перевязкой углов
  const ring = (cx: number, cz: number, w: number, dd: number, y0: number, rows: number, baseRows = 0) => {
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * H + H / 2, odd = r % 2, type = r < baseRows ? 'base' : 'wall';
      const fb = w - (odd ? 2 * T : 0), sd = dd - (odd ? 0 : 2 * T);
      for (const [a, b] of segs(fb, L, odd)) for (const s of [1, -1])
        push([cx - fb / 2 + (a + b) / 2, y, cz + s * (dd / 2 - T / 2)], [b - a - G, H - G, T], type);
      for (const [a, b] of segs(sd, L, odd)) for (const s of [1, -1])
        push([cx + s * (w / 2 - T / 2), y, cz - sd / 2 + (a + b) / 2], [T, H - G, b - a - G], type);
    }
  };
  ring(0, 0, W, D, 0, Math.round(Hw / H), 2);          // стены, 2 нижних ряда — цоколь

  // сплошной фундаментный пол / плита основания (цоколь), чтобы снизу не было дыры/пустоты
  const innerW = W - 2 * T;
  const innerD = D - 2 * T;
  const slabCols = Math.round(innerW / L);
  const slabRows = Math.round(innerD / L);
  const stepX = innerW / slabCols;
  const stepZ = innerD / slabRows;
  for (let ix = 0; ix < slabCols; ix++) {
    const fx = -innerW / 2 + stepX / 2 + ix * stepX;
    for (let iz = 0; iz < slabRows; iz++) {
      const fz = -innerD / 2 + stepZ / 2 + iz * stepZ;
      push([fx, H / 2, fz], [stepX - G, H - G, stepZ - G], 'base');
    }
  }

  // фронтоны (треугольная кладка под скатами)
  for (const s of [1, -1]) for (let r = 0; ; r++) {
    const hw = D / 2 - ((r + 1) * H) / Math.tan(PITCH) - 0.03;
    if (hw < 0.3) break;
    for (const [a, b] of segs(2 * hw, L, r % 2))
      push([s * (W / 2 - T / 2), Hw + r * H + H / 2, -hw + (a + b) / 2], [T, H - G, b - a - G], 'wall');
  }

  // труба
  ring(2.0, 1.0, 0.75, 0.75, 4.1, 9);
  add([2.0, 6.42, 1.0], [0.95, 0.1, 0.95], 'chimney_rim');

  // черепица: два ската, ряды со сдвигом, лёгкий нахлёст
  const xLen = W + 2 * OVX, Ls = (D / 2 + OV) / Math.cos(PITCH);
  const rowStep = 0.28, tileLen = 0.4, tileW = 0.5, tileT = 0.06;
  for (const side of [1, -1]) {
    for (let r = 0; ; r++) {
      const sc = tileLen / 2 + r * rowStep;
      if (sc + tileLen / 2 > Ls + 0.05) break;
      const z = side * (D / 2 + OV - sc * Math.cos(PITCH));
      const y = Hw - OV * Math.tan(PITCH) + sc * Math.sin(PITCH) + tileT / 2 + 0.02;
      for (const [a, b] of segs(xLen, tileW, r % 2))
        add([-xLen / 2 + (a + b) / 2, y, z], [(b - a) * 0.95, tileT, tileLen], 'roof', [side * PITCH, 0, 0]);
    }
  }
  const ridgeY = Hw + (D / 2) * Math.tan(PITCH);        // коньковые элементы
  for (let x = -xLen / 2 + L / 2; x <= xLen / 2; x += L)
    add([x, ridgeY + 0.07, 0], [L * 0.96, 0.12, 0.26], 'trim');

  return items; // { p:[x,y,z], s:[sx,sy,sz], rot:[rx,ry,rz], type }
}

// Backward compatibility alias
export const buildHouseCells = buildHouse;

export function fitCamera(
  camera: THREE.PerspectiveCamera,
  items: HouseItem[],
  width: number,
  height: number
): number {
  const isNarrow = width < 900;
  const fullW = width;
  const fullH = height;

  const houseBox = new THREE.Box3();
  for (const it of items) {
    const hx = it.s[0] / 2, hy = it.s[1] / 2, hz = it.s[2] / 2;
    houseBox.expandByPoint(new THREE.Vector3(it.p[0] - hx, it.p[1] - hy, it.p[2] - hz));
    houseBox.expandByPoint(new THREE.Vector3(it.p[0] + hx, it.p[1] + hy, it.p[2] + hz));
  }
  const sphere = houseBox.getBoundingSphere(new THREE.Sphere());
  const R = sphere.radius;
  const targetY = sphere.center.y;

  const corners = [
    new THREE.Vector3(houseBox.min.x, houseBox.min.y, houseBox.min.z),
    new THREE.Vector3(houseBox.min.x, houseBox.min.y, houseBox.max.z),
    new THREE.Vector3(houseBox.min.x, houseBox.max.y, houseBox.min.z),
    new THREE.Vector3(houseBox.min.x, houseBox.max.y, houseBox.max.z),
    new THREE.Vector3(houseBox.max.x, houseBox.min.y, houseBox.min.z),
    new THREE.Vector3(houseBox.max.x, houseBox.min.y, houseBox.max.z),
    new THREE.Vector3(houseBox.max.x, houseBox.max.y, houseBox.min.z),
    new THREE.Vector3(houseBox.max.x, houseBox.max.y, houseBox.max.z),
  ];

  let rectW: number, rectH: number, left: number, top: number;
  if (!isNarrow) {
    rectW = fullW * 0.58;
    rectH = Math.min(fullH, 860);
    left = fullW * 0.42;
    top = 64;
  } else {
    rectW = fullW;
    rectH = Math.min(fullH * 0.38, 340);
    left = 0;
    top = 64;
  }
  const cx = left + rectW / 2;
  const cy = top + rectH / 2;

  const elev = THREE.MathUtils.degToRad(24);
  const viewAngle = THREE.MathUtils.degToRad(32);
  const tempCam = camera.clone();
  tempCam.fov = 32;
  tempCam.updateProjectionMatrix();

  const testAngles: number[] = [];
  for (let i = 0; i < 16; i++) testAngles.push((i * Math.PI * 2) / 16);

  let low = 1.0 * R, high = 15.0 * R;
  for (let iter = 0; iter < 20; iter++) {
    const mid = (low + high) / 2;
    const dXZ = mid * Math.cos(elev);
    tempCam.position.set(dXZ * Math.sin(viewAngle), targetY + dXZ * Math.tan(elev), dXZ * Math.cos(viewAngle));
    tempCam.up.set(0, 1, 0);
    tempCam.lookAt(0, targetY, 0);
    tempCam.setViewOffset(fullW, fullH, -(cx - fullW / 2), -(cy - fullH / 2), fullW, fullH);
    tempCam.updateMatrixWorld(true);
    tempCam.updateProjectionMatrix();

    let fits = true;
    for (const ang of testAngles) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      for (const c of corners) {
        const rx = c.x * cosA - c.z * sinA;
        const rz = c.x * sinA + c.z * cosA;
        const v = new THREE.Vector3(rx, c.y, rz).project(tempCam);
        const px = (v.x * 0.5 + 0.5) * fullW;
        const py = (-v.y * 0.5 + 0.5) * fullH;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
      const pw = maxX - minX, ph = maxY - minY;
      const marginW = 0.07 * rectW;
      const marginH = 0.07 * rectH;
      if (
        pw > 0.86 * rectW ||
        ph > 0.86 * rectH ||
        minX < left + marginW ||
        maxX > left + rectW - marginW ||
        minY < top + marginH ||
        maxY > top + rectH - marginH
      ) {
        fits = false; break;
      }
    }
    if (fits) high = mid; else low = mid;
  }

  const dXZ = high * Math.cos(elev);
  camera.fov = 32;
  camera.position.set(dXZ * Math.sin(viewAngle), targetY + dXZ * Math.tan(elev), dXZ * Math.cos(viewAngle));
  camera.up.set(0, 1, 0);
  camera.lookAt(0, targetY, 0);
  camera.setViewOffset(fullW, fullH, -(cx - fullW / 2), -(cy - fullH / 2), fullW, fullH);
  camera.updateProjectionMatrix();

  return high;
}

export interface HouseOrbOptions {
  container: HTMLElement;
}

interface CubeData {
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  baseScale: THREE.Vector3;
  dispersionDir: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  heightNorm: number;
  distNorm: number;
  type?: string;
  isAmbient?: boolean;
  ambientPos?: THREE.Vector3;
  ambientScale?: THREE.Vector3;
  baseAlpha?: number;
  driftFreq?: THREE.Vector3;
  driftPhase?: THREE.Vector3;
  driftAmp?: THREE.Vector3;
}

// Procedural Soft Particle & Bokeh Textures
export function createSoftCircleTexture(size: number = 64): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture(null as any);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createBokehTexture(size: number = 128): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture(null as any);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.25)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class HouseOrb {
  // Layer Groups for mouse parallax
  private starsGroup!: THREE.Group;
  private midGroup!: THREE.Group;
  private bokehGroup!: THREE.Group;
  private baseCamPos = new THREE.Vector3();
  private isTouchDevice = false;
  private prefersReducedMotion = false;
  // Anchor tracking & bounding sphere
  private houseSphereCenter = new THREE.Vector3(0, 2.5, 0);
  private anchorElement: HTMLElement | null = null;
  private anchorResizeObserver?: ResizeObserver;

  // House geometry bounds for exact projection fitting
  private houseBox = new THREE.Box3();
  private houseBoxCenter = new THREE.Vector3(0, 3.235, 0);
  private houseRadius = 5.5;
  private houseCorners: THREE.Vector3[] = [];
  private fittingDist = 25;

  // Debug overlay (?debug=1)
  private isDebug = false;
  private debugAnchorBox?: HTMLElement;
  private debugHouseBox?: HTMLElement;
  private debugInfoPanel?: HTMLElement;

  // Particle systems
  private starsMesh?: THREE.Points;
  private starsUniforms?: Record<string, { value: any }>;
  private dustMesh?: THREE.Points;
  private dustUniforms?: Record<string, { value: any }>;
  private sparksMesh?: THREE.Points;
  private sparksUniforms?: Record<string, { value: any }>;
  private bokehMeshes: THREE.Mesh[] = [];
  private softCircleTexture?: THREE.CanvasTexture;
  private bokehTexture?: THREE.CanvasTexture;

  // Theme scene config & transition state
  private themeConfig: ThemeScene3DConfig;
  private currentStarColor: THREE.Color;
  private targetStarColor: THREE.Color;
  private currentDustColor: THREE.Color;
  private targetDustColor: THREE.Color;
  private currentSparkColor: THREE.Color;
  private targetSparkColor: THREE.Color;
  private currentFogColor: THREE.Color;
  private targetFogColor: THREE.Color;
  private currentBokehColor: THREE.Color;
  private targetBokehColor: THREE.Color;
  private currentParticleAlpha: number;
  private targetParticleAlpha: number;
  private currentBokehOpacity: number;
  private targetBokehOpacity: number;
  private targetBloomStrength: number;
  private currentBlending: 'additive' | 'normal' = 'additive';
  private targetBlending: 'additive' | 'normal' = 'additive';
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private bloomPass: UnrealBloomPass;

  // Camera & angle configuration (from theme, adjustable via ?tune=1)
  private cameraFov = 32;
  private cameraElevation = 24;
  private cameraAzimuth = 32;
  private cameraLookAtY = 0;
  private isTune = false;
  private gui?: any;

  // Stage group at origin (0, 0, 0)
  private stage!: THREE.Group;
  private currentDist = 25;

  // Instanced cubes mesh
  private instancedCubes!: THREE.InstancedMesh;
  private cubesData: CubeData[] = [];
  private items: HouseItem[] = [];
  private dummy = new THREE.Object3D();

  // Materials & Line Segments for theme transitions
  private cubeMaterial!: THREE.MeshStandardMaterial;
  private innerMaterial!: THREE.MeshBasicMaterial;
  private ringMaterial?: THREE.MeshBasicMaterial;
  private groundDiskMaterial?: THREE.ShaderMaterial;
  private windowSpotMaterial?: THREE.ShaderMaterial;
  private particlesMaterial?: THREE.PointsMaterial;

  // Lights for dynamic color transition & edge illumination
  private hemiLight!: THREE.HemisphereLight;
  private backLight!: THREE.DirectionalLight;

  // Inner frame instanced mesh
  private innerInstancedCubes!: THREE.InstancedMesh;
  private innerCubesData: CubeData[] = [];
  private cubeUniforms?: Record<string, { value: any }>;
  private innerUniforms?: Record<string, { value: any }>;

  // Smooth procedural floating tools manager (24 models desktop, 12 mobile)

  // Unified Scene Modes & Transitions (house on home, ambient on internal pages)
  private mode: 'house' | 'ambient' = 'house';
  private transitionState: 'idle' | 'house_to_ambient' | 'ambient_to_house' = 'idle';
  private transitionElapsed = 0.0;
  private transitionDuration = 1.1; // 1.1s house->ambient, 1.4s ambient->house
  private turntableAngle = 0.0;
  private lastAmbientRenderTime = 0.0;
  private lastClickTimestamp = 0.0;
  private clickToAnimTimeMs = 0.0;
  private isWeakDevice = false;
  private wasMatrixDirty = true;

  // Frame timing & dt accumulator (limits dt <= 1/20s so stutters don't eat animations)
  private hasRenderedFirstFrame = false;
  private lastFrameTime = 0;
  private timelineTime = 0;

  // House materials & profile config (wall, roof, mortar, trim, windowGlow)
  private currentThemeId: string = 'neon';
  private houseConfig: ThemeHouseConfig;
  private currentWallColor: THREE.Color;
  private targetWallColor: THREE.Color;
  private currentRoofColor: THREE.Color;
  private targetRoofColor: THREE.Color;
  private currentMortarColor: THREE.Color;
  private targetMortarColor: THREE.Color;
  private currentTrimColor: THREE.Color;
  private targetTrimColor: THREE.Color;
  private currentWindowGlowColor: THREE.Color;
  private targetWindowGlowColor: THREE.Color;

  // Alive House Elements:
  // 1) Chimney smoke (36 particles)
  private smokeMesh?: THREE.Points;
  private smokeUniforms?: Record<string, { value: any }>;
  private currentSmokeColor: THREE.Color;
  private targetSmokeColor: THREE.Color;

  // 2) Contact shadow under house base (radial dark gradient)
  private contactShadowMesh?: THREE.Mesh;
  private contactShadowUniforms?: Record<string, { value: any }>;

  // 3) Ground reflection (desktop only)
  private reflectedGroup?: THREE.Group;
  private reflectedMesh?: THREE.InstancedMesh;
  private reflectedMaterial?: THREE.MeshStandardMaterial;

  // 4) Dynamic window flickering state
  private windowGroups: {
    paneIndices: number[];
    baseEmissives: number[];
    nextDimTime: number;
    dimDuration: number;
    dimDepth: number;
    isOffWindow: boolean;
    nextOffTime: number;
    offDuration: number;
  }[] = [];
  private windowEmissiveAttr?: THREE.InstancedBufferAttribute;
  private windowEmissiveArray?: Float32Array;

  // Color transition state (0.4s smooth lerp)
  private currentColor: THREE.Color;
  private targetColor: THREE.Color;
  private currentAccent2Color: THREE.Color;
  private targetAccent2Color: THREE.Color;
  private currentBgColor: THREE.Color;
  private targetBgColor: THREE.Color;
  private currentAccentColor: THREE.Color;
  private targetAccentColor: THREE.Color;
  private currentGlowColor: THREE.Color;
  private targetGlowColor: THREE.Color;

  private animationFrameId: number | null = null;
  public isDestroyed = false;
  private isPaused = false;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;

  // Mouse parallax interaction
  private mouse = { x: 0, y: 0 };
  private targetMouse = { x: 0, y: 0 };

  constructor(options: HouseOrbOptions) {
    this.container = options.container;

    // Read initial theme, scene, and house profile configuration
    const initialThemeId = typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-theme') || 'neon') : 'neon';
    this.currentThemeId = initialThemeId;
    this.themeConfig = getThemeSceneConfig(initialThemeId);
    this.houseConfig = getThemeHouseConfig(initialThemeId);

    // Camera parameters from theme config
    const camCfg = this.themeConfig.camera || { fov: 32, elevation: 24, azimuth: 32, lookAtY: 0 };
    this.cameraFov = camCfg.fov;
    this.cameraElevation = camCfg.elevation;
    this.cameraAzimuth = camCfg.azimuth;
    this.cameraLookAtY = camCfg.lookAtY;

    // Read colors from CSS custom properties or theme configuration (no hardcoded colors)
    const cssHouseColor = this.readCssVariable('--house-color') || this.houseConfig.wall;
    const cssAccent2 = this.readCssVariable('--accent-2') || '#10b981';
    const cssBgColor = this.themeConfig.bg;
    const cssAccent = this.readCssVariable('--accent') || '#06b6d4';
    const cssGlow = this.readCssVariable('--glow') || '#00f0ff';

    // Parse colors: separate RGB and alpha; THREE.Color strictly receives RGB
    this.currentColor = this.parseRgbOnly(cssHouseColor);
    this.targetColor = this.currentColor.clone();

    // Specific house profile colors
    this.currentWallColor = new THREE.Color(this.houseConfig.wall);
    this.targetWallColor = this.currentWallColor.clone();

    this.currentRoofColor = new THREE.Color(this.houseConfig.roof);
    this.targetRoofColor = this.currentRoofColor.clone();

    this.currentMortarColor = new THREE.Color(this.houseConfig.mortar);
    this.targetMortarColor = this.currentMortarColor.clone();

    this.currentTrimColor = new THREE.Color(this.houseConfig.trim);
    this.targetTrimColor = this.currentTrimColor.clone();

    this.currentWindowGlowColor = new THREE.Color(this.houseConfig.windowGlow);
    this.targetWindowGlowColor = this.currentWindowGlowColor.clone();

    this.currentSmokeColor = new THREE.Color(this.houseConfig.smoke || '#94a3b8');
    this.targetSmokeColor = this.currentSmokeColor.clone();

    this.currentAccent2Color = this.parseRgbOnly(cssAccent2);
    this.targetAccent2Color = this.currentAccent2Color.clone();

    this.currentBgColor = this.parseRgbOnly(cssBgColor);
    this.targetBgColor = this.currentBgColor.clone();

    this.currentAccentColor = this.parseRgbOnly(cssAccent);
    this.targetAccentColor = this.currentAccentColor.clone();

    this.currentGlowColor = this.parseRgbOnly(cssGlow);
    this.targetGlowColor = this.currentGlowColor.clone();

    this.currentStarColor = new THREE.Color(this.themeConfig.starColor);
    this.targetStarColor = this.currentStarColor.clone();

    this.currentDustColor = new THREE.Color(this.themeConfig.dustColor);
    this.targetDustColor = this.currentDustColor.clone();

    this.currentSparkColor = new THREE.Color(this.themeConfig.sparkColor);
    this.targetSparkColor = this.currentSparkColor.clone();

    this.currentFogColor = new THREE.Color(this.themeConfig.fogColor);
    this.targetFogColor = this.currentFogColor.clone();

    this.currentParticleAlpha = this.themeConfig.particleAlpha;
    this.targetParticleAlpha = this.currentParticleAlpha;

    this.targetBloomStrength = this.themeConfig.bloomStrength;
    this.currentBlending = this.themeConfig.blending;
    this.targetBlending = this.themeConfig.blending;

    const isInitialLight = initialThemeId === 'light';
    this.currentBokehColor = isInitialLight ? this.currentAccentColor.clone() : this.currentGlowColor.clone();
    this.targetBokehColor = this.currentBokehColor.clone();
    this.currentBokehOpacity = 0.06;
    this.targetBokehOpacity = 0.06;

    this.isWeakDevice = typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    this.prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isInitialHome = initialPath === '/' || initialPath === '/index.html' || initialPath === '';

    if (isInitialHome) {
      this.mode = 'house';
      this.transitionState = 'ambient_to_house'; // Initial assembly from scratch over 1.4s
      this.transitionElapsed = 0.0;
      this.transitionDuration = 1.4;
    } else {
      this.mode = 'ambient';
      this.transitionState = 'idle';
      this.transitionElapsed = 0.0;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isNarrow = width < 900;

    // 1. Renderer (devicePixelRatio clamped to 2.0)
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
      stencil: false,
      depth: true
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(this.currentBgColor, 0.0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;

    this.renderer.domElement.style.cssText =
      'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; outline: none;';
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera (FOV from theme config)
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.currentFogColor, 0.012);
    this.camera = new THREE.PerspectiveCamera(this.cameraFov, width / height, 0.1, 200);

    // PMREMGenerator + RoomEnvironment for realistic PBR reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv).texture;

    // Key AmbientLight and DirectionalLights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(10, 20, 15);
    this.scene.add(dirLight);

    // HemisphereLight: sky --glow, ground dark blue (#081226)
    this.hemiLight = new THREE.HemisphereLight(this.currentGlowColor, 0x081226, 0.35);
    this.scene.add(this.hemiLight);

    // Rim / Back DirectionalLight: color --accent, from back-top for edge highlights
    this.backLight = new THREE.DirectionalLight(this.currentAccentColor, 0.8);
    this.backLight.position.set(-14, 20, -18);
    this.scene.add(this.backLight);

    // 3. Post-Processing: UnrealBloomPass
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomWidth = isNarrow ? Math.floor(width / 2) : width;
    const bloomHeight = isNarrow ? Math.floor(height / 2) : height;
    const bloomRes = new THREE.Vector2(bloomWidth, bloomHeight);
    this.bloomPass = new UnrealBloomPass(bloomRes, this.themeConfig.bloomStrength, 0.5, 0.75);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // 4. Parallax Layer Groups (0.2 Stars, 0.6 Mid Dust/Sparks, 1.2 Stage with House, 2.0 Bokeh)
    this.starsGroup = new THREE.Group();
    this.starsGroup.name = 'starsGroup';
    this.scene.add(this.starsGroup);

    this.midGroup = new THREE.Group();
    this.midGroup.name = 'midGroup';
    this.scene.add(this.midGroup);

    this.stage = new THREE.Group();
    this.stage.name = 'stage';
    this.stage.position.set(0, 0, 0);
    this.scene.add(this.stage);

    this.bokehGroup = new THREE.Group();
    this.bokehGroup.name = 'bokehGroup';
    this.scene.add(this.bokehGroup);

    // Check debug mode (?debug=1) and tuning mode (?tune=1) only in DEV mode
    if (import.meta.env.DEV) {
      this.isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
      if (this.isDebug) {
        this.setupDebugOverlay();
      }
      this.isTune = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tune') === '1';
      if (this.isTune) {
        this.setupTunePanel();
      }
    }

    this.items = buildHouse();
    this.anchorElement = typeof document !== 'undefined' ? document.getElementById('house-anchor') : null;

    this.buildProceduralHouse();

    // Box3.setFromObject(house) (только стены, крыша, труба)
    this.houseBox = new THREE.Box3().setFromObject(this.instancedCubes);
    const houseSphere = this.houseBox.getBoundingSphere(new THREE.Sphere());
    this.houseSphereCenter.copy(houseSphere.center);
    this.houseBoxCenter.copy(houseSphere.center);
    this.houseRadius = houseSphere.radius;
    this.houseCorners = [
      new THREE.Vector3(this.houseBox.min.x, this.houseBox.min.y, this.houseBox.min.z),
      new THREE.Vector3(this.houseBox.min.x, this.houseBox.min.y, this.houseBox.max.z),
      new THREE.Vector3(this.houseBox.min.x, this.houseBox.max.y, this.houseBox.min.z),
      new THREE.Vector3(this.houseBox.min.x, this.houseBox.max.y, this.houseBox.max.z),
      new THREE.Vector3(this.houseBox.max.x, this.houseBox.min.y, this.houseBox.min.z),
      new THREE.Vector3(this.houseBox.max.x, this.houseBox.min.y, this.houseBox.max.z),
      new THREE.Vector3(this.houseBox.max.x, this.houseBox.max.y, this.houseBox.min.z),
      new THREE.Vector3(this.houseBox.max.x, this.houseBox.max.y, this.houseBox.max.z),
    ];

    this.buildInnerFrame();
    this.buildGroundRing();

    // Textures for particles & bokeh
    this.softCircleTexture = createSoftCircleTexture(64);
    this.bokehTexture = createBokehTexture(128);

    // Contact shadow under house base (radial gradient)
    this.buildContactShadow();

    // Chimney smoke particles (36 sprites)
    this.buildChimneySmoke();

    // Build background layers
    this.buildDistantStars(isNarrow);
    this.buildMidDust(isNarrow);
    this.buildWarmSparks(isNarrow);
    this.buildForegroundBokeh(isNarrow);

    // Compute exact binary search fitting distance
    this.recomputeFittingDist();

    // Initial camera projection to anchor
    this.updateAnchorProjection(0, 0);
    this.baseCamPos.copy(this.camera.position);
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = 0.325 / Math.max(1, this.currentDist);
    }

    // Recompute fitting distance after fonts load (prevents layout shift inaccuracies)
    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as any).fonts.ready.then(() => {
        this.recomputeFittingDist();
      });
    }

    this.isTouchDevice = typeof window !== 'undefined' ? ('ontouchstart' in window || (navigator.maxTouchPoints > 0)) : false;
    this.prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }

    // 5. Setup Observers & Listeners
    this.setupInteractivity();
    this.setupThemeListener();
    this.setupMenuExplodeListener();
    this.setupResizeObserver();
    this.setupVisibilityObserver();

    // 6. Pre-warm / compile shaders asynchronously before starting render loop
    const startRender = () => {
      this.lastFrameTime = performance.now();
      this.animate();
    };

    if (this.renderer.compileAsync) {
      this.renderer.compileAsync(this.scene, this.camera).then(() => {
        startRender();
      }).catch((err) => {
        console.warn('[HouseOrb] compileAsync fallback:', err);
        startRender();
      });
    } else {
      this.renderer.compile(this.scene, this.camera);
      startRender();
    }

    if (typeof window !== 'undefined') {
      (window as any).__houseOrb = this;
    }
  }

  private readCssVariable(varName: string): string {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  public static parseCssColor(cssStr: string): { color: THREE.Color; alpha: number } {
    if (!cssStr) {
      return { color: new THREE.Color('#00f0ff'), alpha: 1.0 };
    }
    const trimmed = cssStr.trim();

    // 1. rgba(r, g, b, a) comma-separated
    const rgbaMatch = trimmed.match(/^rgba\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
    if (rgbaMatch) {
      const r = Math.min(255, Math.max(0, parseFloat(rgbaMatch[1]))) / 255;
      const g = Math.min(255, Math.max(0, parseFloat(rgbaMatch[2]))) / 255;
      const b = Math.min(255, Math.max(0, parseFloat(rgbaMatch[3]))) / 255;
      const a = Math.min(1.0, Math.max(0, parseFloat(rgbaMatch[4])));
      const color = new THREE.Color().setRGB(r, g, b);
      return { color, alpha: a };
    }

    // 2. Modern CSS rgb(r g b / a) or rgba(r g b / a) slash-separated
    const modernRgbaMatch = trimmed.match(/^rgba?\s*\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\/\s*([\d.%]+)\s*\)$/i);
    if (modernRgbaMatch) {
      const r = Math.min(255, Math.max(0, parseFloat(modernRgbaMatch[1]))) / 255;
      const g = Math.min(255, Math.max(0, parseFloat(modernRgbaMatch[2]))) / 255;
      const b = Math.min(255, Math.max(0, parseFloat(modernRgbaMatch[3]))) / 255;
      let aStr = modernRgbaMatch[4];
      const a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
      const color = new THREE.Color().setRGB(r, g, b);
      return { color, alpha: Math.min(1.0, Math.max(0, a)) };
    }

    // 3. rgb(r, g, b)
    const rgbMatch = trimmed.match(/^rgb\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
    if (rgbMatch) {
      const r = Math.min(255, Math.max(0, parseFloat(rgbMatch[1]))) / 255;
      const g = Math.min(255, Math.max(0, parseFloat(rgbMatch[2]))) / 255;
      const b = Math.min(255, Math.max(0, parseFloat(rgbMatch[3]))) / 255;
      const color = new THREE.Color().setRGB(r, g, b);
      return { color, alpha: 1.0 };
    }

    // 4. Hex with alpha: #rrggbbaa or #rgba
    if (/^#[0-9a-f]{8}$/i.test(trimmed)) {
      const rgbHex = trimmed.slice(0, 7);
      const a = parseInt(trimmed.slice(7, 9), 16) / 255;
      return { color: new THREE.Color(rgbHex), alpha: a };
    }
    if (/^#[0-9a-f]{4}$/i.test(trimmed)) {
      const r = trimmed[1], g = trimmed[2], b = trimmed[3], a = trimmed[4];
      const rgbHex = `#${r}${r}${g}${g}${b}${b}`;
      const aVal = parseInt(`${a}${a}`, 16) / 255;
      return { color: new THREE.Color(rgbHex), alpha: aVal };
    }

    // 5. Standard hex #rrggbb, #rgb, or valid CSS color name
    try {
      return { color: new THREE.Color(trimmed), alpha: 1.0 };
    } catch {
      return { color: new THREE.Color('#00f0ff'), alpha: 1.0 };
    }
  }

  private parseRgbOnly(cssStr: string): THREE.Color {
    return HouseOrb.parseCssColor(cssStr).color;
  }

  /**
   * Constructs procedural house instances from buildHouse():
   * - RoundedBoxGeometry(1, 1, 1, 2, 0.06) with non-uniform scale.
   * - wall: --house-color
   * - base: 25% darker
   * - roof: --accent-2 muted
   * - trim: 20% lighter
   * - door: dark wood (#301a0d)
   * - window: warm emissive #ff9f43 with random intensity 0.6-1.0
   * - aTint: random brightness shift +-12% for bricks & roof tiles
   */
  private buildProceduralHouse(): void {
    const brickGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.06);

    const count = this.items.length;
    const typeArray = new Float32Array(count);
    const tintArray = new Float32Array(count);
    const windowEmissiveArray = new Float32Array(count);
    const seededRng = createSeededRandom(12345);

    for (let i = 0; i < count; i++) {
      const item = this.items[i];
      let typeId = 0.0;
      let tint = 1.0;
      let emissive = 0.0;

      switch (item.type) {
        case 'wall':
          typeId = 0.0;
          tint = 1.0 + (seededRng() * 0.24 - 0.12);
          break;
        case 'base':
          typeId = 1.0;
          tint = 1.0 + (seededRng() * 0.24 - 0.12);
          break;
        case 'roof':
          typeId = 2.0;
          tint = 1.0 + (seededRng() * 0.24 - 0.12);
          break;
        case 'trim':
          typeId = 3.0;
          tint = 1.0;
          break;
        case 'door':
          typeId = 4.0;
          tint = 1.0;
          break;
        case 'window':
          typeId = 5.0;
          tint = 1.0;
          // Luminous warm windows
          emissive = 0.85 + seededRng() * 0.15;
          break;
        case 'chimney_rim':
          typeId = 6.0;
          tint = 1.0;
          break;
      }

      typeArray[i] = typeId;
      tintArray[i] = tint;
      windowEmissiveArray[i] = emissive;
    }

    this.windowEmissiveArray = windowEmissiveArray;
    this.windowEmissiveAttr = new THREE.InstancedBufferAttribute(windowEmissiveArray, 1);

    brickGeo.setAttribute('instanceType', new THREE.InstancedBufferAttribute(typeArray, 1));
    brickGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tintArray, 1));
    brickGeo.setAttribute('aWindowEmissive', this.windowEmissiveAttr);
    const ambientAlphaArray = new Float32Array(count);
    ambientAlphaArray.fill(1.0);
    brickGeo.setAttribute('aAmbientAlpha', new THREE.InstancedBufferAttribute(ambientAlphaArray, 1));

    // Group window panes into spatial units for living flicker/dimming animation
    const windowPaneIndices: number[] = [];
    for (let i = 0; i < count; i++) {
      if (this.items[i].type === 'window') {
        windowPaneIndices.push(i);
      }
    }
    this.windowGroups = [];
    for (const idx of windowPaneIndices) {
      const p = this.items[idx].p;
      let found = false;
      for (const group of this.windowGroups) {
        const leaderPos = this.items[group.paneIndices[0]].p;
        const dx = p[0] - leaderPos[0];
        const dy = p[1] - leaderPos[1];
        const dz = p[2] - leaderPos[2];
        if (dx * dx + dy * dy + dz * dz < 1.4 * 1.4) {
          group.paneIndices.push(idx);
          group.baseEmissives.push(windowEmissiveArray[idx]);
          found = true;
          break;
        }
      }
      if (!found) {
        this.windowGroups.push({
          paneIndices: [idx],
          baseEmissives: [windowEmissiveArray[idx]],
          nextDimTime: 2.0 + seededRng() * 5.0,  // 2–7s initial stagger
          dimDuration: 0.7 + seededRng() * 0.9,  // 0.7–1.6s
          dimDepth: 0.25 + seededRng() * 0.25,   // 25–50%
          isOffWindow: false,
          nextOffTime: 12.0 + seededRng() * 16.0,
          offDuration: 3.0 + seededRng() * 3.0   // 3–6s
        });
      }
    }
    if (this.windowGroups.length > 0) {
      // Pick front-right and attic/bedroom windows to occasionally turn off completely
      this.windowGroups[Math.min(1, this.windowGroups.length - 1)].isOffWindow = true;
      if (this.windowGroups.length > 8) {
        this.windowGroups[8].isOffWindow = true;
      }
    }

    this.cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.0,
      envMapIntensity: 0.10,
      fog: false
    });

    this.cubeUniforms = {
      uTime: { value: 0.0 },
      uHouseColor: { value: this.currentColor },
      uAccent2Color: { value: this.currentAccent2Color },
      uAccentColor: { value: this.currentAccentColor },
      uGlowColor: { value: this.currentGlowColor },
      uEmissiveFade: { value: 1.0 },
      uSceneBrightness: { value: 1.0 },

      uWallColor: { value: this.currentWallColor },
      uRoofColor: { value: this.currentRoofColor },
      uMortarColor: { value: this.currentMortarColor },
      uTrimColor: { value: this.currentTrimColor },
      uWindowGlowColor: { value: this.currentWindowGlowColor },

      uWallGain: { value: this.houseConfig.wallGain },
      uRoofGain: { value: this.houseConfig.roofGain },
      uBaseGain: { value: this.houseConfig.baseGain },
      uTrimGain: { value: this.houseConfig.trimGain },
      uMortarDarkness: { value: this.houseConfig.mortarDarkness },
      uMortarWidth: { value: this.houseConfig.mortarWidth },
      uMortarGlow: { value: this.houseConfig.mortarGlow },
      uMaxLuma: { value: this.houseConfig.maxLuma }
    };

    this.cubeMaterial.customProgramCacheKey = () => 'house-bricks-pbr';

    this.cubeMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.cubeUniforms!.uTime;
      shader.uniforms.uHouseColor = this.cubeUniforms!.uHouseColor;
      shader.uniforms.uAccent2Color = this.cubeUniforms!.uAccent2Color;
      shader.uniforms.uAccentColor = this.cubeUniforms!.uAccentColor;
      shader.uniforms.uGlowColor = this.cubeUniforms!.uGlowColor;
      shader.uniforms.uEmissiveFade = this.cubeUniforms!.uEmissiveFade;
      shader.uniforms.uSceneBrightness = this.cubeUniforms!.uSceneBrightness;

      shader.uniforms.uWallColor = this.cubeUniforms!.uWallColor;
      shader.uniforms.uRoofColor = this.cubeUniforms!.uRoofColor;
      shader.uniforms.uMortarColor = this.cubeUniforms!.uMortarColor;
      shader.uniforms.uTrimColor = this.cubeUniforms!.uTrimColor;
      shader.uniforms.uWindowGlowColor = this.cubeUniforms!.uWindowGlowColor;

      shader.uniforms.uWallGain = this.cubeUniforms!.uWallGain;
      shader.uniforms.uRoofGain = this.cubeUniforms!.uRoofGain;
      shader.uniforms.uBaseGain = this.cubeUniforms!.uBaseGain;
      shader.uniforms.uTrimGain = this.cubeUniforms!.uTrimGain;
      shader.uniforms.uMortarDarkness = this.cubeUniforms!.uMortarDarkness;
      shader.uniforms.uMortarWidth = this.cubeUniforms!.uMortarWidth;
      shader.uniforms.uMortarGlow = this.cubeUniforms!.uMortarGlow;
      shader.uniforms.uMaxLuma = this.cubeUniforms!.uMaxLuma;

      shader.vertexShader = `
        attribute float instanceType;
        attribute float aTint;
        attribute float aWindowEmissive;
        attribute float aAmbientAlpha;

        varying float vInstanceType;
        varying float vTint;
        varying float vWindowEmissive;
        varying float vAmbientAlpha;
        varying vec2 vWindowUv;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec3 vInstanceScale;
        varying float vWorldY;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vInstanceType = instanceType;
        vTint = aTint;
        vWindowEmissive = aWindowEmissive;
        vAmbientAlpha = aAmbientAlpha;
        vWindowUv = uv;
        vLocalPos = position;
        vLocalNormal = normal;
        #ifdef USE_INSTANCING
          vInstanceScale = vec3(
            length(instanceMatrix[0].xyz),
            length(instanceMatrix[1].xyz),
            length(instanceMatrix[2].xyz)
          );
          vWorldY = (instanceMatrix * vec4(position, 1.0)).y;
        #else
          vInstanceScale = vec3(1.0);
          vWorldY = position.y;
        #endif
        `
      );

      shader.fragmentShader = `
        uniform vec3 uHouseColor;
        uniform vec3 uAccent2Color;
        uniform vec3 uAccentColor;
        uniform vec3 uGlowColor;
        uniform float uEmissiveFade;
        uniform float uSceneBrightness;

        uniform vec3 uWallColor;
        uniform vec3 uRoofColor;
        uniform vec3 uMortarColor;
        uniform vec3 uTrimColor;
        uniform vec3 uWindowGlowColor;

        uniform float uWallGain;
        uniform float uRoofGain;
        uniform float uBaseGain;
        uniform float uTrimGain;
        uniform float uMortarDarkness;
        uniform float uMortarWidth;
        uniform float uMortarGlow;
        uniform float uMaxLuma;
        uniform float uTime;

        varying float vInstanceType;
        varying float vTint;
        varying float vWindowEmissive;
        varying float vAmbientAlpha;
        varying vec2 vWindowUv;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec3 vInstanceScale;
        varying float vWorldY;
        ${shader.fragmentShader}
      `.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec3 dEdgeMeters = max(vec3(0.0), (vec3(0.5) - abs(vLocalPos)) * vInstanceScale);
        vec3 absNorm = abs(vLocalNormal);
        float distToEdgeMeters = (absNorm.x > 0.5) ? min(dEdgeMeters.y, dEdgeMeters.z) : ((absNorm.y > 0.5) ? min(dEdgeMeters.x, dEdgeMeters.z) : min(dEdgeMeters.x, dEdgeMeters.y));
        float mortarFactor = smoothstep(0.0, uMortarWidth, distToEdgeMeters);
        float topBevel = (1.0 - mortarFactor) * max(0.0, vLocalNormal.y) * 0.70;

        if (vInstanceType < 0.5) {
          // Masonry brickwork (wall): individual brick tint + distinct mortar joints + enhanced top-bevel highlight
          vec3 baseBrick = (uWallColor * uWallGain) * (0.80 + 0.38 * vTint);
          vec3 mortarBase = mix(baseBrick * uMortarDarkness, uMortarColor * uWallGain * uMortarDarkness, 0.6);
          diffuseColor.rgb = mix(mortarBase, baseBrick, mortarFactor) + (uWallColor * topBevel * 0.20);
        } else if (vInstanceType < 1.5) {
          // Floor slab (base): foundation
          vec3 baseSlab = (uWallColor * uBaseGain) * (0.85 + 0.30 * vTint);
          diffuseColor.rgb = mix(baseSlab * uMortarDarkness, baseSlab, mortarFactor);
        } else if (vInstanceType < 2.5) {
          // Roof tiles: tile tint + mortar/overlap + top-bevel highlight
          vec3 baseRoof = (uRoofColor * uRoofGain) * (0.82 + 0.36 * vTint);
          diffuseColor.rgb = mix(baseRoof * uMortarDarkness, baseRoof, mortarFactor) + (uRoofColor * topBevel * 0.20);
        } else if (vInstanceType < 3.5) {
          // Trim: architectural trim/frames
          diffuseColor.rgb = uTrimColor * uTrimGain;
        } else if (vInstanceType < 4.5) {
          // Door: dark rich wood
          diffuseColor.rgb = vec3(0.10, 0.06, 0.03);
        } else if (vInstanceType < 5.5) {
          // Window: luminous warm glass with bright white core in central 40% area
          float innerDist = max(abs(vWindowUv.x - 0.5), abs(vWindowUv.y - 0.5));
          float isCenter = 1.0 - smoothstep(0.24, 0.316, innerDist);
          vec3 amberGlass = uWindowGlowColor * 0.75;
          vec3 whiteCore = vec3(1.0, 0.98, 0.94);
          diffuseColor.rgb = mix(amberGlass, whiteCore, isCenter);
        } else {
          // Chimney rim: glowing accent rim
          diffuseColor.rgb = uAccentColor * 0.35;
        }

        // Dampness for bottom 2 rows (y in [0, 0.55m]): darkened by 15% (same hue, darker)
        if (vInstanceType < 1.5) {
          float wetness = clamp(1.0 - (vWorldY / 0.55), 0.0, 1.0);
          diffuseColor.rgb *= (1.0 - 0.15 * wetness);
        }

        diffuseColor.rgb *= (uSceneBrightness * vAmbientAlpha);
        `
      ).replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        if (vInstanceType > 4.5 && vInstanceType < 5.5) {
          // Window: luminous emissive with warm amber glow and brilliant white core
          float innerDist = max(abs(vWindowUv.x - 0.5), abs(vWindowUv.y - 0.5));
          float isCenter = 1.0 - smoothstep(0.24, 0.316, innerDist);

          // Living fireplace & candle hearth micro-flicker (warm flame dynamics)
          float flame1 = sin(uTime * 3.7 + vWorldY * 2.8 + vWindowUv.x * 4.0);
          float flame2 = cos(uTime * 6.9 + vWorldY * 4.2 - vWindowUv.y * 5.0);
          float flame3 = sin(uTime * 11.3 + vWindowUv.x * 8.0);
          float hearthFlicker = 1.0 + 0.055 * flame1 + 0.035 * flame2 + 0.020 * flame3;

          vec3 winColorEmissive = uWindowGlowColor * (0.92 * hearthFlicker);
          vec3 coreEmissive = vec3(1.0, 0.98, 0.92) * (1.38 * hearthFlicker);
          vec3 winEmissive = mix(winColorEmissive, coreEmissive, isCenter);
          totalEmissiveRadiance = winEmissive * (min(1.5, vWindowEmissive) * (uEmissiveFade * uSceneBrightness * vAmbientAlpha));
        } else if (vInstanceType > 5.5) {
          // Chimney rim: subtle accent glow
          totalEmissiveRadiance = uAccentColor * (0.65 * uEmissiveFade * uSceneBrightness * vAmbientAlpha);
        } else if (vInstanceType < 2.5) {
          // Mortar inner glow for walls and roof in dark themes (light leaking from inside)
          float seamGlow = (1.0 - mortarFactor) * uMortarGlow;
          totalEmissiveRadiance = uGlowColor * (seamGlow * uEmissiveFade * uSceneBrightness * vAmbientAlpha);
        }
        `
      ).replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        // Anti-burnout ceiling protection from theme house profile (maxLuma >= 0.45 in dark themes)
        if (vInstanceType < 4.5) {
          float maxC = max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b));
          if (maxC > uMaxLuma) {
            gl_FragColor.rgb *= (uMaxLuma / maxC);
          }
        }
        `
      ).replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        if (vInstanceType < 1.5) {
          // Moist sheen on lower 2 rows
          float wetness = clamp(1.0 - (vWorldY / 0.55), 0.0, 1.0);
          roughnessFactor = mix(roughnessFactor, 0.42, wetness * 0.65);
        } else if (vInstanceType > 3.5 && vInstanceType < 4.5) {
          // Door wood texture roughness
          roughnessFactor = 0.85;
        } else if (vInstanceType > 4.5) {
          // Windows and chimney rim
          roughnessFactor = 0.2;
        }
        `
      );
    };

    this.instancedCubes = new THREE.InstancedMesh(brickGeo, this.cubeMaterial, count);
    this.instancedCubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.cubesData = [];
    const centerPoint = new THREE.Vector3(0, 2.5, 0);
    const ambientStep = Math.max(1, Math.floor(count / 360));
    let ambientCount = 0;

    for (let i = 0; i < count; i++) {
      const item = this.items[i];
      const pos = new THREE.Vector3(item.p[0], item.p[1], item.p[2]);
      const rot = new THREE.Euler(item.rot[0], item.rot[1], item.rot[2]);
      const scale = new THREE.Vector3(item.s[0], item.s[1], item.s[2]);

      const isAmbient = (i % ambientStep === 0) && (ambientCount < 380);
      const ambientPos = new THREE.Vector3();
      const ambientScale = new THREE.Vector3();
      let baseAlpha = 1.0;

      if (isAmbient) {
        ambientCount++;
        // Requirement 1: 80% <= 0.4 of previous (<= 0.048), large (up to 5%) only far and pale, 15% medium
        const randType = Math.random();
        if (randType < 0.80) {
          // 80%: small particles, size <= 0.4 of 0.12 (0.024 .. 0.044)
          const s = 0.024 + Math.random() * 0.020;
          ambientScale.set(s, s, s);
          ambientPos.set(
            (Math.random() - 0.5) * 36.0,
            -3.0 + Math.random() * 18.0,
            -22.0 + Math.random() * 14.0 // Z in [-22, -8]
          );
          baseAlpha = 0.85;
        } else if (randType < 0.85) {
          // 5%: large particles, ONLY far away and pale
          const s = 0.080 + Math.random() * 0.025;
          ambientScale.set(s, s, s);
          ambientPos.set(
            (Math.random() - 0.5) * 34.0,
            -2.5 + Math.random() * 17.0,
            -28.0 + Math.random() * 8.0 // strictly deep: Z in [-28, -20]
          );
          baseAlpha = 0.28; // pale
        } else {
          // 15%: medium particles (0.048 .. 0.064)
          const s = 0.048 + Math.random() * 0.016;
          ambientScale.set(s, s, s);
          ambientPos.set(
            (Math.random() - 0.5) * 35.0,
            -3.0 + Math.random() * 18.0,
            -20.0 + Math.random() * 10.0 // Z in [-20, -10]
          );
          baseAlpha = 0.60;
        }
      }

      const driftFreq = new THREE.Vector3(
        0.15 + Math.random() * 0.35,
        0.20 + Math.random() * 0.40,
        0.15 + Math.random() * 0.30
      );
      const driftPhase = new THREE.Vector3(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      const driftAmp = new THREE.Vector3(
        1.2 + Math.random() * 1.5,
        0.8 + Math.random() * 1.0,
        1.0 + Math.random() * 1.2
      );

      this.dummy.position.copy(pos);
      this.dummy.rotation.copy(rot);
      if (this.mode === 'ambient') {
        if (isAmbient) {
          this.dummy.position.copy(ambientPos);
          this.dummy.scale.copy(ambientScale);
        } else {
          this.dummy.scale.set(0, 0, 0);
        }
      } else if (this.transitionState === 'ambient_to_house') {
        this.dummy.scale.set(0, 0, 0);
      } else {
        this.dummy.scale.copy(scale);
      }
      this.dummy.updateMatrix();

      this.instancedCubes.setMatrixAt(i, this.dummy.matrix);

      // Dispersion vector with randomized spread for bottom-to-top dispersal
      const dispDir = new THREE.Vector3().subVectors(pos, centerPoint);
      dispDir.y += 0.45;
      dispDir.normalize().multiplyScalar(6.0 + Math.random() * 5.0);

      const heightNorm = Math.min(1.0, Math.max(0.0, item.p[1] / 6.5));
      const distNorm = Math.min(1.0, Math.hypot(item.p[0], item.p[2]) / 5.5);

      this.cubesData.push({
        basePos: pos.clone(),
        baseRot: rot,
        baseScale: scale.clone(),
        dispersionDir: dispDir,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 2.5
        ),
        heightNorm,
        distNorm,
        type: item.type,
        isAmbient,
        ambientPos,
        ambientScale,
        baseAlpha,
        driftFreq,
        driftPhase,
        driftAmp
      });
    }

    this.instancedCubes.instanceMatrix.needsUpdate = true;
    this.stage.add(this.instancedCubes);

    // 5) Ground reflection: weak mirror copy of house along Y axis (desktop only)
    const isNarrow = typeof window !== 'undefined' ? window.innerWidth < 900 : false;
    if (!this.isWeakDevice && !isNarrow) {
      this.buildGroundReflection(brickGeo, count);
    }
  }

  /**
   * Inner glowing frame: contour along the perimeter of the walls, shifted 0.35 inward.
   * Light shines through the 0.03m brick seams and window openings.
   */
  private buildInnerFrame(): void {
    const innerGeo = new THREE.BoxGeometry(1, 1, 1);

    const innerW = W - 2 * 0.35; // 6.3
    const innerD = D - 2 * 0.35; // 4.3

    const innerItems: { p: THREE.Vector3; s: THREE.Vector3; rot: THREE.Euler }[] = [];
    const stepX = 0.45;
    const stepZ = 0.45;
    const stepY = 0.25;

    for (let y = 0.15; y <= Hw + 0.05; y += stepY) {
      // Front wall (z = innerD / 2)
      for (let x = -innerW / 2; x <= innerW / 2 + 1e-4; x += stepX) {
        innerItems.push({
          p: new THREE.Vector3(x, y, innerD / 2),
          s: new THREE.Vector3(stepX * 0.88, stepY * 0.85, 0.14),
          rot: new THREE.Euler(0, 0, 0)
        });
      }
      // Back wall (z = -innerD / 2)
      for (let x = -innerW / 2; x <= innerW / 2 + 1e-4; x += stepX) {
        innerItems.push({
          p: new THREE.Vector3(x, y, -innerD / 2),
          s: new THREE.Vector3(stepX * 0.88, stepY * 0.85, 0.14),
          rot: new THREE.Euler(0, 0, 0)
        });
      }
      // Left wall (x = -innerW / 2)
      for (let z = -innerD / 2 + stepZ; z < innerD / 2 - 1e-4; z += stepZ) {
        innerItems.push({
          p: new THREE.Vector3(-innerW / 2, y, z),
          s: new THREE.Vector3(0.14, stepY * 0.85, stepZ * 0.88),
          rot: new THREE.Euler(0, 0, 0)
        });
      }
      // Right wall (x = innerW / 2)
      for (let z = -innerD / 2 + stepZ; z < innerD / 2 - 1e-4; z += stepZ) {
        innerItems.push({
          p: new THREE.Vector3(innerW / 2, y, z),
          s: new THREE.Vector3(0.14, stepY * 0.85, stepZ * 0.88),
          rot: new THREE.Euler(0, 0, 0)
        });
      }
    }

    // Gables (triangles at x = +- innerW / 2 under roof pitch)
    for (let y = Hw + stepY; y <= Hw + (D / 2) * Math.tan(PITCH); y += stepY) {
      const curHalfD = (D / 2) - (y - Hw) / Math.tan(PITCH) - 0.35;
      if (curHalfD > 0.2) {
        for (let z = -curHalfD; z <= curHalfD + 1e-4; z += stepZ) {
          innerItems.push({
            p: new THREE.Vector3(-innerW / 2, y, z),
            s: new THREE.Vector3(0.14, stepY * 0.85, stepZ * 0.88),
            rot: new THREE.Euler(0, 0, 0)
          });
          innerItems.push({
            p: new THREE.Vector3(innerW / 2, y, z),
            s: new THREE.Vector3(0.14, stepY * 0.85, stepZ * 0.88),
            rot: new THREE.Euler(0, 0, 0)
          });
        }
      }
    }

    const count = innerItems.length;
    const distArray = new Float32Array(count);
    const centerPoint = new THREE.Vector3(0, 2.5, 0);

    this.innerUniforms = {
      uGlowColor: { value: this.currentGlowColor },
      uTime: { value: 0 }
    };

    this.innerMaterial = new THREE.MeshBasicMaterial({
      color: this.currentGlowColor,
      toneMapped: true,
      fog: false
    });
    this.innerMaterial.customProgramCacheKey = () => 'house-inner-frame';

    this.innerMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uGlowColor = this.innerUniforms!.uGlowColor;
      shader.uniforms.uTime = this.innerUniforms!.uTime;

      shader.vertexShader = `
        attribute float instanceDist;
        varying float vDist;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vDist = instanceDist;
        `
      );

      shader.fragmentShader = `
        uniform vec3 uGlowColor;
        uniform float uTime;
        varying float vDist;
        ${shader.fragmentShader}
      `.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float wave = 1.0 + 0.23 * sin(uTime * 1.795 - vDist * 0.45);
        vec3 innerRgb = uGlowColor * (wave * 0.15);
        diffuseColor.rgb = min(innerRgb, vec3(0.15));
        `
      );
    };

    this.innerInstancedCubes = new THREE.InstancedMesh(innerGeo, this.innerMaterial, count);
    this.innerInstancedCubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.innerCubesData = [];

    for (let i = 0; i < count; i++) {
      const it = innerItems[i];
      distArray[i] = it.p.distanceTo(centerPoint);

      this.dummy.position.copy(it.p);
      this.dummy.rotation.copy(it.rot);
      if (this.mode === 'ambient' || this.transitionState === 'ambient_to_house') {
        this.dummy.scale.set(0, 0, 0);
      } else {
        this.dummy.scale.copy(it.s);
      }
      this.dummy.updateMatrix();

      this.innerInstancedCubes.setMatrixAt(i, this.dummy.matrix);

      // Dispersion vector for menu-click explosion
      const dispDir = new THREE.Vector3().subVectors(it.p, centerPoint);
      dispDir.y += 0.35;
      dispDir.normalize().multiplyScalar(4.0 + Math.random() * 4.0);

      const heightNorm = Math.min(1.0, Math.max(0.0, it.p.y / 6.5));
      const distNorm = Math.min(1.0, Math.hypot(it.p.x, it.p.z) / 5.5);

      this.innerCubesData.push({
        basePos: it.p.clone(),
        baseRot: it.rot,
        baseScale: it.s.clone(),
        dispersionDir: dispDir,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 2.0
        ),
        heightNorm,
        distNorm
      });
    }

    innerGeo.setAttribute('instanceDist', new THREE.InstancedBufferAttribute(distArray, 1));
    this.innerInstancedCubes.instanceMatrix.needsUpdate = true;
    this.stage.add(this.innerInstancedCubes);
  }

  /**
   * Luminous ground ring under the house + soft radial glowing disk inside the ring
   */
  private buildGroundRing(): void {
    // 1. Soft radial glowing disk inside ring (radius 0 to 6.4)
    // --glow color, 40% quieter, fog: false
    const diskGeo = new THREE.CircleGeometry(6.4, 64);
    this.groundDiskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: this.currentGlowColor },
        uFade: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGlowColor;
        uniform float uFade;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5)) * 2.0; // 0.0 at center, 1.0 at outer edge
          float alpha = clamp(1.0 - dist, 0.0, 1.0) * 0.072 * uFade;
          gl_FragColor = vec4(uGlowColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const diskMesh = new THREE.Mesh(diskGeo, this.groundDiskMaterial);
    diskMesh.rotation.x = -Math.PI / 2;
    diskMesh.position.set(0, -0.055, 0);
    this.stage.add(diskMesh);

    // 2. Ring border (fog: false, toneMapped: false so it glows with bloom 0.3)
    const ringGeo = new THREE.RingGeometry(6.4, 6.58, 128);
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: this.currentAccentColor,
      toneMapped: false,
      transparent: true,
      opacity: 0.51,
      side: THREE.DoubleSide,
      fog: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, this.ringMaterial);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0, -0.05, 0);
    this.stage.add(ringMesh);

    // 3. Ground light spots under windows
    this.buildWindowLightSpots();
  }

  /**
   * Warm light pools on the ground beneath windows:
   * Semi-transparent quads (max opacity 0.18, decay over 2m from wall), fog: false.
   */
  private buildWindowLightSpots(): void {
    const spotGeo = new THREE.PlaneGeometry(1.6, 2.0);
    // Translate geometry so (0,0,0) is at the wall and geometry extends outward 2m
    spotGeo.translate(0, 1.0, 0);

    this.windowSpotMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uFade: { value: 1.0 },
        uTime: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uFade;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          // vUv.y goes from 0.0 at wall to 1.0 outward (decaying smoothly to 0 at 2m)
          float distFalloff = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);
          // vUv.x across width [0..1]
          float sideFalloff = sin(clamp(vUv.x, 0.0, 1.0) * 3.14159265);
          // Breathing hearth light on grass/ground in sync with fireplace
          float hearthBreath = 1.0 + 0.06 * sin(uTime * 3.7) + 0.04 * cos(uTime * 6.9);
          float intensity = distFalloff * sideFalloff * 0.18 * uFade * hearthBreath;
          vec3 warmWindow = vec3(1.0, 0.72, 0.38);
          gl_FragColor = vec4(warmWindow * intensity, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });

    const spots: { pos: [number, number, number]; rotZ: number; width?: number; length?: number }[] = [
      // Front wall (Z = 2.5, extending +Z)
      { pos: [-2.2, -0.045, 2.5], rotZ: 0 },
      { pos: [2.2, -0.045, 2.5], rotZ: 0 },
      { pos: [0, -0.045, 2.5], rotZ: 0, width: 1.2, length: 1.8 }, // door light

      // Back wall (Z = -2.5, extending -Z)
      { pos: [-2.4, -0.045, -2.5], rotZ: Math.PI },
      { pos: [0, -0.045, -2.5], rotZ: Math.PI },
      { pos: [2.4, -0.045, -2.5], rotZ: Math.PI },

      // Right wall (X = 3.5, extending +X)
      { pos: [3.5, -0.045, -1.1], rotZ: -Math.PI / 2 },
      { pos: [3.5, -0.045, 1.1], rotZ: -Math.PI / 2 },

      // Left wall (X = -3.5, extending -X)
      { pos: [-3.5, -0.045, -1.1], rotZ: Math.PI / 2 },
      { pos: [-3.5, -0.045, 1.1], rotZ: Math.PI / 2 }
    ];

    for (const s of spots) {
      const mesh = new THREE.Mesh(spotGeo, this.windowSpotMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = s.rotZ;
      mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
      if (s.width || s.length) {
        mesh.scale.set(s.width ? s.width / 1.6 : 1, s.length ? s.length / 2.0 : 1, 1);
      }
      this.stage.add(mesh);
    }
  }

  /**
   * 3) Contact shadow: blurred dark spot under house base (radial gradient, opacity 0.5)
   */
  private buildContactShadow(): void {
    const shadowGeo = new THREE.PlaneGeometry(8.6, 6.6);
    this.contactShadowUniforms = {
      uFade: { value: 1.0 }
    };
    const shadowMat = new THREE.ShaderMaterial({
      uniforms: this.contactShadowUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uFade;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - vec2(0.5)) * 2.0;
          // Elliptical radial gradient matching house footprint (W=7, D=5)
          float d = length(vec2(p.x * 0.88, p.y * 1.15));
          float shadow = 1.0 - smoothstep(0.18, 0.98, d);
          float alpha = shadow * 0.50 * uFade;
          if (alpha < 0.005) discard;
          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    this.contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadowMesh.rotation.x = -Math.PI / 2;
    this.contactShadowMesh.position.set(0, -0.045, 0);
    this.stage.add(this.contactShadowMesh);
  }

  /**
   * 1) Chimney smoke: 36 sprite particles rising 3m over 6-8s, expanding 0.15 -> 0.70m,
   * gentle wind drifting right, opacity 0.35 -> 0, soft grey-blue color from theme, normal blending.
   */
  private buildChimneySmoke(): void {
    const smokeCount = 36;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(smokeCount * 3);
    const progOffsets = new Float32Array(smokeCount);
    const lifetimes = new Float32Array(smokeCount);
    const seeds = new Float32Array(smokeCount * 2);

    const smokeRng = createSeededRandom(999);
    for (let i = 0; i < smokeCount; i++) {
      // Chimney rim is at (2.0, 6.47, 1.0)
      pos[i * 3] = 2.0;
      pos[i * 3 + 1] = 6.47;
      pos[i * 3 + 2] = 1.0;
      progOffsets[i] = i / smokeCount;
      lifetimes[i] = 6.0 + smokeRng() * 2.0; // 6 - 8s
      seeds[i * 2] = smokeRng();
      seeds[i * 2 + 1] = smokeRng();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aProgressOffset', new THREE.BufferAttribute(progOffsets, 1));
    geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));

    this.smokeUniforms = {
      uTime: { value: 0.0 },
      uColor: { value: this.currentSmokeColor },
      uTexture: { value: this.softCircleTexture },
      uFade: { value: 1.0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.0) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.smokeUniforms,
      vertexShader: `
        attribute float aProgressOffset;
        attribute float aLifetime;
        attribute vec2 aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying float vProgress;

        void main() {
          float t = (uTime / aLifetime) + aProgressOffset;
          float p = fract(t);
          vProgress = p;

          // Chimney rim is at (2.0, 6.47, 1.0)
          // Rises 3.5m over 6-8s from chimney top (y = 6.47 to 9.97)
          float y = 6.47 + p * 3.5;

          // Soft wind drift to the right + gentle curling turbulence
          float curl1 = sin(p * 5.0 + aSeed.x * 6.28) * 0.25 * p;
          float curl2 = cos(p * 4.0 + aSeed.y * 6.28) * 0.20 * p;
          float windX = p * 1.35 + curl1;
          float windZ = p * 0.35 + curl2;

          vec3 pos = vec3(2.0 + windX, y, 1.0 + windZ);

          // Expands from 0.40m up to 2.10m (billowy, soft clouds of smoke)
          float sizeMeters = mix(0.40, 2.10, pow(p, 0.7));

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          // Perspective point size calibrated for fov=32: H / (2 * tan(fov/2)) ≈ 1550
          gl_PointSize = (sizeMeters * 1550.0 * uPixelRatio) / -mvPosition.z;
          gl_PointSize = clamp(gl_PointSize, 6.0, 260.0);

          // Smooth birth at rim, billowy body, soft dispersal at top
          float birth = smoothstep(0.0, 0.10, p);
          float fade = pow(1.0 - p, 1.3);
          vAlpha = 0.55 * birth * fade;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform sampler2D uTexture;
        uniform float uFade;
        varying float vAlpha;
        varying float vProgress;

        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          float alpha = tex.a * vAlpha * uFade;
          if (alpha < 0.005) discard;
          // Slight warm-lit glow near chimney base from fire, soft cool smoke above
          vec3 col = mix(uColor * 1.30 + vec3(0.12, 0.08, 0.04), uColor, smoothstep(0.0, 0.35, vProgress));
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      fog: false
    });

    this.smokeMesh = new THREE.Points(geo, mat);
    this.smokeMesh.frustumCulled = false;
    this.stage.add(this.smokeMesh);
  }

  /**
   * 5) Ground reflection: weak mirror copy of house along Y axis with opacity 0.12, fading out over 2m,
   * desktop only, without star reflections.
   */
  private buildGroundReflection(brickGeo: THREE.BufferGeometry, count: number): void {
    this.reflectedMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.90,
      metalness: 0.0,
      envMapIntensity: 0.05,
      fog: false,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.reflectedMaterial.customProgramCacheKey = () => 'house-bricks-reflection';

    this.reflectedMaterial.onBeforeCompile = (shader) => {
      for (const k in this.cubeUniforms) {
        shader.uniforms[k] = this.cubeUniforms[k];
      }

      shader.vertexShader = `
        attribute float instanceType;
        attribute float aTint;
        attribute float aWindowEmissive;
        attribute float aAmbientAlpha;

        varying float vInstanceType;
        varying float vTint;
        varying float vWindowEmissive;
        varying float vAmbientAlpha;
        varying vec2 vWindowUv;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec3 vInstanceScale;
        varying float vWorldY;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vInstanceType = instanceType;
        vTint = aTint;
        vWindowEmissive = aWindowEmissive;
        vAmbientAlpha = aAmbientAlpha;
        vWindowUv = uv;
        vLocalPos = position;
        vLocalNormal = normal;
        #ifdef USE_INSTANCING
          vInstanceScale = vec3(
            length(instanceMatrix[0].xyz),
            length(instanceMatrix[1].xyz),
            length(instanceMatrix[2].xyz)
          );
          vWorldY = (instanceMatrix * vec4(position, 1.0)).y;
        #else
          vInstanceScale = vec3(1.0);
          vWorldY = position.y;
        #endif
        `
      );

      shader.fragmentShader = `
        uniform vec3 uHouseColor;
        uniform vec3 uAccent2Color;
        uniform vec3 uAccentColor;
        uniform vec3 uGlowColor;
        uniform float uEmissiveFade;
        uniform float uSceneBrightness;

        uniform vec3 uWallColor;
        uniform vec3 uRoofColor;
        uniform vec3 uMortarColor;
        uniform vec3 uTrimColor;
        uniform vec3 uWindowGlowColor;

        uniform float uWallGain;
        uniform float uRoofGain;
        uniform float uBaseGain;
        uniform float uTrimGain;
        uniform float uMortarDarkness;
        uniform float uMortarWidth;
        uniform float uMortarGlow;
        uniform float uMaxLuma;
        uniform float uTime;

        varying float vInstanceType;
        varying float vTint;
        varying float vWindowEmissive;
        varying float vAmbientAlpha;
        varying vec2 vWindowUv;
        varying vec3 vLocalPos;
        varying vec3 vLocalNormal;
        varying vec3 vInstanceScale;
        varying float vWorldY;
        ${shader.fragmentShader}
      `.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec3 dEdgeMeters = max(vec3(0.0), (vec3(0.5) - abs(vLocalPos)) * vInstanceScale);
        vec3 absNorm = abs(vLocalNormal);
        float distToEdgeMeters = (absNorm.x > 0.5) ? min(dEdgeMeters.y, dEdgeMeters.z) : ((absNorm.y > 0.5) ? min(dEdgeMeters.x, dEdgeMeters.z) : min(dEdgeMeters.x, dEdgeMeters.y));
        float mortarFactor = smoothstep(0.0, uMortarWidth, distToEdgeMeters);

        if (vInstanceType < 0.5) {
          vec3 baseBrick = (uWallColor * uWallGain) * (0.80 + 0.38 * vTint);
          diffuseColor.rgb = baseBrick * mix(uMortarDarkness, 1.0, mortarFactor);
        } else if (vInstanceType < 1.5) {
          vec3 baseSlab = (uWallColor * uBaseGain) * (0.85 + 0.30 * vTint);
          diffuseColor.rgb = baseSlab * mix(uMortarDarkness, 1.0, mortarFactor);
        } else if (vInstanceType < 2.5) {
          vec3 baseRoof = (uRoofColor * uRoofGain) * (0.82 + 0.36 * vTint);
          diffuseColor.rgb = baseRoof * mix(uMortarDarkness, 1.0, mortarFactor);
        } else if (vInstanceType < 3.5) {
          diffuseColor.rgb = uTrimColor * uTrimGain;
        } else if (vInstanceType < 4.5) {
          diffuseColor.rgb = vec3(0.10, 0.06, 0.03);
        } else if (vInstanceType < 5.5) {
          diffuseColor.rgb = uWindowGlowColor * 0.75;
        } else {
          diffuseColor.rgb = uAccentColor * 0.35;
        }
        // Mirror reflection: opacity 0.12 fading out over 2m (vWorldY goes 0 to 2m)
        float refFade = clamp(1.0 - (vWorldY / 2.0), 0.0, 1.0);
        diffuseColor.a = 0.12 * refFade * uSceneBrightness * vAmbientAlpha;
        `
      ).replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        if (vInstanceType > 4.5 && vInstanceType < 5.5) {
          float refFade = clamp(1.0 - (vWorldY / 2.0), 0.0, 1.0);
          totalEmissiveRadiance = uWindowGlowColor * (0.80 * (0.12 * refFade) * uEmissiveFade * uSceneBrightness * vAmbientAlpha);
        }
        `
      ).replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        float refFade = clamp(1.0 - (vWorldY / 2.0), 0.0, 1.0);
        gl_FragColor.a = 0.12 * refFade * uSceneBrightness * vAmbientAlpha;
        `
      );
    };

    this.reflectedGroup = new THREE.Group();
    this.reflectedGroup.scale.set(1.0, -1.0, 1.0);
    this.reflectedGroup.position.set(0.0, -0.05, 0.0);

    this.reflectedMesh = new THREE.InstancedMesh(brickGeo, this.reflectedMaterial, count);
    this.reflectedMesh.instanceMatrix = this.instancedCubes.instanceMatrix;
    this.reflectedMesh.frustumCulled = false;
    this.reflectedGroup.add(this.reflectedMesh);
    this.stage.add(this.reflectedGroup);
  }

  public startTransitionTo(targetMode: 'house' | 'ambient', clickTime?: number): void {
    if (clickTime) {
      this.lastClickTimestamp = clickTime;
      this.clickToAnimTimeMs = performance.now() - clickTime;
    }

    if (targetMode === 'ambient') {
      if (this.mode === 'ambient' && this.transitionState === 'idle') return;
      this.mode = 'ambient';
      this.transitionState = 'house_to_ambient';
      this.transitionElapsed = 0.0;
      this.transitionDuration = 1.1;
    } else {
      if (this.mode === 'house' && this.transitionState === 'idle') return;
      this.mode = 'house';
      this.transitionState = 'ambient_to_house';
      this.transitionElapsed = 0.0;
      this.transitionDuration = 1.4;
      this.wasMatrixDirty = true;
      this.recomputeFittingDist();
    }
  }

  public handlePageNav(pathname: string): void {
    const isHome = pathname === '/' || pathname === '/index.html' || pathname === '';
    if (isHome) {
      this.anchorElement = typeof document !== 'undefined' ? document.getElementById('house-anchor') : null;
      if (this.anchorElement && this.anchorResizeObserver) {
        this.anchorResizeObserver.observe(this.anchorElement);
      }
      this.recomputeFittingDist();
      if (this.mode !== 'house' && this.transitionState !== 'ambient_to_house') {
        this.startTransitionTo('house', performance.now());
      }
    } else {
      if (this.mode !== 'ambient' && this.transitionState !== 'house_to_ambient') {
        this.startTransitionTo('ambient', performance.now());
      }
    }
  }

  private setupMenuExplodeListener(): void {
    // Navigation clicks are non-blocking and handled in BaseLayout
  }

  private buildDistantStars(isNarrow: boolean): void {
    const count = isNarrow ? 250 : 500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const periods = new Float32Array(count);
    const brightness = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2.0 - 1.0);
      const r = 120.0 + Math.random() * 80.0; // [120 .. 200]
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 1.0 + Math.random() * 0.6; // 1.0 - 1.6 px
      phases[i] = Math.random() * Math.PI * 2.0;
      periods[i] = 3.0 + Math.random() * 6.0; // 3 - 9 s
      brightness[i] = 0.2 + Math.random() * 0.6; // 0.2 - 0.8
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aPeriod', new THREE.BufferAttribute(periods, 1));
    geo.setAttribute('aBaseBrightness', new THREE.BufferAttribute(brightness, 1));

    this.starsUniforms = {
      uTime: { value: 0.0 },
      uColor: { value: this.currentStarColor },
      uGlobalAlpha: { value: this.currentParticleAlpha },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2.0) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.starsUniforms,
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute float aPeriod;
        attribute float aBaseBrightness;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          float tw = 0.5 + 0.5 * sin(uTime * (6.283185 / aPeriod) + aPhase);
          vAlpha = aBaseBrightness * (0.6 + 0.4 * tw);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (280.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 3.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uGlobalAlpha;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float soft = smoothstep(0.5, 0.05, dist);
          gl_FragColor = vec4(uColor, vAlpha * soft * uGlobalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: this.currentBlending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending
    });

    this.starsMesh = new THREE.Points(geo, mat);
    this.starsMesh.frustumCulled = false;
    this.starsGroup.add(this.starsMesh);
  }

  private buildMidDust(isNarrow: boolean): void {
    const count = isNarrow ? 125 : 250;
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80.0;
      positions[i * 3 + 1] = -10.0 + Math.random() * 45.0;
      positions[i * 3 + 2] = -40.0 + Math.random() * 60.0;

      vel[i * 3] = 0.3 + Math.random() * 0.5; // drift freq
      vel[i * 3 + 1] = 0.4 + Math.random() * 0.8; // speedY
      vel[i * 3 + 2] = Math.random() * Math.PI * 2.0; // phase

      sizes[i] = 2.0 + Math.random() * 3.0; // 2 - 5 px
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.dustUniforms = {
      uTime: { value: 0.0 },
      uColor: { value: this.currentDustColor },
      uGlobalAlpha: { value: this.currentParticleAlpha },
      uTexture: { value: this.softCircleTexture },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2.0) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.dustUniforms,
      vertexShader: `
        attribute vec3 aVel;
        attribute float aSize;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          float totalY = pos.y + uTime * aVel.y;
          pos.y = -10.0 + mod(totalY + 10.0, 45.0);
          pos.x += sin(uTime * aVel.x + aVel.z) * 2.2;
          pos.z += cos(uTime * (aVel.x * 0.7) + aVel.z) * 1.5;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (260.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.5, 7.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uGlobalAlpha;
        uniform sampler2D uTexture;

        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          if (tex.a < 0.02) discard;
          gl_FragColor = vec4(uColor, tex.a * uGlobalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: this.currentBlending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending
    });

    this.dustMesh = new THREE.Points(geo, mat);
    this.dustMesh.frustumCulled = false;
    this.midGroup.add(this.dustMesh);
  }

  private buildWarmSparks(isNarrow: boolean): void {
    const count = isNarrow ? 4 : 7; // 6-8 desktop, 3-4 mobile
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const periods = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = -6.0 + Math.random() * 16.0;
      positions[i * 3 + 1] = 1.0 + Math.random() * 8.0;
      positions[i * 3 + 2] = -5.0 + Math.random() * 12.0;

      sizes[i] = 3.5 + Math.random() * 2.5; // 3.5 - 6 px
      phases[i] = Math.random() * Math.PI * 2.0;
      periods[i] = 2.5 + Math.random() * 4.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aPeriod', new THREE.BufferAttribute(periods, 1));

    this.sparksUniforms = {
      uTime: { value: 0.0 },
      uColor: { value: this.currentSparkColor },
      uTexture: { value: this.softCircleTexture },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2.0) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.sparksUniforms,
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute float aPeriod;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          float pulse = 0.5 + 0.5 * sin(uTime * (6.283185 / aPeriod) + aPhase);
          vAlpha = 0.4 + 0.6 * pulse;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (280.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 2.5, 8.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform sampler2D uTexture;
        varying float vAlpha;

        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          if (tex.a < 0.02) discard;
          gl_FragColor = vec4(uColor, tex.a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: this.currentBlending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending
    });

    this.sparksMesh = new THREE.Points(geo, mat);
    this.sparksMesh.frustumCulled = false;
    this.midGroup.add(this.sparksMesh);
  }

  private buildForegroundBokeh(isNarrow: boolean): void {
    if (isNarrow) return;

    const count = 12;
    const bokehGeo = new THREE.PlaneGeometry(1, 1);

    for (let i = 0; i < count; i++) {
      const scale = 5.0 + Math.random() * 8.0; // 40-120 px
      const mat = new THREE.MeshBasicMaterial({
        map: this.bokehTexture,
        color: this.currentBokehColor,
        transparent: true,
        opacity: this.currentBokehOpacity,
        depthWrite: false,
        blending: this.currentBlending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(bokehGeo, mat);
      const posX = -14.0 + (i % 4) * 8.0 + (Math.random() - 0.5) * 4.0;
      const posY = -3.0 + Math.floor(i / 4) * 5.0 + (Math.random() - 0.5) * 3.0;
      const posZ = 12.0 + Math.random() * 10.0;

      mesh.position.set(posX, posY, posZ);
      mesh.scale.set(scale, scale, 1);

      mesh.userData = {
        baseX: posX,
        baseY: posY,
        freqX: 0.15 + Math.random() * 0.25,
        freqY: 0.12 + Math.random() * 0.20,
        phaseX: Math.random() * Math.PI * 2.0,
        phaseY: Math.random() * Math.PI * 2.0,
        ampX: 0.6 + Math.random() * 0.8,
        ampY: 0.5 + Math.random() * 0.7
      };

      this.bokehMeshes.push(mesh);
      this.bokehGroup.add(mesh);
    }
  }

  private setupThemeListener(): void {
    window.addEventListener('theme-change', (e: Event) => {
      const customEvt = e as CustomEvent<{ theme?: string }>;
      const themeId = customEvt.detail?.theme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) || 'neon';
      this.currentThemeId = themeId;
      const sceneCfg = getThemeSceneConfig(themeId);
      const houseCfg = getThemeHouseConfig(themeId);
      this.themeConfig = sceneCfg;
      this.houseConfig = houseCfg;

      const isLight = themeId === 'light';
      const newHex = this.readCssVariable('--house-color') || houseCfg.wall;
      const newAccent2 = this.readCssVariable('--accent-2') || (isLight ? '#059669' : '#10b981');
      const newBg = sceneCfg.bg;
      const newAccent = this.readCssVariable('--accent') || (isLight ? '#0284c7' : '#06b6d4');
      const newGlow = this.readCssVariable('--glow') || (isLight ? 'rgba(2, 132, 199, 0.20)' : '#00f0ff');

      this.targetColor.copy(this.parseRgbOnly(newHex));
      this.targetAccent2Color.copy(this.parseRgbOnly(newAccent2));
      this.targetBgColor.copy(this.parseRgbOnly(newBg));
      this.targetAccentColor.copy(this.parseRgbOnly(newAccent));
      this.targetGlowColor.copy(this.parseRgbOnly(newGlow));

      this.targetWallColor.set(houseCfg.wall);
      this.targetRoofColor.set(houseCfg.roof);
      this.targetMortarColor.set(houseCfg.mortar);
      this.targetTrimColor.set(houseCfg.trim);
      this.targetWindowGlowColor.set(houseCfg.windowGlow);
      this.targetSmokeColor.set(houseCfg.smoke || '#94a3b8');

      if (!this.isTune && this.cubeUniforms) {
        this.cubeUniforms.uWallGain.value = houseCfg.wallGain;
        this.cubeUniforms.uRoofGain.value = houseCfg.roofGain;
        this.cubeUniforms.uBaseGain.value = houseCfg.baseGain;
        this.cubeUniforms.uTrimGain.value = houseCfg.trimGain;
        this.cubeUniforms.uMortarDarkness.value = houseCfg.mortarDarkness;
        this.cubeUniforms.uMortarWidth.value = houseCfg.mortarWidth;
        this.cubeUniforms.uMortarGlow.value = houseCfg.mortarGlow;
        this.cubeUniforms.uMaxLuma.value = houseCfg.maxLuma;
      }

      this.targetStarColor.set(sceneCfg.starColor);
      this.targetDustColor.set(sceneCfg.dustColor);
      this.targetSparkColor.set(sceneCfg.sparkColor);
      this.targetFogColor.set(sceneCfg.fogColor);
      this.targetBloomStrength = sceneCfg.bloomStrength;
      this.targetParticleAlpha = sceneCfg.particleAlpha;
      this.targetBlending = sceneCfg.blending;

      if (isLight) {
        this.targetBokehColor.copy(this.targetAccentColor);
        this.targetBokehOpacity = 0.06;
      } else {
        this.targetBokehColor.copy(this.targetGlowColor);
        this.targetBokehOpacity = 0.06;
      }

      if (sceneCfg.camera && !this.isTune) {
        this.cameraFov = sceneCfg.camera.fov;
        this.cameraElevation = sceneCfg.camera.elevation;
        this.cameraAzimuth = sceneCfg.camera.azimuth;
        this.cameraLookAtY = sceneCfg.camera.lookAtY;
        this.camera.fov = this.cameraFov;
        this.camera.updateProjectionMatrix();
        this.recomputeFittingDist();
      }
    });
  }

  private updateColorTransition(): void {
    if (!this.currentColor.equals(this.targetColor)) {
      this.currentColor.lerp(this.targetColor, 0.12);
      if (this.cubeUniforms?.uHouseColor) {
        this.cubeUniforms.uHouseColor.value.copy(this.currentColor);
      }
      if (this.particlesMaterial) {
        this.particlesMaterial.color.copy(this.currentColor);
      }
    }

    if (!this.currentWallColor.equals(this.targetWallColor)) {
      this.currentWallColor.lerp(this.targetWallColor, 0.12);
      if (this.cubeUniforms?.uWallColor) {
        this.cubeUniforms.uWallColor.value.copy(this.currentWallColor);
      }
    }

    if (!this.currentRoofColor.equals(this.targetRoofColor)) {
      this.currentRoofColor.lerp(this.targetRoofColor, 0.12);
      if (this.cubeUniforms?.uRoofColor) {
        this.cubeUniforms.uRoofColor.value.copy(this.currentRoofColor);
      }
    }

    if (!this.currentMortarColor.equals(this.targetMortarColor)) {
      this.currentMortarColor.lerp(this.targetMortarColor, 0.12);
      if (this.cubeUniforms?.uMortarColor) {
        this.cubeUniforms.uMortarColor.value.copy(this.currentMortarColor);
      }
    }

    if (!this.currentTrimColor.equals(this.targetTrimColor)) {
      this.currentTrimColor.lerp(this.targetTrimColor, 0.12);
      if (this.cubeUniforms?.uTrimColor) {
        this.cubeUniforms.uTrimColor.value.copy(this.currentTrimColor);
      }
    }

    if (!this.currentWindowGlowColor.equals(this.targetWindowGlowColor)) {
      this.currentWindowGlowColor.lerp(this.targetWindowGlowColor, 0.12);
      if (this.cubeUniforms?.uWindowGlowColor) {
        this.cubeUniforms.uWindowGlowColor.value.copy(this.currentWindowGlowColor);
      }
    }

    if (!this.currentSmokeColor.equals(this.targetSmokeColor)) {
      this.currentSmokeColor.lerp(this.targetSmokeColor, 0.12);
      if (this.smokeUniforms?.uColor) {
        this.smokeUniforms.uColor.value.copy(this.currentSmokeColor);
      }
    }

    if (!this.currentAccent2Color.equals(this.targetAccent2Color)) {
      this.currentAccent2Color.lerp(this.targetAccent2Color, 0.12);
      if (this.cubeUniforms?.uAccent2Color) {
        this.cubeUniforms.uAccent2Color.value.copy(this.currentAccent2Color);
      }
    }

    if (!this.currentAccentColor.equals(this.targetAccentColor)) {
      this.currentAccentColor.lerp(this.targetAccentColor, 0.12);
      if (this.ringMaterial) {
        this.ringMaterial.color.copy(this.currentAccentColor);
      }
      if (this.cubeUniforms?.uAccentColor) {
        this.cubeUniforms.uAccentColor.value.copy(this.currentAccentColor);
      }
      if (this.backLight) {
        this.backLight.color.copy(this.currentAccentColor);
      }
    }

    if (!this.currentGlowColor.equals(this.targetGlowColor)) {
      this.currentGlowColor.lerp(this.targetGlowColor, 0.12);
      if (this.innerMaterial) {
        this.innerMaterial.color.copy(this.currentGlowColor);
      }
      if (this.innerUniforms?.uGlowColor) {
        this.innerUniforms.uGlowColor.value.copy(this.currentGlowColor);
      }
      if (this.cubeUniforms?.uGlowColor) {
        this.cubeUniforms.uGlowColor.value.copy(this.currentGlowColor);
      }
      if (this.groundDiskMaterial?.uniforms?.uGlowColor) {
        this.groundDiskMaterial.uniforms.uGlowColor.value.copy(this.currentGlowColor);
      }
      if (this.hemiLight) {
        this.hemiLight.color.copy(this.currentGlowColor);
      }
    }

    if (!this.currentBgColor.equals(this.targetBgColor)) {
      this.currentBgColor.lerp(this.targetBgColor, 0.12);
      this.renderer.setClearColor(this.currentBgColor, 0.0);
    }

    // 0.4s Smooth interpolation of background particles, fog, bokeh and bloom
    this.currentStarColor.lerp(this.targetStarColor, 0.12);
    this.currentDustColor.lerp(this.targetDustColor, 0.12);
    this.currentSparkColor.lerp(this.targetSparkColor, 0.12);
    this.currentFogColor.lerp(this.targetFogColor, 0.12);
    this.currentBokehColor.lerp(this.targetBokehColor, 0.12);

    this.currentParticleAlpha += (this.targetParticleAlpha - this.currentParticleAlpha) * 0.12;
    this.currentBokehOpacity += (this.targetBokehOpacity - this.currentBokehOpacity) * 0.12;
    this.bloomPass.strength += (this.targetBloomStrength - this.bloomPass.strength) * 0.12;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.currentFogColor);
    }

    if (this.starsUniforms) {
      this.starsUniforms.uColor.value.copy(this.currentStarColor);
      this.starsUniforms.uGlobalAlpha.value = this.currentParticleAlpha;
    }

    if (this.dustUniforms) {
      this.dustUniforms.uColor.value.copy(this.currentDustColor);
      this.dustUniforms.uGlobalAlpha.value = this.currentParticleAlpha;
    }

    if (this.sparksUniforms) {
      this.sparksUniforms.uColor.value.copy(this.currentSparkColor);
    }

    for (const mesh of this.bokehMeshes) {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(this.currentBokehColor);
      mat.opacity = this.currentBokehOpacity;
    }

    // Blending mode switch
    if (this.currentBlending !== this.targetBlending) {
      this.currentBlending = this.targetBlending;
      const bMode = this.currentBlending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (this.starsMesh) {
        (this.starsMesh.material as THREE.ShaderMaterial).blending = bMode;
        (this.starsMesh.material as THREE.ShaderMaterial).needsUpdate = true;
      }
      if (this.dustMesh) {
        (this.dustMesh.material as THREE.ShaderMaterial).blending = bMode;
        (this.dustMesh.material as THREE.ShaderMaterial).needsUpdate = true;
      }
      if (this.sparksMesh) {
        (this.sparksMesh.material as THREE.ShaderMaterial).blending = bMode;
        (this.sparksMesh.material as THREE.ShaderMaterial).needsUpdate = true;
      }
      for (const bm of this.bokehMeshes) {
        (bm.material as THREE.MeshBasicMaterial).blending = bMode;
        (bm.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
    }

  }

  private updateCubesAnimation(time: number, dt: number): void {
    if (this.innerUniforms?.uTime) {
      this.innerUniforms.uTime.value = time;
    }
    if (this.smokeUniforms?.uTime) {
      this.smokeUniforms.uTime.value = time;
    }
    if (this.cubeUniforms?.uTime) {
      this.cubeUniforms.uTime.value = time;
    }
    if (this.windowSpotMaterial?.uniforms?.uTime) {
      this.windowSpotMaterial.uniforms.uTime.value = time;
    }

    if (this.transitionState === 'house_to_ambient') {
      this.transitionElapsed += dt;
      const tau = Math.min(1.0, this.transitionElapsed / this.transitionDuration);

      // Brightness fades from 1.0 down to 0.15
      const brightness = 1.0 - (1.0 - 0.15) * Math.min(1.0, tau / 0.85);
      if (this.cubeUniforms?.uSceneBrightness) {
        this.cubeUniforms.uSceneBrightness.value = brightness;
      }

      // Emissive fades out quickly in first 0.25s
      const emFade = Math.max(0.0, 1.0 - tau / 0.25);
      if (this.cubeUniforms?.uEmissiveFade) {
        this.cubeUniforms.uEmissiveFade.value = emFade;
      }

      // Bloom softens
      this.bloomPass.strength = THREE.MathUtils.lerp(this.targetBloomStrength, this.targetBloomStrength * 0.7, tau);

      // Ground disk & spots fade out
      const gFade = Math.max(0.0, 1.0 - tau / 0.30);
      if (this.groundDiskMaterial?.uniforms?.uFade) {
        this.groundDiskMaterial.uniforms.uFade.value = gFade;
      }
      if (this.contactShadowUniforms?.uFade) {
        this.contactShadowUniforms.uFade.value = gFade;
      }
      if (this.smokeUniforms?.uFade) {
        this.smokeUniforms.uFade.value = gFade;
      }
      if (this.reflectedGroup) {
        this.reflectedGroup.visible = (gFade > 0.05);
      }
      if (this.windowSpotMaterial?.uniforms?.uFade) {
        this.windowSpotMaterial.uniforms.uFade.value = gFade;
      }
      if (this.ringMaterial) {
        this.ringMaterial.opacity = (0.21 + 0.21 * (0.5 + 0.5 * Math.sin(time * 1.8))) * gFade;
      }

      const alphaAttr = this.instancedCubes.geometry.getAttribute('aAmbientAlpha') as THREE.InstancedBufferAttribute;
      const alphaArray = alphaAttr?.array as Float32Array;

      // Wave dispersal based on distance from center and height
      for (let i = 0; i < this.cubesData.length; i++) {
        const item = this.cubesData[i];
        const waveDelay = 0.20 * item.distNorm + 0.15 * item.heightNorm;
        const localT = Math.max(0.0, Math.min(1.0, (this.transitionElapsed - waveDelay) / Math.max(0.01, this.transitionDuration - waveDelay)));
        const ease = 1.0 - Math.pow(1.0 - localT, 3);

        if (item.isAmbient) {
          const dx = Math.sin(time * item.driftFreq!.x + item.driftPhase!.x) * item.driftAmp!.x;
          const dy = Math.cos(time * item.driftFreq!.y + item.driftPhase!.y) * item.driftAmp!.y;
          const dz = Math.sin(time * item.driftFreq!.z + item.driftPhase!.z) * item.driftAmp!.z;
          const targetPos = new THREE.Vector3(
            item.ambientPos!.x + dx,
            item.ambientPos!.y + dy,
            item.ambientPos!.z + dz
          );

          // Content-band attenuation & near-fade on target scale
          const distFromCenter = Math.abs(targetPos.x);
          const bandFactor = Math.max(0.0, Math.min(1.0, (distFromCenter - 3.5) / 2.2));
          const contentScaleMult = 0.60 + 0.40 * bandFactor;
          const contentAlphaMult = 0.25 + 0.75 * bandFactor;
          let nearFade = 1.0;
          if (targetPos.z > -7.0) {
            nearFade = Math.max(0.0, Math.min(1.0, (-targetPos.z - 1.5) / 5.5));
          }
          const targetScale = item.ambientScale!.clone().multiplyScalar(contentScaleMult * nearFade);

          this.dummy.position.lerpVectors(item.basePos, targetPos, ease);
          this.dummy.rotation.set(
            item.baseRot.x + item.rotSpeed.x * ease * 2.0,
            item.baseRot.y + item.rotSpeed.y * ease * 2.0,
            item.baseRot.z + item.rotSpeed.z * ease * 2.0
          );
          this.dummy.scale.lerpVectors(item.baseScale, targetScale, ease);

          if (alphaArray) {
            alphaArray[i] = THREE.MathUtils.lerp(1.0, (item.baseAlpha || 1.0) * contentAlphaMult * nearFade, ease);
          }
        } else {
          const disperseOffset = item.dispersionDir.clone().multiplyScalar(ease * 1.8);
          this.dummy.position.copy(item.basePos).add(disperseOffset);
          this.dummy.rotation.set(
            item.baseRot.x + item.rotSpeed.x * ease * 2.5,
            item.baseRot.y + item.rotSpeed.y * ease * 2.5,
            item.baseRot.z + item.rotSpeed.z * ease * 2.5
          );
          const s = Math.max(0.0, 1.0 - ease);
          this.dummy.scale.set(item.baseScale.x * s, item.baseScale.y * s, item.baseScale.z * s);
          if (alphaArray) {
            alphaArray[i] = Math.max(0.0, 1.0 - ease);
          }
        }

        this.dummy.updateMatrix();
        this.instancedCubes.setMatrixAt(i, this.dummy.matrix);
      }
      this.instancedCubes.instanceMatrix.needsUpdate = true;
      if (alphaAttr) alphaAttr.needsUpdate = true;

      // Inner frame fades to 0
      const innerEase = Math.max(0.0, 1.0 - Math.min(1.0, this.transitionElapsed / 0.35));
      for (let i = 0; i < this.innerCubesData.length; i++) {
        const item = this.innerCubesData[i];
        this.dummy.position.copy(item.basePos);
        this.dummy.rotation.set(item.baseRot.x, item.baseRot.y, item.baseRot.z);
        this.dummy.scale.set(item.baseScale.x * innerEase, item.baseScale.y * innerEase, item.baseScale.z * innerEase);
        this.dummy.updateMatrix();
        this.innerInstancedCubes.setMatrixAt(i, this.dummy.matrix);
      }
      this.innerInstancedCubes.instanceMatrix.needsUpdate = true;

      if (tau >= 1.0) {
        this.transitionState = 'idle';
      }
    } else if (this.transitionState === 'ambient_to_house') {
      this.transitionElapsed += dt;
      const tau = Math.min(1.0, this.transitionElapsed / this.transitionDuration);

      // Brightness rises from 0.15 up to 1.0
      const brightness = 0.15 + (1.0 - 0.15) * Math.min(1.0, tau / 0.85);
      if (this.cubeUniforms?.uSceneBrightness) {
        this.cubeUniforms.uSceneBrightness.value = brightness;
      }

      // Windows emissive lights up last (from tau = 0.82 to 1.0)
      const emFade = Math.max(0.0, Math.min(1.0, (tau - 0.82) / 0.18));
      if (this.cubeUniforms?.uEmissiveFade) {
        this.cubeUniforms.uEmissiveFade.value = emFade;
      }

      // Ground disk, contact shadow, smoke & ring fade in over tau in [0.65, 1.0]
      const groundFade = Math.max(0.0, Math.min(1.0, (tau - 0.65) / 0.35));
      if (this.groundDiskMaterial?.uniforms?.uFade) {
        this.groundDiskMaterial.uniforms.uFade.value = groundFade;
      }
      if (this.contactShadowUniforms?.uFade) {
        this.contactShadowUniforms.uFade.value = groundFade;
      }
      if (this.smokeUniforms?.uFade) {
        this.smokeUniforms.uFade.value = emFade;
      }
      if (this.reflectedGroup) {
        this.reflectedGroup.visible = (groundFade > 0.05);
      }
      if (this.windowSpotMaterial?.uniforms?.uFade) {
        this.windowSpotMaterial.uniforms.uFade.value = emFade;
      }
      if (this.ringMaterial) {
        this.ringMaterial.opacity = (0.21 + 0.21 * (0.5 + 0.5 * Math.sin(time * 1.8))) * groundFade;
      }

      const alphaAttr = this.instancedCubes.geometry.getAttribute('aAmbientAlpha') as THREE.InstancedBufferAttribute;
      const alphaArray = alphaAttr?.array as Float32Array;

      // Staged assembly by layer:
      for (let i = 0; i < this.cubesData.length; i++) {
        const item = this.cubesData[i];
        let tStart = 0.05;
        let tEnd = 0.45;

        switch (item.type) {
          case 'base':
            tStart = 0.05;
            tEnd = 0.45;
            break;
          case 'wall':
            tStart = 0.15 + item.heightNorm * 0.42;
            tEnd = tStart + 0.32;
            break;
          case 'trim':
          case 'door':
            tStart = 0.28 + item.heightNorm * 0.35;
            tEnd = tStart + 0.30;
            break;
          case 'window':
            tStart = 0.40 + item.heightNorm * 0.35;
            tEnd = tStart + 0.32;
            break;
          case 'chimney_rim':
            tStart = 0.70;
            tEnd = 0.98;
            break;
          case 'roof':
            tStart = 0.68 + (item.basePos.y > 4.5 ? 0.15 : 0.0);
            tEnd = Math.min(1.30, tStart + 0.35);
            break;
          default:
            tStart = 0.20;
            tEnd = 0.60;
            break;
        }

        const localT = Math.max(0.0, Math.min(1.0, (this.transitionElapsed - tStart) / (tEnd - tStart)));
        const ease = 1.0 - Math.pow(1.0 - localT, 3);

        if (item.isAmbient) {
          const dx = Math.sin(time * item.driftFreq!.x + item.driftPhase!.x) * item.driftAmp!.x;
          const dy = Math.cos(time * item.driftFreq!.y + item.driftPhase!.y) * item.driftAmp!.y;
          const dz = Math.sin(time * item.driftFreq!.z + item.driftPhase!.z) * item.driftAmp!.z;
          const curAmbientPos = new THREE.Vector3(
            item.ambientPos!.x + dx,
            item.ambientPos!.y + dy,
            item.ambientPos!.z + dz
          );

          const distFromCenter = Math.abs(curAmbientPos.x);
          const bandFactor = Math.max(0.0, Math.min(1.0, (distFromCenter - 3.5) / 2.2));
          const contentScaleMult = 0.60 + 0.40 * bandFactor;
          const contentAlphaMult = 0.25 + 0.75 * bandFactor;
          let nearFade = 1.0;
          if (curAmbientPos.z > -7.0) {
            nearFade = Math.max(0.0, Math.min(1.0, (-curAmbientPos.z - 1.5) / 5.5));
          }
          const startScale = item.ambientScale!.clone().multiplyScalar(contentScaleMult * nearFade);

          this.dummy.position.lerpVectors(curAmbientPos, item.basePos, ease);
          this.dummy.rotation.set(
            THREE.MathUtils.lerp(item.baseRot.x + item.rotSpeed.x * 2.0, item.baseRot.x, ease),
            THREE.MathUtils.lerp(item.baseRot.y + item.rotSpeed.y * 2.0, item.baseRot.y, ease),
            THREE.MathUtils.lerp(item.baseRot.z + item.rotSpeed.z * 2.0, item.baseRot.z, ease)
          );
          this.dummy.scale.lerpVectors(startScale, item.baseScale, ease);
          if (alphaArray) {
            alphaArray[i] = THREE.MathUtils.lerp((item.baseAlpha || 1.0) * contentAlphaMult * nearFade, 1.0, ease);
          }
        } else {
          const reverseOffset = item.dispersionDir.clone().multiplyScalar((1.0 - ease) * 1.8);
          this.dummy.position.copy(item.basePos).add(reverseOffset);
          this.dummy.rotation.set(
            THREE.MathUtils.lerp(item.baseRot.x + item.rotSpeed.x * 2.5, item.baseRot.x, ease),
            THREE.MathUtils.lerp(item.baseRot.y + item.rotSpeed.y * 2.5, item.baseRot.y, ease),
            THREE.MathUtils.lerp(item.baseRot.z + item.rotSpeed.z * 2.5, item.baseRot.z, ease)
          );
          this.dummy.scale.set(item.baseScale.x * ease, item.baseScale.y * ease, item.baseScale.z * ease);
          if (alphaArray) {
            alphaArray[i] = ease;
          }
        }

        this.dummy.updateMatrix();
        this.instancedCubes.setMatrixAt(i, this.dummy.matrix);
      }
      this.instancedCubes.instanceMatrix.needsUpdate = true;
      if (alphaAttr) alphaAttr.needsUpdate = true;

      // Inner frame fades in
      const innerEase = Math.max(0.0, Math.min(1.0, (this.transitionElapsed - 0.4) / 0.6));
      for (let i = 0; i < this.innerCubesData.length; i++) {
        const item = this.innerCubesData[i];
        this.dummy.position.copy(item.basePos);
        this.dummy.rotation.set(item.baseRot.x, item.baseRot.y, item.baseRot.z);
        this.dummy.scale.set(item.baseScale.x * innerEase, item.baseScale.y * innerEase, item.baseScale.z * innerEase);
        this.dummy.updateMatrix();
        this.innerInstancedCubes.setMatrixAt(i, this.dummy.matrix);
      }
      this.innerInstancedCubes.instanceMatrix.needsUpdate = true;

      if (tau >= 1.0) {
        this.transitionState = 'idle';
      }
    } else if (this.mode === 'ambient') {
      // Idle ambient mode:
      if (this.cubeUniforms?.uSceneBrightness) {
        this.cubeUniforms.uSceneBrightness.value = 0.15;
      }
      if (this.cubeUniforms?.uEmissiveFade) {
        this.cubeUniforms.uEmissiveFade.value = 0.0;
      }
      if (this.groundDiskMaterial?.uniforms?.uFade) {
        this.groundDiskMaterial.uniforms.uFade.value = 0.0;
      }
      if (this.contactShadowUniforms?.uFade) {
        this.contactShadowUniforms.uFade.value = 0.0;
      }
      if (this.smokeUniforms?.uFade) {
        this.smokeUniforms.uFade.value = 0.0;
      }
      if (this.reflectedGroup) {
        this.reflectedGroup.visible = false;
      }
      if (this.windowSpotMaterial?.uniforms?.uFade) {
        this.windowSpotMaterial.uniforms.uFade.value = 0.0;
      }
      if (this.ringMaterial) {
        this.ringMaterial.opacity = 0.0;
      }

      const alphaAttr = this.instancedCubes.geometry.getAttribute('aAmbientAlpha') as THREE.InstancedBufferAttribute;
      const alphaArray = alphaAttr?.array as Float32Array;

      // Drift ambient particles with content-band scaling and near-fade
      for (let i = 0; i < this.cubesData.length; i++) {
        const item = this.cubesData[i];
        if (item.isAmbient) {
          const driftX = Math.sin(time * item.driftFreq!.x + item.driftPhase!.x) * item.driftAmp!.x;
          const driftY = Math.cos(time * item.driftFreq!.y + item.driftPhase!.y) * item.driftAmp!.y;
          const driftZ = Math.sin(time * item.driftFreq!.z + item.driftPhase!.z) * item.driftAmp!.z;

          const curX = item.ambientPos!.x + driftX;
          const curY = item.ambientPos!.y + driftY;
          const curZ = item.ambientPos!.z + driftZ;

          // Requirement 2: Content band (central text container) attenuation
          const distFromCenter = Math.abs(curX);
          const bandFactor = Math.max(0.0, Math.min(1.0, (distFromCenter - 3.5) / 2.2));
          const contentScaleMult = 0.60 + 0.40 * bandFactor; // x0.6 in content band, x1.0 outside
          const contentAlphaMult = 0.25 + 0.75 * bandFactor; // x0.25 in content band, x1.0 outside

          // Requirement 2: Near-fade (particles closer than safe depth fade out completely)
          let nearFade = 1.0;
          if (curZ > -7.0) {
            nearFade = Math.max(0.0, Math.min(1.0, (-curZ - 1.5) / 5.5));
          }

          this.dummy.position.set(curX, curY, curZ);
          this.dummy.rotation.set(
            item.baseRot.x + time * item.rotSpeed.x * 0.2,
            item.baseRot.y + time * item.rotSpeed.y * 0.2,
            item.baseRot.z + time * item.rotSpeed.z * 0.2
          );

          if (nearFade <= 0.001) {
            this.dummy.scale.set(0, 0, 0);
          } else {
            this.dummy.scale.set(
              item.ambientScale!.x * contentScaleMult * nearFade,
              item.ambientScale!.y * contentScaleMult * nearFade,
              item.ambientScale!.z * contentScaleMult * nearFade
            );
          }

          if (alphaArray) {
            alphaArray[i] = (item.baseAlpha || 1.0) * contentAlphaMult * nearFade;
          }
        } else {
          this.dummy.scale.set(0, 0, 0);
          if (alphaArray) {
            alphaArray[i] = 0.0;
          }
        }
        this.dummy.updateMatrix();
        this.instancedCubes.setMatrixAt(i, this.dummy.matrix);
      }
      this.instancedCubes.instanceMatrix.needsUpdate = true;
      if (alphaAttr) alphaAttr.needsUpdate = true;
    } else {
      // Idle house mode:
      if (this.cubeUniforms?.uSceneBrightness) {
        this.cubeUniforms.uSceneBrightness.value = 1.0;
      }
      if (this.cubeUniforms?.uEmissiveFade) {
        this.cubeUniforms.uEmissiveFade.value = 1.0;
      }
      if (this.groundDiskMaterial?.uniforms?.uFade) {
        this.groundDiskMaterial.uniforms.uFade.value = 1.0;
      }
      if (this.contactShadowUniforms?.uFade) {
        this.contactShadowUniforms.uFade.value = 1.0;
      }
      if (this.smokeUniforms?.uFade) {
        this.smokeUniforms.uFade.value = 1.0;
      }
      if (this.reflectedGroup) {
        this.reflectedGroup.visible = true;
      }
      if (this.windowSpotMaterial?.uniforms?.uFade) {
        this.windowSpotMaterial.uniforms.uFade.value = 1.0;
      }
      if (this.ringMaterial) {
        this.ringMaterial.opacity = 0.21 + 0.21 * (0.5 + 0.5 * Math.sin(time * 1.8));
      }

      if (this.wasMatrixDirty) {
        this.wasMatrixDirty = false;
        this.resetCubesToIdle();
        const alphaAttr = this.instancedCubes.geometry.getAttribute('aAmbientAlpha') as THREE.InstancedBufferAttribute;
        if (alphaAttr && alphaAttr.array) {
          (alphaAttr.array as Float32Array).fill(1.0);
          alphaAttr.needsUpdate = true;
        }
      }

      // 2) Living windows: natural indoor presence and dimming across rooms
      if (this.windowEmissiveArray && this.windowEmissiveAttr && this.windowGroups.length > 0) {
        let needsAttrUpdate = false;
        for (const group of this.windowGroups) {
          let mult = 1.0;

          if (group.isOffWindow) {
            if (time >= group.nextOffTime && time < group.nextOffTime + group.offDuration) {
              const tOff = time - group.nextOffTime;
              const fadeIn = Math.min(1.0, tOff / 0.5);
              const fadeOut = Math.min(1.0, (group.offDuration - tOff) / 0.5);
              mult = 1.0 - Math.max(0.0, Math.min(fadeIn, fadeOut));
              needsAttrUpdate = true;
            } else if (time >= group.nextOffTime + group.offDuration) {
              group.nextOffTime = time + 10.0 + Math.random() * 14.0; // 10–24s
              group.offDuration = 3.0 + Math.random() * 3.0;          // 3–6s
            }
          }

          if (mult > 0.999) {
            if (time >= group.nextDimTime && time < group.nextDimTime + group.dimDuration) {
              const p = (time - group.nextDimTime) / group.dimDuration;
              const curve = Math.sin(p * Math.PI);
              mult = 1.0 - group.dimDepth * curve;
              needsAttrUpdate = true;
            } else if (time >= group.nextDimTime + group.dimDuration) {
              group.nextDimTime = time + 3.0 + Math.random() * 6.5; // 3–9.5s lively pace
              group.dimDuration = 0.7 + Math.random() * 1.0;        // 0.7–1.7s
              group.dimDepth = 0.25 + Math.random() * 0.25;         // 25–50%
            }
          }

          for (let j = 0; j < group.paneIndices.length; j++) {
            const pIdx = group.paneIndices[j];
            const targetVal = group.baseEmissives[j] * mult;
            if (Math.abs(this.windowEmissiveArray[pIdx] - targetVal) > 0.001) {
              this.windowEmissiveArray[pIdx] = targetVal;
              needsAttrUpdate = true;
            }
          }
        }
        if (needsAttrUpdate) {
          this.windowEmissiveAttr.needsUpdate = true;
        }
      }

      // Idle micro-breathing pulse
      const breathe = Math.sin(time * 1.8) * 0.015;
      this.stage.scale.set(1.0 + breathe, 1.0 + breathe, 1.0 + breathe);
    }
  }

  private resetCubesToIdle(): void {
    if (!this.instancedCubes || !this.innerInstancedCubes) return;

    for (let i = 0; i < this.cubesData.length; i++) {
      const item = this.cubesData[i];
      this.dummy.position.copy(item.basePos);
      this.dummy.rotation.set(item.baseRot.x, item.baseRot.y, item.baseRot.z);
      this.dummy.scale.copy(item.baseScale);
      this.dummy.updateMatrix();
      this.instancedCubes.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedCubes.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.innerCubesData.length; i++) {
      const item = this.innerCubesData[i];
      this.dummy.position.copy(item.basePos);
      this.dummy.rotation.set(item.baseRot.x, item.baseRot.y, item.baseRot.z);
      this.dummy.scale.copy(item.baseScale);
      this.dummy.updateMatrix();
      this.innerInstancedCubes.setMatrixAt(i, this.dummy.matrix);
    }
    this.innerInstancedCubes.instanceMatrix.needsUpdate = true;
  }

  private setupInteractivity(): void {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = this.container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      this.targetMouse.x = (clientX / rect.width) * 2 - 1;
      this.targetMouse.y = -(clientY / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
  }

  /**
   * Exact binary search fitting algorithm:
   * Projects 8 corners of house bounding box (walls, roof, chimney) across 16 sample angles.
   * Runs 20 binary search iterations in range [1.0 * R, 15.0 * R].
   * Finds the exact distance where the house projection fits into 0.88 * rectW and 0.88 * rectH,
   * guaranteeing at least 6% margin inside #house-anchor at all angles of rotation.
   */
  public binarySearchFittingDist(
    W: number,
    H: number,
    rectW: number,
    rectH: number,
    left: number,
    top: number
  ): number {
    const cx = left + rectW / 2;
    const cy = top + rectH / 2;

    const tempCam = this.camera.clone();
    tempCam.fov = this.cameraFov;
    tempCam.updateProjectionMatrix();

    const elev = THREE.MathUtils.degToRad(this.cameraElevation);
    const viewAngle = THREE.MathUtils.degToRad(this.cameraAzimuth);
    const targetY = this.houseBoxCenter.y + this.cameraLookAtY;

    const testAngles: number[] = [];
    for (let i = 0; i < 16; i++) {
      testAngles.push((i * Math.PI * 2) / 16);
    }

    const R = Math.max(1, this.houseRadius);
    let low = 1.0 * R;
    let high = 15.0 * R;

    for (let iter = 0; iter < 20; iter++) {
      const mid = (low + high) / 2;
      const dXZ = mid * Math.cos(elev);
      tempCam.position.set(
        dXZ * Math.sin(viewAngle),
        targetY + dXZ * Math.tan(elev),
        dXZ * Math.cos(viewAngle)
      );
      tempCam.up.set(0, 1, 0);
      tempCam.lookAt(0, targetY, 0);
      tempCam.setViewOffset(W, H, -(cx - W / 2), -(cy - H / 2), W, H);
      tempCam.updateMatrixWorld(true);
      tempCam.updateProjectionMatrix();

      let fits = true;
      for (const ang of testAngles) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);

        for (const c of this.houseCorners) {
          const rx = c.x * cosA - c.z * sinA;
          const rz = c.x * sinA + c.z * cosA;
          const v = new THREE.Vector3(rx, c.y, rz).project(tempCam);
          const px = (v.x * 0.5 + 0.5) * W;
          const py = (-v.y * 0.5 + 0.5) * H;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }

        // Requirements:
        // 1) Fit within 0.88 * rectW and 0.88 * rectH
        // 2) Offset on all sides >= 6% (using 7% target to guarantee >= 6% even with mouse parallax)
        const pw = maxX - minX;
        const ph = maxY - minY;
        const marginW = 0.07 * rectW;
        const marginH = 0.07 * rectH;
        if (
          pw > 0.86 * rectW ||
          ph > 0.86 * rectH ||
          minX < left + marginW ||
          maxX > left + rectW - marginW ||
          minY < top + marginH ||
          maxY > top + rectH - marginH
        ) {
          fits = false;
          break;
        }
      }

      if (fits) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return high;
  }

  public recomputeFittingDist(): void {
    if (!this.anchorElement && typeof document !== 'undefined') {
      this.anchorElement = document.getElementById('house-anchor');
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (!this.anchorElement || W <= 0 || H <= 0) return;

    const rect = this.anchorElement.getBoundingClientRect();
    const rectW = Math.max(1, rect.width);
    const rectH = Math.max(1, rect.height);

    this.fittingDist = this.binarySearchFittingDist(W, H, rectW, rectH, rect.left, rect.top);
    this.currentDist = this.fittingDist;
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = 0.325 / Math.max(1, this.currentDist);
    }
  }

  private async setupTunePanel(): Promise<void> {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    try {
      const { GUI } = await import('lil-gui');
      const gui = new GUI({ title: '3D Scene & House Tune (?tune=1)' });
      this.gui = gui;
      gui.domElement.style.position = 'fixed';
      gui.domElement.style.top = '16px';
      gui.domElement.style.right = '16px';
      gui.domElement.style.zIndex = '99999';

      const initialHouse = this.houseConfig || getThemeHouseConfig(this.currentThemeId);
      const params = {
        elevation: this.cameraElevation,
        azimuth: this.cameraAzimuth,
        fov: this.cameraFov,
        lookAtY: this.cameraLookAtY,
        wallGain: this.cubeUniforms?.uWallGain?.value ?? initialHouse.wallGain,
        roofGain: this.cubeUniforms?.uRoofGain?.value ?? initialHouse.roofGain,
        mortarDarkness: this.cubeUniforms?.uMortarDarkness?.value ?? initialHouse.mortarDarkness,
        uMortarWidth: this.cubeUniforms?.uMortarWidth?.value ?? initialHouse.mortarWidth,
        maxLuma: this.cubeUniforms?.uMaxLuma?.value ?? initialHouse.maxLuma,
        copyJSON: () => {
          const config = {
            camera: {
              fov: Math.round(params.fov),
              elevation: Math.round(params.elevation * 10) / 10,
              azimuth: Math.round(params.azimuth * 10) / 10,
              lookAtY: Math.round(params.lookAtY * 100) / 100
            },
            house: {
              wallGain: Math.round(params.wallGain * 100) / 100,
              roofGain: Math.round(params.roofGain * 100) / 100,
              mortarDarkness: Math.round(params.mortarDarkness * 100) / 100,
              mortarWidth: Math.round(params.uMortarWidth * 1000) / 1000,
              maxLuma: Math.round(params.maxLuma * 100) / 100
            }
          };
          const jsonStr = JSON.stringify(config, null, 2);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(jsonStr).then(() => {
              btnCtrl.name('✔ Copied!');
              setTimeout(() => btnCtrl.name('Copy JSON'), 1800);
            }).catch(() => {
              prompt('Copy tuning config JSON:', jsonStr);
            });
          } else {
            prompt('Copy tuning config JSON:', jsonStr);
          }
        }
      };

      const onChangeCam = () => {
        this.cameraElevation = params.elevation;
        this.cameraAzimuth = params.azimuth;
        this.cameraFov = params.fov;
        this.cameraLookAtY = params.lookAtY;
        this.camera.fov = this.cameraFov;
        this.camera.updateProjectionMatrix();
        this.recomputeFittingDist();
      };

      const camFolder = gui.addFolder('Camera');
      camFolder.add(params, 'elevation', 5, 50, 1).name('elevation (5–50°)').onChange(onChangeCam);
      camFolder.add(params, 'azimuth', -60, 60, 1).name('azimuth (−60…60°)').onChange(onChangeCam);
      camFolder.add(params, 'fov', 20, 45, 1).name('fov (20–45)').onChange(onChangeCam);
      camFolder.add(params, 'lookAtY', -1, 1, 0.05).name('lookAtY (−1…1)').onChange(onChangeCam);
      camFolder.open();

      const houseFolder = gui.addFolder('House Shader Tuning');
      houseFolder.add(params, 'wallGain', 0.05, 1.5, 0.01).name('wallGain').onChange((v: number) => {
        if (this.cubeUniforms?.uWallGain) this.cubeUniforms.uWallGain.value = v;
      });
      houseFolder.add(params, 'roofGain', 0.05, 1.5, 0.01).name('roofGain').onChange((v: number) => {
        if (this.cubeUniforms?.uRoofGain) this.cubeUniforms.uRoofGain.value = v;
      });
      houseFolder.add(params, 'mortarDarkness', 0.05, 1.0, 0.01).name('mortarDarkness').onChange((v: number) => {
        if (this.cubeUniforms?.uMortarDarkness) this.cubeUniforms.uMortarDarkness.value = v;
      });
      houseFolder.add(params, 'uMortarWidth', 0.005, 0.08, 0.001).name('uMortarWidth').onChange((v: number) => {
        if (this.cubeUniforms?.uMortarWidth) this.cubeUniforms.uMortarWidth.value = v;
      });
      houseFolder.add(params, 'maxLuma', 0.20, 1.0, 0.01).name('maxLuma').onChange((v: number) => {
        if (this.cubeUniforms?.uMaxLuma) this.cubeUniforms.uMaxLuma.value = v;
      });
      houseFolder.open();

      const btnCtrl = gui.add(params, 'copyJSON').name('Copy JSON');
    } catch (err) {
      console.warn('[HouseOrb] Failed to load lil-gui for ?tune=1:', err);
    }
  }

  private setupDebugOverlay(): void {
    if (!import.meta.env.DEV || typeof document === 'undefined') return;

    this.debugAnchorBox = document.createElement('div');
    this.debugAnchorBox.id = 'debug-anchor-box';
    this.debugAnchorBox.style.cssText = `
      position: fixed;
      border: 2px solid #ef4444;
      background: rgba(239, 68, 68, 0.06);
      box-sizing: border-box;
      pointer-events: none;
      z-index: 99998;
      transition: none;
    `;
    const anchorBadge = document.createElement('div');
    anchorBadge.innerText = '🔴 #house-anchor';
    anchorBadge.style.cssText = `
      position: absolute;
      top: 4px;
      left: 6px;
      font-family: monospace;
      font-size: 11px;
      color: #ef4444;
      font-weight: bold;
      background: rgba(0, 0, 0, 0.75);
      padding: 2px 6px;
      border-radius: 4px;
    `;
    this.debugAnchorBox.appendChild(anchorBadge);
    document.body.appendChild(this.debugAnchorBox);

    this.debugHouseBox = document.createElement('div');
    this.debugHouseBox.id = 'debug-house-box';
    this.debugHouseBox.style.cssText = `
      position: fixed;
      border: 2px solid #22c55e;
      background: rgba(34, 197, 94, 0.08);
      box-sizing: border-box;
      pointer-events: none;
      z-index: 99999;
      transition: none;
    `;
    const houseBadge = document.createElement('div');
    houseBadge.innerText = '🟢 House Projection';
    houseBadge.style.cssText = `
      position: absolute;
      top: 4px;
      right: 6px;
      font-family: monospace;
      font-size: 11px;
      color: #22c55e;
      font-weight: bold;
      background: rgba(0, 0, 0, 0.75);
      padding: 2px 6px;
      border-radius: 4px;
    `;
    this.debugHouseBox.appendChild(houseBadge);
    document.body.appendChild(this.debugHouseBox);

    this.debugInfoPanel = document.createElement('div');
    this.debugInfoPanel.id = 'debug-info-panel';
    this.debugInfoPanel.style.cssText = `
      position: fixed;
      top: 12px;
      left: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      color: #00ffcc;
      background: rgba(5, 10, 20, 0.90);
      border: 1px solid rgba(0, 255, 204, 0.4);
      padding: 10px 14px;
      border-radius: 8px;
      backdrop-filter: blur(8px);
      z-index: 100000;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    `;
    document.body.appendChild(this.debugInfoPanel);
  }

  private updateDebugOverlay(
    rect: DOMRect,
    houseProj: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } | null,
    W: number,
    H: number,
    cx: number,
    cy: number,
    scrollY: number,
    offsetX: number,
    offsetY: number,
    dist: number,
    isOffscreen: boolean
  ): void {
    if (!import.meta.env.DEV || !this.debugAnchorBox || !this.debugHouseBox || !this.debugInfoPanel) return;

    if (isOffscreen || !houseProj) {
      this.debugAnchorBox.style.display = 'none';
      this.debugHouseBox.style.display = 'none';
      this.debugInfoPanel.innerHTML = `
        <div style="color: #ef4444; font-weight: bold;">[#house-anchor OFF-SCREEN]</div>
        <div>W×H: ${W}×${H}</div>
        <div>scrollY: ${Math.round(scrollY)}px</div>
      `;
      return;
    }

    this.debugAnchorBox.style.display = 'block';
    this.debugAnchorBox.style.left = `${rect.left}px`;
    this.debugAnchorBox.style.top = `${rect.top}px`;
    this.debugAnchorBox.style.width = `${rect.width}px`;
    this.debugAnchorBox.style.height = `${rect.height}px`;

    this.debugHouseBox.style.display = 'block';
    this.debugHouseBox.style.left = `${houseProj.minX}px`;
    this.debugHouseBox.style.top = `${houseProj.minY}px`;
    this.debugHouseBox.style.width = `${houseProj.width}px`;
    this.debugHouseBox.style.height = `${houseProj.height}px`;

    const leftMargin = ((houseProj.minX - rect.left) / rect.width) * 100;
    const rightMargin = ((rect.right - houseProj.maxX) / rect.width) * 100;
    const topMargin = ((houseProj.minY - rect.top) / rect.height) * 100;
    const bottomMargin = ((rect.bottom - houseProj.maxY) / rect.height) * 100;
    const minMargin = Math.min(leftMargin, rightMargin, topMargin, bottomMargin);

    this.debugInfoPanel.innerHTML = `
      <div style="font-weight: bold; color: #fff; margin-bottom: 4px;">🔧 HouseOrb Debug (?debug=1)</div>
      <div>Click-to-anim: <b style="color: ${this.clickToAnimTimeMs <= 100 ? '#22c55e' : '#ef4444'};">${this.clickToAnimTimeMs.toFixed(1)}ms</b> (target &le; 100ms)</div>
      <div>Mode: <b style="color: #fff;">${this.mode} (${this.transitionState})</b> | click: ${this.lastClickTimestamp > 0 ? (performance.now() - this.lastClickTimestamp).toFixed(0) + 'ms ago' : 'none'}</div>
      <div>W×H: <b style="color: #fff;">${W}×${H}</b></div>
      <div>rectW×rectH: <b style="color: #fff;">${rect.width.toFixed(1)}×${rect.height.toFixed(1)}</b></div>
      <div>cx, cy: <b style="color: #fff;">${cx.toFixed(1)}, ${cy.toFixed(1)}</b></div>
      <div>offsetX/offsetY: <b style="color: #fff;">${offsetX.toFixed(1)} / ${offsetY.toFixed(1)}</b></div>
      <div>dist: <b style="color: #fff;">${dist.toFixed(2)}</b></div>
      <div>scrollY: <b style="color: #fff;">${Math.round(scrollY)}px</b></div>
      <div>turntable: <b style="color: #fff;">${(this.turntableAngle % (Math.PI * 2)).toFixed(2)} rad</b></div>
      <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.2);">
        min margin: <b style="color: ${minMargin >= 6.0 ? '#22c55e' : '#ef4444'};">${minMargin.toFixed(1)}%</b>
        <span style="font-size: 11px; opacity: 0.8;">(L:${leftMargin.toFixed(0)}% R:${rightMargin.toFixed(0)}% T:${topMargin.toFixed(0)}% B:${bottomMargin.toFixed(0)}%)</span>
      </div>
    `;
  }

  private updateAnchorProjection(_time: number, dt: number): void {
    // Continuously accumulate turntable angle - NEVER resets to 0 across page transitions!
    this.turntableAngle += 0.14 * dt;

    if (!this.anchorElement && typeof document !== 'undefined') {
      this.anchorElement = document.getElementById('house-anchor');
    }

    const W = window.innerWidth;
    const H = window.innerHeight;
    const isTouchOrReduced = this.isTouchDevice || this.prefersReducedMotion;
    const pmX = isTouchOrReduced ? 0.0 : this.mouse.x;
    const pmY = isTouchOrReduced ? 0.0 : this.mouse.y;

    if (this.mode === 'house' || this.transitionState === 'ambient_to_house') {
      if (this.anchorElement && W > 0 && H > 0) {
        const rect = this.anchorElement.getBoundingClientRect();
        const rectW = Math.max(1, rect.width);
        const rectH = Math.max(1, rect.height);
        const cx = rect.left + rectW / 2;
        const cy = rect.top + rectH / 2;

        const isOffscreen = rect.bottom <= 0 || rect.top >= H || rect.right <= 0 || rect.left >= W;
        if (isOffscreen) {
          this.stage.visible = false;
          if (this.isDebug) {
            this.updateDebugOverlay(rect, null, W, H, cx, cy, window.scrollY, 0, 0, this.fittingDist, true);
          }
          return;
        }

        this.stage.visible = true;

        const offsetX = -(cx - W / 2);
        const offsetY = -(cy - H / 2);

        if (this.transitionState === 'ambient_to_house') {
          const tau = Math.min(1.0, this.transitionElapsed / this.transitionDuration);
          const ease = 1.0 - Math.pow(1.0 - tau, 3);
          this.camera.setViewOffset(W, H, offsetX * ease, offsetY * ease, W, H);
        } else {
          this.camera.setViewOffset(W, H, offsetX, offsetY, W, H);
        }

        const dist = this.fittingDist;
        this.currentDist = dist;

        const elevationAngle = THREE.MathUtils.degToRad(this.cameraElevation);
        const dXZ = dist * Math.cos(elevationAngle);
        const viewAngle = THREE.MathUtils.degToRad(this.cameraAzimuth);
        const targetY = this.houseBoxCenter.y + this.cameraLookAtY;

        const camX = dXZ * Math.sin(viewAngle) + pmX * 0.35;
        const camZ = dXZ * Math.cos(viewAngle);
        const camY = (targetY + dXZ * Math.tan(elevationAngle)) + pmY * 0.25;

        this.camera.fov = this.cameraFov;
        this.camera.position.set(camX, camY, camZ);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(0, targetY, 0);
        this.camera.updateProjectionMatrix();

        this.stage.rotation.y = this.turntableAngle + pmX * 0.35;
        this.stage.rotation.x = 0;
        this.stage.rotation.z = 0;
        this.stage.position.set(0, 0, 0);
        this.stage.updateMatrixWorld(true);

        if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.density = 0.325 / Math.max(1, this.currentDist);
        }

        if (this.isDebug) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          const tempV = new THREE.Vector3();
          for (const corner of this.houseCorners) {
            tempV.copy(corner).applyMatrix4(this.stage.matrixWorld).project(this.camera);
            const px = (tempV.x * 0.5 + 0.5) * W;
            const py = (-tempV.y * 0.5 + 0.5) * H;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
          const houseProj = { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
          this.updateDebugOverlay(rect, houseProj, W, H, cx, cy, window.scrollY, offsetX, offsetY, dist, false);
        }
      }
    } else {
      // Ambient mode (or house_to_ambient)
      this.stage.visible = true;
      if (this.transitionState === 'house_to_ambient') {
        const tau = Math.min(1.0, this.transitionElapsed / this.transitionDuration);
        const ease = Math.pow(tau, 2);
        if (this.anchorElement) {
          const rect = this.anchorElement.getBoundingClientRect();
          const cx = rect.left + Math.max(1, rect.width) / 2;
          const cy = rect.top + Math.max(1, rect.height) / 2;
          const offsetX = -(cx - W / 2) * (1.0 - ease);
          const offsetY = -(cy - H / 2) * (1.0 - ease);
          this.camera.setViewOffset(W, H, offsetX, offsetY, W, H);
        } else {
          this.camera.clearViewOffset();
        }
      } else {
        this.camera.clearViewOffset();
      }

      this.camera.fov = 32;
      this.camera.position.set(pmX * 0.5, 3.0 + pmY * 0.3, 24);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 2, 0);
      this.camera.updateProjectionMatrix();

      this.stage.rotation.y = this.turntableAngle;
      this.stage.rotation.x = 0;
      this.stage.rotation.z = 0;
      this.stage.position.set(0, 0, 0);
      this.stage.updateMatrixWorld(true);

      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = 0.015;
      }
    }
  }

  private handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width > 0 && height > 0) {
      const isNarrow = width < 900;
      const dpr = this.mode === 'ambient' ? 1.0 : Math.min(window.devicePixelRatio || 1, 2.0);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.recomputeFittingDist();

      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(width, height);

      this.composer.setPixelRatio(dpr);
      this.composer.setSize(width, height);
      const bloomW = isNarrow ? Math.floor(width / 2) : width;
      const bloomH = isNarrow ? Math.floor(height / 2) : height;
      this.bloomPass.resolution.set(bloomW, bloomH);
    }
  };

  private setupResizeObserver(): void {
    window.addEventListener('resize', this.handleResize, { passive: true });
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    if (this.anchorElement) {
      this.anchorResizeObserver = new ResizeObserver(() => {
        this.recomputeFittingDist();
      });
      this.anchorResizeObserver.observe(this.anchorElement);
    }
  }

  private setupVisibilityObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          this.isPaused = !entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );
    this.intersectionObserver.observe(this.container);

    document.addEventListener('visibilitychange', () => {
      this.isPaused = document.hidden;
    });
  }

  private animate = (): void => {
    if (this.isDestroyed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);
    if (this.isPaused || document.hidden) return;

    const now = performance.now();

    // Mode-specific frame rate & device optimization
    if (this.mode === 'ambient' && this.transitionState === 'idle') {
      // Weak device or reduced motion: pause 3D loop and hide canvas (CSS background handles glow)
      if (this.isWeakDevice || this.prefersReducedMotion) {
        if (this.renderer.domElement.style.display !== 'none') {
          this.renderer.domElement.style.display = 'none';
        }
        return;
      }
      // Cap ambient mode to <= 30 fps (at least 32.5ms between frames)
      if (now - this.lastAmbientRenderTime < 32.5) {
        return;
      }
      this.lastAmbientRenderTime = now;

      // Clamp DPR to 1.0 in ambient mode
      if (this.renderer.getPixelRatio() !== 1.0) {
        this.renderer.setPixelRatio(1.0);
        this.composer.setPixelRatio(1.0);
      }
    } else {
      if (this.renderer.domElement.style.display === 'none') {
        this.renderer.domElement.style.display = 'block';
      }
      const maxDpr = Math.min(window.devicePixelRatio || 1, 2.0);
      if (this.renderer.getPixelRatio() !== maxDpr) {
        this.renderer.setPixelRatio(maxDpr);
        this.composer.setPixelRatio(maxDpr);
      }
    }

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
    }
    const rawDt = (now - this.lastFrameTime) * 0.001;
    this.lastFrameTime = now;

    // Strict clamp dt <= 1/20 s (0.05s) to prevent compilation/GC freezes from eating animations
    const dt = Math.min(Math.max(0, rawDt), 1.0 / 20.0);
    this.timelineTime += dt;
    const time = this.timelineTime;

    // Smooth mouse lerp
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // Smooth 0.4s theme transition
    this.updateColorTransition();

    // Update camera anchor projection every frame:
    // reads anchor getBoundingClientRect(), sets camera.setViewOffset and dist, camera looks at center, camera.up=(0,1,0), stage rotates around Y only (no roll/cren)
    this.updateAnchorProjection(time, dt);

    const isTouchOrReduced = this.isTouchDevice || this.prefersReducedMotion;
    const pmX = isTouchOrReduced ? 0.0 : this.mouse.x;
    const pmY = isTouchOrReduced ? 0.0 : this.mouse.y;

    // Layer group shifts with specified coefficients:
    // 0.2 distant stars, 0.6 mid dust/sparks, 2.0 bokeh
    this.starsGroup.position.set(-pmX * 0.2 * 1.5, -pmY * 0.2 * 1.2, 0);
    this.midGroup.position.set(-pmX * 0.6 * 1.5, -pmY * 0.6 * 1.2, 0);
    this.bokehGroup.position.set(-pmX * 2.0 * 1.5, -pmY * 2.0 * 1.2, 0);

    // Update particle shader times
    if (this.starsUniforms) this.starsUniforms.uTime.value = time;
    if (this.dustUniforms) this.dustUniforms.uTime.value = time;
    if (this.sparksUniforms) this.sparksUniforms.uTime.value = time;

    // Slow drifting bokeh
    for (let i = 0; i < this.bokehMeshes.length; i++) {
      const mesh = this.bokehMeshes[i];
      const ud = mesh.userData;
      mesh.position.x = ud.baseX + Math.sin(time * ud.freqX + ud.phaseX) * ud.ampX;
      mesh.position.y = ud.baseY + Math.cos(time * ud.freqY + ud.phaseY) * ud.ampY;
    }

    // Bricks animation & assembly physics driven by clamped dt
    this.updateCubesAnimation(time, dt);

    // Render with post-processing (UnrealBloomPass)
    this.composer.render();

    if (!this.hasRenderedFirstFrame) {
      this.hasRenderedFirstFrame = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('house-scene-ready'));
      }
    }
  };

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.gui) {
      this.gui.destroy();
      this.gui = undefined;
    }

    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.anchorResizeObserver) this.anchorResizeObserver.disconnect();
    if (this.intersectionObserver) this.intersectionObserver.disconnect();

    if (this.debugAnchorBox && this.debugAnchorBox.parentNode) {
      this.debugAnchorBox.parentNode.removeChild(this.debugAnchorBox);
    }
    if (this.debugHouseBox && this.debugHouseBox.parentNode) {
      this.debugHouseBox.parentNode.removeChild(this.debugHouseBox);
    }
    if (this.debugInfoPanel && this.debugInfoPanel.parentNode) {
      this.debugInfoPanel.parentNode.removeChild(this.debugInfoPanel);
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Points) {
        if (obj.geometry) obj.geometry.dispose();
      }
    });

    if (this.starsMesh) {
      this.starsMesh.geometry.dispose();
      (this.starsMesh.material as THREE.Material).dispose();
    }
    if (this.dustMesh) {
      this.dustMesh.geometry.dispose();
      (this.dustMesh.material as THREE.Material).dispose();
    }
    if (this.sparksMesh) {
      this.sparksMesh.geometry.dispose();
      (this.sparksMesh.material as THREE.Material).dispose();
    }
    for (const bm of this.bokehMeshes) {
      bm.geometry.dispose();
      (bm.material as THREE.Material).dispose();
    }
    this.bokehMeshes = [];
    if (this.softCircleTexture) this.softCircleTexture.dispose();
    if (this.bokehTexture) this.bokehTexture.dispose();
    if (this.cubeMaterial) this.cubeMaterial.dispose();
    if (this.innerMaterial) this.innerMaterial.dispose();
    if (this.ringMaterial) this.ringMaterial.dispose();
    if (this.groundDiskMaterial) this.groundDiskMaterial.dispose();
    if (this.windowSpotMaterial) this.windowSpotMaterial.dispose();
    if (this.particlesMaterial) this.particlesMaterial.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

// Global Singleton Scene Instance & API
let globalSceneInstance: HouseOrb | null = null;

export function initGlobalScene(): HouseOrb | null {
  if (typeof window === 'undefined') return null;
  if (globalSceneInstance && !globalSceneInstance.isDestroyed) {
    return globalSceneInstance;
  }
  const container = document.getElementById('scene-root');
  if (!container) return null;

  globalSceneInstance = new HouseOrb({ container });
  (window as any).__houseOrb = globalSceneInstance;
  return globalSceneInstance;
}

export function getHouseOrb(): HouseOrb | null {
  return globalSceneInstance;
}

export function onPageLoadNav(pathname: string): void {
  if (globalSceneInstance) {
    globalSceneInstance.handlePageNav(pathname);
  }
}

export function startSceneTransition(targetMode: 'house' | 'ambient', clickTime: number): void {
  if (globalSceneInstance) {
    globalSceneInstance.startTransitionTo(targetMode, clickTime);
  }
}
