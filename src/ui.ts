import { component, field, Entity } from '@lastolivegames/becsy';

@component
export class UIIcon {
  @field.dynamicString(50) declare image: string;
}

@component
export class ScreenPosition {
  @field.float64 declare x: number;
  @field.float64 declare y: number;
}
