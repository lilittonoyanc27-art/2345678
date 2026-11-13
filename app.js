import heroImageUrl from './jardin_alegrias_hero.jpg';
import {
  EXAM_META,
  READING_INFO,
  ANALYSIS_PARTS,
  MODEL_RESPONSE,
  QUIZ_QUESTIONS
} from './data.js';

const STORAGE_KEY = 'examen_literatura_1eso_warm_v2';

const VOCAB_TERMS = [
  { es: 'Literatura culta', arm: 'Հեղինակային գրականություն' },
  { es: 'Literatura popular', arm: 'Ժողովրդական գրականություն' },
  { es: 'Género narrativo', arm: 'Պատմողական սեռ' },
  { es: 'Prosa / Párrafo', arm: 'Արձակ / Պարբերություն' },
  { es: 'Verso / Estrofa', arm: 'Չափածո / Տող / Տուն' },
  { es: 'Narrador en 3.ª persona', arm: 'Երրորդ դեմքով պատմող' },
  { es: 'Planteamiento · Nudo · Desenlace', arm: 'Սկիզբ · Հանգույց · Հանգուցալուծում' },
  { es: 'Porque...', arm: 'Որովհետև...' }
];

const state = {
  // Reading tools
  showStructureLens: true,
  activeStageFilter: 'all', // 'all' | 'planteamiento' | 'nudo' | 'desenlace'
  readingFontSize: 'base', // 'sm' | 'base' | 'lg'

  // Click-on-Spanish -> reveal Armenian translations (hidden by default)
  revealedArm: new Set(),

  // Parte II: Analysis (answers hidden until user clicks "Ver respuesta")
  analysisPartFilter: 'all',
  analysisSearch: '',
  revealedAnswers: new Set(),
  masteredQuestions: new Set(),
  summaryDraft: '',
  showSummaryModel: false,

  // Model memorization
  cloakKeywords: false,
  copiedModel: false,

  // Parte III: Quiz (20 questions)
  quizSelections: {},
  quizGraded: false,
  quizInstantCheck: false,
  quizFilter: 'all'
};

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.masteredQuestions)) {
      state.masteredQuestions = new Set(parsed.masteredQuestions);
    }
    if (typeof parsed.summaryDraft === 'string') {
      state.summaryDraft = parsed.summaryDraft;
    }
    if (parsed.quizSelections && typeof parsed.quizSelections === 'object') {
      state.quizSelections = parsed.quizSelections;
    }
    if (typeof parsed.quizGraded === 'boolean') {
      state.quizGraded = parsed.quizGraded;
    }
  } catch {
    // Ignore malformed storage
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        masteredQuestions: Array.from(state.masteredQuestions),
        summaryDraft: state.summaryDraft,
        quizSelections: state.quizSelections,
        quizGraded: state.quizGraded
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function getQuizStats() {
  const total = QUIZ_QUESTIONS.length;
  let answered = 0;
  let correct = 0;
  for (const q of QUIZ_QUESTIONS) {
    const chosen = state.quizSelections[q.num];
    if (chosen) {
      answered += 1;
      if (chosen === q.correct) {
        correct += 1;
      }
    }
  }
  const scoreDisplay = state.quizGraded ? `${correct}/${total}` : `0/${total}`;
  const grade10 = ((correct / total) * 10).toFixed(1);
  return { total, answered, correct, scoreDisplay, grade10 };
}

function toggleArmKey(key) {
  if (state.revealedArm.has(key)) {
    state.revealedArm.delete(key);
  } else {
    state.revealedArm.add(key);
  }
}

const ICONS = {
  check: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>`,
  cross: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>`,
  alert: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg>`,
  eye: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>`,
  copy: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"/></svg>`,
  translate: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802"/></svg>`,
  book: `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>`
};

function renderShell() {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = `
    <div class="min-h-screen flex flex-col">
      <!-- Top Bar Contract: 3 zones separated by gap-8 -->
      <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#EBDED3]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a href="#inicio" class="font-serif-literary text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D95D16]">
            Taller Literario
          </a>

          <nav class="hidden md:flex items-center gap-7 text-base font-medium text-stone-600" aria-label="Navegación principal">
            <a href="#parte-1" class="hover:text-[#C2410C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">Lectura</a>
            <a href="#parte-2" class="hover:text-[#C2410C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">Análisis (30)</a>
            <a href="#modelo-examen" class="hover:text-[#C2410C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">Modelo</a>
            <a href="#parte-3" class="hover:text-[#C2410C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">Victorina (20)</a>
          </nav>

          <div class="flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="header-cta-quiz"
              class="px-4 py-2 text-sm font-semibold text-white bg-[#D95D16] hover:bg-[#B94A0E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D95D16]"
            >
              Ir a la victorina
            </button>
          </div>
        </div>
      </header>

      <main id="inicio" class="flex-1">
        <!-- Hero Section -->
        <section id="hero-mount" class="bg-white border-b border-[#EBDED3]"></section>

        <!-- PARTE I: TEXTO PARA ANALIZAR -->
        <section id="parte-1" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div id="reading-mount"></div>
        </section>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <hr class="border-[#EBDED3]" />
        </div>

        <!-- PARTE II: ANÁLISIS LITERARIO (30 PREGUNTAS) -->
        <section id="parte-2" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div id="analysis-mount"></div>
        </section>

        <!-- MODELO DE EXAMEN -->
        <section id="modelo-examen" class="bg-white border-y border-[#EBDED3] py-12 lg:py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div id="model-mount"></div>
          </div>
        </section>

        <!-- PARTE III: VICTORINA (20 PREGUNTAS) -->
        <section id="parte-3" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div id="quiz-mount"></div>
        </section>
      </main>

      <footer class="bg-white border-t border-[#EBDED3] py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-stone-600">
          <div>
            Examen de Lengua Castellana y Literatura · 1.º ESO · 7-րդ դասարան · Español + Հայերեն
          </div>
          <div class="flex items-center gap-6">
            <a href="#parte-1" class="hover:text-[#C2410C]">Lectura</a>
            <a href="#parte-2" class="hover:text-[#C2410C]">30 Preguntas</a>
            <a href="#parte-3" class="hover:text-[#C2410C]">Victorina</a>
          </div>
        </div>
      </footer>
    </div>
  `;

  document.getElementById('header-cta-quiz')?.addEventListener('click', () => {
    document.getElementById('parte-3')?.scrollIntoView({ behavior: 'smooth' });
  });

  renderHeroSection();
  renderReadingSection();
  renderAnalysisSection();
  renderModelSection();
  renderQuizSection();
}

/* ============================================================================
   HERO SECTION (Click Spanish -> Reveal Armenian)
   ============================================================================ */
function renderHeroSection() {
  const mount = document.getElementById('hero-mount');
  if (!mount) return;
  const stats = getQuizStats();
  const noteOpen = state.revealedArm.has('hero-note');

  mount.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <div class="lg:col-span-7 flex flex-col justify-between gap-6">
          <div class="space-y-4">
            <p class="text-sm sm:text-base font-semibold text-[#C2410C] tracking-normal">
              ${escapeHtml(EXAM_META.subTitle)}
            </p>
            <h1 class="font-serif-literary text-3xl sm:text-4xl lg:text-[2.9rem] font-semibold leading-[1.15] text-stone-900 text-balance">
              ${escapeHtml(EXAM_META.mainTitle)}
            </h1>

            <!-- Clickable Spanish methodological note -->
            <button
              type="button"
              data-arm-toggle="hero-note"
              aria-expanded="${noteOpen ? 'true' : 'false'}"
              class="w-full text-left group rounded-xl p-3.5 -ml-3.5 hover:bg-[#FFF3E8] transition-colors cursor-pointer"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="text-base sm:text-lg text-stone-700 leading-relaxed max-w-2xl">
                  ${escapeHtml(EXAM_META.methodNoteEs)}
                </p>
                <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] shrink-0 pt-1">
                  ${ICONS.translate}
                  <span>${noteOpen ? 'Թաքցնել' : 'Հայ'}</span>
                </span>
              </div>
              ${
                noteOpen
                  ? `<p class="mt-2.5 pt-2.5 border-t border-[#EBDED3] text-base text-stone-800 leading-relaxed">${escapeHtml(EXAM_META.methodNoteArm)}</p>`
                  : `<p class="mt-1 text-xs font-medium text-[#C2410C]/80">Pulsa cualquier texto en español para abrir su traducción al armenio</p>`
              }
            </button>
          </div>

          <!-- 8 literary criteria matrix (click Spanish to reveal Armenian) -->
          <div class="border border-[#EBDED3] rounded-xl bg-[#FFF9F4] p-4 sm:p-5">
            <p class="text-sm font-semibold text-stone-800 mb-3">
              Ejes del análisis literario · Pulsa para ver en armenio
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              ${EXAM_META.focusConcepts
                .map((item, idx) => {
                  const key = `focus-${idx}`;
                  const open = state.revealedArm.has(key);
                  return `
                  <button
                    type="button"
                    data-arm-toggle="${key}"
                    aria-expanded="${open ? 'true' : 'false'}"
                    class="w-full text-left py-2 px-2.5 rounded-lg border-b border-[#EBDED3]/80 hover:bg-[#FFF3E8] transition-colors cursor-pointer"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-base font-medium text-stone-900">${escapeHtml(item.es)}</span>
                      <span class="text-xs font-semibold text-[#C2410C] shrink-0">${open ? '−' : 'Հայ'}</span>
                    </div>
                    ${
                      open
                        ? `<div class="text-sm text-[#9A3412] mt-1">${escapeHtml(item.arm)}</div>`
                        : ''
                    }
                  </button>
                `;
                })
                .join('')}
            </div>
          </div>
        </div>

        <!-- Right Hero Illustration -->
        <div class="lg:col-span-5 flex flex-col">
          <figure class="flex-1 flex flex-col border border-[#EBDED3] rounded-xl overflow-hidden bg-[#FFF9F4]">
            <div class="relative flex-1 min-h-[260px] bg-gradient-to-br from-[#FFEDD5] via-[#FFF7ED] to-[#FDE6D2]">
              <img
                src="${heroImageUrl}"
                alt="Ilustración del patio escolar y el jardín comunitario rodeado de montañas"
                referrerpolicy="no-referrer"
                class="w-full h-full object-cover"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <div class="hidden absolute inset-0 flex-col items-center justify-center p-6 text-center text-[#C2410C]">
                ${ICONS.book}
                <span class="mt-2 font-serif-literary text-xl font-semibold">«El jardín de las pequeñas alegrías»</span>
              </div>
            </div>
            <figcaption class="px-4 py-3.5 bg-white border-t border-[#EBDED3] text-sm text-stone-600 flex items-center justify-between gap-3">
              <span>Lectura base · «El jardín de las pequeñas alegrías»</span>
              <span class="text-stone-500 font-medium whitespace-nowrap">1.º ESO</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <!-- 4-column KPI strip below hero split -->
      <div class="mt-8 pt-6 border-t border-[#EBDED3] grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div class="font-mono-num text-3xl font-semibold text-stone-900">18</div>
          <div class="text-sm text-stone-600 mt-0.5">Párrafos en prosa</div>
        </div>
        <div>
          <div class="font-mono-num text-3xl font-semibold text-stone-900">30</div>
          <div class="text-sm text-stone-600 mt-0.5">Preguntas de análisis</div>
        </div>
        <div>
          <div class="font-mono-num text-3xl font-semibold text-stone-900">01</div>
          <div class="text-sm text-stone-600 mt-0.5">Modelo de examen</div>
        </div>
        <div>
          <div id="hero-quiz-kpi" class="font-mono-num text-3xl font-semibold text-[#C2410C]">${stats.scoreDisplay}</div>
          <div class="text-sm text-stone-600 mt-0.5">Victorina interactiva</div>
        </div>
      </div>
    </div>
  `;

  mount.querySelectorAll('[data-arm-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-arm-toggle');
      if (!key) return;
      toggleArmKey(key);
      renderHeroSection();
    });
  });
}

function updateHeroQuizKpi() {
  const el = document.getElementById('hero-quiz-kpi');
  if (!el) return;
  el.textContent = getQuizStats().scoreDisplay;
}

/* ============================================================================
   PARTE I: TEXTO PARA ANALIZAR
   ============================================================================ */
function renderReadingSection() {
  const mount = document.getElementById('reading-mount');
  if (!mount) return;

  const fontClass =
    state.readingFontSize === 'sm'
      ? 'text-[17px] leading-[1.75]'
      : state.readingFontSize === 'lg'
        ? 'text-[22px] leading-[1.85]'
        : 'text-[19px] sm:text-[20px] leading-[1.8]';

  const stageMeta = {
    planteamiento: {
      label: 'Planteamiento · Սկիզբ',
      bg: 'bg-[#FFF3E8]',
      text: 'text-[#C2410C]'
    },
    nudo: {
      label: 'Nudo · Հանգույց',
      bg: 'bg-[#F8F4F0]',
      text: 'text-stone-700'
    },
    desenlace: {
      label: 'Desenlace · Հանգուցալուծում',
      bg: 'bg-[#FFEDD5]/65',
      text: 'text-[#9A3412]'
    }
  };

  const visibleParagraphs =
    state.activeStageFilter === 'all'
      ? READING_INFO.paragraphs
      : READING_INFO.paragraphs.filter((p) => p.stage === state.activeStageFilter);

  mount.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-[#C2410C] tracking-wide">${escapeHtml(READING_INFO.sectionTitle)}</p>
          <h2 class="font-serif-literary text-2xl sm:text-4xl font-semibold text-stone-900 mt-1 text-balance">
            ${escapeHtml(READING_INFO.title)}
          </h2>
          <p class="text-base text-stone-600 mt-1.5">${escapeHtml(READING_INFO.meta)}</p>
        </div>

        <!-- Reading toolbar -->
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            id="toggle-structure-lens"
            class="px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              state.showStructureLens
                ? 'bg-[#D95D16] text-white border-[#D95D16]'
                : 'bg-white text-stone-700 border-[#DECFC2] hover:border-stone-400'
            }"
          >
            Estructura: ${state.showStructureLens ? 'Visible' : 'Oculta'}
          </button>

          <div class="inline-flex items-center p-1 bg-[#F5EDE6] rounded-lg border border-[#EBDED3]" role="group" aria-label="Tamaño de letra">
            <button type="button" data-fontsize="sm" class="px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${state.readingFontSize === 'sm' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}">A-</button>
            <button type="button" data-fontsize="base" class="px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${state.readingFontSize === 'base' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}">Normal</button>
            <button type="button" data-fontsize="lg" class="px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${state.readingFontSize === 'lg' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}">A+</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Main reading sheet -->
        <article class="lg:col-span-8 bg-white border border-[#EBDED3] rounded-xl p-6 sm:p-8 lg:p-10 space-y-4">
          ${visibleParagraphs
            .map((p) => {
              const meta = stageMeta[p.stage];
              const highlightClass = state.showStructureLens ? meta.bg : 'bg-transparent';
              return `
              <div class="rounded-lg px-4 py-3 transition-colors ${highlightClass}">
                <div class="flex items-start gap-4">
                  <span class="font-mono-num text-sm font-medium text-stone-400 pt-1.5 select-none shrink-0">${p.num}</span>
                  <div class="flex-1 space-y-1">
                    ${
                      state.showStructureLens
                        ? `<div class="text-xs font-semibold ${meta.text}">${escapeHtml(meta.label)}</div>`
                        : ''
                    }
                    <p class="font-serif-literary text-stone-800 ${fontClass} max-w-[68ch]">
                      ${escapeHtml(p.text)}
                    </p>
                  </div>
                </div>
              </div>
            `;
            })
            .join('')}
        </article>

        <!-- Right Concept & Structure Deck -->
        <aside class="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div class="bg-white border border-[#EBDED3] rounded-xl p-5 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-base font-semibold text-stone-900">Mapa estructural</h3>
              ${
                state.activeStageFilter !== 'all'
                  ? `<button type="button" id="reset-stage-filter" class="text-sm font-medium text-[#C2410C] hover:underline cursor-pointer">Ver todo</button>`
                  : ''
              }
            </div>
            <p class="text-sm text-stone-600">
              Pulsa una parte para aislar sus párrafos en la lectura.
            </p>
            <div class="space-y-3">
              ${READING_INFO.structureLegend
                .map((st) => {
                  const active = state.activeStageFilter === st.id;
                  const armKey = `stage-${st.id}`;
                  const armOpen = state.revealedArm.has(armKey);
                  return `
                  <div class="rounded-lg border transition-colors ${
                    active
                      ? 'bg-[#FFF3E8] border-[#D95D16]'
                      : 'bg-[#FFF9F4] border-[#EBDED3]'
                  }">
                    <button
                      type="button"
                      data-stage-filter="${st.id}"
                      class="w-full text-left p-3.5 cursor-pointer"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-base font-semibold text-stone-900">${escapeHtml(st.labelEs)}</span>
                        <span class="font-mono-num text-xs text-stone-500 shrink-0">${escapeHtml(st.range)}</span>
                      </div>
                      <p class="text-sm text-stone-700 mt-1">${escapeHtml(st.descEs)}</p>
                    </button>
                    <div class="px-3.5 pb-3 pt-1 border-t border-[#EBDED3]/70">
                      <button
                        type="button"
                        data-arm-reading="${armKey}"
                        class="text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer"
                      >
                        ${armOpen ? 'Ocultar armenio' : 'Ver traducción al armenio'}
                      </button>
                      ${
                        armOpen
                          ? `<p class="text-sm text-stone-800 mt-1.5"><strong class="text-[#9A3412]">${escapeHtml(st.labelArm)}:</strong> ${escapeHtml(st.descArm)}</p>`
                          : ''
                      }
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>

          <!-- Click Spanish -> reveal Armenian glossary card -->
          <div class="bg-white border border-[#EBDED3] rounded-xl p-5 space-y-3">
            <div>
              <h3 class="text-base font-semibold text-stone-900">Vocabulario clave</h3>
              <p class="text-xs text-stone-500 mt-0.5">Pulsa cada término en español para ver su traducción</p>
            </div>
            <div class="divide-y divide-[#F2E8DF]">
              ${VOCAB_TERMS.map((item, idx) => {
                const key = `vocab-${idx}`;
                const open = state.revealedArm.has(key);
                return `
                  <button
                    type="button"
                    data-arm-reading="${key}"
                    aria-expanded="${open ? 'true' : 'false'}"
                    class="w-full text-left py-2.5 px-2 rounded-md hover:bg-[#FFF3E8] transition-colors cursor-pointer"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm sm:text-[15px] font-semibold text-stone-900">${escapeHtml(item.es)}</span>
                      <span class="text-xs font-semibold text-[#C2410C] shrink-0">${open ? '−' : 'Հայ'}</span>
                    </div>
                    ${
                      open
                        ? `<div class="text-sm text-[#9A3412] mt-1">${escapeHtml(item.arm)}</div>`
                        : ''
                    }
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  document.getElementById('toggle-structure-lens')?.addEventListener('click', () => {
    state.showStructureLens = !state.showStructureLens;
    renderReadingSection();
  });

  mount.querySelectorAll('[data-fontsize]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.readingFontSize = btn.getAttribute('data-fontsize') || 'base';
      renderReadingSection();
    });
  });

  mount.querySelectorAll('[data-stage-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-stage-filter');
      state.activeStageFilter = state.activeStageFilter === target ? 'all' : target;
      renderReadingSection();
    });
  });

  mount.querySelectorAll('[data-arm-reading]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-arm-reading');
      if (!key) return;
      toggleArmKey(key);
      renderReadingSection();
    });
  });

  document.getElementById('reset-stage-filter')?.addEventListener('click', () => {
    state.activeStageFilter = 'all';
    renderReadingSection();
  });
}

/* ============================================================================
   PARTE II: ANÁLISIS LITERARIO (30 PREGUNTAS)
   ============================================================================ */
function renderAnalysisSection() {
  const mount = document.getElementById('analysis-mount');
  if (!mount) return;

  mount.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-[#C2410C] tracking-wide">
            PARTE II. ANÁLISIS LITERARIO — ԳՐԱԿԱՆ ՎԵՐԼՈՒԾՈՒԹՅՈՒՆ
          </p>
          <h2 class="font-serif-literary text-2xl sm:text-4xl font-semibold text-stone-900 mt-1 text-balance">
            EXAMEN — ANÁLISIS LITERARIO CON RESPUESTAS
          </h2>
          <p class="text-base text-stone-600 mt-1.5">
            Texto: «El jardín de las pequeñas alegrías» · Pulsa cualquier texto en español para abrir su traducción al armenio
          </p>
        </div>

        <div id="analysis-mastery-readout" class="text-sm font-semibold text-stone-700 font-mono-num">
          Dominadas: ${state.masteredQuestions.size}/30
        </div>
      </div>

      <!-- Controls Bar -->
      <div class="bg-white border border-[#EBDED3] rounded-xl p-4 sm:p-5 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="reveal-all-btn"
              class="px-4 py-2 text-sm font-semibold text-white bg-[#D95D16] hover:bg-[#B94A0E] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Ver todas las respuestas
            </button>
            <button
              type="button"
              id="hide-all-btn"
              class="px-3.5 py-2 text-sm font-medium text-stone-700 bg-white border border-[#DECFC2] rounded-lg hover:bg-stone-50 cursor-pointer whitespace-nowrap"
            >
              Ocultar respuestas
            </button>
            <button
              type="button"
              id="toggle-all-arm-btn"
              class="px-3.5 py-2 text-sm font-medium text-[#C2410C] bg-[#FFF3E8] border border-[#D95D16]/30 rounded-lg hover:bg-[#FFEDD5] cursor-pointer whitespace-nowrap"
            >
              Abrir todo en armenio
            </button>
            <button
              type="button"
              id="hide-all-arm-btn"
              class="px-3.5 py-2 text-sm font-medium text-stone-700 bg-white border border-[#DECFC2] rounded-lg hover:bg-stone-50 cursor-pointer whitespace-nowrap"
            >
              Ocultar armenio
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative w-full lg:w-72">
            <input
              type="search"
              id="analysis-search-input"
              value="${escapeHtml(state.analysisSearch)}"
              placeholder="Buscar (ej. prosa, romance)..."
              class="w-full px-3.5 py-2 text-base bg-[#FFF9F4] border border-[#DECFC2] rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#D95D16] focus:bg-white"
            />
          </div>
        </div>

        <!-- Part Filter Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1" id="analysis-part-tabs">
          <button
            type="button"
            data-part="all"
            class="px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              state.analysisPartFilter === 'all'
                ? 'bg-[#D95D16] text-white'
                : 'bg-[#F5EDE6] text-stone-700 hover:bg-[#EADFD5]'
            }"
          >
            Todas (30)
          </button>
          ${ANALYSIS_PARTS.map(
            (part) => `
            <button
              type="button"
              data-part="${part.id}"
              class="px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                state.analysisPartFilter === part.id
                  ? 'bg-[#D95D16] text-white'
                  : 'bg-[#F5EDE6] text-stone-700 hover:bg-[#EADFD5]'
              }"
            >
              ${escapeHtml(part.shortLabel)} (${part.questions.length})
            </button>
          `
          ).join('')}
        </div>
      </div>

      <!-- Questions Mount -->
      <div id="analysis-questions-list" class="space-y-8"></div>
    </div>
  `;

  document.getElementById('toggle-all-arm-btn')?.addEventListener('click', () => {
    for (const part of ANALYSIS_PARTS) {
      state.revealedArm.add(`part-title-${part.id}`);
      for (const q of part.questions) {
        state.revealedArm.add(`q-arm-${q.num}`);
        state.revealedArm.add(`a-arm-${q.num}`);
      }
    }
    renderAnalysisQuestions();
  });

  document.getElementById('hide-all-arm-btn')?.addEventListener('click', () => {
    for (const part of ANALYSIS_PARTS) {
      state.revealedArm.delete(`part-title-${part.id}`);
      for (const q of part.questions) {
        state.revealedArm.delete(`q-arm-${q.num}`);
        state.revealedArm.delete(`a-arm-${q.num}`);
      }
    }
    renderAnalysisQuestions();
  });

  document.getElementById('reveal-all-btn')?.addEventListener('click', () => {
    for (const part of ANALYSIS_PARTS) {
      for (const q of part.questions) {
        state.revealedAnswers.add(q.num);
      }
    }
    renderAnalysisQuestions();
  });

  document.getElementById('hide-all-btn')?.addEventListener('click', () => {
    state.revealedAnswers.clear();
    renderAnalysisQuestions();
  });

  document.getElementById('analysis-search-input')?.addEventListener('input', (e) => {
    state.analysisSearch = e.target.value;
    renderAnalysisQuestions();
  });

  mount.querySelectorAll('[data-part]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.analysisPartFilter = btn.getAttribute('data-part') || 'all';
      updateAnalysisControlsUI();
      renderAnalysisQuestions();
    });
  });

  renderAnalysisQuestions();
}

