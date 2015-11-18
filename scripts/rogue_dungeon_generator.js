/*Generates dungeons for WebRogue. Currently implemented using the method detailed at 
  http://www.roguebasin.com/index.php?title=Dungeon-Building_Algorithm */

var roomsize_mean = 10; //mean room width and height
var roomsize_stddev = 3; //standard deviation of the width and height - make sure this does not result in a negative value for roomsize!

var NUM_ATTEMPTS = 25000;

var map_chars = { //stores the ascii characters used to render the dungeon
	"wall":'#',
	"floor":'.',
	"door":'+',
	"door_open":'/',
	"stair_down":'<',
	"stair_up":'>',
	"dungeon_entrance":'Ω'
};

var room_index_weights = { //stores the relative weights of generating each room, to be passed to ROT.RNG.getWeightedValue()
	"1":10,
	"2":30,
	"3": 1,
	"4": 2
};

function DungeonLevel(width, height, seed, initX, initY, id) {
	this.width = width;
	this.height = height;
	this.seed = seed;
	this.currentX = initX; //the x coordinate of the first room
	this.currentY = initY; //the y coordinate of the first room
	this.id = id;
	ROT.RNG.setSeed(seed);
	
	this.generate_room = function(roomIndex) {
		var room_width = Math.ceil(ROT.RNG.getNormal(roomsize_mean, roomsize_stddev));
		var room_height = Math.ceil(ROT.RNG.getNormal(roomsize_mean, roomsize_stddev));
		while (room_width <= 1 || room_height <= 1) { //rooms must have a width and height of 2 or more
			var room_width = Math.ceil(ROT.RNG.getNormal(roomsize_mean, roomsize_stddev));
			var room_height = Math.ceil(ROT.RNG.getNormal(roomsize_mean, roomsize_stddev));
		}
		var room_grid = new Array(room_width); for (var i=0;i<room_grid.length;i++){room_grid[i]=new Array(room_height);}
		switch (roomIndex) {
			case '1': //rectangular room
				for (var i = 0; i<room_grid.length;i++) {
					for (var j = 0; j<room_grid[i].length;j++) {
						room_grid[i][j] = map_chars["floor"];
					}
				}
				break;
			case '2': //rectangular room with a corridor - corridors are handled in generate_dungeon
				for (var i = 0; i<room_grid.length;i++) {
					for (var j = 0; j<room_grid[i].length;j++) {
						room_grid[i][j] = map_chars["floor"];
					}
				}
				break;
			case '3': //octagonal room
				if (room_height % 2 == 0) room_height++; //room height and width must be odd for this room
				room_width = room_height; //room must be square
				room_grid = new Array(room_width); for (var i=0;i<room_grid.length;i++){room_grid[i]=new Array(room_height);}
				
				for (var i = 0; i < room_grid.length; i++) { //first fill the room with wall
					for (var j = 0; j < room_grid[i].length; j++) {
						room_grid[i][j] = map_chars["wall"];
					}
				}
				
				//first construct the central row
				var offset = (room_width - 3)/2;
				for (var len = 0; len < room_width; len++) {
					room_grid[Math.floor(room_height/2)][len] = map_chars["floor"];
				}
				//now construct the top trapezoid
				for (var h = 0; h < Math.floor(room_height/2); h++) {
					for (var t = offset - h; t < room_width - (offset - h); t++) {
						room_grid[h][t] = map_chars["floor"];
					}
				}
				//now construct the bottom trapezoid
				for (var h = room_height - 1; h > Math.floor(room_height/2); h--) {
					for (var t = offset - ((room_height - 1) - h); t < room_width - (offset - ((room_height - 1) - h)); t++) {
						room_grid[h][t] = map_chars["floor"];
					}
				}
				break;
			case '4': //octagonal room with corridor
				if (room_height % 2 == 0) room_height++; //room height and width must be odd for this room
				room_width = room_height; //room must be square
				room_grid = new Array(room_width); for (var i=0;i<room_grid.length;i++){room_grid[i]=new Array(room_height);}
				
				for (var i = 0; i < room_grid.length; i++) { //first fill the room with wall
					for (var j = 0; j < room_grid[i].length; j++) {
						room_grid[i][j] = map_chars["wall"];
					}
				}
				
				//first construct the central row
				var offset = (room_width - 3)/2;
				for (var len = 0; len < room_width; len++) {
					room_grid[Math.floor(room_height/2)][len] = map_chars["floor"];
				}
				//now construct the top trapezoid
				for (var h = 0; h < Math.floor(room_height/2); h++) {
					for (var t = offset - h; t < room_width - (offset - h); t++) {
						room_grid[h][t] = map_chars["floor"];
					}
				}
				//now construct the bottom trapezoid
				for (var h = room_height - 1; h > Math.floor(room_height/2); h--) {
					for (var t = offset - ((room_height - 1) - h); t < room_width - (offset - ((room_height - 1) - h)); t++) {
						room_grid[h][t] = map_chars["floor"];
					}
				}
				break;
		}
		return room_grid;
	}
	
	this.dungeon_grid = new Array (width); for (var i = 0; i < this.dungeon_grid.length; i++) {this.dungeon_grid[i]= new Array(height);}
	for (var i = 0; i < this.dungeon_grid.length; i++) { //populate the dungeon with wall tiles
		for (var j = 0; j < this.dungeon_grid[i].length; j++) {
			this.dungeon_grid[i][j] = map_chars["wall"];
		}
	}
	this.generate_dungeon = function() {
		console.log(this.seed);
		var dungeon_full = false; //this returns true if there is no more room in the dungeon
		var room_index; //this represents which room to build next
		var facing; //represents the facing of the current wall tile; 0 is west, 1 is east, 2 is north, 3 is south.
		var wall_cell_array = []; //this stores the output of find_wall_cell; destructuring assignment is prefereable but only implemented in firefox
		var has_corridor = false; //this is true if the current room has a corridor attached
		var corridor; //this stores the corridor, if any, of the current room
		var corrX, corrY, doorX, doorY;
		
		//first place the initial room
		var current_room = this.generate_room('1');
		while (!check_room_fit(this.dungeon_grid,current_room,this.currentX,this.currentY)) current_room = this.generate_room('1');
		grid_merge(current_room,this.dungeon_grid,this.currentX,this.currentY);
		//now loop through placing additional rooms
		for (var room_place_tries = 0; room_place_tries < NUM_ATTEMPTS; room_place_tries++) {
			wall_cell_array = find_wall_cell(this.dungeon_grid); //pick a random wall
			this.currentX = wall_cell_array[0];
			this.currentY = wall_cell_array[1];
			facing = wall_cell_array[2];
			
			room_index = ROT.RNG.getWeightedValue(room_index_weights); //choose a feature to build next
			current_room = this.generate_room(room_index);
			has_corridor = (parseInt(room_index) % 2 == 0); //even numbered room_index means corridor
			
			if (!has_corridor) { //if no corridor, place a door
				doorX = this.currentX;
				doorY = this.currentY;
			}
			
			switch (facing) { //set currentX and currentY based on room facing
				case 0: //west
					this.currentX -= current_room.length;
					this.currentY -= Math.floor(current_room[0].length/2);
					break;
				case 1: //east
					this.currentX += 1;
					this.currentY -= Math.floor(current_room[0].length/2);
					break;
				case 2: //north
					this.currentX -= Math.floor(current_room.length/2);
					this.currentY -= current_room[0].length;
					break;
				case 3: //south
					this.currentX -= Math.floor(current_room.length/2);
					this.currentY += 1;
					break;
			}
			
			if (has_corridor) { //there is a corridor - adjust x and y accordingly
				corridor = generate_corridor(facing, Math.round(ROT.RNG.getNormal(roomsize_mean, roomsize_stddev)));
				switch (facing) {
					case 0: //west
						this.currentX -= corridor.length - 1; //-1 to undo the 1-tile gap between rooms
						break;
					case 1: //east
						this.currentX += corridor.length - 1;
						break;
					case 2: //north
						this.currentY -= corridor[0].length - 1;
						break;
					case 3: //south
						this.currentY += corridor[0].length - 1;
						break;
				}
			}
			if (check_room_fit(this.dungeon_grid,current_room, this.currentX,this.currentY)) {
				if (has_corridor) { //place the corridor if there is one
					switch (facing) {
						case 0: //west
							corrX = this.currentX + current_room.length;
							corrY = this.currentY + Math.floor(current_room[0].length/2);
							break;
						case 1: //east
							corrX = this.currentX - corridor.length;
							corrY = this.currentY + Math.floor(current_room[0].length/2);
							break;
						case 2: //north
							corrX = this.currentX + Math.floor(current_room.length/2);
							corrY = this.currentY + current_room[0].length;
							break;
						case 3: //south
							corrX = this.currentX + Math.floor(current_room.length/2);
							corrY = this.currentY - corridor[0].length;
							break;
					}
					if (check_corridor_fit(this.dungeon_grid,corridor,corrX,corrY, facing)) {
					grid_merge(corridor,this.dungeon_grid,corrX,corrY);
					grid_merge(current_room,this.dungeon_grid,this.currentX,this.currentY);
					}
				}
				else { //only place door if there is not a corridor
					place_door(this.dungeon_grid,doorX,doorY);
					grid_merge(current_room,this.dungeon_grid,this.currentX,this.currentY);
				}
			}
		}
		
		door_pass(this.dungeon_grid); //place doors between adjacent rooms
		if (this.id != 0)
			place_stairs(this.dungeon_grid,initX,initY,false);
		else
			place_stairs(this.dungeon_grid,initX,initY,true);
	};
	this.generate_dungeon();
	
}

