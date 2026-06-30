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

  const KEY = 'ardify_projects_v1';

  function meKey(){
    const sess = getSession();
    if (!sess) return 'anon';
    return sess.userId || sess.id || sess.email || 'anon';
  }

  function seedIfNeeded(){
    const root = lsGet(KEY, null);
    if (root && root[meKey()] && Array.isArray(root[meKey()]) && root[meKey()].length) return;

    const items = [
      { id:'t1', type:'team', code:'T1', title:'E-Commerce Platform (Group A)', course:'Web Development', members:4, dueAt: Date.now()+1000*60*60*24*6, progress:60, color:'orange' },
      { id:'t2', type:'team', code:'T2', title:'AI Chatbot for Somalia', course:'AI & ML', members:3, dueAt: Date.now()+1000*60*60*24*20, progress:35, color:'blue' },
      { id:'i1', type:'individual', code:'I1', title:'Ardify E-Learning Platform', course:'Full-Stack Web Dev', members:1, dueAt: Date.now()+1000*60*60*24*55, progress:80, color:'green' },
      { id:'i2', type:'individual', code:'I2', title:'Portfolio Website', course:'Personal', members:1, dueAt:null, progress:50, color:'yellow' }
    ];

    const data = root || {};
    data[meKey()] = items;
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

  function dueText(p){
    if (!p.dueAt) return p.type==='individual' ? 'In progress' : 'No due date';
    const d = new Date(p.dueAt);
    return 'Due '+ d.toLocaleDateString(undefined,{month:'short',day:'2-digit'});
  }

  function render(){
    const teamList = document.getElementById('teamProjectsList');
    const indivList = document.getElementById('individualProjectsList');
    if (!teamList && !indivList) return;

    seedIfNeeded();
    const root = lsGet(KEY, {});
    const all = root[meKey()] || [];

    const team = all.filter(p=>p.type==='team').sort((a,b)=>b.progress-a.progress);
    const indiv = all.filter(p=>p.type==='individual').sort((a,b)=>b.progress-a.progress);

    function renderOne(arr, el){
      el.innerHTML = arr.map(function(p){
        const barColor = p.color==='green' ? 'var(--LightGreen)' : (p.color==='blue' ? '#60a5fa' : (p.color==='yellow' ? 'var(--yellow)' : 'var(--Orange)'));
        const pctColor = p.color==='green' ? 'var(--LightGreen)' : 'inherit';
        return (
          '<div class="project_item" data-project-id="'+escapeHtml(p.id)+'">'+
            '<div class="project_num">'+escapeHtml(p.code)+'</div>'+
            '<div class="project_info">'+
              '<div class="project_title">'+escapeHtml(p.title)+'</div>'+
              '<div class="project_sub">'+escapeHtml(p.members)+' member'+(p.members>1?'s':'')+' • '+escapeHtml(dueText(p))+'</div>'+
            '</div>'+
            '<div class="project_prog">'+
              '<div class="mini_bar"><div class="fill" style="width:'+Number(p.progress)+'%; background:'+escapeHtml(barColor)+'"></div></div>'+
              '<span class="mini_pct" style="color:'+escapeHtml(pctColor)+'">'+Number(p.progress)+'%</span>'+
            '</div>'+
          '</div>'
        );
      }).join('');

      Array.from(el.querySelectorAll('.project_item[data-project-id]')).forEach(function(row){
        row.addEventListener('click', function(){
          const id = row.getAttribute('data-project-id');
          const p = (all||[]).find(x=>x.id===id);
          if (!p) return;
          const details = document.getElementById('projectDetails');
          if (!details) return;
          details.innerHTML = (
            '<div style="display:flex;gap:12px;align-items:flex-start;">'+
              '<div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,96,0,0.12);color:var(--Orange);">'+
                '<ion-icon name="people-outline"></ion-icon>'+
              '</div>'+
              '<div style="flex:1;">'+
                '<div style="font-size:15px;font-weight:800;color:var(--White);margin-bottom:6px;">'+escapeHtml(p.title)+'</div>'+
                '<div style="font-size:12px;color:var(--Silver);margin-bottom:6px;">'+escapeHtml(p.type==='team'?'Team Project':'Individual Project')+' • '+escapeHtml(p.course)+'</div>'+
                '<div style="font-size:12px;color:var(--Silver);margin-bottom:12px;">Progress: <span style="color:var(--Orange);font-weight:700;">'+Number(p.progress)+'%</span> • '+escapeHtml(dueText(p))+'</div>'+
                '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+
                  '<button class="small_btn" id="projectBoost">Boost progress +5%</button>'+
                  '<button class="small_btn" id="projectReset">Reset demo</button>'+
                '</div>'+
              '</div>'+
            '</div>'
          );

          const boost = document.getElementById('projectBoost');
          if (boost) boost.addEventListener('click', function(){
            const root2 = lsGet(KEY, {});
            const arr = root2[meKey()] || [];
            const it = arr.find(x=>x.id===p.id);
            if (!it) return;
            it.progress = Math.min(100, Number(it.progress||0)+5);
            lsSet(KEY, root2);
            render();
          });

          const reset = document.getElementById('projectReset');
          if (reset) reset.addEventListener('click', function(){
            lsSet(KEY, null);
            seedIfNeeded();
            render();
          });
        });
      });
    }

    if (teamList) renderOne(team, teamList);
    if (indivList) renderOne(indiv, indivList);
  }

  document.addEventListener('DOMContentLoaded', function(){
    render();
  });
})();

