"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import katex from "katex";
import { 
  Sun, 
  Moon, 
  Eye, 
  EyeOff, 
  Maximize, 
  Minimize, 
  Layers, 
  Table, 
  Info, 
  FileDown, 
  Printer, 
  RefreshCw, 
  Search,
  BookOpen,
  HelpCircle,
  Sliders,
  Settings,
  X,
  Plus,
  Minus
} from "lucide-react";

// Standard baseline presets for size 10 (Highlighted Base)
const BASE_PRESETS = {
  busto: 92,
  cintura: 68,
  cadera: 96,
  espalda: 35,
  pecho: 33,
  talle_frente: 44.5,
  talle_atras: 42.5,
  centro_frente: 37,
  centro_atras: 40.5,
  costado: 19.25,
  hombro: 12,
  largo_camisa: 75,
  ancho_escote: 7.2 // Neck width
};

const SIZE_INDEX: Record<string, number> = { "6": -2, "8": -1, "10": 0, "12": 1, "14": 2, "16": 3, "18": 4 };

// Industrial grading delta charts relative to Base 10
const GRADING_DELTAS: Record<string, number[]> = {
  busto:         [-8,  -4,  0,  4,  8,   14,  20],
  cintura:       [-8,  -4,  0,  4,  8,   14,  20],
  cadera:        [-8,  -4,  0,  4,  8,   14,  20],
  espalda:       [-2,  -1,  0,  1,  2,   3.5, 5],
  pecho:         [-2,  -1,  0,  1,  2,   3.5, 5],
  talle_frente:  [-1,  -0.5,0,  0.5,1,   1.75,2.5],
  talle_atras:   [-1,  -0.5,0,  0.5,1,   1.75,2.5],
  centro_frente: [-0.5,-0.25,0, 0.25,0.5,0.75,1.25],
  centro_atras:  [-1,  -0.5,0,  0.5,1,   1.75,2.5],
  costado:       [-0.5,-0.25,0, 0.25,0.5,1.0, 1.25],
  hombro:        [-0.5,-0.25,0, 0.25,0.5,0.75,1.25],
  largo_camisa:  [-3,  -1.5,0,  1.5,3,   4.5, 6],
  ancho_escote:  [-0.5,-0.25,0, 0.25,0.5,0.75,1.0]
};

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  busto: 'Contorno de Busto',
  cintura: 'Contorno de Cintura',
  cadera: 'Contorno de Cadera',
  espalda: 'Ancho de Espalda',
  pecho: 'Ancho de Pecho',
  talle_frente: 'Talle Frente',
  talle_atras: 'Talle Atrás',
  centro_frente: 'Centro Frente',
  centro_atras: 'Centro Atrás',
  costado: 'Costado',
  hombro: 'Largo Hombro',
  largo_camisa: 'Largo Camisa',
  ancho_escote: 'Ancho Escote (L)'
};

const DRAFTING_FORMULAS: Record<string, string> = {
  busto: '1/4 Busto',
  cintura: '1/4 Cintura',
  cadera: '1/4 Cadera',
  espalda: '1/2 Espalda',
  pecho: '1/2 Pecho',
  talle_frente: 'Talle Frente H',
  talle_atras: 'Talle Atrás H',
  centro_frente: 'C.F. (Collar Depth)',
  centro_atras: 'C.A. (Collar Depth)',
  costado: 'Costado (Armhole height)',
  hombro: 'Largo Hombro exacto K',
  largo_camisa: 'Largo Total O',
  ancho_escote: 'Escote L'
};

const CM_TO_PX = 10;

// Math Equations Database for KaTeX Rendering
interface EquationItem {
  id: string;
  title: string;
  formula: string;
  desc: string;
  siglas: { sigla: string; significado: string }[];
}

// Math Equations Database for KaTeX Rendering (Centimeters & Acronyms with glossary)
const EQUATIONS_DATABASE: EquationItem[] = [
  { 
    id: "L", 
    title: "Ancho de Escote (L)", 
    formula: "L = \\text{AE}", 
    desc: "Determina el ancho horizontal inicial del cuello.",
    siglas: [
      { sigla: "AE", significado: "Ancho de Escote (cm)" }
    ]
  },
  { 
    id: "M", 
    title: "Profundidad de Escote Delantero (M)", 
    formula: "M = \\text{TF} - \\text{CF}", 
    desc: "Calcula la profundidad de la caja del cuello en el delantero.",
    siglas: [
      { sigla: "TF", significado: "Talle Frente (cm)" },
      { sigla: "CF", significado: "Centro Frente (cm)" }
    ]
  },
  { 
    id: "N", 
    title: "Profundidad de Escote Trasero (N)", 
    formula: "N = \\text{TA} - \\text{CA}", 
    desc: "Calcula la profundidad del escote en la espalda.",
    siglas: [
      { sigla: "TA", significado: "Talle Atrás (cm)" },
      { sigla: "CA", significado: "Centro Atrás (cm)" }
    ]
  },
  { 
    id: "Y_chest", 
    title: "Línea de Sisa / Pecho (Y_pecho)", 
    formula: "Y_{\\text{pecho}} = -(\\text{TA} - \\text{CO})", 
    desc: "Define la altura horizontal base de la sisa y pecho en el molde.",
    siglas: [
      { sigla: "TA", significado: "Talle Atrás (cm)" },
      { sigla: "CO", significado: "Costado (cm)" }
    ]
  },
  { 
    id: "Y_waist_back", 
    title: "Altura Cintura Trasera (Y_cintura_espalda)", 
    formula: "Y_{\\text{cintura\\_esp}} = -\\text{TA}", 
    desc: "Nivel vertical de la cintura en la espalda.",
    siglas: [
      { sigla: "TA", significado: "Talle Atrás (cm)" }
    ]
  },
  { 
    id: "Y_waist_front", 
    title: "Altura Cintura Delantera (Y_cintura_delantero)", 
    formula: "Y_{\\text{cintura\\_del}} = -\\text{TF}", 
    desc: "Nivel vertical de la cintura en el delantero.",
    siglas: [
      { sigla: "TF", significado: "Talle Frente (cm)" }
    ]
  },
  { 
    id: "waist_to_hem", 
    title: "Faldón / Ruedo Total (W_hem)", 
    formula: "W_{\\text{hem}} = \\text{LC} - 42.5", 
    desc: "Largo de la camisa por debajo de la cintura base (referencia 42.5cm).",
    siglas: [
      { sigla: "LC", significado: "Largo Camisa (cm)" },
      { sigla: "42.5", significado: "Altura cintura base constante (cm)" }
    ]
  },
  { 
    id: "X_7_front", 
    title: "Hombro Caído Delantero (X_7_front)", 
    formula: "X_{7\\text{, front}} = L + \\sqrt{\\text{HO}^2 - \\text{CH}_{\\text{front}}^2}", 
    desc: "Punto de hombro delantero usando teorema de Pitágoras para conservar la longitud exacta.",
    siglas: [
      { sigla: "L", significado: "Ancho de Escote (cm)" },
      { sigla: "HO", significado: "Largo Hombro (cm)" },
      { sigla: "CH_{front}", significado: "Caída Hombro Delantero (cm)" }
    ]
  },
  { 
    id: "X_7_back", 
    title: "Hombro Caído Trasero (X_7_back)", 
    formula: "X_{7\\text{, back}} = L + \\sqrt{\\text{HO}^2 - \\text{CH}_{\\text{back}}^2}", 
    desc: "Punto de hombro trasero conservando la longitud exacta mediante hipotenusa.",
    siglas: [
      { sigla: "L", significado: "Ancho de Escote (cm)" },
      { sigla: "HO", significado: "Largo Hombro (cm)" },
      { sigla: "CH_{back}", significado: "Caída Hombro Trasero (cm)" }
    ]
  },
  { 
    id: "X_14_front", 
    title: "Sisa Media Delantero (X_14_front)", 
    formula: "X_{14\\text{, front}} = \\frac{\\text{APe}}{2}", 
    desc: "Ancho de pecho delantero dividido entre dos.",
    siglas: [
      { sigla: "APe", significado: "Ancho de Pecho (cm)" }
    ]
  },
  { 
    id: "X_14_back", 
    title: "Sisa Media Trasero (X_14_back)", 
    formula: "X_{14\\text{, back}} = \\frac{\\text{AEs}}{2}", 
    desc: "Ancho de espalda trasera dividido entre dos.",
    siglas: [
      { sigla: "AEs", significado: "Ancho de Espalda (cm)" }
    ]
  }
];

