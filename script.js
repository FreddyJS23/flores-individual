/* -------------------- Configuración -------------------- */
const userName = localStorage.getItem('userName') || 'Cariño';
const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('startScreen');
const scene = document.getElementById('scene');
const musica = document.getElementById('musica');
const typedText = document.getElementById('typedText');
const finalModal = document.getElementById('finalModal');
const closeFinal = document.getElementById('closeFinal');
const instructions = document.getElementById('instructions');

const MAX_FLOWERS = 10;
const MAX_PARTICLES = 36;
let activeParticles = 0;
let flowersCreated = 0;
let ambientTimers = [];
let typingPaused = false;
let typingTimer = null;

/* Mensaje (ahora más lento y con pausas más largas) */
const messageLines = [
  `Audimar, No tengo la fuerza monetaria para comprarte lo que mereces, pero sí tengo virtudes, tiempo y ganas de dar lo mejor de mí. Este detalle nace de eso: esfuerzo honesto, muchas intenciones y la esperanza de sacarte una sonrisa.`,
  `Es solo un pequeño regalo, una muestra de Cariño porque te lo mereces. Que estas flores sirvan como recordatorio de que las pequeñas cosas son lo que nos hacen felices y un  simple gesto puede tener un gran valor si se da con el corazón.`,
  `No pretendo prometer lo imposible;Si algo vale más que el precio, es la intención con la que se da.`,
  `Con cariño para ti, sin más drama y con todo el aprecio posible. Porque Edwin te quiere mucho.`
];

/* ------------- Inicio ------------- */
startBtn.addEventListener('click', start);
startBtn.addEventListener('keydown', e=>{ if(e.key === 'Enter' || e.key === ' ') start(); });

function start(){
  musica.play().catch(()=>{});
  startScreen.classList.add('hidden');
  scene.setAttribute('aria-hidden','false');
  autoGenerateFlowers();           // flores automáticas
  startAmbientParticles();         // partículas ambient
  startTypingSequence();           // escritura (más lenta)
  scene.addEventListener('click', (e)=> spawnClickHearts(e.clientX, e.clientY));
}

/* ------------- Flores automáticas (aparecen, desaparecen, reaparecen) ------------- */
function autoGenerateFlowers(){
  const interval = setInterval(()=>{
    if(flowersCreated >= MAX_FLOWERS){ clearInterval(interval); return; }
    const f = makeFlower();
    scene.appendChild(f);
    // entrada
    requestAnimationFrame(()=>{ f.style.opacity = '3'; f.style.transform = 'scale(1)'; });
    // al aparecer genera partículas como en el ejemplo
    spawnFlowerParticlesAt(f);
    // comenzar ciclo de vida: aparece -> espera -> sale -> reubica -> reaparece
    animateFlowerLifecycle(f);
    flowersCreated++;
  }, 560);
}

function makeFlower(){
  const flower = document.createElement('div');
  flower.className = 'flower';
  // partimos del tamaño original 40px, aplicamos escala entre 0.9x y 3x
  const scale = 0.9 + Math.random() * 2.1; // 0.9 .. 3.0
  const size = Math.round(40 * scale);
  flower.style.width = `${size}px`;
  flower.style.height = `${size}px`;
  // posición inicial aleatoria alrededor del centro (dentro de viewport)
  placeFlowerRandomly(flower);

  const inner = document.createElement('div'); inner.className = 'flower-inner';
  for(let i=0;i<12;i++){
    const p = document.createElement('div'); p.className = 'petal';
    p.style.transform = `rotate(${i*30}deg)`;
    inner.appendChild(p);
  }
  const c = document.createElement('div'); c.className = 'center';
  inner.appendChild(c);
  flower.appendChild(inner);

  // estilo inicial: invisible y pequeña
  flower.style.opacity = '0';
  flower.style.transform = 'scale(0.6)';
  return flower;
}

