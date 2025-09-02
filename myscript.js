/* ==== 위치 보정 + 빠른 이동 + 코인/별 높이 조정 ==== */
let coins=0, stars=0, life=3;
let marioX=70, isJump=false, jumpCount=0;

const MAP_W=3200;
const FLOOR=100;                   // invisible-floor의 높이(px)
const MARIO_H=72, GOOMBA_H=46, PIPE_H=84;

const VIEW_CENTER = ()=>Math.min(450, innerWidth*0.4);
const GROUND_TOP  = ()=>innerHeight - FLOOR - MARIO_H;  // 마리오 top(땅에 붙음)

const START_GRACE_MS = 3000;       // 시작 무적
const HIT_COOLDOWN_MS = 1200;      // 피격 쿨다운
let startTime = Date.now();
let lastHitTime = 0;

const COIN_CNT=8, STAR_CNT=3;
const BRICK_XS=[420,760,1180,1620,2060,2500];
const PIPE_XS =[960,1820,2680];
const GOAL_X=3000;

/* ---------- 초기화 ---------- */
$(function(){
  // 세로 위치를 바닥 기준으로 모두 재설정
  $("#invisible-floor").css({width:MAP_W+"px"});
  $("#mario").css({left:marioX, top:GROUND_TOP()});
  $("#peachStart,#peachEnd").css({top:GROUND_TOP()});

  spawnBricks();
  spawnPipes();
  spawnItems();
  placeGoal();

  // 굼바(천천히 등장)
  setTimeout(()=>startGoomba("#goomba1", 1300, 3), 1800);
  setTimeout(()=>startGoomba("#goomba2", 1900, 3), 2600);

  $("#peachStart").css({left:150}).fadeIn(200).delay(900).fadeOut(400);

  updateHUD();

  /* 입력: 속도 ↑ */
  $(document).on("keydown",(e)=>{
    if ($("#overlay").is(":visible")) return;
    if (e.which===32){ if (jumpCount<2){ jump(); jumpCount++; } }
    if (e.which===39) moveMario(50);   // → 빠르게
    if (e.which===37) moveMario(-50);  // ← 빠르게
  });

  setInterval(()=>{
    const t=parseInt($("#mario").css("top"));
    if (t>=GROUND_TOP() && !isJump) jumpCount=0;
  },40);

  setInterval(gameTick, 24);

  // 창 크기 변경 시 모든 세로 위치 재보정
  $(window).on("resize", ()=>{
    $("#mario").css("top", GROUND_TOP());
    $("#peachStart,#peachEnd").css("top", GROUND_TOP());
    $(".goomba").css("top", innerHeight - FLOOR - GOOMBA_H);
    $(".pipe").css("top", innerHeight - FLOOR - PIPE_H);
    placeGoal();
    // 코인/별은 상대높이 유지: 살짝만 내립니다.
    $(".coin").each(function(){
      const desired = GROUND_TOP() - (80 + Math.random()*120);
      $(this).css("top", Math.max(60, desired));
    });
    $(".star").each(function(){
      const desired = GROUND_TOP() - (110 + Math.random()*120);
      $(this).css("top", Math.max(60, desired));
    });
  });
});

/* ---------- 배치 ---------- */
function spawnBricks(){
  $("#bricks_area").empty();
  BRICK_XS.forEach(x=> $("#bricks_area").append(`<img class="brick" src="brick.png" style="left:${x}px">`));
}
function spawnPipes(){
  $("#pipes_area").empty();
  PIPE_XS.forEach(x=> $("#pipes_area").append(`<img class="pipe" src="pipe.png" style="left:${x}px;top:${innerHeight-FLOOR-PIPE_H}px">`));
}
function spawnItems(){
  $("#coins_area").empty(); $("#stars_area").empty();
  // 코인: 땅에서 80~200px 위 (점프로 닿음)
  for (let i=0;i<COIN_CNT;i++){
    const left = 360 + Math.random()*1800;
    const top  = Math.max(60, GROUND_TOP() - (80 + Math.random()*120));
    $("#coins_area").append(`<img class="coin" src="coin.png" style="left:${left}px;top:${top}px">`);
  }
  // 별: 조금 더 높게 110~230px 위
  for (let i=0;i<STAR_CNT;i++){
    const left = 700 + Math.random()*1500;
    const top  = Math.max(60, GROUND_TOP() - (110 + Math.random()*120));
    $("#stars_area").append(`<img class="star" src="star.png" style="left:${left}px;top:${top}px">`);
  }
}
function placeGoal(){
  $("#goalpipe").css({left:GOAL_X, top: innerHeight - FLOOR - PIPE_H});
}

/* ---------- 적 ---------- */
function startGoomba(sel, startX, speed){
  $(sel).css({left:startX, top: innerHeight - FLOOR - GOOMBA_H, display:"block"});
  setInterval(()=>{
    let x=parseInt($(sel).css("left"))||startX;
    x-=speed;
    if (x<-80) x=startX + Math.random()*800;
    $(sel).css("left", x+"px");
  }, 34);
}

