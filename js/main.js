
const $ = _ => document.querySelector(_)

const $c = _ => document.createElement(_)

let canvas, bg, fg, cf, ntiles, tileWidth, tileHeight, map, tools, tool, activeTool, isPlacing

/* texture from https://opengameart.org/content/isometric-landscape */
const texture = new Image()
texture.src = "textures/01_130x66_130x230.png"
// texture.onload = _ => init()


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

ntiles = 7


/** CUSTOM */
// (x, y) coordinates from the textiles image
HOUSES = [
	[3, 10], [3, 11],
	[4, 6], [4, 7], [4, 8], [4, 9], [4, 10], [4, 11],
	[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10], [5, 11]
]

PARKS = [
	[0, 1]
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
	'tb': [[0, 2], [0, 11], [1, 0], [1, 1]],
	'tl': [[3, 4]],
	'tr': [[3, 3]],
	'bl': [[3, 2]],
	'br': [[3, 6]],
	'lr': [[0, 3], [0, 10], [1, 2], [1, 3]],
	'tbl': [[0, 8], [0, 9]],
	'tbr': [[0, 8], [0, 9]],
	'blr': [[0, 8], [0, 9]],
	'tblr': [[0, 8], [0, 9]]
}

EMPTY_BLOCK = [0, 0]

const getRandom = (array) => {
	return array[Math.floor(Math.random() * array.length)];
}

const getSurroundingStreets = (p5Map, i, j) => {
	let res = ''
	// top
	if ((j - 1 >= 0 && p5Map[i][j - 1] === 'Street') || (j === 0)) {
		res += 't';
	}
	// bottom
	if ((j + 1 < ntiles && p5Map[i][j + 1] === 'Street') || (j === ntiles - 1)) {
		res += 'b';
	}
	// left
	if ((i - 1 >= 0 && p5Map[i - 1][j] === 'Street') || (i === 0)) {
		res += 'l';
	}
	// right
	if ((i + 1 < ntiles && p5Map[i + 1][j] === 'Street') || (i === ntiles - 1)) {
		res += 'r';
	}
	return res;
}

const generateMap = (p5Map) => {
	map = []

	for (let i = 0; i < 7; i++) {
		row = [];
		for (let j = 0; j < 7; j++) {
			if (p5Map[i][j] === 'House') {
				row.push(getRandom(HOUSES));
			} else if (p5Map[i][j] === 'Park') {
				row.push(getRandom(PARKS));
			} else if (p5Map[i][j] === 'Street') {
				const surround = getSurroundingStreets(p5Map, i, j);
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
	canvas.width = 910
	canvas.height = 666
	w = 910
	h = 462
	texWidth = 12
	texHeight = 6
	bg = canvas.getContext("2d")
	tileWidth = 128
	tileHeight = 64
	bg.translate(w / 2, tileHeight * 2)


	map = generateMap(p5Map);

	drawMap()

	fg = $('#fg')
	fg.width = canvas.width
	fg.height = canvas.height
	cf = fg.getContext('2d')
	cf.translate(w / 2, tileHeight * 2)
	fg.addEventListener('mousemove', viz)
	fg.addEventListener('contextmenu', e => e.preventDefault())

}

// From https://stackoverflow.com/a/36046727
const ToBase64 = u8 => {
	return btoa(String.fromCharCode.apply(null, u8))
}

const FromBase64 = str => {
	return atob(str).split('').map(c => c.charCodeAt(0))
}


const drawMap = () => {
	bg.clearRect(-w, -h, w * 2, h * 2)
	for (let i = 0; i < ntiles; i++) {
		for (let j = 0; j < ntiles; j++) {
			drawImageTile(bg, i, j, map[i][j][0], map[i][j][1])
		}
	}
}

const drawTile = (c, x, y, color) => {
	c.save()
	c.translate((y - x) * tileWidth / 2, (x + y) * tileHeight / 2)
	c.beginPath()
	c.moveTo(0, 0)
	c.lineTo(tileWidth / 2, tileHeight / 2)
	c.lineTo(0, tileHeight)
	c.lineTo(-tileWidth / 2, tileHeight / 2)
	c.closePath()
	c.fillStyle = color
	c.fill()
	c.restore()
}

const drawImageTile = (c, x, y, i, j) => {
	c.save()
	c.translate((y - x) * tileWidth / 2, (x + y) * tileHeight / 2)
	j *= 130
	i *= 230
	c.drawImage(texture, j, i, 130, 230, -65, -130, 130, 230)
	c.restore()
}

const getPosition = e => {
	const _y = (e.offsetY - tileHeight * 2) / tileHeight,
		_x = e.offsetX / tileWidth - ntiles / 2
	x = Math.floor(_y - _x)
	y = Math.floor(_x + _y)
	return { x, y }
}

const viz = (e) => {
	if (isPlacing)
		click(e)
	const pos = getPosition(e)
	cf.clearRect(-w, -h, w * 2, h * 2)
	if (pos.x >= 0 && pos.x < ntiles && pos.y >= 0 && pos.y < ntiles)
		drawTile(cf, pos.x, pos.y, 'rgba(0,0,0,0.2)')
}
