var DEBUG = false;

var multiplayer = (sessionStorage.multiplayer == "true");
if (multiplayer) console.log("multiplayer game");

var FPS = 60;
var seed = Date.now();

var draw_entities = {}; //stores all entities that must be rendered

var entity_chars = {};

var color_map = {
	"debug":"#FF00BE",
	"default":"#BDDEFF",
	"seen_fog":"#3C46FF",
	"background_default":"#000000", //having a different background color looked ugly. Play around with some values here.
	"background_seen_fog":"#000000",
	"door_default":"#23DE37",
	"door_seen":"#156421",
	"stairs_default":"#E52C17",
	"stairs_seen":"#A32011"
};
var pix_width = 15;
var font_size = pix_width+"px";
var canvas_width = 1600;
var canvas_height = 900;

var level_width = 100;
var level_height = 57;

var current_dungeon_id = 0; //this stores the id of the current dungeon level
var dungeon_seed_list = []; //this stores a list of seeds for each dungeon floor, where the index in the list is the dungeon id
var stairs_up_x_list = []; 
var stairs_up_y_list = []; //these store the x and y values of the levels' stairs up

var gameCanvas = document.getElementById("game_canvas");
gameCanvas.width = canvas_width;
gameCanvas.height = canvas_height;
var pen = gameCanvas.getContext("2d");
var level_grid = new Array(level_width); for (var i = 0; i < level_grid.length; i++) {level_grid[i] = new Array(level_height);} //level_grid is a 2d array that stores each tile of the level

var dungeon_level = new DungeonLevel(level_width,level_height,seed,Math.round(level_width/2),Math.round(level_height/2),current_dungeon_id);
var render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data, to be used to clear out level_grid when necessary
grid_copy(render_grid,level_grid);
dungeon_seed_list[current_dungeon_id] = seed;
stairs_up_x_list[current_dungeon_id] = Math.round(level_width/2);
stairs_up_y_list[current_dungeon_id] = Math.round(level_height/2);

var player = new Player();

function run_game() { //the main game loop, runs whenever the player makes a move
	calculate_level();
	draw_game();
}

function calculate_level() {
	for (var i = 0; i<level_grid.length; i++) {
		for (var j = 0; j<level_grid[0].length; j++) {
			if (i == player.playerX && j == player.playerY) {
				level_grid[i][j] = player.render_char;
				open_door(i,j);
			}
			if (level_grid[i][j] == map_chars["door_open"] && !(level_grid[i-1][j] == player.render_char || level_grid[i][j-1] == player.render_char)) { //close any open doors unless the player is adjacent
				level_grid[i][j] = map_chars["door"];
			}
		}
	}
}

function open_door(x, y) { //opens any door adjacent (but not diagonal) to the player
	var open = function(i,j) {
		level_grid[i][j] = map_chars["door_open"];
	}
	if (level_grid[x][y-1] == map_chars["door"]) 
		open(x,y-1); //north
	if (level_grid[x][y+1] == map_chars["door"]) 
		open(x,y+1); //south
	if (level_grid[x-1][y] == map_chars["door"]) 
		open(x-1,y); //west
	if (level_grid[x+1][y] == map_chars["door"]) 
		open(x+1,y); //east
}
//FOV code
var light_passes = function(x,y) { //returns true if light passes through a tile
	if (level_grid[x][y] == map_chars["wall"] || level_grid[x][y] == map_chars["door"]) {
		return false;
	}
	return true;
}
var fov = new ROT.FOV.RecursiveShadowcasting(light_passes);
var seen_tiles = []; //stores the tiles that the player has seen
for (var i = 0; i < level_grid.length; i++) { //fill seen_tiles with 0's. 0's represent files not seen, 1's are tiles that have been seen
	for (var j = 0; j < level_grid[i].length; j++) {
		seen_tiles[i+","+j] = 0;
	}
}
var seen_tiles_dict = []; //stores all the seen_tiles dictionaries, in the form current_dungeon_id:seen_tiles

