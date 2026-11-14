/** Mind's Eye Atlas — privacy-first scoring API for Cloudflare Workers + D1.
 * Raw answers and timers are processed in memory and never stored in D1.
 */
const CORRECT=[2,0,2,0,0,2,1,0,0,0,1,0,1,2,0];
const LEVEL=[1,2,3,4,5,1,2,3,4,5,1,2,3,4,5];
const TARGET=[18,30,45,75,110,15,18,25,40,55,18,25,35,50,75];
const STRATEGIES=new Set(['words or logical rules','nonvisual spatial awareness','actual mental pictures','a mixture of strategies','unsure']);
const STATUS={version:2,online:true,storage:'Cloudflare D1',privacy:'Only consented summaries are retained; raw answers and timing arrays are not stored.'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});}
const bad=(error,status=400)=>json({ok:false,error},status);
const valid=(a,n,max)=>Array.isArray(a)&&a.length===n&&a.every(v=>Number.isInteger(v)&&v>=0&&v<=max);
const categoryFor=s=>s===0?0:s<=23?1:s<=38?2:s<=44?3:4;
function compute(d){
  if(!d||d.version!==2||d.consent!==true)throw Error('Consent and assessment version 2 are required.');
  if(!valid(d.ratings,12,4)||!valid(d.details,12,4)||!valid(d.answers,15,3)||!valid(d.timeMs,27,900000))throw Error('Answers or background timing data are incomplete or invalid.');
  if(typeof d.id!=='string'||!/^[A-Za-z0-9-]{20,90}$/.test(d.id))throw Error('Invalid submission ID.');
  if(typeof d.deletionToken!=='string'||!/^[a-f0-9]{64}$/.test(d.deletionToken))throw Error('Deletion recovery token is missing.');
  if(!STRATEGIES.has(d.strategy))throw Error('Choose a valid processing strategy.');
  if(typeof d.publicEntry!=='boolean')throw Error('Specify whether an individual result should be public.');
  if(d.name!==null&&typeof d.name!=='string')throw Error('Invalid display name.');
  if(d.name&&d.name.length>30)throw Error('Display name is too long.');
  const name=d.publicEntry?(typeof d.name==='string'?d.name.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,30)||null:null):null;
  const imagery_score=d.ratings.reduce((a,b)=>a+b,0),detail_score=d.details.reduce((a,b)=>a+b,0);
  let total_correct=0,difficulty_score=0,timed_score=0;const domain=[0,0,0];
  for(let i=0;i<15;i++){
    if(d.answers[i]!==CORRECT[i])continue;
    total_correct++;domain[Math.floor(i/5)]++;difficulty_score+=LEVEL[i];
    const sec=d.timeMs[12+i]/1000,ref=TARGET[i];
    timed_score+=LEVEL[i]*(sec<=ref?1:sec<=ref*2?0.85:0.7);
  }
  return {id:d.id,assessment_version:2,public_entry:Number(d.publicEntry),display_name:name,imagery_score,detail_score,category:categoryFor(imagery_score),total_correct,difficulty_score,timed_score:Number(timed_score.toFixed(1)),spatial:domain[0],memory:domain[1],reasoning:domain[2],strategy:d.strategy};
}
async function sha256(token){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function stats(db){
  const t=await db.prepare('SELECT COUNT(*) AS total,COALESCE(AVG(spatial),0) AS spatial,COALESCE(AVG(memory),0) AS memory,COALESCE(AVG(reasoning),0) AS reasoning,COALESCE(AVG(imagery_score),0) AS imageryAverage FROM responses WHERE assessment_version=2').first();
  const buckets=[0,0,0,0,0];
  const q=await db.prepare('SELECT category,COUNT(*) AS n FROM responses WHERE assessment_version=2 GROUP BY category').all();
  for(const r of q.results||[])if(Number.isInteger(r.category)&&r.category>=0&&r.category<5)buckets[r.category]=r.n;
  return {total:t?.total||0,buckets,domains:{spatial:t?.spatial||0,memory:t?.memory||0,reasoning:t?.reasoning||0},imageryAverage:t?.imageryAverage||0};
}
async function entries(db,url){
  const raw=url.searchParams.get('cursor');
  if(raw!==null&&!/^[1-9]\d{0,14}$/.test(raw))return bad('Invalid cursor.');
  const cursor=raw?Number(raw):Number.MAX_SAFE_INTEGER;
  const q=await db.prepare('SELECT seq,created_at,display_name AS name,imagery_score,detail_score,category,total_correct,timed_score,spatial,memory,reasoning,strategy FROM responses WHERE assessment_version=2 AND public_entry=1 AND seq<? ORDER BY seq DESC LIMIT 26').bind(cursor).all();
  const results=q.results||[],page=results.slice(0,25);
  return json({entries:page.map(({seq,...entry})=>entry),nextCursor:results.length>25?String(page[page.length-1].seq):null});
}
async function submit(db,request){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return bad('JSON required.',415);
  if(Number(request.headers.get('content-length')||0)>12000)return bad('Submission too large.',413);
  const raw=await request.text();if(raw.length>12000)return bad('Submission too large.',413);
  let data;try{data=JSON.parse(raw)}catch{return bad('Invalid JSON.');}
  let s;try{s=compute(data)}catch(e){return bad(e.message);}
  const deletion_hash=await sha256(data.deletionToken);
  try{
    await db.prepare('INSERT INTO responses (id,created_at,assessment_version,public_entry,display_name,imagery_score,detail_score,category,total_correct,difficulty_score,timed_score,spatial,memory,reasoning,strategy,deletion_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(s.id,new Date().toISOString(),s.assessment_version,s.public_entry,s.display_name,s.imagery_score,s.detail_score,s.category,s.total_correct,s.difficulty_score,s.timed_score,s.spatial,s.memory,s.reasoning,s.strategy,deletion_hash).run();
    return json({ok:true,category:s.category,imagery_score:s.imagery_score,total_correct:s.total_correct});
  }catch(e){
    const old=await db.prepare('SELECT deletion_hash FROM responses WHERE id=?').bind(s.id).first();
    if(old?.deletion_hash===deletion_hash)return json({ok:true,alreadySaved:true});
    if(old)return bad('This submission ID is already in use.',409);
    return bad('Database is not ready to save results. Please retry later.',503);
  }
}
async function remove(db,req){
  let d;try{d=await req.json()}catch{return bad('Invalid deletion request.');}
  if(typeof d?.id!=='string'||typeof d?.deletionToken!=='string'||!/^[a-f0-9]{64}$/.test(d.deletionToken))return bad('Invalid recovery code.');
  const hashed=await sha256(d.deletionToken);
  const r=await db.prepare('DELETE FROM responses WHERE id=? AND deletion_hash=?').bind(d.id,hashed).run();
  if(!r.meta?.changes)return bad('No matching saved result was found.',404);
  return json({ok:true,deleted:true});
}
function secure(resp){
  const h=new Headers(resp.headers);
  h.set('x-content-type-options','nosniff');
  h.set('referrer-policy','strict-origin-when-cross-origin');
  h.set('permissions-policy','camera=(), microphone=(), geolocation=()');
  h.set('x-frame-options','DENY');
  h.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return new Response(resp.body,{status:resp.status,statusText:resp.statusText,headers:h});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path.startsWith('/api/')){
   if(!env.DB)return bad('Database binding missing.',503);
   try{
    if(request.method==='GET'&&path==='/api/status'){await env.DB.prepare('SELECT COUNT(*) AS c FROM responses').first();return json({...STATUS,url:url.origin});}
    if(request.method==='GET'&&path==='/api/stats')return json(await stats(env.DB));
    if(request.method==='GET'&&path==='/api/entries')return entries(env.DB,url);
    if(request.method==='POST'&&path==='/api/submit')return submit(env.DB,request);
    if(request.method==='POST'&&path==='/api/delete')return remove(env.DB,request);
    return bad('Endpoint not found.',404);
   }catch{return bad('Service temporarily unavailable.',503);}
  }
  return secure(await env.ASSETS.fetch(request));
 }
};
export {compute};
