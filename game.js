(() => {
  const W=800, H=480, GRAVITY=.55, JUMP=-12, SPEED=5, RUN_BOOST=1.6, WATER_FACTOR=.65;
  const LEVEL_W=8400, MAX_JUMPS=2, COYOTE=9, JUMP_BUFFER=9, SLIDE_TIME=28, ENEMY_SPEED_CAP=5;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  const $ = id => document.getElementById(id);
  const ui = {
    score:$('score'), lives:$('lives'), runPill:$('runPill'),
    start:$('startScreen'), over:$('overScreen'), win:$('winScreen'),
    overScore:$('overScore'), winScore:$('winScore'),
    pauseBtn:$('pauseBtn'),
    thanksVideo: $('thanksVideo'),
    introVideo: $('introVideo'),
  };

  // Tenta tocar o video de intro com audio. Se o navegador bloquear o autoplay
  // com som, ele inicia mudo e desmuta na primeira interacao do usuario.
  if (ui.introVideo) {
    const tryPlayWithSound = () => {
      ui.introVideo.muted = false;
      ui.introVideo.volume = 1;
      const p = ui.introVideo.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          ui.introVideo.muted = true;
          ui.introVideo.play().catch(()=>{});
          const unmute = () => {
            ui.introVideo.muted = false;
            ui.introVideo.volume = 1;
            ui.introVideo.play().catch(()=>{});
            window.removeEventListener('pointerdown', unmute);
            window.removeEventListener('keydown', unmute);
            window.removeEventListener('touchstart', unmute);
          };
          window.addEventListener('pointerdown', unmute, { once:true });
          window.addEventListener('keydown', unmute, { once:true });
          window.addEventListener('touchstart', unmute, { once:true });
        });
      }
    };
    tryPlayWithSound();
  }

  const loadImg = src => { const i=new Image(); i.src=src; return i; };
  const imgs = {
    snake: loadImg('fotos/juquinha.png'),
    bg:    loadImg('fotos/caatinga-bg.jpg'),
    eagle: loadImg('fotos/eagle.png'),
    croc:  loadImg('fotos/crocodile.png'),
    mongoose: loadImg('fotos/mongoose.png'),
    bigsnake: loadImg('fotos/bigsnake.png'),
  };

  function makeLevel(){
    const platforms=[
      {x:0,y:440,w:1100,h:40},{x:1480,y:440,w:700,h:40},{x:2380,y:440,w:900,h:40},
      {x:3740,y:440,w:800,h:40},{x:5000,y:440,w:700,h:40},{x:6000,y:440,w:900,h:40},
      {x:7200,y:440,w:1200,h:40},
      {x:280,y:360,w:110,h:16},{x:480,y:320,w:120,h:16},{x:680,y:280,w:120,h:16},
      {x:880,y:300,w:130,h:16},{x:1080,y:260,w:110,h:16},{x:1300,y:320,w:120,h:16},
      {x:1620,y:340,w:130,h:16},{x:1820,y:290,w:120,h:16},{x:2020,y:250,w:110,h:16},
      {x:2240,y:310,w:130,h:16},{x:2520,y:340,w:130,h:16},{x:2720,y:290,w:120,h:16},
      {x:2920,y:250,w:110,h:16},{x:3140,y:310,w:130,h:16},{x:3380,y:340,w:120,h:16},
      {x:3620,y:300,w:120,h:16},{x:3860,y:260,w:130,h:16},{x:4080,y:310,w:130,h:16},
      {x:4280,y:270,w:120,h:16},{x:4480,y:320,w:120,h:16},{x:4720,y:280,w:130,h:16},
      {x:5000,y:340,w:130,h:16},{x:5200,y:300,w:120,h:16},{x:5400,y:260,w:110,h:16},
      {x:5620,y:320,w:130,h:16},{x:5860,y:280,w:120,h:16},{x:6100,y:330,w:130,h:16},
      {x:6300,y:290,w:120,h:16},{x:6500,y:250,w:110,h:16},{x:6720,y:310,w:130,h:16},
      {x:6960,y:340,w:120,h:16},{x:7200,y:300,w:130,h:16},{x:7420,y:260,w:120,h:16},
      {x:7640,y:320,w:130,h:16},{x:7860,y:280,w:120,h:16},{x:8080,y:330,w:120,h:16},
    ];
    const coinXY=[[340,380],[520,280],[920,260],[1280,380],[1660,280],[1940,240],[2200,380],
      [2560,280],[2900,240],[3140,380],[3900,270],[4290,240],[4700,380],[5220,280],[5540,240],
      [5800,380],[6240,270],[6620,230],[6950,380],[7440,280],[7760,240],[8100,380]];
    const coins = coinXY.map(([x,y])=>({x,y,taken:false}));
    const enemies=[
      {x:600,y:110,w:78,h:64,kind:'eagle',baseX:600,baseY:110,range:240,speed:1.7,t:0,dir:1},
      {x:1700,y:90,w:78,h:64,kind:'eagle',baseX:1700,baseY:90,range:280,speed:1.8,t:1,dir:-1},
      {x:2700,y:120,w:78,h:64,kind:'eagle',baseX:2700,baseY:120,range:260,speed:1.7,t:.5,dir:1},
      {x:3900,y:100,w:78,h:64,kind:'eagle',baseX:3900,baseY:100,range:280,speed:1.8,t:0,dir:-1},
      {x:5200,y:110,w:78,h:64,kind:'eagle',baseX:5200,baseY:110,range:280,speed:1.8,t:.3,dir:1},
      {x:6300,y:100,w:78,h:64,kind:'eagle',baseX:6300,baseY:100,range:300,speed:1.9,t:.7,dir:-1},
      {x:7500,y:120,w:78,h:64,kind:'eagle',baseX:7500,baseY:120,range:300,speed:1.9,t:.2,dir:1},
      {x:1200,y:426,w:72,h:56,kind:'croc',baseX:1280,baseY:426,range:140,speed:1.3,t:0,dir:1},
      {x:3400,y:426,w:72,h:56,kind:'croc',baseX:3450,baseY:426,range:160,speed:1.4,t:0,dir:1},
      {x:3550,y:426,w:72,h:56,kind:'croc',baseX:3600,baseY:426,range:160,speed:1.4,t:.4,dir:-1},
      {x:5780,y:426,w:72,h:56,kind:'croc',baseX:5820,baseY:426,range:130,speed:1.4,t:.6,dir:1},
      {x:7000,y:426,w:72,h:56,kind:'croc',baseX:7000,baseY:426,range:150,speed:1.5,t:.2,dir:-1},
      {x:2700,y:372,w:100,h:76,kind:'bigsnake',baseX:2700,baseY:372,range:280,speed:1.8,t:0,dir:1,chaseRange:320},
      {x:5400,y:372,w:100,h:76,kind:'bigsnake',baseX:5400,baseY:372,range:260,speed:1.9,t:0,dir:-1,chaseRange:320},
      {x:7700,y:372,w:100,h:76,kind:'bigsnake',baseX:7700,baseY:372,range:260,speed:2.0,t:0,dir:1,chaseRange:340},
    ];
    const hazards=[
      {x:700,y:418,w:56,h:22,kind:'branch'},{x:2500,y:418,w:60,h:22,kind:'branch'},
      {x:3900,y:418,w:56,h:22,kind:'branch'},{x:5300,y:418,w:60,h:22,kind:'branch'},
      {x:6700,y:418,w:56,h:22,kind:'branch'},{x:7600,y:418,w:60,h:22,kind:'branch'},
    ];
    const waters=[{x:1100,w:380},{x:3280,w:460},{x:5700,w:300},{x:6900,w:300}];
    return {platforms,coins,enemies,hazards,waters,goalX:8340};
  }

  let level = makeLevel();
  const PLAYER_W=150, PLAYER_H=88, SLIDE_H=50;
  const player = {
    x:50,y:200,w:PLAYER_W,h:PLAYER_H,vx:0,vy:0,onGround:false,facing:1,anim:0,animSpeed:0,
    invuln:0,jumpsLeft:MAX_JUMPS,coyote:0,jumpBuf:0,inWater:false,sliding:0,slideAmt:0,knockback:0,
  };
  let camera=0, score=0, lives=3, energy=100;
  let screen='start';
  const setScore=v=>{score=v;ui.score.textContent=v};
  const setLives=v=>{lives=v;ui.lives.textContent=v};

  function reset(full=true){
    level=makeLevel();
    player.x=50;player.y=200;player.vx=0;player.vy=0;
    player.invuln=0;player.jumpsLeft=MAX_JUMPS;player.sliding=0;player.h=PLAYER_H;
    camera=0;
    if(full){ setScore(0); setLives(3); energy=100; }
  }
  function respawn(){
    setLives(lives-1);
    if(lives<=0){ setScreenTo('over'); }
    else { player.x=Math.max(50,player.x-200);player.y=200;player.vx=0;player.vy=0;
      player.invuln=100;player.jumpsLeft=MAX_JUMPS; }
  }

  function setScreenTo(s){
    screen=s;
    ui.start.classList.toggle('hidden', s!=='start');
    if (ui.introVideo) {
      if (s==='start') {
        try { ui.introVideo.muted = false; ui.introVideo.volume = 1; ui.introVideo.play().catch(()=>{}); } catch(e){}
      } else {
        try {
          ui.introVideo.pause();
          ui.introVideo.muted = true;
          ui.introVideo.volume = 0;
          ui.introVideo.currentTime = 0;
        } catch(e){}
      }
    }
    ui.over.classList.toggle('hidden', s!=='over');
    ui.win.classList.toggle('hidden', s!=='win');
    ui.overScore.textContent=score; ui.winScore.textContent=score;
    ui.pauseBtn.textContent = s==='paused' ? '▶' : '⏸';
    // Controla o video de agradecimento manualmente para evitar audios duplicados
    if(ui.thanksVideo){
      if(s==='win'){
        try { ui.thanksVideo.currentTime = 0; ui.thanksVideo.play().catch(()=>{}); } catch(e){}
      } else {
        try { ui.thanksVideo.pause(); } catch(e){}
      }
    }
  }

  const keys={};
  addEventListener('keydown', e=>{
    keys[e.key.toLowerCase()]=true;
    if(e.key===' '||e.key==='ArrowUp') e.preventDefault();
    if(e.key.toLowerCase()==='p'){
      if(screen==='play') setScreenTo('paused');
      else if(screen==='paused') setScreenTo('play');
    }
  });
  addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

  const touch={left:false,right:false,jumpEdge:false,slideEdge:false,run:false};
  const pts=new Map();
  const rect=()=>canvas.getBoundingClientRect();
  function recompute(){
    let l=false,r=false;
    pts.forEach(q=>{ if(q.side==='left') l=true; else r=true; });
    touch.left=l; touch.right=r; touch.run=l||r;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse') return;
    e.preventDefault();
    const r=rect(); const x=e.clientX-r.left,y=e.clientY-r.top;
    pts.set(e.pointerId,{startX:x,startY:y,side:x>r.width*.5?'right':'left',swiped:false});
    canvas.setPointerCapture?.(e.pointerId);
    recompute();
  },{passive:false});
  canvas.addEventListener('pointermove',e=>{
    const p=pts.get(e.pointerId); if(!p) return;
    e.preventDefault();
    const r=rect(); const x=e.clientX-r.left,y=e.clientY-r.top;
    const dx=x-p.startX,dy=y-p.startY;
    if(!p.swiped){
      if(dy<-22 && -dy>Math.abs(dx)*.6){ touch.jumpEdge=true; p.swiped=true; }
      else if(dy>22 && dy>Math.abs(dx)*.6){ touch.slideEdge=true; p.swiped=true; }
    }
  },{passive:false});
  const onUp=e=>{ if(!pts.has(e.pointerId)) return; pts.delete(e.pointerId); recompute(); };
  canvas.addEventListener('pointerup',onUp);
  canvas.addEventListener('pointercancel',onUp);

  $('startBtn').onclick = ()=>{ reset(true); setScreenTo('play'); };
  $('retryBtn').onclick = ()=>{ reset(true); setScreenTo('play'); };
  $('winBtn').onclick   = ()=>{ reset(true); setScreenTo('play'); };
  ui.pauseBtn.onclick = ()=>{ if(screen==='play') setScreenTo('paused'); else if(screen==='paused') setScreenTo('play'); };

  let prevJump=false;

  function tick(){
    requestAnimationFrame(tick);

    ctx.fillStyle='#7ec8e3'; ctx.fillRect(0,0,W,H);
    if(imgs.bg.complete && imgs.bg.naturalWidth>0){
      const bgW = H*(imgs.bg.naturalWidth/imgs.bg.naturalHeight);
      const period=bgW*2;
      let off=-((camera*.4)%period); if(off>0) off-=period;
      let i=0;
      for(let x=off; x<W+bgW; x+=bgW,i++){
        ctx.save();
        if(i%2===1){ ctx.translate(x+bgW,0); ctx.scale(-1,1); ctx.drawImage(imgs.bg,0,0,bgW,H); }
        else ctx.drawImage(imgs.bg,x,0,bgW,H);
        ctx.restore();
      }
    }

    if(screen!=='play'){
      if(screen==='paused'){
        ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#fff'; ctx.font='bold 48px sans-serif'; ctx.textAlign='center';
        ctx.fillText('PAUSADO', W/2, H/2); ctx.textAlign='left';
      }
      return;
    }

    const left = keys['arrowleft']||keys['a']||touch.left;
    const right= keys['arrowright']||keys['d']||touch.right;
    const jump = keys['arrowup']||keys['w']||keys[' ']||touch.jumpEdge;
    const slidePressed = keys['arrowdown']||keys['s']||touch.slideEdge;
    const runHeld = keys['shift']||touch.run;
    const jumpPressed = jump && !prevJump;
    prevJump = jump;
    touch.jumpEdge=false; touch.slideEdge=false;

    let overWater=false;
    for(const w of level.waters) if(player.x+player.w>w.x && player.x<w.x+w.w){overWater=true;break;}
    const inWater = overWater && player.y+player.h>440-4;
    player.inWater=inWater;

    if(slidePressed && player.onGround && !inWater) player.sliding=SLIDE_TIME;
    else if(player.sliding>0) player.sliding--;
    const targetH = player.sliding>0?SLIDE_H:PLAYER_H;
    if(targetH!==player.h){
      const newY=player.y+(player.h-targetH);
      if(targetH>player.h){
        let blocked=false;
        for(const p of level.platforms){
          if(player.x<p.x+p.w&&player.x+player.w>p.x&&newY<p.y+p.h&&newY+targetH>p.y){blocked=true;break;}
        }
        if(blocked) player.sliding=1;
        else { player.y=newY; player.h=targetH; }
      } else { player.y=newY; player.h=targetH; }
    }

    const wantsRun = runHeld && energy>0 && !inWater;
    energy = wantsRun ? Math.max(0,energy-.4) : Math.min(100,energy+.25);
    ui.runPill.classList.toggle('hidden', !wantsRun);

    const speedMul = (wantsRun?RUN_BOOST:1)*(inWater?WATER_FACTOR:1)*(player.sliding>0?1.15:1);
    const targetVx = (left&&!right?-SPEED*speedMul:0) + (right&&!left?SPEED*speedMul:0);
    if(player.knockback>0) player.knockback--;
    else player.vx += (targetVx-player.vx)*.45;
    if(left) player.facing=-1;
    if(right) player.facing=1;

    if(jumpPressed) player.jumpBuf=JUMP_BUFFER;
    else if(player.jumpBuf>0) player.jumpBuf--;
    if(player.onGround){player.coyote=COYOTE; player.jumpsLeft=MAX_JUMPS;}
    else if(player.coyote>0) player.coyote--;
    const jumpStrength = inWater?JUMP*.6:JUMP;
    if(player.jumpBuf>0 && player.sliding===0){
      if(player.coyote>0||inWater){
        player.vy=jumpStrength; player.onGround=false; player.coyote=0; player.jumpBuf=0;
        player.jumpsLeft=MAX_JUMPS-1;
      } else if(player.jumpsLeft>0){
        player.vy=jumpStrength*.92; player.jumpBuf=0; player.jumpsLeft--;
      }
    }
    if(!jump && player.vy<-4) player.vy=-4;

    const grav = inWater?GRAVITY*.35:GRAVITY;
    player.vy += grav;
    const maxFall = inWater?4:16;
    if(player.vy>maxFall) player.vy=maxFall;
    if(player.invuln>0) player.invuln--;

    const prevBottom = player.y+player.h-player.vy;
    player.x += player.vx;
    if(player.x<0) player.x=0;
    if(player.x+player.w>LEVEL_W) player.x=LEVEL_W-player.w;
    for(const p of level.platforms){
      if(p.y<440) continue;
      if(player.x<p.x+p.w&&player.x+player.w>p.x&&player.y<p.y+p.h&&player.y+player.h>p.y){
        if(player.vx>0){player.x=p.x-player.w;player.vx=0;}
        else if(player.vx<0){player.x=p.x+p.w;player.vx=0;}
      }
    }
    const prevTop = player.y-player.vy;
    player.y += player.vy;
    player.onGround=false;
    for(const p of level.platforms){
      if(player.x<p.x+p.w&&player.x+player.w>p.x&&player.y<p.y+p.h&&player.y+player.h>p.y){
        const isFloating = p.y<440;
        const overlapL=(player.x+player.w)-p.x, overlapR=(p.x+p.w)-player.x;
        const cornerSlip = Math.min(overlapL,overlapR) < player.w*.35;
        if(isFloating){
          if(player.vy>0 && prevBottom<=p.y+2){ player.y=p.y-player.h; player.vy=0; player.onGround=true; }
          else if(player.vy<0 && prevTop>=p.y+p.h-2){
            if(cornerSlip){ if(overlapL<overlapR) player.x=p.x-player.w; else player.x=p.x+p.w; }
            else { player.y=p.y+p.h; player.vy=0; }
          }
        } else {
          if(player.vy>0){ player.y=p.y-player.h; player.vy=0; player.onGround=true; }
          else if(player.vy<0){
            if(cornerSlip){ if(overlapL<overlapR) player.x=p.x-player.w; else player.x=p.x+p.w; }
            else { player.y=p.y+p.h; player.vy=0; }
          }
        }
      }
    }

    const progress = Math.max(0,Math.min(1,player.x/LEVEL_W));
    const diff = Math.min(ENEMY_SPEED_CAP/2, 1.2+progress*.4);
    for(const e of level.enemies){
      e.t += .025*diff;
      const sp = Math.min(ENEMY_SPEED_CAP, e.speed*diff);
      if(e.attack && e.attack>0) e.attack--;
      if(e.kind==='eagle'){
        e.x += e.dir*sp;
        if(e.x>e.baseX+e.range) e.dir=-1;
        if(e.x<e.baseX-e.range) e.dir=1;
        e.y = e.baseY + Math.sin(e.t*2)*24;
      } else if(e.kind==='croc'){
        const water = level.waters.find(w=>e.baseX>=w.x&&e.baseX<=w.x+w.w);
        const minX = water?water.x+4:e.baseX-e.range;
        const maxX = water?water.x+water.w-e.w-4:e.baseX+e.range;
        if(inWater && Math.abs(player.x-e.x)<350){
          const dx=player.x-e.x; e.x += Math.sign(dx)*sp*1.3; e.dir = dx>=0?1:-1;
        } else {
          e.x += e.dir*sp*.9;
          if(e.x>maxX) e.dir=-1; if(e.x<minX) e.dir=1;
        }
        if(e.x<minX) e.x=minX; if(e.x>maxX) e.x=maxX;
        e.y = e.baseY + Math.sin(e.t*3)*3;
      } else if(e.kind==='bigsnake'){
        const dx=player.x-e.x, dist=Math.abs(dx);
        const inTerritory = Math.abs(e.x-e.baseX) < (e.chaseRange??300);
        if(dist<400+progress*200 && inTerritory){
          e.x += Math.sign(dx)*sp*1.05; e.dir=dx>=0?1:-1;
        } else {
          const back=e.baseX-e.x;
          if(Math.abs(back)>2){ e.x += Math.sign(back)*sp*.6; e.dir=back>=0?1:-1; }
        }
        e.y = e.baseY + Math.sin(e.t*4)*4;
      }
    }

    if(player.invuln===0){
      for(const e of level.enemies){
        const hb=14;
        if(player.x+hb<e.x+e.w-hb && player.x+player.w-hb>e.x+hb &&
           player.y+hb<e.y+e.h-hb && player.y+player.h-hb>e.y+hb){
          e.attack=18;
          const dir=player.x<e.x?-1:1;
          player.vx=dir*8; player.vy=-6; player.knockback=12;
          respawn(); break;
        }
      }
    }
    if(player.invuln===0){
      for(const h of level.hazards){
        const hb=10;
        if(player.x+hb<h.x+h.w && player.x+player.w-hb>h.x &&
           player.y+hb<h.y+h.h && player.y+player.h-hb>h.y){ respawn(); break; }
      }
    }
    for(const c of level.coins){
      if(!c.taken && player.x<c.x+24 && player.x+player.w>c.x &&
         player.y<c.y+24 && player.y+player.h>c.y){
        c.taken=true; setScore(score+100);
      }
    }
    if(player.y>H+100) respawn();
    if(player.x+player.w>level.goalX) setScreenTo('win');

    const target = Math.max(0, Math.min(player.x-W/3, LEVEL_W-W));
    camera += (target-camera)*.12;
    player.anim += Math.abs(player.vx)>0 ? .12 : .03;

    ctx.save();
    ctx.translate(-camera,0);

    for(const w of level.waters){
      const g = ctx.createLinearGradient(0,440,0,480);
      g.addColorStop(0,'#5fb3e8'); g.addColorStop(.5,'#2d7fb8'); g.addColorStop(1,'#1a4a70');
      ctx.fillStyle=g; ctx.fillRect(w.x,440,w.w,40);
      ctx.fillStyle='rgba(255,255,255,.4)';
      for(let i=0;i<Math.ceil(w.w/26);i++){
        const xx=w.x+i*26+((Date.now()/60)%26);
        if(xx<w.x+w.w-4){
          ctx.fillRect(xx,446+Math.sin(Date.now()/200+i)*2,12,2);
          ctx.fillRect(xx+4,460+Math.cos(Date.now()/220+i)*2,8,2);
        }
      }
      ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(w.x,440,w.w,2);
    }

    for(const p of level.platforms){
      if(p.y===440){
        ctx.fillStyle='#8b5a2b'; ctx.fillRect(p.x,p.y,p.w,p.h);
        ctx.fillStyle='#a8703a'; ctx.fillRect(p.x,p.y,p.w,6);
        ctx.fillStyle='#6b4220';
        for(let i=0;i<p.w;i+=24){ ctx.fillRect(p.x+i,p.y+16,12,3); ctx.fillRect(p.x+i+6,p.y+28,8,2); }
      } else {
        ctx.fillStyle='#7a4a22'; ctx.fillRect(p.x,p.y,p.w,p.h);
        ctx.fillStyle='#b07840'; ctx.fillRect(p.x,p.y,p.w,4);
        ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(p.x,p.y+p.h-3,p.w,3);
      }
    }

    for(const c of level.coins){
      if(c.taken) continue;
      const yy=c.y+12+Math.sin(Date.now()/200+c.x)*3;
      ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(c.x+12,yy,10,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#b88500'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#fff7c4'; ctx.fillRect(c.x+8,yy-6,2,6);
    }

    for(const h of level.hazards){
      ctx.fillStyle='#5a3a1a'; ctx.strokeStyle='#2e1d0c'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(h.x+h.w/2,h.y+h.h-6,h.w/2,6,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#3d2410';
      for(let i=0;i<4;i++){ const tx=h.x+6+i*(h.w/5); ctx.fillRect(tx,h.y+2,2,8); }
    }

    for(const e of level.enemies){
      const img = imgs[e.kind]; if(!img||!img.complete) continue;
      ctx.save();
      const cx=e.x+e.w/2, cy=e.y+e.h/2;
      ctx.translate(cx,cy);
      ctx.scale(e.dir<0?-1:1,1);
      const atk = e.attack&&e.attack>0?Math.sin((18-e.attack)*.5)*6:0;
      ctx.fillStyle='rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(0,e.h/2+4,e.w/2.2,5,0,0,Math.PI*2); ctx.fill();
      ctx.translate(atk,0);
      ctx.drawImage(img,-e.w/2,-e.h/2,e.w,e.h);
      ctx.restore();
    }

    ctx.fillStyle='#222'; ctx.fillRect(level.goalX,280,4,160);
    ctx.fillStyle='#e63946';
    ctx.beginPath(); ctx.moveTo(level.goalX+4,280); ctx.lineTo(level.goalX+70,300); ctx.lineTo(level.goalX+4,320); ctx.fill();

    if(imgs.snake.complete){
      const speedRatio = Math.min(1, Math.abs(player.vx)/SPEED);
      player.animSpeed += (speedRatio-player.animSpeed)*.08;
      const sr=player.animSpeed, phase=player.anim;
      const swim = inWater?Math.sin(Date.now()/220)*4:0;
      const slideMute = 1-Math.min(1,player.slideAmt*1.5);
      const bob = (Math.sin(phase*.8)*(1+sr*1.2))*slideMute + swim;
      const frameStretch = 1+Math.sin(phase*.9)*.06;
      const frameSquash = 1-Math.sin(phase*.9)*.04;
      const slideTarget = player.sliding>0?1:0;
      player.slideAmt += (slideTarget-player.slideAmt)*.12;
      const sa=player.slideAmt;
      const slideFactor = 1+sa*.25;
      const velStretchX = (1+sr*.18)*slideFactor;
      const velSquashY = (1-sr*.06)*(1-sa*.30);
      const scaleX = velStretchX*frameStretch;
      const scaleY = velSquashY*frameSquash;
      const skew = Math.sin(phase*.9)*.05*sr;
      ctx.save();
      const cx=player.x+player.w/2, cy=player.y+player.h/2+bob;
      ctx.translate(cx,cy);
      ctx.transform(player.facing*scaleX, 0, skew, scaleY, 0, 0);
      ctx.fillStyle='rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(0,player.h/2+6-bob,player.w/2.2,8,0,0,Math.PI*2); ctx.fill();
      if(sr>.55 && (player.invuln===0 || Math.floor(player.invuln/5)%2===0)){
        ctx.globalAlpha = .10*sr;
        ctx.drawImage(imgs.snake,-PLAYER_W/2-8,-PLAYER_H/2,PLAYER_W,PLAYER_H);
        ctx.globalAlpha = 1;
      }
      if(player.invuln===0 || Math.floor(player.invuln/5)%2===0){
        ctx.drawImage(imgs.snake,-PLAYER_W/2,-PLAYER_H/2,PLAYER_W,PLAYER_H);
      }
      ctx.restore();
    }

    ctx.restore();
  }
  requestAnimationFrame(tick);
})();
