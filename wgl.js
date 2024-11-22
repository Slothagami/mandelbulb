const defaultVertex = `
    precision mediump float;
    attribute vec3 vPos;

    void main() {
        gl_Position = vec4(vec2(vPos), 0., 1.);
    }
`

class WebGlInterface {
    constructor(canvas, vertexSource, fragmentSource, debug=false) {
        this.canvas = canvas 
        this.gl   = canvas.getContext("webgl")
        this.bufferPointSize = 0
        this.boundBufferSize = 0
        this.bufferOffset = 0

        let gl = this.gl
        // gl.enable(gl.DEPTH_TEST) // Don't draw hidden sides of geometry
        // gl.enable(gl.CULL_FACE) // Remove back faces before drawing

        // for edge and other browsers that don't suport main webgl
        if (!gl) gl = canvas.getContext("experimental-webgl")
        if (!gl) alert("Your browser does not support webgl")


        // make the shader program
        let vertex   = gl.createShader(gl.  VERTEX_SHADER)
        let fragment = gl.createShader(gl.FRAGMENT_SHADER)

        gl.shaderSource(vertex,   vertexSource  )
        gl.shaderSource(fragment, fragmentSource)

        // compile and send any errors
        gl.compileShader(vertex)
        if(!gl.getShaderParameter(vertex, gl.COMPILE_STATUS)) 
            console.error("Vertex Shader: ", gl.getShaderInfoLog(vertex))

        gl.compileShader(fragment)
        if(!gl.getShaderParameter(fragment, gl.COMPILE_STATUS)) 
            console.error("Fragment Shader: ", gl.getShaderInfoLog(fragment))


        // make program
        let program = gl.createProgram()

        gl.attachShader(program, vertex)
        gl.attachShader(program, fragment)

        gl.linkProgram(program)

        if(!gl.getProgramParameter(program, gl.LINK_STATUS))
            console.error("Link program: ", gl.getProgramInfoLog(program))

        this.program = program


        // validate program to catch more errors
        if(debug) {
            gl.validateProgram(program)
            if(!gl.getProgramParameter(program, gl.VALIDATE_STATUS))
                console.error("Program: ", gl.getProgramInfoLog(program))
        }
    }

    drawScreen() {
        this.fill(.05, .05, .05)
        this.draw(this.gl.TRIANGLE_STRIP)
    }

    resize() {
        this.canvas.width  = window.innerWidth
        this.canvas.height = window.innerHeight

        // resize webgl draw area
        this.gl.viewport(0,0, window.innerWidth, window.innerHeight)
    }

    setBufferPointSize(size) {
        this.bufferPointSize = size
    }

    fill(r, g, b, a=1) {
        this.gl.clearColor(r, g, b, a)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
    }

    buffer(data) {
        let gl = this.gl
        let buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
        this.boundBufferSize = data.length
    }