function place_stairs(level_grid,up_x,up_y,is_first_level) { //places stairs, trying to maximize the distance between them
	//Pathfinding code for place_stairs
	var passable_comp = function (x,y) {
		if (level_grid[x][y] == map_chars["wall"]) {
			return false;
		}
		return true;
	}
	
	var astar = new ROT.Path.AStar(up_x,up_y, passable_comp);
	
	//now place the stairs up
	if (is_first_level) {
		level_grid[up_x][up_y] = map_chars["dungeon_entrance"];
	}
	else {
		level_grid[up_x][up_y] = map_chars["stair_up"];
	}
	
	//now place the stairs down, trying to maximize distance between them
	var stair_dist = 0; //stores the distance between the stairs as determined by the pathfinding algorithm
	var down_x = 0;
	var down_y = 0;
	for (var i = 0; i < 100; ) {
		var test_down_x = Math.floor(ROT.RNG.getUniform()*level_grid.length);
		var test_down_y = Math.floor(ROT.RNG.getUniform()*level_grid[0].length);
		if (level_grid[test_down_x][test_down_y] == map_chars["floor"]) {
			var dist = 0;
			astar.compute(test_down_x,test_down_y, function() {
				dist++;
			});
			if (dist > stair_dist) {
				stair_dist = dist;
				down_x = test_down_x;
				down_y = test_down_y;
			}
			i++;
		}
	}
	level_grid[down_x][down_y] = map_chars["stair_down"];
}