function placeFlowerRandomly(el){
  const size = parseFloat(getComputedStyle(el).width) || 40;
  const angle = Math.random() * Math.PI * 2;
  const radius = (Math.min(window.innerWidth, window.innerHeight) / 6) + Math.random() * (Math.min(window.innerWidth, window.innerHeight) / 3);
  let x = Math.cos(angle) * radius + window.innerWidth / 2 - size/2;
  let y = Math.sin(angle) * radius + window.innerHeight / 2 - size/2;
  x = Math.max(6, Math.min(window.innerWidth - size - 6, x));
  y = Math.max(6, Math.min(window.innerHeight - size - 6, y));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

/* ciclo de vida de cada flor: aparece -> espera -> sale -> reubica -> reaparece (recursivo) */
function animateFlowerLifecycle(flowerEl){
  const visibleTime = 5200 + Math.random() * 6800; // 5.2s .. 12s visible
  const exitTime = 700 + Math.random() * 600;      // salida breve
  // después de visibleTime -> salir
  const toExit = setTimeout(()=>{
    // animar salida (subir y fade)
    const dx = (Math.random()*80 - 40);
    const dy = -50 - Math.random()*80;
    const anim = flowerEl.animate([
      { transform: getComputedStyle(flowerEl).transform || 'scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 0 }
    ], { duration: exitTime, easing: 'ease-in' });
    anim.onfinish = () => {
      // reposicionar y reingresar después de un pequeño delay
      placeFlowerRandomly(flowerEl);
      // force reflow then animate back in
      flowerEl.style.transform = 'scale(0.6)';
      flowerEl.style.opacity = '0';
      setTimeout(()=> {
        // insertar pequeño "pop" al reaparecer
        const animIn = flowerEl.animate([
          { transform: 'scale(0.6)', opacity: 0 },
          { transform: 'scale(1.05)', opacity: 1 },
          { transform: 'scale(1)', opacity: 1 }
        ], { duration: 650, easing: 'cubic-bezier(.2,.9,.2,1)' });
        animIn.onfinish = ()=> { flowerEl.style.transform = 'scale(1)'; flowerEl.style.opacity = '1'; };
        // cuando reaparece, generar partículas otra vez
        spawnFlowerParticlesAt(flowerEl);
        // reiniciar ciclo vida
        animateFlowerLifecycle(flowerEl);
      }, 260 + Math.random()*420);
    };
  }, visibleTime);
  // guardamos el timeout en el elemento para poder limpiarlo si es necesario
  flowerEl._exitTimeout = toExit;
}

/* si quieres parar ciclos (no usado ahora) */
// function stopFlowerLifecycle(flowerEl){ clearTimeout(flowerEl._exitTimeout); }

/* ------------- Partículas: ambient + al salir de flor + clic ------------- */
function startAmbientParticles(){
  stopAmbientParticles();
  ambientTimers.push(setInterval(()=> { if(activeParticles < MAX_PARTICLES) spawnParticleDot(12 + Math.random()*(innerWidth-24), innerHeight + 8); }, 1000));
  ambientTimers.push(setInterval(()=> { if(activeParticles < MAX_PARTICLES) spawnParticleHeart(12 + Math.random()*(innerWidth-24), innerHeight + 8); }, 1800));
}
function stopAmbientParticles(){ ambientTimers.forEach(t=>clearInterval(t)); ambientTimers = []; }

function spawnFlowerParticlesAt(flowerEl){
  const rect = flowerEl.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const total = 10 + Math.floor(Math.random()*8);
  for(let i=0;i<total;i++){
    if(activeParticles >= MAX_PARTICLES) break;
    const isHeart = Math.random() < 0.18;
    if(isHeart) spawnParticleHeart(cx + (Math.random()*28-14), cy + (Math.random()*20-10));
    else spawnParticleDot(cx + (Math.random()*28-14), cy + (Math.random()*20-10));
  }
}

/* partículas doradas (suben) */
function spawnParticleDot(x,y){
  if(activeParticles >= MAX_PARTICLES) return;
  activeParticles++;
  const node = document.createElement('div'); node.className = 'particle';
  const size = 8 + Math.random()*16;
  node.style.width = node.style.height = `${size}px`;
  node.style.left = `${x}px`; node.style.top = `${y}px`;
  document.body.appendChild(node);

  const endX = x + (Math.random()*240 - 120);
  const endY = y - (200 + Math.random()*260);
  const dur = 3800 + Math.random()*3600;

  const anim = node.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 0 },
    { transform: `translate(${(endX-x)/2}px,${(endY-y)/2}px) scale(1.05)`, opacity: 0.9, offset: 0.45 },
    { transform: `translate(${endX-x}px,${endY-y}px) scale(.9)`, opacity: 0 }
  ], { duration: dur, easing: 'cubic-bezier(.22,.9,.3,1)' });

  anim.onfinish = () => { try{ node.remove(); }catch{} activeParticles = Math.max(0, activeParticles-1); };
  setTimeout(()=> { if(node.parentNode) { node.remove(); activeParticles = Math.max(0, activeParticles-1); } }, dur + 5000);
}

