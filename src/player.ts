import { component, field, Type, Entity } from '@lastolivegames/becsy';
import { Position, Rotation, Replicated, HasLocalAuthority } from './main';

export function NewPlayer(
  name: string,
  spawnPosition: { x: number; y: number; z: number },
  spawnRotation: { x: number; y: number; z: number; w: number }
) {
  return [
    Player,
    { name },
    Replicated,
    { components: [Player, Position, Rotation] },
    HasLocalAuthority,
    Position,
    spawnPosition,
    Rotation,
    spawnRotation,
    Health,
    Inventory,
  ];
}

@component
export class Player {
  @field.dynamicString(50) declare name: string;
}

@component
export class Health {
  @field({ type: Type.float64, default: 100 }) declare value: number;
  @field({ type: Type.float64, default: 100 }) declare maxValue: number;
}

@component
class Packed {
  @field.ref declare holder: Entity;
}

@component
class Inventory {
  @field.backrefs(Packed, 'holder') declare contents: Entity[];
}

function pickUp(item: Entity, player: Entity) {
  item.add(Packed, { holder: player });
  item.remove(Position);
}
