import {
  component,
  field,
  system,
  System,
  ComponentType,
  World,
  Entity,
} from '@lastolivegames/becsy';
import {
  CollectionWithTwoKeys,
  ComponentMessage,
  EntityMessages,
  PeerId,
  RemoteEntityId,
} from './collection';
import { Peer, DataConnection } from 'peerjs';
import { Pane } from 'tweakpane';
import { Health, NewPlayer, Player } from './player';

export const peers: Record<string, DataConnection> = {};

const peer = new Peer();
let pane;

peer.on('open', function (id) {
  console.log('My peer ID is: ' + id);
  pane = new Pane();
  pane.addBlade({
    view: 'text',
    label: 'peer id',
    parse: (v) => String(v),
    value: id,
  });

  const PARAMS = {
    hostId: '',
    p: Object.keys(peers),
  };
  pane.addInput(PARAMS, 'hostId');

  const btn = pane.addButton({
    title: 'Join',
    // label: 'counter',   // optional
  });

  btn.on('click', () => {
    console.log(PARAMS);
    let conn = peer.connect(PARAMS.hostId);

    createEntityQueue.push(
      NewPlayer('Daniel', { x: 1, y: 2, z: 0 }, { x: 1, y: 0, z: 0, w: 0 })
    );

    conn.on('open', function () {
      //add to local list of peers
      peers[conn.peer] = conn;
      pane.refresh();

      //bind connection events
      conn.on('data', (data) => processMessageRecieved(conn.peer, data));
    });
  });

  pane.addBlade({
    view: 'text',
    label: 'peers',
    multiline: true,
    lineCount: 5,
    parse: () => Object.keys(peers),
    value: Object.keys(peers),
  });

  const btnSpawn = pane.addButton({
    title: 'Spawn',
    // label: 'counter',   // optional
  });
  btnSpawn.on('click', () => {
    createEntityQueue.push([
      Replicated,
      { components: [Position, SomethingElse] },
      Position,
      { x: 0, y: 1, z: 0 },
      HasLocalAuthority,
      Lifetime,
    ]);
  });
});
peer.on('connection', function (conn) {
  //add to local list of peers
  peers[conn.peer] = conn;
  pane.refresh();

  //bind connection events
  conn.on('data', (data) => processMessageRecieved(conn.peer, data));
});

function processMessageRecieved(peerId, data: any) {
  peerMessages.set(peerId, data);
}

@component
export class Position {
  @field.float64 declare x: number;
  @field.float64 declare y: number;
  @field.float64 declare z: number;
}

@component
export class Rotation {
  @field.float64 declare x: number;
  @field.float64 declare y: number;
  @field.float64 declare z: number;
  @field.float64 declare w: number;
}

@component
export class RigidBody {
  @field.float64 declare handle: number;
}

@component
export class Collider {
  @field.int32 declare handle: number;
}

@component
export class Mesh {
  @field.int32 declare id: number;
}

@component
export class Replicated {
  @field.object declare components: ComponentType<any>[];
  @field.dynamicString(50) declare idOfPeerWithAuthority: string;
}

@component
class Lifetime {
  @field.float64 declare startTime: number;
}

@component
export class HasLocalAuthority {}

@component
class ReplicatedThisStep {}

@component
class SomethingElse {
  @field.float64 declare value: number;
}

export const createEntityQueue: (
  | ComponentType<any>
  | Record<string, unknown>
)[][] = [];

@system((s) => s.after(entitySpawner))
export class LifeTime extends System {
  private timedEntities = this.query(
    (q) =>
      q.current.and.added.with(Lifetime).write.and.without(SomethingElse).read
        .usingAll.write
  );

  execute() {
    // console.log(this.timedEntities.added);

    for (const newEntity of this.timedEntities.added) {
      newEntity.write(Lifetime).startTime = this.time;
    }

    for (const entity of this.timedEntities.current) {
      const duration = this.time - entity.read(Lifetime).startTime;
      console.log(duration);
      if (duration > 3) {
        console.log('delete');
        entity.add(SomethingElse, { value: 200 });
      }
    }
  }
}

@system((s) => s.after(ReplicatedTagRemover))
export class entitySpawner extends System {
  constructor() {
    super();
    this.query((q) => q.using(Position).usingAll.write);
  }

  execute(): void {
    for (const e of createEntityQueue) {
      console.log('spawning something', e);

      this.createEntity(...e);
    }

    createEntityQueue.splice(0, createEntityQueue.length);
  }
}

@system((s) => s.after(ReplicationSender))
class ReplicatedTagRemover extends System {
  private replicatedEntities = this.query(
    (q) => q.current.with(Replicated).and.with(ReplicatedThisStep).write
  );

  execute() {
    if (this.replicatedEntities.current.length)
      for (const entity of this.replicatedEntities.current) {
        entity.remove(ReplicatedThisStep);
      }
  }
}

@system((s) => s.after(ReplicatedReceiver))
class ReplicationSender extends System {
  private replicatedEntities = this.query(
    (q) =>
      q.current.with(Replicated).read.and.with(HasLocalAuthority).usingAll.read
  );

