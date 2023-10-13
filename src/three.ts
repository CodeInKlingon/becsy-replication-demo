import { System, component, field, system } from "@lastolivegames/becsy";
import * as THREE from "three"
import { Position, Rotation } from "./main";

@component 
export class ThreeGlobal {
    @field.object declare camera: THREE.PerspectiveCamera;
    @field.object declare scene: THREE.Scene;
    @field.object declare renderer: THREE.Renderer;
}

@component
export class ThreeObject {
    @field.int32 declare id: number;
}

@system
export class ThreeRenderSystem extends System{

    private three = this.singleton.write(ThreeGlobal);

    initialize(): void {
        this.three.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.three.scene = new THREE.Scene();
        this.three.renderer = new THREE.WebGLRenderer()
        this.three.renderer.setSize(window.innerWidth, window.innerHeight);
        
        document.addEventListener("resize", () => {
            this.three.camera.aspect = window.innerWidth / window.innerHeight;
            this.three.camera.updateProjectionMatrix();
          
            this.three.renderer.setSize(window.innerWidth, window.innerHeight);
        })
    }

    execute(): void {
        this.three.renderer.render(this.three.scene, this.three.camera)
    }

}


@system
export class ThreePositionSystem extends System{

    declare _q1: THREE.Quaternion;
    constructor(){
        super();
        this._q1 = new THREE.Quaternion();
    }

    private three = this.singleton.read(ThreeGlobal);

    //try to change this to positions that have changed
    private object3Ds = this.query(
        (q) => q.added.and.current.and.removed.with(ThreeObject).write.and.with(Position).read.and.with(Rotation).read
    )
    
    execute(): void {
        for(const newEntity of this.object3Ds.added){
            let sceneObject = this.three.scene.getObjectById(newEntity.read(ThreeObject).id)
    
            if(sceneObject)
                sceneObject.userData['entity'] = newEntity.hold();
        }

        for(const entity of this.object3Ds.current){
            let sceneObject = this.three.scene.getObjectById(entity.read(ThreeObject).id)
    
            if(!sceneObject) continue;

            sceneObject.position.set(
                entity.read(Position).x,
                entity.read(Position).y,
                entity.read(Position).z
            )

            this._q1.set(
                entity.read(Rotation).x,
                entity.read(Rotation).y,
                entity.read(Rotation).z,
                entity.read(Rotation).w
            );
            sceneObject.setRotationFromQuaternion(
				this._q1
            );
        }
    }
}