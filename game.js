(() => {
  const cardBook = {
    reedling:{name:'Reedling',type:'creature',cost:1,power:1,hp:2,art:'♧',kind:'FEN FOLK',text:'A small light in a long dark.',echo:false},
    fenfox:{name:'Fen Fox',type:'creature',cost:1,power:2,hp:1,art:'⌁',kind:'WILD SPIRIT',text:'Quick as a ripple.',echo:false},
    mossback:{name:'Mossback',type:'creature',cost:2,power:2,hp:3,art:'♜',kind:'MARSH BEAST',text:'Patient. Then unstoppable.',echo:false},
    lanternmage:{name:'Lantern Mage',type:'creature',cost:3,power:2,hp:3,art:'♙',kind:'WANDERER',text:'On arrival: deal 1 to the Keeper.',echo:false,effect:'ping'},
    mourningstag:{name:'Mourning Stag',type:'creature',cost:3,power:3,hp:3,art:'♘',kind:'ECHO SPIRIT',text:'Echo — cast once more from your grave.',echo:true},
    bellroot:{name:'Bellroot Guardian',type:'creature',cost:4,power:3,hp:5,art:'♜',kind:'ANCIENT',text:'A wall grown from drowned stone.',echo:false},
    gloambolt:{name:'Gloam Bolt',type:'spell',cost:2,art:'ϟ',kind:'SPELL',text:'Deal 3 damage to the Keeper.',echo:false,effect:'bolt'},
    moonwater:{name:'Moonwater',type:'spell',cost:2,art:'◌',kind:'SPELL',text:'Restore 4 life to yourself.',echo:false,effect:'heal'},
    rootgrip:{name:'Root Grip',type:'spell',cost:1,art:'⌘',kind:'SPELL',text:'Deal 2 damage to the weakest enemy creature.',echo:false,effect:'snare'},
    sunkenword:{name:'Sunken Word',type:'spell',cost:3,art:'✧',kind:'SPELL',text:'Deal 4 damage to the Keeper.',echo:false,effect:'word'}
  };
  const enemyBook = {
    mireling:{name:'Mireling',power:1,hp:2,art:'♧',kind:'BOG CRAWLER',cost:1},
    tollwraith:{name:'Toll Wraith',power:2,hp:2,art:'♙',kind:'DROWNED SPIRIT',cost:2},
    bogknight:{name:'Bog Knight',power:3,hp:3,art:'♜',kind:'FEN SENTINEL',cost:3},
    bellhound:{name:'Bell Hound',power:2,hp:4,art:'♞',kind:'RELIC HOUND',cost:3}
  };
  const deckList = ['reedling','reedling','reedling','fenfox','fenfox','fenfox','mossback','mossback','mossback','lanternmage','lanternmage','mourningstag','mourningstag','bellroot','gloambolt','gloambolt','moonwater','rootgrip','rootgrip','sunkenword'];
  const enemyList = ['mireling','mireling','tollwraith','mireling','bogknight','tollwraith','bellhound','mireling','bogknight','tollwraith','bellhound','bogknight'];
  const $ = id => document.getElementById(id);
  const state = {
    playerLife:20,enemyLife:24,turn:1,enemyTurns:0,playerMana:1,playerMaxMana:1,enemyMana:0,
    hand:[],deck:[],grave:[],echoed:[],allies:[],foes:[],selectedCard:null,selectedUnit:null,
    finished:false,phase:'player',tolls:0,log:[],toastTimer:null,modalMode:'',
    enemyDeck:[],enemyHand:[]
  };
  let nextId=1;
  function makeCard(key){return {...cardBook[key],key,id:nextId++,damage:0};}
  function makeEnemy(key){return {...enemyBook[key],key,id:nextId++,damage:0,ready:false};}
  function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
  function init(){
    state.deck=shuffle(deckList.map(makeCard)); state.enemyDeck=shuffle([...enemyList]);
    const guaranteed=state.deck.findIndex(c=>c.cost<=2&&c.type==='creature');
    if(guaranteed>0){const [c]=state.deck.splice(guaranteed,1);state.hand.push(c);}
    while(state.hand.length<4) drawPlayer(false);
    state.enemyHand=state.enemyDeck.splice(0,3).map(k=>makeEnemy(k));
    render();
  }
  function drawPlayer(show=true){if(!state.deck.length){if(show)toast('Your library is empty.');return;}const c=state.deck.pop();state.hand.push(c);if(show)toast(`${c.name} drawn`);}
  function render(){
    $('enemyLifeText').textContent=state.enemyLife;$('playerLifeText').textContent=state.playerLife;
    $('enemyLifeBar').style.width=`${Math.max(0,state.enemyLife/24*100)}%`;$('playerLifeBar').style.width=`${Math.max(0,state.playerLife/20*100)}%`;
    $('turnLabel').textContent=state.phase==='player'?`YOUR TURN · ${state.turn}`:`KEEPER'S TURN · ${state.turn}`;
    $('tollCount').textContent=`${state.tolls} / 3`;
    [...$('tollDots').children].forEach((d,i)=>d.classList.toggle('rung',i<state.tolls));
    $('tollNote').textContent=state.tolls===2?'ONE MORE TOLL ENDS THE CHALLENGE':'THE THIRD TOLL MUST NOT RING';
    $('manaText').textContent=`${state.playerMana} / ${state.playerMaxMana}`;
    $('manaPips').innerHTML=Array.from({length:6},(_,i)=>`<i class="${i<state.playerMana?'on':''}"></i>`).join('');
    $('handCount').textContent=state.hand.length;$('graveCount').textContent=state.grave.length;$('deckCount').textContent=`LIBRARY ${state.deck.length}`;
    $('playerStatus').textContent=state.finished?(state.enemyLife<=0?'THE FEN FALLS SILENT':'THE TIDE TAKES YOU'):state.selectedUnit?'READY TO STRIKE':'DRAW A CARD · FIND YOUR LINE';
    $('enemyBoard').innerHTML=state.foes.length?state.foes.map(u=>unitMarkup(u,true)).join(''):'<div class="empty-board">NO SHADOWS IN THE WATER</div>';
    $('playerBoard').innerHTML=state.allies.length?state.allies.map(u=>unitMarkup(u,false)).join(''):'<div class="empty-board">THE WATER WAITS FOR YOUR FIRST ALLY</div>';
    $('handRow').innerHTML=state.hand.length?state.hand.map(c=>cardMarkup(c,false)).join(''):'<div class="empty-hand">Your hand is empty.</div>';
    $('handHint').textContent=state.selectedCard?`${cardBook[state.selectedCard.key].name} · ${state.selectedCard.echo?'ECHO ':''}${state.selectedCard.cost} MANA`:'Choose a card to inspect';
    $('endTurn').disabled=state.finished||state.phase!=='player';
    document.querySelectorAll('.card').forEach(el=>el.addEventListener('click',()=>selectCard(Number(el.dataset.id))));
    document.querySelectorAll('.creature.can-attack').forEach(el=>el.addEventListener('click',()=>selectUnit(Number(el.dataset.id))));
    updateCombatTip();
  }
  function unitMarkup(u,enemy){
    const selected=!enemy&&state.selectedUnit===u.id;
    const canAttack=!enemy&&state.phase==='player'&&u.ready&&!state.finished;
    const max=u.hp||u.maxHp||u.power;
    const actualHp=Math.max(0,max-(u.damage||0));
    return `<div class="creature ${enemy?'enemy':''} ${!u.ready?'tapped':''} ${selected?'selected':''} ${canAttack?'can-attack':''}" data-id="${u.id}" title="${u.name} · ${u.power}/${actualHp}"><div class="creature-art">${u.art}</div><div><div class="creature-name">${u.name}</div><div class="creature-type">${u.kind}</div></div><div class="stats">${u.power}/${actualHp}</div></div>`;
  }
  function cardMarkup(c,grave){const data=cardBook[c.key];const selected=state.selectedCard?.id===c.id;const affordable=state.phase==='player'&&state.playerMana>=c.cost+(grave?1:0)&&!state.finished;
    return `<div class="card ${c.type==='spell'?'spell':''} ${selected?'selected':''} ${affordable?'':'unplayable'}" data-id="${c.id}" title="${data.text}"><div class="card-top"><span>${c.type==='creature'?'CREATURE':'SPELL'}</span><span class="cost-gem">${c.cost+(grave?1:0)}</span></div>${c.echo?'<span class="tag-echo">ECHO</span>':''}<div class="card-art">${c.art}</div><div class="card-title">${c.name}</div><div class="card-type">${c.kind}</div><div class="card-rule">${c.text}</div><div class="card-bottom"><span>${grave?'REPLAY':'FEN DECK'}</span>${c.type==='creature'?`<span class="card-stats">${c.power}/${c.hp}</span>`:''}</div></div>`;
  }
  function updateCombatTip(){const tip=$('combatTip');if(state.finished){tip.innerHTML=`<span>✦</span> ${state.enemyLife<=0?'THE SUNKEN BELL IS SILENT':'THE THIRD TOLL HAS FALLEN'}`;return;}
    if(state.phase!=='player'){tip.innerHTML='<span>✦</span> The Keeper is moving through the reeds…';return;}
    if(state.selectedCard){const c=state.selectedCard;const cost=c.cost+(c.echo?1:0);tip.innerHTML=`<span>✦</span> ${c.name} · ${cost} mana <button class="tip-button" id="playSelected" ${state.playerMana<cost?'disabled':''}>${c.type==='spell'?'CAST':'PLAY'} CARD</button><button class="tip-cancel" id="cancelSelect">CANCEL</button>`;$('playSelected')?.addEventListener('click',playSelected);$('cancelSelect')?.addEventListener('click',()=>{state.selectedCard=null;render();});return;}
    if(state.selectedUnit){const u=state.allies.find(x=>x.id===state.selectedUnit);tip.innerHTML=`<span>✦</span> ${u?.name||'Creature'} selected <button class="tip-button" id="attackSelected">ATTACK</button><button class="tip-cancel" id="cancelSelect">CANCEL</button>`;$('attackSelected')?.addEventListener('click',playerAttack);$('cancelSelect')?.addEventListener('click',()=>{state.selectedUnit=null;render();});return;}
    tip.innerHTML='<span>✦</span> Select a ready creature, then choose <b>ATTACK</b>.';
  }
  function selectCard(id){if(state.finished||state.phase!=='player')return;const c=state.hand.find(x=>x.id===id);if(!c)return;state.selectedCard=state.selectedCard?.id===id?null:c;state.selectedUnit=null;render();}
  function selectUnit(id){if(state.finished||state.phase!=='player')return;const u=state.allies.find(x=>x.id===id);if(!u?.ready)return;state.selectedUnit=state.selectedUnit===id?null:id;state.selectedCard=null;render();}
  function playSelected(){const c=state.selectedCard;if(!c||state.phase!=='player'||state.finished)return;if(state.playerMana<c.cost){toast('Not enough marsh mana.');return;}
    state.playerMana-=c.cost;state.hand=state.hand.filter(x=>x.id!==c.id);state.selectedCard=null;
    if(c.type==='creature'){const unit={...c,ready:false,damage:0,maxHp:c.hp};state.allies.push(unit);if(c.effect==='ping')state.enemyLife-=1;toast(`${c.name} joins your side`);}
    else{resolveSpell(c);state.grave.push(c);}
    checkGameOver();render();
  }
  function resolveSpell(c){if(c.effect==='bolt'){state.enemyLife-=3;toast('Gloam Bolt hits the Keeper for 3.');}
    if(c.effect==='word'){state.enemyLife-=4;toast('The Sunken Word tears through the veil.');}
    if(c.effect==='heal'){const healed=Math.min(4,20-state.playerLife);state.playerLife+=healed;toast(`Moonwater restores ${healed} life.`);}
    if(c.effect==='snare'){
      if(!state.foes.length){state.enemyLife-=2;toast('No enemy to snare — 2 damage to the Keeper.');}
      else{const target=state.foes.slice().sort((a,b)=>a.hp-a.damage-(b.hp-b.damage))[0];target.damage+=2;toast(`${target.name} is caught in roots.`);cleanDead();}
    }
  }
  function playerAttack(){const a=state.allies.find(x=>x.id===state.selectedUnit);if(!a||!a.ready||state.finished)return;state.selectedUnit=null;a.ready=false;
    if(state.foes.length){const blocker=chooseBlocker(state.foes,a);a.damage+=blocker.power;blocker.damage+=a.power;toast(`${a.name} clashes with ${blocker.name}!`);cleanDead();}
    else{state.enemyLife-=a.power;toast(`${a.name} strikes for ${a.power}.`);}
    checkGameOver();render();
  }
  function chooseBlocker(units,attacker){return units.slice().sort((a,b)=>{
    const aKill=a.power>=attacker.hp-attacker.damage?0:1,bKill=b.power>=attacker.hp-attacker.damage?0:1;
    return aKill-bKill || Math.abs((a.hp-a.damage)-attacker.power)-Math.abs((b.hp-b.damage)-attacker.power) || a.hp-b.hp;
  })[0];}
  function cleanDead(){const survivors=[];for(const u of state.allies){if(u.damage>=u.hp){if(cardBook[u.key])state.grave.push({...u,damage:0});}else survivors.push(u);}state.allies=survivors;state.foes=state.foes.filter(u=>u.damage<u.hp);}
  function endPlayerTurn(){if(state.finished||state.phase!=='player')return;state.selectedCard=null;state.selectedUnit=null;state.phase='enemy';render();window.setTimeout(enemyTurn,450);}
  function enemyTurn(){if(state.finished)return;state.enemyTurns++;state.enemyMana=Math.min(6,state.enemyMana+1);
    if(state.enemyDeck.length&&state.enemyHand.length<5)state.enemyHand.push(makeEnemy(state.enemyDeck.shift()));
    let played=0;state.enemyHand.sort((a,b)=>b.cost-a.cost);
    while(played<2){const idx=state.enemyHand.findIndex(c=>c.cost<=state.enemyMana);if(idx<0)break;const c=state.enemyHand.splice(idx,1)[0];state.enemyMana-=c.cost;state.foes.push({...c,ready:false,fresh:true,damage:0});played++;}
    // Enemy creatures already in play attack; new arrivals cannot attack this turn.
    for(const f of [...state.foes]){if(state.finished)break;if(f.fresh){f.fresh=false;continue;}f.ready=false;
      if(state.allies.length){const blocker=chooseBlocker(state.allies,f);blocker.damage+=f.power;f.damage+=blocker.power;toast(`${f.name} is blocked by ${blocker.name}.`);cleanDead();}
      else{state.playerLife-=f.power;toast(`${f.name} strikes you for ${f.power}.`);}
      checkGameOver();
    }
    if(state.finished){render();return;}
    if(state.enemyTurns%2===0){state.tolls++;state.playerLife-=2;state.foes.forEach(f=>{f.power++;f.hp++;});toast(`THE BELL TOLLS! You lose 2 life; the fen grows stronger.`);if(state.tolls>=3&&state.enemyLife>0){state.finished=true;showEnd(false,'The third toll rolls across the fen. The Keeper still lives.');}}
    if(!state.finished){state.turn++;state.phase='player';state.playerMaxMana=Math.min(6,state.playerMaxMana+1);state.playerMana=state.playerMaxMana;state.allies.forEach(u=>u.ready=true);drawPlayer(false);}
    checkGameOver();render();
  }
  function checkGameOver(){if(state.enemyLife<=0){state.enemyLife=0;state.finished=true;showEnd(true,'You break the relic before the third toll. The fen finally falls quiet.');}
    else if(state.playerLife<=0){state.playerLife=0;state.finished=true;showEnd(false,'The marsh claims another traveler. The Bell-Keeper remains.');}}
  function showEnd(win,copy){if(state.modalMode==='end')return;state.modalMode='end';window.setTimeout(()=>{if(state.modalMode!=='end')return;$('modalEyebrow').textContent=win?'CHALLENGE CLEARED':'CHALLENGE FAILED';$('modalTitle').textContent=win?'The bell is silent.':'Lost to the fen.';$('modalBody').innerHTML=`<div class="game-over"><div class="sigil">${win?'✦':'◉'}</div><p>${copy}</p></div>`;$('modalActions').innerHTML='<button class="end-turn" id="restartGame">PLAY AGAIN <span>↻</span></button>';openModal();$('restartGame').addEventListener('click',()=>location.reload());},250);}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=window.setTimeout(()=>el.classList.remove('show'),1900);}
  function openModal(){ $('modalBackdrop').classList.remove('hidden'); }
  function closeModal(){if(state.modalMode==='end')return;$('modalBackdrop').classList.add('hidden');state.modalMode='';}
  function showRules(){state.modalMode='rules';$('modalEyebrow').textContent='FIELD NOTES · CHAPTER 04';$('modalTitle').textContent='How to play';$('modalBody').innerHTML='<p><b>Take your turn:</b> You gain one mana each turn (up to 6). Click a card in your hand, then choose PLAY or CAST. Creatures enter tired and can attack next turn.</p><p><b>Combat:</b> Select a ready creature and press ATTACK. If the Keeper has a creature, it blocks automatically; otherwise your creature hits the Keeper directly. The Keeper attacks in the same way.</p><p><b>New mechanic — Echo:</b> When an Echo creature falls, it enters your graveyard. Open GRAVEYARD to cast it one more time for its printed cost +1 mana.</p><p><b>Challenge:</b> Every second enemy turn the bell tolls, dealing 2 damage to you and strengthening the Keeper’s creatures. Defeat the Keeper before the third toll.</p>';$('modalActions').innerHTML='<button class="end-turn" id="modalOkay">GOT IT <span>→</span></button>';openModal();$('modalOkay').addEventListener('click',closeModal);}
  function showGraveyard(){state.modalMode='grave';$('modalEyebrow').textContent='YOUR GRAVEYARD';$('modalTitle').textContent='Echoes in the deep';const echoes=state.grave.filter(c=>c.echo&&!state.echoed.includes(c.id));
    if(!state.grave.length)$('modalBody').innerHTML='<div class="grave-empty">Nothing rests here yet.</div>';
    else if(!echoes.length)$('modalBody').innerHTML=`<p>${state.grave.length} card${state.grave.length===1?'':'s'} lie in your graveyard. No unused Echo cards remain.</p>`;
    else $('modalBody').innerHTML=`<p>Choose an Echo to cast once more for <b>+1 mana</b>.</p><div class="grave-list">${echoes.map(c=>`<div class="grave-entry"><span>${c.art} &nbsp; ${c.name} · ${c.cost+1} mana</span><button data-echo="${c.id}" ${state.playerMana<c.cost+1||state.phase!=='player'?'disabled':''}>ECHO BACK</button></div>`).join('')}</div>`;
    $('modalActions').innerHTML='<button class="tip-cancel" id="modalOkay">CLOSE</button>';openModal();$('modalOkay').addEventListener('click',closeModal);
    document.querySelectorAll('[data-echo]').forEach(btn=>btn.addEventListener('click',()=>castEcho(Number(btn.dataset.echo))));
  }
  function castEcho(id){const c=state.grave.find(x=>x.id===id);if(!c||!c.echo||state.echoed.includes(c.id)||state.playerMana<c.cost+1||state.phase!=='player'||state.finished)return;
    state.playerMana-=c.cost+1;state.echoed.push(c.id);state.grave=state.grave.filter(x=>x.id!==id);const copy=makeCard(c.key);copy.echo=false;copy.text='Returned from the deep.';state.allies.push({...copy,ready:false,damage:0,maxHp:copy.hp});$('modalBackdrop').classList.add('hidden');state.modalMode='';toast(`${c.name} answers its Echo.`);render();
  }
  $('endTurn').addEventListener('click',endPlayerTurn);$('graveButton').addEventListener('click',showGraveyard);$('rulesButton').addEventListener('click',showRules);$('modalClose').addEventListener('click',closeModal);$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Enter'&&state.phase==='player'&&!state.finished&&state.modalMode==='')endPlayerTurn();});
  init();
})();
