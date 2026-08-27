const SCOUT_SCHEMA={type:"object",additionalProperties:false,properties:{
destination:{type:"string"},theme:{type:"string"},intro:{type:"string"},
stories:{type:"array",minItems:5,maxItems:5,items:{type:"object",additionalProperties:false,properties:{
title:{type:"string"},type:{type:"string",enum:["FACT","HISTORY","TRUE_STORY","LEGEND","FOLKLORE","MIXED","DISPUTED"]},
hook:{type:"string"},location:{type:"string"}
},required:["title","type","hook","location"]}}
},required:["destination","theme","intro","stories"]};

const RESEARCH_SCHEMA={type:"object",additionalProperties:false,properties:{summary:{type:"string"},findings:{type:"array",minItems:3,maxItems:7,items:{type:"string"}},questions:{type:"array",minItems:1,maxItems:5,items:{type:"string"}}},required:["summary","findings","questions"]};
const VERIFY_SCHEMA={type:"object",additionalProperties:false,properties:{verdict:{type:"string",enum:["VERIFIED","MIXED","LEGEND","NEEDS CAUTION"]},confidence:{type:"integer",minimum:0,maximum:100},summary:{type:"string"},verified:{type:"array",minItems:1,maxItems:7,items:{type:"string"}},cautions:{type:"array",minItems:1,maxItems:5,items:{type:"string"}}},required:["verdict","confidence","summary","verified","cautions"]};
const WRITE_SCHEMA={type:"object",additionalProperties:false,properties:{headline:{type:"string"},opening:{type:"string"},paragraphs:{type:"array",minItems:3,maxItems:7,items:{type:"string"}},closing:{type:"string"}},required:["headline","opening","paragraphs","closing"]};
const VISUAL_SCHEMA={type:"object",additionalProperties:false,properties:{visual_direction:{type:"string"},shots:{type:"array",minItems:3,maxItems:6,items:{type:"object",additionalProperties:false,properties:{shot:{type:"string"},direction:{type:"string"}},required:["shot","direction"]}},captions:{type:"array",minItems:2,maxItems:4,items:{type:"string"}}},required:["visual_direction","shots","captions"]};

const VIDEO_SCHEMA={type:"object",additionalProperties:false,properties:{format:{type:"string"},total_duration:{type:"string"},mood:{type:"string"},voiceover:{type:"string"},music_direction:{type:"string"},scenes:{type:"array",minItems:3,maxItems:6,items:{type:"object",additionalProperties:false,properties:{scene:{type:"string"},duration:{type:"string"},visual:{type:"string"},camera:{type:"string"},video_prompt:{type:"string"},on_screen_text:{type:"string"}},required:["scene","duration","visual","camera","video_prompt","on_screen_text"]}}},required:["format","total_duration","mood","voiceover","music_direction","scenes"]};
const ILLUSTRATE_SCHEMA={type:"object",additionalProperties:false,properties:{art_direction:{type:"string"},image_prompt:{type:"string"},must_include:{type:"array",minItems:2,maxItems:6,items:{type:"string"}},avoid:{type:"array",minItems:1,maxItems:5,items:{type:"string"}}},required:["art_direction","image_prompt","must_include","avoid"]};
const MAP_SCHEMA={type:"object",additionalProperties:false,properties:{map_summary:{type:"string"},stops:{type:"array",minItems:4,maxItems:4,items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},location:{type:"string"},reason:{type:"string"}},required:["name","location","reason"]}},route_note:{type:"string"}},required:["map_summary","stops","route_note"]};
const CONTENT_SOCIAL_SCHEMA={type:"object",additionalProperties:false,properties:{title:{type:"string"},short_caption:{type:"string"},long_caption:{type:"string"},hashtags:{type:"array",minItems:5,maxItems:12,items:{type:"string"}}},required:["title","short_caption","long_caption","hashtags"]};
const CONTENT_REEL_SCHEMA={type:"object",additionalProperties:false,properties:{reel_script:{type:"array",minItems:3,maxItems:6,items:{type:"string"}}},required:["reel_script"]};

