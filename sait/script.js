  /* ИНТЕРАКТИВНОЕ ПОРТФОЛИО — 5 карточек
   1) Автопересчёт возраста (годы + месяцы + дни + секунды)
   2) Typewriter-эффект для цитат (Intersection Observer)
   3) 3D Tilt Effect для карточек (mousemove)
   4) Плавное переключение карточек (стрелки / точки / клавиатура)
   5) Слайдер фото внутри карточки
   6) Пасхалка №1: Konami Code → мемная цитата + вспышка
   7) Пасхалка №2: 3 клика по логотипу → "секретный режим" (частицы на canvas) */

(() => {
  'use strict';

  /* УТИЛИТЫ */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const toast = (msg, duration = 2600) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
  };

  /* РАСЧЁТ ВОЗРАСТА */
  const calcAge = (birthStr) => {
    const birth = new Date(birthStr + 'T00:00:00');
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonth;
    }
    if (months < 0) { years--; months += 12; }

    const totalSeconds = Math.floor((now - birth) / 1000);

    return {
      years, months, days,
      totalSeconds,
      pretty: `${years} лет, ${months} мес., ${days} дн.`,
      secondsPretty: totalSeconds.toLocaleString('ru-RU') + ' сек.'
    };
  };

  const animateSeconds = (el, target, duration = 1400) => {
    const start = performance.now();
    const from = 0;
    const step = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.floor(from + (target - from) * eased);
      el.textContent = val.toLocaleString('ru-RU') + ' сек.';
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const fillAges = (card) => {
    const birth = card.dataset.birth;
    if (!birth) return;
    const { pretty, totalSeconds } = calcAge(birth);
    $('[data-age]', card).textContent = pretty;
    animateSeconds($('[data-seconds]', card), totalSeconds);
  };

  /* TYPEWRITER ДЛЯ ЦИТАТ */
  const typeQuote = (card) => {
    const quoteEl = $('.quote__text', card);
    if (!quoteEl || quoteEl.dataset.typed === '1') return;

    const text = card.dataset.quote || '';
    quoteEl.dataset.typed = '1';
    quoteEl.textContent = '';

    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        quoteEl.textContent = text.slice(0, i);
        i++;
        setTimeout(tick, 22 + Math.random() * 30);
      } else {
        $('.quote', card).classList.add('done');
      }
    };
    tick();
  };

  /* СЛАЙДЕР ФОТО ВНУТРИ КАРТОЧКИ */
  const initPhotoSlider = (card) => {
    const photos = (card.dataset.photos || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const slides = $$('.photo-slide', card);
    const dotsBox = $('.photo-dots', card);

    // Подменяем src на случай, если в HTML стоят заглушки
    slides.forEach((img, idx) => {
      if (photos[idx]) img.src = photos[idx];
    });

    // Строим точки
    slides.forEach((_, idx) => {
      const dot = document.createElement('span');
      if (idx === 0) dot.classList.add('active');
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(idx);
      });
      dotsBox.appendChild(dot);
    });

    const goTo = (idx) => {
      slides.forEach((s, i) => s.classList.toggle('active', i === idx));
      $$('span', dotsBox).forEach((d, i) => d.classList.toggle('active', i === idx));
    };

    // Автопереключение раз в 4.5 сек
    let timer = setInterval(() => {
      const cur = slides.findIndex(s => s.classList.contains('active'));
      goTo((cur + 1) % slides.length);
    }, 4500);

    // Пауза на ховере
    const photoBox = $('.card__photo', card);
    photoBox.addEventListener('mouseenter', () => clearInterval(timer));
    photoBox.addEventListener('mouseleave', () => {
      timer = setInterval(() => {
        const cur = slides.findIndex(s => s.classList.contains('active'));
        goTo((cur + 1) % slides.length);
      }, 4500);
    });

    // Клик по фото = следующий слайд
    photoBox.addEventListener('click', () => {
      const cur = slides.findIndex(s => s.classList.contains('active'));
      goTo((cur + 1) % slides.length);
    });
  };

  /* 3D TILT EFFECT */
  const initTilt = (card) => {
    const photo = $('.card__photo', card);
    const halo = $('.card__halo', card);
    if (!photo) return;

    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;

      photo.style.transform =
        `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg) translateZ(20px)`;
      if (halo) halo.style.transform =
        `translateY(-50%) translate(${x * -30}px, ${y * -30}px)`;
    });

    card.addEventListener('mouseleave', () => {
      photo.style.transform = '';
      if (halo) halo.style.transform = 'translateY(-50%)';
    });
  };

  /* ПЕРЕКЛЮЧЕНИЕ КАРТОЧЕК */
  const cards = $$('.card');
  const list = $('#switcherList');
  const btnPrev = $('.switcher__btn.prev');
  const btnNext = $('.switcher__btn.next');
  let current = 0;

  // Строим точки-номера
  cards.forEach((card, i) => {
    const b = document.createElement('button');
    b.className = 'switcher__dot' + (i === 0 ? ' active' : '');
    b.textContent = i + 1;
    b.addEventListener('click', () => goTo(i));
    list.appendChild(b);
  });

  const goTo = (idx) => {
    if (idx === current) return;
    idx = (idx + cards.length) % cards.length;

    const prevCard = cards[current];
    const nextCard = cards[idx];

    prevCard.classList.add('leaving');
    prevCard.classList.remove('active');
    setTimeout(() => prevCard.classList.remove('leaving'), 700);

    nextCard.classList.add('active');

    // Обновляем точки
    $$('.switcher__dot', list).forEach((d, i) =>
      d.classList.toggle('active', i === idx));

    // Заполняем возраст и печатаем цитату при появлении
    setTimeout(() => {
      fillAges(nextCard);
      typeQuote(nextCard);
    }, 250);

    current = idx;
  };

  btnPrev.addEventListener('click', () => goTo(current - 1));
  btnNext.addEventListener('click', () => goTo(current + 1));

  // Клавиатура
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });

  // Свайпы на мобилке
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => touchStartX = e.touches[0].clientX);
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) goTo(dx < 0 ? current + 1 : current - 1);
  });

  /* ИНИЦИАЛИЗАЦИЯ КАРТОЧЕК */
  cards.forEach((card) => {
    initPhotoSlider(card);
    initTilt(card);
  });

  // Первая карточка активна сразу
  cards[0].classList.add('active');
  fillAges(cards[0]);
  setTimeout(() => typeQuote(cards[0]), 500);

  /* ПАСХАЛКА №1 — KONAMI CODE */
  const konami = [
    'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'
  ];
  let kIdx = 0;

  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[kIdx]) {
      kIdx++;
      if (kIdx === konami.length) {
        kIdx = 0;
        activateKonami();
      }
    } else {
      kIdx = (key === konami[0]) ? 1 : 0;
    }
  });

  const activateKonami = () => {
    // Вспышка
    document.body.animate(
      [
        { filter: 'invert(0)' },
        { filter: 'invert(1)' },
        { filter: 'invert(0)' }
      ],
      { duration: 700, easing: 'ease-in-out' }
    );

    // Меняем цитату активной карточки на мемную
    const active = cards[current];
    const q = $('.quote__text', active);
    const original = active.dataset.quote;

    const memes = [
      'че к чему',
      'Мои планы на день: выжить, а дальше по ситуации',
      '🍏🐛🐛🐛🐛🐛🐛🐛🐛🐛🐛🐛🐛🐛🐛🐛🐛.',
      'Один в поле, второй в запое',
      'Ctrl+C, Ctrl+V — и я senior.'
    ];
    const meme = memes[Math.floor(Math.random() * memes.length)];

    active.dataset.quote = meme;
    q.dataset.typed = '0';
    q.textContent = '';
    typeQuote(active);

    toast('🐛Konami Code активирован!');

    // Возвращаем исходную цитату через 10 секунд
    setTimeout(() => {
      active.dataset.quote = original;
      const qq = $('.quote__text', active);
      qq.dataset.typed = '0';
      qq.textContent = '';
      $('.quote', active).classList.remove('done');
      typeQuote(active);
    }, 10000);
  };

  /*  ПАСХАЛКА №2 — 3 КЛИКА ПО ЛОГОТИПУ → СЕКРЕТНЫЙ РЕЖИМ */
  const dot = $('.dot');
  let clicks = 0, clickTimer = null;

  dot.addEventListener('click', () => {
    clicks++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => clicks = 0, 900);

    if (clicks === 3) {
      clicks = 0;
      toggleSecret();
    }
  });

  const toggleSecret = () => {
    const on = document.body.classList.toggle('secret-on');
    if (on) {
      startParticles();
      toast('✨ Секретный режим включён');
    } else {
      stopParticles();
      toast('Секретный режим выключен');
    }
  };

  /* ЧАСТИЦЫ (canvas) */
  const canvas = $('#bg-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let rafId = null;
  let mouse = { x: -1000, y: -1000 };

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    // Искра под курсором в секретном режиме
    if (document.body.classList.contains('secret-on') && Math.random() < 0.35) {
      particles.push({
        x: e.clientX, y: e.clientY,
        vx: (Math.random() - .5) * 1.4,
        vy: (Math.random() - .5) * 1.4,
        life: 1, r: Math.random() * 2 + 1
      });
    }
  });

  const startParticles = () => {
    if (rafId) return;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Затухание
      particles = particles.filter(p => p.life > 0.01);

      // Спавн новых фоновых частиц
      if (particles.length < 90 && Math.random() < .6) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - .5) * .5,
          vy: (Math.random() - .5) * .5,
          life: 1, r: Math.random() * 1.8 + .4
        });
      }

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.008;

        // Притяжение к курсору
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 160) {
          p.x += dx * 0.006;
          p.y += dy * 0.006;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 92, 58, ${p.life * 0.7})`;
        ctx.fill();
      });

      rafId = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopParticles = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];
  };

  /* Соединяем частицы линиями */
  const originalTick = startParticles;
  // (упрощённо — линии можно добавить внутрь tick, но оставим для читаемости)

  /* 9. МЕЛОЧИ */
  // Автообновление возраста раз в минуту
  setInterval(() => {
    const active = cards[current];
    if (active) fillAges(active);
  }, 60000);

})();