function updateAnalysisControlsUI() {
  document.querySelectorAll('#analysis-part-tabs [data-part]').forEach((btn) => {
    const isActive = btn.getAttribute('data-part') === state.analysisPartFilter;
    btn.className = `px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isActive ? 'bg-[#D95D16] text-white' : 'bg-[#F5EDE6] text-stone-700 hover:bg-[#EADFD5]'
    }`;
  });
}

function renderAnalysisQuestions() {
  const container = document.getElementById('analysis-questions-list');
  if (!container) return;

  const query = state.analysisSearch.trim().toLowerCase();
  const filteredParts = ANALYSIS_PARTS.filter(
    (part) => state.analysisPartFilter === 'all' || part.id === state.analysisPartFilter
  )
    .map((part) => {
      const qs = part.questions.filter((q) => {
        if (!query) return true;
        const haystack = [
          q.qEs,
          q.qArm,
          q.aEs,
          q.aArm,
          ...(q.aEsList || []).map((x) => `${x.label} ${x.text}`),
          ...(q.aArmList || []).map((x) => `${x.label} ${x.text}`)
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
      return { ...part, questions: qs };
    })
    .filter((part) => part.questions.length > 0);

  if (filteredParts.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-[#EBDED3] rounded-xl p-8 text-center space-y-2">
        <p class="text-base font-medium text-stone-800">No se encontraron preguntas para «${escapeHtml(state.analysisSearch)}».</p>
        <button type="button" id="clear-analysis-search" class="text-sm font-semibold text-[#C2410C] hover:underline cursor-pointer">
          Limpiar búsqueda
        </button>
      </div>
    `;
    document.getElementById('clear-analysis-search')?.addEventListener('click', () => {
      state.analysisSearch = '';
      const input = document.getElementById('analysis-search-input');
      if (input) input.value = '';
      renderAnalysisQuestions();
    });
    return;
  }

  container.innerHTML = filteredParts
    .map((part) => {
      const partTitleKey = `part-title-${part.id}`;
      const partArmOpen = state.revealedArm.has(partTitleKey);
      return `
      <div class="space-y-4">
        <div class="pb-2 border-b border-[#EBDED3]">
          <button
            type="button"
            data-arm-analysis="${partTitleKey}"
            aria-expanded="${partArmOpen ? 'true' : 'false'}"
            class="w-full text-left flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 group cursor-pointer"
          >
            <h3 class="font-serif-literary text-2xl font-semibold text-stone-900 group-hover:text-[#C2410C] transition-colors">
              ${escapeHtml(part.titleEs)}
            </h3>
            <span class="text-sm font-semibold text-[#C2410C]">
              ${partArmOpen ? escapeHtml(part.titleArm) : 'Pulsa para ver título en armenio'}
            </span>
          </button>
        </div>

        <div class="grid grid-cols-1 gap-4">
          ${part.questions.map((q) => renderAnalysisQuestionCard(q)).join('')}
        </div>
      </div>
    `;
    })
    .join('');

  container.querySelectorAll('[data-arm-analysis]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-arm-analysis');
      if (!key) return;
      toggleArmKey(key);
      renderAnalysisQuestions();
    });
  });

  container.querySelectorAll('[data-toggle-reveal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = Number(btn.getAttribute('data-toggle-reveal'));
      if (state.revealedAnswers.has(num)) {
        state.revealedAnswers.delete(num);
      } else {
        state.revealedAnswers.add(num);
      }
      renderAnalysisQuestions();
    });
  });

  container.querySelectorAll('[data-toggle-mastered]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = Number(btn.getAttribute('data-toggle-mastered'));
      if (state.masteredQuestions.has(num)) {
        state.masteredQuestions.delete(num);
      } else {
        state.masteredQuestions.add(num);
      }
      saveState();
      const readout = document.getElementById('analysis-mastery-readout');
      if (readout) {
        readout.textContent = `Dominadas: ${state.masteredQuestions.size}/30`;
      }
      renderAnalysisQuestions();
    });
  });

  const summaryInput = document.getElementById('q30-summary-input');
  if (summaryInput) {
    summaryInput.addEventListener('input', (e) => {
      state.summaryDraft = e.target.value;
      saveState();
      updateSummaryWordCounter();
    });
  }
}

function renderAnalysisQuestionCard(q) {
  const isRevealed = state.revealedAnswers.has(q.num);
  const isMastered = state.masteredQuestions.has(q.num);
  const numStr = String(q.num).padStart(2, '0');

  const qArmKey = `q-arm-${q.num}`;
  const aArmKey = `a-arm-${q.num}`;
  const qArmOpen = state.revealedArm.has(qArmKey);
  const aArmOpen = state.revealedArm.has(aArmKey);

  let answerHtml = '';
  if (q.aEsList && q.aArmList) {
    answerHtml = `
      <div class="pt-4 border-t border-[#F2E8DF]">
        <button
          type="button"
          data-arm-analysis="${aArmKey}"
          aria-expanded="${aArmOpen ? 'true' : 'false'}"
          class="w-full text-left rounded-lg p-3 -mx-3 hover:bg-[#FFF3E8] transition-colors cursor-pointer space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-[#C2410C]">Respuesta (pulsa para ver en armenio)</span>
            <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C]">
              ${ICONS.translate}
              <span>${aArmOpen ? 'Թաքցնել' : 'Հայ'}</span>
            </span>
          </div>
          <ul class="space-y-1.5 text-base text-stone-800 leading-relaxed">
            ${q.aEsList
              .map(
                (item) =>
                  `<li><span class="font-semibold text-stone-900">${escapeHtml(item.label)}:</span> ${escapeHtml(item.text)}</li>`
              )
              .join('')}
          </ul>
          ${
            aArmOpen
              ? `
            <div class="mt-3 pt-3 border-t border-[#EBDED3] space-y-1.5">
              <div class="text-xs font-semibold text-[#9A3412]">Հայերեն</div>
              <ul class="space-y-1.5 text-base text-stone-800 leading-relaxed">
                ${q.aArmList
                  .map(
                    (item) =>
                      `<li><span class="font-semibold text-stone-900">${escapeHtml(item.label)}:</span> ${escapeHtml(item.text)}</li>`
                  )
                  .join('')}
              </ul>
            </div>
          `
              : ''
          }
        </button>
      </div>
    `;
  } else if (q.isSummaryPractice) {
    answerHtml = `
      <div class="pt-4 border-t border-[#F2E8DF]">
        <button
          type="button"
          data-arm-analysis="${aArmKey}"
          aria-expanded="${aArmOpen ? 'true' : 'false'}"
          class="w-full text-left rounded-lg p-3 -mx-3 hover:bg-[#FFF3E8] transition-colors cursor-pointer space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-[#C2410C]">${escapeHtml(q.aEsLabel || 'Respuesta:')} (pulsa para ver en armenio)</span>
            <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C]">
              ${ICONS.translate}
              <span>${aArmOpen ? 'Թաքցնել' : 'Հայ'}</span>
            </span>
          </div>
          <p class="text-base text-stone-800 leading-relaxed">${escapeHtml(q.aEs)}</p>
          ${
            aArmOpen
              ? `
            <div class="mt-3 pt-3 border-t border-[#EBDED3] space-y-1">
              <div class="text-xs font-semibold text-[#9A3412]">${escapeHtml(q.aArmLabel || 'Հայերեն:')}</div>
              <p class="text-base text-stone-800 leading-relaxed">${escapeHtml(q.aArm)}</p>
            </div>
          `
              : ''
          }
        </button>
      </div>
    `;
  } else {
    answerHtml = `
      <div class="pt-4 border-t border-[#F2E8DF]">
        <button
          type="button"
          data-arm-analysis="${aArmKey}"
          aria-expanded="${aArmOpen ? 'true' : 'false'}"
          class="w-full text-left rounded-lg p-3 -mx-3 hover:bg-[#FFF3E8] transition-colors cursor-pointer space-y-1.5"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-[#C2410C]">Respuesta (pulsa para ver en armenio)</span>
            <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C]">
              ${ICONS.translate}
              <span>${aArmOpen ? 'Թաքցնել' : 'Հայ'}</span>
            </span>
          </div>
          <p class="text-base sm:text-[17px] text-stone-800 leading-relaxed">${escapeHtml(q.aEs)}</p>
          ${
            aArmOpen
              ? `
            <div class="mt-2.5 pt-2.5 border-t border-[#EBDED3] space-y-1">
              <div class="text-xs font-semibold text-[#9A3412]">Հայերեն</div>
              <p class="text-base text-stone-800 leading-relaxed">${escapeHtml(q.aArm)}</p>
            </div>
          `
              : ''
          }
        </button>
      </div>
    `;
  }

  return `
    <div class="bg-white border border-[#EBDED3] rounded-xl p-5 sm:p-6 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <button
          type="button"
          data-arm-analysis="${qArmKey}"
          aria-expanded="${qArmOpen ? 'true' : 'false'}"
          class="flex-1 text-left flex items-start gap-3.5 rounded-lg p-2 -m-2 hover:bg-[#FFF3E8] transition-colors cursor-pointer"
        >
          <span class="font-mono-num text-base font-semibold text-[#C2410C] pt-0.5 shrink-0">${numStr}</span>
          <div class="flex-1 space-y-1.5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-base sm:text-[18px] font-semibold text-stone-900 leading-snug">${escapeHtml(q.qEs)}</p>
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] shrink-0 pt-1">
                ${ICONS.translate}
                <span>${qArmOpen ? 'Թաքցնել' : 'Հայ'}</span>
              </span>
            </div>
            ${
              qArmOpen
                ? `<p class="text-base text-[#9A3412] pt-1">${escapeHtml(q.qArm)}</p>`
                : ''
            }
          </div>
        </button>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-toggle-reveal="${q.num}"
            aria-expanded="${isRevealed ? 'true' : 'false'}"
            class="px-4 py-2 text-sm font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              isRevealed
                ? 'bg-[#F5EDE6] text-stone-800 border-[#DECFC2] hover:bg-[#EADFD5]'
                : 'bg-[#D95D16] text-white border-[#D95D16] hover:bg-[#B94A0E]'
            }"
          >
            ${isRevealed ? 'Ocultar respuesta' : 'Ver respuesta'}
          </button>
          <button
            type="button"
            data-toggle-mastered="${q.num}"
            title="${isMastered ? 'Marcada como dominada' : 'Marcar como dominada'}"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              isMastered
                ? 'bg-[#FFF3E8] text-[#C2410C] border-[#D95D16]/40'
                : 'bg-white text-stone-600 border-[#EBDED3] hover:text-stone-900 hover:border-stone-400'
            }"
          >
            ${ICONS.check}
            <span>${isMastered ? 'Dominada' : 'Marcar'}</span>
          </button>
        </div>
      </div>

      ${
        q.isSummaryPractice
          ? (() => {
              const wc = countWords(state.summaryDraft);
              const wcStatus = getWordCountStatus(wc);
              return `
          <div class="bg-[#FFF9F4] border border-[#EBDED3] rounded-lg p-4 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label for="q30-summary-input" class="text-sm font-semibold text-stone-800">
                Practica tu resumen en español (80–100 palabras)
              </label>
              <div class="flex items-center gap-2 text-sm">
                <span id="q30-word-count" class="font-mono-num font-semibold text-stone-900">${wc} palabras</span>
                <span class="text-stone-300">·</span>
                <span id="q30-word-status" class="font-medium ${wcStatus.colorClass}">${escapeHtml(wcStatus.label)}</span>
              </div>
            </div>
            <textarea
              id="q30-summary-input"
              rows="4"
              placeholder="Escribe aquí tu resumen de «El jardín de las pequeñas alegrías» en español..."
              class="w-full p-3.5 text-base bg-white border border-[#DECFC2] rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#D95D16]"
            >${escapeHtml(state.summaryDraft)}</textarea>
          </div>
        `;
            })()
          : ''
      }

      ${isRevealed ? answerHtml : ''}
    </div>
  `;
}

function getWordCountStatus(wc) {
  if (wc === 0) return { label: 'Objetivo: 80–100 palabras', colorClass: 'text-stone-500' };
  if (wc < 80) return { label: `Faltan ${80 - wc} palabras`, colorClass: 'text-amber-700' };
  if (wc <= 100) return { label: 'En rango óptimo (80–100)', colorClass: 'text-emerald-700' };
  return { label: `Excede por ${wc - 100} palabras`, colorClass: 'text-rose-700' };
}

function updateSummaryWordCounter() {
  const wc = countWords(state.summaryDraft);
  const wcStatus = getWordCountStatus(wc);
  const countEl = document.getElementById('q30-word-count');
  const statusEl = document.getElementById('q30-word-status');
  if (countEl) countEl.textContent = `${wc} palabras`;
  if (statusEl) {
    statusEl.textContent = wcStatus.label;
    statusEl.className = `font-medium ${wcStatus.colorClass}`;
  }
}

/* ============================================================================
   MODELO PARA MEMORIZAR (Click ES -> reveal Armenian)
   ============================================================================ */
function formatCloakedEs(text) {
  if (!state.cloakKeywords) return escapeHtml(text);
  const terms = [
    'literatura culta o de autor',
    'género narrativo',
    'prosa',
    'párrafos',
    'narrador externo en tercera persona',
    'planteamiento, nudo y desenlace',
    'narración',
    'descripciones',
    'sencillo y comprensible'
  ];
  let result = escapeHtml(text);
  for (const term of terms) {
    const escapedTerm = escapeHtml(term);
    const regex = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(
      regex,
      '<span class="inline-block px-2 py-0.5 mx-0.5 rounded bg-[#FFEDD5] text-transparent select-none border-b border-[#D95D16]" title="Término clave oculto">$1</span>'
    );
  }
  return result;
}

function renderModelSection() {
  const mount = document.getElementById('model-mount');
  if (!mount) return;

  const modelArmOpen = state.revealedArm.has('model-text');
  const tipArmOpen = state.revealedArm.has('model-tip');

  mount.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-[#C2410C] tracking-wide">
            ${escapeHtml(MODEL_RESPONSE.titleEs)} · ${escapeHtml(MODEL_RESPONSE.titleArm)}
          </p>
          <h2 class="font-serif-literary text-2xl sm:text-4xl font-semibold text-stone-900 mt-1 text-balance">
            Análisis literario completo
          </h2>
          <p class="text-base text-stone-600 mt-1.5">${escapeHtml(MODEL_RESPONSE.subtitle)}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="toggle-cloak-model"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              state.cloakKeywords
                ? 'bg-[#D95D16] text-white border-[#D95D16]'
                : 'bg-white text-stone-700 border-[#DECFC2] hover:border-stone-400'
            }"
          >
            ${ICONS.eye}
            <span>${state.cloakKeywords ? 'Mostrar términos clave' : 'Ocultar términos clave'}</span>
          </button>

          <button
            type="button"
            id="copy-model-es"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#DECFC2] bg-white text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            ${ICONS.copy}
            <span>${state.copiedModel ? 'Copiado' : 'Copiar texto ES'}</span>
          </button>
        </div>
      </div>

      <!-- Clickable Spanish Model Box -> Opens Armenian -->
      <div class="bg-[#FFF9F4] border border-[#EBDED3] rounded-xl p-6 sm:p-8 space-y-4">
        <button
          type="button"
          data-arm-model="model-text"
          aria-expanded="${modelArmOpen ? 'true' : 'false'}"
          class="w-full text-left space-y-3 cursor-pointer group"
        >
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-base font-semibold text-[#C2410C]">${escapeHtml(MODEL_RESPONSE.esTitle)}</h3>
            <span class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#C2410C]">
              ${ICONS.translate}
              <span>${modelArmOpen ? 'Ocultar armenio' : 'Pulsa para ver en armenio'}</span>
            </span>
          </div>
          <p class="font-serif-literary text-lg sm:text-[20px] leading-[1.8] text-stone-900">
            ${formatCloakedEs(MODEL_RESPONSE.esText)}
          </p>
        </button>

        ${
          modelArmOpen
            ? `
          <div class="pt-5 border-t border-[#EBDED3] space-y-2">
            <h4 class="text-base font-semibold text-[#9A3412]">${escapeHtml(MODEL_RESPONSE.armTitle)}</h4>
            <p class="text-base sm:text-lg leading-[1.8] text-stone-800">
              ${escapeHtml(MODEL_RESPONSE.armText)}
            </p>
          </div>
        `
            : ''
        }
      </div>

      <!-- Exam Justification Rule (Click ES -> Reveal Armenian) -->
      <button
        type="button"
        data-arm-model="model-tip"
        aria-expanded="${tipArmOpen ? 'true' : 'false'}"
        class="w-full text-left bg-[#FFF3E8] border border-[#D95D16]/30 hover:border-[#D95D16] rounded-xl p-5 sm:p-6 space-y-2 transition-colors cursor-pointer"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold text-[#C2410C]">Regla clave para el examen</span>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C]">
            ${ICONS.translate}
            <span>${tipArmOpen ? 'Թաքցնել' : 'Հայ'}</span>
          </span>
        </div>
        <p class="text-base sm:text-lg text-stone-900 font-medium">${escapeHtml(MODEL_RESPONSE.examTipEs)}</p>
        ${
          tipArmOpen
            ? `<p class="text-base text-[#9A3412] pt-2 border-t border-[#D95D16]/20">${escapeHtml(MODEL_RESPONSE.examTipArm)}</p>`
            : ''
        }
      </button>
    </div>
  `;

  mount.querySelectorAll('[data-arm-model]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-arm-model');
      if (!key) return;
      toggleArmKey(key);
      renderModelSection();
    });
  });

  document.getElementById('toggle-cloak-model')?.addEventListener('click', () => {
    state.cloakKeywords = !state.cloakKeywords;
    renderModelSection();
  });

  document.getElementById('copy-model-es')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(MODEL_RESPONSE.esText);
      state.copiedModel = true;
      renderModelSection();
      setTimeout(() => {
        state.copiedModel = false;
        renderModelSection();
      }, 2000);
    } catch {
      // Clipboard fallback ignored
    }
  });
}

