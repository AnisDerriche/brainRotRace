const wsProtocol = (location.protocol === 'https:') ? 'wss:' : 'ws:';
const wsHost = location.host;
const ws = new WebSocket(wsProtocol + '//' + wsHost);

ws.onopen = () => {
    console.log('WebSocket connecté au serveur', wsProtocol + '//' + wsHost);
};

ws.onclose = (ev) => {
    console.log('WebSocket fermés', ev && ev.code ? ev.code : '');
};

ws.onerror = (err) => {
    console.error('Erreur WebSocket', err);
};

ws.onmessage = async (event) => {
    try {
        console.log('WS raw message type:', Object.prototype.toString.call(event.data));
    } catch (e) {}

    let payload = event.data;

    if (payload instanceof Blob) {
        if (typeof payload.text === 'function') {
            payload = await payload.text();
        } else {
            payload = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsText(payload);
            });
        }
    } else if (payload instanceof ArrayBuffer) {
        payload = new TextDecoder().decode(new Uint8Array(payload));
    } else if (typeof payload !== 'string') {
        payload = String(payload);
    }

    let cmd = null;
    try {
        const obj = JSON.parse(payload);
        if (obj && obj.type === 'command' && typeof obj.cmd === 'string') {
            cmd = obj.cmd;
        } else if (obj && typeof obj.cmd === 'string') {
            cmd = obj.cmd;
        }
    } catch (e) {
        cmd = payload;
    }

    console.log('WS message reçu:', payload, '-> cmd=', cmd);

    if (!cmd) return;

    switch (cmd) {
        case 'left':
            console.log('Tourner à gauche');
            road_lane = Math.max(0, road_lane - 1);
            break;
        case 'right':
            console.log('Tourner à droite');
            road_lane = Math.min(road_lane + 1, 2);
            break;
        default:
            console.log('Commande inconnue:', cmd);
    }
};

//!------------------------------------------------

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timer = document.getElementById('temps');
const score = document.getElementById('score');

let running = true;
let game_score = 0;
let car_score = 0;
let last_timer = Date.now();
let last_score_change = Date.now();
let in_game_timer = 0;

//** Set Road and Canvas size */
const road_width = canvas.width;
const road_height = canvas.height;

//** Move The Car */
let road_lane = 0; //!IMPORTANT

//** Road */
const road_line_number = 20;
const road_line_space_between = 10;
const road_line_width = 15;

const road_line_height = road_height / road_line_number;
const single_road_width = (road_width - (road_line_width * 2)) / 3;

// const player_car_color = "red"; // PLUS BESOIN DE CA
const space_between_car_and_line = 20;
const car_width = single_road_width - space_between_car_and_line;
const car_height = 160;
const offset = 20;
let offset_road_line = 0;
let last_offset_change = Date.now();

//** CHANGEMENT ICI : Préchargement des images */
const playerImg = new Image();
playerImg.src = '/asset/img/mainCar.png';

const enemyImgSources = [
    '/asset/img/adverseCar1.png',
    '/asset/img/adverseCar2.png',
];

//** Utils */
function random_between(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

//** Class Car */
class car {
    // CHANGEMENT ICI : On passe 'imgSrc' au lieu de 'color'
    constructor(imgSrc, road_lane, pos_y, speed) {
        this.img = new Image(); // On crée un objet image pour chaque voiture
        this.img.src = imgSrc;
        this.road_lane = road_lane;
        this.pos_y = pos_y;
        this.speed = speed;
    };
};

//** Enemy Cars */
const max_car_on_screen = 2;
// Les couleurs ne servent plus, on utilise enemyImgSources maintenant
const speed = [1, 2, 3, 4, 5];
const lane = [0, 1, 2];
let car_list = [];
let car_waiting_to_spawn = [];
let car_spawn = [];

//** Player Car */
const player_car_y = road_height - (car_height + 20); //! CAN'T MOVE FOR NOW
// CHANGEMENT ICI : On ne crée plus une instance de "car" pour le joueur car c'est une image statique gérée différemment
// Mais on garde l'objet pour la logique de position
let player_car = { 
    road_lane: road_lane, 
    pos_y: player_car_y 
};

//** Draw Road */
function draw_road() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, road_width, road_height);

    draw_road_line();
};

//** Draw Road Lines */
function draw_road_line() {
    let offSet = timer_road_line_offset();
    ctx.fillStyle = "white";
    for (let x = 0; x < 2; x++) {
        for (let j = 0; j < road_line_number; j++) {
            ctx.fillRect(single_road_width * (x + 1) + road_line_width * x, (road_line_height + road_line_space_between) * j + offSet, road_line_width, road_line_height);
        };
    };
};

