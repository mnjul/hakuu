'use strict';

// Code adapted from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/

;(function(exports){

function createCanvas(width,height){
  let canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  return canvas;
}

const dropAlphaBase64 = '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';
const dropColorBase64 = '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';

let WebGL = {};
WebGL.getContext = function(canvas, options={}) {
  let contexts = ["webgl", "experimental-webgl"];
  let context = null;

  contexts.some(name=>{
    try{
      context = canvas.getContext(name,options);
    }catch(e){};
    return context!=null;
  });

  if(context==null){
    // document.body.classList.add("no-webgl");
  }

  // canvas may have been resized (and the context would be at old dimensions, so let's do this)
  context.viewport(0, 0, canvas.width, canvas.height);

  return context;
}

WebGL.createProgram = function(gl,vertexScript,fragScript){
  let vertexShader = WebGL.createShader(gl, vertexScript, gl.VERTEX_SHADER);
  let fragShader = WebGL.createShader(gl, fragScript, gl.FRAGMENT_SHADER);

  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragShader);

  gl.linkProgram(program);

  let linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
      var lastError = gl.getProgramInfoLog(program);
      error("Error in program linking: " + lastError);
      gl.deleteProgram(program);
      return null;
  }

  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

  // if (positionLocation === 0 || texCoordLocation === -1) {
  //   return program;
  // }

  var texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0
  ]), gl.STATIC_DRAW);

  if (texCoordLocation !== -1) {
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  // Create a buffer for the position of the rectangle corners.
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  return program;
}

WebGL.createShader = function(gl,script,type){
  let shader = gl.createShader(type);
  gl.shaderSource(shader,script);
  gl.compileShader(shader);

  let compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (!compiled) {
    let lastError = gl.getShaderInfoLog(shader);
    error("Error compiling shader '" + shader + "':" + lastError);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

WebGL.createTexture = function(gl,source,i){
  var texture = gl.createTexture();
  WebGL.activeTexture(gl,i);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  WebGL.updateTexture(gl,source);

  return texture;
}
WebGL.createUniform = function(gl,program,type,name,...args){
  let location=gl.getUniformLocation(program,"u_"+name);
  gl["uniform"+type](location,...args);
}
WebGL.activeTexture = function(gl,i){
  gl.activeTexture(gl["TEXTURE"+i]);
}
WebGL.updateTexture = function(gl,source){
  if (source.width === 0 || source.height === 0) return;
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}
WebGL.setRectangle = function(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2]), gl.STATIC_DRAW);
}

function error(msg){
  console.error(msg);
}







