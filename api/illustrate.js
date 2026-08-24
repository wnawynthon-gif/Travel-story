export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const {place="",story=null,context={}}=req.body||{};
    if(!story)return res.status(400).json({error:"Select a story first"});
    if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"OPENAI_API_KEY is not configured"});
    const style=`TRAVEL STORY SIGNATURE ILLUSTRATION STYLE (mandatory): hand-painted watercolor + coloured-pencil travel-journal illustration on warm ivory/cream textured paper. Fine loose ink/pencil outlines, soft watercolor washes, gentle pastel palette with selective warm coral, sky blue, sage green and ochre accents. Charming editorial travel-guide / postcard feeling, friendly and inviting rather than cinematic or photorealistic. Landmarks, architecture, local crafts, food and cultural objects must remain recognizable and geographically accurate. Human figures should be naturally stylized hand-drawn characters with warm expressions and believable proportions. Compose the scene as an elegant illustrated travel story: one strong hero scene with small supporting visual details where useful, layered depth, airy negative space and handcrafted imperfections. Avoid glossy 3D rendering, hyperreal photography, dramatic movie lighting, dark fantasy, heavy oil-paint texture, anime, vector-flat corporate art, and generic stock-art aesthetics.`;
    const prompt=`Create a landscape editorial travel illustration (16:9) for a story about ${place}.\n\n${style}\n\nTitle: ${story.title}\nStory: ${story.story}\nLocation: ${story.location}\nVerified context: ${JSON.stringify(context.verify||{})}\nVisual context: ${JSON.stringify(context.visual||{})}\n\nCONTENT ACCURACY: Respect the correct era, architecture, clothing, streetscape, landscape, local food/craft details and cultural context. Do not visually present legends or uncertain claims as documented fact.\n\nLAYOUT: image only, suitable as the hero illustration inside the Travel Story app. No captions, labels, logos, UI, watermarks, borders, itinerary cards or large text inside the generated image.`;
    const r=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-2",prompt,size:"1536x1024",quality:"medium",output_format:"webp"})});
    const d=await r.json();
    if(!r.ok)throw new Error(d?.error?.message||"Image generation failed");
    const item=d?.data?.[0]||{};
    const image=item.b64_json?`data:image/webp;base64,${item.b64_json}`:item.url;
    if(!image)throw new Error("Image generation returned no image");
    return res.status(200).json({image,prompt,revised_prompt:item.revised_prompt||""});
  }catch(e){console.error(e);return res.status(500).json({error:e?.message||"Illustration failed"})}
}
