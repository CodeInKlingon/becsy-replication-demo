import { component, field, Entity } from '@lastolivegames/becsy';
import { Position, createEntityQueue } from './main';
import { ScreenPosition, UIIcon } from './ui';
import { Player } from './player';

const PING_DURATION = 15;
const ENEMY_ACTIVE_PING_DURATION = 5;

@component
class Ping {
  @field.ref declare pingedEntity: Entity;
  declare pingedBy: string;
}

@system
class PingSystem extends System {
  // for new pings set pinged at time
  private pings = this.query(
    (q) => q.current.and.added.with(Ping).write.and.usingAll.write
  );

  execute() {
    // console.log(this.timedEntities.added);

    for (const newEntity of this.pings.added) {
      newEntity.write(Ping).startTime = this.time;
    }

    for (const entity of this.pings.current) {
      const entityPinged = entity.read(Ping).pingedEntity;

      //remove pings for non existent entities
      if (!entityPinged || !entityPinged.alive) {
        entity.delete();
        continue;
      }

      //removed pings for entities that are not in the 3d world
      if (!entityPinged.has(Position)) {
        entity.delete();
        continue;
      }

      //remove expired pings
      const duration = this.time - entity.read(Ping).startTime;
      if(duration > PING_DURATION){
        entity.delete();
        continue;
      }

      if(entityPinged.has(Player)){
        if(duration > ENEMY_ACTIVE_PING_DURATION){
          
        }
      }
      

    }
  }

  /** foreach ping {
   *
   * }
   * */
}

export function createPing(pingedEntity?: Entity) {
  createEntityQueue.push(NewPing());
}

function NewPing() {
  return [Ping, Position, UIIcon, ScreenPosition];
}
