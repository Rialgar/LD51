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
        player: {recoil: 0, heat: 0, cooling: false, health: 10},
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
            x, y, dir, unitsPerSec, damage,
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
            heat: 900,
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
            heat: 600,
            distance: 4,
            depth: 3,
            grip: 1,
            width: Math.PI/5,
            projectiles: (x, y, dir) => [
                createBullet(x, y, dir, 100, 1, 2),
                createBullet(x, y, dir + Math.PI/6, 100, 1, 2),
                createBullet(x, y, dir - Math.PI/6, 100, 1, 2)
            ]
        },
        {
            id: "burst",
            delayMillis: 50,
            recoil: 1,
            heat: 300,
            distance: 3,
            depth: 7,
            grip: 2,
            width: Math.PI/6,
            projectiles: (x, y, dir) => [
                createBullet(x, y, dir, 100, 1, 1)
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

    function addEnemy(enemy){
        enemy.dir = Math.random() * 2 * Math.PI;
        delete enemy.x;
        delete enemy.y;

        if(!enemy.timeMillis){
            enemy.timeMillis = TEN_SECONDS;
        }
        const index = gameState.enemyQueue.findIndex(existing => existing.timeMillis > enemy.timeMillis);
        if(index >= 0){
            gameState.enemyQueue.splice(index, 0, enemy);
        } else {
            gameState.enemyQueue.push(enemy);
        }
    }

    function init(){
        gameState.time = 0;
        gameState.enemies = [];
        gameState.enemyQueue = [];
        gameState.projectiles = [];
        gameState.player = {recoil: 0, heat: 0, health: 10};
        gameState.weaponTimerMillis = TEN_SECONDS;

        gameState.currentWeapon = weapons[0];
        addEnemy({unitsPerSec: 20, size: 5, timeMillis: 5000});
        addEnemy({unitsPerSec: 20, size: 5, timeMillis: TEN_SECONDS});
    }
    init();

    function spawnEnemy(newEnemy){
        delete newEnemy.timeMillis;
        newEnemy.age = 0;
        newEnemy.health = 2*newEnemy.size;
        if(!newEnemy.x){
            newEnemy.x = Math.cos(newEnemy.dir) * 110;
            newEnemy.y = Math.sin(newEnemy.dir) * 110;
            newEnemy.dir += Math.PI; //was spawndir, now movedir
        }
        newEnemy.dir += (Math.random() * 2 * Math.PI/3) - Math.PI/3;

        gameState.enemies.push(newEnemy);
    }

    function updateProjectile(projectile, deltaMillis){
        const movement = projectile.unitsPerSec / 1000 * deltaMillis;
        projectile.x += Math.cos(projectile.dir) * movement;
        projectile.y += Math.sin(projectile.dir) * movement;
        projectile.age += deltaMillis;
    }

    function update(deltaMillis){
        gameState.projectiles.forEach( projectile => updateProjectile(projectile, deltaMillis));
        gameState.projectiles = gameState.projectiles.filter(projectile => projectile.age < TEN_SECONDS);
        
        gameState.player.recoil = Math.max(0, Math.min(gameState.player.recoil - 0.1, gameState.player.recoil/1.2));
        gameState.player.heat = Math.max(0, gameState.player.heat - deltaMillis*2);
        if(gameState.player.heat < 100){
            gameState.player.cooling = false;
        }

        if(gameState.weaponDelayMillis > 0){
            gameState.weaponDelayMillis -= deltaMillis;
        }
        if(gameState.weaponDelayMillis <= 0){
            if(gameState.buttonsDown.left && !gameState.player.cooling){
                const tipX = Math.cos(gameState.mousePos.dir) * (gameState.currentWeapon.shape.tip - gameState.player.recoil);
                const tipY = Math.sin(gameState.mousePos.dir) * (gameState.currentWeapon.shape.tip - gameState.player.recoil);

                gameState.player.recoil += gameState.currentWeapon.recoil;

                const newProjectiles = gameState.currentWeapon.projectiles(tipX, tipY, gameState.mousePos.dir);
                newProjectiles.forEach(projectile => updateProjectile(projectile, -gameState.weaponDelayMillis));
                gameState.projectiles.push(...newProjectiles);

                gameState.weaponDelayMillis += gameState.currentWeapon.delayMillis;
                gameState.player.heat = Math.min(6600, gameState.player.heat + gameState.currentWeapon.heat);
                
                if(gameState.player.heat >= 6500){
                    gameState.player.cooling = true;
                }
            } else {
                gameState.weaponDelayMillis = 0;
            }
        }

        gameState.weaponTimerMillis = Math.max(0, gameState.weaponTimerMillis - deltaMillis);
        if(gameState.weaponTimerMillis === 0){
            gameState.weaponTimerMillis = TEN_SECONDS;
            const candidates = weapons.filter(weapon => weapon !== gameState.currentWeapon);
            gameState.currentWeapon = candidates[Math.floor(Math.random() * candidates.length)];
            gameState.weaponDelayMillis = 0;
        }

        gameState.enemies.forEach(enemy => {
            const movement = enemy.unitsPerSec / 1000 * deltaMillis;
            enemy.x += Math.cos(enemy.dir) * movement;
            enemy.y += Math.sin(enemy.dir) * movement;
            enemy.age += deltaMillis;

            const distSq = enemy.x*enemy.x + enemy.y*enemy.y;
            if(distSq < CENTER_SIZE*CENTER_SIZE){
                if(gameState.player.health > 0){
                    enemy.health = 0;
                    gameState.player.health -= 1;
                    addEnemy({...enemy, size: enemy.size});
                } else {
                    alert('You lost. Game will reset.');
                    init();
                }
            } else {
                const weight = Math.round(1e7/deltaMillis/enemy.age);
                let dirToTarget = Math.atan2(-enemy.y, -enemy.x);
                while(dirToTarget - enemy.dir > Math.PI){
                    dirToTarget -= 2*Math.PI;
                }
                while(dirToTarget - enemy.dir < -Math.PI){
                    dirToTarget += 2*Math.PI;
                }
                enemy.dir = (enemy.dir * weight + dirToTarget) / (weight + 1);

                gameState.projectiles.forEach(projectile => {
                    if(projectile.collides){
                        const deltaX = enemy.x - projectile.x;
                        const deltaY = enemy.y - projectile.y;
                        const distSq = deltaX*deltaX + deltaY*deltaY;
                        const colDist = enemy.size + projectile.collisionRadius;
                        if(distSq < colDist*colDist){
                            enemy.health -= projectile.damage;
                            projectile.age += TEN_SECONDS;
                        }
                    }
                });

                if(enemy.health <= 0){
                    if(enemy.size >= 8){
                        spawnEnemy({...enemy, size: 2});
                        spawnEnemy({...enemy, size: 2});
                    } else {
                        addEnemy({...enemy, size: enemy.size + Math.random()*2});
                    }
                }
            }
        });

        gameState.enemies = gameState.enemies.filter(enemy => enemy.health > 0);

        gameState.enemyQueue.forEach(queued => queued.timeMillis -= deltaMillis);
        while(gameState.enemyQueue.length > 0 && gameState.enemyQueue[0].timeMillis <= 0){
            spawnEnemy(gameState.enemyQueue.shift());
        }
    }

    const cracks = [];
    for(let i = 0; i < 10; i++){
        const points = [
            [Math.random() * CENTER_SIZE/3 - CENTER_SIZE/6, 1*CENTER_SIZE/4],
            [Math.random() * CENTER_SIZE/3 - CENTER_SIZE/6, 2*CENTER_SIZE/4],
            [Math.random() * CENTER_SIZE/3 - CENTER_SIZE/6, 3*CENTER_SIZE/4],
            [0, CENTER_SIZE]
        ]
        const sin = Math.sin(2 * Math.PI * i/10);
        const cos = Math.cos(2 * Math.PI * i/10);
        let path = 'M 0 0';
        points.forEach(p => {
            const x = cos * p[0] - sin * p[1];
            const y = sin * p[0] + cos * p[1];
            path += ` L ${x} ${y}`;
        })
        cracks.push(new Path2D(path));
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

        for(let i = 0; i < 10 && i < 10-gameState.player.health; i++){
            ctx.lineWidth = 0.2;
            ctx.fillStyle = 'white';
            ctx.stroke(cracks[i]);
        }
    }

    //Kelvin to RGB, based on https://github.com/timvw74/Kelvin2RGB/blob/master/Kelvin2RGB.cpp
    function tempToRGB(kelvin){
        const tmpKelvinHundrets = kelvin/100;

        let r = 0, g = 0, b = 0;
        if(tmpKelvinHundrets <= 66){
            if(tmpKelvinHundrets <= 5.1){
                //not a useful value for actual color temp stuff, but useful to fade to black in this game
                r = kelvin/2;
            } else {
                r = 255; 
            }
            g = 99.4708025861 * Math.log(tmpKelvinHundrets) - 161.1195681661

            if(tmpKelvinHundrets <= 19){
                b = 0;
              } else {
                b = (138.5177312231 * Math.log(tmpKelvinHundrets - 10)) - 305.0447927307;
              }
        } else {
            r = 329.698727466 * Math.pow(tmpKelvinHundrets - 60, -0.1332047592);
            g = 288.1221695283 * Math.pow(tmpKelvinHundrets - 60, -0.0755148492);
            b = 255;
        }
        return {
            r: Math.min(255, Math.max(0, r)),
            g: Math.min(255, Math.max(0, g)),
            b: Math.min(255, Math.max(0, b)),
        }
    }
    window.tempToRGB = tempToRGB;

    function drawGunner(ctx){
        ctx.save()
        ctx.rotate(gameState.mousePos.dir);

        ctx.strokeStyle = 'hsl(280, 100%, 75%)';
        ctx.beginPath();
        ctx.ellipse(CENTER_SIZE, 0, GUNNER_SIZE, GUNNER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();

        const weaponShape = gameState.currentWeapon.shape;
        if(gameState.player.cooling){
            ctx.translate( CENTER_SIZE - weaponShape.leftX, 0);
        } else {
            ctx.translate( -gameState.player.recoil, 0);
        }
        const heatColor = tempToRGB(gameState.player.heat);

        ctx.fillStyle = `rgb(${heatColor.r}  ${heatColor.g}  ${heatColor.b})`;
        ctx.beginPath();
        ctx.moveTo(weaponShape.inner, 0);
        ctx.lineTo(weaponShape.leftX, weaponShape.leftY);
        ctx.lineTo(weaponShape.tip, 0);
        ctx.lineTo(weaponShape.rightX, weaponShape.rightY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    function drawEnemy(enemy, ctx){
        ctx.strokeStyle = "white";
        ctx.fillStyle = "red";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y, enemy.size, enemy.size, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
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

        gameState.enemies.forEach(
            enemy => drawEnemy(enemy, ctx)
        );
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