function outputText(d){if(typeof d?.output_text==="string")return d.output_text;for(const o of d?.output||[])for(const c of o?.content||[])if(c?.type==="output_text")return c.text||"";return""}
async function ask(prompt,schema,name,{fast=false,timeout=45000}={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeout);
 // Discovery must feel instant. Use a small, low-latency model by default;
 // OPENAI_FAST_MODEL can still override this from Vercel if desired.
 const model=fast?(process.env.OPENAI_FAST_MODEL||"gpt-4.1-mini"):(process.env.OPENAI_MODEL||"gpt-5.6");
 let r;
 try{
  r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},signal:controller.signal,
  body:JSON.stringify({model,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],text:{format:{type:"json_schema",name,strict:true,schema}}})});
 }catch(e){
  if(e?.name==="AbortError")throw new Error(`OpenAI timed out while running ${name}`);
  throw e;
 }finally{clearTimeout(timer)}
 const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||`OpenAI request failed (${r.status})`);
 try{return JSON.parse(outputText(d))}catch{throw new Error("AI returned invalid structured data")}
}
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{
  const {place,theme="",action="SCOUT",story=null,context={}}=req.body||{};
  if(!place?.trim())return res.status(400).json({error:"Destination is required"});
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"OPENAI_API_KEY is not configured"});
  if(action==="SCOUT"){
   const p=`Travel Story Engine lightweight discovery. Destination: ${place.trim()}. Theme: ${theme||"Auto Discover"}.
Return exactly 5 concise story-card IDEAS in Thai only. Do NOT research, verify, explain sources, write the full story, or generate photo ideas yet. Those jobs happen only after the user selects one card.
Each card needs ONLY: title, type, one-sentence hook, and a real searchable location.
Prioritize variety: famous true event/history, notable person or episode, local legend/folklore when credible, origin of iconic food/culture/symbol, and a surprising hidden story. Do not force a legend if none is credible.
Type must be FACT, HISTORY, TRUE_STORY, LEGEND, FOLKLORE, MIXED, or DISPUTED. Never present folklore as fact. Keep proper nouns in common local/English spelling. Be concise. No markdown.`;
   return res.status(200).json(await ask(p,SCOUT_SCHEMA,"travel_story_v195_scout",{fast:true,timeout:28000}));
  }
  if(!story)return res.status(400).json({error:"Select a story first"});
  const base=`Destination: ${place}. Selected story: ${JSON.stringify(story)}. Work only on this selected story. Write in Thai. Preserve proper nouns. Never turn uncertain claims into facts.`;
  if(action==="RESEARCH")return res.status(200).json(await ask(`${base} Produce deeper research notes: summary, 3-7 useful findings, and questions that still require verification. No markdown.`,RESEARCH_SCHEMA,"travel_research_final"));
  if(action==="VERIFY")return res.status(200).json(await ask(`${base} Research context: ${JSON.stringify(context.research||{})}. Critically verify internal claims using the supplied source/context signals. Separate established facts, mixed claims and legend. Do not claim live web browsing. No markdown.`,VERIFY_SCHEMA,"travel_verify_final"));
  if(action==="WRITE")return res.status(200).json(await ask(`${base} Research: ${JSON.stringify(context.research||{})}. Verification: ${JSON.stringify(context.verify||{})}. Write an engaging polished travel story in Thai with headline, opening, 3-7 paragraphs and closing. Keep all caveats from verification. No markdown.`,WRITE_SCHEMA,"travel_write_final"));
  if(action==="VISUAL")return res.status(200).json(await ask(`${base} Create a practical photography/video visual direction with 3-6 shots and 2-4 caption ideas. Match the emotional tone to the story type: legends/mystery should feel atmospheric and mysterious but not sensational horror; tragedy should be restrained; food/culture warm and lively; history textured and reflective. Do not invent access facts. No markdown.`,VISUAL_SCHEMA,"travel_visual_v196"));
  if(action==="VIDEO")return res.status(200).json(await ask(`${base} Verification: ${JSON.stringify(context.verify||{})}. Writing: ${JSON.stringify(context.write||{})}. Visual: ${JSON.stringify(context.visual||{})}. Create an AI VIDEO PACK for a 30-second vertical 9:16 Reel/Short. Give 3-6 scenes with duration, visual action, camera movement, a copy-ready English video-generation prompt for each scene, concise Thai on-screen text, one continuous Thai voice-over, and music direction. Preserve factual caveats. For LEGEND/FOLKLORE/MIXED/DISPUTED, visually signal folklore through atmosphere/symbolic silhouettes and never make supernatural events look like documentary proof. No gore. No markdown.`,VIDEO_SCHEMA,"travel_video_v196"));
    if(action==="MAP")return res.status(200).json(await ask(`${base} Create a practical walking/sightseeing route with exactly 4 distinct real stops, numbered in natural travel order. Each stop must have a Google-Maps-searchable place/location string and a short story reason. Use only real places relevant to the selected story and destination. Never invent coordinates or addresses. No markdown.`,MAP_SCHEMA,"travel_map_final"));
  // v1.8: Content Pack is intentionally split into two smaller jobs.
  // The browser runs these in parallel, avoiding one oversized generation that can hit serverless time limits.
  const contentBase=`${base} Verified summary: ${JSON.stringify(context.verify?.summary||"")}. Written headline: ${JSON.stringify(context.write?.headline||story.title||"")}. Written opening: ${JSON.stringify(context.write?.opening||story.hook||"")}. Preserve factual caveats. Be concise. No markdown.`;
  if(action==="CONTENT_SOCIAL")return res.status(200).json(await ask(`${contentBase} Produce ready-to-publish Thai social content: title, short caption, long caption and 5-12 useful hashtags.`,CONTENT_SOCIAL_SCHEMA,"travel_content_social_v18"));
  if(action==="CONTENT_REEL")return res.status(200).json(await ask(`${contentBase} Produce only a practical 3-6 beat Thai Reel / short-video script.`,CONTENT_REEL_SCHEMA,"travel_content_reel_v18"));
  // Backward-compatible endpoint for older cached clients.
  if(action==="CONTENT") {
    const [social,reel]=await Promise.all([
      ask(`${contentBase} Produce ready-to-publish Thai social content: title, short caption, long caption and 5-12 useful hashtags.`,CONTENT_SOCIAL_SCHEMA,"travel_content_social_v18"),
      ask(`${contentBase} Produce only a practical 3-6 beat Thai Reel / short-video script.`,CONTENT_REEL_SCHEMA,"travel_content_reel_v18")
    ]);
    return res.status(200).json({...social,...reel});
  }
  return res.status(400).json({error:"Unknown workflow action"});
 }catch(e){console.error(e);return res.status(500).json({error:e?.message||"Travel Story Engine failed"})}
}
