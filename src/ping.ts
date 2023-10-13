import { component, system, System, field, Entity } from '@lastolivegames/becsy';
import { HasLocalAuthority, Position, Replicated, createEntityQueue } from './main';
import { ScreenPosition, UIIcon } from './ui';
import { Player } from './player';
import { ThreeGlobal } from './three';

const PING_DURATION = 15;
const ENEMY_ACTIVE_PING_DURATION = 5;

@component
class Ping {
  @field.ref declare pingedEntity: Entity;
  @field.float64 declare startTime :number;
  // declare pingedBy: string;
}

@system
class PingSystem extends System {

  private three = this.singleton.read(ThreeGlobal);

  // for new pings set pinged at time
  private pings = this.query(
    (q) => q.current.and.added.with(Ping).write.and.without(HasLocalAuthority).usingAll.write
  );

  private myPings = this.query(
    (q) => q.current.and.added.with(Ping).write.and.with(HasLocalAuthority).and.usingAll.write
  )

  execute() {
    
    //CLIENT
    for(const entity of this.pings.current){
      let screenPosition = this.calculateScreenPositionFromWorldPosition()
      entity.write(ScreenPosition).x = screenPosition.x;
      entity.write(ScreenPosition).y = screenPosition.y;
    }

    //HOST
    for (const newEntity of this.myPings.added) {
      newEntity.write(Ping).startTime = this.time;
    }

    for (const entity of this.myPings.current) {
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

      //update position
      if(entityPinged.has(Player)){
        if(duration > ENEMY_ACTIVE_PING_DURATION){
          //dont update position if enemy ping active duration is expired
          continue
        }
      }

      entity.write(Position).x = entityPinged.read(Position).x;
      entity.write(Position).y = entityPinged.read(Position).y;
      entity.write(Position).z = entityPinged.read(Position).z;

      //calculate screen position for remaining pings
      let screenPosition = this.calculateScreenPositionFromWorldPosition()
      entity.write(ScreenPosition).x = screenPosition.x;
      entity.write(ScreenPosition).y = screenPosition.y;
    }
  }
  
  calculateScreenPositionFromWorldPosition(): {x: number, y: number}{
    
    // this.three.camera
    // TODO: implement screen positioning logic. project matrix. if off screen position in correct edge position
    return {x: 0, y: 0}
  }
  
}


export function createPing(pingedEntity?: Entity) {
  createEntityQueue.push(NewPing());
}

function NewPing() {
  return [
    Ping,
    HasLocalAuthority,
    Position, 
    UIIcon, 
    ScreenPosition,
    Replicated,
    {components: [
      Ping, Position, UIIcon
    ]}
  ];
}



/** what gets replicated and what gets calculated locally?
because pinged entities is a local reference 
we should set position component on Auth and replicate that to clients

we should calculate screen position locally
*/