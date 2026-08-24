const STORY_SCHEMA={type:"object",additionalProperties:false,properties:{
destination:{type:"string"},theme:{type:"string"},intro:{type:"string"},
stories:{type:"array",minItems:5,maxItems:5,items:{type:"object",additionalProperties:false,properties:{
title:{type:"string"},type:{type:"string",enum:["FACT","MIXED","LEGEND"]},
confidence:{type:"integer",minimum:0,maximum:100},hook:{type:"string"},story:{type:"string"},
why_it_matters:{type:"string"},location:{type:"string"},photo_idea:{type:"string"},
research_note:{type:"string"},verification:{type:"string"},
sources:{type:"array",minItems:1,maxItems:3,items:{type:"object",additionalProperties:false,
properties:{name:{type:"string"},url:{type:"string"}},required:["name","url"]}}
},required:["title","type","confidence","hook","story","why_it_matters","location","photo_idea","research_note","verification","sources"]}}
},required:["destination","theme","intro","stories"]};

function outText(d){if(typeof d?.output_text==="string")return d.output_text;for(const o of d?.output||[])for(const c of o?.content||[])if(c?.type==="output_text")return c.text||"";return""}
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{
  const {place,theme="",action="SCOUT"}=req.body||{};
  if(!place?.trim())return res.status(400).json({error:"Destination is required"});
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"OPENAI_API_KEY is not configured"});
  const prompt=`Travel Story Engine v1.3. Destination: ${place.trim()}. Theme: ${theme||"Auto Discover"}. Action: ${action}.
Return exactly five distinct traveller-useful stories in Thai. Keep proper place names in their common local/English spelling.
For every card classify FACT, MIXED, or LEGEND; give confidence 0-100; concise hook; accurate story; why it matters; specific location; photo idea.
Add a research note explaining what should be checked and a verification sentence stating what is established, disputed, or legendary.
Provide 1-3 useful public source URLs per card, preferably official tourism, museum, government, UNESCO, university, encyclopedia, or established cultural institution pages.
Do not invent URLs. If exact deep-link certainty is low, use a known authoritative site's root URL. Never present folklore as established fact. No markdown.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{
   Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
   body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5.6",input:[{role:"user",content:[{type:"input_text",text:prompt}]}],
   text:{format:{type:"json_schema",name:"travel_story_v13",strict:true,schema:STORY_SCHEMA}}})});
  const d=await r.json(); if(!r.ok)return res.status(r.status).json({error:d?.error?.message||"OpenAI request failed"});
  let x;try{x=JSON.parse(outText(d))}catch{return res.status(502).json({error:"AI returned invalid structured data"})}
  if(!Array.isArray(x.stories)||x.stories.length!==5)return res.status(502).json({error:"AI did not return exactly 5 stories"});
  return res.status(200).json(x);
 }catch(e){console.error(e);return res.status(500).json({error:e?.message||"Travel Story Engine failed"})}
}