  declare lastIntervalTime: number;
  declare intervalRate: number;

  constructor() {
    super();
    this.lastIntervalTime = 0;
    this.intervalRate = 0.25;
  }

  execute() {
    if (!(this.time - this.lastIntervalTime >= this.intervalRate)) return;

    if (Object.keys(peers).length == 0) return;

    this.lastIntervalTime = this.time;

    let message: EntityMessages = {};
    for (const entity of this.replicatedEntities.current) {
      const componentMessages: ComponentMessage[] = [];
      const comps = entity.read(Replicated).components;

      for (const comp of comps) {
        if (!entity.has(comp)) continue;

        let val = undefined;
        if (comp.schema) {
          val = {};
          Object.keys(comp.schema).forEach((key: string) => {
            val[key] = entity.read(comp)[key];
          });
        }
        componentMessages.push({
          type: comp.name,
          value: val,
        });
      }
      message[entity.__id] = componentMessages;
    }

    sendToAllPeers(message);
  }
}

let peerMessages = new Map<PeerId, EntityMessages>();
const entityMap = new CollectionWithTwoKeys<Entity>();

@system
class ReplicatedReceiver extends System {
  private replicatedEntities = this.query(
    (q) =>
      q.current.with(Replicated).read.but.without(HasLocalAuthority).read
        .usingAll.write
  );

  execute() {
    for (const [peerId, entityMessages] of peerMessages) {
      const entityMessagesToApply = entityMessages;
      // console.log(peerId, entityMessagesToApply);
      peerMessages.delete(peerId);

      if (
        !entityMessagesToApply
        // || Object.entries(entityMessagesToApply).length == 0
      )
        continue;

      for (const [remoteEntityId, entityMessage] of Object.entries(
        entityMessagesToApply
      )) {
        if (!entityMap.has(peerId, remoteEntityId)) {
          console.log('map doesnt have this remote entity');
          makeLocalEntityFromMessage(
            this,
            entityMessage,
            peerId,
            remoteEntityId
          );
          continue;
        }

        const localEntity = entityMap.get(peerId, remoteEntityId);
        if (!localEntity.alive) {
          console.log('remote entity in map is dead! make it ');
          makeLocalEntityFromMessage(
            this,
            entityMessage,
            peerId,
            remoteEntityId
          );
          continue;
        }

        console.log('we have this remote entity locally');
        applyComponentMessagesToLocalEntity(localEntity, entityMessage, peerId);
      }

      const entitiesMissingFromMessage = entityMap.findMissingItemsInMessage(
        peerId,
        entityMessages
      );
      for (const missingEntity of entitiesMissingFromMessage) {
        console.log(
          'this remote entity found locally was missing in the message',
          missingEntity
        );
        missingEntity.delete();
      }
    }

    // console.log(' foreign entity count', this.replicatedEntities.current);
  }
}

function makeLocalEntityFromMessage(
  system: System,
  messages: ComponentMessage[],
  peerId: PeerId,
  remoteEntityId: RemoteEntityId
) {
  const newEntity = system.createEntity();
  entityMap.set(peerId, remoteEntityId, newEntity.hold());
  applyComponentMessagesToLocalEntity(newEntity, messages, peerId);
  return newEntity;
}

function applyComponentMessagesToLocalEntity(
  entity: Entity,
  messages: ComponentMessage[],
  peerId: PeerId
) {
  const currentReplicated = entity.has(Replicated)
    ? entity.read(Replicated).components
    : [];

  for (const componentMessage of messages) {
    const compType = stringToComponentType(componentMessage.type);
    const values = componentMessage.value;

    if (!entity.has(compType)) {
      entity.add(compType, values);
    } else {
      Object.keys(compType.schema!).forEach((key: string) => {
        entity.write(compType)[key] = values[key];
      });
    }

    currentReplicated.splice(currentReplicated.indexOf(compType), 1);
  }

  if (currentReplicated && currentReplicated.length > 0) {
    for (const compToRemove of currentReplicated) {
      entity.remove(compToRemove);
    }
  }

  if (entity.has(Replicated)) {
    entity.write(Replicated).components = messages.map((m) =>
      stringToComponentType(m.type)
    );
  } else {
    entity.add(Replicated, {
      components: messages.map((m) => stringToComponentType(m.type)),
      idOfPeerWithAuthority: peerId,
    });
  }

  entity.add(ReplicatedThisStep);
}

function sendToAllPeers(message: EntityMessages) {
  //TODO
  for (const [peerId, conn] of Object.entries(peers)) {
    conn.send(message);
  }
}

let Components: Record<string, ComponentType<any>> = {
  Replicated: Replicated,
  Position: Position,
  Rotation: Rotation,
  SomethingElse: SomethingElse,
  Player: Player,
  Health: Health,
};

function stringToComponentType(componentName: string) {
  return Components[componentName];
}

const world = await World.create();

function animate() {
  world.execute();
  requestAnimationFrame(animate);
}
animate();
