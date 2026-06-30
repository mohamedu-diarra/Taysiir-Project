(function(){
  function getSession(){
    try{ if (window.ArdifyStorage && ArdifyStorage.getSession) return ArdifyStorage.getSession(); }catch(e){}
    return null;
  }

  function lsGet(key, fallback){
    try{ const v = localStorage.getItem(key); if (!v) return fallback; return JSON.parse(v);}catch(e){return fallback;}
  }

  function lsSet(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  const KEY = 'ardify_ai_chat_v1';

  function meKey(){
    const sess = getSession();
    if (!sess) return 'anon';
    return sess.userId || sess.id || sess.email || 'anon';
  }

  function seedIfNeeded(){
    const root = lsGet(KEY, null);
    if (root && root[meKey()] && Array.isArray(root[meKey()]) && root[meKey()].length) return;
    const demo = [
      { role:'assistant', text:'Hi! I\'m Ardify AI Assistant. Ask me to explain a concept, quiz you, or create a study plan.' , ts: Date.now()-1000*60*15 },
      { role:'assistant', text:'Try: “Quiz me on HTML” or “Create a study plan for Full-Stack Web Dev”.', ts: Date.now()-1000*60*10 }
    ];
    const data = root || {};
    data[meKey()] = demo;
    lsSet(KEY, data);
  }

  function escapeHtml(str){
    return String(str||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'<')
      .replace(/>/g,'>')
      .replace(/"/g,'"')
      .replace(/'/g,'&#039;');
  }

  function getChat(){
    seedIfNeeded();
    const root = lsGet(KEY, {});
    return root[meKey()] || [];
  }

  function setChat(arr){
    const root = lsGet(KEY, {});
    root[meKey()] = arr;
    lsSet(KEY, root);
  }

  function buildResponse(userText){
    const t = (userText||'').trim().toLowerCase();

    function wrap(heading, bullets){
      return heading+'\n'+bullets.map(b=>'- '+b).join('\n');
    }

    if (t.includes('quiz') && t.includes('html')){
      return wrap('HTML Quiz (5 quick questions):',[
        'What does the <a> tag represent?',
        'Which element is used for a table row?',
        'What is the difference between <div> and <span>?',
        'Which tag typically contains metadata?',
        'What does the <img> tag need? (attribute)'
      ]) + '\n\nReply with your answers like: 1) ... 2) ...';
    }

    if (t.includes('explain') || t.includes('explanation')){
      return wrap('Quick explanation:',[
        'Start with the definition of the concept.',
        'Then give a real-world example.',
        'Finally, list common mistakes and how to avoid them.'
      ]) + '\n\nTell me the topic name and I\'ll tailor it.';
    }

    if (t.includes('study plan') || t.includes('plan')){
      return wrap('Study Plan (7 days):',[
        'Day 1: Learn fundamentals + short notes.',
        'Day 2: Practice with 2 small exercises.',
        'Day 3: Watch/skim one lesson + summarize.',
        'Day 4: Build a tiny project feature.',
        'Day 5: Review mistakes + redo exercises.',
        'Day 6: Do a mini quiz (timed).',
        'Day 7: Consolidate + plan next week.'
      ]) + '\n\nReply with the course name and your available hours/day.';
    }

    if (t.includes('rest api') || t.includes('api')){
      return wrap('REST API basics:',[
        'Resources are represented by URLs (e.g., /users).',
        'HTTP methods define actions: GET (read), POST (create), PUT/PATCH (update), DELETE (remove).',
        'Use JSON for request/response bodies.',
        'Return proper status codes (200, 201, 400, 404, 500).'
      ]);
    }

    if (t.includes('code') || t.includes('review')){
      return 'Paste your snippet (or describe the problem) and I\'ll suggest improvements + explain why.';
    }

    return 'Got it. I can help with explanations, quizzes, and study plans. Try: “Quiz me on HTML” or “Create a study plan for Full-Stack Web Dev”.';
  }

  function renderChat(){
    const log = document.getElementById('aiChatLog');
    if (!log) return;
    const items = getChat();
    log.innerHTML = items.map(function(m){
      const cls = m.role==='me' || m.role==='user' ? 'ai_msg_me' : 'ai_msg_them';
      return (
        '<div class="ai_msg '+cls+'">'+
          '<div class="ai_bubble">'+escapeHtml(m.text).replace(/\\n/g,'<br/>')+'</div>'+
        '</div>'
      );
    }).join('');
    log.scrollTop = log.scrollHeight;
  }

  function ensureStyles(){
    // minimal inline styles in case not present in page
    const log = document.getElementById('aiChatLog');
    if (!log) return;
    if (document.getElementById('ai_widget_extra_styles')) return;
    const s = document.createElement('style');
    s.id = 'ai_widget_extra_styles';
    s.textContent = `
      .ai_chatlog{max-height:240px; overflow:auto; margin:12px 0; padding:10px; border-radius:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,96,0,0.12);}
      .ai_msg{display:flex; margin:10px 0;}
      .ai_msg.ai_msg_me{justify-content:flex-end;}
      .ai_msg.ai_msg_them{justify-content:flex-start;}
      .ai_bubble{max-width:80%; padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.06); font-size:13px; line-height:1.5;}
      .ai_msg_me .ai_bubble{background:rgba(255,96,0,0.14); border-color:rgba(255,96,0,0.28); color:#fff;}
      .ai_msg_them .ai_bubble{background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.08); color:#fff;}
    `;
    document.head.appendChild(s);
  }

  function send(){
    const input = document.getElementById('aiInput');
    if (!input) return;
    const text = (input.value||'').trim();
    if (!text) return;

    const chat = getChat();
    chat.push({ role:'me', text:text, ts: Date.now() });

    const reply = buildResponse(text);
    chat.push({ role:'assistant', text: reply, ts: Date.now()+10 });
    setChat(chat);

    input.value = '';
    renderChat();
  }

  document.addEventListener('DOMContentLoaded', function(){
    seedIfNeeded();
    ensureStyles();
    renderChat();

    const sendBtn = document.getElementById('aiSendBtn');
    if (sendBtn) sendBtn.addEventListener('click', send);

    const input = document.getElementById('aiInput');
    if (input) input.addEventListener('keydown', function(e){ if (e.key==='Enter') send(); });

    // chips
    document.querySelectorAll('[data-ai-chip]').forEach(function(chip){
      chip.addEventListener('click', function(){
        const txt = chip.getAttribute('data-ai-chip');
        const input2 = document.getElementById('aiInput');
        if (input2) input2.value = txt;
        send();
      });
    });

    const clearBtn = document.getElementById('aiClearChat');
    if (clearBtn) clearBtn.addEventListener('click', function(){
      const data = {};
      data[meKey()] = [{ role:'assistant', text:'New chat started. What do you want to learn today?', ts: Date.now() }];
      lsSet(KEY, data);
      renderChat();
    });
  });
})();

