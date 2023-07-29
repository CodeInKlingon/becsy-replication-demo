import { component, field, Type, Entity } from '@lastolivegames/becsy';

@component
export class Score {
  @field.dynamicString(50) declare name: string;
  @field.int32 declare points: number;
}
