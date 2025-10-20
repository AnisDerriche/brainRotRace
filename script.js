const wsProtocol = (location.protocol === 'https:') ? 'wss:' : 'ws:';
const wsHost = location.host;
const ws = new WebSocket(wsProtocol + '//' + wsHost);

ws.onopen = () => {
    console.log('WebSocket connecté au serveur', wsProtocol + '//' + wsHost);
};

ws.onclose = (ev) => {
    console.log('WebSocket fermé', ev && ev.code ? ev.code : '');
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

let running = true;

//** Set Road and Canvas size */
const road_width = 720;
const road_height = 1000;
canvas.width = road_width;
canvas.height = road_height;

//** Move The Car */
let road_lane = 0; //!IMPORTANT

//** Road */
const road_line_number = 20;
const road_line_space_between = 10;
const road_line_width = 15;

const road_line_height = road_height / road_line_number;
const single_road_width = (road_width - (road_line_width*2)) / 3;

const player_car_color = "red";
const car_width = 160;
const car_height = 200;
const space_between_car_and_line = (single_road_width - car_width) / 2;

function random_between(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//** Class Car */
class car {
    constructor(color, road_lane, pos_y, speed) {
        this.color = color;
        this.road_lane = road_lane;
        this.pos_y = pos_y;
        this.speed = speed;
    }
}

//** Enemy Cars */
const colors = ["blue", "yellow", "orange", "white", "gray", "cyan"];
let car_list = [];
car_list.push(new car(colors[random_between(0, colors.length - 1)], 0, -200, 1));


//** Player Car */
const player_car_y = 750; //! CAN'T MOVE FOR NOW
let player_car = new car("red", road_lane, player_car_y, 0);

function draw_road() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, road_width, road_height);

    ctx.fillStyle = "white";
    for (let x = 0; x < 2; x++){
        for (let j = 0; j < road_line_number; j++) {
            ctx.fillRect(230 * (x+1) + road_line_width * x, (road_line_height + road_line_space_between) * j, road_line_width, road_line_height);
        }
    }
}

function render_player_car() {
    ctx.fillStyle = player_car.color;
    player_car_x = (single_road_width + road_line_width) * player_car.road_lane + space_between_car_and_line
    ctx.fillRect(player_car_x, player_car.pos_y, car_width, car_height);
}

function render_cars() {
    for (let i = 0; i < car_list.length; i++) {
        const c = car_list[i];
        const car_x = (single_road_width + road_line_width) * c.road_lane + space_between_car_and_line;
        ctx.fillStyle = c.color;
        ctx.fillRect(car_x, c.pos_y, car_width, car_height);
        c.pos_y += c.speed;
    }
}

function aabb_vs_aabb(player_car, other_car) {  
    return (player_car.road_lane == other_car.road_lane &&
        player_car.pos_y < other_car.pos_y + car_height);
}

function simulate_collision(){
    for (let i = 0; i < car_list.length; i++){
        if (aabb_vs_aabb(player_car, car_list[i])){
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
        }
    }
}

function game() {
    if(running){
        player_car.road_lane = road_lane
        draw_road();
        render_cars();
        render_player_car();

        simulate_collision();

        requestAnimationFrame(game);
    }
}

requestAnimationFrame(game);