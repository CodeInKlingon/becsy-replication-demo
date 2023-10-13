import { System, component, field, system } from '@lastolivegames/becsy';
import HavokPhysics, {HP_WorldId, HavokPhysicsWithBindings} from "@babylonjs/havok";

@component
export class RigidBody {
  @field.float64 declare handle: number;
}

@component
export class Collider {
  @field.int32 declare handle: number;
}

@component 
export class HavokGlobal {
    @field.object declare world: HP_WorldId;
    @field.object declare instance: HavokPhysicsWithBindings;
}

@system
export class HavokPhysicsSystem extends System{
  private havok = this.singleton.write(HavokGlobal);

  async prepare(): Promise<void> {
    this.havok.instance = await HavokPhysics();
    this.havok.world = this.havok.instance.HP_World_Create()[1];
  }

  execute(): void {
    this.havok.instance.HP_World_Step(this.havok.world, this.delta)
  }
}