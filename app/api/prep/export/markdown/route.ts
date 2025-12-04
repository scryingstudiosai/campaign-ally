import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest } from '@/lib/supabase/server';
import { format } from 'date-fns';

 export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SceneData {
  boxedText?: string;
  npcs?: string[];
  skillChecks?: string[];
  contingencies?: string[];
  rewards?: Record<string, any>;
  notes?: string;
  estimatedDuration?: string;
  mood?: string;
  mapRequired?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const mode = searchParams.get('mode') || 'dm';

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (mode !== 'dm' && mode !== 'player') {
      return NextResponse.json(
        { success: false, error: 'Mode must be "dm" or "player"' },
        { status: 400 }
      );
    }

    const response = NextResponse.next();
    const supabase = createServerClientFromRequest(req, response);

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('*')
      .eq('session_id', sessionId)
      .order('index_order', { ascending: true });

    if (scenesError) {
      return NextResponse.json(
        { success: false, error: scenesError.message },
        { status: 500 }
      );
    }

    let markdown = '';

    markdown += `# ${session.title}\n\n`;

    if (session.session_date) {
      markdown += `**Date:** ${format(new Date(session.session_date), 'MMMM d, yyyy')}\n\n`;
    }

    if (session.party_info) {
      markdown += `**Party:** Level ${session.party_info.level} | ${session.party_info.size} players\n\n`;
    }

    markdown += '---\n\n';

    if (session.premise) {
      markdown += `## Session Premise\n\n${session.premise}\n\n`;
    }

    if (session.outline?.goals && session.outline.goals.length > 0) {
      markdown += `## Session Goals\n\n`;
      session.outline.goals.forEach((goal: string) => {
        markdown += `- ${goal}\n`;
      });
      markdown += '\n';
    }

    if (session.outline?.beats && session.outline.beats.length > 0) {
      markdown += `## Outline Beats\n\n`;
      session.outline.beats.forEach((beat: any, idx: number) => {
        markdown += `### ${idx + 1}. ${beat.title}`;
        if (beat.duration) {
          markdown += ` (${beat.duration} min)`;
        }
        markdown += '\n\n';
        if (beat.description) {
          markdown += `${beat.description}\n\n`;
        }
      });
    }

    markdown += '---\n\n';

    markdown += `## Scenes (${scenes?.length || 0})\n\n`;

    if (scenes && scenes.length > 0) {
      scenes.forEach((scene: any) => {
        const data: SceneData = scene.data || {};
        const title = scene.title || `Scene ${scene.index_order}`;

        markdown += `### ${scene.index_order}. ${title}\n\n`;

        if (data.estimatedDuration) {
          markdown += `**Duration:** ${data.estimatedDuration}\n`;
        }
        if (data.mood) {
          markdown += `**Mood:** ${data.mood}\n`;
        }
        if (data.mapRequired) {
          markdown += `**Map Required:** Yes\n`;
        }
        markdown += '\n';

        if (data.boxedText) {
          markdown += `> ${data.boxedText.split('\n').join('\n> ')}\n\n`;
        }

        if (data.npcs && data.npcs.length > 0) {
          markdown += `**NPCs:**\n`;
          data.npcs.forEach((npc: string) => {
            markdown += `- ${npc}\n`;
          });
          markdown += '\n';
        }

        if (data.skillChecks && data.skillChecks.length > 0) {
          if (mode === 'dm') {
            markdown += `**Skill Checks:**\n`;
            data.skillChecks.forEach((check: string) => {
              markdown += `- ${check}\n`;
            });
            markdown += '\n';
          } else {
            markdown += `**Skill Checks:** Various checks may be required\n\n`;
          }
        }

        if (mode === 'dm' && data.contingencies && data.contingencies.length > 0) {
          markdown += `**Contingencies:**\n`;
          data.contingencies.forEach((cont: string) => {
            markdown += `- ${cont}\n`;
          });
          markdown += '\n';
        }

        if (data.rewards && Object.keys(data.rewards).length > 0) {
          markdown += `**Rewards:**\n`;
          if (mode === 'dm') {
            Object.entries(data.rewards).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                markdown += `- **${key}:** ${value.join(', ')}\n`;
              } else {
                markdown += `- **${key}:** ${value}\n`;
              }
            });
          } else {
            markdown += `- Treasure and rewards may be found here\n`;
          }
          markdown += '\n';
        }

        if (mode === 'dm' && data.notes) {
          markdown += `**DM Notes:**\n\n${data.notes}\n\n`;
        }

        markdown += '---\n\n';
      });
    }

    markdown += `\n_Exported on ${format(new Date(), 'MMMM d, yyyy h:mm a')}_\n`;
    markdown += `_Mode: ${mode === 'dm' ? 'Dungeon Master' : 'Player'}_\n`;

    return NextResponse.json({
      success: true,
      data: { markdown },
    });
  } catch (error) {
    console.error('Export markdown error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
