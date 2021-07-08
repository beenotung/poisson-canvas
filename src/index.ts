const R = 0
const G = 1
const B = 2
const A = 3

const LEFT_MOUSE = 1
const RIGHT_MOUSE = 2
const MIDDLE_MOUSE = 4

const { floor, round, random, abs, sign } = Math

const W = 200
const H = 200

const canvas = document.querySelector('#main') as HTMLCanvasElement
const context = canvas.getContext('2d')
let rect = canvas.getBoundingClientRect()
let cellWidth = rect.width / W
let cellHeight = rect.height / H
window.addEventListener('resize', () => {
  rect = canvas.getBoundingClientRect()
  cellWidth = rect.width / W
  cellHeight = rect.height / H
})

let batch = 100_000
const over_correction_factor = 1.94
const ERASER_SIZE = 10
const PEN_SIZE = 1

const INITIAL_VALUE = 0.5

canvas.width = W
canvas.height = H

const image = context.getImageData(0, 0, W, H)

// y -> x -> value
const constant_field: number[][] = new Array(H)
  .fill(0)
  .map(() => new Array(W).fill(null))
const poisson_field: number[][] = new Array(H)
  .fill(0)
  .map(() => new Array(W).fill(INITIAL_VALUE))

let isMidClick = false
let isMouseDown = false
let paintValue = 1
let paintSize = 1

canvas.onmousedown = event => {
  isMouseDown = true
  switch (event.buttons) {
    case LEFT_MOUSE:
      paintValue = 1
      paintSize = PEN_SIZE
      break
    case RIGHT_MOUSE:
      paintValue = 0
      paintSize = PEN_SIZE
      break
    case MIDDLE_MOUSE:
      paintValue = null
      paintSize = ERASER_SIZE
      break
    default:
      console.debug('unknown type of mouse button:', event)
  }
  draw(event)
}
canvas.onmouseup = event => {
  isMouseDown = false
  isMidClick = false
}
canvas.onmousemove = event => {
  if (isMouseDown) {
    draw(event)
  }
}
canvas.oncontextmenu = event => {
  return false
}

function draw(event: MouseEvent) {
  const { clientX, clientY } = event
  const cx = round(((clientX - cellWidth / 1) / rect.width) * W)
  const cy = round(((clientY - cellHeight / 1) / rect.height) * H)
  if (cx < 0 || cx >= W) return
  if (cy < 0 || cy >= H) return
  constant_field[cy][cx] = paintValue
  for (let y = cy - paintSize / 2; y <= cy + paintSize / 2; y++) {
    if (y < 0 || y >= H) continue
    for (let x = cx - paintSize / 2; x <= cx + paintSize / 2; x++) {
      if (x < 0 || x >= W) continue
      constant_field[round(y)][round(x)] = paintValue
    }
  }
}

function tick() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (constant_field[y][x] !== null) {
        poisson_field[y][x] = constant_field[y][x]
      }
    }
  }
  for (let i = 0; i < batch; i++) {
    const y = floor(random() * H)
    const x = floor(random() * W)
    if (constant_field[y][x] !== null) {
      continue
    }
    const old_value = poisson_field[y][x]
    let sum = 0
    ;[
      [y - 1, x],
      [y + 1, x],
      [y, x - 1],
      [y, x + 1],
    ].forEach(([y, x]) => {
      y = y === -1 ? 1 : y === H ? H - 1 : y
      x = x === -1 ? 1 : x === W ? W - 1 : x
      sum += poisson_field[y][x]
    })
    const average = sum / 4.0
    const correction = average - old_value
    poisson_field[y][x] += correction * over_correction_factor
  }
  requestAnimationFrame(tick)
}

requestAnimationFrame(tick)

type Mode = 'bw' | 'rgb'
let mode: Mode = 'bw'

window.addEventListener('keypress', event => {
  switch (event.key) {
    case 'b':
    case 'w':
      mode = 'bw'
      break
    case 'r':
    case 'g':
    case 'c':
    case 't':
      mode = 'rgb'
      break
    case '+':
      batch *= 2
      break
    case '-':
      batch /= 2
      break
    default:
      console.log(event)
  }
})

function render() {
  let i = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const value = poisson_field[y][x]

      let r, g, b
      if (mode === 'bw') {
        r = value
        g = value
        b = value
      } else {
        r = ((value - 0.5) * 2 + abs(value - 0.5) * 2) / 2
        g = (0.5 - abs(0.5 - value)) * 2
        b = ((1 - value - 0.5) * 2 + abs(1 - value - 0.5) * 2) / 2
      }

      image.data[i + R] = floor(r * 256)
      image.data[i + G] = floor(g * 256)
      image.data[i + B] = floor(b * 256)
      image.data[i + A] = 255
      i += 4
    }
  }
  context.putImageData(image, 0, 0)
  requestAnimationFrame(render)
}

requestAnimationFrame(render)
