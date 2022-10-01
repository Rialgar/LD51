const TEN_SECONDS = 10000;

function main(){
    const canvas = document.getElementById('canvas');
    let scale = 1;
    const offset = {scale:1, left:0, top: 0};

    const gameState = {
        mousePos: {x: 0, y: -100, dir: Math.atan2(-1, 0)},
        currentWeapon: null,
        weaponTimer: TEN_SECONDS,
        player: {recoil: 0, heat: 0, health: 100},
        projectiles: [],
        enemies: [],
        time: 0,
        enemyQueue: []
    }

    function createBullet(x, y, dir, radius, damage){
        return {
            impactDamage: damage,
            collides: true,
            collisionRadius: radius,
            draw: drawBullet
        }
    }

    const weapons = [
        {id: "pea-shooter", delay: 1, recoil: 1, heat: 1, projectiles: (x, y, dir) => [createBullet(x, y, dir, 5, 5)]}
    ];

    function init(){
        gameState.time = 0;
        gameState.enemies = [];
        gameState.enemyQueue = [];
        gameState.projectiles = [];
        gameState.player = {recoil: 0, heat: 0, health: 100};
        gameState.weaponTimer = TEN_SECONDS;
  
        gameState.currentWeapon = weapons[0];
    }
    init();

    function update(delta){

    }

    const CENTER_SIZE = 20;
    const GUNNER_SIZE = 5;
    const GUNNER_EDGE = CENTER_SIZE + GUNNER_SIZE;
    function drawCenter(ctx){
        ctx.strokeStyle = "white";
        ctx.fillStyle= "black";
        ctx.beginPath();
        ctx.ellipse(0, 0, CENTER_SIZE, CENTER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    function drawGunner(ctx){
        const cosDir = Math.cos(gameState.mousePos.dir);
        const sinDir = Math.sin(gameState.mousePos.dir);

        const centerX = cosDir * CENTER_SIZE;
        const centerY = sinDir * CENTER_SIZE;

        ctx.strokeStyle = "yellow";
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, GUNNER_SIZE, GUNNER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();

        //TODO change depending on weapon?
        //TODO repsect recoil
        const tipX = cosDir * (GUNNER_EDGE + 10);
        const tipY = sinDir * (GUNNER_EDGE + 10);

        const innerX = cosDir * (GUNNER_EDGE + 5);
        const innerY = sinDir * (GUNNER_EDGE + 5);

        const leftX = Math.cos(gameState.mousePos.dir - 0.15) * (GUNNER_EDGE + 3);
        const leftY = Math.sin(gameState.mousePos.dir - 0.15) * (GUNNER_EDGE + 3);

        const rightX = Math.cos(gameState.mousePos.dir + 0.15) * (GUNNER_EDGE + 3);
        const rightY = Math.sin(gameState.mousePos.dir + 0.15) * (GUNNER_EDGE + 3);

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.stroke();
    }

    function draw(){
        //force flush canvas by resizing to prevent memory leak 
        const w = canvas.width;
        canvas.width = 1;
        canvas.width = w;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(100, 100);

        drawGunner(ctx);
        drawCenter(ctx);

        ctx.restore();
    }

    function resize(){
        const clientWidth = document.documentElement.clientWidth;
        const clientHeight = document.documentElement.clientHeight;
        offset.size = Math.min(clientWidth, clientHeight);

        scale = offset.size/200;

        canvas.width = offset.size;
        canvas.height = offset.size;

        offset.left = Math.round((clientWidth-offset.size)/2);
        offset.top = Math.round((clientHeight-offset.size)/2);

        canvas.style.left = `${offset.left}px`;
        canvas.style.top = `${offset.top}px`;
        draw(); //prevent flickering while resizing 
    }

    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('mousemove', (ev) => {
        const canvasX = ev.clientX - offset.left;
        gameState.mousePos.x = (canvasX - offset.size/2) / scale;
        
        const canvasY = ev.clientY - offset.top;
        gameState.mousePos.y = (canvasY - offset.size/2) / scale;

        gameState.mousePos.dir = Math.atan2(gameState.mousePos.y, gameState.mousePos.x);
    });

    window.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
    });

    window.addEventListener('mouseup', (ev) => {
        ev.preventDefault();    
    });

    window.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();    
    });

    let lastTime = Date.now();
    let runningAverageDelta = 1000/60; //we expect 60fps
    function frame(){
        window.requestAnimationFrame(frame);

        const time = Date.now();
        const delta = time - lastTime;
        lastTime = time;
        if(delta > 100){
            //skip frame
            return; 
        }
        runningAverageDelta = (runningAverageDelta * 59 + delta)/60;
        if(runningAverageDelta > 20){
            console.error('Low FPS! ', 1000/runningAverageDelta);
        }
        update(delta);
        draw();
    }

    window.requestAnimationFrame(frame);
}

if(document.readyState === 'complete'){
    main();
} else {
    document.addEventListener('load', main())
}