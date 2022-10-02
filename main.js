function main(){
    const TEN_SECONDS = 10000;
    const CENTER_SIZE = 15;
    const TIMER_SIZE = CENTER_SIZE/5;
    const INNER_CENTER_SIZE = CENTER_SIZE - TIMER_SIZE;
    const GUNNER_SIZE = 5;
    const ENEMY_SPLIT_SIZE = 8;

    function buildShardPath(points0, points1, r){
        let path = `M ${points0[0][0]} ${points0[0][1]}`;
        for(let i = 1; i < points0.length; i++){
            path += ` L ${points0[i][0]} ${points0[i][1]}`
        }
        path += ` A ${r} ${r} 0 0 1 ${points1[points1.length-1][0]} ${points1[points1.length-1][1]}`
        for(let i = points1.length-2; i > 0; i--){
            path += ` L ${points1[i][0]} ${points1[i][1]}`
        }
        path += ' Z';
        return path;
    }

    const cracks = [];
    const shards = [];
    {
        const paths = [];
        for(let i = 0; i < 10; i++){
            const points = [];
            for(let dist = CENTER_SIZE/5; dist < CENTER_SIZE; dist += CENTER_SIZE/5){
                const angle = Math.random() * Math.PI / 6 - Math.PI / 12;
                points.push([Math.sin(angle) * dist, Math.cos(angle) * dist]);
            }
            points.push([0, CENTER_SIZE]);
            const sin = Math.sin(2 * Math.PI * i/10);
            const cos = Math.cos(2 * Math.PI * i/10);
            let path = 'M 0 0';
            points.forEach(p => {
                const x = cos * p[0] - sin * p[1];
                const y = sin * p[0] + cos * p[1];
                p[0] = x;
                p[1] = y;
                path += ` L ${x} ${y}`;
            })
            cracks.push(new Path2D(path));
            paths.push(points);
        }
        for(let i = 0; i < 10; i++){
            const points0 = paths[i];
            const points1 = paths[(i+1) % 10];
            const outside = buildShardPath(points0, points1, CENTER_SIZE);

            const p0 = points0[points0.length - 2];
            const p1 = points1[points1.length - 2];
            const inner_arc = `M ${p0[0]} ${p0[1]} A ${INNER_CENTER_SIZE} ${INNER_CENTER_SIZE} 0 0 1 ${p1[0]} ${p1[1]}`;

            const angle = (i+3) / 10 * 2 * Math.PI;
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            
            const line = new Path2D();
            line.moveTo(cos*CENTER_SIZE, sin*CENTER_SIZE);
            line.lineTo(cos*INNER_CENTER_SIZE, sin*INNER_CENTER_SIZE);
            
            shards.push({
                outside: new Path2D(outside),
                inner_arc: new Path2D(inner_arc),
                line,
                dir: angle,
                center: {x: cos * CENTER_SIZE/2, y: sin * CENTER_SIZE/2}
            });
        }
    }

    const canvas = document.getElementById('canvas');
    let scale = 1;
    const offset = {scale:1, left:0, top: 0};

    const gameState = {
        mousePos: {x: 50, y: 0, dir: 0},
        currentWeapon: null,
        weaponTimerMillis: TEN_SECONDS,
        weaponDelayMillis: 0,
        player: {recoil: 0, heat: 0, cooling: false, health: 10, damageFlash: false},
        projectiles: [],
        enemies: [],
        corpses: [],
        orbs: [],
        shards: [...shards],
        waveCharge: 1,
        time: 0,
        enemyQueue: [],
        buttonsDown: {
            left: false,
            right: false
        },
        tutorial: 0,
        screenShake: 0,
        score: 0,
        won: false
    }

    function updateBullet(projectile, deltaMillis){
        const movement = projectile.unitsPerSec / 1000 * deltaMillis;
        projectile.x += Math.cos(projectile.dir) * movement;
        projectile.y += Math.sin(projectile.dir) * movement;
        projectile.age += deltaMillis;
    }

    function checkCollissionBullet(projectile, enemy){
        if(projectile.age < TEN_SECONDS){
            const deltaX = enemy.x - projectile.x;
            const deltaY = enemy.y - projectile.y;
            const distSq = deltaX*deltaX + deltaY*deltaY;
            const colDist = enemy.size + projectile.radius;
            if(distSq <= colDist*colDist){
                enemy.damageTaken += projectile.damage;
                projectile.age += TEN_SECONDS;
            }
        }
    }

    function drawBullet(projectile, ctx){
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        const scale = Math.max(1, (100-projectile.age)/25);
        ctx.ellipse(projectile.x, projectile.y, projectile.radius*scale, projectile.radius, projectile.dir, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
    }

    function createBullet(x, y, dir, unitsPerSec, radius, damage){
        return {
            x, y, dir, unitsPerSec, damage, radius,
            update: updateBullet,
            draw: drawBullet,
            checkCollission: checkCollissionBullet,
            age: 0,
        }
    }

    function updateWave(projectile, deltaMillis){
        projectile.age += deltaMillis * 5;
        projectile.r = projectile.age * 100 / TEN_SECONDS;
        gameState.screenShake += deltaMillis / (projectile.isWinningWave ? 50 : 150);

        if(projectile.age >= TEN_SECONDS && projectile.isWinningWave){
            alert('You won :D Game will now reset.');
            init();
        }
    }

    function checkCollissionWave(projectile, enemy){
        const dist = Math.sqrt(enemy.x*enemy.x + enemy.y*enemy.y);
        if(dist < projectile.r){
            if(projectile.isWinningWave){
                enemy.damageTaken = 100;
            }
            enemy.x = enemy.x / dist * projectile.r;
            enemy.y = enemy.y / dist * projectile.r;
        }
    }

    function drawWave(projectile, ctx){
        if(projectile.isWinningWave){
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 4;
        } else {
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, projectile.r, projectile.r, 0, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
    }

    function createWave(isWinningWave){
        return {
            update: updateWave,
            draw: drawWave,
            checkCollission: checkCollissionWave,
            isWinningWave: !!isWinningWave,
            age: 0
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
                createBullet(x, y, dir + Math.PI/10, 100, 1, 2),
                createBullet(x, y, dir - Math.PI/10, 100, 1, 2)
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
                createBullet(x, y, dir, 100, 1, 1.666)
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

    function addOrb({x, y, dir}){
        const direction = dir + Math.random() * Math.PI - Math.PI/2;
        const unitsPerSec = 50 + Math.random() * 50;
        gameState.orbs.push({x, y, moveXperSec: Math.cos(direction) * unitsPerSec, moveYperSec: Math.sin(direction) * unitsPerSec});
    }

    function addEnemy(enemy){
        if(gameState.won){
            return;
        }
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
        gameState.player = {cooling: false, recoil: 0, heat: 0, deathAge: 0, health: 10};
        gameState.weaponTimerMillis = TEN_SECONDS;
        gameState.currentWeapon = weapons[0];
        gameState.screenShake = 0;
        gameState.score = 0;
        gameState.orbs = [];
        gameState.waveCharge = 1;
        gameState.weaponDelayMillis = 0;
        gameState.won = false;


        gameState.shards.forEach(shard => {
            shard.rotation = 0;
            shard.x = 0;
            shard.y = 0;
            shard.unitsPerSec = 20 + Math.random() * 20
            shard.rotationPerSec = Math.random() * 2 - 1
        })

        addEnemy({unitsPerSec: 20, size: 5, timeMillis: TEN_SECONDS/2});
        addEnemy({unitsPerSec: 20, size: 5, timeMillis: TEN_SECONDS});
    }
    init();

    function spawnEnemy(newEnemy){
        if(gameState.won){
            return;
        }
        delete newEnemy.timeMillis;
        newEnemy.age = 0;
        newEnemy.health = 2*newEnemy.size;
        newEnemy.damageTaken = 0;
        if(!newEnemy.x){
            newEnemy.x = Math.cos(newEnemy.dir) * 110;
            newEnemy.y = Math.sin(newEnemy.dir) * 110;
            newEnemy.dir += Math.PI; //was spawndir, now movedir
        }
        newEnemy.dir += (Math.random() * 2 * Math.PI/3) - Math.PI/3;

        gameState.enemies.push(newEnemy);
    }

    function splitEnemy(enemy){
        const numPieces = 3 + Math.floor(Math.random() * enemy.size/3);
        const points = [];
        const angles = [];
        for(let i = 0; i < numPieces; i++){
            points[i] = [[0, 0]];
            for(let dist = 2; dist < enemy.size; dist += 2){
                const angle = Math.random() * Math.PI / 6 - Math.PI / 12;
                points[i].push([Math.cos(angle) * dist, Math.sin(angle) * dist]);
            }
            points[i].push([enemy.size, 0]);
            const angle = i/numPieces * 2 * Math.PI + Math.random() * Math.PI/5 - Math.PI /10;
            angles.push(angle);
            
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            points[i].forEach(p => {
                const x = cos*p[0] - sin*p[1];
                const y = sin*p[0] + cos*p[1];
                p[0] = x;
                p[1] = y;
            })
        }
        const pieces = [];
        for(let i = 0; i < numPieces; i++){
            const points0 = points[i];
            const points1 = points[(i+1)%numPieces];
            const angle0 = angles[i];
            let angle1 = angles[(i+1)%numPieces];
            if(angle1 < angle0){
                angle1 += 2 * Math.PI;
            }
            pieces.push({
                path: new Path2D(buildShardPath(points0, points1, enemy.size)),
                x: enemy.x,
                y: enemy.y,
                center: {
                    x: (points0[points0.length-1][0] + points1[points1.length-1][0]) / 3,
                    y: (points0[points0.length-1][1] + points1[points1.length-1][1]) / 3
                },
                dir: (angle0+angle1)/2,
                unitsPerSec: 10 + Math.random() * 30,
                rotation: 0,
                rotationPerSec: Math.random() * 2 * Math.PI - Math.PI,
                age: 0,
            });
        }
        return pieces;
    }

    function updateEnemy(enemy, deltaMillis){
        enemy.health -= enemy.damageTaken;
        if(enemy.health <= 0){
            if(enemy.size >= ENEMY_SPLIT_SIZE){
                spawnEnemy({...enemy, size: 2});
                spawnEnemy({...enemy, size: 2});
            } else {
                addEnemy({...enemy, size: enemy.size + Math.random()*2});
            }

            gameState.corpses.push(...splitEnemy(enemy));
            
            for(let i=0; i<enemy.size; i++){
                addOrb(enemy);
            }
            
            if(gameState.tutorial === 1){
                gameState.tutorial = 2;
            }

            gameState.screenShake += 1;

            return;
        }
        enemy.damageTaken = 0;

        const movement = enemy.unitsPerSec / 1000 * deltaMillis;
        enemy.x += Math.cos(enemy.dir) * movement;
        enemy.y += Math.sin(enemy.dir) * movement;
        enemy.age += deltaMillis;
        
        const distSq = enemy.x*enemy.x + enemy.y*enemy.y;
        if(distSq < CENTER_SIZE*CENTER_SIZE){
            enemy.health = 0;
            gameState.player.health -= 1;
            gameState.player.damageFlash = true;
            gameState.screenShake += 5;
            addEnemy({...enemy});
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
                projectile.checkCollission(projectile, enemy);
            });
        }
    }

    function updateWeapon(deltaMillis){
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
                gameState.screenShake += gameState.currentWeapon.recoil/5;

                const newProjectiles = gameState.currentWeapon.projectiles(tipX, tipY, gameState.mousePos.dir);
                newProjectiles.forEach(projectile => projectile.update(projectile, -gameState.weaponDelayMillis));
                gameState.projectiles.push(...newProjectiles);

                gameState.weaponDelayMillis += gameState.currentWeapon.delayMillis;
                gameState.player.heat = Math.min(6600, gameState.player.heat + gameState.currentWeapon.heat);
                
                if(gameState.player.heat >= 6500){
                    gameState.player.cooling = true;
                }

                if(gameState.tutorial === 0){
                    gameState.tutorial = 1;
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
    }

    function updateOrb(orb, deltaMillis){
        const dSq = orb.x * orb.x + orb.y * orb.y;
        if(dSq < CENTER_SIZE * CENTER_SIZE){
            orb.collected = true;
            gameState.score += 1;
        } else {
            orb.x += orb.moveXperSec * deltaMillis/1000;
            orb.y += orb.moveYperSec * deltaMillis/1000;

            orb.moveXperSec *= 0.95;
            orb.moveYperSec *= 0.95;

            orb.moveXperSec -= orb.x/dSq * 100;
            orb.moveYperSec -= orb.y/dSq * 100;
        }
    }

    function updateCorpse(corpse, deltaMillis){
        if(corpse.age < TEN_SECONDS){
            const movement = corpse.unitsPerSec * deltaMillis/1000;
            corpse.x += Math.cos(corpse.dir) * movement;
            corpse.y += Math.sin(corpse.dir) * movement;
            corpse.rotation += corpse.rotationPerSec * deltaMillis/1000;
            corpse.age += deltaMillis;
            
            corpse.unitsPerSec *= Math.pow(0.9, deltaMillis*60/1000);
            corpse.rotationPerSec *= Math.pow(0.9, deltaMillis*60/1000);
        }
    }

    function update(deltaMillis){
        if(gameState.screenShake > 0){
            gameState.screenShake *= 0.8;
            if(gameState.screenShake < 0.01){
                gameState.screenShake = 0;
            }
        }
        if(gameState.player.health < 0){
            if(gameState.player.deathAge > TEN_SECONDS/2){
                alert('You lost :( Game will now reset.');
                init();
            } else {
                gameState.shards.forEach(shard => {
                    const movement = shard.unitsPerSec * deltaMillis/1000;
                    shard.x += Math.cos(shard.dir) * movement;
                    shard.y += Math.sin(shard.dir) * movement;
                    shard.rotation += shard.rotationPerSec * deltaMillis/1000
                });
                gameState.player.deathAge += deltaMillis;
            }
            return;            
        }

        if(gameState.score >= 600 && !gameState.won){
                gameState.projectiles.push(createWave(true));
                gameState.won = true;
                gameState.enemyQueue = [];
        }

        gameState.time += deltaMillis;

        gameState.orbs.forEach(
            orb => updateOrb(orb, deltaMillis)
        );
        gameState.orbs = gameState.orbs.filter(
            orb => !orb.collected
        )

        gameState.corpses.forEach(
            corpse => updateCorpse(corpse, deltaMillis)
        );

        gameState.projectiles.forEach(
            projectile => projectile.update(projectile, deltaMillis)
        );
        gameState.projectiles = gameState.projectiles.filter(
            projectile => projectile.age < TEN_SECONDS
        );
        
        updateWeapon(deltaMillis);
        gameState.player.damageFlash = false;

        if(gameState.buttonsDown.right && gameState.waveCharge >= 1){
            gameState.waveCharge = 0;
            gameState.projectiles.push(createWave());

            if(gameState.tutorial === 2){
                gameState.tutorial = 3;
            }
        }
        if(gameState.waveCharge < 1){
            gameState.waveCharge += deltaMillis/TEN_SECONDS;
        }

        gameState.enemies.forEach(
            enemy => updateEnemy(enemy, deltaMillis)
        );
        gameState.enemies = gameState.enemies.filter(
            enemy => enemy.health > 0
        );

        gameState.enemyQueue.forEach(queued => queued.timeMillis -= deltaMillis);
        while(gameState.enemyQueue.length > 0 && gameState.enemyQueue[0].timeMillis <= 0){
            spawnEnemy(gameState.enemyQueue.shift());
        }
    }
    
    function drawCenter(ctx){
        if(gameState.player.health < 0){
            ctx.strokeStyle = 'white';
            ctx.fillStyle = 'black'

            ctx.beginPath();
            ctx.ellipse(0, 0, CENTER_SIZE, CENTER_SIZE, 0, 0, 2*Math.PI);
            ctx.closePath();
            ctx.fill();

            gameState.shards.forEach( shard => {
                ctx.save();
                ctx.translate(shard.x, shard.y);

                ctx.translate(shard.center.x, shard.center.y);
                ctx.rotate(shard.rotation);
                ctx.translate(-shard.center.x, -shard.center.y);
                
                ctx.lineWidth = 1;

                ctx.fill(shard.outside);
                ctx.stroke(shard.outside);
                ctx.stroke(shard.inner_arc);
                ctx.lineWidth = 0.5;
                ctx.stroke(shard.line);
                
                ctx.restore();
            })

            return;
        }
        
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
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, CENTER_SIZE, CENTER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();

        if(gameState.player.damageFlash){
            ctx.fillStyle = 'white';    
        } else {
            ctx.fillStyle = 'black';
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, INNER_CENTER_SIZE, INNER_CENTER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if(!gameState.player.damageFlash){
            ctx.fillStyle = 'green';
            const r = Math.sqrt(gameState.score / 600) * INNER_CENTER_SIZE;
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r, 0, 0, 2*Math.PI);
            ctx.closePath();
            ctx.fill();
        }

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

        ctx.fillStyle = 'gold';
        const chargeRadius = gameState.waveCharge * GUNNER_SIZE;
        ctx.beginPath();
        ctx.ellipse(CENTER_SIZE, 0, chargeRadius, chargeRadius, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
        

        ctx.strokeStyle = 'hsl(280, 100%, 75%)'; //aka r 213 g 128 b 255
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(CENTER_SIZE, 0, GUNNER_SIZE, GUNNER_SIZE, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();

        const weaponShape = gameState.currentWeapon.shape;
        if(gameState.player.cooling){
            const blend = (1 - Math.cos(gameState.player.heat * 8 * 2 * Math.PI / 6500)) / 2;
            const r = (255 * blend + 213 * (1-blend));
            const g = (255 * blend + 128 * (1-blend))
            const b = (0 * blend + 255 * (1-blend))
            ctx.strokeStyle = `rgb(${r} ${g} ${b})`;
        }
        
        ctx.translate( -gameState.player.recoil, 0);
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
        if(enemy.damageTaken > 0){
            ctx.fillStyle = "white";
        } else {
            ctx.fillStyle = "red";
        }
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y, enemy.health/2, enemy.health/2, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y, enemy.size, enemy.size, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
        
        if(enemy.size >= ENEMY_SPLIT_SIZE){
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.ellipse(enemy.x, enemy.y, 2, 2, 0, 0, 2*Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    function drawCorpse(corpse, ctx){
        ctx.save();
        
        ctx.translate(corpse.x, corpse.y);
        
        ctx.translate(corpse.center.x, corpse.center.y)
        ctx.rotate(corpse.rotation);
        ctx.translate(-corpse.center.x, -corpse.center.y)
        
        if(corpse.age < TEN_SECONDS/10){
            ctx.strokeStyle = 'white';
        } else {
            const c = 255 - Math.min(200, (corpse.age - TEN_SECONDS/10)/(TEN_SECONDS/5) * 200);
            ctx.strokeStyle = `rgb(${c} ${c} ${c})`;
        }
        ctx.lineWidth = 0.5;
        ctx.stroke(corpse.path);

        ctx.restore();
    }

    function drawTutorial(ctx){
        ctx.strokeStyle = 'white';

        if(gameState.time % 1000 < 500){
            ctx.fillStyle = 'white';
            ctx.save();
            if(gameState.tutorial == 0){
                ctx.translate(-15, 0);
            }
            ctx.fillRect(0, -80, 15, 20);
            ctx.restore();
        }
        
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-15, -80);
        ctx.lineTo(-15, -50);
        ctx.arc(0, -50, 15, Math.PI, 0, true);
        ctx.lineTo(15, -80);
        ctx.closePath();
        ctx.stroke();

        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-15, -60);
        ctx.lineTo(15, -60);
        ctx.moveTo(0, -60);
        ctx.lineTo(0, -80);
        ctx.stroke();
    }

    function drawOrb(orb, ctx){
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.ellipse(orb.x, orb.y, 1, 1, 0, 0, 2*Math.PI);
        ctx.closePath(),
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

        if(gameState.screenShake > 0){
            ctx.translate(Math.random() * gameState.screenShake, Math.random() * gameState.screenShake);
        }

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, 99, 99, 0, 0, 2*Math.PI);
        ctx.closePath();
        ctx.clip();

        gameState.corpses.forEach(
            corpse => drawCorpse(corpse, ctx)
        );

        if(gameState.tutorial === 0 || gameState.tutorial === 2){
            drawTutorial(ctx);
        }

        gameState.orbs.forEach(
            orb => drawOrb(orb, ctx)
        );

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