function door_pass(level_grid) { //iterates through the dungeon placing doors between adjacent rooms that don't already have them
	var tiles_checked = [];
	for (var i = 1; i < level_grid.length - 1; i++) { //start at one and end at length - 1 to avoid OutOfBounds exception (plus there will never be a door on the first row or column)
		for (var j = 1; j < level_grid[i].length - 1; j++) {
			if (tiles_checked.indexOf([i,j]) == -1 ) { //only check if the tile has not already been checked
				if ((level_grid[i][j] == map_chars["wall"]) && ((level_grid[i][j+1] == map_chars["floor"] && level_grid[i][j-1] == map_chars["floor"]) //is (i,j) a wall between rooms?
						||(level_grid[i+1][j] == map_chars["floor"] && level_grid[i-1][j] == map_chars["floor"]))) {
					if (!check_for_door(i,j)) { //is there already a door connecting the rooms?
						place_midpoint_door(i,j);
					}
				}
			}
		}
	}
	function check_for_door(x,y) { //helper function that checks if there is already a door in a given stretch of wall
		var xCheck = x;
		var yCheck = y;
		//first check orientation of wall
		if (level_grid[x+1][y] == map_chars["floor"] && level_grid[x-1][y] == map_chars["floor"]) { //vertical
			//find topmost wall square
			while (level_grid[xCheck + 1][yCheck - 1] == map_chars["floor"] && level_grid[xCheck-1][yCheck - 1] == map_chars["floor"]) yCheck--; //xCheck,yCheck is now the topmost wall square
			//now iterate through the whole segment looking for doors
			while (level_grid[xCheck + 1][yCheck] == map_chars["floor"] && level_grid[xCheck-1][yCheck] == map_chars["floor"]) {
				if (level_grid[xCheck][yCheck] == map_chars["door"]) {
					return true;
				}
				else yCheck++;
			}
		}
		else { //horizontal
			//find leftmost wall square
			while (level_grid[xCheck - 1][yCheck + 1] == map_chars["floor"] && level_grid[xCheck - 1][yCheck - 1] == map_chars["floor"]) xCheck--; //xCheck,yCheck is now the leftmost wall square
			//now iterate through the whole segment looking for doors
			while (level_grid[xCheck][yCheck + 1] == map_chars["floor"] && level_grid[xCheck][yCheck - 1] == map_chars["floor"]) {
				if (level_grid[xCheck][yCheck] == map_chars["door"]) {
					return true;
				}
				else xCheck++;
			}
		}
		return false; //if this point is reached no doors have been found
	}
	function place_midpoint_door(x,y) { //helper function that places a door at the midpoint of a stretch of wall
		var xCheck = x;
		var yCheck = y;
		var segmentLength = 0;
		//first check orientation of wall
		if (level_grid[x+1][y] == map_chars["floor"] && level_grid[x-1][y] == map_chars["floor"]) { //vertical
			//find topmost wall square
			while (level_grid[xCheck + 1][yCheck] == map_chars["floor"] && level_grid[xCheck-1][yCheck] == map_chars["floor"]) yCheck--; //xCheck,yCheck is now the topmost wall square
			//now iterate through segment to find length
			while (level_grid[xCheck + 1][yCheck + 1] == map_chars["floor"] && level_grid[xCheck-1][yCheck + 1] == map_chars["floor"]){
				tiles_checked.push([xCheck,yCheck]);
				segmentLength++;
				yCheck++;				
			}
			//find the midpoint
			yCheck = y + Math.floor(segmentLength/2);
			//check to make sure there is not a corridor next to the door location
			if (level_grid[xCheck][yCheck + 1] == map_chars["wall"] && level_grid[xCheck][yCheck - 1] == map_chars["wall"]) {
				//now place the door
				level_grid[xCheck][yCheck] = map_chars["door"];
			}
		}
		else { //horizontal
			//find leftmost wall square
			while (level_grid[xCheck][yCheck + 1] == map_chars["floor"] && level_grid[xCheck][yCheck - 1] == map_chars["floor"]) xCheck--; //xCheck,yCheck is now the leftmost wall square
			//now iterate through segment to find length			
			while (level_grid[xCheck + 1][yCheck + 1] == map_chars["floor"] && level_grid[xCheck + 1][yCheck - 1] == map_chars["floor"]) {
				tiles_checked.push([xCheck,yCheck]);
				segmentLength++;
				xCheck++;
			}
			//find the midpoint
			xCheck = x + Math.floor(segmentLength/2);
			//check to make sure there is not a corridor next to the door location
			if (level_grid[xCheck+1][yCheck] == map_chars["wall"] && level_grid[xCheck - 1][yCheck] == map_chars["wall"]) {
				//now place the door
				level_grid[x+Math.floor(segmentLength/2)][yCheck] = map_chars["door"];
			}
		}
		
	}
	
}

