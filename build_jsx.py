import re

with open('temp_jsx.txt', 'r', encoding='utf-8') as f:
    jsx_content = f.read()

# Fix syntax errors in style objects
# Change ''Cormorant Garamond',serif' to "'Cormorant Garamond',serif"
jsx_content = jsx_content.replace("''Cormorant Garamond',serif'", "\"'Cormorant Garamond',serif\"")
jsx_content = jsx_content.replace("''JetBrains Mono',monospace'", "\"'JetBrains Mono',monospace\"")

# Wire up "Fix My Submission — Free" and "Start Writing Free" to navigate to the app
jsx_content = jsx_content.replace('href="#" className="btn-primary"', 'href="/app" className="btn-primary" onClick={(e) => { e.preventDefault(); window.location.href="/app"; }}')
jsx_content = jsx_content.replace('href="#" className="price-cta outline"', 'href="/app" className="price-cta outline" onClick={(e) => { e.preventDefault(); window.location.href="/app"; }}')
jsx_content = jsx_content.replace('href="#" className="price-cta solid"', 'href="/app" className="price-cta solid" onClick={(e) => { e.preventDefault(); window.location.href="/app"; }}')

# Clean up HTML comments
jsx_content = re.sub(r'<!--.*?-->', '', jsx_content)

react_code = f"""import React, {{ useEffect }} from 'react';
import {{ useNavigate }} from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {{
  const navigate = useNavigate();

  useEffect(() => {{
    document.body.classList.add('landing-mode');
    
    // ── CURSOR ─────────────────────────────────────────────────
    const cursor = document.getElementById('cursor');
    const ring   = document.getElementById('cursorRing');
    let mx = -100, my = -100, rx = -100, ry = -100;
    let cursorReq;

    const onMouseMove = (e) => {{ mx = e.clientX; my = e.clientY; }};
    document.addEventListener('mousemove', onMouseMove);

    function animateCursor() {{
      if (cursor && ring) {{
        cursor.style.left = (mx - 5) + 'px';
        cursor.style.top  = (my - 5) + 'px';
        rx += (mx - rx) * 0.12;
        ry += (my - ry) * 0.12;
        ring.style.left = (rx - 18) + 'px';
        ring.style.top  = (ry - 18) + 'px';
      }}
      cursorReq = requestAnimationFrame(animateCursor);
    }}
    animateCursor();

    // ── NAV SCROLL ─────────────────────────────────────────────
    const nav = document.getElementById('nav');
    const onScroll = () => {{
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
    }};
    window.addEventListener('scroll', onScroll);

    // ── SCROLL REVEAL ──────────────────────────────────────────
    const reveals = document.querySelectorAll('.reveal');
    const revealObs = new IntersectionObserver(entries => {{
      entries.forEach(e => {{
        if (e.isIntersecting) {{
          e.target.classList.add('visible');
          revealObs.unobserve(e.target);
        }}
      }});
    }}, {{ threshold: 0.08, rootMargin: '0px 0px -40px 0px' }});
    reveals.forEach(r => revealObs.observe(r));

    // ── HERO STAT COUNTER ──────────────────────────────────────
    function animateCount(el) {{
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const isDecimal = String(target).includes('.');
      const dur = 1800;
      const startTime = performance.now();
      function tick(now) {{
        const p = Math.min((now - startTime) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const val = isDecimal
          ? (target * ease).toFixed(1)
          : Math.floor(target * ease);
        el.textContent = val + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }}
      requestAnimationFrame(tick);
    }}
    const statNums = document.querySelectorAll('[data-count]');
    const statObs = new IntersectionObserver(entries => {{
      entries.forEach(e => {{
        if (e.isIntersecting) {{ animateCount(e.target); statObs.unobserve(e.target); }}
      }});
    }}, {{ threshold: 0.5 }});
    setTimeout(() => statNums.forEach(n => statObs.observe(n)), 1000);

    // ── GENRE BARS ─────────────────────────────────────────────
    const genreChart = document.getElementById('genreChart');
    const genreObs = new IntersectionObserver(entries => {{
      entries.forEach(e => {{
        if (e.isIntersecting) {{
          document.querySelectorAll('.genre-row[data-fill]').forEach((row, i) => {{
            setTimeout(() => row.classList.add('animated'), i * 80);
          }});
          genreObs.unobserve(e.target);
        }}
      }});
    }}, {{ threshold: 0.2 }});
    if (genreChart) genreObs.observe(genreChart);

    // ── FEATURE PREVIEW BARS ───────────────────────────────────
    function animateBars(container) {{
      container.querySelectorAll('.rbar-fill').forEach(bar => {{
        const w = bar.style.getPropertyValue('--w');
        bar.style.width = w;
      }});
      container.querySelectorAll('.market-fill').forEach(bar => {{
        const w = bar.style.getPropertyValue('--mw');
        bar.style.width = w;
      }});
      const radarFill = container.querySelector('#radarFill');
      if (radarFill) radarFill.style.opacity = '1';
    }}
    const featObs = new IntersectionObserver(entries => {{
      entries.forEach(e => {{
        if (e.isIntersecting) {{
          animateBars(e.target);
          featObs.unobserve(e.target);
        }}
      }});
    }}, {{ threshold: 0.3 }});
    document.querySelectorAll('.feature-card').forEach(c => featObs.observe(c));

    // ── SPINE HOVER RESET ──────────────────────────────────────
    const spines = document.querySelectorAll('.spine-book');
    const onLeave = (e) => {{ e.currentTarget.style.transform = ''; }};
    spines.forEach(book => book.addEventListener('mouseleave', onLeave));

    // ── FAQ TOGGLE
    const faqItems = document.querySelectorAll('.faq-item');
    const toggleFaq = function() {{
      const isOpen = this.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) this.classList.add('open');
    }};
    faqItems.forEach(item => item.addEventListener('click', toggleFaq));

    // ── TYPING ANIMATION ───────────────────────────────────────
    const editorPreview = document.querySelector('.editor-preview');
    if (editorPreview) {{
      const text = "The morning the letter arrived, Mira was burning toast and thinking about her mother's hands — the way they moved when she shelved books, quick and certain, like they knew where every story belonged.";
      const cursor2 = editorPreview.querySelector('.editor-cursor');
      editorPreview.innerHTML = '';
      if(cursor2) editorPreview.appendChild(cursor2);
      let i = 0;
      let typing = false;
      const typeObs = new IntersectionObserver(entries => {{
        entries.forEach(e => {{
          if (e.isIntersecting && !typing) {{
            typing = true;
            function typeChar() {{
              if (i < text.length) {{
                editorPreview.insertBefore(document.createTextNode(text[i]), cursor2);
                i++;
                setTimeout(typeChar, 28 + Math.random() * 20);
              }}
            }}
            typeChar();
            typeObs.unobserve(e.target);
          }}
        }});
      }}, {{ threshold: 0.5 }});
      typeObs.observe(editorPreview);
    }}

    return () => {{
      document.body.classList.remove('landing-mode');
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(cursorReq);
      reveals.forEach(r => revealObs.unobserve(r));
      statNums.forEach(n => statObs.unobserve(n));
      if (genreChart) genreObs.unobserve(genreChart);
      document.querySelectorAll('.feature-card').forEach(c => featObs.unobserve(c));
      spines.forEach(book => book.removeEventListener('mouseleave', onLeave));
      faqItems.forEach(item => item.removeEventListener('click', toggleFaq));
    }};
  }}, []);

  return (
    <div className="author-studio-landing">
{jsx_content}
    </div>
  );
}}
"""

with open(r'src/components/LandingPage.jsx', 'w', encoding='utf-8') as f:
    f.write(react_code)
print("LandingPage.jsx built successfully.")
