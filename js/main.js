
const $ = _ => document.querySelector(_)

const $c = _ => document.createElement(_)

let canvas, bg, fg, cf, ntiles, tileWidth, tileHeight, map, tools, tool, activeTool, isPlacing

/** This matches definitions in 2D JSON serialization */
const EMPTY = '';
const PARK = 'P';
const HOUSE = 'H';
const STREET = 'S';

const Tiles = {
	EMPTY: '',
	PARK: 'P',
	HOUSE: 'H',
	STREET: 'S'
}

/* texture from https://opengameart.org/content/isometric-landscape */
const texture = new Image()
texture.src = "textures/tiles-new-2.png"


function load() {
	const file = document.querySelector('input[type=file]').files[0];
	const reader = new FileReader();

	reader.addEventListener("load", function () {
		raw = JSON.parse(reader.result);
		// reverse the x coordinates to be based on top right (instead of top left)
		// since we want to render it in isomorphic view
		raw.reverse()
		init(raw);
	}, false);

	if (file) {
		reader.readAsText(file);
	}
}

ntiles = 0


/** CUSTOM */
// (x, y) coordinates matches textiles from the textiles image
HOUSES = {
	// "top-bottom" facing buildings
	'tb': [
		// [3, 10], [3, 11],
		[4, 6], [4, 7], [5, 0], [5, 1], [5, 2], [5, 3],  // "residential"
		// [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], // "commercial buildings"
		// [5, 6], [5, 9], [5, 11] // "stores"
	],
	// 'left-right" facing buildings
	'lr': [
		[4, 7], [4, 11], [5, 4], [5, 5], [5, 7], [5, 8], [5, 10], // "residential"
		// [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], // "commercial buildings"
		// [5, 6], [5, 9], [5, 11] // "stores"

	]
}

PARKS = [
	[6, 0],
	[6, 1],
	[6, 2],
	[6, 3],
	[6, 4],
	[6, 5],
	[6, 6],
	[6, 7],
	[6, 8],
	[6, 9],
	[6, 10],
	[6, 11]
]

// different sprites depending on existence of surrounding streets
// ('t' for top, 'b' for bottom, 'l' for left, 'r' for right),
// 'tblr' will be in order
STREETS = {
	'': [[0, 0]],
	't': [[1, 6]],
	'b': [[1, 5]],
	'l': [[1, 4]],
	'r': [[1, 7]],
	'tb': [[0, 2], [0, 7], [0, 11], [1, 0], [1, 1]],
	'tl': [[3, 4]],
	'tr': [[3, 3]],
	'bl': [[3, 2]],
	'br': [[3, 6]],
	'lr': [[0, 3], [0, 6], [0, 10], [1, 2], [1, 3]],
	'tbl': [[0, 8], [0, 9]],
	'tbr': [[0, 8], [0, 9]],
	'tlr': [[0, 8], [0, 9]],
	'blr': [[0, 8], [0, 9]],
	'tblr': [[0, 8], [0, 9]]
}

EMPTY_BLOCK = [0, 0]

const getRandom = (array) => {
	console.log(array)
	return array[Math.floor(Math.random() * array.length)];
}

const getSurroundingStreets = (p5Map, i, j) => {
	let res = ''
	// top
	if ((j - 1 >= 0 && p5Map[i][j - 1] === Tiles.STREET) || (j === 0)) {
		res += 't';
	}
	// bottom
	if ((j + 1 < ntiles && p5Map[i][j + 1] === Tiles.STREET) || (j === ntiles - 1)) {
		res += 'b';
	}
	// left
	if ((i - 1 >= 0 && p5Map[i - 1][j] === Tiles.STREET) || (i === 0)) {
		res += 'l';
	}
	// right
	if ((i + 1 < ntiles && p5Map[i + 1][j] === Tiles.STREET) || (i === ntiles - 1)) {
		res += 'r';
	}
	return res;
}

const generateMap = (p5Map) => {
	map = []

	const MAP_SIZE = p5Map.length

	for (let i = 0; i < MAP_SIZE; i++) {
		row = [];
		for (let j = 0; j < MAP_SIZE; j++) {
			// get surrounding streets for context (for houses, streets, etc.)
			const surround = getSurroundingStreets(p5Map, i, j);
			if (p5Map[i][j] === Tiles.HOUSE) {
				if (surround.includes('l') || surround.includes('r')) {
					row.push(getRandom(HOUSES['lr']));
				} else if (surround.includes('t') || surround.includes('b')) {
					row.push(getRandom(HOUSES['tb']));
				}
			} else if (p5Map[i][j] === Tiles.PARK) {
				row.push(getRandom(PARKS));
			} else if (p5Map[i][j] === Tiles.STREET) {
				row.push(getRandom(STREETS[surround]));
			} else {
				row.push(EMPTY_BLOCK);
			}
		}
		map.push(row);
	}

	return map;
}

/** END CUSTOM */

const init = (p5Map) => {
	tool = [0, 0]


	canvas = $("#bg")
	canvas.width = 2000
	canvas.height = 1500
	w = 2000
	h = 1500
	texWidth = 12
	texHeight = 6
	bg = canvas.getContext("2d")
	tileWidth = 128
	tileHeight = 64
	bg.translate(w / 2, tileHeight * 2)

	console.log(p5Map);
	ntiles = p5Map.length;
	map = generateMap(p5Map);
	drawMap()

	fg = $('#fg')
	fg.width = canvas.width
	fg.height = canvas.height
	cf = fg.getContext('2d')
	cf.translate(w / 2, tileHeight * 2)
	fg.addEventListener('contextmenu', e => e.preventDefault())

}

const drawMap = () => {
	bg.clearRect(-w, -h, w * 2, h * 2)
	for (let i = 0; i < ntiles; i++) {
		for (let j = 0; j < ntiles; j++) {
			drawImageTile(bg, i, j, map[i][j][0], map[i][j][1])
		}
	}
}


const drawImageTile = (c, x, y, i, j) => {
	c.save()
	c.translate((y - x) * tileWidth / 2, (x + y) * tileHeight / 2)
	j *= 130
	i *= 230
	c.drawImage(texture, j, i, 130, 230, -65, -130, 130, 230)
	c.restore()
}