    indexBuffer(data) {
        let gl = this.gl
        let buffer = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW)
    }

    addAttrib(attribName, size) {
        // Attributes must be added in the order they appear in the buffer

        let gl = this.gl
        let attribLocation = gl.getAttribLocation(this.program, attribName)
        gl.vertexAttribPointer(
            attribLocation, size, // size = elements per attrib
            gl.FLOAT, gl.FALSE, // dtype, is normalized
            this.bufferPointSize * Float32Array.BYTES_PER_ELEMENT, // size of a vertex
            this.bufferOffset * Float32Array.BYTES_PER_ELEMENT // offset from beggining of buffer to start
        )
        gl.enableVertexAttribArray(attribLocation)

        this.bufferOffset += size
    }

    uniformMat4(uniformName, matrix) {
        if(vector.length != 16) throw "Uniform Wrong size for Mat4"
        let gl = this.gl

        gl.useProgram(this.program)
        let location = gl.getUniformLocation(this.program, uniformName)
        gl.uniformMatrix4fv(location, gl.FALSE, new Float32Array(matrix))
    }

    uniformVec2(uniformName, vector) {
        if(vector.length != 2) throw "Uniform Wrong size for Vec2"
        let gl = this.gl

        gl.useProgram(this.program)
        let location = gl.getUniformLocation(this.program, uniformName)
        gl.uniform2fv(location, new Float32Array(vector))
    }
    uniformVec3(uniformName, vector) {
        if(vector.length != 3) throw "Uniform Wrong size for Vec3"
        let gl = this.gl

        gl.useProgram(this.program)
        let location = gl.getUniformLocation(this.program, uniformName)
        gl.uniform3fv(location, new Float32Array(vector))
    }
    uniformFloat(uniformName, value) {
        if(typeof value != "number") throw "Value is not a number."
        let gl = this.gl

        gl.useProgram(this.program)
        let location = gl.getUniformLocation(this.program, uniformName)
        gl.uniform1fv(location, new Float32Array([value]))
    }
    uniformInt(uniformName, value) {
        if(typeof value != "number") throw "Value is not a number."
        let gl = this.gl

        gl.useProgram(this.program)
        let location = gl.getUniformLocation(this.program, uniformName)
        gl.uniform1i(location, value)
    }

    draw(mode, skipPoints=0) {
        let gl = this.gl 
        gl.useProgram(this.program)
        gl.drawArrays(
            mode, skipPoints, 
            this.boundBufferSize / this.bufferPointSize
        )
    }

    drawElements(mode, length, skip=0) {
        let gl = this.gl 
        gl.useProgram(this.program)
        gl.drawElements(mode, length, gl.UNSIGNED_SHORT, skip)
    }
}

class WebGLFragment extends WebGlInterface {
    constructor(canvas, fragment, debug=false) {
        super(canvas, defaultVertex, fragment, debug)

        window.addEventListener("resize", e => {
            // resize canvas
            this.canvas.width = window.innerWidth
            this.canvas.height = window.innerHeight
    
            // update shader size uniforms
            gl.uniformVec2("vRes", [this.canvas.width, this.canvas.height])
            gl.uniformVec2("vRatio", [this.canvas.width / this.canvas.height, 1])
        })

        this.resize()
        this.buffer([
            -1,-1,
            1,-1,
            -1, 1,
            1, 1
        ])

        this.setBufferPointSize(2)
        this.addAttrib("vPos", 2)

        this.uniformVec2("vRes", [this.canvas.width, this.canvas.height])
        this.uniformVec2("vRatio", [this.canvas.width / this.canvas.height, 1])
    }

    draw(skip=0) {
        super.draw(this.gl.TRIANGLE_STRIP, skip)
    }
}

const radians = deg => deg * Math.PI / 180

function resize_canvas(width, height, isevent=false) {
    if(isevent && !auto_resize) return
    if(!isevent) auto_resize = false

    // resize canvas
    canv.width  = width
    canv.height = height

    // update shader size uniforms
    gl.uniformVec2("vRes", [width, height])
    gl.uniformVec2("vRatio", [width / height, 1])
}

// setup base program
var canv, gl, auto_resize = true
window.addEventListener("load", () => {
    window.addEventListener("resize", e => {
        resize_canvas(window.innerWidth, window.innerHeight, true)
    })

    window.addEventListener("keydown", e => {
        if(e.key === "Tab") screenshot()
    })

    // use default vertex shader if one not provided
    if(typeof vertex == "undefined") {
        var vertex = defaultVertex
    }

    canv = document.querySelector("canvas")
    gl   = new WebGlInterface(canv, vertex, fragment, true)

    gl.resize()
    gl.buffer([
        -1,-1,
         1,-1,
        -1, 1,
         1, 1
    ]) // triangles to cover screen to draw shader on

    gl.setBufferPointSize(2)
    gl.addAttrib("vPos", 2)

    // set screen ratio and size
    gl.uniformVec2("vRes", [canv.width, canv.height])
    gl.uniformVec2("vRatio", [canv.width / canv.height, 1])
    setup()
    requestAnimationFrame(render)
})



function screenshot() {
    render()
    let a = document.createElement("a")
        a.href = canv.toDataURL()
        a.download = new Date().getTime() + ".png"

    document.body.appendChild(a)
    a.click()
    setTimeout(() => {document.body.removeChild(a)}, 0)
}