/* ============================================================================
   PARTE III: VICTORINA — 20 PREGUNTAS
   ============================================================================ */
function renderQuizSection() {
  const mount = document.getElementById('quiz-mount');
  if (!mount) return;

  const stats = getQuizStats();
  const visibleQuestions =
    state.quizGraded && state.quizFilter === 'wrong'
      ? QUIZ_QUESTIONS.filter((q) => state.quizSelections[q.num] !== q.correct)
      : QUIZ_QUESTIONS;

  mount.innerHTML = `
    <div class="space-y-6">
      <!-- Quiz Header & Score Readout -->
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-[#C2410C] tracking-wide">
            PARTE III. VICTORINA — 20 PREGUNTAS
          </p>
          <h2 class="font-serif-literary text-2xl sm:text-4xl font-semibold text-stone-900 mt-1 text-balance">
            Análisis del texto · Test
          </h2>
          <p class="text-base text-stone-600 mt-1.5">
            Pulsa la pregunta o el botón <span class="font-semibold text-[#C2410C]">Հայ</span> de cada opción para abrir su traducción al armenio
          </p>
        </div>

        <div class="flex items-center gap-6 bg-white border border-[#EBDED3] rounded-xl px-5 py-3.5 shrink-0">
          <div>
            <div class="text-xs text-stone-500">Puntuación</div>
            <div class="font-mono-num text-2xl font-semibold text-stone-900">${
              state.quizGraded || state.quizInstantCheck ? `${stats.correct}/${stats.total}` : stats.scoreDisplay
            }</div>
          </div>
          <div class="h-8 w-px bg-[#EBDED3]"></div>
          <div>
            <div class="text-xs text-stone-500">Respondidas</div>
            <div class="font-mono-num text-xl font-medium text-stone-700">${stats.answered}/${stats.total}</div>
          </div>
          ${
            state.quizGraded
              ? `
            <div class="h-8 w-px bg-[#EBDED3]"></div>
            <div>
              <div class="text-xs text-stone-500">Nota (1.º ESO)</div>
              <div class="font-mono-num text-xl font-semibold text-[#C2410C]">${stats.grade10} / 10</div>
            </div>
          `
              : ''
          }
        </div>
      </div>

      ${state.quizGraded ? renderQuizSummaryBanner(stats) : ''}

      <!-- Quick question map 1..20 + Instant Check Switch -->
      <div class="bg-white border border-[#EBDED3] rounded-xl p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-1.5">
            ${QUIZ_QUESTIONS.map((q) => {
              const sel = state.quizSelections[q.num];
              const isChecked = state.quizGraded || (state.quizInstantCheck && Boolean(sel));
              let btnStyle = 'bg-[#F5EDE6] text-stone-700 border-transparent hover:border-[#D95D16]/40';
              if (isChecked) {
                if (sel === q.correct) {
                  btnStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                } else if (sel) {
                  btnStyle = 'bg-rose-50 text-rose-800 border-rose-300';
                } else {
                  btnStyle = 'bg-amber-50 text-amber-800 border-amber-300';
                }
              } else if (sel) {
                btnStyle = 'bg-[#FFF3E8] text-[#C2410C] border-[#D95D16]/50';
              }
              return `
                <a
                  href="#quiz-q-${q.num}"
                  class="w-9 h-9 inline-flex items-center justify-center rounded-md border font-mono-num text-sm font-medium transition-colors ${btnStyle}"
                >
                  ${q.num}
                </a>
              `;
            }).join('')}
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <div class="inline-flex items-center p-1 bg-[#F5EDE6] rounded-lg border border-[#EBDED3]" role="group" aria-label="Modo de corrección">
              <button
                type="button"
                id="quiz-mode-exam"
                class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md cursor-pointer transition-colors ${
                  !state.quizInstantCheck ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }"
              >
                Al finalizar
              </button>
              <button
                type="button"
                id="quiz-mode-instant"
                class="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md cursor-pointer transition-colors ${
                  state.quizInstantCheck ? 'bg-white text-[#C2410C] shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }"
              >
                Comprobar al instante
              </button>
            </div>

            ${
              state.quizGraded
                ? `
              <div class="inline-flex items-center p-1 bg-[#F5EDE6] rounded-lg border border-[#EBDED3]">
                <button type="button" data-quiz-filter="all" class="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md cursor-pointer ${state.quizFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'}">
                  Todas (20)
                </button>
                <button type="button" data-quiz-filter="wrong" class="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md cursor-pointer ${state.quizFilter === 'wrong' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'}">
                  Falladas / Sin responder (${stats.total - stats.correct})
                </button>
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>

      <!-- Questions Grid -->
      <div class="space-y-4">
        ${
          visibleQuestions.length === 0
            ? `
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-base font-medium text-emerald-900">
            ¡Has respondido correctamente a las 20 preguntas! · Բոլոր 20 հարցերին պատասխանել ես ճիշտ։
          </div>
        `
            : visibleQuestions.map((q) => renderQuizQuestionCard(q)).join('')
        }
      </div>

      <!-- Bottom Action Buttons -->
      <div class="bg-white border border-[#EBDED3] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-base text-stone-700">
          ${
            state.quizGraded
              ? `Resultado final: <strong class="font-mono-num text-stone-900">${stats.correct}/20</strong> (${stats.grade10} / 10)`
              : `Has respondido <strong class="font-mono-num text-stone-900">${stats.answered}</strong> de <strong class="font-mono-num text-stone-900">20</strong> preguntas.`
          }
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            id="btn-corregir-examen"
            class="flex-1 sm:flex-initial px-6 py-3 text-base font-semibold text-white bg-[#D95D16] hover:bg-[#B94A0E] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Corregir examen
          </button>
          <button
            type="button"
            id="btn-reiniciar-examen"
            class="flex-1 sm:flex-initial px-5 py-3 text-base font-semibold text-stone-700 bg-white border border-[#DECFC2] hover:bg-stone-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Reiniciar
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('quiz-mode-exam')?.addEventListener('click', () => {
    state.quizInstantCheck = false;
    renderQuizSection();
  });

  document.getElementById('quiz-mode-instant')?.addEventListener('click', () => {
    state.quizInstantCheck = true;
    renderQuizSection();
  });

  mount.querySelectorAll('[data-arm-quiz]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.getAttribute('data-arm-quiz');
      if (!key) return;
      toggleArmKey(key);
      renderQuizSection();
    });
  });

  mount.querySelectorAll('[data-quiz-q][data-quiz-opt]').forEach((el) => {
    el.addEventListener('click', () => {
      const qNum = Number(el.getAttribute('data-quiz-q'));
      const opt = el.getAttribute('data-quiz-opt');
      if (!qNum || !opt) return;
      state.quizSelections[qNum] = opt;
      saveState();
      renderQuizSection();
      updateHeroQuizKpi();
    });
  });

  mount.querySelectorAll('[data-quiz-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.quizFilter = btn.getAttribute('data-quiz-filter') || 'all';
      renderQuizSection();
    });
  });

  document.getElementById('btn-corregir-examen')?.addEventListener('click', () => {
    state.quizGraded = true;
    state.quizFilter = 'all';
    saveState();
    renderQuizSection();
    updateHeroQuizKpi();
    document.getElementById('parte-3')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-reiniciar-examen')?.addEventListener('click', () => {
    state.quizSelections = {};
    state.quizGraded = false;
    state.quizFilter = 'all';
    saveState();
    renderQuizSection();
    updateHeroQuizKpi();
    document.getElementById('parte-3')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function renderQuizSummaryBanner(stats) {
  const passed = stats.correct >= 10;
  return `
    <div class="rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
      passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
    }">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 ${passed ? 'text-emerald-700' : 'text-amber-700'}">
          ${passed ? ICONS.check : ICONS.alert}
        </div>
        <div class="space-y-1">
          <div class="text-base font-semibold ${passed ? 'text-emerald-950' : 'text-amber-950'}">
            Examen corregido: ${stats.correct}/20 aciertos (Nota ${stats.grade10} / 10)
          </div>
          <p class="text-sm ${passed ? 'text-emerald-800' : 'text-amber-800'}">
            Revisa debajo cada pregunta: si fallaste alguna, verás por qué tu opción es incorrecta y cuál es la justificación correcta. Pulsa sobre la explicación para verla en armenio.
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderQuizQuestionCard(q) {
  const chosen = state.quizSelections[q.num];
  const showFeedback = state.quizGraded || (state.quizInstantCheck && Boolean(chosen));
  const isCorrect = showFeedback && chosen === q.correct;
  const isWrong = showFeedback && chosen && chosen !== q.correct;
  const isUnanswered = state.quizGraded && !chosen;

  const qArmKey = `quiz-q-arm-${q.num}`;
  const expArmKey = `quiz-exp-arm-${q.num}`;
  const qArmOpen = state.revealedArm.has(qArmKey);
  const expArmOpen = state.revealedArm.has(expArmKey);

  const chosenObj = chosen ? q.options.find((o) => o.letter === chosen) : null;

  let statusTag = '';
  if (isCorrect) {
    statusTag = `
      <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 shrink-0">
        ${ICONS.check}
        <span>Correcto</span>
      </span>
    `;
  } else if (isWrong) {
    statusTag = `
      <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 shrink-0">
        ${ICONS.cross}
        <span>Incorrecto</span>
      </span>
    `;
  } else if (isUnanswered) {
    statusTag = `
      <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 shrink-0">
        ${ICONS.alert}
        <span>Sin responder</span>
      </span>
    `;
  }

  return `
    <div id="quiz-q-${q.num}" class="bg-white border border-[#EBDED3] rounded-xl p-5 sm:p-6 space-y-4 scroll-mt-24">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <button
          type="button"
          data-arm-quiz="${qArmKey}"
          aria-expanded="${qArmOpen ? 'true' : 'false'}"
          class="flex-1 text-left flex items-start gap-3 rounded-lg p-2 -m-2 hover:bg-[#FFF3E8] transition-colors cursor-pointer"
        >
          <span class="font-mono-num text-base font-semibold text-[#C2410C] pt-0.5 shrink-0">${String(q.num).padStart(2, '0')}</span>
          <div class="flex-1 space-y-1">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-base sm:text-[18px] font-semibold text-stone-900 leading-snug">${escapeHtml(q.qEs)}</h3>
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] shrink-0 pt-1">
                ${ICONS.translate}
                <span>${qArmOpen ? 'Թաքցնել' : 'Հայ'}</span>
              </span>
            </div>
            ${
              qArmOpen
                ? `<p class="text-base text-[#9A3412] pt-1">${escapeHtml(q.qArm)}</p>`
                : ''
            }
          </div>
        </button>
        ${statusTag}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${q.options
          .map((opt) => {
            const selected = chosen === opt.letter;
            const optionIsCorrect = opt.letter === q.correct;
            const optArmKey = `quiz-opt-arm-${q.num}-${opt.letter}`;
            const optArmOpen = state.revealedArm.has(optArmKey);

            let optionClasses =
              'bg-[#FFF9F4] border-[#EBDED3] text-stone-800 hover:border-[#D95D16]/60 hover:bg-white';
            let letterClasses = 'bg-white border-[#DECFC2] text-stone-700';

            if (!showFeedback && selected) {
              optionClasses = 'bg-[#FFF3E8] border-[#D95D16] text-stone-900';
              letterClasses = 'bg-[#D95D16] border-[#D95D16] text-white';
            } else if (showFeedback) {
              if (optionIsCorrect) {
                optionClasses = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                letterClasses = 'bg-emerald-600 border-emerald-600 text-white';
              } else if (selected && !optionIsCorrect) {
                optionClasses = 'bg-rose-50 border-rose-400 text-rose-950';
                letterClasses = 'bg-rose-600 border-rose-600 text-white';
              } else {
                optionClasses = 'bg-stone-50 border-stone-200 text-stone-500';
                letterClasses = 'bg-white border-stone-200 text-stone-400';
              }
            }

            return `
            <div
              class="min-h-[52px] w-full rounded-lg border transition-colors flex items-stretch ${optionClasses}"
            >
              <button
                type="button"
                data-quiz-q="${q.num}"
                data-quiz-opt="${opt.letter}"
                aria-pressed="${selected ? 'true' : 'false'}"
                class="flex-1 text-left px-4 py-3 flex items-start gap-3 cursor-pointer"
              >
                <span class="font-mono-num text-sm font-semibold w-7 h-7 rounded border inline-flex items-center justify-center shrink-0 mt-0.5 ${letterClasses}">
                  ${opt.letter}
                </span>
                <div class="flex-1 space-y-1">
                  <span class="block text-[15.5px] sm:text-base leading-snug">${escapeHtml(opt.text)}</span>
                  ${
                    optArmOpen && opt.arm
                      ? `<span class="block text-sm text-[#9A3412] font-medium pt-0.5">${escapeHtml(opt.arm)}</span>`
                      : ''
                  }
                </div>
              </button>

              <button
                type="button"
                data-arm-quiz="${optArmKey}"
                aria-expanded="${optArmOpen ? 'true' : 'false'}"
                title="Traducir opción ${opt.letter} al armenio"
                class="px-3 py-2 border-l border-[#EBDED3]/80 flex items-center justify-center gap-1 text-xs font-semibold text-[#C2410C] hover:bg-[#FFF3E8] rounded-r-lg transition-colors cursor-pointer shrink-0"
              >
                <span>${optArmOpen ? '−' : 'Հայ'}</span>
              </button>
            </div>
          `;
          })
          .join('')}
      </div>

      ${
        showFeedback
          ? `
        <div class="pt-3 border-t border-[#F2E8DF]">
          <button
            type="button"
            data-arm-quiz="${expArmKey}"
            aria-expanded="${expArmOpen ? 'true' : 'false'}"
            class="w-full text-left rounded-lg p-3.5 transition-colors cursor-pointer space-y-2 ${
              isWrong
                ? 'bg-rose-50/80 border border-rose-200 hover:bg-rose-50'
                : isUnanswered
                  ? 'bg-amber-50/80 border border-amber-200 hover:bg-amber-50'
                  : 'bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-50'
            }"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1.5 text-sm sm:text-base">
                ${
                  isWrong && chosenObj && chosenObj.wrongEs
                    ? `<div class="font-semibold text-rose-900">Tu respuesta (${chosen}) es incorrecta: ${escapeHtml(chosenObj.wrongEs)}</div>`
                    : ''
                }
                <div class="font-semibold ${isWrong ? 'text-emerald-900' : 'text-stone-900'}">
                  Respuesta correcta (${q.correct}): ${escapeHtml(q.explainEs)}
                </div>
              </div>
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] shrink-0 pt-0.5">
                ${ICONS.translate}
                <span>${expArmOpen ? 'Թաքցնել' : 'Հայ'}</span>
              </span>
            </div>
            ${
              expArmOpen
                ? `
              <div class="pt-2 border-t border-black/10 space-y-1 text-sm sm:text-base text-[#9A3412]">
                ${
                  isWrong && chosenObj && chosenObj.wrongArm
                    ? `<div><strong>Սխալի բացատրությունը (${chosen}).</strong> ${escapeHtml(chosenObj.wrongArm)}</div>`
                    : ''
                }
                <div><strong>Ճիշտ պատասխանը (${q.correct}).</strong> ${escapeHtml(q.explainArm)}</div>
              </div>
            `
                : ''
            }
          </button>
        </div>
      `
          : ''
      }
    </div>
  `;
}

// Initialize app
loadSavedState();
renderShell();
