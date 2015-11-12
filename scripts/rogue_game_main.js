var FPS = 60;
var seed = Date.now();

var color_map = {
	"default":"#BDDEFF",
	"player":"rgb(190,110,0)"
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

var playerX, playerY;
playerX = Math.round(level_width/2);
playerY = Math.round(level_height/2);

var dungeon_level = new DungeonLevel(level_width,level_height,seed,Math.round(level_width/2),Math.round(level_height/2));
var render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
grid_copy(render_grid,level_grid);

var player = new Player();

run_game(); //run the game loop once to initialize the level
window.setInterval(player.player_input(), 1000/FPS); //game loops at 60 fps

function run_game() { //the main game loop, runs whenever the player makes a move
	calculate_level();
	draw_game();
}

function calculate_level() {
	//level_grid = render_grid;
	for (var i = 0; i<level_grid.length; i++) {
		for (var j = 0; j<level_grid[0].length; j++) {
			if (i == playerX && j == playerY) {
				level_grid[i][j] = '@';
			}
		}
	}
}

function draw_game() {
	pen.clearRect(0,0,gameCanvas.width,gameCanvas.height);
	for (var i = 0; i < level_grid.length; i++) {
		for (var j = 0; j < level_grid[i].length; j++) {
			pen.font = font_size + " Arial";
			pen.fillStyle = color_map["default"];
			if (level_grid[i][j] == '@') pen.fillStyle = color_map["player"];
			pen.fillText(level_grid[i][j],i*pix_width + 10,j*pix_width + 10);
		}
	}
}

function Player() {
	this.player_input = function() {
		window.addEventListener("keydown", function(event) {
			event.preventDefault();
			if ((event.keyCode == '37' || event.keyCode == '100') && playerX > 0) { //left arrow and numpad 4
				update_player_pos(-1, 0);
			}
			else if ((event.keyCode == '39' || event.keyCode == '102') && playerX < level_grid.length - 1) { //right arrow and numpad 6
				update_player_pos(1,0);
			}
			else if ((event.keyCode == '38' || event.keyCode == '104') && playerY > 0) { //up arrow and numpad 8
				update_player_pos(0,-1);
			}
			else if ((event.keyCode == '40' || event.keyCode == '98') && playerY < level_grid[0].length - 1) { //down arrow and numpad 2
				update_player_pos(0,1);
			}
			else if (event.keyCode == '36' && playerX > 0 && playerY > 0) { //numpad 7
				update_player_pos(-1,-1);
			}
			else if (event.keyCode == '35' && playerX > 0 && playerY < level_grid[0].length - 1) { //numpad 1
				update_player_pos(-1,1);
			}
			else if (event.keyCode == '33' && playerX < level_grid.length - 1 && playerY > 0) { //numpad 9
				update_player_pos(1,-1);
			}
			else if (event.keyCode == '34' && playerX < level_grid.length - 1 && playerY < level_grid[0].length - 1) { //numpad 3
				update_player_pos(1,1);
			}
			else if (event.keyCode == '32') { //spacebar to reset the dungeon
				playerX = Math.round(level_width/2);
				playerY = Math.round(level_height/2);
				seed = Date.now();
				dungeon_level = new DungeonLevel(level_width,level_height,seed,Math.round(level_width/2),Math.round(level_height/2));
				render_grid = dungeon_level.dungeon_grid; //render_grid stores the raw terrain data
				grid_copy(render_grid,level_grid);
			}
			run_game();
		});
	}	
}


function update_player_pos(xchange,ychange) { //this function checks if the player can move the specified increment and performs the move if true
	if (level_grid[playerX+xchange][playerY+ychange] == map_chars["floor"] || 
			level_grid[playerX+xchange][playerY+ychange] == map_chars["door"]) {
		level_grid[playerX][playerY] = render_grid[playerX][playerY];
		playerX += xchange;
		playerY += ychange;
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
