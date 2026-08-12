const fs=require("fs"), pako=require("pako");

function be(bytes){ let n=0n; for(const b of bytes) n=(n<<8n)|BigInt(b); return n; }
function hex(n,len){ return n.toString(16).toUpperCase().padStart(len,'0'); }

function decodeV2(code){
  code=code.replace(/[`\s]/g,'');
  const data=pako.inflate(new Uint8Array(Buffer.from(code,'base64')));
  const dv=new DataView(data.buffer); let p=0;
  // header
  const m0=dv.getUint8(0),m1=dv.getUint8(1),m2=dv.getUint8(2),m3=dv.getUint8(3);
  const version=dv.getUint8(4); p=6;
  const uniqueCount=dv.getUint32(p,true); p+=4;
  // asset list
  const assets=[];
  for(let i=0;i<uniqueCount;i++){
    const p0=dv.getUint32(p,true); // 4 LE
    const p1=dv.getUint16(p+4,true); // 2 LE
    const p2=dv.getUint16(p+6,true); // 2 LE
    const b=[]; for(let k=8;k<16;k++) b.push(dv.getUint8(p+k));
    const p3=be(b.slice(0,2));   // 2 BE
    const p4=be(b.slice(2,8));   // 6 BE
    const uuid=`${hex(p0,8)}-${hex(p1,4)}-${hex(p2,4)}-${hex(Number(p3),4)}-${hex(Number(p4),12)}`.toLowerCase();
    const count=dv.getUint32(p+16,true);
    assets.push({uuid,count}); p+=20;
  }
  // positions
  const total=assets.reduce((s,a)=>s+a.count,0);
  const positions=[];
  for(let i=0;i<total;i++){
    const blob=dv.getBigUint64(p,true); p+=8;
    const x=Number(blob & 0xFFFFn);
    const z=Number((blob>>18n)&0xFFFFn);
    const y=Number((blob>>36n)&0xFFFFn);
    const rot=Number(blob>>54n);
    positions.push({x,y,z,rot});
  }
  return {magic:[m0,m1,m2,m3].map(x=>x.toString(16)).join(' '),version,uniqueCount,total,assets,positions};
}

const file = process.argv[2] || "slab_code.txt";
if (!fs.existsSync(file)) {
  console.error("No slab file found at: " + file);
  console.error("");
  console.error("Copy a slab in TaleSpire (Ctrl+C), paste it into a text file,");
  console.error("then run:  node scripts/decode-v2.js <file>");
  process.exit(1);
}
const code=fs.readFileSync(file,"utf8").trim();
const r=decodeV2(code);
console.log("magic:",r.magic," version:",r.version," unique assets:",r.uniqueCount," total instances:",r.total);
console.log("\n--- first 8 assets ---");
r.assets.slice(0,8).forEach(a=>console.log("  "+a.uuid+"  x"+a.count));
console.log("\n--- first 6 positions (units of 1/100 tile) ---");
r.positions.slice(0,6).forEach(q=>console.log("  x:"+q.x+" y:"+q.y+" z:"+q.z+" rot:"+q.rot+" ("+q.rot*15+" deg)"));
// sanity check: coordinate bounds
const xs=r.positions.map(q=>q.x), ys=r.positions.map(q=>q.y), zs=r.positions.map(q=>q.z);
console.log("\nbounds  x:["+Math.min(...xs)+","+Math.max(...xs)+"] y:["+Math.min(...ys)+","+Math.max(...ys)+"] z:["+Math.min(...zs)+","+Math.max(...zs)+"]");
const rots=new Set(r.positions.map(q=>q.rot));
console.log("rotations present:",[...rots].sort((a,b)=>a-b).join(','));
