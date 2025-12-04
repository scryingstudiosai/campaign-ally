import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getExistingNames, createVarietyPrompt } from '@/lib/deduplication';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const InnInputSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().optional(),
  size: z.enum(['small', 'medium', 'large']),
  quality: z.enum(['budget', 'standard', 'upscale', 'luxury']),
  concept: z.string().max(500).optional(),
  specialFeatures: z.string().max(500).optional(),
  respectCodex: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are a worldbuilder designing a comprehensive D&D inn or tavern for use at the game table.

REQUIREMENTS:
- Create a memorable establishment with distinct character
- Provide complete lodging information with pricing
- Include detailed NPCs with personalities and secrets
- Add current guests to make the inn feel lived-in
- Include adventure hooks and plot opportunities
- Make it immediately useful for a DM
- Return ONLY valid JSON

Output schema:
{
  "name": "string",
  "size": "small"|"medium"|"large",
  "quality": "budget"|"standard"|"upscale"|"luxury",
  "roomCount": number (total rooms available),
  "description": "string (2-3 sentences describing exterior and interior)",
  "atmosphere": "string (engage multiple senses)",
  "reputation": "string (how locals view this establishment)",
  "lodging": {
    "rooms": [
      {
        "type": "string (e.g., Common Room, Private Chamber, Luxury Suite)",
        "description": "string",
        "amenities": ["string"] (2-3 items),
        "price": "string (in gold pieces per night)"
      }
    ] (3-5 room types),
    "capacity": number (total beds/spaces),
    "occupancy": "string (e.g., 60% full, Nearly empty, Fully booked)"
  },
  "amenities": {
    "commonRoom": "string (description of common area)",
    "dining": "string or null (if food service available)",
    "stables": boolean,
    "baths": "string or null (if bathing facilities available)",
    "otherServices": ["string"] (any other services like laundry, message delivery, etc.)
  },
  "staff": {
    "innkeeper": {
      "name": "string",
      "personality": "string",
      "quirk": "string",
      "secret": "string"
    },
    "additional": [
      {"name": "string", "role": "string"}
    ] (2-3 additional staff)
  },
  "currentGuests": [
    {
      "name": "string",
      "reason": "string (why they're staying)",
      "detail": "string (interesting fact about them)"
    }
  ] (2-4 notable current guests),
  "menuHighlights": ["string"] (3-5 signature food/drink items with brief descriptions),
  "specialFeature": "string (unique characteristic of this inn)",
  "hooks": ["string"] (2-3 plot hooks or adventure opportunities),
  "flair": "string (one-sentence tagline that captures the essence)"
}`;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const response = NextResponse.next();
    const supabaseAuth = createServerClientFromRequest(request, response);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedClient(token);

    const body = await request.json();
    const validation = InnInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, name, size, quality, concept, specialFeatures, tags } = validation.data;

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const existingNames = await getExistingNames(supabase, campaignId, 'location');
    const varietyPrompt = createVarietyPrompt(existingNames);

    let userPrompt = `Generate a ${quality} ${size} inn or tavern with COMPLETE details.

REQUIRED: Include ALL of these elements in your response:
- Basic info (name, description, atmosphere, reputation, room count)
- Lodging section with 3-5 different room types, each with type, description, amenities, and price
- Amenities section with common room, dining, stables, baths, other services
- Staff section with full innkeeper details (name, personality, quirk, secret) plus 2-3 additional staff
- Current guests section with 2-4 guests including name, reason for staying, and interesting detail
- Menu highlights with 3-5 items
- Special feature
- 2-3 plot hooks
- Flair tagline`;

    if (name) {
      userPrompt += `\n\nIMPORTANT: The inn MUST be named "${name}". Use this exact name in the "name" field.`;
    }
    if (concept) userPrompt += `\n\nConcept: "${concept}"`;
    if (specialFeatures) userPrompt += `\nSpecial features: "${specialFeatures}"`;
    userPrompt += `\n\n${varietyPrompt}`;

    let result;
    let retryCount = 0;

    while (retryCount < 2) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: retryCount > 0 ? `Return ONLY valid JSON. No markdown. ${SYSTEM_PROMPT}` : SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.9,
          max_tokens: 2000,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('No content returned');

        result = JSON.parse(content);
        break;
      } catch (error: any) {
        if (retryCount === 0 && error instanceof SyntaxError) {
          retryCount++;
          continue;
        }
        throw error;
      }
    }

    const title = `${result.name} - ${result.quality} ${result.size} inn`;

    // Build comprehensive text content for search
    let textContent = `${result.name}\n${result.quality} ${result.size} inn (${result.roomCount} rooms)\n\n${result.flair}\n\n`;
    textContent += `Description: ${result.description}\n\n`;
    textContent += `Atmosphere: ${result.atmosphere}\n`;
    textContent += `Reputation: ${result.reputation}\n\n`;

    if (result.staff?.innkeeper) {
      textContent += `Innkeeper: ${result.staff.innkeeper.name}\n`;
    }

    if (result.lodging?.rooms?.length) {
      textContent += `\nRooms Available:\n`;
      result.lodging.rooms.forEach((room: any) => {
        textContent += `- ${room.type}: ${room.price}\n`;
      });
    }

    if (result.hooks?.length) {
      textContent += `\nPlot Hooks: ${result.hooks.join('; ')}\n`;
    }

    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'location',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'inn',
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: 'Failed to save inn' },
        { status: 500 }
      );
    }

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Inn forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
