var FPS = 60;
var seed = Date.now();

var draw_entities = {}; //stores all entities that must be rendered

var entity_chars = {};

var color_map = {
	"default":"#BDDEFF",
};
var pix_width = 12;
var font_size = pix_width+"px";
var canvas_width = 1280;
var canvas_height = 720;

var level_width = 100;
var level_height = 57;

var gameCanvas = document.getElementById("game_canvas");
gameCanvas.width = canvas_width;
gameCanvas.height = canvas_height;
var pen = gameCanvas.getContext("2d");
var level_grid = new Array(level_width); for (var i = 0; i < level_grid.length; i++) {level_grid[i] = new Array(level_height);} //level_grid is a 2d array that stores each tile of the level

var dungeon_level = new DungeonLevel(level_width,level_height,seed,Math.round(level_width/2),Math.round(level_height/2));
var render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
grid_copy(render_grid,level_grid);

var player = new Player();

run_game(); //run the game loop once to initialize the level
window.setInterval(player_input(), 1000/FPS); //game loops at 60 fps

function run_game() { //the main game loop, runs whenever the player makes a move
	calculate_level();
	draw_game();
}

function calculate_level() {
	//level_grid = render_grid;
	for (var i = 0; i<level_grid.length; i++) {
		for (var j = 0; j<level_grid[0].length; j++) {
			if (i == player.playerX && j == player.playerY) {
				level_grid[i][j] = '@';
			}
		}
	}
}

function draw_game() {
	pen.clearRect(0,0,gameCanvas.width,gameCanvas.height);
	update_draw_entities();
	for (var i = 0; i < level_grid.length; i++) {
		for (var j = 0; j < level_grid[i].length; j++) {
			pen.font = font_size + " Arial";
			pen.fillStyle = color_map["default"];
			if (hasValue(entity_chars,level_grid[i][j])) 
				pen.fillStyle = color_map[getKey(entity_chars,level_grid[i][j])];
			pen.fillText(level_grid[i][j],i*pix_width + 10,j*pix_width + 10);
		}
	}
}

function update_draw_entities() {
	for (var entity in draw_entities) {
		level_grid[draw_entities[entity][0]][draw_entities[entity][1]] = entity_chars[entity]; 
	}
}

function Player() {
	this.render_char = '@'
	this.render_color = "rgb(190,110,0)";
	this.playerX = Math.round(level_width/2);
	this.playerY = Math.round(level_height/2);
	entity_chars["player"] = this.render_char;
	color_map["player"] = this.render_color;
	draw_entities["player"] = [this.playerX,this.playerY];
}

function player_input() {
	window.addEventListener("keydown", function(event) {
		event.preventDefault();
		if ((event.keyCode == '37' || event.keyCode == '100') && player.playerX > 0) { //left arrow and numpad 4
			update_player_pos(-1, 0);
		}
		else if ((event.keyCode == '39' || event.keyCode == '102') && player.playerX < level_grid.length - 1) { //right arrow and numpad 6
			update_player_pos(1,0);
		}
		else if ((event.keyCode == '38' || event.keyCode == '104') && player.playerY > 0) { //up arrow and numpad 8
			update_player_pos(0,-1);
		}
		else if ((event.keyCode == '40' || event.keyCode == '98') && player.playerY < level_grid[0].length - 1) { //down arrow and numpad 2
			update_player_pos(0,1);
		}
		else if (event.keyCode == '36' && player.playerX > 0 && player.playerY > 0) { //numpad 7
			update_player_pos(-1,-1);
		}
		else if (event.keyCode == '35' && player.playerX > 0 && player.playerY < level_grid[0].length - 1) { //numpad 1
			update_player_pos(-1,1);
		}
		else if (event.keyCode == '33' && player.playerX < level_grid.length - 1 && player.playerY > 0) { //numpad 9
			update_player_pos(1,-1);
		}
		else if (event.keyCode == '34' && player.playerX < level_grid.length - 1 && player.playerY < level_grid[0].length - 1) { //numpad 3
			update_player_pos(1,1);
		}
		else if (event.keyCode == '32') { //spacebar to reset the dungeon
			player.playerX = Math.round(level_width/2);
			player.playerY = Math.round(level_height/2);
			draw_entities["player"] = [player.playerX,player.playerY];
			seed = Date.now();
			dungeon_level = new DungeonLevel(level_width,level_height,seed,Math.round(level_width/2),Math.round(level_height/2));
			render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
			grid_copy(render_grid,level_grid);
		}
		run_game();
	});
}


function update_player_pos(xchange,ychange) { //this function checks if the player can move the specified increment and performs the move if true
	if (level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["floor"] || 
			level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["door"]) {
		level_grid[player.playerX][player.playerY] = render_grid[player.playerX][player.playerY];
		player.playerX += xchange;
		player.playerY += ychange;
		draw_entities["player"] = [player.playerX,player.playerY];
	}
}

function grid_copy(sourceGrid,destGrid) {
	if (sourceGrid.length != destGrid.length || sourceGrid[0].length != destGrid[0].length) {
		console.error("incompatible grid sizes");
		return;		
	}
	else {
		for (var i = 0; i < sourceGrid.length; i++) {
			for (var j = 0; j < sourceGrid[i].length; j++) {
				destGrid[i][j] = sourceGrid[i][j];
			}
		}
	}
}

function hasValue(object, value) {
	for (var item in object) {
		if (object[item] == value)
			return true;
	}
	return false;	
}

function getKey(object, value) {
	for (var item in object) {
		if (object[item] == value)
			return item;
	}
	return undefined;	
}