function place_door(level_grid, x, y) {
	level_grid[x][y] = map_chars["door"];
}

function generate_corridor(facing, corrLength) {
	var corr = [];
	switch (facing) {
		case 0: //west
			for (var i = 0; i < corrLength; i++) corr[i] = map_chars["floor"];
			break;
		case 1: //east
			for (var i = 0; i < corrLength; i++) corr[i] = map_chars["floor"];
			break;
		case 2: //north
			corr[0] = [];
			for (var i = 0; i < corrLength; i++) corr[0][i] = map_chars["floor"];
			break;
		case 3: //south
			corr[0] = [];
			for (var i = 0; i < corrLength; i++) corr[0][i] = map_chars["floor"];
			break;
	}
	return corr;
}

function check_corridor_fit(level_grid, corridor, x, y, facing) { //checks if corridor fits into level_grid at the given x, y with the given facing
	switch (facing) {
		case 0: //west
		case 1: //east
			for (var i = 0; i < corridor.length; i++) {
				for (var j = -1; j < 2; j++) {
					if (!(level_grid[x+i][y+j] == map_chars["wall"] || level_grid[x+i][y+j] == map_chars["door"])) return false;
					if (j == 0 && level_grid[x+i][y+j] == map_chars["floor"]) return false;
				}
			}
			break;
			
		case 2: //north
		case 3: //south
			for (var i = 0; i < corridor[0].length; i++) {
				for (var j = -1; j < 2; j++) {
					if (!(level_grid[x+j][y+i] == map_chars["wall"] || level_grid[x+j][y+i] == map_chars["door"])) return false;
					if (j == 0 && level_grid[x+j][y+i] == map_chars["floor"]) return false;
				}
			}
			break;
	}
	return true;
}

