export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const {place="",story=null,context={}}=req.body||{};
    if(!story)return res.status(400).json({error:"Select a story first"});
    if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"OPENAI_API_KEY is not configured"});
    const prompt=`Create a polished landscape editorial travel illustration (16:9) for a story about ${place}.\nTitle: ${story.title}\nStory: ${story.story}\nLocation: ${story.location}\nVerified context: ${JSON.stringify(context.verify||{})}\nVisual context: ${JSON.stringify(context.visual||{})}\nHistorically and architecturally grounded, atmospheric, sophisticated travel-magazine illustration. Respect the correct era, architecture, clothing, streetscape and cultural details. Clearly distinguish legend or uncertain material from documentary fact. No captions, labels, logos, UI, watermarks or large text inside the image.`;
    const r=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-2",prompt,size:"1536x1024",quality:"medium",output_format:"webp"})});
    const d=await r.json();
    if(!r.ok)throw new Error(d?.error?.message||"Image generation failed");
    const item=d?.data?.[0]||{};
    const image=item.b64_json?`data:image/webp;base64,${item.b64_json}`:item.url;
    if(!image)throw new Error("Image generation returned no image");
    return res.status(200).json({image,prompt,revised_prompt:item.revised_prompt||""});
  }catch(e){console.error(e);return res.status(500).json({error:e?.message||"Illustration failed"})}
}