function timer_road_line_offset() {
    const time = Date.now();
    if (time - last_offset_change >= 100) {
        offset_road_line = (offset_road_line === offset) ? 0 : offset;
        last_offset_change = time;
    };
    return offset_road_line;
};

function render_player_car() {
    // CHANGEMENT ICI : On dessine l'image au lieu du rectangle
    let player_car_x = (single_road_width + road_line_width) * player_car.road_lane + space_between_car_and_line;
    // On vérifie que l'image est chargée avant de dessiner pour éviter les erreurs
    if (playerImg.complete) {
        ctx.drawImage(playerImg, player_car_x, player_car.pos_y, car_width, car_height);
    } else {
        // Fallback si l'image ne charge pas (rectangle rouge de sécurité)
        ctx.fillStyle = "red";
        ctx.fillRect(player_car_x, player_car.pos_y, car_width, car_height);
    }
    
};

function add_cars(nbr) {
    for (let i = 0; i < nbr; i++) {
        let random_lane = random_between(0, 2);
        // CHANGEMENT ICI : On prend une image aléatoire dans la liste
        let random_img_src = enemyImgSources[random_between(0, enemyImgSources.length - 1)];
        let new_car = new car(random_img_src, random_lane, -200, speed[random_between(0, speed.length - 1)]);
        car_list.push(new_car);
        car_waiting_to_spawn[random_lane] = new_car;
    };
};

function render_cars() {
    //* Add a random car to spawn
    if (car_list.length < max_car_on_screen) {
        add_cars(max_car_on_screen - car_list.length);
        for (const c of car_list) {
            if (!car_waiting_to_spawn.includes(c)) car_waiting_to_spawn.push(c);
        };
    };

    //* Manage Car lists
    for (const c of car_list) {
        if (car_waiting_to_spawn.includes(c)) {
            const sameLaneSpawn = car_spawn.some((cs) => cs.road_lane === c.road_lane);
            if (!sameLaneSpawn) {
                const idx = car_waiting_to_spawn.indexOf(c);
                if (idx !== -1) car_waiting_to_spawn.splice(idx, 1);
                car_spawn.push(c);
            };
        };
    };

    for (let i = car_spawn.length - 1; i >= 0; i--) {
        const c = car_spawn[i];

        //* Delete Cars if out of screen
        if (c.pos_y > road_height) {
            car_spawn.splice(i, 1);
            const idxInList = car_list.indexOf(c);
            if (idxInList !== -1) car_list.splice(idxInList, 1);
            car_score += 100;
            continue;
        };

        //* Render Cars
        const car_x = (single_road_width + road_line_width) * c.road_lane + space_between_car_and_line;
        
        // CHANGEMENT ICI : Dessiner l'image ennemie
        if (c.img.complete) {
            ctx.drawImage(c.img, car_x, c.pos_y, car_width, car_height);
        } else {
            ctx.fillStyle = "blue"; // Fallback couleur
            ctx.fillRect(car_x, c.pos_y, car_width, car_height);
        }

        c.pos_y += c.speed;
    };
};

function verify_car_spawn() {

};

function aabb_vs_aabb(player_car, other_car) {
    return (player_car.road_lane == other_car.road_lane &&
        player_car.pos_y < other_car.pos_y + car_height &&
        other_car.pos_y < player_car.pos_y + car_height);
};

function simulate_collision() {
    for (let i = 0; i < car_list.length; i++) {
        if (aabb_vs_aabb(player_car, car_list[i])) {
            document.getElementById('gameOver')
            const el = document.createElement('h1');
            el.textContent = 'GAME OVER';
            el.style.position = 'absolute';
            el.style.left = '50%';
            el.style.top = '50%';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.color = 'red';
            document.body.appendChild(el);
            running = false;
        };
    };
};

function update_timer() {
    const now = Date.now();
    in_game_timer = now - last_timer;
    timer.innerText = `Temps: ${Math.floor(in_game_timer / 1000)}s`;
};

function update_score() {
    const time = Date.now();
    if (time - last_score_change >= 1000) {
        game_score = in_game_timer * 0.4 + car_score;
        score.innerText = `Score: ${Math.floor(game_score)} points`;
        last_score_change = time;
    };
};

function game() {
    if (running) {
        player_car.road_lane = road_lane;
        draw_road();
        render_cars();
        render_player_car();

        update_timer();
        update_score();

        simulate_collision();

        requestAnimationFrame(game);
    };
};

requestAnimationFrame(game);