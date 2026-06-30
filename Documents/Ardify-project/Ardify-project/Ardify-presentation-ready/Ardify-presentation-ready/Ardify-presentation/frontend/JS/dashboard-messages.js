(function(){
  function getSession(){
    try {
      if (window.ArdifyStorage && ArdifyStorage.getSession) return ArdifyStorage.getSession();
    } catch(e){}
    return null;
  }

  function lsGet(key, fallback){
    try {
      var v = localStorage.getItem(key);
      if (!v) return fallback;
      return JSON.parse(v);
    } catch(e){
      return fallback;
    }
  }

  function lsSet(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
  }

  var KEY = 'ardify_inbox_v1';

  // data shape: { [threadId]: { id, participants:[{id,name}], messages:[{fromId,toId,text,ts}] } }
  function ensureSeed(){
    var threads = lsGet(KEY, null);
    if (threads && Object.keys(threads).length) return;

    var now = Date.now();
    var demo = {};
    demo['t1'] = {
      id:'t1',
      participants:[{id:'u_student', name:'Student'},{id:'u_instructor', name:'Ahmed Hassan (Instructor)'}],
      messages:[
        {fromId:'u_instructor',toId:'u_student',text:'Great work on your last assignment! Your API…',ts:now-1000*60*2},
        {fromId:'u_student',toId:'u_instructor',text:'Thanks! I will push the fixes today.',ts:now-1000*60*1}
      ]
    };
    demo['t2'] = {
      id:'t2',
      participants:[{id:'u_student', name:'Student'},{id:'u_student2', name:'Fatima Ali'}],
      messages:[
        {fromId:'u_student2',toId:'u_student',text:'Did you finish the team project section 3?',ts:now-1000*60*60},
      ]
    };
    demo['t3'] = {
      id:'t3',
      participants:[{id:'u_student', name:'Student'},{id:'u_omar', name:'Omar Said'}],
      messages:[
        {fromId:'u_omar',toId:'u_student',text:'Check the new resources I uploaded for…',ts:now-1000*60*60*24}
      ]
    };

    lsSet(KEY, demo);
  }

  var state = {
    threadId: null,
    filteredThreads: []
  };

  function formatTime(ts){
    var d = new Date(ts);
    var hh = d.getHours();
    var mm = String(d.getMinutes()).padStart(2,'0');
    var h12 = hh%12 || 12;
    var ampm = hh>=12?'PM':'AM';
    // if ts today: hh:mm, else YYYY-MM-DD
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return h12+':'+mm+' '+ampm;
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function getThreads(){
    ensureSeed();
    return lsGet(KEY, {});
  }

  function getMe(){
    var sess = getSession();
    // try to map to demo ids; otherwise use email as id
    if (!sess) return {id:'u_student', name:'User'};
    var id = sess.userId || sess.id || sess.email || 'u_student';
    return {id:id, name:sess.fullName || sess.name || 'User'};
  }

  function otherName(thread){
    var me = getMe();
    var other = (thread.participants||[]).find(p=>p.id!==me.id);
    if (!other) return (thread.participants && thread.participants[1] && thread.participants[1].name) || 'Unknown';
    return other.name;
  }

  function otherAvatarClass(name){
    var n = (name||'').toLowerCase();
    if (/ahmed|omar|team|instructor/.test(n)) return 'msg_av_a';
    if (/fatima|far/.test(n)) return 'msg_av_b';
    return 'msg_av_c';
  }

  function renderInbox(){
    var listEl = document.getElementById('inboxList');
    if (!listEl) return;

    var threads = getThreads();
    var me = getMe();

    var items = Object.keys(threads).map(function(id){
      var t = threads[id];
      var last = (t.messages||[]).slice(-1)[0];
      return {
        id: id,
        name: otherName(t),
        preview: last ? last.text : '',
        ts: last ? last.ts : 0
      };
    }).sort(function(a,b){ return (b.ts||0) - (a.ts||0); });

    var q = (document.getElementById('msgSearch') && document.getElementById('msgSearch').value || '').trim().toLowerCase();
    if (q) {
      items = items.filter(function(it){
        return (it.name||'').toLowerCase().includes(q) || (it.preview||'').toLowerCase().includes(q);
      });
    }

    state.filteredThreads = items;
    listEl.innerHTML = items.map(function(it){
      var cls = otherAvatarClass(it.name);
      return (
        '<div class="msg_item'+(state.threadId===it.id?' active':'')+'" data-thread-id="'+it.id+'">'+
          '<div class="msg_avatar '+cls+'">'+(it.name.split(' ').slice(0,2).map(x=>x[0]).join('')||'U').toUpperCase().slice(0,2)+'</div>'+
          '<div class="msg_content">'+
            '<div class="msg_header">'+
              '<span class="msg_name">'+escapeHtml(it.name)+'</span>'+
              '<span class="msg_time">'+formatTime(it.ts||Date.now())+'</span>'+
            '</div>'+
            '<div class="msg_preview">'+escapeHtml(it.preview||'No messages yet')+'</div>'+
          '</div>'+
          '<div class="msg_unread" style="display:none"></div>'+
        '</div>'
      );
    }).join('');

    Array.from(listEl.querySelectorAll('.msg_item')).forEach(function(el){
      el.addEventListener('click', function(){
        openThread(el.getAttribute('data-thread-id'));
      });
    });

    if (!state.threadId && items.length) {
      openThread(items[0].id);
    }
  }

  function escapeHtml(str){
    return String(str||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'<')
      .replace(/>/g,'>')
      .replace(/"/g,'"')
      .replace(/'/g,'&#039;');
  }

  function openThread(threadId){
    var threads = getThreads();
    var t = threads[threadId];
    if (!t) return;

    state.threadId = threadId;

    var name = otherName(t);
    var sub = (t.participants||[]).map(p=>p.name).join(' • ');
    document.getElementById('threadName').textContent = name;
    document.getElementById('threadSub').textContent = sub;

    var bodyEl = document.getElementById('threadBody');
    bodyEl.innerHTML = '';

    var me = getMe();
    (t.messages||[]).forEach(function(m){
      var rowClass = m.fromId===me.id ? 'me' : 'them';
      var bubbleClass = m.fromId===me.id ? 'me' : 'them';
      var fromName = m.fromId===me.id ? 'Me' : name;
      var time = formatTime(m.ts||Date.now());
      var html = (
        '<div class="bubble_row '+rowClass+'">'+
          '<div class="bubble '+bubbleClass+'">'+
            '<div class="b_text">'+escapeHtml(m.text)+'</div>'+
            '<div class="b_time">'+escapeHtml(fromName)+' • '+escapeHtml(time)+'</div>'+
          '</div>'+
        '</div>'
      );
      bodyEl.insertAdjacentHTML('beforeend', html);
    });

    bodyEl.scrollTop = bodyEl.scrollHeight;
    renderInbox();
  }

  function getOrCreateThread(threadId, toName){
    var threads = getThreads();
    if (!threads[threadId]) {
      threads[threadId] = {
        id: threadId,
        participants: [ {id:getMe().id, name:getMe().name}, {id:toName, name:toName} ],
        messages: []
      };
    }
    lsSet(KEY, threads);
    return threads[threadId];
  }

  function clearThread(){
    if (!state.threadId) return;
    var threads = getThreads();
    if (threads[state.threadId]) threads[state.threadId].messages = [];
    lsSet(KEY, threads);
    openThread(state.threadId);
  }

  function sendMessage(){
    if (!state.threadId) return;
    var input = document.getElementById('composerInput');
    var text = (input.value||'').trim();
    if (!text) return;

    var threads = getThreads();
    var t = threads[state.threadId];
    if (!t) return;

    var me = getMe();

    // pick first non-me participant as receiver
    var other = (t.participants||[]).find(p=>p.id!==me.id) || (t.participants||[])[0] || {id:'other',name:'Other'};

    t.messages = t.messages || [];
    t.messages.push({fromId: me.id, toId: other.id, text: text, ts: Date.now()});
    lsSet(KEY, threads);

    input.value = '';
    openThread(state.threadId);
  }

  function bind(){
    var seedBtn = document.getElementById('seedDemo');
    if (seedBtn) seedBtn.addEventListener('click', function(){ lsSet(KEY, null); ensureSeed(); renderInbox(); });

    var search = document.getElementById('msgSearch');
    if (search) search.addEventListener('input', function(){ renderInbox(); });

    var sendBtn = document.getElementById('composerSend');
    var input = document.getElementById('composerInput');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) input.addEventListener('keydown', function(e){ if (e.key==='Enter') sendMessage(); });

    var clearBtn = document.getElementById('clearThread');
    if (clearBtn) clearBtn.addEventListener('click', clearThread);
  }

  document.addEventListener('DOMContentLoaded', function(){
    bind();
    renderInbox();
  });
})();