function GL(canvas,options,vert,frag){
  this.init(canvas,options,vert,frag);
}
GL.prototype={
  canvas:null,
  gl:null,
  program:null,
  width:0,
  height:0,
  init(canvas,options,vert,frag){
    this.canvas=canvas;
    this.width=canvas.width;
    this.height=canvas.height;
    this.gl=WebGL.getContext(canvas,options);
    this.program=this.createProgram(vert,frag);
    this.useProgram(this.program);
  },
  createProgram(vert,frag){
    let program=WebGL.createProgram(this.gl,vert,frag);
    return program;
  },
  useProgram(program){
    this.program=program;
    this.gl.useProgram(program);
  },
  createTexture(source,i){
    return WebGL.createTexture(this.gl,source,i);
  },
  createUniform(type,name,...v){
    WebGL.createUniform(this.gl,this.program,type,name,...v);
  },
  activeTexture(i){
    WebGL.activeTexture(this.gl,i);
  },
  updateTexture(source){
    WebGL.updateTexture(this.gl,source);
  },
  draw(){
    WebGL.setRectangle(this.gl, -1, -1, 2, 2);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
}



let vertShader = `
precision mediump float;
#define GLSLIFY 1

attribute vec2 a_position;

void main() {
   gl_Position = vec4(a_position,0.0,1.0);
}
`;

let fragShader = `
precision mediump float;
#define GLSLIFY 1

// textures
uniform sampler2D u_waterMap;
uniform sampler2D u_textureFg;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;
uniform vec2 u_resolution;
uniform float u_textureRatio;
uniform float u_minRefraction;
uniform float u_refractionDelta;
uniform float u_brightness;
uniform float u_alphaMultiply;
uniform float u_alphaSubtract;

// alpha-blends two colors
vec4 blend(vec4 bg,vec4 fg){
  vec3 bgm=bg.rgb*bg.a;
  vec3 fgm=fg.rgb*fg.a;
  float ia=1.0-fg.a;
  float a=(fg.a + bg.a * ia);
  vec3 rgb;
  if(a!=0.0){
    rgb=(fgm + bgm * ia) / a;
  }else{
    rgb=vec3(0.0,0.0,0.0);
  }
  return vec4(rgb,a);
}

vec2 pixel(){
  return vec2(1.0,1.0)/u_resolution;
}

vec2 texCoord(){
  return vec2(gl_FragCoord.x, u_resolution.y-gl_FragCoord.y)/u_resolution;
}

// scales the bg up and proportionally to fill the container
vec2 scaledTexCoord(){
  float ratio=u_resolution.x/u_resolution.y;
  vec2 scale=vec2(1.0,1.0);
  vec2 offset=vec2(0.0,0.0);
  float ratioDelta=ratio-u_textureRatio;
  if(ratioDelta>=0.0){
    scale.y=(1.0+ratioDelta);
    offset.y=ratioDelta/2.0;
  }else{
    scale.x=(1.0-ratioDelta);
    offset.x=-ratioDelta/2.0;
  }
  return (texCoord()+offset)/scale;
}

// get color from fg
vec4 fgColor(float x, float y){
  float p2=0.0;
  vec2 scale=vec2(
    (u_resolution.x+p2)/u_resolution.x,
    (u_resolution.y+p2)/u_resolution.y
  );

  vec2 scaledTexCoord=texCoord()/scale;
  vec2 offset=vec2(
    (1.0-(1.0/scale.x))/2.0,
    (1.0-(1.0/scale.y))/2.0
  );

  return texture2D(u_waterMap,
    (scaledTexCoord+offset)+(pixel()*vec2(x,y))
  );
}

void main() {
  vec4 bg=texture2D(u_textureFg,scaledTexCoord());

  vec4 cur = fgColor(0.0,0.0);

  float d=cur.b; // "thickness"
  float x=cur.g;
  float y=cur.r;

  float a=clamp(cur.a*u_alphaMultiply-u_alphaSubtract, 0.0,1.0);

  vec2 refraction = vec2(x,y);
  vec2 refractionPos = scaledTexCoord()
    + (pixel()*refraction*(u_minRefraction+(d*u_refractionDelta)));

  vec4 tex=texture2D(u_textureFg,refractionPos);

  vec4 fg=vec4(tex.rgb*u_brightness,a);

  gl_FragColor = blend(bg,fg);
}
`;


const defaultOptionsRR={
  minRefraction:256,
  maxRefraction:512,
  brightness:1,
  alphaMultiply:20,
  alphaSubtract:5,
}
function RainRenderer(canvas,canvasLiquid, image,options={}){

  this.canvas=canvas;
  this.canvasLiquid=canvasLiquid;
  this.image=image;
  this.options=Object.assign({},defaultOptionsRR, options);
  this.init();
}

RainRenderer.prototype={
  canvas:null,
  gl:null,
  canvasLiquid:null,
  width:0,
  height:0,
  image:"",
  textures:null,
  programWater:null,
  programBlurX:null,
  programBlurY:null,
  options:null,
  init(){
    this.width=this.canvas.width;
    this.height=this.canvas.height;
    // console.log('init rainranderer');
    // console.log('(RR) width', this.width, 'height', this.height);
    // console.log('(RR) image', this.image, 'height', this.height);
    this.gl=new GL(this.canvas, {alpha:false},vertShader,fragShader);
    let gl=this.gl;
    this.programWater=gl.program;

    gl.createUniform("2f","resolution",this.width,this.height);
    gl.createUniform("1f","textureRatio",this.image.width/this.image.height);
    gl.createUniform("1f","minRefraction",this.options.minRefraction);
    gl.createUniform("1f","refractionDelta",this.options.maxRefraction-this.options.minRefraction);
    gl.createUniform("1f","brightness",this.options.brightness);
    gl.createUniform("1f","alphaMultiply",this.options.alphaMultiply);
    gl.createUniform("1f","alphaSubtract",this.options.alphaSubtract);


    // converted first param from null to avoid errors. not sure why this works anyway
    gl.createTexture(createCanvas(0,0),0);

    this.textures=[
      {name:'textureFg', img:this.image}
    ];

    this.textures.forEach((texture,i)=>{
      gl.createTexture(texture.img,i+1);
      gl.createUniform("1i",texture.name,i+1);
    });

    this.draw();
  },
  draw(){
    if(this.destroyed){
      return;
    }
    this.gl.useProgram(this.programWater);
    this.updateTexture();
    this.gl.draw();

    this.raf = requestAnimationFrame(this.draw.bind(this));
  },
  updateTextures(){
    this.textures.forEach((texture,i)=>{
      this.gl.activeTexture(i+1);
      this.gl.updateTexture(texture.img);
    })
  },
  updateTexture(){
    this.gl.activeTexture(0);
    this.gl.updateTexture(this.canvasLiquid);
  },
  destroy(){
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
  }
}



function times(n,f){
  for (let i = 0; i < n; i++) {
    f.call(this,i);
  }
}

function random(from=null,to=null,interpolation=null){
  if(from==null){
    from=0;
    to=1;
  }else if(from!=null && to==null){
    to=from;
    from=0;
  }
  const delta=to-from;

  if(interpolation==null){
    interpolation=(n)=>{
      return n;
    }
  }
  return from+(interpolation(Math.random())*delta);
}

function chance(c){
  return random()<=c;
}




let dropSize=64;
const Drop={
  x:0,
  y:0,
  r:0,
  spreadX:0,
  spreadY:0,
  momentum:0,
  momentumX:0,
  lastSpawn:0,
  nextSpawn:0,
  parent:null,
  isNew:true,
  killed:false,
  shrink:0,
}
const defaultOptions={
  minR:10,
  maxR:40,
  maxDrops:900,
  rainChance:0.3,
  rainLimit:3,
  dropletsRate:50,
  dropletsSize:[2,4],
  dropletsCleaningRadiusMultiplier:0.43,
  raining:true,
  globalTimeScale:1,
  trailRate:1,
  autoShrink:true,
  spawnArea:[-0.1,0.95],
  trailScaleRange:[0.2,0.5],
  collisionRadius:0.65,
  collisionRadiusIncrease:0.01,
  dropFallMultiplier:1,
  collisionBoostMultiplier:0.05,
  collisionBoost:1,
}

function Raindrops(width,height,scale,options,initedCallback){
  this.width=width;
  this.height=height;
  this.scale=scale;

  this.options=Object.assign({},defaultOptions,options);

  this.dropAlpha=new Image();
  this.dropColor=new Image();
  let dropAlphaPromise = new Promise((resolve, reject) => {
    this.dropAlpha.onload = resolve;
    this.dropAlpha.src = 'data:image/png;base64,' + dropAlphaBase64;
  });
  let dropColorPromise = new Promise((resolve, reject) => {
    this.dropColor.onload = resolve;
    this.dropColor.src = 'data:image/png;base64,' + dropColorBase64;
  });

  this.initedPromise = Promise.all([dropAlphaPromise, dropColorPromise]).then(() => {
    // console.log('almost to init raindrops');
    // console.log('width', this.width, 'height', this.height);
    this.init();
  });
}
Raindrops.prototype={
  dropColor:null,
  dropAlpha:null,
  canvas:null,
  ctx:null,
  width:0,
  height:0,
  scale:0,
  dropletsPixelDensity:1,
  droplets:null,
  dropletsCtx:null,
  dropletsCounter:0,
  drops:null,
  dropsGfx:null,
  clearDropletsGfx:null,
  textureCleaningIterations:0,
  lastRender:null,

  options:null,

  init(){
    this.canvas = createCanvas(this.width,this.height);
    this.ctx = this.canvas.getContext('2d'); // alpha: false on this breaks firefox

    this.droplets = createCanvas(this.width*this.dropletsPixelDensity,this.height*this.dropletsPixelDensity);
    this.dropletsCtx = this.droplets.getContext('2d'); // alpha: false on this breaks firefox

    this.drops=[];
    this.dropsGfx=[];

    this.renderDropsGfx();

    this.update();
  },
  get deltaR(){
    return this.options.maxR-this.options.minR;
  },
  get area(){
    return (this.width*this.height)/this.scale;
  },
  get areaMultiplier(){
    return 1;//Math.sqrt(this.area/(1024*768));
  },
  drawDroplet(x,y,r){
    this.drawDrop(this.dropletsCtx,Object.assign(Object.create(Drop),{
      x:x*this.dropletsPixelDensity,
      y:y*this.dropletsPixelDensity,
      r:r*this.dropletsPixelDensity
    }));
  },

  renderDropsGfx(){
    let dropBuffer=createCanvas(dropSize,dropSize);
    let dropBufferCtx=dropBuffer.getContext('2d');
    this.dropsGfx=Array.apply(null,Array(255))
      .map((cur,i)=>{
        let drop=createCanvas(dropSize,dropSize);
        let dropCtx=drop.getContext('2d'); // alpha: false on this breaks everything

        dropBufferCtx.clearRect(0,0,dropSize,dropSize);

        // color
        dropBufferCtx.globalCompositeOperation="source-over";
        dropBufferCtx.drawImage(this.dropColor,0,0,dropSize,dropSize);

        // blue overlay, for depth
        dropBufferCtx.globalCompositeOperation="screen";
        dropBufferCtx.fillStyle="rgba(0,0,"+i+",1)";
        dropBufferCtx.fillRect(0,0,dropSize,dropSize);

        // alpha
        dropCtx.globalCompositeOperation="source-over";
        dropCtx.drawImage(this.dropAlpha,0,0,dropSize,dropSize);

        dropCtx.globalCompositeOperation="source-in";
        dropCtx.drawImage(dropBuffer,0,0,dropSize,dropSize);
        return drop;
    });

    // create circle that will be used as a brush to remove droplets
    this.clearDropletsGfx=createCanvas(128,128);
    let clearDropletsCtx=this.clearDropletsGfx.getContext("2d", {alpha: false});
    clearDropletsCtx.fillStyle="#000";
    clearDropletsCtx.beginPath();
    clearDropletsCtx.arc(64,64,64,0,Math.PI*2);
    clearDropletsCtx.fill();
  },
  drawDrop(ctx,drop){
    if(this.dropsGfx.length>0){
      let x=drop.x;
      let y=drop.y;
      let r=drop.r;
      let spreadX=drop.spreadX;
      let spreadY=drop.spreadY;

      let scaleX=1;
      let scaleY=1.5;

      let d=Math.max(0,Math.min(1,((r-this.options.minR)/(this.deltaR))*0.9));
      d*=1/(((drop.spreadX+drop.spreadY)*0.5)+1);

      ctx.globalAlpha=1;
      ctx.globalCompositeOperation="source-over";

      d=Math.floor(d*(this.dropsGfx.length-1));
      ctx.drawImage(
        this.dropsGfx[d],
        (x-(r*scaleX*(spreadX+1)))*this.scale,
        (y-(r*scaleY*(spreadY+1)))*this.scale,
        (r*2*scaleX*(spreadX+1))*this.scale,
        (r*2*scaleY*(spreadY+1))*this.scale
      );
    }
  },
  clearDroplets(x,y,r=30){
    let ctx=this.dropletsCtx;
    ctx.globalCompositeOperation="destination-out";
    ctx.drawImage(
      this.clearDropletsGfx,
      (x-r)*this.dropletsPixelDensity*this.scale,
      (y-r)*this.dropletsPixelDensity*this.scale,
      (r*2)*this.dropletsPixelDensity*this.scale,
      (r*2)*this.dropletsPixelDensity*this.scale*1.5
    )
  },
  clearCanvas(){
    this.ctx.clearRect(0,0,this.width,this.height);
  },
  createDrop(options){
    if(this.drops.length >= this.options.maxDrops*this.areaMultiplier) return null;

    return Object.assign(Object.create(Drop),options);
  },
  addDrop(drop){
    if(this.drops.length >= this.options.maxDrops*this.areaMultiplier || drop==null) return false;

    this.drops.push(drop);
    return true;
  },
  updateRain(timeScale){
    let rainDrops=[];
    if(this.options.raining){
      let limit=this.options.rainLimit*timeScale*this.areaMultiplier;
      let count=0;
      while(chance(this.options.rainChance*timeScale*this.areaMultiplier) && count<limit){
        count++;
        let r=random(this.options.minR,this.options.maxR,(n)=>{
          return Math.pow(n,3);
        });
        let rainDrop=this.createDrop({
          x:random(this.width/this.scale),
          y:random((this.height/this.scale)*this.options.spawnArea[0],(this.height/this.scale)*this.options.spawnArea[1]),
          r:r,
          momentum:1+((r-this.options.minR)*0.1)+random(2),
          spreadX:1.5,
          spreadY:1.5,
        });
        if(rainDrop!=null){
          rainDrops.push(rainDrop);
        }
      }
    }
    return rainDrops;
  },
  clearDrops(){
    this.drops.forEach((drop)=>{
      setTimeout(()=>{
        drop.shrink=0.1+(random(0.5));
      },random(1200))
    })
    this.clearTexture();
  },
  clearTexture(){
    this.textureCleaningIterations=50;
  },
  updateDroplets(timeScale){
    if(this.textureCleaningIterations>0){
      this.textureCleaningIterations-=1*timeScale;
      this.dropletsCtx.globalCompositeOperation="destination-out";
      this.dropletsCtx.fillStyle="rgba(0,0,0,"+(0.05*timeScale)+")";
      this.dropletsCtx.fillRect(0,0,
        this.width*this.dropletsPixelDensity,this.height*this.dropletsPixelDensity);
    }
    if(this.options.raining){
      this.dropletsCounter+=this.options.dropletsRate*timeScale*this.areaMultiplier;
      times(this.dropletsCounter,(i)=>{
        this.dropletsCounter--;
        this.drawDroplet(
          random(this.width/this.scale),
          random(this.height/this.scale),
          random(...this.options.dropletsSize,(n)=>{
            return n*n;
          })
        )
      });
    }
    this.ctx.drawImage(this.droplets,0,0,this.width,this.height);
  },
  updateDrops(timeScale){
    let newDrops=[];

    this.updateDroplets(timeScale);
    let rainDrops=this.updateRain(timeScale);
    newDrops=newDrops.concat(rainDrops);

    this.drops.sort((a,b)=>{
      let va=(a.y*(this.width/this.scale))+a.x;
      let vb=(b.y*(this.width/this.scale))+b.x;
      return va>vb?1:va==vb?0:-1;
    });

    this.drops.forEach(function(drop,i){
      if(!drop.killed){
        // update gravity
        // (chance of drops "creeping down")
        if(chance((drop.r-(this.options.minR*this.options.dropFallMultiplier)) * (0.1/this.deltaR) * timeScale)){
          drop.momentum += random((drop.r/this.options.maxR)*4);
        }
        // clean small drops
        if(this.options.autoShrink && drop.r<=this.options.minR && chance(0.05*timeScale)){
          drop.shrink+=0.01;
        }
        //update shrinkage
        drop.r -= drop.shrink*timeScale;
        if(drop.r<=0) drop.killed=true;

        // update trails
        if(this.options.raining){
          drop.lastSpawn+=drop.momentum*timeScale*this.options.trailRate;
          if(drop.lastSpawn>drop.nextSpawn){
            let trailDrop=this.createDrop({
              x:drop.x+(random(-drop.r,drop.r)*0.1),
              y:drop.y-(drop.r*0.01),
              r:drop.r*random(...this.options.trailScaleRange),
              spreadY:drop.momentum*0.1,
              parent:drop,
            });

            if(trailDrop!=null){
              newDrops.push(trailDrop);

              drop.r*=Math.pow(0.97,timeScale);
              drop.lastSpawn=0;
              drop.nextSpawn=random(this.options.minR,this.options.maxR)-(drop.momentum*2*this.options.trailRate)+(this.options.maxR-drop.r);
            }
          }
        }

        //normalize spread
        drop.spreadX*=Math.pow(0.4,timeScale);
        drop.spreadY*=Math.pow(0.7,timeScale);

        //update position
        let moved=drop.momentum>0;
        if(moved && !drop.killed){
          drop.y+=drop.momentum*this.options.globalTimeScale;
          drop.x+=drop.momentumX*this.options.globalTimeScale;
          if(drop.y>(this.height/this.scale)+drop.r){
            drop.killed=true;
          }
        }

        // collision
        let checkCollision=(moved || drop.isNew) && !drop.killed;
        drop.isNew=false;

        if(checkCollision){
          this.drops.slice(i+1,i+70).forEach((drop2)=>{
            //basic check
            if(
              drop != drop2 &&
              drop.r > drop2.r &&
              drop.parent != drop2 &&
              drop2.parent != drop &&
              !drop2.killed
            ){
              let dx=drop2.x-drop.x;
              let dy=drop2.y-drop.y;
              var d=Math.sqrt((dx*dx)+(dy*dy));
              //if it's within acceptable distance
              if(d<(drop.r+drop2.r)*(this.options.collisionRadius+(drop.momentum*this.options.collisionRadiusIncrease*timeScale))){
                let pi=Math.PI;
                let r1=drop.r;
                let r2=drop2.r;
                let a1=pi*(r1*r1);
                let a2=pi*(r2*r2);
                let targetR=Math.sqrt((a1+(a2*0.8))/pi);
                if(targetR>this.maxR){
                  targetR=this.maxR;
                }
                drop.r=targetR;
                drop.momentumX+=dx*0.1;
                drop.spreadX=0;
                drop.spreadY=0;
                drop2.killed=true;
                drop.momentum=Math.max(drop2.momentum,Math.min(40,drop.momentum+(targetR*this.options.collisionBoostMultiplier)+this.options.collisionBoost));
              }
            }
          });
        }

        //slowdown momentum
        drop.momentum-=Math.max(1,(this.options.minR*0.5)-drop.momentum)*0.1*timeScale;
        if(drop.momentum<0) drop.momentum=0;
        drop.momentumX*=Math.pow(0.7,timeScale);


        if(!drop.killed){
          newDrops.push(drop);
          if(moved && this.options.dropletsRate>0) this.clearDroplets(drop.x,drop.y,drop.r*this.options.dropletsCleaningRadiusMultiplier);
          this.drawDrop(this.ctx, drop);
        }

      }
    },this);

    this.drops = newDrops;
  },
  update(){
    if(this.destroyed){
      return;
    }
    this.clearCanvas();

    let now=Date.now();
    if(this.lastRender==null) this.lastRender=now;
    let deltaT=now-this.lastRender;
    let timeScale=deltaT/((1/60)*1000);
    if(timeScale>1.1) timeScale=1.1;
    timeScale*=this.options.globalTimeScale;
    this.lastRender=now;

    this.updateDrops(timeScale);

    this.raf = requestAnimationFrame(this.update.bind(this));
  },
  destroy(){
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
  }
}

exports.RainEngine = {
  Raindrops: Raindrops,
  RainRenderer: RainRenderer
}

})(window);
