// This is part of Hakuu, a web site, and is licensed under AGPLv3.
// Copyright (C) 2018-2021 Min-Zhong Lu

'use strict';

(function (exports) {

exports.rainEngine = function rainEngine (messagePort) {

messagePort ??= globalThis;

// Start code adapted from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/ ->

// Copyright © 2017 Codrops
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

let cachedProgram;
let cachedDropsGfx;
let cachedClearDropletGfx;

function createCanvas(width,height){
  if (globalThis.OffscreenCanvas) {
    return new OffscreenCanvas(width, height);
  } else {
    let canvas=document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;  
  }
}

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
    if (cachedProgram) return cachedProgram;
    let program=WebGL.createProgram(this.gl,vert,frag);
    cachedProgram = program;
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
  },
  resize(width,height){
    this.width=width;
    this.height=height;
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
function RainRenderer(canvas,canvasLiquid/*, image*/,options={}){

  this.canvas=canvas;
  this.canvasLiquid=canvasLiquid;
  /* this.image=image; */
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

    this.glUniformSize();
    gl.createUniform("1f","minRefraction",this.options.minRefraction);
    gl.createUniform("1f","refractionDelta",this.options.maxRefraction-this.options.minRefraction);
    gl.createUniform("1f","brightness",this.options.brightness);
    gl.createUniform("1f","alphaMultiply",this.options.alphaMultiply);
    gl.createUniform("1f","alphaSubtract",this.options.alphaSubtract);


    // converted first param from null to avoid errors. not sure why this works anyway
    gl.createTexture(createCanvas(0,0),0);

    this.draw();
  },
  updateImage(image) {
    this.textures=[
      {name:'textureFg', img:image}
    ];

    this.textures.forEach((texture,i)=>{
      this.gl.createTexture(texture.img,i+1);
      this.gl.createUniform("1i",texture.name,i+1);
    });
  },
  draw(){
    if(this.destroyed){
      return;
    }

    try{
      this.gl.useProgram(this.programWater);
      this.updateTexture();
      this.gl.draw();
    }finally{
      this.raf = requestAnimationFrame(this.draw.bind(this));
    }
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
  },
  resize(width,height){
    this.width=width;
    this.height=height;
    this.gl.resize(width,height);
    this.glUniformSize();
  },
  glUniformSize(){
    this.gl.createUniform("2f","resolution",this.width,this.height);
    this.gl.createUniform("1f","textureRatio",this.width/this.height);
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

function Raindrops(width,height,scale,dropAlpha,dropColor,options){
  this.width=width;
  this.height=height;
  this.scale=scale;

  this.options=Object.assign({},defaultOptions,options);

  this.dropAlpha=dropAlpha;
  this.dropColor=dropColor;

  this.init();
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
    if (cachedDropsGfx) {
      this.dropsGfx = cachedDropsGfx;
    } else {
      let dropBuffer=createCanvas(dropSize,dropSize);
      let dropBufferCtx=dropBuffer.getContext('2d');
      this.dropsGfx=cachedDropsGfx=Array.apply(null,Array(255))
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
    }

    if (cachedClearDropletGfx) {
      this.clearDropletsGfx = cachedClearDropletGfx;
    } else {
      // create circle that will be used as a brush to remove droplets
      this.clearDropletsGfx=cachedClearDropletGfx=createCanvas(128,128);
      let clearDropletsCtx=this.clearDropletsGfx.getContext("2d", {alpha: false});
      clearDropletsCtx.fillStyle="#000";
      clearDropletsCtx.beginPath();
      clearDropletsCtx.arc(64,64,64,0,Math.PI*2);
      clearDropletsCtx.fill();
    }
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
    try{
      this.clearCanvas();

      let now=performance.now();
      if(this.lastRender==null) this.lastRender=now;
      let deltaT=now-this.lastRender;
      let timeScale=deltaT/((1/60)*1000);
      if(timeScale>1.1) timeScale=1.1;
      timeScale*=this.options.globalTimeScale;
      this.lastRender=now;

      this.updateDrops(timeScale);
    }finally{
      this.raf = requestAnimationFrame(this.update.bind(this));
    }
  },
  destroy(){
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
  },
  resize(width,height,scale){
    this.width=width;
    this.height=height;
    this.scale=scale;
    this.canvas.width=this.width;
    this.canvas.height=this.height;
    this.droplets.width=this.width*this.dropletsPixelDensity;
    this.droplets.height=this.height*this.dropletsPixelDensity;
  }
}

// <- End code adapted from http://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/
// Regular Hakuu AGPLv3 licensing resumes henceforth.

let targetCanvas;
let rainDropsConfig;
let blankImageData;

let currentImageBitmap;
let dropAlphaImage;
let dropColorImage;

let rainDrops;
let renderer;

messagePort.addEventListener('message', ({ data: { type, payload } }) => {
  (MESSAGE_HANDLERS.get(type) ?? function () {})(payload);
});

const onInit = function (env) {
  targetCanvas = env.targetCanvas;
  rainDropsConfig = env.rainDropsConfig;

  const backgroundColor = env.backgroundColor
    .slice('rgb('.length, env.backgroundColor.length - 1)
    .split(',')
    .map((str) => str.trim())
    .map((str) => parseInt(str));
  blankImageData = new ImageData(
    new Uint8ClampedArray([...backgroundColor, 255]),
    1,
    1
  );

  const canvasCtx =
    targetCanvas.getContext('webgl') ??
    targetCanvas.getContext('experimental-webgl');
  canvasCtx.clearColor(0, 0, 0, 0);
  canvasCtx.viewport(
    0,
    0,
    canvasCtx.drawingBufferWidth,
    canvasCtx.drawingBufferHeight
  );
  canvasCtx.clear(canvasCtx.COLOR_BUFFER_BIT);
};

const onStart = function ({ width, height, scale, raining, rendererConfig }) {
  rainDrops = new Raindrops(
    width,
    height,
    scale,
    dropAlphaImage,
    dropColorImage,
    {
      raining,
      ...rainDropsConfig,
    }
  );

  renderer = new RainRenderer(targetCanvas, rainDrops.canvas, rendererConfig);

  onContentUpdate(currentImageBitmap ?? blankImageData);

  messagePort.postMessage({ type: 'started' });
};

const onLoadDropImages = function ({
  dropAlphaImageBitmap,
  dropColorImageBitmap,
}) {
  dropAlphaImage = dropAlphaImageBitmap;
  dropColorImage = dropColorImageBitmap;
};

const onDestroy = function () {
  rainDrops?.destroy();
  renderer?.destroy();

  rainDrops = undefined;
  renderer = undefined;
};

const onContentUpdate = function (imageBitmap) {
  currentImageBitmap = imageBitmap;
  renderer?.updateImage(imageBitmap);
  renderer?.updateTextures();
};

const onResize = function ({ width, height, scale }) {
  targetCanvas.width = width;
  targetCanvas.height = height;
  WebGL.getContext(targetCanvas);
  renderer?.resize(width, height);
  rainDrops?.resize(width, height, scale);
};

const MESSAGE_HANDLERS = new Map([
  ['init', onInit],
  ['start', onStart],
  ['loadDropImages', onLoadDropImages],
  ['destroy', onDestroy],
  ['contentupdate', onContentUpdate],
  ['resize', onResize],
]);

};
})(window);