//render code
function draw_game() {
	pen.clearRect(0,0,gameCanvas.width,gameCanvas.height);
	update_draw_entities();
	for (var i = 0; i < level_grid.length; i++) {
		for (var j = 0; j < level_grid[i].length; j++) {
			pen.font = font_size + " Arial";
			pen.fillStyle = color_map["default"];
			//test for FOV
			if (!DEBUG) { //allows generation without FOV for debugging
				//first render seen but not currently visible tiles
				if (seen_tiles[i+","+j] == 1) { //the player has seen the tile before
					pen.fillStyle = color_map["background_seen_fog"];
					pen.fillRect(i*pix_width + 10,j*pix_width, pix_width, pix_width);
					if (level_grid[i][j] == map_chars["door"] || level_grid[i][j] == map_chars["door_open"]) {
						pen.fillStyle = color_map["door_seen"];
					}
					else if (level_grid[i][j] == map_chars["stairs_down"] || level_grid[i][j] == map_chars["stair_up"]) {
						pen.fillStyle = color_map["stairs_seen"];
					}
					else
						pen.fillStyle = color_map["seen_fog"];
					pen.fillText(level_grid[i][j],i*pix_width + 10,j*pix_width + 10);
				}
				//then render visible tiles
				fov.compute(player.playerX,player.playerY,player.vis_radius, function(x, y, r, visibility) {
					if (x == i && y == j && visibility > 0) {
						pen.fillStyle = color_map["background_default"];
						pen.fillRect(i*pix_width + 10,j*pix_width, pix_width, pix_width);
						if (level_grid[i][j] == map_chars["door"] || level_grid[i][j] == map_chars["door_open"]) {
							pen.fillStyle = color_map["door_default"];
						}
						else if (level_grid[i][j] == map_chars["stair_down"] || level_grid[i][j] == map_chars["stair_up"]) {
							pen.fillStyle = color_map["stairs_default"];
						}
						else
							pen.fillStyle = color_map["default"];
						if (hasValue(entity_chars,level_grid[i][j])) //color non-terrain entities
							pen.fillStyle = color_map[getKey(entity_chars,level_grid[i][j])];
						pen.fillText(level_grid[i][j],i*pix_width + 10,j*pix_width + 10);
						seen_tiles[i+","+j] = 1;
					}
				}); 	
			}	
			else { //DEBUG rendering
				pen.fillStyle = color_map["background_default"];
				pen.fillRect(i*pix_width + 10,j*pix_width, pix_width, pix_width);
				if (level_grid[i][j] == map_chars["door"] || level_grid[i][j] == map_chars["door_open"]) {
					pen.fillStyle = color_map["door_default"];
				}
				else if (level_grid[i][j] == map_chars["stair_down"] || level_grid[i][j] == map_chars["stair_up"]) {
					pen.fillStyle = color_map["stairs_default"];
				}
				else if ((i == 0 && j == 0) || (i == level_grid.length - 1 && j == level_grid[i].length - 1) || //color the corners to test rendering
						(i == 0 && j == level_grid[i].length - 1) || (i == level_grid.length - 1 && j == 0)) {
					pen.fillStyle = color_map["debug"];
				}
				else
					pen.fillStyle = color_map["default"];
				if (hasValue(entity_chars,level_grid[i][j])) //color non-terrain entities
					pen.fillStyle = color_map[getKey(entity_chars,level_grid[i][j])];
				pen.fillText(level_grid[i][j],i*pix_width + 10,j*pix_width + 10);
			}
		}
	}
}

function update_draw_entities() {
	for (var entity in draw_entities) {
		level_grid[draw_entities[entity][0]][draw_entities[entity][1]] = entity_chars[entity]; 
	}
}

//Player code
function Player() {
	this.render_char = '@'
	this.render_color = "rgb(190,110,0)";
	this.playerX = Math.round(level_width/2);
	this.playerY = Math.round(level_height/2);
	this.vis_radius = 100;
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
		else if (event.ctrlKey && event.shiftKey && event.keyCode == '68' && !DEBUG) { //ctrl-shift-d to enter debug mode
			DEBUG = true;
			run_game();
		}
		else if (event.ctrlKey && event.shiftKey && event.keyCode == '68' && DEBUG) { //ctrl-shift-d to exit debug mode
			DEBUG = false;
			run_game();
		}
		if (DEBUG){ //debugging keycodes
			if (event.keyCode == '32') { //spacebar to reset the dungeon
				dungeon_reset();
			}
		}
		if (level_grid[player.playerX][player.playerY] == map_chars["stair_down"]) {
			stairs_down();
		}
		else if (level_grid[player.playerX][player.playerY] == map_chars["stair_up"]) {
			stairs_up();
		}
		run_game();
	});
}