/* corazones (ambient) */
function spawnParticleHeart(x,y){
  if(activeParticles >= MAX_PARTICLES) return;
  activeParticles++;
  const node = document.createElement('div'); node.className = 'heart';
  const isRed = Math.random() < 0.6;
  node.textContent = isRed ? '❤' : '💛';
  node.style.color = isRed ? '#e33' : '#FFD54A';
  node.style.left = `${x}px`; node.style.top = `${y}px`;
  node.style.fontSize = `${12 + Math.random()*18}px`;
  document.body.appendChild(node);

  const endX = x + (Math.random()*260 - 130);
  const endY = y - (180 + Math.random()*260);
  const dur = 3400 + Math.random()*2400;

  const anim = node.animate([
    { transform: 'translate(0,0) scale(.9)', opacity: 0 },
    { transform: `translate(${(endX-x)/2}px,${(endY-y)/2}px) scale(1.05)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${endX-x}px,${endY-y}px) scale(1.2)`, opacity: 0 }
  ], { duration: dur, easing: 'cubic-bezier(.22,.9,.3,1)' });

  anim.onfinish = () => { try{ node.remove(); }catch{} activeParticles = Math.max(0, activeParticles-1); };
  setTimeout(()=> { if(node.parentNode) { node.remove(); activeParticles = Math.max(0, activeParticles-1); } }, dur + 5000);
}

/* burst de corazones al clic (solo corazones) */
function spawnClickHearts(x,y){
  const count = 10 + Math.floor(Math.random()*8);
  for(let i=0;i<count;i++){
    if(activeParticles >= MAX_PARTICLES) break;
    activeParticles++;
    const node = document.createElement('div'); node.className = 'heart';
    const isRed = Math.random() < 0.75;
    node.textContent = isRed ? '❤' : '💛';
    node.style.color = isRed ? '#e33' : '#FFD54A';
    node.style.left = `${x + (Math.random()*28-14)}px`;
    node.style.top = `${y + (Math.random()*22-11)}px`;
    node.style.fontSize = `${12 + Math.random()*22}px`;
    document.body.appendChild(node);

    const ang = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random()*160;
    const endX = (x + Math.cos(ang) * dist) + (Math.random()*40-20);
    const endY = (y + Math.sin(ang) * dist) - (80 + Math.random()*120);
    const dur = 700 + Math.random()*900;

    const anim = node.animate([
      { transform:'translate(0,0) scale(1)', opacity:1 },
      { transform:`translate(${endX - x}px,${endY - y}px) scale(.6)`, opacity:0 }
    ], { duration: dur, easing: 'cubic-bezier(.22,.9,.3,1)' });

    anim.onfinish = () => { try{ node.remove(); }catch{} activeParticles = Math.max(0, activeParticles-1); };
    setTimeout(()=> { if(node.parentNode) { node.remove(); activeParticles = Math.max(0, activeParticles-1); } }, dur + 3000);
  }
}

/* ------------- Máquina de escribir (más lenta) y modal final ------------- */
function startTypingSequence(){
  let idx = 0;
  (function nextLine(){
    if(document.hidden){ typingPaused = true; typingTimer = setTimeout(nextLine, 1000); return; }
    typingPaused = false;
    typeText(messageLines[idx], typedText, 36, ()=>{   // 36ms por carácter (más ágil)
      if(idx === messageLines.length - 1){
        setTimeout(()=> showFinalModal(), 1800); // pausa dramática un poco mayor antes del modal
        return;
      }
      idx = (idx + 1) % messageLines.length;
      typingTimer = setTimeout(nextLine, 4000); // pausa entre líneas más larga (4s)
    });
  })();
}

function typeText(text, el, speed = 36, cb){
  el.textContent = '';
  let i = 0;
  const t = setInterval(()=>{
    el.textContent += text[i++] || '';
    if(i > text.length){
      clearInterval(t);
      setTimeout(cb, 700);
    }
  }, speed);
}

/* mostrar modal final */
function showFinalModal(){
  finalModal.classList.remove('hidden');
  const card = finalModal.querySelector('.final-card');
  card.animate([{ transform:'scale(.95)', opacity:0 }, { transform:'scale(1)', opacity:1 }], { duration:600, easing:'cubic-bezier(.2,.9,.2,1)'});
}

/* cerrar modal */
if(closeFinal) closeFinal.addEventListener('click', ()=> finalModal.classList.add('hidden'));

/* ------------- Visibilidad y limpieza ------------- */
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    stopAmbientParticles();
    if(!musica.paused) musica.pause();
  } else {
    if(!startScreen.classList.contains('hidden')){
      return;
    }
    startAmbientParticles();
    if(musica.paused) musica.play().catch(()=>{});
    if(typingPaused) startTypingSequence();
  }
});

window.addEventListener('beforeunload', ()=> { stopAmbientParticles(); clearTimeout(typingTimer); });
