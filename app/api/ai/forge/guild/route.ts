import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClientFromRequest, createAuthenticatedClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getExistingNames, createVarietyPrompt } from '@/lib/deduplication';
import { buildAIContext } from '@/lib/ai/context';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GuildInputSchema = z.object({
  campaignId: z.string().uuid(),
  concept: z.string().min(3).max(500),
  tags: z.array(z.string()).optional(),
  respectCodex: z.boolean().optional(),
});

const SYSTEM_PROMPT = `You are a worldbuilder designing a rich, detailed guild or organization for D&D.

Create a compelling guild with:
- Clear purpose and specialty (what they do and why they're known for it)
- 3-4 key members with distinct personalities and roles
- Unique structure (how they operate, ranks, initiation)
- Headquarters location with distinctive features
- Resources, influence, and reputation
- Internal politics and conflicts
- Guild culture, traditions, and secrets
- Multiple hooks for player involvement
- Quest board or services they offer

Return ONLY valid JSON matching this schema:
{
  "name": "string (evocative guild name)",
  "specialty": "string (what the guild specializes in - merchants, assassins, craftsmen, scholars, etc.)",
  "motto": "string (guild saying or creed)",
  "reputation": "string (how the guild is viewed by outsiders)",
  "headquarters": {
    "name": "string (name of the guildhall)",
    "location": "string (where it's located)",
    "description": "string (distinctive features and atmosphere)"
  },
  "leadership": {
    "structure": "string (how the guild is organized - guildmaster, council, cells, etc.)",
    "members": [
      {
        "name": "string",
        "rank": "string (position in guild)",
        "personality": "string (brief trait)",
        "specialty": "string (what they're known for)",
        "agenda": "string (personal goal or scheme)"
      }
    ] (3-4 key members)
  },
  "membership": {
    "size": "string (rough number of members)",
    "recruitment": "string (how they find new members)",
    "ranks": ["string"] (2-4 rank names from low to high),
    "initiation": "string (how new members prove themselves)"
  },
  "resources": {
    "wealth": "string (financial status and income sources)",
    "connections": "string (allies, contacts, or patrons)",
    "assets": ["string"] (2-3 key resources - equipment, properties, special items)
  },
  "culture": {
    "traditions": "string (guild customs, festivals, or rituals)",
    "code": "string (rules members must follow)",
    "symbols": "string (guild insignia, colors, or hand signs)"
  },
  "services": [
    "string (what service they offer)",
    "string (another service)",
    "string (another service)"
  ] (3 specific services or missions they're hired for),
  "conflicts": {
    "internal": "string (factional disputes or power struggles)",
    "external": "string (rival guilds, legal troubles, or enemies)"
  },
  "secrets": "string (hidden truth about the guild that few know)",
  "hooks": [
    "string (specific opportunity for players - join guild)",
    "string (specific opportunity - hire guild services)",
    "string (specific opportunity - conflict with guild)"
  ] (3 distinct adventure hooks),
  "flair": "string (vivid opening description that captures guild essence)"
}`;

export async function POST(request: NextRequest) {
  console.log('🏰 Guild forge API called');
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
    const validation = GuildInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { campaignId, concept, tags, respectCodex = true } = validation.data;

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

    const existingNames = await getExistingNames(supabase, campaignId, 'faction');
    const varietyPrompt = createVarietyPrompt(existingNames);

    let codexContext = '';
    if (respectCodex) {
      codexContext = await buildAIContext(supabase, campaignId);
    }

    const nameMatch = concept.match(/name:\s*([^,]+)/i);
    const guildName = nameMatch ? nameMatch[1].trim() : null;
    const namePart = guildName ? `IMPORTANT: The guild must be named "${guildName}". ` : '';

    const userPrompt = `${codexContext ? codexContext + '\n\n' : ''}Generate a guild/organization. ${namePart}Concept: "${concept}".${varietyPrompt}`;

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
          temperature: 0.8,
          max_tokens: 2500,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('No content returned');

        console.log('Guild raw AI response:', content);
        result = JSON.parse(content);
        console.log('Guild parsed result:', JSON.stringify(result, null, 2));
        break;
      } catch (error: any) {
        if (retryCount === 0 && error instanceof SyntaxError) {
          retryCount++;
          continue;
        }
        throw error;
      }
    }

    if (!result || !result.name) {
      console.error('Invalid guild result:', result);
      return NextResponse.json(
        { success: false, error: 'Failed to generate valid guild data' },
        { status: 500 }
      );
    }

    const title = result.name;
    const membersList = result.leadership?.members ? result.leadership.members.map((m: any) => `${m.name} (${m.rank})`).join(', ') : 'None';
    const textContent = `${result.name}\n${result.specialty || 'Unknown specialty'}\n\n${result.flair || ''}\n\nMotto: ${result.motto || 'None'}\nLeadership: ${result.leadership?.structure || 'Unknown'}\nKey Members: ${membersList}\nHeadquarters: ${result.headquarters?.name || 'Unknown'} - ${result.headquarters?.location || 'Unknown'}\nReputation: ${result.reputation || 'Unknown'}`;

    console.log('Inserting guild into database...');
    const { data: memoryChunk, error: insertError } = await supabase
      .from('memory_chunks')
      .insert({
        campaign_id: campaignId,
        type: 'faction',
        title,
        text_content: textContent,
        content: result,
        forge_type: 'guild',
        tags: tags || ['guild'],
      })
      .select()
      .single();

    if (insertError) {
      console.error('Guild database insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save guild', details: insertError.message },
        { status: 500 }
      );
    }

    console.log('Guild created successfully:', memoryChunk.id);

    // Increment generation count
    await supabase.rpc('increment_user_generations', { user_id: user.id });

    return NextResponse.json({
      success: true,
      data: { id: memoryChunk.id, ...result },
    });
  } catch (error) {
    console.error('Guild forge error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
