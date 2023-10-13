import { component, field, Entity, system, System } from '@lastolivegames/becsy';

@component
export class UIIcon {
  @field.dynamicString(50) declare image: string;
}

@component
export class ScreenPosition {
  @field.float64 declare x: number;
  @field.float64 declare y: number;
}

@system
export class ScreenRender extends System {
  private screenElements = this.query(
    (q) => q.current.with(UIIcon).read.and.with(ScreenPosition).read
  )

  execute(): void {
      for(const entity of this.screenElements.current){
        //TODO draw element to canvas
      }
  }
} 