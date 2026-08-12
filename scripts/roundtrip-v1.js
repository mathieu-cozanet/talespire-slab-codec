const pako = require('pako');

function hexToBytes(hex){ const b=[]; for(let c=0;c<hex.length;c+=2) b.push(parseInt(hex.substr(c,2),16)); return b; }
function nguidHexToBytes(g){ const b=hexToBytes(g.replace(/[-\s]/g,'')); return [b[3],b[2],b[1],b[0],b[5],b[4],b[7],b[6],b[8],b[9],b[10],b[11],b[12],b[13],b[14],b[15]]; }
function toHex(n){ return ('0'+(n&0xFF).toString(16)).slice(-2); }

function createSlab(layouts){
  const buffer=new ArrayBuffer(Math.pow(2,20)); const dv=new DataView(buffer); let p=0;
  dv.setUint32(0,3520002766,true); p+=4; dv.setUint16(p,1,true); p+=2; dv.setUint16(p,layouts.length,true); p+=2;
  layouts.forEach(l=>{ nguidHexToBytes(l.nguid).forEach(b=>{dv.setUint8(p,b,true);p+=1;}); dv.setUint16(p,l.assets.length,true);p+=2;p+=2; });
  let first=true,uMin=[0,0,0],uMax=[0,0,0];
  layouts.forEach(l=>l.assets.forEach(a=>{ const c=a.bounds.center,e=a.bounds.extents;
    dv.setFloat32(p,c.x,true);p+=4;dv.setFloat32(p,c.y,true);p+=4;dv.setFloat32(p,c.z,true);p+=4;
    dv.setFloat32(p,e.x,true);p+=4;dv.setFloat32(p,e.y,true);p+=4;dv.setFloat32(p,e.z,true);p+=4;
    dv.setUint8(p,a.rotation,true);p+=4;
    const mn=[c.x-e.x,c.y-e.y,c.z-e.z],mx=[c.x+e.x,c.y+e.y,c.z+e.z];
    if(first){first=false;uMin=mn.slice();uMax=mx.slice();}
    for(let i=0;i<3;i++){uMin[i]=Math.min(uMin[i],mn[i]);uMax[i]=Math.max(uMax[i],mx[i]);}
  }));
  const uC=[(uMin[0]+uMax[0])/2,(uMin[1]+uMax[1])/2,(uMin[2]+uMax[2])/2];
  const uE=[(uMax[0]-uMin[0])/2,(uMax[1]-uMin[1])/2,(uMax[2]-uMin[2])/2];
  uC.forEach(v=>{dv.setFloat32(p,v,true);p+=4;}); uE.forEach(v=>{dv.setFloat32(p,v,true);p+=4;}); p+=4;
  const gz=pako.gzip(new Uint8Array(buffer.slice(0,p)));
  let s=''; for(let i=0;i<gz.length;i++) s+=String.fromCharCode(gz[i]);
  return '```'+Buffer.from(s,'binary').toString('base64')+'```';
}

function decodeSlab(paste){
  paste=paste.replace(/[`\s]/g,'');
  const bin=new Uint8Array(Buffer.from(paste,'base64'));
  const data=pako.inflate(bin); const dv=new DataView(data.buffer); let p=0;
  const magic=dv.getUint32(p,true);p+=4; const version=dv.getUint16(p,true);p+=2; const numLayouts=dv.getUint16(p,true);p+=2;
  const layouts=[]; let total=0;
  for(let i=0;i<numLayouts;i++){
    const r=[]; for(let k=0;k<16;k++){r.push(dv.getUint8(p));p+=1;}
    const guid=toHex(r[3])+toHex(r[2])+toHex(r[1])+toHex(r[0])+'-'+toHex(r[5])+toHex(r[4])+'-'+toHex(r[7])+toHex(r[6])+'-'+toHex(r[8])+toHex(r[9])+'-'+toHex(r[10])+toHex(r[11])+toHex(r[12])+toHex(r[13])+toHex(r[14])+toHex(r[15]);
    const count=dv.getUint16(p,true);p+=2;p+=2; layouts.push({nguid:guid,count}); total+=count;
  }
  const assets=[];
  for(let i=0;i<total;i++){
    const cx=dv.getFloat32(p,true),cy=dv.getFloat32(p+4,true),cz=dv.getFloat32(p+8,true);p+=12;
    const ex=dv.getFloat32(p,true),ey=dv.getFloat32(p+4,true),ez=dv.getFloat32(p+8,true);p+=12;
    const rot=dv.getUint8(p);p+=4; assets.push({rot,cx,cy,cz,ex,ey,ez});
  }
  return {magic,version,numLayouts,total,layouts,assets};
}

// --- TEST 1: decode a known reference slab (2 Dead Trees) ---
const known='```H4sIAAAAAAAAAzv369xFRgZGhuATs99e3WfjsiV+ubBtKKMUEwMINNhjwyxgOQYHCB9GI8th1weSAQAdG0xwcAAAAA==```';
console.log('TEST 1 - decoding reference slab:');
try { console.log(JSON.stringify(decodeSlab(known),null,0)); } catch(e){ console.log('  ERROR:',e.message); }

// --- TEST 2: round-trip through our own encoder ---
const layouts=[{nguid:'ed9bc853-bed5-443c-b45f-a7133d55011a', assets:[
  {rotation:4,bounds:{center:{x:1,y:1,z:1},extents:{x:1,y:1,z:1}}},
  {rotation:4,bounds:{center:{x:2,y:1,z:2},extents:{x:1,y:1,z:1}}}
]}];
const slab=createSlab(layouts);
console.log('\nTEST 2 - encoded slab:'); console.log(' ',slab);
const back=decodeSlab(slab);
console.log('  decoded back:', JSON.stringify(back.layouts), 'assets=',back.total);
const ok = back.layouts[0].nguid==='ed9bc853-bed5-443c-b45f-a7133d55011a' && back.total===2
  && back.assets[1].cx===2 && back.assets[1].cz===2 && back.assets[0].rot===4;
console.log('  ROUND-TRIP', ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
