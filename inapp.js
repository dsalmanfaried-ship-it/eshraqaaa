/* =====================================================================
   inapp.js — كل حاجة بتفتح جوه التطبيق (من غير ما تخرج لكروم/يوتيوب)
   ===================================================================== */

/* ---------- ١) البيانات: ضيف هنا بس ---------- */
window.INAPP = {
  /* روابط مباشرة لدروس ملهاش رابط (بتتشغل جوه التطبيق فورًا).
     المفتاح = عنوان الدرس زي ما هو في الموقع، والقيمة = رابط يوتيوب (watch / youtu.be / shorts / playlist) */
  links: {
    // 'رقائق — إياد قنيبي': 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
  },

  /* فيديوهات جديدة تتضاف على الشيخ والقسم الموجودين (من غير أي تغيير في التصميم) */
  add: [
    // { scholar: 'إياد قنيبي', topic: 'رقائق', title: 'عنوان الفيديو', url: 'https://youtu.be/XXXXXXXXXXX', short: false },
  ]
};

/* ---------- ٢) المنطق ---------- */
(() => {
  'use strict';
  if (window.__inapp) return;          // اتحمّل قبل كده (مثلاً من sw.js وكمان من index.html)
  window.__inapp = 1;
  const D = window.INAPP || {};
  const E = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $1 = s => document.querySelector(s);
  const T = m => { try { toast(m) } catch (e) { } };

  /* --- تطبيق البيانات --- */
  function applyData() {
    let ch = 0;
    (D.add || []).forEach(a => {
      try {
        if (!a || !a.title) return;
        const s = DATA.scholars.find(x => x.name === a.scholar) || DATA.scholars.find(x => a.scholar && x.name.includes(a.scholar));
        if (!s) return;
        const p = a.url ? parse(a.url) : null;
        let sec = s.sections.find(x => x.title === a.topic);
        if (!sec) { sec = { title: a.topic || 'متنوع', videos: [] }; s.sections.push(sec) }
        if (p && sec.videos.some(v => v.url && (parse(v.url) || {}).key === p.key)) return;
        const o = { title: a.title };
        if (a.url) o.url = a.url; else o.q = a.q || (s.name + ' ' + a.title);
        if (a.short) o.short = true;
        sec.videos.push(o); ch++;
      } catch (e) { }
    });
    reset();
    const L = D.links || {};
    allVideos().forEach(v => {
      if (v.real) return;
      const u = L[v.key] || L[v.title] || L[v.scholar + ' | ' + v.title];
      if (u && parse(u)) { links[v.key] = u; ch++ }
    });
    if (ch) reset();
    return ch;
  }

  /* --- بحث يوتيوب جوه التطبيق (من غير ما تخرج) --- */
  const INS = [
    ['p', 'https://pipedapi.kavin.rocks'], ['p', 'https://pipedapi.adminforge.de'], ['p', 'https://api.piped.private.coffee'],
    ['i', 'https://inv.nadeko.net'], ['i', 'https://invidious.nerdvpn.de'], ['i', 'https://yewtu.be']
  ];
  const cache = new Map();
  const tmo = (u, ms) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return fetch(u, { signal: c.signal }).finally(() => clearTimeout(t)) };
  function search(q) {
    q = String(q || '').trim();
    if (cache.has(q)) return Promise.resolve(cache.get(q));
    const enc = encodeURIComponent(q);
    const tries = INS.map(([t, b]) =>
      tmo(t === 'p' ? b + '/search?q=' + enc + '&filter=videos' : b + '/api/v1/search?type=video&q=' + enc, 7000)
        .then(r => { if (!r.ok) throw new Error('http'); return r.json() })
        .then(j => {
          const a = t === 'p'
            ? (j.items || []).map(x => ({ id: (String(x.url || '').match(/v=([\w-]{11})/) || [])[1], title: x.title, by: x.uploaderName, dur: x.duration }))
            : (Array.isArray(j) ? j : []).map(x => ({ id: x.videoId, title: x.title, by: x.author, dur: x.lengthSeconds }));
          const r = a.filter(x => x.id && x.title).slice(0, 15);
          if (!r.length) throw new Error('empty');
          return r;
        }));
    const any = Promise.any ? Promise.any(tries) : Promise.race(tries);
    return any.then(r => { cache.set(q, r); return r });
  }
  const fmt = s => { s = +s; if (!s || s < 0) return ''; const m = Math.floor(s / 60), x = s % 60; return m + ':' + String(x).padStart(2, '0') };

  /* --- اللوحة --- */
  function panel() {
    let d = document.getElementById('xin');
    if (!d) { d = document.createElement('div'); d.id = 'xin'; d.className = 'xs'; d.onclick = e => { if (e.target === d) d.classList.remove('on') }; document.body.appendChild(d) }
    return d;
  }
  if (!document.getElementById('xin-css')) {
    const st = document.createElement('style'); st.id = 'xin-css';
    st.textContent = `
/* ===== حركة اللوحات (bottom sheets): بدل التكبير ١٫٥× القديم → طلوع ناعم + تعتيم الخلفية ===== */
@keyframes xsUp{from{transform:translate3d(0,36px,0);opacity:0}to{transform:none;opacity:1}}
@keyframes xsFade{from{opacity:0}to{opacity:1}}
@keyframes xsRow{from{transform:translate3d(0,12px,0);opacity:0}to{transform:none;opacity:1}}
@keyframes xsShim{to{background-position:-200% 0}}
.xs.on{animation:xsFade var(--fast,180ms) ease-out both}
.xs.on .in{animation:xsUp var(--base,320ms) var(--ease,cubic-bezier(.22,.8,.3,1)) both;will-change:transform,opacity;overscroll-behavior:contain}
/* ===== نتايج البحث ===== */
.ixr{display:flex;flex-direction:column;gap:8px;margin:10px 0}
.ixr .ir{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px;cursor:pointer;
  animation:xsRow var(--base,320ms) var(--ease,cubic-bezier(.22,.8,.3,1)) both;animation-delay:calc(var(--i,0)*45ms);
  transition:transform var(--fast,180ms) var(--ease,ease),border-color var(--fast,180ms)}
.ixr .ir:active{transform:scale(.98);border-color:var(--gold)}
@media (hover:hover){.ixr .ir:hover{border-color:var(--gold)}}
.ixr .ir .tm{position:relative;width:112px;aspect-ratio:16/9;flex:none;border-radius:10px;overflow:hidden;background:#18231f}
.ixr .ir img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s ease}
.ixr .ir img.ok{opacity:1}
.ixr .ir b{font-size:13px;line-height:1.6;display:block}
.ixr .ir small{color:var(--mut)}
.ixr .ld{text-align:center;color:var(--mut);padding:18px;animation:xsRow var(--base,320ms) ease both}
.ixr .sk{height:64px;border-radius:14px;border:1px solid var(--line);
  background:linear-gradient(90deg,var(--card) 25%,#1d2823 50%,var(--card) 75%);background-size:200% 100%;animation:xsShim 1.3s linear infinite}
.ixs{animation:xsRow var(--base,320ms) var(--ease,ease) both}
@media (prefers-reduced-motion:reduce){.xs.on,.xs.on .in,.ixr .ir,.ixr .sk,.ixs{animation:none!important}.ixr .ir img{transition:none}}
`;
    document.head.appendChild(st);
  }

  const SK = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';

  /* يفتح لوحة النتائج. onPick(id) بتتنفذ لما المستخدم يختار */
  function openSearch(title, q, onPick, hint) {
    const d = panel();
    d.innerHTML = '<div class="in"><h3>🔎 ' + E(title) + '</h3><small style="color:var(--mut)">' + E(hint || 'اختار الفيديو وهيتشغّل جوه التطبيق') + '</small>' +
      '<input id="ixq" placeholder="عدّل البحث لو حبيت" value="' + E(q) + '"><button class="g" id="ixb">ابحث</button>' +
      '<div class="ixr" id="ixr">' + SK + '</div>' +
      '<small style="color:var(--mut)">أو ألصق رابط الفيديو:</small><input id="ixl" placeholder="https://youtu.be/…"><button class="g" id="ixo">▶ شغّل الرابط</button></div>';
    d.classList.add('on');
    let seq = 0;
    const run = () => {
      const qq = d.querySelector('#ixq').value.trim(), box = d.querySelector('#ixr'), my = ++seq;
      if (!qq) return;
      box.innerHTML = SK;
      search(qq).then(L => {
        if (my !== seq) return;
        box.innerHTML = L.map((x, n) => '<div class="ir" tabindex="0" role="button" style="--i:' + Math.min(n, 8) + '" data-id="' + E(x.id) + '" data-t="' + E(x.title) + '" data-b="' + E(x.by || '') + '"><div class="tm"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + E(x.id) + '/mqdefault.jpg" onload="this.classList.add(\'ok\')" onerror="this.remove()"></div><div><b>' + E(x.title) + '</b><small>' + E(x.by || '') + (x.dur ? ' · ' + fmt(x.dur) : '') + '</small></div></div>').join('');
      }).catch(() => {
        if (my !== seq) return;
        box.innerHTML = '<div class="ld">البحث المباشر مش متاح دلوقتي (مشكلة في النت أو الخدمة).<br>ألصق رابط الفيديو في الخانة اللي تحت وهيتشغّل جوه التطبيق.</div>';
      });
    };
    d.querySelector('#ixb').onclick = run;
    d.querySelector('#ixq').onkeydown = e => { if (e.key === 'Enter') run() };
    d.querySelector('#ixr').onclick = e => { const r = e.target.closest('.ir'); if (r) { d.classList.remove('on'); onPick(r.dataset.id, r.dataset.t, r.dataset.b) } };
    d.querySelector('#ixr').onkeydown = e => { if (e.key === 'Enter') { const r = e.target.closest('.ir'); if (r) r.click() } };
    d.querySelector('#ixo').onclick = () => {
      const p = parse(d.querySelector('#ixl').value);
      if (!p || p.kind !== 'v') return T('الرابط مش صحيح');
      d.classList.remove('on'); onPick(p.id, '', '');
    };
    run();
  }

  /* --- درس ملوش رابط → بحث جوه التطبيق وبعدين يتحفظ كرابط --- */
  const prevOpen = window.openP;
  window.openP = function (k) {
    const v = byKey(k);
    if (!v || v.real) return prevOpen.apply(this, arguments);
    const dd = document.getElementById('xq2'); if (dd) dd.classList.remove('on');
    openSearch(v.title, (v.q || (v.scholar + ' ' + v.title)), id => {
      links[k] = 'https://youtu.be/' + id; ls.set('links', links);
      reset(); try { render() } catch (e) { }
      prevOpen.call(window, k);
    }, 'اختار الفيديو المناسب، وهيتحفظ للدرس ده وبعدها يتشغّل جوه التطبيق على طول');
  };

  /* --- تشغيل نتيجة بحث حرّة (من استكشاف) --- */
  function playFree(id, title, by) {
    const key = 'x:' + id, a = allVideos();
    if (!a.some(x => x.key === key)) a.push({ key, kind: 'v', id, title: title || 'فيديو', scholar: by || 'نتيجة بحث', topic: 'بحث', short: false, g: 0, si: 0, q: '', real: true, ord: 99999, tmp: true });
    prevOpen.call(window, key);
  }
  const CP = window.closePlayer;
  window.closePlayer = function () { try { if (_all) _all = _all.filter(x => !x.tmp) } catch (e) { } return CP.apply(this, arguments) };
  const TS = window.tgSave;
  window.tgSave = function (k) { if (String(k).startsWith('x:')) return T('ده فيديو من البحث، مش بيتحفظ'); return TS.apply(this, arguments) };

  /* --- استكشاف: زرار "دوّر جوه التطبيق" لما تكتب بحث --- */
  const R = window.render;
  window.render = function () {
    const r = R.apply(this, arguments);
    try {
      const A = document.getElementById('app');
      if (A && tab === 'explore' && query && !A.querySelector('.ixs')) {
        const b = document.createElement('button');
        b.className = 'more ixs';
        b.textContent = '🔎 دوّر على «' + query + '» في يوتيوب (جوه التطبيق)';
        b.onclick = () => openSearch('«' + query + '»', query, playFree, 'اختار أي فيديو وهيتشغّل جوه التطبيق');
        const anchor = A.querySelector('.grid') || A.querySelector('.empty');
        if (anchor) anchor.before(b); else A.appendChild(b);
      }
      if (A && tab === 'more' && !A.querySelector('.ixi')) {
        const rows = [...A.querySelectorAll('button.row')];
        if (!rows.some(x => /نزّل التطبيق/.test(x.textContent))) {
          const b = document.createElement('button'); b.className = 'row ixi'; b.textContent = '⬇️ نزّل التطبيق';
          b.onclick = installApp;
          (rows[0] ? rows[0].parentNode : A).appendChild(b);
        }
      }
    } catch (e) { }
    return r;
  };

  /* --- التنزيل من كروم --- */
  function installApp() {
    if (window.matchMedia('(display-mode: standalone)').matches) return T('التطبيق منزّل بالفعل ✅');
    if (typeof dp !== 'undefined' && dp) return doInstall();
    T('من قائمة كروم ⋮ اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»');
  }
  window.installApp = installApp;
  addEventListener('appinstalled', () => { T('اتنزّل التطبيق ✅'); try { render() } catch (e) { } });

  /* --- ابدأ --- */
  try { if (applyData()) render() } catch (e) { console.error('inapp', e) }
  setTimeout(() => { try { render() } catch (e) { } }, 2400);
})();