/* ---------- 조작 ---------- */
function jump(){
  const now=parseInt($("#mario").css("top"));
  isJump=true;
  const to=Math.max(now-135, 60);
  $("#mario").stop().animate({top:to+"px"},180, function(){
    $(this).animate({top:GROUND_TOP()+"px"},420, ()=>{ isJump=false; });
  });
}

function moveMario(dx){
  marioX = Math.max(0, Math.min(MAP_W-100, marioX+dx));
  $("#mario").css("left", marioX+"px");

  const center = VIEW_CENTER();
  if (marioX>center && marioX<(MAP_W - (innerWidth-center))){
    const scrollX = -(marioX-center);
    $("#bricks_area,#pipes_area,#coins_area,#stars_area,#goomba1,#goomba2,#goalpipe").each(function(){
      const $el=$(this);
      const org = parseInt($el.attr("data-org")) || parseInt($el.css("left")) || 0;
      $el.attr("data-org", org);
      $el.css("left", org + scrollX + "px");
    });
  }else{
    $("#bricks_area,#pipes_area,#coins_area,#stars_area,#goomba1,#goomba2,#goalpipe").each(function(){
      const $el=$(this);
      const org = parseInt($el.attr("data-org"));
      if (!isNaN(org)) $el.css("left", org+"px");
    });
  }
}

/* ---------- 루프 ---------- */
function gameTick(){
  // 수집
  $(".coin").each(function(){ collect($(this),1,false); });
  $(".star").each(function(){ collect($(this),5,true); });

  const now=Date.now();

  // 굼바(무적/쿨다운 적용)
  if (now - startTime > START_GRACE_MS && now - lastHitTime > HIT_COOLDOWN_MS){
    $(".goomba").each((_,e)=>{
      if (rectHit($("#mario"), $(e), 34, 34)){
        lastHitTime=now;
        loseLife(true);
      }
    });
  }
  // 파이프/벽돌
  if (now - lastHitTime > HIT_COOLDOWN_MS){
    $(".pipe,.brick").each((_,e)=>{
      if (rectHit($("#mario"), $(e), 36, 40)){
        lastHitTime=now;
        const x=parseInt($("#mario").css("left"));
        $("#mario").css("left", (x-40)+"px").addClass("hitblink");
        setTimeout(()=>$("#mario").removeClass("hitblink"), 1200);
        loseLife(false);
      }
    });
  }

  // 골 파이프
  if (rectHit($("#mario"), $("#goalpipe"), 36, 42)) clearStage();
}

/* ---------- 도우미 ---------- */
function rectHit($a,$b,dx=32,dy=32){
  const A=$a.offset(), B=$b.offset();
  return A && B && Math.abs(A.left-B.left)<dx && Math.abs(A.top-B.top)<dy;
}
function collect($obj, point, isStar){
  if (!$obj.is(":visible")) return;
  if (rectHit($("#mario"), $obj, 30, 30)){
    $obj.hide();
    if (isStar) stars+=point; else coins+=point;
    updateHUD();
    // 재스폰: 항상 닿는 높이로
    setTimeout(()=>{
      const l=isStar ? 700+Math.random()*1500 : 360+Math.random()*1800;
      const t=isStar ? Math.max(60, GROUND_TOP()- (110+Math.random()*120))
                     : Math.max(60, GROUND_TOP()- (80 +Math.random()*120));
      $obj.css({left:l+"px",top:t+"px",display:"block"});
    }, 900);
  }
}

function loseLife(){
  life = Math.max(0, life-1);
  updateHUD();
  $("#mario").addClass("hitblink");
  setTimeout(()=>$("#mario").removeClass("hitblink"), 1200);
  if (life===0) gameOver();
}
function updateHUD(){
  $("#coin_score").text(coins);
  $("#star_score").text(stars);
  $("#life_num").text(life);
}

/* 클리어/게임오버 */
function clearStage(){
  const mLeft=parseInt($("#mario").css("left"));
  const mTop =parseInt($("#mario").css("top"));
  $("#peachEnd").css({left:mLeft+80, top:mTop}).show().animate({top:(mTop-60)+"px"},300);
  $("#overlay").show(); $("#panelClear").show();
}
function gameOver(){
  $("#overlay").show();
  $("#panelGameOver").show();
}

/* 재시작 */
function restart(){
  $("#overlay,#panelGameOver,#panelClear").hide();
  $("#peachEnd").hide();
  coins=0; stars=0; life=3; updateHUD();
  startTime=Date.now(); lastHitTime=0;

  marioX=70; $("#mario").stop(true,true).css({left:marioX, top:GROUND_TOP()});
  spawnBricks(); spawnPipes(); spawnItems(); placeGoal();

  setTimeout(()=>startGoomba("#goomba1", 1300, 3), 1000);
  setTimeout(()=>startGoomba("#goomba2", 1900, 3), 1600);

  $("#peachStart").css({left:150, top:GROUND_TOP()}).fadeIn(200).delay(900).fadeOut(400);
}