// KaTeX Safe Component
const MathTex: React.FC<{ formula: string; displayMode?: boolean }> = ({ formula, displayMode = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(formula, containerRef.current, {
        displayMode,
        throwOnError: false
      });
    }
  }, [formula, displayMode]);

  return <span ref={containerRef} />;
};

export default function Home() {
  // App Core States
  const [currentSize, setCurrentSize] = useState<string>("10");
  const [viewMode, setViewMode] = useState<"single" | "nested">("single");
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showAnchorPoints, setShowAnchorPoints] = useState<boolean>(true);
  const [showLabelCircles, setShowLabelCircles] = useState<boolean>(false);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [hoverToShowLabels, setHoverToShowLabels] = useState<boolean>(true);
  const [lightMode, setLightMode] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [showEquationsPanel, setShowEquationsPanel] = useState<boolean>(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);

  // Grid Property Base variables
  const [userBase, setUserBase] = useState<Record<string, number>>({ ...BASE_PRESETS });

  // Viewport Pan / Zoom State
  const [zoom, setZoom] = useState<number>(0.65);
  const [tx, setTx] = useState<number>(100);
  const [ty, setTy] = useState<number>(80);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover state for points to trigger dynamic CAD labels
  const [hoveredPoint, setHoveredPoint] = useState<{ type: "front" | "back"; id: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync lightMode with body class
  useEffect(() => {
    if (lightMode) {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
  }, [lightMode]);

  // Handle center layout on resize or boot
  useEffect(() => {
    setTx(window.innerWidth / 2 - 320);
  }, []);

  const inputIds = Object.keys(BASE_PRESETS);

  // Mathematical grading delta system
  const getMeasurementsForSize = (size: string) => {
    const idx = SIZE_INDEX[size];
    const measurements: Record<string, number> = {};
    inputIds.forEach(id => {
      const deltaArr = GRADING_DELTAS[id];
      if (deltaArr) {
        measurements[id] = userBase[id] + deltaArr[idx + 2]; // index offset -2..2 mapped to 0..6
      } else {
        measurements[id] = userBase[id];
      }
    });
    return measurements;
  };

  // Helper to update active size measurement and back-calculate baseline (Size 10) values
  const handleActiveMeasurementChange = (id: string, newVal: number) => {
    const deltaArr = GRADING_DELTAS[id];
    const sizeIdx = SIZE_INDEX[currentSize] ?? 0;
    const baseVal = newVal - deltaArr[sizeIdx + 2];
    setUserBase(prev => ({
      ...prev,
      [id]: baseVal
    }));
  };

  // SVG Point generator using pattern equations
  const getPatternPoints = (m: Record<string, number>, originX: number, originY: number, size: string) => {
    const N = (m.talle_atras - m.centro_atras) * CM_TO_PX;
    const M = (m.talle_frente - m.centro_frente) * CM_TO_PX;
    const Y_chest = -(m.talle_atras - m.costado) * CM_TO_PX;
    
    const Y_waist_back = -m.talle_atras * CM_TO_PX;
    const Y_waist_front = -m.talle_frente * CM_TO_PX;
    
    const waist_to_hem = (m.largo_camisa - 42.5) * CM_TO_PX;
    const Y_hem_back = Y_waist_back - waist_to_hem;
    const Y_hem_front = Y_waist_front - waist_to_hem;
    
    const L = m.ancho_escote * CM_TO_PX;
    
    const hombroIndex = SIZE_INDEX[size] ?? 0;
    const caida_back = (3.5 + 0.1 * hombroIndex) * CM_TO_PX;
    const caida_front = (4.0 + 0.1 * hombroIndex) * CM_TO_PX;

    const X_7_back = L + Math.sqrt(Math.max(0, (m.hombro * CM_TO_PX) ** 2 - caida_back ** 2));
    const X_7_front = L + Math.sqrt(Math.max(0, (m.hombro * CM_TO_PX) ** 2 - caida_front ** 2));
    
    const Y_13_back = (Y_chest + (-N)) / 2;
    const X_14_back = (m.espalda / 2) * CM_TO_PX;
    
    const Y_13_front = (Y_chest + (-M)) / 2;
    const X_14_front = (m.pecho / 2) * CM_TO_PX;

    const front = {
      1:  { x: 0, y: 0 },
      2:  { x: 0, y: Y_hem_front },
      3:  { x: (m.cadera / 4) * CM_TO_PX, y: Y_hem_front },
      4:  { x: 0, y: Y_waist_front },
      5:  { x: (m.cintura / 4) * CM_TO_PX, y: Y_waist_front },
      6:  { x: X_7_front, y: 0 }, 
      7:  { x: X_7_front, y: -caida_front },
      8:  { x: 0, y: Y_chest },
      9:  { x: (m.busto / 4) * CM_TO_PX, y: Y_chest },
      10: { x: L, y: 0 },
      11: { x: 0, y: -M },
      12: { x: 2 * CM_TO_PX, y: -M }, 
      13: { x: 0, y: Y_13_front },
      14: { x: X_14_front, y: Y_13_front }
    };

    const back = {
      1:  { x: 0, y: 0 },
      2:  { x: 0, y: Y_hem_back },
      3:  { x: (m.cadera / 4) * CM_TO_PX, y: Y_hem_back },
      4:  { x: 0, y: Y_waist_back },
      5:  { x: (m.cintura / 4) * CM_TO_PX, y: Y_waist_back },
      6:  { x: X_7_back, y: 0 }, 
      7:  { x: X_7_back, y: -caida_back },
      8:  { x: 0, y: Y_chest },
      9:  { x: (m.busto / 4) * CM_TO_PX, y: Y_chest },
      10: { x: L, y: 0 },
      13: { x: 0, y: Y_13_back },
      14: { x: X_14_back, y: Y_13_back },
      15: { x: 0, y: -N }
    };

    const translate = (pts: Record<number, { x: number; y: number }>, ox: number, oy: number) => {
      const shifted: Record<number, { x: number; y: number }> = {};
      for (const p in pts) {
        const id = parseInt(p);
        shifted[id] = {
          x: ox + pts[id].x,
          y: oy - pts[id].y
        };
      }
      return shifted;
    };

    return {
      front: translate(front, originX, originY),
      back: translate(back, originX + 550, originY)
    };
  };

  // Pan Zoom Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".tech-ui-layer")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - tx, y: e.clientY - ty });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setTx(e.clientX - dragStart.x);
    setTy(e.clientY - dragStart.y);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest(".tech-ui-layer")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgX = (mouseX - tx) / zoom;
    const svgY = (mouseY - ty) / zoom;

    const zoomFactor = 1 - e.deltaY * 0.0012;
    const newScale = Math.min(Math.max(zoom * zoomFactor, 0.15), 5.0);

    setTx(mouseX - svgX * newScale);
    setTy(mouseY - svgY * newScale);
    setZoom(newScale);
  };

  const resetViewport = () => {
    setZoom(0.65);
    setTx(window.innerWidth / 2 - 320);
    setTy(80);
  };

  // Keyboard shortcut binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key.toLowerCase() === "f") {
        resetViewport();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);



  // Export current SVG to vector file
  const exportSvg = () => {
    const svgEl = document.getElementById("pattern-svg")?.cloneNode(true) as SVGElement;
    if (!svgEl) return;
    
    svgEl.setAttribute("width", "1600px");
    svgEl.setAttribute("height", "1000px");
    svgEl.setAttribute("viewBox", "0 0 1600 1000");

    const g = svgEl.querySelector("#transform-group");
    if (g) {
      g.setAttribute("transform", "translate(100, 150) scale(1)");
    }

    svgEl.style.backgroundColor = lightMode ? "#ffffff" : "#141416";
    const grid = svgEl.querySelector("rect");
    if (grid) grid.setAttribute("fill", lightMode ? "#ffffff" : "#141416");

    const texts = svgEl.querySelectorAll("text");
    texts.forEach(t => {
      t.setAttribute("fill", lightMode ? "#333333" : "#f4f4f5");
    });

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `tela_shirt_grader_${viewMode}_talla${currentSize}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPattern = () => {
    window.print();
  };

  // Compile calculations to render
  const originX = 100;
  const originY = 150;

  // Active base metrics
  const mActive = getMeasurementsForSize(currentSize);
  const ptsActive = getPatternPoints(mActive, originX, originY, currentSize);

  // Nested paths compiling
  const nestedSizings = ["6", "8", "10", "12", "14", "16", "18"];
  const compiledPaths = useMemo(() => {
    return nestedSizings.map(size => {
      const m = getMeasurementsForSize(size);
      const pts = getPatternPoints(m, originX, originY, size);
      
      const frontNeck = `M ${pts.front[11].x} ${pts.front[11].y} C ${pts.front[12].x} ${pts.front[12].y}, ${pts.front[10].x} ${pts.front[10].y + (pts.front[11].y - pts.front[10].y) * 0.45}, ${pts.front[10].x} ${pts.front[10].y}`;
      const frontShoulder = `L ${pts.front[7].x} ${pts.front[7].y}`;
      const frontSisa = `C ${pts.front[7].x} ${pts.front[7].y + (pts.front[14].y - pts.front[7].y) * 0.4}, ${pts.front[14].x} ${pts.front[14].y - (pts.front[14].y - pts.front[7].y) * 0.25}, ${pts.front[14].x} ${pts.front[14].y} C ${pts.front[14].x} ${pts.front[14].y + (pts.front[9].y - pts.front[14].y) * 0.5}, ${pts.front[14].x + (pts.front[9].x - pts.front[14].x) * 0.3} ${pts.front[9].y}, ${pts.front[9].x} ${pts.front[9].y}`;
      const frontSide = `C ${pts.front[9].x} ${pts.front[9].y + (pts.front[5].y - pts.front[9].y) * 0.45}, ${pts.front[5].x} ${pts.front[5].y - (pts.front[5].y - pts.front[9].y) * 0.3}, ${pts.front[5].x} ${pts.front[5].y} C ${pts.front[5].x} ${pts.front[5].y + (pts.front[3].y - pts.front[5].y) * 0.4}, ${pts.front[3].x} ${pts.front[3].y - (pts.front[3].y - pts.front[5].y) * 0.25}, ${pts.front[3].x} ${pts.front[3].y}`;
      const frontHem = `L ${pts.front[2].x} ${pts.front[2].y}`;
      const frontCenter = `L ${pts.front[11].x} ${pts.front[11].y}`;
      const frontPath = `${frontNeck} ${frontShoulder} ${frontSisa} ${frontSide} ${frontHem} ${frontCenter} Z`;

      const backNeck = `M ${pts.back[15].x} ${pts.back[15].y} C ${pts.back[15].x + (pts.back[10].x - pts.back[15].x) * 0.4} ${pts.back[15].y}, ${pts.back[15].x + (pts.back[10].x - pts.back[15].x) * 0.75} ${pts.back[10].y}, ${pts.back[10].x} ${pts.back[10].y}`;
      const backShoulder = `L ${pts.back[7].x} ${pts.back[7].y}`;
      const backSisa = `C ${pts.back[7].x} ${pts.back[7].y + (pts.back[14].y - pts.back[7].y) * 0.4}, ${pts.back[14].x} ${pts.back[14].y - (pts.back[14].y - pts.back[7].y) * 0.25}, ${pts.back[14].x} ${pts.back[14].y} C ${pts.back[14].x} ${pts.back[14].y + (pts.back[9].y - pts.back[14].y) * 0.5}, ${pts.back[14].x + (pts.back[9].x - pts.back[14].x) * 0.3} ${pts.back[9].y}, ${pts.back[9].x} ${pts.back[9].y}`;
      const backSide = `C ${pts.back[9].x} ${pts.back[9].y + (pts.back[5].y - pts.back[9].y) * 0.45}, ${pts.back[5].x} ${pts.back[5].y - (pts.back[5].y - pts.back[9].y) * 0.3}, ${pts.back[5].x} ${pts.back[5].y} C ${pts.back[5].x} ${pts.back[5].y + (pts.back[3].y - pts.back[5].y) * 0.4}, ${pts.back[3].x} ${pts.back[3].y - (pts.back[3].y - pts.back[5].y) * 0.25}, ${pts.back[3].x} ${pts.back[3].y}`;
      const backHem = `L ${pts.back[2].x} ${pts.back[2].y}`;
      const backCenter = `L ${pts.back[15].x} ${pts.back[15].y}`;
      const backPath = `${backNeck} ${backShoulder} ${backSisa} ${backSide} ${backHem} ${backCenter} Z`;

      return { size, frontPath, backPath };
    });
  }, [userBase]);

  // Guides positions
  const N_active = (mActive.talle_atras - mActive.centro_atras) * CM_TO_PX;
  const M_active = (mActive.talle_frente - mActive.centro_frente) * CM_TO_PX;
  const Y_chest_active = -(mActive.talle_atras - mActive.costado) * CM_TO_PX;
  const Y_waist_back_active = -mActive.talle_atras * CM_TO_PX;
  const Y_waist_front_active = -mActive.talle_frente * CM_TO_PX;
  const waist_to_hem_active = (mActive.largo_camisa - 42.5) * CM_TO_PX;
  const Y_hem_back_active = Y_waist_back_active - waist_to_hem_active;
  const Y_hem_front_active = Y_waist_front_active - waist_to_hem_active;

  const yNeck = originY;
  const yChest = originY - Y_chest_active;
  const yWaistBack = originY - Y_waist_back_active;
  const yWaistFront = originY - Y_waist_front_active;
  const yHemBack = originY - Y_hem_back_active;
  const yHemFront = originY - Y_hem_front_active;
  const wGuide = 1250;

  // Single active size point formula bindings
  const frontPointFormulas: Record<number, string> = {
    1: "0, 0",
    2: "0, -O",
    3: "1/4 Cadera, -O",
    4: "0, -Talle Frente",
    5: "1/4 Cintura, -Talle",
    6: "Hombro drop guide",
    7: "Shoulder tip (Hombro)",
    8: "0, -Talle + Costado",
    9: "1/4 Busto, Y_sisa",
    10: "Escote L, 0",
    11: "0, -Escote Depth (CF)",
    12: "2cm, -Escote Depth",
    13: "0, Sisa Mid",
    14: "1/2 Pecho, Sisa Mid"
  };

  const backPointFormulas: Record<number, string> = {
    1: "0, 0",
    2: "0, -O",
    3: "1/4 Cadera, -O",
    4: "0, -Talle Atrás",
    5: "1/4 Cintura, -Talle",
    6: "Hombro drop guide",
    7: "Shoulder tip (Hombro)",
    8: "0, -Talle + Costado",
    9: "1/4 Busto, Y_sisa",
    10: "Escote L, 0",
    13: "0, Sisa Mid",
    14: "1/2 Espalda, Sisa Mid",
    15: "0, -Escote Depth (CA)"
  };

  const backPointsIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15];
  const frontPointsIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  return (
    <div className={`flex flex-row-reverse h-screen w-screen overflow-hidden text-sm transition-colors duration-200 ${lightMode ? "light-mode bg-zinc-100" : "bg-[#141416] text-zinc-100"}`}>
      
      {/* SIDEBAR PROPERTY CONTROL PANEL */}
      <aside className={`sidebar w-[360px] flex flex-col h-full z-10 border-l border-[var(--border-light)] ${lightMode ? "bg-white" : "bg-[#1e1e20]"}`}>
        
        {/* Compact Tech Header */}
        <div className="brand-header p-4 border-b border-[var(--border-light)] flex items-center gap-3">
          <div className="brand-logo w-7 h-7 bg-[var(--brand-primary)] rounded flex items-center justify-center border border-white/10">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h1 className={`brand-name font-bold text-sm tracking-wide uppercase ${lightMode ? "text-zinc-900" : "text-white"}`}>TELA CAD React</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="brand-badge text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-cyan-400 border border-[var(--brand-primary)]/20">Auto-Grader</span>
              <span className="text-[10px] text-zinc-500 font-medium">Size 10 Base</span>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs Selectors */}
        <div className={`flex border-b border-[var(--border-light)] p-1 transition-colors ${lightMode ? "bg-zinc-100/80" : "bg-black/10"}`}>
          <button 
            className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${!showEquationsPanel ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-light)]" : `text-[var(--text-secondary)] ${lightMode ? "hover:text-zinc-900 hover:bg-zinc-200/50" : "hover:text-white hover:bg-white/5"}`}`}
            onClick={() => setShowEquationsPanel(false)}
          >
            <Sliders className="w-3.5 h-3.5" />
            Propiedades CAD
          </button>
          <button 
            className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${showEquationsPanel ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-light)]" : `text-[var(--text-secondary)] ${lightMode ? "hover:text-zinc-900 hover:bg-zinc-200/50" : "hover:text-white hover:bg-white/5"}`}`}
            onClick={() => setShowEquationsPanel(true)}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Ecuaciones CAD
          </button>
        </div>

        {/* Sidebar Scrollable Content */}
        <div className="sidebar-content flex-1 overflow-y-auto p-4 space-y-4">
          
          {!showEquationsPanel ? (
            <>
              {/* SECTION 1: ACTIVE BASE SIZE */}
              <div className="section-card bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3">
                <div className="section-title text-[11px] font-bold uppercase tracking-wider mb-2.5 pb-1 border-l-2 border-[var(--brand-primary)] pl-2">
                  1. Talla Activa
                </div>
                
                <div className={`grid grid-cols-7 gap-1 p-1 rounded-md border border-[var(--border-light)] transition-colors ${lightMode ? "bg-zinc-100" : "bg-black/20"}`}>
                  {nestedSizings.map(size => {
                    const isActive = currentSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setCurrentSize(size)}
                        className={`py-1.5 text-xs font-bold font-mono rounded transition-all ${
                          isActive 
                            ? `text-white ${size === '10' && (lightMode ? 'text-white font-extrabold' : 'text-black font-extrabold')}` 
                            : `text-[var(--text-secondary)] ${lightMode ? 'hover:bg-zinc-200 hover:text-zinc-900' : 'hover:bg-white/5 hover:text-white'}`
                        }`}
                        style={{ backgroundColor: isActive ? `var(--color-${size})` : undefined }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: CONTORNOS */}
              <div className="section-card bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3">
                <div className="section-title text-[11px] font-bold uppercase tracking-wider mb-2.5 pb-1 border-l-2 border-[var(--brand-primary)] pl-2">
                  2. Contornos (Talla {currentSize})
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Busto (B) <span className="text-[9px] text-zinc-500 font-mono">1/4 B</span></label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.busto} 
                        onChange={(e) => handleActiveMeasurementChange("busto", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Cintura (C) <span className="text-[9px] text-zinc-500 font-mono">1/4 C</span></label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.cintura} 
                        onChange={(e) => handleActiveMeasurementChange("cintura", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Cadera (D) <span className="text-[9px] text-zinc-500 font-mono">1/4 D</span></label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.cadera} 
                        onChange={(e) => handleActiveMeasurementChange("cadera", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ANCHOS Y HOMBROS */}
              <div className="section-card bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3">
                <div className="section-title text-[11px] font-bold uppercase tracking-wider mb-2.5 pb-1 border-l-2 border-[var(--brand-primary)] pl-2">
                  3. Anchos y Hombros (Talla {currentSize})
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Ancho Esp. (F)</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.espalda} 
                        onChange={(e) => handleActiveMeasurementChange("espalda", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Ancho Pecho (E)</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.pecho} 
                        onChange={(e) => handleActiveMeasurementChange("pecho", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Largo Hombro (K)</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.hombro} 
                        onChange={(e) => handleActiveMeasurementChange("hombro", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Ancho Escote (L)</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        step="0.1"
                        value={mActive.ancho_escote} 
                        onChange={(e) => handleActiveMeasurementChange("ancho_escote", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ALTURAS Y TALLES */}
              <div className="section-card bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3">
                <div className="section-title text-[11px] font-bold uppercase tracking-wider mb-2.5 pb-1 border-l-2 border-[var(--brand-primary)] pl-2">
                  4. Alturas y Talles (Talla {currentSize})
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Talle Delant.</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.talle_frente} 
                        onChange={(e) => handleActiveMeasurementChange("talle_frente", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Talle Trasero</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.talle_atras} 
                        onChange={(e) => handleActiveMeasurementChange("talle_atras", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Centro Delant.</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.centro_frente} 
                        onChange={(e) => handleActiveMeasurementChange("centro_frente", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Centro Trasero</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.centro_atras} 
                        onChange={(e) => handleActiveMeasurementChange("centro_atras", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Costado</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.costado} 
                        onChange={(e) => handleActiveMeasurementChange("costado", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)]">Largo Camisa</label>
                    <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={mActive.largo_camisa} 
                        onChange={(e) => handleActiveMeasurementChange("largo_camisa", parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/30 border border-[var(--border-light)] rounded px-2 py-1.5 pr-7 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                      />
                      <span className="absolute right-2 text-[10px] text-zinc-500 font-mono">cm</span>
                    </div>
                  </div>
                </div>
              </div>


            </>
          ) : (
            /* TECHNICAL EQUATIONS DICTIONARY PANEL */
            <div className="space-y-4">
              <div className="section-card bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3">
                <div className="section-title text-[11px] font-bold uppercase tracking-wider mb-1.5 pb-1 border-l-2 border-amber-500 pl-2">
                  Ecuaciones de Patronaje CAD
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Las ecuaciones del patrón se renderizan dinámicamente aplicando KaTeX en centímetros (cm) según tus variables activas.
                </p>
              </div>

              {/* Rendered formulas with acronym glossary underneath */}
              <div className="space-y-3">
                {EQUATIONS_DATABASE.map(eq => (
                  <div key={eq.id} className={`border border-[var(--border-light)] rounded p-3 space-y-2.5 shadow-sm transition-colors ${lightMode ? "bg-[#f8fafc] text-zinc-800" : "bg-black/10 text-zinc-100"}`}>
                    <h4 className={`text-xs font-bold transition-colors ${lightMode ? "text-[var(--brand-primary)]" : "text-sky-400"}`}>{eq.title}</h4>
                    
                    {/* Math formula rendering box - crisp white in Day Mode, dark in Night Mode */}
                    <div className={`p-2.5 border rounded flex justify-center overflow-x-auto text-[11px] font-medium shadow-inner transition-colors ${lightMode ? "bg-white border-zinc-200 text-zinc-900" : "bg-black/30 border-white/5 text-zinc-200"}`}>
                      <MathTex formula={eq.formula} displayMode />
                    </div>
                    
                    <p className={`text-[10px] leading-tight font-medium transition-colors ${lightMode ? "text-zinc-600" : "text-zinc-400"}`}>{eq.desc}</p>
                    
                    {/* Acronym Glossary list below each card */}
                    {eq.siglas && eq.siglas.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-light)]">
                        <span className={`text-[8.5px] font-bold uppercase tracking-wider block mb-1 transition-colors ${lightMode ? "text-zinc-400" : "text-zinc-500"}`}>Glosario de Siglas:</span>
                        <div className="grid grid-cols-1 gap-1 pl-1">
                          {eq.siglas.map((s, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[9.5px]">
                              <span className={`font-mono font-bold transition-colors ${lightMode ? "text-amber-700" : "text-amber-400"}`}>{s.sigla}:</span>
                              <span className={`transition-colors ${lightMode ? "text-zinc-500" : "text-zinc-400"}`}>{s.significado}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}



        </div>
      </aside>

      {/* MAIN RENDER CANVAS VIEWPORT */}
      <main 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setIsDragging(false)}
        onWheel={handleWheel}
        className="flex-1 h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ touchAction: "none" }}
      >
        
        {/* Floating Toolbar */}
        <div className="toolbar tech-ui-layer absolute top-4 right-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-1.5 flex items-center gap-2 shadow-2xl z-20 transition-colors duration-200">
          <div className="view-mode-tabs flex bg-[var(--bg-base)] p-0.5 rounded border border-[var(--border-light)]">
            <button 
              onClick={() => setViewMode("single")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === "single" ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-light)] shadow-sm" : `text-[var(--text-secondary)] ${lightMode ? "hover:text-zinc-900 hover:bg-zinc-100/50" : "hover:text-white hover:bg-white/5"}`}`}
            >
              Talla Individual
            </button>
            <button 
              onClick={() => setViewMode("nested")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === "nested" ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-light)] shadow-sm" : `text-[var(--text-secondary)] ${lightMode ? "hover:text-zinc-900 hover:bg-zinc-100/50" : "hover:text-white hover:bg-white/5"}`}`}
            >
              Anidado (Graduación)
            </button>
          </div>

          <div className="w-px h-5 bg-[var(--border-light)]" />

          {/* Table display toggle */}
          <button 
            onClick={() => setShowTable(true)}
            className={`px-3 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-light)] rounded text-xs font-bold transition-all flex items-center gap-1.5 ${lightMode ? "hover:bg-zinc-200 text-zinc-800" : "hover:text-white hover:bg-white/5"}`}
          >
            <Table className="w-3.5 h-3.5 text-zinc-400" />
            Tabla de Tallas
          </button>

          {/* Export SVG button in canvas */}
          <button 
            onClick={exportSvg}
            className={`px-3 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-light)] rounded text-xs font-bold transition-all flex items-center gap-1.5 ${lightMode ? "hover:bg-zinc-200 text-zinc-800" : "hover:text-white hover:bg-white/5"}`}
            title="Exportar SVG Vectorial"
          >
            <FileDown className="w-3.5 h-3.5 text-zinc-400" />
            Exportar SVG
          </button>

          {/* Print button in canvas */}
          <button 
            onClick={printPattern}
            className={`px-3 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-light)] rounded text-xs font-bold transition-all flex items-center gap-1.5 ${lightMode ? "hover:bg-zinc-200 text-zinc-800" : "hover:text-white hover:bg-white/5"}`}
            title="Imprimir Molde Físico"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            Imprimir
          </button>

          <div className="w-px h-5 bg-[var(--border-light)]" />

          {/* Technical Adjustments Floating Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className={`w-7 h-7 bg-[var(--bg-card)] rounded border flex items-center justify-center transition-all ${
                showSettingsDropdown 
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/5" 
                  : "border-[var(--border-light)] text-[var(--text-secondary)]"
              } ${lightMode ? "hover:bg-zinc-200 hover:text-zinc-900" : "hover:bg-white/5 hover:text-white"}`}
              title="Ajustes Técnicos"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showSettingsDropdown && (
              <div className={`absolute right-0 top-9 w-64 border border-[var(--border-light)] rounded-lg p-3.5 shadow-2xl z-25 space-y-3 transition-all duration-200 text-xs ${lightMode ? "bg-white text-zinc-800" : "bg-[#1e1e20] text-zinc-200"}`}>
                <div className="font-bold text-[9px] text-zinc-400 uppercase tracking-wider mb-1.5 border-b border-[var(--border-light)] pb-1.5 flex items-center justify-between">
                  <span>Ajustes Técnicos CAD</span>
                  <button 
                    onClick={() => setShowSettingsDropdown(false)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer">
                      <Layers className="w-3.5 h-3.5 text-zinc-500" />
                      Mostrar Guías y Niveles
                    </label>
                    <button 
                      onClick={() => setShowGuides(!showGuides)}
                      className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 ${showGuides ? "bg-[var(--brand-primary)]" : "bg-zinc-600"}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${showGuides ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer">
                      <Settings className="w-3.5 h-3.5 text-zinc-500" />
                      Mostrar Puntos Ancla (■)
                    </label>
                    <button 
                      onClick={() => setShowAnchorPoints(!showAnchorPoints)}
                      className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 ${showAnchorPoints ? "bg-[var(--brand-primary)]" : "bg-zinc-600"}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${showAnchorPoints ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer">
                      <Info className="w-3.5 h-3.5 text-zinc-500" />
                      Mostrar Círculos de Tallas
                    </label>
                    <button 
                      onClick={() => setShowLabelCircles(!showLabelCircles)}
                      className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 ${showLabelCircles ? "bg-[var(--brand-primary)]" : "bg-zinc-600"}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${showLabelCircles ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                      Mostrar Fórmulas Escritas
                    </label>
                    <button 
                      onClick={() => setShowFormulas(!showFormulas)}
                      className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 ${showFormulas ? "bg-[var(--brand-primary)]" : "bg-zinc-600"}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${showFormulas ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer">
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      Mostrar Etiquetas al Hover
                    </label>
                    <button 
                      onClick={() => setHoverToShowLabels(!hoverToShowLabels)}
                      className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 ${hoverToShowLabels ? "bg-[var(--brand-primary)]" : "bg-zinc-600"}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${hoverToShowLabels ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[var(--border-light)]" />

          {/* Theme Toggle */}
          <button 
            onClick={() => setLightMode(!lightMode)}
            className={`w-7 h-7 bg-[var(--bg-card)] rounded border border-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary)] transition-colors ${lightMode ? "hover:bg-zinc-200 hover:text-zinc-900" : "hover:bg-white/5 hover:text-white"}`}
          >
            {lightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        {/* Floating Zoom Control Pill in the Bottom-Right Corner */}
        <div className="zoom-controller tech-ui-layer absolute bottom-4 right-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-1.5 flex items-center gap-2 shadow-2xl z-10 transition-colors duration-200">
          {/* Zoom Out (-) */}
          <button 
            onClick={() => setZoom(Math.max(zoom * 0.85, 0.15))} 
            className={`w-7 h-7 bg-[var(--bg-card)] rounded border border-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary)] transition-colors ${lightMode ? "hover:bg-zinc-200 hover:text-zinc-900" : "hover:bg-white/5 hover:text-white"}`}
            title="Alejar (-)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Zoom level indicator badge */}
          <span className="text-xs font-mono font-bold px-1.5 min-w-[42px] text-center text-[var(--text-primary)]">
            {Math.round(zoom * 100)}%
          </span>

          {/* Zoom In (+) */}
          <button 
            onClick={() => setZoom(Math.min(zoom * 1.15, 5.0))} 
            className={`w-7 h-7 bg-[var(--bg-card)] rounded border border-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary)] transition-colors ${lightMode ? "hover:bg-zinc-200 hover:text-zinc-900" : "hover:bg-white/5 hover:text-white"}`}
            title="Acercar (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-[var(--border-light)]" />

          {/* Reset Viewport */}
          <button 
            onClick={resetViewport} 
            className={`w-7 h-7 bg-[var(--bg-card)] rounded border border-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary)] transition-colors ${lightMode ? "hover:bg-zinc-200 hover:text-zinc-900" : "hover:bg-white/5 hover:text-white"}`}
            title="Ajustar Vista (F)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Nested legend panel stacked above bottom-right zoom */}
        <div className={`legend-card tech-ui-layer absolute bottom-20 right-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-2xl z-5 w-44 flex flex-col gap-2 pointer-events-auto transition-all duration-300 ${viewMode === "nested" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
          <span className="legend-title text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Patrón de Tallas</span>
          {nestedSizings.map(size => (
            <div key={size} className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `var(--color-${size})` }} />
              <span>Talla {size} {size === "10" && "(Base)"}</span>
            </div>
          ))}
        </div>

        {/* SVG Drawing Canvas */}
        <svg id="pattern-svg" className="w-full h-full block bg-[var(--bg-base)] transition-colors duration-200">
          <defs>
            {/* Grid Patterns */}
            <pattern id="grid-pattern-10" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--grid-minor)" strokeWidth="0.5"/>
            </pattern>
            <pattern id="grid-pattern-50" width="50" height="50" patternUnits="userSpaceOnUse">
              <rect width="50" height="50" fill="url(#grid-pattern-10)"/>
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="var(--grid-major)" strokeWidth="0.7"/>
            </pattern>
          </defs>

          {/* Transformation Matrix Group */}
          <g id="transform-group" transform={`translate(${tx}, ${ty}) scale(${zoom})`}>
            
            {/* Massive Infinite Grid Background inside transform-group */}
            <rect x="-20000" y="-20000" width="40000" height="40000" fill="url(#grid-pattern-50)" />
            
            {/* Coordinate Axes inside transform-group */}
            <g stroke="var(--axis-color)" strokeWidth="0.8">
              <line x1="-20000" y1="0" x2="20000" y2="0" />
              <line x1="0" y1="-20000" x2="0" y2="20000" />
            </g>
            
            {/* 1. Guides and Levels */}
            {showGuides && (
              <g>
                {/* Horizontal Guide Lines */}
                <g stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.8" strokeDasharray="3,4" className="light-mode:stroke-black/10">
                  <line x1="50" y1={yNeck} x2={wGuide} y2={yNeck} />
                  <line x1="50" y1={originY - (-M_active)} x2="450" y2={originY - (-M_active)} />
                  <line x1="500" y1={originY - (-N_active)} x2={wGuide} y2={originY - (-N_active)} />
                  <line x1="50" y1={yChest} x2={wGuide} y2={yChest} />
                  <line x1="50" y1={yWaistFront} x2="450" y2={yWaistFront} />
                  <line x1="500" y1={yWaistBack} x2={wGuide} y2={yWaistBack} />
                  <line x1="50" y1={yHemFront} x2="450" y2={yHemFront} />
                  <line x1="500" y1={yHemBack} x2={wGuide} y2={yHemBack} />
                </g>

                {/* Technical Labels */}
                <g fill="var(--text-muted)" fontFamily="monospace" fontSize="8.2" letterSpacing="0.5" className="font-bold">
                  <text x="52" y={yNeck - 5}>NIVEL CUELLO (Y=0)</text>
                  <text x="52" y={yChest - 5}>NIVEL SISA / PECHO (Y = -Talle + Costado)</text>
                  <text x="52" y={yWaistFront - 5}>NIVEL CINTURA DELANT. (Y = -Talle Frente)</text>
                  <text x="502" y={yWaistBack - 5}>NIVEL CINTURA TRASERA (Y = -Talle Atrás)</text>
                  <text x="52" y={yHemFront - 5}>NIVEL RUEDO DELANT. (Y = -Talle Frente - Faldón)</text>
                  <text x="502" y={yHemBack - 5}>NIVEL RUEDO TRASERO (Y = -Talle Atrás - Faldón)</text>
                </g>
              </g>
            )}

            {/* 2. Drawing Vector Pattern Curves */}
            {viewMode === "nested" ? (
              // Graduación Nesting Mode
              compiledPaths.map(({ size, frontPath, backPath }) => {
                const isBase = size === currentSize;
                const strokeColor = `var(--color-${size})`;
                return (
                  <g key={size}>
                    <path d={frontPath} fill="none" stroke={strokeColor} strokeWidth={isBase ? 2.2 : 1.0} strokeOpacity={isBase ? 1 : 0.4} strokeDasharray={isBase ? "none" : "1,2"} />
                    <path d={backPath} fill="none" stroke={strokeColor} strokeWidth={isBase ? 2.2 : 1.0} strokeOpacity={isBase ? 1 : 0.4} strokeDasharray={isBase ? "none" : "1,2"} />
                  </g>
                );
              })
            ) : (
              // Individual Sizing Mode
              <g>
                <path d={compiledPaths.find(p => p.size === currentSize)?.frontPath} fill="none" stroke={`var(--color-${currentSize})`} strokeWidth="2.0" />
                <path d={compiledPaths.find(p => p.size === currentSize)?.backPath} fill="none" stroke={`var(--color-${currentSize})`} strokeWidth="2.0" />
              </g>
            )}

            {/* 3. Render Anchor Points, Labels & Formulas */}
            {showAnchorPoints && viewMode === "single" && (
              <g>
                {/* DELANTERO (FRONT) Anchor Points */}
                {frontPointsIds.map(p => {
                  const pt = ptsActive.front[p];
                  if (!pt) return null;
                  
                  const isHovered = hoveredPoint?.type === "front" && hoveredPoint.id === p;
                  const displayLabels = showLabelCircles || (hoverToShowLabels && isHovered);
                  const displayFormulas = showFormulas || (hoverToShowLabels && isHovered);

                  return (
                    <g 
                      key={`front-pt-${p}`}
                      onPointerOver={() => setHoveredPoint({ type: "front", id: p })}
                      onPointerOut={() => setHoveredPoint(null)}
                      className="cursor-pointer"
                    >
                      {/* Active point highlight glow on hover */}
                      {isHovered && (
                        <circle cx={pt.x} cy={pt.y} r={14} fill="var(--brand-accent)" fillOpacity="0.12" />
                      )}

                      {/* CAD Square Anchor Spot */}
                      <rect 
                        x={pt.x - 3.5} 
                        y={pt.y - 3.5} 
                        width="7" 
                        height="7" 
                        fill={lightMode ? "#fff" : "#141416"} 
                        stroke="var(--brand-accent)" 
                        strokeWidth="1.2" 
                      />

                      {/* Circle Number Badge tag */}
                      {displayLabels && (
                        <g>
                          <circle cx={pt.x - 13} cy={pt.y - 13} r="7.5" fill="#222226" stroke="var(--brand-accent)" strokeWidth="0.8" />
                          <text x={pt.x - 13} y={pt.y - 10.5} fill="#fff" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle">{p}</text>
                        </g>
                      )}

                      {/* Formula coordinate labels */}
                      {displayFormulas && (
                        <text x={pt.x + 8} y={pt.y + 3} fill="var(--text-secondary)" fontFamily="monospace" fontSize="8" fontWeight="500">{frontPointFormulas[p]}</text>
                      )}
                    </g>
                  );
                })}

                {/* ESPALDA (BACK) Anchor Points */}
                {backPointsIds.map(p => {
                  const pt = ptsActive.back[p];
                  if (!pt) return null;

                  const isHovered = hoveredPoint?.type === "back" && hoveredPoint.id === p;
                  const displayLabels = showLabelCircles || (hoverToShowLabels && isHovered);
                  const displayFormulas = showFormulas || (hoverToShowLabels && isHovered);

                  return (
                    <g 
                      key={`back-pt-${p}`}
                      onPointerOver={() => setHoveredPoint({ type: "back", id: p })}
                      onPointerOut={() => setHoveredPoint(null)}
                      className="cursor-pointer"
                    >
                      {/* Active point highlight glow */}
                      {isHovered && (
                        <circle cx={pt.x} cy={pt.y} r={14} fill="var(--brand-secondary)" fillOpacity="0.12" />
                      )}

                      {/* CAD Square Anchor Spot */}
                      <rect 
                        x={pt.x - 3.5} 
                        y={pt.y - 3.5} 
                        width="7" 
                        height="7" 
                        fill={lightMode ? "#fff" : "#141416"} 
                        stroke="var(--brand-secondary)" 
                        strokeWidth="1.2" 
                      />

                      {/* Circle Number Badge tag */}
                      {displayLabels && (
                        <g>
                          <circle cx={pt.x - 13} cy={pt.y - 13} r="7.5" fill="#222226" stroke="var(--brand-secondary)" strokeWidth="0.8" />
                          <text x={pt.x - 13} y={pt.y - 10.5} fill="#fff" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle">{p}</text>
                        </g>
                      )}

                      {/* Formula coordinate labels */}
                      {displayFormulas && (
                        <text x={pt.x + 8} y={pt.y + 3} fill="var(--text-secondary)" fontFamily="monospace" fontSize="8" fontWeight="500">{backPointFormulas[p]}</text>
                      )}
                    </g>
                  );
                })}

                {/* Technical Titles (Delantero & Espalda) - Contrast adaptive */}
                <g fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="var(--text-primary)" letterSpacing="1">
                  <text x={ptsActive.front[1].x + 130} y={ptsActive.front[1].y - 35} textAnchor="middle">DELANTERO (FRONT)</text>
                  <text x={ptsActive.back[1].x + 130} y={ptsActive.back[1].y - 35} textAnchor="middle">ESPALDA (BACK)</text>
                </g>
              </g>
            )}

          </g>
        </svg>
      </main>

      {/* FULL GRID SPREADSHEET MATRIX OVERLAY PANEL */}
      <div className={`table-overlay-panel tech-ui-layer fixed inset-0 w-full h-full z-20 flex flex-col p-8 overflow-y-auto transition-all duration-300 ${showTable ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`} style={{ backgroundColor: "var(--bg-base)" }}>
        <div className="table-header-row flex items-center justify-between mb-4">
          <div className="table-title-group flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Cuadro de Tallas Automático (Graduación Escalar)</h2>
              <button 
                onClick={() => setUserBase({ ...BASE_PRESETS })}
                className={`px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-md text-xs font-bold transition-all shadow-sm ${lightMode ? "hover:bg-zinc-200 text-sky-800" : "hover:bg-white/10 text-cyan-400"}`}
              >
                Restablecer Talla 10 Base
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Haz click en cualquier celda para editar el valor de la talla. Todos los deltas y el SVG se recalculan al instante.</p>
          </div>
          <button 
            onClick={() => setShowTable(false)}
            className="w-8 h-8 rounded-full border border-[var(--border-light)] bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grading-table-container w-full border border-[var(--border-light)] rounded-lg overflow-hidden bg-[var(--bg-surface)] shadow-2xl">
          <table className="grading-table w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cód</th>
                <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Medidas</th>
                {nestedSizings.map(size => (
                  <th 
                    key={size} 
                    className={`p-3 text-[10px] font-bold uppercase tracking-wider text-center ${
                      size === "10" ? (lightMode ? "text-sky-700 bg-sky-50" : "text-cyan-400 bg-[var(--brand-primary)]/5") : "text-zinc-500"
                    }`}
                  >
                    Talla {size} {size === "10" && "(BASE)"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inputIds.map(id => {
                const desc = VARIABLE_DESCRIPTIONS[id];
                const deltaArr = GRADING_DELTAS[id];
                
                // Real-time delta evaluations inside grid
                const getVal = (idx: number) => userBase[id] + deltaArr[idx];

                return (
                  <tr key={id} className={`border-b border-[var(--border-light)] transition-colors ${lightMode ? "hover:bg-black/[0.02]" : "hover:bg-white/[0.02]"}`}>
                    <td className={`p-3 font-mono font-bold text-xs ${lightMode ? "text-sky-700" : "text-sky-400"}`}>{id.toUpperCase()}</td>
                    <td className="p-3 text-xs text-[var(--text-primary)] font-medium">{desc}</td>
                    {nestedSizings.map((size, idx) => {
                      const val = getVal(idx);
                      const isBase = size === "10";
                      
                      return (
                        <td 
                          key={size} 
                          className={`p-1.5 text-center ${isBase ? (lightMode ? "bg-sky-50" : "bg-cyan-500/5") : ""}`}
                        >
                          <input 
                            type="number" 
                            step="0.1"
                            value={val.toFixed(1)} 
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value);
                              if (!isNaN(newVal) && newVal >= 0) {
                                // Back out base-10 value based on edited cell
                                const baseVal = newVal - deltaArr[idx];
                                setUserBase({ ...userBase, [id]: baseVal });
                              }
                            }}
                            className={`w-20 bg-transparent border border-transparent hover:border-[var(--border-light)] focus:bg-[var(--bg-base)] focus:border-[var(--brand-primary)] text-center text-xs font-mono py-1 rounded focus:outline-none transition-colors ${
                              isBase ? (lightMode ? "text-sky-700 font-bold" : "text-cyan-400 font-bold") : "text-[var(--text-secondary)]"
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
