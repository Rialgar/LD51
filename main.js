function main(){
    const TEN_SECONDS = 10000;
    const CENTER_SIZE = 15;
    const TIMER_SIZE = 3;
    const INNER_CENTER_SIZE = CENTER_SIZE - TIMER_SIZE;
    const GUNNER_SIZE = 5;

    const canvas = document.getElementById('canvas');
    let scale = 1;
    const offset = {scale:1, left:0, top: 0};

    const gameState = {
        mousePos: {x: 50, y: 0, dir: 0},
        currentWeapon: null,
        weaponTimerMillis: TEN_SECONDS,
        weaponDelayMillis: 0,
        player: {recoil: 0, heat: 0, health: 100},
        projectiles: [],
        enemies: [],
        time: 0,
        enemyQueue: [],
        buttonsDown: {
            left: false,
            right: false
        }
    }

    function drawBullet(projectile, ctx){
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        const scale = Math.max(1, (100-projectile.age)/25);
        ctx.ellipse(projectile.x, projectile.y, projectile.collisionRadius*scale, projectile.collisionRadius, projectile.dir, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
    }

    function createBullet(x, y, dir, unitsPerSec, radius, damage){
        return {
            x, y, dir, unitsPerSec,
            impactDamage: damage,
            collides: true,
            collisionRadius: radius,
            draw: drawBullet,
            age: 0,
        }
    }

    const weapons = [
        {
            id: "pea-shooter",
            delayMillis: 300,
            recoil: 2,
            heat: 1,
            distance: 5,
            depth: 5,
            grip: 2,
            width: Math.PI/6,
            projectiles: (x, y, dir) => [createBullet(x, y, dir, 100, 2, 5)]
        },
        {
            id: "spread",
            delayMillis: 200,
            recoil: 1,
            heat: 1,
            distance: 4,
            depth: 3,
            grip: 1,
            width: Math.PI/5,
            projectiles: (x, y, dir) => [
                createBullet(x, y, dir, 100, 1, 2),
                createBullet(x, y, dir + Math.PI/6, 100, 1, 2),
                createBullet(x, y, dir - Math.PI/6, 100, 1, 2)
            ]
        }
    ];

    weapons.forEach( weapon => {
        const inner = CENTER_SIZE + GUNNER_SIZE + weapon.distance;
        const tip = inner + weapon.depth;
        const side = GUNNER_SIZE + weapon.distance - weapon.grip;

        const leftX = CENTER_SIZE + Math.cos(-weapon.width) * side;
        const leftY = Math.sin(-weapon.width) * side;

        const rightX = CENTER_SIZE + Math.cos(weapon.width) * side;
        const rightY = Math.sin(weapon.width) * side;

        weapon.shape = {
            tip,
            inner,
            leftX,
            leftY,
            rightX,
            rightY
        }
    });

    function init(){
        gameState.time = 0;
        gameState.enemies = [];
        gameState.enemyQueue = [];
        gameState.projectiles = [];
        gameState.player = {recoil: 0, heat: 0, health: 100};
        gameState.weaponTimerMillis = TEN_SECONDS;

        gameState.currentWeapon = weapons[0];
    }
    init();

    function update(deltaMillis){
        gameState.projectiles.forEach( projectile => {
            const movement = projectile.unitsPerSec / 1000 * deltaMillis;
            projectile.x += Math.cos(projectile.dir) * movement;
            projectile.y += Math.sin(projectile.dir) * movement;
            projectile.age += deltaMillis;
        });
        gameState.projectiles = gameState.projectiles.filter(projectile => projectile.age < TEN_SECONDS);
        
        gameState.player.recoil = Math.max(0, Math.min(gameState.player.recoil - 0.1, gameState.player.recoil/1.2));

        gameState.weaponDelayMillis = Math.max(0, gameState.weaponDelayMillis - deltaMillis);
        if(gameState.buttonsDown.left && gameState.weaponDelayMillis === 0){            
            const tipX = Math.cos(gameState.mousePos.dir) * (gameState.currentWeapon.shape.tip - gameState.player.recoil);
            const tipY = Math.sin(gameState.mousePos.dir) * (gameState.currentWeapon.shape.tip - gameState.player.recoil);

            gameState.player.recoil += gameState.currentWeapon.recoil;

            gameState.projectiles.push(...gameState.currentWeapon.projectiles(tipX, tipY, gameState.mousePos.dir));
            gameState.weaponDelayMillis = gameState.currentWeapon.delayMillis;
        }

        gameState.weaponTimerMillis = Math.max(0, gameState.weaponTimerMillis - deltaMillis);
        if(gameState.weaponTimerMillis === 0){
            gameState.weaponTimerMillis = TEN_SECONDS;
            const candidates = weapons.filter(weapon => weapon !== gameState.currentWeapon);
            gameState.currentWeapon = candidates[Math.floor(Math.random() * candidates.length)];
            gameState.weaponDelayMillis = 0;
        }
    }

    function drawCenter(ctx){
        for(let i = 0; i < 10; i++){
            const angle0 = (i-3) / 10 * 2 * Math.PI;
            const sin0 = Math.sin(angle0);
            const cos0 = Math.cos(angle0);
            const angle1 = (i-2) / 10 * 2 * Math.PI;
            const sin1 = Math.sin(angle1);
            const cos1 = Math.cos(angle1);

            const level = Math.min(1, Math.max(0, i + 1 - gameState.weaponTimerMillis/1000));
            ctx.fillStyle = `hsl(280, 100%, ${level*50}%)`;
            ctx.beginPath();
            ctx.moveTo(cos0*CENTER_SIZE, sin0*CENTER_SIZE);
            ctx.arc(0, 0, CENTER_SIZE, angle0, angle1);
            ctx.lineTo(cos1*INNER_CENTER_SIZE, sin1*INNER_CENTER_SIZE);
            ctx.arc(0, 0, INNER_CENTER_SIZE, angle1, angle0, true);
            ctx.closePath();
            ctx.fill();
        }

        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.ellipse(0, 0, CENTER_SIZE, CENTER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.ellipse(0, 0, INNER_CENTER_SIZE, INNER_CENTER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        for(let i = 0; i < 10; i++){
            const angle = i / 10 * 2 * Math.PI;
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cos*CENTER_SIZE, sin*CENTER_SIZE);
            ctx.lineTo(cos*INNER_CENTER_SIZE, sin*INNER_CENTER_SIZE);
            ctx.stroke();
        }
    }

    function drawGunner(ctx){
        ctx.save()
        ctx.rotate(gameState.mousePos.dir);

        ctx.strokeStyle = 'hsl(280, 100%, 75%)';
        ctx.beginPath();
        ctx.ellipse(CENTER_SIZE, 0, GUNNER_SIZE, GUNNER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();

        ctx.translate(-gameState.player.recoil, 0);
        const weaponShape = gameState.currentWeapon.shape;

        ctx.beginPath();
        ctx.moveTo(weaponShape.inner, 0);
        ctx.lineTo(weaponShape.leftX, weaponShape.leftY);
        ctx.lineTo(weaponShape.tip, 0);
        ctx.lineTo(weaponShape.rightX, weaponShape.rightY);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    function drawFrame(ctx){
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 99, 99, 0, 0, 2*Math.PI);
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

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, 99, 99, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.clip();

        gameState.projectiles.forEach(
            projectile => projectile.draw(projectile, ctx)
        );
        drawGunner(ctx);
        drawCenter(ctx);

        ctx.restore();
        drawFrame(ctx);

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
        if(ev.button === 0){
            gameState.buttonsDown.left = true;
        } else if (ev.button === 2){
            gameState.buttonsDown.right = true;
        }
    });

    window.addEventListener('mouseup', (ev) => {
        ev.preventDefault();
        if(ev.button === 0){
            gameState.buttonsDown.left = false;
        } else if (ev.button === 2){
            gameState.buttonsDown.right = false;
        }
    });

    window.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
    });

    let lastTimeMillis = Date.now();
    let runningAverageDeltaMillis = 1000/60; //we expect 60fps
    function frame(){
        window.requestAnimationFrame(frame);

        const timeMillis = Date.now();
        const deltaMillis = timeMillis - lastTimeMillis;
        lastTimeMillis = timeMillis;
        if(deltaMillis > 100){
            //skip frame
            return;
        }
        runningAverageDeltaMillis = (runningAverageDeltaMillis * 59 + deltaMillis)/60;
        if(runningAverageDeltaMillis > 20){
            console.error('Low FPS! ', 1000/runningAverageDeltaMillis);
        }
        update(deltaMillis);
        draw();
    }

    window.requestAnimationFrame(frame);

    window.gameState = gameState;
}

if(document.readyState === 'complete'){
    main();
} else {
    document.addEventListener('load', main())
}