function check_room_fit(level_grid, room_grid, x, y) { //checks if room_grid fits into level_grid at the given x, y
	if (x + room_grid.length >= level_grid.length - 1 || y + room_grid[0].length >= level_grid[0].length - 1 || x <= 0 || y <= 0) return false; //the room goes outside the level
	for (var i = -1; i < room_grid.length + 1; i++) {
		for (var j = - 1; j < room_grid[0].length + 1; j++) {
			if (i == -1 || j == -1 || i == room_grid.length || j == room_grid[0].length) { //make sure the boundaries of the room are wall or door tiles
				if (!(level_grid[x+i][y+j] == map_chars["wall"] || level_grid[x+i][y+j] == map_chars["door"])) return false;
			}
			else if (room_grid[i][j] == map_chars["floor"] && level_grid[x+i][y+j] == map_chars["floor"]) {
				return false;
			}
		}
	}
	return true; //if nothing has returned false the room fits
}

function find_wall_cell(level_grid) { //chooses a random wall cell from the dungeon
	var facing;
	var xCandidate = Math.ceil((ROT.RNG.getUniform() * (level_grid.length - 3)) + 1);
	var yCandidate = Math.ceil((ROT.RNG.getUniform() * (level_grid[0].length - 3)) + 1);
	while (!((level_grid[xCandidate][yCandidate] == map_chars["wall"]) && (level_grid[xCandidate][yCandidate+1] == map_chars["floor"]
			|| level_grid[xCandidate][yCandidate-1] == map_chars["floor"] || level_grid[xCandidate+1][yCandidate] == map_chars["floor"]
			|| level_grid[xCandidate-1][yCandidate] == map_chars["floor"]))) {
		xCandidate = Math.ceil((ROT.RNG.getUniform() * (level_grid.length - 3)) + 1);
		yCandidate = Math.ceil((ROT.RNG.getUniform() * (level_grid[0].length - 3)) + 1);
	}
	//now determine facing
	if (level_grid[xCandidate + 1][yCandidate] == map_chars["floor"]) facing = 0; //west
	else if (level_grid[xCandidate - 1][yCandidate] == map_chars["floor"]) facing = 1; //east
	else if (level_grid[xCandidate][yCandidate + 1] == map_chars["floor"]) facing = 2; //north
	else if (level_grid[xCandidate][yCandidate - 1] == map_chars["floor"]) facing = 3; //south
	return [xCandidate,yCandidate,facing];
}

function grid_merge(sourceGrid,destGrid,x,y) {
	if (sourceGrid.length > destGrid.length || sourceGrid[0].length > destGrid[0].length) {
		console.error("source grid larger than destination grid");
		return;
	} 
	else {
		for (var i = 0; i < sourceGrid.length; i++) {
			for (var j = 0; j < sourceGrid[i].length; j++) {
			//put in an if statement here to check for wall-over-floor situations
				destGrid[x+i][y+j] = sourceGrid[i][j];
			}
		}
	}
	
}