export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const {place="",story=null,context={}}=req.body||{};
    if(!story)return res.status(400).json({error:"Select a story first"});
    if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"OPENAI_API_KEY is not configured"});
    const style=`TRAVEL STORY v1.6 SIGNATURE STYLE (mandatory): bright hand-painted watercolor + coloured-pencil travel-journal illustration on warm ivory/cream textured paper. Fine loose ink/pencil outlines, clean soft watercolor washes, cheerful pastel palette with coral, sky blue, sage green, ochre and warm terracotta accents. Charming editorial travel-guide / postcard / illustrated-journal feeling, friendly, airy and contemporary rather than cinematic or photorealistic. Landmarks, architecture, local crafts, food and cultural objects must remain recognizable and geographically accurate. Human figures should be naturally stylized hand-drawn characters with warm expressions and believable proportions. Use handcrafted imperfections, gentle paper texture and generous breathing room. Avoid glossy 3D rendering, hyperreal photography, dramatic movie lighting, dark fantasy, heavy oil-paint texture, anime, vector-flat corporate art, generic stock art, sepia-heavy historical reconstruction, and realistic photo-collage aesthetics.`;
    const prompt=`Create a landscape editorial travel illustration (16:9) for a story about ${place}.\n\n${style}\n\nTitle: ${story.title}\nStory: ${story.story}\nLocation: ${story.location}\nVerified context: ${JSON.stringify(context.verify||{})}\nVisual context: ${JSON.stringify(context.visual||{})}\n\nCONTENT ACCURACY: Respect the correct era, architecture, clothing, streetscape, landscape, local food/craft details and cultural context. Do not visually present legends or uncertain claims as documented fact.\n\nCOMPOSITION RULES â v1.6 (mandatory): ONE IMAGE = ONE PRIMARY VISUAL STORY. Build 60â70% of the composition around one present-day, recognizable hero location or subject from this story. Use only 20â30% for small supporting story/history vignettes when genuinely useful. Historical context must appear as subtle sketchbook memories, tiny inset scenes, objects or faded background details â never as a competing full-size scene. Do not combine several eras, unrelated landmarks, or multiple major events into a montage. Do not place a giant king, ruler, celebrity or historical character in the center unless that person is explicitly the main subject of the selected story. Prioritize a clear focal point, simple visual hierarchy, bright clean color, open negative space, and the playful polished feel of a premium watercolor travel-guide illustration.

LAYOUT: image only, suitable as the hero illustration inside the Travel Story app. No captions, labels, logos, UI, watermarks, borders, itinerary cards or large text inside the generated image.`;
    const r=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-2",prompt,size:"1536x1024",quality:"medium",output_format:"webp"})});
    const d=await r.json();
    if(!r.ok)throw new Error(d?.error?.message||"Image generation failed");
    const item=d?.data?.[0]||{};
    const image=item.b64_json?`data:image/webp;base64,${item.b64_json}`:item.url;
    if(!image)throw new Error("Image generation returned no image");
    return res.status(200).json({image,prompt,revised_prompt:item.revised_prompt||""});
  }catch(e){console.error(e);return res.status(500).json({error:e?.message||"Illustration failed"})}
}