function dungeon_reset() { //resets the dungeon for debug	
	for (var i = 0; i < level_grid.length; i++) {
		for (var j = 0; j < level_grid[i].length; j++) {
			seen_tiles[i+","+j] = 0;
		}
	}
	current_dungeon_id = 0;
	player.playerX = Math.round(level_width/2);
	player.playerY = Math.round(level_height/2);
	draw_entities["player"] = [player.playerX,player.playerY];
	seed = prompt("Enter seed:", Date.now());
	dungeon_level = new DungeonLevel(level_width,level_height,seed,Math.round(level_width/2),Math.round(level_height/2),current_dungeon_id);
	dungeon_seed_list[current_dungeon_id] = seed;
	render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
	grid_copy(render_grid,level_grid);
}

function stairs_down() {
	if (dungeon_seed_list[current_dungeon_id + 1] == undefined) {
		seen_tiles_dict[current_dungeon_id] = clone_dictionary(seen_tiles);
		current_dungeon_id++;
		for (var i = 0; i < level_grid.length; i++) {
			for (var j = 0; j < level_grid[i].length; j++) {
				seen_tiles[i+","+j] = 0;
			}
		}
		draw_entities["player"] = [player.playerX,player.playerY];
		seed = next_seed();
		dungeon_seed_list[current_dungeon_id] = seed;
		dungeon_level = new DungeonLevel(level_width,level_height,seed,player.playerX,player.playerY,current_dungeon_id);
		render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
		grid_copy(render_grid,level_grid);
		stairs_up_x_list[current_dungeon_id] = player.playerX;
		stairs_up_y_list[current_dungeon_id] = player.playerY;
	}
	else {
		seen_tiles_dict[current_dungeon_id] = clone_dictionary(seen_tiles);
		current_dungeon_id++;
		seen_tiles = seen_tiles_dict[current_dungeon_id];
		draw_entities["player"] = [player.playerX,player.playerY];
		seed = dungeon_seed_list[current_dungeon_id];
		dungeon_level = new DungeonLevel(level_width,level_height,seed,player.playerX,player.playerY,current_dungeon_id);
		render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
		grid_copy(render_grid,level_grid);
	}
}

function stairs_up() {
	seen_tiles_dict[current_dungeon_id] = clone_dictionary(seen_tiles);
	current_dungeon_id--;
	seen_tiles = seen_tiles_dict[current_dungeon_id];
	draw_entities["player"] = [player.playerX,player.playerY];
	seed = dungeon_seed_list[current_dungeon_id];
	dungeon_level = new DungeonLevel(level_width,level_height,seed,stairs_up_x_list[current_dungeon_id],stairs_up_y_list[current_dungeon_id],current_dungeon_id);
	render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
	grid_copy(render_grid,level_grid);
	
}

function next_seed() { //generates a new seed from the old one, ensuring that an entire dungeon can be generated from one seed
	return ROT.RNG.getNormal(9999999999,9999999999);
}

function update_player_pos(xchange,ychange) { //this function checks if the player can move the specified increment and performs the move if true
	if (level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["floor"] || 
			level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["door"] ||
			level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["door_open"] ||
			level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["dungeon_entrance"] ||
			level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["stair_down"] ||
			level_grid[player.playerX+xchange][player.playerY+ychange] == map_chars["stair_up"]) {
		level_grid[player.playerX][player.playerY] = render_grid[player.playerX][player.playerY]; //clear out the old player character using render_grid
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

function clone_dictionary(source) {
	var clone = [];
	for (var key in source) {
		clone[key] = source[key];
	}
	return clone;
}

function fill_grid(grid, x, y, length, width, value) { //fills in a section of grid defined by x,y and length, width with value
	for (var i = x; i < length; i++) {
		for (var j = y; j < length; j++) {
			grid[i][j] = value;
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

run_game(); //run the game loop once to initialize the level
window.setInterval(player_input(), 1000/FPS); //game loops at 60 fps