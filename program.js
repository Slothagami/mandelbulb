var canv, gl
var cameraPos = [0,0,3]
var rotation  = [0, 0]
var world_rotation = [0, 0]
var mouse = {x:0, y:0}, mousedown = false
var power = 8
var juliaPos;

var animatePower = true
var rotspd = .03, moveSpd = .015
var freeFlyMode = false
var fov = 1, target_fov = 1
var keys = {}
var animRange = {min: 1.2, max: 8}
var animSpeed = 25 // in seconds
var shader_ids = ["mandelbulb", "jbulb", "alt_mandelbulb", "alt_jbulb", "mandelbox", "jbox"]
var shader_id  = 0

const lerp   = (a, b, perc) => (b - a) * perc + a
const clamp  = (val, min, max) => Math.min(Math.max(val, min), max)
const rand   = (min, max) => Math.random() * (max - min) + min
const choice = (arr) => arr[Math.round(Math.random() * (arr.length - 1))]

function setup() {
    use_fractal("alt_jbulb")
    randomSet()

    console.log(`
        power: exponent of set
        seedPos: julia set position (use randomSet() to explore)
        animRange: min and max animated power
        fractalType
        cameraMode

    `)

    window.addEventListener("keyup",     e => {keys[e.key] = false})
    window.addEventListener("keydown",   keypress)
    window.addEventListener("mousedown", e => {mousedown = true })
    window.addEventListener("mouseup",   e => {mousedown = false})
    window.addEventListener("mousemove", rotate_camera)
    window.addEventListener("resize",    e => {
        // resize canvas
        canv.width  = window.innerWidth
        canv.height = window.innerHeight

        // update shader size uniforms
        gl.uniformVec2("vRes", [canv.width, canv.height])
        gl.uniformVec2("vRatio", [canv.width / canv.height, 1])
    })

    gl.uniformVec2("vRes", [canv.width, canv.height])
    gl.uniformVec2("vRatio", [canv.width / canv.height, 1])
    gl.uniformVec2("uRotation", rotation)
    gl.uniformVec3("uCamPos", cameraPos)
}

function render() {
    fov = lerp(fov, target_fov, .2)

    move_camera()
    animate_power()    

    // update uniforms
    gl.uniformVec2("uRotation", rotation)
    gl.uniformVec2("uWorldRot", world_rotation)
    gl.uniformVec3("uCamPos", cameraPos)
    gl.uniformFloat("uFovScale", fov)
    gl.uniformFloat("power", power)
    gl.uniformVec3("juliaPos", juliaPos)
    gl.uniformInt("fractalId", shader_id)
    gl.drawScreen()

    requestAnimationFrame(render)
}

function move_camera() {
    var move = (angle, dir) => add(cameraPos, normal(angle, dir * moveSpd))
    if(keys.w) cameraPos = move(rotation, -1)
    if(keys.s) cameraPos = move(rotation, 1)

    // perpendicular directions
    if(keys.a) cameraPos = move([rotation[0] + Math.PI/2, -rotation[1]], -1)
    if(keys.d) cameraPos = move([rotation[0] + Math.PI/2, -rotation[1]],  1)
}
function rotate_camera(e) {
    let dmousex = mouse.x - e.x
    let dmousey = mouse.y - e.y

    mouse.x = e.x 
    mouse.y = e.y 

    let dmouseDist = Math.hypot(dmousex, dmousey)
    let xmap = dmousex / dmouseDist
    let ymap = dmousey / dmouseDist

    let dx = xmap * rotspd
    let dy = ymap * rotspd

    if(mousedown && dmouseDist > 0 && freeFlyMode) {
        rotation[0] += dx
        rotation[1] -= dy
    }
    if(mousedown && dmouseDist > 0 && !freeFlyMode) {
        world_rotation[0] += dx
        world_rotation[1] -= dy
    }
}
function animate_power() {
    if(!animatePower)  return
    let time  = performance.now() / 1000
    let scale = (animRange.max - animRange.min) / 2
    let shift = (animRange.min + animRange.max) / 2

    power = Math.sin(time * Math.PI / animSpeed) * scale + shift
}

function keypress(e) {
    keys[e.key] = true

    if("23456789".split("").includes(e.key)) {
        power = parseInt(e.key)
    }

    switch (e.key) {
        case "=": target_fov -= .1; break
        case "-": target_fov += .1; break
        
        case "q": screenshot();                 break
        case "e": freeFlyMode  = !freeFlyMode;  break
        case " ": animatePower = !animatePower; break
    }
}

// Utility
function randomSet(range=1.4) {
    juliaPos = [
        rand(-range, range), 
        rand(-range, range), 
        rand(-range, range)
    ]
}

function use_fractal(name) {
    shader_id = shader_ids.indexOf(name)
}

function normal(rot, scale=1) {
    let x = rot[0]
    let y = rot[1]
    return [
        scale * Math.sin(x) * Math.cos(y), 
        scale * Math.sin(y), 
        scale * Math.cos(x) * Math.cos(y)
    ]
}

function add(a, b) {
    let sum = []
    for(let i in a) sum.push(a[i] + b[i])
    return sum
}

function screenshot() {
    render()
    let a = document.createElement("a")
        a.href = canv.toDataURL()
        a.download = new Date().getTime() + ".png"

    document.body.appendChild(a)
    a.click()
    setTimeout(() => {document.body.removeChild(a)}, 0)
}
