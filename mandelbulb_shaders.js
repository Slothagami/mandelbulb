const fragment = `
    precision highp float;
    uniform vec2 vRes;
    uniform vec2 vRatio;

    uniform vec2 uRotation;
    uniform vec2 uWorldRot;

    uniform vec3 uCamPos;
    uniform float power;
    uniform vec3 juliaPos;
    uniform float uFovScale;

    uniform int fractalId;

    mat4 rotateX(float angle) {
        return mat4(
            1, 0,           0,          0,
            0, cos(angle), -sin(angle), 0,
            0, sin(angle),  cos(angle), 0,
            0, 0,           0,          1
        );
    }
    mat4 rotateY(float angle) {
        return mat4(
            cos(angle), 0, sin(angle), 0,
            0,          1, 0,          0,
           -sin(angle), 0, cos(angle), 0,
            0,          0, 0,          1
        );
    }
    vec3 rotate(vec3 vector, vec2 rot) {
        mat4 rot_x = rotateX(rot.y);
        mat4 rot_y = rotateY(-rot.x);
        mat4 rot_xy = rot_y * rot_x;
        return (rot_xy * vec4(vector, 1.)).xyz;
    }


    void sphereFold(inout vec3 z, inout float dz) {
        float minRadius2 = .25;
        float fixedRadius2 = 1.;

        float r2 = dot(z,z);
        if (r2<minRadius2) { 
            // linear inner scaling
            float temp = (fixedRadius2/minRadius2);
            z *= temp;
            dz*= temp;
        } else if (r2<fixedRadius2) { 
            // this is the actual sphere inversion
            float temp =(fixedRadius2/r2);
            z *= temp;
            dz*= temp;
        }
    }
    
    void boxFold(inout vec3 z, inout float dz) {
        z = clamp(z, -1., 1.) * 2.0 - z;
    }

    float mandelbox(vec3 z) {
        vec3 offset = z;
        float dr = 1.0;
        for (int n = 0; n < 15; n++) {
            boxFold(z,dr);       // Reflect
            sphereFold(z,dr);    // Sphere Inversion
            
            z = power * z + offset;  // Scale & Translate
            dr = dr*abs(power)+1.;
            if(length(z) > 1000.) break;
        }
        return length(z)/abs(dr);
    }


    float jbox(vec3 z) {
        float dr = 1.;
        for (int n = 0; n < 10; n++) {
            boxFold(z,dr);       // Reflect
            sphereFold(z,dr);    // Sphere Inversion
            
            z = power * z + juliaPos;  // Scale & Translate
            dr = dr*abs(power) + 1.;
        }
        return length(z)/abs(dr);
    }

    float jbulb(vec3 pos) {
        vec3 z = pos;
        float dr = 1.;
        float r;

        for(int i = 0; i < 25; i++) {
            r = length(z);
            if(r > 2.) break;

            float theta = acos(z.z / r) * power;
            float phi   = atan(z.y, z.x) * power;
            float zr    = pow(r, power);

            dr = pow(r, power - 1.) * power * dr + 1.;
            z  = zr * vec3(
                sin(theta) * cos(phi), 
                sin(theta) * sin(phi),
                cos(theta)
            );
            z += juliaPos; // Julia Set Part
        }

        return .5 * log(r) * r / dr;
    }
    
    float alt_jbulb(vec3 pos) {
        vec3 z = pos;
        float dr = 1.;
        float r;

        for(int i = 0; i < 25; i++) {
            r = length(z);
            if(r > 2.) break;

            float theta = asin(z.z / r) * power;
            float phi   = atan(z.y, z.x) * power;
            float zr    = pow(r, power);

            dr = pow(r, power - 1.) * power * dr + 1.;
            z  = zr * vec3(
                cos(theta) * cos(phi), 
                cos(theta) * sin(phi),
                sin(theta)
            );
            z += juliaPos; // Julia Set Part
        }

        return .5 * log(r) * r / dr;
    }
    
    float mandelbulb(vec3 pos) {
        vec3 z = pos;
        float dr = 1.;
        float r;

        for(int i = 0; i < 25; i++) {
            r = length(z);
            if(r > 2.) break;

            float theta = acos(z.z / r) * power;
            float phi   = atan(z.y, z.x) * power;
            float zr    = pow(r, power);

            dr = pow(r, power - 1.) * power * dr + 1.;
            z  = zr * vec3(
                sin(theta) * cos(phi), 
                sin(theta) * sin(phi),
                cos(theta)
            );
            z += pos; // Mandelbrot set Part
        }

        return .5 * log(r) * r / dr;
    }
    
    float alt_mandelbulb(vec3 pos) {
        vec3 z = pos;
        float dr = 1.;
        float r;

        for(int i = 0; i < 25; i++) {
            r = length(z);
            if(r > 2.) break;

            float theta = asin(z.z / r) * power;
            float phi   = atan(z.y, z.x) * power;
            float zr    = pow(r, power);

            dr = pow(r, power - 1.) * power * dr + 1.;
            z  = zr * vec3(
                cos(theta) * cos(phi), 
                cos(theta) * sin(phi),
                sin(theta)
            );
            z += pos; // Mandelbrot set Part
        }

        return .5 * log(r) * r / dr;
    }

    float world(vec3 point) {
        point = rotate(point, uWorldRot);

        if(fractalId == 0) return mandelbulb(point);
        if(fractalId == 1) return jbulb(point);
        if(fractalId == 2) return alt_mandelbulb(point);
        if(fractalId == 3) return alt_jbulb(point);
        if(fractalId == 4) return mandelbox(point);
        if(fractalId == 5) return jbox(point);
    }

    vec3 worldNormal(vec3 point) {
        const vec2 h = vec2(.00001, 0.);
        return normalize(vec3(
            world(point + h.xyy) - world(point - h.xyy),
            world(point + h.yxy) - world(point - h.yxy),
            world(point + h.yyx) - world(point - h.yyx)
        ));
    }

    void main() {
        vec2 vUv = ((gl_FragCoord.xy / vRes - vec2(.5)) * vRes) - vec2(.5);
        vUv = (gl_FragCoord.xy / vRes - vec2(.5)) * vRatio;

        vec3 ray = normalize(vec3(vUv * uFovScale, -1.));
        ray = rotate(ray, uRotation);

        float maxDist = 50.;// 5.
        float dist = 0.;
        vec3  rayPos = uCamPos;

        float marches = 0.;
        for(int i = 0; i < 128; i++) {
            rayPos = uCamPos + ray * dist;
            float ddist = world(rayPos);
            
            if(ddist < .001 || dist > maxDist) break;

            dist += ddist;
            marches++;
        }

        vec3 color = vec3(.05); // background color
        if(dist < maxDist) {
            vec3 dark = vec3(.01, .01, .06);
            vec3 light = vec3(.3, .5, .7);

            // Rim Lighting
            float depth = rayPos.z + 1.3;
            float rim = marches / 128.;

            color = mix(dark, light, rim);
        }

        gl_FragColor = vec4(color, 1.);
    }
`
