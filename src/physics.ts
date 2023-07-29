import { component, field } from '@lastolivegames/becsy';

@component
export class RigidBody {
  @field.float64 declare handle: number;
}

@component
export class Collider {
  @field.int32 declare handle: number;
}
