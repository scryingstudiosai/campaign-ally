'use client';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MonsterAbility {
  name: string;
  description: string;
  attackBonus?: number;
  damage?: string;
  dc?: number;
}

interface MonsterStatBlockProps {
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  ac: number;
  armorType?: string;
  hp: number;
  hitDice?: string;
  speed: number;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  saves?: string[];
  skills?: string[];
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  conditionImmunities?: string[];
  senses?: string[];
  passivePerception?: number;
  languages?: string[];
  cr: string | number;
  xp?: number;
  traits?: MonsterAbility[];
  actions?: MonsterAbility[];
  reactions?: MonsterAbility[];
  legendaryActions?: MonsterAbility[];
}

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function MonsterStatBlock({
  name,
  size = 'Medium',
  type = 'humanoid',
  alignment = 'any alignment',
  ac,
  armorType,
  hp,
  hitDice,
  speed,
  str = 10,
  dex = 10,
  con = 10,
  int = 10,
  wis = 10,
  cha = 10,
  saves,
  skills,
  resistances,
  immunities,
  vulnerabilities,
  conditionImmunities,
  senses,
  passivePerception,
  languages,
  cr,
  xp,
  traits,
  actions,
  reactions,
  legendaryActions
}: MonsterStatBlockProps) {
  return (
    <Card className="bg-gradient-to-br from-amber-950/20 to-red-950/20 border-amber-700/30 p-6 space-y-4">
      <div>
        <h3 className="text-2xl font-bold text-amber-400">{name}</h3>
        <p className="text-sm italic text-amber-300/70">
          {size} {type}, {alignment}
        </p>
      </div>

      <Separator className="bg-amber-700/30" />

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-bold text-amber-300">Armor Class</span>{' '}
          <span className="text-foreground">
            {ac} {armorType && `(${armorType})`}
          </span>
        </div>
        <div>
          <span className="font-bold text-amber-300">Hit Points</span>{' '}
          <span className="text-foreground">
            {hp} {hitDice && `(${hitDice})`}
          </span>
        </div>
        <div>
          <span className="font-bold text-amber-300">Speed</span>{' '}
          <span className="text-foreground">{speed} ft.</span>
        </div>
      </div>

      <Separator className="bg-amber-700/30" />

      <div className="grid grid-cols-6 gap-4 text-center">
        <div>
          <div className="font-bold text-amber-300 text-xs">STR</div>
          <div className="text-foreground">
            {str} ({getModifier(str)})
          </div>
        </div>
        <div>
          <div className="font-bold text-amber-300 text-xs">DEX</div>
          <div className="text-foreground">
            {dex} ({getModifier(dex)})
          </div>
        </div>
        <div>
          <div className="font-bold text-amber-300 text-xs">CON</div>
          <div className="text-foreground">
            {con} ({getModifier(con)})
          </div>
        </div>
        <div>
          <div className="font-bold text-amber-300 text-xs">INT</div>
          <div className="text-foreground">
            {int} ({getModifier(int)})
          </div>
        </div>
        <div>
          <div className="font-bold text-amber-300 text-xs">WIS</div>
          <div className="text-foreground">
            {wis} ({getModifier(wis)})
          </div>
        </div>
        <div>
          <div className="font-bold text-amber-300 text-xs">CHA</div>
          <div className="text-foreground">
            {cha} ({getModifier(cha)})
          </div>
        </div>
      </div>

      <Separator className="bg-amber-700/30" />

      <div className="space-y-1 text-sm">
        {saves && saves.length > 0 && (
          <div>
            <span className="font-bold text-amber-300">Saving Throws</span>{' '}
            <span className="text-foreground">{saves.join(', ')}</span>
          </div>
        )}
        {skills && skills.length > 0 && (
          <div>
            <span className="font-bold text-amber-300">Skills</span>{' '}
            <span className="text-foreground">{skills.join(', ')}</span>
          </div>
        )}
        {resistances && resistances.length > 0 && (
          <div>
            <span className="font-bold text-amber-300">Damage Resistances</span>{' '}
            <span className="text-foreground">{resistances.join(', ')}</span>
          </div>
        )}
        {immunities && immunities.length > 0 && (
          <div>
            <span className="font-bold text-amber-300">Damage Immunities</span>{' '}
            <span className="text-foreground">{immunities.join(', ')}</span>
          </div>
        )}
        {vulnerabilities && vulnerabilities.length > 0 && (
          <div>
            <span className="font-bold text-amber-300">Damage Vulnerabilities</span>{' '}
            <span className="text-foreground">{vulnerabilities.join(', ')}</span>
          </div>
        )}
        {conditionImmunities && conditionImmunities.length > 0 && (
          <div>
            <span className="font-bold text-amber-300">Condition Immunities</span>{' '}
            <span className="text-foreground">{conditionImmunities.join(', ')}</span>
          </div>
        )}
        <div>
          <span className="font-bold text-amber-300">Senses</span>{' '}
          <span className="text-foreground">
            {senses?.join(', ') || 'passive Perception'} {passivePerception || 10}
          </span>
        </div>
        <div>
          <span className="font-bold text-amber-300">Languages</span>{' '}
          <span className="text-foreground">{languages?.join(', ') || '—'}</span>
        </div>
        <div>
          <span className="font-bold text-amber-300">Challenge</span>{' '}
          <span className="text-foreground">
            {cr} {xp && `(${xp.toLocaleString()} XP)`}
          </span>
        </div>
      </div>

      {traits && traits.length > 0 && (
        <>
          <Separator className="bg-amber-700/30" />
          <div className="space-y-3">
            {traits.map((trait, idx) => (
              <div key={idx} className="text-sm">
                <div className="font-bold text-amber-300 italic">{trait.name}.</div>
                <div className="text-foreground">{trait.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {actions && actions.length > 0 && (
        <>
          <Separator className="bg-amber-700/30" />
          <div>
            <h4 className="text-lg font-bold text-amber-400 mb-3">Actions</h4>
            <div className="space-y-3">
              {actions.map((action, idx) => (
                <div key={idx} className="text-sm">
                  <div className="font-bold text-amber-300 italic">{action.name}.</div>
                  <div className="text-foreground">
                    {action.description}
                    {action.attackBonus && ` +${action.attackBonus} to hit`}
                    {action.damage && `, ${action.damage} damage`}
                    {action.dc && ` DC ${action.dc}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {reactions && reactions.length > 0 && (
        <>
          <Separator className="bg-amber-700/30" />
          <div>
            <h4 className="text-lg font-bold text-amber-400 mb-3">Reactions</h4>
            <div className="space-y-3">
              {reactions.map((reaction, idx) => (
                <div key={idx} className="text-sm">
                  <div className="font-bold text-amber-300 italic">{reaction.name}.</div>
                  <div className="text-foreground">{reaction.description}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {legendaryActions && legendaryActions.length > 0 && (
        <>
          <Separator className="bg-amber-700/30" />
          <div>
            <h4 className="text-lg font-bold text-amber-400 mb-3">Legendary Actions</h4>
            <div className="space-y-3">
              {legendaryActions.map((action, idx) => (
                <div key={idx} className="text-sm">
                  <div className="font-bold text-amber-300 italic">{action.name}.</div>
                  <div className="text-foreground">{action.description}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
