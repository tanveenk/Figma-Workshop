/**
 * FALL HACKS 2026 - Interactive Application Engine
 * Implements full client-side interactivity, SPA routing, physics playground,
 * real-time schedule filtering, calendar sync, accessible forms with modern validation,
 * digital hacker badge generation, and modal dialogs.
 */

(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const state = {
    currentView: 'home',
    bookmarks: JSON.parse(localStorage.getItem('fallhacks_bookmarks') || '[]'),
    registeredHacker: JSON.parse(localStorage.getItem('fallhacks_registration') || 'null'),
    audioEnabled: localStorage.getItem('fallhacks_audio') === 'true',
    scheduleFilter: 'all',
    searchQuery: '',
    onlyBookmarks: false,
    simulatedHour: null, // null = live countdown mode
  };

  // ---------------------------------------------------------------------------
  // WEB AUDIO SYNTHESIZER (Zero external assets, works 100% offline)
  // ---------------------------------------------------------------------------
  class SoundFX {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playClick() {
      if (!state.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(720, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      } catch (e) {
        // audio context silent fail
      }
    }

    playSuccess() {
      if (!state.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.22);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + idx * 0.07);
          osc.stop(this.ctx.currentTime + idx * 0.07 + 0.22);
        });
      } catch (e) {}
    }

    playPop() {
      if (!state.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(840, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      } catch (e) {}
    }
  }

  const sfx = new SoundFX();

  // ---------------------------------------------------------------------------
  // TOAST NOTIFICATIONS SYSTEM
  // ---------------------------------------------------------------------------
  function showToast(message, icon = '✓') {
    const shelf = document.getElementById('toastShelf');
    if (!shelf) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<span style="color:var(--primary-orange);font-weight:bold;">${icon}</span> <span>${message}</span>`;
    shelf.appendChild(toast);
    sfx.playClick();
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3400);
  }

  // ---------------------------------------------------------------------------
  // SPA ROUTING & NAVIGATION
  // ---------------------------------------------------------------------------
  const views = ['home', 'schedule', 'sponsors', 'register'];

  function navigateTo(viewName, updateHistory = true) {
    if (!views.includes(viewName)) viewName = 'home';
    state.currentView = viewName;

    // Update active nav links
    document.querySelectorAll('.nav-center .nav-link, .mobile-nav-link').forEach(link => {
      const target = link.getAttribute('data-view');
      const isActive = target === viewName;
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Update view panels
    document.querySelectorAll('.page-view').forEach(panel => {
      const panelView = panel.getAttribute('data-view-id');
      const isActive = panelView === viewName;
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', !isActive);
    });

    // Close mobile menu if open
    const drawer = document.getElementById('mobileMenuDrawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('hidden', '');
    }

    // Update URL hash
    if (updateHistory) {
      if (window.location.hash !== `#${viewName}`) {
        history.pushState({ view: viewName }, '', `#${viewName}`);
      }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Custom titles
    const titles = {
      home: 'Fall Hacks 2026 · Build, Learn, Connect',
      schedule: 'Event Schedule · Fall Hacks 2026',
      sponsors: 'Our Sponsors · Fall Hacks 2026',
      register: 'Register Now · Fall Hacks 2026'
    };
    document.title = titles[viewName] || 'Fall Hacks 2026';

    sfx.playClick();
  }

  window.addEventListener('popstate', (e) => {
    const hash = window.location.hash.replace('#', '') || 'home';
    navigateTo(hash, false);
  });

  // ---------------------------------------------------------------------------
  // INTERACTIVE HERO GRAPHIC CANVAS (Geometric Playground)
  // ---------------------------------------------------------------------------
  function initHeroCanvas() {
    const canvas = document.getElementById('heroInteractiveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    // Exact shape configurations from Figma specs & user screenshot:
    // Box dimensions: 271 x 311
    // Orange circle: cx=101, cy=82, r=62, #F2712B, with circular highlight at (cx-22, cy-18), r=14.5
    // Gold circle: cx=193, cy=160, r=43, #F7B93E
    // Coral capsule: x=28, y=210, w=147, h=44, rx=22, #E8A9A3
    // Sage circle: cx=217, cy=244, r=20, #A8C5A0
    const shapes = [
      {
        id: 'orange-circle',
        type: 'circle',
        x: 101,
        y: 82,
        baseX: 101,
        baseY: 82,
        r: 62,
        color: '#F2712B',
        hasHighlight: true,
        vx: 0,
        vy: 0,
        isDragging: false,
        name: 'Build'
      },
      {
        id: 'gold-circle',
        type: 'circle',
        x: 193,
        y: 160,
        baseX: 193,
        baseY: 160,
        r: 43,
        color: '#F7B93E',
        hasHighlight: false,
        vx: 0,
        vy: 0,
        isDragging: false,
        name: 'Learn'
      },
      {
        id: 'coral-capsule',
        type: 'capsule',
        x: 28,
        y: 210,
        baseX: 28,
        baseY: 210,
        w: 147,
        h: 44,
        rx: 22,
        color: '#E8A9A3',
        vx: 0,
        vy: 0,
        isDragging: false,
        name: 'Connect'
      },
      {
        id: 'sage-circle',
        type: 'circle',
        x: 217,
        y: 244,
        baseX: 217,
        baseY: 244,
        r: 20,
        color: '#A8C5A0',
        hasHighlight: false,
        vx: 0,
        vy: 0,
        isDragging: false,
        name: 'Ship'
      }
    ];

    let mouse = { x: -100, y: -100, down: false };
    let draggedShape = null;
    let dragOffset = { x: 0, y: 0 };
    const sparkles = [];

    function addSparkles(x, y, color) {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        sparkles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          size: 3 + Math.random() * 3
        });
      }
    }

    function pointInShape(px, py, shape) {
      if (shape.type === 'circle') {
        const dx = px - shape.x;
        const dy = py - shape.y;
        return dx * dx + dy * dy <= shape.r * shape.r;
      } else if (shape.type === 'capsule') {
        return (
          px >= shape.x &&
          px <= shape.x + shape.w &&
          py >= shape.y &&
          py <= shape.y + shape.h
        );
      }
      return false;
    }

    // Pointer events on canvas
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      mouse.x = px;
      mouse.y = py;
      mouse.down = true;

      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        if (pointInShape(px, py, s)) {
          draggedShape = s;
          s.isDragging = true;
          dragOffset.x = px - s.x;
          dragOffset.y = py - s.y;
          addSparkles(px, py, s.color);
          sfx.playPop();
          canvas.setPointerCapture(e.pointerId);
          break;
        }
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      mouse.x = px;
      mouse.y = py;

      if (draggedShape) {
        draggedShape.x = px - dragOffset.x;
        draggedShape.y = py - dragOffset.y;
        draggedShape.vx = 0;
        draggedShape.vy = 0;
      }
    });

    const releasePointer = () => {
      if (draggedShape) {
        draggedShape.isDragging = false;
        // give a gentle spring release velocity
        draggedShape.vx = (draggedShape.baseX - draggedShape.x) * 0.08;
        draggedShape.vy = (draggedShape.baseY - draggedShape.y) * 0.08;
        draggedShape = null;
      }
      mouse.down = false;
    };

    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);

    let animTime = 0;

    function render() {
      ctx.clearRect(0, 0, width, height);
      animTime += 0.03;

      // Update & Draw Shapes
      shapes.forEach((s) => {
        if (!s.isDragging) {
          // Soft floating idle motion around base coordinate
          const idleX = Math.sin(animTime + s.baseX * 0.04) * 2;
          const idleY = Math.cos(animTime + s.baseY * 0.04) * 2;

          // Spring pull towards base
          const targetX = s.baseX + idleX;
          const targetY = s.baseY + idleY;
          s.vx = (s.vx + (targetX - s.x) * 0.08) * 0.85;
          s.vy = (s.vy + (targetY - s.y) * 0.08) * 0.85;
          s.x += s.vx;
          s.y += s.vy;
        }

        // Draw Shape
        ctx.save();
        ctx.fillStyle = s.color;

        if (s.type === 'circle') {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();

          // Highlight bubble on the orange circle matching user screenshot
          if (s.hasHighlight) {
            ctx.beginPath();
            ctx.arc(s.x - 22, s.y - 18, 14.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.33)';
            ctx.fill();
          }
        } else if (s.type === 'capsule') {
          ctx.beginPath();
          ctx.roundRect(s.x, s.y, s.w, s.h, s.rx);
          ctx.fill();
        }
        ctx.restore();
      });

      // Update and Draw Sparkles
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const p = sparkles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.alpha -= 0.025;
        if (p.alpha <= 0) {
          sparkles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(render);
    }

    render();
  }

  // ---------------------------------------------------------------------------
  // LIVE REAL-TIME COUNTDOWN
  // Target: November 7, 2026, 09:00:00 PST (SFU Burnaby)
  // ---------------------------------------------------------------------------
  function initCountdown() {
    const targetDate = new Date('2026-11-07T09:00:00-08:00').getTime();

    const daysEl = document.getElementById('countDays');
    const hoursEl = document.getElementById('countHours');
    const minsEl = document.getElementById('countMins');
    const secsEl = document.getElementById('countSecs');

    function update() {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minsEl) minsEl.textContent = '00';
        if (secsEl) secsEl.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
    }

    update();
    setInterval(update, 1000);
  }

  // ---------------------------------------------------------------------------
  // SCHEDULE DATA & INTERACTIVE FILTERING
  // Sourced from Figma 2-event-schedule.svg + detailed workshop information
  // ---------------------------------------------------------------------------
  const scheduleData = [
    {
      id: 'sched-1',
      time: '9:00 AM',
      title: 'Check-in',
      desc: 'Pick up your badge, grab breakfast and find your team.',
      tag: 'Arrival',
      tagColor: 'peach',
      category: 'arrival',
      room: 'ASB Atrium (Level 9)',
      speaker: 'CSSS Welcome Staff',
      details: 'Check-in opens at 9:00 AM sharp! Grab coffee, bagels, fruit, and vegan donuts provided by our sponsors. Bring a piece of student ID and your ticket QR code.'
    },
    {
      id: 'sched-2',
      time: '10:00 AM',
      title: 'Kickoff',
      desc: 'Opening remarks, rules and the start of the day.',
      tag: 'Main hall',
      tagColor: 'sage',
      category: 'main',
      room: 'CS Lecture Hall ASB 9705',
      speaker: 'CSSS Executive Team',
      details: 'Welcome speech, theme reveal, prize category overview, API keys distribution, and mentor introductions. Live streamed on the Fall Hacks Discord.'
    },
    {
      id: 'sched-3',
      time: '10:45 AM',
      title: 'Team formation',
      desc: 'No team yet? Meet people and pitch ideas.',
      tag: 'Teams',
      tagColor: 'peach',
      category: 'teams',
      room: 'ASB Student Commons 9800',
      speaker: 'Team Matchmaking Leads',
      details: 'Fast-pitch speed networking! Pitch an idea in 30 seconds or find hackers with complementary skills (frontend, backend, design, mobile). Max team size is 4.'
    },
    {
      id: 'sched-4',
      time: '11:30 AM',
      title: 'Hacking begins',
      desc: 'Start building. Mentors are around all day.',
      tag: 'Hack',
      tagColor: 'sage',
      category: 'hack',
      room: 'All ASB Computer Labs & Hacking Lounges',
      speaker: 'Mentors from Northwind, Acme & Bluebird',
      details: 'The clock starts! Mentors are roaming the halls with red lanyards. You can also file mentor tickets anytime on the Discord server in #ask-a-mentor.'
    },
    {
      id: 'sched-5',
      time: '12:30 PM',
      title: 'Lunch',
      desc: 'Refuel and chat with our sponsors.',
      tag: 'Break',
      tagColor: 'peach',
      category: 'break',
      room: 'ASB Cafeteria & Patio',
      speaker: 'Catering by SFU Food Services',
      details: 'Hot buffet lunch with vegetarian, vegan, halal, and gluten-free options. Visit the sponsor lounge during lunch to collect swag stickers and chat about internships.'
    },
    {
      id: 'sched-6',
      time: '2:00 PM',
      title: 'Workshop',
      desc: 'A beginner friendly session to level up.',
      tag: 'Workshop',
      tagColor: 'sage',
      category: 'workshop',
      room: 'CS Lab 9700',
      speaker: 'Acme Labs Lead Engineers',
      details: 'Topic: "Rapid Prototyping: From Figma Design to Shipped Interactive Web Apps in 45 Minutes". Starter GitHub repos, APIs, and live coding walkthrough included.'
    },
    {
      id: 'sched-7',
      time: '5:00 PM',
      title: 'Demos',
      desc: 'Show what you built to judges and fellow hackers.',
      tag: 'Judging',
      tagColor: 'peach',
      category: 'judging',
      room: 'Exhibition Hallway & Labs',
      speaker: 'Industry Judges Panel',
      details: 'Science-fair style 3-minute project demos! Every team gets a designated booth number. Judges score on creativity, technical execution, design, and presentation.'
    },
    {
      id: 'sched-8',
      time: '6:00 PM',
      title: 'Awards',
      desc: 'Prizes, shout outs and a group photo.',
      tag: 'Finale',
      tagColor: 'sage',
      category: 'main',
      room: 'Main CS Lecture Hall ASB 9705',
      speaker: 'Organizing Committee & Sponsors',
      details: 'Trophies and prizes awarded for 1st, 2nd, 3rd place, Best Beginner Project, Best UI/UX, and sponsor-specific challenges, capped off with our annual group photo!'
    }
  ];

  function renderSchedule() {
    const listEl = document.getElementById('fullScheduleList');
    if (!listEl) return;

    const query = state.searchQuery.toLowerCase().trim();
    const filter = state.scheduleFilter;
    const onlyStars = state.onlyBookmarks;

    const filtered = scheduleData.filter((item) => {
      // Category filter
      if (filter !== 'all') {
        if (filter === 'main' && item.category !== 'main') return false;
        if (filter === 'workshop' && item.category !== 'workshop') return false;
        if (filter === 'hack' && item.category !== 'hack' && item.category !== 'teams') return false;
        if (filter === 'break' && item.category !== 'break' && item.category !== 'arrival') return false;
        if (filter === 'judging' && item.category !== 'judging') return false;
      }

      // Bookmarks filter
      if (onlyStars && !state.bookmarks.includes(item.id)) {
        return false;
      }

      // Search query
      if (query) {
        const hay = `${item.title} ${item.desc} ${item.tag} ${item.room} ${item.details}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; background:var(--bg-card); border-radius:var(--radius-lg); border:1px dashed var(--border-subtle);">
          <p style="font-family:var(--font-heading); font-size:1.15rem; font-weight:700; color:var(--primary-dark); margin-bottom:6px;">No schedule items found</p>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:14px;">Try clearing your search query or filters.</p>
          <button type="button" class="btn-pill-small" id="btnResetFilters">Reset all filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('btnResetFilters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.searchQuery = '';
          state.scheduleFilter = 'all';
          state.onlyBookmarks = false;
          const searchInput = document.getElementById('scheduleSearchInput');
          if (searchInput) searchInput.value = '';
          document.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
          });
          const bookmarkBtn = document.getElementById('btnFilterBookmarks');
          if (bookmarkBtn) bookmarkBtn.classList.remove('active');
          renderSchedule();
        });
      }
      return;
    }

    listEl.innerHTML = filtered.map((item) => {
      const isBookmarked = state.bookmarks.includes(item.id);
      const isLiveNow = state.simulatedHour === item.id;

      return `
        <article class="schedule-item-card ${isLiveNow ? 'is-active-now' : ''}" data-id="${item.id}" id="${item.id}">
          <div class="sched-time-badge">${item.time}</div>
          <div class="sched-main-info">
            <div class="sched-card-title">
              <span>${item.title}</span>
              ${isLiveNow ? '<span class="live-badge">Happening Now</span>' : ''}
            </div>
            <p class="sched-card-desc">${item.desc}</p>
            <div class="sched-extra-details">
              <p><strong>Location:</strong> ${item.room}</p>
              <p><strong>Hosts/Mentors:</strong> ${item.speaker}</p>
              <p style="margin-top:4px;">${item.details}</p>
            </div>
          </div>
          <div class="sched-card-actions">
            <span class="tag-badge ${item.tagColor}">${item.tag}</span>
            <button type="button" class="btn-star ${isBookmarked ? 'bookmarked' : ''}" 
                    aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark session'}"
                    title="${isBookmarked ? 'Bookmarked' : 'Add to bookmarks'}"
                    data-id="${item.id}">
              ${isBookmarked ? '★' : '☆'}
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach bookmark click listeners
    listEl.querySelectorAll('.btn-star').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        toggleBookmark(id);
      });
    });

    // Attach card click expansion
    listEl.querySelectorAll('.schedule-item-card').forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('expanded');
        sfx.playClick();
      });
    });
  }

  function toggleBookmark(id) {
    const idx = state.bookmarks.indexOf(id);
    if (idx === -1) {
      state.bookmarks.push(id);
      showToast('Session bookmarked!');
    } else {
      state.bookmarks.splice(idx, 1);
      showToast('Removed from bookmarks');
    }
    localStorage.setItem('fallhacks_bookmarks', JSON.stringify(state.bookmarks));
    renderSchedule();
  }

  // ---------------------------------------------------------------------------
  // EXPORT SCHEDULE (.ICS / iCalendar format)
  // ---------------------------------------------------------------------------
  function downloadCalendarICS() {
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Fall Hacks//Fall Hacks 2026 Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Fall Hacks 2026 Schedule',
      'X-WR-TIMEZONE:America/Vancouver',
      ...scheduleData.map(item => {
        const fakeStart = item.time.includes('9:00') ? '20261107T170000Z' :
                          item.time.includes('10:00') ? '20261107T180000Z' :
                          item.time.includes('10:45') ? '20261107T184500Z' :
                          item.time.includes('11:30') ? '20261107T193000Z' :
                          item.time.includes('12:30') ? '20261107T203000Z' :
                          item.time.includes('2:00') ? '20261107T220000Z' :
                          item.time.includes('5:00') ? '20261108T010000Z' : '20261108T020000Z';
        const fakeEnd = item.time.includes('6:00') ? '20261108T030000Z' : '20261107T180000Z';
        return [
          'BEGIN:VEVENT',
          `UID:${item.id}-fallhacks2026@sfu.ca`,
          `SUMMARY:Fall Hacks: ${item.title}`,
          `DESCRIPTION:${item.desc} - ${item.details}`,
          `LOCATION:SFU Burnaby - ${item.room}`,
          `DTSTART:${fakeStart}`,
          `DTEND:${fakeEnd}`,
          'END:VEVENT'
        ].join('\r\n');
      }),
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Fall-Hacks-2026-Schedule.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Downloaded calendar (.ics) file!');
  }

  // ---------------------------------------------------------------------------
  // MODERN WEB GUIDANCE COMPLIANT FORM VALIDATION
  // Guides: 'forms', 'validate-input-after-interaction'
  // - Show validation errors only after blur (interaction completed)
  // - Clear errors on input as user types
  // - Sync aria-invalid with :user-invalid state
  // - On submit: route focus to first invalid control
  // ---------------------------------------------------------------------------
  function initRegistrationForm() {
    const form = document.getElementById('registrationForm');
    if (!form) return;

    const dirtyState = new WeakMap();

    const updateFieldState = (input) => {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      const isValid = input.checkValidity();
      if (state.hasBlurred && !isValid) {
        input.classList.add('user-invalid-fallback');
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.classList.remove('user-invalid-fallback');
        input.removeAttribute('aria-invalid');
      }
    };

    const handleFieldEvent = (e) => {
      const input = e.target;
      if (!input.checkValidity) return;

      if (e.type === 'input' || e.type === 'change') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasInteracted = true;
        dirtyState.set(input, state);
        if (state.hasBlurred) {
          updateFieldState(input);
        }
      } else if (e.type === 'blur') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(input, state);
        if (state.hasInteracted) {
          updateFieldState(input);
        }
      }
    };

    form.addEventListener('blur', handleFieldEvent, true);
    form.addEventListener('input', handleFieldEvent);
    form.addEventListener('change', handleFieldEvent);

    // Dietary quick chips toggle
    document.querySelectorAll('.diet-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const activeChips = Array.from(document.querySelectorAll('.diet-chip.active')).map(c => c.textContent);
        const dietaryInput = document.getElementById('dietaryNeeds');
        if (dietaryInput) {
          dietaryInput.value = activeChips.join(', ');
        }
        sfx.playClick();
      });
    });

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Check overall validity
      if (!form.checkValidity()) {
        // Mark all fields as blurred to surface errors
        const controls = form.elements;
        let firstInvalid = null;
        for (const ctrl of controls) {
          if (ctrl.checkValidity && !ctrl.checkValidity()) {
            if (!firstInvalid) firstInvalid = ctrl;
            ctrl.classList.add('user-invalid-fallback');
            ctrl.setAttribute('aria-invalid', 'true');
          }
        }
        if (firstInvalid) {
          firstInvalid.focus();
          showToast('Please fix the highlighted fields', '⚠️');
        }
        return;
      }

      // Valid submission
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating your badge...';
      }

      const formData = new FormData(form);
      const hackerData = {
        name: formData.get('fullName') || 'Hacker',
        email: formData.get('email') || '',
        school: formData.get('school') || 'SFU',
        year: formData.get('yearOfStudy') || 'Undergrad',
        experience: formData.get('experienceLevel') || 'Beginner',
        dietary: formData.get('dietaryNeeds') || 'None',
        ticketId: `FH26-${Math.floor(1000 + Math.random() * 9000)}`,
        registeredAt: new Date().toISOString()
      };

      state.registeredHacker = hackerData;
      localStorage.setItem('fallhacks_registration', JSON.stringify(hackerData));

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Register now';
        }
        triggerConfetti();
        sfx.playSuccess();
        renderHackerBadge(hackerData);
        openBadgeDialog();
        showToast('Registration complete! Welcome to Fall Hacks 2026! 🎉');
      }, 600);
    });

    // Pre-populate if already registered
    if (state.registeredHacker) {
      const nameInput = document.getElementById('fullName');
      const emailInput = document.getElementById('email');
      const schoolInput = document.getElementById('school');
      if (nameInput) nameInput.value = state.registeredHacker.name;
      if (emailInput) emailInput.value = state.registeredHacker.email;
      if (schoolInput) schoolInput.value = state.registeredHacker.school;
    }
  }

  // ---------------------------------------------------------------------------
  // DIGITAL HACKER BADGE / TICKET GENERATION & DOWNLOAD
  // ---------------------------------------------------------------------------
  function renderHackerBadge(hacker) {
    const badgeContainer = document.getElementById('hackerTicketView');
    if (!badgeContainer) return;

    badgeContainer.innerHTML = `
      <div class="hacker-ticket" id="renderedHackerTicket">
        <div class="ticket-lanyard-hole"></div>
        <div class="ticket-header">
          <div class="ticket-event-name">Fall Hacks <span>2026</span></div>
          <div style="font-size:0.75rem; color:rgba(255,248,239,0.7); margin-top:2px;">CSSS · SFU Burnaby</div>
        </div>
        <div class="ticket-body">
          <div>
            <div class="ticket-attendee-name">${escapeHtml(hacker.name)}</div>
            <div class="ticket-attendee-role">${escapeHtml(hacker.experience)} Hacker</div>
          </div>
          <div class="ticket-info-grid">
            <div class="ticket-info-item">
              <div class="info-lbl">School</div>
              <div class="info-val">${escapeHtml(hacker.school)}</div>
            </div>
            <div class="ticket-info-item">
              <div class="info-lbl">Date</div>
              <div class="info-val">Nov 7, 2026</div>
            </div>
            <div class="ticket-info-item">
              <div class="info-lbl">Doors Open</div>
              <div class="info-val">9:00 AM PST</div>
            </div>
            <div class="ticket-info-item">
              <div class="info-lbl">Pass Type</div>
              <div class="info-val">Hacker In-Person</div>
            </div>
          </div>
          <div class="ticket-qr-area">
            <div>
              <div style="font-size:0.65rem; color:#6b5d6e; font-weight:700; text-transform:uppercase;">Registration ID</div>
              <div class="ticket-id">${escapeHtml(hacker.ticketId)}</div>
            </div>
            <svg class="qr-code-svg" viewBox="0 0 40 40" fill="currentColor">
              <!-- Geometric QR simulation pattern -->
              <rect x="2" y="2" width="10" height="10" fill="#2A1B2E"/>
              <rect x="4" y="4" width="6" height="6" fill="#FFF8EF"/>
              <rect x="28" y="2" width="10" height="10" fill="#2A1B2E"/>
              <rect x="30" y="4" width="6" height="6" fill="#FFF8EF"/>
              <rect x="2" y="28" width="10" height="10" fill="#2A1B2E"/>
              <rect x="4" y="30" width="6" height="6" fill="#FFF8EF"/>
              <rect x="16" y="4" width="8" height="4" fill="#F2712B"/>
              <rect x="16" y="14" width="8" height="8" fill="#2A1B2E"/>
              <rect x="28" y="16" width="6" height="6" fill="#2A1B2E"/>
              <rect x="14" y="26" width="6" height="10" fill="#2A1B2E"/>
              <rect x="24" y="26" width="12" height="4" fill="#F2712B"/>
              <rect x="28" y="32" width="8" height="6" fill="#2A1B2E"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  function downloadBadgeImage() {
    const ticketEl = document.getElementById('renderedHackerTicket');
    if (!ticketEl) return;

    // Use HTML5 Canvas to render high-res badge PNG image
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 920;
    const ctx = canvas.getContext('2d');

    // Background card
    ctx.fillStyle = '#2A1B2E';
    ctx.roundRect(0, 0, 640, 920, 36);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#F2712B';
    ctx.lineWidth = 6;
    ctx.roundRect(4, 4, 632, 912, 34);
    ctx.stroke();

    // Header text
    ctx.fillStyle = '#FFF8EF';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fall Hacks 2026', 320, 110);

    ctx.fillStyle = 'rgba(255, 248, 239, 0.7)';
    ctx.font = '20px sans-serif';
    ctx.fillText('CSSS · SFU Burnaby · Nov 7, 2026', 320, 150);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 248, 239, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 190);
    ctx.lineTo(600, 190);
    ctx.stroke();

    // Attendee Name
    const hacker = state.registeredHacker || { name: 'Fall Hacker', school: 'SFU', ticketId: '#FH26-0000', experience: 'Hacker' };
    ctx.fillStyle = '#FFF8EF';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(hacker.name, 60, 270);

    // Pill badge
    ctx.fillStyle = '#F2712B';
    ctx.roundRect(60, 300, 240, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#2A1B2E';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${hacker.experience} Hacker`, 80, 330);

    // Details Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.roundRect(60, 380, 520, 240, 20);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 248, 239, 0.6)';
    ctx.font = '16px sans-serif';
    ctx.fillText('SCHOOL / INSTITUTION', 80, 425);
    ctx.fillText('TICKET IDENTIFIER', 360, 425);
    ctx.fillText('VENUE LOCATION', 80, 525);
    ctx.fillText('EVENT DATE', 360, 525);

    ctx.fillStyle = '#FFF8EF';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(hacker.school, 80, 465);
    ctx.fillText(hacker.ticketId, 360, 465);
    ctx.fillText('SFU Burnaby (ASB 9705)', 80, 565);
    ctx.fillText('Nov 7, 2026', 360, 565);

    // QR Area bottom
    ctx.fillStyle = '#FFF8EF';
    ctx.roundRect(60, 660, 520, 180, 24);
    ctx.fill();

    ctx.fillStyle = '#2A1B2E';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(hacker.ticketId, 90, 740);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(42, 27, 46, 0.7)';
    ctx.fillText('Scan at Check-In Table · ASB Atrium', 90, 780);

    // Draw simple QR squares
    ctx.fillStyle = '#2A1B2E';
    ctx.fillRect(440, 690, 100, 100);
    ctx.fillStyle = '#FFF8EF';
    ctx.fillRect(455, 705, 70, 70);
    ctx.fillStyle = '#2A1B2E';
    ctx.fillRect(470, 720, 40, 40);

    // Download trigger
    const link = document.createElement('a');
    link.download = `Fall-Hacks-Badge-${hacker.ticketId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Badge downloaded as PNG!');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // CONFETTI CELEBRATION ENGINE (Native canvas particle emitter)
  // ---------------------------------------------------------------------------
  function triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const particles = [];
    const colors = ['#F2712B', '#F7B93E', '#E8A9A3', '#A8C5A0', '#2A1B2E', '#FFF1E0'];

    for (let i = 0; i < 140; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 5,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        alpha: 1,
        gravity: 0.38
      });
    }

    let frames = 0;
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frames++;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.007;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (frames < 180 && particles.some((p) => p.alpha > 0)) {
        requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    }
    loop();
  }

  // ---------------------------------------------------------------------------
  // MODAL DIALOGS (Modern Web Guidance Compliant)
  // Guides: 'dialog', 'light-dismiss-a-dialog'
  // - Use native <dialog> element opened with showModal()
  // - closedby="any" with fallback check
  // - overscroll-behavior: contain on dialog and ::backdrop
  // ---------------------------------------------------------------------------
  function initDialogs() {
    // Setup light dismiss fallback for browsers lacking closedBy
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e, dialog) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      document.querySelectorAll('dialog[closedby="any"]').forEach(dialog => {
        let pressedOutside = false;
        dialog.addEventListener('pointerdown', (e) => {
          pressedOutside = isOutside(e, dialog);
        });
        dialog.addEventListener('pointerup', (e) => {
          if (pressedOutside && isOutside(e, dialog)) {
            dialog.close();
          }
        });
      });
    }

    // Generic close buttons
    document.querySelectorAll('.dialog-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dialog = btn.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    // Campus map modal triggers
    document.querySelectorAll('[data-open-modal="campusModal"]').forEach(el => {
      el.addEventListener('click', () => {
        const modal = document.getElementById('campusModal');
        if (modal) modal.showModal();
        sfx.playClick();
      });
    });

    // Code of conduct triggers
    document.querySelectorAll('[data-open-modal="cocModal"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById('cocModal');
        if (modal) modal.showModal();
        sfx.playClick();
      });
    });

    // Sponsor contact modal triggers
    document.querySelectorAll('[data-open-modal="sponsorModal"]').forEach(el => {
      el.addEventListener('click', () => {
        const modal = document.getElementById('sponsorModal');
        if (modal) modal.showModal();
        sfx.playClick();
      });
    });

    // Sponsor cards click -> open sponsor detail
    const sponsorDetails = {
      northwind: {
        name: 'Northwind Technologies',
        tier: 'Gold Sponsor',
        desc: 'Vancouver-based distributed systems and developer cloud infrastructure platform.',
        perks: 'Hiring Software Engineering Interns (Summer/Fall 2027) & New Grads. Offering the "Best Cloud Infrastructure Hack" prize ($1,000 cash).',
        tech: 'Rust, Go, TypeScript, WebAssembly, Kubernetes'
      },
      acme: {
        name: 'Acme Labs',
        tier: 'Gold Sponsor',
        desc: 'Applied AI & Creative Design tools powering the next generation of creative technologists.',
        perks: 'Mentors hosting the 2:00 PM workshop. Sponsoring API access tokens ($100 per hacker) and "Best Human-Centered AI Project" award.',
        tech: 'Python, PyTorch, React, WebGPU, Fastify'
      },
      bluebird: {
        name: 'Bluebird Systems',
        tier: 'Silver Sponsor',
        desc: 'Modern healthcare software and accessible patient portal engineering.',
        perks: 'Engineers on-site for architecture reviews and mock technical interviews during lunch.',
        tech: 'Next.js, Tailwind, GraphQL, PostgreSQL'
      },
      greenleaf: {
        name: 'Greenleaf Analytics',
        tier: 'Silver Sponsor',
        desc: 'Climate-tech modeling and sustainability telemetry tools.',
        perks: 'Prizes for "Best Sustainability / Green Software Hack". Eco-friendly swag backpacks for attendees.',
        tech: 'Python, GeoJSON, Maps API, Apache Arrow'
      },
      orbit: {
        name: 'Orbit Cloud',
        tier: 'Silver Sponsor',
        desc: 'Edge database and serverless realtime messaging platform.',
        perks: 'Free tier upgrade vouchers and customized Raspberry Pi 5 starter kits for top projects.',
        tech: 'Edge Functions, WebSockets, SQLite, Elixir'
      }
    };

    document.querySelectorAll('[data-sponsor-key]').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-sponsor-key');
        const data = sponsorDetails[key];
        if (data) {
          const detailModal = document.getElementById('sponsorDetailModal');
          const title = document.getElementById('sponsorDetailTitle');
          const tier = document.getElementById('sponsorDetailTier');
          const desc = document.getElementById('sponsorDetailDesc');
          const perks = document.getElementById('sponsorDetailPerks');
          const tech = document.getElementById('sponsorDetailTech');

          if (title) title.textContent = data.name;
          if (tier) tier.textContent = data.tier;
          if (desc) desc.textContent = data.desc;
          if (perks) perks.textContent = data.perks;
          if (tech) tech.textContent = data.tech;

          if (detailModal) detailModal.showModal();
          sfx.playClick();
        }
      });
    });

    // Badge download button
    const btnDownloadBadge = document.getElementById('btnDownloadBadge');
    if (btnDownloadBadge) {
      btnDownloadBadge.addEventListener('click', downloadBadgeImage);
    }

    // View saved ticket button
    const btnViewSavedTicket = document.getElementById('btnViewSavedTicket');
    if (btnViewSavedTicket) {
      btnViewSavedTicket.addEventListener('click', () => {
        if (state.registeredHacker) {
          renderHackerBadge(state.registeredHacker);
          openBadgeDialog();
        } else {
          navigateTo('register');
          showToast('Please fill out registration first');
        }
      });
    }
  }

  function openBadgeDialog() {
    const dialog = document.getElementById('badgeModal');
    if (dialog) dialog.showModal();
  }

  // ---------------------------------------------------------------------------
  // SPONSORSHIP INQUIRY FORM
  // ---------------------------------------------------------------------------
  function initSponsorForm() {
    const form = document.getElementById('sponsorContactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const modal = document.getElementById('sponsorModal');
      if (modal) modal.close();
      showToast('Thank you! Our sponsorship team will contact you within 24 hours.', '💌');
      sfx.playSuccess();
    });
  }

  // ---------------------------------------------------------------------------
  // GLOBAL KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------
  function initKeyboardNav() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      if (e.key === '1') navigateTo('home');
      else if (e.key === '2') navigateTo('schedule');
      else if (e.key === '3') navigateTo('sponsors');
      else if (e.key === '4') navigateTo('register');
      else if (e.key.toLowerCase() === 'm') toggleAudio();
    });
  }

  function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    localStorage.setItem('fallhacks_audio', state.audioEnabled);
    updateAudioButtonUI();
    if (state.audioEnabled) {
      sfx.playSuccess();
      showToast('Sound effects enabled 🔔');
    } else {
      showToast('Sound effects muted 🔕');
    }
  }

  function updateAudioButtonUI() {
    const btn = document.getElementById('btnToggleSound');
    if (btn) {
      btn.innerHTML = state.audioEnabled ? '🔔' : '🔕';
      btn.setAttribute('title', state.audioEnabled ? 'Mute sound (Key M)' : 'Enable sound (Key M)');
      btn.setAttribute('aria-label', state.audioEnabled ? 'Mute sound' : 'Enable sound');
    }
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION ON DOM READY
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Navigation
    document.querySelectorAll('.nav-center .nav-link, .mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        navigateTo(view);
      });
    });

    // Logo click navigates home cleanly
    const siteLogo = document.querySelector('.site-logo');
    if (siteLogo) {
      siteLogo.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('home');
      });
    }

    // Top RSVP button
    document.querySelectorAll('.btn-rsvp-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('register');
      });
    });

    // Schedule Jump button
    document.querySelectorAll('.btn-schedule-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('schedule');
      });
    });

    // Mobile nav toggle
    const mobileToggle = document.getElementById('mobileNavToggle');
    const mobileDrawer = document.getElementById('mobileMenuDrawer');
    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = mobileDrawer.classList.toggle('open');
        if (isOpen) {
          mobileDrawer.removeAttribute('hidden');
        } else {
          mobileDrawer.setAttribute('hidden', '');
        }
        mobileToggle.setAttribute('aria-expanded', isOpen);
        sfx.playClick();
      });

      // Dismiss mobile drawer when clicking outside
      document.addEventListener('click', (e) => {
        if (!mobileDrawer.contains(e.target) && !mobileToggle.contains(e.target)) {
          mobileDrawer.classList.remove('open');
          mobileDrawer.setAttribute('hidden', '');
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Audio toggle button
    const btnSound = document.getElementById('btnToggleSound');
    if (btnSound) {
      btnSound.addEventListener('click', toggleAudio);
      updateAudioButtonUI();
    }

    // 2. Schedule Toolbar & Filters
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.scheduleFilter = pill.getAttribute('data-filter') || 'all';
        sfx.playClick();
        renderSchedule();
      });
    });

    const searchInput = document.getElementById('scheduleSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderSchedule();
      });
    }

    const btnFilterBookmarks = document.getElementById('btnFilterBookmarks');
    if (btnFilterBookmarks) {
      btnFilterBookmarks.addEventListener('click', () => {
        state.onlyBookmarks = !state.onlyBookmarks;
        btnFilterBookmarks.classList.toggle('active', state.onlyBookmarks);
        sfx.playClick();
        renderSchedule();
      });
    }

    const btnDownloadCal = document.getElementById('btnDownloadCalendar');
    if (btnDownloadCal) {
      btnDownloadCal.addEventListener('click', downloadCalendarICS);
    }

    // 3. Initialize components
    initHeroCanvas();
    initCountdown();
    renderSchedule();
    initRegistrationForm();
    initDialogs();
    initSponsorForm();
    initKeyboardNav();

    // 4. Initial route from URL hash or default home
    const initialHash = window.location.hash.replace('#', '');
    if (views.includes(initialHash)) {
      navigateTo(initialHash, false);
    } else {
      navigateTo('home', false);
    }
  });

})();
